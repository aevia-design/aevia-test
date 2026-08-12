// Joyride Phase A stage 4 smoke test — mirrors qa/debug-wander-render.mjs.
// This is a render smoke test, not an order, so any real photos will do.
//
// Was pointed at `qa/test-photos/tender`, which is GITIGNORED and absent on a fresh
// clone, so the script died with ENOENT before reaching a single assertion (S170).
// `assets/test photos/` is in the repo and is what every other QA script relies on.
import { chromium } from 'playwright';
import { readdirSync } from 'fs';
import path from 'path';

const PHOTO_DIR = path.resolve(process.env.QA_PHOTO_DIR || 'assets/test photos/Sea');
const files = readdirSync(PHOTO_DIR)
  .filter(f => /\.(jpe?g|png)$/i.test(f))
  .sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0) || a.localeCompare(b))
  .slice(0, 14)
  .map(f => path.join(PHOTO_DIR, f));
if (!files.length) throw new Error(`no test photos found in ${PHOTO_DIR}`);

const b = await chromium.launch();
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));

await p.goto('http://localhost:8080/pages/staff/template-engine.html', { waitUntil: 'load' });
await p.waitForTimeout(800);
await p.selectOption('#template-select', 'Joyride');
await p.waitForTimeout(300);

// Force every functional-page checkbox on (FPintro + the FP1 travel map) so both are
// exercised. NOTE: the debug-tender/wander scripts' selector (.fp-toggle /
// #local-fp-list) is STALE — those classes/ids don't exist in the current markup, so
// those scripts have silently never toggled any FP checkbox. The live group is #fp-group.
await p.evaluate(() => document.querySelectorAll('#fp-group input[type=checkbox]').forEach(c => { if (!c.checked) c.click(); }));
await p.waitForTimeout(300);

// Cover takes FOUR photos (top/left/right/bottom). Uploading them BEFORE the pool is
// the order staff would naturally use, and is the path that used to crash renderCover
// (window.bookCaptions was never initialised) — so exercise it in that order on purpose.
const coverInput = await p.$('[data-fp-input="cover"]');
if (coverInput) {
  await coverInput.setInputFiles(files.slice(0, 4));
  await p.waitForTimeout(1200);
}

await p.setInputFiles('#photo-file-input', files);
await p.waitForTimeout(3000);

const state = await p.evaluate(() => {
  const canvas = document.getElementById('book-canvas');
  const seq = window._bookSequence || [];
  const mPageSide = seq.findIndex(id => id === 'SP4' || id === 'SP8');
  let mPageOrients = null;
  if (mPageSide !== -1) {
    const asgn = window.bookAssignments?.[mPageSide]?.right || [];
    mPageOrients = asgn.map(idx => (idx !== null && idx !== undefined) ? (window.photoPool[idx]?.orientation || null) : null);
  }
  const introRow = canvas.querySelector('.spread-row[data-spread-id="FPintro"]');
  const mapRow   = canvas.querySelector('.spread-row[data-spread-id="FP1"]');
  return {
    poolLen: (window.photoPool || []).length,
    spreadCount: canvas.querySelectorAll('.spread-row').length,
    pageCanvasCount: canvas.querySelectorAll('.page-canvas').length,
    coverPresent: !!canvas.querySelector('.cover-canvas'),
    coverSlotCount: canvas.querySelectorAll('.cover-canvas .photo-slot').length,
    coverPhotosPlaced: canvas.querySelectorAll('.cover-canvas .photo-slot img.slot-photo').length,
    sequenceHasSP7to9: ['SP7', 'SP8', 'SP9'].filter(id => seq.includes(id)),
    mPageSpreadId: mPageSide !== -1 ? seq[mPageSide] : null,
    mPageOrients,
    introPresent: seq.includes('FPintro'),
    introTextPanelCount: introRow ? introRow.querySelectorAll('.fp-text-panel').length : 0,
    // Travel map (FP1): region map image on the left, one pin per country, itinerary
    // panel on the right. Demo selection = EU / Austria+Italy+France (3 pins).
    mapPresent: seq.includes('FP1'),
    mapImgSrc: mapRow ? (mapRow.querySelector('img.svg-overlay')?.getAttribute('src') || null) : null,
    mapPinCount: mapRow ? mapRow.querySelectorAll('img[class*="pin"], .map-pin').length : 0,
    mapItineraryPanels: mapRow ? mapRow.querySelectorAll('.fp-text-panel').length : 0,
  };
});

await p.screenshot({ path: 'sessions/qa-runs/joyride-render.png', fullPage: true });
await p.close();
await b.close();

console.log(JSON.stringify({ template: 'Joyride', ...state, pageErrors: errs }, null, 2));
