'use strict';

const http    = require('http');
const path    = require('path');
const { Firestore }  = require('@google-cloud/firestore');
const { Storage }    = require('@google-cloud/storage');
const { generatePdfFromFirestore, checkPageCountAgainstSequence } = require('../../scripts/export-pdf.js');

const PORT        = process.env.PORT || 8080;
const BUCKET_NAME = process.env.GCS_BUCKET || 'aevia-uploads-eu';
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
  // Cover photo — store as specialPhotos.cover (matches how export-pdf.js reads it).
  // Joyride's cover is a slot-ordered array of 4 paths; other templates a single path.
  if (Array.isArray(storedNames.cover)) {
    specialPhotos.cover = storedNames.cover.map(p => path.basename(p));
  } else if (storedNames.cover) {
    specialPhotos.cover = path.basename(storedNames.cover);
  }

  return {
    schemaVersion:      3,
    template:           order.templateName || 'Scribble',
    // Book language — picks the DE artwork variants in renderPage. Absent on every
    // pre-Stage-1 order, which is correct: they are English books.
    language:           order.language === 'de' ? 'de' : 'en',
    pageCount:          order.pageCount    || 40,
    sequence:           order.staffBookSequence    || [],
    assignments:        order.staffBookAssignments || [],
    captions:           bookCaptions,
    // Line breaks the engine actually produced. export-pdf.js draws these verbatim
    // instead of word-wrapping again, so print matches the approved screen exactly
    // (S159). Absent on orders saved before S159 → the PDF falls back to wrapping.
    captionLines:       order.staffBookCaptionLines || {},
    coverCaptions,
    coverCaptionStyles,
    spreadCaptionStyles,
    heartCrop:          order.staffHeartCrop || {},
    specialPhotos,
    zodiacSign:         order.zodiacSign || (order.fpTexts && order.fpTexts.zodiac) || 'None',
    mapSelection:       order.fpTexts && order.fpTexts.fp1 ? order.fpTexts.fp1 : null,
    // Heirloom family monogram — selects the cover + intro artwork and the letter
    // positions. Same route as zodiacSign: chosen on the product page, carried in
    // fpTexts (saveStaffState does not persist it). Null for every other template;
    // export-pdf.js then falls back to the template's defaultMonogram.
    monogram:           order.monogram || (order.fpTexts && order.fpTexts.monogram) || null,
  };
}

// ── Fetch all original photos from GCS into memory (in-region, no egress) ─────
// A stalled GCS stream never resolves OR rejects, so a bare `.download()` can hang
// forever — the whole render then sits until Cloud Run's 900s kill, and the dashboard
// polls at 0% the entire time (getPdfStatus never sees done/error). Cap each download
// so a stall becomes a fast, named failure that handleGenerate reports as status:error.
const PHOTO_DOWNLOAD_TIMEOUT_MS = 120000; // in-region reads are normally < 1s

async function fetchAllPhotos(storedNames) {
  const bufferMap = new Map();

  async function fetchOne(storedPath) {
    if (!storedPath) return;
    const base = path.basename(storedPath);
    if (bufferMap.has(base)) return; // already fetched
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`photo download timed out after ${PHOTO_DOWNLOAD_TIMEOUT_MS / 1000}s: ${storedPath}`)),
        PHOTO_DOWNLOAD_TIMEOUT_MS,
      );
    });
    try {
      const [contents] = await Promise.race([bucket.file(storedPath).download(), timeout]);
      bufferMap.set(base, contents);
    } catch (err) {
      // A missing/failed photo is non-fatal (skip it). But a TIMEOUT means a stalled
      // stream that would otherwise hang the whole render — rethrow so the book fails
      // loudly in seconds with the offending path, instead of a silent 15-min stall.
      if (/timed out/.test(err.message)) throw err;
      console.warn(`  ⚠ Could not fetch photo ${storedPath}: ${err.message}`);
    } finally {
      clearTimeout(timer);
    }
  }

  // Collect every path to fetch (cover + specials + the whole uploaded pool).
  const toFetch = [];
  if (Array.isArray(storedNames.cover)) toFetch.push(...storedNames.cover.filter(Boolean));
  else if (storedNames.cover) toFetch.push(storedNames.cover);
  for (const paths of Object.values(storedNames.special || {})) {
    for (const p of (Array.isArray(paths) ? paths : [paths])) {
      if (p) toFetch.push(p);
    }
  }
  for (const p of (storedNames.pool || [])) {
    if (p) toFetch.push(p);
  }

  // Fetch with BOUNDED concurrency. An unbounded Promise.all over the whole pool is
  // fine for small books but melts on large ones: a 40-page order can carry 100+
  // originals at 20-66MB each (~2GB) — downloading them all at once stalls the streams
  // and the render never finishes before Cloud Run's 900s kill. A small worker pool
  // keeps memory + open connections bounded while staying fast in-region.
  const CONCURRENCY = 6;
  let cursor = 0;
  async function worker() {
    while (cursor < toFetch.length) {
      const p = toFetch[cursor++];
      await fetchOne(p);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, toFetch.length) }, worker));
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

// ── Progress / status reporting ────────────────────────────────────────────────
// Written to the order's pdfRender field so the dashboard can poll it for a live
// progress bar (via the getPdfStatus Cloud Function). The generatePdf function
// fires this render and disconnects; Firestore is the only channel back to the UI.
async function writeStatus(orderNumber, patch) {
  try {
    await db.collection('orders').doc(orderNumber).update({
      pdfRender: { ...patch, updatedAt: new Date() },
    });
  } catch (err) {
    console.warn(`  ⚠ Could not write pdfRender status: ${err.message}`);
  }
}

