// Read-only diagnostic — NOT a test, NOT a fix.
// Loads the public customer-preview (token in URL), waits generously, and reports
// the real state of photo loading so we can tell "product bug" from "screenshot timing".
//
// Run:  node qa/probe-photos.mjs
// Optional: QA_PREVIEW_URL to override the token URL.

import { chromium } from '@playwright/test';

const URL = process.env.QA_PREVIEW_URL ||
  'https://aevia-test.pages.dev/pages/customer-preview.html?token=56c8f808-950b-4dfb-ac36-18dd58a1150a';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await ctx.newPage();

const photoErrors = [];
page.on('console', m => {
  const t = m.text();
  if (/Failed to load photo|timed out|not found|falling back/i.test(t)) photoErrors.push(`${m.type()}: ${t}`);
});

console.log('Loading', URL);
await page.goto(URL, { waitUntil: 'domcontentloaded' });

// Wait until the pool stops growing (photos finished fetching), or 60s cap.
let prev = -1, stable = 0;
for (let i = 0; i < 60; i++) {
  await page.waitForTimeout(2000);
  const n = await page.evaluate(() => (window.photoPool || []).length);
  if (n === prev) { stable++; if (stable >= 3 && n > 0) break; } else { stable = 0; }
  prev = n;
}

const report = await page.evaluate(() => {
  const imgs = Array.from(document.querySelectorAll('img'));
  const slotImgs = imgs.filter(im => im.closest('.slot, [class*="slot"], .photo-slot, .spread'));
  const loaded = imgs.filter(im => im.complete && im.naturalWidth > 0);
  const broken = imgs.filter(im => im.complete && im.naturalWidth === 0 && im.getAttribute('src'));
  const sample = imgs.filter(im => im.getAttribute('src'))
    .slice(0, 6)
    .map(im => ({ src: (im.getAttribute('src') || '').slice(0, 40), nw: im.naturalWidth, disp: im.style.display }));
  return {
    poolLen: (window.photoPool || []).length,
    poolLoaded: (window.photoPool || []).filter(p => p && p.w > 0).length,
    specialKeys: Object.keys(window.specialPhotos || {}),
    coverCount: ((window.specialPhotos || {}).cover || []).length,
    totalImgs: imgs.length,
    slotImgs: slotImgs.length,
    loadedImgs: loaded.length,
    brokenImgs: broken.length,
    sample,
    status: window.orderData && window.orderData.status,
  };
});

console.log('\n=== PHOTO PROBE REPORT ===');
console.log(JSON.stringify(report, null, 2));
console.log('\n=== PHOTO-RELATED CONSOLE MESSAGES (first 15) ===');
[...new Set(photoErrors)].slice(0, 15).forEach(m => console.log('  ' + m));
if (!photoErrors.length) console.log('  (none)');

await browser.close();
