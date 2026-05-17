<original_task>
Understand and design the mechanics of the Aevia photo book template backend — the pipeline that takes customer-uploaded photos and assembles them into a book layout for staff review and export.
</original_task>

<work_completed>
## Pipeline architecture — agreed and documented

Discussed the full flow end-to-end and reached agreement on the architecture:

### The pipeline (agreed)
1. Customer selects template + optional special pages on website → system tells them how many photos to upload
2. Customer uploads photos → stored in GCS
3. Backend reads EXIF metadata from photos
4. Backend considers special page selections
5. Backend picks the correct layout variant per spread (based on photo orientations)
6. Backend places photos into slots at the correct coordinates
7. Web interface displays the assembled book — staff review it, generate captions via API
8. Export to SVG (agreed replacement for .ai — editable in Illustrator, actually buildable)

### Template structure — semantics agreed
- Each book has ~10 spreads (left page + right page = 20×20cm each)
- Each spread has multiple layout variants (e.g. 1a, 1b, 1c) depending on photo orientation mix
- Some spreads are "special" — only included if customer selected them (e.g. "First Steps" for toddler template)
- Photo slots defined per variant per page

### Spec table format — agreed
One Google Sheet / Excel file, all spreads and variants in one table:

| Spread | Variant | Page | Slot | X center (mm) | Y center (mm) | Width (mm) | Height (mm) | Orientation |
|--------|---------|------|------|---------------|---------------|------------|-------------|-------------|

- Page column: `L` or `R` (not 1/2 — avoids confusion across spreads)
- Coordinates: center of photo slot, measured from top-left of that page (each page is its own 0,0 origin)
- Bleed excluded from coordinates — code will handle 3mm bleed as a fixed offset
- Orientation values: `vertical`, `horizontal`, `square`
- Designer has already measured from center of photo — confirmed this is fine, code converts to top-left with half-width/height offset

### Visual reference format — agreed
- One PDF per spread, with each layout variant on a separate page inside it
- Named: `spread_01.pdf`, `spread_02.pdf`, etc.
- Stored at: `assets/template/spreads/`
- Spec table stored at: `assets/template/spec.xlsx` (or Google Sheet link)

### Export format decision
- User initially wanted `.ai` (Adobe Illustrator) export
- Agreed: SVG is the correct target — Illustrator opens SVG natively, stays fully editable, and is actually buildable from code
- `.ai` format is proprietary and not programmatically generatable

### Build strategy — agreed
- Start with ONE spread only to validate the whole pipeline works
- Add complexity (more spreads, captions, special pages) only after first spread renders correctly in browser
</work_completed>

<work_remaining>
## Immediate — user to deliver

### 1. Spec table (single spread)
- One spread only for the first test
- Google Sheet or Excel, structure as agreed above
- Save to `assets/template/spec.xlsx` or share link

### 2. Visual PDFs (single spread)
- PDF showing all variants of that spread (e.g. 1a, 1b, 1c as separate pages)
- Save to `assets/template/spreads/spread_01.pdf`

