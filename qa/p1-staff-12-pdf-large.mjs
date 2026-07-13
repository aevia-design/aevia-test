// P1-12 — Generate a PDF on a LARGE pro-camera order (GB-scale originals).
// Catalogue: work/pre-launch-qa/case-catalogue_v1.md
//
// Pass criteria:
//   it renders successfully, OR fails LOUDLY naming the offending path — it must
//   never hang at 0% until the poll ceiling. Guards the S112 fix: the unbounded
//   Promise.all over the photo pool became a 6-worker bounded pool plus a 120s
//   per-photo download timeout (services/pdf-renderer/index.js:87,134).
//
// COST: the render is triggered from the STAFF DASHBOARD, so the download of the
// originals happens on Cloud Run IN-REGION with the bucket — no egress, effectively
// free. NEVER run `npm run pdf` locally for this: that pulls the GB of originals out
// of GCS to this machine and bills the owner for egress.
//
// Evidence recorded: render duration + the order's total photo bytes.
//
// Run: node qa/p1-staff-12-pdf-large.mjs <AEV-nnn>
//   e.g. node qa/p1-staff-12-pdf-large.mjs AEV-051

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { orderState, orderPhotoBytes } from './firestore.mjs';

const ORDER = (process.argv[2] || '').toUpperCase();
if (!/^AEV-\d+$/.test(ORDER)) {
  console.error('Usage: node qa/p1-staff-12-pdf-large.mjs <AEV-nnn>');
  process.exit(1);
}

const BASE = 'https://aevia-test.pages.dev/pages';
const RUN_DIR = path.resolve('sessions/qa-runs', `${new Date().toISOString().slice(0, 10)}-p1-staff-12-${ORDER}`);
fs.mkdirSync(RUN_DIR, { recursive: true });

// Cloud Run kills the request at 900s. If we are still at 'rendering' well past that,
// nothing is coming — that is the hang this case exists to catch.
const HANG_CEILING_MS = 20 * 60 * 1000;

