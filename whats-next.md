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

## template-data.js — bgColor at variant level (completed earlier)
- bgColor per variant for all 12 spreads; SP0 label fixed; SP4 right V = `#fdd16f`

## Session 2026-05-19 — FP1 heart + orientation fixes

### FP1 SVG path fix
- `template-data.js` SVG paths updated from `FP Birthday 01 L copy.svg` → `FP Birthday 01 L.svg` and `FP Birthday 02 R copy.svg` → `FP Birthday 02 R.svg` (Kseniia replaced the files)

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

</work_completed>

<work_remaining>

## Immediate / next session

### Plan 06-03 verification
- Confirm scroll view shows correct labels and spread counts for 40 and 80 page books

## Plans not yet started

### Plan 07-01 — Photo slot drag-and-drop
- Drag photo from thumbnail strip → drop onto slot
- Slot-to-slot swap
- After swap: update `window.bookAssignments`, re-render affected spread, update strip state
- Drag-over highlight on target slot

### Plan 07-02 — Spread reorder + type swap
- Drag spread row up/down to reorder
- Change spread type (e.g. SP2 → SP5)
- After change: re-run `assignPhotosToSpreads` and re-render

### Plan 07-03 — Caption layer
- Caption text overlays on slots where `captions: true`
- Editable (contenteditable or input) fields
- Store in `window.bookCaptions[spreadIndex][side][slotIndex]`

### Plan 08-01 — FP text panels
- FP1 (Birthday wishes): editable birthday message overlay
- FP2 (Funny words): editable funny quote overlay

### Plan 08-02 — Special photo upload zones
- FP3 "Favourite toy photo" / FP4 "First steps photo" / FP5 "Art gallery (1–2)"
- Named upload zones appear when those FPs are selected
- Wire to renderer; show dashed placeholder if not uploaded
- Special photos not draggable from main pool

### Plan 09-01 — Print export + resolution warnings + AI captions
- Print CSS (`@page 206mm × 206mm`, hide UI controls, `break-after: page`)
- "Print book" button → `window.print()`
- Low-res warnings (min 1500px shortest side): badge on strip, yellow border on slot
- Block RAW file uploads (.dng, .raw, .cr2, .nef, .arw)
- AI caption endpoint (check `functions/generateCaption` exists first)

### Plan 10-01 — bloom.html FP selector + photo count calculator
- Add "Personalise your book" section to bloom.html
- 5 FP checkboxes + live photo count based on selections

## Performance TO-DO
- Interface stalls 10-15 seconds when returning from alt-tab
- Investigate and fix scroll/render performance for large book layouts
- Options: virtual scroll (only render spreads near viewport), canvas layer management, avoid re-rendering on focus

</work_remaining>

<attempted_approaches>

## Sequential vs parallel HEIC processing
- Parallel HEIC conversion corrupts images due to shared WASM state — always keep sequential

## CSV as source of truth
- CSV is reference only; template-data.js is hand-maintained code
- Future plan: Node.js build script (CSV → template-data.js) — user noted for later

## Spread bgColor at spread vs variant level
- Changed to bgColor per variant — correct architecture

## EXIF Orientation swap — was wrong
- Added in a previous session; removed this session
- Modern browsers always auto-rotate — `naturalWidth/naturalHeight` is always correct visual dims
- Do NOT add this swap back

## FP1 SVG masking
- Old "copy" SVGs had opaque Background_Color rect — Kseniia deleted them
- New FP Birthday 02 R.svg is a 3-spread export; heart frame art (cls-4) is clipped off-screen
- Fixed with CSS clip-path on the photo slot, not SVG masking

</attempted_approaches>

<critical_context>

## Architecture constants
- SCALE = 3 (px/mm): 200mm page = 600px canvas
- Bleed = 3mm per side; coordinates in template-data.js WITHOUT bleed (content area only)
- Page size for print: 206mm × 206mm (200mm + 3mm bleed each side)
- Book sizes: 40 pages (20 spreads) or 80 pages (40 spreads) — no other options
- SP0 is rightOnly: left page always blank white

## template-data.js structure (critical)
```js
window.TODDLER_DATA = {
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
- Asset paths from `pages/`: `../assets/Template_Toddler/...`

## Dev server
- `npx serve . -p 8080` from project root
- Template engine: `http://localhost:8080/pages/template-engine.html`

</critical_context>

<current_state>

## Completed and saved to disk
- `pages/template-engine.html` — Plans 06-01, 06-02, 06-03 complete; FP1 heart clip working; orientation detection fixed
- `assets/Template_Toddler/template-data.js` — bgColor per variant, SVG paths updated to non-copy filenames, heartClip flag on FP1 right slot

## Untracked files to commit this session
- `pages/template-engine.html` (new file — not yet in git)
- `assets/Template_Toddler/template-data.js` (new file — not yet in git)
- `assets/Template_Toddler/Spreads/FP Spread 1/FP Birthday 01 L.svg` (new, replaced by Kseniia)
- `assets/Template_Toddler/Spreads/FP Spread 1/FP Birthday 02 R.svg` (new, replaced by Kseniia)

## Deleted files (old "copy" SVGs — no longer needed)
- `assets/Template_Toddler/Spreads/FP Spread 1/FP Birthday 01 L copy.svg` (deleted)
- `assets/Template_Toddler/Spreads/FP Spread 1/FP Birthday 02 R copy.svg` (deleted)

## Modified SVGs (Kseniia's artwork updates)
- All SP Spread SVGs (SP Spread 0–6, all H/V variants) — modified by Kseniia
- All FP Spread SVGs (FP Spread 2–5) — modified by Kseniia

## In progress / not started
- Plan 07-01 (drag-and-drop): not started
- Plan 07-02 (spread reorder): not started
- Plan 07-03 (captions): not started
- Plan 08-01 (FP text panels): not started
- Plan 08-02 (special photo uploads): not started
- Plan 09-01 (print export + resolution + AI captions): not started

## Blocking items
- None currently (FP1 heart now renders; orientation detection fixed)
- FP1 heart frame decoration missing — nice-to-have, needs Kseniia SVG re-export

## Open questions
- Does `functions/generateCaption` Cloud Function exist? (Check before Plan 09-01 Task 4)
- FP2 right S slot — no bgColor means transparent/none canvas (currently handled correctly)
- Performance: alt-tab stall (10-15s) — root cause not yet investigated

</current_state>
```
