// P1-6 — forgot password → reset email → set a new password → sign in.
// Catalogue: work/pre-launch-qa/case-catalogue_v1.md
//
// Pass criteria (P1-6):
//   a) the reset link lands on OUR BRANDED in-app reset page (account.html?mode=resetPassword),
//      NOT Firebase's default *.firebaseapp.com/__/auth/action screen
//   b) the new password works (and the old one no longer does)
//   c) a security-alert email fires ("Your Aevia password was changed" → sendPasswordChangedEmail)
//
// Creates a REAL, FRESH account on the live dev site each run (its own testmail tag — never
// reuse another agent's inbox). Always requests a FRESH reset link: oobCodes are single-use
// and expire. Note functions/index.js:1876 throttles resets to 3/hour PER EMAIL, so a fresh
// address per run also keeps the throttle out of the way.
//
// Run: node qa/p1-auth-reset.mjs

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { address, waitForEmail, extractLinks } from './testmail.mjs';

const BASE = 'https://aevia-test.pages.dev/pages';
const RUN_DIR = path.resolve('sessions/qa-runs', `${new Date().toISOString().slice(0, 10)}-p1-auth-reset`);
fs.mkdirSync(RUN_DIR, { recursive: true });

const TAG = 'p16' + Date.now().toString(36);
const EMAIL = address(TAG);
const OLD_PW = 'QaOld!' + Date.now().toString(36);
const NEW_PW = 'QaNew!' + Date.now().toString(36);

const log = [], findings = [];
const note = (m) => { const l = `[${new Date().toISOString().slice(11, 19)}] ${m}`; console.log(l); log.push(l); };
const finding = (sev, msg) => { findings.push({ sev, id: 'P1-6', msg }); note(`  ⚠️  ${sev} ${msg}`); };
const shot = async (p, n) => { await p.screenshot({ path: path.join(RUN_DIR, n), fullPage: true }); note(`📸 ${n}`); };

const consoleMsgs = [];
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 950 } });
ctx.on('page', pg => {
  pg.on('console', m => { if (['error', 'warning'].includes(m.type())) consoleMsgs.push(`${m.type()}: ${m.text()}`); });
  pg.on('pageerror', e => consoleMsgs.push(`pageerror: ${e.message}`));
  pg.on('dialog', d => { note(`  💬 ${d.type()}: "${d.message().slice(0, 90)}"`); d.accept().catch(() => {}); });
});

const page = await ctx.newPage();
note(`Fresh account: ${EMAIL}`);
let resetLanding = null, resetTs = null, changedOk = false;

