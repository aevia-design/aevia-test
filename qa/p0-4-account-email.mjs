// P0-4 — a signed-in customer orders while a DIFFERENT email sits in browser autofill.
// Catalogue: work/pre-launch-qa/case-catalogue_v1.md
//
// Guards the S109 bug: browser autofill put a stale gmail address into the order form
// of a signed-in yahoo customer → the confirmation went to the wrong inbox AND the order
// never linked to the account (getMyOrders matches on the order email).
//
// Pass criteria (P0-4):
//   a) the order uses the ACCOUNT email, not the autofilled one
//   b) the confirmation email lands in the ACCOUNT inbox
//   c) the order appears in "My orders"
//
// How autofill is simulated: Chrome fills the field on page load, BEFORE Firebase's
// onAuthStateChanged resolves. So we set the decoy value immediately on load and let the
// auth handler race it — which is exactly the real-world sequence. (We do not poke the
// field after auth: it is readOnly by then, so a real browser could not either.)
//
// Creates a REAL account + order on the live dev site. Run:
//   node qa/p0-4-account-email.mjs

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { address, waitForEmail, getEmails, extractLinks } from './testmail.mjs';

const BASE = 'https://aevia-test.pages.dev/pages';
const RUN_DIR = path.resolve('sessions/qa-runs', `${new Date().toISOString().slice(0, 10)}-p0-4-account`);
const PHOTO_DIR = path.resolve('qa/test-photos/newborn');
fs.mkdirSync(RUN_DIR, { recursive: true });

const TAG = 'p04' + Date.now().toString(36);
const ACCOUNT_EMAIL = address(TAG);            // the real account
const DECOY_EMAIL = address(TAG + 'decoy');    // what "autofill" tries to inject
const PASSWORD = 'QaTest!' + Date.now().toString(36);

const photos = fs.readdirSync(PHOTO_DIR, { recursive: true })
  .filter(f => /\.(jpe?g|png)$/i.test(f)).sort()
  .map(f => path.join(PHOTO_DIR, f));

const log = [], findings = [];
const note = (m) => { const l = `[${new Date().toISOString().slice(11, 19)}] ${m}`; console.log(l); log.push(l); };
const finding = (sev, msg) => { findings.push({ sev, id: 'P0-4', msg }); note(`  ⚠️  ${sev} ${msg}`); };
const shot = async (p, n) => { await p.screenshot({ path: path.join(RUN_DIR, n), fullPage: true }); note(`📸 ${n}`); };

const consoleMsgs = [];
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
ctx.on('page', pg => {
  pg.on('console', m => { if (['error', 'warning'].includes(m.type())) consoleMsgs.push(`${m.type()}: ${m.text()}`); });
  pg.on('pageerror', e => consoleMsgs.push(`pageerror: ${e.message}`));
  pg.on('dialog', d => { note(`  💬 ${d.type()}: "${d.message().slice(0, 90)}"`); d.accept().catch(() => {}); });
});

const page = await ctx.newPage();
note(`Account: ${ACCOUNT_EMAIL}`);
note(`Decoy (autofill): ${DECOY_EMAIL}`);

let orderNumber = null, submitTs = null;

