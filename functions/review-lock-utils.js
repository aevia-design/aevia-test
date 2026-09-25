// TO-DOS #99: pure rules for the review lock + issue flow.
// No Firebase/Firestore dependency, so these are unit-testable on their own.
// See docs/briefs/review-lock.md and work/review-lock/decision.md.
const { resolveApprovedCaptionLines } = require('./caption-line-utils');

// Statuses at or after 'review_sent' — the book has left staff's hands and
// belongs to the customer (or is already printing). 'issue' is a side-state,
// deliberately NOT in this list: a blocking report unlocks staff again.
const STAFF_LOCKED_STATUSES = ['review_sent', 'approved', 'paid', 'sent_to_print', 'printing', 'in_delivery', 'delivered'];

// Staff may save unless the order is with the customer (review_sent or later).
// 'issue' is explicitly allowed — that's what a blocking report unlocks.
function canStaffSave(status) {
  if (status === 'issue') return true;
  return !STAFF_LOCKED_STATUSES.includes(status);
}

// The customer may only save their own edits while the book is theirs to review.
function canCustomerSave(status) {
  return status === 'review_sent';
}

// Approval is only accepted from review_sent — the ONE status meaning "the
// customer has a sent book in front of them and nothing else is going on".
// (Codex review fix: previously refused only issue/approved/paid, which let
// through anything else, e.g. 'new' or 'designing'.)
function canApprove(status) {
  return status === 'review_sent';
}

// A blocking report only makes sense while the customer has something to
// approve. Outside review_sent there is nothing left to block.
function canAcceptBlockingReport(status) {
  return status === 'review_sent';
}

// Whether a transition INTO 'review_sent' is a genuinely new send (from a
// pre-send status, or re-sent after a fix closed 'issue') rather than a plain
// resend of an already-sent book. Codex review fix: a resend while status is
// ALREADY 'review_sent' must not re-snapshot or re-version — the customer may
// have their own draft in progress, and staffBook* is not what they're
// looking at. Only a genuine new send writes a new sentVersion / snapshot /
// revision bump; a plain resend just re-sends the email.
function isEnteringReviewSent(previousStatus) {
  return previousStatus !== 'review_sent';
}

// bookRevision is absent on every order saved before this feature — that
// reads as 0, so old orders keep working without a migration.
function revisionMatches(orderData, clientRevision) {
  const current = (orderData && orderData.bookRevision) || 0;
  const claimed = Number(clientRevision) || 0;
  return claimed === current;
}

// Shared mapping from the customer's saved draft onto its staff counterparts.
// Used by approveOrder AND by a blocking report's promotion (decision B2) —
// one helper, so the two never drift apart.
function mapCustomerToStaffUpdates(orderData) {
  const updates = {};
  if (orderData.customerBookAssignments != null) {
    updates.staffBookAssignments = orderData.customerBookAssignments;
  }
  if (orderData.customerCaptions != null) {
    updates.staffBookCaptions = orderData.customerCaptions;
    // Staff-recorded lines describe pre-edit text and must not survive; the
    // customer's own recorded lines (TO-DOS #129) are promoted instead, or
    // null on an order saved before that field existed.
    updates.staffBookCaptionLines = resolveApprovedCaptionLines(orderData);
  }
  if (orderData.customerCaptionStyles != null) {
    updates.staffSpreadCaptionStyles = orderData.customerCaptionStyles;
  }
  if (orderData.customerCoverCaptionStyles != null) {
    updates.staffCoverCaptionStyles = orderData.customerCoverCaptionStyles;
  }
  if (orderData.customerBookSequence != null) {
    updates.staffBookSequence = orderData.customerBookSequence;
  }
  if (orderData.customerHeartCrop != null) {
    updates.staffHeartCrop = orderData.customerHeartCrop;
  }
  return updates;
}

// A report is kept as one of two kinds. Anything that isn't explicitly
// 'blocking' is stored as feedback — the safe default.
function buildReportEntry(type, message, at) {
  return {
    type: type === 'blocking' ? 'blocking' : 'feedback',
    message: String(message || '').trim().slice(0, 1000),
    at,
  };
}

module.exports = {
  STAFF_LOCKED_STATUSES,
  canStaffSave,
  canCustomerSave,
  canApprove,
  canAcceptBlockingReport,
  isEnteringReviewSent,
  revisionMatches,
  mapCustomerToStaffUpdates,
  buildReportEntry,
};
