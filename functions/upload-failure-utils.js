// Pure decision helpers for the stranded-upload lifecycle (TO-DOS #89).
// No side effects, no Firebase, no SMTP — so the scheduled function's decisions
// can be unit-tested directly rather than re-implemented in a test file.
//
// That distinction matters here: tests/chunk-4-order-flow.test.js COPIES the
// order-flow behaviour instead of importing it, which is how a broken change can
// stay green (LEARNINGS, S154). The scheduled handler calls these functions, so
// a test of these functions is a test of what actually ships.
//
// See docs/briefs/upload-failure-recovery.md.

/**
 * Milliseconds from the several shapes a Firestore timestamp arrives in:
 * an admin Timestamp ({ toMillis }), a decoded one ({ seconds }), a Date, or
 * a raw number. Returns null when there is no usable value — callers must treat
 * null as "cannot judge", never as zero.
 *
 * @param {*} ts
 * @returns {number|null}
 */
function toMillis(ts) {
  if (ts === null || ts === undefined) return null;
  if (typeof ts === 'number') return Number.isFinite(ts) ? ts : null;
  if (ts instanceof Date) return Number.isNaN(ts.getTime()) ? null : ts.getTime();
  if (typeof ts.toMillis === 'function') {
    const ms = ts.toMillis();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  if (typeof ts._seconds === 'number') return ts._seconds * 1000;
  return null;
}

/**
 * Is this order a stranded upload the job should flip?
 *
 * Four conditions, all required:
 *   - still at status 'uploading' and not confirmed complete
 *   - created at a readable time
 *   - created AFTER the deploy cutoff (so the five known QA strandings —
 *     AEV-067/073/074/079/096 — are ignored without a hardcoded ID list, which
 *     is one forgotten entry away from emailing a test address)
 *   - older than the threshold
 *
 * @param {object} order
 * @param {{ nowMs: number, thresholdMs: number, cutoffMs: number }} opts
 * @returns {boolean}
 */
function isStrandedUpload(order, { nowMs, thresholdMs, cutoffMs }) {
  if (!order || order.status !== 'uploading') return false;
  if (order.uploadComplete === true) return false;

  const createdMs = toMillis(order.createdAt);
  if (createdMs === null) return false;          // unreadable date → never flip
  if (createdMs < cutoffMs) return false;        // pre-deploy order → leave alone

  return nowMs - createdMs > thresholdMs;
}

/**
 * What the client reported, as a category.
 *
 * ⚠ Presence of `uploadErrors` is NOT the predicate. When every photo uploaded
 * but confirmUpload failed, order.html records an entry with
 * stage: 'confirmUpload' AND still shows the customer the success screen. Mailing
 * "your upload did not finish" to someone whose photos are all present, and who
 * was told it worked, is worse than saying nothing.
 *
 * @param {object} order
 * @returns {'photo_failures'|'finalization_failed'|'no_client_error'}
 */
function classifyUploadFailure(order) {
  const entries = Array.isArray(order && order.uploadErrors) ? order.uploadErrors : [];
  if (entries.length === 0) return 'no_client_error';

  const photoFailures = entries.filter(e => !e || e.stage !== 'confirmUpload');
  return photoFailures.length > 0 ? 'photo_failures' : 'finalization_failed';
}

/**
 * Did a later order from the same address complete successfully?
 *
 * Success is `uploadComplete === true`, whatever the order's later workflow
 * status — a book that reached print still proves the customer got through.
 *
 * ⚠ This is a heuristic and it can be wrong: the same address may legitimately
 * order two books, and households share addresses. Callers record the
 * `later_order_succeeded` disposition so a human can still see the suppressed
 * case on the dashboard.
 *
 * @param {object} order           the stranded order
 * @param {object[]} sameEmailOrders  all orders for that normalised email
 * @returns {boolean}
 */
function hasLaterSuccess(order, sameEmailOrders) {
  const createdMs = toMillis(order && order.createdAt);
  if (createdMs === null) return false;

  return (Array.isArray(sameEmailOrders) ? sameEmailOrders : []).some(other => {
    if (!other || other.orderNumber === order.orderNumber) return false;
    if (other.uploadComplete !== true) return false;
    const otherMs = toMillis(other.createdAt);
    return otherMs !== null && otherMs > createdMs;
  });
}

/**
 * The whole decision: which disposition to record, and whether to email.
 *
 * Only real photo failures with no later success reach the customer. Everything
 * else is a staff-facing flag, because the customer either was not told there
 * was a problem, already solved it, or believes it worked.
 *
 * @param {object} order
 * @param {object[]} sameEmailOrders
 * @returns {{ disposition: string, notifyCustomer: boolean }}
 */
function decideUploadFailureAction(order, sameEmailOrders) {
  const kind = classifyUploadFailure(order);

  if (kind === 'finalization_failed') {
    return { disposition: 'finalization_failed', notifyCustomer: false };
  }
  if (kind === 'no_client_error') {
    return { disposition: 'no_client_error', notifyCustomer: false };
  }
  if (hasLaterSuccess(order, sameEmailOrders)) {
    return { disposition: 'later_order_succeeded', notifyCustomer: false };
  }
  return { disposition: 'customer_notified', notifyCustomer: true };
}

module.exports = {
  toMillis,
  isStrandedUpload,
  classifyUploadFailure,
  hasLaterSuccess,
  decideUploadFailureAction,
};
