// One-off: verify Cormorant Garamond @font-face registration loads in the engine
// + customer-preview, and that booting either page throws no console errors.
// Run: node qa/verify-wander-fonts.mjs   (dev server must be on :8080)
import { chromium } from 'playwright';

const WEIGHTS = [300, 400, 500, 600, 700];
const PAGES = [
  ['engine',   'http://localhost:8080/pages/staff/template-engine.html'],
  ['customer', 'http://localhost:8080/pages/customer-preview.html'],
];

const browser = await chromium.launch();
let bad = 0;
for (const [name, url] of PAGES) {
  const page = await browser.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  const results = await page.evaluate(async (weights) => {
    const out = {};
    for (const w of weights) {
      try { const f = await document.fonts.load(`${w} 16px "Cormorant Garamond"`); out[w] = f.length > 0; }
      catch (e) { out[w] = 'ERR ' + e.message; }
    }
    return out;
  }, WEIGHTS);

  console.log(`\n[${name}] ${url}`);
  for (const w of WEIGHTS) {
    const ok = results[w] === true;
    if (!ok) bad++;
    console.log(`  Cormorant ${w}: ${ok ? 'loaded ✓' : 'FAILED ✗ (' + results[w] + ')'}`);
  }
  // Font-error console noise is the thing we care about here.
  const fontErrs = errors.filter(e => /font|cormorant|\.ttf/i.test(e));
  console.log(`  console errors (total ${errors.length}, font-related ${fontErrs.length})`);
  fontErrs.forEach(e => console.log('    ! ' + e));
  await page.close();
}
await browser.close();
console.log(bad === 0 ? '\nALL FONTS LOADED ✓' : `\n${bad} font check(s) FAILED ✗`);
process.exit(bad === 0 ? 0 : 1);
