// TO-DOS #99 — end-to-end scenario coverage for the review lock + issue flow,
// WITHOUT any cloud writes: firebase-admin is replaced by an in-memory fake
// (tests/helpers/fake-firestore.js) and functions/index.js's REAL exported
// handlers are driven directly with fake req/res, following the mocking
// pattern in tests/confirm-upload-emails.test.js. A pass here is a statement
// about the shipped handler code, not a description of intended behaviour.
//
// Each handler is a plain callable function — firebase-functions' v1
// .region().runWith().https.onRequest(fn) returns fn itself for a direct
// call, no wrapping that matters here, so no mock of 'firebase-functions' is
// needed (verified: `typeof idx.getOrder === 'function'`).

const { fakeAdminModule } = require('./helpers/fake-firestore');

const STAFF_KEY = 'test-staff-key';

function makeRes() {
  const res = {};
  res.statusCode = 200;
  res.status = jest.fn((c) => { res.statusCode = c; return res; });
  res.body = null;
  res.json = jest.fn((b) => { res.body = b; return res; });
  res.set = jest.fn(() => res);
  res.send = jest.fn(() => res);
  return res;
}
const staffReq     = (body) => ({ method: 'POST', headers: { 'x-staff-key': STAFF_KEY }, body });
const customerReq  = (body) => ({ method: 'POST', headers: {}, body });

// Shaped after a real QA order (AEV-064-style): a Scribble book staff have
// already laid out and saved complete, ready to send.
function baseOrder(overrides = {}) {
  return {
    orderNumber: 'AEV-064',
    customerName: 'Anna Test',
    email: 'anna@test.com',
    templateName: 'Scribble',
    pageCount: '40',
    language: 'en',
    previewToken: 'tok-064',
    status: 'new',
    staffBookComplete: true,
    staffIncompleteReasons: [],
    staffBookAssignments: { 0: { left: ['photo1.jpg'], right: ['photo2.jpg'] } },
    staffBookCaptions: { 0: { left: { 0: 'Original caption' } } },
    staffBookCaptionLines: null,
    staffBookSequence: [0, 1, 2],
    staffCoverCaptionStyles: {},
    staffSpreadCaptionStyles: {},
    staffHeartCrop: {},
    reports: [],
    // bookRevision intentionally absent on some seeds — scenario (i) below
    // relies on that: absent must read as 0.
    ...overrides,
  };
}

let idx, db;

// jest.resetModules + jest.doMock (the non-hoisted form) so each test gets
// its OWN fake Firestore with its OWN seed — that's what doMock is for.
function setup(seedOrders) {
  jest.resetModules();
  const admin = fakeAdminModule({ orders: seedOrders });
  // virtual: true — firebase-admin only lives in functions/node_modules, not
  // the repo root jest resolves from (same reason confirm-upload-emails.test.js
  // marks cors/@google-cloud/storage virtual).
  jest.doMock('firebase-admin', () => admin, { virtual: true });
  jest.doMock('../functions/email', () => ({
    createTransporter: () => ({ sendMail: jest.fn(() => Promise.resolve({})) }),
    FROM: { customer: { from: 'customer@aevia.at' }, orders: { from: 'orders@aevia.at' } },
    renderEmail: (html) => html,
    emailButton: () => '',
  }));
  process.env.STAFF_KEY = STAFF_KEY;
  idx = require('../functions/index.js');
  db = admin.__db;
}

describe('sanity', () => {
  test('exported handlers are plain callables', () => {
    setup({ 'AEV-064': baseOrder() });
    expect(typeof idx.getOrder).toBe('function');
    expect(typeof idx.saveOrderState).toBe('function');
    expect(typeof idx.approveOrder).toBe('function');
    expect(typeof idx.reportOrderIssue).toBe('function');
    expect(typeof idx.openIssueForFix).toBe('function');
    expect(typeof idx.saveStaffState).toBe('function');
    expect(typeof idx.sendPreviewEmail).toBe('function');
  });
});

