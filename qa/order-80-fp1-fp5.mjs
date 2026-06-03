// QA driver — mints ONE 80-page order with FP1 (Birthday) + FP5 (Art gallery)
// for the S23 complex-scenario run. Records how long the GCS upload takes.
// Run: node qa/order-80-fp1-fp5.mjs
// Creates a REAL test order (live test mode) — leaves an AEV-xxx in Firestore.

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const RUN_DIR   = path.resolve('sessions/qa-runs/2026-06-03-run02');
const PHOTO_DIR = path.resolve('assets/test photos/DTS_PARENTHOOD');
const BASE      = 'https://aevia-test.pages.dev/pages';

fs.mkdirSync(RUN_DIR, { recursive: true });

const allJpgs = fs.readdirSync(PHOTO_DIR).filter(f => /\.jpe?g$/i.test(f)).sort();
const art1 = path.join(PHOTO_DIR, 'art-1.jpg');
const art2 = path.join(PHOTO_DIR, 'art-2.jpg');
// Reserve the art scans; keep them out of the general pool.
const photos = allJpgs.filter(f => !/^art-[12]\.jpe?g$/i.test(f)).map(f => path.join(PHOTO_DIR, f));

const log = [];
const note = (m) => { const l = `[${new Date().toISOString().slice(11,19)}] ${m}`; console.log(l); log.push(l); };
const shot = async (page, name) => { await page.screenshot({ path: path.join(RUN_DIR, name), fullPage: true }); note(`📸 ${name}`); };

const consoleMsgs = [];
const netFails = [];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

