// P1 promo track — approve an order and pay it, optionally applying a promotion code
// in Stripe Checkout's hosted "Add promotion code" field.
//
// Copied from qa/p0-3-payment.mjs; the only new leg is section D2 (the promo field) and a
// richer read of the Checkout order summary (subtotal / discount / total).
//
// Run: node qa/p1-promo-pay.mjs <AEV-nnn> <testmail-tag> [PROMOCODE] [--expect-reject]
//   --expect-reject : the code SHOULD be refused; the run passes if Stripe refuses it, and
//                     then pays without a code so the order still completes.
//
// Stripe is in TEST mode. Card 4242 4242 4242 4242.

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { waitForEmail } from './testmail.mjs';

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const flags = process.argv.slice(2).filter(a => a.startsWith('--'));
const ORDER = (args[0] || '').toUpperCase();
const TAG = args[1];
const CODE = args[2] || null;
const EXPECT_REJECT = flags.includes('--expect-reject');
const CARD = '4242424242424242';

if (!/^AEV-\d+$/.test(ORDER) || !TAG) {
  console.error('Usage: node qa/p1-promo-pay.mjs <AEV-nnn> <testmail-tag> [PROMOCODE] [--expect-reject]');
  process.exit(1);
}

const BASE = 'https://aevia-test.pages.dev/pages';
const SLUG = `${new Date().toISOString().slice(0, 10)}-p1-promo-pay-${ORDER}${CODE ? '-' + CODE : '-nocode'}`;
const RUN_DIR = path.resolve('sessions/qa-runs', SLUG);
fs.mkdirSync(RUN_DIR, { recursive: true });

