// Round 6 (S199): voice v3 (owner's own captions as the register), 3 drafts per photo with the
// model's own pick, two models side by side. NEW photos (rows 3-5 of each round-1 book), so the
// owner's example photos are not the test. EN + DE. Writes compare-r6.html, key-r6.json.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const sharp = require(path.join(ROOT, 'functions/node_modules/sharp'));
const OpenAI = require(path.join(ROOT, 'functions/node_modules/openai'));
const render = require('./page');
const VOICE = fs.readFileSync(path.join(__dirname, 'voice-v3.md'), 'utf8');
const key = fs.readFileSync(path.join(ROOT, 'functions/.env'), 'utf8').match(/^OPENAI_API_KEY=(.*)$/m)[1].trim();
const client = new OpenAI.default({ apiKey: key, maxRetries: 5 });
const MODELS = (process.argv[2] || 'gpt-6-luna,gpt-6.1-terra').split(',');
const PRICE = { 'gpt-6-luna': [0.10, 0.50], 'gpt-6.1-terra': [1.00, 5.00], 'gpt-5.6-terra': [2.00, 12.00] };
const CONTEXT = require('./key-r3.json').context;

const PER_BOOK = 10, PHOTOS = path.join(ROOT, 'assets/test photos');
const pick = (dir, n) => { const f = fs.readdirSync(path.join(PHOTOS, dir)).filter(x => /\.(jpe?g|png)$/i.test(x)).sort();
  return Array.from({ length: n }, (_, i) => path.join(PHOTOS, dir, f[Math.floor(i * f.length / n)])); };
const BOOKS = {
  kids:   [...pick('Toddler/white people', PER_BOOK / 2), ...pick('Toddler/turkish', PER_BOOK / 2)].slice(3, 6),
  travel: [...pick('Sea', PER_BOOK / 2), ...pick('Hiking', PER_BOOK / 2)].slice(3, 6),
  love:   pick('Wedding', PER_BOOK).slice(3, 6),
};
const toBase64 = async f => (await sharp(f).rotate().resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer()).toString('base64');
const thumb = async f => (await sharp(f).rotate().resize(220, 220, { fit: 'inside' }).jpeg({ quality: 70 }).toBuffer()).toString('base64');

function request(collection, language, note, previous) {
  return [
    `Collection: ${collection}. Book language: ${language === 'de' ? 'German' : 'English'}.`,
    `Background from the customer's order (their own words, use a detail only when it fits naturally): "${note}"`,
    previous.length ? `Captions already in this book — don't repeat their words or shape:\n- ${previous.join('\n- ')}` : '',
    `Write THREE different captions for this photo in ${language === 'de' ? 'German' : 'English'}, each in a different voice or angle, ` +
    'then choose the one the family would love most. Reply as JSON: {"candidates": ["...", "...", "..."], "best": 0}',
  ].filter(Boolean).join('\n\n');
}

(async () => {
  const sections = [], keyOut = {}, all = {}, cost = {};
  for (const language of ['en', 'de']) for (const [collection, files] of Object.entries(BOOKS)) {
    const id = `${language}-${collection}`, books = Object.fromEntries(MODELS.map(m => [m, []])), thumbs = [];
    for (const f of files) {
      const img = await toBase64(f); thumbs.push(await thumb(f));
      for (const model of MODELS) {
        const r = await client.chat.completions.create({
          model, reasoning_effort: 'low', max_completion_tokens: 2400, response_format: { type: 'json_object' },
          messages: [{ role: 'system', content: VOICE }, { role: 'user', content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${img}` } },
            { type: 'text', text: request(collection, language, CONTEXT[language][collection], books[model]) }] }] });
        const j = JSON.parse(r.choices[0].message.content);
        books[model].push(j.candidates[j.best] ?? j.candidates[0]);
        (all[id] ??= []).push({ model, ...j });
        const [pi, po] = PRICE[model] || [0, 0];
        cost[model] = (cost[model] || 0) + r.usage.prompt_tokens * pi / 1e6 + r.usage.completion_tokens * po / 1e6;
        process.stdout.write('.');
      }
    }
    const order = [...MODELS].sort(() => Math.random() - 0.5);
    keyOut[id] = Object.fromEntries(order.map((m, i) => ['ABC'[i], m]));
    sections.push({ id, thumbs, ...Object.fromEntries(order.map((m, i) => ['ABC'[i], books[m]])) });
  }
  fs.writeFileSync(path.join(__dirname, 'compare-r6.html'), render(sections, 'r6'));
  fs.writeFileSync(path.join(__dirname, 'key-r6.json'), JSON.stringify({ key: keyOut, all, cost }, null, 1));
  console.log('\ncost $', Object.entries(cost).map(([m, c]) => `${m} ${c.toFixed(3)}`).join(' · '));
})();
