// Unit tests for functions/printsmarter.js — the Printsmarter API client.
//
// Everything here runs against the documented API examples
// (docs/briefs/printsmarter-api.md) — no network, no Firebase. The module is
// deliberately pure so these tests cover the whole payload contract.

const {
  printsmarterConfig,
  buildOrderPayload,
  parseAddOrderResponse,
  submitOrder,
  PRICE_BY_PAGE_COUNT,
} = require('../functions/printsmarter');

// A config as it would come from functions/.env once everything is filled in.
function fullEnv(overrides = {}) {
  return {
    PRINTSMARTER_API_TOKEN: 'test-token',
    PRINTSMARTER_CUSTOMER_ID: '3983',
    PRINTSMARTER_API_BASE: 'https://www.printsmarter.de/index.php?route=api/custom_shop_webhook/',
    PRINTSMARTER_PRODUCT_ID: 'aevia_hardcover_200',
    PRINTSMARTER_LIVE: 'false',
    ...overrides,
  };
}

// An order document as the Stripe webhook leaves it (see functions/index.js).
function paidOrder(overrides = {}) {
  return {
    orderNumber: 'AEV-052',
    status: 'paid',
    pageCount: 40,
    customerName: 'Max Mustermann',
    email: 'max@example.com',
    shippingAddress: {
      line1: 'Beispielgasse 1',
      line2: 'Tür 4',
      city: 'Wien',
      postal_code: '1010',
      country: 'AT',
    },
    ...overrides,
  };
}

const files = {
  cover: 'https://storage.example/print_cover.pdf?sig=abc',
  content: 'https://storage.example/print_inside.pdf?sig=def',
};

describe('printsmarterConfig — env validation', () => {
  test('reads a complete env', () => {
    const cfg = printsmarterConfig(fullEnv());
    expect(cfg.customerId).toBe('3983');
    expect(cfg.productId).toBe('aevia_hardcover_200');
    expect(cfg.live).toBe(false);
  });

  test('throws loudly when PRINTSMARTER_PRODUCT_ID is unset (brief: fail loudly, no silent default)', () => {
    const env = fullEnv();
    delete env.PRINTSMARTER_PRODUCT_ID;
    expect(() => printsmarterConfig(env)).toThrow(/PRINTSMARTER_PRODUCT_ID/);
  });

  test('throws when the token is missing', () => {
    const env = fullEnv();
    delete env.PRINTSMARTER_API_TOKEN;
    expect(() => printsmarterConfig(env)).toThrow(/PRINTSMARTER_API_TOKEN/);
  });

  test('live is true ONLY for the exact string "true"', () => {
    expect(printsmarterConfig(fullEnv({ PRINTSMARTER_LIVE: 'true' })).live).toBe(true);
    expect(printsmarterConfig(fullEnv({ PRINTSMARTER_LIVE: 'TRUE' })).live).toBe(false);
    expect(printsmarterConfig(fullEnv({ PRINTSMARTER_LIVE: '1' })).live).toBe(false);
    const env = fullEnv();
    delete env.PRINTSMARTER_LIVE;
    expect(printsmarterConfig(env).live).toBe(false);
  });
});

