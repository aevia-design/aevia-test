// Unit tests for the referral-program pure logic (promo codes Phase 2).
// See docs/briefs/promo-codes.md. The Stripe/Firestore wiring lives in
// functions/index.js (getMyReferralCode + stripeWebhook) and is not tested
// here — these tests cover the decisions and parsing that wiring relies on.

const {
  generateReferralCode,
  extractPromotionCodeId,
  referrerRewardDecision,
} = require('../functions/referral-utils');

describe('generateReferralCode', () => {
  test('builds NAME-XXXX from the first name, uppercased', () => {
    const code = generateReferralCode('Anna Gruber');
    expect(code).toMatch(/^ANNA-[A-Z2-9]{4}$/);
  });

  test('strips non-letters from the name part', () => {
    const code = generateReferralCode("  anne-marie o'brien ");
    expect(code.startsWith('ANNEMA-')).toBe(true); // capped at 6 letters
  });

  test('falls back to AEVIA when the name is unusable', () => {
    expect(generateReferralCode('')).toMatch(/^AEVIA-[A-Z2-9]{4}$/);
    expect(generateReferralCode(null)).toMatch(/^AEVIA-[A-Z2-9]{4}$/);
    expect(generateReferralCode('!!!')).toMatch(/^AEVIA-[A-Z2-9]{4}$/);
  });

  test('suffix avoids ambiguous characters (no I, L, O, 0, 1)', () => {
    // Drive the random source through the whole alphabet range.
    for (let i = 0; i < 50; i++) {
      const suffix = generateReferralCode('Anna', () => i / 50).split('-')[1];
      expect(suffix).not.toMatch(/[ILO01]/);
    }
  });

  test('different random values give different codes (uniqueness comes from the suffix)', () => {
    const a = generateReferralCode('Anna', () => 0.1);
    const b = generateReferralCode('Anna', () => 0.9);
    expect(a).not.toBe(b);
  });

  test('deterministic given a fixed random source', () => {
    const a = generateReferralCode('Anna', () => 0.5);
    const b = generateReferralCode('Anna', () => 0.5);
    expect(a).toBe(b);
  });
});

describe('extractPromotionCodeId', () => {
  test('reads the promotion-code id from total_details.breakdown (expanded session)', () => {
    const session = {
      total_details: {
        breakdown: {
          discounts: [{ discount: { promotion_code: 'promo_123' } }],
        },
      },
    };
    expect(extractPromotionCodeId(session)).toBe('promo_123');
  });

  test('handles an expanded promotion_code object (id field)', () => {
    const session = {
      total_details: {
        breakdown: {
          discounts: [{ discount: { promotion_code: { id: 'promo_456' } } }],
        },
      },
    };
    expect(extractPromotionCodeId(session)).toBe('promo_456');
  });

  test('falls back to the session discounts array', () => {
    const session = { discounts: [{ promotion_code: 'promo_789' }] };
    expect(extractPromotionCodeId(session)).toBe('promo_789');
  });

  test('returns null when no discount was applied', () => {
    expect(extractPromotionCodeId({})).toBeNull();
    expect(extractPromotionCodeId({ total_details: { breakdown: { discounts: [] } } })).toBeNull();
    expect(extractPromotionCodeId(null)).toBeNull();
  });
});

describe('referrerRewardDecision', () => {
  const base = {
    paymentStatus: 'paid',
    order: { email: 'friend@example.com' },
    referral: { referrerEmail: 'anna@example.com' },
  };

  test('issues the reward for a paid, referred order', () => {
    const d = referrerRewardDecision(base);
    expect(d.issue).toBe(true);
    expect(d.referrerEmail).toBe('anna@example.com');
  });

  test('skips when no referral code was used (normal order)', () => {
    const d = referrerRewardDecision({ ...base, referral: null });
    expect(d.issue).toBe(false);
    expect(d.reason).toBe('no_referral');
  });

  test('skips unpaid / cancelled sessions — reward only on real payment', () => {
    for (const status of ['unpaid', 'no_payment_required', undefined]) {
      const d = referrerRewardDecision({ ...base, paymentStatus: status });
      expect(d.issue).toBe(false);
      expect(d.reason).toBe('not_paid');
    }
  });

  test('issued exactly once — skips when the order is already rewarded (webhook redelivery)', () => {
    const d = referrerRewardDecision({
      ...base,
      order: { email: 'friend@example.com', referrerRewardIssued: true },
    });
    expect(d.issue).toBe(false);
    expect(d.reason).toBe('already_issued');
  });

  test('skips self-referral (customer using their own code)', () => {
    const d = referrerRewardDecision({
      ...base,
      order: { email: 'Anna@Example.com ' }, // un-normalised on purpose
    });
    expect(d.issue).toBe(false);
    expect(d.reason).toBe('self_referral');
  });

  test('skips when the referral record has no referrer email (corrupt index entry)', () => {
    const d = referrerRewardDecision({ ...base, referral: {} });
    expect(d.issue).toBe(false);
    expect(d.reason).toBe('no_referral');
  });
});
