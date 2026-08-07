// QA — Scribble customer-preview regression (Stage 6 gate). SAFE: getOrder is mocked
// and photos come from the LOCAL test-photo folder — no Firebase read, no GCS egress.
//
//   node qa/scribble-preview-regression.mjs
//
// Why this exists: the Heirloom work changed SHARED code paths in customer-preview.html
// — the cover-caption precedence (was all-or-nothing on `!bookCaptions.cover`, now a
// per-key merge), buildBookSequence (mandatory functional spreads), and the cover clip
// key. None of that should be visible to a template with no monograms and no mandatory
// spreads. This proves it on Scribble, the default template.
//
// Asserts: the book renders, the order's cover captions still reach the cover, saved
// staff captions still win over order-time ones, the sequence still opens with SP0,
// and there are no page errors.

import { chromium } from 'playwright';
import { mkdirSync, readdirSync } from 'fs';
import path from 'path';

const BASE = 'http://localhost:8080';
const PHOTO_WEB = '/assets/test%20photos/Newborn';
const PHOTO_DIR = path.resolve('assets/test photos/Newborn');
const OUT = path.resolve('sessions/qa-runs/scribble-preview-regression');
mkdirSync(OUT, { recursive: true });

const results = [];
const pass = (n) => { results.push({ n, ok: true }); console.log(`  ✅ ${n}`); };
const fail = (n, d) => { results.push({ n, ok: false, d }); console.log(`  ❌ ${n} — ${d}`); };

const names = readdirSync(PHOTO_DIR).filter(f => /\.jpe?g$/i.test(f)).slice(0, 20);
const urlFor = (n) => `${BASE}${PHOTO_WEB}/${encodeURIComponent(n)}`;

const browser = await chromium.launch();

// Two passes: a fresh order (cover text must come from the order), and a saved-staff-state
// order whose saved cover bag holds only ONE key (the merge must fill the other from the
// order, and must NOT overwrite the saved one).
async function run(label, order, checks) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.route('**/getOrder**', r => r.fulfill({
    status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    body: JSON.stringify(order),
  }));
  await page.goto(`${BASE}/pages/customer-preview.html?token=mock`, { waitUntil: 'load' });
  await page.waitForSelector('.cover-canvas', { timeout: 30000 });
  await page.waitForTimeout(2500);
  const state = await page.evaluate(() => ({
    sequence: window._bookSequence || [],
    coverCaps: Object.fromEntries([...document.querySelectorAll('.cover-canvas [data-cover-caption-key]')]
      .map(e => [e.dataset.coverCaptionKey, e.textContent.trim()])),
    pageCanvases: document.querySelectorAll('.page-canvas').length,
  }));
  await page.screenshot({ path: path.join(OUT, `${label}.png`), fullPage: false });
  await page.close();
  checks(state, errs);
}

const baseOrder = {
  orderNumber: 'AEV-MOCK', status: 'preview_sent', templateName: 'scribble',
  pageCount: 40, email: 'qa@example.com', customerName: 'QA Tester',
  fpSelections: [],
  coverCaptions: { name: 'ORDER NAME', year: '2026' },
  signedUrls: { cover: urlFor(names[0]), special: {}, pool: names.slice(1).map(urlFor) },
};

try {
  await run('fresh', baseOrder, (s, errs) => {
    s.pageCanvases > 0 ? pass('fresh: book renders') : fail('fresh: book renders', 'no page canvases');
    s.sequence[0] === 'SP0'
      ? pass('fresh: sequence still opens with SP0 (no mandatory spread injected)')
      : fail('fresh: sequence opens with SP0', `sequence[0] = ${s.sequence[0]}`);
    s.coverCaps.name === 'ORDER NAME'
      ? pass('fresh: order cover captions reach the cover')
      : fail('fresh: order cover captions reach the cover', JSON.stringify(s.coverCaps));
    errs.length === 0 ? pass('fresh: no page errors') : fail('fresh: no page errors', errs.join(' | '));
  });

  // Saved bag holds only `name` — the merge must keep it AND fill `year` from the order.
  await run('saved', {
    ...baseOrder,
    staffBookAssignments: {},
    staffBookCaptions: { cover: { name: 'STAFF EDIT' } },
  }, (s, errs) => {
    s.coverCaps.name === 'STAFF EDIT'
      ? pass('saved: staff cover edit still wins over the order value')
      : fail('saved: staff cover edit wins', JSON.stringify(s.coverCaps));
    s.coverCaps.year === '2026'
      ? pass('saved: the key the staff bag lacks is filled from the order (the fix)')
      : fail('saved: missing key filled from the order', JSON.stringify(s.coverCaps));
    errs.length === 0 ? pass('saved: no page errors') : fail('saved: no page errors', errs.join(' | '));
  });
} catch (err) {
  fail('run', err.message);
} finally {
  await browser.close();
}

const ok = results.filter(r => r.ok).length;
console.log(`\n──────── ${ok}/${results.length} passed ────────`);
if (ok !== results.length) process.exit(1);
