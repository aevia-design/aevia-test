// Final check (S199): today (gpt-4o-mini) vs round 4 (gpt-6-luna, today's prompts + gender rule).
// No API calls: today's captions + thumbnails come from compare-r3.html (via key-r3.json).
const fs = require('fs'), path = require('path');
const render = require('./page');
const html = fs.readFileSync(path.join(__dirname, 'compare-r3.html'), 'utf8');
const { key } = require('./key-r3.json');
const r4 = require('./captions-r4.json');
const unesc = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const sections = [], keyOut = {};
for (const id of Object.keys(key)) {
  const body = html.split(`<h2>${id}</h2>`)[1].split('</table>')[0];
  const rows = [...body.matchAll(/<img src="data:image\/jpeg;base64,([^"]+)"><\/td>([\s\S]*?)<td class="v">/g)];
  const todayCol = ['A', 'B', 'C'].indexOf(Object.keys(key[id]).find(l => key[id][l] === 'today'));
  const today = rows.map(r => unesc([...r[2].matchAll(/<td>([\s\S]*?)<\/td>/g)][todayCol][1]));
  const lunaIsA = Math.random() < 0.5;
  keyOut[id] = { A: lunaIsA ? 'luna' : 'today', B: lunaIsA ? 'today' : 'luna' };
  sections.push({ id, thumbs: rows.map(r => r[1]), A: lunaIsA ? r4[id] : today, B: lunaIsA ? today : r4[id] });
}
fs.writeFileSync(path.join(__dirname, 'compare-final.html'), render(sections, 'final-r4'));
fs.writeFileSync(path.join(__dirname, 'key-final.json'), JSON.stringify(keyOut, null, 2));
console.log(sections.length, 'books,', sections.reduce((a, s) => a + s.thumbs.length, 0), 'rows');
