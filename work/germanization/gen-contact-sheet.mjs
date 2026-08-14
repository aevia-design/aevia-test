// Builds work/germanization/contact-sheet.html — every functional-page SVG per
// template rendered in a grid, DE variants highlighted, so the owner can eyeball
// which EN pages carry English words and which DE variants are missing (baked
// text is outlined; only eyes can answer this).
// Usage: node work/germanization/gen-contact-sheet.mjs
// View:  npx http-server . -p 8080 -c-1  →  http://localhost:8080/work/germanization/contact-sheet.html
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');

// template → FP folders root (matches the engine registry's svgBase)
const TEMPLATES = {
  Scribble: 'assets/Template_Scribble/Spreads',
  Papercut: 'assets/Template_Papercut/SVG',
  Newborn: 'assets/Template_Newborn',
  Tender: 'assets/Template_Tender',
  Wander: 'assets/Template_Wander',
  Joyride: 'assets/Template_Joyride/SVG',
  Laguna: 'assets/Template_Laguna/SVG',
  'Heirloom-Beige': 'assets/Template_Heirloom/Beige/SVG',
};

let html = `<meta charset="utf-8"><title>DE coverage contact sheet</title>
<style>
 body{font:14px/1.4 Georgia,serif;background:#faf8f5;color:#1c1a17;margin:24px}
 h2{margin:32px 0 4px} h3{margin:16px 0 4px;font-weight:normal;color:#6f6660}
 .row{display:flex;flex-wrap:wrap;gap:12px}
 figure{margin:0;width:180px} figcaption{font-size:11px;word-break:break-all}
 img{width:180px;height:180px;object-fit:contain;background:#fff;border:1px solid #ddd}
 .de img{border:3px solid #2c6e49} .de figcaption{color:#2c6e49;font-weight:bold}
</style><h1>Germanization Stage 0 — functional pages, DE variants in green</h1>`;

for (const [name, base] of Object.entries(TEMPLATES)) {
  html += `<h2>${name}</h2>`;
  const dirs = readdirSync(join(ROOT, base), { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^FP /.test(e.name))
    .map((e) => e.name)
    .sort();
  for (const d of dirs) {
    const svgs = readdirSync(join(ROOT, base, d)).filter((n) => n.toLowerCase().endsWith('.svg')).sort();
    if (!svgs.length) continue;
    html += `<h3>${d}</h3><div class="row">`;
    for (const s of svgs) {
      const isDe = /-DE\.svg$/i.test(s);
      const src = `../../${base}/${d}/${s}`.replace(/ /g, '%20');
      html += `<figure class="${isDe ? 'de' : ''}"><img loading="lazy" src="${src}"><figcaption>${s}</figcaption></figure>`;
    }
    html += `</div>`;
  }
}
writeFileSync(join(import.meta.dirname, 'contact-sheet.html'), html);
console.log('written: work/germanization/contact-sheet.html');
