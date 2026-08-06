// S154 diagnostic — does the cover photo slot fully cover its clip silhouette?
// Any part of the silhouette the photo box does not reach shows the artwork underneath
// (on Papercut, a violet placeholder rect). Measured with getBBox() on the live clipPath
// path so it is exact for curves and arcs, not just polygon-derived paths.
// Run from qa/: `node debug-clip-coverage.mjs`
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const dir = path.resolve('../assets/test photos/DTS_PARENTHOOD');
const files = fs.readdirSync(dir).filter(f => /\.(jpe?g|png)$/i.test(f)).map(f => path.join(dir, f));
const browser = await chromium.launch();

for (const tpl of ['tender', 'papercut', 'newborn']) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on('pageerror', e => console.log(`PAGE ERROR (${tpl}):`, e.message));
  await page.goto('http://localhost:8080/pages/staff/template-engine.html', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const ok = await page.evaluate(t => {
    const sel = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.value.toLowerCase() === t));
    if (!sel) return false;
    sel.value = [...sel.options].find(o => o.value.toLowerCase() === t).value;
    sel.dispatchEvent(new Event('change'));
    return true;
  }, tpl);
  if (!ok) { console.log(`BLOCKED: no ${tpl} option`); process.exit(2); }
  await page.waitForTimeout(1200);
  await page.locator('input[data-fp-input="cover"]').setInputFiles(files.slice(0, 1));
  await page.waitForTimeout(400);
  await page.locator('#photo-file-input').setInputFiles(files.slice(0, 8));
  await page.waitForTimeout(1200);
  await page.waitForSelector('.cover-canvas', { timeout: 15000 });

  const r = await page.evaluate(() => {
    const SCALE = 3;
    const slot = document.querySelector('.cover-canvas .photo-slot');
    const p = slot && slot.querySelector('clipPath path');
    if (!p) return { note: 'no clipPath path in the cover slot' };
    // Path bbox in its own user units, then through its transform into slot-local px.
    const b = p.getBBox();
    const tx = /translate\((-?[\d.]+)[ ,]+(-?[\d.]+)\)/.exec(p.getAttribute('transform') || '');
    const sc = /scale\(([\d.]+)\)/.exec(p.getAttribute('transform') || '');
    const f = sc ? Number(sc[1]) : 1;
    const dx = tx ? Number(tx[1]) : 0, dy = tx ? Number(tx[2]) : 0;
    const box = { x0: b.x * f + dx, y0: b.y * f + dy, x1: (b.x + b.width) * f + dx, y1: (b.y + b.height) * f + dy };
    const w = slot.getBoundingClientRect().width, h = slot.getBoundingClientRect().height;
    const mm = v => +(v / SCALE).toFixed(2);
    return {
      silhouetteInSlotPx: { x0: +box.x0.toFixed(1), y0: +box.y0.toFixed(1), x1: +box.x1.toFixed(1), y1: +box.y1.toFixed(1) },
      slotPx: { w: +w.toFixed(1), h: +h.toFixed(1) },
      uncoveredMm: { left: mm(-box.x0), top: mm(-box.y0), right: mm(box.x1 - w), bottom: mm(box.y1 - h) },
    };
  });
  const bad = r.uncoveredMm && Object.values(r.uncoveredMm).some(v => v > 0.05);
  console.log(`\n${bad ? 'GAP  ' : 'ok   '} ${tpl}: ${JSON.stringify(r)}`);
  await page.close();
}
console.log('\nPositive uncoveredMm = silhouette reaches past the photo box on that side → artwork shows through.');
await browser.close();
