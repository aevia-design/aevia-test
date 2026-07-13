# Pre-Launch QA — Findings: P1 promo / payment track (S125, 2026-07-13)

Live dev site, Stripe **test mode** — no real money moved. New scripts:
`qa/p1-promo-referrer.mjs`, `qa/p1-promo-pay.mjs`, `qa/p1-promo-stripe.mjs` (read-only Stripe
probe). `qa/p0-1-template.mjs` gained a `QA_TAG` env override so two orders can share one
customer email — required by P1-2.

## Verdicts

| ID | Case | Verdict |
|----|------|---------|
| **P1-1** | Share code on referee's **first** paid order | **PASS** — −€10, reward email fired, `THANKS-` code in referrer's account. But see F-P1-01: a brand-new referrer can't reach their code at all. |
| **P1-2** | **Same referee email**, 2nd paid order | **PASS** — Stripe refused it: *"This promotion code can only be used for your first purchase."* The S118 fix holds. |
| **P1-3** | `FRIENDS30` | **FAIL** — code is dead. Stripe: *"This code is invalid"*. See F-P1-02. |
| **P1-4** | No-code order | **PASS** — €70, `paid`, payment email. No regression. |

**Extra finding, not in the catalogue: F-P1-03 — a customer can redeem their own referral code
for €10 off their own first order.** Verified end to end.

Orders minted (AEV-053…057 untouched): AEV-060 (P1-1, →€60), AEV-061 (P1-3, rejected, €70),
AEV-062 (P1-2, rejected, €70), AEV-063 (P1-4, €70), AEV-064 (self-referral, →€60).
Referrer: `kidkd.p1refmrj7hr3z@inbox.testmail.app`, share `RITA-Q5A3`, reward `THANKS-WQD5`.

---

## 🟠 F-P1-01 (S2) — A newly verified referrer cannot get their share code; the panel shows the raw word "unverified"

Sign up → verify → click *"I've verified — refresh"* → **Refer a friend** prints a one-word
error: **`unverified`**. Signing out and back in makes the code appear instantly. This is the
first thing every new referrer does, and it gates the whole programme.

**Root cause.** `getMyReferralCode` gates on the `email_verified` claim *inside the ID token*
(`functions/index.js:1600-1602` → `403 {error:'unverified'}`). Right after verification the
cached token still carries `email_verified:false`; `user.reload()` refreshes the user record,
not the token claims. `loadOrders` already knows this and force-refreshes, with a comment
saying exactly why — the fix was applied to one of three callers:

- `pages/account.html:502` — `await user.getIdToken(true)` ← loadOrders, refreshed
- `pages/account.html:523` — `await user.getIdToken()` ← **loadReferral, not refreshed**
- `pages/account.html:568` — `await user.getIdToken()` ← **loadAddress, same pattern**

Secondary defect, same path: `pages/account.html:530` renders the server's error *token*
straight into the UI, so the customer literally reads "unverified". `loadOrders` prefers
`data.message` (`:509`); `getMyReferralCode` never sends one.

**Proved it's the product, not the harness:** same account, same script, same clicks; only a
fresh sign-in differs. Run 1 → `"unverified"`. Run 2 (`--check`, fresh sign-in) →
`✅ Share code: RITA-Q5A3`.

**Repro:** `node qa/p1-promo-referrer.mjs` (fails), then `node qa/p1-promo-referrer.mjs --check` (passes).
**Artefacts:** `sessions/qa-runs/2026-07-13-p1-promo-referrer/` (`01-referral-panel.png`, `check-referral-panel.png`, `run-log.txt`).

## 🟠 F-P1-02 (S2) — `FRIENDS30` is exhausted: the promotion code is capped at 1 redemption, not 50

Entering `FRIENDS30` returns **"This code is invalid"**. The F&F code intended for ~a dozen
testers is already spent. **Root cause is Stripe dashboard config, not code** — the cap went on
the *coupon* but the *promotion code* was created with `max_redemptions: 1`:

| Object | id | Cap | Used | State |
|---|---|---|---|---|
| Coupon "FRIENDS" | `g8nKCsdz` | 30% off, `max_redemptions: 50`, `redeem_by 2026-08-31` | 1 / 50 | valid |
| Code `FRIENDS30` | `promo_1TqaaPQTOyUEPAeZ5zMMn3AY` | **`max_redemptions: 1`** | **1 / 1** | **`active: false`** |

The coupon has 49 redemptions left; the code that reaches them is closed.
`docs/briefs/promo-codes.md:24` specifies 50. The single redemption is the owner's own Phase-1
sandbox test on 2026-07-07.

**Beyond test mode:** test coupons don't carry to Live, so the owner must re-create FRIENDS30
there — same field to get right. Stripe enforces the tighter of the two caps.

