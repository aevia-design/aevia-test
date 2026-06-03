// QA driver — walks the live customer order journey (Scribble template) and
// screenshots every milestone so a human (or Claude) can judge the result.
// Run: node qa/order-journey.mjs
// This creates a REAL test order (live test mode) — leaves an AEV-xxx in Firestore.

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const RUN_DIR = path.resolve('sessions/qa-runs/2026-06-03-run01');
const PHOTO_DIR = path.resolve('assets/test photos/DTS_PARENTHOOD');
const BASE = 'https://aevia-test.pages.dev/pages';

fs.mkdirSync(RUN_DIR, { recursive: true });

const allJpgs = fs.readdirSync(PHOTO_DIR)
  .filter(f => /\.jpe?g$/i.test(f))
  .sort();
// Art gallery (FP5) uses two specific scanned artworks; reserve them and keep
// them out of the general pool so they don't get reused as cover/main photos.
const art1 = path.join(PHOTO_DIR, 'art-1.jpg');
const art2 = path.join(PHOTO_DIR, 'art-2.jpg');
const photos = allJpgs
  .filter(f => !/^art-[12]\.jpe?g$/i.test(f))
  .map(f => path.join(PHOTO_DIR, f));

const log = [];
const note = (m) => { const line = `[${new Date().toISOString().slice(11,19)}] ${m}`; console.log(line); log.push(line); };
const shot = async (page, name) => { const p = path.join(RUN_DIR, name); await page.screenshot({ path: p, fullPage: true }); note(`📸 ${name}`); };

const consoleMsgs = [];
const netFails = [];

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();

