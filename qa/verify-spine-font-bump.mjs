// S154 spine-caption font bump verification — staff engine, live DOM, no orders created.
// Owner's rule: spine captions render +2pt at 80pp (the 14mm spine needs a larger face);
// front/back captions are untouched. Run from qa/: `node verify-spine-font-bump.mjs`.
//
// Checks the RENDERED font-size, not the source value, because the engine converts
// points to px via sizePt * SCALE * 25.4/72 — a bug in that conversion would be invisible
// to a source-level check.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const SCALE = 3;
const PT_TO_PX = SCALE * 25.4 / 72;
const TEMPLATES = ['scribble', 'tender', 'papercut', 'newborn', 'wander'];

const dir = path.resolve('../assets/test photos/DTS_PARENTHOOD');
const files = fs.readdirSync(dir).filter(f => /\.(jpe?g|png)$/i.test(f)).map(f => path.join(dir, f));
if (!files.length) { console.log('BLOCKED: no test photos at', dir); process.exit(2); }

const browser = await chromium.launch();
let pass = true;

for (const tpl of TEMPLATES) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on('pageerror', e => console.log(`PAGE ERROR (${tpl}):`, e.message));
  await page.goto('http://localhost:8080/pages/staff/template-engine.html', { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  if (await page.evaluate(() => !document.getElementById('page-count-select'))) {
    console.log('BLOCKED: engine gated'); process.exit(2);
  }
  // #template-select uses capitalised values ('Tender'); match case-insensitively, and
  // FAIL LOUDLY if the switch does not happen — a swallowed error here renders Scribble
  // five times and every template appears to pass identically (caught in S154).
  if (tpl !== 'scribble') {
    const ok = await page.evaluate(t => {
      const sel = [...document.querySelectorAll('select')]
        .find(s => [...s.options].some(o => o.value.toLowerCase() === t.toLowerCase()));
      if (!sel) return false;
      const opt = [...sel.options].find(o => o.value.toLowerCase() === t.toLowerCase());
      sel.value = opt.value; sel.dispatchEvent(new Event('change'));
      return true;
    }, tpl);
    if (!ok) { console.log(`BLOCKED: no template selector offering "${tpl}"`); process.exit(2); }
    await page.waitForTimeout(1200);
  }
  await page.locator('input[data-fp-input="cover"]').setInputFiles(files.slice(0, 1));
  await page.waitForTimeout(400);
  await page.locator('#photo-file-input').setInputFiles(files.slice(0, 8));
  await page.waitForTimeout(1200);
  await page.waitForSelector('.cover-canvas', { timeout: 15000 });

  // Read every cover caption's rendered size, keyed by its data key, at each page count.
  const read = async (pc) => {
    await page.selectOption('#page-count-select', String(pc));
    await page.waitForTimeout(700);
    return page.evaluate(() => {
      const out = {};
      for (const el of document.querySelectorAll('.cover-canvas .cover-caption')) {
        out[el.dataset.coverCaptionKey] = parseFloat(getComputedStyle(el).fontSize);
      }
      return out;
    });
  };
  const at40 = await read(40);
  const at80 = await read(80);

  for (const key of Object.keys(at40)) {
    const isSpine = key.toLowerCase().startsWith('spine');
    const wantDeltaPx = (isSpine ? 2 : 0) * PT_TO_PX;
    const gotDeltaPx = at80[key] - at40[key];
    const ok = Math.abs(gotDeltaPx - wantDeltaPx) < 0.15;
    if (!ok) pass = false;
    console.log(
      `${ok ? 'PASS' : 'FAIL'}  ${tpl}/${key} (${isSpine ? 'spine' : 'front/back'}): ` +
      `40pp=${at40[key].toFixed(2)}px 80pp=${at80[key].toFixed(2)}px ` +
      `delta=${gotDeltaPx.toFixed(2)}px want=${wantDeltaPx.toFixed(2)}px`
    );
  }
  await page.close();
}

await browser.close();
console.log(pass ? '\nALL PASS' : '\nFAILURES PRESENT');
process.exit(pass ? 0 : 1);
