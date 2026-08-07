// QA — Heirloom order-form wiring (Stage 5). SAFE: every backend call is mocked, so
// no Firebase order is created and no email is sent. Runs against a local server.
//
//   node qa/heirloom-order-mock.mjs
//
// What it proves:
//   1. template=heirloom-beige resolves to HEIRLOOM_DATA (not the Scribble fallback)
//   2. the MANDATORY Intro spread gets its own special-pages section with no
//      "Remove this page" link, even though it is not a purchased add-on
//   3. the monogram comes from the `monogram=` URL param (chosen on the product page)
//      and the order form shows NO picker of its own
//   4. a GROUPED add-on (addonGroup 'whylove') expands from one purchased slug into
//      two independent sections — "Why I love him" and "Why I love her"
//   5. the submitted payload carries fpTexts.monogram, fpTexts.monogramLetters
//      (initials derived from the two name fields), the composed intro text, and
//      FPintro in fpSelections
//   6. an optional add-on alongside the mandatory spread still works (Our story)

import { chromium } from '@playwright/test';
import fs from 'fs';
import { spawn } from 'child_process';
import path from 'path';

const BASE = process.env.QA_BASE || 'http://localhost:8080/pages';
const TMP = path.resolve('sessions/qa-runs/heirloom-order-mock');
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

const pageErrors = [];

