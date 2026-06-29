# Brief: Customer Accounts Phase 2b — Aevia-owned address form

**Created:** 2026-06-29
**Objective:** Let signed-in customers enter and edit their shipping address in an Aevia-owned form in account settings, save it to Firestore, and use it at checkout so they never retype it — while guests continue to enter their address on Stripe's hosted checkout page.
**Audience:** Developer (future Claude session or developer-agent).
**Applicable Standards:** `CLAUDE.md`, `ARCHITECTURE.md` invariants, ADR-0007, Phase 2 brief (`docs/briefs/customer-accounts-phase2.md`).

## Why

Phase 2 (S90) stored the shipping address but let **Stripe's hosted page** own the entry form; the account "Address book" is display-only. Evgeny's intent (and the competitor pattern — Papier collects address on its own pages) was for **Aevia** to own the form: editable in account settings. This also fixes the pre-fill bug found in review — `shipping_details` is read-only on Stripe session creation, so true pre-fill requires Aevia to hold the address and pass it to Stripe itself.

## Decision (solutioning, S90)

Guests and signed-in users are treated differently, deliberately:
- **Signed-in users** → Aevia-owned editable address form in account settings. Saved to Firestore. Passed to Stripe at checkout so they don't retype.
- **Guests** → Stripe's hosted checkout collects the address (existing, working). No new UI on the protected token/preview flow. If they later sign up with the same email, the address is already in their account.

Guest option B (address form on `customer-preview.html`) was **rejected** — it would put new logic inside the protected token-based preview/approve flow (augment-only invariant). Option C (collect in order form up front) rejected — premature, stale-prone.

## Requirements

**Account address form (`account.html`)**
- [ ] Address book panel gains an **editable form**: full name, street line 1, street line 2 (optional), city, postal code, region/state (optional), country.
- [ ] Country is **fixed to Austria** for now (label or single-option select), matching the existing "Austria only" note.
- [ ] Pre-populates from the saved address if one exists (`getMyAddress`); otherwise empty for first entry.
- [ ] Save button writes via a new function; shows success/error feedback inline.
- [ ] Styled to match account.html (Aevia type system, existing panel layout).

**New `saveMyAddress` Cloud Function**
- [ ] Authenticated by verified Firebase ID token + `email_verified` (same gate as `getMyOrders`/`getMyAddress`).
- [ ] Writes the address to `customers/{normalizedEmail}` (`merge:true`), same doc `getMyAddress` reads.
- [ ] Basic server-side validation (required fields present, country === 'AT' for now).

**Use saved address at checkout (`createCheckoutSession`)**
- [ ] For a customer with a saved address, pass it to Stripe via `payment_intent_data.shipping` (the valid create-time param — NOT `shipping_details`, which is read-only).
- [ ] Decide per Stripe behaviour: when we already have the address, either skip `shipping_address_collection` or keep it as an editable confirm. Verify against Stripe docs that the address reaches the PaymentIntent / record.
- [ ] Guests (no saved address) → keep `shipping_address_collection: ['AT']` exactly as now.

**Cleanup from Phase 2**
- [ ] Remove the dead pre-fill code in `createCheckoutSession` that sets `sessionParams.shipping_details` (confirmed inert — read-only on create).

## Constraints

- Do NOT touch `customer-preview.html`, `order.html` token flow, or the approve/edit functions.
- Backend-first: deploy `saveMyAddress` + the updated `createCheckoutSession` before pushing `account.html`.
- No new dependencies. Plain HTML/CSS/JS.
- Austria-only country for both guest (Stripe) and signed-in (Aevia form). Expanding later = add codes in both spots.
- Never render PDFs locally.

## Success criteria

1. A signed-in customer can enter and edit their address in account settings; it persists and reloads correctly.
2. At checkout, a signed-in customer with a saved address does not have to retype it (verified the address reaches Stripe/the order record).
3. Guests still complete checkout with Stripe collecting the address (Austria only), unchanged.
4. The token-based preview/approve flow is untouched; `npm test` passes.

## Open question to verify during build

Stripe behaviour when both a saved address is passed AND `shipping_address_collection` is set — confirm whether to disable collection for known-address customers or leave it as an editable confirm. Resolve against live Stripe docs/API, not memory.

## References

- Phase 2 brief: `docs/briefs/customer-accounts-phase2.md`
- ADR-0007: `docs/decisions/0007-optional-customer-accounts.md`
- Stripe create-session params (verified S90): `payment_intent_data.shipping` is settable; `shipping_details` is read-only.
- Code: `createCheckoutSession`, `stripeWebhook`, `getMyAddress` in `functions/index.js`; `account.html` Address book panel.
