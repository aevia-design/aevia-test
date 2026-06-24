const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createUploadSessionHandler, confirmUploadHandler } = require('./upload');

admin.initializeApp();

// ── Staff auth (chunk-018) ─────────────────────────────────────────────────
// Allowlist of staff Firebase Auth accounts. Email/Password sign-up is open on
// the project, so we must check the email — a valid token alone is NOT enough.
// Emails compared lower-case. Add/remove people here (redeploy to apply).
const STAFF_EMAILS = ['evg.myasin@gmail.com', 'xenia@aevia.at'];

// Returns true if the request is from authorised staff: either a valid Firebase
// ID token (Authorization: Bearer <token>) for an allowlisted email, OR the
// static staff key. As of chunk-018 the key is no longer used by any browser
// page (dashboard + engine send tokens) — it is retained ONLY for the local PDF
// export CLI (scripts/export-pdf.js), which has no logged-in user. To fully
// retire the key, migrate that script to admin credentials.
async function isStaff(req) {
  const authHeader = req.headers.authorization || '';
  const m = authHeader.match(/^Bearer (.+)$/);
  if (m) {
    try {
      const decoded = await admin.auth().verifyIdToken(m[1]);
      const email = (decoded.email || '').toLowerCase();
      if (STAFF_EMAILS.includes(email)) return true;
    } catch (e) {
      // invalid/expired token — fall through to legacy key check
    }
  }
  return req.headers['x-staff-key'] === process.env.STAFF_KEY;
}

exports.createUploadSession = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 120, memory: '256MB' })
  .https.onRequest(createUploadSessionHandler);

// ── CHUNK 4 PART B: Confirm uploads complete, flip status to 'new', send customer email ──
exports.confirmUpload = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(confirmUploadHandler);

// ── Caption generator ────────────────────────────────────────────────────────
// Accepts multipart/form-data: image (JPEG blob) + collection + note (optional)
// Returns { caption: "..." }
const fs = require('fs');
const path = require('path');
const CAPTION_VOICE = fs.readFileSync(path.join(__dirname, 'caption/caption-voice.md'), 'utf8');

exports.generateCaption = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

    try {
      const OpenAI = require('openai');
      const client = new OpenAI.default({ apiKey: process.env.OPENAI_API_KEY });

      // Expect JSON body: { image: "<base64>", collection: "kids", note: "optional", previousCaptions: [] }
      const { image, collection = 'kids', note, previousCaptions } = req.body;
      if (!image) { res.status(400).json({ error: 'image (base64) is required' }); return; }

      const userLines = [`Collection: ${collection}`];
      if (note) userLines.push(`Customer note: "${note}"`);
      if (Array.isArray(previousCaptions) && previousCaptions.length > 0) {
        userLines.push('');
        userLines.push('Captions already used elsewhere in this book — do not repeat similar phrasing, structure, opening words, or emotional register:');
        previousCaptions.slice(-8).forEach(c => userLines.push(`- ${c}`));
      }
      userLines.push('', 'IMPORTANT: Do not start the caption with the word "A" or "An".');
      userLines.push('Generate one caption for this photo. Return only the caption text, nothing else.');

      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 100,
        messages: [
          { role: 'system', content: CAPTION_VOICE },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } },
              { type: 'text', text: userLines.join('\n') },
            ],
          },
        ],
      });

      const caption = response.choices[0].message.content.trim();
      res.json({ caption });
    } catch (err) {
      console.error('generateCaption error:', err);
      res.status(500).json({ error: err.message });
    }
  });

