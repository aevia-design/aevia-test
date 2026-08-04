// P2 — pay-button abuse (case-catalogue P2-6, P2-7)
//
//   node qa/p2-pay-abuse.mjs [order] [card]     default AEV-042, 4242…
//
// WHY THIS EXISTS
// P2-6 "double-click the pay button → one charge, not two" and P2-7 "back button
// after paying → no double order, no broken state". Both need an order that is
// APPROVED but NOT yet paid, and both are money-path cases, so they are the two
// P2 rows most worth getting right.
//
// Stripe runs in TEST mode — no real money moves. But the order IS consumed: it
// ends this run in `paid` and can never serve an approved-unpaid case again.
//
// HOW P2-6 IS JUDGED
// Two clicks in quick succession must not create two Stripe checkout sessions.
// The script counts requests to createCheckoutSession rather than trusting the UI:
// a button that merely *looks* disabled can still have fired twice.
//
// Artefacts → sessions/qa-runs/<date>-p2-pay-abuse-<order>/

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { orderState } from './firestore.mjs';

const ORDER = (process.argv[2] || 'AEV-042').toUpperCase();
const CARD  = process.argv[3] || '4242424242424242';
const BASE = 'https://aevia-test.pages.dev/pages';
const CHECKOUT_FN = 'createCheckoutSession';
const RUN_DIR = path.resolve('sessions/qa-runs', `${new Date().toISOString().slice(0, 10)}-p2-pay-abuse-${ORDER}`);
fs.mkdirSync(RUN_DIR, { recursive: true });

const log = [], findings = [];
const note = (m) => { const l = `[${new Date().toISOString().slice(11, 19)}] ${m}`; console.log(l); log.push(l); };
const finding = (sev, id, msg) => { findings.push({ sev, id, msg }); note(`  ⚠️  ${sev} ${id} ${msg}`); };
const pass = (id, msg) => note(`  ✓ ${id} ${msg}`);
const shot = async (p, n) => { await p.screenshot({ path: path.join(RUN_DIR, n), fullPage: true }); note(`📸 ${n}`); };

const before = await orderState(ORDER);
if (!before?.previewToken) { console.error(`${ORDER} has no previewToken`); process.exit(1); }
note(`═══ P2-6 / P2-7 — pay abuse on ${ORDER} ═══`);
note(`Starting status: ${before.status}`);
if (before.status === 'paid') { console.error(`${ORDER} is already paid — needs an approved, unpaid order.`); process.exit(1); }
if (before.status !== 'approved') { console.error(`${ORDER} is "${before.status}" — needs status 'approved'.`); process.exit(1); }

const URL = `${BASE}/customer-preview.html?token=${before.previewToken}`;
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
page.on('dialog', d => d.accept().catch(() => {}));

const checkoutCalls = [];
page.on('request', r => { if (r.url().includes(CHECKOUT_FN)) checkoutCalls.push(Date.now()); });

