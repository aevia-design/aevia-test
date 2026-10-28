// "Write cool captions" exercise page (S199). No API calls. Owner writes his own captions next to
// what the live setup produced; answers become the gold set for the next round.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const sharp = require(path.join(ROOT, 'functions/node_modules/sharp'));
const ship = require('./verify-ship.json').out;   // live-setup captions, with notes
const PER_BOOK = 10, N = 3, PHOTOS = path.join(ROOT, 'assets/test photos');
const pick = (dir, n) => { const f = fs.readdirSync(path.join(PHOTOS, dir)).filter(x => /\.(jpe?g|png)$/i.test(x)).sort();
  return Array.from({ length: n }, (_, i) => path.join(PHOTOS, dir, f[Math.floor(i * f.length / n)])); };
const BOOKS = {
  kids:   [...pick('Toddler/white people', PER_BOOK / 2), ...pick('Toddler/turkish', PER_BOOK / 2)].slice(0, N),
  travel: [...pick('Sea', PER_BOOK / 2), ...pick('Hiking', PER_BOOK / 2)].slice(0, N),
  love:   pick('Wedding', PER_BOOK).slice(0, N),
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
(async () => {
  const cards = [];
  for (const [col, files] of Object.entries(BOOKS)) for (let i = 0; i < files.length; i++) {
    const img = (await sharp(files[i]).rotate().resize(520, 520, { fit: 'inside' }).jpeg({ quality: 78 }).toBuffer()).toString('base64');
    cards.push({ id: `${col}-${i}`, col, img, en: ship[`en-${col}`][i], de: ship[`de-${col}`][i] });
  }
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Caption exercise</title>
<style>
body{font:16px/1.5 Georgia,serif;margin:0 auto;max-width:900px;padding:16px;color:#222;background:#faf8f5}
h1{font-weight:normal}.intro{font-family:system-ui;font-size:15px;color:#444}
.card{display:grid;grid-template-columns:260px 1fr;gap:18px;background:#fff;border:1px solid #e6e1da;border-radius:6px;padding:14px;margin:18px 0}
.card img{width:100%;border-radius:4px}.ai{font-family:system-ui;font-size:13px;color:#888}.ai b{color:#555}
label{display:block;font-family:system-ui;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#7a6f64;margin-top:10px}
textarea,input{width:100%;box-sizing:border-box;font:16px Georgia,serif;padding:8px;border:1px solid #d8d1c7;border-radius:4px}
textarea{min-height:44px}.tag{font-family:system-ui;font-size:12px;background:#eee8df;border-radius:10px;padding:2px 8px}
#bar{position:sticky;top:0;background:#faf8f5;padding:8px 0;border-bottom:1px solid #e6e1da;font-family:system-ui;z-index:1}
button{font:inherit;padding:6px 14px;cursor:pointer}
@media(max-width:640px){.card{grid-template-columns:1fr}}
</style>
<div id="bar"><b>Caption exercise</b> · <span id="n"></span> <button id="copy">Copy answers</button></div>
<h1>Write the caption you'd want in the book</h1>
<div class="intro"><p>For each photo, write the caption you'd be proud to print. Don't polish: a rough line that shows the
<i>feeling</i> you want is perfect. Skip any photo that says nothing to you. The grey line is what the AI wrote, so you can
react to it ("too descriptive", "almost, but…").</p>
<p>Imagine you know this family, with the notes the customer gave:<br>
<b>Kids</b>: "Mila, our little bear. Hates socks, loves our dog Bruno, says 'nana' for banana."<br>
<b>Travel</b>: "Croatia, August 2026. We swam every morning before breakfast and missed the ferry twice."<br>
<b>Love</b>: "Anna &amp; Michael. He proposed on a tram; she calls him Mischa. We met at a terrible party and left early together."</p>
<p>German is optional. Write it only if you want to show something specific about German.</p></div>
${cards.map(c => `<div class="card" data-id="${c.id}"><img src="data:image/jpeg;base64,${c.img}"><div>
<span class="tag">${c.col}</span>
<p class="ai"><b>AI (EN):</b> ${esc(c.en)}<br><b>AI (DE):</b> ${esc(c.de)}</p>
<label>Your caption (EN)</label><textarea data-f="en"></textarea>
<label>Your caption (DE, optional)</label><textarea data-f="de"></textarea>
<label>What makes yours better? (optional, a few words)</label><input data-f="why">
</div></div>`).join('')}
<div class="card" data-id="anywhere" style="grid-template-columns:1fr"><div>
<span class="tag">from anywhere</span>
<label>Captions or lines you love from anywhere (Instagram, books, ads, friends). One per line.</label>
<textarea data-f="lines" style="min-height:120px"></textarea>
<label>Tone per collection, in your words (e.g. "kids: deadpan, like a parent telling it at dinner")</label>
<textarea data-f="tone" style="min-height:80px"></textarea>
<label>Lines you'd hate to see (words, styles)</label><textarea data-f="hate"></textarea>
</div></div>
<script>
const KEY='caption-exercise-v1';let a={};try{a=JSON.parse(localStorage.getItem(KEY))||{}}catch(e){}
const fields=[...document.querySelectorAll('[data-f]')];
const k=el=>el.closest('[data-id]').dataset.id+'.'+el.dataset.f;
fields.forEach(el=>{if(a[k(el)])el.value=a[k(el)];el.addEventListener('input',()=>{a[k(el)]=el.value;if(!el.value)delete a[k(el)];try{localStorage.setItem(KEY,JSON.stringify(a))}catch(e){}count()})});
function count(){document.getElementById('n').textContent=Object.keys(a).length+' answers saved'}count();
document.getElementById('copy').onclick=async()=>{const o=JSON.stringify(a);try{await navigator.clipboard.writeText(o);alert('Copied.')}catch(e){prompt('Copy this:',o)}};
</script>`;
  fs.writeFileSync(path.join(__dirname, 'exercise.html'), html);
  console.log(cards.length, 'photos');
})();
