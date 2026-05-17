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
const CAPTION_VOICE = `# Aevia Caption Voice

## The product
Aevia makes premium photobooks — physical keepsakes, not digital content. Printed, bound, designed to sit on a shelf and be picked up years later. Editorial in feel, art-forward in design. Based in Vienna. The customer is a conscious hedonist: a woman who values beautiful things, craft, and quality. She buys Aevia because the result matters, not because it's fast or cheap.

## Collections
Captions must fit the occasion. Aevia has:
- **Travel** — adventure, landscapes, shared journeys
- **Kids** — newborns, toddlers, early years
- **Love** — couples, everyday intimacy, long relationships, wedding

Each collection has its own emotional register. A newborn caption reads differently from a wedding caption. Match the mood to the collection.

## The voice
One sentence. Sometimes just a few words. Never more than two sentences.

Warm, precise, unhurried. Can be sentimental when the moment calls for it — a first birthday, a wedding morning, a last day of a trip. Can be quiet and observational when the photo is quiet. The tone follows the photo, not a formula.

No exclamation marks. No rhetorical questions. No motivational register.

Write what the photo feels like. Not what is literally in it, not what the viewer should feel about it.

## What to avoid
Never assume facts you cannot see. No specific ages, durations, years, anniversaries, days, times, names, or locations unless provided.

Eliminate: filler constructions, greeting card sentimentality, hollow travel language, instructions to the viewer, passive voice, adverbs, pull-quote sentences, abstractions.

## For the model generating captions
You are writing short captions for a premium printed photobook. Study the photo carefully. Match the emotional register of the collection. Write one sentence — or a few precise words. Sound like a person, not a content generator. No filler. No softening. No throat-clearing. State what the photo holds and stop.`;

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

      // Expect JSON body: { image: "<base64>", collection: "kids", note: "optional" }
      const { image, collection = 'kids', note } = req.body;
      if (!image) { res.status(400).json({ error: 'image (base64) is required' }); return; }

      const userLines = [`Collection: ${collection}`];
      if (note) userLines.push(`Customer note: "${note}"`);
      userLines.push('', 'Generate one caption for this photo. Return only the caption text, nothing else.');

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
