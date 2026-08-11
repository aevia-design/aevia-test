// QA chain — picks up an existing order and drives the rest of the journey:
//   staff login → load order in engine → save → generate preview link →
//   customer approve → Stripe test payment → confirm paid.
//
// Run:  $env:STAFF_PW = Read-Host "Staff password"   (PowerShell, before running)
//       node qa/staff-customer-chain.mjs
//
// Reads STAFF_EMAIL (default evg.myasin@gmail.com) and STAFF_PW from the environment.
// The password is NEVER written to disk, screenshots, or the log.

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ORDER = process.env.QA_ORDER || 'AEV-023';
const EMAIL = process.env.STAFF_EMAIL || 'evg.myasin@gmail.com';
const PW    = process.env.STAFF_PW;
const BASE  = 'https://aevia-test.pages.dev/pages';
const RUN_DIR = path.resolve('sessions/qa-runs/2026-06-03-run01');

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
let engineMonogram = null;
let monogramVerdict = null;   // null = not a monogram template, so nothing to check

try {
  // ── 1. Staff login on the engine ──────────────────────────────
  note(`Opening engine, logging in as ${EMAIL}`);
  await page.goto(`${BASE}/staff/template-engine`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#eng-email', { state: 'visible', timeout: 20000 });
  await page.fill('#eng-email', EMAIL);
  await page.fill('#eng-pwd', PW);
  await page.click('#eng-lock .eng-lock-btn');
  // login overlay disappears on success
  await page.waitForSelector('#eng-lock', { state: 'hidden', timeout: 20000 });
  note('Engine login OK');

  // ── 2. Order mode → load the order ────────────────────────────
  await page.click('#mode-order-btn');
  await page.fill('#order-number-input', ORDER);
  await page.click('#order-load-btn');
  await page.waitForSelector('#order-info-panel', { state: 'visible', timeout: 60000 });
  await page.waitForTimeout(14000); // let the book canvas render (51 images load from GCS)
  note(`Loaded ${ORDER} into engine`);
  // capture the customer's order data + rendered book for visual judgement
  await shot(page, '07-engine-order-loaded.png');
  const oipName = await page.textContent('#oip-name').catch(()=> '');
  note(`Order-info name: "${(oipName||'').trim()}"`);

  // Heirloom only: the monogram selects ARTWORK, not just text, and it travels
  // order form → fpTexts.monogram → engine → preview → PDF. Each hop has its own
  // mocked test; this is the only place the whole route runs for real. Null for
  // every other template, so the check simply doesn't fire.
  engineMonogram = await page.evaluate(() => window._activeMonogram || null);
  if (engineMonogram) note(`Engine resolved monogram: ${engineMonogram}`);

  // ── 3. Save book state ────────────────────────────────────────
  await page.click('#oip-save-btn');
  // saveStaffBookState writes 'Saved ✓' then clears it after 3s (template-engine.html
  // :5259). The old 8s wait always read an empty string — a save failure looked exactly
  // like a success. Poll instead and keep the first non-empty, non-'Saving…' value.
  let saveStatus = '';
  for (let i = 0; i < 40; i++) {
    const t = (await page.textContent('#oip-preview-status').catch(()=> '') || '').trim();
    if (t && t !== 'Saving…') { saveStatus = t; break; }
    await page.waitForTimeout(250);
  }
  note(`Save status: "${saveStatus || '(never appeared)'}"`);
  if (!saveStatus.startsWith('Saved')) throw new Error(`Book state did not save: ${saveStatus || 'no status shown'}`);
  await page.waitForTimeout(2000);
  await shot(page, '08-engine-saved.png');

  // ── 4. Dashboard → generate preview link ──────────────────────
  note('Opening dashboard');
  await page.goto(`${BASE}/staff/dashboard`, { waitUntil: 'domcontentloaded' });
  // Same origin → Firebase auth persists. If a lock shows, log in again.
  if (await page.isVisible('#lock')) {
    note('Dashboard lock shown — logging in');
    await page.fill('#email-input', EMAIL);
    await page.fill('#pwd-input', PW);
    await page.click('#lock .lock-btn');
  }
  await page.waitForSelector('#app', { state: 'visible', timeout: 20000 });
  await page.waitForFunction(o => document.body.innerText.includes(o), ORDER, { timeout: 30000 });
  note('Dashboard loaded, order visible');

  // click the order's "Generate preview link" button
  const genSel = `button[onclick="generatePreviewLink('${ORDER}')"]`;
  if (await page.isVisible(genSel)) {
    await page.click(genSel);
    note('Clicked Generate preview link');
  } else {
    note('Preview link already exists (no generate button) — reusing');
  }
  // Read the link from OUR order's row. The dashboard renders one <tr> per order and
  // puts the URL in the href of a.preview-link-btn — there is no .preview-url element;
  // that class is CSS-only and never applied, which silently broke this step (S163).
  // Scoping by order number also removes the old `.first()` gamble on row order.
  await page.waitForTimeout(2500);
  const readPreviewUrl = () => page.evaluate((o) => {
    const row = [...document.querySelectorAll('tr')].find(
      tr => tr.querySelector('.order-num')?.textContent.trim() === o);
    if (!row) return { error: 'order row not found' };
    const a = row.querySelector('a.preview-link-btn');
    if (!a) return { error: 'no preview link yet (still the Generate button?)' };
    return { url: a.href };
  }, ORDER);

  let pv = await readPreviewUrl();
  if (pv.error) {   // generation is async — give the row a chance to re-render
    await page.waitForTimeout(5000);
    pv = await readPreviewUrl();
  }
  if (pv.error) { await shot(page, '09-dashboard-NO-preview-link.png'); throw new Error(`Preview link: ${pv.error}`); }
  const previewUrl = pv.url;
  note(`Preview URL: ${previewUrl}`);
  await shot(page, '09-dashboard-preview-link.png');

  // ── 5. Customer preview → approve ─────────────────────────────
  const cust = await ctx.newPage();
  cust.on('dialog', d => d.accept().catch(()=>{}));
  note('Opening customer preview');
  await cust.goto(previewUrl, { waitUntil: 'domcontentloaded' });
  // Wait for all photos to finish fetching before judging the rendered book —
  // probe-photos.mjs proved 6s captures empty slots while blobs are still painting.
  await cust.waitForFunction(() => (window.photoPool || []).length >= 51, null, { timeout: 60000 }).catch(()=>{});
  await cust.waitForTimeout(4000);
  await shot(cust, '10-customer-preview.png');

  // The customer must be shown the SAME artwork staff just saved. A mismatch here
  // means the two surfaces resolved the monogram differently — the engine-parity
  // failure mode that has bitten us twice (S158, S162), and one the customer would
  // approve without noticing.
  if (engineMonogram) {
    const custMonogram = await cust.evaluate(() => window._activeMonogram || null);
    monogramVerdict = (custMonogram === engineMonogram);
    note(`${monogramVerdict ? '✅' : '❌'} Monogram parity: engine="${engineMonogram}" preview="${custMonogram}"`);
  }

  // Status-aware: the page sets _readOnly + disables #approve-btn when the order is
  // already approved/paid (customer-preview.html:898,935). Re-running on the same order
  // must NOT blindly click approve. Read the real status and branch.
  const custStatus = await cust.evaluate(() => (window.orderData || {}).status || 'unknown');
  note(`Customer-view order status: ${custStatus}`);
  if (custStatus === 'paid') {
    note('Order already paid — nothing to do; chain already complete for this order.');
    paid = true;
    await shot(cust, '14-payment-success.png');
    throw { handled: true };
  }
  if (custStatus === 'approved') {
    note('Order already approved — skipping approve, going straight to pay.');
  } else {
    await cust.waitForSelector('#approve-btn:not([disabled])', { state: 'visible', timeout: 30000 });
    await cust.click('#approve-btn');
    note('Clicked Approve');
  }
  // Wait for the pay button to be truly visible, then act on the SAME visible locator
  // (avoids the prior race where :visible matched but a stale #pay-btn was clicked).
  const payBtn = cust.locator('#pay-btn:visible');
  await payBtn.waitFor({ state: 'visible', timeout: 30000 });
  note('Pay button visible — order approved');
  await shot(cust, '11-customer-approved.png');

  // ── 6. Pay (Stripe test mode) ─────────────────────────────────
  await payBtn.click();
  // Stripe Checkout is a full-page nav to checkout.stripe.com
  await cust.waitForURL('**checkout.stripe.com/**', { timeout: 30000 });
  note('On Stripe checkout');
  await cust.waitForTimeout(4000);
  await shot(cust, '12-stripe-checkout.png');

  // Fill card — modern Stripe Checkout renders fields on-page (not cross-origin iframes)
  const fillFirst = async (selectors, value) => {
    for (const s of selectors) {
      const el = cust.locator(s);
      if (await el.count() && await el.first().isVisible().catch(()=>false)) { await el.first().fill(value); return true; }
    }
    return false;
  };
  // Contact email is required and empty on load.
  await fillFirst(['#email', 'input[name="email"]', 'input[type="email"]'], 'qa-tester@example.com');
  // The checkout opens on a payment-method picker with nothing selected — the card
  // fields don't render until "Karte"/Card is chosen. Stripe's radios are custom
  // components, so target by role/label and force-click, then VERIFY the field shows.
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
    await shot(cust, '13-stripe-NO-card-field.png');
    throw new Error('Card number field never appeared — could not select the Card payment method');
  }
  const okNum = await fillFirst(['#cardNumber', 'input[name="cardNumber"]'], '4242424242424242');
  await fillFirst(['#cardExpiry', 'input[name="cardExpiry"]'], '12 / 34');
  await fillFirst(['#cardCvc', 'input[name="cardCvc"]'], '123');

  // Checkout collects a SHIPPING address (Versandadresse) — we sell a physical book.
  // These four are required and were never filled: the script only knew #billingName /
  // #billingPostalCode, which are not on this form, and fillFirst fails silently. The
  // submit then just raised validation errors and the run sat out its 90s timeout
  // looking like a payment failure (S163). 'Billing same as shipping' is pre-ticked,
  // so filling shipping is enough.
  const addr = {
    name:   ['#shippingName',          'input[name="shippingName"]'],
    line1:  ['#shippingAddressLine1',  'input[name="shippingAddressLine1"]'],
    post:   ['#shippingPostalCode',    'input[name="shippingPostalCode"]'],
    city:   ['#shippingLocality',      'input[name="shippingLocality"]'],
  };
  const okName = await fillFirst(addr.name,  'QA Tester');
  const okL1   = await fillFirst(addr.line1, 'Teststrasse 1');
  const okPost = await fillFirst(addr.post,  '1010');
  const okCity = await fillFirst(addr.city,  'Wien');
  note(`Fields filled — card:${okNum} name:${okName} line1:${okL1} postcode:${okPost} city:${okCity}`);
  if (!(okNum && okName && okL1 && okPost && okCity)) {
    await shot(cust, '13-stripe-MISSING-FIELDS.png');
    throw new Error('Could not fill every required checkout field — see 13-stripe-MISSING-FIELDS.png. '
      + 'Stripe may have changed its field names again.');
  }
  await shot(cust, '13-stripe-filled.png');

  await cust.click('.SubmitButton, button[type="submit"]');
  note('Submitted payment, waiting for return…');
  // Surface a validation refusal instead of sitting out the full timeout. Stripe stays
  // on the same URL and paints inline field errors, which reads identically to "payment
  // failed" from the outside.
  try {
    await cust.waitForURL('**payment=success**', { timeout: 90000 });
  } catch (e) {
    const fieldErrors = await cust.evaluate(() =>
      [...document.querySelectorAll('[role="alert"], .FieldError, p.Text--error')]
        .map(n => n.textContent.trim()).filter(Boolean).slice(0, 6));
    if (fieldErrors.length) {
      await shot(cust, '13-stripe-REJECTED.png');
      throw new Error(`Checkout refused the submission: ${fieldErrors.join(' | ')}`);
    }
    throw e;
  }
  paid = true;
  note('✅ Returned with payment=success');
  await cust.waitForTimeout(3000);
  await shot(cust, '14-payment-success.png');

} catch (err) {
  note(`❌ ERROR: ${err.message}`);
  for (const pg of ctx.pages()) {
    await pg.screenshot({ path: path.join(RUN_DIR, `ERROR-${ctx.pages().indexOf(pg)}.png`), fullPage: true }).catch(()=>{});
  }
} finally {
  if (consoleMsgs.length) { note('--- CONSOLE (errors/warnings) ---'); [...new Set(consoleMsgs)].slice(0,30).forEach(m => note('  ' + m)); }
  else note('Console: clean');
  fs.writeFileSync(path.join(RUN_DIR, 'chain-log.txt'), log.join('\n'));
  await browser.close();
  if (monogramVerdict === false) note('❌ MONOGRAM PARITY FAILED — see above; the customer saw different artwork than staff saved.');
  else if (monogramVerdict === true) note('✅ Monogram parity held across engine → customer preview.');
  note(`Done. Paid: ${paid}. Screenshots + log in ${RUN_DIR}`);
  process.exitCode = (paid && monogramVerdict !== false) ? 0 : 1;
}
