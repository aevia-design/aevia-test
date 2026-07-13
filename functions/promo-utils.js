// Pure logic for promo-code validation on Aevia's own pay page (ADR-0008).
// No Stripe, no Firebase — extracted so it can be unit-tested with Jest
// (tests/promo.test.js). The wiring lives in functions/index.js: validatePromoCode
// answers the pay page's "Have a code?" field, and createCheckoutSession re-runs
// the same decision before attaching the code to the Stripe session.
//
// Stripe stays the source of truth for what a code IS (exists, active, % or € off,
// caps, expiry) — we only ADD the one check Stripe cannot make: reject a customer
// redeeming their own referral code. See docs/decisions/0008-*.

const { normalizeEmail } = require('./account-utils');

/**
 * Tidy a code the customer typed. Stripe codes are case-sensitive but always
 * created uppercase, so uppercasing is what people expect; inner spaces are a
 * paste artefact, never part of a code.
 *
 * @param {string} raw
 * @returns {string} normalized code, or '' when there is nothing usable
 */
function normalizePromoCode(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Decide whether a promotion code may be applied to this order.
 *
 * Stripe enforces all of these itself at checkout, but we check them up front so
 * the customer gets a clear message on OUR page instead of a failed session
 * create — except `self_referral`, which Stripe has no concept of and which is
 * the whole reason this flow exists.
 *
 * @param {object} args
 * @param {object|null} args.promo - the Stripe Promotion Code object, or null if
 *   no code with that name exists
 * @param {string|null} args.ownerEmail - referralCodes/{id}.referrerEmail — the
 *   customer this code was minted for. null for F&F/marketing codes (no owner).
 * @param {string} args.buyerEmail - the email on the order being paid
 * @param {number} [args.buyerPriorPaidOrders] - the buyer's other paid orders;
 *   >0 means they are not a first-time customer
 * @param {number} [args.nowMs] - injectable clock for tests
 * @returns {{valid: boolean, reason?: string}} reason is a machine key; the
 *   customer-facing wording lives in the page
 */
function promoValidationDecision({ promo, ownerEmail, buyerEmail, buyerPriorPaidOrders = 0, nowMs = Date.now() }) {
  if (!promo || promo.active === false) return { valid: false, reason: 'unknown_code' };
  if (promo.coupon && promo.coupon.valid === false) return { valid: false, reason: 'unknown_code' };

  if (promo.expires_at && promo.expires_at * 1000 <= nowMs) {
    return { valid: false, reason: 'expired' };
  }
  if (promo.max_redemptions && (promo.times_redeemed || 0) >= promo.max_redemptions) {
    return { valid: false, reason: 'used_up' };
  }

  // The check Stripe cannot do: a referral code belongs to someone, and that
  // someone must not be the person paying (QA S125, F-P1-03).
  const owner = normalizeEmail(ownerEmail);
  if (owner && owner === normalizeEmail(buyerEmail)) {
    return { valid: false, reason: 'self_referral' };
  }

  if (promo.restrictions && promo.restrictions.first_time_transaction && buyerPriorPaidOrders > 0) {
    return { valid: false, reason: 'not_first_order' };
  }

  return { valid: true };
}

/**
 * Human wording for the discount a code carries, for the "applied" confirmation
 * on the pay page. Stripe gives either a percent or a fixed amount in cents.
 *
 * @param {object|null} coupon - Stripe Coupon object
 * @returns {string} e.g. "30% off" or "€10 off"; '' when it can't be read
 */
function describeDiscount(coupon) {
  if (!coupon) return '';
  if (coupon.percent_off) return `${coupon.percent_off}% off`;
  if (coupon.amount_off) {
    const amount = coupon.amount_off / 100;
    const shown = Number.isInteger(amount) ? amount : amount.toFixed(2);
    return `€${shown} off`;
  }
  return '';
}

module.exports = {
  normalizePromoCode,
  promoValidationDecision,
  describeDiscount,
};
