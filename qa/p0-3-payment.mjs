// P0-3 — customer approves the preview and pays with a Stripe test card.
// Catalogue: work/pre-launch-qa/case-catalogue_v1.md
//
// Pass criteria (P0-3):
//   a) customer opens the preview link → "Approve & confirm" succeeds → status `approved`
//   b) "Pay now" → Stripe Checkout → test card 4242… → payment completes
//   c) status → `paid`; payment-confirmation email arrives; dashboard shows paid
//
// Prereq: the order is at `review_sent` with a previewToken (i.e. P0-2 has run).
// The token is read off the dashboard row rather than being passed in.
//
// Stripe is in TEST mode — no real money moves. Cards:
//   4242 4242 4242 4242 success · 4000 0000 0000 0002 decline
//
// Run: node qa/p0-3-payment.mjs <AEV-nnn> <testmail-tag>

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { waitForEmail } from './testmail.mjs';

const ORDER = (process.argv[2] || '').toUpperCase();
const TAG = process.argv[3];
const CARD = process.argv[4] || '4242424242424242';
if (!/^AEV-\d+$/.test(ORDER) || !TAG) {
  console.error('Usage: node qa/p0-3-payment.mjs <AEV-nnn> <testmail-tag> [card]');
  process.exit(1);
}

const BASE = 'https://aevia-test.pages.dev/pages';
const RUN_DIR = path.resolve('sessions/qa-runs', `${new Date().toISOString().slice(0, 10)}-p0-3-${ORDER}`);
fs.mkdirSync(RUN_DIR, { recursive: true });

const env = Object.fromEntries(
  fs.readFileSync(path.resolve('qa/.env'), 'utf8')
    .split('\n').filter(l => l.trim() && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const log = [], findings = [];
const note = (m) => { const l = `[${new Date().toISOString().slice(11, 19)}] ${m}`; console.log(l); log.push(l); };
const finding = (sev, msg) => { findings.push({ sev, id: 'P0-3', order: ORDER, msg }); note(`  ⚠️  ${sev} ${msg}`); };
const shot = async (p, n) => { await p.screenshot({ path: path.join(RUN_DIR, n), fullPage: true }); note(`📸 ${n}`); };

const consoleMsgs = [], toasts = [];
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } });
ctx.on('page', pg => {
  pg.on('console', m => { if (['error', 'warning'].includes(m.type())) consoleMsgs.push(`${m.type()}: ${m.text()}`); });
  pg.on('pageerror', e => consoleMsgs.push(`pageerror: ${e.message}`));
  pg.on('dialog', d => { note(`  💬 ${d.type()}: "${d.message().slice(0, 90)}"`); d.accept().catch(() => {}); });
});

let payTs = null, previewUrl = null;

