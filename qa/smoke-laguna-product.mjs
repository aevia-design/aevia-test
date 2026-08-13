// Phase C stage 8 gate — pages/laguna.html + pages/de/laguna.html.
//
// Checks the shared product-page pattern is wired correctly: window.PRODUCT, the
// gallery/thumb set, the two story-page cards, the artist credit, and above all that
// "Create your book" builds an order URL carrying template=Laguna plus the add-on
// params (add-ons come from PRODUCT.fp, NOT from the data file — see laguna-build.md).
//
// The exp2/laguna/ mockup set was captured in S172, so the gate now asserts every
// gallery image LOADS (naturalWidth, not presence) and that no "Preview soon"
// placeholder remains. Before that it asserted the reverse.
//
// Usage:  npx http-server . -p 8080 -c-1     (project root, if not already running)
//         node qa/smoke-laguna-product.mjs

import { chromium } from 'playwright';

const BASE = 'http://localhost:8080';
let pass = 0, fail = 0;
const ok  = (m) => { console.log('  ✅ ' + m); pass++; };
const bad = (m) => { console.log('  ❌ ' + m); fail++; };
const check = (cond, m) => cond ? ok(m) : bad(m);

async function run(url, label, expect) {
  console.log(`\n──── ${label} ────`);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/404|Failed to load resource/i.test(m.text())) errors.push(m.text()); });

  await page.goto(url, { waitUntil: 'networkidle' });

  const P = await page.evaluate(() => window.PRODUCT);
  check(P && P.template === 'Laguna', `window.PRODUCT.template === 'Laguna' (got ${P && P.template})`);
  check(P && P.category === 'adventures', 'category is adventures');
  check(P && P.base === expect.base, `image base is ${expect.base}`);
  check(P && P.back === expect.back, `back param is ${expect.back}`);
  check(P && P.fp && Object.keys(P.fp).join(',') === 'FPintro,FP1', 'both story pages declared (FPintro, FP1)');

  check(await page.locator('#thumbs .thumb-ph').count() === 9, '9 gallery thumbs (front, back, 5 spreads, 2 specials)');
  check(await page.locator('.sp-card').count() === 2, '2 story-page cards');
  check((await page.locator('.product-title').textContent()).trim() === 'Laguna', 'title is Laguna');
  check(await page.locator('.collab a[href*="clemence-trossevin"]').count() === 1, 'artist credit links to Clémence');
  check((await page.locator('.acc-body a[href*="clemence-trossevin"]').count()) >= 1, 'about-this-template credits the artist');

  // The mockups exist as of S172, so assert they actually LOAD — a naturalWidth read,
  // not a presence check, because a broken <img> is still in the DOM (S170's lesson).
  // Until then this asserted the OPPOSITE: that every 404 fell back to a grey
  // "Preview soon" box. Both states are worth catching, so the fallback is checked too.
  const imgs = await page.locator('#gallery-img, #thumbs .thumb-ph img, .sp-thumb img')
    .evaluateAll(els => els.map(e => ({ src: e.getAttribute('src'), ok: e.complete && e.naturalWidth > 0 })));
  const broken = imgs.filter(i => !i.ok).map(i => i.src);
  check(imgs.length > 0 && broken.length === 0,
    `all ${imgs.length} gallery images load${broken.length ? ' — BROKEN: ' + broken.join(', ') : ''}`);
  const fellBack = await page.locator('.ph-fallback').count();
  check(fellBack === 0, `no "Preview soon" placeholders left (${fellBack})`);

  // Select both story pages, then read the order URL the CTA would navigate to.
  await page.locator('.sp-card[data-fp="FPintro"]').click();
  await page.locator('.sp-card[data-fp="FP1"]').click();
  // product.js navigates with `window.location.href = …`, which cannot be stubbed, so
  // let the navigation happen and read where it landed. order.html is served locally
  // and makes no cloud calls on load.
  await page.locator('.cta').click();
  await page.waitForURL(/order\.html/, { timeout: 10000 }).catch(() => {});
  const href = page.url();
  if (!/order\.html/.test(href)) { bad(`CTA did not navigate to the order form (landed on ${href})`); }
  else {
    const u = new URL(href);
    check(u.searchParams.get('template') === 'Laguna', 'order URL carries template=Laguna');
    check(u.searchParams.get('category') === 'adventures', 'order URL carries category');
    check(u.searchParams.get('pages') === '40', 'order URL carries the selected page count');
    check((u.searchParams.get('addon_slugs') || '') === 'fpintro,fp1', `order URL carries both add-on slugs (got ${u.searchParams.get('addon_slugs')})`);
    check(u.pathname.endsWith('/order.html'), `order URL points at order.html (${u.pathname})`);
  }

  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
}


await run(`${BASE}/pages/laguna.html`, 'EN — pages/laguna.html', {
  base: '../assets/images/mockups/exp2/laguna/', back: 'laguna.html',
});
await run(`${BASE}/pages/de/laguna.html`, 'DE — pages/de/laguna.html', {
  base: '../../assets/images/mockups/exp2/laguna/', back: 'de/laguna.html',
});

// The collections card is the other entry point into the page.
{
  console.log('\n──── collections cards ────');
  const browser = await chromium.launch();
  for (const [url, label] of [[`${BASE}/pages/collections.html`, 'EN'], [`${BASE}/pages/de/collections.html`, 'DE']]) {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const card = page.locator('.template-card').filter({ hasText: 'Laguna' });
    check(await card.count() === 1, `${label}: Laguna card present`);
    check(await card.locator('a[href="laguna.html"]').count() >= 1, `${label}: card links to laguna.html`);
    check(await card.locator('a[href*="clemence-trossevin"]').count() === 1, `${label}: card carries the artist credit`);
    const price = (await card.locator('.template-price').textContent()).trim();
    check(/^€ \d+$/.test(price), `${label}: price rendered from prices.js (${price})`);
    await page.close();
  }
  await browser.close();
}

console.log(`\n──────── ${pass}/${pass + fail} passed ────────`);
process.exit(fail ? 1 : 0);
