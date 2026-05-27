# Session Status
_Last updated: 2026-05-28_

## Status
- **SVG bleed fix — DONE** (implemented and tested). Spread and cover SVGs now rendered with
  expanded viewBox so Kseniia's bleed artwork is visible in PDFs. Cover compositing simplified:
  canvas bg = front colour, SVG provides back+spine.
- **Blank QR page — DONE.** Appended after all content pages in both preview + print modes.
- **Full-bleed photo support — DONE.** `full_bleed: yes` in CSV → `fullBleed: true` flag on slot
  → PDF places photo at 206×206mm origin; engine shows at 600×600px origin.
- **Text panel word wrap — DONE.** FP text panels now wrap within their box (was rendering
  as single overflowing line).
- **All changes UNCOMMITTED** — 5 modified tracked files + new fonts + session log.

## Immediate next steps
1. **Commit everything** — all uncommitted changes from sessions 2026-05-26 through 2026-05-28.
   Files: `pages/template-engine.html`, `scripts/export-pdf.js`, `csv-to-template.js`,
   `assets/Template_Scribble/scribble-data.js`, `assets/Template_Scribble/Scribble_sizing_full.csv`,
   `assets/Template_Scribble/Scribble_Template_Sizing_Cover.csv`, FP Spread 5 SVGs renamed,
   `assets/fonts/` (EB Garamond static TTFs).
2. **Plan 13-02** — Code hygiene pass. After commit.
3. **TO-DO #47** — Mobile responsiveness (different files, unblocked any time).

## Open watch-outs
- Cover `sections.back/spine/front.xMm` are content-relative (used by code that DOES add
  `COVER_BLEED_PX`). Cover photo slot and captions `xMm/yMm` are absolute (already include
  18mm bleed). Don't unify without auditing all five sites.
- EB Garamond rendering uses per-character drawText (LIGATURE_FONTS set). Adding a new
  ligature-heavy font means it joins this set; the spine rotated-text path must be
  re-verified for that font.
- Font pipeline requires static TTF/OTF. No woff2, no variable fonts.
- `full_bleed` legacy detection (`bgColor contains 'full bleed'`) still in csv-to-template.js
  — clean up in Plan 13-02.

## Key files
- Plans: `.planning/phases/13-bleed-svgs/13-01-PLAN.md` through `13-04-PLAN.md`
- Session logs: `sessions/2026-05-28.md`, `sessions/2026-05-27.md`, `sessions/2026-05-26-p2.md`
- Full context: `whats-next.md`
- Architecture insights: `LEARNINGS.md`
