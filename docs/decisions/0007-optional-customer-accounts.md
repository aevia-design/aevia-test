# Decision: Optional customer accounts

**Date:** 2026-06-26
**Status:** Committed
**Extends:** ADR-0003 (retire my-order tracking page) — this is the "rebuild later, clean and function-backed" door ADR-0003 left open. It does NOT revive `my-order.html`.
**Relates to:** ADR-0002 (customer-preview token), ADR-0001 (staff Firebase auth), ideas.md "Customer account area" (2026-06-12), TO-DO #76 (promo codes).

## Context

Orders today have no real owner: a customer types an email at checkout, receives one tokenised preview link, and has no home — no status, no history, no way back to their book. We want an **optional** customer account: ordering without an account stays fully possible (no signup wall before the first order), but registering gives the customer a dedicated area to track order status, see history, manage addresses, and open the preview/approval interface for a book that's ready.

The decision matters because it touches identity/auth (a new surface we don't have on the customer side), the delicate token-gated preview/approve flow, and — for the address feature — checkout/Stripe. It also re-opens the door ADR-0003 deliberately left ("rebuild a clean function-backed page keyed on identity if tracking proves needed").

This is largely a **reversible** set of choices: Firebase Auth supports multiple sign-in methods on one account keyed to a stable uid, and the ownership model is a query strategy, not a destructive schema change. The one boundary worth deliberate thought is data retention (see Consequences).

## Options Considered

**Auth mechanism**
1. **Passwordless email link** — lowest friction, premium feel; per-login email round-trip; best for *rare* logins.
2. **Email + password (+ Google sign-in)** — the incumbent pattern (Papier, Milk Books); familiar, scales to frequent logins; Google removes most password friction.
3. **Both** — more surface than needed at launch.

**Account ↔ preview relationship**
1. **Augment the token flow** — `previewToken` links keep working for everyone; the account lists a customer's orders and links into the *same* `customer-preview.html` with the token supplied server-side. Preview/approve code untouched.
2. **Replace for registered users** — logged-in preview requires login (no token); two auth paths inside the delicate preview/approve functions.

**Order ↔ account ownership**
1. **Match by verified email** — account function queries `orders where email == <verified email>`. Guest orders auto-appear; promo eligibility falls out for free; zero schema change.
2. **Stamp `uid` on logged-in orders** — only signed-in orders belong; guest orders need explicit claiming.

## Decision

- **Auth: email + password, plus Google sign-in (option 2), on Firebase Auth.** Chosen for scalability — the founder intends photo books to be a starting point, not the ceiling, implying more products and more frequent logins over time. Passwordless is better for rare logins, which we are choosing not to assume. Because Firebase allows multiple providers on one account, passwordless can be added later with no migration.
- **Augment the token flow (option 1).** The account is a friendly directory in front of the existing `previewToken` mechanism, not a rewrite of it. `customer-preview.html` and all edit/approve functions stay token-based and untouched — far less risk to the hardest-to-get-right part of the system. The account-listing function authenticates by verified Firebase ID token, finds the user's orders, and hands back each order's preview link.
- **Match by verified email (option 1).** Email-based lookup is needed anyway for the first-order-promo gate, and it gives ownership continuity (including past guest orders) with no schema migration. A `uid` may additionally be stamped on new logged-in orders later for robustness, but email-match is the spine.
- **Scope is phased** (see brief): Phase 1 = auth + Orders + status + preview button; Phase 2 = address-into-checkout + promo redemption.

Key trade-offs:
- We gain: ownership/continuity, a status home, a scalable auth foundation, minimal change to the delicate preview flow.
- We accept: a customer-side auth surface to maintain; anyone who *verifies* an email sees every order placed to that email (acceptable — verification proves ownership); the build is bigger than the original "minimal spine."
- We assume: the existing `email` field on orders is reliable for matching; the preview/approve flow genuinely needs no change beyond being reachable from the account.

## Consequences

- **No Firestore rules hole reopens.** The account is admin-SDK-Cloud-Function-backed (same pattern as `customer-preview.html`), keyed on the verified ID token — the clean rebuild ADR-0003 envisioned. `my-order.html` stays retired.
- **Retention boundary (explicit).** We do NOT store books forever (a 1–4 GB order is costly to retain). Order *metadata* (number, template, status, dates) can persist in history indefinitely (cheap); the **editable preview + photo assets have a retention window**. "Open the editing interface once your book is ready" is therefore available *while the order is live / within retention*, not perpetually — after that the order still appears in history without a live preview. The exact window is set in the brief/Phase 2 (e.g. keep assets N days post-delivery, then purge). We do NOT promise "we never delete your projects."
- **Promo dependency.** First-order-promo eligibility (TO-DO #76) relies on the email-match lookup; the account and promo are designed as a pair even though built in sequence.
- **Reversible:** auth methods are additive (Firebase); ownership is a query, not a migration. The retention policy is the one choice to get roughly right up front, since purged assets can't be recovered.

## Next Steps

Brief via creating-briefs, scoped in two phases (Phase 1: auth + Orders + status + preview button; Phase 2: address-into-checkout + promo).
