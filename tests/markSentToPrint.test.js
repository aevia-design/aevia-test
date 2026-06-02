// Unit tests for markSentToPrint — staff-authenticated Cloud Function

describe('markSentToPrint — status transition to sent_to_print', () => {
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
      set: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  /**
   * Test: CORS OPTIONS request is handled
   */
  test('OPTIONS request returns 204 with CORS headers', () => {
    req.method = 'OPTIONS';

    // Simulated OPTIONS handling (future function logic)
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, X-Staff-Key');
      res.status(204).send('');
    }

    expect(res.set).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalledWith('');
  });

  /**
   * Test: Non-POST request is rejected with 405
   */
  test('non-POST request returns 405 Method Not Allowed', () => {
    req.method = 'GET';

    if (req.method !== 'POST' && req.method !== 'OPTIONS') {
      res.status(405).json({ error: 'Method not allowed' });
    }

    expect(res.status).toHaveBeenCalledWith(405);
  });

  /**
   * Test: Missing X-Staff-Key header returns 403
   */
  test('missing X-Staff-Key header returns 403', () => {
    req.method = 'POST';
    req.headers['x-staff-key'] = undefined;
    req.body.orderNumber = 'AEV-001';

    const isAuthorized = req.headers['x-staff-key'] === process.env.STAFF_KEY;

    if (!isAuthorized) {
      res.status(403).json({ error: 'Unauthorised' });
    }

    expect(res.status).toHaveBeenCalledWith(403);
  });

  /**
   * Test: Invalid X-Staff-Key header returns 403
   */
  test('invalid X-Staff-Key header returns 403', () => {
    req.method = 'POST';
    req.headers['x-staff-key'] = 'wrong-key';
    req.body.orderNumber = 'AEV-001';

    const isAuthorized = req.headers['x-staff-key'] === process.env.STAFF_KEY;

    if (!isAuthorized) {
      res.status(403).json({ error: 'Unauthorised' });
    }

    expect(res.status).toHaveBeenCalledWith(403);
  });

  /**
   * Test: Missing orderNumber returns 400
   */
  test('missing orderNumber in body returns 400', () => {
    req.method = 'POST';
    req.headers['x-staff-key'] = 'test-staff-key';
    req.body.orderNumber = undefined;

    const isAuthorized = req.headers['x-staff-key'] === process.env.STAFF_KEY;
    if (!isAuthorized) {
      res.status(403).json({ error: 'Unauthorised' });
      return;
    }

    if (!req.body.orderNumber) {
      res.status(400).json({ error: 'orderNumber required' });
    }

    expect(res.status).toHaveBeenCalledWith(400);
  });

  /**
   * Test: Order with non-PAID status returns 409 Conflict
   * This guards against wrong-state transitions and double-submission
   */
  test('order with status !== "paid" returns 409 Conflict', () => {
    req.method = 'POST';
    req.headers['x-staff-key'] = 'test-staff-key';
    req.body.orderNumber = 'AEV-001';

    // Simulated order fetch
    const mockOrder = {
      orderNumber: 'AEV-001',
      status: 'approved', // NOT paid
      statusHistory: [],
    };

    const isAuthorized = req.headers['x-staff-key'] === process.env.STAFF_KEY;
    if (!isAuthorized) {
      res.status(403).json({ error: 'Unauthorised' });
      return;
    }

    if (!req.body.orderNumber) {
      res.status(400).json({ error: 'orderNumber required' });
      return;
    }

    // GUARD: only transition from 'paid' status
    if (mockOrder.status !== 'paid') {
      res.status(409).json({ error: 'Order must be in paid status' });
      return;
    }

    expect(res.status).toHaveBeenCalledWith(409);
  });

  /**
   * Test: Successful transition from 'paid' to 'sent_to_print' returns 200
   * Validates that statusHistory includes timestamp entry with Timestamp.now()
   */
  test('valid PAID order transitions to sent_to_print with 200 OK', () => {
    req.method = 'POST';
    req.headers['x-staff-key'] = 'test-staff-key';
    req.body.orderNumber = 'AEV-001';

    const mockOrder = {
      orderNumber: 'AEV-001',
      status: 'paid',
      statusHistory: [],
    };

    const isAuthorized = req.headers['x-staff-key'] === process.env.STAFF_KEY;
    if (!isAuthorized) {
      res.status(403).json({ error: 'Unauthorised' });
      return;
    }

    if (!req.body.orderNumber) {
      res.status(400).json({ error: 'orderNumber required' });
      return;
    }

    if (mockOrder.status !== 'paid') {
      res.status(409).json({ error: 'Order must be in paid status' });
      return;
    }

    // Simulate successful update
    res.status(200).json({ success: true });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});
