'use strict';

const http    = require('http');
const path    = require('path');
const { Firestore }  = require('@google-cloud/firestore');
const { Storage }    = require('@google-cloud/storage');
const { generatePdfFromFirestore } = require('../../scripts/export-pdf.js');

const PORT        = process.env.PORT || 8080;
const BUCKET_NAME = process.env.GCS_BUCKET || 'aevia-uploads.firebasestorage.app';
const PROJECT_ID  = process.env.GOOGLE_CLOUD_PROJECT || 'aevia-uploads';

const db      = new Firestore({ projectId: PROJECT_ID });
const storage = new Storage();
const bucket  = storage.bucket(BUCKET_NAME);

// ── Build state object from Firestore order data ───────────────────────────────
// Mirrors the shape of book-state.json that export-pdf.js expects.
// The PDF uses the final staff-authoritative fields (staff* after approval
// copies customer edits over via approveOrder).
function buildStateFromOrder(order, storedNames) {
  // bookCaptions includes ['cover'] key with cover caption text (staff-edited or original)
  const bookCaptions = order.staffBookCaptions || {};
  // Fall back to original order coverCaptions if staff haven't explicitly saved cover captions
  const coverCaptions = bookCaptions['cover'] || order.coverCaptions || {};
  // spreadCaptionStyles for spread slot styling
  const spreadCaptionStyles = order.staffSpreadCaptionStyles || {};
  const coverCaptionStyles  = order.staffCoverCaptionStyles  || {};

  // specialPhotos: { [spreadId]: basename | [basename, basename] }
  // In Firestore, storedNames.special is { [slug]: [storedPath, ...] }
  // The PDF expects spreadId keys (e.g. 'FP1') mapped to basename(s).
  // Spread IDs are stored in staffBookSequence; slugs in storedNames.special match the
  // fp key used at order creation (e.g. 'fp1', 'fplabour', 'fp5-0', 'fp5-1').
  // Build a reverse map: fpKey → basename(s).
  const specialPhotos = {};
  for (const [slug, paths] of Object.entries(storedNames.special || {})) {
    const basenames = (Array.isArray(paths) ? paths : [paths])
      .filter(Boolean)
      .map(p => path.basename(p));
    // Map the slug to the spread ID format the PDF expects.
    // fp1/fp2/fp3/fp4 → FP1/FP2/FP3/FP4 (uppercase); fplabour → FPlabour;
    // fp5-0/fp5-1 → array stored under FP5 (both sides).
    const normalized = slug.toUpperCase();
    if (slug.match(/^fp5-\d$/i)) {
      // FP5 has two art photos stored separately as fp5-0, fp5-1
      if (!specialPhotos['FP5']) specialPhotos['FP5'] = [null, null];
      const idx = parseInt(slug.slice(-1), 10);
      if (basenames[0]) specialPhotos['FP5'][idx] = basenames[0];
    } else if (slug.toLowerCase() === 'fplabour') {
      specialPhotos['FPlabour'] = basenames.length === 1 ? basenames[0] : basenames;
    } else if (slug.toLowerCase() === 'fpintro') {
      specialPhotos['FPintro'] = basenames.length === 1 ? basenames[0] : basenames;
    } else {
      // General FP slugs: fp1 → FP1, etc.
      const key = 'FP' + slug.replace(/^fp/i, '');
      specialPhotos[key] = basenames.length === 1 ? basenames[0] : basenames;
    }
  }
  // Cover photo — store as specialPhotos.cover (matches how export-pdf.js reads it)
  if (storedNames.cover) {
    specialPhotos.cover = path.basename(storedNames.cover);
  }

  return {
    schemaVersion:      3,
    template:           order.templateName || 'Scribble',
    pageCount:          order.pageCount    || 40,
    sequence:           order.staffBookSequence    || [],
    assignments:        order.staffBookAssignments || [],
    captions:           bookCaptions,
    coverCaptions,
    coverCaptionStyles,
    spreadCaptionStyles,
    heartCrop:          order.staffHeartCrop || {},
    specialPhotos,
    zodiacSign:         order.zodiacSign || (order.fpTexts && order.fpTexts.zodiac) || 'None',
    mapSelection:       order.fpTexts && order.fpTexts.fp1 ? order.fpTexts.fp1 : null,
  };
}

