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
                    'PRINTSMARTER_API_BASE', 'PRINTSMARTER_PRODUCT_ID',
                    'PRINTSMARTER_PRODUCT_ID_HEIRLOOM'];
  for (const key of required) {
    if (!env[key]) throw new Error(`${key} is not set — refusing to build a Printsmarter client`);
  }
  return {
    token: env.PRINTSMARTER_API_TOKEN,
    customerId: env.PRINTSMARTER_CUSTOMER_ID,
    base: env.PRINTSMARTER_API_BASE,
    // Two paper stocks, two product ids (S188). Heirloom prints on offset;
    // every other template on matte. Their ids are issued by email, so both
    // live in env — a new stock is a new env var plus a line in productIdFor().
    productIds: {
      default: env.PRINTSMARTER_PRODUCT_ID,
      heirloom: env.PRINTSMARTER_PRODUCT_ID_HEIRLOOM,
    },
    live: env.PRINTSMARTER_LIVE === 'true',
  };
}

// Which product (= which paper) a template prints on. Keyed off the order's
// templateName, which IS the registry key ('heirloom-beige', 'scribble', …),
// so all four Heirloom colourways match on the prefix and a fifth needs no
// change here. Throws on a missing name rather than defaulting: silently
// sending a Heirloom order to the matte product prints the wrong paper, and
// nothing downstream would catch it.
function productIdFor(templateName, config) {
  const key = String(templateName || '').trim().toLowerCase();
  if (!key) throw new Error('Order has no templateName — cannot choose a Printsmarter product');
  return key.startsWith('heirloom') ? config.productIds.heirloom : config.productIds.default;
}

// Decides which address a book ships to, and says where it came from (S188).
//
// Only two code paths ever stamp shippingAddress onto an order and both live in
// the payment flow (createCheckoutSession's saved-address copy, and the Stripe
// webhook). So a staff test order that was never paid through Stripe has none —
// and a real paid order can lose it too: that copy sits in a try/catch that only
// warns, and the saved-address path skips Stripe's address collection, so the
// webhook has nothing to fall back on.
//
// The customer record is the right fallback because it is what the checkout copy
// reads FROM. Pure so the precedence is testable: the order's own address always
// wins, so this can only fill an absent field, never redirect a book that already
// has a confirmed destination.
function resolveShippingAddress(order, savedAddress) {
  if (order && order.shippingAddress) return { address: order.shippingAddress, source: 'order' };
  if (savedAddress) return { address: savedAddress, source: 'customer account' };
  return { address: null, source: 'none' };
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
  // Orders store pageCount as a STRING — the order form reads it from a URL
  // param and never coerces. Their documented example sends `"pages": 40`
  // unquoted while `"price"` IS a string, so they distinguish the two types and
  // we must send a number. Coerce here rather than at the source: this is the
  // only place the value crosses into their contract. (The price lookup below
  // hid this for a whole session — PRICE_BY_PAGE_COUNT["40"] resolves happily.)
  const pages = Number(order.pageCount);
  const price = PRICE_BY_PAGE_COUNT[pages];
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
      product_id: productIdFor(order.templateName, config),
      price: price.toFixed(2),
      pages,
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

// Their shipping postback: { shipment: { order_id_client, tracking_number,
// tracking_url } }. The tracking URL ends up in a customer email, so anything
// that is not https is rejected outright — a forged or malformed postback must
// not be able to put an arbitrary link in front of a customer.
function parseShippingPostback(json) {
  const s = (json && json.shipment) || {};
  if (!s.order_id_client) throw new Error('Postback has no shipment.order_id_client');
  const trackingUrl = s.tracking_url || '';
  if (trackingUrl && !/^https:\/\//.test(trackingUrl)) {
    throw new Error('Postback tracking_url is not https — refusing it');
  }
  return {
    orderNumber: s.order_id_client,
    trackingNumber: s.tracking_number || '',
    trackingUrl,
  };
}

module.exports = {
  printsmarterConfig,
  productIdFor,
  resolveShippingAddress,
  buildOrderPayload,
  parseAddOrderResponse,
  parseShippingPostback,
  submitOrder,
  PRICE_BY_PAGE_COUNT,
};
