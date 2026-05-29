const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { createUploadSessionHandler } = require('./upload');

admin.initializeApp();

exports.createUploadSession = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 120, memory: '256MB' })
  .https.onRequest(createUploadSessionHandler);

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
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Staff-Key');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const hasStaffAuth = req.headers['x-staff-key'] === process.env.STAFF_KEY;
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
      const bucket   = storage.bucket('aevia-uploads.firebasestorage.app');
      const expires  = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      async function signedReadUrl(storedName) {
        if (!storedName) return null;
        const [url] = await bucket.file(storedName).getSignedUrl({ action: 'read', version: 'v4', expires });
        return url;
      }

      const signedUrls = { cover: null, special: {}, pool: [] };
      signedUrls.cover = await signedReadUrl(manifest.cover);
      for (const [slug, paths] of Object.entries(manifest.special || {})) {
        signedUrls.special[slug] = await Promise.all((Array.isArray(paths) ? paths : [paths]).map(p => signedReadUrl(p)));
      }
      signedUrls.pool = await Promise.all((manifest.pool || []).map(p => signedReadUrl(p)));

      return res.status(200).json({
        orderNumber:          order.orderNumber,
        customerName:         order.customerName,
        pageCount:            order.pageCount,
        fpSelections:         order.fpSelections || [],
        fpTexts:              order.fpTexts || {},
        photoNotes:           order.photoNotes || null,
        coverCaptions:        order.coverCaptions || null,
        coverCaptionStyles:   order.coverCaptionStyles || null,
        staffBookAssignments: order.staffBookAssignments || null,
        staffBookCaptions:    order.staffBookCaptions    || null,
        staffBookSequence:    order.staffBookSequence    || null,
        staffCoverCaptionStyles:  order.staffCoverCaptionStyles  || null,
        staffSpreadCaptionStyles: order.staffSpreadCaptionStyles || null,
        signedUrls,
        storedNames: {
          cover:   manifest.cover   || null,
          special: manifest.special || {},
          pool:    manifest.pool    || [],
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

// ── Save staff book state (assignments + captions) ───────────────────────────
// Accepts { orderNumber, bookAssignments, bookCaptions } with x-staff-key header
exports.saveStaffState = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Staff-Key');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    if (req.headers['x-staff-key'] !== process.env.STAFF_KEY) {
      return res.status(403).json({ error: 'Unauthorised' });
    }

    const { orderNumber, bookAssignments, bookCaptions, bookSequence,
            coverCaptionStyles, spreadCaptionStyles } = req.body;
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
        staffSavedAt:         admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('saveStaffState error:', err);
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
