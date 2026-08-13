// Does the cover ARTWORK itself contain the album-name text, baked in as outlined
// vector paths? Grep cannot answer this: outlined text has no characters, only curves.
//
// Renders each template's cover SVG on its own — no engine, no captions, no order — and
// crops the region where that template's front caption sits. Whatever appears there is
// artwork, not customer data.
//
// Run from project root with a dev server up:
//   npx http-server . -p 8080 -c-1
//   node qa/probe-cover-svg-text.mjs
import { chromium } from 'playwright';
import fs from 'fs';

const OUT = 'sessions/qa-runs/cover-svg-text';
fs.mkdirSync(OUT, { recursive: true });

// template key → [data file, cover svg path relative to the template dir]
// svgBase comes from the TEMPLATES registry in template-engine.html (~line 1276) and is
// NOT uniform — three templates keep covers under an SVG/ subdir, Scribble under Spreads/.
const TEMPLATES = [
  ['Wander',          'assets/Template_Wander/',                 'Cover/Cover.svg'],
  ['Scribble',        'assets/Template_Scribble/Spreads/',       'Cover/Artboard 1.svg'],
  ['Papercut',        'assets/Template_Papercut/SVG/',           'Cover/Artboard 1.svg'],
  ['Newborn',         'assets/Template_Newborn/',                'Cover/Artboard 1.svg'],
  ['Tender',          'assets/Template_Tender/',                 'Cover/Artboard 1.svg'],
  ['Joyride',         'assets/Template_Joyride/SVG/',            'Cover/Artboard 1.svg'],
  ['Laguna',          'assets/Template_Laguna/SVG/',             'Cover/Artboard 1.svg'],
  ['Heirloom-Beige',  'assets/Template_Heirloom/Beige/SVG/',     'Cover/Cover_40_Roots.svg'],
  ['Heirloom-Blue',   'assets/Template_Heirloom/Blue/SVG/',      'Cover/Cover_40_Roots.svg'],
  ['Heirloom-Brown',  'assets/Template_Heirloom/Brown/SVG/',     'Cover/Cover_40_Roots.svg'],
  ['Heirloom-Green',  'assets/Template_Heirloom/Green/SVG/',     'Cover/Cover_40_Roots.svg'],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 700 }, deviceScaleFactor: 2 });

for (const [name, dir, svg] of TEMPLATES) {
  const url = `http://localhost:8080/${dir}${svg}`.replace(/ /g, '%20');
  const res = await page.goto(url, { waitUntil: 'load' }).catch(() => null);
  if (!res || !res.ok()) { console.log(`${name.padEnd(16)} ✗ no SVG at ${dir}/${svg}`); continue; }
  await page.waitForTimeout(600);
  const file = `${OUT}/${name}.png`;
  await page.screenshot({ path: file, fullPage: false });
  console.log(`${name.padEnd(16)} 📸 ${file}`);
}

await browser.close();
