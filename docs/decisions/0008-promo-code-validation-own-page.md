# Decision: Validate promo codes on Aevia's page, not in Stripe checkout

**Date:** 2026-07-13
**Status:** Committed (build pending owner go-ahead)

## Context

QA S125 (F-P1-03) confirmed a customer can redeem their **own** referral share code
for the €10 first-order discount. The self-referral guard only runs in the webhook,
after the discount has already applied, because the code is typed into Stripe's hosted
checkout page. Stripe has no native "deny one specific person" restriction (only
first-purchase-only, which self-referral passes, or lock-to-one-customer, the opposite
of what's needed). So the block cannot live in Stripe — it must live in our code,
upstream of the checkout session. This also connects to the F&F decision to hand out
unique per-person codes instead of a shared FRIENDS30.

## Options Considered

1. **Bound only** — leave self-referral possible, cap the loss with coupon
   max_redemptions + expiry. (Owner rejected: self-referral must be denied, not just
   capped.)
2. **Capture + validate on our page** — move promo-code entry onto Aevia's approve/pay
   page, validate server-side (reject if the code's owner email == the buyer's email),
   pre-apply the valid code to the session via `discounts:[…]`, and set
   `allow_promotion_codes:false` so no code can be typed inside Stripe.
3. **Webhook claw-back** — let the discount apply, then refund/flag on detection.
   (Rejected: money already moved; poor customer experience.)

## Decision

We chose **Option 2** because the block has to be ours (Stripe can't do it) and we
already hold every piece of data the check needs — the `referralCodes/{promotionCodeId}`
index maps a code to its owner's email, and the buyer's email is on the order.

- We gain: self-referral is **traced** (attempt logged on our side) and **denied**
  (the discount never reaches Stripe); and a single, uniform validation path for
  **all** promo codes — referral codes and the new unique F&F codes alike.
- We accept: a small change to the money path (one code field on the pay page, Stripe's
  own promo field turned off, one validation call), which needs a careful test pass —
  plain order, valid referral, and self-referral attempt all verified.
- We assume: promo codes are only ever redeemed at the approve/pay step (true today),
  so a single entry point covers every case.

## Consequences

- Enables decision #1: unique per-person F&F codes get validated by us on the same page.
- Rules out relying on Stripe's hosted promo field going forward (`allow_promotion_codes`
  goes to `false`).
- Revisit if promo redemption ever needs to happen somewhere other than the pay page.
- Build is money-path-sensitive → its own focused session with a regression test
  (extends the S118 first-order + Stripe-Customer work in `createCheckoutSession`).
