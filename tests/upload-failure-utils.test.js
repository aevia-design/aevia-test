// Unit tests for the stranded-upload decision logic (TO-DOS #89).
// These import the SAME module the scheduled function calls — deliberately, so a
// green suite means the shipped decisions are right. See the header of
// functions/upload-failure-utils.js for why that is spelled out.

const {
  toMillis,
  isStrandedUpload,
  classifyUploadFailure,
  hasLaterSuccess,
  decideUploadFailureAction,
} = require('../functions/upload-failure-utils');

const HOUR = 60 * 60 * 1000;
const NOW = Date.parse('2026-09-22T12:00:00Z');
const CUTOFF = Date.parse('2026-09-01T00:00:00Z');
const OPTS = { nowMs: NOW, thresholdMs: HOUR, cutoffMs: CUTOFF };

const uploading = (overrides = {}) => ({
  orderNumber: 'AEV-200',
  status: 'uploading',
  uploadComplete: false,
  createdAt: NOW - 2 * HOUR,
  ...overrides,
});

describe('toMillis', () => {
  test('reads every timestamp shape Firestore hands back', () => {
    expect(toMillis(1234)).toBe(1234);
    expect(toMillis(new Date(1234))).toBe(1234);
    expect(toMillis({ seconds: 5 })).toBe(5000);
    expect(toMillis({ _seconds: 5 })).toBe(5000);
    expect(toMillis({ toMillis: () => 99 })).toBe(99);
  });

  test('returns null — never 0 — when there is no usable value', () => {
    // 0 would read as 1 Jan 1970, which is before every cutoff and older than
    // every threshold: an unreadable date would strand-flip every order.
    expect(toMillis(null)).toBeNull();
    expect(toMillis(undefined)).toBeNull();
    expect(toMillis('yesterday')).toBeNull();
    expect(toMillis(new Date('nonsense'))).toBeNull();
  });
});

describe('isStrandedUpload', () => {
  test('flips an order past the threshold', () => {
    expect(isStrandedUpload(uploading(), OPTS)).toBe(true);
  });

  test('leaves an upload that is still inside the hour', () => {
    expect(isStrandedUpload(uploading({ createdAt: NOW - 30 * 60 * 1000 }), OPTS)).toBe(false);
  });

  test('does not flip exactly at the threshold — strictly older only', () => {
    expect(isStrandedUpload(uploading({ createdAt: NOW - HOUR }), OPTS)).toBe(false);
  });

  test('ignores orders created before the deploy cutoff', () => {
    // The five known QA strandings (AEV-067/073/074/079/096) are excluded by
    // date, not by an ID list that could miss one and email a test address.
    expect(isStrandedUpload(uploading({ createdAt: CUTOFF - HOUR }), OPTS)).toBe(false);
  });

  test('ignores orders that are not uploading, or already complete', () => {
    expect(isStrandedUpload(uploading({ status: 'new' }), OPTS)).toBe(false);
    expect(isStrandedUpload(uploading({ uploadComplete: true }), OPTS)).toBe(false);
  });

  test('never flips an order with an unreadable createdAt', () => {
    expect(isStrandedUpload(uploading({ createdAt: null }), OPTS)).toBe(false);
  });
});

describe('classifyUploadFailure', () => {
  test('no client error at all when uploadErrors is absent or empty', () => {
    expect(classifyUploadFailure({})).toBe('no_client_error');
    expect(classifyUploadFailure({ uploadErrors: [] })).toBe('no_client_error');
  });

  test('confirmUpload-only errors are a finalisation failure, not a photo failure', () => {
    // All photos are in GCS and the customer saw the SUCCESS screen.
    expect(classifyUploadFailure({
      uploadErrors: [{ stage: 'confirmUpload', message: 'fetch failed' }],
    })).toBe('finalization_failed');
  });

  test('a real photo failure is a photo failure', () => {
    expect(classifyUploadFailure({
      uploadErrors: [{ stage: 'upload', slot: 7 }],
    })).toBe('photo_failures');
  });

  test('a mixed set counts as photo failures', () => {
    expect(classifyUploadFailure({
      uploadErrors: [{ stage: 'upload', slot: 7 }, { stage: 'confirmUpload' }],
    })).toBe('photo_failures');
  });
});

describe('hasLaterSuccess', () => {
  const stranded = uploading();

  test('true when a newer order from the same address completed', () => {
    expect(hasLaterSuccess(stranded, [
      { orderNumber: 'AEV-201', uploadComplete: true, createdAt: NOW - HOUR },
    ])).toBe(true);
  });

  test('false when the successful order is OLDER than the stranded one', () => {
    expect(hasLaterSuccess(stranded, [
      { orderNumber: 'AEV-199', uploadComplete: true, createdAt: NOW - 5 * HOUR },
    ])).toBe(false);
  });

  test('false when the later order also failed to complete', () => {
    expect(hasLaterSuccess(stranded, [
      { orderNumber: 'AEV-201', uploadComplete: false, createdAt: NOW - HOUR },
    ])).toBe(false);
  });

  test('success counts whatever the later workflow status is', () => {
    expect(hasLaterSuccess(stranded, [
      { orderNumber: 'AEV-201', uploadComplete: true, status: 'delivered', createdAt: NOW - HOUR },
    ])).toBe(true);
  });

  test('never matches the stranded order against itself', () => {
    expect(hasLaterSuccess(stranded, [
      { ...stranded, uploadComplete: true, createdAt: NOW },
    ])).toBe(false);
  });
});

describe('decideUploadFailureAction', () => {
  test('real photo failures with no later success → email the customer', () => {
    expect(decideUploadFailureAction(
      uploading({ uploadErrors: [{ stage: 'upload', slot: 3 }] }), [],
    )).toEqual({ disposition: 'customer_notified', notifyCustomer: true });
  });

  test('real photo failures WITH a later success → suppress, but record why', () => {
    expect(decideUploadFailureAction(
      uploading({ uploadErrors: [{ stage: 'upload', slot: 3 }] }),
      [{ orderNumber: 'AEV-201', uploadComplete: true, createdAt: NOW - HOUR }],
    )).toEqual({ disposition: 'later_order_succeeded', notifyCustomer: false });
  });

  test('a finalisation failure never emails the customer', () => {
    // They were shown the success screen; telling them it failed is worse than
    // silence, and staff may not have heard either once the staff mail moves.
    expect(decideUploadFailureAction(
      uploading({ uploadErrors: [{ stage: 'confirmUpload' }] }), [],
    )).toEqual({ disposition: 'finalization_failed', notifyCustomer: false });
  });

  test('a silent stranding (closed tab) is a staff flag, not a customer email', () => {
    expect(decideUploadFailureAction(uploading(), [])).toEqual({
      disposition: 'no_client_error', notifyCustomer: false,
    });
  });

  test('a later success does not resurrect a suppressed finalisation failure', () => {
    expect(decideUploadFailureAction(
      uploading({ uploadErrors: [{ stage: 'confirmUpload' }] }),
      [{ orderNumber: 'AEV-201', uploadComplete: true, createdAt: NOW - HOUR }],
    )).toEqual({ disposition: 'finalization_failed', notifyCustomer: false });
  });
});
