// P1-13 — A STAFF-ALLOWLISTED account uses the CUSTOMER-facing pages.
// Catalogue: work/pre-launch-qa/case-catalogue_v1.md
//
// Pass = behaves sensibly. Concretely, no crash and no privilege leak in EITHER
// direction:
//   • staff must NOT see other customers' orders on account.html (leak outward), and
//   • staff must NOT be locked out of a preview link they legitimately hold (leak inward).
//
// Three legs:
//   A. staff account, email UNVERIFIED (its real state) → account.html
//   B. staff account, email VERIFIED → account.html + getMyOrders. The fixture flips
//      emailVerified via the admin SDK so the verified branch can actually be exercised,
//      then RESTORES it. This is a fixture mutation on a QA account, not a product change.
//   C. staff session live in the browser → open a customer-preview token
//
// Run: node qa/p1-staff-13-staff-as-customer.mjs <AEV-nnn-with-a-preview-token>
//   e.g. node qa/p1-staff-13-staff-as-customer.mjs AEV-055

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { orderState, db } from './firestore.mjs';

const require = createRequire(import.meta.url);
const admin = require(path.resolve('functions/node_modules/firebase-admin'));

const ORDER = (process.argv[2] || 'AEV-055').toUpperCase();
const BASE = 'https://aevia-test.pages.dev/pages';
const RUN_DIR = path.resolve('sessions/qa-runs', `${new Date().toISOString().slice(0, 10)}-p1-staff-13`);
fs.mkdirSync(RUN_DIR, { recursive: true });

