# Brief: Promo Codes (F&F discount + Referral program)

**Created:** 2026-07-07
**Objective:** Enable Aevia to issue controlled discount codes at checkout — a capped friends-and-family test code now, and a proper per-customer referral program next — built on Stripe's native Coupons/Promotion Codes so the abuse guardrails are enforced by Stripe, not hand-rolled.
**Audience:** The developer (Claude) implementing it, and the owner (Evgeny) who creates the codes and tests them; non-technical, needs plain-language steps.
**Applicable Standards:** project `CLAUDE.md` conventions, `test-driven-development`, `reviewing-code`, cost-awareness rule (`CLAUDE.md`), `/stop-slop` for customer-facing copy.

## Why

Aevia is about to invite its first friends-and-family testers (see launch timeline: F&F trial ~Sep 2026) and wants to thank them with a discount. Separately, the business model (S111 brief `business-model-pricing-marketing.md`) leans on **organic and referral growth**, not paid ads, so a referral incentive is a make-or-break growth lever, not a nice-to-have. The owner's real concern is not "can we discount" but **control**: codes that never expire, leak publicly, get reused, or get stacked. Stripe's built-in Promotion Codes enforce every one of those limits server-side, so we get the guardrails for free instead of building and testing discount-validation logic ourselves. This brief also serves as the plan-of-record so the work can be paused and resumed cleanly.

## Approach (decided direction)