**Fix (owner, Stripe dashboard, no code change):** create a *new* promotion code on coupon
`g8nKCsdz` with `max_redemptions: 50` (or unlimited, letting the coupon's 50 cap it), expiry
2026-08-31. `FRIENDS30` cannot be reopened — `max_redemptions` is immutable once set.

**Repro:** `node qa/p1-promo-stripe.mjs FRIENDS30`, then `node qa/p1-promo-pay.mjs AEV-061 p1fr306310 FRIENDS30`.
**Artefacts:** `sessions/qa-runs/2026-07-13-p1-promo-pay-AEV-061-FRIENDS30/03-code-applied.png`.

## 🟠 F-P1-03 (S2) — A customer can redeem their **own** referral code for €10 off their **own** first order

Register → verify → collect share code → place your first order → enter your own code. Stripe
accepts: **€70 → €60**. Verified on AEV-064 using the referrer's own account email.

The *reward* is correctly withheld, so the loss caps at €10 once per person — but this is not a
referral programme, it's an uncapped, non-expiring **"€10 off your first order for anyone who
signs up"** that nobody decided to launch.

**Root cause.** The share code's only guard is Stripe's `first_time_transaction`
(`functions/index.js:1633`), which asks *"has this Stripe Customer paid before?"* — not *"is
this someone other than the referrer?"* A referrer who has never bought passes it against their
own code. The self-referral check exists only on the **reward** side
(`functions/referral-utils.js:81-83`, `reason:'self_referral'`), which runs in the webhook
*after* the discount already applied at checkout.

**What is working (don't "fix" this bit):** after AEV-064 the referrer still had exactly **one**
reward email and **one** `THANKS-` code. The self-referral guard held; only the referee-side €10
leaked.

**Owner decision, not an obvious code fix:** either accept it as a signup discount — but then
cap/expire the referral coupon, currently `max_redemptions: null`, `redeem_by: null`
(open-ended liability) — or block it server-side, which is awkward because the code is entered
*inside* hosted Checkout after the session exists, so it likely needs the code field moved onto
an Aevia page.

**Repro:** `node qa/p1-promo-pay.mjs AEV-064 p1refmrj7hr3z RITA-Q5A3`.
**Artefacts:** `sessions/qa-runs/2026-07-13-p1-promo-pay-AEV-064-RITA-Q5A3/03-code-applied.png`.

---

## What worked (evidence, so it isn't re-tested)

- **P1-1 end to end.** AEV-060: Subtotal €70.00 → *"−€10.00 · €10.00 off"* → Total due
  **€60.00** → `paid` → payment email → referrer got *"You earned 10 € off your next Aevia
  book"* within ~40s → `THANKS-WQD5` minted (`max_redemptions:1`, no first-time restriction —
  correct, the referrer is a returning buyer) → visible under **Your rewards**.
- **P1-2, the known-suspect gap: closed.** The Stripe-Customer attach
  (`functions/index.js:803-813`, `:835`) is what binds it — the customer created on order 1 has
  a charge by order 2, so `first_time_transaction` fails.
- **Idempotency.** Across five orders the referrer accumulated exactly one reward email and one
  reward code.

## Ruled out

- **`p0-2-preview.mjs AEV-062` failed once with `page.fill: Timeout 30000ms`** on dashboard
  login — harness/environment flake while a parallel run held a second dashboard session;
  immediate re-run passed with 0 findings.
- **The pay script logged `discount=null` on a successful −€10** — cosmetic regex miss in the
  test script; Stripe renders "−€10.00 / €10.00 off", not "Discount". The `total` (70.00→60.00)
  is the reliable signal.
- **`THANKS-` codes carry no Stripe `customer` binding** — single-use, and it's the referrer's
  own €10 to give away. By design.
- **Stripe console warnings** (link/klarna/amazon_pay not activated) and dashboard `getPdfUrl`
  "Failed to fetch" noise — already ruled out in `findings_v1.md`.

## Could not test

- **The 30% arithmetic of FRIENDS30.** The code is dead, and minting a QA sibling on the same
  coupon would write to the shared Stripe account. Mitigation: the discount plumbing *is* proven
  (`allow_promotion_codes` renders the field; a fixed-amount coupon applied and settled). Only
  the percent-off maths is unverified, and it's Stripe-native. **Re-run P1-3 once the owner
  creates a working code.**
- **The DB-side first-time guard** (`countPriorPaidOrders`, `functions/index.js:883`; decision
  at `referral-utils.js:84`) never fired — Stripe rejected the code at checkout first.
  Belt-and-braces behind a working Stripe restriction; still unexercised in production
  conditions (unit tests cover it).