// ── Fetch all original photos from GCS into memory (in-region, no egress) ─────
async function fetchAllPhotos(storedNames) {
  const bufferMap = new Map();

  async function fetchOne(storedPath) {
    if (!storedPath) return;
    const base = path.basename(storedPath);
    if (bufferMap.has(base)) return; // already fetched
    try {
      const [contents] = await bucket.file(storedPath).download();
      bufferMap.set(base, contents);
    } catch (err) {
      console.warn(`  ⚠ Could not fetch photo ${storedPath}: ${err.message}`);
    }
  }

  const tasks = [];
  if (storedNames.cover) tasks.push(fetchOne(storedNames.cover));
  for (const paths of Object.values(storedNames.special || {})) {
    for (const p of (Array.isArray(paths) ? paths : [paths])) {
      if (p) tasks.push(fetchOne(p));
    }
  }
  for (const p of (storedNames.pool || [])) {
    if (p) tasks.push(fetchOne(p));
  }

  // Fetch in parallel (GCS in-region is fast + free)
  await Promise.all(tasks);
  console.log(`  Fetched ${bufferMap.size} photos from GCS`);
  return bufferMap;
}

// ── Upload PDF to GCS ─────────────────────────────────────────────────────────
// We do NOT sign the URL here: the Cloud Run runtime service account has no
// private key, so v4 signing would require the iam.serviceAccountTokenCreator
// role. Signing is done by the generatePdf Cloud Function (which has a key file)
// via the existing getPdfUrl path. The renderer just writes the file.
async function uploadPdf(pdfBytes, gcsPath) {
  await bucket.file(gcsPath).save(pdfBytes, { contentType: 'application/pdf' });
}

// ── Request handler ────────────────────────────────────────────────────────────
async function handleGenerate(body) {
  const { orderNumber } = body;
  if (!orderNumber) throw new Error('orderNumber is required');

  console.log(`\n📖 Generating PDF for order ${orderNumber}`);

  // 1. Read order from Firestore
  const docSnap = await db.collection('orders').doc(orderNumber).get();
  if (!docSnap.exists) throw new Error(`Order ${orderNumber} not found`);
  const order = docSnap.data();

  const storedNames = {
    cover:   order.photoManifest?.cover   || null,
    special: order.photoManifest?.special || {},
    pool:    order.photoManifest?.pool    || [],
  };

  const folderName = order.folderName;
  if (!folderName) throw new Error(`Order ${orderNumber} has no folderName`);

  // 2. Build state from Firestore
  const state = buildStateFromOrder(order, storedNames);
  console.log(`  Template: ${state.template}, ${state.sequence.length} spreads, ${state.pageCount} pages`);

  // 3. Fetch photos from GCS in-region (no internet egress)
  const bufferMap = await fetchAllPhotos(storedNames);

  // 4. Render PDF (uses the ported export-pdf.js logic)
  const pdfBytes = await generatePdfFromFirestore({
    ordNum:    orderNumber,
    stateData: state,
    bufferMap,
    fName:     folderName,
  });

  if (!pdfBytes || !pdfBytes.length) throw new Error('PDF render returned no bytes');

  // 5. Upload to GCS (signing happens in the generatePdf Cloud Function)
  const gcsPath = `${folderName}/pdfs/${orderNumber}_preview.pdf`;
  await uploadPdf(pdfBytes, gcsPath);

  console.log(`  ✅ PDF uploaded: gs://${BUCKET_NAME}/${gcsPath}`);
  return {
    gcsPath,
    sizeBytes: pdfBytes.length,
  };
}

// ── HTTP server ────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (req.method !== 'POST' || req.url !== '/generate') {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found — POST /generate' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', async () => {
    try {
      const parsed = JSON.parse(body || '{}');
      const result = await handleGenerate(parsed);
      res.writeHead(200);
      res.end(JSON.stringify(result));
    } catch (err) {
      console.error('Generate error:', err.message);
      const status = err.message.includes('not found') ? 404 : 500;
      res.writeHead(status);
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Aevia PDF renderer listening on port ${PORT}`);
});
