# Brief: Papercut Template

_Written: 2026-06-22, Session 67_

## What
Add the **Papercut** template end-to-end — data file → registry (3 surfaces) → order form → product page rename → fonts → PDF. This replaces the "Wonder" placeholder (`wonder.html` → `papercut.html`) and delivers the third kids template required for MVP.

## Source files
- `assets/Template_Papercut/Papercut_sizing_full.csv` — spread geometry (Source Sans 3 throughout)
- `assets/Template_Papercut/Papercut_Template_Sizing_Cover.csv` — cover + spine geometry
- `assets/Template_Papercut/SVG/` — all spreads, H/V variants per page

## Template anatomy

**Book:** 200×200 mm square, 3 mm bleed. Identical page count contract to Scribble (SP0–SP6 + FP1–FP5).

### Standard spreads SP0–SP6
Each spread follows the pattern: one or two photo slots per page, optional caption below/above/right. No full-bleed slots. Background colours vary per spread (see CSV `bgColor`).

| SP | Left page | Right page | Notes |
|----|-----------|-----------|-------|
| 0 | — | 1 photo + caption | SP0 is right-only |
| 1 | 1 photo + caption | 2 photos (no caption) | |
| 2 | 2 photos | 1 photo | |
| 3 | 2 photos | 1 photo + caption | |
| 4 | 2 photos | 1 photo + caption | **Graphics BEHIND photos** (see §Overlay order) |
| 5 | 2 photos | 1 photo + caption above | |
| 6 | 1 photo + caption | 1 photo + caption | |

SP0 is the right-only spread (same pattern as Scribble/Newborn SP0).

### Functional spreads
| FP | Sub-type | Left | Right | Special |
|----|----------|------|-------|---------|
| FP1 | Birthday | Text panel (birthday wishes) | **Heart photo** (custom clip-path, 33:35 aspect) | Heart shape different from Scribble |
| FP2 | Funny words | Text panel | **Full-bleed photo** (200×200 mm, no overlay, square) | Right is full bleed |
| FP3 | Favourite toy | **Functional photo** + caption above | 1 regular photo | Toy is the functional photo |
| FP4 | First steps | **Functional photo** + caption above | Text-only (caption, no photo) | **Graphics BEHIND photos** (see §Overlay order) |
| FP5 | Art gallery | **Artwork** (left H/V) | **Artwork** (right H/V) | Same pool as Scribble FP5 |

## Overlay z-order — key new concept

**Default for all other templates:** SVG overlay renders behind photo slots (photos on top).

**Papercut design intent:** for most spreads the decorative paper-cut shapes are designed to sit **on top of the photos** (layered paper-cut aesthetic). This requires a new flag in the data file and engine.

**Exceptions — photos on top (normal/behind):** SP4 and the Cover.

### Implementation approach
Add a per-spread flag in `papercut-data.js`:
```js
overlayAbovePhotos: true   // SVG overlay element gets z-index above photo slots
// omit or false           // SVG overlay behind (default, existing behaviour)
```

In the engine, when rendering a spread from Papercut:
- If `overlayAbovePhotos: true`: insert the SVG overlay element **after** (higher DOM order than) the photo slot elements, or give it a higher `z-index`.
- Keep Scribble/Newborn unaffected — only apply when `overlayAbovePhotos` is truthy.

**Spreads with `overlayAbovePhotos: true`:** SP0, SP1, SP2, SP3, SP5, SP6, FP1, FP2, FP3, FP5.
**Spreads with `overlayAbovePhotos` omitted/false:** SP4, Cover.

## Font: Source Sans 3

**New font — download required before Stage 2.**

Source Sans 3 is available free from Google Fonts. Download two weights:
- `SourceSans3-Regular.ttf`
- `SourceSans3-Bold.ttf`

Place in `assets/fonts/`. Register `@font-face` in engine + customer-preview. Add to `FONT_MAP` in `export-pdf.js`.

Cover CSV uses `Source Sans 3 Bold` (26pt, title) and `Source Sans 3 Regular` (28pt, year). Spread CSV uses `Source Sans 3` Regular 16pt throughout.

