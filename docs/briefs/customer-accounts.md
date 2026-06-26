# Brief: Optional customer accounts

**Created:** 2026-06-26
**Objective:** Give customers an optional account — register to track order status, see history, manage addresses, and open the preview/approval interface for a ready book — while keeping guest ordering fully intact.
**Audience:** Developer (future Claude session or developer-agent) implementing on the Aevia codebase.
**Applicable Standards:** Aevia coding conventions (`CLAUDE.md`), `ARCHITECTURE.md` invariants, ADR-0007 (this feature's decision record), ADR-0002 (preview token), ADR-0003 (retired my-order page).

## Why

Orders today have no owner: a customer types an email at checkout, gets one tokenised preview link, and has no home — no status, no history, no way back. An optional account fixes that and gives Aevia a premium, repeat-customer relationship. It is the clean, function-backed rebuild ADR-0003 explicitly left the door open for (it does **not** revive `my-order.html`). The founder wants this to scale beyond photo books, so the auth foundation is chosen for growth, not just today's low frequency. Account + first-order promo (TO-DO #76) are designed as a pair.

## Key facts about the existing system (do not re-derive)

- **Customer auth today = possession of a `previewToken`.** Each order has a `previewToken` field; `customer-preview.html` calls `getOrder({orderNumber, token})`; all edit/approve functions in `functions/index.js` authenticate purely by that token (`.where('previewToken','==',token)`). No identity, no login on the customer side.
- **Orders already carry an `email` field** — the basis for matching orders to an account.
- **Staff auth (chunk-018, ADR-0001):** Firebase `signInWithEmailAndPassword` + server-side allowlist (`STAFF_EMAILS`) + ID-token verification via `isStaff()` in `functions/index.js`. Reuse this pattern (ID-token verify), NOT the allowlist (customers aren't allowlisted).
- **No shipping address is collected or stored today** — the order form takes email only; the address is collected by Stripe at checkout and lives in Stripe, not in Firestore. Address-in-account is therefore net-new plumbing (Phase 2).
- **Backend-first deploy discipline** (S40/S64): Cloud Functions must be deployed by the owner *before* the page reaches Cloudflare, or the live page breaks.
- **All customer data access goes through admin-SDK Cloud Functions** (ARCHITECTURE Invariant: never read Firestore directly from the browser — that's the rules hole ADR-0003 closed).

## Locked decisions (from ADR-0007)

- **Auth:** Firebase email + password, **plus Google sign-in**. (Passwordless deferred — addable later, no migration.)
- **Account ↔ preview:** **augment** the token flow. `customer-preview.html` and edit/approve functions stay token-based and untouched. The account is a directory in front of them.
- **Ownership:** **match by verified email** (`orders where email == verified email`). No order-schema migration. Guest orders with the same email appear automatically.
- **Retention boundary:** order *metadata* (number, template, status, dates) persists in history indefinitely; **editable preview + photo assets have a retention window** — "open editing once ready" is available only while the order is live / within retention. Do **not** promise "we never delete your projects." Exact window decided in Phase 2.

---

## PHASE 1 — Auth + Orders + status + preview button

The shippable spine. Lowest risk, clearest value.

### Requirements

**Auth & identity**
- [ ] Firebase Auth enabled for customers with **email+password and Google** providers (authorized domains configured for `aevia-test.pages.dev` + target domain).
- [ ] New `pages/account.html` (or equivalent) with register / sign-in / sign-out, built to the Aevia type system (`assets/css/type.css`) and brand (serif/editorial, off-white/near-black); mobile + 375px reflow.
- [ ] Registration is **optional and never blocks ordering** — no signup wall anywhere in the order flow.
- [ ] Session persists (Firebase default) so returning customers are usually already signed in.

**Account area (IA: Personal info · Orders · Address book)**
- [ ] Left-rail account layout with sections **Personal info**, **Orders**, and **Address book** (Papier-style, less granular). Address book may be a present-but-empty/"coming soon" placeholder in Phase 1; it is built in Phase 2.
- [ ] **Personal info:** name + email shown; sign-out. (No DOB/wedding-date — those are Papier's, not ours.)
- [ ] **Orders:** lists the signed-in customer's orders with order number, template/collection, a clear **status label**, and key dates.

**Orders data & status (the heart)**
- [ ] New admin-SDK Cloud Function (e.g. `getMyOrders`) authenticated by **verified Firebase ID token**; returns orders where `email == decoded.email` (normalised lower-case/trimmed). Never reads Firestore from the browser.
- [ ] Status line derived from existing order `status`/`statusHistory` (e.g. Designing → Ready for preview → Approved → In production → Shipped). Reuse existing fields; do not invent a parallel status store.
- [ ] When an order is **ready for preview**, the Orders row shows a **"Preview" button** that opens the existing `customer-preview.html` with the order's `previewToken` supplied **server-side** (the function returns the link or token for orders the verified user owns). Preview/approve code stays untouched.
- [ ] "Ready for preview" notification email to a **registered** customer links to the account area; **guests continue to receive the raw tokenised link unchanged**.

**Standards/conventions**
- [ ] Plain HTML/CSS/JS, no frameworks/build tools; nav/footer copied from an existing page; "Account" entry added to the shared footer on all customer pages.
- [ ] All new Cloud Functions in `europe-west1` (region/data-residency parity, ADR-0006); CORS handled like sibling functions.
- [ ] Unit tests for the email-match/ownership logic (pure logic extracted, mirror the `derivative-utils.js` test pattern); `npm test` green.
- [ ] Backend-first: functions deployed by owner before the page merges to `main`.

### Phase 1 success criteria
1. A customer can register/sign in (email+password or Google), see their orders with a correct status label, and open a ready order's preview from the account — with no token in the URL they had to find.
2. Guest ordering and the existing emailed-token preview/approve flow are completely unchanged (verified).
3. No Firestore rules hole reopens (all access via admin-SDK functions, ID-token verified).
4. All requirements above met; tests green; verified on desktop + 375px with a clean console.

---

## PHASE 2 — Address-into-checkout + promo redemption

Fast-follow once Phase 1 ships.

### Requirements
- [ ] **Decide where shipping address lives** (Firestore order vs. continue via Stripe) and document it — this is the open architectural question, since address is collected by Stripe today.
- [ ] **Address book** in the account: add/edit/list saved shipping addresses (fields per Papier: Country, Full name, Address 1, Address 2, County, City, Postcode). Reuse a saved address at checkout.
- [ ] Address flows into fulfilment correctly (the actual shipping label / order record), not just stored cosmetically.
- [ ] **Retention policy decided + implemented:** the window after which preview/photo assets are purged (order history metadata retained). Update copy so no perpetual-storage promise is made.
- [ ] **Promo redemption** (depends on TO-DO #76): first-order promo granted on registration; eligibility checks the email-match lookup so a returning guest with the same email is not treated as first-order; redemption wired at Stripe checkout.

### Phase 2 success criteria
1. A signed-in customer can save an address and have it apply at checkout and reach fulfilment.
2. Preview/photo assets are purged on the agreed retention schedule; order history persists; no copy promises forever-storage.
3. First-order promo works end-to-end with correct eligibility; all requirements met; tests green.

---

## Constraints
- Format: new `pages/account.html` + new Cloud Function(s) in `functions/index.js`; no new frameworks, dependencies, or build steps.
- Augment only — do **not** modify `customer-preview.html` auth or the edit/approve functions.
- No order-schema migration in Phase 1.
- Out of scope: saved designs, event reminders, favourites, loyalty points/credit (Papier extras we are not adopting now); passwordless sign-in; any change to guest flow.

## References
- **Decision:** `docs/decisions/0007-optional-customer-accounts.md`
- **Related ADRs:** `0001` (staff auth), `0002` (preview token), `0003` (retired my-order, the door this opens), `0006` (EU region).
- **Idea origin:** `ideas.md` → "Customer account area / my-orders dashboard" (2026-06-12).
- **Foundation:** `docs/briefs/order-flow-hardening.md` (clean status data the Orders view depends on).
- **Patterns to mirror:** `isStaff()`/ID-token verify + `getOrder` (auth & order lookup) in `functions/index.js`; `functions/derivative-utils.js` (+ its tests) for pure-logic-with-tests; `pages/staff/dashboard.html` (Firebase client auth wiring); `assets/css/type.css` (type system).
- **Promo:** TO-DO #76.

## Context / known risks
- **Order-flow-hardening dependency:** the captured idea assumed the order-flow-hardening chunks land first so the Orders view shows clean status, not flakiness. Confirm their state before building Phase 1; if status data is unreliable, harden it first or the account surfaces the very flakiness we're escaping.
- **Email-trust caveat (accepted):** anyone who verifies an email sees all orders placed to it. Acceptable — verification proves ownership; order content isn't more sensitive than the email it was sent to.
- **Backend-first or the live account breaks** — deploy functions before the page reaches Cloudflare.
- **Scale intent:** auth chosen (password + Google) for growth beyond photo books; keep the account IA extensible behind the left-rail so promo/credit/etc. slot in later.
