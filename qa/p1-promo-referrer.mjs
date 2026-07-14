// P1 promo track — set up the REFERRER: a verified Aevia account holder with a share code.
// Catalogue: work/pre-launch-qa/case-catalogue_v1.md (P1-1, P1-2)
//
// Signup → verification email → verify → sign in → "Refer a friend" tab → read the
// share code that getMyReferralCode minted (a Stripe promotion code, first_time_transaction).
// Writes the account + code to sessions/qa-runs/<date>-p1-promo-referrer/referrer.json,
// which the pay script reads back.
//
// Re-run mode: `node qa/p1-promo-referrer.mjs --check` re-signs into the SAME account from
// referrer.json and just re-reads the referral panel (used to assert the THANKS- reward
// code appeared after a referred order was paid).
//
// Optional explicit tag (S127 self-referral case): `node qa/p1-promo-referrer.mjs --tag <tag>`
// signs up under that exact address() instead of a generated one — used to become the account
// holder of an EXISTING order's email, so a self-referral attempt can be tested against it
// without minting a new order. State + run dir are keyed by the tag so runs don't collide.
//
// Signup section copied from qa/p0-4-account-email.mjs.

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { address, waitForEmail, extractLinks } from './testmail.mjs';

const CHECK = process.argv.includes('--check');
const tagFlagIdx = process.argv.indexOf('--tag');
const explicitTag = tagFlagIdx !== -1 ? process.argv[tagFlagIdx + 1] : null;

const BASE = 'https://aevia-test.pages.dev/pages';
const RUN_DIR = path.resolve('sessions/qa-runs', explicitTag ? `${new Date().toISOString().slice(0, 10)}-p1-promo-referrer-${explicitTag}` : `${new Date().toISOString().slice(0, 10)}-p1-promo-referrer`);
fs.mkdirSync(RUN_DIR, { recursive: true });
const STATE = path.join(RUN_DIR, 'referrer.json');

let state;
if (CHECK) {
  if (!fs.existsSync(STATE)) { console.error(`No ${STATE} — run without --check first`); process.exit(1); }
  state = JSON.parse(fs.readFileSync(STATE, 'utf8'));
} else {
  const tag = explicitTag || ('p1ref' + Date.now().toString(36));
  state = { tag, email: address(tag), password: 'QaTest!' + Date.now().toString(36), code: null };
}

const log = [], findings = [];
const note = (m) => { const l = `[${new Date().toISOString().slice(11, 19)}] ${m}`; console.log(l); log.push(l); };
const finding = (sev, msg) => { findings.push({ sev, msg }); note(`  ⚠️  ${sev} ${msg}`); };
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

note(CHECK ? `═══ REFERRER RE-CHECK — ${state.email} ═══` : `═══ REFERRER SETUP — ${state.email} ═══`);

try {
  if (!CHECK) {
    // ── A. Sign up ──────────────────────────────────────────────
    note('── A. Create the referrer account');
    await page.goto(`${BASE}/account.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#auth-toggle', { timeout: 30000 });
    await page.click('#auth-toggle');
    await page.waitForSelector('#first-name', { state: 'visible', timeout: 15000 });
    await page.fill('#first-name', 'Rita');
    await page.fill('#last-name', 'Referrer');
    await page.fill('#email', state.email);
    await page.fill('#password', state.password);
    const signupTs = Date.now();
    await page.click('#email-submit');
    await page.waitForSelector('#resend-btn', { state: 'visible', timeout: 60000 });
    note('✅ Account created — verification gate shown');

    // ── B. Verify ───────────────────────────────────────────────
    note('── B. Verification email');
    const vMail = await waitForEmail({ tag: state.tag, sinceTs: signupTs - 30000, timeoutMs: 180000 });
    note(`   subject: ${vMail.subject}`);
    const vLink = extractLinks(vMail).find(u => /^https?:/i.test(u) && !u.includes('mailto'));
    if (!vLink) { finding('S1', 'Verification email has no clickable link'); throw new Error('no verify link'); }
    const vPage = await ctx.newPage();
    await vPage.goto(vLink, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await vPage.waitForTimeout(5000);
    note(`Verification landed on: ${vPage.url().slice(0, 70)}`);
    await vPage.close();
  }

  // ── C. Sign in ────────────────────────────────────────────────
  note('── C. Sign in');
  await page.goto(`${BASE}/account.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  if (await page.isVisible('#verify-refresh').catch(() => false)) {
    await page.click('#verify-refresh');
    await page.waitForTimeout(6000);
  }
  if (await page.isVisible('#email-submit').catch(() => false)) {
    await page.fill('#email', state.email);
    await page.fill('#password', state.password);
    await page.click('#email-submit');
    await page.waitForTimeout(8000);
  }
  if (!(await page.isVisible('#signout-btn').catch(() => false))) {
    finding('S1', 'Not signed in / not verified — cannot reach the referral tab');
    throw new Error('not signed in');
  }
  note('✅ Signed in and verified');

  // ── D. "Refer a friend" ───────────────────────────────────────
  note('── D. Refer a friend tab');
  await page.click('button[data-panel="referral"]');
  // The panel calls getMyReferralCode (Stripe round-trip on first mint) — wait for the
  // code element, not a timer.
  await page.waitForSelector('#referral-body .referral-code span, #referral-body .empty', { timeout: 60000 });
  await page.waitForTimeout(2000);
  const empty = await page.$('#referral-body .empty');
  if (empty) {
    const msg = (await empty.textContent()).trim();
    finding('S1', `Referral panel shows an error instead of a code: "${msg}"`);
  }
  const codes = await page.$$eval('#referral-body .referral-code span', els => els.map(e => e.textContent.trim()));
  note(`Codes on the panel: ${codes.join(', ') || '(none)'}`);
  state.code = codes[0] || null;
  state.rewardCodes = codes.slice(1);
  if (!state.code) finding('S1', 'No share code rendered on the referral panel');
  else note(`✅ Share code: ${state.code}`);
  if (CHECK) {
    if (state.rewardCodes.length) note(`✅ Reward code(s): ${state.rewardCodes.join(', ')}`);
    else note('❗ No reward code on the panel');
  }
  await shot(page, CHECK ? 'check-referral-panel.png' : '01-referral-panel.png');

} catch (err) {
  note(`❌ ERROR: ${err.message}`);
  if (!findings.some(f => f.sev === 'S1')) finding('S1', `Referrer setup threw: ${err.message}`);
  await shot(page, 'ERROR-referrer.png').catch(() => {});
}

fs.writeFileSync(STATE, JSON.stringify(state, null, 2));
fs.appendFileSync(path.join(RUN_DIR, 'run-log.txt'), log.join('\n') + '\n');
note('');
note('════════ REFERRER RESULT ════════');
note(`Email:    ${state.email}`);
note(`Share:    ${state.code || 'NONE'}`);
note(`Rewards:  ${(state.rewardCodes || []).join(', ') || 'none'}`);
note(`Findings: ${findings.length}`);
if (consoleMsgs.length) [...new Set(consoleMsgs)].slice(0, 8).forEach(m => note('  ' + m));
note(`State → ${STATE}`);

await browser.close();
process.exit(findings.some(f => f.sev === 'S1') ? 1 : 0);
