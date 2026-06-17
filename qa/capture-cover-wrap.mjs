// Capture a CLEAN, pixel-exact cover-WRAP texture for the 3D book renderer.
//
// The 3D renderer (assets/js/book-3d-renderer.js) wraps a full cover image
// [ back | spine | front ] around a box, slicing it by UV regions derived from
// the template's mm sections (book-3d-spec.js). For that slicing to be correct
// the texture must be EXACTLY the trim wrap — no UI chrome, no surrounding
// margin, no bleed. The staff engine's `.cover-canvas` element IS exactly that
// (renderCover builds it at (back+spine+front)*SCALE, captions + photo + SVG),
// so we screenshot just that element.
//
// Run (PowerShell):
//   $env:STAFF_PW = Read-Host "Staff password"
//   $env:QA_ORDER = "AEV-037"            # a Newborn order (optional; defaults below)
//   node qa/capture-cover-wrap.mjs
//
// Output: sessions/qa-runs/cover-wrap-<order>.png  (and a stable copy the harness loads)

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ORDER = process.env.QA_ORDER || 'AEV-037';
const EMAIL = process.env.STAFF_EMAIL || 'evg.myasin@gmail.com';
const PW    = process.env.STAFF_PW;
const BASE  = 'https://aevia-test.pages.dev/pages';
const OUT_DIR = path.resolve('sessions/qa-runs');
const OUT     = path.join(OUT_DIR, `cover-wrap-${ORDER}.png`);
const STABLE  = path.join(OUT_DIR, 'cover-wrap-newborn.png'); // what the harness loads

if (!PW) { console.error('❌ STAFF_PW not set. In PowerShell:  $env:STAFF_PW = Read-Host "Staff password"'); process.exit(1); }
fs.mkdirSync(OUT_DIR, { recursive: true });

const note = (m) => console.log(`[${new Date().toISOString().slice(11,19)}] ${m}`);

// 3× device scale → a crisp texture even at large render sizes.
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 3 });
const page = await ctx.newPage();
const consoleMsgs = [];
page.on('console', m => { if (['error','warning'].includes(m.type())) consoleMsgs.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', e => consoleMsgs.push(`pageerror: ${e.message}`));

try {
  // ── Staff login ──────────────────────────────────────────────
  note(`Opening engine, logging in as ${EMAIL}`);
  await page.goto(`${BASE}/staff/template-engine`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#eng-email', { state: 'visible', timeout: 20000 });
  await page.fill('#eng-email', EMAIL);
  await page.fill('#eng-pwd', PW);
  await page.click('#eng-lock .eng-lock-btn');
  await page.waitForSelector('#eng-lock', { state: 'hidden', timeout: 20000 });
  note('Engine login OK');

  // ── Order mode → load the order ──────────────────────────────
  await page.click('#mode-order-btn');
  await page.fill('#order-number-input', ORDER);
  await page.click('#order-load-btn');
  await page.waitForSelector('#order-info-panel', { state: 'visible', timeout: 60000 });
  note(`Loading ${ORDER}…`);

  // ── Wait for the cover-canvas + its photo/SVG to finish painting ──
  const cover = page.locator('.cover-canvas').first();
  await cover.waitFor({ state: 'visible', timeout: 60000 });
  // All <img> inside the cover (SVG overlay + cover photo) must be fully loaded,
  // or the screenshot catches a half-painted wrap.
  await page.waitForFunction(() => {
    const c = document.querySelector('.cover-canvas');
    if (!c) return false;
    const imgs = [...c.querySelectorAll('img')];
    return imgs.length > 0 && imgs.every(i => i.complete && i.naturalWidth > 0);
  }, null, { timeout: 60000 }).catch(() => note('⚠ image-complete wait timed out — capturing anyway'));
  await page.waitForTimeout(2000); // settle (fonts, clip-path)

  // ── Screenshot ONLY the cover-canvas element → clean trim wrap ──
  await cover.screenshot({ path: OUT });
  fs.copyFileSync(OUT, STABLE);
  const dims = await cover.evaluate(el => ({ w: el.clientWidth, h: el.clientHeight }));
  note(`✅ Captured cover wrap (${dims.w}×${dims.h} css px, ×3 → ${dims.w*3}×${dims.h*3})`);
  note(`   → ${OUT}`);
  note(`   → ${STABLE}  (harness loads this)`);
} catch (err) {
  note(`❌ ERROR: ${err.message}`);
  await page.screenshot({ path: path.join(OUT_DIR, 'capture-cover-ERROR.png'), fullPage: true }).catch(()=>{});
} finally {
  if (consoleMsgs.length) { note('--- CONSOLE (errors/warnings) ---'); [...new Set(consoleMsgs)].slice(0,15).forEach(m => note('  ' + m)); }
  await browser.close();
}
