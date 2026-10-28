// Build the calibration set from the three voted rounds (S199). No API calls.
// Writes calib/rows.json (blind: captions shuffled, no votes) and calib/truth.json (owner picks).
const fs = require('fs'), path = require('path');
const D = path.join(__dirname, '..');
const unesc = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const ROUNDS = [
  { tag: 'r1', html: 'compare.html', votes: 'votes-luna-r1.json' },
  { tag: 'r2', html: 'compare-r2.html', votes: 'votes-r2.json' },
  { tag: 'r3', html: 'compare-r3.html', votes: 'votes-r3.json' },
];
const rows = [], truth = {};
for (const r of ROUNDS) {
  const html = fs.readFileSync(path.join(D, r.html), 'utf8');
  const votes = JSON.parse(fs.readFileSync(path.join(D, r.votes), 'utf8'));
  for (const m of html.matchAll(/<tr data-row="([^"]+)"><td><img src="data:image\/jpeg;base64,([^"]+)"><\/td>([\s\S]*?)<td class="v">/g)) {
    const [, rowId, img, cellsHtml] = m;
    if (!votes[rowId]) continue;                       // only rows the owner voted on
    const caps = [...cellsHtml.matchAll(/<td>([\s\S]*?)<\/td>/g)].map(x => unesc(x[1]));
    const letters = ['A', 'B', 'C'].slice(0, caps.length);
    const picked = [].concat(votes[rowId]).flatMap(v => v === 'both' ? letters : v === 'neither' ? [] : [v]);
    const id = `${r.tag}-${rowId}`;
    const file = `img/${id}.jpg`;
    fs.writeFileSync(path.join(__dirname, file), Buffer.from(img, 'base64'));
    const order = letters.map((l, i) => ({ l, c: caps[i] })).sort(() => Math.random() - 0.5);
    rows.push({ id, language: rowId.slice(0, 2), collection: rowId.split('-')[1], image: `work/caption-model/calib/${file}`,
      captions: Object.fromEntries(order.map((o, i) => [`c${i + 1}`, o.c])) });
    truth[id] = Object.fromEntries(order.map((o, i) => [`c${i + 1}`, picked.includes(o.l)]));
  }
}
fs.writeFileSync(path.join(__dirname, 'rows.json'), JSON.stringify(rows, null, 1));
fs.writeFileSync(path.join(__dirname, 'truth.json'), JSON.stringify(truth, null, 1));
console.log(rows.length, 'rows,', Object.values(truth).reduce((a, t) => a + Object.keys(t).length, 0), 'captions');
