# Laguna — build state

**Read this before touching anything Laguna.** It is the memory of the build; the
`/add-template` skill resumes from it.

- **Template:** Laguna — third Adventures template, summer/seaside trips.
- **Artist:** **Clémence Trossevin** (Paris, gouache, [@clemence_trossevin](https://www.instagram.com/clemence_trossevin/?hl=en)).
  In collaboration; credit line required on the product page + collections card.
- **Drop:** `assets/Template_Laguna/` (owner, 2026-08-10; CSVs + cover reissued 2026-08-12).
- **Closest existing template:** **Wander** (owner's call, S168) — same square 200mm travel
  book, same travel-map mechanic. The Intro page follows **Joyride**.
- **Started:** S168 (2026-08-12).

---

## Facts that cost time to establish — do not re-derive

1. **Spine is 10mm, not 9mm.** The cover artboard is 410mm and the SVG's spine rect
   measures exactly 28.346 user units = 10.00mm. The cover CSV agrees independently
   (spine caption at x=205 = 200 + 10/2). `referenceSpineMm: 10`, like Heirloom.
   The print house's current 40pp spec is 10mm; the older 409mm/9mm templates predate
   that instruction. **Do not "fix" Laguna to 9.**
2. **`referenceSpineMm` is NOT the printed spine — and every template already prints
   correctly.** The print spec is fixed for all: **40pp → 10mm, 80pp → 14mm**, returned by
   `getSpineWidthMm(pageCount)` on all three surfaces. `referenceSpineMm` records only what
   the *artwork* was drawn against; the code shifts by `delta = getSpineWidthMm − reference`.
   Wander et al. are drawn at 9mm and corrected programmatically (+1 at 40pp, +5 at 80pp);
   Laguna is drawn at 10mm so delta is **0 at 40pp and +4 at 80pp** — the owner's "+4mm for
   80p", handled by existing code with nothing to add.
   ⚠ **I claimed in S168 that the six 9mm templates were wrong in print. That was WRONG**
   and would have sent six correct covers back for re-export. Do not repeat it.
   Recorded in LEARNINGS (S168) and in the `add-template` skill.
3. **SP0–SP6 photo geometry is identical to Wander's, slot for slot** — verified
   programmatically against the CSV. Caption Y positions DIFFER, so captions came from
   Laguna's own CSV. All 36 standard slot rows machine-checked as matching.
4. **The map coordinate table is byte-identical to Wander's** (`diff` clean, 183
   countries). The artwork differs, the projection does not. `laguna-data.js` carries a
   copy spliced programmatically from `wander-data.js` rather than retyped.
5. **SP0 reuses SP3's artwork** (`SP Spread 3/SP 06 * Right.svg`). There is no
   "SP Spread 0" folder in the drop, SP0's geometry and palette match SP3's right page
   exactly, and Wander resolves SP0 to its own `SP 06 * Right` the same way.
6. **Some spread SVGs are intentionally blank** 139-byte stubs (owner confirmed): SP1
   right H+V, SP2 `SP 04 H Right`, SP3 `SP 05 H Left` + `SP 06 V Right`,
   SP6 `SP 12 H Right`. Those pages are photos on flat colour.
   They still load fine — `brokenSvgSrcs` is empty in the smoke test.
   ⚠ **S172 re-export moved artwork BETWEEN pages.** On the vertical variants of SP2 and
   SP6 the art moved from the right page to the left, and the vacated right pages
   (`SP 04 V Right`, `SP 12 V Right`) became new stubs; `SP 03 V Left` and `SP 07 V Left`
   stopped being stubs. Each page keeps its own `bgColor` and the art is patterned rather
   than a full-page rect, so the cream-on-sky (SP2) and blue-on-cream (SP6) pairings are
   deliberate, not a bgColor mismatch — checked by rendering, screenshots in
   `sessions/qa-runs/laguna-spreads-*.png`. **A stub list goes stale on every re-export;
   re-derive it rather than trusting this one.**
7. **The cover carries NO live `<text>`** — Clémence's back-cover credit and statement are
   outlined. Verified S168, re-verified S172 after re-export. **Re-check on every drop.**
   ⚠ **S172 caught this regressing and it is the sharpest example of the trap yet.** The
   first S172 re-export brought that lettering back as live `<text>` in **Baskerville**, a
   macOS-only font absent from both Windows and the Linux Cloud Run renderer. Each
   `<tspan>` carries an absolute `x` authored for Baskerville's metrics, so a fallback face
   does not reflow — it mis-spaces mid-word: "memo ry", "spent by", "bene ath", "ete rnal".
   **It renders perfectly on the designer's Mac and wrongly everywhere that matters.** The
   owner had it re-outlined the same session and the second drop is clean.
   `qa/probe-cover-svg-text.mjs` had no Laguna entry until S172, so this cover had never
   once been probed. **Add every new template to that list.**

## Asset optimisation — `scripts/optimise-laguna-rasters.mjs`

The drop's rasters shipped as base64 RGBA PNGs and **could not have shipped**:

| file | as delivered | now | why it mattered |
|---|---|---|---|
| `Cover/Artboard 1.svg` | 34.8 MB | **3.5 MB** | >25 MiB = silent Cloudflare deploy failure |
| 6 × continent map SVGs | 6.8–10.3 MB | 1.1–1.6 MB | >8 MB = silently dropped from the print PDF |

The script downsamples each raster to **300 DPI**, flattens the alpha onto the flat page
colour behind it, and re-encodes as **JPEG q92, 4:4:4**. Verified by pixel-diffing every
original against its replacement: **mean difference 0.6–0.7 / 255**, 99.9% of pixels
within 3%. Clémence's cover was **406 DPI**, so 300 loses nothing the press can print.

**Re-run after every re-export.** Done again in S172 on the new cover: same raster
(3491×3773, 406 DPI), 34.72 MB → **3.46 MB**. The re-export arrives as the raw PNG every
time, so this is not a one-off fix — an unoptimised cover kills the Cloudflare deploy
silently.

**Two things to know:**
- **The original 85 MB drop is NOT in git and NOT recoverable from this repo.** The owner
  must archive the master SVGs externally. The script is re-runnable on a fresh drop.
- The original cover and Africa map **could not be parsed by librsvg at all** — the
  base64 blob exceeded libxml's 10 MB per-line buffer (`XML_PARSE_HUGE`). They parse now.

---

## Phase A — engine renders ✅ COMPLETE (S168)

- [x] **1. Data file** — `assets/Template_Laguna/laguna-data.js`. Loads clean; all 36
      standard slot rows machine-verified against `Laguna_sizing_full.csv` (photo x/y/
      xBleed/yBleed/w/h, bgColor, caption allowed/x/y/w/h/align/colour/size). SP0–SP6 +
      `FPintro` + `FP1`. `overlay_position` is blank throughout, so **no `overlayBelow`**
      anywhere — all artwork renders ABOVE the photos.
- [x] **2. Fonts** — **Fredoka** (new family) + **Mulish Regular/Medium** (new cuts,
      instanced from the owner's variable TTF via fonttools, same route as Joyride's).
      Registered as `@font-face` in the engine + customer-preview, in `COVER_FONTS` /
      `CAPTION_FONTS`, and in `FONT_FILE_MAP` (`Fredoka_light`, `Mulish_regular`,
      `Mulish_medium`). **Ligature check: both form ligatures** (49 chars → 43 glyphs;
      Fredoka via `dlig`, Mulish via `liga`) → **`Fredoka` added to `LIGATURE_FONTS`**.
      - ⚠ **This closed a live landmine.** Mulish previously had ONLY a `_light` cut,
        which is exactly what silently dropped Joyride's cover sub-labels from print in
        S136. Laguna's interior captions all declare `style: 'regular'` and its cover
        sub-label `'medium'` — without the new cuts the same silent drop would have
        repeated. `tests/cover-caption-fonts.test.js` updated: the old assertion pinned
        "Mulish has no regular cut", a fact we deliberately changed, so it now pins
        `lookupFont`'s behaviour against a stub instead. Laguna added to that test's
        template list.
- [x] **3. Registry on 3 surfaces** — key `laguna`, `svgBase`/`assetBase` ending
      `Template_Laguna/SVG` (the `SVG/` level, like Joyride, unlike Wander). Data
      `<script>`/`require` tags added. Plus a `Laguna` option in `#template-select`.
- [x] **4. Render smoke test** — `qa/debug-laguna-render.mjs`. **GATE PASS on the first
      run, no code generalisations needed** (unlike Joyride, which needed six).
      41 page canvases, 21 spread rows, **0 pageerrors, 0 console errors**, 0 broken SVG
      srcs. Cover: 1 slot, 1 photo, 3 captions. `FPintro` present with 1 text panel.
      `FP1` present, resolved `EU Map.svg`, 1 itinerary panel.

### Verified visually (S168)
The cover renders correctly standalone: navy back with the outlined aevia logo + artist
credit, blue spine, Clémence's parasol/palm gouache full-bleed on the front. The white
photo frame lands on **310mm / 93mm without bleed**, exactly where the CSV puts the
photo, and the raster covers the front panel plus all 18mm of bleed on every edge.

### ⚠ Known non-issue: `photosDecoded` reads 1, not 15
The engine emits `<img class="slot-photo">` with an **empty `src`** and populates the
blob URL elsewhere (`window.photoPool` holds valid `blob:` URLs for all of them). Probed
S168; **Wander scores identically (1 of 14) through the same path**, so it is pre-existing
engine behaviour, not a Laguna defect. Consequence: the fullPage screenshot in
`sessions/qa-runs/laguna-render.png` shows broken-image icons in the photo slots. Do not
chase it from here.

---

## S168 second pass — owner's first eyeball, three fixes

All three were **pure data**; no engine, preview or PDF code changed.

1. **Cover photo invisible** → `cover.overlayAbovePhotos: false`. The photo was never
   missing: `blob:` src, `naturalWidth` 2000, correct position. Clémence's SVG draws an
   **opaque white `Frame` rect** at the photo position (the white margin *around* the
   photo, not a window) and the artwork sits at `z-index: 2` against the slot's `1`, so
   the photo rendered entirely behind a white square. Diagnosed by reading the live DOM
   stacking order — a screenshot cannot distinguish a missing photo from an occluded one,
   and the smoke test's `coverPhotosPlaced` counts the element either way.
2. **Interior artwork above the photos** → the owner set `overlay_position: below` on all
   36 standard CSV rows, now carried as `overlayBelow: true` on all **26 page variants**
   (36 CSV rows = 26 pages; several pages hold two slots). The two functional pages keep a
   blank `overlay_position`, so their art stays above.
3. **Cover caption box dimensions** → the owner added `captions1_width/height` +
   `captions2_width/height` to the cover CSV. Front captions declare width 100; the spine
   row declares **height 100**, because Xenia measures the rotated box in page space where
   its long axis is vertical. This file's convention is pre-rotation (`w` = length along
   the spine), so that 100 is `wMm`. Reversing it would put a 100mm box across a 10mm spine.

Re-verified after: 446 tests green, smoke test GATE PASS, 0 pageerrors.

✅ **Owner signed off the Phase A render on 2026-08-12** ("render looks right at first
glance"). Phase A is closed. The Fredoka title weight remains open (see below) but does
not block Phase B.

## ✅ RESOLVED (S170): the 6 region maps were missing their bleed, and were re-issued

**Fixed.** The artist re-exported all six as **206mm PNGs** (2434px @ 300dpi, identical to
Wander's). Verified: each measures 206.1mm, and rendering the new EU map against Wander's
and searching for the best-aligning scale now returns **k = 1.0000** — the framing matches
exactly, so the shared Wander pin table is valid. `laguna-data.js` `maps` now points at
`.png`, and the six map entries were removed from `optimise-laguna-rasters.mjs` (flat PNGs
carry no base64 blob to re-encode, and the script would throw ENOENT on the old names).
Gates after the swap: render GATE PASS, preview mock **14/14** including a new assertion
that both selected countries actually drop a pin.

**Keep the rule in mind for the next drop:** region maps are the ONE asset that must arrive
**bleed-framed at 206mm**. Everything else is 200mm and gets viewBox-expanded by the code.

The original diagnosis, kept because the next drop can repeat it:

### What was wrong

**The six map SVGs are framed at 200mm — content only. The map code path requires
206mm (200mm + 3mm bleed all round), which is what Wander's maps are.** This is the one
place in the pipeline where an SVG must arrive bleed-framed.

Why the map is special: standard content SVGs are authored at 200mm and the code
**expands the viewBox** to add bleed. Region maps are the documented exception —
`export-pdf.js` resizes them **straight to `FULL_PX` (206mm) at origin, with no viewBox
expansion**, and `template-engine.html` does the same (`width = (200 + bleed*2) * SCALE`,
offset `-bleed`). So a 200mm map gets **stretched ~3% to fill 206mm**.

Evidence, not inference:
- `width="200mm"` on all six Laguna maps (S.America 199.974mm); Wander's `FP 01 Map Left
  (EU).png` measures **2434px @ 300dpi = 206.1mm**.
- Rendering both EU maps to the same canvas and searching for the scale that best aligns
  them gives a clear minimum at **k ≈ 0.975** — Laguna's geography is ~2.5–3% larger,
  exactly the direction and size the 200→206 stretch predicts.

**Consequence: the pins drift.** `laguna-data.js` carries Wander's coordinate table
byte-identical (verified S168, and the artwork is visibly the same map), so the pins are
calibrated to Wander's 206mm framing. Against a 3%-enlarged map they sit **increasingly
wrong away from the map centre — roughly 0mm at the middle, up to ~3mm at the edges.**
A pin 3mm off its city is visible on a printed page.

Not a screen/print split: the engine and the PDF stretch identically, so the preview shows
the same error the print will. **Do not chase this in the render code.**

**What to ask for:** re-export the six region maps on a **206 × 206mm artboard** — the
200mm page plus **3mm bleed on all four sides** — with the map artwork extending into the
bleed. Same geography and framing as Wander's existing maps. Nothing else in the drop
needs re-exporting: the interior spreads, the intro and the itinerary page are correctly
200mm, because those DO get viewBox-expanded.

**SETTLED (owner, S170): the artist re-uploads the maps at the same size as the other
templates. Do NOT patch, rescale or compensate for the map artwork in code or data, and
do not re-raise reusing Wander's assets.** The fix is a corrected drop, nothing else.
Re-run `scripts/optimise-laguna-rasters.mjs` on the new files, then re-check
`width="206mm"` before rebuilding.

## ⏳ BLOCKING (S171): Xenia is re-doing the SVGs

The owner reported glitches in the current drop; a corrected set is coming. **Mockup
capture is deliberately deferred until it lands** — capturing now would bake the glitches
into the product-page imagery and the whole set would have to be recaptured.

**A new drop is an input to VALIDATE, not a spec to implement.** Re-run all of this on
arrival, in order — several already-passed checks are invalidated by any re-export:

1. `node scripts/optimise-laguna-rasters.mjs` — **mandatory.** The raw cover is ~36 MB,
   over the 25 MiB Cloudflare limit, and a deploy fails *silently* with the site left
   stale. Check the script's file list still matches the drop's filenames first.
2. **Region maps must measure 206mm**, not 200mm — the one asset the code does not
   viewBox-expand. Verify by measuring, not by asking (S170).
3. `node qa/probe-cover-svg-text.mjs` — catches customer-fillable text outlined into the
   artwork, which `grep` and DOM queries cannot see (S165).
4. `npm test` — `tests/cover-svg-viewbox.test.js` enforces that the cover viewBox frames
   the TRIM with bleed outside it. ⚠ It does **not** check that artwork fills the bleed;
   that gap is what let the S171 hairline through.
5. Re-run the gates: `qa/debug-laguna-render.mjs`, `qa/laguna-preview-mock.mjs`,
   `qa/smoke-laguna-order.mjs`, `qa/smoke-laguna-product.mjs`.
6. Re-check any in-repo SVG patch — a re-export drops it (S157).

Only then capture the mockups (Stage 8's open item) and move to Stage 9.

## Open issues / decisions needed from the owner

1. ~~**Cover title font weight is a guess.**~~ **CLOSED S170.** The owner reissued the
   cover CSV as **"Fredoka Bold"** and confirmed it: the front album name and the spine
   are both Bold, the sub-label stays Mulish Medium. `Fredoka-Bold.ttf` is the static cut
   from the drop, so no fonttools instancing was needed. Registered in `FONT_FILE_MAP`,
   `@font-face` on all three surfaces, and the Bold style added to
   `COVER_FONTS`/`CAPTION_FONTS`. Verified the browser fetches the real Bold file rather
   than synthesising a fake bold, and that the Bold cut exposes the same `dlig` feature as
   Light, so the family-level `LIGATURE_FONTS` entry still holds.
2. **Artist portrait orientation.** `assets/artists/clemence-trossevin/clemence-trossevin-portrait.jpg`
   is **760×1118 (portrait)**; Kevin's is 1200×800 (landscape). Not yet checked against
   how `our-artists.html` crops. Folder was renamed from `Clémence Trossevin/` to match
   the kebab-case ASCII convention (an accented folder with a space breaks on Cloudflare).
3. ~~**Product page copy** for `laguna.html` is not written.~~ **CLOSED S171.** Both pages
   exist, so the `our-artists.html` link is live. The copy is a first draft written to the
   `/stop-slop` rules (no em dashes, active voice) but has **not had an owner review**, and
   the German has still never been read by a native speaker.
4. **Intro-page order-form fields are drafts** and have not had a `/stop-slop` pass or
   owner review. Due at Phase B stage 5.

---

## Phase B — flow works (IN PROGRESS)

- [x] **5. Order form (S168)** — `pages/order.html`. **Four data edits, no new logic:**
      the `laguna-data.js` `<script>` tag, the `TEMPLATE_REGISTRY` entry
      (`laguna` → `../assets/Template_Laguna/SVG/`), a `TEMPLATE_NOTE_PLACEHOLDERS` line,
      and the `@font-face` block (**Mulish Regular + Medium and Fredoka Light** — the
      form previously loaded only Mulish Light, and Laguna's itinerary face is Regular).
      Everything else is already data-driven off the data file: cover caption inputs come
      from `cover.captions`, intro fields from `orderFormMeta.introFields`, the itinerary
      from `countrySelect`.
      **Gate: `qa/smoke-laguna-order.mjs` 13/13, `npm run qa:order` 12/12, `npm test`
      446/446, 0 JS errors.** Verified: single cover drop zone (not Joyride's 4-slot
      grid), all 3 cover caption inputs, the Laguna note placeholder, add-ons expanding
      to `fpintro` + `fp1`, all 3 intro text fields, and the map's country picker +
      itinerary list + region map. Joyride's 4-slot cover re-checked as unregressed.

  **Add-ons come from URL params, NOT from the data file.** `product.js` writes
  `addons` / `addon_inputs` / `addon_slugs` from the product page's `window.PRODUCT.fp`
  map. Laguna's will be identical in shape to Joyride's:
  `fp:{ FPintro:{name:'Intro',inputType:'intro',slug:'fpintro'}, FP1:{name:'Travel map & itinerary',inputType:'map',slug:'fp1'} }`
  Until `laguna.html` exists (Stage 8), the only way to exercise the add-on fields is to
  pass those params by hand — `qa/smoke-laguna-order.mjs` does exactly that.

  **Two gotchas worth keeping** (both cost a debug cycle): `const ORDER` is declared at
  script top level, so it is reachable as a bare identifier inside `page.evaluate()` but
  is **not** `window.ORDER`. And **Joyride has ONE cover drop zone, not four** — it feeds
  four labelled slot cells (`cover-slot-empty-<key>`), so a parity check must count the
  cells. Generated ids: `cover-cap-<key>`, `intro-<slug>-<key>`, `country-add-<slug>`,
  `itin-list-<slug>`, `region-map-<slug>`, `album-notes`.
- [x] **6. Customer-preview parity (S170)** — new gate `qa/laguna-preview-mock.mjs`,
      **13/13**. It mocks `getOrder` and serves photos from `assets/test photos/`, so it
      costs no Firebase read and no GCS egress (same pattern as the Heirloom mock).
      Proves on the CUSTOMER side: the registry resolves `laguna`, the cover artwork
      renders UNDER the photo, 36 of 39 interior overlays sit under their photos, both
      functional pages are in the book, the map resolves to the selected region, no
      Laguna 404s, no page errors.
      Audited rather than assumed: `overlayAbovePhotos`, `overlayBelow`,
      `referenceSpineMm` and `getSpineWidthMm` are implemented identically on both
      surfaces, the caption-font rosters are byte-identical apart from the variable name
      (`CAPTION_FONTS` vs `COVER_FONTS`), and no template name is hardcoded in the
      customer render path.
      **Regressions re-run green:** Scribble 7/7, Heirloom 8/8, Laguna engine GATE PASS,
      `npm run qa:order` 12/12, `npm test` 447.
      ⚠ `qa/debug-joyride-render.mjs` and `qa/smoke-joyride-order.mjs` could NOT run —
      they read `qa/test-photos/`, which is gitignored and absent on this machine. That
      is pre-existing (see CLAUDE.md), not caused by this change. Joyride was verified
      through the mock route instead.

  **The gate found a real bug, and it was NOT a parity gap** — both screen surfaces had
  it. A cover caption may declare its cut as a numeric `weight` (Newborn, Papercut) or as
  a `style` STRING (Joyride, Laguna — the form Xenia's CSVs use). Both
  `template-engine.html` and `customer-preview.html` read only the number and fell back
  to **400**, while `export-pdf.js` honours the string through `coverCaptionStyle()`. So
  **print and screen disagreed, and only the print is real** — the S154 shape again.
  Laguna's Fredoka Bold title made it visible: bold in print, Light on screen.
  Fixed at root cause with a shared `COVER_STYLE_WEIGHTS` map on both surfaces, mirroring
  `FONT_WEIGHT_KEYWORDS` in `export-pdf.js`.
  **Blast radius is exactly two templates** — audited all eight data files; only Joyride
  and Laguna declare `style` on cover captions, everything else uses numeric weights or
  nothing and is untouched.
  **Joyride's on-screen cover changed as a result, back to what it prints:** its subtitle
  now resolves to Mulish **300**, not 400. Note *why* it was wrong — before S168 added
  `Mulish-Regular.ttf` there was no 400 face, so the browser fell back to Light and screen
  accidentally matched print. **Adding the Regular cut in S168 silently changed Joyride's
  cover subtitle on screen.** This makes it correct by construction rather than by luck.
  A new test pins the style vocabulary (`tests/cover-caption-fonts.test.js`) so the next
  "Fredoka Light Bold"-style CSV typo fails in CI rather than on a printed cover.
- [x] **7. PDF parity (S170 read / S171 verified)** — `scripts/export-pdf.js` needed **no
      change**. Confirmed by reading in S170 (Laguna registered; `overlayAbovePhotos` and
      per-page `overlayBelow` both honoured; Fredoka Bold's metrics not inverted so the
      Parisienne spine trap does not apply; spine caption offset from the reference centre
      is exactly 0, so it centres at both page counts; the `sizePt * 0.75` cap-height
      approximation measures 0.700 for Fredoka Bold, identical to Lora and NT Somic —
      pre-existing and uniform, **not a Laguna defect**).
      **✅ GATE CLOSED S171: the owner generated and printed AEV-095 via the dashboard and
      signed it off ("99% fine").**

  ### The one thing the print showed: a white hairline along the bottom cover edge
  **Investigated S171. It is inside the bleed and gets trimmed off. No action taken, and
  none is needed.** Measured from the cover SVG plus the PDF's bleed expansion
  (`export-pdf.js` grows the viewBox by 51.024 units = 18mm per side):

  | element | falls short at the bottom | where the white starts |
  |---|---|---|
  | `Back BG Color` rect (navy) | 0.19 mm | 17.81 mm outside the trim |
  | Clémence's cover painting | 0.49 mm | 17.51 mm outside the trim |

  The bleed is 18mm, so the gap sits in its outermost half-millimetre. The painting is
  also 0.28mm short on the right edge, same story.
  **Cause, both upstream in the Illustrator export:** the artwork is anchored ~0.19mm high
  (both elements sit at y ≈ −51.56 where the bleed edge is −51.024), and Illustrator wrote
  the raster's transform as `scale(.177)` rounded to three decimals where 0.177212 is
  needed to fill the 236mm box — 0.28mm lost across 3775 source pixels.
  **Not caused by the 300 DPI re-encode** (pixel dimensions unchanged, so the placement
  maths is identical). **Do not hand-patch the SVG** — a re-export would undo it (S157).
  The durable fix is one line in the artist export brief: artwork must reach the full
  bleed rectangle, not stop at a rounded transform.
  ⚠ `tests/cover-svg-viewbox.test.js` cannot see this class of defect — it checks that the
  viewBox frames the trim, not that the artwork fills the bleed. Harmless at 0.5mm, would
  print at 5mm. Extending it is an open, non-urgent item.

## Phase C — live (IN PROGRESS)

- [~] **8. Product page + Stripe (S171)** — **pages built and gated; MOCKUPS OUTSTANDING.**
      - `pages/laguna.html` + `pages/de/laguna.html`, copied from Joyride (same category,
        same two story pages, same artist-collaboration shape). Carries Joyride's
        `phBroken()` placeholder fallback, so the page is presentable *now*, with every
        missing mockup degrading to a grey "Preview soon" box instead of a broken image.
      - Laguna cards added to `pages/collections.html` + `pages/de/collections.html`.
        The card reads `mockups/laguna/closed.webp` (the OLD path), **not** `exp2/` — that
        exception is real, see CLAUDE.md.
      - **Both mockup scripts registered** (the S167 lesson: missing either one and the
        pipeline cannot run at all): `scripts/compose-all.mjs` (`laguna` →
        `laguna-data.js` / `LAGUNA_DATA`; `cover.mockupEdges` was already in the data
        file) and `scripts/exp2-images.mjs` (order **AEV-095**, spreads `sp1`–`sp5`,
        specials `fpintro` + `fp1`, named by book-sequence id like Joyride's).
      - **No price or Stripe change was needed** — `pickPage`/`prices.js` are
        template-agnostic and resolve €70/€100 from `BOOK_PRICES`.
      - **Gate: `qa/smoke-laguna-product.mjs` 42/42** (EN + DE + both collections pages).
        It asserts the order URL carries `template=Laguna`, the category, the page count
        and **both add-on slugs** — the params that used to have to be passed by hand.
      - ⚠ **Open — needs the owner:** capture the mockup set from AEV-095
        (`qa/capture-cover-wrap.mjs` + `qa/capture-spread.mjs`, both need the staff
        password), then `node compose-all.mjs AEV-095 laguna` and
        `node exp2-images.mjs laguna`. Runbook: `docs/briefs/heirloom-build.md` Stage 8.
      - ⚠ **Open — owner's call:** the page shows **five** spreads (sp1–sp5), matching
        Joyride's S167 decision. Wander shows four. Change the thumb list + the
        `exp2-images.mjs` entry together if a different number is wanted.
- [ ] **9. E2E** — `qa/staff-customer-chain.mjs` on a real order; `npm test` green.
- [ ] **10. Merge** — after owner approval. Redeploy the Cloud Run renderer; pushing to
      `main` does NOT update it.

---

## Files touched in S168

| file | change |
|---|---|
| `assets/Template_Laguna/laguna-data.js` | **new** — the template definition |
| `scripts/optimise-laguna-rasters.mjs` | **new** — raster re-encode, re-runnable |
| `qa/debug-laguna-render.mjs` | **new** — Phase A stage 4 gate |
| `docs/briefs/laguna-build.md` | **new** — this file |
| `assets/Template_Laguna/SVG/**` (7 files) | rasters re-encoded, 85 MB → 11.7 MB |
| `assets/fonts/{Mulish-Regular,Mulish-Medium,Fredoka-Light}.ttf` | **new** cuts |
| `assets/artists/clemence-trossevin/` | portrait, folder renamed to convention |
| `pages/staff/template-engine.html` | fonts, `COVER_FONTS`, registry, select option |
| `pages/customer-preview.html` | fonts, `CAPTION_FONTS`, registry |
| `scripts/export-pdf.js` | `FONT_FILE_MAP`, `LIGATURE_FONTS`, registry |
| `tests/cover-caption-fonts.test.js` | obsolete assertion replaced; Laguna added |
| `pages/order.html` | fonts, data script, registry, note placeholder (Stage 5) |
| `qa/smoke-laguna-order.mjs` | **new** — Phase B stage 5 gate, 13 checks |
| `LEARNINGS.md` | two S168 entries (spine model, occluded photo) |
| `.claude/skills/add-template/SKILL.md` | spine section + two new traps |
| `pages/our-artists.html`, `pages/de/our-artists.html` | Clémence's profile |
| `docs/website-copy-EN.md`, `docs/website-copy-DE.md` | Clémence's bio EN + DE |
| `docs/templates.md` | Laguna row + collaboration entry |
