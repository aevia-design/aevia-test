// P1-11 — Generate PDF on an UNSAVED book must be BLOCKED, not a silent 0% hang.
// Catalogue: work/pre-launch-qa/case-catalogue_v1.md
//
// Pass criteria:
//   a) the dashboard's "Generate PDF" button on an order whose staffBookSequence was
//      never written returns a CLEAR error telling staff to save the book state first
//   b) it fails FAST (seconds, not the 16-min poll ceiling) and the button resets
//   c) no render is actually started (order.pdfRender stays absent/unchanged)
//
// Guards the S112 fix (functions/index.js:570 — the staffBookSequence pre-check).
//
// Run: node qa/p1-staff-11-pdf-unsaved.mjs <AEV-nnn>
//   e.g. node qa/p1-staff-11-pdf-unsaved.mjs AEV-056

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { orderState } from './firestore.mjs';

const ORDER = (process.argv[2] || '').toUpperCase();
if (!/^AEV-\d+$/.test(ORDER)) {
  console.error('Usage: node qa/p1-staff-11-pdf-unsaved.mjs <AEV-nnn>');
  process.exit(1);
}

const BASE = 'https://aevia-test.pages.dev/pages';
const RUN_DIR = path.resolve('sessions/qa-runs', `${new Date().toISOString().slice(0, 10)}-p1-staff-11-${ORDER}`);
fs.mkdirSync(RUN_DIR, { recursive: true });

