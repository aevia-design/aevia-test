// Renders every wired DE page against its English counterpart, straight from the
// data files, so the swap can be eyeballed (outlined text is invisible to grep).
// Run from project root with the dev server up. Writes de-vs-en.html + a screenshot.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';

const TEMPLATES = {
  'Template_Scribble/scribble-data.js': 'Template_Scribble/Spreads/',
  'Template_Papercut/papercut-data.js': 'Template_Papercut/SVG/',
  'Template_Tender/tender-data.js': 'Template_Tender/',
  'Template_Wander/wander-data.js': 'Template_Wander/',
  'Template_Joyride/joyride-data.js': 'Template_Joyride/SVG/',
  'Template_Laguna/laguna-data.js': 'Template_Laguna/SVG/',
  'Template_Heirloom/Beige/heirloom-data.js': 'Template_Heirloom/Beige/SVG/',
};

let html = `<meta charset="utf-8"><title>DE vs EN</title><style>
 body{font:13px Georgia,serif;background:#faf8f5;margin:20px}
 .pair{display:inline-block;margin:0 14px 18px 0;text-align:center}
 img{width:210px;height:210px;object-fit:contain;background:#fff;border:1px solid #ddd}
 .de img{border:2px solid #2c6e49} h2{margin:22px 0 8px}
 .cap{font-size:10px;max-width:210px;word-break:break-all;color:#6f6660}
</style><h1>Wired DE artwork vs its English counterpart</h1>`;

for (const [file, base] of Object.entries(TEMPLATES)) {
  const src = readFileSync('assets/' + file, 'utf8');
  const pairs = [...src.matchAll(/svg: '([^']+)', svgDe: '([^']+)'/g)];
  if (!pairs.length) continue;
  html += `<h2>${file.split('/')[0].replace('Template_', '')}</h2>`;
  const seen = new Set();
  for (const [, en, de] of pairs) {
    if (seen.has(en + de)) continue;
    seen.add(en + de);
    const u = (p) => ('../../assets/' + base + p).replace(/ /g, '%20');
    html += `<span class="pair"><img src="${u(en)}"><div class="cap">EN ${en.split('/').pop()}</div></span>`;
    html += `<span class="pair de"><img src="${u(de)}"><div class="cap">DE ${de.split('/').pop()}</div></span>`;
  }
}
writeFileSync('work/germanization/de-vs-en.html', html);

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 1.5 });
await p.goto('http://localhost:8080/work/germanization/de-vs-en.html');
await p.waitForTimeout(6000);
const h = await p.evaluate(() => document.body.scrollHeight);
for (let y = 0, i = 0; y < h; y += 960, i++) {
  await p.evaluate((yy) => window.scrollTo(0, yy), y);
  await p.waitForTimeout(1200);
  await p.screenshot({ path: `work/germanization/de-vs-en-${String(i).padStart(2, '0')}.png` });
}
console.log('rendered, height', h);
await b.close();
