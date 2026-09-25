// QA — TO-DOS #99 end-to-end, browser layer. SAFE: no cloud writes, no deploy.
//
// Layer 2 of the #99 verification (Layer 1 is tests/review-lock-scenarios.test.js,
// which drives the same real handlers headlessly under jest). This script drives
// the REAL customer-preview.html in a headless browser, with every
// europe-west1-aevia-uploads.cloudfunctions.net/* call intercepted via
// page.route() and answered by the SAME real functions/index.js handlers,
// running in-process against an in-memory Firestore fake (tests/helpers/
// fake-firestore.js + load-handlers.js) — no server process, no real
// Firebase/GCS/Stripe call anywhere.
//
//   npx http-server . -p 8080 -c-1     (project root, separate terminal)
//   node qa/review-lock-browser.mjs
//
// Photos: the seed orders have NO photoManifest, deliberately. getOrder
// computes signedUrls/storedNames itself from order.photoManifest via a REAL
// GCS getSignedUrl() call (functions/index.js's signedReadUrl) — something
// this script must never trigger. So the photo pool is empty on purpose: the
// page renders an "empty book" (every slot null), which is fine for what
// this script actually verifies (the review-lock mechanics: save / report /
// promote / lock / approve / DE strings), not photo rendering fidelity —
// that's covered by the templates' own qa/*-preview-mock.mjs scripts, which
// use local test photos and a static getOrder mock instead of a live one.
//
// Deliberate scope cut (documented, not silently skipped): the real "Approve &
// confirm" button is gated client-side by checkBookComplete() (assets/js/
// book-completeness.js), which requires the photo pool to exactly fill every
// slot buildBookSequence() generates — impossible to satisfy with an empty
// pool. Approve is therefore exercised via a direct in-page fetch() to the
// SAME intercepted endpoint (proves the browser round-trip through the real
// handler), not via the button click; the button's own 409-reload-prompt UI
// (confirm()) is SKIPPED here — it's already covered by reading
// customer-preview.html's click handler (confirmed it calls confirm() on a
// STALE 409) and by Layer 1's scenarios (d)/(e)/(f), which exercise the exact
// same server-side 409 path.

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { loadHandlers } = require('../tests/helpers/load-handlers.js');

const BASE = 'http://localhost:8080';
const OUT  = path.resolve('sessions/qa-runs/review-lock-browser');
mkdirSync(OUT, { recursive: true });

const results = [];
const pass = (n) => { results.push({ n, ok: true }); console.log(`  ✅ ${n}`); };
const fail = (n, d) => { results.push({ n, ok: false, d }); console.log(`  ❌ ${n} — ${d || ''}`); };
const consoleErrors = [];

function baseOrder(orderNumber, token, overrides = {}) {
  return {
    orderNumber, previewToken: token,
    customerName: 'QA Tester', email: 'qa@example.com',
    templateName: 'scribble', pageCount: 40, language: 'en',
    status: 'review_sent',
    staffBookComplete: true, staffIncompleteReasons: [],
    fpSelections: [],
    coverCaptions: { name: 'QA TESTER', year: '2026' },
    staffBookAssignments: null, // let the page auto-assign from the (empty) pool
    staffBookCaptions: { 0: { left: { 0: 'Original staff caption' } } },
    staffBookCaptionLines: null,
    staffBookSequence: null,
    staffCoverCaptionStyles: {}, staffSpreadCaptionStyles: {}, staffHeartCrop: {},
    reports: [],
    // No photoManifest — see the header comment: getOrder derives
    // signedUrls/storedNames from it via a real GCS call, so it stays absent
    // and the pool renders empty on purpose.
    ...overrides,
  };
}

// One shared in-memory db for the whole run — both orders live in it, and
// state changes from one scenario carry forward exactly like a real backend.
const seed = {
  'AEV-QA99':  baseOrder('AEV-QA99',  'tok-en', { bookRevision: 1 }),
  'AEV-QA99D': baseOrder('AEV-QA99D', 'tok-de', { bookRevision: 1, language: 'de', customerName: 'QA Testerin' }),
  'AEV-QA99F': baseOrder('AEV-QA99F', 'tok-fb', { bookRevision: 1 }), // feedback-path order
};
const { idx, db } = loadHandlers(seed);

