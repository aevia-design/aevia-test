/* prelaunch-banner.mjs — verify the aevia.at pre-launch banner.
 *
 * site-mode.js is deliberately inert on localhost, so a plain local load would
 * never render the banner. This maps the real https://aevia.at origin onto the
 * local dev server, so location.hostname is genuinely 'aevia.at' and the actual
 * production code path runs.
 *
 * Requires: npx serve . -p 8080
 * Run:      node qa/prelaunch-banner.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const LOCAL = 'http://localhost:8080';
const OUT = 'sessions/qa-runs/prelaunch-banner';
mkdirSync(OUT, { recursive: true });

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const browser = await chromium.launch();
const ctx = await browser.newContext();

// Serve aevia.at from the local files.
await ctx.route('https://aevia.at/**', async (route) => {
  const url = new URL(route.request().url());
  let p = url.pathname;
  if (p === '/' ) p = '/pages/home.html';
  if (!/\.[a-z0-9]+$/i.test(p)) p += '.html';   // extensionless URLs
  const res = await fetch(LOCAL + p + url.search).catch(() => null);
  if (!res || !res.ok) return route.fulfill({ status: 404, body: 'not found' });
  route.fulfill({
    status: 200,
    headers: { 'content-type': res.headers.get('content-type') || 'text/html' },
    body: Buffer.from(await res.arrayBuffer()),
  });
});

const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });

async function measure(url, label, width) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const m = await page.evaluate(() => {
    const bar = document.body.firstElementChild;
    const nav = document.querySelector('.nav');
    const logo = document.querySelector('.nav-logo, .nav-logo-text, .nav-logo img');
    const isBar = bar && bar.tagName === 'A' && /waitlist/.test(bar.getAttribute('href') || '');
    return {
      hasBar: !!isBar,
      text: isBar ? bar.textContent : null,
      bg: isBar ? getComputedStyle(bar).backgroundColor : null,
      barH: isBar ? Math.round(bar.getBoundingClientRect().height) : 0,
      barBottom: isBar ? Math.round(bar.getBoundingClientRect().bottom) : 0,
      navTop: nav ? Math.round(nav.getBoundingClientRect().top) : null,
      logoTop: logo ? Math.round(logo.getBoundingClientRect().top) : null,
    };
  });

  console.log(`\n--- ${label} @ ${width}px ---`);
  console.log(`   banner height ${m.barH}px, bottom ${m.barBottom}px | nav top ${m.navTop}px | logo top ${m.logoTop}px`);
  console.log(`   text: ${m.text}`);
  console.log(`   bg:   ${m.bg}`);

  check(`${label} @${width}: banner renders`, m.hasBar);
  // The whole point: nothing in the nav may sit under the banner.
  check(`${label} @${width}: nav clears the banner`,
        m.navTop !== null && m.navTop >= m.barBottom,
        `nav top ${m.navTop} vs banner bottom ${m.barBottom}`);
  check(`${label} @${width}: logo not clipped`,
        m.logoTop !== null && m.logoTop >= m.barBottom,
        `logo top ${m.logoTop} vs banner bottom ${m.barBottom}`);

  await page.screenshot({ path: `${OUT}/${label}-${width}.png`, clip: { x: 0, y: 0, width, height: 260 } });
  return m;
}

const en = await measure('https://aevia.at/pages/home', 'EN-home', 1440);
await measure('https://aevia.at/pages/home', 'EN-home', 390);
const de = await measure('https://aevia.at/pages/de/home', 'DE-home', 1440);
await measure('https://aevia.at/pages/de/home', 'DE-home', 390);

check('EN copy is English', /still being built/.test(en.text || ''), en.text);
check('DE copy is German', /noch im Aufbau/.test(de.text || ''), de.text);
check('banner is slimmer than the old 32px', en.barH < 32, `${en.barH}px`);
check('no console errors', consoleErrors.length === 0, consoleErrors.join(' | ') || 'none');

await browser.close();

const failed = results.filter(r => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
console.log(`Screenshots: ${OUT}/`);
process.exit(failed.length ? 1 : 0);
