// P1 promo track (S127) — the ADR-0008 flow: code entry+validation happens on OUR pay page
// (customer-preview.html #promo-input/#promo-apply), NOT in Stripe's hosted checkout, which
// now has allow_promotion_codes:false. Supersedes qa/p1-promo-pay.mjs for this build.
//
// Navigates straight to the customer-preview link via the order's previewToken (read from
// Firestore — no dashboard hop needed for this one).
//
// Run: node qa/p1-promo-adr8.mjs <AEV-nnn> [CODE] [testmail-tag] [flags]
//   --approve        order is review_sent; click Approve first
//   --expect-denied  the code SHOULD be refused by validatePromoCode; the run passes if it is,
//                    and never proceeds to Stripe (order stays approved/unpaid)
//   --no-pay         open Stripe Checkout (with/without the code), verify totals + that the
//                    hosted promo-code UI is absent, then go back WITHOUT paying
//   --expect-percent <N>  assert the applied discount is N% (case d)
//   --expect-amount  <N>  assert the applied discount is €N off (case b)
//
// Stripe is in TEST mode. Card 4242 4242 4242 4242.

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { waitForEmail } from './testmail.mjs';
import { getOrder } from './firestore.mjs';

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const flagArgs = process.argv.slice(2).filter(a => a.startsWith('--'));
const flag = (name) => flagArgs.includes(`--${name}`);
const flagVal = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? null : process.argv[i + 1];
};

const ORDER = (args[0] || '').toUpperCase();
const CODE = args[1] || null;
const TAG = args[2] || null;
const APPROVE = flag('approve');
const EXPECT_DENIED = flag('expect-denied');
const NO_PAY = flag('no-pay');
const EXPECT_PERCENT = flagVal('expect-percent');
const EXPECT_AMOUNT = flagVal('expect-amount');
const CARD = '4242424242424242';

if (!/^AEV-\d+$/.test(ORDER)) {
  console.error('Usage: node qa/p1-promo-adr8.mjs <AEV-nnn> [CODE] [testmail-tag] [flags]');
  process.exit(1);
}

const BASE = 'https://aevia-test.pages.dev/pages';
const SLUG = `${new Date().toISOString().slice(0, 10)}-p1-promo-adr8-${ORDER}${CODE ? '-' + CODE : '-nocode'}`;
const RUN_DIR = path.resolve('sessions/qa-runs', SLUG);
fs.mkdirSync(RUN_DIR, { recursive: true });

const log = [], findings = [];
const note = (m) => { const l = `[${new Date().toISOString().slice(11, 19)}] ${m}`; console.log(l); log.push(l); };
const finding = (sev, msg) => { findings.push({ sev, order: ORDER, code: CODE, msg }); note(`  ⚠️  ${sev} ${msg}`); };
const shot = async (p, n) => { await p.screenshot({ path: path.join(RUN_DIR, n), fullPage: true }); note(`📸 ${n}`); };

const result = { order: ORDER, code: CODE, expectDenied: EXPECT_DENIED, noPay: NO_PAY, promoResult: null, totals: {}, paid: null };

const consoleMsgs = [];
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
ctx.on('page', pg => {
  pg.on('console', m => { if (['error', 'warning'].includes(m.type())) consoleMsgs.push(`${m.type()}: ${m.text()}`); });
  pg.on('pageerror', e => consoleMsgs.push(`pageerror: ${e.message}`));
  pg.on('dialog', d => { note(`  💬 ${d.type()}: "${d.message().slice(0, 90)}"`); d.accept().catch(() => {}); });
});

const readTotals = async (pg) => {
  const txt = (await pg.innerText('body').catch(() => '')).replace(/ /g, ' ');
  const grab = (re) => { const m = txt.match(re); return m ? m[1].trim() : null; };
  // The itemized "Subtotal / Discount / Total due" summary only renders once a
  // discount is attached. A plain no-discount session just shows one big price
  // next to the product name — fall back to the first €NN.NN on the page for that case.
  const firstPrice = grab(/€\s*([\d]+\.\d{2})/);
  return {
    subtotal: grab(/Subtotal\s*€\s*([\d.,]+)/i),
    discount: grab(/(?:Discount|Rabatt)[^\n]*\n?\s*-?\s*€\s*([\d.,]+)/i),
    total: grab(/Total due\s*€\s*([\d.,]+)/i) || firstPrice,
  };
};

let payTs = null;

