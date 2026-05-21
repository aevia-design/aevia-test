# Aevia — Template Engine Roadmap

---

## v1.0 — Single Spread Preview ✅ SHIPPED
_Single-spread tool in `pages/spread-preview.html`. Done._

| Phase | Description | Status |
|-------|-------------|--------|
| 01 | Foundation: shell, EXIF, variant picker, renderer, SVG, drag, captions | ✅ done |

---

## v2.0 — Full Template Engine
_Goal: Full Toddler book rendered in browser, all spreads, staff can reorder and caption._
_New file: `pages/template-engine.html`. Does not modify spread-preview.html._

### Phase 05 — Data Layer + Page Shell
| Plan | Description | Status |
|------|-------------|--------|
| 05-01 | Compile Excel → `template-data.js` config + SVG file map + page shell HTML | ⬜ todo |

### Phase 06 — Spread Renderer
| Plan | Description | Status |
|------|-------------|--------|
| 06-01 | Single spread renderer: photos at mm coords + SVG overlay (one spread, static) | ⬜ todo |
| 06-02 | Book sequence builder: page count + FP selections → ordered spread list | ⬜ todo |
| 06-03 | Full book scroll view: all spreads rendered in sequence | ⬜ todo |

### Phase 07 — Staff Interactions
| Plan | Description | Status |
|------|-------------|--------|
| 07-01 | Photo slot swap: drag photos between slots within a spread | ⬜ todo |
| 07-02 | Spread reorder: drag to reorder book sequence + swap spread type via dropdown | ⬜ todo |
| 07-03 | Caption layer: positioned per Excel spec, inline editing | ⬜ todo |

### Phase 08 — Functional Pages
| Plan | Description | Status |
|------|-------------|--------|
| 08-01 | Text panels: Birthday wishes + Funny words (styled text overlay on left page) | ⬜ todo |
| 08-02 | Special photo uploads: named upload zones for birthday/toy/steps/artwork photos | ⬜ todo |

### Phase 09 — Export + AI
| Plan | Description | Status |
|------|-------------|--------|
| 09-01 | Resolution warnings + RAW blocking + AI caption wiring | ✅ done |

---

## v2.0 SHIPPED — Full Template Engine (Scribble)
_Phases 05–09 complete. Staff manually uploads photos locally._

---

## v2.1 — Engine Finalization + Order Connection

### Phase 10 — Template Engine Finalization
| Plan | Description | Status |
|------|-------------|--------|
| 10-01 | Cover renderer audit + fixes (gradient, spine width, caption positioning) | ⬜ todo |
| 10-02 | Caption text editor toolbar (font, size, alignment, line spacing) | ⬜ todo |

_10-01 and 10-02 are independent — either order._

### Phase 11 — Order Flow Connection
| Plan | Description | Status |
|------|-------------|--------|
| 11-01 | Photo count calculator on scribble.html (live min–max, format guidance) | ⬜ todo |
| 11-02 | `getOrderAssets` Cloud Function (Firestore + GCS signed read URLs) | ⬜ todo |
| 11-03 | Order loading UI in template engine (order number → auto-assemble book) | ⬜ todo |

_11-01 is frontend-only, independent. 11-02 must precede 11-03._

---

## v2.2 — Print Export

### Phase 12 — PDF Export
| Plan | Description | Status |
|------|-------------|--------|
| 12-01 | Puppeteer PDF export (manifest → local Node.js script → 300 DPI PDF) | ⬜ todo |

_Requires bleed/mark spec from user before implementation. Best after 11-03 for GCS URLs._

---

## v3.0 — Customer Preview (future)
- Customer-facing preview of assembled book
- Approve & Pay button
- Caption editing only, no layout changes
