// Capture CLEAN, pixel-exact interior-SPREAD textures for the open-book mockup.
//
// Sibling of qa/capture-cover-wrap.mjs. The open-book composer (scripts/compose-mockup.mjs)
// maps a two-page spread image [ left | right ] onto the two open leaves of the PSD. The
// engine renders each interior spread as a `.spread-pages` element holding two 600×600
// `.page-canvas` (so the element is ~1204×600 = left|gap|right). We screenshot just that
// element → a clean spread with no UI chrome. The centre 4px gap lands under the gutter
// crease, so it's hidden.
//
// This dumps EVERY interior spread of the order in ONE login, plus a manifest mapping each
// index to its book-sequence id (SP0–SP6 / FP*) and flags. The compose driver
// (scripts/compose-all.mjs) reads the manifest to name + classify the output mockups, so
// you never hand-pick spread indices.
//
// Run (PowerShell):
//   $env:STAFF_PW = Read-Host "Staff password"
//   $env:QA_ORDER  = "AEV-039"    # the order to capture (optional; defaults below)
//   node qa/capture-spread.mjs
//
// Heirloom: the monogram selects the INTRO artwork and the four letter positions, so one
// order yields three different interiors. Set QA_MONOGRAM to drive the engine's picker
// after the order loads — artwork only, photos and captions survive:
//   $env:QA_MONOGRAM = "birds"
// Every output filename is then suffixed, so three runs on one order don't overwrite.
//
// Output (sessions/qa-runs/, gitignored):
//   spread-<order>[-<mono>]-<NN>.png       one per interior spread (NN = 2-digit index)
//   spread-<order>[-<mono>]-manifest.json  [{ idx, id, label, blankLeft, functional, file }]
//   spread-newborn.png                     stable copy of the first content spread
//                                          (legacy single-open harness; plain runs only)

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { selectMonogram } from './select-monogram.mjs';
// sharp is installed under scripts/, not the repo root — resolve it from there.
const sharp = createRequire(path.resolve('scripts/package.json'))('sharp');

const ORDER  = process.env.QA_ORDER  || 'AEV-039';
const MONO   = (process.env.QA_MONOGRAM || '').trim().toLowerCase(); // '' = whatever the order says
const SUFFIX = MONO ? `-${MONO}` : '';
const EMAIL  = process.env.STAFF_EMAIL || 'evg.myasin@gmail.com';
const PW     = process.env.STAFF_PW;
const BASE   = 'https://aevia-test.pages.dev/pages';
const OUT_DIR = path.resolve('sessions/qa-runs');
const STABLE  = path.join(OUT_DIR, 'spread-newborn.png'); // legacy single-open harness loads this

if (!PW) { console.error('❌ STAFF_PW not set. In PowerShell:  $env:STAFF_PW = Read-Host "Staff password"'); process.exit(1); }
fs.mkdirSync(OUT_DIR, { recursive: true });

const note = (m) => console.log(`[${new Date().toISOString().slice(11,19)}] ${m}`);