// ── wraps a real Express-style handler as a Playwright route.fulfill() ─────
function makeResCapture() {
  const cap = { statusCode: 200, body: null };
  const res = {
    status: (c) => { cap.statusCode = c; return res; },
    json:   (b) => { cap.body = b; return res; },
    set:    () => res,
    send:   (b) => { cap.body = b; return res; },
  };
  return { res, cap };
}
async function callHandler(name, request) {
  const method = request.method();
  const headers = request.headers();
  let body = {};
  if (method === 'POST') {
    try { body = JSON.parse(request.postData() || '{}'); } catch { body = {}; }
  }
  const { res, cap } = makeResCapture();
  await idx[name]({ method, headers, body }, res);
  if (process.env.QA_DEBUG) console.log(`[${name}]`, JSON.stringify(body), '->', cap.statusCode, JSON.stringify(cap.body));
  return cap;
}
async function wireRoutes(page) {
  for (const name of ['getOrder', 'saveOrderState', 'approveOrder', 'reportOrderIssue']) {
    await page.route(`**/${name}`, async (route) => {
      const cap = await callHandler(name, route.request());
      await route.fulfill({
        status: cap.statusCode,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
        body: JSON.stringify(cap.body),
      });
    });
  }
  page.on('pageerror', (e) => consoleErrors.push(`[pageerror] ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(`[console] ${m.text()}`); });
}

function staffReq(body) { return { method: 'POST', headers: { 'x-staff-key': process.env.STAFF_KEY || 'qa-key' }, body }; }
process.env.STAFF_KEY = process.env.STAFF_KEY || 'qa-key';
async function staffCall(name, body) {
  const { res, cap } = makeResCapture();
  await idx[name](staffReq(body), res);
  return cap;
}

const browser = await chromium.launch();

// ── Scenario 1: EN order — edit, save, reload persists, blocking report
//    locks immediately, staff fix + resend, reload shows the fix ──────────
async function scenarioEnglish() {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await wireRoutes(page);

  await page.goto(`${BASE}/pages/customer-preview.html?token=tok-en`, { waitUntil: 'load' });
  await page.waitForSelector('.cover-canvas', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(OUT, '1-loaded.png') });

  const captionCount = await page.locator('[data-spread-index="0"][contenteditable="true"]').count();
  if (captionCount === 0) { fail('EN: has an editable caption', 'none found — book may not have rendered'); }
  else pass('EN: book rendered with editable captions');

  if (captionCount > 0) {
    const cap = page.locator('[data-spread-index="0"][contenteditable="true"]').first();
    await cap.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('QA edited caption 99');
    await page.locator('#save-btn').click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, '2-saved.png') });
    const savedOrder = db._dump('AEV-QA99');
    if (savedOrder.customerBookAssignments || savedOrder.customerCaptions) pass('EN: Save wrote customer* fields');
    else fail('EN: Save wrote customer* fields', 'no customer* fields present after save');

    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(1200);
    const text = await page.locator('[data-spread-index="0"][contenteditable="true"]').first().textContent().catch(() => '');
    if ((text || '').includes('QA edited caption 99')) pass('EN: reload shows the saved edit');
    else fail('EN: reload shows the saved edit', `got: "${text}"`);
  }

  // Blocking report — must lock the page IMMEDIATELY, no reload needed.
  await page.locator('#report-issue-link').click();
  await page.locator('#issue-type-blocking').check();
  await page.locator('#issue-text').fill('The cover photo is blurry — please fix.');
  await page.locator('#issue-send').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, '3-blocking-report-sent.png') });

  const bannerVisible = await page.locator('#issue-lock-banner').isVisible().catch(() => false);
  if (bannerVisible) pass('EN: read-only banner appears immediately after a blocking report');
  else fail('EN: read-only banner appears immediately after a blocking report', 'banner not visible');

  // After lockForIssue's sweep, every caption's attribute value is "false" —
  // so a matching [contenteditable="false"] element existing (and NO
  // [contenteditable="true"] one left) is the actual proof of the lock.
  const nowLockedCount = await page.locator('[data-spread-index][contenteditable="false"]').count();
  const stillTrueCount = await page.locator('[data-spread-index][contenteditable="true"]').count();
  if (nowLockedCount > 0 && stillTrueCount === 0) pass('EN: captions are contenteditable=false immediately (no reload)');
  else fail('EN: captions are contenteditable=false immediately (no reload)', `locked=${nowLockedCount} stillTrue=${stillTrueCount}`);

  const afterReport = db._dump('AEV-QA99');
  if (afterReport.status !== 'issue') fail('EN: server status flipped to issue', `was "${afterReport.status}"`);
  else pass('EN: server status flipped to issue');

  // ── Node-side: simulate the staff fix + resend (no browser involved — the
  //    staff engine/dashboard aren't in this run's scope) ──────────────────
  const staffSave = await staffCall('saveStaffState', {
    orderNumber: 'AEV-QA99',
    bookAssignments: afterReport.staffBookAssignments,
    bookCaptions: { 0: { left: { 0: 'STAFF FIXED THIS' } } },
    bookSequence: afterReport.staffBookSequence,
    coverCaptionStyles: {}, spreadCaptionStyles: {}, heartCrop: {},
    bookComplete: true, incompleteReasons: [],
    bookRevision: afterReport.bookRevision,
  });
  if (staffSave.statusCode !== 200) fail('EN: staff save (the fix) succeeds', JSON.stringify(staffSave.body));
  else pass('EN: staff save (the fix) succeeds');

  const afterStaffSave = db._dump('AEV-QA99');
  const resend = await staffCall('sendPreviewEmail', { orderNumber: 'AEV-QA99', bookRevision: afterStaffSave.bookRevision });
  if (resend.statusCode !== 200) fail('EN: resend after fix succeeds', JSON.stringify(resend.body));
  else pass('EN: resend after fix succeeds');
  if (db._dump('AEV-QA99').status === 'review_sent') pass('EN: status back to review_sent after resend');
  else fail('EN: status back to review_sent after resend', db._dump('AEV-QA99').status);

  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(OUT, '4-after-fix-reload.png') });
  // This synthetic order's photo pool is empty (photoManifest is intentionally
  // never set — see the header comment: getOrder computes signedUrls from
  // photoManifest via a REAL GCS signed-url call, which must never run here),
  // so spread 0's left slot has no photo and renders no caption box to read
  // text from. Check the underlying client-side state the page actually
  // loaded instead — a legitimate way to confirm the fix reached the browser.
  const clientCaptions = await page.evaluate(() => window.orderData && window.orderData.staffBookCaptions);
  const fixedText = clientCaptions && clientCaptions['0'] && clientCaptions['0'].left && clientCaptions['0'].left['0'];
  if (fixedText === 'STAFF FIXED THIS') pass('EN: reload after the fix shows the staff fix (client-side orderData)');
  else fail('EN: reload after the fix shows the staff fix (client-side orderData)', `got: ${JSON.stringify(clientCaptions)}`);

  const bannerGone = await page.locator('#issue-lock-banner').count();
  if (bannerGone === 0) pass('EN: lock banner is gone after the fix (no longer in issue)');
  else fail('EN: lock banner is gone after the fix (no longer in issue)', 'banner still present');

  // Approve — via a direct in-page fetch to the SAME intercepted route (see
  // header comment: the real button is gated by client-side completeness,
  // which this synthetic order doesn't model precisely enough to pass).
  const approveResult = await page.evaluate(async () => {
    const r = await fetch('https://europe-west1-aevia-uploads.cloudfunctions.net/approveOrder', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'tok-en', bookRevision: window._bookRevision || 0 }),
    });
    return { status: r.status, body: await r.json() };
  });
  if (approveResult.status === 200) pass('EN: approve (via the real route, direct fetch) succeeds after the fix');
  else fail('EN: approve (via the real route, direct fetch) succeeds after the fix', JSON.stringify(approveResult));

  await page.close();
}

// ── Scenario 2: feedback path — no lock, approve stays open ────────────────
async function scenarioFeedback() {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await wireRoutes(page);
  await page.goto(`${BASE}/pages/customer-preview.html?token=tok-fb`, { waitUntil: 'load' });
  await page.waitForSelector('.cover-canvas', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1200);

  await page.locator('#report-issue-link').click();
  await page.locator('#issue-type-feedback').check();
  await page.locator('#issue-text').fill('Loving the layout so far!');
  await page.locator('#issue-send').click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, '5-feedback-sent.png') });

  const order = db._dump('AEV-QA99F');
  if (order.status === 'review_sent' && (order.reports || []).some(r => r.type === 'feedback')) {
    pass('Feedback: status unchanged, report recorded as feedback');
  } else {
    fail('Feedback: status unchanged, report recorded as feedback', JSON.stringify(order.reports));
  }
  const stillEditable = await page.locator('#save-btn').isVisible().catch(() => false);
  if (stillEditable) pass('Feedback: page stays editable (Save button still visible)');
  else fail('Feedback: page stays editable (Save button still visible)', 'save-btn hidden');

  await page.close();
}

// ── Scenario 3: German order — new copy renders in German ──────────────────
async function scenarioGerman() {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await wireRoutes(page);
  await page.goto(`${BASE}/pages/customer-preview.html?token=tok-de`, { waitUntil: 'load' });
  await page.waitForSelector('.cover-canvas', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1200);

  await page.locator('#report-issue-link').click();
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, '6-de-modal.png') });
  const title = await page.locator('#issue-title').textContent().catch(() => '');
  if (title.includes('Problem melden')) pass('DE: report modal title is German');
  else fail('DE: report modal title is German', `got: "${title}"`);

  await page.locator('#issue-cancel').click();
  await page.close();
}

try {
  await scenarioEnglish();
  await scenarioFeedback();
  await scenarioGerman();
} catch (err) {
  fail('script did not throw', err.stack || String(err));
}

console.log('\n── Console/page errors seen during the run ──');
if (consoleErrors.length === 0) {
  console.log('  (none)');
} else {
  consoleErrors.forEach((e) => console.log('  ' + e));
}

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed. Screenshots: ${OUT}`);
if (failed.length) {
  console.log('Failures:');
  failed.forEach((f) => console.log(`  - ${f.n}: ${f.d}`));
  process.exit(1);
}
