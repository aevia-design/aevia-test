// Round 4 (S199): gpt-6-luna with TODAY's prompts (pre-#140 baseline) + only the owner's
// gender rule. Isolates the model from the prompt work, for the 14 Jan 2027 deadline.
// Same 18 photos as r2/r3. ~18 calls, est. ~$0.01. Writes captions-r4.json (no page — the
// calibrated reviewer scores it first).
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const R1 = path.join(ROOT, 'work/caption-quality');
const sharp = require(path.join(ROOT, 'functions/node_modules/sharp'));
const OpenAI = require(path.join(ROOT, 'functions/node_modules/openai'));
const { modelParams, CAPTION_MODEL } = require(path.join(ROOT, 'functions/caption/model.js'));
const oldPrompts = require(path.join(R1, 'baseline/prompts.js'));
const OLD_VOICE = fs.readFileSync(path.join(R1, 'baseline/caption-voice.md'), 'utf8');
const key = fs.readFileSync(path.join(ROOT, 'functions/.env'), 'utf8').match(/^OPENAI_API_KEY=(.*)$/m)[1].trim();
const client = new OpenAI.default({ apiKey: key, maxRetries: 5 });

const GENDER_RULE = "The people in the photo are this book's readers. Don't guess anyone's gender, and don't " +
  'describe them from outside as he, she, his, her or them (German: er, sie, sein, ihr as her/their).';

const PER_BOOK = 10, N = 3, PHOTOS = path.join(ROOT, 'assets/test photos');
const pick = (dir, n) => { const f = fs.readdirSync(path.join(PHOTOS, dir)).filter(x => /\.(jpe?g|png)$/i.test(x)).sort();
  return Array.from({ length: n }, (_, i) => path.join(PHOTOS, dir, f[Math.floor(i * f.length / n)])); };
const BOOKS = {
  kids:   [...pick('Toddler/white people', PER_BOOK / 2), ...pick('Toddler/turkish', PER_BOOK / 2)].slice(0, N),
  travel: [...pick('Sea', PER_BOOK / 2), ...pick('Hiking', PER_BOOK / 2)].slice(0, N),
  love:   pick('Wedding', PER_BOOK).slice(0, N),
};
const toBase64 = async f => (await sharp(f).rotate().resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer()).toString('base64');

(async () => {
  const out = {}; let tin = 0, tout = 0;
  for (const language of ['en', 'de']) for (const [collection, files] of Object.entries(BOOKS)) {
    const book = [];
    for (const f of files) {
      const r = await client.chat.completions.create({ ...modelParams(100), messages: [
        { role: 'system', content: OLD_VOICE },
        { role: 'user', content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${await toBase64(f)}` } },
          { type: 'text', text: oldPrompts.buildCaptionUserText({ collection, previousCaptions: book, language }) + '\n\n' + GENDER_RULE },
        ] }] });
      book.push(r.choices[0].message.content.trim()); tin += r.usage.prompt_tokens; tout += r.usage.completion_tokens;
      process.stdout.write('.');
    }
    out[`${language}-${collection}`] = book;
  }
  fs.writeFileSync(path.join(__dirname, 'captions-r4.json'), JSON.stringify(out, null, 1));
  console.log(`\n${CAPTION_MODEL}: ${tin} in / ${tout} out, ~$${(tin * 0.10e-6 + tout * 0.50e-6).toFixed(3)}`);
})();
