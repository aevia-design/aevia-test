// Pure utility functions for the customer account area (Phase 1).
// No side effects, no dependencies on Cloud Functions, Firebase, or GCS.
// Extracted here so they can be unit-tested with Jest independent of Firebase.
// See docs/briefs/customer-accounts.md and docs/decisions/0007-optional-customer-accounts.md.

/**
 * Normalise a customer email for ownership matching.
 * MUST match the normalisation the order form applies on submit
 * (order-flow-hardening Chunk 1: trim + lower-case) so that the email
 * stored on the order and the verified email on the token line up.
 *
 * @param {string} email
 * @returns {string} normalised email, or '' if input is unusable
 */
function normalizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Customer-facing status label. Friendlier/coarser than the staff dashboard
 * labels — print stages read as "In production", and a reported issue reads as
 * "Under review".
 *
 * Status vocabulary (from order-flow-hardening + dashboard.html):
 *   uploading, new, issue, review_sent, approved,
 *   paid, sent_to_print, printing, in_delivery, delivered
 *
 * @param {string} status
 * @returns {string}
 */
function customerStatusLabel(status) {
  const labels = {
    uploading:     'Uploading photos',
    new:           'Received',
    issue:         'Under review',       // customer reported a problem → staff are on it
    review_sent:   'Ready for preview',
    approved:      'Approved',
    paid:          'Payment confirmed',  // paid but pre-print → distinct from "Approved"
    sent_to_print: 'In production',
    printing:      'In production',
    in_delivery:   'Shipped',
    delivered:     'Delivered',
  };
  return labels[status] || 'In progress';
}

/**
 * Whether the Orders row should show a "Preview" button for this status.
 * True once a preview has been sent and for every later state in which a
 * viewable preview still exists (approved/paid/print/delivery). The customer
 * can always look at the book they approved. A previewToken must also exist
 * (checked by the caller) for the button to be actionable.
 *
 * @param {string} status
 * @returns {boolean}
 */
function canPreview(status) {
  return [
    'review_sent', 'issue', 'approved', 'paid',
    'sent_to_print', 'printing', 'in_delivery', 'delivered',
  ].includes(status);
}

/**
 * Whether this status is specifically awaiting the customer's review/approval
 * (drives the more prominent "Review & approve" call-to-action vs a plain
 * "View preview").
 *
 * @param {string} status
 * @returns {boolean}
 */
function awaitingReview(status) {
  return status === 'review_sent';
}

/**
 * Best-effort millisecond timestamp from a Firestore value that may be a
 * Firestore Timestamp ({_seconds}/{seconds}/toMillis), a Date, an ISO string,
 * or a number. Returns null if it can't be read.
 *
 * @param {*} v
 * @returns {number|null}
 */
function toMillis(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : t;
  }
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v._seconds === 'number') return v._seconds * 1000;
  if (typeof v.seconds === 'number') return v.seconds * 1000;
  if (v instanceof Date) return v.getTime();
  return null;
}

/**
 * Project a raw Firestore order doc down to the minimal, safe shape the
 * account Orders view needs. NEVER returns the whole doc (no internal notes,
 * staffBook payloads, photo manifests, Stripe ids, etc.). previewToken is
 * included only when the status can show a preview, so the page can build the
 * customer-preview link server-side without the customer ever hunting a token.
 *
 * @param {object} order - raw Firestore order data (data() of an orders/<AEV> doc)
 * @returns {object} safe summary
 */
function projectOrderForCustomer(order) {
  const status = order.status || 'new';
  const showPreview = canPreview(status) && !!order.previewToken;
  return {
    orderNumber:   order.orderNumber || null,
    template:      order.template || order.collection || null,
    collection:    order.collection || null,
    status,
    statusLabel:   customerStatusLabel(status),
    awaitingReview: awaitingReview(status),
    createdAt:     toMillis(order.createdAt) ?? toMillis(order.created) ?? null,
    updatedAt:     toMillis(order.updatedAt) ?? null,
    previewToken:  showPreview ? (order.previewToken || null) : null,
  };
}

/**
 * Sort projected order summaries newest-first by createdAt (nulls last),
 * tie-broken by order number descending.
 *
 * @param {Array<object>} orders
 * @returns {Array<object>} same array, sorted in place
 */
function sortOrdersNewestFirst(orders) {
  return orders.sort((a, b) => {
    const ac = a.createdAt, bc = b.createdAt;
    if (ac != null && bc != null && ac !== bc) return bc - ac;
    if (ac == null && bc != null) return 1;
    if (bc == null && ac != null) return -1;
    return String(b.orderNumber || '').localeCompare(String(a.orderNumber || ''));
  });
}

module.exports = {
  normalizeEmail,
  customerStatusLabel,
  canPreview,
  awaitingReview,
  toMillis,
  projectOrderForCustomer,
  sortOrdersNewestFirst,
};
