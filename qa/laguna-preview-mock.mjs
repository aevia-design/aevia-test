// QA — Laguna customer-preview parity (Phase B stage 6). SAFE: the getOrder call is
// mocked with a synthetic order and every photo is served from the LOCAL test-photo
// folder, so no Firebase read happens and no GCS egress is billed.
//
//   npx http-server . -p 8080 -c-1     (project root, if not already running)
//   node qa/laguna-preview-mock.mjs
//
// What it proves — the rules Laguna depends on fire on the CUSTOMER side, not just in
// the staff engine (see feedback_engine_parity: the same bug usually exists 2-3 times):
//   1. the registry resolves 'laguna' and loads Template_Laguna artwork, no 404s
//   2. the cover artwork renders UNDER the photo (overlayAbovePhotos:false). This is
//      the S168 bug: Clemence's SVG draws an opaque white frame at the photo position,
//      so with the art on top the photo is invisible and looks like a failed load.
//   3. the interior pages that set overlayBelow put their art under the photos too
//   4. the cover title + spine render in Fredoka BOLD (S170 CSV change), and the
//      sub-label in Mulish Medium - a cut that has to exist or the text silently drops
//   5. both functional pages (Intro, Travel map) are in the book and the map resolves
//      to the selected region's artwork
//   6. zero page errors

import { chromium } from 'playwright';
import { mkdirSync, readdirSync } from 'fs';
import path from 'path';

const BASE      = 'http://localhost:8080';
// Seaside set — Laguna is the summer/seaside template, so these are representative of
// what a real order carries (owner's steer, S170). qa/test-photos/ is gitignored and
// absent on this machine; assets/test photos/ is the one every QA script can rely on.
const PHOTO_WEB = '/assets/test%20photos/Sea';
const PHOTO_DIR = path.resolve('assets/test photos/Sea');
const OUT_DIR   = path.resolve('sessions/qa-runs/laguna-preview-mock');
mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const pass = (n) => { results.push({ n, ok: true }); console.log(`  ✅ ${n}`); };
const fail = (n, d) => { results.push({ n, ok: false, d }); console.log(`  ❌ ${n} — ${d}`); };

// The Sea folder is flat. Sort by name so the same photos land in the same slots on
// every run — a shifting photo order makes a screenshot diff meaningless.
const urls = readdirSync(PHOTO_DIR)
  .filter(f => /\.(jpe?g|png)$/i.test(f))
  .sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0) || a.localeCompare(b))
  .slice(0, 16)
  .map(f => `${BASE}${PHOTO_WEB}/${encodeURIComponent(f)}`);
if (urls.length < 6) { console.log('❌ need at least 6 local test photos'); process.exit(1); }

const ORDER = {
  orderNumber: 'AEV-MOCK-LAG', status: 'preview_sent', templateName: 'laguna',
  pageCount: 40, email: 'qa@example.com', customerName: 'QA Tester',
  fpSelections: ['FPintro', 'FP1'],
  fpTexts: {
    fpintro: 'Greece, summer 2026.\nThe year we stopped rushing.',
    fp1: { region: 'EU', countries: ['Greece', 'Italy'], itinerary: 'Athens → Naxos → Paros → Milos' },
  },
  coverCaptions: { front: 'Greece, 2026', frontSub: 'Where everything slowed down', spine: 'Greece, 2026' },
  signedUrls: { cover: urls[0], special: {}, pool: urls.slice(1) },
};

const browser = await chromium.launch();
const page = await browser.newPage();
const errs = [], notFound = [];
page.on('pageerror', e => errs.push(e.message));
page.on('response', r => { if (r.status() === 404) notFound.push(r.url()); });

await page.route('**/getOrder**', route => route.fulfill({
  status: 200,
  headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
  body: JSON.stringify(ORDER),
}));

