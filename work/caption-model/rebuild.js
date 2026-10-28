// Re-render an existing comparison page with the current voting UI (page.js). No API calls.
// Usage (repo root): node work/caption-model/rebuild.js <file.html> <runId>
const fs = require('fs');
const path = require('path');
const render = require('./page');
const file = path.join(__dirname, process.argv[2] || 'compare.html');
const html = fs.readFileSync(file, 'utf8');
const unesc = s => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&amp;/g, '&');

const sections = [...html.matchAll(/<h2>([^<]+)<\/h2><table>([\s\S]*?)<\/table>/g)].map(([, id, body]) => {
  const rows = [...body.matchAll(/<tr[^>]*><td><img src="data:image\/jpeg;base64,([^"]+)"><\/td>([\s\S]*?)<td class="v">/g)];
  const cells = rows.map(r => [...r[2].matchAll(/<td>([\s\S]*?)<\/td>/g)].map(m => unesc(m[1])));
  const sec = { id, thumbs: rows.map(r => r[1]) };
  ['A', 'B', 'C'].slice(0, cells[0].length).forEach((c, i) => { sec[c] = cells.map(x => x[i]); });
  return sec;
});
if (!sections.length || sections.some(s => !s.thumbs.length || !s.B)) throw new Error('unexpected page shape');
fs.writeFileSync(file, render(sections, process.argv[3] || 'run'));
console.log(`Rebuilt ${sections.length} books, ${sections.reduce((a, s) => a + s.thumbs.length, 0)} rows, ${sections[0].C ? 3 : 2} columns.`);