// Interior spreads only — the cover row is ALSO a .spread-row with a .spread-pages
// (holding .cover-canvas); excluding it keeps the index aligned 1:1 with window._bookSequence.
const SEL = '.spread-row:not([data-spread-id="cover"]) .spread-pages';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 3 });
const page = await ctx.newPage();
const consoleMsgs = [];
page.on('console', m => { if (['error','warning'].includes(m.type())) consoleMsgs.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', e => consoleMsgs.push(`pageerror: ${e.message}`));
page.on('requestfailed', r => consoleMsgs.push(`requestfailed: ${r.failure()?.errorText || '?'} ${r.url().slice(0, 130)}`));

// Big orders (50+ photos) hang the headless load. ROOT CAUSE (proven s61): the network is
// fine — the Node route refetches all 52 photos OK (`52 ok, 0 gave up`) — but the engine's
// in-page `fetch().blob()` reads STALL on ~2 of them (counter freezes at "Downloading 50/52"),
// and `loadOrderIntoEngine`'s `Promise.all` then hangs forever (info panel never shows). The
// stall is headless Chromium choking on holding 52 large photo blobs in renderer memory at
// once; a real browser has the headroom. NOT network, concurrency-of-fetch, deviceScaleFactor,
// or HTTP/2 (all ruled out s59–s61).
//
// ROOT CAUSE (s61, found via the order-size clue): it's the TOTAL image PAYLOAD, not photo
// count or the network. Newborn AEV-039 (~200 MB of low-res photos) sailed through; Wander
// AEV-040 is ~2 GB of full-res originals, and headless Chromium silently stalls a few in-page
// blob reads when it can't hold ~2 GB of decoded images in memory (`load-progress` freezes a
// few short of 52). The earlier "52 ok via Node" only proved the DOWNLOAD was fine — the
// renderer still has to hold it all.
//
// FIX: downsample each photo in the Node route BEFORE it reaches the browser. A mockup spread
// is shown a few hundred px wide, so full 24 MP originals are pure waste (Newborn proved
// low-res looks great). Shrinking to ≤MAX_DIM turns ~2 GB into ~150 MB → the engine never
// chokes. Engine untouched; capture-only. Non-image bodies and sharp failures pass through
// untouched so nothing else breaks.
const MAX_DIM = 1600; // px — comfortably above the on-screen spread render size
let routedOk = 0, routedFail = 0, routedShrunk = 0;
await page.route('**/storage.googleapis.com/**', async (route) => {
  let lastErr;
  for (let i = 0; i < 5; i++) {
    try {
      const resp = await route.fetch({ timeout: 60000 });
      const orig = await resp.body();
      let body = orig, headers = resp.headers();
      try {
        const out = await sharp(orig)
          .rotate()                                   // bake EXIF orientation (matches engine)
          .resize(MAX_DIM, MAX_DIM, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 82 })
          .toBuffer();
        if (out.length < orig.length) {               // only swap if actually smaller
          body = out;
          headers = { ...headers, 'content-type': 'image/jpeg' };
          delete headers['content-length'];           // let Playwright set it for the new body
          routedShrunk++;
        }
      } catch (_) { /* HEIC/non-image/sharp failure → serve original untouched */ }
      routedOk++;
      return await route.fulfill({ status: resp.status(), headers, body });
    } catch (e) { lastErr = e; await new Promise(r => setTimeout(r, 800 * (i + 1))); }
  }
  routedFail++;
  consoleMsgs.push(`route give-up after 5 tries: ${lastErr?.message || lastErr} ${route.request().url().slice(0, 130)}`);
  return route.abort();
});

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
  await page.waitForSelector('#order-info-panel', { state: 'visible', timeout: 180000 });
  note(`Loading ${ORDER}…`);

  // ── Heirloom: switch the monogram (artwork only) ─────────────
  if (MONO) { await selectMonogram(page, MONO, note); }

  // ── Wait for interior spreads to render ──────────────────────
  await page.waitForSelector(SEL, { state: 'visible', timeout: 180000 });
  await page.waitForTimeout(2500); // settle photo placement + fonts

  const count = await page.locator(SEL).count();
  note(`Found ${count} interior spreads`);

  // Identity per spread from the engine's own book sequence + DOM. We read:
  //  - id    : window._bookSequence[idx]  (SP0–SP6 / FP1–FP5)
  //  - label : the spread-type <select>'s selected option text (human-friendly)
  //  - blankLeft : the rightOnly opener renders a [data-variant="blank"] left page
  const ids = await page.evaluate(() => window._bookSequence || []);

  // Hide staff-only chrome that would bleed into the mockup, across ALL spreads:
  //  - the low-res WARNING outline (inline outline: 3px solid #f4ca6f / rgb(244,202,111))
  //    on photo slots — a staff signal, not part of the printed book. Sample photos are
  //    sub-print-res so they all carry it; real orders won't. Red error outlines kept.
  //  - the blank-left-page placeholder label ("← Cover / Back · Not yet designed") on the
  //    rightOnly opener — staff text; the printed left page is pure white.
  await page.evaluate((sel) => {
    document.querySelectorAll(`${sel} .photo-slot`).forEach(s => {
      const o = s.style.outline || '';
      if (o.includes('244, 202, 111') || o.toLowerCase().includes('f4ca6f')) s.style.outline = 'none';
    });
    document.querySelectorAll(`${sel} .page-canvas[data-variant="blank"]`).forEach(p => {
      p.innerHTML = ''; // drop the "Not yet designed" staff label → clean white page
    });
    // The placement-warning badge (small orange ⚠ on a photo slot — a staff "out of date
    // order" flag) is baked into the screenshot; remove it so it never reaches the mockup.
    document.querySelectorAll(`${sel} .placement-warn-badge`).forEach(b => b.remove());
  }, SEL);

  const manifest = [];
  for (let idx = 0; idx < count; idx++) {
    const spread = page.locator(SEL).nth(idx);
    await spread.scrollIntoViewIfNeeded();

    // Every <img> inside the spread (photos + any SVG overlay) must be fully loaded.
    await page.waitForFunction(({ i, sel }) => {
      const el = document.querySelectorAll(sel)[i];
      if (!el) return false;
      const imgs = [...el.querySelectorAll('img')];
      return imgs.every(im => im.complete && im.naturalWidth > 0);
    }, { i: idx, sel: SEL }, { timeout: 180000 }).catch(() => note(`⚠ spread ${idx}: image-complete wait timed out — capturing anyway`));
    await page.waitForTimeout(400);

    const meta = await spread.evaluate((el) => {
      const blank = !!el.querySelector('.page-canvas[data-variant="blank"]');
      // The type <select> lives in the row header (sibling of .spread-pages).
      const row = el.closest('.spread-row') || el.parentElement;
      const sel = row ? row.querySelector('.spread-type-select') : null;
      const label = sel ? sel.options[sel.selectedIndex]?.text?.trim() : '';
      return { blank, label };
    });

    const id = ids[idx] || `IDX${idx}`;
    const nn = String(idx).padStart(2, '0');
    const file = `spread-${ORDER}${SUFFIX}-${nn}.png`;
    await spread.screenshot({ path: path.join(OUT_DIR, file) });

    manifest.push({
      idx,
      id,
      label: meta.label || id,
      blankLeft: meta.blank,                 // the technical opener (Intro on right, white left)
      functional: /^FP/.test(id) || meta.blank, // FP page OR the Intro-carrying opener
      file,
    });
    note(`  spread ${nn}: ${id}${meta.label ? ` (${meta.label})` : ''}${meta.blank ? ' [blank-left opener]' : ''} → ${file}`);
  }

  // Stable copy for the legacy single-open harness = first non-blank content spread.
  // Plain runs only — otherwise the last of three Heirloom monogram runs would silently
  // redefine what that harness shows.
  const firstContent = manifest.find(m => !m.blankLeft) || manifest[0];
  if (firstContent && !MONO) fs.copyFileSync(path.join(OUT_DIR, firstContent.file), STABLE);

  const manifestPath = path.join(OUT_DIR, `spread-${ORDER}${SUFFIX}-manifest.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  note(`✅ Captured ${manifest.length} spreads → ${OUT_DIR}`);
  note(`   manifest → ${manifestPath}`);
} catch (err) {
  note(`❌ ERROR: ${err.message}`);
  // On a hang, dump WHERE processing got stuck. All photos fetch fine (52 ok), so the
  // stall is downstream in loadOrderIntoEngine's sequential process loop. The engine
  // reports progress in #load-progress ("Downloading X/N" → "Processing i/N") and logs
  // each step to #debug-log via dbLog. Capturing both pinpoints the stalled file/stage.
  const diag = await page.evaluate(() => {
    const prog = document.getElementById('load-progress');
    const log  = document.getElementById('debug-log');
    const lines = log ? [...log.querySelectorAll('.debug-log-line')].slice(-25).map(l => l.textContent) : [];
    return { progress: prog ? prog.textContent : '(no #load-progress)', lines };
  }).catch(() => null);
  if (diag) {
    note(`load-progress: ${diag.progress}`);
    note('--- last debug-log lines ---');
    diag.lines.forEach(l => note('  ' + l));
  }
  await page.screenshot({ path: path.join(OUT_DIR, 'capture-spread-ERROR.png'), fullPage: true }).catch(()=>{});
} finally {
  // ALWAYS report the route diagnostic — even on a timeout. This is the decisive number:
  //   routedOk 0           → the route glob never matched (fix the pattern)
  //   routedFail > 0       → Node's fetch ALSO dropped → not the renderer net stack
  //   routedOk ≈ photoCount but still hung → hang is downstream of fetch (HEIC/renderBook)
  note(`GCS requests refetched via Node: ${routedOk} ok (${routedShrunk} downsampled), ${routedFail} gave up`);
  if (consoleMsgs.length) { note('--- CONSOLE (errors/warnings) ---'); [...new Set(consoleMsgs)].slice(0,15).forEach(m => note('  ' + m)); }
  await browser.close();
}