// (a) Happy path: send → customer save → save again → approve.
describe('(a) happy path', () => {
  test('send, two customer saves, then approve — no 409s, staff gets the customer state, sentVersions/1 exists', async () => {
    setup({ 'AEV-064': baseOrder({ status: 'new' }) });

    const sendRes = makeRes();
    await idx.sendPreviewEmail(staffReq({ orderNumber: 'AEV-064', bookRevision: 0 }), sendRes);
    expect(sendRes.statusCode).toBe(200);
    let order = db._dump('AEV-064');
    expect(order.status).toBe('review_sent');
    expect(order.bookRevision).toBe(1);
    expect(db._dumpSentVersions('AEV-064')['1']).toBeTruthy();

    const save1 = makeRes();
    await idx.saveOrderState(customerReq({
      token: 'tok-064', bookAssignments: { 0: { left: ['photo1.jpg'], right: [null] } },
      captions: {}, captionLines: {}, spreadCaptionStyles: {}, coverCaptionStyles: {}, heartCrop: {},
      bookRevision: 1,
    }), save1);
    expect(save1.statusCode).toBe(200);
    order = db._dump('AEV-064');
    expect(order.bookRevision).toBe(2);

    const save2 = makeRes();
    await idx.saveOrderState(customerReq({
      token: 'tok-064', bookAssignments: { 0: { left: ['photo1.jpg'], right: ['photo3.jpg'] } },
      captions: { 0: { left: { 0: 'Customer caption' } } }, captionLines: {}, spreadCaptionStyles: {}, coverCaptionStyles: {}, heartCrop: {},
      bookRevision: 2,
    }), save2);
    expect(save2.statusCode).toBe(200);
    order = db._dump('AEV-064');
    expect(order.bookRevision).toBe(3);
    expect(order.customerBookAssignments).toEqual({ 0: { left: ['photo1.jpg'], right: ['photo3.jpg'] } });

    const approveRes = makeRes();
    await idx.approveOrder(customerReq({
      token: 'tok-064', bookAssignments: { 0: { left: ['photo1.jpg'], right: ['photo3.jpg'] } },
      captions: { 0: { left: { 0: 'Customer caption' } } }, captionLines: {}, spreadCaptionStyles: {}, coverCaptionStyles: {}, heartCrop: {},
      bookRevision: 3,
    }), approveRes);
    expect(approveRes.statusCode).toBe(200);
    order = db._dump('AEV-064');
    expect(order.status).toBe('approved');
    expect(order.staffBookAssignments).toEqual({ 0: { left: ['photo1.jpg'], right: ['photo3.jpg'] } });
    expect(order.staffBookCaptions).toEqual({ 0: { left: { 0: 'Customer caption' } } });
  });
});

