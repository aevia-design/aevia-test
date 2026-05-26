# Summary — Plan 12-01: PDF Export

## Status: COMPLETE ✅

## What was built
`scripts/export-pdf.js` — a local Node.js script that reads `book-state.json` (exported from the template engine) and produces print-quality PDFs using **pdf-lib** (direct PDF drawing, not Puppeteer HTML rendering as originally planned).

## Deviation from plan
**Original plan:** Puppeteer headless Chrome renders `print-render.html` per page → exports PDF.  
**Actual implementation:** pdf-lib draws all elements directly (photos, SVGs, captions, cover gradient) without a browser. Simpler architecture, no Puppeteer dependency, same output quality.

**Why:** pdf-lib approach is more reliable for a local staff script — no browser launch, no localhost dependency, faster execution. Puppeteer HTML rendering adds complexity for no benefit at this scale.

## What's in book-state.json (exported from engine)
- `bookSequence`, `bookAssignments`, `bookCaptions`, `spreadCaptionStyles`
- `coverCaptions`, `coverConfig`, `specialPhotos`
- Photos as base64 data URLs (local uploads) or filenames (for GCS-loaded orders)

## Two output modes
- `node scripts/export-pdf.js --mode preview` → single `preview.pdf` (cover page 1, spreads follow)
- `node scripts/export-pdf.js --mode print` → `pdf-out/print/cover.pdf` + `page-001.pdf`…`page-NNN.pdf`

## Known limitations
- Photos in book-state.json are base64-encoded (large file when using local uploads)
- After Plan 11-03 (load order), photos will be GCS URLs → book-state.json will be smaller and export script will fetch them at render time (requires Task extension in export-pdf.js)
- Bleed SVG change (Plan 13-01) will require updating SVG placement in export-pdf.js (remove BLEED_PT offset for SVG layer)
