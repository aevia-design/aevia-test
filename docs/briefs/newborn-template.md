# Brief: Newborn template (template #4) + Bloom→Newborn rename

**Created:** 2026-06-15 (Session 43)
**Objective:** Digitise the "Newborn" photo-book template end-to-end (order form → staff engine → customer-preview → PDF) and land it on the renamed Bloom product page, so a real Newborn order can be placed and printed.
**Audience:** Developer (this + following sessions). Executor will implement across the 3 render surfaces + order form.
**Applicable Standards (project conventions, not external skills):**
- `memory/project_adding_templates.md` — adding-templates playbook (audit Scribble assumptions, guard optional fields, per-template render smoke test before E2E)
- `memory/project_template_seam.md` — chunk-020 registry: one entry per surface, key = product-form name lowercased
- `memory/project_bleed_model.md` — with-bleed data coords; SVG viewBox frames CONTENT only
- `memory/project_pdf_font_rules.md` — every new font needs the fontkit GSUB ligature check
- `memory/feedback_engine_parity.md` — staff + customer engines are parallel copies; mirror every change
- `docs/briefs/wander-template.md` — the closest precedent (template #2 with a functional page)

## Why

Newborn is the 4th template and the first with (a) a **non-rectangular custom cover photo frame** (the ornamental scalloped "Image" opening — realises the parked TO-DO #73 data-driven `clipShape`), (b) **two cover fonts** (Twinkle Star + Baskervville), and (c) a **decorative zodiac-constellation overlay** on a functional page. It replaces the placeholder "Bloom" product page in the Kids section. Getting it live proves the template seam generalises beyond Scribble/Wander and unlocks the remaining template backlog.

## Scope — what exists in the assets (verified)

`assets/Template_Newborn/` contains:
- **Cover** (`Cover/Artboard 1.svg`, 2.7 MB vector, 409×200mm wraparound, bleed 18mm): butterflies/dragonflies + back BG + spine panel + aevia logo all baked in as paths; **photo opening = `clipPath id="i"`** (wavy scalloped silhouette, the "Image" layer). No `<image>`/`<text>` — captions drawn by engine.
- **Two functional pages:**
  - **Intro** (`FP Intro/FP 01 Intro.svg`, spread 1, text-only, no photo) — centred caption box.
  - **Labour** (`FP Labour/…`, spread 2) — photo + caption on left and right; right page also takes a **zodiac constellation overlay**: 12 signs + `None`, separate small SVG per sign, in both **H** and **V** orientations (`FP 02 {H|V} Labour Right ({Sign}).svg`). `None` = empty SVG.
- **Spreads SP0–SP6** (H+V variants), captions **Baskervville Italic 18pt** navy `#262262`.
- Two CSVs: `Newborn_sizing_full.csv` (semicolon-delimited, same column family as Wander) + `Newborn_Template_Sizing_Cover.csv`.
- **Format: square 200×200mm**, content bleed 3mm (cover wrap bleed 18mm).

## Confirmed product decisions (from Evgeny, S43)

1. **Intro page** — customer fills **separate labelled fields: Name / Date of birth / Time / Weight / Length**. Engine composes them into the centred Intro text block.
2. **Labour captions** — both pages show a caption, but **only the LEFT is a customer field** (e.g. *"Welcome to the world, Nico"*). The **RIGHT caption is AI-generated later** (out of scope for this build — leave staff-editable / blank; do not add a customer input for it).
3. **Zodiac** — customer **selects the sign (or None) on the order form**; the matching constellation overlay decorates the Labour right photo. Orientation (H/V) follows the chosen page layout.
4. **Cover captions** — Twinkle Star line = **baby's name** (= album name, e.g. *"Nico"*); Baskervville Italic subtitle = **free phrase or date of birth** (example placeholder *"Your First Months"*); **spine** = free field, phrase/name (example *"Our Nico"*). All editable.
5. **Rename Bloom → Newborn EVERYWHERE including the URL** — `pages/bloom.html → pages/newborn.html`, all links (home, collections, nav), the `template` param, and the Stripe price wiring. Template registry key = `newborn`.

## Requirements

**From project_adding_templates + template_seam:**
- [ ] `assets/Template_Newborn/newborn-data.js` built from the two CSVs (cover, SP0–SP6, both functional pages, zodiac asset map), parsing clean — mirror `wander-data.js` shape.
- [ ] One registry entry added in EACH of the 3 surfaces (`template-engine.html`, `customer-preview.html`, `export-pdf.js`), keyed `newborn`; asset base accounts for Newborn's folder layout (no `Spreads/` subfolder; functional/zodiac subfolders).
- [ ] Audit every Scribble-specific assumption the new fields touch (text-only Intro = no photo slot; cover with custom clip; zodiac overlay) and guard optional fields so the render doesn't crash.
- [ ] Per-template **render smoke test** passes on all surfaces before any E2E (Scribble + Wander must still render unchanged — hard regression gate).

**From bleed_model:**
- [ ] Photo/caption coords read from the **with-bleed** columns; viewBox frames content only; cover wrap bleed (18mm) handled distinctly from the 3mm content bleed.

**From pdf_font_rules:**
- [ ] **Twinkle Star Regular** + **Baskervville** (incl. **Medium Italic**) downloaded into `assets/fonts/`, registered via `@font-face` in both HTML surfaces + the font picker, and added to `export-pdf.js` FONT_MAP.
- [ ] Each new font run through the fontkit GSUB **ligature-bug check**; add to `LIGATURE_FONTS` if a PDF gap appears (do NOT add to `SUPPRESS_LETTER_SPACING_FONTS` unless it needs zero letter-spacing).

**From engine_parity:**
- [ ] Every render change mirrored across `template-engine.html` AND `customer-preview.html`; required-caption tracking kept in sync.

**Feature-specific:**
- [ ] **Custom cover clip (#73)** — generalise the hardcoded heart `clipShape` into a data-driven field carrying the cover's `id="i"` silhouette; mirror across engine + customer-preview + export-pdf. Heart must still render (regression gate).
- [ ] **Order form** captures: cover name + subtitle + spine; Intro fields (Name/DOB/Time/Weight/Length); Labour left caption; **zodiac select (12 + None)**; with realistic entry-example placeholders for each functional page.
- [ ] **Rename** complete: `pages/newborn.html` live, every `bloom` reference updated, Kids-section link points to Newborn, price wiring + `template:'Newborn'` param correct.

## Constraints

- Plain HTML/CSS/JS, no frameworks/build (project rule). Surgical edits only.
- Out of scope: AI generation of the Labour right caption (leave staff-editable/blank); remaining templates 011–017; multi-tab CSV workbook (parked idea).
- **Optional / likely a later pass:** an order-phase **preview of the special pages** (like the Wander FP1 spread preview), with a "this is preliminary; our team reviews and arranges everything" caveat. Deferred — it also requires building the same for Scribble, so its viability is a separate discussion with Evgeny, not part of this build's first pass.
- **All changes happen on a dedicated branch** (`newborn-template`), verified locally, and only merged to `main` once Evgeny approves. Do NOT push to `main` mid-build (Cloudflare auto-deploys it).
- Cloudflare 25 MiB per-file limit — verify no Newborn asset exceeds it before deploy (cover is 2.7 MB vector, fine; watch the Labour-left 3.4 MB raster).
- Backend deploy ordering unchanged (no new Cloud Functions expected).

## Success Criteria

The build is complete when:
1. A real Newborn order placed via `pages/newborn.html` renders **identically** across staff engine, customer-preview, and the exported PDF — cover photo clipped to the scalloped frame, both fonts correct, Intro composed from the fields, Labour left caption shown, and the chosen **zodiac overlay** decorating the Labour right photo (or nothing for None).
2. Scribble and Wander still render byte-identically (regression gate) and `npm test` is green.
3. The Bloom URL/product page is fully renamed to Newborn with no dead `bloom` references and correct Stripe pricing.
4. All requirements above are met.

## References

- **Closest precedent:** `docs/briefs/wander-template.md`, `assets/Template_Wander/wander-data.js`
- **Heart-clip precedent (for #73):** `pages/staff/template-engine.html:2348` (`heartClip`, hardcoded today) — mirror across all 3 surfaces
- **Registry seam:** chunk-020 entries in the 3 surfaces; `assets/Template_Scribble/scribble-data.js` for data shape
- **Memories:** project_adding_templates, project_template_seam, project_bleed_model, project_pdf_font_rules, feedback_engine_parity

## Context / known risks

- **Zodiac is a brand-new mechanic** — no precedent. Treat as a per-page decorative SVG overlay selected by a data field (`zodiacSign`), resolved to the matching `FP 02 {orientation} Labour Right ({Sign}).svg`. `None` → no overlay. Verify pin/overlay sits correctly in both H and V before E2E.
- **Custom cover clip is the riskiest visual** — building the data-driven clip against the heart alone was the regression risk that held #73; now there's a real second shape to test against. Extract the `id="i"` path geometry into the data file rather than hardcoding.
- **Text-only Intro** has no photo slot — the render path must not assume `slots`/`pool` like Scribble does (the playbook's "hidden Scribble assumptions" trap).
- **Rename touches the live URL** — update links, the `template` param flowing to Stripe, and the price chip wiring together; Cloudflare auto-deploys `main`, so a half-done rename ships broken.
- This is a **multi-session build** (Wander-sized). Stage it: data file → registry/engine render → order form (incl. zodiac + Intro fields) → customer-preview parity → PDF → rename → E2E.
