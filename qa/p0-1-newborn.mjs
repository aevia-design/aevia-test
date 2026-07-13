// P0-1 CALIBRATION — Newborn template, full customer order.
// Catalogue: work/pre-launch-qa/case-catalogue_v1.md
//
// Pass criteria (P0-1):
//   a) order submits and returns an AEV-xxx order number
//   b) confirmation email arrives (testmail) with correct sender / reply-to
//   c) the order appears on the staff dashboard (logged in as claude-test@)
//
// Order form is a WIZARD: step1 (details) → step-cover → step-special → step-photos.
// Navigation is advance(); each step validates and refuses to move on if invalid,
// so we call advance() then ASSERT the next step is visible — a silent block is a finding.
//
// Creates a REAL test order on the LIVE dev site (cleaned at the aevia.at migration).
// Run: node qa/p0-1-newborn.mjs

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { address, waitForEmail, extractLinks } from './testmail.mjs';

const BASE = 'https://aevia-test.pages.dev/pages';
const RUN_DIR = path.resolve('sessions/qa-runs', new Date().toISOString().slice(0, 10) + '-p0-1-newborn');
const PHOTO_DIR = path.resolve('qa/test-photos/newborn');
fs.mkdirSync(RUN_DIR, { recursive: true });

const TAG = 'p01nb' + Date.now().toString(36);
const EMAIL = address(TAG);

