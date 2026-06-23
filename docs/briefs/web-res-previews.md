# Brief: Web-resolution previews (chunk-023)

**Created:** 2026-06-20 (session 64)
**Objective:** Serve a ~1600px web derivative of each photo to the on-screen engines while reserving full-res originals for print, cutting per-order GCS egress from ~€1.10 to ~€0.02.
**Audience:** The developer (Claude session / Evgeny) implementing chunk-023.
**Applicable Standards:** ADR-0005, ARCHITECTURE.md (Invariants + engine-parity rule), project CLAUDE.md (simplicity), ROADMAP.md Definition of Done.

## Why

After the trial ended, two days of testing cost €5.59 — 99.7% of it GCS **egress**
(full-res originals re-downloaded on every engine view and every PDF run), not
storage. Storage is ~€0.14/month and irrelevant. Originals are ~24 MP (~6 MB) but a
screen shows a photo at ~800–1200px, so sending originals to the browser wastes
~95% of the bytes. A ~1600px derivative looks pixel-identical on screen (incl.
retina) while being ~15× smaller. This makes the unit economics healthy at launch
(€70–100 book, ~€0.02 egress) without a CDN or a vendor migration. Decision and
rationale: ADR-0005. This is the highest-value cost fix on the roadmap.

## Requirements Extracted from Standards

**From ADR-0005 / ARCHITECTURE Invariant 8:**
- [ ] Each uploaded photo has a ~1600px (long-edge) JPEG web derivative stored in GCS, alongside the untouched original.
- [ ] Staff engine (`template-engine.html`) and customer preview (`customer-preview.html`) load the **derivative** for all photo rendering — never the original.
- [ ] `scripts/export-pdf.js` continues to load **full-res originals** (chunk-006 behaviour) — print quality must not change.
- [ ] Special-page photos (FP-pool: artwork, labour, etc.) and cover photos get derivatives too, not just the main pool.

**From ARCHITECTURE engine-parity rule:**
- [ ] The load-path change is mirrored identically in the staff engine and the customer preview (the two are parallel copies — change one, mirror the other).

**From project CLAUDE.md (simplicity) + ROADMAP DoD:**
- [ ] No new frontend framework or build step; no speculative abstraction. Smallest change that delivers the derivative split.
- [ ] Legacy orders without derivatives still render — engines fall back to the original if no derivative exists (no hard failure on AEV-031…041 and earlier).
- [ ] Works end-to-end in the browser; no console regressions; `npm test` stays green; STATUS.md updated; committed + pushed.

## Open Decision (resolve before coding — record the choice in the brief)

**Where is the derivative generated?**
- **(A) GCS-triggered Cloud Function** — a Storage `onFinalize` trigger reads each new original and writes a `…/previews/<name>.jpg` derivative with `sharp` (already a dependency). Server-side, reliable, originals already flow through GCS. Firebase's official **"Resize Images" extension** does exactly this — strong build-vs-buy candidate (no custom code, configurable max dimension). Cost: ~€0.00002/photo in function compute + reads (negligible, internal); one optional backfill run for existing orders.
- **(B) Client-side at upload** — the browser downscales each photo (canvas) and uploads both original and derivative via signed PUT URLs. No new function, but more client code, a second PUT URL per photo (adds upload latency, not egress), and it sits next to the sequential-HEIC path (Invariant 4 — do not parallelise HEIC). More ways to break.
- **(C) On-demand at preview time** — generate derivatives only when staff first create a preview link, not at upload. Saves work on orders that never reach preview, but couples preview generation to derivative generation and adds latency to the first preview load. **Rejected** for now: most orders do reach preview, and (A) is simpler.

**Recommendation:** (A). **Do a proof-of-concept BEFORE committing — this is a go/no-go gate, not a casual fallback:**
1. Deploy the Firebase **Resize Images** extension to a test bucket; upload one photo; inspect the output path + filename of the generated derivative.
2. Confirm `getOrder` can **derive and sign the derivative URL from the original's path** (see Naming constraint below). If yes → adopt the extension (no custom code). If the path/naming can't be matched without a Firestore schema change → **pivot to a small custom `onFinalize` function** that writes to a path we control.

