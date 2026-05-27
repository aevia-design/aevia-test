# Session Status
_Last updated: 2026-05-27_

## Status
Everything through Phase 13 + Plan 13-02 is committed and pushed. Repo is clean.

- **Phase 13 (bleed coords, PDF polish)** — DONE and committed.
- **Plan 13-02 (code hygiene)** — DONE and committed.
  - `resolveColor()` at module level, `stripHtml()` hardened, `ov.weight` type guard,
    `resolveVariant()` loud warn, `0.75` magic number documented, legacy `full_bleed`
    bgColor detection removed from `csv-to-template.js`.
- **Product north star** — ideated and captured. TO-DOs #51 (page-flip viewer) and
  #52 (customer-facing limited engine) added to TO-DOS.md. See sessions/2026-05-27.md.

## Immediate next steps
1. **Plan 12-03** — Engine "Load order" flow. Staff enters order number → engine
   fetches Firestore doc + downloads photos from GCS signed URLs + pre-populates FP
   text panels from fpTexts. This is the integration between order intake and the engine.
   See `.planning/phases/12-order-integration/` for plan files.
2. **TO-DO #47** — Mobile responsiveness (home.html + order.html). Unblocked, different files.
3. **TO-DO #51** — Page-flip preview viewer (StPageFlip). Easy win, ~2 days, high visual impact.

## Deferred (do NOT start yet)
- **Plan 12-04** — PDF export wired to GCS. Wait for Plan 12-03 to land.
- **TO-DO #52** — Customer-facing limited engine. Decision deferred; context documented in TO-DOS.md.
- **TO-DO #48** — Bleed SVGs: wait for Kseniia re-export with 3mm bleed viewBox.

## Open watch-outs
- Cover `sections.back/spine/front.xMm` are content-relative (used by code that DOES
  add `COVER_BLEED_PX`). Cover photo slot and captions `xMm/yMm` are absolute (include
  18mm bleed). Don't unify without auditing all five call sites.
- EB Garamond uses per-character `drawText` (LIGATURE_FONTS set). Adding a new
  ligature-heavy font means it joins this set; spine rotated-text path must be
  re-verified.
- Font pipeline: static TTF/OTF only. No woff2, no variable fonts.
- `sessions/2026-05-28.md` no longer exists — its content was merged into 2026-05-27.md.

## Key files
- Plans: `.planning/phases/12-order-integration/` (Plans 12-03, 12-04)
- Session log: `sessions/2026-05-27.md`
- Full context: `whats-next.md`
- Architecture insights: `LEARNINGS.md`