try {
  // ── A. Fresh, verified account ────────────────────────────────────────────
  note('── A. Create + verify a fresh account');
  await page.goto(`${BASE}/account.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#auth-toggle', { timeout: 30000 });
  await page.click('#auth-toggle');                       // sign-in → register
  await page.waitForSelector('#first-name', { state: 'visible', timeout: 15000 });
  await page.fill('#first-name', 'QA');
  await page.fill('#last-name', 'Reset');
  await page.fill('#email', EMAIL);
  await page.fill('#password', OLD_PW);
  const signupTs = Date.now();
  await page.click('#email-submit');
  await page.waitForSelector('#resend-btn', { state: 'visible', timeout: 60000 });

  const vMail = await waitForEmail({ tag: TAG, sinceTs: signupTs - 30000, timeoutMs: 180000 });
  note(`Verification email: "${vMail.subject}" from ${vMail.from}`);
  // Brevo rewrites hrefs into click-tracking redirects — follow, never string-match.
  const vLink = extractLinks(vMail).find(u => /^https?:/i.test(u) && !u.includes('mailto'));
  if (!vLink) { finding('S1', 'Verification email has no clickable link'); throw new Error('no verify link'); }
  const vPage = await ctx.newPage();
  await vPage.goto(vLink, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await vPage.waitForTimeout(5000);
  await vPage.close();
  note('✅ Account created + verified');

  // Sign out — a locked-out customer is NOT signed in when they ask for a reset.
  await page.goto(`${BASE}/account.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  if (await page.isVisible('#verify-refresh').catch(() => false)) {
    await page.click('#verify-refresh');
    await page.waitForTimeout(6000);
  }
  if (await page.isVisible('#signout-btn').catch(() => false)) {
    await page.click('#signout-btn');
    await page.waitForTimeout(4000);
  }
  await page.waitForSelector('#email-submit', { state: 'visible', timeout: 30000 });
  note('✅ Signed out — at the sign-in card');

  // ── B. Forgot password ────────────────────────────────────────────────────
  note('── B. "Forgot your password?"');
  await page.click('#forgot-btn');
  await page.waitForTimeout(600);
  const forgotUi = await page.evaluate(() => ({
    title: document.getElementById('auth-title').textContent.trim(),
    submit: document.getElementById('email-submit').textContent.trim(),
    pwHidden: document.getElementById('password-field').style.display === 'none',
  }));
  note(`Forgot card: title="${forgotUi.title}" button="${forgotUi.submit}" password field hidden=${forgotUi.pwHidden}`);
  if (!forgotUi.pwHidden) finding('S3', 'Forgot-password card still shows the password field');
  await shot(page, '01-forgot-card.png');

  await page.fill('#email', EMAIL);
  resetTs = Date.now();
  await page.click('#email-submit');
  // sendPasswordResetEmail is a Cloud Function: a cold start takes ~8s, during which the
  // page shows NOTHING (the submit button just goes disabled). Poll for the message —
  // a fixed 4s read finds it empty and looks like a product bug. (Harness lesson, S125.)
  await page.waitForFunction(
    () => (document.getElementById('auth-msg').textContent || '').trim().length > 0,
    null, { timeout: 30000 }
  ).catch(() => {});
  const msg = (await page.textContent('#auth-msg')).trim();
  note(`Response after ${((Date.now() - resetTs) / 1000).toFixed(1)}s: "${msg}"`);
  // Must NOT disclose whether the address exists (functions/index.js:1867).
  if (!/reset link/i.test(msg)) finding('S2', `Unexpected response to a reset request: "${msg}"`);
  await shot(page, '02-reset-requested.png');

  // ── C. The reset email ────────────────────────────────────────────────────
  note('── C. Reset email');
  const rMail = await waitForEmail({ tag: TAG, sinceTs: resetTs - 5000, subjectIncludes: 'Reset', timeoutMs: 180000 });
  note(`✅ "${rMail.subject}" from ${rMail.from}`);
  fs.writeFileSync(path.join(RUN_DIR, 'reset-email.html'), rMail.html || rMail.text || '');
  const rLink = extractLinks(rMail).find(u => /^https?:/i.test(u) && !u.includes('mailto'));
  if (!rLink) { finding('S1', 'Reset email contains no clickable link'); throw new Error('no reset link'); }

  // ── D. BRANDED in-app reset page (the crux of P1-6) ───────────────────────
  note('── D. Follow the link — must land on OUR page, not Firebase\'s');
  const rPage = await ctx.newPage();
  await rPage.goto(rLink, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await rPage.waitForTimeout(5000);
  resetLanding = rPage.url();
  note(`Landed on: ${resetLanding.slice(0, 110)}`);

  if (/firebaseapp\.com|\/__\/auth\/action/i.test(resetLanding)) {
    finding('S2', `Reset link lands on FIREBASE's default reset screen (${resetLanding.slice(0, 90)}), not the branded in-app page`);
  }
  if (!/account/i.test(resetLanding) || !/mode=resetPassword/i.test(resetLanding) || !/oobCode=/i.test(resetLanding)) {
    finding('S2', `Reset link does not carry the branded in-app params: ${resetLanding.slice(0, 110)}`);
  }

  const resetView = await rPage.evaluate(() => {
    const rv = document.getElementById('reset-view');
    return {
      exists: !!rv,
      visible: rv ? rv.style.display !== 'none' : false,
      sub: document.getElementById('reset-sub')?.textContent.trim(),
      msg: document.getElementById('reset-msg')?.textContent.trim(),
      formShown: document.getElementById('reset-form')?.style.display !== 'none',
    };
  });
  note(`Branded reset view: visible=${resetView.visible} form=${resetView.formShown} sub="${resetView.sub}"`);
  await shot(rPage, '03-branded-reset-page.png');
  if (!resetView.visible || !resetView.formShown) {
    finding('S1', `Branded reset form did not render (visible=${resetView.visible} form=${resetView.formShown} msg="${resetView.msg}") — the oobCode failed verifyPasswordResetCode`);
    throw new Error('reset form not shown');
  }
  // The page proves it verified the code by naming the account it belongs to.
  if (!resetView.sub || !resetView.sub.includes(EMAIL)) {
    finding('S3', `Reset page does not name the account being reset (sub="${resetView.sub}")`);
  }

  // ── E. Set the new password ───────────────────────────────────────────────
  note('── E. Set a new password');
  const changeTs = Date.now();
  // account.html:728 fires the security-alert call FIRE-AND-FORGET (no await). Watch for
  // its response, and do NOT close this tab until it lands — closing early ABORTS the
  // in-flight request and the alert email never sends (that cost a run).
  const pwChangedResp = rPage.waitForResponse(
    r => r.url().includes('sendPasswordChangedEmail'), { timeout: 60000 }
  ).catch(() => null);
  await rPage.fill('#reset-password', NEW_PW);
  await rPage.click('#reset-submit');
  // On success the page signs in with the new password and routes to the account view.
  await rPage.waitForSelector('#signout-btn', { state: 'visible', timeout: 60000 }).catch(() => {});
  const pwResp = await pwChangedResp;
  if (!pwResp) {
    finding('S2', 'The client never called sendPasswordChangedEmail after the reset');
  } else {
    const body = await pwResp.text().catch(() => '');
    note(`sendPasswordChangedEmail → HTTP ${pwResp.status()} ${body.slice(0, 60)}`);
    if (!pwResp.ok()) finding('S2', `sendPasswordChangedEmail returned HTTP ${pwResp.status()}: ${body.slice(0, 80)}`);
  }
  const after = await rPage.evaluate(() => ({
    url: location.href,
    account: document.getElementById('account-view').style.display !== 'none',
    resetMsg: document.getElementById('reset-msg')?.textContent.trim(),
    email: document.getElementById('info-email')?.textContent.trim(),
  }));
  note(`After save: account view=${after.account} email="${after.email}" url=${after.url.slice(0, 70)} resetMsg="${after.resetMsg}"`);
  await shot(rPage, '04-after-reset.png');
  if (!after.account) {
    finding('S2', `After saving the new password the page did not land on the account view (reset-msg: "${after.resetMsg}")`);
  } else {
    changedOk = true;
    note('✅ Reset completed in-app and signed straight in');
  }
  // The reset params must be gone so a refresh can't re-enter the (now dead) flow.
  if (/oobCode/i.test(after.url)) finding('S3', 'The oobCode is still in the URL after the reset — a refresh re-enters a dead flow');
  await rPage.close();

  // ── F. Security-alert email ───────────────────────────────────────────────
  note('── F. "Your password was changed" security alert');
  try {
    const cMail = await waitForEmail({ tag: TAG, sinceTs: changeTs - 5000, subjectIncludes: 'password was changed', timeoutMs: 120000 });
    note(`✅ "${cMail.subject}" from ${cMail.from}`);
    fs.writeFileSync(path.join(RUN_DIR, 'password-changed-email.html'), cMail.html || cMail.text || '');
  } catch {
    finding('S2', 'No "Your Aevia password was changed" security-alert email within 120s (sendPasswordChangedEmail did not fire)');
  }

  // ── G. The new password actually works; the old one does not ──────────────
  note('── G. Sign in with the NEW password (and confirm the OLD one is dead)');
  const s = await ctx.newPage();                     // same ctx; sign out first
  await s.goto(`${BASE}/account.html`, { waitUntil: 'domcontentloaded' });
  await s.waitForTimeout(4000);
  if (await s.isVisible('#signout-btn').catch(() => false)) { await s.click('#signout-btn'); await s.waitForTimeout(4000); }
  await s.waitForSelector('#email-submit', { state: 'visible', timeout: 30000 });

  await s.fill('#email', EMAIL);
  await s.fill('#password', OLD_PW);
  await s.click('#email-submit');
  await s.waitForTimeout(6000);
  const oldWorked = await s.isVisible('#signout-btn').catch(() => false);
  const oldMsg = (await s.textContent('#auth-msg')).trim();
  note(`OLD password → signed in=${oldWorked} msg="${oldMsg}"`);
  if (oldWorked) finding('S1', 'The OLD password still signs in after the reset — the password was not actually changed');
  else note('✅ Old password rejected');

  await s.fill('#email', EMAIL);
  await s.fill('#password', NEW_PW);
  await s.click('#email-submit');
  await s.waitForSelector('#signout-btn', { state: 'visible', timeout: 60000 }).catch(() => {});
  const newWorked = await s.isVisible('#signout-btn').catch(() => false);
  const newMsg = (await s.textContent('#auth-msg').catch(() => '')).trim();
  note(`NEW password → signed in=${newWorked}${newMsg ? ` msg="${newMsg}"` : ''}`);
  if (!newWorked) finding('S1', `Cannot sign in with the NEW password after the reset (msg="${newMsg}")`);
  else note('✅ New password works');
  await shot(s, '05-signed-in-new-password.png');

} catch (err) {
  note(`❌ P1-6 ERROR: ${err.message}`);
  if (!findings.some(f => f.sev === 'S1')) finding('S1', `P1-6 threw: ${err.message}`);
  await shot(page, 'ERROR-p1-6.png').catch(() => {});
}

note('');
note('════════ P1-6 RESULT ════════');
note(`Account:       ${EMAIL}`);
note(`Reset landing: ${resetLanding || 'NONE'}`);
note(`Branded reset completed: ${changedOk}`);
note(`Findings: ${findings.length}`);
findings.forEach(f => note(`  ${f.sev} ${f.msg}`));
if (!findings.length) note('✅ P1-6 PASS');
if (consoleMsgs.length) { note('--- console ---'); [...new Set(consoleMsgs)].slice(0, 8).forEach(m => note('  ' + m)); } else note('Console: clean 🎉');

fs.writeFileSync(path.join(RUN_DIR, 'run-log.txt'), log.join('\n'));
fs.writeFileSync(path.join(RUN_DIR, 'findings.json'), JSON.stringify({ email: EMAIL, tag: TAG, resetLanding, findings, consoleMsgs: [...new Set(consoleMsgs)] }, null, 2));
note(`Artefacts → ${RUN_DIR}`);

await browser.close();
process.exit(findings.some(f => f.sev === 'S1') ? 1 : 0);
