// P2 — upload transport probe (TO-DOS #88, docs/briefs/upload-failures.md)
//
//   node qa/p2-upload-probe.mjs <papercut|scribble|wander> [flags]
//
// WHY THIS EXISTS
// Every recorded upload failure was Safari/macOS. Every QA script we have runs
// headless Chromium. We have never tested the browser where the bug happens.
// This probe defaults to WebKit — the engine Safari is built on — and records
// per-request status + timing for every GCS PUT so a stall leaves evidence.
//
// It tests the two live hypotheses:
//   H1 (duplicate source photo)  --reuse pins ONE photo into cover + every
//        special zone + the main pool, mirroring Xenia's test set. Control:
//        --distinct, where every slot gets its own file.
//   H2 (decorative retry)        --throttle slows the link so the ~50 benign
//        ERR_ABORTEDs seen on a fast link have a chance to exhaust the
//        3 × (100ms, 200ms) retry.
//
// Like every other order-minting script here, a run creates a REAL order and the
// normal emails go out (staff "New Order" from createUploadSession, then the
// customer confirmation). Standard QA behaviour — nothing is suppressed.
//
// FLAGS
//   --browser=webkit|chromium   default webkit
//   --device="iPhone 13"        phone profile; with webkit this is the closest we
//                               get to the real failing setup (iPhone Safari)
//   --reuse | --distinct        photo assignment, default --reuse
//   --throttle[=slow3g|fast3g]  approximate link throttling, default off
//   --dry-run                   drive the form but stop before submit (no order,
//                               no email) — for checking the harness itself
//   --headed                    watch it run
//
// Artefacts → sessions/qa-runs/<date>-p2-upload-<template>-<browser>-<mode>/
// A live run's server-side record is read back separately:
//   node scripts/inspect-upload-failure.js AEV-0nn

