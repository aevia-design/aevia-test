// P1-10 — Customer "Report an issue" from the preview.
// Catalogue: work/pre-launch-qa/case-catalogue_v1.md
//
// Pass criteria:
//   a) on a review_sent order the status flips to `issue`
//   b) the staff dashboard FLAGS it: red-tinted row, inline ⚠ note, Issues filter,
//      Issues stat card, and the issue order sorts to the TOP of the table
//   c) a support email fires to support@aevia.at
//
// Also confirms the deliberate S114 design (leg C): after the customer has APPROVED,
// the "Report an issue" link stays available but must NOT knock an approved/paid order
// back to `issue` — it only records the note and emails support.
//
// Leg C mutates the order to `approved`, so run this on an order you own.
//
// NOTE on (c): support@aevia.at is a real mailbox — the harness cannot read it, and
// reportOrderIssue swallows mail errors (functions/index.js:422-426) so a 200 does not
// prove delivery. What IS asserted here: the function returns 200 and the customer sees
// the success toast. Mailbox delivery needs a human eyeball.
//
// Run: node qa/p1-staff-10-issue.mjs <AEV-nnn>
//   e.g. node qa/p1-staff-10-issue.mjs AEV-055   (must already be review_sent)

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { orderState } from './firestore.mjs';

const ORDER = (process.argv[2] || '').toUpperCase();
if (!/^AEV-\d+$/.test(ORDER)) {
  console.error('Usage: node qa/p1-staff-10-issue.mjs <AEV-nnn>');
  process.exit(1);
}

const BASE = 'https://aevia-test.pages.dev/pages';
const RUN_DIR = path.resolve('sessions/qa-runs', `${new Date().toISOString().slice(0, 10)}-p1-staff-10-${ORDER}`);
fs.mkdirSync(RUN_DIR, { recursive: true });

const STAMP = Date.now();
const ISSUE_MSG   = `QA P1-10 ${STAMP}: the cover photo is upside down and my daughter's name is misspelled.`;
const ISSUE_MSG_2 = `QA P1-10 ${STAMP} post-approval: spotted a typo on page 12 after approving.`;

