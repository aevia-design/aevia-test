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

## Session 2026-05-27 (continued) — Plan 12-03: Load Order into Engine

### Plan 12-03 complete
- `functions/upload.js`: builds `photoManifest` on order creation (`{ cover, special: {slug: [path]}, pool: [paths] }`), saves to Firestore
- `functions/index.js`: new `getOrder` Cloud Function — auth via `X-Staff-Key: 865865`, reads Firestore, returns order metadata + 1h signed read URLs + `storedNames`
- `functions/.env`: `STAFF_KEY=865865` added; `EMAIL_USER/EMAIL_PASS/EMAIL_NOTIFY` also added (email was never configured before — now working)
- `pages/template-engine.html`: Local/Order toggle pill in config bar. Order mode hides `+ Add Photos` + special panel; shows order number input + Load button. `loadOrderIntoEngine()` sets page count, FP checkboxes, downloads photos (HEIC filenames preserved from `storedNames`), pre-fills FP text panels post-render via DOM query + `bookCaptions`. Silent failure message if no `photoManifest` (pre-12-03 orders).
- `cors.json`: added `GET` to allowed methods (was only PUT/OPTIONS) — required for browser to download GCS signed read URLs
- All deployed + tested end-to-end. First order load working.

### Watch-outs
- `photoManifest` only saved on orders submitted after this deploy. Pre-existing orders show "no photo manifest" message in Order mode — staff must use Local mode for those.
- FP text panels are populated AFTER `renderBook()` (which resets `bookCaptions`). Text is written to DOM element + `bookCaptions[spreadIndex].left['textPanel']`. Only `left` side wired (all FP text panels live on left pages — correct for Scribble template).
- GCS CORS now allows GET from `*` — needed for signed URL downloads in browser.

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

## Session 2026-05-22 + later — Plan 11 (PDF export) and Plan 12-01 (order form)

### Plan 11 (all sub-plans 11-01 → 11-04) — DONE
- `scripts/export-pdf.js` with `--mode preview|print`
- Cover PDF (445×236mm, 18mm bleed); per-page print PDFs
- Cover captions (front + spine) rendered; `coverCaptions` exported from engine
- `book-state.json` export button in engine

### Plan 12-01 (partial, now COMPLETE) — Order form FP refactor
- `initFPSections()`: renders photo zone(s) + text field per FP in Step 2 (co-located)
- FP5: 2 upload zones (fp5-0 / fp5-1); per-page captions (array stored in fpTexts.fp5)
- FP3: caption field added (reversed earlier null decision — left page has photo + caption)
- All FPs: RAW formats stripped from accept attributes
- Duplicate detection: files with same name skipped silently
- Thumbnails: filename label shown on each photo
- `calcPhotoTarget()`: mirrors engine's buildBookSequence + slot counting; assumes H orientation
- Validation + fpTexts collection use SCRIBBLE_DATA directly (not URL inputType)
- Copy cleaned: em-dashes removed, hints shortened in form and scribble-data.js
- Public site was broken (initFPSections called but not defined) — fixed and pushed

### template-engine-public.html
- Snapshot of template-engine.html deployed to Cloudflare Pages for demo/sharing
- Local template-engine.html is the working version; public copy is a separate file

## Session 2026-05-26 — Cover + caption PDF/engine parity

### Cover captions
- Added `Captions_1_fontColor` / `Captions_2_fontColor` columns in `Scribble_Template_Sizing_Cover.csv`
- `csv-to-template.js` parses and emits `color` for cover captions
- `drawCoverCaptions` now applies the colour to both rotated (spine) and non-rotated (front) captions
- Spine rotation direction fixed: pdf-lib uses CCW (math convention), CSS uses CW. CSS `rotate(270deg)` → pdf-lib `angle: 90`
- Spine positioning math rewritten: after 90° CCW rotation, drawText `x` controls horizontal-on-spine, `y` controls vertical-along-spine (the two were swapped)
- Spine horizontal centering uses `font.heightAtSize(sizePt, { descender: false }) / 2` as the offset (cap-height approximation, not `sizePt / 2`)
- Medium style (weight 500) now resolves to `_medium` font variant — was falling through to `regular`

### Spread captions
- Engine caption font size was 26% too big — browsers resolve CSS `pt` at 96dpi but the canvas is ~76dpi. Changed `sizePt + 'pt'` to `(sizePt * SCALE * 25.4 / 72) + 'px'` in both render and toolbar-update paths. Engine now wraps exactly as the PDF
- `upper-right` / `lower-right` / `above` / `below` captions now word-wrap in the PDF (new `wrapText()` helper). Width formula matches engine: gap from photo = `capDef.offset` (mm), 2mm right padding
- Same weight-500 → medium fix applied to spread caption style resolver

### Caption font sizes increased
- User updated `Scribble_sizing_full.csv` to 16pt across spread captions
- Ran `node csv-to-template.js` to regenerate `scribble-data.js`

