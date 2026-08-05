// S152 spine-geometry verification — staff engine, Scribble, no orders created.
// Measures live DOM cover geometry at page counts 40 (s=10) and 80 (s=14) plus the
// 9mm baseline, including BOTH SVG copies (the thing the first verify script missed).
// Local only: http://localhost:8080, no backend calls, no login needed for render
// (falls back to reporting if the engine gates on auth).
import { chromium } from 'playwright';

const SCALE = 3;
const results = [];
const TEMPLATE = process.argv[2] || "scribble";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.on('pageerror', e => console.log('PAGE ERROR:', e.message));

await page.goto('http://localhost:8080/pages/staff/template-engine.html', { waitUntil: 'load' });
await page.waitForTimeout(1500);

const gated = await page.evaluate(() => !document.getElementById('page-count-select'));
if (gated) { console.log('BLOCKED: engine gated (no #page-count-select in DOM)'); process.exit(2); }

// Switch template if asked (default scribble). The selector id is discovered rather than
// assumed, so this keeps working if the control is renamed.
if (TEMPLATE !== 'scribble') {
  // #template-select uses capitalised values ('Tender'); match case-insensitively.
  const ok = await page.evaluate(t => {
    const sel = [...document.querySelectorAll('select')]
      .find(s => [...s.options].some(o => o.value.toLowerCase() === t.toLowerCase()));
    if (!sel) return false;
    const opt = [...sel.options].find(o => o.value.toLowerCase() === t.toLowerCase());
    sel.value = opt.value; sel.dispatchEvent(new Event('change'));
    return true;
  }, TEMPLATE);
  if (!ok) { console.log(`BLOCKED: no template selector offering "${TEMPLATE}"`); process.exit(2); }
  await page.waitForTimeout(1200);
}

// The cover renders only once photos exist. Load local test photos through the file
// inputs — no backend, no orders (same approach as verify-spine-geometry.mjs).
import fs from 'fs';
import path from 'path';
const dir = path.resolve('../assets/test photos/DTS_PARENTHOOD');
const files = fs.readdirSync(dir).filter(f => /\.(jpe?g|png)$/i.test(f)).map(f => path.join(dir, f));
if (!files.length) { console.log('BLOCKED: no test photos at', dir); process.exit(2); }
await page.locator('input[data-fp-input="cover"]').setInputFiles(files.slice(0, 1));
await page.waitForTimeout(500);
await page.locator('#photo-file-input').setInputFiles(files.slice(0, 8));
await page.waitForTimeout(1000);
await page.waitForSelector('.cover-canvas', { timeout: 15000 });

async function measure(label, pageCountValue) {
  if (pageCountValue) {
    await page.evaluate(v => {
      const sel = document.getElementById('page-count-select');
      sel.value = v;
      sel.dispatchEvent(new Event('change'));
    }, pageCountValue);
    await page.waitForTimeout(800);
  }
  const m = await page.evaluate(() => {
    const canvas = document.querySelector('.cover-canvas');
    if (!canvas) return { error: 'no .cover-canvas rendered' };
    const svgs  = [...canvas.querySelectorAll('img.svg-overlay')];
    const slot  = canvas.querySelector('.photo-slot');
    const caps  = [...canvas.querySelectorAll('.cover-caption, [class*=caption]')];
    const spineCap = caps.find(c => /rotate\(270/.test(c.style.transform || c.style.cssText));
    const rel = el => el ? { left: el.offsetLeft, width: el.offsetWidth } : null;
    // The clipShape path transform — this is what proves the silhouette tracks the artwork.
    const clipPath = canvas.querySelector('.photo-slot clipPath path');
    const clipTx = clipPath ? clipPath.getAttribute('transform') : null;
    return {
      canvasW: canvas.offsetWidth,
      svgCopies: svgs.map(s => ({ left: s.offsetLeft, width: s.offsetWidth, clip: s.style.clipPath || '(none)' })),
      slot: rel(slot),
      spineCap: rel(spineCap),
      clipTx,
    };
  });
  results.push({ label, ...m });
}

await measure('baseline (select untouched)');
await measure('40pp (s=10)', '40');
await measure('80pp (s=14)', '80');

console.log(JSON.stringify(results, null, 2));

// Expectations (Scribble, SCALE=3):
//  canvasW: 40pp → 1230, 80pp → 1242
//  both svg copies: width 1227 ALWAYS (never stretched)
//  back copy left 0 always; front copy left = delta*3 (3 at 40pp, 15 at 80pp)
//  slot left: 720 + delta*3
const check = (label, got, want) => {
  const ok = got === want;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: got ${got}, want ${want}`);
  return ok;
};
let pass = true;
for (const [i, s, d] of [[1, 10, 3], [2, 14, 15]]) {
  const r = results[i];
  if (r.error) { console.log('FAIL', r.label, r.error); pass = false; continue; }
  pass &= check(`${r.label} canvasW`, r.canvasW, 1200 + s * 3);
  pass &= check(`${r.label} svg copies count`, r.svgCopies.length, 2);
  for (const [j, c] of r.svgCopies.entries())
    pass &= check(`${r.label} svg[${j}] natural width`, c.width, 1227);
  if (r.svgCopies[1]) pass &= check(`${r.label} front svg left`, r.svgCopies[1].left, d);
  if (r.svgCopies[0]) pass &= check(`${r.label} back svg left`, r.svgCopies[0].left, 0);
  // Slot baseline left = (xMm−18)*3 − wMm*3/2. Scribble 327/140 → 717; Tender 327/150 → 702.
  const slotBase = TEMPLATE === 'tender' ? 702 : 717;
  if (r.slot) pass &= check(`${r.label} slot left`, r.slot.left, slotBase + d);
  // Registration: the clip path's x-translate must equal (slotDeltaPx − slotL), i.e. it must
  // track the slot AND the shifted artwork. Compare against the baseline transform shifted
  // by exactly 0 — the x term is (d − slotLeft), so it must equal d − r.slot.left.
  if (r.clipTx) {
    const x = Number(/translate\((-?[\d.]+)/.exec(r.clipTx)?.[1]);
    pass &= check(`${r.label} clip x-translate`, x, Number((d - r.slot.left).toFixed(2)));
  }
  // Spine caption: centred on the widened spine → left = (200 + s/2)*3 − capW/2 = 600 + 1.5s − 195
  if (r.spineCap) pass &= check(`${r.label} spine caption left`, r.spineCap.left, Math.round(600 + 1.5 * s - r.spineCap.width / 2));
}
await browser.close();
process.exit(pass ? 0 : 1);