page.on('console', m => { if (['error','warning'].includes(m.type())) consoleMsgs.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', e => consoleMsgs.push(`pageerror: ${e.message}`));
page.on('requestfailed', r => {
  const err = r.failure()?.errorText || '';
  // Ignore signed-URL PUTs aborted at browser teardown — they flood the log.
  if (err.includes('ERR_ABORTED') && r.url().includes('storage.googleapis.com')) return;
  netFails.push(`${err} ${r.url()}`);
});
page.on('response', r => { if (r.status() >= 400) netFails.push(`HTTP ${r.status()} ${r.url()}`); });

let orderNumber = null;
let uploadSeconds = null;
try {
  // ── Configurator — pick 80 pages, add FP1 + FP5 ───────────────
  note('Opening Scribble configurator');
  await page.goto(`${BASE}/scribble.html`, { waitUntil: 'networkidle' });
  await page.click('.chip:has-text("80 pages")');            // 80-page book
  await page.click('.addon[data-fp="FP1"]');                 // Birthday (1 photo + caption + heart)
  await page.click('.addon[data-fp="FP5"]');                 // Artwork gallery (2 photos + 2 captions)
  const photoCountText = await page.textContent('#photo-count');
  note(`Configurator photo-count text: "${photoCountText.trim()}"`);
  await shot(page, '01-scribble-configured.png');

  await Promise.all([ page.waitForURL('**/order?**'), page.click('.cta') ]);
  note(`Landed on order form: ${page.url()}`);

  // ── Step 1 — details ──────────────────────────────────────────
  await page.waitForSelector('#step1', { state: 'visible' });
  await page.fill('#inp-name', 'QA Tester 80');
  await page.fill('#inp-email', 'qa-test@example.com');
  await page.fill('#album-notes', 'Our son Leo, born March 2024. 80-page edition. Messy-joyful everyday feeling.');
  await page.click('button:has-text("Continue to photos")');

  // ── Step 2 — uploads ──────────────────────────────────────────
  await page.waitForSelector('#step2', { state: 'visible' });
  const target = parseInt(await page.textContent('#photo-count-min'), 10);
  note(`Order form requires ${target} main photos`);

  // Cover
  await page.setInputFiles('#dz-cover input[type=file]', photos[0]);
  await page.waitForSelector('#cover-preview', { state: 'visible' });
  await page.fill('#cover-front-year', '2024');
  await page.fill('#cover-front-name', 'Our wild Leo');
  await page.fill('#cover-spine-name', 'Leo');
  await page.fill('#cover-spine-year', '2024');
  note('Cover photo + cover text done');

  // FP1 — Birthday: 1 photo + caption
  await page.setInputFiles('#dz-special-fp1 input[type=file]', photos[1]);
  await page.waitForSelector('#special-preview-fp1', { state: 'visible' });
  const fp1Text = await page.$('#addon-text-fp1');
  if (fp1Text) await page.fill('#addon-text-fp1', 'Two years old and unstoppable. Cake everywhere.');
  note('FP1 (Birthday) photo + caption done');

  // FP5 — Artwork gallery: 2 photos (art-1, art-2) + 2 captions
  await page.setInputFiles('#dz-special-fp5-0 input[type=file]', art1);
  await page.waitForSelector('#special-preview-fp5-0', { state: 'visible' });
  await page.setInputFiles('#dz-special-fp5-1 input[type=file]', art2);
  await page.waitForSelector('#special-preview-fp5-1', { state: 'visible' });
  const fp5Cap0 = await page.$('#addon-text-fp5-0');
  if (fp5Cap0) await page.fill('#addon-text-fp5-0', 'Autumn leaves, October 2024');
  const fp5Cap1 = await page.$('#addon-text-fp5-1');
  if (fp5Cap1) await page.fill('#addon-text-fp5-1', 'The big red dog, November 2024');
  note('FP5 (Artwork gallery) 2 photos + 2 captions done');
  await shot(page, '02-step2-special-pages.png');

  // Main grid — cover + FP1 used 2 pool photos; FP5 uses reserved art scans.
  const mainSet = photos.slice(2, 2 + target);
  note(`Uploading ${mainSet.length} main photos`);
  await page.setInputFiles('#dz-main input[type=file]', mainSet);
  await page.waitForFunction(
    (t) => document.querySelectorAll('#photo-grid .photo-thumb').length >= t,
    target, { timeout: 180000 }
  );
  await page.waitForTimeout(2500);
  const countText = await page.textContent('#photo-count');
  note(`Photo count status: "${countText.trim()}"`);
  const lowResCount = await page.$$eval('#photo-grid .low-res-badge', els => els.length);
  note(`LOW RES badges visible: ${lowResCount}`);
  await shot(page, '03-step2-grid-filled.png');

  // ── Submit — time the GCS upload (submit → success screen) ─────
  note('Submitting order… (timing the upload)');
  const t0 = Date.now();
  await page.click('#submit-btn');
  await page.waitForSelector('#success-screen', { state: 'visible', timeout: 540000 });
  uploadSeconds = ((Date.now() - t0) / 1000).toFixed(1);
  orderNumber = (await page.textContent('#success-order-num')).trim();
  note(`✅ SUCCESS — ${orderNumber}`);
  note(`⏱ Upload time (submit → success): ${uploadSeconds}s for ${1 + 1 + 2 + (mainSet.length)} files (cover+FP1+2 art+${mainSet.length} main)`);
  await shot(page, '04-success.png');

} catch (err) {
  note(`❌ ERROR: ${err.message}`);
  await shot(page, 'ERROR-state.png');
} finally {
  if (consoleMsgs.length) { note('--- CONSOLE (errors/warnings) ---'); [...new Set(consoleMsgs)].slice(0,20).forEach(m => note('  ' + m)); }
  else note('Console: no errors/warnings 🎉');
  if (netFails.length) { note('--- NETWORK FAILURES ---'); [...new Set(netFails)].forEach(m => note('  ' + m)); }
  else note('Network: no failed requests');
  fs.writeFileSync(path.join(RUN_DIR, 'run-log.txt'), log.join('\n'));
  await browser.close();
  note(`Done. Order: ${orderNumber || 'NONE'} | upload ${uploadSeconds || '?'}s. Artefacts in ${RUN_DIR}`);
}
