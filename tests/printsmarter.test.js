// Unit tests for functions/printsmarter.js — the Printsmarter API client.
//
// Everything here runs against the documented API examples
// (docs/briefs/printsmarter-api.md) — no network, no Firebase. The module is
// deliberately pure so these tests cover the whole payload contract.

const {
  printsmarterConfig,
  productIdFor,
  resolveShippingAddress,
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
    PRINTSMARTER_PRODUCT_ID: 'aevia_hardcover_matte',
    PRINTSMARTER_PRODUCT_ID_HEIRLOOM: 'aevia_hardcover_offset',
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
    templateName: 'scribble',
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
    expect(cfg.productIds.default).toBe('aevia_hardcover_matte');
    expect(cfg.productIds.heirloom).toBe('aevia_hardcover_offset');
    expect(cfg.live).toBe(false);
  });

  test('throws loudly when PRINTSMARTER_PRODUCT_ID is unset (brief: fail loudly, no silent default)', () => {
    const env = fullEnv();
    delete env.PRINTSMARTER_PRODUCT_ID;
    expect(() => printsmarterConfig(env)).toThrow(/PRINTSMARTER_PRODUCT_ID/);
  });

  test('throws loudly when the Heirloom product id is unset', () => {
    const env = fullEnv();
    delete env.PRINTSMARTER_PRODUCT_ID_HEIRLOOM;
    expect(() => printsmarterConfig(env)).toThrow(/PRINTSMARTER_PRODUCT_ID_HEIRLOOM/);
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

describe('resolveShippingAddress — where the book ships, and from where (S188)', () => {
  const saved = { line1: 'Kontoweg 9', city: 'Wien', postal_code: '1020', country: 'AT' };

  test("the order's own address always wins, even when a saved one exists", () => {
    const order = paidOrder();
    const r = resolveShippingAddress(order, saved);
    expect(r.address).toBe(order.shippingAddress);
    expect(r.source).toBe('order');
  });

  test('falls back to the customer account when the order has none', () => {
    const r = resolveShippingAddress(paidOrder({ shippingAddress: null }), saved);
    expect(r.address).toBe(saved);
    expect(r.source).toBe('customer account');
  });

  test('reports none when neither has an address — never invents one', () => {
    const r = resolveShippingAddress(paidOrder({ shippingAddress: null }), null);
    expect(r.address).toBeNull();
    expect(r.source).toBe('none');
  });

  test('CANNOT redirect a book that already has a destination — the safety property', () => {
    const order = paidOrder();
    const elsewhere = { line1: 'Somewhere else 1', city: 'Graz', postal_code: '8010', country: 'AT' };
    expect(resolveShippingAddress(order, elsewhere).address).toBe(order.shippingAddress);
  });

  test('a resolved account address builds a valid payload — same shape as Stripe gives', () => {
    const cfg = printsmarterConfig(fullEnv());
    const order = paidOrder({ shippingAddress: null });
    order.shippingAddress = resolveShippingAddress(order, saved).address;
    const p = buildOrderPayload(order, files, cfg);
    expect(p.shipping_address.address1).toBe('Kontoweg 9');
    expect(p.shipping_address.zip).toBe('1020');
    expect(p.shipping_address.country_code).toBe('AT');
    expect(p.shipping_address.country).toBe('Austria');
  });
});

describe('productIdFor — two paper stocks, two products (S188)', () => {
  const cfg = printsmarterConfig(fullEnv());

  test('every Heirloom colourway prints on offset', () => {
    for (const t of ['heirloom-beige', 'heirloom-blue', 'heirloom-brown', 'heirloom-green']) {
      expect(productIdFor(t, cfg)).toBe('aevia_hardcover_offset');
    }
  });

  test('every other template prints on matte', () => {
    for (const t of ['scribble', 'wander', 'newborn', 'tender', 'papercut', 'joyride', 'laguna']) {
      expect(productIdFor(t, cfg)).toBe('aevia_hardcover_matte');
    }
  });

  test('matching is case-insensitive — the product page may send "Heirloom-Beige"', () => {
    expect(productIdFor('Heirloom-Beige', cfg)).toBe('aevia_hardcover_offset');
    expect(productIdFor('Scribble', cfg)).toBe('aevia_hardcover_matte');
  });

  test('a missing templateName throws rather than defaulting to matte', () => {
    expect(() => productIdFor('', cfg)).toThrow(/templateName/);
    expect(() => productIdFor(undefined, cfg)).toThrow(/templateName/);
  });

  test('buildOrderPayload picks the product from the order (a Heirloom order gets offset)', () => {
    const [book] = buildOrderPayload(paidOrder({ templateName: 'heirloom-blue' }), files, cfg).products;
    expect(book.product_id).toBe('aevia_hardcover_offset');
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

  test('pages is sent as a NUMBER even though orders store it as a string', () => {
    // Real orders carry pageCount: "40" — the order form reads it from a URL
    // param. Their example sends `"pages": 40` unquoted, so a string is wrong.
    const [book] = buildOrderPayload(paidOrder({ pageCount: '40' }), files, cfg).products;
    expect(book.pages).toBe(40);
    expect(typeof book.pages).toBe('number');
    expect(book.price).toBe('70.00');
  });

  test('an 80pp string order prices and pages correctly too', () => {
    const [book] = buildOrderPayload(paidOrder({ pageCount: '80' }), files, cfg).products;
    expect(book.pages).toBe(80);
    expect(book.price).toBe('100.00');
  });

  test('a page count we do not sell still throws, string or number', () => {
    expect(() => buildOrderPayload(paidOrder({ pageCount: '60' }), files, cfg)).toThrow(/has no price/);
    expect(() => buildOrderPayload(paidOrder({ pageCount: 60 }), files, cfg)).toThrow(/has no price/);
  });

  test('book product carries pages, both file URLs and our product id', () => {
    const [book] = buildOrderPayload(paidOrder(), files, cfg).products;
    expect(book.product_id).toBe('aevia_hardcover_matte');
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

describe('parseShippingPostback — their documented postback shape', () => {
  const { parseShippingPostback } = require('../functions/printsmarter');

  test('extracts order number and tracking from the documented payload', () => {
    const r = parseShippingPostback({
      shipment: {
        order_id_client: 'AEV-052',
        tracking_number: '00111111111111111111',
        tracking_url: 'https://www.dhl.de/track?piececode=00111111111111111111',
      },
    });
    expect(r).toEqual({
      orderNumber: 'AEV-052',
      trackingNumber: '00111111111111111111',
      trackingUrl: 'https://www.dhl.de/track?piececode=00111111111111111111',
    });
  });

  test('rejects a payload without an order number', () => {
    expect(() => parseShippingPostback({ shipment: { tracking_number: 'x' } })).toThrow(/order_id_client/);
    expect(() => parseShippingPostback({})).toThrow(/order_id_client/);
    expect(() => parseShippingPostback(null)).toThrow(/order_id_client/);
  });

  test('rejects a non-https tracking URL — it goes into a customer email', () => {
    expect(() => parseShippingPostback({
      shipment: { order_id_client: 'AEV-052', tracking_number: '1', tracking_url: 'javascript:alert(1)' },
    })).toThrow(/tracking_url/);
    expect(() => parseShippingPostback({
      shipment: { order_id_client: 'AEV-052', tracking_number: '1', tracking_url: 'http://insecure.example' },
    })).toThrow(/tracking_url/);
  });

  test('tracking url is optional — number alone is still a valid shipment notice', () => {
    const r = parseShippingPostback({ shipment: { order_id_client: 'AEV-052', tracking_number: '1' } });
    expect(r.trackingUrl).toBe('');
  });
});
