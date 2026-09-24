// Pure helper for approveOrder's caption-line handoff (TO-DOS #129).
// No side effects, no Firebase/Firestore dependency — extracted so it can be
// unit-tested independent of Cloud Functions. See work/caption-line-integrity/decision.md
// and LEARNINGS.md S159/S181 for why recorded caption lines exist at all.

/**
 * What staffBookCaptionLines should become when a customer's edits are promoted
 * to staff fields on approval. Before #129 the customer surface never recorded
 * its own line breaks, so the staff-recorded ones (describing pre-approval text)
 * were dropped outright (set to null) rather than let the PDF draw stale breaks.
 * Now that customer-preview records customerCaptionLines the same way, those are
 * promoted instead — still null for any order saved before this change, since the
 * field simply won't exist on it.
 *
 * @param {object} orderData - raw Firestore order data at approval time
 * @returns {object|null}
 */
function resolveApprovedCaptionLines(orderData) {
  return (orderData && orderData.customerCaptionLines != null) ? orderData.customerCaptionLines : null;
}

module.exports = { resolveApprovedCaptionLines };
