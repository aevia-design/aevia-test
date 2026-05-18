# Aevia — Template Engine (Full Toddler Book)

## Vision
A staff-facing browser tool that renders the complete Toddler photobook from uploaded photos. Staff configure the book (page count, which functional pages are included), upload all customer photos, and get a full-book preview spread-by-spread. They can reorder spreads, swap photos between slots, write/generate captions, and send the result to print.

## Current state (v1.0 — done)
- `pages/spread-preview.html` — working single-spread tool (Spread 1 only)
- Firebase backend: fully live (orders, GCS uploads, emails)
- Caption module: `functions/caption/` — GPT-4o mini vision, deployed
- Full Excel spec delivered: `assets/Template_Toddler/Toddler_sizing_full.xlsx`
- All SVG overlays delivered: `assets/Template_Toddler/Spreads/`

## v2.0 scope — Full template engine (new file)
New page: `pages/template-engine.html` — does NOT touch spread-preview.html.

### Book structure (Toddler template)
- **Spread 0**: right-only (print requirement — first spread always a single right page)
- **Standard spreads 1–6**: both left + right pages; cycle repeats for book length
- **Functional spreads (optional)**: inserted among standards based on order selections

### Functional page types (5 total)
| ID | Name | Left | Right |
|----|------|------|-------|
| FP1 | Birthday wishes | Text (user-entered at order) | Heart-shaped special photo (SVG clip path) |
| FP2 | Funny words | Text (user-entered) | Full-bleed square photo (200×200mm) |
| FP3 | Favourite toy | Special user photo (H) | Regular photo from pool (H or V) |
| FP4 | First steps | Special user photo (H) | Regular photo from pool (H or V) |
| FP5 | Art gallery | Kid artwork (H or V) | Kid artwork (H or V) |

### Caption system
Captions are per-slot, position is defined per spread/orientation in Excel:
- "below (Nmm from photo)" → text Nmm below photo bottom edge
- "above (Nmm from photo)" → text Nmm above photo top edge
- "upper right (Nmm from photo)" → text Nmm right of photo top-right corner
- "center" → centered on page (text pages)
Font: EB Garamond, Plum (#493955)

### Coordinate system
- Each page = 200mm × 200mm content area (3mm bleed not rendered)
- SVG viewBox = 566.93 × 566.93 (200mm at 72 DPI)
- Photo position in pixels: `px = mm * 3` (for 600px canvas)
- SVG scales to fit 600×600 container automatically

### Staff interactions
- Upload photos (regular pool + named special uploads per FP type)
- EXIF date → fallback filename number → upload order sequencing
- Drag photos between slots within a spread
- Drag spreads to reorder the whole book sequence
- Swap a spread's type (SP1 ↔ SP2 ↔ FP3 etc.) via dropdown
- Edit captions inline, auto-position per spec
- AI-generate caption per slot (calls existing caption function)

## Key files
- `pages/template-engine.html` — main new file
- `assets/Template_Toddler/template-data.js` — compiled spread config (all data from Excel + SVG map)
- `assets/Template_Toddler/Toddler_sizing_full.xlsx` — source of truth for all coords
- `assets/Template_Toddler/Spreads/` — all SVG overlays (SP + FP folders)
- `functions/caption/caption.js` — existing caption AI module
