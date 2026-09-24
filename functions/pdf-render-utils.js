// Pure helpers for controlling PDF-render state (TO-DOS #138). No side effects, no
// Firebase/Firestore dependency — extracted so the in-flight/stale and cancel
// decisions can be unit-tested independent of Cloud Functions and the Cloud Run
// renderer. See docs/briefs/pdf-generation-control.md.
//
// Mirrored in pages/staff/dashboard.html (browser code can't require() this
// CommonJS module) — keep the two in sync if the rules here change.

// The renderer's hard Cloud Run timeout is 900s (15 min); a render whose status
// hasn't moved in ~20 min is treated as crashed/orphaned rather than genuinely
// still running, so it cannot lock an order's Generate/Regenerate buttons forever.
const STALE_MS = 20 * 60 * 1000;

/**
 * Best-effort ms-since-epoch from a Firestore Timestamp, a JS Date, or a raw number.
 * Returns null if the shape isn't recognised.
 */
function toMillis(value) {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  return null;
}

/**
 * Whether an order's pdfRender represents a render that is genuinely still going —
 * i.e. its Generate/Regenerate buttons should stay disabled and a second
 * generatePdf call should be refused (409). Used both by the dashboard (to draw
 * the disabled state / resume the progress bar) and by generatePdf (as the
 * server-side guard, since a UI-only disable can't stop a second tab).
 *
 * @param {object|null|undefined} pdfRender - order.pdfRender as stored in Firestore
 * @param {number} nowMs - current time in ms (injected for testability)
 * @returns {boolean}
 */
function isRenderInFlight(pdfRender, nowMs) {
  if (!pdfRender) return false;
  if (pdfRender.status !== 'starting' && pdfRender.status !== 'rendering') return false;
  const updatedMs = toMillis(pdfRender.updatedAt);
  // No parseable timestamp: fail safe (treat as in-flight) rather than letting an
  // unusual write shape silently unlock a render that may still be running.
  if (updatedMs == null) return true;
  return (nowMs - updatedMs) < STALE_MS;
}

/**
 * Whether the renderer should stop and discard the current render at its next
 * checkpoint. Staff request this via cancelPdfRender, which sets cancelRequested.
 *
 * @param {object|null|undefined} pdfRender
 * @returns {boolean}
 */
function shouldCancelRender(pdfRender) {
  return !!(pdfRender && pdfRender.cancelRequested === true);
}

module.exports = { isRenderInFlight, shouldCancelRender, STALE_MS };