try {
  const orderDoc = await getOrder(ORDER);
  if (!orderDoc) throw new Error(`${ORDER} not found in Firestore`);
  if (!orderDoc.previewToken) throw new Error(`${ORDER} has no previewToken — run p0-2 first`);
  note(`── Order ${ORDER}: status=${orderDoc.status} email=${orderDoc.email} price=€${orderDoc.price}`);
  const previewUrl = `${BASE}/customer-preview.html?token=${orderDoc.previewToken}`;

  // ── A. Open the preview ────────────────────────────────────────
  note('── A. Open customer preview');
  const cust = await ctx.newPage();
  await cust.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await cust.waitForSelector('#book-canvas', { timeout: 120000 });
  await cust.waitForTimeout(6000);

  // ── B. Approve if needed ───────────────────────────────────────
  if (APPROVE) {
    note('── B. Approve');
    const approveBtn = await cust.$('#approve-btn');
    if (!approveBtn) { finding('S1', '#approve-btn not present'); throw new Error('no approve button'); }
    if (await approveBtn.isDisabled()) note('Already approved — skipping approve');
    else await cust.click('#approve-btn');
    await cust.waitForSelector('#pay-btn', { state: 'visible', timeout: 90000 });
  }
  await cust.waitForSelector('#pay-btn', { state: 'visible', timeout: 30000 });
  note(`Pay button reads "${(await cust.textContent('#pay-btn')).trim()}"`);

  // ── C. Apply the code on OUR page ──────────────────────────────
  if (CODE) {
    note(`── C. Apply code "${CODE}" on the pay page`);
    const promoGroupVisible = await cust.isVisible('#promo-group').catch(() => false);
    if (!promoGroupVisible) { finding('S1', '#promo-group not visible in approved-unpaid state'); throw new Error('no promo field'); }
    await cust.fill('#promo-input', CODE);
    await cust.click('#promo-apply');
    // Success: input disabled + Apply button hidden. Failure: msg shown, button re-enabled.
    await cust.waitForFunction(() => {
      const msg = document.getElementById('promo-msg');
      return msg && msg.style.display !== 'none' && msg.textContent.trim().length > 0;
    }, { timeout: 20000 }).catch(() => {});
    await cust.waitForTimeout(500);
    const msgText = (await cust.textContent('#promo-msg').catch(() => '') || '').trim();
    const applied = await cust.evaluate(() => window._appliedPromo || null);
    result.promoResult = { message: msgText, applied: !!applied };
    note(`Promo result — applied=${!!applied} message="${msgText}"`);
    await shot(cust, '01-promo-result.png');

    if (EXPECT_DENIED) {
      if (applied) finding('S1', `Code "${CODE}" was ACCEPTED but should have been DENIED (self-referral or similar)`);
      else note(`✅ Denied as expected: "${msgText}"`);
      note('── Stopping here (--expect-denied): never proceeding to Stripe.');
      fs.writeFileSync(path.join(RUN_DIR, 'run-log.txt'), log.join('\n'));
      fs.writeFileSync(path.join(RUN_DIR, 'findings.json'), JSON.stringify({ ...result, findings, consoleMsgs: [...new Set(consoleMsgs)] }, null, 2));
      await browser.close();
      process.exit(findings.some(f => f.sev === 'S1') ? 1 : 0);
    }
    if (!applied) finding('S1', `Code "${CODE}" was REJECTED but was expected to succeed: "${msgText}"`);
  }

  // ── D. Pay now → Stripe Checkout ───────────────────────────────
  note('── D. Pay now → Stripe Checkout');
  payTs = Date.now();
  await cust.click('#pay-btn');
  await cust.waitForURL(/checkout\.stripe\.com/, { timeout: 90000 });
  await cust.waitForSelector('#shippingName', { timeout: 60000 }).catch(() => {});
  await cust.waitForTimeout(4000);
  result.totals = await readTotals(cust);
  note(`Checkout totals — subtotal=${result.totals.subtotal} discount=${result.totals.discount} total=${result.totals.total}`);
  await shot(cust, '02-checkout.png');

  // ── D2. Confirm Stripe's OWN promo field is gone ───────────────
  const hostedPromo = await cust.getByText(/add promotion code/i).count().catch(() => 0);
  result.hostedPromoFieldPresent = hostedPromo > 0;
  if (hostedPromo > 0) finding('S1', 'Stripe Checkout still shows its own "Add promotion code" field — allow_promotion_codes not off?');
  else note('✅ Stripe hosted promo field absent, as expected under ADR-0008');

  if (EXPECT_PERCENT) {
    const pct = Number(EXPECT_PERCENT);
    const before = Number((orderDoc.price + '').replace(/[^\d.]/g, ''));
    const expectedTotal = (before * (1 - pct / 100)).toFixed(2);
    const gotTotal = (result.totals.total || '').replace(',', '.');
    if (Math.abs(Number(gotTotal) - Number(expectedTotal)) > 0.5) {
      finding('S1', `Expected ~€${expectedTotal} (${pct}% off €${before}) but Checkout shows €${gotTotal}`);
    } else note(`✅ Total €${gotTotal} matches ${pct}% off €${before}`);
  }
  if (EXPECT_AMOUNT) {
    const amt = Number(EXPECT_AMOUNT);
    const before = Number((orderDoc.price + '').replace(/[^\d.]/g, ''));
    const expectedTotal = (before - amt).toFixed(2);
    const gotTotal = (result.totals.total || '').replace(',', '.');
    if (Math.abs(Number(gotTotal) - Number(expectedTotal)) > 0.5) {
      finding('S1', `Expected €${expectedTotal} (€${amt} off €${before}) but Checkout shows €${gotTotal}`);
    } else note(`✅ Total €${gotTotal} matches €${amt} off €${before}`);
  }
  if (!CODE) {
    const before = Number((orderDoc.price + '').replace(/[^\d.]/g, ''));
    const gotTotal = (result.totals.total || '').replace(',', '.');
    if (gotTotal && Math.abs(Number(gotTotal) - before) > 0.5) {
      finding('S1', `No code applied but Checkout total €${gotTotal} != order price €${before}`);
    } else note(`✅ No-code total matches order price €${before}`);
  }

  if (NO_PAY) {
    note('── E. --no-pay: going back without completing payment');
    await cust.goBack({ waitUntil: 'domcontentloaded' }).catch(async () => { await cust.goto(previewUrl, { waitUntil: 'domcontentloaded' }); });
    await cust.waitForTimeout(2000);
    await shot(cust, '03-back-no-pay.png');
    fs.writeFileSync(path.join(RUN_DIR, 'run-log.txt'), log.join('\n'));
    fs.writeFileSync(path.join(RUN_DIR, 'findings.json'), JSON.stringify({ ...result, findings, consoleMsgs: [...new Set(consoleMsgs)] }, null, 2));
    await browser.close();
    process.exit(findings.some(f => f.sev === 'S1') ? 1 : 0);
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
  await shot(cust, '04-card-filled.png');

  await cust.click('.SubmitButton');
  note('Submitted — waiting for redirect…');
  await cust.waitForURL(u => !/checkout\.stripe\.com/.test(u.toString()), { timeout: 180000 });
  await cust.waitForTimeout(6000);
  note(`Back on: ${cust.url().slice(0, 80)}`);
  await shot(cust, '05-after-payment.png');

} catch (err) {
  note(`❌ ERROR: ${err.message}`);
  if (!findings.some(f => f.sev === 'S1')) finding('S1', `Run threw: ${err.message}`);
}

// ── F. Payment email ────────────────────────────────────────────
if (payTs && TAG) {
  note('── F. Payment-confirmation email');
  try {
    const mail = await waitForEmail({ tag: TAG, sinceTs: payTs, timeoutMs: 180000 });
    note(`✅ "${mail.subject}" from ${mail.from}`);
    result.paymentEmail = mail.subject;
  } catch {
    finding('S2', `No payment-confirmation email within 180s for ${ORDER}`);
  }
}

// ── G. Status → paid (poll Firestore directly) ──────────────────
if (payTs) {
  note('── G. Order status (Firestore)');
  let status = null;
  for (let i = 0; i < 12; i++) {
    const o = await getOrder(ORDER);
    status = o ? o.status : null;
    if (status === 'paid') break;
    note(`   status = ${status} — waiting for webhook…`);
    await new Promise(r => setTimeout(r, 10000));
  }
  result.paid = status === 'paid';
  if (status !== 'paid') finding('S1', `Status is "${status}" after payment, expected "paid"`);
  else note('✅ Status = paid');
}

// ── Report ──────────────────────────────────────────────────────
note('');
note(`════════ P1 PROMO ADR-8 — ${ORDER} / ${CODE || 'no code'} ════════`);
note(`Promo result: ${JSON.stringify(result.promoResult)}`);
note(`Totals: ${JSON.stringify(result.totals)}`);
note(`Hosted promo field present: ${result.hostedPromoFieldPresent}`);
note(`Paid: ${result.paid}`);
note(`Findings: ${findings.length}`);
findings.forEach(f => note(`  ${f.sev} ${f.msg}`));
if (consoleMsgs.length) { note('--- console ---'); [...new Set(consoleMsgs)].slice(0, 8).forEach(m => note('  ' + m)); } else note('Console: clean 🎉');

fs.writeFileSync(path.join(RUN_DIR, 'run-log.txt'), log.join('\n'));
fs.writeFileSync(path.join(RUN_DIR, 'findings.json'), JSON.stringify({ ...result, findings, consoleMsgs: [...new Set(consoleMsgs)] }, null, 2));
note(`Artefacts → ${RUN_DIR}`);

await browser.close();
process.exit(findings.some(f => f.sev === 'S1') ? 1 : 0);
