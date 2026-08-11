// Capture the cover row alone, at full size, for pixel comparison against the owner's
// screenshot of the doubled album name. The earlier full-page shot cut the cover off
// above the front caption, which is exactly where the defect shows.
//
// Read-only.  Run:  $env:STAFF_PW = ... ; node qa/probe-cover-shot.mjs
import { chromium } from '@playwright/test';

const ORDER = process.env.QA_ORDER || 'AEV-094';
const EMAIL = process.env.STAFF_EMAIL || 'evg.myasin@gmail.com';
const PW    = process.env.STAFF_PW;
const BASE  = process.env.QA_BASE || 'https://aevia-test.pages.dev/pages';
if (!PW) { console.error('❌ STAFF_PW not set'); process.exit(1); }

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1700, height: 1100 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

try {
  await page.goto(`${BASE}/staff/template-engine`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#eng-email', { state: 'visible', timeout: 20000 });
  await page.fill('#eng-email', EMAIL);
  await page.fill('#eng-pwd', PW);
  await page.click('#eng-lock .eng-lock-btn');
  await page.waitForSelector('#eng-lock', { state: 'hidden', timeout: 20000 });

  await page.click('#mode-order-btn');
  await page.fill('#order-number-input', ORDER);
  await page.click('#order-load-btn');
  await page.waitForSelector('#order-info-panel', { state: 'visible', timeout: 60000 });
  await page.waitForTimeout(18000);

  const canvas = page.locator('.cover-canvas').first();
  await canvas.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await canvas.screenshot({ path: 'sessions/qa-runs/probe-cover-only.png' });
  console.log('📸 sessions/qa-runs/probe-cover-only.png');

  // Crop tight around the front caption too — the defect is 3px wide, so scale matters.
  const box = await page.locator('.cover-caption[data-cover-caption-key="front"]').boundingBox();
  if (box) {
    await page.screenshot({
      path: 'sessions/qa-runs/probe-front-caption.png',
      clip: { x: box.x - 60, y: box.y - 30, width: box.width + 120, height: box.height + 60 },
    });
    console.log('📸 sessions/qa-runs/probe-front-caption.png', JSON.stringify(box));
  } else {
    console.log('front caption has no bounding box (not rendered?)');
  }
} catch (e) {
  console.error('❌', e.message);
} finally {
  await browser.close();
}