// (b) Blocking report with unsaved edits, full fix-and-resend loop.
describe('(b) blocking report unlocks staff, fix, resend, approve', () => {
  test('full loop: report → issue, promote+clear; staff fixes; resend; customer sees fix; approve', async () => {
    setup({ 'AEV-064': baseOrder({ status: 'review_sent', bookRevision: 1, sendCount: 1 }) });

    const reportRes = makeRes();
    await idx.reportOrderIssue(customerReq({
      token: 'tok-064', message: 'The cover photo is blurry', reportType: 'blocking',
      bookAssignments: { 0: { left: ['photo1.jpg'], right: ['REPORTED.jpg'] } },
      captions: {}, captionLines: {}, spreadCaptionStyles: {}, coverCaptionStyles: {}, heartCrop: {},
      bookRevision: 1,
    }), reportRes);
    expect(reportRes.statusCode).toBe(200);
    let order = db._dump('AEV-064');
    expect(order.status).toBe('issue');
    expect(order.customerBookAssignments).toBeNull();
    expect(order.staffBookAssignments).toEqual({ 0: { left: ['photo1.jpg'], right: ['REPORTED.jpg'] } });
    expect(order.staffBookComplete).toBe(false);
    expect(order.reports).toHaveLength(1);
    expect(order.reports[0].type).toBe('blocking');
    const revAfterReport = order.bookRevision;

    // Approve refused while the issue is open.
    const approveBlocked = makeRes();
    await idx.approveOrder(customerReq({ token: 'tok-064', bookRevision: revAfterReport }), approveBlocked);
    expect(approveBlocked.statusCode).toBe(409);

    // Customer save refused too (canCustomerSave requires review_sent).
    const saveBlocked = makeRes();
    await idx.saveOrderState(customerReq({ token: 'tok-064', bookAssignments: {}, bookRevision: revAfterReport }), saveBlocked);
    expect(saveBlocked.statusCode).toBe(409);
    expect(saveBlocked.body.code).toBe('LOCKED');

    // Staff CAN save while 'issue'.
    const staffSaveRes = makeRes();
    await idx.saveStaffState(staffReq({
      orderNumber: 'AEV-064',
      bookAssignments: { 0: { left: ['photo1.jpg'], right: ['FIXED.jpg'] } },
      bookCaptions: {}, bookCaptionLines: {}, bookSequence: [0, 1, 2],
      coverCaptionStyles: {}, spreadCaptionStyles: {}, heartCrop: {},
      bookComplete: true, incompleteReasons: [],
      bookRevision: revAfterReport,
    }), staffSaveRes);
    expect(staffSaveRes.statusCode).toBe(200);
    order = db._dump('AEV-064');
    expect(order.staffBookAssignments).toEqual({ 0: { left: ['photo1.jpg'], right: ['FIXED.jpg'] } });
    expect(order.staffBookComplete).toBe(true);
    const revAfterStaffSave = order.bookRevision;

    // Resend closes the loop — sentVersions/2 (this is a genuine ENTRY into
    // review_sent, from 'issue', not a plain resend).
    const resendRes = makeRes();
    await idx.sendPreviewEmail(staffReq({ orderNumber: 'AEV-064', bookRevision: revAfterStaffSave }), resendRes);
    expect(resendRes.statusCode).toBe(200);
    order = db._dump('AEV-064');
    expect(order.status).toBe('review_sent');
    expect(db._dumpSentVersions('AEV-064')['2']).toBeTruthy();

    // Customer reload sees the FIXED book (staffBookAssignments, since
    // customer* was cleared at promotion and never re-populated by staff).
    const getRes = makeRes();
    await idx.getOrder(customerReq({ token: 'tok-064' }), getRes);
    expect(getRes.body.customerBookAssignments).toBeNull();
    expect(getRes.body.staffBookAssignments).toEqual({ 0: { left: ['photo1.jpg'], right: ['FIXED.jpg'] } });

    // Approve now succeeds.
    const approveRes = makeRes();
    await idx.approveOrder(customerReq({ token: 'tok-064', bookRevision: order.bookRevision }), approveRes);
    expect(approveRes.statusCode).toBe(200);
    expect(db._dump('AEV-064').status).toBe('approved');
  });
});

// (c) Feedback report doesn't touch status or block approval.
describe('(c) feedback report', () => {
  test('status unchanged, reports gets an entry, approve still works', async () => {
    setup({ 'AEV-064': baseOrder({ status: 'review_sent', bookRevision: 3 }) });

    const feedbackRes = makeRes();
    await idx.reportOrderIssue(customerReq({
      token: 'tok-064', message: 'Loving the layout so far!', reportType: 'feedback', bookRevision: 3,
    }), feedbackRes);
    expect(feedbackRes.statusCode).toBe(200);
    let order = db._dump('AEV-064');
    expect(order.status).toBe('review_sent'); // unchanged
    expect(order.reports).toHaveLength(1);
    expect(order.reports[0].type).toBe('feedback');
    expect(order.bookRevision).toBe(3); // feedback does not touch the revision

    const approveRes = makeRes();
    await idx.approveOrder(customerReq({ token: 'tok-064', bookRevision: 3 }), approveRes);
    expect(approveRes.statusCode).toBe(200);
  });
});

