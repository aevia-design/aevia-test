# Decision: Retire my-order.html order-tracking page

**Date:** 2026-06-02
**Status:** Committed

## Context

chunk-018 locks `/orders` Firestore reads/writes to authenticated staff. The blocker was `my-order.html` — a customer "Track your order" page (emailed on every order) that reads orders by querying Firestore **directly** (`where('token','==',token)`) and writes the approval directly. Firestore rules cannot inspect a query's filter value, so supporting that page forces `allow read: if true` — the exact world-readable hole we are closing.

`my-order.html` is legacy: last touched 2026-04-06, built on the old `token` field, predating the token-magic-link preview flow. The live customer journey (preview → approve → pay) runs entirely through `customer-preview.html` via Cloud Functions, which use the admin SDK and bypass Firestore rules.

## Options Considered

1. **Retire it now** — remove the email button, retire `my-order.html`, lock rules fully.
2. **Keep & secure** — build a token→status Cloud Function, rewrite the page to use it, then lock rules.
3. **Partial lock** — lock writes only, leave reads `if true` until migrated later.

## Decision

We chose **Retire it now** because the page is legacy, unused by the live flow, and salvaging it (option 2) spends real effort securing a page that no longer fits the journey. Retiring closes the hole in the simplest way.

Key trade-offs:
- We gain: full rule lock (orders no longer world-readable; no anonymous write/tamper); simplest change.
- We accept: customers temporarily lose an order-status page (founder was unaware it existed; deemed non-essential).
- We assume: approve + pay are unaffected (they run via Cloud Functions on `customer-preview.html`, not `my-order.html`).

## Consequences

- Enables `firestore.rules` to require `request.auth` staff email for read + update.
- Rules become irrelevant to customer flows (all via admin-SDK functions).
- If order-status tracking is wanted later, rebuild a clean function-backed page keyed on `previewToken` — do not revive `my-order.html`.
- Two-way door: reversible if tracking proves needed.
