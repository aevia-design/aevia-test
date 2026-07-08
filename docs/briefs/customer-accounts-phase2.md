# Brief: Customer Accounts Phase 2 — Address into checkout

**Created:** 2026-06-29
**Objective:** Capture the customer's shipping address at Stripe checkout, persist it in Firestore, surface it read-only in account.html, and pre-fill it on subsequent checkouts so repeat customers never retype their address.
**Audience:** Developer (future Claude session or developer-agent) implementing on the Aevia codebase.
**Applicable Standards:** Aevia coding conventions (`CLAUDE.md`), `ARCHITECTURE.md` invariants, ADR-0007, Phase 1 brief (`docs/briefs/customer-accounts.md`).

## Why

Phase 1 gave customers an account and an Orders view. Phase 2 makes the account functionally useful for repeat customers: Aevia's premium positioning means every touchpoint should feel considered, and having to retype a shipping address on a second order is a small but real friction. More practically, Aevia staff need the delivery address to ship the finished book — right now that lives only inside Stripe's dashboard and requires a manual lookup per order. Storing it in Firestore makes it accessible alongside the order, without a Stripe API call at fulfilment time.

## What was decided and why

Three options were evaluated (solutioning, Session 90):

- **Option A — Firestore-owned:** capture at Stripe checkout, save to Firestore via webhook, pre-fill future checkouts. ✅ Chosen.
- **Option B — Stripe-owned (read-only display):** retrieve address from Stripe PaymentIntent per order, display in account.html. Rejected — the webhook currently saves zero Stripe data, so B requires as much new wiring as A but only delivers display, not pre-fill.
- **Option C — Stripe Customer object:** create a Stripe Customer per user, store addresses there. Rejected — over-engineered for current volume; adds Stripe as a second system of record for customer data.

**Chosen approach:** A. Address is the simplest structured data Aevia can own. GDPR surface is unchanged in practice (Stripe stores the same field; we already hold names, emails, photos). Address stored under the user's Firestore document, keyed by verified email.

## Key facts about the existing system (do not re-derive)

- **Stripe checkout** is created in `createCheckoutSession` (~line 686 in `functions/index.js`). Today it sets `mode`, `line_items`, `success_url`, `cancel_url`, and `metadata.orderNumber` + `metadata.token`. No `shipping_address_collection`, no customer pre-fill.
- **`stripeWebhook`** handles `checkout.session.completed`. Today it saves only `status:'paid'`, `paidAt`, `statusHistory` to the order doc. It does NOT read or save anything from the Stripe session object (no address, no session ID, no payment intent ID).
- **User documents** in Firestore: Phase 1 did not create explicit user documents — `getMyOrders` matches orders by `decoded.email`. A user document at `users/{uid}` (or `customers/{email}`) will need to be created/upserted to hold the address.
- **`getMyOrders`** is the existing authenticated Cloud Function (verified ID token, returns orders for `decoded.email`). It is the right pattern to extend or mirror for returning the saved address.
- **`customer-preview.html`** and the token-based edit/approve flow must not be touched.
- **`order.html`** token flow must not be touched.
- **Backend-first deploy discipline** — functions must be deployed by the owner before the updated page reaches Cloudflare.
- **Never render PDFs locally** (egress cost).

## Requirements

**Stripe checkout — capture address**
- [ ] Add `shipping_address_collection: { allowed_countries: ['AT', 'DE', 'CH', ...] }` to the `createCheckoutSession` Stripe session (country list to be confirmed with Evgeny — start with AT/DE/CH/GB as minimum).
- [ ] The existing `metadata.orderNumber` in the session must be preserved (webhook uses it to look up the order).

**Webhook — persist address**
- [ ] On `checkout.session.completed`, read `session.shipping_details.address` (or `session.customer_details.address` — confirm which field Stripe populates for `shipping_address_collection`).
- [ ] Save the address to the **order document** in Firestore (`orders/{orderNumber}`) so staff can see it alongside the order.
- [ ] Save the address to a **user document** in Firestore (e.g. `users/{uid}` or keyed by normalised email) so it can be retrieved for pre-fill. If the user isn't signed in at checkout, save by email and match on next login.
- [ ] The existing `status:'paid'` / `paidAt` / `statusHistory` update must be preserved unchanged.
- [ ] Address save is idempotent — if webhook fires twice (Stripe may redeliver), the second write is safe.

**`getMyAddress` (new Cloud Function or extension)**
- [ ] New callable or HTTP function authenticated by verified Firebase ID token.
- [ ] Returns the saved address for the authenticated user (look up by `decoded.email` or `decoded.uid`).
- [ ] Returns `null` (not an error) if no address is saved yet — the UI handles the empty state.
- [ ] Follows the same auth pattern as `getMyOrders` (admin SDK, ID token verify).

**`createCheckoutSession` — pre-fill address**
- [ ] If a saved address exists for the authenticated user, pass it to the Stripe session via `customer_details` or the appropriate pre-fill mechanism (verify Stripe API field — likely `customer_email` + shipping pre-fill or a Stripe Customer object per session).
- [ ] If no saved address, session creates normally with no pre-fill (existing behaviour preserved).
- [ ] Pre-fill is best-effort — never block or error if address lookup fails.

**`account.html` — address display**
- [ ] The "Address book" section (placeholder in Phase 1) now shows the saved address read-only.
- [ ] Empty state: friendly message ("Your address will appear here after your first order.").
- [ ] No edit UI in Phase 2 — display only. Editing is a future phase.
- [ ] Styled to match the existing account.html Aevia type system and layout.

## Constraints

- **Do not touch** `customer-preview.html`, the token-based approve/edit functions, or `order.html`.
- **Backend-first** — deploy all new/changed functions before pushing the updated `account.html` to Cloudflare.
- **No new npm dependencies** without asking first.
- **No address edit UI** in this phase — read-only display only.
- **Country list** for `shipping_address_collection` needs Evgeny's confirmation before deploying (default: AT, DE, CH, GB).
- Cost: Firestore reads/writes for address are negligible (one read per checkout page load, one write per payment). No egress concern.

## Success criteria

The deliverable is complete when:

1. A customer completes a Stripe checkout and their shipping address appears in `account.html` without any manual step.
2. On a second checkout, the Stripe address form is pre-filled with the saved address (customer can still edit it at Stripe's hosted page).
3. The order document in Firestore has the address field — staff can see it on the dashboard without opening Stripe.
4. The existing checkout, preview, approve, and PDF flows are unchanged and passing all tests.
5. All requirements above are met and `npm test` passes.

## Open question (confirm before building)

**Which countries to enable for `shipping_address_collection`?** Aevia ships physical books. A wrong list blocks real customers at checkout. Confirm with Evgeny before the function is deployed. Suggested starting list: `['AT', 'DE', 'CH', 'GB', 'NL', 'BE', 'FR', 'IT']` (DACH + Western Europe).

## References

- Phase 1 brief: `docs/briefs/customer-accounts.md`
- ADR-0007: `docs/decisions/0007-optional-customer-accounts.md`
- Existing Stripe integration: `functions/index.js` lines ~660–803 (`createCheckoutSession` + `stripeWebhook`)
- Existing auth pattern: `getMyOrders` in `functions/index.js`
- Account page: `pages/account.html`