Use **Stripe Coupons + Promotion Codes**, not a custom promo store. Our checkout ([functions/index.js:717](functions/index.js#L717)) already uses Stripe hosted Checkout with a fixed Price, so enabling codes is one flag: `allow_promotion_codes: true`. Discount rules (percent off, caps, expiry, per-customer limit, first-order-only) are configured on the Stripe coupon/promotion-code object. Test and Live are fully separate Stripe environments; building/testing happens entirely in **Test (sandbox)** mode, and going live is a key swap (`functions/.env`) plus re-creating the coupons in the Live dashboard — not a re-implementation.

Delivered in two phases so the quick win isn't blocked by the bigger build. **Both phases are in scope now** — the owner wants the referral infrastructure in place *before* real orders start, when there won't be time to add features. Phase 2 is built step by step after Phase 1, not deferred.

**Account eligibility (referral, best-practice):** the two sides are asymmetric.
- **Referrer must have a verified Aevia account** — they need a stable home for their unique code and a place to receive the €10 reward; you cannot reliably reward an anonymous person. (Aevia accounts are optional per ADR-0007, so this does not force everyone to register — only those who want to refer.)
- **Referee does NOT need an account** — they redeem the code at guest checkout like any promo code and get €10 off. They only need an account later if they want to become a referrer themselves.
- Side benefit: this gently nudges account creation (good for growth) without blocking any guest purchase, and the referrer is already a registered customer by the time their reward applies.

### Phase 1 — F&F code (small, sandbox-first)
- Shared code (e.g. `FRIENDS30`), 30% off, capped by **both** `max_redemptions = 50` (total uses) and `expires_at = 2026-08-31` (end of August, for now), one code per order (Stripe default — no stacking), **book price only** (delivery, when it exists, stays full price).
- Only code change: add `allow_promotion_codes: true` to the Checkout session. The code itself is created by the owner in the Stripe **Test** dashboard. Nothing stored on our side.
- **"Book price only" is enforced on the coupon, not in code.** In the Stripe dashboard, set the coupon's `applies_to` to the book product only. Today the checkout has a single book line item ([functions/index.js:719](functions/index.js#L719)) and delivery is not yet a line item, so a coupon already only touches the book — but restricting `applies_to` now future-proofs it for when a delivery line/shipping fee is added. No code change for this.

### Phase 2 — Referral program (separate, larger build)
- **Reward (both sides get €10 off):** the **referee** (new customer) gets €10 off their first order when they redeem a referral code; the **referrer** (existing customer) gets €10 off their *next* order once the referred order is paid.
- **Reward model = one code per referral (NOT an accumulating wallet).** Each paid referral mints the referrer a separate single-use €10 Stripe promotion code. Because Stripe allows only one promotion code per checkout (no stacking), a referrer with two rewards uses them on two separate orders, €10 at a time — they do NOT combine into €20 on a single order. This was a deliberate choice (owner, S113): simpler and mostly Stripe-native, avoiding a self-managed credit ledger. If a true accumulating balance is wanted later, it's a separate build (track `referralCreditCents` on `customers/{email}` + mint a dynamic coupon at checkout) — noted, not in scope.
- **Eligibility:** referral codes are issued only to **verified account holders** (referrer). The referee redeems as a guest or account holder — no account required to get €10 off.
- A Cloud Function generates a **unique** Stripe promotion code per verified customer (backed by a €10 fixed-amount coupon, first-order-only for the referee), stores it on `customers/{email}`, and surfaces it in `account.html` for the customer to share. Draft copy (sample, needs `/stop-slop` pass before ship): *"Give a friend €10 off their first Aevia book — and get €10 off your next one. Share your code: `ANNA-7K2P`."*
- The existing `stripeWebhook` (`checkout.session.completed`, [functions/index.js:762](functions/index.js#L762)) is extended to attribute a referred paid order (which code was used → who referred) and then mint/attach the referrer's €10 reward code exactly once (idempotent).
- Guardrail: reward the referrer only after the referred order is **paid** (not merely placed), to avoid rewarding abandoned/cancelled orders.

**Data model + attribution (so a guest referee still links to a referrer):**
- New Firestore collection `referralCodes/{promotionCodeId}` → `{ referrerEmail, code, createdAt }`. This is the reverse index: given the Stripe promotion code that was used, find who owns it. (Also mirror `referralCode` onto the referrer's `customers/{email}` doc so `account.html` can display it.)
- On checkout, the referee (guest or account) redeems the code in Stripe's hosted field. In the `checkout.session.completed` webhook we read the promotion code actually used from the session (expand `discounts` / the session's promotion-code id), look it up in `referralCodes/{id}` → get `referrerEmail`. No account needed for the referee; the link travels via the Stripe promotion code, not the referee's identity.
- Stamp the referred order doc with `referredBy: referrerEmail` for audit.

**Idempotency (referrer reward issued exactly once):**
- Before minting the referrer's €10 reward, the webhook checks a `referrerRewardIssued: true` flag on the referred order doc; if already set, it skips. This mirrors the existing "order already paid, skipping" guard in `stripeWebhook` ([functions/index.js:803](functions/index.js#L803)) and protects against Stripe redelivering the event.

## Requirements Extracted from Standards

**From project `CLAUDE.md` conventions:**
- [ ] Plain HTML/CSS/JS only — no new frameworks, build steps, or runtime dependencies (Stripe SDK already present)
- [ ] Smallest change that solves it — Phase 1 is the one-line flag + dashboard coupon, nothing more
- [ ] Backend deploys are owner-triggered (`firebase deploy --only functions:...`); never deploy or run a real payment without explicit go-ahead
- [ ] Customer-facing copy (any code-field labels, account.html referral text, emails) gets a `/stop-slop` pass; no em dashes
- [ ] Secrets stay in `functions/.env` — never commit Stripe keys or the coupon config

**From cost-awareness rule:**
- [ ] No new always-on infra; reuse the existing `europe-west1` functions and the existing webhook (no new region, bucket, or Cloud Run)
- [ ] Flag any per-order cost impact in plain language (here: negligible — Stripe charges no extra fee for coupons; Phase 2's code-generation function is one lightweight write + one Stripe API call per verified customer, well under €1 total at F&F scale)

**From `test-driven-development` / `reviewing-code`:**
- [ ] Referral logic covered by unit tests (`tests/referral.test.js`, run with `npm test`) before wiring the UI, covering: (a) generated codes are unique, (b) referee first-order-only is enforced, (c) referrer reward issued exactly once per referred paid order, (d) reward skipped for cancelled/unpaid orders
- [ ] Idempotency preserved — the webhook must not double-issue a referrer reward if Stripe redelivers the event (it already guards double-payment; mirror that pattern)
- [ ] `npm test` stays green (currently 167/167)

## Constraints

- Format: changes to `functions/index.js` (checkout + webhook), `account.html` (Phase 2 UI), `functions/.env` (config only, not committed); brief + a short "how to create a coupon" note for the owner.
- Dependencies: existing Stripe integration (`stripe` SDK, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID_40/80`, `STRIPE_WEBHOOK_SECRET` in `functions/.env`), existing `stripeWebhook`, existing `customers/{email}` docs and `account.html` auth gate.
- Discount scope: **book price only** for both phases.
- Out of scope: stacking multiple codes; discounting delivery; a custom in-house promo database for Phase 1; any change of payment provider or new payment methods (SEPA/EPS is a separate future note, not this work); marketing/newsletter promo-codes (TO-DO #76 bundle) beyond these two use cases.

## Success Criteria

The deliverable is complete when:
0. **Phase 1 ships independently:** Phase 1 can go live to F&F testers on its own; Phase 2 is then built and tested step by step and deployed before real referral traffic — the two do not have to ship together.
1. **Phase 1 verified in sandbox:** owner enters `FRIENDS30` at Test-mode checkout, 30% comes off the book line, a Stripe test card completes payment, the order is marked paid, and the code stops working after its cap/expiry.
2. **Going-live path is a key-swap:** switching `functions/.env` to Live keys + re-creating the coupon in the Live dashboard makes it work in production with no code change.
3. **Phase 2 (when built):** a customer sees their unique referral code in `account.html`; a new customer redeeming it gets €10 off their first order; the referrer's €10 reward is issued exactly once per referred **paid** order (idempotent), backed by passing unit tests.
4. All requirements from standards are met and `npm test` is green.

## References

**Skills:** `creating-briefs`, `test-driven-development`, `reviewing-code`, `stop-slop-main`
**Code:** `functions/index.js` (`createCheckoutSession` L639, `stripeWebhook` L762), `pages/account.html`, `functions/.env` (Stripe config)
**Previous work:** `docs/briefs/business-model-pricing-marketing.md` (S111 — organic/referral growth rationale), `TO-DOS.md` #76 (deferred promo-code + newsletter bundle)

## Context

**Background decisions (from the shaping dialogue):**
- Custom promo engine was considered and rejected — Stripe natively covers expiry, `max_redemptions`, per-customer caps, and first-order-only, which are exactly the failure modes the owner named.
- F&F stays a **shared** code (owner is fine with this) because a low redemption cap + short expiry contains the only real risk (public leakage). Per-person codes were deemed unnecessary for ~a dozen testers.
- Referral is "proper" (per-customer codes + attribution), phased **after** F&F so the 20-minute win ships first.
- Stripe Test vs Live are separate worlds; sandbox testing is a true dress rehearsal.

**Known risks:**
- Test-mode coupons do NOT carry to Live — the owner must re-create them in the Live dashboard (document this so it isn't a surprise).
- Webhook idempotency is critical for Phase 2: Stripe can redeliver events, so referrer rewards must be issued exactly once.

## Open Questions
1. ~~Phase 1 cap / window~~ — **Resolved:** `max_redemptions = 50`, `expires_at = 2026-08-31` (end of August, for now).
2. ~~Referrer reward~~ — **Resolved:** both sides get **€10 off** (referee on first order, referrer on next order after the referred order is paid).
3. ~~When to build Phase 2~~ — **Resolved:** build now, step by step, right after Phase 1. Owner wants the referral infrastructure in place before real orders start; not deferred.
4. ~~Confirm `functions/.env` holds Test-mode keys~~ — **Resolved:** yes, it holds Test-mode keys, so Phase 1 needs no key change to test in sandbox.
5. **€10 floor check (Phase 2):** if both referrer and referee stack over time, or a €10 code applies to a low-value order, confirm the discount can't drive an order below Stripe's minimum charge or negative — Stripe clamps to €0, but we should decide whether a €10-off order is still worth fulfilling at ~€95 book price (it is; noting for completeness).
