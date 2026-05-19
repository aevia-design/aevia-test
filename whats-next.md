```xml
<original_task>
Build a staff-facing browser tool (`pages/template-engine.html`) for rendering Toddler template photobooks. The tool allows staff to upload customer photos, configure book options (page count, functional pages), and preview the full book layout with correct spread templates, background colors, photo placement, captions, and print export.

The work follows a phased plan stored in `.planning/` with plans numbered 06-01 through 09-01.
</original_task>

<work_completed>

## Phase 06-01 — Spread renderer (completed in prior session)
- `pages/template-engine.html` built from scratch with:
  - Photo upload + HEIC conversion (sequential, not parallel — HEIC WASM has shared state)
  - EXIF DateTimeOriginal extraction for sort-by-date
  - Photo pool with thumbnail strip
  - `renderSpread(spreadId, assignments, spreadIndex)` function
  - Photo slots rendered at correct mm coordinates × SCALE=3 (600px canvas = 200mm at 3px/mm)
  - SVG overlay rendered on top of photos (z-index:2 over photos z-index:1)
  - Variant selection: photo orientation ('horizontal'/'vertical') → template key ('H'/'V'), fallback to 'default' then first key

## Phase 06-02 — Full book engine (completed this session)
- `buildBookSequence(pageCount, selectedFPs)` — interleaves FPs at evenly-spaced positions among standard spreads
- `assignPhotosToSpreads(sequence, pool)` — walks pool sequentially, skips special/artwork slots (assigns null), stores in `window.bookAssignments`
- `renderBook()` — builds sequence, assigns photos, renders all spread rows into `#book-canvas`
- `updateStripAssignedState()` — marks thumbnail strip items as assigned/unassigned
- Config bar: page count dropdown (40 or 80 only), FP checkboxes — both trigger `renderBook()` on change
- Upload handler now calls `renderBook()` instead of old smoke test

## template-data.js — bgColor at variant level (completed this session)
File: `assets/Template_Toddler/template-data.js`

Added `bgColor` property to every page variant across all 12 spreads. Key non-`#f8ead9` values:
- SP4 left H: `#fdd16f`, left V: `#fdd16f`, right H: `#fdd16f`, right V: `#fdd16f`
- SP6 left H: `#ff8773`, left V: `#ff8773`, right H: `#f8ead9`, right V: `#f8ead9`
- FP1 (Birthday): left H: `#fdd16f`, left V: `#fdd16f`, right H: `#fdd16f`, right V: `#fdd16f`
- FP2 (Heart): right H/V: `#fdd16f`; right S: no bgColor (full bleed photo)
- FP3 (Toy): left H: `#c16ac1`, left V: `#c16ac1`; right H/V: `#f8ead9`
- FP4 (Steps): left H/V: `#f8ead9`; right H/V: `#f8ead9`
- FP5 (Art gallery): left H: `#ff8773`, left V: `#ff8773`; right H/V: `#f8ead9`

Renderer updated: `if (variant.bgColor) canvas.style.background = variant.bgColor;`

## SP0 fixes (completed this session)
- Renamed label from `'Cover'` to `'Spread 0'` in template-data.js
- `renderSpread()` now renders a blank white `div.page-canvas` as left page for `rightOnly` spreads (SP0), instead of skipping it

## Page count dropdown fix (completed this session)
- Dropdown now shows only `40` and `80` (removed 20/60 options that were never valid)

## User-specified CSV change applied (completed this session)
- SP4 right V `bgColor` updated from `#f8ead9` → `#fdd16f` (user changed row 28 of CSV; manually synced to template-data.js)

## SVG color audit (completed this session)
- Grep'd all 46 SVG files for hex colors
- Finding: SP Spread SVGs contain NO embedded hex colors — they are PNG-embedded decorative artwork; background color comes entirely from template-data.js ✓
- Finding: FP Spread 1 "copy" files (`FP Birthday 01 L copy.svg`, `FP Birthday 02 R copy.svg`) still have a `Background_Color` rect with opaque fill — this blocks photos from showing through
- Action needed: Kseniia must remove the Background_Color rect from those two SVGs before FP1 can be tested

</work_completed>

<work_remaining>

## Immediate prerequisite (before FP1 testing)
- Ask Kseniia to open `assets/Template_Toddler/FP Spread 1/FP Birthday 01 L copy.svg` and `FP Birthday 02 R copy.svg` in Illustrator/Inkscape and delete the layer/element named `Background_Color` (opaque rect that covers the photo slot). Re-export as SVG. Until this is done, FP1 photos will not show through.

## Plan 06-03 — Full book scroll view
File: `.planning/phases/06-scroll/06-03-PLAN.md` (check if exists, may need to be created)
- Add spread labels (e.g. "Spread 0", "SP1", "FP3 — Favourite Toy")
- Add spread index / page number display
- Add sticky config bar so it stays visible while scrolling
- Add "scroll to spread N" quick navigation or anchor links
- Visual separator between spreads

