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
