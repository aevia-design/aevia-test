# Session Status
_Last updated: 2026-05-28_

## Status
Repo has uncommitted changes from session 3 (shaping). Ready to start building chunk-001.

### Completed this session (2026-05-28 session 3) — Design + roadmap enrichment

- **`.interface-design/system.md`** (new) — full UX spec for the customer preview engine. Covers: two-mode layout (Edit/Preview toggle), token inheritance, photo swap interaction, caption editing, approve flow, mobile gate, states table, what's removed vs staff engine.

- **`PRD.md`** — added "Could Have" user story: customer replaces a photo slot with a new upload (1-for-1, not net-new). Acceptance criteria written.

- **`ROADMAP.md`** — chunks 001–004 enriched with acceptance criteria, pattern references, and contextual notes. Ready to build.

- **`.planning/ROADMAP.md`** — marked ARCHIVED (superseded by `/ROADMAP.md`). Phase 13 statuses corrected to ✅ done.

### Still untested from 2026-05-27 evening
- Order form UX (upload overlay, scroll perf, album notes copy) — test at https://aevia-test.pages.dev/pages/order.html
- GCS order-details.txt write
- Engine order info panel

## Immediate next steps
1. **⚠️ TEST 2026-05-27 commits** — order form UX + GCS text file + engine info panel. Not yet tested.
2. **chunk-009** — Cloudflare Access setup (ADR-0001). ~20 min in Cloudflare Zero Trust dashboard. Unblocks remote access to staff engine.
3. **chunk-001** — `getOrder` customer token path. First code chunk on the customer preview pipeline. Enriched and ready.
4. **chunk-002** — Dashboard generate-preview-link action. Depends on chunk-001.
5. **chunk-003** — `customer-preview.html`. Depends on chunk-001 + chunk-002. Design spec in `.interface-design/system.md`.

## Deferred (do NOT start yet)
- **chunk-004** — Approve flow. After chunk-003 is working.
- **chunk-005** — Stripe payment. Blocked: Stripe account not yet set up.
- **chunk-010–017** — Template digitisation. Wait for CSV + SVG files from Kseniia per template.
- **chunk-018** — Page-flip viewer. After first test orders complete end-to-end.
- **chunk-019** — Reminder emails. After approve flow (chunk-004) is live.

## Open questions
1. **Stripe account** — not yet set up. Needed before chunk-005 (payment) can be built.
2. **"Approved for print" flow** — dashboard button, CLI flag, or both? Resolve before chunk-008.
3. **PDF script shared access** — each installs Node locally (near-term) vs Cloud Run job (long-term). Resolve before second founder needs to generate PDFs.
4. **Customer preview UX** — Edit/Preview two-mode layout decided. Distinct visual skin vs feature-flag toggle on staff engine? Answered: new page (`customer-preview.html`), not a mode on `template-engine.html`.

## Open watch-outs
- `order-details.txt` in GCS only on orders submitted after 2026-05-27 deploy.
- `photoManifest` only on orders after Plan 12-03 deploy. Pre-existing orders → Local mode only.
- Cover `sections.back/spine/front.xMm` are content-relative; cover photo slot and captions `xMm/yMm` are absolute (bleed included). Don't unify without auditing all five call sites.
- EB Garamond uses per-character `drawText` (LIGATURE_FONTS). New ligature-heavy fonts need same treatment.
- Font pipeline: static TTF/OTF only. No woff2, no variable fonts.
- Template chunks (010–017) need CSV + SVG assets from Kseniia before starting — don't begin without them.

## Key files
- Session log: `sessions/2026-05-28.md`
- Product requirements: `PRD.md`
- Architecture: `ARCHITECTURE.md`
- Roadmap (active): `ROADMAP.md`
- Customer engine design spec: `.interface-design/system.md`
- ADRs: `docs/decisions/`