page.on('console', m => { if (['error','warning'].includes(m.type())) consoleMsgs.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', e => consoleMsgs.push(`pageerror: ${e.message}`));
page.on('requestfailed', r => netFails.push(`${r.failure()?.errorText} ${r.url()}`));
page.on('response', r => { if (r.status() >= 400) netFails.push(`HTTP ${r.status()} ${r.url()}`); });

let orderNumber = null;
try {
  // ── Configurator ──────────────────────────────────────────────
  note('Opening Scribble configurator');
  await page.goto(`${BASE}/scribble.html`, { waitUntil: 'networkidle' });
  await shot(page, '01-scribble-default.png');

  // 40 pages is the default selected chip. Select ALL five optional spreads.
  await page.click('.addon[data-fp="FP1"]'); // Birthday spread (1 photo + caption)
  await page.click('.addon[data-fp="FP2"]'); // Funny words (text only)
  await page.click('.addon[data-fp="FP3"]'); // Favourite toy (1 photo + caption)
  await page.click('.addon[data-fp="FP4"]'); // First steps (1 photo + caption)
  await page.click('.addon[data-fp="FP5"]'); // Artwork gallery (2 photos + 2 captions)
  const photoCountText = await page.textContent('#photo-count');
  note(`Configurator photo-count text: "${photoCountText.trim()}"`);
  await shot(page, '02-scribble-configured.png');

  await Promise.all([
    page.waitForURL('**/order?**'),
    page.click('.cta'), // "Create your book"
  ]);
  note(`Landed on order form: ${page.url()}`);

  // ── Step 1 — details ──────────────────────────────────────────
  await page.waitForSelector('#step1', { state: 'visible' });
  await page.fill('#inp-name', 'QA Tester');
  await page.fill('#inp-email', 'qa-test@example.com');
  await page.fill('#album-notes', 'Our son Leo, born March 2024. Loves the garden hose, the dog, and refusing naps. Please weave in the messy-joyful everyday feeling.');
  await shot(page, '03-step1-details.png');
  await page.click('button:has-text("Continue to photos")');

  // ── Step 2 — uploads ──────────────────────────────────────────
  await page.waitForSelector('#step2', { state: 'visible' });
  const target = parseInt(await page.textContent('#photo-count-min'), 10);
  note(`Order form requires ${target} main photos (window._photoCountTarget)`);

  // Cover
  await page.setInputFiles('#dz-cover input[type=file]', photos[0]);
  await page.waitForSelector('#cover-preview', { state: 'visible' });
  await page.fill('#cover-front-year', '2024');
  await page.fill('#cover-front-name', 'Our wild Leo');
  await page.fill('#cover-spine-name', 'Leo');
  await page.fill('#cover-spine-year', '2024');
  note('Cover photo + cover text done');

  // FP1 — Birthday spread: 1 photo + caption
  await page.setInputFiles('#dz-special-fp1 input[type=file]', photos[1]);
  await page.waitForSelector('#special-preview-fp1', { state: 'visible' });
  const fp1Text = await page.$('#addon-text-fp1');
  if (fp1Text) await page.fill('#addon-text-fp1', 'Two years old and unstoppable. Cake everywhere.');
  note('FP1 (Birthday) photo + caption done');

  // FP2 — Funny words: fill the word rows (min 3)
  const fp2Inputs = await page.$$('#fp-word-list-fp2 input');
  const words = ['Nana (banana)', 'Moooore', 'Doggo', 'Why?', 'Up-up'];
  for (let i = 0; i < Math.min(fp2Inputs.length, words.length); i++) {
    await fp2Inputs[i].fill(words[i]);
  }
  note(`FP2 (Funny words) filled ${Math.min(fp2Inputs.length, words.length)} words`);

  // FP3 — Favourite toy: 1 photo + caption
  await page.setInputFiles('#dz-special-fp3 input[type=file]', photos[2]);
  await page.waitForSelector('#special-preview-fp3', { state: 'visible' });
  const fp3Text = await page.$('#addon-text-fp3');
  if (fp3Text) await page.fill('#addon-text-fp3', "Bunny — Leo's constant companion since day one.");
  note('FP3 (Favourite toy) photo + caption done');

  // FP4 — First steps: 1 photo + caption
  await page.setInputFiles('#dz-special-fp4 input[type=file]', photos[3]);
  await page.waitForSelector('#special-preview-fp4', { state: 'visible' });
  const fp4Text = await page.$('#addon-text-fp4');
  if (fp4Text) await page.fill('#addon-text-fp4', 'First wobbly steps — 14 March 2024, in the kitchen.');
  note('FP4 (First steps) photo + caption done');

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
  await shot(page, '04-step2-special-pages.png');

  // Main grid — upload exactly `target` distinct photos (skip the 4 already used:
  // cover + FP1 + FP3 + FP4; FP5 uses the reserved art photos, not the pool)
  const mainSet = photos.slice(4, 4 + target);
  note(`Uploading ${mainSet.length} main photos`);
  await page.setInputFiles('#dz-main input[type=file]', mainSet);

  // Wait for all thumbs to render
  await page.waitForFunction(
    (t) => document.querySelectorAll('#photo-grid .photo-thumb').length >= t,
    target, { timeout: 120000 }
  );
  // Let resolution badges + downscaled thumbs settle
  await page.waitForTimeout(2500);
  const countText = await page.textContent('#photo-count');
  note(`Photo count status: "${countText.trim()}"`);
  const lowResCount = await page.$$eval('#photo-grid .low-res-badge', els => els.length);
  note(`LOW RES badges visible: ${lowResCount}`);
  await shot(page, '05-step2-grid-filled.png');

  // ── Submit ────────────────────────────────────────────────────
  note('Submitting order…');
  await page.click('#submit-btn');

  // Success screen appears after GCS upload completes
  await page.waitForSelector('#success-screen', { state: 'visible', timeout: 180000 });
  orderNumber = (await page.textContent('#success-order-num')).trim();
  note(`✅ SUCCESS — ${orderNumber}`);
  await shot(page, '06-success.png');

} catch (err) {
  note(`❌ ERROR: ${err.message}`);
  await shot(page, 'ERROR-state.png');
} finally {
  if (consoleMsgs.length) { note('--- CONSOLE (errors/warnings) ---'); consoleMsgs.forEach(m => note('  ' + m)); }
  else note('Console: no errors/warnings 🎉');
  if (netFails.length) { note('--- NETWORK FAILURES ---'); [...new Set(netFails)].forEach(m => note('  ' + m)); }
  else note('Network: no failed requests');
  fs.writeFileSync(path.join(RUN_DIR, 'run-log.txt'), log.join('\n'));
  await browser.close();
  note(`Done. Order: ${orderNumber || 'NONE'}. Log + screenshots in ${RUN_DIR}`);
}
