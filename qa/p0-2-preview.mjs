// P0-2 — staff designs the book and sends the preview to the customer.
// Catalogue: work/pre-launch-qa/case-catalogue_v1.md
//
// Pass criteria (P0-2):
//   a) the order loads in the engine and "Save book state" succeeds (book complete)
//   b) "Send preview to customer" succeeds → order status becomes review_sent
//   c) the preview-ready email arrives with a WORKING "View your book" link
//
// Journey is THREE stops — both preview buttons live on the DASHBOARD, not the engine:
//   dashboard/engine deep-link → save book state → dashboard → generate link → send.
//
// Run: node qa/p0-2-preview.mjs <AEV-nnn> <testmail-tag>
//   e.g. node qa/p0-2-preview.mjs AEV-053 p01nbmrj2us8t
// The tag is the one the P0-1 run used for that order (see its findings.json).

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { waitForEmail, extractLinks } from './testmail.mjs';

const ORDER = (process.argv[2] || '').toUpperCase();
const TAG = process.argv[3];
if (!/^AEV-\d+$/.test(ORDER) || !TAG) {
  console.error('Usage: node qa/p0-2-preview.mjs <AEV-nnn> <testmail-tag>');
  process.exit(1);
}

const BASE = 'https://aevia-test.pages.dev/pages';
const RUN_DIR = path.resolve('sessions/qa-runs', `${new Date().toISOString().slice(0, 10)}-p0-2-${ORDER}`);
fs.mkdirSync(RUN_DIR, { recursive: true });

const env = Object.fromEntries(
  fs.readFileSync(path.resolve('qa/.env'), 'utf8')
    .split('\n').filter(l => l.trim() && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const log = [], findings = [];
const note = (m) => { const l = `[${new Date().toISOString().slice(11, 19)}] ${m}`; console.log(l); log.push(l); };
const finding = (sev, msg) => { findings.push({ sev, id: 'P0-2', order: ORDER, msg }); note(`  ⚠️  ${sev} ${msg}`); };
const shot = async (p, n) => { await p.screenshot({ path: path.join(RUN_DIR, n), fullPage: true }); note(`📸 ${n}`); };

const consoleMsgs = [], dialogs = [];
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } });

// Three native dialogs are in this path (incomplete-book confirm on save, send-preview
// confirm, and the post-send alert). Playwright AUTO-DISMISSES unhandled dialogs, which
// means Cancel — a silent no-op on both the save and the send. Accept them, and record
// each one: an unexpected confirm is itself a finding.
ctx.on('page', pg => {
  pg.on('console', m => { if (['error', 'warning'].includes(m.type())) consoleMsgs.push(`${m.type()}: ${m.text()}`); });
  pg.on('pageerror', e => consoleMsgs.push(`pageerror: ${e.message}`));
  pg.on('dialog', d => { dialogs.push(`${d.type()}: ${d.message().replace(/\s+/g, ' ').slice(0, 140)}`); note(`  💬 ${d.type()}: "${d.message().replace(/\s+/g, ' ').slice(0, 100)}"`); d.accept().catch(() => {}); });
});

const page = await ctx.newPage();
let sentTs = null, previewUrl = null;

