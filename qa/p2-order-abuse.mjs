// P2 — hostile text, confirmation email, refresh mid-upload
//   (case-catalogue P2-5, P2-12 [confirmation leg], P2-10)
//
//   node qa/p2-order-abuse.mjs [template]                 P2-5 + P2-12  (mints 1 order)
//   node qa/p2-order-abuse.mjs [template] --refresh       P2-10          (mints 1 GHOST order)
//
// WHY THIS EXISTS
// P2-5 asks whether weird text (very long, emoji, HTML/script) is stored and escaped
// safely. P2-10 asks what a refresh mid-upload leaves behind. Both need a real submit,
// so unlike the other P2 scripts these DO create orders — one each, deliberately.
//
// --refresh leaves an order stranded at `uploading` BY DESIGN: that is the case. Add it
// to the TO-DOS #60 / #90 cleanup list. It is also the same failure shape as #88, so the
// run's uploadErrors are worth reading with scripts/inspect-upload-failure.js.
//
// Needs qa/.env (testmail) for the P2-12 leg. Photos come from assets/test photos.
//
// Artefacts → sessions/qa-runs/<date>-p2-order-abuse-<template>[-refresh]/

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { address, getEmails } from './testmail.mjs';
import { orderState, getOrder } from './firestore.mjs';

const argv = process.argv.slice(2);
const TEMPLATE = argv.find(a => !a.startsWith('--')) || 'scribble';
const REFRESH  = argv.includes('--refresh');

const SPECS = {
  scribble: { addons: ['FP1', 'FP2', 'FP3', 'FP4', 'FP5'], coverPhoto: true },
  papercut: { addons: ['FP1', 'FP2', 'FP3', 'FP4', 'FP5'], coverPhoto: true },
  newborn:  { addons: ['FPintro', 'FPlabour'], coverPhoto: true },
  tender:   { addons: ['FPintro', 'FPstory', 'FPwords'], coverPhoto: true },
};
const SPEC = SPECS[TEMPLATE];
if (!SPEC) { console.error(`Usage: node qa/p2-order-abuse.mjs <${Object.keys(SPECS).join('|')}> [--refresh]`); process.exit(1); }

// ── The hostile strings (P2-5) ──────────────────────────────────────────────
// Three separate risks: injection, length, and non-BMP characters. Each is checked
// end to end — stored in Firestore, then rendered on the customer preview.
const XSS   = `<script>window.__XSS_FIRED=1</script><img src=x onerror="window.__XSS_FIRED=1">`;
const LONG  = 'Ω'.repeat(300);
const EMOJI = '👶🏽🎉 Mila & Père — “quotes” & <tags> & \'apostrophes\' 😀𝔘𝔫𝔦𝔠𝔬𝔡𝔢';

const BASE = 'https://aevia-test.pages.dev/pages';
const RUN_DIR = path.resolve('sessions/qa-runs', `${new Date().toISOString().slice(0, 10)}-p2-order-abuse-${TEMPLATE}${REFRESH ? '-refresh' : ''}`);
fs.mkdirSync(RUN_DIR, { recursive: true });

const PHOTO_DIR = path.resolve('assets/test photos/DTS_PARENTHOOD');
const photos = fs.readdirSync(PHOTO_DIR).filter(f => /\.(jpe?g|png)$/i.test(f)).sort().map(f => path.join(PHOTO_DIR, f));

const TAG = 'p2ab' + Date.now().toString(36);
const EMAIL = address(TAG);

const log = [], findings = [];
const note = (m) => { const l = `[${new Date().toISOString().slice(11, 19)}] ${m}`; console.log(l); log.push(l); };
const finding = (sev, id, msg) => { findings.push({ sev, id, msg }); note(`  ⚠️  ${sev} ${id} ${msg}`); };
const pass = (id, msg) => note(`  ✓ ${id} ${msg}`);
const shot = async (p, n) => { await p.screenshot({ path: path.join(RUN_DIR, n), fullPage: true }); note(`📸 ${n}`); };