try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(n => window.orderData && window.orderData.orderNumber === n, ORDER, { timeout: 60000 });
  await page.waitForSelector('#pay-btn', { state: 'visible', timeout: 90000 });
  const label = (await page.textContent('#pay-btn')).trim();
  note(`Pay button: "${label}"`);
  await shot(page, '01-before-pay.png');

  // ── P2-6 — double click ───────────────────────────────────────────────────
  note('── P2-6: double-click pay ──');
  // Two clicks ~120ms apart: fast enough to beat a naive guard, slow enough to be
  // a real double-click rather than a synthetic same-tick dispatch.
  await page.click('#pay-btn', { noWaitAfter: true }).catch(() => {});
  await page.waitForTimeout(120);
  await page.click('#pay-btn', { noWaitAfter: true }).catch(() => {});

  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 90000 });
  await page.waitForTimeout(5000);
  note(`  createCheckoutSession fired ${checkoutCalls.length}×`);
  if (checkoutCalls.length > 1) {
    finding('S2', 'P2-6', `double-click created ${checkoutCalls.length} Stripe checkout sessions — the pay button is not guarded against a second click`);
  } else {
    pass('P2-6', 'double-click created exactly one checkout session');
  }
  await shot(page, '02-stripe-checkout.png');

  // ── Complete the payment once ────────────────────────────────────────────
  note('── Paying once with the test card ──');
  await page.fill('#shippingName', 'QA Tester');
  await page.fill('#shippingAddressLine1', 'Bloch-Bauer-Promenade 20');
  await page.fill('#shippingPostalCode', '1100');
  await page.fill('#shippingLocality', 'Vienna');
  // The card row's overlay reports itself invisible to Playwright while still
  // intercepting pointer events — dispatch the click on the element itself.
  await page.$eval('[data-testid=card-accordion-item-button]', el => el.click());
  await page.waitForSelector('#cardNumber', { state: 'visible', timeout: 30000 });
  await page.fill('#cardNumber', CARD);
  await page.fill('#cardExpiry', '12' + String(new Date().getFullYear() + 2).slice(-2));
  await page.fill('#cardCvc', '123');
  await page.click('.SubmitButton');
  await page.waitForURL(u => !/checkout\.stripe\.com/.test(u.toString()), { timeout: 180000 });
  await page.waitForTimeout(8000);
  note(`  redirected back to ${page.url().slice(0, 80)}`);
  await shot(page, '03-after-payment.png');

  // stripeWebhook flips status server-side — poll rather than assume.
  let paid = false;
  for (let i = 0; i < 12 && !paid; i++) {
    const s = await orderState(ORDER);
    if (s.status === 'paid') { paid = true; break; }
    await page.waitForTimeout(5000);
  }
  if (paid) pass('P2-6', `${ORDER} reached status paid`);
  else finding('S1', 'P2-6', `${ORDER} did NOT reach paid within 60s of the redirect — status is "${(await orderState(ORDER)).status}"`);

  // ── P2-7 — back button after paying ──────────────────────────────────────
  note('── P2-7: back button after paying ──');
  const callsBeforeBack = checkoutCalls.length;
  await page.goBack({ waitUntil: 'domcontentloaded' }).catch(e => note(`  goBack: ${e.message.slice(0, 60)}`));
  await page.waitForTimeout(8000);
  note(`  landed on ${page.url().slice(0, 90)}`);
  await shot(page, '04-after-back.png');

  // Whatever the back button lands on, the order must still be paid and the page
  // must not offer to pay again.
  const stAfterBack = await orderState(ORDER);
  if (stAfterBack.status !== 'paid') {
    finding('S1', 'P2-7', `after Back, ${ORDER} status is "${stAfterBack.status}" — payment state was lost`);
  } else {
    pass('P2-7', `order still paid after Back`);
  }

  // Return to the preview directly — this is what a customer does next.
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(12000);
  const ui = await page.evaluate(() => {
    const pay = document.getElementById('pay-btn');
    const notice = document.getElementById('payment-success-notice');
    return {
      payVisible: !!(pay && pay.offsetParent !== null),
      payDisabled: pay ? pay.disabled : null,
      noticeVisible: !!(notice && notice.offsetParent !== null),
      readOnly: window._readOnly === true,
    };
  });
  note(`  reloaded preview: payBtn visible=${ui.payVisible} disabled=${ui.payDisabled} | paid notice=${ui.noticeVisible} | _readOnly=${ui.readOnly}`);
  if (ui.payVisible && ui.payDisabled === false) {
    finding('S2', 'P2-7', 'after paying, reloading the preview still shows an ENABLED pay button — the customer can start a second checkout');
  } else {
    pass('P2-7', 'paid order no longer offers an active pay button');
  }
  if (!ui.noticeVisible) finding('S3', 'P2-7', 'no payment-success notice shown on a paid order — the customer gets no confirmation on the page');
  await shot(page, '05-preview-after-paid.png');

  if (checkoutCalls.length > callsBeforeBack) {
    finding('S2', 'P2-7', `Back / reload triggered ${checkoutCalls.length - callsBeforeBack} further checkout session(s)`);
  }

} catch (err) {
  finding('S1', 'HARNESS', `run aborted: ${err.message.slice(0, 200)}`);
  await shot(page, 'ERROR-final.png').catch(() => {});
} finally {
  const after = await orderState(ORDER);
  note('');
  note(`${ORDER}: ${before.status} → ${after.status} | total createCheckoutSession calls: ${checkoutCalls.length}`);
  note(`═══ RESULT: ${findings.length} finding(s) ═══`);
  findings.forEach(f => note(`  ${f.sev} ${f.id} — ${f.msg}`));
  fs.writeFileSync(path.join(RUN_DIR, 'findings.json'),
    JSON.stringify({ order: ORDER, statusBefore: before.status, statusAfter: after.status,
                     checkoutCalls: checkoutCalls.length, ranAt: new Date().toISOString(), findings }, null, 2));
  fs.writeFileSync(path.join(RUN_DIR, 'run.log'), log.join('\n'));
  note(`Artefacts → ${RUN_DIR}`);
  await browser.close();
  process.exit(findings.some(f => f.sev === 'S1') ? 1 : 0);
}
