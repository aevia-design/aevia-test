# Tender template — build state

Couples/wedding template. Square 200×200mm, 3mm bleed. Replaces the **Vows** product page.
Closest precedent: **Newborn** (Intro mechanic only). Font: **Parisienne** (Regular only;
connected cursive → HIGH ligature risk).

## Scope notes
- **Intro** = Newborn-style: default text + customer-filled fields at order; replaces standard
  spread 0 when selected.
- **Our story** + **Words** = optional functional spreads (behave like normal optional spreads).
  Each is a 2-page spread with a photo slot + an editable text panel; CSV text is mockup default,
  customer enters real text at order, staff polish wording in engine.
- **Spread 3** has art objects UNDER photos → `overlay_position=below` in the CSV (new mechanic).
- **Words** right page = full-bleed photo (206×206, no background).
- **Cover** = custom clip shape; labels "Our wedding" / "We found love".
- ⚠ Spread-1 SVGs are heavy (up to 5.72 MB) — watch the 8 MB PDF-drop limit; ask Xenia to check.

## Phase A — Engine renders
- [x] 1. Data file `assets/Template_Tender/tender-data.js` — parses clean; 10 spreads, cover ellipse→path clip, SP3 overlayBelow, full-bleed Words photo. letterSpacing 0.01 (=CSV tracking 10).
- [x] 2. Fonts — Parisienne registered on all 3 surfaces (@font-face + picker engine/customer, FONT_FILE_MAP pdf). Ligature check: 21→18 glyphs, GSUB liga present → added to LIGATURE_FONTS (char-by-char PDF draw). Single Regular weight sufficient.
- [x] 3. Registry across 3 surfaces (key `tender`, svgBase no subfolder) + data-script tags. Loads clean, 122/122 tests pass.
- [x] 4. Engine render smoke test: 0 pageerrors, 41 canvases, cover present. **overlayBelow wired on all 3 surfaces** (engine 2463, customer-preview 1769, pdf 491). **Eyeballed + signed off S79** — cover ellipse + names/spine OK, functional photo spreads upload OK, page border added.
- [x] **(S79) Spine colour fix** + **engine functional-photo upload zones** (story/words) + **page border/frame** (engine + customer-preview). See "Fixed in S79 review loop" below. Phase A COMPLETE.

## Phase B — Flow works
- [x] 5. **(S79) Order form.** Registered Tender in `order.html` (script tag + registry).
  Routed Our-story/Words through the existing `introFields` mechanic (labelled fields →
  composed block) — renamed their `orderFormMeta` flags `storyFields`/`wordsField` →
  `introFields`. **De-hardcoded `composeIntroBlock`:** each Tender functional spread now
  carries its own `compose(values)` in `orderFormMeta` (data file); `order.html` calls
  `(textMeta.compose || composeIntroBlock)(vals)` so Newborn's default still applies.
  Added `orderFormMeta.heading` (renderIntroFields shows it; default 'Intro details').
  Verified headless: intro(4)+story(photo+2)+words(photo+1) fields render, headings
  "Intro/Our story/Words", photo dropzones work, `validateSpecialStep()` ok, compose
  blocks correct, 0 console errors, 122/122 tests. Test URL params:
  `template=Tender&addons=Intro,Our story,Words&addon_inputs=intro,special,special&addon_slugs=fpintro,fpstory,fpwords&pages=40`.
  **← Awaiting user eyeball of the order form before stages 6–7.**