// (d) Two customer tabs racing on the same starting revision.
describe('(d) two customer tabs, same starting revision', () => {
  test('A saves, B (stale) is refused; A intact; B report also refused', async () => {
    setup({ 'AEV-064': baseOrder({ status: 'review_sent', bookRevision: 5 }) });

    const aSave = makeRes();
    await idx.saveOrderState(customerReq({
      token: 'tok-064', bookAssignments: { fromA: true }, bookRevision: 5,
    }), aSave);
    expect(aSave.statusCode).toBe(200);
    expect(db._dump('AEV-064').bookRevision).toBe(6);

    const bSave = makeRes();
    await idx.saveOrderState(customerReq({
      token: 'tok-064', bookAssignments: { fromB: true }, bookRevision: 5, // stale — A already moved it to 6
    }), bSave);
    expect(bSave.statusCode).toBe(409);
    expect(bSave.body.code).toBe('STALE');

    // A's edit is intact — B's never landed.
    expect(db._dump('AEV-064').customerBookAssignments).toEqual({ fromA: true });

    const bReport = makeRes();
    await idx.reportOrderIssue(customerReq({
      token: 'tok-064', message: 'something', reportType: 'blocking', bookRevision: 5,
    }), bReport);
    expect(bReport.statusCode).toBe(409);
    expect(bReport.body.code).toBe('STALE');
  });
});

// (e) A staff tab open since before a report tries to save with its old revision.
describe('(e) staff tab loaded before a report, saves after unlock with the old revision', () => {
  test('is refused 409 STALE', async () => {
    setup({ 'AEV-064': baseOrder({ status: 'review_sent', bookRevision: 1 }) });
    // Staff tab "loaded" here — remembers revision 1.
    const staffLoadedRevision = 1;

    const reportRes = makeRes();
    await idx.reportOrderIssue(customerReq({
      token: 'tok-064', message: 'fix this', reportType: 'blocking', bookRevision: 1,
    }), reportRes);
    expect(reportRes.statusCode).toBe(200);
    expect(db._dump('AEV-064').bookRevision).toBe(2); // moved on without the staff tab

    const staleStaffSave = makeRes();
    await idx.saveStaffState(staffReq({
      orderNumber: 'AEV-064', bookAssignments: {}, bookComplete: true, incompleteReasons: [],
      bookRevision: staffLoadedRevision,
    }), staleStaffSave);
    expect(staleStaffSave.statusCode).toBe(409);
    expect(staleStaffSave.body.code).toBe('STALE');
  });
});

// (f) An old customer tab tries to approve after a fix-and-resend moved the revision on.
describe('(f) old customer tab approves after a re-send', () => {
  test('409, nothing promoted', async () => {
    setup({ 'AEV-064': baseOrder({ status: 'review_sent', bookRevision: 1 }) });
    const oldTabRevision = 1;

    // A full report → fix → resend cycle moves the order on without this tab.
    await idx.reportOrderIssue(customerReq({
      token: 'tok-064', message: 'fix', reportType: 'blocking', bookRevision: 1,
    }), makeRes());
    let order = db._dump('AEV-064');
    await idx.saveStaffState(staffReq({
      orderNumber: 'AEV-064', bookAssignments: { fixed: true }, bookComplete: true, incompleteReasons: [],
      bookRevision: order.bookRevision,
    }), makeRes());
    order = db._dump('AEV-064');
    await idx.sendPreviewEmail(staffReq({ orderNumber: 'AEV-064', bookRevision: order.bookRevision }), makeRes());
    order = db._dump('AEV-064');
    expect(order.status).toBe('review_sent');
    const staffAssignmentsBeforeStaleApprove = order.staffBookAssignments;

    const staleApprove = makeRes();
    await idx.approveOrder(customerReq({
      token: 'tok-064', bookAssignments: { fromStaleTab: true }, bookRevision: oldTabRevision,
    }), staleApprove);
    expect(staleApprove.statusCode).toBe(409);
    expect(staleApprove.body.code).toBe('STALE');

    // Nothing promoted — status and staffBookAssignments untouched by the failed call.
    const after = db._dump('AEV-064');
    expect(after.status).toBe('review_sent');
    expect(after.staffBookAssignments).toEqual(staffAssignmentsBeforeStaleApprove);
  });
});