const env = Object.fromEntries(
  fs.readFileSync(path.resolve('qa/.env'), 'utf8')
    .split('\n').filter(l => l.trim() && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const photos = fs.readdirSync(PHOTO_DIR, { recursive: true })
  .filter(f => /\.jpe?g$/i.test(f)).sort()
  .map(f => path.join(PHOTO_DIR, f));

const log = [], findings = [];
const note = (m) => { const l = `[${new Date().toISOString().slice(11, 19)}] ${m}`; console.log(l); log.push(l); };
const finding = (sev, msg) => { findings.push({ sev, id: 'P0-1', msg }); note(`  ⚠️  ${sev} ${msg}`); };
const shot = async (p, n) => { await p.screenshot({ path: path.join(RUN_DIR, n), fullPage: true }); note(`📸 ${n}`); };

const consoleMsgs = [], netFails = [];

note(`Photos: ${photos.length} | Inbox: ${EMAIL}`);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
page.on('console', m => { if (['error', 'warning'].includes(m.type())) consoleMsgs.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', e => consoleMsgs.push(`pageerror: ${e.message}`));
page.on('requestfailed', r => netFails.push(`${r.failure()?.errorText} ${r.url()}`));
page.on('response', r => { if (r.status() >= 400) netFails.push(`HTTP ${r.status()} ${r.url()}`); });

// advance() validates; if it refuses, surface the step's error message rather than hanging.
const advanceTo = async (expectSel, label, errSels = []) => {
  await page.evaluate(() => advance());
  try {
    await page.waitForSelector(expectSel, { state: 'visible', timeout: 15000 });
    note(`→ ${label}`);
  } catch {
    let msg = '';
    for (const es of errSels) {
      const t = await page.textContent(es).catch(() => '');
      if (t && t.trim()) { msg = t.trim(); break; }
    }
    await shot(page, `ERROR-blocked-${label}.png`).catch(() => {});
    finding('S1', `Blocked advancing to ${label}${msg ? ` — form said: "${msg}"` : ' (no error message shown)'}`);
    throw new Error(`Cannot advance to ${label}`);
  }
};

let orderNumber = null, submitTs = null;

try {
  // ── A. Configurator ───────────────────────────────────────────
  note('── A. Newborn configurator');
  await page.goto(`${BASE}/newborn.html`, { waitUntil: 'networkidle' });
  // Select on data-fp alone (card class differs per template), and dispatch the click
  // on the card itself — a coordinate click can hit .sp-thumb, which stopPropagation()s.
  for (const fp of ['FPintro', 'FPlabour']) await page.$eval(`[data-fp="${fp}"]`, el => el.click());
  const selected = await page.$$eval('.sp-card.on', els => els.map(e => e.dataset.fp));
  note(`Addons on: ${selected.join(', ') || '(none)'}`);
  if (selected.length !== 2) { finding('S1', `Expected 2 addons, got ${selected.length}`); throw new Error('addon select failed'); }
  await shot(page, '01-configurator.png');
  await Promise.all([page.waitForURL('**/order*'), page.click('.cta')]);
  note(`Order form: ${page.url()}`);

  // ── B. Step 1 — details ───────────────────────────────────────
  note('── B. Step 1 (details)');
  await page.waitForSelector('#step1', { state: 'visible' });
  await page.fill('#inp-name', 'QA Newborn');
  await page.fill('#inp-email', EMAIL);
  await page.fill('#album-notes', 'Our daughter Mila, born May 2025. Quiet mornings, first bath, grandparents meeting her. Please keep it tender and calm.');
  await shot(page, '02-step1.png');
  await advanceTo('#step-cover', 'step-cover', ['#err-step1']);

  // ── C. Cover ──────────────────────────────────────────────────
  note('── C. Cover');
  await page.setInputFiles('#dz-cover input[type=file]', photos[0]);
  await page.waitForSelector('#cover-preview', { state: 'visible', timeout: 60000 });
  note('Cover photo uploaded');

  const coverCapIds = await page.$$eval('[id^="cover-cap-"]', els => els.map(e => e.id));
  note(`Cover caption fields: ${coverCapIds.join(', ') || '(none)'}`);
  if (!coverCapIds.length) finding('S2', 'No cover caption fields (#cover-cap-*) rendered');
  const coverText = { name: 'Mila', title: 'Mila', subtitle: 'Our first year', spine: 'Mila 2025', year: '2025' };
  for (const id of coverCapIds) {
    const key = id.replace('cover-cap-', '').toLowerCase();
    const val = coverText[key] ?? 'Mila';
    await page.fill(`#${id}`, val);
    note(`  ${id} = "${val}"`);
  }
  await shot(page, '03-cover.png');
  await advanceTo('#step-special', 'step-special', ['#err-cover']);

  // ── D. Special pages (Intro + Labour) ─────────────────────────
  note('── D. Special pages');
  const introIds = await page.$$eval('[id^="intro-fpintro-"]', els => els.map(e => e.id));
  note(`Intro fields: ${introIds.join(', ') || '(none)'}`);
  if (!introIds.length) finding('S2', 'Intro addon selected but no #intro-fpintro-* fields rendered');
  const introVals = { date: 'May 15th', time: '6:09 a.m.', weight: '3.28 kg', length: '53 cm', gender: 'girl' };
  for (const id of introIds) {
    const key = id.replace('intro-fpintro-', '').toLowerCase();
    await page.fill(`#${id}`, introVals[key] ?? 'Mila');
  }

  // NOTE: there is deliberately NO #labour-name-fplabour input — the baby's name is
  // taken from the cover text typed at the cover step (see order.html renderLabourFields:
  // "no separate field here"). Do not re-add an assertion for it.
  const zodiac = await page.$('#zodiac-fplabour');
  if (zodiac) { await page.selectOption('#zodiac-fplabour', 'Taurus'); note('Zodiac = Taurus'); }
  else finding('S2', '#zodiac-fplabour missing');

  const labourZones = await page.$$eval('[id^="dz-special-fplabour"]', els => els.map(e => e.id));
  note(`Labour photo zones: ${labourZones.join(', ') || '(none)'} (expected 2 per data-photos)`);
  if (labourZones.length !== 2) finding('S2', `Labour declares data-photos=2 but rendered ${labourZones.length} zone(s)`);
  let used = 1;
  for (const zid of labourZones) {
    await page.setInputFiles(`#${zid} input[type=file]`, photos[used]);
    used += 1;
  }
  await page.waitForTimeout(2000);
  await shot(page, '04-special.png');
  await advanceTo('#step-photos', 'step-photos', ['#err-special']);

  // ── E. Main photos ────────────────────────────────────────────
  note('── E. Main photos');
  const target = parseInt(await page.textContent('#photo-count-min'), 10);
  note(`Main photos required: ${target}`);
  if (!Number.isFinite(target) || target < 1) { finding('S2', `#photo-count-min unreadable ("${target}")`); throw new Error('bad target'); }

  const mainSet = photos.slice(used, used + target);
  if (mainSet.length < target) finding('S2', `Only ${mainSet.length} photos left, need ${target}`);
  note(`Uploading ${mainSet.length} main photos…`);
  await page.setInputFiles('#dz-main input[type=file]', mainSet);
  await page.waitForFunction(
    (t) => document.querySelectorAll('#photo-grid .photo-thumb').length >= t,
    target, { timeout: 240000 }
  );
  await page.waitForTimeout(3000);
  note(`Photo count: "${(await page.textContent('#photo-count')).trim()}"`);
  const lowRes = await page.$$eval('#photo-grid .low-res-badge', els => els.length);
  note(`LOW RES badges: ${lowRes}`);
  if (lowRes > 0) finding('S3', `${lowRes} LOW RES badge(s) on 300dpi print-quality originals — likely false positive`);
  await shot(page, '05-photos.png');

  // ── F. Submit ─────────────────────────────────────────────────
  note('── F. Submit (uploading to GCS — slow)');
  submitTs = Date.now();
  await page.click('#submit-btn');

  // A pre-submit confirm modal may intercept ("Submit anyway").
  const proceed = await page.waitForSelector('#confirm-proceed', { state: 'visible', timeout: 5000 }).catch(() => null);
  if (proceed) {
    const modalTxt = await page.textContent('#confirm-modal, .confirm-modal, body').catch(() => '');
    note('Pre-submit confirm modal appeared');
    finding('S3', `Pre-submit confirm modal shown before a valid submit (check why): "${(modalTxt || '').replace(/\s+/g, ' ').slice(0, 160)}"`);
    await shot(page, '06-confirm-modal.png');
    await proceed.click();
  }

  await page.waitForSelector('#success-screen', { state: 'visible', timeout: 600000 });
  const successText = (await page.textContent('#success-order-num')).trim();
  // #success-order-num reads "Order AEV-052" — downstream (email subject, dashboard
  // table) uses the bare code, so match on AEV-nnn only or every check false-negatives.
  orderNumber = (successText.match(/AEV-\d+/i) || [successText])[0];
  note(`✅ ORDER PLACED — ${orderNumber} (screen: "${successText}")`);
  await shot(page, '07-success.png');

} catch (err) {
  note(`❌ ORDER FLOW ERROR: ${err.message}`);
  if (!findings.some(f => f.sev === 'S1')) finding('S1', `Order flow threw: ${err.message}`);
  await shot(page, 'ERROR-order.png').catch(() => {});
}

// ── G. Confirmation email ───────────────────────────────────────
let confirmMail = null;
if (orderNumber) {
  note('── G. Confirmation email');
  try {
    confirmMail = await waitForEmail({ tag: TAG, sinceTs: submitTs - 60000, timeoutMs: 180000 });
    note('✅ EMAIL RECEIVED');
    note(`   subject:  ${confirmMail.subject}`);
    note(`   from:     ${confirmMail.from}`);
    note(`   reply-to: ${confirmMail.headers?.['reply-to'] || confirmMail.reply_to || '(not exposed by API)'}`);
    const hasNum = JSON.stringify(confirmMail).includes(orderNumber);
    note(`   mentions ${orderNumber}: ${hasNum ? 'yes' : 'NO'}`);
    if (!hasNum) finding('S2', `Confirmation email does not mention ${orderNumber}`);
    fs.writeFileSync(path.join(RUN_DIR, 'confirmation-email.html'), confirmMail.html || confirmMail.text || '');
    note(`   links: ${extractLinks(confirmMail).slice(0, 4).join(' | ') || '(none)'}`);
  } catch (e) {
    note(`❌ ${e.message}`);
    finding('S1', `No confirmation email within 180s for ${orderNumber}`);
  }
}

// ── H. Staff dashboard ──────────────────────────────────────────
if (orderNumber) {
  note('── H. Staff dashboard');
  const sp = await ctx.newPage();
  try {
    await sp.goto(`${BASE}/staff/dashboard.html`, { waitUntil: 'networkidle' });
    await sp.fill('#email-input', env.STAFF_TEST_EMAIL);
    await sp.fill('#pwd-input', env.STAFF_TEST_PASSWORD);
    await sp.click('.lock-btn');
    await sp.waitForSelector('#app', { state: 'visible', timeout: 30000 });
    note(`✅ Staff login OK (${env.STAFF_TEST_EMAIL})`);
    await sp.waitForSelector('#orders-body tr', { timeout: 30000 });
    await sp.waitForTimeout(2000);
    const found = await sp.$$eval('#orders-body', (b, n) => b[0]?.innerText.includes(n) ?? false, orderNumber);
    if (found) note(`✅ ${orderNumber} IS on the dashboard`);
    else { finding('S1', `${orderNumber} missing from dashboard`); note(`❌ not on dashboard`); }
    await sp.screenshot({ path: path.join(RUN_DIR, '08-dashboard.png'), fullPage: true });
    note('📸 08-dashboard.png');
  } catch (e) {
    note(`❌ DASHBOARD ERROR: ${e.message}`);
    finding('S1', `Dashboard check failed: ${e.message}`);
    await sp.screenshot({ path: path.join(RUN_DIR, 'ERROR-dashboard.png'), fullPage: true }).catch(() => {});
  }
}

// ── Report ──────────────────────────────────────────────────────
note('');
note('════════ P0-1 RESULT ════════');
note(`Order:    ${orderNumber || 'NOT PLACED'}`);
note(`Email:    ${confirmMail ? 'received' : 'NOT received'}`);
note(`Findings: ${findings.length}`);
findings.forEach(f => note(`  ${f.sev} ${f.msg}`));
if (consoleMsgs.length) { note('--- console ---'); [...new Set(consoleMsgs)].slice(0, 15).forEach(m => note('  ' + m)); } else note('Console: clean 🎉');
if (netFails.length) { note('--- network ---'); [...new Set(netFails)].slice(0, 15).forEach(m => note('  ' + m)); } else note('Network: clean');

fs.writeFileSync(path.join(RUN_DIR, 'run-log.txt'), log.join('\n'));
fs.writeFileSync(path.join(RUN_DIR, 'findings.json'), JSON.stringify({ orderNumber, email: EMAIL, tag: TAG, findings, consoleMsgs: [...new Set(consoleMsgs)], netFails: [...new Set(netFails)] }, null, 2));
note(`Artefacts → ${RUN_DIR}`);

await browser.close();