let photoIdx = 0;
const nextPhoto = () => photos[photoIdx++ % photos.length];

note(`═══ P2 ORDER ABUSE — ${TEMPLATE.toUpperCase()}${REFRESH ? ' (--refresh / P2-10)' : ' (P2-5 + P2-12)'} ═══`);
note(`Inbox: ${EMAIL}`);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
page.on('dialog', d => d.accept().catch(() => {}));

const consoleMsgs = [];
page.on('pageerror', e => consoleMsgs.push(`pageerror: ${e.message}`));

let orderNumber = null;
const submitTs = Date.now();

const advanceTo = async (sel, label, errSels = []) => {
  await page.evaluate(() => advance());
  try { await page.waitForSelector(sel, { state: 'visible', timeout: 15000 }); note(`→ ${label}`); }
  catch {
    let msg = '';
    for (const es of errSels) { const t = await page.textContent(es).catch(() => ''); if (t?.trim()) { msg = t.trim(); break; } }
    await shot(page, `ERROR-${label}.png`).catch(() => {});
    throw new Error(`Cannot advance to ${label}${msg ? ` — "${msg}"` : ''}`);
  }
};

try {
  await page.goto(`${BASE}/${TEMPLATE}.html`, { waitUntil: 'domcontentloaded' });
  for (const fp of SPEC.addons) await page.$eval(`[data-fp="${fp}"]`, el => el.click()).catch(() => {});
  await Promise.all([page.waitForURL('**/order*'), page.click('.cta')]);
  await page.waitForSelector('#step1', { state: 'visible' });

  // ── P2-5: hostile name ──
  const nameIn = REFRESH ? 'QA Refresh Test' : XSS + ' ' + EMOJI;
  await page.fill('#inp-name', nameIn);
  await page.fill('#inp-email', EMAIL);
  const nameStored = await page.inputValue('#inp-name');
  if (!REFRESH) note(`  name field accepted ${nameStored.length} chars`);
  await advanceTo('#step-cover', 'step-cover', ['#err-step1']);

  if (SPEC.coverPhoto) {
    await page.setInputFiles('#dz-cover input[type=file]', nextPhoto());
    await page.waitForSelector('#cover-preview', { state: 'visible', timeout: 60000 });
  }
  const capIds = await page.$$eval('[id^="cover-cap-"]', els => els.map(e => e.id));
  for (const [i, id] of capIds.entries()) {
    // Rotate the three hostile shapes across the caption fields so each is exercised.
    const v = REFRESH ? 'QA' : [XSS, LONG, EMOJI][i % 3];
    await page.fill(`#${id}`, v);
    const got = await page.inputValue(`#${id}`);
    if (!REFRESH && got.length < v.length) {
      note(`  ${id}: truncated ${v.length} → ${got.length} chars (maxLength) — expected, not a defect`);
    }
  }

  if (SPEC.addons.length) {
    await advanceTo('#step-special', 'step-special', ['#err-cover']);
    for (const zid of await page.$$eval('[id^="dz-special-"]', els => els.map(e => e.id))) {
      await page.setInputFiles(`#${zid} input[type=file]`, nextPhoto());
    }
    for (const sid of await page.$$eval('#step-special select', els => els.map(e => e.id))) {
      if (sid.startsWith('country-add-')) continue;
      const opt = await page.$eval(`#${sid}`, el => [...el.options].find(o => o.value && o.value !== 'None')?.value || '');
      if (opt) await page.selectOption(`#${sid}`, opt).catch(() => {});
    }
    const fields = await page.$$eval('#step-special input[type=text], #step-special textarea', els => els.map(e => ({ id: e.id, cls: e.className })));
    for (const [i, f] of fields.entries()) {
      const v = REFRESH ? `QA ${i}` : [XSS, EMOJI, `QA note ${i}`][i % 3];
      if (f.id) await page.fill(`#${f.id}`, v).catch(() => {});
    }
    const words = await page.$$('[id^="fp-word-list-"] input');
    for (const [i, w] of words.entries()) await w.fill(REFRESH ? 'word' : [EMOJI, XSS, 'again'][i % 3]);
    await page.waitForTimeout(500);
    await advanceTo('#step-photos', 'step-photos', ['#err-special']);
  } else {
    await advanceTo('#step-photos', 'step-photos', ['#err-cover']);
  }

  const target = await page.evaluate(() => window._photoCountTarget);
  note(`Photo target: ${target}`);
  await page.setInputFiles('#dz-main input[type=file]', Array.from({ length: target }, () => nextPhoto()));
  await page.waitForFunction(
    () => (typeof _uploadQueue === 'undefined') ? true : (_uploadQueue.length === 0 && !_uploadBusy),
    null, { timeout: 300000 }
  ).catch(() => note('  ⚠ queue-idle wait timed out'));
  note(`  grid: ${await page.$$eval('#photo-grid .photo-thumb', e => e.length)} / ${target}`);
  await shot(page, '01-ready-to-submit.png');

  page.on('request', r => { if (/createUploadSession/.test(r.url())) note('  → createUploadSession fired'); });
  page.on('response', async r => {
    if (/createUploadSession/.test(r.url()) && r.ok()) {
      const j = await r.json().catch(() => null);
      if (j?.orderNumber) { orderNumber = j.orderNumber; note(`  order created: ${orderNumber}`); }
    }
  });

  await page.click('#submit-btn');

  if (REFRESH) {
    // ── P2-10 — refresh mid-upload ──
    note('── P2-10: refresh mid-upload ──');
    // Wait until photos are demonstrably in flight, then reload hard.
    await page.waitForFunction(() => {
      const t = document.getElementById('upload-progress-count');
      return t && /\d/.test(t.textContent || '');
    }, null, { timeout: 120000 }).catch(() => note('  (no progress counter seen)'));
    await page.waitForTimeout(4000);
    const progress = await page.textContent('#upload-progress-count').catch(() => '');
    note(`  progress at refresh: "${(progress || '').trim()}"`);
    await shot(page, '02-mid-upload.png');

    // A beforeunload guard (order-flow-hardening Ch3) should fire here. Playwright
    // auto-dismisses it, which is what a determined customer does too.
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(e => note(`  reload: ${e.message.slice(0, 60)}`));
    await page.waitForTimeout(8000);
    await shot(page, '03-after-refresh.png');

    const bodyTxt = (await page.textContent('body').catch(() => '') || '').replace(/\s+/g, ' ').trim();
    note(`  page after refresh: "${bodyTxt.slice(0, 120)}"`);

    if (!orderNumber) {
      pass('P2-10', 'no order was created before the refresh — nothing stranded');
    } else {
      await new Promise(r => setTimeout(r, 20000));
      const st = await orderState(orderNumber);
      const rawOrder = await getOrder(orderNumber);
      note(`  ${orderNumber}: status=${st?.status} uploadComplete=${rawOrder?.uploadComplete === true}`);
      if (st?.status === 'uploading') {
        finding('S2', 'P2-10', `refresh mid-upload leaves ${orderNumber} stranded at "uploading" with no resume path — a ghost order, exactly the shape of TO-DOS #89/#90. Staff already got the "New Order" email.`);
      } else {
        pass('P2-10', `${orderNumber} settled at "${st?.status}" — not a ghost`);
      }
      note(`  ⚠ CLEANUP: ${orderNumber} is a deliberate test artefact — add to TO-DOS #60/#90.`);
    }

  } else {
    // ── P2-5 + P2-12 — wait for the upload to finish, then check storage + email ──
    note('── waiting for upload to complete ──');
    await page.waitForSelector('#success-order-num', { state: 'visible', timeout: 900000 })
      .catch(() => note('  (no success selector matched — checking Firestore instead)'));
    await page.waitForTimeout(5000);
    await shot(page, '02-success.png');

    if (!orderNumber) {
      const m = (await page.textContent('body').catch(() => '') || '').match(/AEV-\d{3}/);
      orderNumber = m ? m[0] : null;
    }
    if (!orderNumber) { finding('S1', 'P2-5', 'could not determine the order number after submit'); throw new Error('no order number'); }
    note(`Order: ${orderNumber}`);

    // ── P2-5: stored safely? ──
    note('── P2-5: storage + escaping ──');
    const st = await orderState(orderNumber);
    const raw = await getOrder(orderNumber);
    const storedName = raw?.customerName || '';
    note(`  stored customerName length: ${storedName.length}`);
    if (storedName.includes('<script>')) {
      note('  raw <script> IS present in Firestore (fine on its own — escaping is a RENDER concern)');
    }
    if (!/👶|🎉|Ω/.test(JSON.stringify(raw).slice(0, 20000))) {
      finding('S2', 'P2-5', 'emoji / non-ASCII characters did not survive into Firestore — text is being mangled on the way in');
    } else {
      pass('P2-5', 'emoji and non-ASCII survived into Firestore intact');
    }

    // Render check: load the customer preview and see whether the payload executes.
    if (st?.previewToken) {
      const p2 = await ctx.newPage();
      await p2.goto(`${BASE}/customer-preview.html?token=${st.previewToken}`, { waitUntil: 'domcontentloaded' });
      await p2.waitForTimeout(15000);
      const fired = await p2.evaluate(() => window.__XSS_FIRED === 1).catch(() => null);
      if (fired) finding('S1', 'P2-5', 'STORED XSS — the injected payload EXECUTED on customer-preview');
      else pass('P2-5', 'injected script did not execute on customer-preview');
      await p2.screenshot({ path: path.join(RUN_DIR, '03-preview-render.png'), fullPage: true });
      await p2.close();
    }

    // ── P2-12: confirmation email ──
    note('── P2-12: confirmation email ──');
    // getEmails (snapshot), never waitForEmail — the latter long-polls and hangs
    // forever on an inbox that never receives anything (S124 gotcha).
    let mail = null;
    for (let i = 0; i < 20 && !mail; i++) {
      const list = await getEmails({ tag: TAG, sinceTs: submitTs }).catch(() => []);
      mail = (Array.isArray(list) ? list : []).find(m => /confirm/i.test(m.subject || ''));
      if (!mail) await new Promise(r => setTimeout(r, 15000));
    }
    if (!mail) {
      finding('S2', 'P2-12', `no confirmation email for ${orderNumber} within 5 min at ${EMAIL}`);
    } else {
      note(`  subject: "${mail.subject}"`);
      note(`  from: ${mail.from} | reply-to: ${mail.headers?.['reply-to'] || '(none)'}`);
      pass('P2-12', 'confirmation email arrived');
      if (!(mail.subject || '').includes(orderNumber)) {
        finding('S3', 'P2-12', `confirmation subject does not name the order: "${mail.subject}"`);
      }
    }
    note(`  ⚠ CLEANUP: ${orderNumber} is a test order — add to TO-DOS #60.`);
  }

} catch (err) {
  finding('S1', 'HARNESS', `run aborted: ${err.message.slice(0, 200)}`);
  await shot(page, 'ERROR-final.png').catch(() => {});
} finally {
  if (consoleMsgs.length) { note(`Page errors: ${consoleMsgs.length}`); consoleMsgs.slice(0, 8).forEach(m => note(`   ${m}`)); }
  note('');
  note(`═══ RESULT: ${findings.length} finding(s) ═══`);
  findings.forEach(f => note(`  ${f.sev} ${f.id} — ${f.msg}`));
  fs.writeFileSync(path.join(RUN_DIR, 'findings.json'),
    JSON.stringify({ template: TEMPLATE, mode: REFRESH ? 'refresh' : 'text', orderNumber,
                     inbox: EMAIL, ranAt: new Date().toISOString(), findings, consoleMsgs }, null, 2));
  fs.writeFileSync(path.join(RUN_DIR, 'run.log'), log.join('\n'));
  note(`Artefacts → ${RUN_DIR}`);
  await browser.close();
  process.exit(findings.some(f => f.sev === 'S1') ? 1 : 0);
}
