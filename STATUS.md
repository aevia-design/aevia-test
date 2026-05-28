# Session Status
_Last updated: 2026-05-28_

## Status
Repo is clean after two shaping sessions. All new files committed (session 1) + session 2 changes pending commit.

### Completed this session (2026-05-28 session 2) — Structure / tooling

- **`CLAUDE.md`** — rewritten lean (191 → 52 lines). Pointer file only; all absorbed content removed. Follows claude-md.md guidance.

- **`ROADMAP.md`** (new, project root) — full-pipeline roadmap replacing `.planning/ROADMAP.md`. 19 chunks from customer preview through all 9 templates. Scoped to full PRD, not just template engine.

- **`whats-next.md`** — deleted. Redundant with STATUS.md; was 450 lines of stale content.

- **`commands/whats-next.md` skill** — deleted. `/checkpoint` + STATUS.md replace its function.

- **`checkpoint` + `prime` skills** — updated to remove `whats-next.md` references. Minimal two-file logging model: `sessions/` for decisions, `STATUS.md` for build state.

### Still untested from 2026-05-27 evening
- Order form UX (upload overlay, scroll perf, album notes copy) — test at https://aevia-test.pages.dev/pages/order.html
- GCS order-details.txt write
- Engine order info panel

## Immediate next steps
1. **⚠️ TEST 2026-05-27 commits** — order form UX + GCS text file + engine info panel. Not yet tested.
2. **chunk-009** — Cloudflare Access setup (ADR-0001). ~20 min in Cloudflare Zero Trust dashboard. Unblocks remote access to staff engine.
3. **chunk-001** — `getOrder` customer token path. First code chunk on the customer preview pipeline.
4. **chunk-002** — Dashboard generate-preview-link action. Depends on chunk-001.
5. **chunk-006** — PDF export uses GCS photos (Plan 12-04). Independent, can run any time.

## Deferred (do NOT start yet)
- **chunk-010–017** — Template digitisation. Wait for CSV + SVG files from Kseniia per template.
- **chunk-018** — Page-flip viewer. After first test orders complete end-to-end.
- **chunk-019** — Reminder emails. After approve flow (chunk-004) is live.

## Open questions
1. **Stripe account** — not yet set up. Needed before chunk-005 (payment) can be built.
2. **"Approved for print" flow** — dashboard button, CLI flag, or both? Resolve before chunk-008.
3. **PDF script shared access** — each installs Node locally (near-term) vs Cloud Run job (long-term). Resolve before second founder needs to generate PDFs.
4. **Customer preview UX** — distinct visual skin vs feature-flag toggle on staff engine? Scope TBD before chunk-003 starts.

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
- Roadmap: `ROADMAP.md`
- ADRs: `docs/decisions/`