## Session 2026-05-25 (session 3) — Order form polish

### TO-DOs #45 + #46 — DONE
- #45: Quality badge on FP photo upload — ✓ OK (green) / LOW RES (red) for JPEG/PNG; skipped for FP5 art gallery (scanned art is intentionally low-res)
- #46: `scripts/simulate-photo-count.js` — all orientation combos produce identical slot counts in Scribble; H-only estimate is exact, no range needed

### Order form bug fixes
- `cancelAddon()` now calls `updateStep2Bar()` — photo count recalculates when FP removed
- Cover photo now has same res badge as FP zones

### HEIC conversion in order form
- `convertHeic()` calls same Cloud Function as template engine (`convertHeic` at Firebase europe-west1)
- All upload zones (cover, FP, main pool) convert HEIC → JPEG before displaying thumbnail
- "Converting…" indicator shown while in flight (overlay in grid; text in single-preview)
- Res check runs on the converted JPEG blob (was previously skipped for HEIC)

### Lightbox
- Click any photo (grid thumbnail, cover preview, FP preview) → full-screen lightbox
- Click outside or × to close; zoom-in cursor on thumbnails

### Copy
- "Send more if you have them" removed — count is now exact

</work_completed>

<work_remaining>

## Template engine (pages/template-engine.html)

### Performance TO-DO (TO-DO #43)
- Interface stalls 10-15 seconds when returning from alt-tab
- Investigate virtual scroll or viewport-gated rendering

### FP1 heart frame decoration
- Still missing — nice-to-have, needs Kseniia SVG re-export

### Spread caption toolbar (Plan future)
- Same toolbar as cover for spread slot captions (contenteditable overlays)
- Typography defaults from scribble-data.js; toolbar reads/overrides per caption
- Not yet started

## Order form (pages/order.html) — Plan 12

### Plan 12-02 — Firestore schema additions (not started)
- `fpTexts`, `fpSelections`, `photoCount` fields in Firestore doc

### Plan 12-03 — Engine "Load order" flow (not started)
- Staff enters order number → engine fetches Firestore doc + downloads photos from GCS signed URLs
- Pre-populates FP text panels from fpTexts

### Plan 12-04 — PDF export wired to GCS / order path (not started)
- Production: photos download from GCS, not local dir

## Wider product pipeline

### Phase 3 — Payment + automation (not started)
- Stripe Checkout Sessions + webhooks
- Firebase Scheduled Functions for reminder emails
- Preview delivery via GCS signed URL

### Phase 4 — Print + delivery (not started)
- Print house API integration (Prodigi or Gelato — TBD)
- Tracking webhooks, customer notifications

</work_remaining>

<attempted_approaches>

## Sequential vs parallel HEIC processing
- Parallel HEIC conversion corrupts images due to shared WASM state — always keep sequential

## orderFormPhoto/orderFormMeta — sidecar file, not CSV
- These fields are NOT derived from the CSV — they're manually maintained in `assets/Template_Scribble/scribble-orderform.json`
- `csv-to-template.js` reads that file and injects the data when serializing FP spreads
- Do NOT put these fields directly in scribble-data.js expecting them to survive — every CSV run overwrites the FP entries
- To change order form text/hints for an FP: edit `scribble-orderform.json`, then run `node csv-to-template.js`

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

## Order form: initAddonFields + initSpecialPhotoZones — replaced
- Old approach: Step 1 had text fields for FP2 words; Step 2 had photo zones separate from text
- New approach: initFPSections() combines photo + text per FP in one section, all in Step 2
- Old functions left as dead code but no longer called — do not revive

## Order form: photo count formula history
- v1: `regularSpreads * 1.5` min / `* 3` nice — too wide, wrong denominator
- v2: `1 + (spreads-1-FPs)*2` — closer but assumed 2 slots/spread and 0 regular slots for all FPs
- v3 (current): `calcPhotoTarget()` — mirrors engine's buildBookSequence + real slot count from SCRIBBLE_DATA, H orientation assumed. FP3/FP4 right pages correctly counted as consuming regular slots.

