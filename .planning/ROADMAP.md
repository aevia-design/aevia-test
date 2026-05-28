# Aevia — Template Engine Roadmap (ARCHIVED)

> **Superseded.** This file covered template engine development through Phase 13.
> All phases here are complete. Active roadmap is at `/ROADMAP.md`.



---

## v1.0 — Single Spread Preview ✅ SHIPPED
_Single-spread tool in `pages/spread-preview.html`. Done._

| Phase | Description | Status |
|-------|-------------|--------|
| 01 | Foundation: shell, EXIF, variant picker, renderer, SVG, drag, captions | ✅ done |

---

## v2.0 — Full Template Engine ✅ SHIPPED
_Goal: Full Scribble book rendered in browser, all spreads, staff can reorder and caption._
_File: `pages/template-engine.html`._

### Phase 05 — Data Layer + Page Shell
| Plan | Description | Status |
|------|-------------|--------|
| 05-01 | CSV → `scribble-data.js` config + SVG file map + page shell HTML | ✅ done |

### Phase 06 — Spread Renderer
| Plan | Description | Status |
|------|-------------|--------|
| 06-01 | Single spread renderer: photos at mm coords + SVG overlay | ✅ done |
| 06-02 | Book sequence builder: page count + FP selections → ordered spread list | ✅ done |
| 06-03 | Full book scroll view: all spreads rendered in sequence | ✅ done |

### Phase 07 — Staff Interactions
| Plan | Description | Status |
|------|-------------|--------|
| 07-01 | Photo slot swap: drag photos between slots within a spread | ✅ done |
| 07-02 | Spread reorder: drag rows + swap spread type via dropdown | ✅ done |
| 07-03 | Caption layer: positioned per CSV spec, inline editing | ✅ done |

### Phase 08 — Functional Pages
| Plan | Description | Status |
|------|-------------|--------|
| 08-01 | Text panels: Birthday wishes (FP1) + Funny words (FP2) | ✅ done |
| 08-02 | Special photo uploads: named upload zones for FP1/FP3/FP4/FP5 | ✅ done |

### Phase 09 — Export + AI
| Plan | Description | Status |
|------|-------------|--------|
| 09-01 | Resolution warnings + RAW blocking + AI caption wiring | ✅ done |

### Phase 10 — Template Engine Finalization
| Plan | Description | Status |
|------|-------------|--------|
| 10-01 | Cover renderer: gradient background, spine width, caption positioning, toolbar | ✅ done |
| 10-02 | Caption toolbar: font, size, alignment, style pills for spread captions | ✅ done |

---

## v2.1 — PDF Export ✅ SHIPPED
_Local Node.js script generates print-quality PDFs from book-state.json._

### Phase 12 — PDF Export
| Plan | Description | Status |
|------|-------------|--------|
| 12-01 | `scripts/export-pdf.js` — pdf-lib based, preview + print modes, cover + spreads | ✅ done |

**Note:** Implemented with pdf-lib (direct PDF drawing), not Puppeteer HTML rendering as originally planned. Equivalent output, simpler architecture.

---

## v2.2 — Order Integration (DEFERRED)
_Goal: Staff enters an order number → engine fetches customer photos from GCS + pre-assembles book._

**Deferred 2026-05-26 until v2.3 (Phases 13 + 14) is complete and engine output is trusted.** Local photo upload remains the dev loop — it's faster than going through the order flow while geometry is still in flux. No point connecting the order pipe until the engine reliably produces print-ready PDFs.

### Phase 11 — Order Connection
| Plan | Description | Status |
|------|-------------|--------|
| 11-01 | Photo count calculator on scribble.html (live count, format guidance) | ✅ done |
| 11-02 | Firestore schema additions (`fpSelections`, `photoCount`) + `getOrderAssets` Cloud Function | ⏸ deferred — schema done (2026-05-26); Cloud Function paused |
| 11-03 | Load order UI in template engine (order number → auto-assemble book) | ⏸ deferred |
| 11-04 | PDF export wired to GCS order path (GCS signed URLs in book-state.json, export-pdf.js fetches from GCS) | ⏸ deferred |

_When resumed, run 11-02 → 11-03 → 11-04 in order._

---

## v2.3 — Template Data Improvements (urgent — next focus)
_Two CSV/data improvements needed before the next PDF print run._

### Phase 13 — Bleed SVG + Caption Coordinate Migration
_SVGs now include 3mm bleed (Kseniia delivered 2026-05-26). Both CSVs updated with new column structure.
Plans 13-01 → 13-03 → 13-04 must run in order. 13-02 (hygiene) runs last._

| Plan | Description | Status |
|------|-------------|--------|
| 13-01 | CSV parser rewrite + scribble-data.js format update (bleed coords on slots, explicit caption box dims) | ✅ done |
| 13-03 | template-engine.html: SVG bleed offset + coordinate-based caption rendering | ✅ done |
| 13-04 | export-pdf.js: SVG at origin + xBleed slot coords + coordinate-based caption rendering | ✅ done |
| 13-02 | Engine + PDF code hygiene pass — drift guards, schema version, dead code removal | ✅ done |

_Phase 14 (caption CSV) merged into Phase 13 — Evgeny already added caption box columns to the CSV._

---

## v3.0 — Customer Preview (future)
- Customer-facing preview of assembled book
- Approve & Pay (Stripe)
- Caption editing only, no layout changes

## v4.0 — Print + Delivery (future)
- Print house API (Prodigi or Gelato — TBD)
- Tracking webhooks, customer notifications