try {
  await page.goto(`${BASE}/pages/customer-preview.html?token=mock-token`, { waitUntil: 'load' });
  await page.waitForSelector('.cover-canvas', { timeout: 30000 });
  await page.waitForTimeout(4000);

  const state = await page.evaluate(() => {
    const num = (v) => Number(v) || 0;
    const coverCanvas = document.querySelector('.cover-canvas');
    const coverOverlay = coverCanvas?.querySelector('.svg-overlay');
    const coverPhoto = coverCanvas?.querySelector('img.slot-photo, .photo-slot img');

    // Interior page overlays: how many render UNDER their photos (zIndex 0).
    const pageOverlays = [...document.querySelectorAll('.page-canvas:not(.cover-canvas) .svg-overlay')];
    const belowCount = pageOverlays.filter(o => getComputedStyle(o).zIndex === '0').length;

    // Cover captions: computed typography is what actually prints-adjacent here.
    const caps = [...coverCanvas.querySelectorAll('[data-label]')].map((el) => {
      const cs = getComputedStyle(el);
      return { label: el.getAttribute('data-label'), text: el.textContent.trim(), family: cs.fontFamily, weight: cs.fontWeight };
    });

    const allSvgs = [...document.querySelectorAll('.page-canvas .svg-overlay')].map(i => i.getAttribute('src') || '');
    return {
      sequence: window._bookSequence || [],
      coverSvg: coverOverlay?.getAttribute('src') || null,
      coverOverlayZ: coverOverlay ? getComputedStyle(coverOverlay).zIndex : null,
      coverPhotoPresent: !!coverPhoto,
      coverPhotoZ: coverPhoto ? getComputedStyle(coverPhoto.closest('.photo-slot') || coverPhoto).zIndex : null,
      pageOverlayCount: pageOverlays.length,
      belowCount,
      caps,
      mapSvg: allSvgs.find(s => /Map|Oceania|America/i.test(s)) || null,
      // Pin count proves the shared Wander coordinate table actually resolved against
      // this template's map — the whole reason the 206mm framing matters.
      mapPins: document.querySelectorAll('.map-pin, img[src*="Location pin"]').length,
      introSvg: allSvgs.find(s => /Intro/i.test(s)) || null,
      pageCanvases: document.querySelectorAll('.page-canvas').length,
      fontsLoaded: [...document.fonts].filter(f => f.family === 'Fredoka' && f.status === 'loaded').map(f => f.weight),
    };
  });

  await page.screenshot({ path: path.join(OUT_DIR, 'preview-laguna.png'), fullPage: true });

  // A cover-only shot for the owner's eyeball. The full-page screenshot is useless for
  // judging the cover TITLE because the sticky approve/review bars are position:fixed and
  // land on top of it, so hide them and shoot the cover element by itself.
  await page.evaluate(() => {
    document.querySelectorAll('body > *').forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' || cs.position === 'sticky') el.style.display = 'none';
    });
  });
  const coverEl = await page.$('.cover-canvas');
  if (coverEl) await coverEl.screenshot({ path: path.join(OUT_DIR, 'cover-laguna.png') });

  state.pageCanvases > 0
    ? pass(`book rendered (${state.pageCanvases} page canvases)`)
    : fail('book rendered', 'no page canvases');

  /^\.\.\/assets\/Template_Laguna\//.test(state.coverSvg || '')
    ? pass('registry resolves laguna → Template_Laguna cover artwork')
    : fail('registry resolves laguna', `coverSvg = ${state.coverSvg}`);

  // The S168 bug, mirrored. Art above an opaque frame rect hides the photo entirely.
  state.coverOverlayZ === '0'
    ? pass('cover artwork renders UNDER the photo (overlayAbovePhotos:false)')
    : fail('cover artwork renders under the photo', `overlay z-index = ${state.coverOverlayZ}, expected 0`);

  state.coverPhotoPresent
    ? pass('cover photo element present')
    : fail('cover photo element present', 'no img.slot-photo on the cover');

  state.belowCount > 0
    ? pass(`interior overlayBelow honoured (${state.belowCount}/${state.pageOverlayCount} overlays under photos)`)
    : fail('interior overlayBelow honoured', `0 of ${state.pageOverlayCount} overlays have z-index 0`);

  const front = state.caps.find(c => /front/i.test(c.label || '') && !/sub/i.test(c.label || ''));
  const spine = state.caps.find(c => /spine/i.test(c.label || ''));
  const sub   = state.caps.find(c => /sub/i.test(c.label || ''));

  front && /Fredoka/.test(front.family) && front.weight === '700'
    ? pass('cover title is Fredoka Bold (S170)')
    : fail('cover title is Fredoka Bold', JSON.stringify(front));

  spine && /Fredoka/.test(spine.family) && spine.weight === '700'
    ? pass('spine label is Fredoka Bold (S170)')
    : fail('spine label is Fredoka Bold', JSON.stringify(spine));

  sub && /Mulish/.test(sub.family) && sub.weight === '500'
    ? pass('cover sub-label is Mulish Medium')
    : fail('cover sub-label is Mulish Medium', JSON.stringify(sub));

  state.fontsLoaded.includes('700')
    ? pass('Fredoka Bold actually loaded in the customer page')
    : fail('Fredoka Bold loaded', `loaded Fredoka weights: ${JSON.stringify(state.fontsLoaded)}`);

  state.sequence.includes('FPintro') && state.sequence.includes('FP1')
    ? pass('both functional pages are in the book')
    : fail('both functional pages in the book', JSON.stringify(state.sequence.slice(0, 6)));

  // The region maps are PNG, not SVG (S170 re-issue) — match on the region name only, so
  // the gate does not break again on a format change.
  /EU Map\.(png|svg)/.test(state.mapSvg || '')
    ? pass('travel map resolves to the selected region (EU)')
    : fail('travel map resolves to the region', `mapSvg = ${state.mapSvg}`);

  state.mapPins === 2
    ? pass('both selected countries drop a pin on the map')
    : fail('both countries drop a pin', `pins rendered = ${state.mapPins}, expected 2 (Greece, Italy)`);

  const laguna404s = notFound.filter(u => u.includes('Template_Laguna'));
  laguna404s.length === 0
    ? pass('no Laguna asset 404s')
    : fail('no Laguna asset 404s', laguna404s.slice(0, 3).join(' | '));

  errs.length === 0 ? pass('no page errors') : fail('no page errors', errs.join(' | '));

} catch (err) {
  await page.screenshot({ path: path.join(OUT_DIR, 'failure.png'), fullPage: true }).catch(() => {});
  fail('run', err.message);
} finally {
  await browser.close();
}

const ok = results.filter(r => r.ok).length;
console.log(`\n──────── ${ok}/${results.length} passed ────────`);
console.log(`screenshot: ${path.join(OUT_DIR, 'preview-laguna.png')}`);
console.log(`cover only: ${path.join(OUT_DIR, 'cover-laguna.png')}`);
if (ok !== results.length) process.exit(1);
