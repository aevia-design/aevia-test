// TO-DOS #89, piece 2 — tests the SHIPPED confirmUpload handler, with its
// dependencies mocked.
//
// Why this file exists: tests/chunk-4-order-flow.test.js calls its own
// mockTransporter and asserts on its own calls. It never imports functions/upload.js,
// so it stays green whatever the real handler does — and it still describes the
// OLD flow, where the staff email was sent from createUploadSession. That is the
// exact failure LEARNINGS.md records from S154: 281 tests green, a crash on the rig.
//
// These tests require('../functions/upload') and drive the exported handler, so a
// pass here is a statement about what actually ships.

const mockSentMail = [];
let mockTransactionResult = true;   // whether this caller wins the confirmation claim
let mockOrderDoc;

// cors and the Google libraries live in functions/node_modules, not the repo
// root where jest resolves from — hence virtual mocks.
jest.mock('cors', () => () => (req, res, next) => next(), { virtual: true });

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn(() => ({ bucket: jest.fn() })),
}), { virtual: true });

jest.mock('../functions/email', () => ({
  createTransporter: () => ({
    sendMail: jest.fn((opts) => {
      mockSentMail.push(opts);
      if (opts.to === 'boom@test.com') return Promise.reject(new Error('SMTP down'));
      return Promise.resolve({});
    }),
  }),
  FROM: { customer: { from: 'customer@aevia.at' }, orders: { from: 'orders@aevia.at' } },
  renderEmail: (html) => html,
}));

const mockUpdateCalls = [];

jest.mock('firebase-admin', () => {
  const docRef = {
    get: jest.fn(() => Promise.resolve({ exists: true, data: () => mockOrderDoc })),
    update: jest.fn((patch) => { mockUpdateCalls.push(patch); return Promise.resolve(); }),
  };
  return {
    firestore: Object.assign(
      () => ({
        collection: () => ({ doc: () => docRef }),
        runTransaction: (fn) => fn({
          get: () => Promise.resolve({ exists: true, data: () => mockOrderDoc }),
          update: (ref, patch) => { mockUpdateCalls.push(patch); },
        }).then(() => mockTransactionResult),
      }),
      {
        FieldValue: { serverTimestamp: () => 'TS', arrayUnion: (...a) => a },
        Timestamp: { now: () => 'NOW' },
      },
    ),
  };
}, { virtual: true });

const { confirmUploadHandler } = require('../functions/upload');

const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.set = jest.fn(() => res);
  res.send = jest.fn(() => res);
  return res;
};

describe('confirmUpload — email behaviour (the shipped handler)', () => {
  beforeEach(() => {
    mockSentMail.length = 0;
    mockUpdateCalls.length = 0;
    mockTransactionResult = true;
    process.env.EMAIL_NOTIFY = 'staff@aevia.at';
    mockOrderDoc = {
      orderNumber: 'AEV-200',
      token: 'good-token',
      uploadComplete: false,
      customerName: 'Anna',
      email: 'anna@test.com',
      templateName: 'Scribble',
      pageCount: '40',
      fileCount: 42,
      folderName: 'AEV-200',
      folderLink: 'https://console.cloud.google.com/x',
      price: '70',
    };
  });

  test('sends BOTH the customer confirmation and the staff New Order email', async () => {
    const res = makeRes();
    await confirmUploadHandler({ method: 'POST', headers: {}, body: { orderNumber: 'AEV-200', token: 'good-token' } }, res);

    const recipients = mockSentMail.map(m => m.to).sort();
    expect(recipients).toEqual(['anna@test.com', 'staff@aevia.at']);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('the staff email carries the order number and photo count', async () => {
    const res = makeRes();
    await confirmUploadHandler({ method: 'POST', headers: {}, body: { orderNumber: 'AEV-200', token: 'good-token' } }, res);

    const staff = mockSentMail.find(m => m.to === 'staff@aevia.at');
    expect(staff.subject).toContain('AEV-200');
    expect(staff.subject).toContain('Scribble');
    expect(staff.html).toContain('42');          // fileCount, read from the order doc
    expect(staff.html).toContain('AEV-200');
  });

  test('a customer email failure does NOT suppress the staff email', async () => {
    // The failure this guards: with the staff mail moved here, an unhandled throw
    // on the customer send used to mean nobody was notified at all.
    mockOrderDoc.email = 'boom@test.com';
    const res = makeRes();
    await confirmUploadHandler({ method: 'POST', headers: {}, body: { orderNumber: 'AEV-200', token: 'good-token' } }, res);

    expect(mockSentMail.map(m => m.to)).toContain('staff@aevia.at');
    expect(res.status).toHaveBeenCalledWith(200);   // the order IS confirmed
  });

  test('records the customer failure rather than swallowing it', async () => {
    mockOrderDoc.email = 'boom@test.com';
    await confirmUploadHandler({ method: 'POST', headers: {}, body: { orderNumber: 'AEV-200', token: 'good-token' } }, makeRes());

    const audit = mockUpdateCalls.find(p => 'customerEmailError' in p);
    expect(audit.customerEmailError).toContain('SMTP down');
    expect(audit.staffEmailError).toBeNull();
  });

  test('a caller that loses the transaction sends nothing', async () => {
    // Two concurrent calls — a Retry racing a slow first call — must not both mail.
    mockTransactionResult = false;
    const res = makeRes();
    await confirmUploadHandler({ method: 'POST', headers: {}, body: { orderNumber: 'AEV-200', token: 'good-token' } }, res);

    expect(mockSentMail).toHaveLength(0);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('an already-complete order returns 200 and sends nothing', async () => {
    mockOrderDoc.uploadComplete = true;
    const res = makeRes();
    await confirmUploadHandler({ method: 'POST', headers: {}, body: { orderNumber: 'AEV-200', token: 'good-token' } }, res);

    expect(mockSentMail).toHaveLength(0);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('a bad token is rejected before anything is sent', async () => {
    const res = makeRes();
    await confirmUploadHandler({ method: 'POST', headers: {}, body: { orderNumber: 'AEV-200', token: 'wrong' } }, res);

    expect(mockSentMail).toHaveLength(0);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
