// P2 — preview token abuse + re-approve (case-catalogue P2-8, P2-9)
//
//   node qa/p2-preview-abuse.mjs [approvedOrder] [paidOrder]
//   node qa/p2-preview-abuse.mjs AEV-042 AEV-060          (defaults)
//
// WHY THIS EXISTS
// P2-8 (expired/tampered token → rejected, not a data leak) and P2-9 (re-approving
// an already-approved order → no-op, no error) both act on orders that ALREADY
// EXIST. Per the S126 owner directive this script mints nothing: it reads the
// preview tokens straight from Firestore and drives the real customer page.
//
// It also avoids the staff dashboard entirely — p1-preview-token.mjs logs in to
// scrape the URL, which needs qa/.env. Reading `previewToken` from the order doc
// gets the same string with no credentials.
//
// WRITES: none of its own. P2-9 deliberately CLICKS approve on an already-approved
// order; the pass criterion is that nothing changes, and the script re-reads
// Firestore afterwards to prove the status did not move.
//
// Artefacts → sessions/qa-runs/<date>-p2-preview-abuse/

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { orderState } from './firestore.mjs';

const APPROVED = (process.argv[2] || 'AEV-042').toUpperCase();
const PAID     = (process.argv[3] || 'AEV-060').toUpperCase();
const BASE = 'https://aevia-test.pages.dev/pages';
const RUN_DIR = path.resolve('sessions/qa-runs', `${new Date().toISOString().slice(0, 10)}-p2-preview-abuse`);
fs.mkdirSync(RUN_DIR, { recursive: true });

const log = [], findings = [];
const note = (m) => { const l = `[${new Date().toISOString().slice(11, 19)}] ${m}`; console.log(l); log.push(l); };
const finding = (sev, id, msg) => { findings.push({ sev, id, msg }); note(`  ⚠️  ${sev} ${id} ${msg}`); };
const pass = (id, msg) => note(`  ✓ ${id} ${msg}`);
const shot = async (p, n) => { await p.screenshot({ path: path.join(RUN_DIR, n), fullPage: true }); note(`📸 ${n}`); };

note('═══ P2-8 / P2-9 — preview token abuse + re-approve ═══');

const stApproved = await orderState(APPROVED);
const stPaid     = await orderState(PAID);
if (!stApproved?.previewToken) { console.error(`${APPROVED} has no previewToken`); process.exit(1); }
if (!stPaid?.previewToken)     { console.error(`${PAID} has no previewToken`); process.exit(1); }
note(`${APPROVED}: status=${stApproved.status}  ${PAID}: status=${stPaid.status}`);

const url = (t) => `${BASE}/customer-preview.html?token=${t}`;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });

// ── P2-8 — tampered / missing / foreign tokens ──────────────────────────────
// A rejection must not leak anything about the order: no reference number, no
// customer email, no photos. "Rejected" alone is not the whole pass criterion.
note('── P2-8: token abuse ──');

const good = stApproved.previewToken;
const cases = [
  { name: 'tampered-tail',  token: good.slice(0, -6) + 'ZZZZZZ', why: 'last 6 chars replaced' },
  { name: 'truncated',      token: good.slice(0, Math.floor(good.length / 2)), why: 'half the token' },
  { name: 'random',         token: 'a'.repeat(good.length), why: 'well-formed but never issued' },
  { name: 'empty',          token: '', why: 'no token at all' },
];

for (const c of cases) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(url(c.token), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);

  const body = (await page.textContent('body').catch(() => '') || '');
  // window.orderData is the authoritative signal — it is only populated once the
  // token resolves to a real order. Body text alone is unreliable (the app shell
  // renders either way).
  const od = await page.evaluate(() => window.orderData
    ? { n: window.orderData.orderNumber, email: window.orderData.email, status: window.orderData.status }
    : null).catch(() => null);
  const leaked = [];
  if (od) leaked.push(`window.orderData populated (${od.n || '?'} / ${od.status || '?'})`);
  if (/AEV-\d{3}/.test(body)) leaked.push(`order reference (${body.match(/AEV-\d{3}/)[0]})`);
  if (stApproved.email && body.includes(stApproved.email)) leaked.push('customer email');
  const photos = await page.$$eval('img.slot-photo', els => els.length).catch(() => 0);
  if (photos > 0) leaked.push(`${photos} photo(s) rendered`);

  const visibleMsg = body.replace(/\s+/g, ' ').trim().slice(0, 120);
  note(`  ${c.name} (${c.why}): orderData=${od ? 'POPULATED' : 'null'} | ${photos} photos | page says: "${visibleMsg}"`);

  if (leaked.length) {
    finding('S1', 'P2-8', `${c.name} token LEAKED ${leaked.join(', ')} — an invalid token must reveal nothing`);
  } else {
    pass('P2-8', `${c.name} rejected with no data leak`);
  }
  if (errs.length) note(`     pageerrors: ${errs.slice(0, 3).join(' | ')}`);
  await shot(page, `p2-8-${c.name}.png`);
  await page.close();
}