const env = Object.fromEntries(
  fs.readFileSync(path.resolve('qa/.env'), 'utf8')
    .split('\n').filter(l => l.trim() && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const log = [], findings = [];
const note = (m) => { const l = `[${new Date().toISOString().slice(11, 19)}] ${m}`; console.log(l); log.push(l); };
const finding = (sev, msg) => { findings.push({ sev, id: 'P1-12', order: ORDER, msg }); note(`  ⚠️  ${sev} ${msg}`); };
const shot = async (p, n) => { await p.screenshot({ path: path.join(RUN_DIR, n), fullPage: true }); note(`📸 ${n}`); };

const consoleMsgs = [], dialogs = [];
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
ctx.on('page', pg => {
  pg.on('console', m => { if (['error', 'warning'].includes(m.type())) consoleMsgs.push(`${m.type()}: ${m.text()}`); });
  pg.on('pageerror', e => consoleMsgs.push(`pageerror: ${e.message}`));
  // Regenerate throws a confirm(); a failure throws an alert(). Auto-dismiss = Cancel,
  // which would silently no-op the whole run.
  pg.on('dialog', d => { dialogs.push(`${d.type()}: ${d.message().replace(/\s+/g, ' ')}`); note(`  💬 ${d.type()}: "${d.message().replace(/\s+/g, ' ').slice(0, 140)}"`); d.accept().catch(() => {}); });
});

const dash = await ctx.newPage();
const result = { order: ORDER };

try {
  // ── A. Fixture: how big is this order really? ───────────────────
  // Metadata listing only — no object is downloaded, so this costs no egress.
  note(`── A. Fixture size (${ORDER})`);
  const pre = await orderState(ORDER);
  if (!pre) throw new Error(`${ORDER} does not exist`);
  const size = await orderPhotoBytes(ORDER);
  result.pre = pre;
  result.photoBytes = size.bytes;
  result.photoCount = size.count;
  result.largest = size.largest;
  note(`status=${pre.status} staffBookSequence=${pre.seq} complete=${pre.complete}`);
  note(`Originals the renderer must pull: ${size.count} files, ${(size.bytes / 1e9).toFixed(3)} GB ` +
       `(${(size.bytes / 1e6).toFixed(0)} MB), largest ${(size.largest.bytes / 1e6).toFixed(1)} MB — ${size.largest.name}`);
  if (size.missing) finding('S3', `${size.missing} manifest path(s) have no object in GCS`);
  if (size.bytes < 5e8) finding('S3', `HARNESS: ${ORDER} is only ${(size.bytes / 1e6).toFixed(0)} MB — not a GB-scale pro-camera fixture`);
  if (pre.seq === 0) throw new Error(`${ORDER} has no staffBookSequence — save it in the engine first (that is P1-11's case, not this one)`);

  // ── B. Dashboard ────────────────────────────────────────────────
  note('── B. Dashboard login');
  await dash.goto(`${BASE}/staff/dashboard.html`, { waitUntil: 'domcontentloaded' });
  await dash.waitForSelector('#email-input', { state: 'visible', timeout: 30000 });
  await dash.fill('#email-input', env.STAFF_TEST_EMAIL);
  await dash.fill('#pwd-input', env.STAFF_TEST_PASSWORD);
  await dash.click('.lock-btn');
  await dash.waitForSelector('#app', { state: 'visible', timeout: 30000 });
  await dash.waitForFunction(
    (n) => (document.getElementById('orders-body')?.innerText || '').includes(n),
    ORDER, { timeout: 60000 }
  );

  // updatePdfLinks() rewrites the row's pdf cell ASYNCHRONOUSLY, ~one round-trip after
  // the row first paints: if a PDF already exists, "Generate PDF" is REPLACED by
  // Preview/Print + "Regenerate PDF". Grabbing the button as soon as it appears gets a
  // handle that detaches mid-click. Wait for the rewrite to settle first — the row is
  // stable once its button set stops changing.
  const genSel = `button[onclick="generatePdfFromDashboard('${ORDER}', this)"]`;
  const regenSel = `button[onclick="generatePdfFromDashboard('${ORDER}', this, true)"]`;
  await dash.waitForFunction(
    (sels) => sels.some(s => document.querySelector(s)),
    [genSel, regenSel], { timeout: 60000 }
  );
  let sig = '', stable = 0;
  for (let i = 0; i < 40 && stable < 3; i++) {
    await dash.waitForTimeout(1000);
    const now = await dash.$eval(`#pdf-row-${ORDER}`, el => el.innerHTML.length + ':' + el.querySelectorAll('button').length).catch(() => '');
    if (now && now === sig) stable++; else { sig = now; stable = 0; }
  }
  const sel = (await dash.$(regenSel)) ? regenSel : genSel;
  note(`Trigger button: ${sel === regenSel ? '"Regenerate PDF" (a PDF already exists)' : '"Generate PDF"'}`);
  await shot(dash, '01-before-render.png');

  // ── C. Fire the render (in-region on Cloud Run) ─────────────────
  note('── C. Trigger the render from the dashboard');
  const t0 = Date.now();
  await dash.click(sel);

  // ── D. Watch it ─────────────────────────────────────────────────
  // Firestore's pdfRender field is the source of truth the dashboard itself polls.
  note('── D. Watching pdfRender (source of truth the dashboard polls)');
  let last = '', final = null, stuckAtZeroSince = null;
  const deadline = Date.now() + HANG_CEILING_MS;
  while (Date.now() < deadline) {
    await dash.waitForTimeout(10000);
    const s = await orderState(ORDER);
    const pr = s?.pdf || {};
    const line = `${pr.status || 'none'} ${pr.done ?? pr.current ?? ''}/${pr.total ?? ''} ${pr.error ? '· ' + pr.error : ''}`.trim();
    if (line !== last) { note(`  [${((Date.now() - t0) / 1000).toFixed(0)}s] ${line}`); last = line; }
    // The S112 symptom: status 'rendering' but total 0 forever.
    if (pr.status === 'rendering' && !pr.total) { stuckAtZeroSince ??= Date.now(); }
    else stuckAtZeroSince = null;
    if (pr.status === 'done' || pr.status === 'error') { final = pr; break; }
  }
  const ms = Date.now() - t0;
  result.durationMs = ms;
  result.final = final ? { status: final.status, total: final.total, error: final.error || null } : null;
  await shot(dash, '02-after-render.png');

  // ── E. Verdict ──────────────────────────────────────────────────
  note('── E. Verdict');
  note(`Duration: ${(ms / 1000).toFixed(0)}s (${(ms / 60000).toFixed(1)} min)`);
  if (!final) {
    finding('S1', `Render HUNG — still "${last}" after ${(ms / 60000).toFixed(0)} min; never reached done or error`);
    if (stuckAtZeroSince) finding('S1', 'Stuck at 0% (total never set) — the exact S112 silent-hang symptom');
  } else if (final.status === 'error') {
    // Failing loudly is an acceptable pass IF the message names the offending path.
    const named = /photo|\.jpe?g|\.png|\.heic|AEV-/i.test(final.error || '');
    note(`Render FAILED with: "${final.error}"`);
    if (named) note('✅ Failed LOUDLY and named the offending path — acceptable per the pass criteria');
    else finding('S2', `Render failed but the error does not name the offending path: "${final.error}"`);
  } else {
    note(`✅ Render DONE — ${final.total ?? '?'} spreads`);
    // The PDF must actually be fetchable from the dashboard afterwards.
    await dash.reload({ waitUntil: 'domcontentloaded' });
    await dash.waitForFunction(
      (n) => (document.getElementById('orders-body')?.innerText || '').includes(n),
      ORDER, { timeout: 60000 }
    ).catch(() => {});
    await dash.waitForTimeout(12000);
    const btns = await dash.$$eval('#orders-body tr', (rows, n) => {
      const tr = rows.find(r => r.innerText.includes(n));
      return tr ? [...tr.querySelectorAll('.pdf-links-row button')].map(b => b.textContent.trim()) : [];
    }, ORDER);
    note(`PDF buttons on the row after the render: ${btns.join(', ') || '(none)'}`);
    result.pdfButtons = btns;
    if (!btns.some(b => /Preview PDF|Print PDF/.test(b))) {
      finding('S2', 'Render reported done but no Preview/Print PDF button appeared on the dashboard');
    }
    await shot(dash, '03-pdf-available.png');
  }

} catch (err) {
  note(`❌ P1-12 ERROR: ${err.message}`);
  if (!findings.some(f => f.sev === 'S1')) finding('S1', `P1-12 threw: ${err.message}`);
  await shot(dash, 'ERROR-p1-12.png').catch(() => {});
}

note('');
note(`════════ P1-12 ${ORDER} RESULT ════════`);
note(`Photo bytes: ${result.photoBytes ? (result.photoBytes / 1e9).toFixed(3) + ' GB across ' + result.photoCount + ' originals' : 'n/a'}`);
note(`Duration:    ${result.durationMs ? (result.durationMs / 1000).toFixed(0) + 's' : 'n/a'}`);
note(`Final:       ${result.final ? JSON.stringify(result.final) : 'NONE (hang)'}`);
note(`Findings:    ${findings.length}`);
findings.forEach(f => note(`  ${f.sev} ${f.msg}`));
note(`Dialogs:     ${dialogs.length ? dialogs.join(' || ') : 'none'}`);

fs.writeFileSync(path.join(RUN_DIR, 'run-log.txt'), log.join('\n'));
fs.writeFileSync(path.join(RUN_DIR, 'findings.json'), JSON.stringify({ id: 'P1-12', ...result, findings, dialogs, consoleMsgs: [...new Set(consoleMsgs)].slice(0, 20) }, null, 2));
note(`Artefacts → ${RUN_DIR}`);

await browser.close();
process.exit(findings.some(f => f.sev === 'S1') ? 1 : 0);