try {
  // ── A. Engine: load the order via deep link ───────────────────
  // maybeDeepLinkOrder() runs from onAuthStateChanged, so ?order= only fires AFTER
  // sign-in resolves — wait for the lock to lift, not just for the page to load.
  note(`── A. Engine — deep-link ${ORDER}`);
  await page.goto(`${BASE}/staff/template-engine.html?order=${ORDER}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#eng-email', { state: 'visible', timeout: 20000 });
  await page.fill('#eng-email', env.STAFF_TEST_EMAIL);
  await page.fill('#eng-pwd', env.STAFF_TEST_PASSWORD);
  await page.click('#eng-lock .eng-lock-btn');
  await page.waitForSelector('#eng-lock', { state: 'hidden', timeout: 30000 });
  note(`✅ Engine login OK (${env.STAFF_TEST_EMAIL})`);

  // Photo download + HEIC decode is the slow step (sequential by design).
  await page.waitForSelector('#order-info-panel.visible', { timeout: 300000 });
  const pool = await page.evaluate(() => (window.photoPool || []).length);
  note(`Order loaded — ${pool} photos in the pool`);
  if (!pool) { finding('S1', 'Order loaded but photo pool is empty'); throw new Error('empty pool'); }
  await page.waitForTimeout(4000); // let renderBook() finish placing + decoding
  await shot(page, '01-engine-loaded.png');

  // ── B. Completeness + captions ────────────────────────────────
  // checkBookComplete() gates the save. Required captions are TEXT PANELS only, and
  // they are pre-filled from the customer's order-form answers, so a normal order is
  // already complete. We do NOT touch the AI caption button (one LLM call per click —
  // owner directive: at most one per order). Any dummy text goes straight into
  // window.bookCaptions, which is what the save actually serialises (the DOM is not).
  note('── B. Book completeness');
  const before = await page.evaluate(() => {
    const r = window.checkBookComplete ? window.checkBookComplete() : null;
    return r ? { complete: r.complete, reasons: r.reasons || [] } : null;
  });
  note(`checkBookComplete: ${before ? (before.complete ? 'COMPLETE ✓' : `INCOMPLETE — ${before.reasons.join(' | ')}`) : '(not exposed)'}`);
  if (before && !before.complete) {
    finding('S2', `Book NOT complete straight after auto-layout: ${before.reasons.join(' | ')}`);
  }

  // ── C. Save book state ────────────────────────────────────────
  note('── C. Save book state');
  await page.click('#oip-save-btn');
  // #oip-preview-status goes Saving… → "Saved ✓", then self-clears after 3s.
  await page.waitForFunction(
    () => /Saved|failed/i.test(document.getElementById('oip-preview-status')?.textContent || ''),
    { timeout: 120000 }
  );
  const saveMsg = (await page.textContent('#oip-preview-status')).trim();
  note(`Save status: "${saveMsg}"`);
  if (!/Saved/i.test(saveMsg)) { finding('S1', `Save book state failed: "${saveMsg}"`); throw new Error('save failed'); }
  note('✅ Book state saved');
  await shot(page, '02-saved.png');

  // ── D. Dashboard: generate preview link ───────────────────────
  note('── D. Dashboard — generate preview link');
  const dash = await ctx.newPage();
  // NOT networkidle — the dashboard holds an open Firestore listener, so the network
  // never goes idle and goto() times out. Gate on the elements instead.
  await dash.goto(`${BASE}/staff/dashboard.html`, { waitUntil: 'domcontentloaded' });
  // Firebase auth persists per-ORIGIN, so the engine sign-in above is already live in
  // this context: the dashboard's lock overlay hides itself as soon as
  // onAuthStateChanged resolves. Logging in unconditionally races that — the fill lands
  // while the overlay is still up, then the click times out on a now-hidden button.
  // Only log in if the lock is actually still showing.
  const locked = await dash.waitForSelector('#app', { state: 'visible', timeout: 8000 }).then(() => false).catch(() => true);
  if (locked) {
    await dash.waitForSelector('#email-input', { state: 'visible', timeout: 30000 });
    await dash.fill('#email-input', env.STAFF_TEST_EMAIL);
    await dash.fill('#pwd-input', env.STAFF_TEST_PASSWORD);
    await dash.click('.lock-btn');
    await dash.waitForSelector('#app', { state: 'visible', timeout: 30000 });
  } else {
    note('Dashboard already unlocked (staff session carried over from the engine)');
  }
  // Wait for THIS order's row to paint before probing for its buttons — the table is
  // filled asynchronously, and a rerun of this script finds the row already carrying a
  // token (Generate is replaced by Open/Revoke, and Send reads "Resend preview").
  await dash.waitForFunction(
    (n) => (document.getElementById('orders-body')?.innerText || '').includes(n),
    ORDER, { timeout: 60000 }
  );

  // generatePreviewLink writes previewToken via the Firestore Web SDK (no Cloud Fn) and
  // re-renders the table; the Send button does not exist until that lands.
  const genSel = `button[onclick="generatePreviewLink('${ORDER}')"]`;
  const sendSel = `button[onclick="sendPreviewToCustomer('${ORDER}')"]`;
  const alreadySent = await dash.$(sendSel);
  if (!alreadySent) {
    await dash.waitForSelector(genSel, { timeout: 30000 });
    await dash.click(genSel);
    note('Clicked "Generate preview link"');
  } else {
    note('Preview token already exists — skipping generate');
  }
  await dash.waitForSelector(sendSel, { timeout: 60000 });
  note('✅ Preview token exists, Send button rendered');
  await shot(dash, '03-dashboard-token.png');

  // ── E. Send preview to customer ───────────────────────────────
  // Client guard: staffBookComplete !== true → alert() and NO network call.
  // Server guards (409): needs previewToken, a pre-approval status, and staffBookComplete.
  note('── E. Send preview to customer');
  const label = (await dash.textContent(sendSel)).trim();
  note(`Send button reads: "${label}"`);
  sentTs = Date.now();
  await dash.click(sendSel);
  await dash.waitForTimeout(8000); // confirm + POST + alert
  await shot(dash, '04-sent.png');

  const failedAlert = dialogs.find(d => /not ready|failed|error|first/i.test(d));
  if (failedAlert) finding('S1', `Send preview blocked: "${failedAlert}"`);

  // ── F. Status → review_sent ───────────────────────────────────
  note('── F. Order status');
  await dash.reload({ waitUntil: 'domcontentloaded' });
  // Rows are painted asynchronously after the Firestore read — waiting for the first
  // <tr> is not enough; wait for THIS order's row to actually be in the table.
  await dash.waitForFunction(
    (n) => (document.getElementById('orders-body')?.innerText || '').includes(n),
    ORDER, { timeout: 60000 }
  ).catch(() => {});
  const row = await dash.$$eval('#orders-body tr', (rows, n) => {
    const tr = rows.find(r => r.innerText.includes(n));
    if (!tr) return null;
    const sel = tr.querySelector('select.status-select');
    return { text: tr.innerText.replace(/\s+/g, ' ').slice(0, 120), status: sel ? sel.value : '(no select)' };
  }, ORDER);
  if (!row) { finding('S1', `${ORDER} vanished from the dashboard after send`); }
  else {
    note(`Row status: ${row.status}`);
    if (row.status !== 'review_sent') finding('S1', `Status is "${row.status}", expected "review_sent"`);
    else note('✅ Status = review_sent');
  }

} catch (err) {
  note(`❌ P0-2 ERROR: ${err.message}`);
  if (!findings.some(f => f.sev === 'S1')) finding('S1', `P0-2 threw: ${err.message}`);
  await shot(page, 'ERROR-p0-2.png').catch(() => {});
}

// ── G. Preview-ready email + working link ───────────────────────
if (sentTs) {
  note('── G. Preview-ready email');
  try {
    const mail = await waitForEmail({ tag: TAG, sinceTs: sentTs - 30000, timeoutMs: 180000 });
    note('✅ EMAIL RECEIVED');
    note(`   subject: ${mail.subject}`);
    note(`   from:    ${mail.from}`);
    if (!/preview/i.test(mail.subject)) finding('S2', `Email subject is not the preview-ready one: "${mail.subject}"`);
    fs.writeFileSync(path.join(RUN_DIR, 'preview-email.html'), mail.html || mail.text || '');

    // Brevo REWRITES every href into a click-tracking redirect (sendibt*.com/tr/cl/…),
    // so the raw HTML never contains "customer-preview". Follow the link the way a
    // customer does and assert where it lands — a stronger test than string-matching.
    previewUrl = extractLinks(mail).find(u => /^https?:/i.test(u) && !u.includes('mailto'));
    note(`   preview link (Brevo-wrapped): ${previewUrl ? previewUrl.slice(0, 60) + '…' : '(NONE FOUND)'}`);
    if (!previewUrl) finding('S1', 'Preview email contains no clickable link');
  } catch (e) {
    note(`❌ ${e.message}`);
    finding('S1', `No preview-ready email within 180s for ${ORDER}`);
  }
}

// ── H. The link actually works (customer side, no auth) ─────────
if (previewUrl) {
  note('── H. Open the preview link as the customer');
  const cust = await ctx.newPage();
  try {
    await cust.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await cust.waitForURL(/customer-preview/, { timeout: 60000 }).catch(() => {});
    const landed = cust.url();
    note(`Landed on: ${landed.slice(0, 90)}`);
    if (!/customer-preview/.test(landed)) finding('S1', `Email link did not land on the preview: ${landed.slice(0, 120)}`);
    if (!/token=/.test(landed)) finding('S2', 'Preview URL carries no ?token= param');
    await cust.waitForSelector('#book-canvas', { timeout: 120000 });
    await cust.waitForTimeout(6000);
    const slots = await cust.$$eval('#book-canvas .photo-slot img', els => els.filter(i => i.src && i.naturalWidth > 0).length);
    const bodyTxt = (await cust.textContent('body')).replace(/\s+/g, ' ');
    note(`Book canvas rendered — ${slots} photo(s) with pixels`);
    if (!slots) finding('S1', 'Preview opens but no photos rendered in the book');
    if (/expired|invalid|not found/i.test(bodyTxt.slice(0, 400))) finding('S1', 'Preview link rejected (expired/invalid)');
    else note('✅ Preview link works');
    await shot(cust, '05-customer-preview.png');
  } catch (e) {
    note(`❌ PREVIEW ERROR: ${e.message}`);
    finding('S1', `Preview link did not open: ${e.message}`);
    await shot(cust, 'ERROR-preview.png').catch(() => {});
  }
}

// ── Report ──────────────────────────────────────────────────────
note('');
note(`════════ P0-2 ${ORDER} RESULT ════════`);
note(`Preview URL: ${previewUrl || 'NONE'}`);
note(`Findings:    ${findings.length}`);
findings.forEach(f => note(`  ${f.sev} ${f.msg}`));
note(`Dialogs:     ${dialogs.length ? dialogs.join(' || ') : 'none'}`);
if (consoleMsgs.length) { note('--- console ---'); [...new Set(consoleMsgs)].slice(0, 10).forEach(m => note('  ' + m)); } else note('Console: clean 🎉');

fs.writeFileSync(path.join(RUN_DIR, 'run-log.txt'), log.join('\n'));
fs.writeFileSync(path.join(RUN_DIR, 'findings.json'), JSON.stringify({ order: ORDER, tag: TAG, previewUrl, findings, dialogs, consoleMsgs: [...new Set(consoleMsgs)] }, null, 2));
note(`Artefacts → ${RUN_DIR}`);

await browser.close();
process.exit(findings.some(f => f.sev === 'S1') ? 1 : 0);
