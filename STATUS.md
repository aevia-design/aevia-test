# Session Status
_Last updated: 2026-05-28 (session 4)_

## Status
All session-4 changes uncommitted. Ready to commit and start chunk-001.

### Completed this session (2026-05-28 session 4) — order form fixes + TDD

- **`pages/order.html`** — 3 bug fixes: (1) critical: overlay now hidden before success screen is shown; (2) "Loading X more photos…" indicator while photo grid processes; (3) progress bar shows `X.XX GB / Y.YY GB` alongside photo count.

- **`TO-DOS.md`** — pruned from 52 to 28 items. Removed done work and anything now covered by ROADMAP chunks. Restructured into 8 themed sections. Role clarified: strictly "not in ROADMAP" backlog.

- **`assets/js/photo-utils.js`** (new) — 4 pure functions extracted from `template-engine.html`: `isRaw`, `filenameNumber`, `comparePhotos`, `markDuplicates`.

- **`pages/template-engine.html`** — loads `photo-utils.js` externally; uses `comparePhotos` / `markDuplicates` instead of inline sort + dedup logic.

- **`package.json`** + **`tests/photo-utils.test.js`** (new) — Jest configured at project root; 34 tests passing covering all edge cases for the 4 pure functions.

### Still untested from 2026-05-27 evening
- Order form UX (upload overlay, scroll perf, album notes copy) — test at https://aevia-test.pages.dev/pages/order.html after next deploy

## Immediate next steps
1. **Commit session-4 changes** — order.html fixes, photo-utils.js, tests, TO-DOS.md prune
2. **chunk-009** — Cloudflare Access setup (ADR-0001). ~20 min in Cloudflare Zero Trust dashboard. Unblocks remote staff engine access.
3. **chunk-001** — `getOrder` customer token path. First code chunk on the customer preview pipeline. Enriched and ready in ROADMAP.md.
4. **chunk-002** — Dashboard generate-preview-link action. Depends on chunk-001.
5. **chunk-003** — `customer-preview.html`. Depends on chunk-001 + chunk-002.

## Deferred
- **Playwright browser tests** — for template engine upload (HEIC, orientation, full flow). Deferred until after chunk-003 ships — engine still changing too fast.
- **chunk-004** — Approve flow. After chunk-003 is working.
- **chunk-005** — Stripe payment. Blocked: Stripe account not yet set up.
- **chunks 010–017** — Template digitisation. Wait for CSV + SVG files from Kseniia.

## Open questions
1. **Stripe account** — not yet set up. Needed before chunk-005.
2. **"Approved for print" flow** — dashboard button, CLI flag, or both? Resolve before chunk-008.
3. **PDF script shared access** — each installs Node locally (near-term) vs Cloud Run job (long-term). Resolve before second founder needs to generate PDFs.
4. **AI captions broken in engine** — likely `OPENAI_API_KEY` env var expired. Check Firebase Console → Functions → generateCaption → Logs.

## Open watch-outs
- `order-details.txt` in GCS only on orders submitted after 2026-05-27 deploy.
- `photoManifest` only on orders after Plan 12-03 deploy. Pre-existing orders → Local mode only.
- Cover `sections.back/spine/front.xMm` are content-relative; cover photo slot and captions `xMm/yMm` are absolute (bleed included). Don't unify without auditing all five call sites.
- EB Garamond uses per-character `drawText` (LIGATURE_FONTS). New ligature-heavy fonts need same treatment.
- Font pipeline: static TTF/OTF only. No woff2, no variable fonts.
- Template chunks (010–017) need CSV + SVG assets from Kseniia before starting.
- `markDuplicates(existingPool, incoming)` excludes pool entries already flagged `duplicate:true` from the "seen" set — this is intentional, don't revert.

## Key files
- Session log: `sessions/2026-05-28.md`
- Product requirements: `PRD.md`
- Architecture: `ARCHITECTURE.md`
- Roadmap (active): `ROADMAP.md`
- Customer engine design spec: `.interface-design/system.md`
- Pure upload utils + tests: `assets/js/photo-utils.js`, `tests/photo-utils.test.js`
- ADRs: `docs/decisions/`
