# Joyride template — build state

Playful travel template ("Hot Getaway in Milan"). Square 200×200mm, 3mm body bleed,
18mm cover wrap. Closest precedent: **Tender** (CSV cloned from Tender's sheet; intro FP;
overlay-below on SP1+SP9 Left; spine rotate 270; separate spine input).
Fonts: **Lora Regular** (cover title 35pt, intro 36pt) + **Mulish Light** (subs/captions
20–22pt; CSV "Mullish" is a typo). Neither is a connected script — LOW ligature risk, but
both are NEW to the book/PDF pipeline → standard fontkit GSUB check + static cuts required
(variable TTFs in `assets/fonts/SourceSans3/` serve the browser engines only; pdf-lib embeds
a variable font's default instance, so Mulish Light would print as Regular).

## Scope notes — what is genuinely new vs Tender
- **Travel map + itinerary FP1 — added S129 (owner).** Joyride is a travel template too, so
  it takes **Wander's map page 1:1**. Every asset the owner dropped is a **byte-identical
  copy of Wander's** (verified S129): the 6 region maps, `FP 01 Map Right.svg`, `GEO PIN`,
  and `Map_Coordinates_upd.csv`; his two new CSV rows also match Wander's itinerary rows
  exactly. **No code work** — `map-render.js` takes the FP def + coords as arguments and all
  3 surfaces read `mapCanvas`/`mapCoordinates` off the ACTIVE template, so this was pure
  data (FP1 block + the 183-country `mapCoordinates` table copied verbatim into
  `joyride-data.js`). **No new fonts** — Cormorant Garamond is already registered for Wander.
  ⚠ The art + type are still Wander's (Cormorant Garamond, navy `#12264b` on cream
  `#f2ede3`), which is off Joyride's pink/red/cream palette → **restyle question for Xenia**
  (open issue below). Owner: "maybe we'd change fonts after, but that's it."
