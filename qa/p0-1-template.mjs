// P0-1 — full customer order, ANY template.  Run: node qa/p0-1-template.mjs <template>
// Catalogue: work/pre-launch-qa/case-catalogue_v1.md
//
// Pass criteria (P0-1):
//   a) order submits and returns an AEV-xxx order number
//   b) confirmation email arrives (testmail) with correct sender
//   c) the order appears on the staff dashboard (logged in as claude-test@)
//
// Creates a REAL test order on the LIVE dev site (cleaned at the aevia.at migration).
//
// Wizard: step1 → step-cover → [step-special] → step-photos.  step-special is OMITTED
// when no add-ons are picked, and its fields do not exist until advance() leaves step1.
// Every step validates and refuses to move on, so we advance() then ASSERT the next
// step is visible — a silent block is a finding.

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { address, waitForEmail, extractLinks } from './testmail.mjs';

const TEMPLATE = (process.argv[2] || '').toLowerCase();

// Per-template spec.  Only what genuinely differs: the configurator page, the photo
// library, which add-ons to select, and the cover captions (keys differ per template).
// Special-page fields are filled generically — see fillSpecial().
const SPECS = {
  newborn: {
    photoDir: 'newborn',
    addons: ['FPintro', 'FPlabour'],
    coverPhoto: true,
    coverCaps: { name: 'Mila', subtitle: 'Our first year', spine: 'Mila 2025' },
  },
  wander: {
    photoDir: 'wander',
    addons: ['FP1'],
    coverPhoto: false, // wander has cover.slots: [] — #dz-cover is never rendered
    coverCaps: { front: 'Ireland 2026', spine: 'Ireland 2026' },
  },
  scribble: {
    photoDir: 'scribble-papercut',
    addons: ['FP1', 'FP2', 'FP3', 'FP4', 'FP5'],
    coverPhoto: true,
    coverCaps: { year: '2026', name: 'Our sweet Ann', spineName: 'Ann', spineYear: '2026' },
  },
  papercut: {
    photoDir: 'scribble-papercut',
    addons: ['FP1', 'FP2', 'FP3', 'FP4', 'FP5'],
    coverPhoto: true,
    coverCaps: { year: '2026', name: 'Our sweet Ann', spineName: 'Ann', spineYear: '2026' },
  },
  tender: {
    photoDir: 'tender',
    addons: ['FPintro', 'FPstory', 'FPwords'],
    coverPhoto: true,
    coverCaps: { name: 'Anna & Paul', subtitle: 'Our wedding day', spine: 'Anna & Paul' },
  },
};

const SPEC = SPECS[TEMPLATE];
if (!SPEC) {
  console.error(`Usage: node qa/p0-1-template.mjs <${Object.keys(SPECS).join('|')}>`);
  process.exit(1);
}

// Values for special-page inputs, keyed by the trailing segment of the element id
// (#intro-fpintro-date → "date").  Anything unrecognised gets a generic string.
const FIELD_VALUES = {
  date: 'May 15th', time: '6:09 a.m.', weight: '3.28 kg', length: '53 cm', gender: 'girl',
  place: 'Vienna', bride: 'Anna', groom: 'Paul',
  meet: 'At a friend’s birthday in Vienna', started: 'Summer 2019',
  words: 'You are our favourite thing.',
};

const BASE = 'https://aevia-test.pages.dev/pages';
const RUN_DIR = path.resolve('sessions/qa-runs', `${new Date().toISOString().slice(0, 10)}-p0-1-${TEMPLATE}`);
const PHOTO_DIR = path.resolve('qa/test-photos', SPEC.photoDir);
fs.mkdirSync(RUN_DIR, { recursive: true });

// QA_TAG lets a caller pin the testmail tag (= the customer email) instead of getting a
// fresh one. The P1 promo track needs TWO orders from the SAME referee email to exercise
// the first_time_transaction guard, so it passes QA_TAG=<same tag> to both runs.
const TAG = process.env.QA_TAG || ('p01' + TEMPLATE.slice(0, 3) + Date.now().toString(36));
const EMAIL = address(TAG);

