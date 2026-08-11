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
- [x] **7. PDF parity VERIFIED (S163).** Owner redeployed Cloud Run and generated Brown,
      Green and Blue PDFs from the dashboard — the first renders those three colourways
      have ever had. **The monogram letters land in the artwork's pockets**, and IM FELL's
      per-character draw centres a single glyph correctly, which were the two things
      nothing could prove without a real PDF. Also verified an **80pp Blue** book (112
      photos, 14mm spine vs the 10mm the covers are authored at).
      **One bug found by the owner eyeballing those PDFs: full-bleed photos ignored the
      staff reposition offset** — `FPhim` had been moved in the engine and printed centred.
      `export-pdf.js` had three photo branches and only the heart and regular ones read
      `state.heartCrop`; the full-bleed branch hardcoded `position:'centre'` and had done
      since it was written on 2026-05-26 (#74 added crop handling to the other two in S50
      and missed it). Both engines apply `object-position` to any slot shape, so it looked
      right in the engine and in customer-preview and only diverged in print. Fixed to use
      the shared `coverExtract`; `tests/photo-crop-paths.test.js` guards all three branches.
      **Not Heirloom-only** — every template has a full-bleed slot; see TO-DOS #102 for the
      list and the real-print check deferred to the Printsmarter samples run.
      Original code notes from S158 follow.
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
- [x] **8. Product page DONE (S162).** `pages/heirloom.html` + `pages/de/heirloom.html` ship
      the colourway swatches and monogram cards in the panel, in the owner's order: name →
      description → pages/price → colourway → monogram → story pages. Appends
      `&monogram=<key>`; the order form preselects from it. Monogram descriptions supplied by
      Xenia (Bond / Harmony / Devotion) and used verbatim — no stop-slop pass (owner).
      **Monogram cards crop the REAL cover SVG**, not a mockup, so they stay sharp and follow
      the colourway.
      - **All 12 mockup sets exist** in `assets/images/mockups/exp2/heirloom-<colour>-<mono>/`,
        10 webp each. `ASSETS_READY` and the placeholder plumbing are gone.
      - **Order → colourway map (NOT the runbook's assumed order):** beige `AEV-089`,
        green `AEV-090`, blue `AEV-091`, brown `AEV-092`. Recorded in `HEIRLOOM_ORDERS`
        (`scripts/exp2-images.mjs`) with each cover's background hex.
      - **No intro card in the story list (S162, owner)** — the intro is mandatory, so a card
        offered a choice that does not exist. It stays in the gallery thumbnails.
      - **Selector stack aligned to one 268px module** via `.has-selectors` in `product.css`;
        full-width was considered and rejected (owner).
      - Heirloom cards added to `collections.html` and `pages/de/collections.html`.
      - Capture cost, measured: **~10 MB per order load, 31 MB for a 12-capture run.**

#### Mockup capture runbook (S161) — 4 orders → 12 image sets
One ORDER per colourway: switching template in the engine resets `specialPhotos`, so a
colourway cannot be swapped inside an order. The three monograms DO come from one order —
`qa/select-monogram.mjs` drives the engine's picker, which swaps artwork only and leaves
photos and captions alone. Capture reads Firestore, so **Save book state once** first.

```powershell
$env:STAFF_PW = Read-Host "Staff password"     # once per terminal
$env:BG_R="216"; $env:BG_G="212"; $env:BG_B="207"   # warm-grey bake, matches the other 5 templates
$env:QA_ORDER = "AEV-089"                      # this colourway's order
foreach ($m in "roots","birds","roses") {
  $env:QA_MONOGRAM = $m; $env:MONOGRAM = $m
  node qa/capture-cover-wrap.mjs               # → cover-wrap-<order>-<m>.png
  node qa/capture-spread.mjs                   # → spread-<order>-<m>-NN.png + manifest
  node scripts/compose-all.mjs $env:QA_ORDER heirloom-beige $m
  node scripts/compose-flat-mockup.mjs $env:QA_ORDER heirloom-beige --scratch
  cd scripts; node exp2-images.mjs heirloom-beige-$m; cd ..
}
```
⚠ **The monogram picker is UNREACHABLE by hand in order mode** — `setMode` sets
`#special-panel` to `display:none` outright (template-engine.html:4762), hiding the whole
panel including the monogram zone. The capture script is unaffected: it sets the value in JS
and confirms `window._activeMonogram` took, which works with the panel hidden (verified S161).
So **do not try to flip monograms in the engine before capturing** — your preview is the
captured `sessions/qa-runs/cover-wrap-<order>-<mono>.png`, checked before composing.

Repeat per colourway, changing `QA_ORDER` and the `heirloom-<colour>` key together.
**Fill `HEIRLOOM_ORDERS` in `scripts/exp2-images.mjs` first** — it errors out rather than
half-working. `BG_R/G/B` is not optional: without it spreads bake on a near-white backdrop
and mismatch the covers (S98). Watch each run's `Monogram set to "<m>" (was …)` line; a
throw means the picker did not take, and capturing the wrong monogram silently would
poison a whole set.
- [x] **9. E2E DONE (S163).** `qa/staff-customer-chain.mjs` green on **AEV-090** (green) —
      staff login → engine load → save → preview link → customer approve → Stripe test
      payment → `paid`. `npm test` 355. The chain gained a **monogram parity assertion**
      (engine `_activeMonogram` vs customer-preview): `roots` → `roots`. That hop had only
      ever been covered by the two mocks; this is the first real end-to-end proof.
      **The run earned its keep — it caught a live crash nothing else did.**
      - **`customer-preview` threw `ReferenceError: color is not defined` out of
        `renderCover`, killing the book render for ALL SIX templates.** Introduced the day
        before in `e1efd85` (S160) by the light-ink caption treatment for the dark
        Brown/Green covers: the line was ported from `template-engine.html`, which computes
        `color` inline, but customer-preview had already moved that into
        `applyCoverCaptionLayout`. Fixed by reading `cap.style.color` back after layout —
        the idiom the file already uses for spread captions. **The failure was partial and
        therefore nasty: the book failed to render while Approve and Pay stayed live, so a
        customer could approve a book they never saw.**
      - **`qa/heirloom-preview-mock.mjs` already covered it** — 0/1 on the buggy file, 8/8
        on the fixed one. It was simply never re-run after S160 touched customer-preview.
        Not a coverage gap, a process gap.
      - **Three stale spots in the chain script itself**, all failing silently or
        misleadingly: `.preview-url` matches nothing (CSS-only class, dead since the
        dashboard rework) — now reads the href from the order's own `<tr>`; the save status
        was read after 8s, by which time `Saved ✓` has self-cleared, so a failed save read
        identical to a good one — now polled; and **the Stripe step never filled the
        shipping address** (`shippingName` / `AddressLine1` / `PostalCode` / `Locality`),
        so checkout refused the submit and the run sat out a 90s timeout looking like a
        declined payment. It knew only `#billingName`/`#billingPostalCode`, which are not
        fields on that form, and the fill helper fails silently.
- [ ] **10. Merge** — after owner approval; redeploy Cloud Run renderer.
      **The redeploy is now REQUIRED, not optional:** S163 fixed `scripts/export-pdf.js`
      (full-bleed slots ignored the staff reposition offset — see TO-DOS #102), and that
      file is baked into the Cloud Run image. Until it is redeployed, a repositioned
      `FPhim`/`FPher` photo still prints centred.

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
