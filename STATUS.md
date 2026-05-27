# Session Status
_Last updated: 2026-05-27 (evening)_

## Status
Repo is clean. Everything committed and pushed through this session.

### Completed this session (2026-05-27 evening) — **NOT YET TESTED by user**

- **Order form UX** (`pages/order.html`, commit `2b497f6`):
  - "Special requests" field deleted
  - "About your album" → "Tell us about this album" with focused placeholder (child name, personality)
  - `content-visibility: auto` on `.photo-thumb` — fixes scroll stalling on large photo grids
  - Full-screen upload progress overlay with 3 humour lines cycling every 4s, 4px bar, photo counter
  - Album notes display in template engine (now replaced by richer panel — see below)

- **Order info: GCS + engine panel** (`functions/upload.js`, `pages/template-engine.html`, commit `64a6d3e`):
  - `upload.js`: writes `order-details.txt` to GCS folder on every new order (name, email, notes, FP texts, add-ons, timestamp)
  - `template-engine.html`: after loading an order in Order mode, shows a styled info panel above the first spread — customer name (serif heading), album notes, and each FP text by label

### Committed earlier this session (tested or in progress)
- **Plan 12-03** (engine Load Order flow) — working end-to-end
- **GCS CORS GET** — added, required for signed URL downloads
- **Email credentials** — now configured

## Immediate next steps
1. **⚠️ TEST last two commits** — order form UX + GCS text file + engine info panel. User hasn't tested yet. Test at https://aevia-test.pages.dev/pages/order.html
2. **Plan 12-04** — PDF export wired to GCS order path (now unblocked by 12-03)
3. **TO-DO #47** — Mobile responsiveness (home.html + order.html)
4. **TO-DO #51** — Page-flip preview viewer (StPageFlip, ~2 days, high visual impact)

## Deferred (do NOT start yet)
- **TO-DO #52** — Customer-facing limited engine. Decision deferred; context in TO-DOS.md.
- **TO-DO #48** — Bleed SVGs: wait for Kseniia re-export.

## Open watch-outs
- `order-details.txt` in GCS only appears on orders submitted after the 2026-05-27 deploy. Old orders don't have it.
- `photoManifest` only on orders submitted after the Plan 12-03 deploy. Pre-existing orders → Local mode only.
- Cover `sections.back/spine/front.xMm` are content-relative. Cover photo slot and captions `xMm/yMm` are absolute (include 18mm bleed). Don't unify without auditing all five call sites.
- EB Garamond uses per-character `drawText` (LIGATURE_FONTS). Adding a new ligature-heavy font needs same treatment + spine path re-verify.
- Font pipeline: static TTF/OTF only. No woff2, no variable fonts.

## Key files
- Session log: `sessions/2026-05-27.md`
- Full context: `whats-next.md`
- Plans: `.planning/phases/12-order-integration/`
