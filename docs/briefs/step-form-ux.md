# Brief: Step-based order form UX (all templates)

**Created:** 2026-06-17 (Session 51)
**Objective:** Restructure the order form so today's long, single-scroll "Upload photos" stage becomes a sequence of small, guided, validated steps with visible progress — shared across all templates, verified first on Scribble.
**Audience:** Aevia customers placing an order (customer-facing only). Built/maintained by Claude + Evgeny.
**Applicable Standards:** Project conventions (`CLAUDE.md`: plain HTML/CSS/JS, no frameworks, surgical edits, simplicity-first), `context/design-principles.md`, `context/style-guide.md`. No formal skill standard governs a UI refactor; quality expectations below are derived from the multi-step-form research (S51) + those project docs.

## Why

Today the order form is two stages: **Step 1 — Your details**, then **Step 2 — Upload photos**. Step 2 is the heavy one — cover (photo + captions), then any special-page add-ons, then the full main photo pool — all stacked on one scrolling screen. It works but "feels like a long ass scrollable list," not premium (Evgeny, S43). The research (S51) confirms the fix: splitting a long form into logically-grouped steps with visible progress raises completion (Baymard: a 15-field form across 3 logical steps beats a 10-field single page by 11–14%) and reduces perceived effort — provided steps map to recognisable tasks and progress is shown. This makes the order experience feel guided and editorial, matching the brand, and lets us validate each step before advancing.

## Quality Expectations (derived — research + project docs)

**From the multi-step-form research (S51):**
- [ ] Steps map to recognisable user tasks ("Your cover", "Your photos"), not data types — one logical task per step.
- [ ] Total steps stay in the 3–7 range (Details → Cover → Special pages → Photos = 4, before auto-skips).
- [ ] A step with no content for the active template auto-skips (e.g. a template/order with zero selected special pages shows no Special-pages step).
- [ ] Visible progress indicator with distinct "completed" styling (checkmarks) — extend the existing stepper, don't invent a new one.
- [ ] Navigation model = **linear-forward, free-backward**: each step validates on "Continue"; cannot advance past an invalid step; can freely return to any completed step to edit (completed stepper segments are clickable).

**From project conventions / design docs:**
- [ ] Plain HTML/CSS/JS only — no framework, no build step, no new dependency.
- [ ] Reuse existing brand tokens and the existing stepper markup/styles; on-brand per `context/design-principles.md` (serif, generous whitespace, off-white/near-black).
- [ ] Surgical edits — the refactor is presentational (show/hide step panels + extend the stepper + per-step validation). Do **not** rewrite the photo-upload / EXIF / retry / `beforeunload` / `confirmUpload` logic from S40 hardening; the main-photo step keeps that code as-is.
- [ ] Works on mobile (links `assets/css/mobile.css` already; verify reflow per the S41 watch-out).

## Constraints

- **Files:** `pages/order.html` (the shared, already template-aware order flow) — primary. CSS likely inline/in-page per existing pattern.
- **Step source = data-driven & per-template.** The visible steps are derived from the active template's data (cover always present — note Wander's "cover" is album-name text, not a photo; special-pages step present only if the order has selected special pages; main photos always present). Same engine for Scribble / Wander / Newborn.
- **Step mapping (from current `step2` sub-sections):** `#cover-section` → Cover step; `#fp-sections` → Special pages step; main-photos `.upload-section` + submit → Photos step. Step 1 (details) is unchanged.
- **Extensibility seam (required):** the per-step container structure must accommodate a future "preview my data" panel slotting into the Cover or Special-pages step (à la Wander's map) WITHOUT restructuring — but that preview is **out of scope** here.
- **Out of scope:** order-phase special-page preview with the customer's own data; any change to the upload/backend pipeline; any change to pricing, Stripe, or the success/confirm flow; redesign of Step 1 (details) beyond wiring it into the extended stepper.

## Success Criteria

The deliverable is complete when:
1. On Scribble, the order form presents Details → Cover → Special pages → Photos as discrete steps with a working progress stepper (completed steps checkmarked and clickable-to-edit); validation blocks forward movement on an incomplete step but back-navigation is always free.
2. A template/order with no selected special pages auto-skips that step (verified — Scribble with no add-ons, and conceptually correct for Wander/Newborn).
3. The existing submit → upload → confirm path still works end-to-end (a real or QA Scribble order completes), with the S40 hardening behaviour intact.
4. Wander and Newborn render their steps correctly (cover = album-name text for Wander; per-template special pages) — eyeballed, even if full E2E is Scribble-only this pass.
5. On-brand and mobile-correct (`/design-review` pass; iPhone + desktop).
6. All quality expectations above are met.

## References

**Research:** S51 deep-research synthesis (in-session) — Baymard one-page checkout, NN/g cognitive-load-in-forms, Andrew Coyle form-wizard, UXPin progress trackers.
**Code:** `pages/order.html` — stepper markup `~L234–258`; `#step1` `~L260`; `#step2` `~L324` (sub-sections: `#cover-section` L330, `#fp-sections` L333, main photos L336); `goToStep2()` `~L1171`; `submitOrder()` validation `~L1680`.
**Design:** `context/design-principles.md`, `context/style-guide.md`.
**Related ideas:** `ideas.md` — "Step-based order form UX (all templates)" (2026-06-15); "Engine-driven mockup imagery" (the future preview that slots into a step).

## Context

- **Background decisions (Evgeny, S51):** step order reflects the template (Wander has no cover *photo* but keeps cover *inputs* = album name); navigation strictness left to best practice → research-backed linear-forward/free-backward chosen; start on a separate branch, verify on one template (Scribble) before merging; the displayed-preview feature is explicitly a separate, complex, later piece but the UX must be adjustable to host it.
- **Work on a branch** (`step-form-ux`); `main` auto-deploys to Cloudflare, so do not merge until Evgeny approves the local/branch verification.
- **Known risk:** the main-photo step owns the fragile, hardened upload path (S40). Keep the refactor presentational around it; do not relocate `beforeunload` arming, the worker pool, or `confirmUpload` sequencing. Re-verify a real submit before merge.
- **Known risk:** `order.html` is already template-aware (S31) via `TEMPLATE_REGISTRY` / `templateData()` — the step engine must read from that, not hardcode Scribble.
