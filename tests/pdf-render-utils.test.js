// Unit tests for the pure PDF-render-control helpers (TO-DOS #138).
// See docs/briefs/pdf-generation-control.md — "one render per order" (stale guard)
// and "cancel" decisions must be pure and testable independent of Firestore.
const { isRenderInFlight, shouldCancelRender, STALE_MS } = require('../functions/pdf-render-utils');

describe('isRenderInFlight', () => {
  const now = 1_000_000_000_000; // fixed reference instant (ms)

  test('false when there is no pdfRender field at all', () => {
    expect(isRenderInFlight(undefined, now)).toBe(false);
    expect(isRenderInFlight(null, now)).toBe(false);
  });

  test('false for a terminal status (done/error/cancelled/none)', () => {
    for (const status of ['done', 'error', 'cancelled', 'none']) {
      expect(isRenderInFlight({ status, updatedAt: now }, now)).toBe(false);
    }
  });

  test('true for "starting" freshly updated', () => {
    expect(isRenderInFlight({ status: 'starting', updatedAt: now }, now)).toBe(true);
  });

  test('true for "rendering" freshly updated', () => {
    expect(isRenderInFlight({ status: 'rendering', updatedAt: now }, now)).toBe(true);
  });

  test('true for "rendering" updated just under the 20-minute staleness ceiling', () => {
    const updatedAt = now - (STALE_MS - 1000);
    expect(isRenderInFlight({ status: 'rendering', updatedAt }, now)).toBe(true);
  });

  test('false (stale) once updatedAt is 20+ minutes old — a crashed render cannot lock the order forever', () => {
    const updatedAt = now - STALE_MS;
    expect(isRenderInFlight({ status: 'rendering', updatedAt }, now)).toBe(false);
  });

  test('false for a clearly stale render (e.g. 1 hour old)', () => {
    const updatedAt = now - 60 * 60 * 1000;
    expect(isRenderInFlight({ status: 'starting', updatedAt }, now)).toBe(false);
  });

  test('accepts a Firestore Timestamp-shaped updatedAt (toMillis())', () => {
    const updatedAt = { toMillis: () => now - 1000 };
    expect(isRenderInFlight({ status: 'rendering', updatedAt }, now)).toBe(true);
  });

  test('accepts a JS Date updatedAt', () => {
    const updatedAt = new Date(now - 1000);
    expect(isRenderInFlight({ status: 'rendering', updatedAt }, now)).toBe(true);
  });

  test('treats a missing/unparseable updatedAt as in-flight (fail safe, not fail open)', () => {
    expect(isRenderInFlight({ status: 'rendering' }, now)).toBe(true);
  });
});

describe('shouldCancelRender', () => {
  test('false when there is no pdfRender field', () => {
    expect(shouldCancelRender(undefined)).toBe(false);
    expect(shouldCancelRender(null)).toBe(false);
  });

  test('false when cancelRequested is absent or falsy', () => {
    expect(shouldCancelRender({ status: 'rendering' })).toBe(false);
    expect(shouldCancelRender({ status: 'rendering', cancelRequested: false })).toBe(false);
  });

  test('true when cancelRequested is exactly true', () => {
    expect(shouldCancelRender({ status: 'rendering', cancelRequested: true })).toBe(true);
  });

  test('ignores truthy-but-not-true values (defensive — Firestore data is untyped)', () => {
    expect(shouldCancelRender({ status: 'rendering', cancelRequested: 'yes' })).toBe(false);
  });
});