// ── Get order (staff tool + customer preview — returns Firestore doc + signed read URLs) ────────
exports.getOrder = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 60, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Staff-Key, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const hasStaffAuth = await isStaff(req);
    const { orderNumber, token } = req.body;

    // Auth: require either staff key or customer token
    if (!hasStaffAuth && !token) {
      return res.status(403).json({ error: 'Unauthorised' });
    }

    try {
      const db = admin.firestore();
      let doc;

      if (hasStaffAuth) {
        // Staff path: fetch by orderNumber
        if (!orderNumber) return res.status(400).json({ error: 'orderNumber required' });
        doc = await db.collection('orders').doc(orderNumber).get();
        if (!doc.exists) return res.status(404).json({ error: `Order ${orderNumber} not found` });
      } else {
        // Customer path: fetch by previewToken
        const snapshot = await db.collection('orders')
          .where('previewToken', '==', token)
          .limit(1)
          .get();

        if (snapshot.empty) {
          return res.status(403).json({ error: 'Invalid or expired token' });
        }

        doc = snapshot.docs[0];
      }

      const order    = doc.data();
      const manifest = order.photoManifest || { cover: null, special: {}, pool: [] };

      const { Storage } = require('@google-cloud/storage');
      const storage  = new Storage({ keyFilename: './serviceAccountKey.json' });
      const bucket   = storage.bucket('aevia-uploads-eu');
      const expires  = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      async function signedReadUrl(storedName) {
        if (!storedName) return null;
        const [url] = await bucket.file(storedName).getSignedUrl({ action: 'read', version: 'v4', expires });
        return url;
      }

      // ── Chunk-023: Derive derivative URLs (web-resolution for screen rendering) ──
      // For each original, derive the derivative path and check if it exists in GCS.
      // If yes, return signed URL for derivative. If no (legacy orders), return null
      // so engines fallback to the original.
      const { deriveDerivativePath } = require('./derivative-utils');

      async function signedDerivativeUrl(originalStoredName) {
        if (!originalStoredName) return null;
        const derivativePath = deriveDerivativePath(originalStoredName);
        if (!derivativePath) return null;
        try {
          // Check if derivative exists (GCS file.exists() is fast, uses head request)
          const [exists] = await bucket.file(derivativePath).exists();
          if (!exists) return null;
          // Derivative exists — sign and return its URL
          const [url] = await bucket.file(derivativePath).getSignedUrl({ action: 'read', version: 'v4', expires });
          return url;
        } catch (err) {
          console.warn(`Error checking derivative for ${originalStoredName}:`, err.message);
          return null; // Graceful fallback if derivative check fails
        }
      }

      const signedUrls = { cover: null, special: {}, pool: [] };
      const derivativeUrls = { cover: null, special: {}, pool: [] };

      // Originals (for PDF export — chunk-023 does not modify this path)
      signedUrls.cover = await signedReadUrl(manifest.cover);
      for (const [slug, paths] of Object.entries(manifest.special || {})) {
        signedUrls.special[slug] = await Promise.all((Array.isArray(paths) ? paths : [paths]).map(p => signedReadUrl(p)));
      }
      signedUrls.pool = await Promise.all((manifest.pool || []).map(p => signedReadUrl(p)));

      // Derivatives (for engine rendering — chunk-023, with fallback to originals)
      derivativeUrls.cover = await signedDerivativeUrl(manifest.cover);
      for (const [slug, paths] of Object.entries(manifest.special || {})) {
        derivativeUrls.special[slug] = await Promise.all((Array.isArray(paths) ? paths : [paths]).map(p => signedDerivativeUrl(p)));
      }
      derivativeUrls.pool = await Promise.all((manifest.pool || []).map(p => signedDerivativeUrl(p)));

      return res.status(200).json({
        orderNumber:          order.orderNumber,
        customerName:         order.customerName,
        templateName:         order.templateName || null,
        email:                order.email || null,
        status:               order.status || null,
        price:                order.price || null,
        pageCount:            order.pageCount,
        fpSelections:         order.fpSelections || [],
        fpTexts:              order.fpTexts || {},
        photoNotes:           order.photoNotes || null,
        coverCaptions:        order.coverCaptions || null,
        coverCaptionStyles:   order.coverCaptionStyles || null,
        staffBookAssignments: order.staffBookAssignments || null,
        staffBookCaptions:    order.staffBookCaptions    || null,
        staffBookSequence:    order.staffBookSequence    || null,
        staffHeartCrop:       order.staffHeartCrop       || null,
        staffCoverCaptionStyles:  order.staffCoverCaptionStyles  || null,
        staffSpreadCaptionStyles: order.staffSpreadCaptionStyles || null,
        // Customer's own saved edits — replayed on reopen so a closed tab loses nothing.
        customerBookAssignments:    order.customerBookAssignments    || null,
        customerCaptions:           order.customerCaptions           || null,
        customerCaptionStyles:      order.customerCaptionStyles      || null,
        customerCoverCaptionStyles: order.customerCoverCaptionStyles || null,
        signedUrls,
        derivativeUrls, // chunk-023: web-resolution URLs for engine rendering (fallback to signedUrls)
        storedNames: {
          cover:            manifest.cover            || null,
          special:          manifest.special          || {},
          pool:             manifest.pool             || [],
          poolOriginalNames: manifest.poolOriginalNames || [],
        },
      });
    } catch (err) {
      console.error('getOrder error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

// ── Save order state (customer preview edits) ────────────────────────────────
// Accepts { token, bookAssignments, captions, spreadCaptionStyles } from customer-preview.html
exports.saveOrderState = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const { token, bookAssignments, captions, spreadCaptionStyles, coverCaptionStyles } = req.body;
    if (!token) return res.status(403).json({ error: 'Token required' });

    try {
      const db = admin.firestore();
      const snapshot = await db.collection('orders')
        .where('previewToken', '==', token)
        .limit(1)
        .get();

      if (snapshot.empty) return res.status(403).json({ error: 'Invalid or expired token' });

      await snapshot.docs[0].ref.update({
        customerBookAssignments: bookAssignments || null,
        customerCaptions:        captions        || null,
        customerCaptionStyles:   spreadCaptionStyles || null,
        customerCoverCaptionStyles: coverCaptionStyles || null,
        customerUpdatedAt:       admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('saveOrderState error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

// ── Approve order (customer approves book, staff state merges to final) ────────
exports.approveOrder = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const { token } = req.body;
    if (!token) return res.status(403).json({ error: 'Token required' });

    try {
      const db = admin.firestore();
      const snapshot = await db.collection('orders')
        .where('previewToken', '==', token)
        .limit(1)
        .get();

      if (snapshot.empty) return res.status(403).json({ error: 'Invalid or expired token' });

      const orderRef = snapshot.docs[0].ref;
      const orderData = snapshot.docs[0].data();

      if (orderData.status === 'approved' || orderData.status === 'paid') {
        return res.status(409).json({ error: 'Order is already approved or paid' });
      }

      // Merge customer-approved state into staff fields
      // Only overwrite if customer field exists and is not null
      const updates = {
        status: 'approved',
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        statusHistory: admin.firestore.FieldValue.arrayUnion({
          status: 'approved',
          timestamp: admin.firestore.Timestamp.now()
        })
      };

      // Copy customer fields to staff fields, respecting existing staff values if customer is null
      if (orderData.customerBookAssignments != null) {
        updates.staffBookAssignments = orderData.customerBookAssignments;
      }
      if (orderData.customerCaptions != null) {
        updates.staffBookCaptions = orderData.customerCaptions;
      }
      if (orderData.customerCaptionStyles != null) {
        updates.staffSpreadCaptionStyles = orderData.customerCaptionStyles;
      }
      if (orderData.customerCoverCaptionStyles != null) {
        updates.staffCoverCaptionStyles = orderData.customerCoverCaptionStyles;
      }
      if (orderData.customerBookSequence != null) {
        updates.staffBookSequence = orderData.customerBookSequence;
      }

      await orderRef.update(updates);

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('approveOrder error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

// ── Save staff book state (assignments + captions) ───────────────────────────
// Accepts { orderNumber, bookAssignments, bookCaptions } with x-staff-key header
exports.saveStaffState = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Staff-Key, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    if (!(await isStaff(req))) {
      return res.status(403).json({ error: 'Unauthorised' });
    }

    const { orderNumber, bookAssignments, bookCaptions, bookSequence,
            coverCaptionStyles, spreadCaptionStyles, heartCrop,
            bookComplete, incompleteReasons } = req.body;
    if (!orderNumber) return res.status(400).json({ error: 'orderNumber required' });

    try {
      const db = admin.firestore();
      const doc = await db.collection('orders').doc(orderNumber).get();
      if (!doc.exists) return res.status(404).json({ error: `Order ${orderNumber} not found` });

      await doc.ref.update({
        staffBookAssignments: bookAssignments || null,
        staffBookCaptions:    bookCaptions    || null,
        staffBookSequence:    bookSequence    || null,
        staffCoverCaptionStyles:  coverCaptionStyles  || null,
        staffSpreadCaptionStyles: spreadCaptionStyles || null,
        staffHeartCrop:       heartCrop || null,
        staffBookComplete:    bookComplete === true,
        staffIncompleteReasons: incompleteReasons || [],
        staffSavedAt:         admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('saveStaffState error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

// ── Save book state to GCS (staff tool) ──────────────────────────────────────
// Accepts { orderNumber, bookState } with x-staff-key header
// Writes book-state.json to GCS at {folderName}/book-state.json
exports.saveBookState = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Staff-Key, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    if (!(await isStaff(req))) {
      return res.status(403).json({ error: 'Unauthorised' });
    }

    const { orderNumber, bookState } = req.body;
    if (!orderNumber) return res.status(400).json({ error: 'orderNumber required' });
    if (!bookState) return res.status(400).json({ error: 'bookState required' });

    try {
      const db = admin.firestore();
      const doc = await db.collection('orders').doc(orderNumber).get();
      if (!doc.exists) return res.status(404).json({ error: `Order ${orderNumber} not found` });

      const order = doc.data();
      const folderName = order.folderName;
      if (!folderName) return res.status(400).json({ error: 'Order has no folderName' });

      const { Storage } = require('@google-cloud/storage');
      const storage = new Storage({ keyFilename: './serviceAccountKey.json' });
      const bucket = storage.bucket('aevia-uploads-eu');
      const gcsPath = `${folderName}/book-state.json`;
      const jsonString = JSON.stringify(bookState, null, 2);

      await bucket.file(gcsPath).save(jsonString, { contentType: 'application/json' });

      return res.status(200).json({ success: true, gcsPath });
    } catch (err) {
      console.error('saveBookState error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

// ── Generate PDF (chunk-024) ─────────────────────────────────────────────────
// Staff-triggered from the dashboard. Delegates to the Cloud Run pdf-renderer
// service which reads photos from GCS in-region (no egress) and renders the PDF.
// The service URL is configured via the PDF_RENDERER_URL environment variable.
// generatePdf is a thin TRIGGER, not a synchronous waiter. The render takes
// 3–13 min depending on book size — far longer than a Cloud Function can stay
// alive — so we fire the Cloud Run renderer, confirm it has started (by polling
// the pdfRender.status it writes to Firestore, which covers cold starts), then
// return immediately. The dashboard polls getPdfStatus for live progress + the
// final signed URL. Cloud Run keeps rendering after this function disconnects.
exports.generatePdf = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 60, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Staff-Key, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    if (!(await isStaff(req))) {
      return res.status(403).json({ error: 'Unauthorised' });
    }

    const { orderNumber } = req.body;
    if (!orderNumber) return res.status(400).json({ error: 'orderNumber required' });

    const rendererUrl = process.env.PDF_RENDERER_URL;
    if (!rendererUrl) return res.status(500).json({ error: 'PDF_RENDERER_URL not configured' });

    try {
      // Verify order exists and has valid status
      const db = admin.firestore();
      const docRef = db.collection('orders').doc(orderNumber);
      const doc = await docRef.get();
      if (!doc.exists) return res.status(404).json({ error: `Order ${orderNumber} not found` });
      const order = doc.data();
      if (!['approved', 'paid', 'new'].includes(order.status)) {
        return res.status(400).json({ error: `Order status '${order.status}' is not eligible for PDF generation` });
      }

      // Mark queued so the dashboard sees movement instantly, even before Cloud Run
      // (possibly cold-starting) writes its first 'rendering' status.
      await docRef.update({ pdfRender: { status: 'starting', updatedAt: new Date() } });

      // Fire the renderer. We deliberately do NOT await it to completion — Cloud Run
      // continues server-side after we disconnect. .catch swallows the expected
      // connection drop when this function returns and freezes.
      fetch(`${rendererUrl}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber }),
      }).catch(() => {});

      // Confirm the render actually started (Cloud Run sets status='rendering' first
      // thing). Poll up to ~45s to absorb a cold start, then return.
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const deadline = Date.now() + 45000;
      while (Date.now() < deadline) {
        await sleep(1500);
        const pr = (await docRef.get()).data().pdfRender || {};
        if (pr.status === 'error') return res.status(500).json({ error: pr.error || 'Render failed to start' });
        if (pr.status === 'rendering' || pr.status === 'done') {
          return res.status(202).json({ started: true });
        }
      }
      return res.status(504).json({ error: 'Renderer did not start in time — try again' });
    } catch (err) {
      console.error('generatePdf error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

// ── Get PDF render status (chunk-024, polling) ───────────────────────────────
// The dashboard polls this for the progress bar. Returns the order's pdfRender
// field; when status is 'done', also mints the signed preview URL (the renderer
// can't sign — no private key; this function has serviceAccountKey.json).
exports.getPdfStatus = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Staff-Key, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    if (!(await isStaff(req))) {
      return res.status(403).json({ error: 'Unauthorised' });
    }

    const { orderNumber } = req.body;
    if (!orderNumber) return res.status(400).json({ error: 'orderNumber required' });

    try {
      const db = admin.firestore();
      const doc = await db.collection('orders').doc(orderNumber).get();
      if (!doc.exists) return res.status(404).json({ error: `Order ${orderNumber} not found` });
      const order = doc.data();
      const pr = order.pdfRender || { status: 'none' };

      const out = {
        status:    pr.status || 'none',
        done:      pr.done    || 0,
        total:     pr.total   || 0,
        sizeBytes: pr.sizeBytes || 0,
        error:     pr.error   || null,
      };

      if (pr.status === 'done') {
        const folderName = order.folderName;
        const gcsPath = pr.gcsPath || `${folderName}/pdfs/${orderNumber}_preview.pdf`;
        const { Storage } = require('@google-cloud/storage');
        const storage = new Storage({ keyFilename: './serviceAccountKey.json' });
        const bucket  = storage.bucket('aevia-uploads-eu');
        const expires = new Date(Date.now() + 60 * 60 * 1000);
        const [url] = await bucket.file(gcsPath).getSignedUrl({ action: 'read', version: 'v4', expires });
        out.previewUrl = url;
      }

      return res.status(200).json(out);
    } catch (err) {
      console.error('getPdfStatus error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

// ── HEIC → JPEG converter ────────────────────────────────────────────────────
exports.convertHeic = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 120, memory: '1GB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

    try {
      const heicConvert = require('heic-convert');
      const sharp = require('sharp');
      const exifr = require('exifr');
      const inputBuffer = req.rawBody;
      if (!inputBuffer || inputBuffer.length === 0) {
        res.status(400).json({ error: 'Empty body' });
        return;
      }

      // Read EXIF orientation from the original HEIC before conversion
      // (heic-convert strips EXIF, so we must capture it first)
      let exifOrientation = 1;
      try {
        const exif = await exifr.parse(inputBuffer, ['Orientation']);
        if (exif && exif.Orientation) exifOrientation = exif.Orientation;
        console.log('HEIC EXIF orientation:', exifOrientation);
      } catch (e) { console.warn('EXIF read failed:', e.message); }

      // Convert HEIC → JPEG (pixels only, no rotation applied yet)
      const jpegBuffer = await heicConvert({
        buffer: inputBuffer,
        format: 'JPEG',
        quality: 0.9,
      });

      // Physically rotate pixels so output JPEG needs no rotation tag.
      // EXIF orientation values → degrees: 3=180°, 6=90° CW, 8=90° CCW
      const rotationMap = { 3: 180, 6: 90, 8: -90 };
      const rotateDeg = rotationMap[exifOrientation] || 0;
      let finalBuffer = Buffer.from(jpegBuffer);
      if (rotateDeg !== 0) {
        finalBuffer = await sharp(finalBuffer).rotate(rotateDeg).jpeg({ quality: 90 }).toBuffer();
        console.log(`Rotated JPEG by ${rotateDeg}°`);
      }

      res.set('Content-Type', 'image/jpeg');
      res.send(finalBuffer);
    } catch (err) {
      console.error('convertHeic error:', err);
      res.status(500).json({ error: err.message });
    }
  });

// ── Create Checkout Session (Stripe payment) ─────────────────────────────────
exports.createCheckoutSession = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Staff-Key, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const hasStaffAuth = await isStaff(req);
    const { orderNumber, token } = req.body;

    // Auth: require either staff key or customer token
    if (!hasStaffAuth && !token) {
      return res.status(403).json({ error: 'Unauthorised' });
    }

    try {
      const db = admin.firestore();
      let order;
      let resolvedOrderNumber;

      if (hasStaffAuth) {
        // Staff path: fetch by orderNumber
        if (!orderNumber) return res.status(400).json({ error: 'orderNumber required' });
        const doc = await db.collection('orders').doc(orderNumber).get();
        if (!doc.exists) return res.status(404).json({ error: `Order ${orderNumber} not found` });
        order = doc.data();
      } else {
        // Customer path: fetch by previewToken
        if (!token) return res.status(400).json({ error: 'token required' });
        const snapshot = await db.collection('orders')
          .where('previewToken', '==', token)
          .limit(1)
          .get();

        if (snapshot.empty) {
          return res.status(403).json({ error: 'Invalid or expired token' });
        }

        order = snapshot.docs[0].data();
        resolvedOrderNumber = snapshot.docs[0].id;
      }

      const orderNum = hasStaffAuth ? (order.orderNumber || orderNumber) : resolvedOrderNumber;

      // Validate order status is approved
      if (order.status !== 'approved') {
        return res.status(409).json({ error: 'Order must be approved before payment' });
      }

      // Construct success/cancel URLs with token
      const baseUrl = 'https://aevia-test.pages.dev/pages/customer-preview.html';
      const successUrl = `${baseUrl}?token=${token || order.previewToken}&payment=success`;
      const cancelUrl = `${baseUrl}?token=${token || order.previewToken}`;

      // Pick the Stripe price by book size: 80-page books use STRIPE_PRICE_ID_80,
      // everything else the 40-page STRIPE_PRICE_ID_40 (both set in functions/.env).
      // Server-controlled — the price is NEVER taken from the client order amount.
      // Each var falls back to the legacy STRIPE_PRICE_ID so payment never breaks if
      // one is unset (it just bills the legacy price until the new vars are configured).
      const price40 = process.env.STRIPE_PRICE_ID_40 || process.env.STRIPE_PRICE_ID;
      const price80 = process.env.STRIPE_PRICE_ID_80 || price40;
      const priceId = (Number(order.pageCount) >= 80) ? price80 : price40;

      // Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          orderNumber: orderNum,
          token: token || order.previewToken,
        },
      });

      return res.status(200).json({ url: session.url });
    } catch (err) {
      console.error('createCheckoutSession error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

// ── Stripe Webhook (payment completion) ──────────────────────────────────────
exports.stripeWebhook = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      // Verify Stripe signature
      const signature = req.headers['stripe-signature'];
      const event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      // Handle checkout.session.completed event
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const orderNumber = session.metadata?.orderNumber;
        const token = session.metadata?.token;

        if (!orderNumber) {
          console.warn('Webhook: no orderNumber in metadata');
          return res.status(200).json({ received: true });
        }

        const db = admin.firestore();
        const orderRef = db.collection('orders').doc(orderNumber);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
          console.warn('Webhook: order not found:', orderNumber);
          return res.status(200).json({ received: true });
        }

        const order = orderDoc.data();

        // Idempotency guard — Stripe may deliver the same event more than once
        if (order.status === 'paid') {
          console.log('Webhook: order already paid, skipping:', orderNumber);
          return res.status(200).json({ received: true });
        }

        // Update order status to 'paid' and append to statusHistory
        await orderRef.update({
          status: 'paid',
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          statusHistory: admin.firestore.FieldValue.arrayUnion({
            status: 'paid',
            timestamp: admin.firestore.Timestamp.now(),
          }),
        });

        // Send staff notification email
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        await transporter.sendMail({
          from: `"Aevia Orders" <${process.env.EMAIL_USER}>`,
          to: process.env.EMAIL_NOTIFY,
          subject: `[${orderNumber}] Payment received — ready for print`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;color:#333">
              <h2 style="border-bottom:2px solid #eee;padding-bottom:12px">
                Payment Received
              </h2>
              <p style="margin:16px 0">Payment confirmed for order <strong>${orderNumber}</strong>.</p>
              <p style="margin:16px 0">Customer: <strong>${order.customerName}</strong></p>
              <p style="margin:16px 0">The book is ready to be sent to print.</p>
              <p style="color:#999;font-size:12px;margin-top:24px">
                Received ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}
              </p>
            </div>
          `,
        });

        console.log('Order paid:', orderNumber);
      }

      // Always return 200 for webhook success
      return res.status(200).json({ received: true });
    } catch (err) {
      console.error('stripeWebhook error:', err);
      return res.status(400).json({ error: err.message });
    }
  });

// ── Get PDF signed URL (staff tool) ─────────────────────────────────────────
// Accepts { orderNumber, type } with x-staff-key header
// Returns { url } — signed GCS URL (1h expiry) if file exists, or { url: null } if not
exports.getPdfUrl = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Staff-Key, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    if (!(await isStaff(req))) {
      return res.status(403).json({ error: 'Unauthorised' });
    }

    const { orderNumber, type } = req.body;
    if (!orderNumber) return res.status(400).json({ error: 'orderNumber required' });
    if (!type || !['preview', 'print'].includes(type)) {
      return res.status(400).json({ error: 'type must be "preview" or "print"' });
    }

    try {
      const db = admin.firestore();
      const doc = await db.collection('orders').doc(orderNumber).get();
      if (!doc.exists) return res.status(404).json({ error: `Order ${orderNumber} not found` });

      const order = doc.data();
      const folderName = order.folderName;
      if (!folderName) return res.status(400).json({ error: 'Order has no folderName' });

      const { Storage } = require('@google-cloud/storage');
      const storage = new Storage({ keyFilename: './serviceAccountKey.json' });
      const bucket = storage.bucket('aevia-uploads-eu');
      const gcsPath = `${folderName}/pdfs/${orderNumber}_${type}.pdf`;

      // Check if file exists
      const [exists] = await bucket.file(gcsPath).exists();
      if (!exists) {
        return res.status(200).json({ url: null });
      }

      // Generate 1-hour signed URL
      const expires = new Date(Date.now() + 60 * 60 * 1000);
      const [url] = await bucket.file(gcsPath).getSignedUrl({
        action: 'read',
        version: 'v4',
        expires
      });

      return res.status(200).json({ url });
    } catch (err) {
      console.error('getPdfUrl error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

// ── Mark order as sent to print (staff tool) ────────────────────────────────
// Accepts { orderNumber } with x-staff-key header
// Transitions order from 'paid' to 'sent_to_print', guarded against wrong state
exports.markSentToPrint = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Staff-Key, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    if (!(await isStaff(req))) {
      return res.status(403).json({ error: 'Unauthorised' });
    }

    const { orderNumber } = req.body;
    if (!orderNumber) return res.status(400).json({ error: 'orderNumber required' });

    try {
      const db = admin.firestore();
      const doc = await db.collection('orders').doc(orderNumber).get();
      if (!doc.exists) return res.status(404).json({ error: `Order ${orderNumber} not found` });

      const order = doc.data();

      // Guard: only transition from 'paid' status (idempotency + state guard)
      if (order.status !== 'paid') {
        return res.status(409).json({ error: 'Order must be in paid status' });
      }

      // Transition to 'sent_to_print' with server timestamp and statusHistory entry
      // NOTE (S11 invariant): Timestamp.now() inside arrayUnion, not serverTimestamp()
      await doc.ref.update({
        status: 'sent_to_print',
        sentToPrintAt: admin.firestore.FieldValue.serverTimestamp(),
        statusHistory: admin.firestore.FieldValue.arrayUnion({
          status: 'sent_to_print',
          timestamp: admin.firestore.Timestamp.now()
        })
      });

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('markSentToPrint error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

// ── Generate web-resolution photo derivatives (chunk-023) ────────────────────
// GCS Storage trigger: onFinalize for all files in the bucket.
// When an original photo is uploaded, generates a ~1600px long-edge JPEG derivative.
// Skips files already under a 'previews/' path (avoid infinite recursion).
// Skips non-image objects (avoid crashes on text/JSON/PDF).
//
// Derivative spec: ~1600px long edge, JPEG quality ~80 (screen-only, not print).
// Naming: original `<folder>/<category>/<name>` → derivative `<folder>/<category>/previews/<name>`
// This allows getOrder to derive the derivative URL from the original's storedName path.
const { deriveDerivativePath, isDerivativePath, isImageFile } = require('./derivative-utils');

exports.generateDerivative = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 120, memory: '1GB' })
  .storage.bucket('aevia-uploads-eu').object().onFinalize(async (object, context) => {
    const storagePath = object.name; // Full path in GCS
    const bucketName = object.bucket;

    // Guard 1: Skip objects already under a 'previews/' path (avoid infinite recursion)
    if (isDerivativePath(storagePath)) {
      console.log(`Skipping derivative path: ${storagePath}`);
      return;
    }

    // Guard 2: Skip non-image objects (avoid crashes when sharp decodes them)
    if (!isImageFile(storagePath)) {
      console.log(`Skipping non-image file: ${storagePath}`);
      return;
    }

    try {
      const sharp = require('sharp');
      const { Storage } = require('@google-cloud/storage');
      const storage = new Storage();
      const bucket = storage.bucket(bucketName);

      // Download the original photo
      const originalFile = bucket.file(storagePath);
      const [originalBuffer] = await originalFile.download();

      // Generate web-resolution derivative (~1600px long edge, JPEG quality 80)
      const derivativeBuffer = await sharp(originalBuffer)
        .resize(1600, 1600, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();

      // Derive the destination path from the original (pure function, no Firestore)
      const derivativePath = deriveDerivativePath(storagePath);
      if (!derivativePath) {
        console.error(`Could not derive derivative path for: ${storagePath}`);
        return;
      }

      // Upload the derivative to GCS
      const derivativeFile = bucket.file(derivativePath);
      await derivativeFile.save(derivativeBuffer, {
        contentType: 'image/jpeg',
        metadata: {
          cacheControl: 'public, max-age=31536000', // 1 year (content-hash is the version)
        },
      });

      const sizeKB = Math.round(derivativeBuffer.length / 1024);
      console.log(`Generated derivative: ${derivativePath} (${sizeKB} KB)`);
    } catch (err) {
      console.error(`Error generating derivative for ${storagePath}:`, err);
      // Don't re-throw — log and continue so the function doesn't fail completely
      // (subsequent retries would cause duplicate derivatives)
    }
  });

// ── Artist application (Our Artists page "Work with us" form) ────────────────
// Accepts JSON { name, email, work, note } and emails it to Xenia.
// Public form → CORS open, no auth. Email-only, no storage, no infra cost.
// NOTE: recipient hardcoded to xenia@aevia.at for now — fix later if it changes.
exports.submitArtistApplication = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
      const { name, email, work, note } = req.body || {};

      // Server-side validation: name, valid email, at least one work link.
      const nameTrim = (name || '').trim();
      const emailTrim = (email || '').trim();
      const workTrim = (work || '').trim();
      const noteTrim = (note || '').trim();

      if (!nameTrim) return res.status(400).json({ error: 'Please tell us your name.' });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }
      if (!workTrim) return res.status(400).json({ error: 'Please share a link to your work.' });

      const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: `"Aevia Artists" <${process.env.EMAIL_USER}>`,
        to: 'xenia@aevia.at',
        replyTo: emailTrim,
        subject: `New artist application — ${nameTrim}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;color:#333">
            <h2 style="border-bottom:2px solid #eee;padding-bottom:12px">New artist application</h2>
            <p style="margin:16px 0"><strong>Name:</strong> ${esc(nameTrim)}</p>
            <p style="margin:16px 0"><strong>Email:</strong> ${esc(emailTrim)}</p>
            <p style="margin:16px 0"><strong>Work:</strong> ${esc(workTrim)}</p>
            ${noteTrim ? `<p style="margin:16px 0"><strong>About:</strong><br>${esc(noteTrim).replace(/\n/g, '<br>')}</p>` : ''}
            <p style="color:#999;font-size:12px;margin-top:24px">
              Received ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/Vienna' })}
            </p>
          </div>
        `,
      });

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('submitArtistApplication error:', err);
      return res.status(500).json({ error: 'Something went wrong sending your message. Please try again.' });
    }
  });
