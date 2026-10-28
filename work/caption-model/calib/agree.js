// Reviewer vs owner agreement per caption (usable yes/no). Usage: node agree.js r1 r2 r3
const fs = require('fs');
const truth = require('./truth.json');
let tp = 0, tn = 0, fp = 0, fn = 0; const miss = [];
for (const tag of process.argv.slice(2)) {
  if (!fs.existsSync(`judge-${tag}.json`)) { console.log(tag, 'missing'); continue; }
  let j = JSON.parse(fs.readFileSync(`judge-${tag}.json`, 'utf8'));
  if (Array.isArray(j)) j = Object.fromEntries(j.map(r => [r.id, r]));   // agents sometimes return a list
  for (const [id, caps] of Object.entries(truth)) {
    if (!id.startsWith(tag + '-')) continue;
    for (const [c, owner] of Object.entries(caps)) {
      const judge = j[id]?.[c];
      if (judge === undefined) { miss.push(`${id} ${c} unjudged`); continue; }
      if (owner && judge) tp++; else if (!owner && !judge) tn++; else if (judge) fp++; else fn++;
    }
  }
}
const n = tp + tn + fp + fn;
console.log(`captions ${n} · agreement ${(100 * (tp + tn) / n).toFixed(0)}% · ` +
  `reviewer passed what owner rejected: ${fp} · reviewer rejected what owner passed: ${fn}`);
if (miss.length) console.log(miss.slice(0, 5));
