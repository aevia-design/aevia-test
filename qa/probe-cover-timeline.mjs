// Phase 1 instrumentation for the doubled cover caption.
//
// probe-cover-captions.mjs sampled the DOM once, ~15s after the order load, and found a
// clean single caption. That rules out a PERSISTENT duplicate but says nothing about a
// TRANSIENT one. The owner's screenshot showed two copies 3px apart, which is exactly the
// delta-0 vs delta-1mm spine offset — i.e. two renders that disagreed about spine width.
//
// So: install a MutationObserver BEFORE the order loads and record every cover render,
// with the caption count, each node's left position, and the page-count value at that
// moment. If two renders ever coexist, or if a render happens at the wrong spine width,
// this catches it with a timestamp.
//
// Read-only. Nothing saved, nothing written to GCS.
//
// Run:  $env:STAFF_PW = ...   ;  node qa/probe-cover-timeline.mjs
import { chromium } from '@playwright/test';

const ORDER = process.env.QA_ORDER || 'AEV-094';
const EMAIL = process.env.STAFF_EMAIL || 'evg.myasin@gmail.com';
const PW    = process.env.STAFF_PW;
const BASE  = 'https://aevia-test.pages.dev/pages';
if (!PW) { console.error('❌ STAFF_PW not set'); process.exit(1); }

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));

try {
  await page.goto(`${BASE}/staff/template-engine`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#eng-email', { state: 'visible', timeout: 20000 });
  await page.fill('#eng-email', EMAIL);
  await page.fill('#eng-pwd', PW);
  await page.click('#eng-lock .eng-lock-btn');
  await page.waitForSelector('#eng-lock', { state: 'hidden', timeout: 20000 });
  console.log('login OK');

  // Install the recorder BEFORE loading the order, so we see the very first render.
  await page.evaluate(() => {
    window.__coverLog = [];
    window.__t0 = performance.now();
    const snap = (why) => {
      const rows = document.querySelectorAll('.spread-row[data-spread-id="cover"]');
      const caps = [...document.querySelectorAll('.cover-caption')];
      window.__coverLog.push({
        t: Math.round(performance.now() - window.__t0),
        why,
        rows: rows.length,
        canvases: document.querySelectorAll('.cover-canvas').length,
        pageCount: document.getElementById('page-count-select')?.value,
        caps: caps.map(c => ({
          key: c.dataset.coverCaptionKey,
          left: c.style.left,
          text: (c.textContent || '').slice(0, 24),
        })),
      });
    };
    // Wrap the two render entry points so every call is timestamped and attributed.
    const origRerender = window.rerenderCover;
    if (typeof origRerender === 'function') {
      window.rerenderCover = function (...a) { const r = origRerender.apply(this, a); snap('rerenderCover'); return r; };
    }
    const origRenderBook = window.renderBook;
    if (typeof origRenderBook === 'function') {
      window.renderBook = function (...a) { const r = origRenderBook.apply(this, a); snap('renderBook'); return r; };
    }
    // Catch anything the wrappers miss (direct DOM edits, async image callbacks).
    new MutationObserver(() => snap('mutation')).observe(
      document.getElementById('book-canvas'), { childList: true, subtree: true });
    snap('baseline');
  });
  console.log('recorder installed');

  await page.click('#mode-order-btn');
  await page.fill('#order-number-input', ORDER);
  await page.click('#order-load-btn');
  await page.waitForSelector('#order-info-panel', { state: 'visible', timeout: 60000 });
  await page.waitForTimeout(20000);

  const log = await page.evaluate(() => {
    // Collapse consecutive identical mutation snapshots — the observer is noisy while
    // 52 photos stream in, and only CHANGES in the cover shape are interesting.
    const sig = (e) => `${e.rows}|${e.canvases}|${e.pageCount}|${e.caps.map(c => c.key + '@' + c.left + '=' + c.text).join(';')}`;
    const out = [];
    for (const e of window.__coverLog) {
      if (!out.length || sig(out[out.length - 1]) !== sig(e)) out.push(e);
    }
    return { total: window.__coverLog.length, changes: out };
  });

  console.log(`\n${log.total} snapshots, ${log.changes.length} distinct cover states:\n`);
  for (const e of log.changes) {
    console.log(`t=${String(e.t).padStart(6)}ms  ${e.why.padEnd(14)} rows=${e.rows} canvases=${e.canvases} pages=${e.pageCount} caps=${e.caps.length}`);
    for (const c of e.caps) console.log(`         ${c.key.padEnd(12)} left=${String(c.left).padEnd(10)} "${c.text}"`);
  }

  const worst = log.changes.reduce((m, e) => Math.max(m, e.rows), 0);
  const maxCaps = log.changes.reduce((m, e) => Math.max(m, e.caps.length), 0);
  console.log('\n— verdict —');
  console.log(`max cover rows seen at any instant: ${worst} ${worst > 1 ? '❌ DUPLICATE' : '✅'}`);
  console.log(`max .cover-caption nodes seen:      ${maxCaps}`);
  const lefts = new Set();
  for (const e of log.changes) for (const c of e.caps) if (c.key === 'front') lefts.add(c.left);
  console.log(`distinct "front" left positions:   ${[...lefts].join(', ') || '(none)'} ${lefts.size > 1 ? '❌ rendered at two spine widths' : ''}`);
} catch (e) {
  console.error('❌', e.message);
} finally {
  if (errs.length) console.log('\npage errors:', errs.slice(0, 3));
  await browser.close();
}
