// Unit tests for promo-code validation on Aevia's pay page (ADR-0008).
// The Stripe/Firestore wiring lives in functions/index.js (validatePromoCode +
// createCheckoutSession); these tests cover the decision it relies on — above
// all the self-referral block, which is the reason the flow exists.

const {
  normalizePromoCode,
  promoValidationDecision,
  describeDiscount,
} = require('../functions/promo-utils');

// A healthy referral code: €10 off, first-order-only, no caps.
function referralPromo(overrides = {}) {
  return {
    id: 'promo_123',
    code: 'ANNA-7K2P',
    active: true,
    coupon: { valid: true, amount_off: 1000 },
    restrictions: { first_time_transaction: true },
    ...overrides,
  };
}

describe('normalizePromoCode', () => {
  test('trims and uppercases', () => {
    expect(normalizePromoCode('  svetlana30 ')).toBe('SVETLANA30');
  });

  test('strips inner whitespace from a sloppy paste', () => {
    expect(normalizePromoCode('ANNA - 7K2P')).toBe('ANNA-7K2P');
  });

  test('returns empty string for nothing usable', () => {
    expect(normalizePromoCode('   ')).toBe('');
    expect(normalizePromoCode(undefined)).toBe('');
    expect(normalizePromoCode(null)).toBe('');
    expect(normalizePromoCode(42)).toBe('');
  });
});

describe('promoValidationDecision', () => {
  test('accepts a valid referral code redeemed by someone else', () => {
    const decision = promoValidationDecision({
      promo: referralPromo(),
      ownerEmail: 'anna@example.com',
      buyerEmail: 'friend@example.com',
    });
    expect(decision).toEqual({ valid: true });
  });

  test('accepts an ownerless F&F code (no referralCodes entry)', () => {
    const decision = promoValidationDecision({
      promo: { active: true, coupon: { valid: true, percent_off: 30 } },
      ownerEmail: null,
      buyerEmail: 'friend@example.com',
    });
    expect(decision.valid).toBe(true);
  });

  test('DENIES self-referral — the whole point of ADR-0008', () => {
    const decision = promoValidationDecision({
      promo: referralPromo(),
      ownerEmail: 'anna@example.com',
      buyerEmail: 'ANNA@Example.com ',   // same person, different casing/spacing
    });
    expect(decision).toEqual({ valid: false, reason: 'self_referral' });
  });

  test('rejects an unknown code', () => {
    const decision = promoValidationDecision({
      promo: null,
      ownerEmail: null,
      buyerEmail: 'friend@example.com',
    });
    expect(decision).toEqual({ valid: false, reason: 'unknown_code' });
  });

  test('rejects a deactivated code and an invalid coupon', () => {
    expect(promoValidationDecision({
      promo: referralPromo({ active: false }),
      ownerEmail: 'anna@example.com',
      buyerEmail: 'friend@example.com',
    })).toEqual({ valid: false, reason: 'unknown_code' });

    expect(promoValidationDecision({
      promo: referralPromo({ coupon: { valid: false, amount_off: 1000 } }),
      ownerEmail: 'anna@example.com',
      buyerEmail: 'friend@example.com',
    })).toEqual({ valid: false, reason: 'unknown_code' });
  });

  test('rejects an expired code, and accepts one that expires later', () => {
    const nowMs = Date.UTC(2026, 6, 13);
    const expired = promoValidationDecision({
      promo: referralPromo({ expires_at: Math.floor(Date.UTC(2026, 5, 1) / 1000) }),
      ownerEmail: 'anna@example.com',
      buyerEmail: 'friend@example.com',
      nowMs,
    });
    expect(expired).toEqual({ valid: false, reason: 'expired' });

    const live = promoValidationDecision({
      promo: referralPromo({ expires_at: Math.floor(Date.UTC(2026, 7, 31) / 1000) }),
      ownerEmail: 'anna@example.com',
      buyerEmail: 'friend@example.com',
      nowMs,
    });
    expect(live.valid).toBe(true);
  });

  test('rejects a code that has hit its redemption cap (the FRIENDS30 failure)', () => {
    const decision = promoValidationDecision({
      promo: referralPromo({ max_redemptions: 1, times_redeemed: 1 }),
      ownerEmail: null,
      buyerEmail: 'friend@example.com',
    });
    expect(decision).toEqual({ valid: false, reason: 'used_up' });
  });

  test('rejects a first-order-only code for a returning buyer', () => {
    const decision = promoValidationDecision({
      promo: referralPromo(),
      ownerEmail: 'anna@example.com',
      buyerEmail: 'friend@example.com',
      buyerPriorPaidOrders: 1,
    });
    expect(decision).toEqual({ valid: false, reason: 'not_first_order' });
  });

  test('lets a returning buyer use a code with no first-order restriction', () => {
    const decision = promoValidationDecision({
      promo: referralPromo({ restrictions: {} }),
      ownerEmail: 'anna@example.com',
      buyerEmail: 'friend@example.com',
      buyerPriorPaidOrders: 3,
    });
    expect(decision.valid).toBe(true);
  });

  test('self-referral outranks a first-order pass — never leaks a different reason', () => {
    const decision = promoValidationDecision({
      promo: referralPromo(),
      ownerEmail: 'anna@example.com',
      buyerEmail: 'anna@example.com',
      buyerPriorPaidOrders: 2,
    });
    expect(decision.reason).toBe('self_referral');
  });
});

describe('describeDiscount', () => {
  test('reads a percentage coupon', () => {
    expect(describeDiscount({ percent_off: 30 })).toBe('30% off');
  });

  test('reads a fixed-amount coupon in euros', () => {
    expect(describeDiscount({ amount_off: 1000 })).toBe('€10 off');
    expect(describeDiscount({ amount_off: 1050 })).toBe('€10.50 off');
  });

  test('returns empty string when there is nothing to describe', () => {
    expect(describeDiscount(null)).toBe('');
    expect(describeDiscount({})).toBe('');
  });
});
