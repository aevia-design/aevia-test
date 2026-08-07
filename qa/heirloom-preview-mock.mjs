// QA — Heirloom customer-preview parity (Stage 6). SAFE: the getOrder call is mocked
// with a synthetic order and every photo is served from the LOCAL test-photo folder,
// so no Firebase read happens and no GCS egress is billed.
//
//   npx http-server . -p 8080 -c-1     (project root, if not already running)
//   node qa/heirloom-preview-mock.mjs
//
// What it proves — the monogram rules mirrored from template-engine.html into
// customer-preview.html actually fire on the customer side:
//   1. the cover renders the MONOGRAM's artwork (Cover_40_Roses.svg), not the
//      data file's default Roots cover
//   2. the intro page renders the monogram's intro SVG
//   3. the two back-cover initials and the two intro initials render, with the
//      customer's letters in them
//   4. the mandatory intro is in the book even though fpSelections does NOT list it
//   5. zero page errors and zero Heirloom SVG 404s

import { chromium } from 'playwright';
import { mkdirSync, readdirSync } from 'fs';
import path from 'path';

const BASE     = 'http://localhost:8080';
const PHOTO_WEB = '/assets/test%20photos/Wedding';
const PHOTO_DIR = path.resolve('assets/test photos/Wedding');
const OUT_DIR   = path.resolve('sessions/qa-runs/heirloom-preview-mock');
mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const pass = (n) => { results.push({ n, ok: true }); console.log(`  ✅ ${n}`); };
const fail = (n, d) => { results.push({ n, ok: false, d }); console.log(`  ❌ ${n} — ${d}`); };

const names = readdirSync(PHOTO_DIR).filter(f => /\.jpe?g$/i.test(f)).slice(0, 24);
if (names.length < 6) { console.log('❌ need at least 6 local test photos'); process.exit(1); }
const urlFor = (n) => `${BASE}${PHOTO_WEB}/${encodeURIComponent(n)}`;

// A synthetic Heirloom order. Note fpSelections deliberately OMITS FPintro — the
// mandatory-spread rule has to put it in the book by itself.
const ORDER = {
  orderNumber: 'AEV-MOCK', status: 'preview_sent', templateName: 'heirloom-beige',
  pageCount: 40, email: 'qa@example.com', customerName: 'QA Tester',
  fpSelections: ['FPstory'],
  fpTexts: {
    monogram: 'roses',
    monogramLetters: ['A', 'M'],
    fpintro: 'On June 14th, 2026,\nin Vienna, Austria,\nwe said “I do.”',
    FPstory: 'Through mutual friends.\n\nA coffee that ran four hours.',
  },
  coverCaptions: { name: 'ANNA & MICHAEL', spine: 'Anna & Michael' },
  // Letters as the staff engine would have seeded them from the order form.
  staffBookCaptions: {
    cover: { backLetter1: 'A', backLetter2: 'M' },
    0: { right: { monoLetter1: 'A', monoLetter2: 'M' } },
  },
  signedUrls: {
    cover: urlFor(names[0]),
    special: { FPstory: [urlFor(names[1])] },
    pool: names.slice(2).map(urlFor),
  },
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
  await page.waitForTimeout(3000);

  const state = await page.evaluate(() => {
    const covers = [...document.querySelectorAll('.cover-canvas .svg-overlay')].map(i => i.getAttribute('src'));
    const allSvgs = [...document.querySelectorAll('.page-canvas .svg-overlay')].map(i => i.getAttribute('src'));
    const capText = (sel) => [...document.querySelectorAll(sel)].map(e => e.textContent.trim());
    return {
      sequence: window._bookSequence || [],
      coverSvgs: covers,
      introSvg: allSvgs.find(s => /Intro/i.test(s || '')) || null,
      backLetters: capText('.cover-canvas [data-label^="Monogram"]'),
      // Intro letters carry dataset.label A / B and live on a page canvas.
      introLetters: capText('.page-canvas:not(.cover-canvas) [data-label="A"], .page-canvas:not(.cover-canvas) [data-label="B"]'),
      activeMonogram: window._activeMonogram,
      pageCanvases: document.querySelectorAll('.page-canvas').length,
    };
  });

  await page.screenshot({ path: path.join(OUT_DIR, 'preview-heirloom.png'), fullPage: true });

  state.activeMonogram === 'roses'
    ? pass('monogram read from fpTexts on the customer side')
    : fail('monogram read from fpTexts', `_activeMonogram = ${state.activeMonogram}`);

  state.coverSvgs.length && state.coverSvgs.every(s => /Cover_40_Roses\.svg/.test(s))
    ? pass('cover renders the monogram artwork (Roses), not the default Roots')
    : fail('cover renders the monogram artwork', JSON.stringify(state.coverSvgs));

  state.introSvg && /Roses/.test(state.introSvg)
    ? pass('intro page renders the monogram intro SVG')
    : fail('intro page renders the monogram intro SVG', `introSvg = ${state.introSvg}`);

  JSON.stringify(state.backLetters) === JSON.stringify(['A', 'M'])
    ? pass('two back-cover initials render with the customer letters')
    : fail('back-cover initials', JSON.stringify(state.backLetters));

  JSON.stringify(state.introLetters) === JSON.stringify(['A', 'M'])
    ? pass('two intro initials render with the customer letters')
    : fail('intro initials', JSON.stringify(state.introLetters));

  state.sequence[0] === 'FPintro'
    ? pass('mandatory intro opens the book though fpSelections omits it')
    : fail('mandatory intro opens the book', `sequence[0] = ${state.sequence[0]}`);

  const heirloom404s = notFound.filter(u => u.includes('Template_Heirloom'));
  heirloom404s.length === 0
    ? pass('no Heirloom SVG 404s')
    : fail('no Heirloom SVG 404s', heirloom404s.slice(0, 3).join(' | '));

  errs.length === 0 ? pass('no page errors') : fail('no page errors', errs.join(' | '));

} catch (err) {
  await page.screenshot({ path: path.join(OUT_DIR, 'failure.png'), fullPage: true }).catch(() => {});
  fail('run', err.message);
} finally {
  await browser.close();
}

const ok = results.filter(r => r.ok).length;
console.log(`\n──────── ${ok}/${results.length} passed ────────`);
console.log(`screenshot: ${path.join(OUT_DIR, 'preview-heirloom.png')}`);
if (ok !== results.length) process.exit(1);
