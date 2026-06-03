// QA downstream chain — picks up an order whose book state is ALREADY SAVED by staff
// (in their own browser) and drives only the downstream legs:
//   dashboard generate preview link → customer inspect+approve → Stripe pay → confirm paid.
//
// Deliberately SKIPS the engine load+save leg (see staff-customer-chain.mjs) so it can
// never clobber the staff's creative edits via a save-before-render race.
//
// Run:  $env:STAFF_PW = Read-Host "Staff password"   (PowerShell, before running)
//       $env:QA_ORDER = "AEV-026"
//       node qa/downstream-chain.mjs
//
// Reads STAFF_EMAIL (default evg.myasin@gmail.com) and STAFF_PW from the environment.
// The password is NEVER written to disk, screenshots, or the log.

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ORDER = process.env.QA_ORDER || 'AEV-026';
const EMAIL = process.env.STAFF_EMAIL || 'evg.myasin@gmail.com';
const PW    = process.env.STAFF_PW;
const BASE  = 'https://aevia-test.pages.dev/pages';
const RUN_DIR = path.resolve('sessions/qa-runs/2026-06-03-downstream-' + ORDER);

if (!PW) { console.error('❌ STAFF_PW not set. In PowerShell:  $env:STAFF_PW = Read-Host "Staff password"'); process.exit(1); }
fs.mkdirSync(RUN_DIR, { recursive: true });

const log = [];
const note = (m) => { const l = `[${new Date().toISOString().slice(11,19)}] ${m}`; console.log(l); log.push(l); };
const shot = async (p, name) => { await p.screenshot({ path: path.join(RUN_DIR, name), fullPage: true }); note(`📸 ${name}`); };

const consoleMsgs = [];
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 960 } });
ctx.on('page', pg => {
  pg.on('console', m => { if (['error','warning'].includes(m.type())) consoleMsgs.push(`${m.type()}: ${m.text()}`); });
  pg.on('pageerror', e => consoleMsgs.push(`pageerror: ${e.message}`));
  pg.on('dialog', d => { note(`dialog: "${d.message().slice(0,80)}" → accept`); d.accept().catch(()=>{}); });
});

const page = await ctx.newPage();
let paid = false;

