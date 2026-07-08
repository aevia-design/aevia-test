// Pure logic for the referral program (promo codes Phase 2).
// No Stripe, no Firebase — extracted so it can be unit-tested with Jest
// (tests/referral.test.js). The wiring lives in functions/index.js:
// getMyReferralCode mints the share code, stripeWebhook attributes referred
// paid orders and issues the referrer's reward. See docs/briefs/promo-codes.md.

const { normalizeEmail } = require('./account-utils');

// Unambiguous alphabet for the code suffix — no I, L, O, 0, 1, so a code read
// aloud or scribbled on paper still types back in correctly.
// KNOWN LIMITATION (reviewer, S115): 4 chars from 31 ≈ 900k combinations per
// prefix — fine at F&F scale, but enumerable if the programme grows to
// thousands of codes. Revisit suffix length (6+) before any public scale-up.
const SUFFIX_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Build a shareable referral code like "ANNA-7K2P" from a customer name.
 * Prefix = the FIRST name's letters (letters only, uppercased, max 6); falls
 * back to "AEVIA" when the name gives us nothing. Suffix = 4 random characters.
 * Uniqueness is enforced by Stripe (promotion-code codes are unique per
 * account) — the caller retries with a fresh suffix on a collision.
 *
 * @param {string} name - customer display name
 * @param {() => number} [rand] - random source in [0,1), injectable for tests
 * @returns {string}
 */
function generateReferralCode(name, rand = Math.random) {
  const firstWord = (typeof name === 'string' ? name.trim() : '').split(/\s+/)[0] || '';
  const letters = firstWord.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);
  const prefix = letters || 'AEVIA';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += SUFFIX_ALPHABET[Math.floor(rand() * SUFFIX_ALPHABET.length) % SUFFIX_ALPHABET.length];
  }
  return `${prefix}-${suffix}`;
}

/**
 * Read the id of the promotion code actually used on a Checkout Session.
 * Primary shape: session retrieved with expand ['total_details.breakdown'] —
 * discounts[].discount.promotion_code (string id, or object when expanded).
 * Fallback: a top-level discounts array (create-time shape). Returns null when
 * no code was applied.
 *
 * @param {object} session - Stripe Checkout Session
 * @returns {string|null}
 */
function extractPromotionCodeId(session) {
  if (!session) return null;
  const fromBreakdown = session.total_details?.breakdown?.discounts?.[0]?.discount?.promotion_code;
  const fromDiscounts = session.discounts?.[0]?.promotion_code;
  const pc = fromBreakdown || fromDiscounts || null;
  if (!pc) return null;
  return typeof pc === 'string' ? pc : (pc.id || null);
}

/**
 * Decide whether the referrer's €10 reward should be issued for this order.
 * Rules (docs/briefs/promo-codes.md):
 *  - only for genuinely PAID sessions (never abandoned/cancelled),
 *  - only when the code used maps to a known referrer (referralCodes index),
 *  - exactly once per order (referrerRewardIssued flag = webhook-redelivery guard),
 *  - never for self-referral (customer redeeming their own code).
 *
 * @param {object} args
 * @param {string} args.paymentStatus - Stripe session.payment_status
 * @param {object} args.order - the referred order doc (email, referrerRewardIssued)
 * @param {object|null} args.referral - referralCodes/{id} doc data, or null if unknown code
 * @returns {{issue: boolean, reason?: string, referrerEmail?: string}}
 */
function referrerRewardDecision({ paymentStatus, order, referral }) {
  if (paymentStatus !== 'paid') return { issue: false, reason: 'not_paid' };
  const referrerEmail = normalizeEmail(referral && referral.referrerEmail);
  if (!referrerEmail) return { issue: false, reason: 'no_referral' };
  if (order && order.referrerRewardIssued) return { issue: false, reason: 'already_issued' };
  if (normalizeEmail(order && order.email) === referrerEmail) {
    return { issue: false, reason: 'self_referral' };
  }
  return { issue: true, referrerEmail };
}

module.exports = {
  generateReferralCode,
  extractPromotionCodeId,
  referrerRewardDecision,
};