function installMocks(page) {
  const state = { createBody: null };
  page.on('pageerror', (err) => pageErrors.push(err.message));

  page.route('**/createUploadSession**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS, body: '' });
    let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch { /* ignore */ }
    state.createBody = body;
    const n = Math.max((body.files || []).length, 1);
    const uploadUrls = Array.from({ length: n }, (_, i) => ({
      slot: i + 1, url: `https://mock-upload.invalid/slot/${i}`,
      contentType: 'image/jpeg', storedName: `MOCK/${i}`,
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
  page.route('**/mock-upload.invalid/**', (route) =>
    route.fulfill({ status: 200, headers: CORS, body: '' }));
  page.route('**/confirmUpload**', (route) =>
    route.fulfill({ status: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) }));
  return state;
}

// Heirloom order with the "Our story" add-on and the GROUPED "Why I love him & her"
// add-on (one purchased slug, two spreads). The Intro is NOT listed — it is mandatory
// and the order form must add it itself. The monogram rides in as a product-page param.
const ORDER_URL = `${BASE}/order.html?template=heirloom-beige&pages=40&price=95`
  + `&addons=Our%20story,Why%20I%20love%20him%20%26%20her`
  + `&addon_slugs=FPstory,whylove&addon_inputs=text,text`
  + `&monogram=roses`;

const CONTINUE = (stepSel) => `${stepSel} button.btn-primary:visible`;

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

try {
  head('Setup');
  const gen = await ctx.newPage();
  await gen.goto('about:blank');
  const cover = await makeJpeg(gen, 2000, 2000, 'COVER', path.join(TMP, 'cover.jpg'));
  const story = await makeJpeg(gen, 2000, 2000, 'STORY', path.join(TMP, 'story.jpg'));
  const pool = [];
  // Shortest side must clear the ~1575px print threshold, or every photo is flagged
  // LOW RES and the "Before we start" modal blocks submit. This check is about the
  // Heirloom wiring, not the low-res gate (qa/order-hardening-mock.mjs covers that).
  for (let i = 0; i < 60; i++) pool.push(await makeJpeg(gen, 2400, 1600, `P${i}`, path.join(TMP, `p${i}.jpg`)));
  await gen.close();
  pass('setup: generated cover + story + 60 main photos');

  const page = await ctx.newPage();
  const state = installMocks(page);

  head('Registry + details');
  await page.goto(ORDER_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#step1', { state: 'visible' });
  const tmplKey = await page.evaluate(() => window.HEIRLOOM_DATA && window.HEIRLOOM_DATA.template);
  tmplKey === 'heirloom-beige'
    ? pass('heirloom-beige data file loads on the order form')
    : fail('heirloom-beige data file loads on the order form', `template = ${tmplKey}`);

  await page.fill('#inp-name', 'QA Tester');
  await page.fill('#inp-email', 'valid@example.com');
  await page.click(CONTINUE('#step1'));

  head('Cover');
  await page.waitForSelector('#step-cover', { state: 'visible', timeout: 8000 });
  await page.setInputFiles('#dz-cover input[type=file]', cover);
  await page.waitForSelector('#cover-preview', { state: 'visible' });
  for (const el of await page.$$('#cover-section input[type=text], #cover-section textarea')) {
    await el.fill('Anna & Michael');
  }
  await page.click(CONTINUE('#step-cover'));

  head('Special pages — mandatory Intro + monogram');
  await page.waitForSelector('#step-special', { state: 'visible', timeout: 8000 });

  const introSection = await page.$('#addon-wrap-fpintro');
  introSection
    ? pass('mandatory Intro gets its own section without being a purchased add-on')
    : fail('mandatory Intro gets its own section', 'no #addon-wrap-fpintro');

  const introRemove = await page.$('#addon-wrap-fpintro button:has-text("Remove this page")');
  !introRemove
    ? pass('Intro has no "Remove this page" link')
    : fail('Intro has no "Remove this page" link', 'remove button present');

  const storySection = await page.$('#addon-wrap-FPstory, #addon-wrap-fpstory');
  storySection
    ? pass('optional Our-story add-on still renders alongside it')
    : fail('optional Our-story add-on still renders', 'section missing');

  const noPicker = !(await page.$('#monogram-choice'));
  noPicker
    ? pass('order form shows no monogram picker (the product page owns that choice)')
    : fail('order form shows no monogram picker', 'a #monogram-choice select is present');

  // The grouped add-on must have become TWO independent sections.
  const groupSections = await page.$$eval('[id^="addon-wrap-"]', els => els.map(e => e.id));
  const hasHim = groupSections.includes('addon-wrap-fphim');
  const hasHer = groupSections.includes('addon-wrap-fpher');
  hasHim && hasHer
    ? pass('grouped add-on expands into "Why I love him" + "Why I love her"')
    : fail('grouped add-on expands into two sections', `sections: ${groupSections.join(', ')}`);

  // Fill the Intro + Our story + both whylove spreads.
  await page.fill('#intro-fpintro-date', 'June 14th, 2026');
  await page.fill('#intro-fpintro-place', 'Vienna, Austria');
  await page.fill('#intro-fpintro-bride', 'Anna');
  await page.fill('#intro-fpintro-groom', 'Michael');

  // Slugs keep whatever case the URL gave them (fpKeyForSlug resolves case-insensitively),
  // so read the live slug rather than assuming it was lowercased.
  const storySlug = await page.evaluate(() =>
    ORDER.addons.find(a => a.slug.toLowerCase() === 'fpstory').slug);
  await page.setInputFiles(`#dz-special-${storySlug} input[type=file]`, story);
  await page.fill(`#intro-${storySlug}-meet`, 'Through mutual friends.');
  await page.fill(`#intro-${storySlug}-started`, 'A coffee that ran four hours.');

  await page.setInputFiles('#dz-special-fphim input[type=file]', story);
  await page.fill('#intro-fphim-whyhim', 'He laughs at his own jokes.');
  await page.setInputFiles('#dz-special-fpher input[type=file]', story);
  await page.fill('#intro-fpher-whyher', 'She dances in the kitchen.');

  await page.click(CONTINUE('#step-special'));

  head('Photos + submit');
  await page.waitForSelector('#step-photos', { state: 'visible', timeout: 8000 });
  const target = parseInt(await page.textContent('#photo-count-min'), 10);
  await page.setInputFiles('#dz-main input[type=file]', pool.slice(0, target));
  await page.waitForFunction((t) => document.querySelectorAll('#photo-grid .photo-thumb').length >= t, target, { timeout: 60000 });
  await page.click(CONTINUE('#step-photos'));

  // A confirmation modal can stand between the click and the submit (e.g. the low-res
  // warning). Dismiss it if it appears; absence is fine and must not fail the run.
  const submitAnyway = page.locator('button:has-text("Submit anyway")');
  if (await submitAnyway.isVisible().catch(() => false)) await submitAnyway.click();

  // Race success against the error panel — but ALWAYS against a wall-clock deadline
  // too. Losing branches must not resolve, yet if BOTH lose the race can never settle
  // and the run hangs forever with no output, which is the worst possible failure mode
  // for a check. The deadline turns "neither screen appeared" into a real message.
  const quiet = () => new Promise(() => {});
  const won = await Promise.race([
    page.waitForSelector('#success-screen', { state: 'visible', timeout: 60000 }).then(() => 'ok', quiet),
    page.waitForSelector('#err-step2',      { state: 'visible', timeout: 60000 }).then(() => 'err', quiet),
    new Promise(r => setTimeout(() => r('timeout'), 65000)),
  ]);
  if (won === 'timeout') {
    await page.screenshot({ path: path.join(TMP, 'stuck.png'), fullPage: true });
    const visible = await page.evaluate(() => Array.from(document.querySelectorAll('.step-panel, [id^=step-]'))
      .filter(e => e.offsetParent !== null).map(e => e.id).join(', '));
    throw new Error(`neither success nor error appeared after submit. Visible panels: ${visible || 'none'}. `
      + `Page errors: ${pageErrors.join(' | ') || 'none'}. Screenshot: ${path.join(TMP, 'stuck.png')}`);
  }
  if (won === 'err') {
    const msg = ((await page.textContent('#err-step2')) || '').trim().replace(/\s+/g, ' ');
    throw new Error(`order failed on screen: "${msg.slice(0, 200)}"`);
  }

  const body = state.createBody || {};
  const fp = body.fpTexts || {};
  fp.monogram === 'roses'
    ? pass('payload carries the monogram from the URL param')
    : fail('payload carries the monogram from the URL param', `fpTexts.monogram = ${fp.monogram}`);

  fp.fphim && fp.fpher && fp.fphim !== fp.fpher
    ? pass('both whylove spreads carry their own separate text')
    : fail('both whylove spreads carry separate text', `him=${JSON.stringify(fp.fphim)} her=${JSON.stringify(fp.fpher)}`);

  ['FPhim', 'FPher'].every(k => (body.fpSelections || []).includes(k))
    ? pass('FPhim + FPher both travel in fpSelections')
    : fail('FPhim + FPher in fpSelections', JSON.stringify(body.fpSelections));

  JSON.stringify(fp.monogramLetters) === JSON.stringify(['A', 'M'])
    ? pass('initials derived from the two name fields (A & M)')
    : fail('initials derived from the name fields', `got ${JSON.stringify(fp.monogramLetters)}`);

  typeof fp.fpintro === 'string' && fp.fpintro.includes('June 14th, 2026') && fp.fpintro.includes('Anna & Michael')
    ? pass('intro text composed from the mandatory intro fields')
    : fail('intro text composed', `fpTexts.fpintro = ${JSON.stringify(fp.fpintro)}`);

  (body.fpSelections || []).includes('FPintro')
    ? pass('FPintro travels in fpSelections')
    : fail('FPintro travels in fpSelections', JSON.stringify(body.fpSelections));

  body.templateName === 'heirloom-beige'
    ? pass('templateName submitted as heirloom-beige')
    : fail('templateName submitted', body.templateName);

  if (pageErrors.length) fail('no uncaught page errors', pageErrors.join(' | '));
  else pass('no uncaught page errors');

} catch (err) {
  fail('run', err.message);
} finally {
  await browser.close();
  if (server) server.kill();
}

const ok = results.filter(r => r.ok).length;
console.log(`\n──────── ${ok}/${results.length} passed ────────`);
if (ok !== results.length) { console.log('Some checks failed ❌'); process.exit(1); }
console.log('All checks passed ✅');
