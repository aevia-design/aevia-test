# Heirloom build — state doc

_Template drop: `assets/Template_Heirloom/Beige/` (S157, 2026-08-07); Brown, Green and Blue
followed (built S160, 2026-08-10). Closest relative: Tender. Registry keys:
**`heirloom-beige` / `-brown` / `-green` / `-blue`** — colour is one registry entry + data
file per colourway (owner's call, S157). Order form / engines / PDF stay colour-blind
downstream of the product page; no `heirloom` key is special-cased outside the registry._

## Colourways (all four built, S160)
The three later drops are the SAME sub-template as Beige. Verified structurally, not by eye:
strip colours, SVG paths and clip settings from all four data files and the remainder is
byte-identical. **The only differing number is the cover slot centre, 327.62 → 328mm** —
all three monograms in the new drops share one photo opening, so they carry a single
`coverFrameShifted` clip where Beige needs two variants.

Colours split by SURFACE — the cover and the inner pages do not share ink:

| | inner text | page bg | cover text | spine band |
|---|---|---|---|---|
| Beige | `#312128` | `#dad0c5` | `#312128` | `#dad0c5` |
| Brown | `#312128` | `#dad0c5` | `#dad0c5` | `#312128` |
| Green | `#404737` | `#dad0c5` | `#dad0c5` | `#969e8a` |
| Blue  | `#3d3d4f` | `#cfc4b8` | `#3d3d4f` | `#afafbe` |

Monogram letters follow their surface: the two intro letters take the inner ink, the two
back-cover letters take the cover ink (in Green the same monogram is `#404737` on the intro
and `#dad0c5` on the back cover).

**Green and Blue renamed two folders** (`FP Spread 0 Intro/`, `FP Spread 2 Why I love/`) and
call the intro artwork `V1/V2/V3` — **V1=Roots, V2=Birds, V3=Roses**, matched by artwork file
size to within 3 bytes. Brown kept Beige's names.

⚠ **All nine new covers shipped with the photo window painted solid** (the S157 bug again),
and Green's Roses cover had a 3.1MB placeholder PHOTO embedded inside the window clip. Both
patched in-repo (owner's call — Xenia not asked to re-export). **Re-apply on any re-export.**
The opening is the `clipPath`, NOT the rect beside it — see LEARNINGS (S160).

## What is new vs Tender
- **Monograms** (Roots / Birds / Roses): product-page choice selects cover SVG + intro SVG and
  positions 4 live "letter" captions (partners' initials): 2 on intro, 2 on back cover.
  All per-monogram data in `heirloom-data.js` → `monograms`. First template where an order
  field selects artwork — engine needs new selection logic (Stage 3/4).
- **Mandatory intro** — always Spread 0, not an optional special page. No standard SP0 exists.
- **"Why I love Him/Her"** — ONE add-on → TWO spreads (`FPhim` + `FPher`), separate inputs,
  pools `him`/`her`, tied by `addonGroup: 'whylove'`.
- **Custom cover clip** — rounded-corner 80×80mm square (r 2mm); Birds/Roses art +0.5mm right
  of Roots → two clip variants, `monograms[*].coverClipShape`.
- **`referenceSpineMm: 10`** (cover authored at 40pp/410mm trim), unlike every other template's 9.
- Fonts: **IM FELL English** Regular+Italic only (live text). Endalian Script is outlined into
  the SVGs (verified: no `<text>`/`font-family` in any of the 39 SVGs) — never registered.

## Stage checklist
### Phase A — engine renders
- [x] **1. Data file** — `assets/Template_Heirloom/Beige/heirloom-data.js`. Verified: loads
      under node, all SVG paths resolve, compose() works. (S157)
- [x] **2. Fonts** — TTFs copied to `assets/fonts/`, `@font-face` ×2 engines, `FONT_FILE_MAP`
      + `LIGATURE_FONTS` in `scripts/export-pdf.js`. **IM FELL English FORMS LIGATURES**
      (fontkit verified S157: 52 chars → 45 glyphs, both cuts) → per-character draw. 312 tests green.
- [x] **3. Registry ×3 surfaces** — key `heirloom-beige` + data-file loads on all three;
      svgBase `…/Beige/SVG/`; staff dropdown option "Heirloom (Beige)". (S157)
- [x] **4. Render smoke test** — `qa/debug-heirloom-render.mjs` PASSES: 39 page canvases,
      cover present, 0 pageerrors, 0 SVG 404s; zones `special-zone-FPstory/FPhim/FPher`
      all appear (data-driven generalisation held). Cover eyeballed in close-up: Roots back
      monogram, front frame + rounded-square opening aligned. (S157)
- [x] **4b. Monogram engine logic (staff engine).** Built + verified S157, 0 pageerrors,
      312 tests green. `getActiveMonogramDef()` resolves order.monogram → local picker →
      defaultMonogram. Cover: SVG + clip variant swap per monogram; 2 editable backLetter
      captions (content keyed in bookCaptions → survives monogram switch). Intro: SVG swap
      + 2 editable initial letters (1-char cap, stored as monoLetter1/2). Mandatory FPs
      always enter `buildBookSequence` (intro checkbox shown locked). Local picker
      `#monogram-select` in its own special zone. Saved state now carries `monogram`
      (exportState); `loadOrderIntoEngine` reads `order.monogram`. Verified: Roots→Roses
      swaps cover SVG, intro SVG, clip (`coverFrameShifted`), letter positions
      (stacked → side-by-side); letters render inside the artwork's designed pockets.
      **Still to mirror in Phase B: customer-preview + PDF know NOTHING of monograms yet;
      `order.monogram` must be written by the order form (route: order doc field, like
      zodiacSign — the saveStaffState whitelist does NOT carry it and doesn't need to).**
      **← end of Phase A, hand back**

### Phase B — flow
- [x] **5. Order form** (S158) — `heirloom-data.js` script tag + `heirloom-beige` registry
      entry in `pages/order.html`. Three new mechanics, all data-driven:
      - **Mandatory spreads**: any spread with `mandatory: true` is prepended to
        `ORDER.addons` at init flagged `mandatory` — so it gets its normal FP section
        (intro fields, photo zones) without being sold as an add-on. Its "Remove this
        page" link is replaced by "Included in every book" and `cancelAddon` refuses it.
        Templates with no mandatory spread are untouched. FPintro therefore reaches
        `fpSelections`, and `calcPhotoTarget` already handles `replacesFirstSpread`.
      - **Monogram picker** renders inside whichever spread's variants declare
        `monogramSvg` (the intro) — the same section that collects the two names.
        Preselects from a **`monogram=` URL param** so the product page can be the real
        chooser at Stage 8 (owner's call, S158); the picker remains as fallback + change
        of mind for order URLs without the param.
      - **Transport**: `fpTexts.monogram` + `fpTexts.monogramLetters` (the two initials,
        first letter of each field whose label matches /name/i). Rides in `fpTexts` for
        the same reason zodiac does — `createUploadSession` persists it verbatim, so
        **no backend change and no functions deploy**. Engine now reads
        `order.monogram || order.fpTexts.monogram`, and `applyMonogramInitials()` seeds
        the four letter captions into `bookCaptions` (cover `backLetter1/2`, spread 0
        `monoLetter1/2`) so staff see the customer's initials already placed.
      Gate: `qa/heirloom-order-mock.mjs` (new, fully mocked — no Firebase order, no
      email) + `npm test` 312 green + `npm run qa:order` 12/12.
- [x] **6. Customer-preview parity** (S158). Mirrored from `template-engine.html`:
      `getActiveMonogramDef()`; `_activeMonogram` from `order.monogram ||
      order.fpTexts.monogram`; cover artwork + clip variant per monogram; the two
      back-cover initials appended to the caption list; the intro SVG swap + two
      intro initials; and `buildBookSequence` forcing `mandatory` functional spreads.
      **Bug found and fixed while eyeballing (S158):** cover captions were applied
      all-or-nothing on `!bookCaptions.cover`, so a saved bag holding only the two
      monogram initials made the customer's cover text vanish — the front read "Add
      caption…". Now a PER-KEY merge (saved wins per key), fixed in BOTH
      `customer-preview.html` and the engine's `restoring` branch, which had the same
      guard. **Also corrected a stale comment** claiming `renderBook()` clears
      `bookCaptions` — only `moveSpread()` does; it sent me chasing a phantom bug.
      `applyMonogramInitials()` now fills only EMPTY letter slots and runs on fresh
      orders after the cover prefill, so it can never clobber typed text.
      Gates: `qa/heirloom-preview-mock.mjs` 8/8 (mocked getOrder + local photos — no
      Firebase read, no egress), `qa/scribble-preview-regression.mjs` 7/7,
      `qa/debug-heirloom-render.mjs` PASS (41 canvases, 0 errors, 0 404s),
      `npm test` 312. **Intro passage does NOT overflow** — 11 lines ≈ 238px in a
      300px box; eyeballed, letters land in the artwork's pockets. Re-run and
      re-eyeballed with `assets/test photos/Wedding` (the subject-matched set —
      see LEARNINGS S158); the first pass used Newborn photos and told us little
      about how the book actually reads.
- [~] **7. PDF parity** — CODE WRITTEN (S158), NOT YET VERIFIED. Needs an owner
      Cloud Run redeploy + a dashboard generation. NEVER render locally.
      - `services/pdf-renderer/index.js` now passes `monogram` into the render state,
        via `order.monogram || order.fpTexts.monogram` — the same route `zodiacSign`
        takes, because `saveStaffState` persists neither. **This file is part of the
        Cloud Run image: without the redeploy the renderer cannot see the monogram at
        all and every Heirloom book prints the default Roots artwork.**
      - `scripts/export-pdf.js`: `activeMonogramDef(state)` (mirror of both engines);
        cover SVG + clip variant per monogram; back-cover initials appended to
        `drawCoverCaptions`; intro SVG swap; intro initials drawn in `drawCaptions`
        with **characterSpacing 0** to match the engines' `letter-spacing:normal`.
      - Sequence needs no change: the PDF replays `staffBookSequence`, which the engine
        already builds with mandatory spreads included.
      - `tests/monogram-resolution.test.js` (7 tests) guards the resolution + fallback
        chain and the CSV-derived letter geometry/colours. 319 tests green.
      - **Still unproven by anything:** that the letters land in the artwork's pockets
        in the actual PDF, and that IM FELL's per-character draw centres a single glyph
        the same way the browser does. Both are eyeball checks on a generated PDF.

### Phase C — live
- [x] **7b. Colourways wired (S160).** Brown/Green/Blue data files + registry on all four
      surfaces + staff dropdown. Gates: `npm test` 351, `npm run qa:order` 12/12,
      `qa/debug-heirloom-render.mjs <Colour>` PASS on all four (41 canvases, 0 pageerrors,
      0 SVG 404s), `qa/verify-caption-parity.mjs Heirloom-<Colour>` PASS on all four.
      **No PDF has been rendered for Brown, Green or Blue yet.**
- [ ] **8. Product page + Stripe** — colour selector (all four now exist) + monogram selector
      w/ per-monogram descriptions (owner to supply); swap-on-select thumbnails need 12 mockup
      sets (colours × monograms) — NOT yet produced; Beige-only placeholder acceptable interim.
      **The monogram is chosen HERE, not on the order form (owner, S158)** — it is a headline
      feature and needs a real thumbnail preview. The product page appends `&monogram=<key>`
      to the order link; the order form already preselects from it. Consequence: the 12
      mockup sets are launch-blocking for Heirloom, not a nice-to-have.
- [ ] **9. E2E** — `qa/staff-customer-chain.mjs`; `npm test` green.
- [ ] **10. Merge** — after owner approval; redeploy Cloud Run renderer.

## Fixed during Phase A eyeball
- **Cover photo hidden behind a dark square (S157, owner report).** Two root causes, both fixed:
  1. Xenia's cover export left the photo-window rect FILLED `#312128` instead of `fill="none"`
     (Tender's is transparent) — patched in-repo in all 3 cover SVGs (Wander precedent).
     **If Xenia re-exports the covers, this patch must be re-applied.**
  2. Cover slot sat 15mm high: the CSV photo row gives y-with-bleed as +3 (page convention)
     but the engine subtracts 18 from both axes. Data now carries `yMm: 98` (→ trim y 80 =
     artwork opening centre). The CSV's own caption rows already use +18 and were right.

## Open issues
- **Cover placeholders deliberately diverge from the CSV (owner, S158).** Both cover
  captions say **ANNA**; `Heirloom_Template_Sizing_Cover_40_Beige.csv` still says "Anne
  & Michael". Anna is the commoner Austrian spelling. The CSV is normally canonical —
  do NOT revert this on a re-sync, and re-apply it if the data file is regenerated.
- **RESOLVED (S158): the 11-line intro passage fits.** Measured in the customer preview:
  content ≈238px in a 300px box at 16.9px/21.6px line height, no overflow. Eyeballed —
  reads well, letters sit in the artwork's pockets.
- **Front cover name wraps to two lines** ("ANNA & MICHAEL" at 50pt in a 100mm box) and
  sits low on the panel. Renders cleanly and may well be the design intent, but it has
  not been checked against Xenia's mockup. Worth one look before launch.
- **Our story is Tender's model, deliberately (owner, S158):** two questions in, the
  customer's own wording on the page, staff polish by hand. Xenia's
  `Our Story Page_Text.txt` is a voice/length REFERENCE, not a template — do not turn it
  into a `compose()`. The manual polish is what TO-DOS #100 (AI-draft button) targets.
- **"Why I love him/her" is free-form customer text (owner, S158)** — verbatim to the
  page, no house copy. Do not add a composer if Xenia later sends text for these.
- **RESOLVED (S158): intro letter colour is `#7c746e`.** The owner filled the blank
  `captions_color` cells on all six letter rows in `Heirloom_sizing_full_Beige.csv`,
  confirming the S157 assumption. Data already matched; no change needed. Back-cover
  letters stay `#312128` per the cover CSV — the two surfaces differ on purpose.
- **Monogram letters no longer inherit `letter-spacing:-0.02em` (S158).** `.slot-caption`'s
  default applied to the letter boxes by accident; the CSV specifies no letter spacing for
  them, and on a single centred glyph the trailing spacing shifts it off-centre — so the
  engine would disagree with the PDF. Reset to `normal` in BOTH engines. **Mirror in
  `export-pdf.js` at Stage 7.**
- **The letters are positioned correctly; apparent lean is glyph metrics (S158, measured).**
  Roots renders both letters at an identical centre-x (0px offset), Birds 5mm apart, Roses
  29mm — each exactly as the CSV specifies. A single character centres on its ADVANCE
  WIDTH, not its ink, so `M` and `A` have different visual centres and the pair can look
  slightly leaning. It changes with each couple's initials, so it must NOT be "fixed" by
  nudging the data. If it ever needs fixing, the correct fix is optical (ink-bbox)
  centring applied on all three surfaces.
- **Intro page side:** CSV says "Left" but its x-coords (105/108) follow the right-page
  convention → modelled as a right page (like Tender). Confirm on first render.
- **Cover CSV mojibake** in Page-size column (`200Ãƒâ€”200mm`) — cosmetic, ignored.
- **⚠ The CSV export format CHANGED mid-build (S158).** Xenia's later exports are
  **comma-delimited with a title row above the header**; the first drop was
  semicolon-delimited with the header on line 1. Any parser must sniff the delimiter
  and locate the header by finding the row starting `Type`, not assume line 1. The
  three new colourways will likely arrive in the new format.
- **Spine caption box** CSV 6w×70h → data `wMm:70 hMm:6` (same swap as Tender). Verify centring.
- **Monogram descriptions for the product page** — owner to share later (point 12 of the brief).
- **RESOLVED (S160): all three remaining colourways are built.** See the Colourways section
  at the top for what actually differed.
- **The monogram letter boxes now show no placeholder** (S160) — 'Add caption…' and the
  back-cover `attr(data-label)` both wrapped one character per line in an 8×9mm box. They
  reveal a dashed outline on hover instead, which also closes the "no empty-state hint"
  question. The hover outline reaches the CUSTOMER preview via the shared class; restrict it
  to the staff engine if that reads as fussy.
- **Caption focus wash flips by ink luminance** (S160) — light ink on Brown/Green covers was
  invisible while being typed under the old fixed white wash. Any future colourway is handled
  with no per-template rule.

## Key numbers (for cold resume)
200×200mm book, bleed 3mm content / 18mm cover. Cover viewBox `0 0 1162.205 566.929` =
410×200mm TRIM at 2.83465 px/mm (bleed outside ✓). Spine band beige #dad0c5, 10mm.
Standard captions IM FELL 16pt #312128; functional panels #7c746e; front name 50pt;
spine 16pt; intro letters 23pt; back letters 22pt. letterSpacing CSV 10 → 0.01em.
