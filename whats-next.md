```xml
<original_task>
Build a staff-facing browser tool (`pages/template-engine.html`) for rendering Toddler template photobooks. The tool allows staff to upload customer photos, configure book options (page count, functional pages), and preview the full book layout with correct spread templates, background colors, photo placement, captions, and print export.

The work follows a phased plan stored in `.planning/` with plans numbered 06-01 through 09-01.
</original_task>

<work_completed>

## Phase 06-01 — Spread renderer (completed earlier)
- `pages/template-engine.html` built from scratch with photo upload, HEIC conversion, EXIF date extraction, photo pool thumbnail strip, `renderSpread()`, SVG overlay, variant selection

## Phase 06-02 — Full book engine (completed earlier)
- `buildBookSequence()`, `assignPhotosToSpreads()`, `renderBook()`, config bar, FP checkboxes

## Phase 06-03 — Scroll view (completed earlier)
- Spread row headers with numbered badge, type pill (FP/Standard), stub control buttons
- Photo status bar (total/placed/unplaced/empty)
- Responsive layout (stacked at <1400px)
- SP0 blank left placeholder "← Cover / Back / Not yet designed"

## scribble-data.js — bgColor at variant level (completed earlier)
- bgColor per variant for all 12 spreads; SP0 label fixed; SP4 right V = `#fdd16f`

## Session 2026-05-20 — Plans 07-01 through 08-02 (completed)

### Plan 07-01 — Photo slot drag-and-drop
- Drag photo from thumbnail strip → drop onto slot; slot-to-slot swap
- Updates `window.bookAssignments`, re-renders affected spread, updates strip state
- Drag-over highlight on target slot

### Plan 07-02 — Spread reorder + type swap
- Drag spread row up/down to reorder; change spread type (e.g. SP2 → SP5)
- Re-runs `assignPhotosToSpreads` and re-renders after change

### Plan 07-03 — Caption layer
- Caption `contenteditable` overlays on slots where `captions: true`
- Stored in `window.bookCaptions[spreadIndex][side][slotIndex]`
- AI caption button: resizes photo to max 1200px before upload (413 fix); sends `previousCaptions` array (last 8) for diversity
- Caption width 90% slot width (5% inset); `upper-right` position gets `text-align: left`

### Plan 08-01 — FP text panels
- FP1 (Birthday wishes) and FP2 (Funny words) editable `contenteditable` overlay on left pages
- Stored as `window.bookCaptions[spreadIndex][side]['textPanel']`
- Caption voice prompt loaded from `functions/caption/caption-voice.md` (not hardcoded)

### Plan 08-02 — Special photo upload zones
- FP3 "Favourite toy" / FP4 "First steps" / FP5 "Art gallery" upload zones wired
- `window.specialPhotos` keys: `['FP1', 'FP3', 'FP4', 'FP5']`
- Special photos not draggable from main pool

## Session 2026-05-20 — CSV pipeline + Scribble rename

### csv-to-template.js
- New Node.js script at project root: reads `assets/Template_Scribble/Scribble_sizing_full.csv`, regenerates `scribble-data.js`
- Preserves existing SVG paths; warns about any missing ones (TODO placeholders)
- Run: `node csv-to-template.js` from project root after editing the CSV
- `functional_photo` / `functional_text` columns drive pool types, textPanel, funnyWords flags

### Scribble template renamed (was Toddler/Sprout)
- All code, files, folders renamed to Scribble. Committed + pushed to Cloudflare.
- `window.SCRIBBLE_DATA`, `assets/Template_Scribble/`, `pages/scribble.html`
- `assets/templates.json` — new template catalogue file

### FP2 Funny words + FirstTimeWriting! font
- FP2 text panel uses FirstTimeWriting! font at 25pt, each word on its own row, max 10 words
- Font file: `assets/fonts/FirstTimeWriting!.ttf`

### FP1 special photo pool
- FP1 right slot (`pool: 'special'`) — birthday photo upload zone appears in special panel when FP1 selected
- `window.specialPhotos` keys: `['FP1', 'FP3', 'FP4', 'FP5']`