try {
  // ── A. Staff: read the preview link off the dashboard row ─────
  note(`── A. Dashboard — fetch preview link for ${ORDER}`);
  const dash = await ctx.newPage();
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
  previewUrl = await dash.$$eval('#orders-body a', (as, n) => {
    const a = as.find(x => (x.href || '').includes('customer-preview') && (x.closest('tr')?.innerText || '').includes(n));
    return a ? a.href : null;
  }, ORDER);
  note(`Preview URL: ${previewUrl || '(none — has P0-2 run?)'}`);
  if (!previewUrl) { finding('S1', `No preview link on the dashboard for ${ORDER} — run P0-2 first`); throw new Error('no preview link'); }

  // ── B. Customer: open the preview ─────────────────────────────
  note('── B. Customer opens the preview');
  const cust = await ctx.newPage();
  cust.on('console', m => { const t = m.text(); if (/toast/i.test(t)) toasts.push(t); });
  await cust.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await cust.waitForSelector('#book-canvas', { timeout: 120000 });
  await cust.waitForTimeout(6000);
  const photos = await cust.$$eval('#book-canvas .photo-slot img', els => els.filter(i => i.naturalWidth > 0).length);
  note(`Book rendered — ${photos} photos`);
  await shot(cust, '01-preview.png');

  // ── C. Approve ────────────────────────────────────────────────
  // approve-btn gates on checkBookComplete() first, then auto-saves, then calls
  // approveOrder. On success it sets status=approved and reveals #pay-btn.
  note('── C. Approve & confirm');
  const approveBtn = await cust.$('#approve-btn');
  if (!approveBtn) { finding('S1', '#approve-btn not present on the preview'); throw new Error('no approve button'); }
  const approveLabel = (await cust.textContent('#approve-btn')).trim();
  const approveDisabled = await approveBtn.isDisabled();
  note(`Approve button reads: "${approveLabel}"${approveDisabled ? ' (disabled)' : ''}`);

  if (approveDisabled) {
    // Already approved by an earlier run — the button locks to "Approved ✓" and the
    // page goes read-only. That is correct behaviour (see P2-9), so carry on to pay.
    note('Order was already approved — skipping approve, going straight to pay');
  } else {
    await cust.click('#approve-btn');
  }
  // Pay button is revealed by lockForApproval() once approveOrder returns.
  await cust.waitForSelector('#pay-btn', { state: 'visible', timeout: 90000 });
  note('✅ Approved — Pay button revealed');
  const payLabel = (await cust.textContent('#pay-btn')).trim();
  note(`Pay button reads: "${payLabel}"`);
  if (!/€/.test(payLabel)) finding('S3', `Pay button shows no price: "${payLabel}"`);
  await shot(cust, '02-approved.png');

  // ── D. Pay now → Stripe Checkout ──────────────────────────────
  note('── D. Pay now → Stripe Checkout');
  payTs = Date.now();
  await cust.click('#pay-btn');
  await cust.waitForURL(/checkout\.stripe\.com/, { timeout: 90000 });
  note(`Stripe Checkout reached: ${cust.url().slice(0, 60)}…`);
  await cust.waitForSelector('#shippingName', { timeout: 60000 });
  await cust.waitForTimeout(4000);
  await shot(cust, '03-stripe-checkout.png');

  const summary = await cust.innerText('body').catch(() => '');
  const total = (summary.match(/Total due\s*€\s*([\d.,]+)/i) || [])[1];
  note(`Stripe shows total due: ${total ? '€' + total : '(not read)'}`);

  // ── E. Shipping + test card ───────────────────────────────────
  // Checkout collects a shipping address, and the card fields do NOT exist until the
  // Card row of the payment-method accordion is opened. Its clickable overlay
  // (data-testid=card-accordion-item-button) reports itself as invisible to Playwright
  // while still intercepting pointer events, so dispatch the click on the element.
  note('── E. Shipping address');
  await cust.fill('#shippingName', 'QA Tester');
  await cust.fill('#shippingAddressLine1', 'Bloch-Bauer-Promenade 20');
  await cust.fill('#shippingPostalCode', '1100');
  await cust.fill('#shippingLocality', 'Vienna');

  note(`── E. Paying with test card ${CARD.slice(0, 4)}…`);
  await cust.$eval('[data-testid=card-accordion-item-button]', el => el.click());
  await cust.waitForSelector('#cardNumber', { state: 'visible', timeout: 30000 });
  await cust.fill('#cardNumber', CARD);
  await cust.fill('#cardExpiry', '12' + String(new Date().getFullYear() + 2).slice(-2));
  await cust.fill('#cardCvc', '123');
  await shot(cust, '04-card-filled.png');

  await cust.click('.SubmitButton');
  note('Submitted payment — waiting for redirect back…');

  // Stripe redirects to the success URL on our domain.
  await cust.waitForURL(u => !/checkout\.stripe\.com/.test(u.toString()), { timeout: 180000 });
  await cust.waitForTimeout(6000);
  note(`Redirected back to: ${cust.url().slice(0, 90)}`);
  await shot(cust, '05-after-payment.png');

  const bodyTxt = (await cust.textContent('body')).replace(/\s+/g, ' ');
  if (/declin|failed|error/i.test(bodyTxt.slice(0, 300))) finding('S1', `Payment page shows an error: ${bodyTxt.slice(0, 140)}`);

} catch (err) {
  note(`❌ P0-3 ERROR: ${err.message}`);
  if (!findings.some(f => f.sev === 'S1')) finding('S1', `P0-3 threw: ${err.message}`);
}

