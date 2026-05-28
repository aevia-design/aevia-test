# Session Status
_Last updated: 2026-05-28_

## Status
Repo is clean after this session's shaping work. All new files committed and pushed.

### Completed this session (2026-05-28) — Shaping / product definition

- **`context/customer-journey-v1.md`** — fully rewritten to reflect current build state and revised 11-step north star journey. PDF tool correctly positioned as print-production only (post-approval + payment).

- **`PRD.md`** (new) — full product requirements document. Problem reframed as "first alternative to DIY drag-and-drop". All 11 journey steps in MoSCoW format with testable acceptance criteria. Key calls: 9 templates is core MVP (not P2), desktop-only customer preview, payment link presented immediately on approval.

- **`ARCHITECTURE.md`** (new) — system architecture covering system diagram, full codemap (5 surfaces), template-as-data-file pattern, three-mode engine, data flow, 7 invariants, cross-cutting concerns, dependencies, open questions.

- **`docs/decisions/0001`** (new) — ADR for staff engine hosting. **Decided: Cloudflare Access (Zero Trust, OTP to allowed emails).** Rejected HTTP Basic Auth (shared credential, no expiry, no audit trail).

- **`docs/decisions/0002`** (new) — ADR for customer preview token. **Decided: UUID stored in Firestore as `previewToken`.** Rejected HMAC (no individual revocation without blocklist).

### Still untested from 2026-05-27 evening
- Order form UX (upload overlay, scroll perf, album notes copy) — test at https://aevia-test.pages.dev/pages/order.html
- GCS order-details.txt write
- Engine order info panel

## Immediate next steps
1. **⚠️ TEST 2026-05-27 commits** — order form UX + GCS text file + engine info panel. Not yet tested.
2. **Set up Cloudflare Access** (ADR-0001) — ~20 min in Cloudflare Zero Trust dashboard. Unblocks Xenia's remote access to staff engine.
3. **Plan 12-04** — PDF export wired to GCS order path (unblocked by 12-03).
4. **Customer preview build** — `pages/customer-preview.html` + `getOrder` customer token path. Unblocked by ADR-0002 decision.
5. **TO-DO #51** — Page-flip preview viewer (StPageFlip, ~2 days, high visual impact).

## Deferred (do NOT start yet)
- **TO-DO #52** — Customer engine UX skin. Scope TBD — customer mode may need distinct visual design, not just feature flags.
- **TO-DO #48** — Bleed SVGs re-export. Wait for Kseniia.

## Open architectural questions
1. **PDF script shared access** — both founders need to run export. Near-term: each installs Node locally. Long-term: Cloud Run job from dashboard. Resolve before second founder needs to generate PDFs.
2. **"Approved for print" flow** — dashboard button, CLI flag, or both? Resolve before PDF-to-GCS work begins.
3. **Stripe account** — not yet set up. Needed before payment step build.
4. **PDF-to-GCS** — auto-upload after export? Linked to shared access question.

## Open watch-outs
- `order-details.txt` in GCS only on orders submitted after 2026-05-27 deploy.
- `photoManifest` only on orders after Plan 12-03 deploy. Pre-existing orders → Local mode only.
- Cover `sections.back/spine/front.xMm` are content-relative; cover photo slot and captions `xMm/yMm` are absolute (bleed included). Don't unify without auditing all five call sites.
- EB Garamond uses per-character `drawText` (LIGATURE_FONTS). New ligature-heavy fonts need same treatment.
- Font pipeline: static TTF/OTF only. No woff2, no variable fonts.

## Key files
- Session log: `sessions/2026-05-28.md`
- Full context: `whats-next.md`
- Product requirements: `PRD.md`
- Architecture: `ARCHITECTURE.md`
- ADRs: `docs/decisions/`
