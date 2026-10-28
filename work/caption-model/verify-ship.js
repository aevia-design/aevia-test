// Pre-deploy check (S199) through the SHIPPING code: functions/caption/prompts.js + model.js +
// caption-voice.md, exactly as generateCaption builds the request. 18 captions with notes +
// 1 compose call. Checks pronoun slips, note-detail use, and that compose's temperature is accepted.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const sharp = require(path.join(ROOT, 'functions/node_modules/sharp'));
const OpenAI = require(path.join(ROOT, 'functions/node_modules/openai'));
const { modelParams } = require(path.join(ROOT, 'functions/caption/model.js'));
const { buildCaptionUserText, buildComposeUserText } = require(path.join(ROOT, 'functions/caption/prompts.js'));
const VOICE = fs.readFileSync(path.join(ROOT, 'functions/caption/caption-voice.md'), 'utf8');
const key = fs.readFileSync(path.join(ROOT, 'functions/.env'), 'utf8').match(/^OPENAI_API_KEY=(.*)$/m)[1].trim();
const client = new OpenAI.default({ apiKey: key, maxRetries: 5 });
const { context: CONTEXT } = require('./key-r3.json');
const PER_BOOK = 10, N = 3, PHOTOS = path.join(ROOT, 'assets/test photos');
const pick = (dir, n) => { const f = fs.readdirSync(path.join(PHOTOS, dir)).filter(x => /\.(jpe?g|png)$/i.test(x)).sort();
  return Array.from({ length: n }, (_, i) => path.join(PHOTOS, dir, f[Math.floor(i * f.length / n)])); };
const BOOKS = {
  kids:   [...pick('Toddler/white people', PER_BOOK / 2), ...pick('Toddler/turkish', PER_BOOK / 2)].slice(0, N),
  travel: [...pick('Sea', PER_BOOK / 2), ...pick('Hiking', PER_BOOK / 2)].slice(0, N),
  love:   pick('Wedding', PER_BOOK).slice(0, N),
};
const toBase64 = async f => (await sharp(f).rotate().resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer()).toString('base64');
const PRON = { en: /\b(he|she|him|her|his|hers|they|them|their)\b/i, de: /\b(er|sie|sein|seine[mnrs]?|ihre?[mnrs]?)\b/i };
const DETAIL = /mila|bear|bär|sock|socke|bruno|nana|nane|croatia|kroatien|ferry|fähre|anna|michael|mischa|tram|straßenbahn|party/i;

(async () => {
  const out = {}; let tin = 0, tout = 0, slips = [], details = [];
  for (const language of ['en', 'de']) for (const [collection, files] of Object.entries(BOOKS)) {
    const id = `${language}-${collection}`, book = [];
    for (const f of files) {
      const r = await client.chat.completions.create({ ...modelParams(100), messages: [
        { role: 'system', content: VOICE },
        { role: 'user', content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${await toBase64(f)}` } },
          { type: 'text', text: buildCaptionUserText({ collection, note: CONTEXT[language][collection], previousCaptions: book, language }) },
        ] }] });
      const c = r.choices[0].message.content.trim(); book.push(c);
      tin += r.usage.prompt_tokens; tout += r.usage.completion_tokens;
      if (!c) slips.push(`${id}: EMPTY`);
      if (PRON[language].test(c)) slips.push(`${id}: ${c}`);
      if (DETAIL.test(c)) details.push(`${id}: ${c}`);
      process.stdout.write('.');
    }
    out[id] = book;
  }
  let compose;
  try {
    const r = await client.chat.completions.create({ ...modelParams(300), temperature: 0.2, messages: [
      { role: 'system', content: VOICE },
      { role: 'user', content: buildComposeUserText({ collection: 'love', composeText: 'We met through friends. He made me laugh. We moved to Vienna together.', language: 'en' }) }] });
    compose = 'OK: ' + r.choices[0].message.content.trim();
  } catch (e) { compose = 'FAILED: ' + e.message; }
  fs.writeFileSync(path.join(__dirname, 'verify-ship.json'), JSON.stringify({ out, slips, details, compose }, null, 1));
  console.log(`\n${tin} in / ${tout} out ~$${(tin * 0.10e-6 + tout * 0.50e-6).toFixed(3)}`);
  console.log('pronoun slips / empties:', slips.length, slips);
  console.log('captions using a note detail:', details.length, details);
  console.log('compose with temperature 0.2:', compose);
})();