## Session 2026-05-19 — FP1 heart + orientation fixes

### FP1 SVG path fix
- `scribble-data.js` SVG paths updated from `FP Birthday 01 L copy.svg` → `FP Birthday 01 L.svg` and `FP Birthday 02 R copy.svg` → `FP Birthday 02 R.svg` (Kseniia replaced the files)

### Heart photo clip (FP1 right page)
- Root cause found: `FP Birthday 02 R.svg` is a 3-spread export. The heart frame artwork uses `cls-4` clipped to x=674 (outside the 0–566 viewBox) — it never renders. Only `cls-2` (a small decorative corner element) is visible.
- Fix: photo slot expanded to full 600×600 canvas + CSS `clip-path: path(...)` applied when `slotDef.heartClip === true`
- Heart path (scaled from 566.93×566.93 SVG → 600×600 canvas):
  `M315.61,569.29 c189.41,-32.30,353.76,-502.10,161.52,-504.13 -75.98,-.82,-144.62,37.88,-166.39,37.88 -29.30,0,-56.97,-92.27,-165.83,-47.06 -200.49,83.33,48.24,534.15,170.70,513.31Z`
- Canvas background `#fdd16f` (yellow) fills non-heart area naturally


### Orientation detection fix
- Root cause: previous session added an EXIF Orientation swap (tags 5-8 → flip dims). This is wrong because modern browsers (Chrome, Firefox, Safari) auto-rotate images based on EXIF — `img.naturalWidth/naturalHeight` already returns correct visual dimensions.
- Fix: removed the swap entirely. Orientation is now determined purely from `img.naturalWidth > img.naturalHeight`, which is always the correct visual orientation regardless of EXIF tag presence.
- Tested with 53 DTS_PARENTHOOD professional JPEGs (no EXIF Orientation tag) — all correctly detected.
- User noted "didn't spot any deviations on first sample" — continuing to monitor with other samples.

## Performance issue logged (TO-DO added)
- After alt-tab and return to browser, interface takes 10-15 seconds to respond to scrolling
- Likely cause: all 600×600 spread canvases remain in DOM and GPU layer is evicted when browser is backgrounded
- Needs investigation: consider virtualisation, canvas reuse, or requestAnimationFrame-gated rendering

## Session 2026-05-21 (later) — Caption toolbar + font + CSV sync

### EB Garamond Semi-Bold font added
- Downloaded `EBGaramond-SemiBold.woff2` to `assets/fonts/`
- Added `@font-face` (weight 600) in template-engine.html
- Added "Semi-Bold" style pill to EB Garamond in `COVER_FONTS` toolbar array

### Cover caption toolbar extended to spine
- Toolbar now shows on focus for all four cover captions including spineName and spineYear
- Toolbar positions to the right of the spine element (not above) to avoid canvas overlap

### csv-to-template.js generates cover: block
- Parses `Scribble_Template_Sizing_Cover.csv`; emits `cover:` block in scribble-data.js
- Two bugs fixed: duplicate `Page` CSV header (use column index 0); serializer missing commas between multi-slot arrays
- FP3.left.V and FP4.left.V SVG paths now generated correctly by the script (no longer need manual patch)

## Session 2026-05-21 — Housekeeping + Kseniia onboarding

### Motif engine moved to main repo
- `motif-engine/` copied from `.claude/worktrees/` to project root
- Added `README.md` (setup, usage, motif table) and `.gitignore` (outputs/, node_modules/, .env excluded)
- Kseniia onboarding plan: own Claude account, shared Replicate token, GitHub collaborator invite

### CLAUDE.md + customer-journey-v1.md updated
- CLAUDE.md: removed Webflow, corrected live URL, updated folder structure, added template engine + motif engine sections
- customer-journey-v1.md: template engine marked as built, caption flow documented, Puppeteer constraints added, tech stack table updated

## Session 2026-05-20 (later) — Cover renderer + image quality

### Cover canvas background
- Replaced per-section `<div>` backgrounds with a single CSS `linear-gradient` on the canvas element
- Back and spine colors come from the SVG; front `bgColor` is the only user-facing config
- Gradient covers 100% canvas height — eliminates cream strip from pixel rounding