- **4-photo square cover** — four **57×57mm** slots around the centred title: top (309,39),
  left (248,100), right (370,100), bottom (309,161) (without-bleed centres; +18 for
  with-bleed). Order form gets 4 labelled cover uploads (top/left/right/bottom); each slot
  supports standard reposition. All prior templates have exactly 1 cover photo — audit
  `cover.slots[0]` assumptions on all 3 surfaces.
  **(S129: coords revised — see the artboard fix below. Grid now centres on x=309 = the
  front page's TRUE centre; the old 5mm offset was an artboard error, not a design choice.)**
- **Sized cover-caption boxes** — title Lora Regular **33pt** in a **50×41mm** box (wraps ~3
  lines), maxlength **60** (Xenia's S129 CSV — this SUPERSEDES the S128 owner decision of 40;
  CSV is source of truth), **font auto-shrink on overflow**; sub Mulish Light 20pt in 40×8mm.
  Data model already carries wMm/hMm (Tender does) — new part is the auto-shrink behaviour.
- **⚠ RESOLVED S129 — the "28mm spine" was an artboard export error.** S128 measured a 428mm
  cover (back 200 + spine 28 + front 200) off the original SVG and flagged it. Xenia
  **confirmed the error and re-issued both the cover SVG and the cover CSV.** The cover is
  now the standard **409mm (200 + 9 + 200)**, same as every other template. Two independent
  checks agree: the SVG is `408.774mm × 200mm`, and the CSV's spine-caption centre sits at
  x=204.5 without bleed = 200 + 9/2. This also silently fixed a **real clipping bug** — the
  engine's `.cover-canvas` is hardcoded `width: 1227px !important` (= 409mm × 3px/mm), so
  the 428mm cover was being chopped 19mm short and the right-hand cover photo was cut off.
  Nothing to change in code; the hardcode is correct for a 409mm cover.
- **M pages (SP4 Right, SP8 Right)** — fixed mixed-orientation: slot 1 vertical (80×107 @
  60,67), slot 2 horizontal (107×80 @ 136,146), **vertical renders ON TOP** where they
  overlap. Z-order flag lives in `joyride-data.js` only — NO new CSV column (owner-approved,
  see `work/joyride-template/decision-m-page-allocation.md`). Allocator rule =
  **window-local matching**: within the spread's contiguous photo window, put a V in slot 1
  and an H in slot 2 when available; else crop-into-frame + placement-audit warning (same
  degradation as square pages). Left pages of SP4/SP8 keep normal H/V variants; right page
  is always M (no variants).
- **Intro FP** — two functional text rows (Lora 36pt title + Mulish 22pt body), like
  Tender's Intro (replacesFirstSpread mechanic).
- **Overlay-below** — SP1 + SP9 **Left** pages only (`overlay_position=below` in CSV);
  everything else default (art above).
- No Our-story/Words-style photo+text spreads; no custom clip shapes (all rectangles);
  no full-bleed pages. SP5 = S/S squares; SP1/3/6/9 Right = 200×200 or 206×206?? — SP1/9
  Right S photo 200×200 at centre (105,100): butts to trim on 3 sides, NOT full bleed
  (Tender Words was 206). SP3/SP6 Right S = 206×206 at (100,100) = full-bleed square like
  Tender's — carry `fullBleed` accordingly.
- Pre-flight: all SVGs ≤276 KB — no 8 MB PDF-drop or 25 MiB Cloudflare risk. Cover CSV
  cell "200Ãƒâ€”200mm" is mojibake — cosmetic, normalize in data.js only (CSV is Xenia's).

## Phase A — Engine renders
- [x] 1. **(S128)** Data file `assets/Template_Joyride/joyride-data.js` — parses clean (node gate):
  10 spreads SP0–SP9 + FPintro, 4 cover slots, 4 cover captions (2 spine), M pages flagged
  `mixed:true` + slot `orient`/`zIndex:2`, SP3/SP6 right fullBleed 206, SP1/SP9 left overlayBelow.
  CSV coords verified as BOX-CENTRES (caption-gap math + cover-SVG flower positions).
- [x] 2. **(S128)** Fonts — static cuts INSTANCED from the owner-dropped variable TTFs via
  fonttools (`assets/fonts/Lora-Regular.ttf` wght 400, `assets/fonts/Mulish-Light.ttf` wght 300 —
  its internal name says "ExtraLight", cosmetic only, glyphs+OS/2 are Light). Ligature check:
  BOTH form ligatures (30 chars → 26 glyphs) → both added to `LIGATURE_FONTS` (export-pdf.js).
  Registered: @font-face engine + customer-preview; COVER_FONTS (engine 1987) + CAPTION_FONTS
  (customer 1073) entries; FONT_FILE_MAP `Lora_regular`/`Mulish_light`.
- [x] 3. **(S128)** Registry on 3 surfaces (key `joyride`, svgBase `…/Template_Joyride/SVG/`,
  Papercut subfolder pattern) + data `<script>`/require tags. Gate green: 202/202 tests,
  export-pdf.js loads.
- [x] 4. **(S129)** Engine render smoke test + the Joyride code generalisations. **DONE — all
  six shipped in `pages/staff/template-engine.html`, smoke test green (0 pageerrors), and all
  6 templates re-verified clean afterwards:**
  - **Cover render 4 slots** — `renderCover` now loops `coverDef.slots` (was `slots[0]`),
    photo *i* from `window.specialPhotos.cover[i]`. Per-slot placeholder label derived from
    the slot key (`coverTop` → "Cover photo — Top"). Wander's empty `slots: []` no-ops.
  - **De-hardcode spread lists** — `standardTypes` + `fpTypes` (spread-type dropdown) and
    `stdIds` (sequence builder) now derive from the active template's own spread keys
    (`/^SP[1-9]\d*$/`, numeric sort). SP7–SP9 are reachable; bogus FP options gone. Mirrored
    into `customer-preview.html` (`buildBookSequence`).
  - **M-page allocation** — `assignPhotosToSpreads` multi-slot branch: a `mixed:true` variant
    now matches each slot's own `orient` against the spread's window independently, instead of
    picking a same-orientation PAIR. Falls back to crop-into-frame + a `console.warn` when no
    photo of the wanted orientation is left. Smoke test confirms SP4 right gets V then H.
  - **Slot zIndex** — spread slot render honours `slotDef.zIndex` (vertical on top).
  - **textPanelTitle** — new render block before the `textPanel` one; same toolbar/save path,
    keyed `'textPanelTitle'`. Intro shows 2 text boxes. Mirror to customer + PDF at Phase B.
  - **autoShrink** — cover caption steps font-size down 1pt at a time (floor 50%) until
    `scrollHeight` fits the `hMm` box; re-fits live on input. Verified: a 70-char title
    shrinks 37px → 18px and stays inside the box. Mirror to customer + PDF at Phase B.
  - **Smoke test** — `qa/debug-joyride-render.mjs`. Asserts 0 pageerrors, 4 cover slots with 4
    photos placed, SP7–SP9 in the sequence, M page = 1 V + 1 H, Intro = 2 text panels, map
    page = region image + 3 pins + itinerary panel.
- [x] 4b. **(S129) FP1 travel map wired** — `joyride-data.js` gains the FP1 block (1:1 with
  Wander) + the 183-country `mapCoordinates` table. Renders from Joyride's own asset folder
  (`…/Template_Joyride/SVG/FP Spread 1/…`), pins land correctly.
- [x] 4c. **(S129) Two shared-engine fixes found while building** (both pre-existing, both hit
  any template, both root-caused not patched):
  - **`window.bookCaptions` was never initialised** in the GLOBAL STATE block — every sibling
    global is. It was created lazily inside `renderBook`, but `renderCover` reads it
    **unguarded**, so uploading a cover photo *before* any pool photos crashed the engine with
    `Cannot read properties of undefined (reading 'cover')`. Reproduced on **Tender** too.
    Fixed by initialising it alongside the other globals.
  - **Local-mode cover upload was capped at 1 photo** (`data-max="1"` hardcoded in markup).
    Now driven by the template's own `cover.slots.length`, so Joyride accepts 4 and the input
    goes `multiple`. Label/button text follow suit.
  - **Map pages were invisible in Local mode** — `buildLocalTemplateUI` filtered out
    `mapPage` spreads (they only enter a book from a real order), so a travel template's
    signature page could not be eyeballed without minting an order. They're now listed, and
    ticking one seeds a demo route (EU / Austria+Italy+France) purely for Local mode. Order
    mode always overwrites this from the real order, so it cannot reach a customer's book.
    **This un-blinds Wander's map page in Local mode too.**
  - **Text panels never applied their CSV colour.** `renderSpread`'s `textPanel` block set
    font/size/weight/spacing but **not `caption.color`**, so every FP text panel inherited the
    `.slot-caption` CSS default and the template's `captions_color` was silently ignored —
    Joyride's red route text, and Wander's navy, both. Cover captions already read
    `capDef.color`; text panels now do the same. (Found by eyeballing the map spread after
    the owner recoloured it — the smoke test can't see a wrong colour.)
  - ⚠ `qa/debug-tender-render.mjs` + `debug-wander-render.mjs` carry a **stale FP-checkbox
    selector** (`.fp-toggle` / `#local-fp-list` — neither exists in the markup), so they have
    silently never ticked a functional page. The live group is `#fp-group`. Not fixed here;
    worth a cleanup pass. **New `qa/debug-all-templates-render.mjs`** supersedes them for
    regression: renders ALL SIX templates (cover photos first, every FP ticked) and fails on
    any pageerror — run it after any `template-engine.html` edit. All 6 green at S129 close.
  **← Phase A COMPLETE. Hand back for owner eyeball in the staff engine.**

## Phase B — Flow works
- [ ] 5. Order form: 4 labelled cover uploads, cover title (**60** chars) + sub + spine inputs,
  Intro fields, **+ the FP1 country-picker/itinerary rows (already generic — Wander's flow)**.
- [ ] 6. Customer-preview parity (incl. 4-photo cover, M-page z-order, auto-shrink title). Re-run Scribble smoke test.
- [ ] 7. PDF parity (export-pdf.js) — owner redeploys Cloud Run renderer + generates via dashboard. ⛔ no local renders.

## Phase C — Live
- [ ] 8. Product page (shared product-page pattern; standard €70/€100 prices.js).
- [ ] 9. E2E via qa/staff-customer-chain.mjs; npm test green.
- [ ] 10. Merge (backend-first; owner redeploys renderer; docs/templates.md roster update).

## Open issues
### For Xenia
- **Cover SVG STILL has LIVE `<text>`** (back-cover "Curated by @letdorabe" quote,
  `font-family="MulishRoman-Light"`) — everything else is outlined. The SVG loads via `<img>`,
  which cannot pull in our `@font-face` Mulish, so the quote renders in a **fallback face with
  visibly broken letter-spacing** (confirmed in the S129 render: "Cura ted by @le tdo rabe").
  **Ask Xenia to outline it.** Cosmetic, not a blocker. Survived her S129 re-export.
- **FP1 map — TYPE + COLOUR now Joyride's; the ARTWORK is still Wander's.** Owner recoloured
  the CSV row at S129 (itinerary = Lora 28pt Regular, red `#d94027` on yellow `#f9d84d`) and
  the data file is synced. What remains Wander's is **art, not data**, so only Xenia can
  change it: (a) the "TRAVEL ITINERARY" heading + suitcase baked into
  `FP Spread 1/FP 01 Map Right.svg` (navy, Cormorant-ish serif); (b) the six region map PNGs
  (cream parchment, navy labels, decorative border); (c) the maroon `GEO PIN`.
  **Ask: restyle these to Joyride's palette/type, or accept the mismatch for now?**
- **Spine sub-label box is too small — owner to fix in the cover CSV.** Measured in Mulish
  Light 12pt: "July, 2026" = **19.3mm** in a **20mm** box (fits by 0.7mm → wraps on rounding);
  "December, 2026" = 32.3mm; **"September, 2026" = 34mm**. Fix = Spine row,
  `captions2_height: 20 → 35`. Also `maxlength` is 60 on both spine captions but the boxes
  physically hold **27 chars** (spine label, Lora 12pt in 60mm) and **16 chars** (sub, 35mm) —
  and the spine captions have **no autoShrink**, so a long value just overflows. Recommend
  `Captions_1_maxlength: 25`, `Captions_2_maxlength: 16` — or add autoShrink to the spine
  (owner's call, not yet done).
- **"Curated by @letdorabe"** on the cover → is Joyride an artist collaboration? If yes:
  docs/templates.md roster + our-artists.html + product-page credit at Phase C (see
  docs/briefs/artist-collaborations.md).

### For the build
- **maxLength conflict, CSV wins.** Xenia's S129 CSV says **60** for all four cover captions;
  the S128 owner decision said **40**. Data file follows the CSV (source-of-truth rule).
  autoShrink absorbs the extra characters — but worth eyeballing the longest title.
- **Cover captions use weight/italic, spread captions use style** — data carries both
  (`style:'light'` + browser resolves Mulish's single 300 face either way). Check the PDF's
  COVER caption font resolution (Family_style key?) at stage 7.
- **Intro orderFormMeta fields are DRAFT copy** (place/when/line) — owner review + /stop-slop
  at stage 5 before they ship.

### Resolved
- ~~**Spine reads as 28mm**~~ — **RESOLVED S129.** Artboard export error; Xenia confirmed and
  re-issued the SVG + cover CSV. Cover is the standard 409mm (200 + 9 + 200). This had been
  masking a real clipping bug (the engine's `.cover-canvas` is hardcoded to 1227px = 409mm).
- ~~**Photo-grid centre sits 5mm off**~~ — **RESOLVED S129.** Same artboard error. The grid now
  centres on x=309 without bleed = the front page's true centre.