import { chromium, webkit, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { address } from './testmail.mjs';

// ── Args ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (n) => argv.some(a => a === `--${n}` || a.startsWith(`--${n}=`));
const val = (n, d) => { const a = argv.find(x => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3).replace(/^["']|["']$/g, '') : d; };

const TEMPLATE = (argv.find(a => !a.startsWith('--')) || 'papercut').toLowerCase();
const BROWSER = val('browser', 'webkit');
const DEVICE = val('device', null);
if (DEVICE && !devices[DEVICE]) { console.error(`Unknown device "${DEVICE}"`); process.exit(1); }
const REUSE = !flag('distinct');
const THROTTLE = flag('throttle') ? val('throttle', 'slow3g') : null;
const DRY = flag('dry-run');
const HEADED = flag('headed');

// Papercut carries the fp4 signature (3 failures / 1 success). Scribble is its
// structural twin and succeeded, so it is the natural control template. Wander
// is the AEV-067 shape — a trailing block, no cover photo.
const SPECS = {
  papercut: { photoDir: 'scribble-papercut', addons: ['FP1','FP2','FP3','FP4','FP5'], coverPhoto: true,
              coverCaps: { year:'2026', name:'Our sweet Ann', spineName:'Ann', spineYear:'2026' } },
  scribble: { photoDir: 'scribble-papercut', addons: ['FP1','FP2','FP3','FP4','FP5'], coverPhoto: true,
              coverCaps: { year:'2026', name:'Our sweet Ann', spineName:'Ann', spineYear:'2026' } },
  wander:   { photoDir: 'wander', addons: ['FP1'], coverPhoto: false,
              coverCaps: { front:'Ireland 2026', spine:'Ireland 2026' } },
};
const SPEC = SPECS[TEMPLATE];
if (!SPEC) { console.error(`Usage: node qa/p2-upload-probe.mjs <${Object.keys(SPECS).join('|')}> [flags]`); process.exit(1); }

const FIELD_VALUES = {
  date:'May 15th', time:'6:09 a.m.', weight:'3.28 kg', length:'53 cm', gender:'girl',
  place:'Vienna', bride:'Anna', groom:'Paul',
  meet:'At a friend’s birthday in Vienna', started:'Summer 2019',
  words:'You are our favourite thing.',
};

const BASE = 'https://aevia-test.pages.dev/pages';
const MODE = `${REUSE ? 'reuse' : 'distinct'}${DEVICE ? '-' + DEVICE.replace(/\s+/g, '') : ''}${THROTTLE ? '-' + THROTTLE : ''}${DRY ? '-dry' : ''}`;
const RUN_DIR = path.resolve('sessions/qa-runs', `${new Date().toISOString().slice(0,10)}-p2-upload-${TEMPLATE}-${BROWSER}-${MODE}`);
const PHOTO_DIR = path.resolve('qa/test-photos', SPEC.photoDir);
fs.mkdirSync(RUN_DIR, { recursive: true });

const TAG = process.env.QA_TAG || ('p2up' + Date.now().toString(36));
const EMAIL = address(TAG);

const photos = fs.readdirSync(PHOTO_DIR, { recursive: true })
  .filter(f => /\.(jpe?g|png)$/i.test(f)).sort()
  .map(f => path.join(PHOTO_DIR, f));

// H1's pinned photo. Xenia's set reuses one source across cover/special/pool, so
// --reuse hands the SAME PATH to several file inputs. Each input still yields its
// own File object — exactly as it does when a human picks one photo in several
// pickers — so this reproduces the real-world condition, not a synthetic one.
const PINNED = photos[0];

const log = [], findings = [];
const note = (m) => { const l = `[${new Date().toISOString().slice(11,19)}] ${m}`; console.log(l); log.push(l); };
const finding = (sev, msg) => { findings.push({ sev, id:'P2-upload', template:TEMPLATE, browser:BROWSER, mode:MODE, msg }); note(`  ⚠️  ${sev} ${msg}`); };
const shot = async (p, n) => { await p.screenshot({ path: path.join(RUN_DIR, n), fullPage: true }).catch(()=>{}); note(`📸 ${n}`); };

// ── GCS PUT ledger — the point of this probe ────────────────────────────────
// Every signed-URL PUT is recorded with its outcome and duration. A stall shows
// as a long-running entry that never resolves; a refusal shows as a status.
const puts = new Map();          // url → record
const objName = (u) => { try { return decodeURIComponent(new URL(u).pathname.split('/').slice(3).join('/')) || u; } catch { return u; } };
const isPut = (r) => r.method() === 'PUT' && /storage\.googleapis\.com|storage\.cloud\.google/.test(r.url());

const consoleMsgs = [];
let photoIdx = 0;
const nextPhoto = () => REUSE ? PINNED : photos[photoIdx++];

note(`═══ P2 UPLOAD PROBE — ${TEMPLATE.toUpperCase()} / ${BROWSER} / ${MODE} ═══`);
note(`Photos available: ${photos.length} in ${SPEC.photoDir}`);
note(`Mode: ${REUSE ? `REUSE — pinning ${path.basename(PINNED)} into cover + every special zone + pool` : 'DISTINCT — every slot its own file (control)'}`);
note(THROTTLE ? `Throttle: ${THROTTLE} (approximate)` : 'Throttle: off');
note(DRY ? 'DRY RUN — stops before submit; no order, no email' : 'Full run — places a real order; the usual staff + customer emails go out');

const engine = BROWSER === 'chromium' ? chromium : webkit;
const browser = await engine.launch({ headless: !HEADED });
const ctx = await browser.newContext(DEVICE ? { ...devices[DEVICE] } : { viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();

page.on('console', m => { if (['error','warning'].includes(m.type())) consoleMsgs.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', e => consoleMsgs.push(`pageerror: ${e.message}`));

page.on('request', r => { if (isPut(r)) puts.set(r.url(), { name: objName(r.url()), t0: Date.now(), status: null, ms: null, outcome: 'in-flight', err: null }); });
page.on('response', async r => {
  if (!isPut(r.request())) return;
  const rec = puts.get(r.url()); if (!rec) return;
  rec.status = r.status(); rec.ms = Date.now() - rec.t0;
  rec.outcome = r.status() < 400 ? 'ok' : 'http-error';
});
page.on('requestfailed', r => {
  if (!isPut(r)) return;
  const rec = puts.get(r.url()); if (!rec) return;
  rec.ms = Date.now() - rec.t0;
  rec.err = r.failure()?.errorText || 'unknown';
  rec.outcome = /abort/i.test(rec.err) ? 'aborted' : 'failed';
});

// Throttling. Chromium gets real CDP conditions; WebKit has no equivalent, so we
// approximate by delaying each GCS PUT. It reproduces slowness, NOT the packet-level
// behaviour of a bad mobile link — treat a WebKit throttle result as indicative.
const PROFILES = { slow3g: { down: 400*1024/8, up: 400*1024/8, lat: 400 }, fast3g: { down: 1.6*1024*1024/8, up: 750*1024/8, lat: 150 } };
if (THROTTLE) {
  const p = PROFILES[THROTTLE] || PROFILES.slow3g;
  if (BROWSER === 'chromium') {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline:false, latency:p.lat, downloadThroughput:p.down, uploadThroughput:p.up });
    note(`CDP throttle applied (${THROTTLE})`);
  } else {
    await ctx.route(/storage\.googleapis\.com/, async (route) => { await new Promise(r => setTimeout(r, p.lat)); await route.continue(); });
    note(`⚠ WebKit has no CDP throttling — approximating with a ${p.lat}ms delay per GCS request. Indicative only.`);
  }
}

const advanceTo = async (sel, label, errSels = []) => {
  await page.evaluate(() => advance());
  try { await page.waitForSelector(sel, { state:'visible', timeout: 15000 }); note(`→ ${label}`); }
  catch {
    let msg = '';
    for (const es of errSels) { const t = await page.textContent(es).catch(()=>''); if (t?.trim()) { msg = t.trim(); break; } }
    await shot(page, `ERROR-blocked-${label}.png`);
    finding('S1', `Blocked advancing to ${label}${msg ? ` — form said: "${msg}"` : ''}`);
    throw new Error(`Cannot advance to ${label}`);
  }
};

const slotMap = [];   // which file landed in which zone — the record that ties a photo to fp4

const fillSpecial = async () => {
  const zones = await page.$$eval('[id^="dz-special-"]', els => els.map(e => e.id));
  note(`Photo zones: ${zones.join(', ') || '(none)'}`);
  for (const zid of zones) {
    const f = nextPhoto();
    await page.setInputFiles(`#${zid} input[type=file]`, f);
    slotMap.push({ slot: zid, file: path.basename(f) });
    note(`  ${zid} ← ${path.basename(f)}`);
  }
  for (const sid of await page.$$eval('#step-special select', els => els.map(e => e.id))) {
    if (sid.startsWith('country-add-')) {
      await page.$eval(`#${sid}`, el => { el.dataset.touched = '1'; });
      const c = await page.$eval(`#${sid}`, el => [...el.options].find(o => o.value && o.value !== 'None')?.value || '');
      await page.selectOption(`#${sid}`, c); await page.waitForTimeout(500);
    } else {
      const o = await page.$eval(`#${sid}`, el => [...el.options].find(x => x.value && x.value !== 'None')?.value || '');
      if (o) await page.selectOption(`#${sid}`, o);
    }
  }
  const fields = await page.$$eval('#step-special input[type=text], #step-special textarea', els => els.map(e => ({ id:e.id, cls:e.className })));
  for (const [i, f] of fields.entries()) {
    const key = (f.id.split('-').pop() || '').toLowerCase();
    const v = FIELD_VALUES[key] || (f.cls.includes('itin-line') ? `Day ${i+1}: Dublin to Galway` : `QA note ${i+1}`);
    if (f.id) await page.fill(`#${f.id}`, v);
  }
  const words = await page.$$('[id^="fp-word-list-"] input');
  for (const [i, w] of words.entries()) await w.fill(['giggle','moon','again'][i] || 'more');
};

let orderNumber = null, submitTs = null;

try {
  note(`── A. ${TEMPLATE} configurator`);
  await page.goto(`${BASE}/${TEMPLATE}.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.sp-card', { timeout: 30000 });
  for (const fp of SPEC.addons) await page.$eval(`[data-fp="${fp}"]`, el => el.click());
  await Promise.all([page.waitForURL('**/order*'), page.click('.cta')]);

  note('── B. Step 1');
  await page.waitForSelector('#step1', { state:'visible' });
  await page.fill('#inp-name', `QA upload probe ${MODE}`);
  await page.fill('#inp-email', EMAIL);
  await page.fill('#album-notes', `Upload transport probe — ${BROWSER} / ${MODE}. TO-DOS #88.`);
  await advanceTo('#step-cover', 'step-cover', ['#err-step1']);

  note('── C. Cover');
  if (SPEC.coverPhoto) {
    const f = nextPhoto();
    await page.setInputFiles('#dz-cover input[type=file]', f);
    slotMap.push({ slot: 'cover', file: path.basename(f) });
    note(`  cover ← ${path.basename(f)}`);
    await page.waitForSelector('#cover-preview', { state:'visible', timeout: 60000 });
  }
  for (const id of await page.$$eval('[id^="cover-cap-"]', els => els.map(e => e.id))) {
    const v = SPEC.coverCaps[id.replace('cover-cap-','')];
    if (v !== undefined) await page.fill(`#${id}`, v);
  }

  if (SPEC.addons.length) {
    await advanceTo('#step-special', 'step-special', ['#err-cover']);
    note('── D. Special pages');
    await fillSpecial();
    await page.waitForTimeout(1500);
    await advanceTo('#step-photos', 'step-photos', ['#err-special']);
  } else {
    await advanceTo('#step-photos', 'step-photos', ['#err-cover']);
  }

  note('── E. Main photos');
  const target = parseInt(await page.textContent('#photo-count-min'), 10);
  // In reuse mode the pool is the SAME file repeated, so the pinned photo is
  // uploading concurrently across cover, every special slot and the whole pool —
  // the strongest possible form of H1.
  const mainSet = REUSE ? Array(target).fill(PINNED) : photos.slice(photoIdx, photoIdx + target);
  note(`Uploading ${mainSet.length} main photos (target ${target})…`);
  await page.setInputFiles('#dz-main input[type=file]', mainSet);
  await page.waitForFunction((t) => document.querySelectorAll('#photo-grid .photo-thumb').length >= t, target, { timeout: 240000 });
  await page.waitForTimeout(2000);
  await shot(page, '01-photos-ready.png');

  if (DRY) {
    note('');
    note('🛑 DRY RUN — stopping at the submit button.');
    note('   Form drove to completion; no order created, no email sent.');
    await shot(page, '02-dry-run-stopped-at-submit.png');
  } else {
    note('── F. Submit (uploading to GCS)');
    submitTs = Date.now();
    await page.click('#submit-btn');
    const proceed = await page.waitForSelector('#confirm-proceed', { state:'visible', timeout: 5000 }).catch(() => null);
    if (proceed) await proceed.click();
    await page.waitForSelector('#success-screen', { state:'visible', timeout: 900000 });
    orderNumber = ((await page.textContent('#success-order-num')).match(/AEV-\d+/i) || [null])[0];
    note(`✅ ORDER PLACED — ${orderNumber} (${Math.round((Date.now()-submitTs)/1000)}s)`);
    await shot(page, '03-success.png');
  }

} catch (err) {
  note(`❌ FLOW ERROR: ${err.message}`);
  finding('S1', `Flow threw: ${err.message}`);
  await shot(page, 'ERROR.png');
}

// ── Report ──────────────────────────────────────────────────────────────────
const recs = [...puts.values()];
const by = (o) => recs.filter(r => r.outcome === o);
const stalled = by('in-flight');

note('');
note(`════════ P2 UPLOAD PROBE — ${TEMPLATE} / ${BROWSER} / ${MODE} ════════`);
note(`GCS PUTs:    ${recs.length}`);
note(`  ok:        ${by('ok').length}`);
note(`  aborted:   ${by('aborted').length}`);
note(`  failed:    ${by('failed').length}`);
note(`  http 4xx/5xx: ${by('http-error').length}`);
note(`  NEVER RESOLVED: ${stalled.length}  ← the stall signature`);

if (stalled.length) {
  finding('S1', `${stalled.length} GCS PUT(s) never resolved — reproduced the stall in ${BROWSER}`);
  stalled.forEach(r => note(`  ⏳ ${r.name} — in flight ${Date.now()-r.t0}ms`));
}
by('http-error').forEach(r => finding('S2', `PUT ${r.name} → HTTP ${r.status}`));
if (by('failed').length) finding('S2', `${by('failed').length} PUT(s) failed outright (not aborts)`);

const done = recs.filter(r => r.ms != null).sort((a,b) => b.ms - a.ms);
if (done.length) {
  note(`Slowest PUTs:`);
  done.slice(0, 8).forEach(r => note(`  ${String(r.ms).padStart(7)}ms  ${r.outcome.padEnd(11)} ${r.name}`));
}

note('');
note('Slot → file map (ties a photo to the fp4 slot):');
slotMap.forEach(s => note(`  ${s.slot.padEnd(22)} ${s.file}`));

if (consoleMsgs.length) { note('--- console ---'); [...new Set(consoleMsgs)].slice(0,10).forEach(m => note('  '+m)); }
else note('Console: clean');

if (orderNumber) {
  note('');
  note(`Next: node scripts/inspect-upload-failure.js ${orderNumber}`);
}

fs.writeFileSync(path.join(RUN_DIR, 'run-log.txt'), log.join('\n'));
fs.writeFileSync(path.join(RUN_DIR, 'findings.json'), JSON.stringify(
  { template:TEMPLATE, browser:BROWSER, mode:MODE, dryRun:DRY, reuse:REUSE, throttle:THROTTLE,
    orderNumber, email:EMAIL, tag:TAG, pinnedPhoto: REUSE ? path.basename(PINNED) : null,
    slotMap, findings,
    puts: recs.map(r => ({ name:r.name, status:r.status, ms:r.ms, outcome:r.outcome, err:r.err })),
    consoleMsgs: [...new Set(consoleMsgs)] }, null, 2));
note(`Artefacts → ${RUN_DIR}`);

await browser.close();
process.exit(findings.some(f => f.sev === 'S1') ? 1 : 0);
