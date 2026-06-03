// One-off verification of the customer-side completeness wiring (public, no password).
// Confirms: page loads clean, checkBookComplete is available, _requiredCaptions populates
// after render, and a known-complete book (AEV-023) evaluates as complete.
import { chromium } from '@playwright/test';

const URL = process.env.QA_PREVIEW_URL ||
  'https://aevia-test.pages.dev/pages/customer-preview.html?token=56c8f808-950b-4dfb-ac36-18dd58a1150a';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));

page.on('requestfailed', r => errors.push('requestfailed: ' + r.url().slice(0, 60) + ' ' + (r.failure()?.errorText || '')));
await page.goto(URL, { waitUntil: 'domcontentloaded' });
// Wait for the real order to load (pool fills), then a beat for render + caption collection.
await page.waitForFunction(() => (window.photoPool || []).length >= 51, null, { timeout: 90000 }).catch(()=>{});
await page.waitForTimeout(8000);

const out = await page.evaluate(() => {
  const fn = window.checkBookComplete;
  const res = typeof fn === 'function' ? fn({
    bookAssignments:  window.bookAssignments,
    photoPool:        window.photoPool,
    requiredCaptions: window._requiredCaptions,
    bookCaptions:     window.bookCaptions,
  }) : null;
  return {
    helperPresent: typeof fn === 'function',
    requiredCaptions: (window._requiredCaptions || []).length,
    poolLen: (window.photoPool || []).length,
    completeness: res,
    status: window.orderData && window.orderData.status,
  };
});

console.log('=== COMPLETENESS WIRING CHECK ===');
console.log(JSON.stringify(out, null, 2));
console.log('JS errors:', errors.length ? errors.slice(0, 8) : '(none)');
await browser.close();
