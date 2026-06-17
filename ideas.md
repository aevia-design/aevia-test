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

**Status:** ✅ SHIPPED Session 51 (2026-06-17, `723fac4`). Built across all templates: Details → Cover → Special pages → Photos, data-driven stepper, Special auto-skips with no add-ons, linear-forward/free-backward nav. The "preview my data" idea now has a ready seam (each step is a `<section class="form-step">`). See `sessions/2026-06-17-s51.md` + `docs/briefs/step-form-ux.md`.

## 2026-06-16 — Engine-driven mockup imagery for the website (placeholders → product shots)

**Context:** Raised by Evgeny during the Newborn build (S46). The site has no real product imagery (no professional shoots or printed books yet) — product pages show grey boxes with SVG glyphs, and the special-page add-ons on the product page have a tiny icon that pretends to be a preview but opens nothing (and clicking it accidentally toggles selection). Evgeny wants the site to look like a real product *before* launch, using our OWN rendering engine to generate mockups from sample (Aevia) photos.

**Core concept:** Reuse the book-rendering pipeline we already built to generate marketing imagery. Two distinct image products on the **product page**:
- **① Special-spread previews** — a clickable preview of each special spread (Intro, Labour, Birthday, Travel-map…) filled with Aevia sample photos, so the customer sees the *flavour* of the page before adding it. The preview opening must be **decoupled from selecting the add-on** (today the whole card toggles on click).
- **② General gallery placeholders** — 3–4 mockups across the product page: **cover front, a few open-book spreads, cover back** — so the page reads like a real product.

**Key insights / feasibility:**
- **Highly feasible — two existing pipelines already do ~90%.** (a) `scripts/export-pdf.js` already composites every page to a `sharp` PNG before assembling the PDF (tap those buffers → spread images). (b) The staff engine is a pixel-faithful browser render, and we already drive it via Playwright in `qa/` (screenshot each spread row → WYSIWYG mockups). Flat spread renders are close to free.
- **Two image *types*, not one job:** flat spread/page renders (engine/PDF do natively — easy, on-brand editorial) vs a **3D "book on a table" hero** (needs an extra compositing step: a mockup scene / smart-object we drop flat renders into). ② ("cover front/back") really only reads as a **3D book object**; ① works fine flat but Evgeny prefers 3D-premium.
- **Strategic upside beyond placeholders:** because it's code-generated, a layout tweak → re-run a script → ALL marketing images update (product pages, collection cards, special-page previews, OG/social). Self-updating; hand-shot photography can't do that.
- **Real prerequisite = a curated sample-content kit** (a few good sample photos per template + canned captions, reused consistently). Garbage sample photos → unconvincing mockups. This is the actual gating work, not the rendering.

**Decisions (Evgeny, S46):**
- **Go 3D** for the premium look — but it needs a **proper brief** (mockup-scene source: pure-code vs smart-object/mockup tool; sample-content kit; which spreads; lightbox interaction; applies to ALL templates).
- **Sequencing:** finish + validate the **Newborn E2E first**, then pick this up as its own focused effort.

**Related to:** the special-page add-on UI on every product page (`pages/scribble.html`/`wander.html`/`newborn.html`); [[Step-based order form UX]] (③ order-phase preview WITH the customer's own data — à la Wander's map page — would slot into Step 2; documented deferred in `docs/briefs/newborn-template.md`); `scripts/export-pdf.js` + `qa/` Playwright (the two render pipelines); `project_qa_scripts`.

**Status:** Parked — start after Newborn E2E; needs a proper brief (3D mockup scene + sample-content kit).

---