const env = Object.fromEntries(
  fs.readFileSync(path.resolve('qa/.env'), 'utf8')
    .split('\n').filter(l => l.trim() && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const log = [], findings = [];
const note = (m) => { const l = `[${new Date().toISOString().slice(11, 19)}] ${m}`; console.log(l); log.push(l); };
const finding = (sev, msg) => { findings.push({ sev, id: 'P1-10', order: ORDER, msg }); note(`  ⚠️  ${sev} ${msg}`); };
const shot = async (p, n) => { await p.screenshot({ path: path.join(RUN_DIR, n), fullPage: true }); note(`📸 ${n}`); };

const consoleMsgs = [], dialogs = [];
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
ctx.on('page', pg => {
  pg.on('console', m => { if (['error', 'warning'].includes(m.type())) consoleMsgs.push(`${m.type()}: ${m.text()}`); });
  pg.on('pageerror', e => consoleMsgs.push(`pageerror: ${e.message}`));
  pg.on('dialog', d => { dialogs.push(`${d.type()}: ${d.message().replace(/\s+/g, ' ')}`); d.accept().catch(() => {}); });
});

const result = { order: ORDER };

/** Fill the issue modal on an already-open customer-preview page and send it. */
async function reportIssue(page, message) {
  await page.click('#report-issue-link');
  await page.waitForSelector('#issue-modal', { state: 'visible', timeout: 10000 });
  await page.fill('#issue-text', message);
  const posts = [];
  page.on('response', r => { if (r.url().includes('reportOrderIssue')) posts.push(r.status()); });
  await page.click('#issue-send');
  await page.waitForTimeout(6000);
  const statusTxt = (await page.textContent('#issue-status').catch(() => '')) || '';
  const modalOpen = await page.isVisible('#issue-modal');
  const body = (await page.textContent('body')).replace(/\s+/g, ' ');
  return { httpStatus: posts[0] ?? null, statusTxt: statusTxt.trim(), modalOpen, toast: /we got your message/i.test(body) };
}

try {
  // ── A. Fixture ──────────────────────────────────────────────────
  note(`── A. Fixture (${ORDER})`);
  const pre = await orderState(ORDER);
  if (!pre) throw new Error(`${ORDER} does not exist`);
  note(`status=${pre.status} previewToken=${pre.previewToken ? 'yes' : 'NONE'}`);
  if (!pre.previewToken) throw new Error(`${ORDER} has no previewToken — run qa/p0-2-preview.mjs first`);
  if (pre.status !== 'review_sent') {
    finding('S3', `HARNESS: ${ORDER} is "${pre.status}", not "review_sent" — leg A/B cannot be judged`);
  }
  const previewUrl = `${BASE}/customer-preview.html?token=${pre.previewToken}`;

  // ── B. Customer reports the issue ───────────────────────────────
  note('── B. Customer opens the preview and reports an issue');
  const cust = await ctx.newPage();
  await cust.goto(previewUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await cust.waitForSelector('#book-canvas', { timeout: 120000 });
  await cust.waitForTimeout(5000);
  const linkVisible = await cust.isVisible('#report-issue-link');
  note(`"Report an issue" link visible on a review_sent preview: ${linkVisible}`);
  if (!linkVisible) { finding('S1', 'No "Report an issue" link on a review_sent preview'); throw new Error('no link'); }
  await shot(cust, '01-preview.png');

  const r1 = await reportIssue(cust, ISSUE_MSG);
  result.report1 = r1;
  note(`reportOrderIssue → HTTP ${r1.httpStatus}; modal closed: ${!r1.modalOpen}; toast: ${r1.toast}${r1.statusTxt ? `; inline status: "${r1.statusTxt}"` : ''}`);
  if (r1.httpStatus !== 200) finding('S1', `reportOrderIssue returned HTTP ${r1.httpStatus} — the report did not land`);
  if (r1.modalOpen) finding('S2', `Issue modal stayed open after send — customer gets no confirmation ("${r1.statusTxt}")`);
  if (!r1.toast) finding('S2', 'No confirmation toast after reporting an issue');
  await shot(cust, '02-issue-sent.png');

  // ── C. Firestore: status flips to `issue` ───────────────────────
  note('── C. Order state after the report');
  await cust.waitForTimeout(3000);
  const post = await orderState(ORDER);
  result.post = post;
  note(`status=${post.status} issueNote="${(post.issueNote || '').slice(0, 60)}…" reportedAt=${post.issueReportedAt}`);
  note(`statusHistory: ${post.statusHistory.join(' → ')}`);
  if (post.status !== 'issue') finding('S1', `Status is "${post.status}", expected "issue"`);
  else note('✅ Status = issue');
  if (post.issueNote !== ISSUE_MSG) finding('S2', `issueNote not stored verbatim: "${post.issueNote}"`);
  if (!post.issueReportedAt) finding('S3', 'issueReportedAt not stamped');
  if (!post.statusHistory.includes('issue')) finding('S3', 'statusHistory has no "issue" entry');

  // ── D. Dashboard flags it ───────────────────────────────────────
  note('── D. Dashboard flagging');
  const dash = await ctx.newPage();
  await dash.goto(`${BASE}/staff/dashboard.html`, { waitUntil: 'domcontentloaded' });
  const locked = await dash.waitForSelector('#app', { state: 'visible', timeout: 8000 }).then(() => false).catch(() => true);
  if (locked) {
    await dash.waitForSelector('#email-input', { state: 'visible', timeout: 30000 });
    await dash.fill('#email-input', env.STAFF_TEST_EMAIL);
    await dash.fill('#pwd-input', env.STAFF_TEST_PASSWORD);
    await dash.click('.lock-btn');
    await dash.waitForSelector('#app', { state: 'visible', timeout: 30000 });
  }
  await dash.waitForFunction(
    (n) => (document.getElementById('orders-body')?.innerText || '').includes(n),
    ORDER, { timeout: 60000 }
  );
  await dash.waitForTimeout(3000);

  const flags = await dash.evaluate((n) => {
    const rows = [...document.querySelectorAll('#orders-body tr')];
    const idx = rows.findIndex(r => r.innerText.includes(n));
    const tr = rows[idx];
    const cs = tr ? getComputedStyle(tr.querySelector('td')) : null;
    return {
      rowIndex: idx,
      totalRows: rows.length,
      hasRowIssueClass: tr ? tr.classList.contains('row-issue') : false,
      tdBackground: cs ? cs.backgroundColor : null,
      tdBoxShadow: cs ? cs.boxShadow : null,
      issueNoteText: tr ? (tr.querySelector('.issue-note')?.textContent || '').trim() : '',
      statusSelect: tr ? tr.querySelector('select.status-select')?.value : null,
      statsIssues: document.getElementById('stat-issues')?.textContent,
      hasIssuesFilter: [...document.querySelectorAll('.filter-btn')].some(b => b.textContent.trim() === 'Issues'),
    };
  }, ORDER);
  result.flags = flags;
  note(`row-issue class: ${flags.hasRowIssueClass} · bg ${flags.tdBackground} · left bar ${flags.tdBoxShadow}`);
  note(`inline note: "${flags.issueNoteText.slice(0, 70)}…"`);
  note(`row position: ${flags.rowIndex + 1} of ${flags.totalRows} · Issues stat card: ${flags.statsIssues} · status select: ${flags.statusSelect}`);

  if (!flags.hasRowIssueClass) finding('S2', 'Dashboard row is not marked .row-issue — no red tint');
  if (!/^⚠/.test(flags.issueNoteText)) finding('S2', 'No inline ⚠ issue note on the dashboard row');
  else if (!flags.issueNoteText.includes(ISSUE_MSG.slice(0, 30))) finding('S3', 'Inline note does not show the customer message');
  if (flags.rowIndex !== 0) finding('S2', `Issue order is row ${flags.rowIndex + 1}, not sorted to the top`);
  else note('✅ Issue order floats to the top of the table');
  if (!flags.hasIssuesFilter) finding('S2', 'No "Issues" filter button on the dashboard');
  if (!Number(flags.statsIssues)) finding('S2', `Issues stat card reads "${flags.statsIssues}"`);
  await shot(dash, '03-dashboard-flagged.png');

  // Issues filter actually filters to it.
  await dash.evaluate(() => {
    const b = [...document.querySelectorAll('.filter-btn')].find(x => x.textContent.trim() === 'Issues');
    if (b) b.click();
  });
  await dash.waitForTimeout(2500);
  const filtered = await dash.evaluate((n) => {
    const rows = [...document.querySelectorAll('#orders-body tr')];
    return { count: rows.length, hasOrder: rows.some(r => r.innerText.includes(n)) };
  }, ORDER);
  note(`Issues filter → ${filtered.count} row(s); includes ${ORDER}: ${filtered.hasOrder}`);
  if (!filtered.hasOrder) finding('S2', `${ORDER} does not appear under the Issues filter`);
  result.issuesFilter = filtered;
  await shot(dash, '04-issues-filter.png');

  // ── E. S114 design check: post-approval report must NOT re-flag ──
  note('── E. Post-approval report (S114 design: note + email only, no dashboard flag)');
  await cust.reload({ waitUntil: 'domcontentloaded' });
  await cust.waitForSelector('#book-canvas', { timeout: 120000 });
  await cust.waitForTimeout(4000);
  const approveBtn = await cust.$('#approve-btn');
  if (!approveBtn) {
    finding('S3', 'HARNESS: no #approve-btn — cannot exercise leg E');
  } else {
    await approveBtn.click();
    await cust.waitForTimeout(9000);
    const approved = await orderState(ORDER);
    note(`After approve: status=${approved.status}`);
    if (approved.status !== 'approved') {
      finding('S2', `Approving an "issue" order left status "${approved.status}" — cannot judge leg E`);
    } else {
      const stillThere = await cust.isVisible('#report-issue-link');
      note(`"Report an issue" link still visible after approval: ${stillThere} (S114: expected true)`);
      if (!stillThere) {
        finding('S3', 'Report-an-issue link disappears after approval — S114 says it should stay');
      } else {
        const r2 = await reportIssue(cust, ISSUE_MSG_2);
        result.report2 = r2;
        note(`2nd report → HTTP ${r2.httpStatus}; toast: ${r2.toast}`);
        await cust.waitForTimeout(3000);
        const after = await orderState(ORDER);
        result.postApproval = after;
        note(`Status after post-approval report: ${after.status} (S114: must stay "approved")`);
        note(`issueNote now: "${(after.issueNote || '').slice(0, 60)}…"`);
        if (r2.httpStatus !== 200) finding('S2', `Post-approval report returned HTTP ${r2.httpStatus}`);
        if (after.status !== 'approved') {
          finding('S1', `Post-approval report knocked the order back to "${after.status}" — an approved/paid order must not be re-flagged (S114)`);
        } else {
          note('✅ Approved order NOT knocked back — note recorded, dashboard not re-flagged (S114 by design)');
        }
        if (after.issueNote !== ISSUE_MSG_2) finding('S3', 'Post-approval note was not recorded on the order');
      }
    }
    await shot(cust, '05-post-approval.png');

    // And the dashboard must not show it as an issue any more.
    await dash.reload({ waitUntil: 'domcontentloaded' });
    await dash.waitForFunction(
      (n) => (document.getElementById('orders-body')?.innerText || '').includes(n),
      ORDER, { timeout: 60000 }
    ).catch(() => {});
    await dash.waitForTimeout(3000);
    const f2 = await dash.evaluate((n) => {
      const tr = [...document.querySelectorAll('#orders-body tr')].find(r => r.innerText.includes(n));
      return tr ? { rowIssue: tr.classList.contains('row-issue'), note: !!tr.querySelector('.issue-note') } : null;
    }, ORDER);
    note(`Dashboard after post-approval report: row-issue=${f2?.rowIssue} inline-note=${f2?.note} (both expected false)`);
    result.postApprovalFlags = f2;
    await shot(dash, '06-dashboard-after-approval.png');
  }

} catch (err) {
  note(`❌ P1-10 ERROR: ${err.message}`);
  if (!findings.some(f => f.sev === 'S1')) finding('S1', `P1-10 threw: ${err.message}`);
}

note('');
note(`════════ P1-10 ${ORDER} RESULT ════════`);
note('NOTE: support@aevia.at is a real mailbox — this harness cannot read it, and');
note('reportOrderIssue swallows mail errors, so HTTP 200 does not prove delivery.');
note('The owner must eyeball the support inbox for: "Issue reported — ' + ORDER + '".');
note(`Findings: ${findings.length}`);
findings.forEach(f => note(`  ${f.sev} ${f.msg}`));
if (consoleMsgs.length) { note('--- console ---'); [...new Set(consoleMsgs)].slice(0, 8).forEach(m => note('  ' + m)); } else note('Console: clean');

fs.writeFileSync(path.join(RUN_DIR, 'run-log.txt'), log.join('\n'));
fs.writeFileSync(path.join(RUN_DIR, 'findings.json'), JSON.stringify({ id: 'P1-10', ...result, findings, dialogs, consoleMsgs: [...new Set(consoleMsgs)] }, null, 2));
note(`Artefacts → ${RUN_DIR}`);

await browser.close();
process.exit(findings.some(f => f.sev === 'S1') ? 1 : 0);
