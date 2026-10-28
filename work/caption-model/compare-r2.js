// Round 2 (S199): today vs new voice rules, without and with order context. 3 photos per
// book × kids/travel/love × EN/DE = 18 rows, three blind columns per row.
// Costs real OpenAI money (~36 calls, est. ~$0.02) — run only with the owner's go-ahead.
// Usage (repo root): node work/caption-model/compare-r2.js
//
// "today" = round-1 gpt-4o-mini captions (first 3 rows of each book), reused at no cost.
// Writes compare-r2.html, key-r2.json, usage-r2.json.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const R1 = path.join(ROOT, 'work/caption-quality');
const sharp = require(path.join(ROOT, 'functions/node_modules/sharp'));
const OpenAI = require(path.join(ROOT, 'functions/node_modules/openai'));
const { generateCaption } = require(path.join(ROOT, 'functions/caption/generate.js'));
const { CAPTION_MODEL } = require(path.join(ROOT, 'functions/caption/model.js'));
const render = require('./page');

const env = fs.readFileSync(path.join(ROOT, 'functions/.env'), 'utf8');
const key = env.match(/^OPENAI_API_KEY=(.*)$/m)[1].trim();
const raw = new OpenAI.default({ apiKey: key, maxRetries: 5 });
const TAG = process.argv[2] || 'r2';
const usage = [];
const client = { chat: { completions: { create: async (p) => {
  const r = await raw.chat.completions.create(p); usage.push(r.usage); return r;
} } } };
const VOICE = fs.readFileSync(path.join(ROOT, 'functions/caption/caption-voice.md'), 'utf8');

const PER_BOOK = 10, N = 3;
const PHOTOS = path.join(ROOT, 'assets/test photos');
const pick = (dir, n) => {
  const files = fs.readdirSync(path.join(PHOTOS, dir)).filter(f => /\.(jpe?g|png)$/i.test(f)).sort();
  const step = files.length / n;
  return Array.from({ length: n }, (_, i) => path.join(PHOTOS, dir, files[Math.floor(i * step)]));
};
// Same picks as round 1; only the first 3 of each book are used.
const BOOKS = {
  kids:   [...pick('Toddler/white people', PER_BOOK / 2), ...pick('Toddler/turkish', PER_BOOK / 2)].slice(0, N),
  travel: [...pick('Sea', PER_BOOK / 2), ...pick('Hiking', PER_BOOK / 2)].slice(0, N),
  love:   pick('Wedding', PER_BOOK).slice(0, N),
};

// One realistic order context per book, in the shape the engine sends (notes · cover · special pages).
// Written to fit these photos loosely, the way a real customer's notes would.
const CONTEXT = {
  en: {
    kids:   "Mila, our little bear. Hates socks, loves our dog Bruno, says 'nana' for banana. · Our little bear",
    travel: 'Croatia, August 2026. We swam every morning before breakfast and missed the ferry twice. · Summer on the coast',
    love:   'Anna & Michael, Vienna, June 2026. He proposed on a tram; she calls him Mischa. · Anna & Michael · We met through friends at a terrible party and left early together.',
  },
  de: {
    kids:   "Mila, unser kleiner Bär. Hasst Socken, liebt unseren Hund Bruno, sagt 'Nane' zu Banane. · Unser kleiner Bär",
    travel: 'Kroatien, August 2026. Jeden Morgen vor dem Frühstück schwimmen, zweimal die Fähre verpasst. · Sommer am Meer',
    love:   'Anna & Michael, Wien, Juni 2026. Er hat in der Straßenbahn den Antrag gemacht; sie nennt ihn Mischa. · Anna & Michael · Kennengelernt über Freunde auf einer furchtbaren Party, die wir zusammen früh verlassen haben.',
  },
};

const toBase64 = async f => (await sharp(f).rotate().resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer()).toString('base64');
const thumb = async f => (await sharp(f).rotate().resize(220, 220, { fit: 'inside' }).jpeg({ quality: 70 }).toBuffer()).toString('base64');

const r1Html = fs.readFileSync(path.join(R1, 'compare.html'), 'utf8');
const r1Key = JSON.parse(fs.readFileSync(path.join(R1, 'key.json'), 'utf8'));
const unesc = s => s.replace(/&lt;/g, '<').replace(/&amp;/g, '&');
function todayCaptions(id) {
  const sec = r1Html.split(`<h2>${id}</h2>`)[1].split('</table>')[0];
  const rows = [...sec.matchAll(/<tr><td><img[^>]*><\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><\/tr>/g)];
  const col = r1Key[id].A === 'old' ? 1 : 2;
  return rows.slice(0, N).map(m => unesc(m[col]));
}

(async () => {
  const sections = [], keyOut = {};
  for (const language of ['en', 'de']) {
    for (const [collection, files] of Object.entries(BOOKS)) {
      const id = `${language}-${collection}`;
      const arms = { today: todayCaptions(id), plain: [], context: [] };
      const thumbs = [];
      for (const f of files) {
        const img = await toBase64(f);
        thumbs.push(await thumb(f));
        for (const [arm, note] of [['plain', undefined], ['context', CONTEXT[language][collection]]]) {
          const n = await generateCaption(client, VOICE, { image: img, collection, note, previousCaptions: arms[arm], language });
          arms[arm].push(n.caption);
        }
        process.stdout.write('.');
      }
      const order = ['today', 'plain', 'context'].sort(() => Math.random() - 0.5);
      keyOut[id] = { A: order[0], B: order[1], C: order[2] };
      sections.push({ id, thumbs, A: arms[order[0]], B: arms[order[1]], C: arms[order[2]] });
    }
  }
  fs.writeFileSync(path.join(__dirname, `compare-${TAG}.html`), render(sections, `${TAG}-${Date.now()}`));
  fs.writeFileSync(path.join(__dirname, `key-${TAG}.json`), JSON.stringify({ context: CONTEXT, key: keyOut }, null, 2));
  fs.writeFileSync(path.join(__dirname, `usage-${TAG}.json`), JSON.stringify(usage, null, 2));
  const tin = usage.reduce((a, u) => a + u.prompt_tokens, 0), tout = usage.reduce((a, u) => a + u.completion_tokens, 0);
  console.log(`\n${CAPTION_MODEL}: ${usage.length} calls, ${tin} in / ${tout} out tokens, ~$${(tin * 0.10e-6 + tout * 0.50e-6).toFixed(3)}`);
})();