## Plan 07-01 — Photo slot drag-and-drop
File: `.planning/phases/07-dnd/07-01-PLAN.md`
- Drag photo from thumbnail strip → drop onto a slot in any spread
- Drag photo from one slot → swap with another slot
- After any swap: update `window.bookAssignments`, re-render affected spread(s), update strip assigned state
- Visual feedback: drag-over highlight on target slot

## Plan 07-02 — Spread reorder + type swap
File: `.planning/phases/07-dnd/07-02-PLAN.md`
- Allow reordering spreads (drag spread row up/down)
- Allow changing spread type (e.g. swap SP2 → SP5 for a given position)
- After reorder/swap: re-run `assignPhotosToSpreads` and re-render

## Plan 07-03 — Caption layer
File: `.planning/phases/07-dnd/07-03-PLAN.md`
- Render caption text overlays on slots where `captions: true`
- Caption position data already in template-data.js per slot
- Editable text fields (contenteditable or input) for staff to type/edit captions
- Store caption text in `window.bookCaptions[spreadIndex][side][slotIndex]`

## Plan 08-01 — FP text panels
File: `.planning/phases/08-functional/08-01-PLAN.md`
- FP1 (Birthday wishes): full-spread text panel with editable birthday message
- FP2 (Funny words): full-spread text panel with editable funny quote/words
- Text panels rendered as centered overlay on the spread canvas

## Plan 08-02 — Special photo upload zones
File: `.planning/phases/08-functional/08-02-PLAN.md`
- Below main config bar, when FP3/FP4/FP5 are selected, show named upload zones:
  - FP3 "Favourite toy photo": 1 photo → `window.specialPhotos.FP3[0]`
  - FP4 "First steps photo": 1 photo → `window.specialPhotos.FP4[0]`
  - FP5 "Art gallery (1–2)": 1–2 photos → `window.specialPhotos.FP5[0]`, `[1]`
- Wire special photos to renderer: FP3/FP4 left slot uses special pool; FP5 both slots use artwork pool
- FP5 H/V variant picked independently per page based on each artwork's orientation
- If special photo not uploaded: show dashed placeholder "Upload [type] photo above"
- Special photos NOT draggable from main pool — replaced only by re-uploading in their zone

## Plan 09-01 — Print export + resolution warnings + AI captions
File: `.planning/phases/09-export/09-01-PLAN.md`
### Task 1 — Print CSS
- `<style media="print">` rules:
  - `@page { size: 206mm 206mm; margin: 0; }`
  - Hide: config bar, photo strip, spread controls, sequence pill bar, [Generate] buttons, spread labels, move/swap buttons
  - Each `.spread-row` gets `break-after: page`
- "Print book" button → `window.print()`
### Task 2 — Resolution warnings
- Min 1500px on shortest side (300 DPI × 150mm)
- Badge "⚠ Low res" on strip thumbnail
- Yellow warning border on slot in spread if low-res photo placed there
- Warning text: "Photo may print soft — shortest side {N}px, minimum 1500px"
### Task 3 — RAW format block
- Block .dng, .raw, .cr2, .nef, .arw uploads
- Alert: "RAW files are not supported. Please export as JPEG first."
### Task 4 — AI caption connection
- Confirm caption endpoint exists in `functions/` before wiring
- If live: POST `https://europe-west1-aevia-uploads.cloudfunctions.net/generateCaption`
  Body: `{ imageDataUrl: 'data:image/jpeg;base64,...' }`
  Response: `{ caption: 'suggested text string' }`
- Convert objectURL → base64 via canvas.toDataURL() before sending
- Spinner during call; "Caption error — try again" on failure
- If endpoint not live: stub button with "Coming soon" tooltip

## Cover spread
- Not yet designed by Kseniia — to be added as a separate spread type once artwork exists
- Will be a `rightOnly: false` spread with both pages having photos/design elements

</work_remaining>

<attempted_approaches>

## Sequential vs parallel HEIC processing
- Parallel HEIC conversion was tried initially but corrupted images due to shared WASM state
- Fixed to sequential processing: process one HEIC at a time with await
- Do NOT revert to parallel even if it seems faster — corrupts the decoded pixel data

## CSV as source of truth
- Initially considered making template-data.js auto-generate from CSV
- Rejected: CSV is a reference/design document; template-data.js is hand-maintained code
- Any CSV changes must be manually applied to template-data.js — there is no sync mechanism

## Spread bgColor at spread level vs variant level
- Initially bgColor was at spread level (one color per spread)
- CSV showed colors vary per page variant (e.g. SP4 left is `#fdd16f`, different pages have different colors)
- Changed to bgColor per variant — correct architecture now in place