const env = Object.fromEntries(
  fs.readFileSync(path.resolve('qa/.env'), 'utf8')
    .split('\n').filter(l => l.trim() && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const log = [], findings = [];
const note = (m) => { const l = `[${new Date().toISOString().slice(11, 19)}] ${m}`; console.log(l); log.push(l); };
const finding = (sev, msg) => { findings.push({ sev, order: ORDER, code: CODE, msg }); note(`  ⚠️  ${sev} ${msg}`); };
const shot = async (p, n) => { await p.screenshot({ path: path.join(RUN_DIR, n), fullPage: true }); note(`📸 ${n}`); };

const result = { order: ORDER, code: CODE, expectReject: EXPECT_REJECT, codeAccepted: null, codeError: null, totals: {}, paid: null };

const consoleMsgs = [];
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
ctx.on('page', pg => {
  pg.on('console', m => { if (['error', 'warning'].includes(m.type())) consoleMsgs.push(`${m.type()}: ${m.text()}`); });
  pg.on('pageerror', e => consoleMsgs.push(`pageerror: ${e.message}`));
  pg.on('dialog', d => { note(`  💬 ${d.type()}: "${d.message().slice(0, 90)}"`); d.accept().catch(() => {}); });
});

// Read the Checkout order summary (it is plain DOM text, no iframe).
const readTotals = async (pg) => {
  const txt = (await pg.innerText('body').catch(() => '')).replace(/ /g, ' ');
  const grab = (re) => { const m = txt.match(re); return m ? m[1].trim() : null; };
  return {
    subtotal: grab(/Subtotal\s*€\s*([\d.,]+)/i),
    discount: grab(/(?:Discount|Rabatt)[^\n]*\n?\s*-?\s*€\s*([\d.,]+)/i),
    total: grab(/Total due\s*€\s*([\d.,]+)/i),
    raw: txt.split('\n').filter(l => /€|Subtotal|Total|Discount|promotion/i.test(l)).slice(0, 20),
  };
};

let payTs = null;

try {
  // ── A. Preview link off the dashboard ─────────────────────────
  note(`── A. Dashboard — preview link for ${ORDER}`);
  const dash = await ctx.newPage();
  await dash.goto(`${BASE}/staff/dashboard.html`, { waitUntil: 'domcontentloaded' });
  await dash.waitForSelector('#email-input', { state: 'visible', timeout: 30000 });
  await dash.fill('#email-input', env.STAFF_TEST_EMAIL);
  await dash.fill('#pwd-input', env.STAFF_TEST_PASSWORD);
  await dash.click('.lock-btn');
  await dash.waitForSelector('#app', { state: 'visible', timeout: 30000 });
  await dash.waitForFunction((n) => (document.getElementById('orders-body')?.innerText || '').includes(n), ORDER, { timeout: 60000 });
  const previewUrl = await dash.$$eval('#orders-body a', (as, n) => {
    const a = as.find(x => (x.href || '').includes('customer-preview') && (x.closest('tr')?.innerText || '').includes(n));
    return a ? a.href : null;
  }, ORDER);
  if (!previewUrl) { finding('S1', `No preview link for ${ORDER} — run p0-2 first`); throw new Error('no preview link'); }
  note(`Preview URL: ${previewUrl.slice(0, 70)}…`);
  await dash.close();

  // ── B/C. Customer opens the preview and approves ──────────────
  note('── B. Customer opens the preview');
  const cust = await ctx.newPage();
  await cust.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await cust.waitForSelector('#book-canvas', { timeout: 120000 });
  await cust.waitForTimeout(6000);

  note('── C. Approve & confirm');
  const approveBtn = await cust.$('#approve-btn');
  if (!approveBtn) { finding('S1', '#approve-btn not present'); throw new Error('no approve button'); }
  if (await approveBtn.isDisabled()) note('Already approved — skipping approve');
  else await cust.click('#approve-btn');
  await cust.waitForSelector('#pay-btn', { state: 'visible', timeout: 90000 });
  note(`✅ Approved — pay button reads "${(await cust.textContent('#pay-btn')).trim()}"`);

  // ── D. Stripe Checkout ────────────────────────────────────────
  note('── D. Pay now → Stripe Checkout');
  payTs = Date.now();
  await cust.click('#pay-btn');
  await cust.waitForURL(/checkout\.stripe\.com/, { timeout: 90000 });
  await cust.waitForSelector('#shippingName', { timeout: 60000 });
  await cust.waitForTimeout(4000);
  result.totals.before = await readTotals(cust);
  note(`Before code — subtotal=${result.totals.before.subtotal} total=${result.totals.before.total}`);
  await shot(cust, '01-checkout.png');

  // ── D2. Apply the promotion code ──────────────────────────────
  // Checkout renders the promo entry as a link/button ("Add promotion code") that swaps in
  // an <input id=promotionCode> + Apply. Selectors are not stable across Stripe releases,
  // so match on role/text and verify the input actually appeared.
  if (CODE) {
    note(`── D2. Apply promotion code "${CODE}"`);
    const opener = cust.getByText(/add promotion code|promotion code/i).first();
    if (await opener.count().catch(() => 0)) {
      await opener.click({ force: true }).catch(() => {});
      await cust.waitForTimeout(1500);
    }
    const input = await cust.waitForSelector('#promotionCode, input[name=promotionCode]', { state: 'visible', timeout: 20000 }).catch(() => null);
    if (!input) {
      finding('S1', 'Stripe Checkout shows no promotion-code field (allow_promotion_codes not set?)');
      await shot(cust, 'ERROR-no-promo-field.png');
    } else {
      await input.fill(CODE);
      await shot(cust, '02-code-typed.png');
      // Apply button sits next to the field.
      const apply = cust.getByRole('button', { name: /apply/i }).first();
      if (await apply.count().catch(() => 0)) await apply.click({ force: true });
      else await cust.keyboard.press('Enter');
      await cust.waitForTimeout(6000);
      await shot(cust, '03-code-applied.png');

      const after = await readTotals(cust);
      result.totals.after = after;
      const bodyTxt = (await cust.innerText('body')).replace(/\s+/g, ' ');
      // Stripe's rejection copy varies: "not valid", "invalid", "cannot be applied", "expired"…
      const errMatch = bodyTxt.match(/([^.]*?(?:promo(?:tion)? code|code)[^.]*?(?:not valid|invalid|isn.t valid|cannot|can.t|expired|not active|no longer)[^.]*)/i);
      const stillHasInput = await cust.$('#promotionCode, input[name=promotionCode]');
      const discountApplied = !!after.discount || (after.total && result.totals.before.total && after.total !== result.totals.before.total);

      result.codeAccepted = !!discountApplied;
      result.codeError = errMatch ? errMatch[1].trim().slice(0, 160) : (stillHasInput && !discountApplied ? '(field still open, no discount applied)' : null);

      note(`After code — subtotal=${after.subtotal} discount=${after.discount} total=${after.total}`);
      note(`Code accepted: ${result.codeAccepted}${result.codeError ? ` | message: "${result.codeError}"` : ''}`);

      if (EXPECT_REJECT && result.codeAccepted) {
        finding('S1', `Code "${CODE}" was ACCEPTED but should have been rejected — discount ${after.discount || '?'} applied, total ${after.total}`);
      }
      if (!EXPECT_REJECT && !result.codeAccepted) {
        finding('S1', `Code "${CODE}" was REJECTED — no discount applied${result.codeError ? `: "${result.codeError}"` : ''}`);
      }

      // A rejected code leaves the session at full price; still pay, so the order completes
      // and the second-order state is realistic.
      if (!result.codeAccepted) note('Paying at full price (code did not apply)');
    }
  }

  // ── E. Shipping + card ────────────────────────────────────────
  note('── E. Shipping + test card');
  await cust.fill('#shippingName', 'QA Promo');
  await cust.fill('#shippingAddressLine1', 'Bloch-Bauer-Promenade 20');
  await cust.fill('#shippingPostalCode', '1100');
  await cust.fill('#shippingLocality', 'Vienna');
  await cust.$eval('[data-testid=card-accordion-item-button]', el => el.click()).catch(() => {});
  await cust.waitForSelector('#cardNumber', { state: 'visible', timeout: 30000 });
  await cust.fill('#cardNumber', CARD);
  await cust.fill('#cardExpiry', '12' + String(new Date().getFullYear() + 2).slice(-2));
  await cust.fill('#cardCvc', '123');

  result.totals.atPay = await readTotals(cust);
  note(`At pay — total=${result.totals.atPay.total}`);
  await shot(cust, '04-card-filled.png');

  await cust.click('.SubmitButton');
  note('Submitted — waiting for redirect…');
  await cust.waitForURL(u => !/checkout\.stripe\.com/.test(u.toString()), { timeout: 180000 });
  await cust.waitForTimeout(6000);
  note(`Back on: ${cust.url().slice(0, 80)}`);
  await shot(cust, '05-after-payment.png');

} catch (err) {
  note(`❌ ERROR: ${err.message}`);
  if (!findings.some(f => f.sev === 'S1')) finding('S1', `Pay run threw: ${err.message}`);
}

// ── F. Payment email ────────────────────────────────────────────
if (payTs) {
  note('── F. Payment-confirmation email');
  try {
    const mail = await waitForEmail({ tag: TAG, sinceTs: payTs, timeoutMs: 180000 });
    note(`✅ "${mail.subject}" from ${mail.from}`);
    result.paymentEmail = mail.subject;
  } catch {
    finding('S2', `No payment-confirmation email within 180s for ${ORDER}`);
  }
}

// ── G. Status → paid ────────────────────────────────────────────
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
    let status = null;
    for (let i = 0; i < 12; i++) {
      await dash2.waitForFunction((n) => (document.getElementById('orders-body')?.innerText || '').includes(n), ORDER, { timeout: 60000 }).catch(() => {});
      status = await dash2.$$eval('#orders-body tr', (rows, n) => {
        const tr = rows.find(r => r.innerText.includes(n));
        return tr?.querySelector('select.status-select')?.value ?? null;
      }, ORDER);
      if (status === 'paid') break;
      note(`   status = ${status} — waiting for webhook…`);
      await dash2.waitForTimeout(10000);
      await dash2.reload({ waitUntil: 'domcontentloaded' });
    }
    result.paid = status === 'paid';
    if (status !== 'paid') finding('S1', `Status is "${status}" after payment, expected "paid"`);
    else note('✅ Status = paid');
    await shot(dash2, '06-dashboard-paid.png');
  } catch (e) {
    finding('S1', `Dashboard status check failed: ${e.message}`);
  }
}

// ── Report ──────────────────────────────────────────────────────
note('');
note(`════════ P1 PROMO PAY — ${ORDER} / ${CODE || 'no code'} ════════`);
note(`Code accepted: ${result.codeAccepted}`);
note(`Totals: ${JSON.stringify(result.totals.atPay || result.totals.before)}`);
note(`Paid: ${result.paid}`);
note(`Findings: ${findings.length}`);
findings.forEach(f => note(`  ${f.sev} ${f.msg}`));
if (consoleMsgs.length) { note('--- console ---'); [...new Set(consoleMsgs)].slice(0, 8).forEach(m => note('  ' + m)); } else note('Console: clean 🎉');

fs.writeFileSync(path.join(RUN_DIR, 'run-log.txt'), log.join('\n'));
fs.writeFileSync(path.join(RUN_DIR, 'findings.json'), JSON.stringify({ ...result, findings, consoleMsgs: [...new Set(consoleMsgs)] }, null, 2));
note(`Artefacts → ${RUN_DIR}`);

await browser.close();
process.exit(findings.some(f => f.sev === 'S1') ? 1 : 0);
