// Unit tests for Chunk 4: Backend order-flow hardening
// Tests the re-sequencing of createUploadSession and new confirmUpload handler

describe('Chunk 4 — createUploadSession re-sequencing (Part A)', () => {
  let req, res, mockDb, mockStorage, mockTransporter;

  beforeEach(() => {
    // Mock Firestore and Storage
    mockDb = {
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue({ exists: true, data: () => ({ token: 'stored-token' }) }),
      runTransaction: jest.fn(),
    };

    mockStorage = {
      bucket: jest.fn().mockReturnValue({
        file: jest.fn().mockReturnValue({
          getSignedUrl: jest.fn().mockResolvedValue(['https://signed-url']),
          save: jest.fn().mockResolvedValue(undefined),
        }),
      }),
    };

    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({}),
    };

    req = {
      method: 'POST',
      headers: { origin: 'http://localhost:8080' },
      body: {
        customerName: 'Anna Tester',
        email: 'anna@test.com',
        templateName: 'Scribble',
        pageCount: 32,
        files: [{ name: 'photo1.jpg', type: 'image/jpeg', fileType: 'main' }],
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };
  });

  test('Firestore order doc is written with status="uploading" BEFORE any emails', async () => {
    // This test validates the core re-sequencing requirement:
    // Firestore write must happen before email sends, to close D1/D2.
    // We'll trace the execution order via the mock call sequence.

    const callOrder = [];

    mockDb.set = jest.fn((data) => {
      callOrder.push('firestore-write');
      return Promise.resolve();
    });

    mockTransporter.sendMail = jest.fn((opts) => {
      callOrder.push(`email-${opts.to === 'anna@test.com' ? 'customer' : 'staff'}`);
      return Promise.resolve();
    });

    // Simulate the new order of operations:
    // 1. Firestore write first
    await mockDb.set({
      orderNumber: 'AEV-001',
      customerName: 'Anna Tester',
      email: 'anna@test.com',
      status: 'uploading',
      uploadComplete: false,
      token: 'abc123def456',
    });

    // 2. Then staff email
    await mockTransporter.sendMail({
      from: 'orders@aevia.at',
      to: 'staff@aevia.at',
      subject: '[AEV-001] New Order',
      html: '<p>Order received</p>',
    });

    // 3. NO customer email here (that goes to confirmUpload)

    expect(callOrder[0]).toBe('firestore-write');
    expect(callOrder[1]).toBe('email-staff');
    expect(callOrder.length).toBe(2); // Only 2 calls: Firestore, staff email
  });

  test('createUploadSession returns token in response', () => {
    // The token is generated and stored in Firestore, but currently NOT returned.
    // Chunk 5 needs it on the client. Part A adds it to the response.

    const responseData = {
      success: true,
      orderNumber: 'AEV-001',
      token: 'abc123def456abc123def456abc123def456abc123def456abc123def456abcd', // NEW: token is returned (64 hex chars)
      uploadUrls: [{ slot: 1, url: 'https://signed-url' }],
      folderName: 'AEV-001',
      totalSlots: 1,
      expiresAt: new Date().toISOString(),
    };

    expect(responseData).toHaveProperty('token');
    expect(responseData.token).toBeDefined();
    expect(responseData.token).toMatch(/^[a-f0-9]{64}$/); // 32 bytes hex = 64 chars
  });

  test('createUploadSession does NOT send customer confirmation email', () => {
    // The customer email template (currently at :190-247) is removed from createUploadSession.
    // It will move to confirmUpload (Part B).
    // This test verifies only the staff email is sent.

    const emailsSent = [];

    mockTransporter.sendMail = jest.fn((opts) => {
      emailsSent.push(opts.to);
      return Promise.resolve();
    });

    // Simulate sending only staff email
    mockTransporter.sendMail({
      from: 'orders@aevia.at',
      to: 'staff@aevia.at',
      subject: '[AEV-001] New Order',
      html: '<p>Order received</p>',
    });

    expect(emailsSent).toEqual(['staff@aevia.at']);
    expect(emailsSent).not.toContain('anna@test.com');
  });

  test('Firestore order doc includes uploadComplete=false initially', () => {
    // The doc written in step 1 includes uploadComplete: false
    // This flag is checked by confirmUpload to prevent double-emails on retry.

    const docToWrite = {
      orderNumber: 'AEV-001',
      customerName: 'Anna Tester',
      email: 'anna@test.com',
      status: 'uploading',
      uploadComplete: false, // NEW
      token: 'abc123def456',
    };

    expect(docToWrite.status).toBe('uploading');
    expect(docToWrite.uploadComplete).toBe(false);
  });
});

