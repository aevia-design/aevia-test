// Printsmarter API client (S155).
//
// The whole vendor contract lives in this file: payload shape, auth header,
// response parsing. Nothing else in functions/ should know what their JSON
// looks like. API reference: docs/briefs/printsmarter-api.md (§3) and
// https://www.printsmarter.de/docs/api/ — four operations behind one static
// Access-Token header.
//
// Deliberately pure: no Firebase, no process.env reads, fetch is injected.
// tests/printsmarter.test.js covers the full contract without a network.

// What the customer paid us, keyed by page count — this is what goes in the
// `price` field (decided S155; pending Printsmarter's answer on what the field
// is used for). Canonical prices live in assets/js/prices.js, which functions/
// cannot reach at deploy time — if prices change there, change them here too.
const PRICE_BY_PAGE_COUNT = { 40: 70, 80: 100 };

// Country names for the codes we actually ship to. Their example sends both
// country_code and a name; for anything else the code is better than a guess.
const COUNTRY_NAMES = { AT: 'Austria', DE: 'Germany' };

// Reads and validates config from an env object (pass process.env in prod).
// Throws on anything missing — a half-configured client must never limp along.
// PRINTSMARTER_LIVE is the kill-switch: only the exact string 'true' arms it,
// so a fresh env, a typo or a copied test env all stay safely inert.
function printsmarterConfig(env) {
  const required = ['PRINTSMARTER_API_TOKEN', 'PRINTSMARTER_CUSTOMER_ID',
                    'PRINTSMARTER_API_BASE', 'PRINTSMARTER_PRODUCT_ID'];
  for (const key of required) {
    if (!env[key]) throw new Error(`${key} is not set — refusing to build a Printsmarter client`);
  }
  return {
    token: env.PRINTSMARTER_API_TOKEN,
    customerId: env.PRINTSMARTER_CUSTOMER_ID,
    base: env.PRINTSMARTER_API_BASE,
    productId: env.PRINTSMARTER_PRODUCT_ID,
    live: env.PRINTSMARTER_LIVE === 'true',
  };
}

// "Max Mustermann" → { first: 'Max', last: 'Mustermann' }. A single word goes
// to last_name — matching how their example treats the surname as primary.
function splitName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: '', last: parts[0] };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

// Maps an Aevia order document + the two signed print-PDF URLs onto their
// add_Order payload. Throws rather than guessing on anything missing: a wrong
// payload here becomes a wrong physical book.
//
// NOTE: no return_address is sent. Their docs example uses an Elanders address;
// where OUR failed deliveries go is an open contract question (brief §Context).
function buildOrderPayload(order, files, config) {
  const price = PRICE_BY_PAGE_COUNT[order.pageCount];
  if (price === undefined) {
    throw new Error(`pageCount ${order.pageCount} has no price — we sell ${Object.keys(PRICE_BY_PAGE_COUNT).join('/')}pp only`);
  }
  const addr = order.shippingAddress;
  if (!addr) throw new Error(`Order ${order.orderNumber} has no shippingAddress — cannot submit`);
  if (!files || !files.cover) throw new Error('cover PDF URL missing');
  if (!files.content) throw new Error('content PDF URL missing');

  const { first, last } = splitName(order.customerName);
  const countryCode = addr.country || '';

  return {
    customer_id: config.customerId,
    order_id_client: order.orderNumber,
    currency: 'EUR',
    shipping_address: {
      first_name: first,
      last_name: last,
      company: '',
      address1: addr.line1 || '',
      address2: addr.line2 || '',
      city: addr.city || '',
      zip: addr.postal_code || '',
      country_code: countryCode,
      country: COUNTRY_NAMES[countryCode] || countryCode,
      email: order.email || '',
    },
    products: [{
      project_name: order.orderNumber,
      quantity: 1,
      product_id_client: `${order.orderNumber}-1`,
      product_id: config.productId,
      price: price.toFixed(2),
      pages: order.pageCount,
      file_cover: files.cover,
      file_content: files.content,
    }],
  };
}

// Their responses wrap everything in { success: {...} } or an error shape.
// We require the order_id — it's what we store on the Firestore order, and the
// once-only guard keys off it, so "success without an id" is a failure.
function parseAddOrderResponse(json) {
  const s = json && json.success;
  if (s && s.status === true) {
    if (s.order_id === undefined) throw new Error('Printsmarter said success but returned no order_id');
    return { printsmarterOrderId: s.order_id, message: s.message || '' };
  }
  const msg = (json && json.error && json.error.message) || JSON.stringify(json);
  throw new Error(`Printsmarter rejected the order: ${msg}`);
}

// The only function that touches the network. The kill-switch check lives HERE,
// at the last moment before money is spent — callers may add their own guards,
// but none of them can forget this one.
async function submitOrder(payload, config, fetchImpl = fetch) {
  if (!config.live) {
    throw new Error('PRINTSMARTER_LIVE is not "true" — refusing to submit a real print order');
  }
  const res = await fetchImpl(config.base + 'add_Order', {
    method: 'POST',
    headers: { 'Access-Token': config.token, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Printsmarter add_Order failed: HTTP ${res.status} ${body}`.trim());
  }
  return parseAddOrderResponse(await res.json());
}

module.exports = {
  printsmarterConfig,
  buildOrderPayload,
  parseAddOrderResponse,
  submitOrder,
  PRICE_BY_PAGE_COUNT,
};