### 3. Test photos
- A folder of real JPEGs with EXIF dates (can be anything — doesn't need to be a customer order)
- Mix of portrait and landscape orientations
- Used to test EXIF reading and layout variant selection

## Once assets are received — code to build

### Phase 1 — single spread renderer
1. **EXIF reader** — Node.js script, reads orientation (portrait/landscape) from each photo
2. **Layout picker** — given a set of photos for a spread, selects the correct variant (1a/1b/1c) based on orientation counts
3. **Spec loader** — reads `spec.xlsx` or CSV into a JS data structure
4. **HTML template renderer** — generates an HTML page (20×20cm per page) with photos placed at correct coordinates using absolute positioning
5. **Browser preview** — open the HTML file locally in browser and verify photos appear in correct slots

### Phase 2 — full book (after Phase 1 validated)
- All 10 spreads
- Special page logic (conditional spreads based on customer selection)
- Caption generation integration (call `functions/caption/caption.js` per page)
- SVG export

### Phase 3 — web interface
- Staff review UI: view assembled book, click to regenerate captions, approve pages
- Eventually: "regenerate this photo slot" if photo doesn't fit well
</work_remaining>

<attempted_approaches>
## AI/Illustrator export — rejected
- User wanted `.ai` export so staff could manually adjust in Illustrator
- `.ai` is proprietary format — not generatable from code
- SVG agreed as replacement: Illustrator opens it natively, fully editable, buildable

## Center vs. top-left coordinates — non-issue
- Designer measured from center of photo slot, not top-left corner
- This is fine — code converts: `top_left_x = center_x - width/2`, same for Y
- No remeasurement needed
</attempted_approaches>

<critical_context>
## Book specs
- Page size: 20×20cm square (each page individually — spread = two pages side by side = 40×20cm open)
- Bleed: 3mm (excluded from spec table — added as fixed offset in code)
- Print resolution: 300dpi → ~2362px per page
- Generation size for motifs: 1024×1024 (2.3× upscale for print — acceptable for textures)

## Spec table conventions (must stay consistent)
- Page = `L` or `R`
- Coordinates = center of slot, from top-left of that page, in mm
- Bleed not included in coordinates
- Orientation = `vertical` | `horizontal` | `square`

## Template source
- Designer has Adobe Illustrator `.ai` file — this is the master
- Preliminary measurements already done from center of photo slots
- Spec table and PDFs not yet delivered — blocked on designer

## Caption module (already built, separate from this pipeline)
- Lives at `functions/caption/caption.js`
- Uses GPT-4o mini with vision
- Accepts: `--image` (local path or signed GCS URL), `--collection`, `--note`
- sign-url.js generates 15-min signed GCS URLs for private bucket files
- Tested end-to-end on a real customer photo — working

## Motif engine (separate, also unblocked)
- Lives at `motif-engine/`
- Still untracked in git
- Remaining motifs to generate: rock (attempt 3), bg_crosshatch (more runs), mountain_peak, trail, contour
- Mock-up book blocked on Ksenia's template layout

## Firebase / GCS
- Project: `aevia-uploads`
- Bucket: `aevia-uploads.firebasestorage.app`
- All files private — signed URLs required for access
- `sign-url.js` handles this for local testing

## Build approach philosophy
- Start with one spread, validate in browser, then scale
- Web preview first (HTML/CSS), SVG export later
- No frameworks — plain HTML/CSS/JS as per project conventions
</critical_context>

<current_state>
## Template backend pipeline
- **Architecture**: fully designed and agreed ✓
- **Spec table format**: agreed ✓
- **Visual reference format**: agreed ✓
- **Code**: not started — waiting on spec table and test photos from user

## Deliverables needed from user (blockers)
- [ ] Spec table (even just spread 1) — `assets/template/spec.xlsx`
- [ ] Visual PDF of spread 1 variants — `assets/template/spreads/spread_01.pdf`
- [ ] Test photos (JPEGs with EXIF) — any location

## Folder to create (not yet created)
- `assets/template/` — doesn't exist yet, user will create when dropping files

## Other work (from previous sessions, still pending)
- Motif engine: rock attempt 3, more bg_crosshatch runs, mountain_peak/trail/contour — not started this session
- `motif-engine/` and `functions/caption/` still untracked in git
- Dashboard previewUrl field — not started
- 6 missing product pages (vows, radiance, wander, terrain, sprout, wonder) — not started

## Open questions
1. Which Kevin Lucbert photo for the mock-up book cover?
2. Layout tool for mock-up (Affinity Publisher / Canva / InDesign)?
3. Should `sign-url.js` be integrated directly into `caption.js`?
4. bg_crosshatch warm palette variant — worth a separate prompt file?
5. Does the designer need a brief on the spec sheet format, or do they already know what to deliver?
</current_state>