- [x] 6. **(S79) Customer-preview parity.** Mirrored the engine special-pool generalisation
  into the customer resolver ([customer-preview.html:1834] → any pool except regular/cover,
  per-side when count>=2). Confirmed the rest was already in place: `freshSpecialPhotos`
  is data-driven (creates FPstory/FPwords buckets), Parisienne already in `CAPTION_FONTS`
  + @font-face (S78), the regular-photo assignment loop already short-circuits FP spreads
  with no regular slots (`hasRegularSlots` guard), and the text-panel render is flag-agnostic
  (reads `bookCaptions[...]['textPanel']`). **Composed intro/story/words text reaches the
  customer via the SAVED book captions** — the engine's `loadOrderIntoEngine` seeds
  `fpTexts[slug]` into the panel's actual DOM side generically (verified maps story→right,
  words→left, intro→right), and customer-preview inherits that on load. Also unified the
  leftover render-side textPanel flags `storyFields`/`wordsField` → `introFields` in the
  data file (they were decorative/unread; now internally consistent). Verified: Tender
  activates, buckets + fonts + pools resolve, 0 console errors, 122/122 tests.
  ⚠ Not driven with a LIVE Tender order (needs a real order+token) — full customer render
  eyeball happens at Phase C E2E (stage 9). The resolver change is logic-identical to the
  engine fix already eyeballed.
- [~] 7. **(S79) PDF parity — code complete, awaiting USER dashboard render + eyeball.**
  No Tender-specific code changes needed: cover ellipse clip uses the generic
  `clipShapes.coverFrame` path (export-pdf.js:903), `fullBleed` + `overlayBelow` + Parisienne
  (FONT_FILE_MAP + LIGATURE_FONTS) + generic `textPanel` render all wired (S78); the Cloud
  Run renderer's slug→spread map resolves fpstory→FPstory / fpwords→FPwords via its general
  branch. Confirmed it renders 40 pages with 0 errors — but NOT visually verified.
  **⛔ Do NOT render the PDF locally (egress on Evgeny's bill) — see [[feedback_no_local_pdf]].**
  Evgeny generates via the dashboard "Generate PDF" (in-region, free) for AEV-044 and eyeballs:
  cover ellipse + taupe names + cream spine, intro/story/words Parisienne text, full-bleed
  Words photo, SP3 under-photo art. Fix export-pdf.js from his feedback.
  (S79 slip: rendered AEV-044 locally off a vague go-ahead → caused egress. Rule now in skill.)

### Pricing (decided S79)
Tender = standard prices (€70 / €100), same as all templates — uses shared `assets/js/prices.js`
on the product page (stage 8), no per-template values. Documented in new `docs/pricing.md`.

### Stage 5 carry-forward to stages 6–7
- The functional textPanels in `tender-data.js` page defs still use the original flags
  (`introFields`/`storyFields`/`wordsField`) for the RENDER side — confirm the engine/
  customer/PDF read `fpTexts[slug]` into those panels (the order form now always stores a
  composed string under the slug). If render keys off `storyFields`/`wordsField`, unify it.
- Mirror the engine's special-pool generalisation (any pool except regular/cover) into
  customer-preview + PDF so story/words photos resolve there too.

## Phase C — Live
- [x] 7. **(S81) PDF VERIFIED + fixed.** Tender renders correctly from the dashboard. Four
  renderer fixes (all in `scripts/export-pdf.js` unless noted): (1) `setActiveTemplate()` now
  THROWS on an unknown template instead of silently falling back to Scribble (a stale renderer
  rendered Tender-as-Scribble — the Cloud Run renderer is a SEPARATE deploy from the website);
  (2) 4 GiB OOM at page 38/40 (95% freeze) → redeploy with `--memory 8Gi`; (3) spine caption
  off-band — pdf-lib `heightAtSize()` returns inverted ascent/descent for Parisienne → read
  fontkit metrics (`font.embedder.font`); (4) SVG raster cache for repeated spread designs.
  ⚠ Spine fix + cache only live after the owner redeploys the renderer with `--memory 8Gi`.
- [x] 8. **(S81) Product page DONE.** New `pages/tender.html` (Vows→Tender, Love category,
  €70/€100 via `prices.js`, 3 functional add-ons Intro/Our story/Words with fpintro/fpstory/
  fpwords slugs). No mockup imagery yet (placeholder line-art; real mockups drop in later at
  `assets/images/mockups/tender/`). Updated collections card, home testimonials, docs/templates.md
  (Tender = Built); deleted vows.html. Stripe = shared standard 40/80 (no per-template ids on the
  page; price/pages flow to order.html → existing checkout). Verified headless, 0 console errors.
- [ ] 9. **E2E on a real order** — order → engine Save → customer → PDF. Not yet run. Good moment
  to drive via `/add-template` (the skill was never invoked across the whole Tender build).
- [x] 10. **(S81) Merged to `main`** (`27f0e17`…`3126b22`, pushed). Backend-first satisfied — no
  Firebase function change this session; the only backend action is the owner's pending renderer
  redeploy (`--memory 8Gi`). Tender mockups (capture pipeline) still outstanding.

## Fixed in S79 review loop (Phase A eyeball pass 2)
- **Spine font colour** — data file had spine `color:#7c746e` (taupe) but the cover CSV
  `captions_1_fontcolor` for the Spine row is **#fbf8f6** (cream — sits on the dark
  `#8a817a` spine band). Root cause: the cover CSV has PER-CAPTION colour columns
  (`captions_1_fontcolor`/`captions_2_fontcolor`) that differ between front and spine;
  hand-authoring applied one uniform colour. Fixed `tender-data.js:72`. (Skill trap added.)
