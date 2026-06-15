# Brief: Mobile Responsiveness — Customer Order Flow (#47)

> ## ✅ OUTCOME (Session 41, 2026-06-15) — BOTH AXES RESOLVED
> - **Axis A (layout): SHIPPED.** Root cause was that `order.html` never linked the shared `assets/css/mobile.css` and the product-page stacking rules only matched the `#la` wrapper (7 of 10 pages lack it). Fixed with one `<link>` + broadened selectors. All 10 product pages + home + order steps 1–2 reflow to device width on iPhone 13 + Pixel 7 (audit 8/8 then all-pages), hamburger functional, independently code-reviewed (accept). Commits `9992b66` (+ review polish).
> - **Axis B (EXIF / web-vs-app): RESOLVED → STAY WEB-ONLY.** Evgeny ran a real iPhone Safari order: upload was easy, **EXIF dates survived and the engine auto-sorted correctly**. Decision: the mobile browser flow is sufficient; **the Capacitor app (TO-DO #40) stays parked** — do not promote unless a future need emerges.
> - **Bugs surfaced by the E2E test (all fixed Session 41):** PDF rotated iPhone photos (EXIF-orientation, fixed in `export-pdf.js`); customer slot-drag broke (fixed in `customer-preview.html`); home/collections price inconsistency (wired to `prices.js`); mobile-gate placeholder reference (now shows the real order number). See STATUS.md / session log.

**Created:** 2026-06-15 (Session 41)
**Objective:** Make the customer-facing pages (home, product pages, order flow) lay out correctly and natively on phone-width screens, and determine — by real-device test — whether a mobile *browser* upload preserves EXIF well enough to keep Aevia web-only or whether the Capacitor app (#40) must be promoted.
**Audience:** Developer (Claude in a later build session) for Axis A; Evgeny for the Axis B real-device test.
**Applicable Standards:** `context/design-principles.md` (responsive system + brand), `PRD.md` (scope boundaries + EXIF acceptance criteria).

## Why

All testing to date has been desktop Chrome on Windows. Aevia wants to **nudge customers to upload from their phones**, because smartphone photos carry EXIF date metadata and the engine auto-sorts the book by EXIF date (PRD line 69) — phone uploads are the happy path for good auto-arrangement. But the order flow has never been validated on a real phone, and a live-site audit (2026-06-15) shows the **product page and order step 1 are locked to a ~560–600px desktop width** (shrunk to fit, small text) with **no mobile nav** on any page. Two distinct problems hide inside #47: (A) the layout isn't responsive, and (B) it's unknown whether a phone *browser* keeps EXIF intact through upload + HEIC conversion. (A) is bounded CSS work; (B) is the strategic fork that decides whether the web flow is sufficient or the **Capacitor wrap-app (TO-DO #40, "no rewrite needed")** gets promoted from Low. This brief bundles both: fix the layout, then have Evgeny test a real iPhone upload to settle the app question.

## Current-state findings (live audit, `qa/mobile-audit.mjs`)

| Page | Adapts to device width? | Issue |
|------|------|------|
| Home | ✅ 390/412px | OK |
| Product page (e.g. scribble.html) | ❌ locks to 600px | Desktop layout shrunk; should stack (design-principles line 91) |
| Order step 1 (details) | ❌ locks to 561px | 2-col details+summary shrunk; should stack |
| Order step 2 (upload) | ✅ reflows to ~391px | Width OK; header nav still cramped |
| All pages | — | Desktop nav never collapses to hamburger (design-principles lines 85, 103) |

No horizontal scroll, no JS errors, no overflow offenders — this is "desktop shrunk to fit," not structural breakage. Screenshots: `sessions/qa-runs/mobile/`.

## Requirements Extracted from Standards

**From design-principles.md (responsive system):**
- [ ] Nav collapses to a hamburger at ≤768px; animates to × when open (lines 85, 103)
- [ ] Product page sticky 2-col (gallery + panel) stacks to single column on mobile (line 91)
- [ ] Order step 1 details + summary card stack to single column on phone widths
- [ ] At ≤375px everything is single-column, stacked, type scales down (line 86)
- [ ] Section padding reduces to the mobile value (`60px` vertical) on small screens (line 70)
- [ ] No horizontal scroll at any viewport; layout not broken at any width (lines 153, 155)
- [ ] Body text stays 15px / 1.6; nav/labels keep brand type scale (lines 49–56)
- [ ] Primary/outlined CTA styles preserved (dark fill / pill outline) at mobile sizes (lines 106–107)

**From PRD.md (scope boundaries):**
- [ ] Staff engine + customer-preview engine are NOT touched — they remain desktop-only with the existing mobile gate (PRD lines 33, 91–92, 163)
- [ ] EXIF-date sorting behaviour is preserved end-to-end; nothing in the responsive work changes how photos are read or uploaded (PRD line 69)

## Constraints

- Format: CSS-only changes to existing pages where possible (`pages/home.html`, the 10 product pages, `pages/order.html`); no framework, no build step, no new dependencies (project convention).
- Pages in scope: home, the 10 product pages, order flow steps 1–2 (incl. upload). **Out of scope:** staff `template-engine.html`, `customer-preview.html`, `dashboard.html` — all deliberately desktop-only.
- Target devices: iPhone Safari (primary — EXIF/HEIC-critical), Android Chrome (secondary, emulation-only for now — Evgeny has no Android device). Fluid down to ~360px.
- Product pages share a layout pattern — fix once, mirror across all 10 (engine-parity discipline).
- Out of scope for Axis B: building the app. Axis B only *decides* whether #40 should be promoted; the build itself is a separate future effort.

## Success Criteria

The deliverable is complete when:
1. **Axis A (layout):** On iPhone + Android viewports (360–414px), home, a product page, and order steps 1–2 each render single-column with a working hamburger nav, no element wider than the screen, and the page's own width equals the device width (no shrink-to-fit). Verified by re-running `qa/mobile-audit.mjs` (all pages report `vw == deviceWidth`, `overflow == 0`) plus a visual screenshot pass.
2. **Axis B (EXIF decision):** Evgeny completes a real-iPhone order upload and reports whether (a) the upload succeeds, (b) EXIF date survives into the staff engine's auto-sort, and (c) HEIC files convert correctly. Result recorded as a decision: web-sufficient, or promote Capacitor app #40.
3. All requirements extracted from standards are met; the staff/customer engines are demonstrably untouched.

## References

**Standards:** `context/design-principles.md`, `PRD.md` (lines 33, 69, 91–92, 118, 135, 163)
**Audit tooling + evidence:** `qa/mobile-audit.mjs`, `sessions/qa-runs/mobile/` (screenshots + `report.json`)
**Related backlog:** TO-DO #47 (this), TO-DO #40 (Capacitor app — the Axis B fallback)
**Customer journey:** `context/customer-journey-v1.md`

## Context

- **Two axes, one brief:** Axis A is a developer build session (CSS). Axis B is a manual real-device test Evgeny runs *after* A ships, because emulated Chromium can't replicate Safari's file-picker EXIF/HEIC behaviour.
- **Background decision (PRD):** the interactive *engine* is intentionally desktop-only. Do not "fix" it for mobile — that's a deliberate non-goal, not an oversight.
- **App fear is softened:** #40's plan is to wrap the existing HTML/CSS/JS in Capacitor (no rewrite), so even a "browser insufficient" outcome is not a from-scratch app build.
- **Known risk:** the order flow's photo-upload JS (worker pool, HEIC conversion, `beforeunload` guard from S40) must keep working untouched — responsive changes are layout-only and must not perturb the upload path.
- **Android gap:** no Android device available; Android verification is emulation-only until Evgeny can borrow one.