// ── Request handler ────────────────────────────────────────────────────────────
async function handleGenerate(body) {
  const { orderNumber } = body;
  if (!orderNumber) throw new Error('orderNumber is required');
  // 'preview' = one customer-facing PDF; 'print' = cover + inside for the print house.
  const pdfMode = body.mode === 'print' ? 'print' : 'preview';

  console.log(`\n📖 Generating ${pdfMode} PDF for order ${orderNumber}`);

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
  const total = state.sequence.length;
  console.log(`  Template: ${state.template}, ${total} spreads, ${state.pageCount} pages`);

  // The cover spine is sized from pageCount while the interior comes from the sequence;
  // if they disagree the book prints with a spine that does not match its own thickness.
  // Note buildStateFromOrder defaults a missing pageCount to 40, so an 80pp order with
  // no field would otherwise get a 10mm spine silently — this catches that too.
  const msg = checkPageCountAgainstSequence(state.pageCount, total);
  if (msg) {
    if (pdfMode === 'print') {
      // Print reaches the print house and the error is unrecoverable once bound. Stop.
      throw new Error(msg);
    }
    // Preview is for eyeballing, so let it render — but make the mismatch impossible to
    // miss rather than leaving it in container logs the owner never reads.
    console.warn(`  ⚠ ${msg}`);
    state.pageCountWarning = msg;
  }

  // Mark rendering immediately — the generatePdf function polls for this to confirm
  // the render actually started (covering Cloud Run cold-starts) before it returns.
  await writeStatus(orderNumber, { status: 'rendering', mode: pdfMode, done: 0, total, pageCount: state.pageCount });

  // 3. Fetch photos from GCS in-region (no internet egress)
  const bufferMap = await fetchAllPhotos(storedNames);

  // 4. Render PDF (uses the ported export-pdf.js logic). Throttle progress writes
  //    to ~1 per 1.5s so we don't hammer Firestore on fast spreads.
  let lastWrite = 0;
  const progressCb = async (done, tot) => {
    const now = Date.now();
    if (now - lastWrite < 1500) return;
    lastWrite = now;
    await writeStatus(orderNumber, { status: 'rendering', done, total: tot, pageCount: state.pageCount });
  };
  const result = await generatePdfFromFirestore({
    ordNum:    orderNumber,
    stateData: state,
    bufferMap,
    fName:     folderName,
    progressCb,
    pdfMode,
  });

  // 5. Upload to GCS (signing happens in the generatePdf / getPdfStatus Cloud Function)
  if (pdfMode === 'print') {
    // Two documents on purpose: the cover is a wide wrap (back|spine|front) and the
    // inside is square single pages. Mixed page sizes in one PDF get rejected by the
    // print house, so they never get merged.
    const { coverBytes, insideBytes } = result || {};
    if (!coverBytes || !coverBytes.length)  throw new Error('Print render returned no cover bytes');
    if (!insideBytes || !insideBytes.length) throw new Error('Print render returned no inside bytes');

    const coverPath  = `${folderName}/pdfs/${orderNumber}_print_cover.pdf`;
    const insidePath = `${folderName}/pdfs/${orderNumber}_print_inside.pdf`;
    await uploadPdf(coverBytes, coverPath);
    await uploadPdf(insideBytes, insidePath);

    console.log(`  ✅ Print PDFs uploaded: gs://${BUCKET_NAME}/${coverPath} + _print_inside.pdf`);
    await writeStatus(orderNumber, {
      status: 'done', mode: 'print', done: total, total, pageCount: state.pageCount,
      coverPath, insidePath,
      coverSizeBytes:  coverBytes.length,
      insideSizeBytes: insideBytes.length,
    });
    return { coverPath, insidePath, coverSizeBytes: coverBytes.length, insideSizeBytes: insideBytes.length };
  }

  const pdfBytes = result;
  if (!pdfBytes || !pdfBytes.length) throw new Error('PDF render returned no bytes');

  const gcsPath = `${folderName}/pdfs/${orderNumber}_preview.pdf`;
  await uploadPdf(pdfBytes, gcsPath);

  console.log(`  ✅ PDF uploaded: gs://${BUCKET_NAME}/${gcsPath}`);
  await writeStatus(orderNumber, {
    status: 'done', mode: 'preview', done: total, total, pageCount: state.pageCount,
    sizeBytes: pdfBytes.length, gcsPath,
    // Spread only when set — Firestore rejects undefined field values.
    ...(state.pageCountWarning ? { warning: state.pageCountWarning } : {}),
  });
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
    let parsed = {};
    try {
      parsed = JSON.parse(body || '{}');
      const result = await handleGenerate(parsed);
      res.writeHead(200);
      res.end(JSON.stringify(result));
    } catch (err) {
      console.error('Generate error:', err.message);
      // Record the failure so the polling dashboard stops and shows the error,
      // even though the generatePdf function likely already disconnected.
      if (parsed.orderNumber) await writeStatus(parsed.orderNumber, { status: 'error', error: err.message });
      const status = err.message.includes('not found') ? 404 : 500;
      res.writeHead(status);
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`Aevia PDF renderer listening on port ${PORT}`);
});