describe('buildOrderPayload — maps an Aevia order onto add_Order', () => {
  const cfg = printsmarterConfig(fullEnv());

  test('produces the documented top-level shape', () => {
    const p = buildOrderPayload(paidOrder(), files, cfg);
    expect(p.customer_id).toBe('3983');
    expect(p.order_id_client).toBe('AEV-052');
    expect(p.currency).toBe('EUR');
    expect(p.products).toHaveLength(1);
  });

  test('book product carries pages, both file URLs and our product id', () => {
    const [book] = buildOrderPayload(paidOrder(), files, cfg).products;
    expect(book.product_id).toBe('aevia_hardcover_200');
    expect(book.product_id_client).toBe('AEV-052-1');
    expect(book.quantity).toBe(1);
    expect(book.pages).toBe(40);
    expect(book.file_cover).toBe(files.cover);
    expect(book.file_content).toBe(files.content);
  });

  test('price is what the customer paid: €70 at 40pp, €100 at 80pp (decided S155)', () => {
    expect(buildOrderPayload(paidOrder(), files, cfg).products[0].price).toBe('70.00');
    expect(buildOrderPayload(paidOrder({ pageCount: 80 }), files, cfg).products[0].price).toBe('100.00');
    expect(PRICE_BY_PAGE_COUNT).toEqual({ 40: 70, 80: 100 });
  });

  test('rejects a page count we do not sell rather than guessing a price', () => {
    expect(() => buildOrderPayload(paidOrder({ pageCount: 60 }), files, cfg)).toThrow(/pageCount/);
    expect(() => buildOrderPayload(paidOrder({ pageCount: undefined }), files, cfg)).toThrow(/pageCount/);
  });

  test('maps the Stripe address shape onto their fields', () => {
    const a = buildOrderPayload(paidOrder(), files, cfg).shipping_address;
    expect(a).toEqual({
      first_name: 'Max',
      last_name: 'Mustermann',
      company: '',
      address1: 'Beispielgasse 1',
      address2: 'Tür 4',
      city: 'Wien',
      zip: '1010',
      country_code: 'AT',
      country: 'Austria',
      email: 'max@example.com',
    });
  });

  test('single-word customer name goes to last_name', () => {
    const a = buildOrderPayload(paidOrder({ customerName: 'Madonna' }), files, cfg).shipping_address;
    expect(a.first_name).toBe('');
    expect(a.last_name).toBe('Madonna');
  });

  test('unknown country code still sends the code rather than failing', () => {
    const a = buildOrderPayload(
      paidOrder({ shippingAddress: { ...paidOrder().shippingAddress, country: 'FR' } }),
      files, cfg
    ).shipping_address;
    expect(a.country_code).toBe('FR');
    expect(a.country).toBe('FR'); // no name table entry — code is better than a wrong guess
  });

  test('refuses to build without a shipping address', () => {
    expect(() => buildOrderPayload(paidOrder({ shippingAddress: null }), files, cfg)).toThrow(/shippingAddress/);
  });

  test('refuses to build without both file URLs', () => {
    expect(() => buildOrderPayload(paidOrder(), { cover: files.cover }, cfg)).toThrow(/content/);
    expect(() => buildOrderPayload(paidOrder(), { content: files.content }, cfg)).toThrow(/cover/);
  });

  test('no return_address until the open question is answered — never their example address', () => {
    // Their docs example uses an Elanders address; sending it would route failed
    // deliveries to the wrong company. Omit the field until the contract answers it.
    const p = buildOrderPayload(paidOrder(), files, cfg);
    expect(p.return_address).toBeUndefined();
  });
});

describe('submitOrder — the only function that touches the network', () => {
  const payload = buildOrderPayload(paidOrder(), files, printsmarterConfig(fullEnv()));

  test('KILL-SWITCH: refuses to call out when live=false, and never invokes fetch', async () => {
    const fetchSpy = jest.fn();
    const cfg = printsmarterConfig(fullEnv()); // PRINTSMARTER_LIVE=false
    await expect(submitOrder(payload, cfg, fetchSpy)).rejects.toThrow(/PRINTSMARTER_LIVE/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test('when live, POSTs to add_Order with the Access-Token header', async () => {
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: { status: true, message: 'Order created.', order_id: 95583 } }),
    });
    const cfg = printsmarterConfig(fullEnv({ PRINTSMARTER_LIVE: 'true' }));

    const result = await submitOrder(payload, cfg, fetchSpy);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe(cfg.base + 'add_Order');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Access-Token']).toBe('test-token');
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(opts.body).order_id_client).toBe('AEV-052');
    expect(result.printsmarterOrderId).toBe(95583);
  });

  test('a non-success response surfaces as an error, not a fake order id', async () => {
    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: { message: 'Invalid product' } }),
    });
    const cfg = printsmarterConfig(fullEnv({ PRINTSMARTER_LIVE: 'true' }));
    await expect(submitOrder(payload, cfg, fetchSpy)).rejects.toThrow(/Invalid product/);
  });

  test('an HTTP failure surfaces with the status code', async () => {
    const fetchSpy = jest.fn().mockResolvedValue({ ok: false, status: 403, text: async () => 'Forbidden' });
    const cfg = printsmarterConfig(fullEnv({ PRINTSMARTER_LIVE: 'true' }));
    await expect(submitOrder(payload, cfg, fetchSpy)).rejects.toThrow(/403/);
  });
});

describe('parseAddOrderResponse — their documented response shapes', () => {
  test('success shape yields the Printsmarter order id', () => {
    const r = parseAddOrderResponse({ success: { status: true, message: 'Order created.', order_id: 95583 } });
    expect(r).toEqual({ printsmarterOrderId: 95583, message: 'Order created.' });
  });

  test('missing order_id is an error even if status says true — we must store their id', () => {
    expect(() => parseAddOrderResponse({ success: { status: true, message: 'ok' } })).toThrow(/order_id/);
  });

  test('anything else throws with whatever message they gave', () => {
    expect(() => parseAddOrderResponse({ error: { message: 'kaputt' } })).toThrow(/kaputt/);
    expect(() => parseAddOrderResponse({})).toThrow();
  });
});