**Ligature bug check required** (LEARNINGS/memory `project_pdf_font_rules`): test both weights in the PDF after Stage 5. If gaps appear at specific character positions, add to `LIGATURE_FONTS`.

## FP1 heart clip-path

The custom heart-like shape for the FP1 right-page photo slot is defined in `FP Birthday 02 Right.svg` (viewBox 0 0 566.929 566.929):

```
M281.825,537.918l111.66-117.366,124.497-236.448-58.871-103.265
-103.265-18.337-78.708,34.898-95.009-35.864-97.649,28.31
-35.534,117.419,48.255,139.938,40.534,72.382,144.09,118.331Z
```

Implement exactly as Scribble's heart: define a `<clipPath>` in the engine using this path, applied to the FP1 right photo slot. The CSV gives position 105,100 with-bleed (108,103), 165×175 mm, aspect 33:35.

**Note:** FP Birthday 01 Left and FP Birthday 02 Right SVGs are ~65 MB each (embedded raster photo placeholders from Illustrator). `shrinkOversizedSvg()` in `export-pdf.js` handles these automatically (>8 MB gate) — no special action needed but be aware the PDF render path will downscale the embedded images.

## Cover

**CSV:** `Papercut_Template_Sizing_Cover.csv`

- **Front page:** right-page only (spine on left). One photo slot: rectangle, 140×100 mm, positioned at 310,100 without-bleed (328,118 with-bleed). Two captions: cap1 (year/title, Source Sans 3 Bold 26pt) at 283,162; cap2 (album name, Source Sans 3 Regular 28pt) at 372,162. Background `#f8ead9`.
- **Spine:** two captions only (name + year), rotated 270°, Source Sans 3 Regular 16pt. No photo slot.
- **Overlay z-order:** `overlayAbovePhotos: false` — graphic elements render behind the cover photo (photos on top).

Cover SVG: `SVG/Cover/Artboard 1.svg` (19 KB, pure vector, fine for PDF).

## Rename: Wonder → Papercut

All references to "Wonder" must be updated:

| File | Change |
|------|--------|
| `pages/wonder.html` | Rename to `pages/papercut.html`; update title, meta, `template` param to `'Papercut'` |
| All pages linking to `wonder.html` | Update href to `papercut.html` |
| `pages/collections.html` | Update card link |
| `pages/home.html` | Update if linked |
| TEMPLATE_REGISTRY | Key `'papercut'` (lowercased of `'Papercut'`) |
| Order form (`pages/order.html`) | Product page sends `template: 'Papercut'` |

## Implementation stages

Follow the adding-templates playbook (memory `project_adding_templates`). Do not skip the render smoke test before E2E.

### Stage 1 — `papercut-data.js`
Create `assets/Template_Papercut/papercut-data.js`. Model after `scribble-data.js`. Define:
- `PAPERCUT_COVER` — cover slot + captions from `Papercut_Template_Sizing_Cover.csv`
- `PAPERCUT_SPREADS` (SP0–SP6) — H and V variants per page, `bgColor`, `overlayAbovePhotos` flags
- `FP1_BIRTHDAY` — text panel (left) + heart photo (right, custom clip-path)
- `FP2_FUNNY_WORDS` — text panel + full-bleed photo (right, `fullBleed: true`, no overlay)
- `FP3_TOY` — functional photo left + regular right
- `FP4_STEPS` — functional photo left + text-only right (`overlayAbovePhotos: false`)
- `FP5_ART` — two artwork photos (H and V variants both sides)

All geometry values come from the CSV (source of truth). Do not hard-code values that appear in the CSV.

### Stage 2 — Fonts
Download Source Sans 3 Regular + Bold TTF from Google Fonts. Place in `assets/fonts/`. Add `@font-face` to:
- `pages/staff/template-engine.html`
- `pages/customer-preview.html`
Add to `FONT_MAP` in `scripts/export-pdf.js`. Add to caption font picker in both engines.