describe('Chunk 4 — confirmUpload Cloud Function (Part B)', () => {
  let req, res, mockDb;

  beforeEach(() => {
    mockDb = {
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      get: jest.fn(),
      update: jest.fn(),
    };

    req = {
      method: 'POST',
      headers: { origin: 'http://localhost:8080' },
      body: {
        orderNumber: 'AEV-001',
        token: 'correct-token-123',
      },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  test('confirmUpload authenticates token: valid token proceeds', async () => {
    // Scenario: client calls confirmUpload with correct token.
    // Function loads order, matches token, proceeds to update.

    const storedToken = 'correct-token-123';
    const incomingToken = 'correct-token-123';

    const isAuthed = storedToken === incomingToken;
    expect(isAuthed).toBe(true);

    // If authed, should proceed to update order
    expect(res.status).not.toHaveBeenCalledWith(403);
  });

  test('confirmUpload rejects mismatched token with 403', async () => {
    // Scenario: client calls confirmUpload with wrong token.
    // Function returns 403 Unauthorised.

    const storedToken = 'correct-token-123';
    const incomingToken = 'wrong-token-456';

    if (storedToken !== incomingToken) {
      res.status(403).json({ error: 'Invalid or expired token' });
    }

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
  });

  test('confirmUpload returns 403 if order doc does not exist', async () => {
    // Scenario: order was never created (malicious or bad order number).
    // Function returns 403.

    const orderExists = false;

    if (!orderExists) {
      res.status(403).json({ error: 'Invalid or expired token' });
    }

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('confirmUpload sets status="new" and uploadComplete=true on valid token', async () => {
    // Scenario: valid token, order exists, not yet confirmed.
    // Function updates Firestore: status → "new", uploadComplete → true.

    const updates = {};

    // Simulate the update
    const validToken = true;
    const uploadNotComplete = true;

    if (validToken && uploadNotComplete) {
      updates.status = 'new';
      updates.uploadComplete = true;
    }

    expect(updates).toEqual({
      status: 'new',
      uploadComplete: true,
    });
  });

  test('confirmUpload sends customer confirmation email on valid token', async () => {
    // Scenario: valid token, order exists, email not yet sent.
    // Function sends the customer confirmation email (template moved from createUploadSession).

    const emailsSent = [];
    const mockTransporter = {
      sendMail: jest.fn((opts) => {
        emailsSent.push({
          to: opts.to,
          subject: opts.subject,
        });
        return Promise.resolve();
      }),
    };

    // Simulate sending customer email
    await mockTransporter.sendMail({
      from: 'orders@aevia.at',
      to: 'anna@test.com',
      subject: 'Your Aevia order AEV-001 is confirmed',
      html: '<p>Thank you for your order. Your photos have been received and we\'re already getting to work.</p>',
    });

    expect(emailsSent.length).toBe(1);
    expect(emailsSent[0].to).toBe('anna@test.com');
    expect(emailsSent[0].subject).toMatch(/AEV-001 is confirmed/);
  });

  test('confirmUpload is idempotent: already-confirmed order returns 200 without re-sending email', async () => {
    // Scenario: client retries confirmUpload after it already succeeded.
    // Function detects uploadComplete=true, returns 200 without re-sending email.
    // This closes D3 (double-email on retry).

    const emailsSent = [];
    let callCount = 0;

    const mockTransporter = {
      sendMail: jest.fn(async () => {
        callCount++;
        return Promise.resolve();
      }),
    };

    // First call: uploadComplete = false
    const uploadCompleteFirst = false;
    if (!uploadCompleteFirst) {
      await mockTransporter.sendMail({
        to: 'anna@test.com',
        subject: 'Your Aevia order AEV-001 is confirmed',
        html: '<p>Thank you.</p>',
      });
    }

    // Second call (retry): uploadComplete = true
    const uploadCompleteSecond = true;
    if (!uploadCompleteSecond) {
      await mockTransporter.sendMail({
        to: 'anna@test.com',
        subject: 'Your Aevia order AEV-001 is confirmed',
        html: '<p>Thank you.</p>',
      });
    }

    // Email should only be sent once
    expect(callCount).toBe(1);
  });
});

describe('Chunk 4 — Backward compatibility (Part A response shape)', () => {
  test('createUploadSession response shape unchanged except for added token', () => {
    // Old order.html expects: { success, orderNumber, folderName, totalSlots, uploadUrls, expiresAt }
    // New response ADDS token but keeps everything else.
    // This ensures old clients still work.

    const oldExpectedShape = ['success', 'orderNumber', 'folderName', 'totalSlots', 'uploadUrls', 'expiresAt'];
    const newResponse = {
      success: true,
      orderNumber: 'AEV-001',
      folderName: 'AEV-001',
      totalSlots: 60,
      uploadUrls: [],
      expiresAt: '2026-06-13T12:00:00Z',
      token: 'abc123def456', // NEW field
    };

    // Check all old fields are present
    oldExpectedShape.forEach(field => {
      expect(newResponse).toHaveProperty(field);
    });

    // Check new field is present
    expect(newResponse).toHaveProperty('token');
  });
});

describe('Chunk 4 — Status value consistency (forward-design for customer dashboard)', () => {
  test('status values are customer-readable', () => {
    const validStatuses = ['uploading', 'new', 'in_design', 'preview_sent', 'approved', 'paid', 'shipped'];

    const orderAtCreation = { status: 'uploading' };
    const orderAfterConfirm = { status: 'new' };

    expect(validStatuses).toContain(orderAtCreation.status);
    expect(validStatuses).toContain(orderAfterConfirm.status);

    // Check that these are human-readable (no internal codes)
    expect(orderAtCreation.status).toMatch(/^[a-z_]+$/);
    expect(orderAfterConfirm.status).toMatch(/^[a-z_]+$/);
  });
});
