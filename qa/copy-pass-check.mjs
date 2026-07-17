/* Copy-pass page check (S139) — the verification loop for the website-copy
 * overhaul: console errors, horizontal overflow, nav centring, screenshots.
 *
 *   node qa/copy-pass-check.mjs home about tender
 *   node qa/copy-pass-check.mjs            # defaults to every marketing page
 *
 * Needs a dev server: npx serve . -p 8080
 * Screenshots land in sessions/qa-runs/ (gitignored).
 */
import { chromium } from 'playwright';

const ALL = ['home', 'collections', 'about', 'help', 'our-artists',
             'tender', 'wander', 'joyride', 'newborn', 'scribble', 'papercut'];
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ALL;
const VIEWPORTS = [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 375, height: 812 }]];

const browser = await chromium.launch();
let failures = 0;

for (const name of pages) {
  for (const [label, viewport] of VIEWPORTS) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

    const res = await page.goto(`http://localhost:8080/pages/${name}.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const checks = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      // Nav links must sit on the true centre line — see S139: space-between
      // put them 65px left until the side columns were made equal in mobile.css
      navOffset: (() => {
        const el = document.querySelector('.nav-links');
        if (!el || getComputedStyle(el).display === 'none') return null;
        const b = el.getBoundingClientRect();
        return +(window.innerWidth / 2 - (b.left + b.right) / 2).toFixed(1);
      })(),
    }));

    const problems = [];
    if (res.status() !== 200) problems.push(`HTTP ${res.status()}`);
    if (checks.overflow > 0) problems.push(`horizontal overflow ${checks.overflow}px`);
    if (checks.navOffset !== null && Math.abs(checks.navOffset) > 1) problems.push(`nav off-centre ${checks.navOffset}px`);
    if (errors.length) problems.push(...errors);

    await page.screenshot({ path: `sessions/qa-runs/${name}-${label}.png`, fullPage: true });
    await page.close();

    failures += problems.length ? 1 : 0;
    console.log(`${problems.length ? '✗' : '✓'} ${name} (${label})${problems.length ? ' — ' + problems.join('; ') : ''}`);
  }
}

await browser.close();
console.log(failures ? `\n${failures} page/viewport combos need attention` : '\nall clean');
process.exit(failures ? 1 : 0);