try {
  // ── A. Sign up ────────────────────────────────────────────────
  note('── A. Create an account');
  await page.goto(`${BASE}/account.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#auth-toggle', { timeout: 30000 });
  await page.click('#auth-toggle');                     // signin → register
  await page.waitForSelector('#first-name', { state: 'visible', timeout: 15000 });
  await page.fill('#first-name', 'QA');
  await page.fill('#last-name', 'Account');
  await page.fill('#email', ACCOUNT_EMAIL);
  await page.fill('#password', PASSWORD);
  const signupTs = Date.now();
  await page.click('#email-submit');
  await page.waitForSelector('#resend-btn', { state: 'visible', timeout: 60000 });
  note('✅ Account created — verification gate shown');
  await shot(page, '01-verify-gate.png');

  // ── B. Verification email → click the link ────────────────────
  note('── B. Verification email');
  const vMail = await waitForEmail({ tag: TAG, sinceTs: signupTs - 30000, timeoutMs: 180000 });
  note(`   subject: ${vMail.subject}`);
  note(`   from:    ${vMail.from}`);
  // Brevo rewrites hrefs into tracking redirects, so follow the link rather than
  // pattern-matching it.
  const vLink = extractLinks(vMail).find(u => /^https?:/i.test(u) && !u.includes('mailto'));
  if (!vLink) { finding('S1', 'Verification email contains no clickable link'); throw new Error('no verify link'); }

  const vPage = await ctx.newPage();
  await vPage.goto(vLink, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await vPage.waitForTimeout(5000);
  note(`Verification landed on: ${vPage.url().slice(0, 80)}`);
  await shot(vPage, '02-verified.png');
  await vPage.close();

  // ── C. Sign in ────────────────────────────────────────────────
  note('── C. Sign in');
  await page.goto(`${BASE}/account.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  // Signup already left us signed in, but the session's token still says unverified —
  // the page shows the verify gate until "I've verified — refresh" reloads the user.
  // Three possible states: account view / verify gate / signed out.
  if (await page.isVisible('#verify-refresh').catch(() => false)) {
    note('Verify gate shown — clicking "I\'ve verified — refresh"');
    await page.click('#verify-refresh');
    await page.waitForTimeout(6000);
  }
  if (await page.isVisible('#email-submit').catch(() => false)) {
    note('Signed out — signing in with the account credentials');
    await page.fill('#email', ACCOUNT_EMAIL);
    await page.fill('#password', PASSWORD);
    await page.click('#email-submit');
    await page.waitForTimeout(8000);
  }

  // A verified session shows the account view (sign-out button), not the verify gate.
  const signedIn = await page.isVisible('#signout-btn').catch(() => false);
  const stillGated = await page.isVisible('#resend-btn').catch(() => false);
  if (!signedIn) finding('S1', `Not signed in after verifying${stillGated ? ' — still stuck on the "verify your email" gate' : ''}`);
  else note('✅ Signed in and verified');
  await shot(page, '03-signed-in.png');

  // ── D. Order form with a decoy email racing the auth handler ──
  note('── D. Order form — inject the decoy email like autofill would');
  await page.goto(`${BASE}/newborn.html`, { waitUntil: 'networkidle' });
  for (const fp of ['FPintro', 'FPlabour']) await page.$eval(`[data-fp="${fp}"]`, el => el.click());
  await Promise.all([page.waitForURL('**/order*'), page.click('.cta')]);

  // Real autofill fires on load, BEFORE onAuthStateChanged resolves. Do the same.
  await page.waitForSelector('#inp-email', { timeout: 30000 });
  await page.evaluate((decoy) => { document.getElementById('inp-email').value = decoy; }, DECOY_EMAIL);
  note(`Injected decoy into #inp-email: ${DECOY_EMAIL}`);

  // Now let the auth handler run and re-assert the account email.
  await page.waitForTimeout(8000);
  const emailState = await page.$eval('#inp-email', el => ({ value: el.value, readOnly: el.readOnly, title: el.title }));
  note(`After auth resolved → value="${emailState.value}" readOnly=${emailState.readOnly}`);
  if (emailState.value !== ACCOUNT_EMAIL) {
    finding('S1', `Order form email is "${emailState.value}", expected the account email "${ACCOUNT_EMAIL}" — autofill won the race (S109 bug is back)`);
  } else {
    note('✅ Account email won the race against the decoy');
  }
  if (!emailState.readOnly) finding('S2', 'Email field is NOT readOnly while signed in — autofill/typing could still change it');
  await shot(page, '04-email-locked.png');

  // ── E. Place the order ────────────────────────────────────────
  note('── E. Place the order');
  await page.fill('#inp-name', 'QA Account');
  await page.fill('#album-notes', 'P0-4 account-linkage test order.');
  const adv = async (sel, label) => {
    await page.evaluate(() => advance());
    await page.waitForSelector(sel, { state: 'visible', timeout: 20000 });
    note(`→ ${label}`);
  };
  await adv('#step-cover', 'step-cover');

  let idx = 0;
  await page.setInputFiles('#dz-cover input[type=file]', photos[idx++]);
  await page.waitForSelector('#cover-preview', { state: 'visible', timeout: 60000 });
  const caps = { name: 'Mila', subtitle: 'Our first year', spine: 'Mila 2025' };
  for (const id of await page.$$eval('[id^="cover-cap-"]', els => els.map(e => e.id))) {
    await page.fill(`#${id}`, caps[id.replace('cover-cap-', '')] ?? 'Mila');
  }
  await adv('#step-special', 'step-special');

  const introVals = { date: 'May 15th', time: '6:09 a.m.', weight: '3.28 kg', length: '53 cm', gender: 'girl' };
  for (const id of await page.$$eval('[id^="intro-fpintro-"]', els => els.map(e => e.id))) {
    await page.fill(`#${id}`, introVals[id.replace('intro-fpintro-', '')] ?? 'Mila');
  }
  if (await page.$('#zodiac-fplabour')) await page.selectOption('#zodiac-fplabour', 'Taurus');
  for (const zid of await page.$$eval('[id^="dz-special-fplabour"]', els => els.map(e => e.id))) {
    await page.setInputFiles(`#${zid} input[type=file]`, photos[idx++]);
  }
  await page.waitForTimeout(2000);
  await adv('#step-photos', 'step-photos');

  const target = parseInt(await page.textContent('#photo-count-min'), 10);
  note(`Uploading ${target} main photos…`);
  await page.setInputFiles('#dz-main input[type=file]', photos.slice(idx, idx + target));
  await page.waitForFunction((t) => document.querySelectorAll('#photo-grid .photo-thumb').length >= t, target, { timeout: 240000 });
  await page.waitForTimeout(3000);

  // Last check before submit: the field must STILL hold the account email.
  const atSubmit = await page.$eval('#inp-email', el => el.value);
  note(`Email at submit time: ${atSubmit}`);
  if (atSubmit !== ACCOUNT_EMAIL) finding('S1', `Email drifted to "${atSubmit}" by submit time`);

  submitTs = Date.now();
  await page.click('#submit-btn');
  const proceed = await page.waitForSelector('#confirm-proceed', { state: 'visible', timeout: 5000 }).catch(() => null);
  if (proceed) await proceed.click();
  await page.waitForSelector('#success-screen', { state: 'visible', timeout: 600000 });
  orderNumber = ((await page.textContent('#success-order-num')).match(/AEV-\d+/i) || [])[0];
  note(`✅ ORDER PLACED — ${orderNumber}`);
  await shot(page, '05-success.png');

} catch (err) {
  note(`❌ P0-4 ERROR: ${err.message}`);
  if (!findings.some(f => f.sev === 'S1')) finding('S1', `P0-4 threw: ${err.message}`);
  await shot(page, 'ERROR-p0-4.png').catch(() => {});
}

// ── F. Confirmation lands in the ACCOUNT inbox, not the decoy ───
if (orderNumber) {
  note('── F. Which inbox got the confirmation?');
  try {
    const mail = await waitForEmail({ tag: TAG, sinceTs: submitTs - 30000, timeoutMs: 180000 });
    note(`✅ Confirmation in the ACCOUNT inbox — "${mail.subject}"`);
    if (!JSON.stringify(mail).includes(orderNumber)) finding('S2', `Confirmation does not mention ${orderNumber}`);
  } catch {
    finding('S1', `No confirmation in the ACCOUNT inbox (${ACCOUNT_EMAIL}) within 180s`);
  }

  // The decoy inbox must stay EMPTY — that is the S109 misrouting symptom.
  // Do NOT use waitForEmail() here: it long-polls (livequery=true), so on an inbox that
  // never receives anything the fetch just hangs and the timeout never fires. Take a
  // plain snapshot after a grace period instead — the right way to assert absence.
  await new Promise(r => setTimeout(r, 20000));
  const stray = await getEmails({ tag: TAG + 'decoy', sinceTs: submitTs - 30000 });
  if (stray.length) finding('S1', `Confirmation ALSO went to the autofilled decoy inbox: "${stray[0].subject}" — order misrouted`);
  else note('✅ Decoy inbox is empty — nothing misrouted');
}

// ── G. Order links to the account ("My orders") ─────────────────
if (orderNumber) {
  note('── G. "My orders"');
  try {
    await page.goto(`${BASE}/account.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(9000);   // getMyOrders round-trip
    const txt = (await page.textContent('body')).replace(/\s+/g, ' ');
    if (txt.includes(orderNumber)) note(`✅ ${orderNumber} appears in "My orders" — order is linked to the account`);
    else finding('S1', `${orderNumber} is NOT in "My orders" — the order did not link to the account`);
    await shot(page, '06-my-orders.png');
  } catch (e) {
    finding('S1', `"My orders" check failed: ${e.message}`);
  }
}

// ── Report ──────────────────────────────────────────────────────
note('');
note('════════ P0-4 RESULT ════════');
note(`Account:  ${ACCOUNT_EMAIL}`);
note(`Decoy:    ${DECOY_EMAIL}`);
note(`Order:    ${orderNumber || 'NOT PLACED'}`);
note(`Findings: ${findings.length}`);
findings.forEach(f => note(`  ${f.sev} ${f.msg}`));
if (consoleMsgs.length) { note('--- console ---'); [...new Set(consoleMsgs)].slice(0, 8).forEach(m => note('  ' + m)); } else note('Console: clean 🎉');

fs.writeFileSync(path.join(RUN_DIR, 'run-log.txt'), log.join('\n'));
fs.writeFileSync(path.join(RUN_DIR, 'findings.json'), JSON.stringify(
  { accountEmail: ACCOUNT_EMAIL, decoyEmail: DECOY_EMAIL, tag: TAG, orderNumber, findings, consoleMsgs: [...new Set(consoleMsgs)] }, null, 2));
note(`Artefacts → ${RUN_DIR}`);

await browser.close();
process.exit(findings.some(f => f.sev === 'S1') ? 1 : 0);
