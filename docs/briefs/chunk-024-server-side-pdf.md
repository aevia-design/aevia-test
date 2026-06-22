# Brief: chunk-024 — Server-side PDF generation

**Created:** 2026-06-22
**Objective:** Move PDF generation from a local Node CLI to a Cloud Run job triggered from the staff dashboard, eliminating GCS egress for the PDF path and removing the requirement for any founder to run a terminal command per order.
**Audience:** Developer agent implementing the Cloud Run service + dashboard trigger
**Applicable Standards:** ARCHITECTURE.md, ROADMAP.md chunk-024 entry, ADR-0005

## Why

PDF generation currently runs on a founder's laptop: staff click "Export book state" in the engine, then run `npm run pdf -- AEV-XXX` in a terminal. This is unsustainable for production — Xenia can't run a Node CLI, and the photo reads pull full-res originals from GCS across the internet, incurring the same egress cost per PDF as a full engine load (~€0.40 for an 80-page book). Moving the render to Cloud Run (same region as the GCS bucket, `europe-west1`) makes photos internal reads (near-zero egress) and puts the trigger where it belongs: a single dashboard button.

## Solution Approach

**Decided:** Dashboard-only trigger, reading Firestore directly (no book-state.json Export step required).

- Staff edit/review in the engine as normal → hit **Save book state** → Firestore updated.
- On the dashboard, a **"Generate PDF"** button per order calls a new Cloud Run job.
- The Cloud Run job reads the order state from Firestore (same data Save writes), constructs the book-state equivalent in memory, then runs the existing `export-pdf.js` rendering logic server-side.
- Output lands in GCS at `AEV-XXX/pdfs/preview.pdf` and `AEV-XXX/pdfs/print.pdf`, same paths as today.
- Dashboard shows a signed GCS link once render completes (same pattern as today's `updatePdfLinks()`).

**Explicitly NOT in scope:** Engine-side "Generate PDF" button (add later if friction is felt). Rewriting `export-pdf.js` rendering logic (port it, don't rewrite it).

## Data Source: Firestore vs book-state.json

The current CLI reads `book-state.json` from GCS, written by the engine's **Export** button (separate from **Save**). This two-step Export-then-CLI flow is the TO-DO #64 footgun.

The Cloud Run job instead reads from Firestore (written by **Save**). Key fields the PDF needs and where they live after Save:

| Data | Firestore field | Notes |
|---|---|---|
| Photo assignments (pool slots) | `customerBookAssignments` | staff assignments use same field |
| Captions | `customerCaptions` | |
| Crop offsets | `staffCropOffsets` | written by Save in staff engine |
| Cover crop | `staffCoverCrop` | |
| Map selection (Wander FP1) | `fpTexts.fp1` | object with region/countries/itinerary |
| Template name | `templateName` | |
| Photo URLs | `pool[]`, `derivativeUrls{}` | via `getOrder` |
| Order metadata | `folderName`, `pageCount`, etc. | |

**Before implementation:** audit `export-pdf.js` against what `getOrder` returns to confirm no gap. If a gap exists, extend what Save writes — do NOT resurrect the Export button as a prerequisite.

## Requirements

**Functional:**
- [ ] "Generate PDF" button visible on each dashboard order row with status `approved` or `paid` (same gate as existing PDF links)
- [ ] Button triggers the Cloud Run job; dashboard shows a spinner/pending state while job runs
- [ ] On completion, dashboard shows signed GCS links (`preview.pdf`, `print.pdf`) — same as today
- [ ] PDF output is byte-identical to the current local script for the same order data (verify on AEV-042 or a known good order)
- [ ] Staff can still open an order in the engine, make edits, Save, and then Generate PDF from the dashboard — the PDF must reflect the post-Save state

**Technical:**
- [ ] Cloud Run service in `europe-west1` (same region as GCS bucket) — NOT Cloud Functions (80-page books need >9 min timeout headroom and ≥4 GB RAM)
- [ ] Service reads photos via GCS in-region; no signed download URLs that route via internet egress
- [ ] `export-pdf.js` rendering logic ported with minimal changes — no rewrite of font handling, bleed math, SVG shrink, template dispatch, or caption logic
- [ ] Existing CLI mode (`npm run pdf -- AEV-XXX`) continues to work for local dev/debugging
- [ ] Cloud Run job authenticates to GCS with its service account (same project, no extra credentials needed)
- [ ] Dashboard trigger is staff-auth-gated (same `staffHeaders()` pattern as other staff Cloud Functions)

**Non-functional:**
- [ ] 80-page book renders within 10 minutes (Cloud Run timeout set to 15 min as headroom)
- [ ] Memory allocation ≥ 4 GB (sharp + pdf-lib + 80-page book in memory)
- [ ] Failed render returns an error message visible in the dashboard (not a silent hang)

## Constraints

- **Do not rewrite `export-pdf.js` rendering logic** — port it as a Cloud Run entrypoint wrapper. Font rules, bleed model, SVG shrink, ligature workarounds are all battle-tested and must not be changed.
- **CLI mode must remain functional** — `scripts/export-pdf.js` keeps its `--order` / `--photos` CLI flags for local dev.
- **No new npm dependencies in the main repo** — Cloud Run service can have its own `package.json` (likely lives in `functions/` or a new `services/pdf-renderer/` directory).
- **Deploy order:** Cloud Run service deployed and smoke-tested BEFORE the dashboard button goes live on main.
- Out of scope: Engine-side Generate PDF button; changes to customer-preview; PDF content changes.

## Success Criteria

1. Either founder clicks "Generate PDF" on the dashboard for an approved order and receives working GCS links — no terminal, no local Node, no Export step.
2. PDF output for a known order (e.g. AEV-042) matches the locally-generated reference PDF.
3. GCS egress for a PDF generation run shows only the PDF write (no multi-hundred-MB photo download from `Download Worldwide Destinations` in GCS billing).
4. `npm run pdf -- AEV-XXX` still works locally for dev/debug.

## References

- **Current PDF script:** `scripts/export-pdf.js` (the logic to port)
- **Current dashboard:** `pages/staff/dashboard.html` (where the button goes)
- **ROADMAP entry:** `ROADMAP.md` → chunk-024
- **ADR:** `docs/decisions/0005-gcs-egress-strategy.md` (justification for this approach)
- **Web-res brief** (parallel chunk): `docs/briefs/web-res-previews.md` (same egress context)
- **Order data contract:** `functions/index.js` → `getOrder` (what Firestore fields are available)

## Context

- **Bleed model (critical):** PDF uses print-bleed coordinates throughout. `MM_TO_PX`, `BLEED_MM`, `MM_TO_PT` are lazy constants initialised inside `initializePrintConstants()` — any code derived from them must live inside that function, not at module top (broke cover + all SVGs in S18 when done wrong).
- **Font rules:** Every font has a ligature-bug check (`LIGATURE_FONTS`). Source Sans 3 (Papercut) needs this check before the first PDF run. See `project_pdf_font_rules` memory.
- **SVG shrink:** `shrinkOversizedSvg()` handles SVGs >8 MB with embedded rasters (Wander map spreads). This logic must survive the port.
- **Photo reads:** PDF currently pulls originals (not derivatives) by design — print needs full-res. Cloud Run reads them from GCS in-region; this is correct and intentional.
- **Branch:** `feature/chunk-024-design` exists locally; use it.