// ── F. Payment-confirmation email ───────────────────────────────
if (payTs) {
  note('── F. Payment-confirmation email');
  try {
    const mail = await waitForEmail({ tag: TAG, sinceTs: payTs, timeoutMs: 180000 });
    note('✅ EMAIL RECEIVED');
    note(`   subject: ${mail.subject}`);
    note(`   from:    ${mail.from}`);
    if (!/paid|payment|receipt|confirm/i.test(mail.subject)) {
      finding('S2', `Email after payment is not a payment confirmation: "${mail.subject}"`);
    }
    fs.writeFileSync(path.join(RUN_DIR, 'payment-email.html'), mail.html || mail.text || '');
  } catch (e) {
    note(`❌ ${e.message}`);
    finding('S1', `No payment-confirmation email within 180s for ${ORDER}`);
  }
}

// ── G. Status → paid (the webhook writes it, so allow time) ─────
if (payTs) {
  note('── G. Dashboard status');
  const dash2 = await ctx.newPage();
  try {
    await dash2.goto(`${BASE}/staff/dashboard.html`, { waitUntil: 'domcontentloaded' });
    await dash2.waitForSelector('#email-input', { state: 'visible', timeout: 30000 });
    await dash2.fill('#email-input', env.STAFF_TEST_EMAIL);
    await dash2.fill('#pwd-input', env.STAFF_TEST_PASSWORD);
    await dash2.click('.lock-btn');
    await dash2.waitForSelector('#app', { state: 'visible', timeout: 30000 });

    // stripeWebhook flips the status server-side — poll rather than assume.
    let status = null;
    for (let i = 0; i < 12; i++) {
      await dash2.waitForFunction(
        (n) => (document.getElementById('orders-body')?.innerText || '').includes(n),
        ORDER, { timeout: 60000 }
      ).catch(() => {});
      status = await dash2.$$eval('#orders-body tr', (rows, n) => {
        const tr = rows.find(r => r.innerText.includes(n));
        const sel = tr?.querySelector('select.status-select');
        return sel ? sel.value : null;
      }, ORDER);
      if (status === 'paid') break;
      note(`   status = ${status} — waiting for webhook…`);
      await dash2.waitForTimeout(10000);
      await dash2.reload({ waitUntil: 'domcontentloaded' });
    }
    note(`Final status: ${status}`);
    if (status !== 'paid') finding('S1', `Status is "${status}" after payment, expected "paid" (webhook may not have fired)`);
    else note('✅ Status = paid');
    await shot(dash2, '06-dashboard-paid.png');
  } catch (e) {
    note(`❌ DASHBOARD ERROR: ${e.message}`);
    finding('S1', `Dashboard status check failed: ${e.message}`);
  }
}

// ── Report ──────────────────────────────────────────────────────
note('');
note(`════════ P0-3 ${ORDER} RESULT ════════`);
note(`Findings: ${findings.length}`);
findings.forEach(f => note(`  ${f.sev} ${f.msg}`));
if (consoleMsgs.length) { note('--- console ---'); [...new Set(consoleMsgs)].slice(0, 10).forEach(m => note('  ' + m)); } else note('Console: clean 🎉');

fs.writeFileSync(path.join(RUN_DIR, 'run-log.txt'), log.join('\n'));
fs.writeFileSync(path.join(RUN_DIR, 'findings.json'), JSON.stringify({ order: ORDER, tag: TAG, card: CARD, previewUrl, findings, consoleMsgs: [...new Set(consoleMsgs)] }, null, 2));
note(`Artefacts → ${RUN_DIR}`);

await browser.close();
process.exit(findings.some(f => f.sev === 'S1') ? 1 : 0);
