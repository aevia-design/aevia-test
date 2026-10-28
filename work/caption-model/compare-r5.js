// Round 5 (S199): does order context help on TODAY's prompts? gpt-6-luna + baseline prompts +
// gender rule, WITH notes, vs round 4 (same setup, no notes). English only, 9 rows, 9 calls.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const R1 = path.join(ROOT, 'work/caption-quality');
const sharp = require(path.join(ROOT, 'functions/node_modules/sharp'));
const OpenAI = require(path.join(ROOT, 'functions/node_modules/openai'));
const { modelParams } = require(path.join(ROOT, 'functions/caption/model.js'));
const oldPrompts = require(path.join(R1, 'baseline/prompts.js'));
const render = require('./page');
const OLD_VOICE = fs.readFileSync(path.join(R1, 'baseline/caption-voice.md'), 'utf8');
const key = fs.readFileSync(path.join(ROOT, 'functions/.env'), 'utf8').match(/^OPENAI_API_KEY=(.*)$/m)[1].trim();
const client = new OpenAI.default({ apiKey: key, maxRetries: 5 });
const GENDER_RULE = "The people in the photo are this book's readers. Don't guess anyone's gender, and don't " +
  'describe them from outside as he, she, his, her or them (German: er, sie, sein, ihr as her/their).';
const { context: CONTEXT } = require('./key-r3.json');   // same realistic notes as rounds 2-3
const background = t => `\n\nBackground from the customer's order (their own words):\n"${t}"\n` +
  'This is background, not material for every caption. A detail from it is a nice touch when it fits THIS photo; ' +
  "most captions use none, and a detail already used in this book should not come back. Don't quote it or add to it.";

const PER_BOOK = 10, N = 3, PHOTOS = path.join(ROOT, 'assets/test photos');
const pick = (dir, n) => { const f = fs.readdirSync(path.join(PHOTOS, dir)).filter(x => /\.(jpe?g|png)$/i.test(x)).sort();
  return Array.from({ length: n }, (_, i) => path.join(PHOTOS, dir, f[Math.floor(i * f.length / n)])); };
const BOOKS = {
  kids:   [...pick('Toddler/white people', PER_BOOK / 2), ...pick('Toddler/turkish', PER_BOOK / 2)].slice(0, N),
  travel: [...pick('Sea', PER_BOOK / 2), ...pick('Hiking', PER_BOOK / 2)].slice(0, N),
  love:   pick('Wedding', PER_BOOK).slice(0, N),
};
const toBase64 = async f => (await sharp(f).rotate().resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer()).toString('base64');
const thumb = async f => (await sharp(f).rotate().resize(220, 220, { fit: 'inside' }).jpeg({ quality: 70 }).toBuffer()).toString('base64');
const r4 = require('./captions-r4.json');

(async () => {
  const sections = [], keyOut = {}, withNotes = {}; let tin = 0, tout = 0;
  for (const [collection, files] of Object.entries(BOOKS)) {
    const id = `en-${collection}`, book = [], thumbs = [];
    for (const f of files) {
      thumbs.push(await thumb(f));
      const r = await client.chat.completions.create({ ...modelParams(100), messages: [
        { role: 'system', content: OLD_VOICE },
        { role: 'user', content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${await toBase64(f)}` } },
          { type: 'text', text: oldPrompts.buildCaptionUserText({ collection, previousCaptions: book, language: 'en' }) +
            background(CONTEXT.en[collection]) + '\n\n' + GENDER_RULE },
        ] }] });
      book.push(r.choices[0].message.content.trim()); tin += r.usage.prompt_tokens; tout += r.usage.completion_tokens;
      process.stdout.write('.');
    }
    withNotes[id] = book;
    const notesIsA = Math.random() < 0.5;
    keyOut[id] = { A: notesIsA ? 'notes' : 'plain', B: notesIsA ? 'plain' : 'notes' };
    sections.push({ id, thumbs, A: notesIsA ? book : r4[id], B: notesIsA ? r4[id] : book });
  }
  fs.writeFileSync(path.join(__dirname, 'compare-r5.html'), render(sections, 'r5'));
  fs.writeFileSync(path.join(__dirname, 'key-r5.json'), JSON.stringify({ context: CONTEXT.en, key: keyOut, withNotes }, null, 2));
  console.log(`\n${tin} in / ${tout} out, ~$${(tin * 0.10e-6 + tout * 0.50e-6).toFixed(3)}`);
})();
