// Old-vs-new caption comparison for #140 (S197). Costs real OpenAI money (~€0.003/call).
// Usage (from repo root): node work/caption-quality/compare.js
// Writes work/caption-quality/compare.html (blind A/B) and key.json (which side is new).
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const sharp = require(path.join(ROOT, 'functions/node_modules/sharp'));
const OpenAI = require(path.join(ROOT, 'functions/node_modules/openai'));
const oldPrompts = require('./baseline/prompts.js');
const { generateCaption } = require(path.join(ROOT, 'functions/caption/generate.js'));

// Key from functions/.env, never copied anywhere.
const env = fs.readFileSync(path.join(ROOT, 'functions/.env'), 'utf8');
const key = env.match(/^OPENAI_API_KEY=(.*)$/m)[1].trim();
const client = new OpenAI.default({ apiKey: key, maxRetries: 10 });
const OLD_VOICE = fs.readFileSync(path.join(__dirname, 'baseline/caption-voice.md'), 'utf8');
const NEW_VOICE = fs.readFileSync(path.join(ROOT, 'functions/caption/caption-voice.md'), 'utf8');

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

// Same downscale as the engine's urlToBase64 (1200px, JPEG 0.85).
const toBase64 = async f => (await sharp(f).rotate().resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer()).toString('base64');
const thumb = async f => (await sharp(f).rotate().resize(220, 220, { fit: 'inside' }).jpeg({ quality: 70 }).toBuffer()).toString('base64');

async function oldCaption(image, collection, previousCaptions, language) {
  const r = await client.chat.completions.create({
    model: 'gpt-4o-mini', max_tokens: 100,
    messages: [
      { role: 'system', content: OLD_VOICE },
      { role: 'user', content: [
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } },
        { type: 'text', text: oldPrompts.buildCaptionUserText({ collection, previousCaptions, language }) },
      ] },
    ],
  });
  return r.choices[0].message.content.trim();
}

(async () => {
  let calls = 0;
  const sections = [];
  const keyOut = {};
  for (const language of ['en', 'de']) {
    for (const [collection, files] of Object.entries(BOOKS)) {
      const oldBook = [], newBook = [], thumbs = [];
      let retries = 0;
      for (const f of files) {
        const img = await toBase64(f);
        thumbs.push(await thumb(f));
        oldBook.push(await oldCaption(img, collection, oldBook, language)); calls++;
        const n = await generateCaption(client, NEW_VOICE, { image: img, collection, previousCaptions: newBook, language });
        newBook.push(n.caption); calls += n.retried ? 2 : 1; retries += n.retried ? 1 : 0;
        process.stdout.write('.');
        await new Promise(r => setTimeout(r, n.retried ? 30000 : 20000)); // ~6 calls/min fits the 200k TPM limit
      }
      const newIsA = Math.random() < 0.5;
      const id = `${language}-${collection}`;
      keyOut[id] = { A: newIsA ? 'new' : 'old', B: newIsA ? 'old' : 'new', newRetries: retries };
      sections.push({ id, thumbs, A: newIsA ? newBook : oldBook, B: newIsA ? oldBook : newBook });
    }
  }
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const html = `<!doctype html><meta charset="utf-8"><title>Caption comparison</title>
<style>body{font:15px/1.4 system-ui;margin:24px;max-width:1000px}table{border-collapse:collapse;width:100%;margin-bottom:32px}
td{border-top:1px solid #ddd;padding:8px;vertical-align:middle}td:first-child{width:120px}img{max-width:110px}th{text-align:left}</style>
<h1>Caption comparison — which column do you prefer?</h1><p>Each book was captioned in order, so later captions see the earlier ones. A and B are shuffled per book.</p>
${sections.map(s => `<h2>${s.id}</h2><table><tr><th></th><th>A</th><th>B</th></tr>
${s.thumbs.map((t, i) => `<tr><td><img src="data:image/jpeg;base64,${t}"></td><td>${esc(s.A[i])}</td><td>${esc(s.B[i])}</td></tr>`).join('')}</table>`).join('')}`;
  fs.writeFileSync(path.join(__dirname, 'compare.html'), html);
  fs.writeFileSync(path.join(__dirname, 'key.json'), JSON.stringify(keyOut, null, 2));
  console.log(`\n${calls} calls, ~€${(calls * 0.0033).toFixed(2)}`);
})();
