// Capture a CLEAN, pixel-exact interior-SPREAD texture for the 3D open-book renderer.
//
// Sibling of qa/capture-cover-wrap.mjs. The open-book renderer (createOpenBook in
// assets/js/book-3d-renderer.js) maps a two-page spread image [ left | right ] onto
// the two open leaves, splitting it down the middle at the gutter. The engine renders
// each interior spread as a `.spread-pages` element holding two 600×600 `.page-canvas`
// (so the element is ~1204×600 = back|gap|front). We screenshot just that element →
// a clean spread with no UI chrome. The centre 4px gap lands under the 3D gutter
// crease, so it's hidden.
//
// Run (PowerShell):
//   $env:STAFF_PW = Read-Host "Staff password"
//   $env:QA_ORDER  = "AEV-037"    # optional; defaults below
//   $env:QA_SPREAD = "4"          # optional 0-based index into the interior spreads.
//                                 # NOT 0 — the first content spread has a single photo
//                                 # (a technical white page precedes it). Defaults to 4.
//   node qa/capture-spread.mjs
//
// Output: sessions/qa-runs/spread-<order>.png  (and a stable copy the harness loads)

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ORDER  = process.env.QA_ORDER  || 'AEV-037';
const SPREAD = parseInt(process.env.QA_SPREAD || '4', 10); // 0-based; skip 0 (single photo)
const EMAIL  = process.env.STAFF_EMAIL || 'evg.myasin@gmail.com';
const PW     = process.env.STAFF_PW;
const BASE   = 'https://aevia-test.pages.dev/pages';
const OUT_DIR = path.resolve('sessions/qa-runs');
const OUT     = path.join(OUT_DIR, `spread-${ORDER}.png`);
const STABLE  = path.join(OUT_DIR, 'spread-newborn.png'); // what the harness loads

if (!PW) { console.error('❌ STAFF_PW not set. In PowerShell:  $env:STAFF_PW = Read-Host "Staff password"'); process.exit(1); }
fs.mkdirSync(OUT_DIR, { recursive: true });

const note = (m) => console.log(`[${new Date().toISOString().slice(11,19)}] ${m}`);

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

  // ── Wait for interior spreads to render ──────────────────────
  await page.waitForSelector('.spread-pages', { state: 'visible', timeout: 60000 });
  await page.waitForTimeout(2500); // settle photo placement + fonts

  const count = await page.locator('.spread-pages').count();
  const idx = Math.min(Math.max(SPREAD, 0), count - 1);
  if (idx !== SPREAD) note(`⚠ requested spread ${SPREAD}, only ${count} spreads — using ${idx}`);
  note(`Capturing interior spread ${idx} of ${count}`);
  const spread = page.locator('.spread-pages').nth(idx);
  await spread.scrollIntoViewIfNeeded();

  // Every <img> inside the spread (photos + any SVG overlay) must be fully loaded.
  await page.waitForFunction((i) => {
    const el = document.querySelectorAll('.spread-pages')[i];
    if (!el) return false;
    const imgs = [...el.querySelectorAll('img')];
    return imgs.every(im => im.complete && im.naturalWidth > 0);
  }, idx, { timeout: 60000 }).catch(() => note('⚠ image-complete wait timed out — capturing anyway'));
  await page.waitForTimeout(1500);

  // Strip the engine's low-res WARNING outline (inline `outline: 3px solid #f4ca6f`,
  // rgb(244,202,111)) from photo slots — it's a staff signal, not part of the printed
  // book, and must not bleed into the marketing mockup. Sample photos are sub-print-res so
  // they all carry it; real orders won't. Red error outlines (#e05252) are left intact.
  await page.evaluate((i) => {
    const el = document.querySelectorAll('.spread-pages')[i];
    if (!el) return;
    el.querySelectorAll('.photo-slot').forEach(s => {
      const o = s.style.outline || '';
      if (o.includes('244, 202, 111') || o.toLowerCase().includes('f4ca6f')) s.style.outline = 'none';
    });
  }, idx);

  // ── Screenshot ONLY the spread element → clean two-page texture ──
  await spread.screenshot({ path: OUT });
  fs.copyFileSync(OUT, STABLE);
  const dims = await spread.evaluate(el => ({ w: el.clientWidth, h: el.clientHeight }));
  note(`✅ Captured spread ${idx} (${dims.w}×${dims.h} css px, ×3 → ${dims.w*3}×${dims.h*3})`);
  note(`   → ${OUT}`);
  note(`   → ${STABLE}  (open-book harness loads this)`);
} catch (err) {
  note(`❌ ERROR: ${err.message}`);
  await page.screenshot({ path: path.join(OUT_DIR, 'capture-spread-ERROR.png'), fullPage: true }).catch(()=>{});
} finally {
  if (consoleMsgs.length) { note('--- CONSOLE (errors/warnings) ---'); [...new Set(consoleMsgs)].slice(0,15).forEach(m => note('  ' + m)); }
  await browser.close();
}
