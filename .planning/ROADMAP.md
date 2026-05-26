# Aevia — Template Engine Roadmap

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

## v2.2 — Order Integration (in progress)
_Goal: Staff enters an order number → engine fetches customer photos from GCS + pre-assembles book._

### Phase 11 — Order Connection
| Plan | Description | Status |
|------|-------------|--------|
| 11-01 | Photo count calculator on scribble.html (live count, format guidance) | ✅ done |
| 11-02 | Firestore schema + `getOrderAssets` Cloud Function | 🔄 next |
| 11-03 | Load order UI in template engine (order number → auto-assemble book) | ⬜ todo |

_11-02 must precede 11-03._

---

## v2.3 — Bleed SVG Migration (blocked on Kseniia)
_SVGs will be re-exported with 3mm bleed included. Engine and PDF must adapt._

### Phase 13 — Bleed SVG Change
| Plan | Description | Status |
|------|-------------|--------|
| 13-01 | Engine: offset bleed SVGs −3mm; PDF: place SVG at page origin (no BLEED_PT) | ⬜ todo (waiting for SVGs) |

_Prerequisite: Kseniia delivers re-exported SVGs with 3mm bleed._

---

## v3.0 — Customer Preview (future)
- Customer-facing preview of assembled book
- Approve & Pay (Stripe)
- Caption editing only, no layout changes

## v4.0 — Print + Delivery (future)
- Print house API (Prodigi or Gelato — TBD)
- Tracking webhooks, customer notifications