const env = Object.fromEntries(
  fs.readFileSync(path.resolve('qa/.env'), 'utf8')
    .split('\n').filter(l => l.trim() && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const log = [], findings = [];
const note = (m) => { const l = `[${new Date().toISOString().slice(11, 19)}] ${m}`; console.log(l); log.push(l); };
const finding = (sev, msg) => { findings.push({ sev, id: 'P1-11', order: ORDER, msg }); note(`  ⚠️  ${sev} ${msg}`); };
const shot = async (p, n) => { await p.screenshot({ path: path.join(RUN_DIR, n), fullPage: true }); note(`📸 ${n}`); };

const consoleMsgs = [], dialogs = [];
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
ctx.on('page', pg => {
  pg.on('console', m => { if (['error', 'warning'].includes(m.type())) consoleMsgs.push(`${m.type()}: ${m.text()}`); });
  pg.on('pageerror', e => consoleMsgs.push(`pageerror: ${e.message}`));
  // Playwright auto-DISMISSES dialogs. The block we're testing for surfaces as an alert().
  pg.on('dialog', d => { dialogs.push(d.message().replace(/\s+/g, ' ')); note(`  💬 ${d.type()}: "${d.message().replace(/\s+/g, ' ').slice(0, 160)}"`); d.accept().catch(() => {}); });
});

const dash = await ctx.newPage();
let blockedMs = null;

try {
  note(`── A. Dashboard login`);
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
  note(`✅ Dashboard up, ${ORDER} row painted`);

  // ── B. Confirm the fixture really is unsaved ────────────────────
  // Read the order doc directly: the dashboard is a module script, so its `allOrders`
  // is module-scoped and not reachable from page.evaluate().
  const state = await orderState(ORDER);
  note(`Fixture: status=${state?.status} staffBookSequence=${state?.seq} saved=${state?.saved} pdfRender=${state?.pdf?.status || 'none'}`);
  if (state && state.seq > 0) {
    finding('S3', `HARNESS: ${ORDER} already has a saved staffBookSequence (${state.seq}) — not a valid unsaved fixture`);
    throw new Error('fixture is saved — pick an order that was never saved in the engine');
  }

  // ── C. Click Generate PDF ───────────────────────────────────────
  note('── C. Generate PDF on the unsaved book');
  const genSel = `button[onclick="generatePdfFromDashboard('${ORDER}', this)"]`;
  const btn = await dash.$(genSel);
  if (!btn) {
    finding('S2', `No "Generate PDF" button on ${ORDER} (status ${state?.status}) — cannot exercise the block`);
    throw new Error('no Generate PDF button');
  }
  await shot(dash, '01-before-click.png');
  const t0 = Date.now();
  await btn.click();

  // The failure path is: fetch → !res.ok → fail(msg) → alert(...). Wait for the alert.
  await dash.waitForFunction(() => true, {}, { timeout: 1 }).catch(() => {});
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline && dialogs.length === 0) {
    await dash.waitForTimeout(500);
  }
  blockedMs = Date.now() - t0;
  await shot(dash, '02-after-click.png');

  if (dialogs.length === 0) {
    finding('S1', `No error surfaced within 90s — the unsaved-book guard did not fire (silent hang: the S112 regression)`);
  } else {
    const msg = dialogs.join(' || ');
    note(`Blocked after ${(blockedMs / 1000).toFixed(1)}s with: "${msg}"`);
    // "Clear message" = it must tell staff to SAVE THE BOOK, not just "failed".
    const clear = /save.{0,20}book|book.{0,30}saved/i.test(msg);
    if (!clear) finding('S2', `Error fired but is not actionable — it never says to save the book state: "${msg}"`);
    else note('✅ Clear, actionable block: staff are told to save the book state first');
    if (blockedMs > 30000) finding('S3', `Block took ${(blockedMs / 1000).toFixed(0)}s — slower than a snappy client-side rejection`);
  }

  // ── D. The button must reset, and no render may have started ────
  note('── D. Post-block state');
  const after = await dash.evaluate((sel) => {
    const b = document.querySelector(sel);
    const row = b ? b.parentElement : null;
    return {
      btnLabel: b ? b.textContent.trim() : '(button gone)',
      btnDisabled: b ? b.disabled : null,
      progressBars: row ? row.querySelectorAll('span > span').length : 0,
    };
  }, genSel);
  note(`Button: "${after.btnLabel}" disabled=${after.btnDisabled}, leftover progress bars: ${after.progressBars}`);
  if (after.btnDisabled) finding('S2', 'Button stays disabled after the block — staff cannot retry without a reload');
  if (after.progressBars > 0) finding('S3', 'A progress bar was left behind after the block (stale 0% UI)');

  await dash.waitForTimeout(4000);
  const post = await orderState(ORDER);
  const render = post?.pdf?.status || null;
  note(`order.pdfRender after the block: ${render === null ? '(none — no render started ✓)' : render}`);
  if (render && ['starting', 'rendering'].includes(render)) {
    finding('S1', `A render was started anyway (pdfRender=${render}) — the guard did not stop the Cloud Run trigger`);
  }

} catch (err) {
  note(`❌ P1-11 ERROR: ${err.message}`);
  if (!findings.length) finding('S1', `P1-11 threw: ${err.message}`);
  await shot(dash, 'ERROR-p1-11.png').catch(() => {});
}

note('');
note(`════════ P1-11 ${ORDER} RESULT ════════`);
note(`Blocked in: ${blockedMs !== null ? (blockedMs / 1000).toFixed(1) + 's' : 'n/a'}`);
note(`Findings:   ${findings.length}`);
findings.forEach(f => note(`  ${f.sev} ${f.msg}`));
note(`Dialogs:    ${dialogs.length ? dialogs.join(' || ') : 'none'}`);
if (consoleMsgs.length) { note('--- console ---'); [...new Set(consoleMsgs)].slice(0, 8).forEach(m => note('  ' + m)); } else note('Console: clean');

fs.writeFileSync(path.join(RUN_DIR, 'run-log.txt'), log.join('\n'));
fs.writeFileSync(path.join(RUN_DIR, 'findings.json'), JSON.stringify({ id: 'P1-11', order: ORDER, blockedMs, findings, dialogs, consoleMsgs: [...new Set(consoleMsgs)] }, null, 2));
note(`Artefacts → ${RUN_DIR}`);

await browser.close();
process.exit(findings.some(f => f.sev === 'S1') ? 1 : 0);
