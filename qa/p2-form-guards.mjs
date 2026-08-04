// P2 — order-form guards (case-catalogue P2-1, P2-2, P2-3, P2-4)
//
//   node qa/p2-form-guards.mjs [scribble|papercut|newborn|tender] [--headed] [--browser=webkit]
//
// WHY THIS EXISTS
// Four P2 cases are all *pre-submit* form behaviour: too few photos, too many /
// delete mid-upload, a wrong file type, and the low-res badge. None of them needs
// an order to exist. This script drives the real form on the test rig and STOPS
// before a successful submit — so it creates NO order, sends NO email, and writes
// nothing to Firebase or GCS.
//
// The one deliberate exception is P2-1: it *does* click Submit with too few photos,
// because "can't submit incomplete" is the pass criterion. The script watches the
// network for createUploadSession — if that call fires, the guard failed AND a stray
// order now exists, which is reported as S1.
//
// PHOTOS: uses `assets/test photos/DTS_PARENTHOOD` (checked in) rather than
// `qa/test-photos/` (gitignored, absent on a fresh clone), so this runs anywhere.
//
// Artefacts → sessions/qa-runs/<date>-p2-form-guards-<template>/

import { chromium, webkit, devices } from '@playwright/test';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);

// ── Args ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (n) => argv.some(a => a === `--${n}` || a.startsWith(`--${n}=`));
const val = (n, d) => { const a = argv.find(x => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3).replace(/^["']|["']$/g, '') : d; };

const TEMPLATE = argv.find(a => !a.startsWith('--')) || 'scribble';
const BROWSER  = val('browser', 'chromium');
const HEADED   = flag('headed');
const DEVICE   = val('device', '');

// Only the bits that differ per template. Special-page fields are filled generically.
const SPECS = {
  newborn:  { addons: ['FPintro', 'FPlabour'], coverPhoto: true, coverCaps: { name: 'QA', subtitle: 'Guards', spine: 'QA 2026' } },
  scribble: { addons: ['FP1', 'FP2', 'FP3', 'FP4', 'FP5'], coverPhoto: true, coverCaps: { year: '2026', name: 'QA Guards', spineName: 'QA', spineYear: '2026' } },
  papercut: { addons: ['FP1', 'FP2', 'FP3', 'FP4', 'FP5'], coverPhoto: true, coverCaps: { year: '2026', name: 'QA Guards', spineName: 'QA', spineYear: '2026' } },
  tender:   { addons: ['FPintro', 'FPstory', 'FPwords'], coverPhoto: true, coverCaps: { name: 'Anna & Paul', subtitle: 'QA guards', spine: 'Anna & Paul' } },
};
const SPEC = SPECS[TEMPLATE];
if (!SPEC) { console.error(`Usage: node qa/p2-form-guards.mjs <${Object.keys(SPECS).join('|')}>`); process.exit(1); }

const FIELD_VALUES = {
  date: 'May 15th', time: '6:09 a.m.', weight: '3.28 kg', length: '53 cm', gender: 'girl',
  place: 'Vienna', bride: 'Anna', groom: 'Paul',
  meet: 'At a friend’s birthday in Vienna', started: 'Summer 2019',
  words: 'You are our favourite thing.',
};

const BASE = 'https://aevia-test.pages.dev/pages';
const RUN_DIR = path.resolve('sessions/qa-runs', `${new Date().toISOString().slice(0, 10)}-p2-form-guards-${TEMPLATE}`);
const FIX_DIR = path.join(RUN_DIR, 'fixtures');
fs.mkdirSync(FIX_DIR, { recursive: true });

const PHOTO_DIR = path.resolve('assets/test photos/DTS_PARENTHOOD');
const photos = fs.readdirSync(PHOTO_DIR).filter(f => /\.(jpe?g|png)$/i.test(f)).sort()
  .map(f => path.join(PHOTO_DIR, f));
if (!photos.length) { console.error(`No photos in ${PHOTO_DIR}`); process.exit(1); }

const log = [], findings = [];
const note = (m) => { const l = `[${new Date().toISOString().slice(11, 19)}] ${m}`; console.log(l); log.push(l); };
const finding = (sev, id, msg) => { findings.push({ sev, id, template: TEMPLATE, msg }); note(`  ⚠️  ${sev} ${id} ${msg}`); };
const pass = (id, msg) => note(`  ✓ ${id} ${msg}`);
const shot = async (p, n) => { await p.screenshot({ path: path.join(RUN_DIR, n), fullPage: true }); note(`📸 ${n}`); };

let photoIdx = 0;
const nextPhoto = () => photos[photoIdx++ % photos.length];

// ── Fixtures ────────────────────────────────────────────────────────────────
// Built here rather than checked in: a "wrong file type" fixture is by definition
// junk, and a low-res one must be below the form's own 1575px threshold.
function buildFixtures() {
  const fake = path.join(FIX_DIR, 'not-really-a-photo.jpg');
  fs.writeFileSync(fake, 'This is a text file wearing a .jpg extension.\n'.repeat(40));

  const txt = path.join(FIX_DIR, 'shopping-list.txt');
  fs.writeFileSync(txt, 'milk\neggs\nbread\n');

  const pdf = path.join(FIX_DIR, 'receipt.pdf');
  // Smallest structurally-valid PDF; enough for the browser to report application/pdf.
  fs.writeFileSync(pdf, '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');

  // Low-res: the form flags minDim < 1575 (order.html:1744). 900×600 is safely under.
  const sharp = require(path.resolve('scripts/node_modules/sharp'));
  const lowres = path.join(FIX_DIR, 'low-resolution.jpg');
  return sharp(photos[0]).resize(900, 600, { fit: 'cover' }).jpeg({ quality: 80 }).toFile(lowres)
    .then(() => ({ fake, txt, pdf, lowres }));
}

// ── Drive ───────────────────────────────────────────────────────────────────
const fixtures = await buildFixtures();
note(`═══ P2 FORM GUARDS — ${TEMPLATE.toUpperCase()} ═══`);
note(`Photos: ${photos.length} from assets/test photos/DTS_PARENTHOOD`);
note(`Browser: ${BROWSER} | Profile: ${DEVICE || 'desktop 1440×950'}`);
note(`Fixtures: ${Object.values(fixtures).map(f => path.basename(f)).join(', ')}`);

const engine = BROWSER === 'webkit' ? webkit : chromium;
const browser = await engine.launch({ headless: !HEADED });
const ctx = await browser.newContext(DEVICE ? { ...devices[DEVICE] } : { viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();

const consoleMsgs = [], netFails = [];
// The tripwire for P2-1: no successful run of this script may ever create an order.
const orderCalls = [];
page.on('console', m => { if (['error', 'warning'].includes(m.type())) consoleMsgs.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', e => consoleMsgs.push(`pageerror: ${e.message}`));
page.on('requestfailed', r => netFails.push(`${r.failure()?.errorText} ${r.url()}`));
page.on('request', r => { if (/createUploadSession/.test(r.url())) orderCalls.push(r.url()); });

const advanceTo = async (expectSel, label, errSels = []) => {
  await page.evaluate(() => advance());
  try {
    await page.waitForSelector(expectSel, { state: 'visible', timeout: 15000 });
    note(`→ ${label}`);
  } catch {
    let msg = '';
    for (const es of errSels) { const t = await page.textContent(es).catch(() => ''); if (t && t.trim()) { msg = t.trim(); break; } }
    await shot(page, `ERROR-blocked-${label}.png`).catch(() => {});
    throw new Error(`Cannot advance to ${label}${msg ? ` — "${msg}"` : ''}`);
  }
};

// The form drains added files through an async queue (_uploadQueue/_uploadBusy),
// so the grid keeps growing after setInputFiles resolves. Counting mid-drain gives
// a different answer every run — wait for idle before asserting anything.
const waitIdle = async (timeout = 180000) => {
  await page.waitForFunction(
    // NB: _uploadQueue/_uploadBusy are `let` globals in order.html, and let/const
    // do NOT become properties of window — they must be read as bare identifiers.
    () => (typeof _uploadQueue === 'undefined') ? true : (_uploadQueue.length === 0 && !_uploadBusy),
    null, { timeout }
  ).catch(() => note('  ⚠ queue-idle wait timed out'));
  await page.waitForTimeout(300);
};
const gridCount = async () => { await waitIdle(); return page.$$eval('#photo-grid .photo-thumb', els => els.length); };
const lowResBadges = async () => { await waitIdle(); return page.$$eval('#photo-grid .low-res-badge', els => els.length); };

try {
  // ── Configurator → order form ──
  await page.goto(`${BASE}/${TEMPLATE}.html`, { waitUntil: 'domcontentloaded' });
  for (const fp of SPEC.addons) await page.$eval(`[data-fp="${fp}"]`, el => el.click()).catch(() => {});
  await Promise.all([page.waitForURL('**/order*'), page.click('.cta')]);
  await page.waitForSelector('#step1', { state: 'visible' });

  await page.fill('#inp-name', 'QA Form Guards');
  // Deliberately NOT a testmail address: nothing here should ever send mail.
  await page.fill('#inp-email', 'qa-form-guards@example.invalid');
  await advanceTo('#step-cover', 'step-cover', ['#err-step1']);

  if (SPEC.coverPhoto) {
    await page.setInputFiles('#dz-cover input[type=file]', nextPhoto());
    await page.waitForSelector('#cover-preview', { state: 'visible', timeout: 60000 });
  }
  // Discover the caption fields rather than hardcode them — the ids are
  // #cover-cap-<key> and differ per template.
  const coverCapIds = await page.$$eval('[id^="cover-cap-"]', els => els.map(e => e.id));
  note(`Cover caption fields: ${coverCapIds.join(', ') || '(none)'}`);
  for (const id of coverCapIds) {
    const key = id.replace('cover-cap-', '');
    await page.fill(`#${id}`, SPEC.coverCaps[key] ?? 'QA');
  }

  if (SPEC.addons.length) {
    await advanceTo('#step-special', 'step-special', ['#err-cover']);
    const zones = await page.$$eval('[id^="dz-special-"]', els => els.map(e => e.id));
    for (const zid of zones) await page.setInputFiles(`#${zid} input[type=file]`, nextPhoto());
    for (const sid of await page.$$eval('#step-special select', els => els.map(e => e.id))) {
      if (sid.startsWith('country-add-')) continue;
      const opts = await page.$$eval(`#${sid} option`, els => els.map(o => o.value).filter(Boolean));
      if (opts.length) await page.selectOption(`#${sid}`, opts[0]).catch(() => {});
    }
    const fields = await page.$$eval('#step-special input[type=text], #step-special textarea',
      els => els.map(e => ({ id: e.id, cls: e.className })));
    for (const [i, f] of fields.entries()) {
      const key = (f.id.split('-').pop() || '').toLowerCase();
      const v = FIELD_VALUES[key] || (f.cls.includes('itin-line') ? `Day ${i + 1}: Dublin to Galway` : `QA note ${i + 1}`);
      if (f.id) await page.fill(`#${f.id}`, v).catch(() => {});
      else await page.$$eval('#step-special input.itin-line, #step-special input:not([type=file])',
        (els, [n, val]) => { if (els[n]) els[n].value = val; }, [i, v]).catch(() => {});
    }
    // Word-list rows (scribble/papercut FP2 "funny words") have no ids — positional.
    const words = await page.$$('[id^="fp-word-list-"] input');
    for (const [i, w] of words.entries()) await w.fill(['giggle', 'moon', 'again'][i] || 'more');
    if (words.length) note(`  filled ${words.length} funny-word row(s)`);
    await page.waitForTimeout(400);
    await advanceTo('#step-photos', 'step-photos', ['#err-special']);
  } else {
    await advanceTo('#step-photos', 'step-photos', ['#err-cover']);
  }

  const target = await page.evaluate(() => window._photoCountTarget);
  note(`Photo target for ${TEMPLATE}: ${target}`);
  await shot(page, '01-step-photos-empty.png');

  // ── P2-3 — wrong file types ───────────────────────────────────────────────
  // isImage() (order.html:2698) matches on EXTENSION or MIME, so a .txt renamed
  // .jpg passes the guard and only fails later when the browser can't decode it.
  // A real .txt / .pdf should be refused outright.
  note('── P2-3: wrong file type ──');
  const before3 = await gridCount();
  await page.setInputFiles('#dz-main input[type=file]', [fixtures.txt, fixtures.pdf]);
  await page.waitForTimeout(1500);
  const after3 = await gridCount();
  if (after3 > before3) {
    finding('S2', 'P2-3', `.txt and .pdf were ACCEPTED into the grid (${after3 - before3} tiles added) — a non-image reaches the upload`);
  } else {
    pass('P2-3', 'plain .txt and .pdf rejected — grid unchanged');
  }
  const err3 = await page.textContent('#err-step2').catch(() => '');
  note(`  form message: ${err3 && err3.trim() ? `"${err3.trim()}"` : '(none shown)'}`);
  if (after3 === before3 && !(err3 && err3.trim())) {
    finding('S3', 'P2-3', 'files were silently dropped with no message — the customer is not told why nothing appeared');
  }

  const before3b = await gridCount();
  await page.setInputFiles('#dz-main input[type=file]', [fixtures.fake]);
  await page.waitForTimeout(1500);
  const after3b = await gridCount();
  if (after3b > before3b) {
    finding('S2', 'P2-3', 'a text file renamed .jpg was accepted — isImage() trusts the extension, so undecodable junk enters the order');
  } else {
    pass('P2-3', 'text file renamed .jpg was rejected');
  }
  await shot(page, '02-p2-3-wrong-types.png');

  // Clear the grid so the later counts start clean.
  await page.evaluate(() => { while (document.querySelectorAll('#photo-grid .photo-thumb').length) removeMainFile(0); });
  await page.waitForTimeout(500);
  note(`  grid cleared → ${await gridCount()}`);

  // ── P2-4 — low-res badge, and does it survive delete/re-add ───────────────
  note('── P2-4: low-res badge ──');
  await page.setInputFiles('#dz-main input[type=file]', [fixtures.lowres, nextPhoto()]);
  await page.waitForTimeout(2500);
  const badges1 = await lowResBadges();
  if (badges1 === 1) pass('P2-4', 'low-res badge shown on the 900×600 file (and not on the full-size one)');
  else finding('S2', 'P2-4', `expected exactly 1 low-res badge, saw ${badges1} (threshold is minDim < 1575)`);
  await shot(page, '03-p2-4-lowres-badge.png');

  // Persistence: remove everything, re-add the same low-res file.
  await page.evaluate(() => { while (document.querySelectorAll('#photo-grid .photo-thumb').length) removeMainFile(0); });
  await page.waitForTimeout(400);
  await page.setInputFiles('#dz-main input[type=file]', [fixtures.lowres]);
  await page.waitForTimeout(2000);
  const badges2 = await lowResBadges();
  if (badges2 === 1) pass('P2-4', 'badge persists after delete + re-add');
  else finding('S2', 'P2-4', `badge did NOT persist after delete + re-add (saw ${badges2}) — the resolution check does not re-run`);
  await shot(page, '04-p2-4-lowres-reradd.png');

  await page.evaluate(() => { while (document.querySelectorAll('#photo-grid .photo-thumb').length) removeMainFile(0); });
  await page.waitForTimeout(400);

  // ── P2-1 — too few photos, then try to submit ────────────────────────────
  // The only place this script clicks Submit. Pass = blocked with clear guidance
  // AND no createUploadSession call.
  note('── P2-1: too few photos ──');
  const few = Array.from({ length: Math.max(1, target - 1) }, () => nextPhoto());
  await page.setInputFiles('#dz-main input[type=file]', few);
  await page.waitForFunction(t => document.querySelectorAll('#photo-grid .photo-thumb').length >= t,
    few.length, { timeout: 180000 }).catch(() => {});
  const have = await gridCount();
  note(`  uploaded ${have} of ${target} required`);
  await shot(page, '05-p2-1-too-few.png');

  const btnState = await page.$eval('#submit-btn', el => ({ disabled: el.disabled, text: el.textContent.trim() })).catch(() => null);
  note(`  submit button: ${btnState ? `disabled=${btnState.disabled} "${btnState.text}"` : '(not found)'}`);

  const callsBefore = orderCalls.length;
  await page.click('#submit-btn').catch(e => note(`  submit click refused: ${e.message.slice(0, 80)}`));
  await page.waitForTimeout(4000);
  const errText = (await page.textContent('#err-step2').catch(() => '') || '').trim();
  const created = orderCalls.length > callsBefore;

  if (created) {
    finding('S1', 'P2-1', `SUBMIT WENT THROOUGH with ${have}/${target} photos — createUploadSession was called, so an incomplete order now exists in Firestore`);
  } else if (errText) {
    pass('P2-1', `blocked with a message: "${errText}"`);
  } else {
    finding('S2', 'P2-1', 'submit did not create an order (good) but NO message was shown — the customer is stuck with no explanation');
  }
  await shot(page, '06-p2-1-submit-blocked.png');

  // ── P2-2 — too many, and delete mid-upload ───────────────────────────────
  note('── P2-2: too many photos + delete ──');
  const extra = Array.from({ length: 5 }, () => nextPhoto());
  await page.setInputFiles('#dz-main input[type=file]', extra);
  await page.waitForTimeout(3000);
  const over = await gridCount();
  note(`  grid now ${over} (target ${target})`);
  if (over > target) pass('P2-2', `accepts more than the target without breaking (${over} > ${target})`);

  const counterText = (await page.textContent('#photo-count').catch(() => '') || '').trim();
  note(`  counter reads: ${counterText || '(empty)'}`);

  // Delete three from the middle — the classic index-shifting bug.
  await page.evaluate(() => { removeMainFile(2); removeMainFile(2); removeMainFile(2); });
  await page.waitForTimeout(1200);
  const afterDel = await gridCount();
  if (afterDel === over - 3) pass('P2-2', `deleting 3 from the middle left exactly ${afterDel} tiles — indices re-based correctly`);
  else finding('S2', 'P2-2', `deleted 3 from a grid of ${over} but ${afterDel} tiles remain (expected ${over - 3}) — index handling is off`);

  // Drop zone must still work after deletes.
  const beforeReadd = await gridCount();
  await page.setInputFiles('#dz-main input[type=file]', [nextPhoto()]);
  await page.waitForTimeout(2000);
  const afterReadd = await gridCount();
  if (afterReadd === beforeReadd + 1) pass('P2-2', 'drop zone still usable after deletes');
  else finding('S2', 'P2-2', `drop zone broken after deletes: ${beforeReadd} → ${afterReadd} on adding 1`);
  await shot(page, '07-p2-2-after-delete.png');

} catch (err) {
  finding('S1', 'HARNESS', `run aborted: ${err.message}`);
  await shot(page, 'ERROR-final.png').catch(() => {});
} finally {
  // Hard invariant: this script must never leave an order behind.
  if (orderCalls.length) {
    finding('S1', 'P2', `createUploadSession was called ${orderCalls.length}× — a real order was created. Clean up (TO-DOS #60).`);
  } else {
    note('✓ No order created — createUploadSession never fired.');
  }

  if (consoleMsgs.length) { note(`Console errors/warnings: ${consoleMsgs.length}`); consoleMsgs.slice(0, 15).forEach(m => note(`   ${m}`)); }
  if (netFails.length)    { note(`Network failures: ${netFails.length}`); netFails.slice(0, 15).forEach(m => note(`   ${m}`)); }

  note('');
  note(`═══ RESULT: ${findings.length} finding(s) ═══`);
  findings.forEach(f => note(`  ${f.sev} ${f.id} — ${f.msg}`));

  fs.writeFileSync(path.join(RUN_DIR, 'findings.json'),
    JSON.stringify({ template: TEMPLATE, browser: BROWSER, device: DEVICE || 'desktop',
                     ranAt: new Date().toISOString(), orderCreated: orderCalls.length > 0,
                     findings, consoleMsgs, netFails }, null, 2));
  fs.writeFileSync(path.join(RUN_DIR, 'run.log'), log.join('\n'));
  note(`Artefacts → ${RUN_DIR}`);

  await browser.close();
  process.exit(findings.some(f => f.sev === 'S1') ? 1 : 0);
}
