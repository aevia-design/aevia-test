// Unit tests for the customer-account pure logic (Phase 1).

const {
  normalizeEmail,
  customerStatusLabel,
  canPreview,
  awaitingReview,
  toMillis,
  projectOrderForCustomer,
  sortOrdersNewestFirst,
} = require('../functions/account-utils');

describe('normalizeEmail', () => {
  test('trims and lower-cases', () => {
    expect(normalizeEmail('  Anna@Example.COM ')).toBe('anna@example.com');
  });
  test('matches the order-form normalisation so ownership lookup lines up', () => {
    expect(normalizeEmail('ANNA@gmail.com')).toBe(normalizeEmail('anna@gmail.com'));
  });
  test('returns empty string for unusable input', () => {
    expect(normalizeEmail(undefined)).toBe('');
    expect(normalizeEmail(null)).toBe('');
    expect(normalizeEmail(42)).toBe('');
  });
});

describe('customerStatusLabel', () => {
  test('maps known statuses to customer-facing labels', () => {
    expect(customerStatusLabel('review_sent')).toBe('Ready for preview');
    expect(customerStatusLabel('sent_to_print')).toBe('In production');
    expect(customerStatusLabel('printing')).toBe('In production');
    expect(customerStatusLabel('in_delivery')).toBe('Shipped');
    expect(customerStatusLabel('delivered')).toBe('Delivered');
  });
  test('collapses internal states the customer should not see', () => {
    expect(customerStatusLabel('needs_info')).toBe('Designing');
    expect(customerStatusLabel('paid')).toBe('Approved');
  });
  test('falls back gracefully for an unknown status', () => {
    expect(customerStatusLabel('something_new')).toBe('In progress');
    expect(customerStatusLabel(undefined)).toBe('In progress');
  });
});

describe('canPreview', () => {
  test('true once a preview has been sent and for every later state', () => {
    ['review_sent', 'approved', 'paid', 'sent_to_print', 'printing', 'in_delivery', 'delivered']
      .forEach(s => expect(canPreview(s)).toBe(true));
  });
  test('false before a preview exists', () => {
    ['uploading', 'new', 'designing', 'needs_info'].forEach(s => expect(canPreview(s)).toBe(false));
  });
});

describe('awaitingReview', () => {
  test('only review_sent is awaiting the customer', () => {
    expect(awaitingReview('review_sent')).toBe(true);
    expect(awaitingReview('approved')).toBe(false);
    expect(awaitingReview('designing')).toBe(false);
  });
});

describe('toMillis', () => {
  test('reads Firestore Timestamp shapes', () => {
    expect(toMillis({ _seconds: 1700000000 })).toBe(1700000000000);
    expect(toMillis({ seconds: 1700000000 })).toBe(1700000000000);
    expect(toMillis({ toMillis: () => 12345 })).toBe(12345);
  });
  test('reads numbers, ISO strings, and Dates', () => {
    expect(toMillis(98765)).toBe(98765);
    expect(toMillis('2026-01-01T00:00:00.000Z')).toBe(Date.parse('2026-01-01T00:00:00.000Z'));
    const d = new Date();
    expect(toMillis(d)).toBe(d.getTime());
  });
  test('returns null for unreadable input', () => {
    expect(toMillis(null)).toBeNull();
    expect(toMillis('not a date')).toBeNull();
    expect(toMillis({})).toBeNull();
  });
});

describe('projectOrderForCustomer', () => {
  test('returns only safe fields and includes previewToken for ready orders', () => {
    const out = projectOrderForCustomer({
      orderNumber: 'AEV-045',
      template: 'wander',
      collection: 'adventures',
      status: 'review_sent',
      previewToken: 'tok_abc',
      createdAt: { _seconds: 1700000000 },
      internalNotes: 'do not leak',
      staffBookAssignments: { secret: true },
      stripeSessionId: 'cs_test_x',
    });
    expect(out).toEqual({
      orderNumber: 'AEV-045',
      template: 'wander',
      collection: 'adventures',
      status: 'review_sent',
      statusLabel: 'Ready for preview',
      awaitingReview: true,
      createdAt: 1700000000000,
      updatedAt: null,
      previewToken: 'tok_abc',
    });
    // explicit leak guards
    expect(out.internalNotes).toBeUndefined();
    expect(out.staffBookAssignments).toBeUndefined();
    expect(out.stripeSessionId).toBeUndefined();
  });

  test('withholds previewToken before a preview is ready', () => {
    const out = projectOrderForCustomer({
      orderNumber: 'AEV-046', status: 'designing', previewToken: 'tok_xyz',
    });
    expect(out.previewToken).toBeNull();
    expect(out.statusLabel).toBe('Designing');
  });

  test('withholds previewToken when the token is missing even if status allows', () => {
    const out = projectOrderForCustomer({ orderNumber: 'AEV-047', status: 'approved' });
    expect(out.previewToken).toBeNull();
  });
});

describe('sortOrdersNewestFirst', () => {
  test('newest createdAt first, nulls last, tie-broken by order number desc', () => {
    const sorted = sortOrdersNewestFirst([
      { orderNumber: 'AEV-001', createdAt: 100 },
      { orderNumber: 'AEV-003', createdAt: null },
      { orderNumber: 'AEV-002', createdAt: 300 },
      { orderNumber: 'AEV-004', createdAt: 300 },
    ]);
    expect(sorted.map(o => o.orderNumber)).toEqual(['AEV-004', 'AEV-002', 'AEV-001', 'AEV-003']);
  });
});