try {
  // ── 1. Dashboard login + generate preview link ────────────────
  note(`Opening dashboard, logging in as ${EMAIL}`);
  await page.goto(`${BASE}/staff/dashboard`, { waitUntil: 'domcontentloaded' });
  if (await page.isVisible('#lock')) {
    await page.waitForSelector('#email-input', { state: 'visible', timeout: 20000 });
    await page.fill('#email-input', EMAIL);
    await page.fill('#pwd-input', PW);
    await page.click('#lock .lock-btn');
  }
  await page.waitForSelector('#app', { state: 'visible', timeout: 20000 });
  await page.waitForFunction(o => document.body.innerText.includes(o), ORDER, { timeout: 30000 });
  note('Dashboard loaded, order visible');

  const genSel = `button[onclick="generatePreviewLink('${ORDER}')"]`;
  if (await page.isVisible(genSel)) {
    await page.click(genSel);
    note('Clicked Generate preview link');
  } else {
    note('Preview link already exists (no generate button) — reusing');
  }
  await page.waitForTimeout(2500);
  // Surface the send-gate alert if the book wasn't saved as complete.
  const previewLoc = page.locator('.preview-url').first();
  if (!(await previewLoc.count())) {
    await shot(page, 'A-dashboard-NO-preview-link.png');
    throw new Error('No preview URL appeared — send-gate likely blocked (book not saved complete?). See screenshot.');
  }
  const previewUrl = (await previewLoc.innerText()).trim();
  note(`Preview URL: ${previewUrl}`);
  await shot(page, 'A-dashboard-preview-link.png');

  // ── 2. Customer preview → INSPECT, then approve ───────────────
  const cust = await ctx.newPage();
  cust.on('dialog', d => d.accept().catch(()=>{}));
  note('Opening customer preview');
  await cust.goto(previewUrl, { waitUntil: 'domcontentloaded' });
  // The book renders only after EVERY photo finishes fetching (sequential). A 106-photo
  // book takes minutes — the old `photoPool>=51` guess gave up mid-load. Wait instead for
  // renderBook() to replace the loading placeholder (#load-progress-label detaches), which
  // is the true "book is rendered" signal. Generous timeout for the big book.
  note('Waiting for book to finish loading + render (can take a few minutes on a big book)…');
  await cust.waitForSelector('#load-progress-label', { state: 'detached', timeout: 300000 });
  await cust.waitForTimeout(3000);
  await shot(cust, 'B-customer-preview.png');

  // Inspect: how many photos actually landed in the book vs unplaced, so we can
  // confirm the staff's saved arrangement (incl. creative edits) propagated.
  const inspect = await cust.evaluate(() => {
    const asgn = window.customerBookAssignments || window.bookAssignments || {};
    let placed = 0;
    Object.values(asgn).forEach(a => ['left','right'].forEach(s => (a[s]||[]).forEach(x => { if (x!==null&&x!==undefined) placed++; })));
    return {
      status: (window.orderData||{}).status || 'unknown',
      poolLen: (window.photoPool||[]).length,
      placed,
      spreads: Object.keys(asgn).length,
    };
  });
  note(`Customer inspect → status:${inspect.status} pool:${inspect.poolLen} placed:${inspect.placed} spreads:${inspect.spreads}`);

  if (inspect.status === 'paid') {
    note('Order already paid — nothing to do.');
    paid = true; await shot(cust, 'E-payment-success.png'); throw { handled: true };
  }
  if (inspect.status === 'approved') {
    note('Order already approved — skipping approve, going to pay.');
  } else {
    await cust.waitForSelector('#approve-btn:not([disabled])', { state: 'visible', timeout: 30000 });
    await cust.click('#approve-btn');
    note('Clicked Approve');
  }
  const payBtn = cust.locator('#pay-btn:visible');
  await payBtn.waitFor({ state: 'visible', timeout: 30000 });
  note('Pay button visible — order approved');
  await shot(cust, 'C-customer-approved.png');

  // ── 3. Pay (Stripe test mode) ─────────────────────────────────
  await payBtn.click();
  await cust.waitForURL('**checkout.stripe.com/**', { timeout: 30000 });
  note('On Stripe checkout');
  await cust.waitForTimeout(4000);

  const fillFirst = async (selectors, value) => {
    for (const s of selectors) {
      const el = cust.locator(s);
      if (await el.count() && await el.first().isVisible().catch(()=>false)) { await el.first().fill(value); return true; }
    }
    return false;
  };
  await fillFirst(['#email', 'input[name="email"]', 'input[type="email"]'], 'qa-tester@example.com');
  const cardNumber = cust.locator('#cardNumber, input[name="cardNumber"]').first();
  if (!(await cardNumber.isVisible().catch(()=>false))) {
    const candidates = [
      cust.getByRole('radio', { name: /Karte|Card/i }),
      cust.getByText(/^\s*(Karte|Card)\s*$/),
      cust.locator('input[type="radio"]'),
    ];
    for (const c of candidates) {
      if (await c.count().catch(()=>0)) {
        await c.first().click({ force: true, timeout: 4000 }).catch(()=>{});
        await cardNumber.waitFor({ state: 'visible', timeout: 4000 }).catch(()=>{});
        if (await cardNumber.isVisible().catch(()=>false)) break;
      }
    }
  }
  if (!(await cardNumber.isVisible().catch(()=>false))) {
    await shot(cust, 'D-stripe-NO-card-field.png');
    throw new Error('Card number field never appeared — could not select the Card payment method');
  }
  await fillFirst(['#cardNumber', 'input[name="cardNumber"]'], '4242424242424242');
  await fillFirst(['#cardExpiry', 'input[name="cardExpiry"]'], '12 / 34');
  await fillFirst(['#cardCvc', 'input[name="cardCvc"]'], '123');
  await fillFirst(['#billingName', 'input[name="billingName"]'], 'QA Tester');
  await fillFirst(['#billingPostalCode', 'input[name="billingPostalCode"]'], '1010');
  await shot(cust, 'D-stripe-filled.png');

  await cust.click('.SubmitButton, button[type="submit"]');
  note('Submitted payment, waiting for return…');
  await cust.waitForURL('**payment=success**', { timeout: 90000 });
  paid = true;
  note('✅ Returned with payment=success');
  await cust.waitForTimeout(3000);
  await shot(cust, 'E-payment-success.png');

} catch (err) {
  if (!err || !err.handled) {
    note(`❌ ERROR: ${err.message}`);
    for (const pg of ctx.pages()) {
      await pg.screenshot({ path: path.join(RUN_DIR, `ERROR-${ctx.pages().indexOf(pg)}.png`), fullPage: true }).catch(()=>{});
    }
  }
} finally {
  if (consoleMsgs.length) { note('--- CONSOLE (errors/warnings) ---'); [...new Set(consoleMsgs)].slice(0,30).forEach(m => note('  ' + m)); }
  else note('Console: clean');
  fs.writeFileSync(path.join(RUN_DIR, 'chain-log.txt'), log.join('\n'));
  await browser.close();
  note(`Done. Paid: ${paid}. Screenshots + log in ${RUN_DIR}`);
}
