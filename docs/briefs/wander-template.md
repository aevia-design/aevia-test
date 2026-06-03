# Brief: Wander — second photobook template (+ multi-template support)

**Created:** 2026-06-03 (session 25)
**Objective:** Make the staff engine, customer preview, and PDF exporter render a second template ("Wander", Travel collection) selected per-order, including a novel map+itinerary functional page — without regressing Scribble.
**Audience:** Claude Code (executor across future sessions) + Evgeny (reviewer).
**Applicable Standards:** project `CLAUDE.md` conventions (plain HTML/CSS/JS, no build tools, surgical edits); engine-parity rule (staff + customer are mirrored copies); `verifying-work` (verify in browser before claiming done).

## Why

Aevia is moving from one hand-built template to a small catalogue. Wander is the first template in the new "Travel" collection and the first real test of whether the engine can host more than one template. The system is currently **hardwired to Scribble** (`window.SCRIBBLE_DATA`, Scribble-only asset paths) — so this work both ships Wander and builds the multi-template seam every future template depends on. Wander also introduces a **map functional page** that every Travel template will reuse: pick a country → the right regional map loads → a pin drops at the country's coordinates → staff format the customer's route as an itinerary opposite.

## Scope — phased

### Phase 0 — Template data (DONE this session)
- `assets/Template_Wander/wander-data.js` — cover, SP0–SP6, FP1 map contract, and `mapCoordinates` (183 countries → {region,x,y}, generated from the CSV). Parses clean.
- Cormorant Garamond static `.ttf` (Light/Regular/Medium/SemiBold/Bold) downloaded into `assets/fonts/`.

### Phase 1 — Multi-template loader (do first; nothing renders without it)
- [ ] Engine, `customer-preview.html`, and `export-pdf.js` select template data by the order's template name (not hardcoded `SCRIBBLE_DATA`).
- [ ] A per-template asset base: Scribble = `…/Template_Scribble/Spreads/`; Wander = `…/Template_Wander/` (no `Spreads/` subfolder).
- [ ] Scribble orders render byte-identically to today (no regression).

### Phase 2 — Register Cormorant Garamond
- [ ] `@font-face` blocks added to `template-engine.html` **and** `customer-preview.html` (mirrored), weights Light/Regular/SemiBold/Bold.
- [ ] Added to the engine's font-picker dropdown list.
- [ ] Added to `FONT_MAP` in `export-pdf.js` (`Cormorant Garamond_light|regular|semibold|bold` → filenames).
- [ ] Wander captions render in Cormorant on screen and in PDF (no fallback/`.notdef`).

### Phase 3 — Map functional page (the novel work)
- [ ] Left page renders the region map SVG chosen from `maps[region]`.
- [ ] One pin per selected country, placed at `mapCoordinates[country]` (with-bleed mm), **centre-anchored**, **12 mm W × 23 mm H**, from `pin.png`.
- [ ] Right page renders the itinerary `textPanel` (staff-editable, Cormorant 18 pt Light) over `FP 01 Map Right.svg`.
- [ ] Order form: **country multi-select, no photo upload**; blocks selecting countries from more than one region (prompts to pick one region); shows a reference of which map will appear.
- [ ] Mirrored across engine + customer-preview; PDF reproduces map + pins + itinerary identically.

## Constraints
- Plain HTML/CSS/JS; no frameworks, no build step (project rule).
- Surgical edits — Phase 1 must not change Scribble's rendered output.
- Engine-parity: every render change lands in both `template-engine.html` and `customer-preview.html`.
- Pin asset is the PNG (`GEO PIN.png`), not inline SVG.

## Success Criteria
1. A Wander order renders end-to-end (cover → SP0–SP6 → map page) in engine, customer preview, and PDF.
2. A Scribble order is visually unchanged (regression check).
3. The map page: correct region map auto-selected, pin(s) land on the right countries, cross-region selection blocked, itinerary editable.
4. `npm test` stays green; changes verified in-browser (not assumed).

## References
- **Data (done):** `assets/Template_Wander/wander-data.js`; source CSVs in `assets/Template_Wander/`.
- **Pattern to mirror:** `assets/Template_Scribble/scribble-data.js`; cover render `pages/staff/template-engine.html:1547` + PDF `scripts/export-pdf.js:735`.
- **Fonts:** `assets/fonts/CormorantGaramond-*.ttf`; `FONT_MAP` at `export-pdf.js:398`.
- **Coordinates:** `assets/Template_Wander/FP Spread 1 - Special Files/Map_Coordinates_upd.csv`.

## Context / open decisions
- **Locked:** map = LEFT (6 region variants), itinerary = RIGHT; pin centre-anchored 12×23 mm PNG; cover X/Y are box-centre (Scribble convention); cover `hMm` stored but dormant.
- **OPEN — front cover caption:** Wander cover CSV defines one front caption (right-aligned, bottom) + one spine caption. Currently stubbed `key:'name'`. Confirm whether it's name, year, or a combined line.
- **OPEN — cross-region UX:** block vs warn when a customer picks countries spanning regions (current plan: block + prompt to choose one region).
- **Known risk:** customer save can overwrite staff data on reload (precedence customer > staff); the map page's region/pin state must survive the same round-trip — watch for this when wiring save/load.
- **Deferred:** SVG unique-ID columns in CSVs — not needed (data.js is the ID layer; region code already lives in the coordinates CSV `Map` column).