const env = Object.fromEntries(
  fs.readFileSync(path.resolve('qa/.env'), 'utf8')
    .split('\n').filter(l => l.trim() && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

// Libraries are a mix of JPG and PNG; the form accepts .jpg/.jpeg/.png/.heic, so take
// both. A jpg-only glob leaves every template except newborn short of its photo target.
const photos = fs.readdirSync(PHOTO_DIR, { recursive: true })
  .filter(f => /\.(jpe?g|png)$/i.test(f)).sort()
  .map(f => path.join(PHOTO_DIR, f));

const log = [], findings = [];
const note = (m) => { const l = `[${new Date().toISOString().slice(11, 19)}] ${m}`; console.log(l); log.push(l); };
const finding = (sev, msg) => { findings.push({ sev, id: 'P0-1', template: TEMPLATE, msg }); note(`  ⚠️  ${sev} ${msg}`); };
const shot = async (p, n) => { await p.screenshot({ path: path.join(RUN_DIR, n), fullPage: true }); note(`📸 ${n}`); };

const consoleMsgs = [], netFails = [];
let photoIdx = 0;
const nextPhoto = () => photos[photoIdx++];

note(`═══ P0-1 ${TEMPLATE.toUpperCase()} ═══`);
note(`Photos: ${photos.length} in ${SPEC.photoDir} | Inbox: ${EMAIL}`);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
page.on('console', m => { if (['error', 'warning'].includes(m.type())) consoleMsgs.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', e => consoleMsgs.push(`pageerror: ${e.message}`));
page.on('requestfailed', r => netFails.push(`${r.failure()?.errorText} ${r.url()}`));
page.on('response', r => { if (r.status() >= 400) netFails.push(`HTTP ${r.status()} ${r.url()}`); });

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

// Fills whatever step-special rendered, without hard-coding each template's fields:
// one photo per drop zone, a real option for every select, a sensible string for
// every text input / textarea.  Country selects need a synthetic "touched" flag —
// onCountryPick() rejects any change that wasn't preceded by a real pointer/key event
// (an anti-Chrome-autofill guard), so selectOption() alone silently does nothing.
const fillSpecial = async () => {
  const zones = await page.$$eval('[id^="dz-special-"]', els => els.map(e => e.id));
  note(`Photo zones: ${zones.join(', ') || '(none)'}`);
  for (const zid of zones) await page.setInputFiles(`#${zid} input[type=file]`, nextPhoto());

  for (const sid of await page.$$eval('#step-special select', els => els.map(e => e.id))) {
    if (sid.startsWith('country-add-')) {
      await page.$eval(`#${sid}`, el => { el.dataset.touched = '1'; });
      const country = await page.$eval(`#${sid}`, el =>
        [...el.options].find(o => o.value && o.value !== 'None')?.value || '');
      await page.selectOption(`#${sid}`, country);
      await page.waitForTimeout(500);
      const tags = await page.$$eval('[id^="country-tags-"] *', els => els.length).catch(() => 0);
      note(`  ${sid} = "${country}" (${tags ? 'tag rendered' : 'NO tag rendered'})`);
      if (!tags) finding('S2', `Country "${country}" selected but no tag rendered — map may be empty`);
    } else {
      const opt = await page.$eval(`#${sid}`, el =>
        [...el.options].find(o => o.value && o.value !== 'None')?.value || '');
      if (opt) { await page.selectOption(`#${sid}`, opt); note(`  ${sid} = "${opt}"`); }
    }
  }

  const fields = await page.$$eval('#step-special input[type=text], #step-special textarea',
    els => els.map(e => ({ id: e.id, cls: e.className })));
  for (const [i, f] of fields.entries()) {
    const key = (f.id.split('-').pop() || '').toLowerCase();
    const val = FIELD_VALUES[key] || (f.cls.includes('itin-line') ? `Day ${i + 1}: Dublin to Galway` : `QA note ${i + 1}`);
    const sel = f.id ? `#${f.id}` : null;
    if (sel) await page.fill(sel, val);
    else await page.$$eval('#step-special input.itin-line, #step-special input:not([type=file])',
      (els, [n, v]) => { if (els[n]) els[n].value = v; }, [i, val]);
  }
  note(`Filled ${fields.length} special text field(s)`);
  // Word-list rows (scribble/papercut FP2) have no ids — fill them positionally.
  const words = await page.$$('[id^="fp-word-list-"] input');
  for (const [i, w] of words.entries()) await w.fill(['giggle', 'moon', 'again'][i] || 'more');
  if (words.length) note(`Filled ${words.length} funny-word row(s)`);
};

let orderNumber = null, submitTs = null;

try {
  // ── A. Configurator ───────────────────────────────────────────
  note(`── A. ${TEMPLATE} configurator`);
  await page.goto(`${BASE}/${TEMPLATE}.html`, { waitUntil: 'networkidle' });
  // Every template uses .sp-card (the old "scribble uses .addon" note was wrong).
  // Click the CARD element — a coordinate click can land on .sp-thumb, which
  // stopPropagation()s and only opens the image preview.
  for (const fp of SPEC.addons) await page.$eval(`[data-fp="${fp}"]`, el => el.click());
  const selected = await page.$$eval('.sp-card.on', els => els.map(e => e.dataset.fp));
  note(`Addons on: ${selected.join(', ') || '(none)'}`);
  if (selected.length !== SPEC.addons.length) {
    finding('S1', `Expected ${SPEC.addons.length} addons, got ${selected.length}`);
    throw new Error('addon select failed');
  }
  await shot(page, '01-configurator.png');
  await Promise.all([page.waitForURL('**/order*'), page.click('.cta')]);
  note(`Order form: ${page.url()}`);

  // ── B. Step 1 — details ───────────────────────────────────────
  note('── B. Step 1 (details)');
  await page.waitForSelector('#step1', { state: 'visible' });
  await page.fill('#inp-name', `QA ${TEMPLATE}`);
  await page.fill('#inp-email', EMAIL);
  await page.fill('#album-notes', 'Automated pre-launch QA order. Please keep it warm and simple.');
  await shot(page, '02-step1.png');
  await advanceTo('#step-cover', 'step-cover', ['#err-step1']);

  // ── C. Cover ──────────────────────────────────────────────────
  note('── C. Cover');
  if (SPEC.coverPhoto) {
    await page.setInputFiles('#dz-cover input[type=file]', nextPhoto());
    await page.waitForSelector('#cover-preview', { state: 'visible', timeout: 60000 });
    note('Cover photo uploaded');
  } else {
    const dz = await page.$('#dz-cover');
    note(`No cover photo expected — #dz-cover ${dz ? 'IS PRESENT (unexpected)' : 'absent ✓'}`);
    if (dz) finding('S3', 'Template declares no cover slots but #dz-cover still rendered');
  }

  const coverCapIds = await page.$$eval('[id^="cover-cap-"]', els => els.map(e => e.id));
  note(`Cover caption fields: ${coverCapIds.join(', ') || '(none)'}`);
  if (!coverCapIds.length) finding('S2', 'No cover caption fields (#cover-cap-*) rendered');
  for (const id of coverCapIds) {
    const key = id.replace('cover-cap-', '');
    const val = SPEC.coverCaps[key];
    if (val === undefined) { finding('S3', `Unexpected cover caption field #${id} (not in spec)`); continue; }
    await page.fill(`#${id}`, val);
    // Read back: a caption whose maxLength is shorter than its own label implies
    // silently truncates the customer's text.
    const got = await page.inputValue(`#${id}`);
    const meta = await page.$eval(`#${id}`, el => ({ max: el.maxLength, ph: el.placeholder }));
    note(`  ${id} = "${got}"${got !== val ? ` ⚠️ TRUNCATED from "${val}"` : ''} (maxLength=${meta.max}, placeholder="${meta.ph}")`);
    if (got !== val) {
      finding('S2', `Cover field #${id} silently truncated "${val}" → "${got}" (maxLength=${meta.max}, placeholder="${meta.ph}") — label and maxLength disagree`);
    }
  }
  await shot(page, '03-cover.png');

  // ── D. Special pages ──────────────────────────────────────────
  const hasSpecial = SPEC.addons.length > 0;
  if (hasSpecial) {
    await advanceTo('#step-special', 'step-special', ['#err-cover']);
    note('── D. Special pages');
    await fillSpecial();
    await page.waitForTimeout(2000);
    await shot(page, '04-special.png');
    await advanceTo('#step-photos', 'step-photos', ['#err-special']);
  } else {
    await advanceTo('#step-photos', 'step-photos', ['#err-cover']);
  }

  // ── E. Main photos ────────────────────────────────────────────
  note('── E. Main photos');
  const target = parseInt(await page.textContent('#photo-count-min'), 10);
  note(`Main photos required: ${target}`);
  if (!Number.isFinite(target) || target < 1) { finding('S2', `#photo-count-min unreadable ("${target}")`); throw new Error('bad target'); }

  const mainSet = photos.slice(photoIdx, photoIdx + target);
  if (mainSet.length < target) finding('S1', `Only ${mainSet.length} photos left in ${SPEC.photoDir}, need ${target}`);
  note(`Uploading ${mainSet.length} main photos…`);
  await page.setInputFiles('#dz-main input[type=file]', mainSet);
  await page.waitForFunction(
    (t) => document.querySelectorAll('#photo-grid .photo-thumb').length >= t,
    target, { timeout: 240000 }
  );
  await page.waitForTimeout(3000);
  note(`Photo count: "${(await page.textContent('#photo-count')).trim()}"`);
  // Informational, not a finding: several libraries genuinely contain upscaled images
  // whose shortest side is under the ~1575px print threshold, so badges are EXPECTED
  // there. A false positive would show as badges on a library known to be all-300dpi
  // (newborn scores 0). Deliberate low-res behaviour is covered by P2-4.
  const lowRes = await page.$$eval('#photo-grid .low-res-badge', els => els.length);
  note(`LOW RES badges: ${lowRes} of ${target} (expected >0 on libraries with upscaled sources)`);
  await shot(page, '05-photos.png');

  // ── F. Submit ─────────────────────────────────────────────────
  note('── F. Submit (uploading to GCS — slow)');
  submitTs = Date.now();
  await page.click('#submit-btn');

  // preSubmitConfirm() (order.html:2498) opens only when collectSubmitWarnings() returns
  // issues: a cover-orientation mismatch, or low-res photos (counted across cover +
  // special + main, so it can fire with zero badges in the main grid). BOTH are expected
  // here — the harness picks an arbitrary cover photo, so orientation often mismatches.
  // Only a modal with nothing listed is a genuine defect.
  const proceed = await page.waitForSelector('#confirm-proceed', { state: 'visible', timeout: 5000 }).catch(() => null);
  if (proceed) {
    const issues = await page.$$eval('#confirm-list li', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
    note(`Pre-submit warning modal: ${issues.length ? issues.join(' | ') : '(NO issues listed)'}`);
    if (!issues.length) finding('S2', 'Pre-submit modal opened with no warning listed');
    await shot(page, '06-confirm-modal.png');
    await proceed.click();
  }

  await page.waitForSelector('#success-screen', { state: 'visible', timeout: 600000 });
  const successText = (await page.textContent('#success-order-num')).trim();
  // #success-order-num reads "Order AEV-053"; email + dashboard use the bare code.
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
    note(`   subject: ${confirmMail.subject}`);
    note(`   from:    ${confirmMail.from}`);
    const hasNum = JSON.stringify(confirmMail).includes(orderNumber);
    note(`   mentions ${orderNumber}: ${hasNum ? 'yes' : 'NO'}`);
    if (!hasNum) finding('S2', `Confirmation email does not mention ${orderNumber}`);
    fs.writeFileSync(path.join(RUN_DIR, 'confirmation-email.html'), confirmMail.html || confirmMail.text || '');
    note(`   links: ${extractLinks(confirmMail).slice(0, 2).join(' | ') || '(none)'}`);
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
    else { finding('S1', `${orderNumber} missing from dashboard`); note('❌ not on dashboard'); }
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
note(`════════ P0-1 ${TEMPLATE.toUpperCase()} RESULT ════════`);
note(`Order:    ${orderNumber || 'NOT PLACED'}`);
note(`Email:    ${confirmMail ? 'received' : 'NOT received'}`);
note(`Findings: ${findings.length}`);
findings.forEach(f => note(`  ${f.sev} ${f.msg}`));
if (consoleMsgs.length) { note('--- console ---'); [...new Set(consoleMsgs)].slice(0, 10).forEach(m => note('  ' + m)); } else note('Console: clean 🎉');
const aborts = netFails.filter(f => f.includes('ERR_ABORTED')).length;
const otherFails = [...new Set(netFails.filter(f => !f.includes('ERR_ABORTED')))];
note(`Network: ${aborts} benign GCS aborts (retried), ${otherFails.length} other`);
otherFails.slice(0, 10).forEach(m => note('  ' + m));

fs.writeFileSync(path.join(RUN_DIR, 'run-log.txt'), log.join('\n'));
fs.writeFileSync(path.join(RUN_DIR, 'findings.json'), JSON.stringify(
  { template: TEMPLATE, orderNumber, email: EMAIL, tag: TAG, findings, gcsAborts: aborts, otherNetFails: otherFails, consoleMsgs: [...new Set(consoleMsgs)] }, null, 2));
note(`Artefacts → ${RUN_DIR}`);

await browser.close();
process.exit(findings.some(f => f.sev === 'S1') ? 1 : 0);
