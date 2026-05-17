# Aevia — Spread Preview Tool (MVP)

## Vision
A standalone browser tool for Aevia staff. Staff upload 3 customer photos → tool sequences them by EXIF date → detects orientations → picks the correct layout variant → renders the assembled spread in the browser with designer SVG overlays on top. Staff can reorder photos manually and generate captions with one click.

## Current state
- Firebase backend: fully live (orders, GCS uploads, emails)
- Order intake form: done
- Template spec: delivered (`assets/Template/Spread 1 - test.xlsx`)
- Template PDF: delivered (`assets/Template/Spreads/Spread 1.pdf`) — 5 page variants
- SVG overlays: NOT YET DELIVERED (designer to export)
- Caption module: built (`functions/caption/caption.js`) — GPT-4o mini vision

## MVP scope (v1.0)
- Single spread only (Spread 1)
- Local file upload (no GCS)
- Browser preview only (no PDF export)
- Caption button: stub (no live AI call)
- No auth, no Firebase connection, no order flow

## Future integration (design for, don't build yet)
- Photos come from GCS signed URLs per order
- Embedded in staff dashboard per order
- Multi-spread, multi-template
- Live caption AI call (needs GCS signed URLs)
- PDF export via Puppeteer

## Key files
- `pages/spread-preview.html` — new file to create
- `assets/Template/Spread 1 - test.xlsx` — spec (converted to JS object in code)
- `assets/Template/Spreads/` — SVG overlays go here when delivered
- `functions/caption/caption.js` — existing caption module
