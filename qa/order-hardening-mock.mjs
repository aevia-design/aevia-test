// QA — Tier-1 automated checks for the order-flow-hardening client chunks (1,2,3,6).
//
// SAFE BY DESIGN: every backend call is intercepted and mocked —
//   createUploadSession, the signed-URL PUT uploads, confirmUpload, convertHeic.
// NO real Firebase order is created and NO email is sent. Runs against a LOCAL
// server, so it can run as often as you like.
//
//   node qa/order-hardening-mock.mjs      # starts its own server if 8080 is free
//
// Use http-server, never `npx serve` — serve strips the ?token= query this page needs.
//
// Exits non-zero if any assertion fails. Screenshots on failure → sessions/qa-runs/.
//
// What it proves:
//   Ch1  bad email blocked before photos; submitted email is lowercased; success copy
//   Ch2  a failed PUT surfaces the error screen and never shows success
//   Ch3  beforeunload guard is armed while uploads are in flight
//   Ch5  confirmUpload is called with the token on success, and NOT on a failed upload
//   Ch6  low-res badge fires at <1575px with placement-honest copy; HEIC fail → "No preview"

import { chromium } from '@playwright/test';
import fs from 'fs';
import { spawn } from 'child_process';
import path from 'path';

const BASE = process.env.QA_BASE || 'http://localhost:8080/pages';
const TMP = path.resolve('sessions/qa-runs/order-hardening-mock');
fs.mkdirSync(TMP, { recursive: true });

const results = [];
const pass = (n) => { results.push({ n, ok: true }); console.log(`  ✅ ${n}`); };
const fail = (n, d) => { results.push({ n, ok: false, d }); console.log(`  ❌ ${n} — ${d}`); };
const head = (n) => console.log(`\n— ${n} —`);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Generate a JPEG of given size via a canvas (no sharp dependency) and write to disk.
async function makeJpeg(page, w, h, label, file) {
  const dataUrl = await page.evaluate(({ w, h, label }) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff'; ctx.font = `${Math.max(24, Math.floor(h / 8))}px sans-serif`;
    ctx.fillText(label, 20, Math.floor(h / 2));
    return c.toDataURL('image/jpeg', 0.7);
  }, { w, h, label });
  fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  return file;
}

// Uncaught browser errors, collected across every page. A crash in the page shows up
// here as its real message; without this it surfaces only as "timed out waiting for
// #success-screen", which says the run failed but not why.
const pageErrors = [];

// Install network mocks on a page. Returns a mutable `state` for assertions.
function installMocks(page, opts = {}) {
  const state = { createCalled: false, confirmCalled: false, createBody: null, confirmBody: null, puts: 0 };

  page.on('pageerror', (err) => pageErrors.push(err.message));

  page.route('**/createUploadSession**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS, body: '' });
    state.createCalled = true;
    let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch { /* ignore */ }
    state.createBody = body;
    const files = Array.isArray(body.files) ? body.files : [];
    const n = Math.max(files.length, 1);
    const uploadUrls = Array.from({ length: n }, (_, i) => ({
      slot: i + 1, url: `https://mock-upload.invalid/slot/${i}`,
      contentType: (files[i] && files[i].type) || 'image/jpeg', storedName: `MOCK/${i}`,
    }));
    return route.fulfill({
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true, orderNumber: 'AEV-MOCK', folderName: 'AEV-MOCK',
        totalSlots: n, uploadUrls, token: 'mock-token-123',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      }),
    });
  });

  page.route('**/mock-upload.invalid/**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS, body: '' });
    if (opts.putDelayMs) await new Promise((r) => setTimeout(r, opts.putDelayMs));
    state.puts++;
    if (opts.failPutSlot !== undefined && req.url().endsWith(`/slot/${opts.failPutSlot}`)) {
      return route.fulfill({ status: 403, headers: CORS, body: 'denied' });
    }
    return route.fulfill({ status: 200, headers: CORS, body: '' });
  });

  page.route('**/confirmUpload**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS, body: '' });
    state.confirmCalled = true;
    try { state.confirmBody = JSON.parse(req.postData() || '{}'); } catch { /* ignore */ }
    return route.fulfill({ status: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) });
  });

  page.route('**/convertHeic**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS, body: '' });
    if (opts.heicFail) return route.fulfill({ status: 500, headers: CORS, body: 'fail' });
    return route.fulfill({ status: 200, headers: { ...CORS, 'Content-Type': 'image/jpeg' }, body: '' });
  });

  return state;
}