// (g) A plain resend (already review_sent) must not touch the revision or snapshot.
describe('(g) plain resend while review_sent', () => {
  test('no revision bump, no new sentVersion, customer tab still saves fine afterwards', async () => {
    setup({ 'AEV-064': baseOrder({ status: 'review_sent', bookRevision: 2, sendCount: 1 }) });
    // sentVersions/1 exists from the original send (seeded directly for this test).
    db._setOrder('AEV-064', db._dump('AEV-064')); // no-op, keeps intent explicit

    const customerSave = makeRes();
    await idx.saveOrderState(customerReq({ token: 'tok-064', bookAssignments: { a: 1 }, bookRevision: 2 }), customerSave);
    expect(customerSave.statusCode).toBe(200);
    let order = db._dump('AEV-064');
    expect(order.bookRevision).toBe(3);

    // Staff resends — a plain resend must not check OR bump the revision
    // (098a371's fix): pass a deliberately WRONG revision and it must still
    // succeed, and must not move the counter.
    const resendRes = makeRes();
    await idx.sendPreviewEmail(staffReq({ orderNumber: 'AEV-064', bookRevision: 999 }), resendRes);
    expect(resendRes.statusCode).toBe(200);
    order = db._dump('AEV-064');
    expect(order.bookRevision).toBe(3); // unchanged by the resend
    expect(order.sendCount).toBe(1);    // unchanged — no new version written
    expect(db._dumpSentVersions('AEV-064')['2']).toBeUndefined();

    // The customer's tab (still holding revision 3, from its own save above) can still save.
    const secondSave = makeRes();
    await idx.saveOrderState(customerReq({ token: 'tok-064', bookAssignments: { a: 2 }, bookRevision: 3 }), secondSave);
    expect(secondSave.statusCode).toBe(200);
  });
});

// (h) openIssueForFix (dashboard "Unlock for fix") + staff save refused while review_sent.
describe('(h) openIssueForFix unlock + staff locked while review_sent', () => {
  test('staff save refused; unlock refused with a stale revision; succeeds with the correct one', async () => {
    setup({ 'AEV-064': baseOrder({ status: 'review_sent', bookRevision: 2 }) });

    const staffSaveLocked = makeRes();
    await idx.saveStaffState(staffReq({
      orderNumber: 'AEV-064', bookAssignments: {}, bookComplete: true, incompleteReasons: [], bookRevision: 2,
    }), staffSaveLocked);
    expect(staffSaveLocked.statusCode).toBe(409);
    expect(staffSaveLocked.body.code).toBe('LOCKED');

    const staleUnlock = makeRes();
    await idx.openIssueForFix(staffReq({ orderNumber: 'AEV-064', note: 'emailed report', bookRevision: 1 }), staleUnlock);
    expect(staleUnlock.statusCode).toBe(409);
    expect(staleUnlock.body.code).toBe('STALE');
    expect(db._dump('AEV-064').status).toBe('review_sent'); // untouched

    const okUnlock = makeRes();
    await idx.openIssueForFix(staffReq({ orderNumber: 'AEV-064', note: 'emailed report', bookRevision: 2 }), okUnlock);
    expect(okUnlock.statusCode).toBe(200);
    const order = db._dump('AEV-064');
    expect(order.status).toBe('issue');
    expect(order.bookRevision).toBe(3);
    expect(order.staffBookComplete).toBe(false);
    expect(order.reports.some(r => r.type === 'blocking')).toBe(true);
  });
});

// (i) An order saved before bookRevision existed must still work — absent reads as 0.
describe('(i) old order with no bookRevision field', () => {
  test('send succeeds with a claimed revision of 0', async () => {
    const seed = baseOrder({ status: 'new' });
    delete seed.bookRevision; // baseOrder never set it, but make the intent explicit
    setup({ 'AEV-064': seed });
    expect(db._dump('AEV-064').bookRevision).toBeUndefined();

    const res = makeRes();
    await idx.sendPreviewEmail(staffReq({ orderNumber: 'AEV-064', bookRevision: 0 }), res);
    expect(res.statusCode).toBe(200);
    const order = db._dump('AEV-064');
    expect(order.status).toBe('review_sent');
    expect(order.bookRevision).toBe(1);
  });
});

// (j) approve is refused from every status except review_sent.
describe('(j) approve refused outside review_sent', () => {
  test.each(['new', 'sent_to_print', 'issue'])('status=%s', async (status) => {
    setup({ 'AEV-064': baseOrder({ status, bookRevision: 0 }) });
    const res = makeRes();
    await idx.approveOrder(customerReq({ token: 'tok-064', bookRevision: 0 }), res);
    expect(res.statusCode).toBe(409);
  });
});
