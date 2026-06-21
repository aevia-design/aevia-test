# 0005 — Cut GCS egress cost: web-resolution previews + server-side PDF

**Date:** 2026-06-20 (session 64)
**Status:** Committed (reversible)

## Context

After the trial period ended, two days of light testing cost €5.59 — and a
billing-console SKU breakdown attributed **99.7%** of it to Cloud Storage
**egress** ("Download Worldwide Destinations"), not storage or any GenAI usage.
Storage of all photos + PDFs was €0.02 total; the cost is entirely **data leaving
GCS to the internet**, priced ~€0.11/GB.

Root cause: every surface downloads **full-resolution originals** (~6 MB/photo,
1–2 GB/order). The staff engine and customer preview pull the whole order on each
view, and the local PDF script downloads the whole order on each run. During
heavy template testing (re-opening the same big orders, regenerating PDFs) this
multiplied into ~50 GB of egress in two days.

The worry it raised: is the unit economics broken? A real customer viewing their
1.5 GB order ~5–10 times would cost ~€1.10 of egress on a €70 book — uncomfortable.

## Options Considered

1. **Web-resolution previews (#1)** — store a ~1600px web derivative per photo;
   serve it to the engines/customer preview; keep full-res originals for print only.
2. **Server-side PDF in-region (#6)** — generate the PDF in a Cloud Function in the
   bucket's region so photo reads are internal (no internet egress), instead of on
   a laptop.
3. **CDN in front of storage (#3)** — cache photos at the edge so repeat views
   aren't re-fetched from GCS.
4. **Migrate storage to Cloudflare R2 (#7)** — zero-egress storage vendor.

## Decision

**Commit to #1 and #6. Defer #3, park #7.**

Decision-type framing: #1, #6 and #3 are **two-way doors** (reversible config /
additive code); #7 is a **one-way door** (vendor migration, splits storage from
Firebase, rewrites the upload path).

- **#1 is the real fix.** It is the simplest thing that solves the stated problem:
  a preview view drops from ~1.5 GB to ~150 MB, so production egress falls from
  ~€1.10 to **~€0.02 per order**. The "grainy preview" fear is unfounded — originals
  are ~24 MP but a screen shows a photo at ~800–1200px, so a 1600px derivative is
  pixel-identical on screen (incl. retina). Full-res originals stay reserved for the
  300 DPI print. This is industry-standard (every photo-book service does it).
- **#6 is needed for production regardless** — staff cannot run a Node CLI per order;
  they click a button. Running it in-region also makes PDF egress internal/free, so
  it removes the PDF egress cost as a side effect of better architecture. Justified
  on ops grounds, not cost.
- **#3 (CDN) deferred** — after #1, each view is ~150 MB and customer photos are
  unique (one viewer), so a CDN is a second-order optimisation. Add later if
  repeat-view egress ever nags. (ARCHITECTURE.md already notes "No CDN currently —
  adequate for MVP volume.")
- **#7 (R2) parked** — after #1 + #6 production egress is ~€0.02/order; a vendor
  migration to save that is YAGNI. Revisit only if egress re-emerges as real money
  at scale.

Key trade-offs:
- We gain: production egress ~€0.02/order (down from ~€1.10), crisp on-screen
  previews, and much cheaper dev testing as a side effect.
- We accept: more upload-pipeline complexity (generate + store a second file per
  photo) and a "which resolution am I loading?" rule the two engines + PDF must
  follow consistently (engines → preview, PDF → original).
- We assume: 1600px is sufficient for on-screen preview (verified by DPI math) and
  full-res originals remain the source for print.

## Consequences

- Enables the unit economics to stay healthy at launch volume without a CDN or a
  vendor migration.
- Constrains the photo-load path: a new invariant — **engines load the web
  derivative, the PDF loads the original**. Any new render/upload path must honour
  it or reintroduce the egress (PDF) or break print quality (engine derivative).
- The PDF script's existing behaviour (chunk-006: reads full-res originals from
  `photoManifest`) is correct and must be preserved.
- Reversible: if 1600px ever looks insufficient, regenerate derivatives at a higher
  size; to revert entirely, point the engines back at originals. No data migration.
- Tracked as **chunk-023 (web-res previews)** and **chunk-024 (server-side PDF
  in-region)** in ROADMAP.md. #1 is briefed in `docs/briefs/web-res-previews.md`.

## Next Steps

Hand off #1 to a brief (`docs/briefs/web-res-previews.md`) to specify where the
derivative is generated (client-side at upload vs a GCS-triggered Cloud Function),
the naming/storage convention, and how `getOrder` exposes both URL sets. #6 stays
on the roadmap as a pre-launch ops chunk (chunk-024), folding in Open Question #5
and chunk-007's "future upgrade path".
