const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { createUploadSessionHandler } = require('./upload');

admin.initializeApp();

exports.createUploadSession = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 120, memory: '256MB' })
  .https.onRequest(createUploadSessionHandler);

// ── HEIC → JPEG converter ────────────────────────────────────────────────────
exports.convertHeic = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 60, memory: '512MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

    try {
      const sharp = require('sharp');
      const inputBuffer = req.rawBody;
      if (!inputBuffer || inputBuffer.length === 0) {
        res.status(400).json({ error: 'Empty body' });
        return;
      }
      const jpegBuffer = await sharp(inputBuffer).jpeg({ quality: 90 }).toBuffer();
      res.set('Content-Type', 'image/jpeg');
      res.send(jpegBuffer);
    } catch (err) {
      console.error('convertHeic error:', err);
      res.status(500).json({ error: err.message });
    }
  });