- **No upload field for Our-story / Words functional photos** — the staff engine's
  special-photo upload UI (zones + slot resolver) was hardcoded to Newborn/Scribble FP
  ids and pool names (`special`/`artwork`/`labour`). Tender's `story`/`words` pools had
  no upload zone and weren't recognised by the renderer. Fixed in `template-engine.html`,
  de-hardcoded (3 edits): (1) slot resolver now treats ANY pool except `regular`/`cover`
  as special, per-side when `orderFormPhoto.count>=2`; (2) new `ensureFunctionalPhotoZones()`
  builds an upload zone for every functional spread with `orderFormPhoto` lacking a static
  zone, `updateSpecialPanel()` toggles them generically; (3) upload handlers switched to
  event delegation on `#special-panel` so dynamic zones work. Verified: zones appear with
  labels "Our story photo"/"Words photo" when selected, accept uploads, photos resolve
  into the render, 0 pageerrors, 122/122 tests. ⚠ customer-preview + PDF still need the
  same special-pool generalisation — that's Phase B (stages 6–7).

## Fixed in S78 review loop
- **Words spread swapped** — left = text panel, right = full-bleed photo (matches SVG names + Xenia example). NB: CSV labels the photo "Left H" — flagged to Xenia to change to Right.
- **Cover blue placeholder** — cover SVG had `<rect fill="#c1d5ef">` over the photo opening, hiding the photo. Set to `fill="none"` (same as Newborn's #d8eaf0→none). ⚠ RE-APPLY if Xenia re-exports the cover.

## Open issues / Stage 4 to-do (next run)
- **Cover photo comes from `specialPhotos.cover`, not the main grid** — confirm placement + ellipse clip + both-axis drag once a cover photo is assigned via the special panel.
- **Functional text vs SVG-baked text** — the FP SVGs already contain styled default text; need to confirm with Xenia whether customer/staff text REPLACES it (Phase B) or overlays. Otherwise risk double text.
- **overlayBelow render not yet implemented.** The data carries `overlayBelow:true` on SP3 pages, but the engine render code doesn't read it yet. Stage 4 must add the under-photo render path (the new CSV-driven mechanic) — likely render the page SVG decorations, then photos on top when `overlayBelow`. Mirror to customer-preview + PDF.
- **Functional spreads use `pages.*.default`** (not H/V) for the fixed-shape photos (Our story square, Words full-bleed) + text pages. Verify the engine's functional render picks `default`; Newborn Intro used `default` so likely fine, but confirm in the smoke test (potential hotspot).
- **Ellipse cover clip** — reuses Newborn's generic clip code via a 2-arc path; verify it actually clips (Newborn was a complex path; ellipse-as-arcs should work but untested).
- **Cover drag-reposition (both axes) inside the ellipse** — S65 mechanism; confirm it's active for Tender's cover slot (alwaysOn) and aligns within the elliptical opening.
- ⚠ Spread-1 SVGs heavy (5.72 MB) — watch 8 MB PDF-drop at Phase B.
