# Brief: Wander order flow end-to-end (chunk-010 continuation)

**Created:** 2026-06-04 (Session 31)
**Objective:** Enable a real Wander order to be placed through the website and flow through staff engine → customer preview → PDF, with the Travel-map functional page captured in the order form (map *visual* stubbed until Kseniia's region SVGs arrive).
**Audience:** Implementing agent / future Claude sessions; ultimately Aevia customers (order form) + staff.
**Applicable Standards:** Project CLAUDE.md (plain HTML/CSS/JS, no frameworks, surgical edits, simplicity); `context/design-principles.md`; engine-parity rule (`feedback_engine_parity`).

## Why

Wander is template 2. It renders end-to-end in the staff engine today, but **only via a local tester that bypasses the order form** — a real customer order has never flowed. The order form (`order.html`) is the 4th surface the chunk-020 multi-template registry never covered: it still hardcodes `SCRIBBLE_DATA`. Until it's template-aware, clicking "Wander" sends customers through Scribble's order configuration (wrong special pages, wrong photo math). This chunk closes that gap so Wander can actually be sold. The map *rendering* (chunk-022) is blocked on Kseniia's region SVGs — that is the ONLY blocked piece, and it does not block the order flow, which merely captures country + itinerary inputs.

## Scope — the 7 pieces (from owner)

**1. Wander product page (`wander.html`) — bring onto the Scribble pattern.**
Replace the current decorative "Optional add-ons" (Route map spread, Caption overlays — both fake, unwired) with a real **"Optional spreads — all free"** section containing one addon:
- **Travel map & Itinerary** — desc ≈ *"Share which country (or countries) you travelled to and attach a short itinerary. We'll illustrate the route on a dedicated map spread."* `data-fp="FP1" data-photos="0"`. Use a placeholder preview (like Scribble's inline SVGs).
- Add a **photo counter** (`#photo-count`) + `updatePhotoCount()` like Scribble. Wander `BASE_PHOTOS` differ (40-page €60, 80-page €100 — counter ranges TBD, mirror Scribble's structure).
- Rewrite `goToOrder()` to send the **Scribble param contract** `order.html` expects: `addons` (names), `addon_inputs` (input type), `addon_slugs` (e.g. `fp1`) — NOT the current `addonName` format.

**2. Order form (`order.html`) — template-aware + new functional-page UI.**
- Load the active template's data by `template` param instead of always `SCRIBBLE_DATA` (registry/dynamic — Scribble must stay byte-identical).
- Implement FP1's `orderFormMeta` (`wander-data.js:319`): `countrySelect: true`, `sameRegionOnly: true`, `textPrompt: 'Your route'`, plus hint/placeholder. Render: **country multi-select** + **itinerary text area** (same pattern as Scribble's text special pages) + a **large clickable placeholder image that swaps by selected region** (EU countries → EU placeholder map, Asia → Asia placeholder, etc. — region comes from `mapCoordinates[country].region` in `wander-data.js`). `sameRegionOnly` blocks cross-region selection.

**3. Photo counter math.** Functional page has **0 photos**, so `data-photos="0"` and the addon adds nothing to the main-photo count. Simple — mirror Scribble's `updatePhotoCount`.

**4. Submit / upload / order creation.** Expected to be **unchanged** from Scribble (template-agnostic per `project_qa_scripts`). Verify, don't rebuild. New country/itinerary inputs must persist into the order payload the way Scribble's special-page text/photos do.

**5. Staff engine.** Standard pages (cover + SP0–SP6) already render. FP1 country+itinerary inputs are **captured but not yet rendered** (map SVGs blocked) — confirm this does NOT crash the render or block the order; the existing temp map stub stands in. Nothing else should change.

**6. Customer preview.** Same as #5 (mirror, per engine-parity).

**7. PDF.** Same — a Wander order PDFs cover + SP0–SP6; map page uses the stub. Confirm no crash.

## Constraints

- Plain HTML/CSS/JS; no frameworks/build steps; surgical edits only.
- **Scribble-parity gate:** existing Scribble orders must place + render + PDF byte-identically after every change. Verify Scribble before declaring done.
- Engine-parity: any render-path change in `template-engine.html` mirrors into `customer-preview.html`.
- Out of scope: real region-map rendering (chunk-022, blocked on Kseniia SVGs); de-hardcoding engine constants (dropped as YAGNI — see `project_dehardcoding_dropped`); Cormorant/cover work (done S28).
- Reuse `wander-data.js` as the single data source; no runtime CSV parsing.

## Success Criteria

The chunk is complete when:
1. From `wander.html`, selecting pages + the Travel-map spread and clicking "Create your book" lands on `order.html` showing Wander's correct form: country multi-select + itinerary text + region placeholder image, with correct photo count.
2. Cross-region country selection is blocked (`sameRegionOnly`).
3. A real Wander order can be submitted, uploaded, and created; it then loads in the staff engine and renders cover + SP0–SP6 without crashing (map page = stub).
4. Scribble order flow is provably unchanged (parity check).
5. (When unblocked) the only remaining Wander gap is the map SVG render — explicitly documented.

## References

**Previous work:** `docs/briefs/wander-template.md` (full Wander plan), `sessions/2026-06-04-s28.md` (Cormorant + cover + local selector), STATUS.md S30.
**Data:** `assets/Template_Wander/wander-data.js` (FP1 `orderFormMeta` :317-331; `mapCoordinates` region map), `assets/Template_Scribble/scribble-data.js`.
**Pattern to mirror:** `pages/scribble.html` (product page: addons, photo counter, `goToOrder` param contract :139-189), `pages/order.html` (special-page rendering, `orderFormMeta` reader :573+).
**Memory:** `project_template_seam`, `project_adding_templates`, `project_bleed_model`, `project_qa_scripts`, `feedback_engine_parity`.

## Context / known risks

- `order.html` only loads `scribble-data.js` (`:191`) and reads `SCRIBBLE_DATA` — making it template-aware is the crux; do it parity-gated.
- `wander.html`'s current addons are throwaway placeholders with a divergent param format — replace, don't patch.
- The country selector's region lookup needs `mapCoordinates` from `wander-data.js`, which `order.html` does not currently load — load Wander's data file.
- Placeholder region images don't exist yet — create simple labelled placeholders (EU/Asia/etc.) so the swap behaviour is demonstrable now; swap for real maps when chunk-022 lands.
- Build order suggestion: (1) `wander.html` → (2) `order.html` data-aware loader (Scribble parity) → (3) FP1 country/itinerary/region UI → (4) submit/upload verify → (5–7) Wander order smoke through engine/preview/PDF.
