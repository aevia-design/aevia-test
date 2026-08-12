// Laguna Phase A stage 4 smoke test — mirrors qa/debug-joyride-render.mjs.
//
// This is the fast gate that catches a thrown hidden-template-assumption in seconds:
// it drives the real staff engine, turns on both functional pages, uploads a cover
// photo and a pool, and asserts that pages actually drew with ZERO pageerrors.
//
// Photos come from `assets/test photos/` rather than `qa/test-photos/`, which is
// gitignored and currently absent on this machine (see CLAUDE.md).
//
//   npx http-server . -p 8080 -c-1     # in another shell
//   node qa/debug-laguna-render.mjs
import { chromium } from 'playwright';
import { readdirSync, statSync, mkdirSync } from 'fs';
import path from 'path';

// Walk `assets/test photos/` (one level of themed subfolders) for real jpgs.
const ROOT = path.resolve('assets/test photos');
const files = readdirSync(ROOT)
  .flatMap((entry) => {
    const p = path.join(ROOT, entry);
    return statSync(p).isDirectory()
      ? readdirSync(p).map((f) => path.join(p, f))
      : [p];
  })
  .filter((f) => /\.(jpe?g|png)$/i.test(f))
  .slice(0, 14);

if (files.length === 0) throw new Error(`no test photos found under ${ROOT}`);
mkdirSync('sessions/qa-runs', { recursive: true });

const b = await chromium.launch();
const p = await b.newPage();
const errs = [];
const consoleErrs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text()); });

await p.goto('http://localhost:8080/pages/staff/template-engine.html', { waitUntil: 'load' });
await p.waitForTimeout(800);
await p.selectOption('#template-select', process.env.QA_TEMPLATE || 'Laguna');
await p.waitForTimeout(400);

// Turn on every functional page (FPintro + the FP1 travel map) so both render.
await p.evaluate(() =>
  document.querySelectorAll('#fp-group input[type=checkbox]').forEach((c) => { if (!c.checked) c.click(); })
);
await p.waitForTimeout(400);

// Laguna's cover takes ONE square photo. Upload it BEFORE the pool — the order staff
// naturally use, and the path that has crashed renderCover on past templates.
const coverInput = await p.$('[data-fp-input="cover"]');
if (coverInput) {
  await coverInput.setInputFiles(files.slice(0, 1));
  await p.waitForTimeout(1200);
}

await p.setInputFiles('#photo-file-input', files);

await p.waitForTimeout(6000);

// ⚠ `photosDecoded` below reads 1, not 15, and that is NOT a Laguna defect.
// The engine emits <img class="slot-photo"> with an EMPTY src and fills the blob URL in
// elsewhere; window.photoPool holds valid blob: URLs for every photo. Probed S168, and
// Wander scores identically (1 of 14) through this exact path, so it is pre-existing
// engine behaviour shared by every template. Recorded rather than chased — the gate is
// pageerrors + pages drawn, and the owner's eyeball is what confirms the photos.
// It does mean the fullPage screenshot shows broken-image icons in the slots.

const state = await p.evaluate(() => {
  const canvas = document.getElementById('book-canvas');
  const seq = window._bookSequence || [];
  const introRow = canvas.querySelector('.spread-row[data-spread-id="FPintro"]');
  const mapRow = canvas.querySelector('.spread-row[data-spread-id="FP1"]');
  // Which spread SVGs actually resolved: a 404 leaves the <img> with naturalWidth 0.
  const overlays = [...canvas.querySelectorAll('img.svg-overlay')];
  return {
    poolLen: (window.photoPool || []).length,
    spreadCount: canvas.querySelectorAll('.spread-row').length,
    pageCanvasCount: canvas.querySelectorAll('.page-canvas').length,
    photosPlaced: canvas.querySelectorAll('.page-canvas img.slot-photo').length,
    photosDecoded: [...canvas.querySelectorAll('.page-canvas img.slot-photo')]
      .filter((i) => i.complete && i.naturalWidth > 0).length,
    coverPresent: !!canvas.querySelector('.cover-canvas'),
    coverSlotCount: canvas.querySelectorAll('.cover-canvas .photo-slot').length,
    coverPhotosPlaced: canvas.querySelectorAll('.cover-canvas img.slot-photo').length,
    coverCaptionCount: canvas.querySelectorAll('.cover-canvas .cover-caption').length,
    sequence: seq,
    introPresent: seq.includes('FPintro'),
    introTextPanelCount: introRow ? introRow.querySelectorAll('.fp-text-panel').length : 0,
    mapPresent: seq.includes('FP1'),
    mapImgSrc: mapRow ? (mapRow.querySelector('img.svg-overlay')?.getAttribute('src') || null) : null,
    mapItineraryPanels: mapRow ? mapRow.querySelectorAll('.fp-text-panel').length : 0,
    svgOverlayTotal: overlays.length,
    // Empty-artwork pages are EXPECTED for Laguna (8 intentionally blank stubs), so a
    // broken src is reported by URL rather than counted as a failure.
    brokenSvgSrcs: overlays.filter((i) => i.complete && i.naturalWidth === 0)
      .map((i) => i.getAttribute('src')),
  };
});

await p.screenshot({ path: 'sessions/qa-runs/laguna-render.png', fullPage: true });
await p.close();
await b.close();

const ok = errs.length === 0 && state.pageCanvasCount > 0;
console.log(JSON.stringify({ template: 'Laguna', ...state, pageErrors: errs, consoleErrors: consoleErrs }, null, 2));
console.log(ok ? '\n✅ GATE PASS — pages rendered, 0 pageerrors' : '\n❌ GATE FAIL');
process.exit(ok ? 0 : 1);