// Control: the genuine token must still work, or the checks above prove nothing.
{
  const page = await ctx.newPage();
  await page.goto(url(good), { waitUntil: 'domcontentloaded' });
  // Same signal and the same generous wait as P2-9 below — a big book takes a while
  // to resolve, and a short wait would make the control fail for the wrong reason.
  const ok = await page.waitForFunction(
    n => window.orderData && window.orderData.orderNumber === n, APPROVED, { timeout: 40000 }
  ).then(() => true).catch(() => false);
  if (ok) pass('P2-8', `control: the real token still loads ${APPROVED} (window.orderData populated)`);
  else finding('S2', 'P2-8', `control FAILED — the genuine token did not load ${APPROVED}, so the rejections above are not meaningful`);
  await shot(page, 'p2-8-control-valid.png');
  await page.close();
}

// ── P2-9 — re-approve an already-approved / paid order ──────────────────────
note('── P2-9: re-approve ──');
for (const [order, st] of [[APPROVED, stApproved], [PAID, stPaid]]) {
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('dialog', d => d.accept().catch(() => {}));

  await page.goto(url(st.previewToken), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(12000);

  const btn = await page.$eval('#approve-btn', el => ({
    disabled: el.disabled, text: el.textContent.trim(), visible: el.offsetParent !== null,
  })).catch(() => null);
  const readOnly = await page.evaluate(() => window._readOnly === true).catch(() => null);
  note(`  ${order} (${st.status}): _readOnly=${readOnly} | approve btn ${btn ? `disabled=${btn.disabled} "${btn.text}"` : '(absent)'}`);

  if (!btn) {
    finding('S3', 'P2-9', `${order}: #approve-btn absent entirely — cannot verify the no-op path`);
  } else if (!btn.disabled) {
    finding('S2', 'P2-9', `${order} is ${st.status} but the approve button is ENABLED — a second approve is clickable`);
  } else {
    pass('P2-9', `${order}: approve button disabled and relabelled "${btn.text}"`);
  }

  // Force the click even if disabled — a disabled attribute is a UI courtesy, not a
  // guarantee. What matters is that the handler does not move the order.
  await page.$eval('#approve-btn', el => { el.disabled = false; el.click(); }).catch(() => {});
  await page.waitForTimeout(6000);

  const after = await orderState(order);
  if (after.status !== st.status) {
    finding('S1', 'P2-9', `${order} status CHANGED ${st.status} → ${after.status} after a forced re-approve`);
  } else {
    pass('P2-9', `${order}: status still ${after.status} after a forced re-approve — genuine no-op`);
  }
  if (errs.length) finding('S3', 'P2-9', `${order}: ${errs.length} pageerror(s) on re-approve — ${errs[0].slice(0, 100)}`);

  await shot(page, `p2-9-${order}.png`);
  await page.close();
}

note('');
note(`═══ RESULT: ${findings.length} finding(s) ═══`);
findings.forEach(f => note(`  ${f.sev} ${f.id} — ${f.msg}`));
fs.writeFileSync(path.join(RUN_DIR, 'findings.json'),
  JSON.stringify({ approvedOrder: APPROVED, paidOrder: PAID, ranAt: new Date().toISOString(), findings }, null, 2));
fs.writeFileSync(path.join(RUN_DIR, 'run.log'), log.join('\n'));
note(`Artefacts → ${RUN_DIR}`);

await browser.close();
process.exit(findings.some(f => f.sev === 'S1') ? 1 : 0);