## FP1 SVG transparency issue
- Assumed FP1 birthday SVGs were transparent overlays like SP spreads
- Grep discovered they have opaque `Background_Color` rect — photos don't show through
- Cannot fix in code — requires Kseniia to edit SVG source files

</attempted_approaches>

<critical_context>

## Architecture constants
- SCALE = 3 (px/mm): 200mm page = 600px canvas
- Bleed = 3mm per side, but coordinates in template-data.js are WITHOUT bleed (content area only)
- Page size for print: 206mm × 206mm (200mm + 3mm bleed each side)
- Book sizes: 40 pages (20 spreads) or 80 pages (40 spreads) — no other options
- SP0 is rightOnly: left page is always blank white (technical page); right has photo

## template-data.js structure (critical)
```js
window.TODDLER_DATA = {
  spreads: {
    SP0: {
      label: 'Spread 0',
      rightOnly: true,
      pages: {
        right: {
          H: { bgColor: '#f8ead9', svg: '...', slots: [...] },
          V: { bgColor: '#f8ead9', svg: '...', slots: [...] }
        }
      }
    },
    SP1: { ... },
    // FP1–FP5 follow same structure
  }
}
```

## Slot structure in template-data.js
```js
{
  x: 105, y: 70,       // mm from top-left of content area (no bleed)
  w: 150, h: 100,      // mm
  captions: true,
  captionPosition: 'below (50mm from photo)',
  pool: 'regular'      // or 'special' or 'artwork' — null-assigned by allocator
}
```

## SVG overlay behavior
- SVGs go on top of photos (z-index:2)
- Transparent cutout areas in SVG let photos show through
- SP Spread SVGs: zero embedded colors, pure PNG artwork, no background rect
- FP Birthday "copy" SVGs: have opaque Background_Color rect (BUG — needs Kseniia fix)
- Always render SVG at full 600×600px over the canvas

## Photo orientation → variant key mapping
```js
const orientToKey = { horizontal: 'H', vertical: 'V', square: 'S' };
```
Fallback chain: detected key → 'default' → first key in pageDef

## bookAssignments structure
```js
window.bookAssignments = {
  0: { left: [], right: [0] },          // SP0: no left slots, right slot uses photo index 0
  1: { left: [1], right: [2, 3] },      // etc.
  // null in array = unassigned (special/artwork slot or pool exhausted)
}
```

## FP selection and sequence building
- FPs are inserted at evenly spaced positions in the standard spread array
- Standard spreads cycle through SP1–SP6 to fill remaining positions
- Formula: `Math.round((i + 1) * (standards.length + 1) / (fpCount + 1))`
- Insertion done right-to-left to avoid index shifting

## Cloud Function endpoint (for AI captions, Plan 09-01)
```
POST https://europe-west1-aevia-uploads.cloudfunctions.net/generateCaption
Body: { imageDataUrl: 'data:image/jpeg;base64,...' }
Response: { caption: 'suggested text string' }
```
Check `functions/` directory to confirm this function exists before wiring.

## No frameworks
- Pure HTML/CSS/JS — no React, Vue, build tools, npm on frontend
- All JS is inline in the HTML file
- Asset paths from `pages/`: `../assets/Template_Toddler/...`

## Dev server
- Run from project root: `npx serve . -p 8080`
- Template engine: `http://localhost:8080/pages/template-engine.html`

</critical_context>

<current_state>

## Completed and saved to disk
- `pages/template-engine.html` — full book engine working (Plans 06-01, 06-02 complete)
- `assets/Template_Toddler/template-data.js` — bgColor at variant level for all 12 spreads; SP0 label fixed; SP4 right V = `#fdd16f`

## In progress / not started
- Plan 06-03 (scroll view): not started
- Plan 07-01 (drag-and-drop): not started
- Plan 07-02 (spread reorder): not started
- Plan 07-03 (captions): not started
- Plan 08-01 (FP text panels): not started
- Plan 08-02 (special photo uploads): not started
- Plan 09-01 (print export + resolution + AI captions): not started

## Blocking items
- FP1 (Birthday) cannot be tested until Kseniia removes `Background_Color` rect from:
  - `assets/Template_Toddler/FP Spread 1/FP Birthday 01 L copy.svg`
  - `assets/Template_Toddler/FP Spread 1/FP Birthday 02 R copy.svg`

## Cover spread
- Not yet in template-data.js — no artwork exists yet; deferred until Kseniia designs it

## Open questions
- Does `functions/generateCaption` Cloud Function exist? (Check before Plan 09-01 Task 4)
- FP2 right S slot has `no background, full bleed photo` — confirm this means the canvas background should be transparent/none, not a color (currently handled by checking `variant.bgColor` truthy)

## User's last status
User said "I'd test with some more photos meanwhile" after the SP4 color fix — they were actively testing the current build. Next plan should be confirmed with user before starting.

</current_state>
```