This PoC is ~10–15 minutes and removes the only real risk in (A). Do it first; record the outcome (extension vs custom function) in this brief before full implementation.

## Constraints

- Format: changes confined to `functions/` (generation + `getOrder` signing), `pages/staff/template-engine.html`, `pages/customer-preview.html`.
- **CRITICAL: `scripts/export-pdf.js` MUST NOT be modified by this chunk.** It continues to load full-res originals from `photoManifest` (chunk-006 behaviour). Any change to that file is outside chunk-023 scope and risks the print path.
- Derivative spec: ~1600px long edge, JPEG, quality ~80 (tune so a full page looks crisp on screen; this is screen-only, not print).
- Naming: the derivative path MUST be a **pure function of the original's GCS path** (e.g. `<folder>/previews/<name>`) so `getOrder` derives and signs it without any Firestore schema change. **Default: do NOT change the Firestore schema.** If the chosen generator (e.g. the Resize Images extension) forces a path that can't be derived this way, the escalation is: either configure the generator's output path to match, or (only if neither works) update the order-doc schema + `firestore.rules` + `getOrder` to store/expose the derivative URLs — and flag that schema change explicitly in this brief's PoC outcome before proceeding.
- Out of scope: CDN (#3, deferred), R2 migration (#7, parked), server-side PDF (chunk-024, separate), changing print resolution or the PDF path.

## Success Criteria

The deliverable is complete when:
1. Loading a large order (e.g. AEV-040) in the staff engine and customer preview pulls ~150 MB of derivatives, not ~1.5 GB of originals (verify in the browser Network panel) — and the book looks visually identical on screen.
2. A PDF generated for the same order is byte-identical to today (still 300 DPI originals).
3. A legacy order with no derivatives still renders (fallback to original), with no console errors. _Verify manually: load a known legacy order (e.g. AEV-031) in both engines, confirm via the Network panel that it fetches originals and the console is clean. A new unit test is only needed if a new shared `loadPhoto`-style helper is introduced._
4. The change is mirrored in both engines; `npm test` green; all standards requirements above met.

## References

**Decision:** `docs/decisions/0005-egress-cost-web-res-previews-server-side-pdf.md`
**Architecture:** `ARCHITECTURE.md` → Invariant 8, Performance (cost note), `getOrder` (signed-URL pattern), Dependencies (`sharp`).
**Roadmap:** `ROADMAP.md` → chunk-023; PDF original-loading precedent in chunk-006.
**Code touchpoints:** `functions/upload.js` (`createUploadSession`, signed PUT URLs, `photoManifest`), `functions/index.js` (`getOrder` signed GET URLs), the photo-load paths in both engines, `scripts/export-pdf.js` `loadPhoto()` (originals — leave as-is).
**Build-vs-buy:** Firebase Extensions → "Resize Images".

## Context

- **Memory `feedback_engine_parity`:** the staff and customer engines are parallel copies — any load-path edit must be made in both.
- **Memory in STATUS (chunk-006):** the PDF already loads full-res originals from `photoManifest`, matched to `book-state.json` by filename — this is the behaviour to preserve, and it's why the engine/PDF split is clean.
- **Known risk — naming/matching:** photos are matched across surfaces by basename (`photo.name`). The derivative must be resolvable from the same basename, or `getOrder` won't be able to hand the engine the right preview URL. Keep the derivative path a pure function of the original path.
- **Known risk — legacy backfill:** existing orders (AEV-031…041) have no derivatives. The original-fallback (req above) is mandatory and makes them work regardless. **For this chunk: skip the backfill — rely on the fallback.** Revisit a one-off backfill only after launch if egress reports show old orders consuming material bandwidth (the Resize Images extension ships a backfill helper for exactly this).