const env = Object.fromEntries(
  fs.readFileSync(path.resolve('qa/.env'), 'utf8')
    .split('\n').filter(l => l.trim() && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const STAFF = env.STAFF_TEST_EMAIL;

const log = [], findings = [];
const note = (m) => { const l = `[${new Date().toISOString().slice(11, 19)}] ${m}`; console.log(l); log.push(l); };
const finding = (sev, msg) => { findings.push({ sev, id: 'P1-13', msg }); note(`  ⚠️  ${sev} ${msg}`); };
const shot = async (p, n) => { await p.screenshot({ path: path.join(RUN_DIR, n), fullPage: true }); note(`📸 ${n}`); };

const consoleMsgs = [];
const browser = await chromium.launch({ headless: true });
const result = { staff: STAFF, order: ORDER };
let restoreVerified = null;

function watch(pg) {
  pg.on('console', m => { if (['error', 'warning'].includes(m.type())) consoleMsgs.push(`${m.type()}: ${m.text()}`); });
  pg.on('pageerror', e => consoleMsgs.push(`pageerror: ${e.message}`));
  pg.on('dialog', d => d.accept().catch(() => {}));
}

/** Sign in on account.html and return which view the router landed on. */
async function signIn(page) {
  await page.goto(`${BASE}/account.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#auth-view', { state: 'visible', timeout: 30000 });
  await page.fill('#email', STAFF);
  await page.fill('#password', env.STAFF_TEST_PASSWORD);
  await page.click('#email-form button[type="submit"]');
  await page.waitForFunction(() => {
    const vis = id => { const el = document.getElementById(id); return el && el.style.display !== 'none'; };
    return vis('verify-view') || vis('account-view');
  }, {}, { timeout: 45000 }).catch(() => {});
  return page.evaluate(() => {
    const vis = id => { const el = document.getElementById(id); return el && el.style.display !== 'none'; };
    return vis('account-view') ? 'account' : vis('verify-view') ? 'verify' : vis('auth-view') ? 'auth' : 'unknown';
  });
}

try {
  // ── A. Unverified staff account on account.html ─────────────────
  note(`── A. account.html as ${STAFF} (email UNVERIFIED — its real state)`);
  const user = await admin.auth().getUserByEmail(STAFF);
  restoreVerified = user.emailVerified;
  note(`Firebase user: uid=${user.uid} emailVerified=${user.emailVerified}`);

  const ctxA = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  ctxA.on('page', watch);
  const a = await ctxA.newPage();
  const viewA = await signIn(a);
  note(`Landed on view: "${viewA}" (expected "verify" — the same gate any unverified customer hits)`);
  result.unverifiedView = viewA;
  if (viewA === 'unknown' || viewA === 'auth') finding('S2', `Staff sign-in on account.html landed on "${viewA}" — sign-in appears broken for a staff account`);
  else if (viewA === 'account') finding('S1', 'PRIVILEGE LEAK: an UNVERIFIED staff account was let straight into the account view');
  else note('✅ Staff account is gated by the same email-verification wall as any customer');
  await shot(a, '01-account-unverified.png');

  // The unverified call must be refused, not answered with somebody else's data.
  const rawA = await a.evaluate(async () => {
    // Do NOT re-import firebase-auth here: a dynamic import inside evaluate() gets a
    // FRESH module instance with no initialised app ("No Firebase App '[DEFAULT]'").
    // The signed-in ID token is already persisted in localStorage — read it from there.
    const k = Object.keys(localStorage).find(x => x.startsWith('firebase:authUser:'));
    if (!k) return { status: null, body: 'no persisted firebase auth user' };
    const t = JSON.parse(localStorage.getItem(k))?.stsTokenManager?.accessToken;
    if (!t) return { status: null, body: 'no access token in persisted auth user' };
    const r = await fetch('https://europe-west1-aevia-uploads.cloudfunctions.net/getMyOrders', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
    });
    return { status: r.status, body: await r.text() };
  }).catch(e => ({ status: null, body: 'evaluate failed: ' + e.message }));
  note(`getMyOrders (unverified) → HTTP ${rawA.status}: ${rawA.body.slice(0, 120)}`);
  result.getMyOrdersUnverified = rawA;
  if (rawA.status === 200 && /AEV-/.test(rawA.body)) finding('S1', 'PRIVILEGE LEAK: getMyOrders returned orders to an UNVERIFIED staff account');
  else if (rawA.status !== 403) finding('S3', `getMyOrders returned ${rawA.status} for an unverified account (expected 403 "unverified")`);
  await ctxA.close();

  // ── B. Verified staff account on account.html ───────────────────
  // Fixture: flip emailVerified so the verified branch is reachable. Restored in the
  // finally block. The real question: does a STAFF account see other customers' orders?
  note(`── B. account.html as ${STAFF} with emailVerified=true (fixture flip)`);
  await admin.auth().updateUser(user.uid, { emailVerified: true });
  note('Fixture: emailVerified → true');

  const ctxB = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  ctxB.on('page', watch);
  const b = await ctxB.newPage();
  const viewB = await signIn(b);
  note(`Landed on view: "${viewB}" (expected "account")`);
  result.verifiedView = viewB;
  if (viewB !== 'account') finding('S2', `A verified staff account cannot reach the account view (landed "${viewB}") — locked out of the customer side`);
  await b.waitForTimeout(6000);

  const rawB = await b.evaluate(async () => {
    // Same as leg A: read the persisted ID token, don't re-import firebase-auth.
    // This sign-in happened AFTER the emailVerified flip, so the token is fresh and
    // carries email_verified=true.
    const k = Object.keys(localStorage).find(x => x.startsWith('firebase:authUser:'));
    if (!k) return { status: null, body: 'no persisted firebase auth user' };
    const t = JSON.parse(localStorage.getItem(k))?.stsTokenManager?.accessToken;
    if (!t) return { status: null, body: 'no access token in persisted auth user' };
    const r = await fetch('https://europe-west1-aevia-uploads.cloudfunctions.net/getMyOrders', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
    });
    return { status: r.status, body: await r.text() };
  }).catch(e => ({ status: null, body: 'evaluate failed: ' + e.message }));
  let parsed = {};
  try { parsed = JSON.parse(rawB.body); } catch { /* leave empty */ }
  const returned = (parsed.orders || []).map(o => o.orderNumber);
  note(`getMyOrders (verified staff) → HTTP ${rawB.status}, email="${parsed.email}", orders: [${returned.join(', ') || 'none'}]`);
  result.getMyOrdersVerified = { status: rawB.status, email: parsed.email, orders: returned };
  if (rawB.status !== 200) finding('S2', `getMyOrders returned HTTP ${rawB.status} to a VERIFIED account: ${rawB.body.slice(0, 100)}`);
  if (rawB.status === 200 && (parsed.email || '').toLowerCase() !== STAFF.toLowerCase()) {
    finding('S1', `getMyOrders answered as "${parsed.email}", not the signed-in account`);
  }

  // The leak test. Every order the API hands back must belong to the staff address.
  const ownEmail = STAFF.toLowerCase();
  const foreign = [];
  for (const n of returned) {
    const s = await orderState(n);
    if (s && (s.email || '').toLowerCase() !== ownEmail) foreign.push(`${n} (${s.email})`);
  }
  if (foreign.length) finding('S1', `PRIVILEGE LEAK: getMyOrders returned orders belonging to OTHER customers: ${foreign.join(', ')}`);
  else note(`✅ No leak — getMyOrders is scoped to the account's own email (${returned.length} order(s), all its own)`);

  // Belt-and-braces: no foreign order number may be rendered on the page either.
  const pageTxt = (await b.textContent('body')).replace(/\s+/g, ' ');
  const shown = [...new Set((pageTxt.match(/AEV-\d+/g) || []))];
  const leaked = shown.filter(n => !returned.includes(n));
  note(`Order numbers rendered on the page: [${shown.join(', ') || 'none'}]`);
  if (leaked.length) finding('S1', `PRIVILEGE LEAK: account.html renders order numbers not owned by this account: ${leaked.join(', ')}`);
  result.renderedOrders = shown;
  await shot(b, '02-account-verified.png');

  // ── C. Staff session + a customer preview link ──────────────────
  note(`── C. Open ${ORDER}'s customer-preview token while signed in as staff`);
  const st = await orderState(ORDER);
  if (!st?.previewToken) {
    finding('S3', `HARNESS: ${ORDER} has no previewToken — leg C skipped`);
  } else {
    const c = await ctxB.newPage(); // same context = staff session still live
    const errs = [];
    c.on('pageerror', e => errs.push(e.message));
    watch(c);
    await c.goto(`${BASE}/customer-preview.html?token=${st.previewToken}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await c.waitForSelector('#book-canvas', { timeout: 120000 });
    await c.waitForTimeout(8000);
    const view = await c.evaluate(() => {
      const body = document.body.innerText.replace(/\s+/g, ' ');
      return {
        photos: [...document.querySelectorAll('#book-canvas .photo-slot img')].filter(i => i.src && i.naturalWidth > 0).length,
        rejected: /expired|invalid|not found|no access|sign in/i.test(body.slice(0, 500)),
        blurb: body.slice(0, 120),
      };
    });
    note(`Preview: ${view.photos} photo(s) rendered · rejected=${view.rejected} · pageerrors=${errs.length}`);
    result.previewAsStaff = { ...view, pageerrors: errs };
    if (view.rejected) finding('S2', 'PRIVILEGE LEAK (inward): a staff-signed-in browser is REJECTED from a preview link it legitimately holds');
    else if (!view.photos) finding('S2', 'Preview opens for a staff account but renders no photos');
    else note('✅ Staff session does not break or lock out the customer preview — it renders normally');
    if (errs.length) finding('S3', `Uncaught page error(s) on the preview with a staff session: ${errs.slice(0, 2).join(' | ')}`);
    await shot(c, '03-preview-as-staff.png');
  }
  await ctxB.close();

} catch (err) {
  note(`❌ P1-13 ERROR: ${err.message}`);
  if (!findings.some(f => f.sev === 'S1')) finding('S1', `P1-13 threw: ${err.message}`);
} finally {
  // Always put the QA account back the way we found it.
  if (restoreVerified !== null) {
    try {
      const u = await admin.auth().getUserByEmail(STAFF);
      await admin.auth().updateUser(u.uid, { emailVerified: restoreVerified });
      note(`Fixture restored: emailVerified → ${restoreVerified}`);
    } catch (e) { note(`⚠️  Could not restore emailVerified: ${e.message}`); }
  }
}

note('');
note('════════ P1-13 RESULT ════════');
note(`Findings: ${findings.length}`);
findings.forEach(f => note(`  ${f.sev} ${f.msg}`));
if (consoleMsgs.length) { note('--- console ---'); [...new Set(consoleMsgs)].slice(0, 8).forEach(m => note('  ' + m)); } else note('Console: clean');

fs.writeFileSync(path.join(RUN_DIR, 'run-log.txt'), log.join('\n'));
fs.writeFileSync(path.join(RUN_DIR, 'findings.json'), JSON.stringify({ id: 'P1-13', ...result, findings, consoleMsgs: [...new Set(consoleMsgs)] }, null, 2));
note(`Artefacts → ${RUN_DIR}`);

await browser.close();
process.exit(findings.some(f => f.sev === 'S1') ? 1 : 0);
