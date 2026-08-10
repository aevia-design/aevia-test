// capture-one-spread.mjs — re-capture ONE interior spread across orders and monograms.
//
// Why this exists (S162): the owner repositioned a photo on a single spread and needed it
// re-captured for every Heirloom mockup set. Running the full runbook again would reload
// each order's whole photo pool six times (12 cover-wrap runs + 12 spread runs), and the
// pool IS the cost — every photo comes from GCS on the owner's bill.
//
// This does the same job with FOUR order loads. One browser, one login, and for each order
// the three monograms are captured from a single load, because switching monogram swaps
// artwork and letter geometry only and leaves specialPhotos and bookCaptions alone
// (template-engine.html:4413). The covers are untouched, so no cover-wrap run is needed.
//
// It writes the SAME filename the full capture writes (spread-<order>-<mono>-<NN>.png), so
// the existing manifest and the compose chain need no special handling. The index comes
// from the live window._bookSequence, not from the old manifest — if a spread moved, this
// follows it rather than overwriting the wrong file.
//
// Run (PowerShell), from the project root:
//   $env:STAFF_PW = Read-Host "Staff password"      # or put it in qa/.env, see below
//   node qa/capture-one-spread.mjs                  # defaults to FPhim, orders 089-092
//   node qa/capture-one-spread.mjs FPher            # a different spread
//   node qa/capture-one-spread.mjs FPhim AEV-090    # only one order
//
// The password may instead live in a .env file as STAFF_ENGINE_PASSWORD= or STAFF_PW=.
// Checked in order: $STAFF_PW, qa/.env, .env at the project root. Never logged.
//
// Afterwards, recompose locally (no cloud cost) — for each order+monogram:
//   cd scripts
//   node compose-all.mjs <order> heirloom-<colour> <mono>
//   node exp2-images.mjs heirloom-<colour>-<mono>

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { selectMonogram } from './select-monogram.mjs';
const sharp = createRequire(path.resolve('scripts/package.json'))('sharp');

const SPREAD_ID = (process.argv[2] || 'FPhim').trim();
const ORDERS    = process.argv.length > 3 ? process.argv.slice(3) : ['AEV-089', 'AEV-090', 'AEV-091', 'AEV-092'];
const MONOS     = ['roots', 'birds', 'roses'];
const BASE      = 'https://aevia-test.pages.dev/pages';
const OUT_DIR   = path.resolve('sessions/qa-runs');
// Interior spreads only. The cover row is ALSO a .spread-row holding a .spread-pages, so
// including it shifts every index by one against window._bookSequence — this must stay
// identical to capture-spread.mjs or the two write different spreads under one filename.
const SEL       = '.spread-row:not([data-spread-id="cover"]) .spread-pages';

// Password: env first, then either .env file. Read only — never printed, and never echoed
// into a log, commit message or session file.
const PW_KEYS = ['STAFF_ENGINE_PASSWORD', 'STAFF_PW', 'STAFF_TEST_PASSWORD'];
function fromEnvFile(keys) {
  for (const f of ['qa/.env', '.env']) {
    let txt;
    try { txt = fs.readFileSync(path.resolve(f), 'utf8'); } catch (_) { continue; }
    for (const k of keys) {
      const m = txt.match(new RegExp('^\\s*' + k + '\\s*=\\s*(.+?)\\s*$', 'm'));
      if (m) return { value: m[1].replace(/^["']|["']$/g, ''), key: k, file: f };
    }
  }
  return null;
}
const found = process.env.STAFF_PW ? { value: process.env.STAFF_PW, key: '$STAFF_PW', file: 'environment' }
                                   : fromEnvFile(PW_KEYS);
const PW = found && found.value;
if (!PW) {
  console.error(`❌ No staff password found. Set $env:STAFF_PW, or add one of ${PW_KEYS.join(' / ')} to qa/.env`);
  process.exit(1);
}
// The password and the account must match. STAFF_TEST_PASSWORD belongs to the QA account
// in qa/.env, so pair it with STAFF_TEST_EMAIL from the same file rather than the personal
// address the runbook defaults to — a mismatched pair fails login for no obvious reason.
const EMAIL = process.env.STAFF_EMAIL
  || (found.key === 'STAFF_TEST_PASSWORD' && (fromEnvFile(['STAFF_TEST_EMAIL']) || {}).value)
  || 'evg.myasin@gmail.com';
fs.mkdirSync(OUT_DIR, { recursive: true });
const note = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 3 });
const page = await ctx.newPage();
const problems = [];
page.on('pageerror', e => problems.push(`pageerror: ${e.message}`));

// Same downsample-in-Node route as the full capture scripts: heavy orders otherwise hang
// headless Chromium on total image payload (S60/S61). Saves memory, not bandwidth — the
// bytes still leave GCS, which is why loading each order once matters.
const MAX_DIM = 1600;
let routedOk = 0, routedBytes = 0;
await page.route('**/storage.googleapis.com/**', async (route) => {
  try {
    const resp = await route.fetch({ timeout: 60000 });
    const orig = await resp.body();
    routedOk++; routedBytes += orig.length;
    let body = orig, headers = resp.headers();
    try {
      const out = await sharp(orig).rotate()
        .resize(MAX_DIM, MAX_DIM, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82 }).toBuffer();
      if (out.length < orig.length) {
        body = out;
        headers = { ...headers, 'content-type': 'image/jpeg' };
        delete headers['content-length'];
      }
    } catch (_) { /* HEIC/non-image → serve original */ }
    return await route.fulfill({ status: resp.status(), headers, body });
  } catch (e) { problems.push(`route failed: ${e.message}`); return route.abort(); }
});