// Direct order-form URL for a minimal Scribble 40-page order (no add-ons).
// We navigate straight here rather than via the configurator so the test works
// against any plain static server (no clean-URL rewrite needed).
const ORDER_URL = `${BASE}/order.html?template=scribble&pages=40&price=70`;

// Step 2 is a sequence of sub-steps — cover, special pages (auto-skipped with no
// add-ons), then photos — each advanced by its own "Continue" button. Select those
// by position rather than by label, so a copy change cannot silently strand the run.
const CONTINUE = (stepSel) => `${stepSel} button.btn-primary:visible`;

// Open a fresh order form and fill the details step. Stops there.
async function openStep1(page, { name = 'QA Tester', email = 'valid@example.com' } = {}) {
  await page.goto(ORDER_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#step1', { state: 'visible' });
  await page.fill('#inp-name', name);
  await page.fill('#inp-email', email);
}

// Advance all the way to the photos sub-step, which owns submit. Returns the photo target.
async function openPhotos(page, opts = {}) {
  await openStep1(page, opts);
  await page.click(CONTINUE('#step1'));
  await page.waitForSelector('#step-cover', { state: 'visible', timeout: 8000 });

  // Cover: a photo plus every caption the active template declares. Filled generically
  // so a template gaining or renaming a caption doesn't need this script edited.
  await page.setInputFiles('#dz-cover input[type=file]', opts.cover);
  await page.waitForSelector('#cover-preview', { state: 'visible' });
  for (const sel of await page.$$('#cover-section input[type=text], #cover-section textarea')) {
    await sel.fill('QA');
  }
  await page.click(CONTINUE('#step-cover'));

  await page.waitForSelector('#step-photos', { state: 'visible', timeout: 8000 });
  return parseInt(await page.textContent('#photo-count-min'), 10);
}

// Wait for the order to land, whichever way it lands. submitOrder() catches its own
// exceptions and renders them into #err-step2, so a crash looks identical to "success
// never arrived" unless we read that panel — which is where the real message lives.
async function waitForSuccess(page, timeout = 30000) {
  const quiet = () => new Promise(() => {});
  const won = await Promise.race([
    page.waitForSelector('#success-screen', { state: 'visible', timeout }).then(() => 'ok', quiet),
    page.waitForSelector('#err-step2', { state: 'visible', timeout }).then(() => 'err', quiet),
  ]);
  if (won === 'err') {
    const msg = ((await page.textContent('#err-step2')) || '').trim().replace(/\s+/g, ' ');
    throw new Error(`order failed on screen: "${msg.slice(0, 200)}"`);
  }
}

async function fillPhotos(page, target, mainPool) {
  await page.setInputFiles('#dz-main input[type=file]', mainPool.slice(0, target));
  await page.waitForFunction((t) => document.querySelectorAll('#photo-grid .photo-thumb').length >= t, target, { timeout: 60000 });
}

// Start a local server unless one is already up, so running this is a single command
// with nothing to set up first — a check with a setup step is a check that gets skipped.
let server = null;
async function serverUp() {
  try { await fetch(`${BASE}/order.html`); return true; } catch { return false; }
}
if (!(await serverUp())) {
  server = spawn('npx', ['http-server', '.', '-p', '8080', '-c-1', '--silent'], { shell: true, stdio: 'ignore' });
  for (let i = 0; i < 30 && !(await serverUp()); i++) await new Promise((r) => setTimeout(r, 500));
  if (!(await serverUp())) { console.log('❌ could not start http-server on :8080'); process.exit(1); }
  console.log('  (started http-server on :8080)');
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

let mainPool = [], cover = null, smallImg = null, heicFile = null, target = 0;

try {
  // ── Pre: generate synthetic test images, discover the photo target ──────────
  head('Setup');
  const gen = await ctx.newPage();
  await gen.goto('about:blank');
  // The cover must exist before the target can be read — the photo count lives on the
  // photos sub-step, which is only reachable once the cover step is satisfied.
  cover = await makeJpeg(gen, 2000, 2000, 'COVER', path.join(TMP, 'cover.jpg'));
  target = await openPhotos(gen, { cover });
  console.log(`  photo target (40p, no add-ons) = ${target}`);
  for (let i = 0; i < target; i++) mainPool.push(await makeJpeg(gen, 2000, 2000, `P${i}`, path.join(TMP, `photo_${String(i).padStart(3, '0')}.jpg`)));
  smallImg = await makeJpeg(gen, 800, 800, 'SMALL', path.join(TMP, 'small.jpg'));
  heicFile = path.join(TMP, 'fake.heic');
  fs.writeFileSync(heicFile, Buffer.from('not-a-real-heic')); // extension triggers the HEIC path; conversion is mocked to fail
  await gen.close();
  pass(`setup: generated cover + ${target} main + small + fake heic`);

  // ── Ch1a — bad email blocked before photos ─────────────────────────────────
  head('Ch1 — email format gate (before photos)');
  {
    const page = await ctx.newPage();
    installMocks(page);
    await openStep1(page, { email: 'bad@' });
    await page.click(CONTINUE('#step1'));
    await page.waitForTimeout(300);
    const errVisible = await page.isVisible('#err-step1');
    const onStep2 = await page.isVisible('#step2');
    if (errVisible && !onStep2) pass('bad email blocked at details; never reaches photos');
    else fail('bad email gate', `errVisible=${errVisible} onStep2=${onStep2}`);
    await page.close();
  }

  // ── Ch1b/Ch2/Ch5 — happy path: normalised email, success, confirmUpload ─────
  head('Ch1/Ch2/Ch5 — happy path (mocked)');
  {
    const page = await ctx.newPage();
    const st = installMocks(page);
    const t = await openPhotos(page, { email: 'Mixed@CASE.Com', cover });
    await fillPhotos(page, t, mainPool);
    await page.click('#submit-btn');
    await waitForSuccess(page);
    const sub = await page.textContent('#success-sub');
    st.createBody?.email === 'mixed@case.com'
      ? pass('Ch1: submitted email normalised to lowercase')
      : fail('Ch1 normalise', `email sent = ${st.createBody?.email}`);
    (/if that's not right/i.test(sub) && sub.toLowerCase().includes('mixed@case.com'))
      ? pass('Ch1: success screen shows address + "if that\'s not right" catch')
      : fail('Ch1 success copy', `sub="${sub.slice(0, 80)}…"`);
    st.confirmCalled && st.confirmBody?.token === 'mock-token-123' && st.confirmBody?.orderNumber === 'AEV-MOCK'
      ? pass('Ch5: confirmUpload called with token + orderNumber after upload')
      : fail('Ch5 confirmUpload', `called=${st.confirmCalled} body=${JSON.stringify(st.confirmBody)}`);
    pass('Ch2: success screen shown only after all uploads confirmed');
    await page.close();
  }

  // ── Ch2/Ch5 — failed upload: error screen, no success, confirmUpload NOT called ─
  head('Ch2/Ch5 — failed upload path');
  {
    const page = await ctx.newPage();
    const st = installMocks(page, { failPutSlot: 0 }); // first slot 403s on every retry
    const t = await openPhotos(page, { cover });
    await fillPhotos(page, t, mainPool);
    await page.click('#submit-btn');
    await page.waitForSelector('#err-step2', { state: 'visible', timeout: 30000 });
    const successShown = await page.isVisible('#success-screen');
    !successShown ? pass('Ch2: failed upload shows error, success screen NOT shown')
                  : fail('Ch2 failure gate', 'success screen visible despite failed upload');
    !st.confirmCalled ? pass('Ch5: confirmUpload NOT called on a failed/partial order (headline)')
                      : fail('Ch5 headline', 'confirmUpload was called despite upload failure');
    await page.close();
  }

  // ── Ch3 — beforeunload guard armed during upload ───────────────────────────
  head('Ch3 — beforeunload guard');
  {
    const page = await ctx.newPage();
    installMocks(page, { putDelayMs: 1200 }); // keep uploads in flight long enough to probe
    const t = await openPhotos(page, { cover });
    await fillPhotos(page, t, mainPool);
    await page.click('#submit-btn');
    await page.waitForTimeout(600); // createUploadSession resolves, uploadInFlight set true, PUTs in flight
    const preventedDuring = await page.evaluate(() => {
      const e = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(e);
      return e.defaultPrevented;
    });
    preventedDuring ? pass('Ch3: beforeunload is prevented while uploads are in flight')
                    : fail('Ch3 guard', 'beforeunload not prevented during upload');
    await waitForSuccess(page);
    const preventedAfter = await page.evaluate(() => {
      const e = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(e);
      return e.defaultPrevented;
    });
    !preventedAfter ? pass('Ch3: beforeunload NOT prevented after success (disarmed)')
                    : fail('Ch3 disarm', 'beforeunload still prevented after success');
    await page.close();
  }

  // ── Ch6 B2 — low-res badge + honest copy ───────────────────────────────────
  head('Ch6 — low-res warning (1575px)');
  {
    const page = await ctx.newPage();
    installMocks(page);
    await openPhotos(page, { cover });
    await page.setInputFiles('#dz-main input[type=file]', smallImg);
    await page.waitForSelector('#photo-grid .low-res-badge', { timeout: 15000 });
    const countText = await page.textContent('#photo-count');
    countText.includes('1575') ? pass('Ch6: 800px image flagged LOW RES; summary cites ~1575px')
                               : fail('Ch6 low-res copy', `summary="${countText.trim()}"`);
    await page.close();
  }

  // ── Ch6 B1 — HEIC conversion failure → "No preview" reassurance ─────────────
  head('Ch6 — HEIC preview-unavailable (main grid)');
  {
    const page = await ctx.newPage();
    installMocks(page, { heicFail: true });
    await openPhotos(page, { cover });
    await page.setInputFiles('#dz-main input[type=file]', heicFile);
    await page.waitForSelector('#photo-grid .photo-thumb', { timeout: 15000 });
    // conversion is mocked to fail (3 retries) → _previewFailed → "No preview" note
    await page.waitForFunction(() => /No preview/i.test(document.querySelector('#photo-grid')?.textContent || ''), null, { timeout: 20000 });
    pass('Ch6: failed HEIC conversion shows "No preview"; file still queued');
    await page.close();
  }

} catch (err) {
  fail('UNCAUGHT', err.message);
} finally {
  await browser.close();
  if (server) server.kill();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n──────── ${results.length - failed.length}/${results.length} passed ────────`);
  if (pageErrors.length) {
    console.log('UNCAUGHT BROWSER ERRORS (the page itself crashed):');
    [...new Set(pageErrors)].forEach((m) => console.log(`  ⚠ ${m}`));
  }
  if (failed.length) { console.log('FAILURES:'); failed.forEach((r) => console.log(`  ✗ ${r.n} — ${r.d || ''}`)); process.exit(1); }
  // A clean assertion sweep still fails the run if the page threw — a crash outside an
  // asserted path is exactly how the S154 upload bug reached the live rig.
  if (pageErrors.length) process.exit(1);
  console.log('All checks passed ✅');
}
