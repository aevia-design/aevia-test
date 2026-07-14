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
- **4-photo square cover** — four 60×60mm slots around the centred title: top (323,41),
  left (259,105), right (387,105), bottom (323,169) (without-bleed centres; +18 for
  with-bleed). Order form gets 4 labelled cover uploads (top/left/right/bottom); each slot
  supports standard reposition. All prior templates have exactly 1 cover photo — audit
  `cover.slots[0]` assumptions on all 3 surfaces.
- **Sized cover-caption boxes** — title Lora Regular 35pt in a 52×43mm box (wraps ~3 lines),
  maxlength **40** (owner decision S128), **font auto-shrink on overflow**; sub Mulish Light
  20pt in 40×8mm. Data model already carries wMm/hMm (Tender does) — new part is the
  auto-shrink behaviour.
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
- [ ] 4. Engine render smoke test + the Joyride code generalisations. **Audited S128, precise
  to-do list (line numbers post-S128 edits):**
  - **Cover render 4 slots** — `renderCover` reads `coverDef.slots[0]` only
    (template-engine.html:1841-1905). Loop over `coverDef.slots`, photo i from
    `window.specialPhotos.cover[i]`; per-photo crop/reposition already keys off photo name
    (`getHeartCrop`/`attachCropDrag`) so the loop body stays as-is. Placeholder text per slot.
  - **De-hardcode spread lists** — `standardTypes` (engine 2401, spread-type dropdown) and
    `stdIds` (engine 3106, sequence builder) are hardcoded SP1–SP6 → derive from
    `getActiveTemplateData().spreads` keys (/^SP[1-9]/, numeric sort) or SP7–SP9 never appear.
    Mirror `stdIds` in customer-preview.html:1519 (same hardcode). fpTypes (2402) can derive
    from FP keys too — fixes bogus FP1–FP5 options showing for non-Scribble templates.
  - **M-page allocation** — `assignPhotosToSpreads` multi-slot branch (engine ~3213) picks a
    same-orientation PAIR; for a `mixed:true` variant use window-local V/H matching instead
    (slot.orient → pick matching photo from the window; fallback crop-into-frame + existing
    placement-audit warning). Decision: work/joyride-template/decision-m-page-allocation.md.
    Also `resolveVariant` returns 'default' for M pages (only key) — verify no warn spam.
  - **Slot zIndex** — spread slot render must honour `slotDef.zIndex` (vertical photo ON TOP
    where M-page photos overlap). Currently slots all get z-index:1.
  - **textPanelTitle** — engine textPanel render (one box, ~2903) → also render
    `variant.textPanelTitle` (Lora 36 intro title; saved key suggestion: 'textPanelTitle').
    Mirror customer + PDF at Phase B.
  - **autoShrink** — cover caption render (1936-1961): when `capDef.autoShrink` and wrapped
    text overflows `hMm` box, step font-size down until it fits (title 52×43mm @ 35pt, max 40
    chars). Mirror customer + PDF at Phase B.
  - **Smoke test** — `qa/debug-joyride-render.mjs` (copy debug-tender pattern): 0 pageerrors,
    canvases render, cover shows 4 slots, SP7-9 reachable, M page gets 1 V + 1 H.
  **← then hand back for owner eyeball in the staff engine.**

## Phase B — Flow works
- [ ] 5. Order form: 4 labelled cover uploads, cover title (40 chars) + sub + spine inputs, Intro fields.
- [ ] 6. Customer-preview parity (incl. 4-photo cover, M-page z-order, auto-shrink title). Re-run Scribble smoke test.
- [ ] 7. PDF parity (export-pdf.js) — owner redeploys Cloud Run renderer + generates via dashboard. ⛔ no local renders.

## Phase C — Live
- [ ] 8. Product page (shared product-page pattern; standard €70/€100 prices.js).
- [ ] 9. E2E via qa/staff-customer-chain.mjs; npm test green.
- [ ] 10. Merge (backend-first; owner redeploys renderer; docs/templates.md roster update).

## Open issues
- **Cover SVG has LIVE `<text>`** (back-cover "Curated by @letdorabe" quote, references the
  Mulish VARIABLE font at wght 300) — everything else is outlined. SVG loads via `<img>` →
  external fonts don't apply → the quote will render in a fallback font. Verify at the stage-4
  smoke test; likely ask Xenia to outline it.
- **Spine reads as 28mm** (cover viewBox 428mm total; CSV spine caption centre x=214) vs
  Tender's 9mm. Unusually thick — confirm with Xenia it's intentional before print.
- **"Curated by @letdorabe"** on the cover → is Joyride an artist collaboration? If yes:
  docs/templates.md roster + our-artists.html + product-page credit at Phase C (see
  docs/briefs/artist-collaborations.md).
- **Photo-grid centre x=323 (without-bleed)** sits 5mm left of the front-page centre (328,
  if spine is 28mm) — matches the SVG art (flowers at 258/386 corroborate), so build to the
  numbers; flag only if the Phase A eyeball looks off-centre.
- **Cover captions use weight/italic, spread captions use style** — data carries both
  (`style:'light'` + browser resolves Mulish's single 300 face either way). Check the PDF's
  COVER caption font resolution (Family_style key?) at stage 7.
- **Intro orderFormMeta fields are DRAFT copy** (place/when/line) — owner review + /stop-slop
  at stage 5 before they ship.