const written = [];
try {
  note(`Opening engine, logging in as ${EMAIL}`);
  await page.goto(`${BASE}/staff/template-engine`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#eng-email', { state: 'visible', timeout: 20000 });
  await page.fill('#eng-email', EMAIL);
  await page.fill('#eng-pwd', PW);
  await page.click('#eng-lock .eng-lock-btn');
  await page.waitForSelector('#eng-lock', { state: 'hidden', timeout: 20000 });
  await page.click('#mode-order-btn');
  note('Engine login OK');

  for (const order of ORDERS) {
    const before = routedBytes;
    note(`── ${order} ──`);
    await page.fill('#order-number-input', order);
    await page.click('#order-load-btn');
    await page.waitForSelector('#order-info-panel', { state: 'visible', timeout: 180000 });
    await page.waitForSelector(SEL, { state: 'visible', timeout: 180000 });
    note(`  loaded (${((routedBytes - before) / 1048576).toFixed(0)} MB of photos)`);

    for (const mono of MONOS) {
      await selectMonogram(page, mono, () => {});
      await page.waitForTimeout(2500); // settle photo placement + fonts

      // Locate the spread by its book-sequence id, not by a remembered index.
      const idx = await page.evaluate((id) => (window._bookSequence || []).indexOf(id), SPREAD_ID);
      if (idx < 0) { problems.push(`${order}/${mono}: no spread "${SPREAD_ID}" in the sequence`); continue; }

      // Strip the staff-only chrome the full capture also strips, on this spread only.
      await page.evaluate(({ sel, i }) => {
        const el = document.querySelectorAll(sel)[i];
        if (!el) return;
        el.querySelectorAll('.photo-slot').forEach(s => {
          const o = s.style.outline || '';
          if (o.includes('244, 202, 111') || o.toLowerCase().includes('f4ca6f')) s.style.outline = 'none';
        });
        el.querySelectorAll('.page-canvas[data-variant="blank"]').forEach(p => { p.innerHTML = ''; });
        el.querySelectorAll('.placement-warn-badge').forEach(b => b.remove());
      }, { sel: SEL, i: idx });

      const spread = page.locator(SEL).nth(idx);
      await spread.scrollIntoViewIfNeeded();
      await page.waitForFunction(({ sel, i }) => {
        const el = document.querySelectorAll(sel)[i];
        return !!el && [...el.querySelectorAll('img')].every(im => im.complete && im.naturalWidth > 0);
      }, { sel: SEL, i: idx }, { timeout: 120000 })
        .catch(() => problems.push(`${order}/${mono}: image wait timed out — CHECK THIS IMAGE`));
      await page.waitForTimeout(400);

      const file = `spread-${order}-${mono}-${String(idx).padStart(2, '0')}.png`;
      await spread.screenshot({ path: path.join(OUT_DIR, file) });
      written.push(file);
      note(`  ${mono.padEnd(6)} ${SPREAD_ID} idx ${idx} → ${file}`);
    }
  }
} catch (err) {
  problems.push(`FATAL: ${err.message}`);
} finally {
  note(`\nWrote ${written.length} file(s). GCS: ${routedOk} requests, ${(routedBytes / 1048576).toFixed(0)} MB transferred.`);
  if (problems.length) { note('--- PROBLEMS ---'); [...new Set(problems)].forEach(p => note('  ' + p)); }
  await browser.close();
  process.exit(problems.length ? 1 : 0);
}