### Stage 3 — Registry + engine render
Add `'papercut'` entry to `TEMPLATE_REGISTRY` in all three surfaces (engine, customer-preview, export-pdf). Implement:
- Standard spread rendering (SP0–SP6)
- `overlayAbovePhotos` z-index logic (flag on spread definition)
- FP1 heart clip-path (custom `<clipPath>` element)
- FP2 full-bleed photo (no overlay, full bleed, square)
- FP3 functional photo (toy, left page)
- FP4 functional photo + text-only right page
- FP5 two-artwork render (same pool logic as Scribble FP5)
- Cover slot + spine captions

**Smoke test:** load a test order in the staff engine with each spread type. Confirm 0 JS errors and correct z-order (overlay above/below per spec) before proceeding.

### Stage 4 — Order form
Add Papercut-specific fields to `pages/order.html`:
- FP1: birthday wishes text (same as Scribble)
- FP2: funny words text
- FP3: favourite toy caption
- FP4: first steps caption
- FP5: two artwork photo uploads (`fpart` slug)

Reuse the existing `fpKeyForSlug`/`resolveFpKey` mechanism from Newborn. No new backend deploy needed (all FP data travels via `fpTexts`/`fpSelections`).

### Stage 5 — Customer-preview + PDF parity
- Verify Source Sans 3 renders identically in customer-preview (same `@font-face`, same font map)
- Run PDF export smoke test on a test book state
- Ligature bug check: if gaps appear at specific character positions, add Source Sans 3 to `LIGATURE_FONTS` in `export-pdf.js`
- Confirm `shrinkOversizedSvg()` fires on FP1 Birthday SVGs (both ~65 MB)
- Confirm `overlayAbovePhotos` doesn't affect PDF (PDF renders SVG then draws photo on top always — check whether this holds or needs per-spread handling)

### Stage 6 — Wonder → Papercut rename
Rename `wonder.html` → `papercut.html`. Update all internal links. Set `template: 'Papercut'` on the CTA. Update TEMPLATE_REGISTRY key to `'papercut'`.

### Stage 7 — E2E + merge
Full end-to-end on a test order: order form → staff engine (all spreads, FP1–FP5, cover) → customer-preview → PDF. Then merge `feature/new-template` → `main`.

## Hotspots to audit (from adding-templates playbook)
1. **`overlayAbovePhotos` flag** — any spread definition that omits it must default to `false` (behind) to avoid breaking Scribble/Newborn.
2. **FP2 full-bleed right** — the `fullBleed: true` path must not render an SVG overlay at all (no file to show).
3. **FP4 right page is text-only** — no photo slot means `calcPhotoTarget` must not count it; guard against `null` slot access.
4. **Clip-path scaling** — the heart path is in SVG units (566.929 viewBox). Verify it scales correctly when the engine renders at canvas pixel dimensions.
5. **Cover photo behind overlay** — confirm `overlayAbovePhotos: false` on cover prevents the SVG from appearing above the photo.
6. **Mixed-case functional keys** — use `fpKeyForSlug`/`resolveFpKey` (from Newborn) for all FP slugs; never `slug.toUpperCase()`.

## Acceptance criteria
- [ ] All SP0–SP6 render with correct photo slots, captions, and background colours
- [ ] Overlay renders ABOVE photo for SP0–SP3, SP5–SP6, FP1, FP2, FP3, FP5
- [ ] Overlay renders BEHIND photo for SP4 and Cover
- [ ] FP1 heart clip-path matches the SVG polygon (visually confirmed)
- [ ] FP2 right page is full-bleed photo with no overlay
- [ ] FP3 functional toy photo renders left; regular photo right
- [ ] FP4 functional steps photo renders left; text-only right page with captions
- [ ] FP5 two distinct artwork photos (left + right)
- [ ] Source Sans 3 Regular + Bold render correctly in engine, customer-preview, PDF
- [ ] Cover photo slot renders with graphic elements behind it
- [ ] Spine captions rotate 270°
- [ ] `wonder.html` → `papercut.html` rename complete across all links
- [ ] 116/116 tests pass (or updated count)
- [ ] Staff engine smoke test: 0 JS errors across all spreads
- [ ] PDF smoke test: no dropped SVGs, no font gaps