### Cover caption fixes
- Line height tightened: `sizePt * 1.1` (was `* 1.3`)
- Front captions: `top: capCY; transform: translateY(-50%)` — centers any number of lines correctly
- Spine captions: `top: capCY - lineHpx/2` where `lineHpx = sizePt * (4/3) * 1.1` — correct px centering

### Image quality improvements (cosmetic)
- Added `image-rendering: smooth` to `.slot-photo` CSS — tells Chrome to use high-quality downscale immediately
- Added `imageSmoothingQuality: 'high'` to canvas `drawImage` in `urlToBase64` (AI caption resize function)
- Photo blobs stored as original `createObjectURL` — no re-encoding, no quality loss in storage pipeline

</work_completed>

<work_remaining>

## Reliability fixes (completed this session)
- SVG/photo load failures now show a red outline on the affected slot — visible to staff
- Reordering or changing a spread type now warns if captions exist (they'd no longer match photos)
- AI caption errors now stay visible ("⚠ Failed — click to retry") until staff retries successfully
- HEIC conversion failures now show an alert listing all failed filenames with "re-export as JPEG" instruction
- Image orientation load: 10s timeout added to prevent upload hanging on corrupted files
- Removed unused `avoidMixedRightPage` dead code

## HEIC / photo validation architecture note
HEIC conversion in the template engine is a **temporary testing path** — it exists so staff can upload iPhone photos from their local drive during development. In production, photos arrive pre-processed from GCS after the customer upload flow. The real HEIC robustness and format validation work belongs in **Plan 12-x (order intake)**: validate format, resolution, and file integrity at upload time, before photos ever reach the template engine. The template engine should receive only clean, ready-to-use files.

## Plans not yet started

### Plan 09-01 — DONE
- RAW blocking, low-res warnings, AI caption wiring all implemented in template-engine.html

### Plan 10-01 — ABORTED
- FP selector lives on scribble.html (chips + addons flow). bloom.html is irrelevant.

### Plan 10-02 — DONE
- Caption toolbar built for all cover captions (front + spine)
- Controls: font family, style pills, font size stepper, line spacing stepper, letter spacing stepper
- Styles stored in `window.coverCaptionStyles[key]`; applied via direct DOM mutation (no re-render, no focus loss)
- EB Garamond Semi-Bold (weight 600) added; NT Somic Regular + Medium available
- Toolbar positions above front captions, to the right of spine captions

### Plan future — Extend toolbar to spread captions
- Same toolbar concept for spread slot captions (contenteditable overlays on slots where `captions: true`)
- Typography defaults now come from scribble-data.js (CSV-driven); toolbar will read/override them per caption
- Not yet started

## PDF export — architecture DECIDED (was Plan 12-01 "Puppeteer", now Plan 11)

**Decision (2026-05-22, /solutioning):** Server-side compositing with **Sharp + pdf-lib**, NOT browser PDF.
Build as a **standalone Node.js tool first** (test print quality with local photo uploads), then wire to
order path later (Plan 12). Print specs are documented in `LEARNINGS.md`.

**Why not Puppeteer/Playwright `page.pdf()`:** the browser PDF pipeline embeds raster images at the
*rendered* resolution (CSS px × devicePixelRatio), not the photo's native resolution. Quality is bounded
by the 600px preview canvas regardless of `deviceScaleFactor`. Behaviour is also undocumented and
version-dependent — unacceptable for a production print path. Browser preview stays at SCALE=3 for staff
review; print rendering is a completely separate pipeline.

**Why Sharp + pdf-lib:** full pixel control, deterministic output, maps cleanly to future GCS flow (swap
local file reads for downloads). Sharp re-encode at 95%+ JPEG is visually lossless for print. pdf-lib
assembles pages at exact physical mm dimensions.

**Pipeline (per content page):**
- Canvas 2433×2433px (206mm × 300dpi); content area 2362×2362px; bleed offset 35px (3mm × 11.811px/mm)
- Fill canvas with page bgColor (this IS the bleed — extends 3mm beyond content on all sides)
- Each slot: load ORIGINAL photo → Sharp object-fit:cover crop to slot dims → composite at slot position
- Composite SVG overlay (Sharp/librsvg rasterises vector art at 2362px — our SVGs have no embedded fonts)
- pdf-lib: assemble page PNGs into multi-page PDF at 206×206mm

**Cover (separate PDF):** canvas 481×272mm at 300dpi (5681×3213px); 18mm bleed wrap; back+spine(9mm)+front.

## Plan 11 — Standalone PDF export (BUILD FIRST, before order integration)
- **11-01** "Export State" button in template engine → downloads `book-state.json`
  (sequence, assignments with photo filenames, bgColors, slot coords, special photo filenames, captions)
- **11-02** `scripts/export-pdf.js` — content pages, photos + SVG overlay, NO captions yet.
  Args: `--photos <dir> --state book-state.json --out <dir>`. This is the **print-quality validation gate.**
- **11-03** Caption rendering layer (custom fonts NT Somic / EB Garamond / FirstTimeWriting via SVG text
  with embedded font data, composited over each page)
- **11-04** Cover PDF (front photo slot, spine, back; 18mm bleed)

## Plan 12 — Order flow integration (AFTER PDF quality validated)
- **12-01** Photo count calculator on scribble.html
- **12-02** `getOrderAssets` Cloud Function
- **12-03** Order loading UI in template engine
- **12-04** PDF export wired to GCS / order path (production: photos download from GCS, not local dir)

## Performance TO-DO
- Interface stalls 10-15 seconds when returning from alt-tab
- Investigate and fix scroll/render performance for large book layouts
- Options: virtual scroll (only render spreads near viewport), canvas layer management, avoid re-rendering on focus

</work_remaining>

<attempted_approaches>

## Sequential vs parallel HEIC processing
- Parallel HEIC conversion corrupts images due to shared WASM state — always keep sequential

## CSV as source of truth
- `csv-to-template.js` is now the build script — edit CSV, run script, scribble-data.js regenerates
- Cover CSV (`Scribble_Template_Sizing_Cover.csv`) also parsed; cover: block in scribble-data.js is generated, not hand-maintained
- Spread SVG paths are preserved by the script (not overwritten)
- Caption typography (font, sizePt, style, letterSpacing, lineSpacing) is in the spreads CSV and emitted into every caption object — template-engine.html reads from there, not hardcoded CSS

## Spread bgColor at spread vs variant level
- Changed to bgColor per variant — correct architecture

## EXIF Orientation swap — was wrong
- Added in a previous session; removed this session
- Modern browsers always auto-rotate — `naturalWidth/naturalHeight` is always correct visual dims
- Do NOT add this swap back

## Cover canvas — section bg divs replaced with CSS gradient
- Old approach: one `<div>` per section with `height: 600px` — caused cream strip from pixel rounding
- New approach: single `linear-gradient` on `canvas.style.background` covering 100% height
- bgColor in `sections.back` and `sections.spine` are fallback colors for the gradient only — visual source of truth for back/spine is the SVG itself
- Do NOT revert to div-per-section approach

## FP1 SVG masking
- Old "copy" SVGs had opaque Background_Color rect — Kseniia deleted them
- New FP Birthday 02 R.svg is a 3-spread export; heart frame art (cls-4) is clipped off-screen
- Fixed with CSS clip-path on the photo slot, not SVG masking

</attempted_approaches>

<critical_context>

## Architecture constants
- SCALE = 3 (px/mm): 200mm page = 600px canvas
- Bleed = 3mm per side; coordinates in scribble-data.js WITHOUT bleed (content area only)
- Page size for print: 206mm × 206mm (200mm + 3mm bleed each side)
- Book sizes: 40 pages (20 spreads) or 80 pages (40 spreads) — no other options
- SP0 is rightOnly: left page always blank white

## scribble-data.js structure (critical)
```js
window.SCRIBBLE_DATA = {
  spreads: {
    SP0: { label: 'Spread 0', rightOnly: true, pages: { right: { H: { bgColor, svg, slots }, V: {...} } } },
    SP1: { ... },
    // FP1–FP5 follow same structure
  }
}
```

## Slot structure
```js
{ x: 105, y: 70, w: 150, h: 100, captions: true, captionPosition: 'below (50mm from photo)', pool: 'regular' }
// heartClip: true — special flag, expands slot to full 600×600 + CSS clip-path heart
```

## SVG overlay behavior
- z-index 2 (above photos at z-index 1)
- SP Spread SVGs: pure PNG artwork, no background rect, zero embedded hex colors
- FP Birthday 02 R SVG: 3-spread export, heart frame art off-screen (cls-4 at x=674 outside viewBox)
- FP Birthday heart clip path (600×600 canvas):
  `M315.61,569.29 c189.41,-32.30,353.76,-502.10,161.52,-504.13 -75.98,-.82,-144.62,37.88,-166.39,37.88 -29.30,0,-56.97,-92.27,-165.83,-47.06 -200.49,83.33,48.24,534.15,170.70,513.31Z`

## Photo orientation detection
- Use `img.naturalWidth`/`img.naturalHeight` from browser Image object only
- Do NOT apply any EXIF swap — modern browsers already auto-rotate
- No EXIF Orientation tag present in DTS_PARENTHOOD professional JPEGs (pre-processed)

## bookAssignments structure
```js
window.bookAssignments = {
  0: { left: [], right: [0] },
  1: { left: [1], right: [2, 3] },
  // null = unassigned (special/artwork slot or pool exhausted)
}
```

## Cloud Function endpoint (AI captions, Plan 09-01)
```
POST https://europe-west1-aevia-uploads.cloudfunctions.net/generateCaption
Body: { imageDataUrl: 'data:image/jpeg;base64,...' }
Response: { caption: 'suggested text string' }
```
Check `functions/` to confirm this exists before wiring.

## No frameworks
- Pure HTML/CSS/JS — no React, Vue, build tools, npm on frontend
- All JS inline in the HTML file
- Asset paths from `pages/`: `../assets/Template_Scribble/...`

## Dev server
- `npx serve . -p 8080` from project root
- Template engine: `http://localhost:8080/pages/template-engine.html` (local only — not on Cloudflare)
- Public website: `https://aevia-test.pages.dev/pages/collections`

</critical_context>

<current_state>

## Completed and saved to disk
- `pages/template-engine.html` — B/I execCommand buttons removed; FP5 save now stores array `[leftName, rightName]`
- `scripts/export-pdf.js` — FP5 `pool === 'artwork'` fix; legacy string fallback for old book-state.json; upper-right / lower-right caption positions; captions_color + captions_alignment end-to-end; style pills for spread captions
- `assets/Template_Scribble/scribble-data.js` — captions_color (#493955) + captions_alignment columns wired
- `assets/Template_Scribble/Scribble_sizing_full.csv` — captions_color + captions_alignment columns added

## Committed and pushed
- All work through 2026-05-25 session committed and pushed.

## Known issues
- Caption bold/italic in PDF: uses style pills (Regular/Medium/Bold buttons in toolbar), NOT Ctrl+B. `spreadCaptionStyles` must be set in engine and book-state.json re-exported before PDF run.
- Any existing `book-state.json` with `FP5: "string"` format still works (legacy fallback) but will show same photo on both art gallery pages. Re-export from engine to get correct left/right split.

## In progress / not started
- **Plan 11 — Standalone PDF export:**
  - ~~11-01~~ ~~11-02~~ ~~11-03~~ **DONE**
  - **11-04 Cover PDF** — NEXT: 481×272mm canvas, 18mm bleed, back+spine(9mm)+front
- **Plan 12 — Order flow integration (after PDF validated):**
  - 12-01 Photo count calculator on scribble.html
  - 12-02 getOrderAssets Cloud Function
  - 12-03 Order loading UI in template engine
  - 12-04 PDF export wired to GCS / order path

## Blocking items
- FP1 heart frame decoration still missing — nice-to-have, needs Kseniia SVG re-export

## Open questions
- Performance: alt-tab stall (10-15s) — root cause not yet investigated
- PDF file size: currently PNG pages (large); switch to JPEG compression once print quality confirmed

</current_state>
```
