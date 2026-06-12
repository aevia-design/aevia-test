# Aevia — Ideas

Captured ideas, most recent at the bottom. Status: Captured | Exploring | Committed | Parked.

---

## 2026-06-12 — Customer account area / "my orders" dashboard

**Context:** Surfaced while fixing the order-confirmation-email fragility (see `docs/briefs/order-flow-failure-map.md`). The fragility felt like a symptom of a deeper thing — orders having no real owner. Evgeny wants customers to have a home: order history in one place, a sense of "what's up with my order."

**Core concept:** A function-backed `my-orders.html` page where a customer signs in (passwordless / email-link) and sees their orders with live status + a link into each order's customer-preview. NOT full password-account management — the lightweight spine that delivers ownership + repeat-customer continuity.

**Needs it serves (Evgeny confirmed):**
- "A home that's theirs" (brand / premium relationship)
- "A repeat customer shouldn't start from scratch every time" (retention)
- "Orders should have a real owner" (the architectural unease behind the email fragility)
- NOT primarily about security/identity-proofing or recovery — though recovery falls out for free.

**Key insights:**
- **The premium "account" feeling and a password mechanism are separable.** Passwordless email-link sign-in (Firebase Email Link — same Firebase that powers staff auth) gives the home-that's-theirs feeling without password friction or a signup wall before the first order.
- **This was anticipated, not forbidden.** ADR-0003 retired the legacy `my-order.html` *because its implementation* read Firestore directly (forcing world-readable rules), not because the idea was unwanted. It explicitly says: rebuild later as a **clean function-backed page** keyed on identity; "two-way door, reversible if tracking proves needed." Tracking is now wanted → walk through that door. Do NOT revive `my-order.html`; build fresh on the admin-SDK Cloud Function pattern (same as `customer-preview.html`), so no firestore.rules hole reopens.
- **The order-flow-hardening chunks are its foundation, not a competitor.** The dashboard answers "what's up with my order?" = status data. Chunk 4 creates clean status (`uploading → done`); orders already carry `statusHistory`. Build the chunks first so the dashboard has solid data to show. Building the dashboard first would mean displaying the very flakiness we're escaping.
- **The first confirmation email still rides on the typed address regardless.** A login area is additive (for order #2 onward / coming back); it does NOT replace Chunk 1/4/5. Both are needed.

**Minimal spine (later, post-chunks):**
1. `my-orders.html` — list orders: number, template, status label, open-preview button.
2. Passwordless email sign-in (Firebase Email Link).
3. One Cloud Function: "orders for this signed-in email" — reads existing `email` + `status` fields.

**Deferred (not spine):** profile/address editing, one-click re-order (#19), delivery tracking display (#17), notifications, password accounts.

**Related to:** ADR-0003 (retire my-order tracking page); `docs/briefs/order-flow-hardening.md` (foundation); TO-DOS #17 (delivery tracking → my-order page), #19 (repeat-order prompt); chunk-018 (staff Firebase Auth — the auth machinery to reuse).

**Status:** Committed — build after `order-flow-hardening` chunks. Needs its own brief + likely an ADR superseding/extending 0003 when started.

---
