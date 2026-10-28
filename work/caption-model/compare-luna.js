// Today's live captions (gpt-4o-mini, old prompts) vs the candidate (CAPTION_MODEL, new prompts). S199.
// Costs real OpenAI money — run only with the owner's go-ahead. ~60 calls, est. < €0.10.
// Usage (repo root): node work/caption-model/compare-luna.js
//
// The OLD side is NOT regenerated: it is read from round 1 (work/caption-quality/compare.html +
// key.json), which used the same 60 photos in the same order. Only the new side costs money.
// Writes compare.html (blind A/B, shuffled per book), key.json, usage.json (real token counts).
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const R1 = path.join(ROOT, 'work/caption-quality');
const sharp = require(path.join(ROOT, 'functions/node_modules/sharp'));
const OpenAI = require(path.join(ROOT, 'functions/node_modules/openai'));
const { generateCaption } = require(path.join(ROOT, 'functions/caption/generate.js'));
const { CAPTION_MODEL } = require(path.join(ROOT, 'functions/caption/model.js'));

const env = fs.readFileSync(path.join(ROOT, 'functions/.env'), 'utf8');
const key = env.match(/^OPENAI_API_KEY=(.*)$/m)[1].trim();
const raw = new OpenAI.default({ apiKey: key, maxRetries: 5 });
// Record every call's real usage — the image token count for this model is not published.
const usage = [];
const client = { chat: { completions: { create: async (p) => {
  const r = await raw.chat.completions.create(p); usage.push(r.usage); return r;
} } } };
const VOICE = fs.readFileSync(path.join(ROOT, 'functions/caption/caption-voice.md'), 'utf8');

// Same photo picks as round 1 (work/caption-quality/compare.js).
const PER_BOOK = 10;
const PHOTOS = path.join(ROOT, 'assets/test photos');
const pick = (dir, n) => {
  const files = fs.readdirSync(path.join(PHOTOS, dir)).filter(f => /\.(jpe?g|png)$/i.test(f)).sort();
  const step = files.length / n;
  return Array.from({ length: n }, (_, i) => path.join(PHOTOS, dir, files[Math.floor(i * step)]));
};
const BOOKS = {
  kids:   [...pick('Toddler/white people', PER_BOOK / 2), ...pick('Toddler/turkish', PER_BOOK / 2)],
  travel: [...pick('Sea', PER_BOOK / 2), ...pick('Hiking', PER_BOOK / 2)],
  love:   pick('Wedding', PER_BOOK),
};
const toBase64 = async f => (await sharp(f).rotate().resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer()).toString('base64');
const thumb = async f => (await sharp(f).rotate().resize(220, 220, { fit: 'inside' }).jpeg({ quality: 70 }).toBuffer()).toString('base64');

// Round-1 OLD captions, un-shuffled via its key.
const r1Html = fs.readFileSync(path.join(R1, 'compare.html'), 'utf8');
const r1Key = JSON.parse(fs.readFileSync(path.join(R1, 'key.json'), 'utf8'));
const unesc = s => s.replace(/&lt;/g, '<').replace(/&amp;/g, '&');
function oldCaptions(id) {
  const sec = r1Html.split(`<h2>${id}</h2>`)[1].split('</table>')[0];
  const rows = [...sec.matchAll(/<tr><td><img[^>]*><\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><\/tr>/g)];
  const col = r1Key[id].A === 'old' ? 1 : 2;
  return rows.map(m => unesc(m[col]));
}

(async () => {
  const sections = [], keyOut = {};
  for (const language of ['en', 'de']) {
    for (const [collection, files] of Object.entries(BOOKS)) {
      const id = `${language}-${collection}`;
      const oldBook = oldCaptions(id);
      if (oldBook.length !== files.length) throw new Error(`${id}: round 1 has ${oldBook.length} rows`);
      const newBook = [], thumbs = [];
      let retries = 0;
      for (const f of files) {
        const img = await toBase64(f);
        thumbs.push(await thumb(f));
        const n = await generateCaption(client, VOICE, { image: img, collection, previousCaptions: newBook, language });
        newBook.push(n.caption); retries += n.retried ? 1 : 0;
        process.stdout.write('.');
      }
      const newIsA = Math.random() < 0.5;
      keyOut[id] = { A: newIsA ? 'new' : 'old', B: newIsA ? 'old' : 'new', newRetries: retries };
      sections.push({ id, thumbs, A: newIsA ? newBook : oldBook, B: newIsA ? oldBook : newBook });
    }
  }
  const html = require('./page')(sections, `${CAPTION_MODEL}-${Date.now()}`);
  fs.writeFileSync(path.join(__dirname, 'compare.html'), html);
  fs.writeFileSync(path.join(__dirname, 'key.json'), JSON.stringify(keyOut, null, 2));
  fs.writeFileSync(path.join(__dirname, 'usage.json'), JSON.stringify(usage, null, 2));
  const tin = usage.reduce((a, u) => a + u.prompt_tokens, 0), tout = usage.reduce((a, u) => a + u.completion_tokens, 0);
  console.log(`\n${CAPTION_MODEL}: ${usage.length} calls, ${tin} in / ${tout} out tokens, ~$${(tin * 0.10e-6 + tout * 0.50e-6).toFixed(3)}`);
})();
