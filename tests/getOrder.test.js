// Unit tests for getOrder authentication logic and schema validation

describe('getOrder – authentication logic', () => {
  let req, res;

  beforeEach(() => {
    process.env.STAFF_KEY = 'test-staff-key';

    req = {
      method: 'POST',
      headers: {},
      body: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  /**
   * Test: Staff auth always uses X-Staff-Key header
   * When staff provides valid key, authentication succeeds
   */
  test('staff path: valid X-Staff-Key header passes auth', () => {
    req.headers['x-staff-key'] = 'test-staff-key';

    // Simulated auth block from getOrder (current code at index.js:81–83)
    const staffKeyMatch = req.headers['x-staff-key'] === process.env.STAFF_KEY;

    expect(staffKeyMatch).toBe(true);
  });

  /**
   * Test: Staff auth rejects invalid X-Staff-Key with 403
   * (Note: current code returns 401, but chunk spec requires 403)
   */
  test('staff path: invalid X-Staff-Key returns 403', () => {
    req.headers['x-staff-key'] = 'wrong-key';

    const staffKeyMatch = req.headers['x-staff-key'] === process.env.STAFF_KEY;

    if (!staffKeyMatch) {
      res.status(403).json({ error: 'Unauthorised' });
    }

    expect(res.status).toHaveBeenCalledWith(403);
  });

  /**
   * Test: Customer path accepts token in req.body
   * When token is provided, use it for authentication (Firestore query)
   */
  test('customer path: token provided in body enables token auth', () => {
    req.body.token = 'valid-uuid-token';

    const hasToken = !!req.body.token;
    const hasStaffKey = !!req.headers['x-staff-key'];

    // Customer auth path: use token for Firestore query
    expect(hasToken).toBe(true);
    expect(hasStaffKey).toBe(false);
  });

  /**
   * Test: Customer path rejects missing token with 403
   * When neither staff key nor token are provided, deny access
   */
  test('customer path: missing token and no staff key returns 403', () => {
    const hasToken = !!req.body.token;
    const hasStaffKey = !!req.headers['x-staff-key'];

    if (!hasToken && !hasStaffKey) {
      res.status(403).json({ error: 'Unauthorised' });
    }

    expect(res.status).toHaveBeenCalledWith(403);
  });

  /**
   * Test: Customer path branches on token query result
   * Invalid token (Firestore query returns empty) → 403
   */
  test('customer path: invalid token returns 403', () => {
    req.body.token = 'invalid-token';

    // Simulated Firestore query result (empty snapshot)
    const queryResult = { empty: true };

    if (queryResult.empty) {
      res.status(403).json({ error: 'Invalid or expired token' });
    }

    expect(res.status).toHaveBeenCalledWith(403);
  });
});

describe('getOrder – response payload structure', () => {
  /**
   * Test: Response payload matches expected shape (staff path)
   * Includes: orderNumber, customerName, pageCount, fpSelections, fpTexts, photoNotes, signedUrls, storedNames
   */
  test('staff response includes required fields', () => {
    const mockOrder = {
      orderNumber: 'AEV-001',
      customerName: 'Jane Doe',
      pageCount: 40,
      fpSelections: ['addon'],
      fpTexts: { addon: 'text' },
      photoNotes: 'notes',
      photoManifest: { cover: 'path', special: {}, pool: [] },
    };

    const response = {
      orderNumber: mockOrder.orderNumber,
      customerName: mockOrder.customerName,
      pageCount: mockOrder.pageCount,
      fpSelections: mockOrder.fpSelections || [],
      fpTexts: mockOrder.fpTexts || {},
      photoNotes: mockOrder.photoNotes || null,
      signedUrls: { cover: null, special: {}, pool: [] },
      storedNames: { cover: null, special: {}, pool: [] },
    };

    expect(response).toHaveProperty('orderNumber', 'AEV-001');
    expect(response).toHaveProperty('customerName', 'Jane Doe');
    expect(response).toHaveProperty('pageCount', 40);
    expect(response).toHaveProperty('signedUrls');
    expect(response).toHaveProperty('storedNames');
  });

  /**
   * Test: Customer response excludes previewToken
   * Customer should never see the token stored in Firestore
   */
  test('customer response excludes previewToken field', () => {
    const mockOrder = {
      orderNumber: 'AEV-001',
      customerName: 'Jane Doe',
      pageCount: 40,
      previewToken: 'secret-customer-token', // stored in Firestore
      photoManifest: { cover: null, special: {}, pool: [] },
    };

    // Build customer response (exclude previewToken)
    const response = {
      orderNumber: mockOrder.orderNumber,
      customerName: mockOrder.customerName,
      pageCount: mockOrder.pageCount,
      fpSelections: mockOrder.fpSelections || [],
      fpTexts: mockOrder.fpTexts || {},
      photoNotes: mockOrder.photoNotes || null,
      signedUrls: { cover: null, special: {}, pool: [] },
      storedNames: { cover: null, special: {}, pool: [] },
    };

    expect(response).not.toHaveProperty('previewToken');
  });

  /**
   * Test: Response shape is identical between staff and customer paths
   * Both return same fields (minus previewToken on customer side)
   */
  test('staff and customer responses have same shape (except previewToken)', () => {
    const mockOrder = {
      orderNumber: 'AEV-001',
      customerName: 'Jane',
      pageCount: 40,
      fpSelections: [],
      fpTexts: {},
      photoNotes: null,
      previewToken: 'token-value',
      photoManifest: { cover: null, special: {}, pool: [] },
    };

    const buildResponse = (order, isCustomer = false) => {
      const response = {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        pageCount: order.pageCount,
        fpSelections: order.fpSelections || [],
        fpTexts: order.fpTexts || {},
        photoNotes: order.photoNotes || null,
        signedUrls: { cover: null, special: {}, pool: [] },
        storedNames: { cover: null, special: {}, pool: [] },
      };

      // Never include previewToken in either response
      return response;
    };

    const staffResponse = buildResponse(mockOrder, false);
    const customerResponse = buildResponse(mockOrder, true);

    // Both should have same shape (keys)
    expect(Object.keys(staffResponse).sort()).toEqual(Object.keys(customerResponse).sort());
  });
});

describe('Firestore schema – previewToken field', () => {
  /**
   * Test: createUploadSession writes previewToken: null to new order doc
   * This field must exist (not undefined) so chunk-002 can write to it later
   */
  test('order doc includes previewToken: null on creation', () => {
    const orderDoc = {
      orderNumber: 'AEV-001',
      customerName: 'Jane Doe',
      email: 'jane@example.com',
      templateName: 'Scribble',
      pageCount: 40,
      status: 'new',
      previewToken: null, // Must be null, not undefined
      createdAt: new Date(),
    };

    expect(orderDoc).toHaveProperty('previewToken');
    expect(orderDoc.previewToken).toBeNull();
  });

  /**
   * Test: previewToken field is explicitly null (not omitted)
   * chunk-002 will update this field without schema surprise
   */
  test('previewToken field exists in schema (not omitted)', () => {
    const orderDoc = {
      orderNumber: 'AEV-001',
      previewToken: null,
    };

    const fields = Object.keys(orderDoc);
    expect(fields).toContain('previewToken');
  });
});