## FP3 orderFormMeta: null → caption field
- Initially set null (staff writes caption from photo)
- Reversed: left page has photo + caption overlay; customer knows the toy's name/story
- Now has standard `textPrompt / hint / placeholder` fields

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
    FP1: { orderFormPhoto: { count, hint }, orderFormMeta: { textPrompt, hint, placeholder } },
    FP2: { orderFormPhoto: null, orderFormMeta: { funnyWords: true, minWords, maxWords } },
    FP3: { orderFormPhoto: { count: 1, hint }, orderFormMeta: { textPrompt, hint, placeholder } },
    FP4: { orderFormPhoto: { count: 1, hint }, orderFormMeta: { textPrompt, hint, placeholder } },
    FP5: { orderFormPhoto: { count: 2, hint }, orderFormMeta: { count: 2, labels: [...], placeholder } },
  }
}
```

## FP pool consumption (critical for photo count)
- FP1, FP2, FP5: 0 regular slots — skip pool consumption entirely
- FP3, FP4: right page has regular photo slots — DO consume from main pool
- calcPhotoTarget() in order.html handles this correctly via real slot counting

## FP5 data structures
- `specialFiles['fp5-0']` and `specialFiles['fp5-1']` in order.html (2 separate File objects)
- `fpTexts.fp5` is an array `['left caption', 'right caption']` (not a string)
- In book-state.json: `specialPhotos.FP5` is an array `['leftPhoto.jpg', 'rightPhoto.jpg']`
- In window.specialPhotos (engine in-memory): FP5 is also an array; other FPs are strings

## Slot structure
```js
{ x: 105, y: 70, w: 150, h: 100, captions: true, captionPosition: 'below (50mm from photo)', pool: 'regular' }
// heartClip: true — special flag, expands slot to full 600×600 + CSS clip-path heart
// pool: 'special' — FP1/FP3/FP4 special photo
// pool: 'artwork' — FP5 art gallery
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

## Cloud Function endpoint (AI captions)
```
POST https://europe-west1-aevia-uploads.cloudfunctions.net/generateCaption
Body: { imageDataUrl: 'data:image/jpeg;base64,...' }
Response: { caption: 'suggested text string' }
```

## No frameworks
- Pure HTML/CSS/JS — no React, Vue, build tools, npm on frontend
- All JS inline in the HTML file
- Asset paths from `pages/`: `../assets/Template_Scribble/...`

## Dev server
- `npx serve . -p 8080` from project root
- Template engine: `http://localhost:8080/pages/template-engine.html` (local only — not on Cloudflare)
- Public snapshot: `http://localhost:8080/pages/template-engine-public.html` (also on Cloudflare)
- Public website: `https://aevia-test.pages.dev/pages/collections`

</critical_context>

<current_state>

## All committed and pushed (through 2026-05-27)

**Phase 13 complete (bleed coords, PDF polish):**
- CSV parser rewritten: comma delimiter, index-based parsing, `xBleed/yBleed` on slots, caption box `xMm/yMm/wMm/hMm/halign/valign`, `full_bleed` column
- Engine: coord-based captions, cover bleed offset, valign:bottom grows upward, FP2 grows from centre, full-bleed slot support
- PDF: SVG viewBox expanded by bleed before rasterising, coord-based captions + word wrap, EB Garamond static TTFs + per-character drawText (ligature workaround), blank QR page, text panel word wrap, cover compositing simplified
- `scribble-data.js` regenerated; EB Garamond TTF family added to `assets/fonts/`

**Plan 13-02 complete (code hygiene):**
- `resolveColor()` at module level (was duplicated)
- `stripHtml()` warns on unrecognised HTML tags
- `ov.weight` type guard in both caption renderers
- `resolveVariant()` console.warns on fallback to wrong variant
- `0.75` cap-height ratio commented at all drawText baseline sites
- Legacy `full_bleed` bgColor string detection removed from `csv-to-template.js`

**Product north star confirmed (ideation session):**
- Journey steps 1–11 agreed. TO-DO #51 (page-flip viewer, StPageFlip) and TO-DO #52 (customer-facing limited engine with `?mode=customer&token=`) added.
- TO-DO #52 decision deferred; context documented in TO-DOS.md.

## Next priorities

1. **Plan 12-03 polish** — user has feedback from first touch. Address in next session before moving on.
2. **Plan 12-04** — PDF export wired to GCS (now unblocked by 12-03).
3. **TO-DO #47** — Mobile responsiveness (home.html + order.html).
4. **TO-DO #51** — Page-flip preview viewer (StPageFlip + individual page PNGs). ~2 days, high visual impact.

**Deferred (do NOT start yet):**
- **TO-DO #52** — Customer-facing engine. Decision deferred.
- **TO-DO #48** — Bleed SVGs re-export. Wait for Kseniia.

## Known issues / watch-outs
- HEIC conversion silent failure: if Cloud Function fails all 3 retries, no error shown to user.
- Cover `sections.back/spine/front.xMm` are content-relative (add `COVER_BLEED_PX`). Cover photo slot and captions `xMm/yMm` are absolute (bleed already included). Do not unify without auditing all five call sites.
- EB Garamond uses per-character `drawText` (LIGATURE_FONTS). Adding a new ligature-heavy font requires same treatment + re-verify spine rotated-text path.
- Font pipeline: static TTF/OTF only. No woff2, no variable fonts.
- Per-line caption styling not supported — use separate caption slots.
- `photoManifest` only on orders submitted after 2026-05-27 deploy. Older orders → Local mode only.

</current_state>
```
