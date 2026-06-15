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

## 2026-06-15 — Single multi-tab workbook as template-data source of truth (replace N loose CSVs)

**Context:** Surfaced in a /ideating session (Session 42). Each template is authored as its own CSV (`scribble`, `wander`, …), which Claude hand-converts to a `*-data.js` file the engine reads. Nothing hurts day-to-day (Xenia fills the CSVs, conversion works), but Evgeny flagged that the loose-CSV-per-template setup "lives a bit weird."

**Real problem (not what it first looked like):** Not storage and not editing-prettiness — it's **schema drift across files.** Add a column to one template's CSV (new caption field, new page type) and you must *manually remember* to add it to every other template's CSV, with nothing flagging when one falls behind. With 2 templates it's mild; across 9 it's a real consistency hazard. Separate files also can't be seen side by side — which is exactly what Excel tabs give for free.

**Core concept:** Consolidate the N CSVs into **one workbook, one tab per template, shared column-header row** (the header row *becomes* the canonical schema — gaps visible at a glance). A **single converter script** reads the workbook and emits all `*-data.js` files in one run, replacing the per-file CSV→JS step. Adding a column = edit the header once, fill the tabs, re-run.

**Key insights:**
- **It's NOT a database and NOT a live data store.** Evgeny explicitly doesn't want a runtime store — the engine should keep reading static JS from git (instant, versioned, diffable). The spreadsheet is just a friendlier *authoring front-end*; git stays the stable store.
- **Excel already does the wanted thing** (multi-tab, propagate a new column across tabs). The gap is only that the workbook isn't currently the *source of truth* — it's a staging area whose output gets scattered into separate CSVs.
- **One real fork — who owns the master workbook?** Solo-ish → an `.xlsx` is fine. If Evgeny + Xenia both edit live → Google Sheets (avoid emailing versions). Today Xenia fills CSVs and hands them over, so this needs deciding at build time, not now.
- **Aligns with the prior YAGNI call** (`project_dehardcoding_dropped`): no premature infrastructure; this is consolidation, not abstraction.

**Timing (Evgeny's call):** **Defer until ~6–7 more templates are added for launch.** The column set is still moving; once it stabilises across the fuller catalogue, build the shared workbook + converter then. Premature now = consolidating a schema that's still changing.

**Effort when built:** one converter script (a few hours) + the discipline that the workbook, not the loose CSVs, is the master.

**Related to:** chunks 011–017 (template digitisation — the additions that will settle the schema); `project_template_seam` / `project_adding_templates` (the per-template add flow this would streamline); `project_dehardcoding_dropped` (the YAGNI precedent).

**Status:** Parked — revisit after ~6–7 templates added (column set stabilises).

---

## 2026-06-15 — Step-based order form UX (all templates)

**Context:** Raised by Evgeny during the Newborn build (S43). Today the order form is one long scrollable screen: cover photo + captions, then special pages, then the main photo pool, all stacked. It works but feels like "a long ass scrollable list," not premium.

**Idea:** Break the order form into discrete **steps** with progress + checkmarks, e.g. **Step 1 — Your cover** (photo + captions) → ✓ → **Step 2 — Your special pages** → ✓ → **Step 3 — Your photos** (main pool) → submit. Cleaner, more guided, more premium-feeling; lets us validate each step before advancing.

**Scope note:** Applies to ALL templates, not just Newborn — it's a refactor of the shared `order.html` flow. Should be designed once and applied across Scribble/Wander/Newborn/etc. Not part of the Newborn build; a standalone UX task.

**Related to:** `pages/order.html` (template-aware order flow); the optional special-page preview idea (would slot naturally into Step 2).

**Status:** Captured — standalone task, schedule after Newborn lands.
