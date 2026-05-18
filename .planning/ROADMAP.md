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
| 09-01 | Print CSS for full book + AI caption button per slot + resolution warnings | ⬜ todo |

---

### Phase 10 — bloom.html Amendments
| Plan | Description | Status |
|------|-------------|--------|
| 10-01 | FP selector section + photo count calculator + order form integration | ⬜ todo |

---

## v2.1 — GCS Integration (future)
- Photos fetched from GCS signed URLs per order
- Tool embedded in staff dashboard per order
- Session saved to Firestore (photo assignments, captions, spread order)

## v3.0 — Customer Preview (future — pending Kseniia sign-off)
- Customer-facing version of template engine (constrained UI)
- Approve & Pay button
- Caption editing only, no layout changes
