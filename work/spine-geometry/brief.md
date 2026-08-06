# Brief: Page-count-dependent spine width

**Created:** 2026-08-05 (Session 152)
**Objective:** Make cover spine width a function of page count (40pp = 10mm, 80pp = 14mm) so that both book sizes print with correct spine width and correctly positioned front-panel artwork, without duplicating cover data per size.
**Audience:** Implementer (Claude or delegated agent), then Evgeny who verifies on the live rig and ultimately against a printed sample.
**Applicable Standards:** `CLAUDE.md` (project + global conventions), `AGENTS.md` (invariants, settled decisions), `rageatc-code-oss:verifying-work`

## Why

The spine is hardcoded to **9mm in all templates**. Printsmarter have specified **10mm at 40 pages and 14mm at 80 pages**. Every cover we produce today is therefore geometrically wrong, and wrong in a way that compounds: because the cover is one flat sheet (back | spine | front), an incorrect spine width also **shifts the front artwork out of position** by the same amount.

This is not an API concern. Manual PDF handoff has exactly the same defect, so it must be fixed whether or not we ever integrate SiteFlow. `docs/briefs/print-api-integration.md` flags it as the single most important thing to get from the print house.

**Scope is the cover only.** Inside pages are individual 200×200mm pages and the spine is not part of their geometry. The cover is the sole surface that spans back | spine | front as one flat sheet, so it is the only place a spine change moves anything.

It also fails silently. A wrong spine throws no error, renders plausibly on screen, and only becomes visible as a physically misaligned printed book — which is why verification must end at a printed sample, not a screenshot.

## Approach (decided — do not re-explore)

Chosen in this session's `/solutioning` pass. Three parts:

**1. Cover CSVs declare the spine width they were drawn at.** One new field per cover CSV. Existing artwork and coordinates were authored against a **9mm** spine, so the declared reference is `9` today. Runtime shift for front-panel items = `actualSpine − referenceSpine` (+1mm at 40pp, +5mm at 80pp). When Xenia later re-authors against the real 40pp book she changes the field to `10` and nothing else moves.

**2. Spine caption X becomes an offset from the spine centre, defaulting to 0.** Not removed — the owner needs to keep nudging spine text optically, because different fonts at different sizes do not centre identically. Under today's absolute scheme any hand-tuned value silently becomes wrong when spine width changes, and would need re-tuning per size. As an offset it is tuned once and holds for every size.

**3. The cover SVG is split by panel, not stretched.** Today one `<img>` is stretched across the full 409mm cover; widening the spine would distort the artwork by 1.22% at 80pp — moving a point at the front panel's outer edge by 5mm, while the photo slot beneath it does not move at all. Instead the SVG is rendered at natural scale with the back and front panels positioned independently. Nothing is ever scaled, so nothing distorts; the gap simply widens.

**Consequence: Xenia re-uploads nothing.** No SVG re-export, no per-size artwork.

## Geometry (verified — build to these numbers)

**All data-file coordinates are absolute, centre-based, and include the 18mm bleed**, measured from the sheet's left bleed edge. Verified: Scribble's front slot `xMm: 327` = `18 + 200 + 9 + 100`, exactly the front-panel centre. The engine subtracts `COVER_BLEED_MM` at render time (`template-engine.html:1849`).

With spine width `s`, panel centres in that same with-bleed space are:

| Panel | Centre | At s=9 (today) | At s=10 | At s=14 |
|---|---|---|---|---|
| Back | `118` | 118 | 118 | 118 |
| Spine | `218 + s/2` | 222.5 | 223 | 225 |
| Front | `318 + s` | 327 | 328 | 332 |

Back-panel items never move. Front-panel items shift by `delta = s − 9`. Spine items sit at `218 + s/2` plus their own offset.

**Total sheet:** content `400 + s`, full bleed-inclusive `436 + s` (today 409 / 445).

### How the SVG is actually composed (this drives the split)

From `scripts/export-pdf.js:997-1004`, verified:

> The cover SVG already contains the **back section background and spine background**, both extended into the bleed area. The **front section has NO background in the SVG** — the engine uses the front colour as the canvas background.

So the panels are asymmetric, and this makes the split natural rather than clever:

- **Back panel** — SVG paints its own background, extended 18mm into the bleed. Newborn's `Back BG Color` rect runs `x = -51.024` to `566.929` user units, i.e. exactly −18mm to +200.0mm. Anchored left, never moves.
- **Spine** — SVG paints a **flat colour rect**. A flat rect is the one thing that *is* lossless to stretch, and the engine already draws the same colour as `sections.spine.bgColor`. Either source is acceptable; they must be verified to match.
- **Front panel** — **transparent background, decoration only.** The engine's canvas colour already fills it. So the front copy carries no background to preserve; it only needs translating by `delta`.

The SVG is authored in named panel groups — `<g data-name="Back">`, `"Spine"`, `"Front"` — which makes the split explicit in the source rather than inferred from coordinates. Prefer positioning those groups over geometric clipping where practical.

**Bleed rule for the split:** the viewBox frames **content only** (409mm); bleed artwork lives outside it, which is why `export-pdf.js:1070` expands the viewBox by `COVER_SVG_BLEED_UNITS` (~51.024) before rendering. Any panel split must therefore carry 18mm of bleed on its **outer** edges (left/top/bottom for back; right/top/bottom for front) while cutting cleanly at the spine boundary. Getting this wrong is what broke Wander's cover previously.

### clipShape remapping (required — Newborn, Papercut, Tender)

`clipShapes.coverFrame` paths are expressed in **cover-SVG coordinate space**, i.e. against the original 409mm sheet, and converted via `clipDef.pxPerMm` (`template-engine.html:1866-1880`):

```js
const f = SCALE / clipDef.pxPerMm;
p.setAttribute('transform', `translate(${-slotL},${-slotT}) scale(${f})`);
```

When the front panel translates right by `delta`, the slot's `xMm` moves too — so `slotL` already accounts for it. But the path `d` does **not**: it still describes the opening at its original position. The clip would stay where the artwork *was*.

**Fix: add `delta * SCALE` to the x translate**, for slots on the front panel only:

```js
translate(${delta * SCALE - slotL}, ${-slotT}) scale(${f})
```

This is one term. Verify it on Tender's ellipse at both page counts — misregistration shows as a crescent at the ellipse edge.

## Requirements Extracted from Standards

**From `CLAUDE.md` (global — simplicity, surgical edits, verification):**
- [ ] Smallest change that solves the problem; no speculative abstraction for page counts we do not sell
- [ ] Change only what the task needs — no reformatting or "improving" unrelated cover code
- [ ] No new dependencies, no build step, no npm on the frontend
- [ ] Non-obvious geometry decisions explained in plain language in the final report

**From `CLAUDE.md` (project — data and parity):**
- [ ] **CSV is the source of truth, but sync is manual** — every CSV change must be mirrored into the template's `*-data.js`, or nothing changes at runtime
- [ ] **Engine parity** — the staff engine and `customer-preview.html` are parallel copies; a change to one must be mirrored in the other
- [ ] Bleed model preserved: data coords are with-bleed/centre; the SVG viewBox frames content only

**From `AGENTS.md` / `rageatc-code-oss:verifying-work`:**
- [ ] No completion claim without fresh verification output; "should work" is not acceptable
- [ ] Rendered geometry inspected from the live DOM, not inferred from the source values

## What to build

**Phase 1 — Scribble, then Tender.** Two templates, then stop for the owner to test.

Scribble proves the geometry: it is the simplest cover, with a plain rectangular photo slot and no clip shape. **Tender then proves registration**, because it has an elliptical `coverFrame` clip whose path lives in cover-SVG coordinate space and is converted via `pxPerMm`. That is the only place a millimetre of drift between artwork and photo becomes visible, and an ellipse shows it plainly. Sign-off needs both — Scribble alone would prove the arithmetic without proving the thing most likely to go wrong.

1. A single source for spine width by page count (`40 → 10`, `80 → 14`). Two entries, not a framework.
2. `referenceSpineMm: 9` declared in the Scribble cover CSV and its `scribble-data.js`.
3. Cover geometry derived at render time from the panel-centre formulas in **Geometry** (with-bleed space: back `118`, spine `218 + s/2`, front `318 + s`). Front-panel items shift by `delta = s − 9`; back-panel items do not move; spine items centre automatically plus their offset. Do not restate these numbers elsewhere — the Geometry table is the single authority.
4. Spine caption X reinterpreted as an offset from spine centre, **in the same with-bleed space as every other cover coordinate**. Scribble's current values (`222.5` with-bleed = spine centre at s=9) convert to `0`.
5. Cover SVG split by panel per Approach 3 — named groups preferred, geometric clipping as fallback.
6. Total sheet width becomes `400 + s` content / `436 + s` with bleed. **Sweep for hardcoded constants** — known: `scripts/export-pdf.js:978` (`COVER_CONTENT_W = 200 + 9 + 200`) and `:980` (`COVER_FULL_W_MM` = 445). Search for `409`, `445`, and literal `9` in cover context across all four surfaces; the two found are unlikely to be the only ones.
7. `clipShape` x-translate corrected by `delta * SCALE` for front-panel slots (see Geometry).

**Phase 2 — propagate** to Papercut, Newborn and Wander. **Unblocked: the owner signed off on Phase 1 (S154)** — Tender rendered correctly at 40pp and 80pp, and Scribble at 80pp, the hardest case (two spine captions). Phase 2 carries three pieces of work:

8. **Declare `referenceSpineMm: 9`** in the Papercut, Newborn and Wander cover CSVs and their `*-data.js`. Same value as Phase 1 — all six covers were authored against a 9mm spine.
9. **Convert spine caption X to an offset** in those three. Newborn and Wander are at `222.5` (with-bleed) = true centre → offset `0`. **Papercut's `spineName` and `spineYear` are both at `222`**, the half-millimetre leftover noted in Context; normalise to `222.5` → offset `0` rather than preserving a −0.5mm nudge nobody chose.
10. **Spine-colour audit — required, not optional.** Since the SVG split, `sections.spine.bgColor` is the *only* source of the spine colour; the SVG's own spine rect is no longer what the viewer sees across the widened gap. **Tender's was wrong** (declared cream, artwork taupe) and was caught only because it was rendered. For each of Papercut (`#8bb8d8`), Newborn (`#c0d5ee`) and Wander (`#86A37B`), compare the declared value against the actual fill of the `Spine` group's background rect in the cover SVG and correct the data to match the artwork. Also confirm per template that the spine carries nothing but captions — no rule, hairline or logo drawn there — since a flat band is what makes widening lossless.

**Watch out (Wander):** its front caption is `align: right` and its spine caption `align: left`. For left/right-aligned captions the text is pinned to a box edge, not the centre, so any change to `wMm` **moves the text**. Wander is the only template affected.

### Spine caption font size scales with page count (S154, owner)

A 14mm spine at 80pp is visibly wider than a 10mm spine at 40pp, and a font sized for the narrow spine looks undersized on the wide one. **Spine captions get +2pt at 80pp, for all six templates, derived programmatically — not a CSV column.**

- Sibling to `getSpineWidthMm`: `80 → +2`, everything else → `+0`. Two entries, not a framework, and it lives next to the width function so the two page-count facts stay together.
- **Applies to the data-file default only.** If a staff member has set an explicit size override in the engine (`window.coverCaptionStyles[key].sizePt`), that value wins outright — the bump is not stacked on top, or "I set it to 16" would silently render 18.
- Applies to spine captions only, detected the same way the position code already does it (`capDef.key` starts with `spine`). Front and back captions are unaffected: those panels do not change size.
- Must land on all three rendering surfaces (`template-engine.html`, `customer-preview.html`, `export-pdf.js`) or screen and print disagree.
- **`autoShrink` was considered and declined (S154, owner).** 120mm is a wide enough box; if a customer enters an unusually long title, staff reduce the size by hand in the engine. So `hMm` stays inert on cover captions outside Joyride, and the +2pt bump has no box-fitting logic to interact with.

**Surfaces to carry the change.** All four already read `pageCount`, so no new data has to flow:

| Surface | pageCount refs |
|---|---|
| `pages/staff/template-engine.html` | 9 |
| `pages/customer-preview.html` | 4 |
| `scripts/export-pdf.js` | 3 |
| `services/pdf-renderer/index.js` | 6 |

## Constraints

- ~~**Phase 1 is Scribble and Tender only.**~~ **Lifted (S154)** — the owner has tested and signed off. Phase 2 may now touch Papercut, Newborn and Wander. Joyride remains out of scope: its cover CSV is structurally different (see Context) and it is the only template with a sync script.
- **Do not re-derive the Phase 1 pattern.** Scribble and Tender are the reference implementation and are verified in print. Phase 2 propagates that pattern; it does not redesign it. If a template appears to need a different approach, stop and report rather than inventing one.
- **Inside pages are out of scope entirely.** Spine width does not enter their geometry. Do not modify `*_sizing_full.csv`, spread data, or any inside-page rendering.
- **Do not touch** the upload path, `order.html`, or the uncommitted stall-detection work — a parallel session owns those files.
- **Do not run a local PDF render** — that bills GCS egress to the owner. He generates via the dashboard, in-region.
- **Out of scope, and NOT a risk:** board overhang, hinge/joint gap, and turn-in width. These are **constants of the binding that are already validated** — samples were printed with Elanders using exactly this geometry (200mm cover height, 18mm bleed all round, panels butted) before the engine or PDF generator existed, produced in Illustrator, and came out correct. A cased hardcover cannot exist without a hinge and a kant, so the printer's template already absorbs them; that is what the 18mm is for. **The spine is the only cover dimension that varies with page count.** Do not reopen the others.
- **Out of scope:** the mockup composers (`scripts/compose-*.mjs`), the 3D renderer, and product-page imagery. They consume cover geometry and will need a follow-up; note them, do not change them.
- **Size:** if Phase 1 heads well beyond ~100 changed lines, stop and report rather than expanding scope.

## Success Criteria

Complete when:

1. **A 40pp Scribble cover renders with a 10mm spine** and the front artwork sits 1mm right of where it does today, verified by reading live DOM geometry.
2. **An 80pp Scribble cover renders with a 14mm spine**, front artwork 5mm right, from the same source data with no per-size file.
3. **Cover artwork is not distorted at either size** — back and front panels render at identical scale to each other and to today's 9mm output.
4. **Tender's elliptical `coverFrame` registers with its photo at both sizes.** The clip path is derived from cover-SVG space via `pxPerMm`; if artwork and slot drift apart, a crescent of misregistration appears at the ellipse edge. Verified visually at 40pp and 80pp.
5. **Spine captions sit on the true spine centre at both sizes** without per-size tuning.
6. **No regression at any other surface** — customer-preview matches the staff engine, the print PDF cover width is `400 + s`, and **inside pages are byte-identical to before**.
7. All requirements from standards are met, with verification output included in the report.

**Phase 2 adds:**

8. **Papercut, Newborn and Wander each render a 10mm spine at 40pp and a 14mm spine at 80pp**, front artwork shifted 1mm / 5mm right, verified from live DOM geometry in both engines.
9. **Papercut's and Newborn's shaped `coverFrame` openings register with their photos at both sizes** — the same crescent test that proved Tender.
10. **Each of the three templates' `sections.spine.bgColor` matches its SVG spine artwork**, stated as a before/after per template (unchanged is a valid result, but must be asserted, not assumed).
11. **Spine captions render 2pt larger at 80pp than at 40pp on all six templates**, on all three surfaces, and an explicit staff size override is *not* bumped.

## References

**Data:** `assets/Template_Scribble/Scribble_Template_Sizing_Cover.csv`, `assets/Template_Scribble/scribble-data.js`
**Code:** `pages/staff/template-engine.html` (cover build ~line 1791–1843), `pages/customer-preview.html`, `scripts/export-pdf.js`, `services/pdf-renderer/index.js`
**Briefs:** `docs/briefs/print-api-integration.md` §1 (the spine bug). _(`elanders-meeting-agenda.md` §II Q3 asked for overhang/hinge/turn-in — those are settled by printed samples, see Constraints; only the spine formula remains worth confirming.)_

## Context

**Background decisions already made:**
- **Artwork never crosses the spine** (owner, S152). This is the fact that makes the panel split valid. If it turns out false for any template in Phase 2, that template needs a different treatment.
- **Only 40 and 80 pages for MVP** (owner, S152). More page counts are explicitly a problem for another day. The design does not block them; it does not build for them either.
- **Spine caption X is kept, not removed** (owner, S152), because optical centring needs visual inspection across different fonts and sizes.

**Known risks:**
- 🟡 **The numbers are not yet confirmed as a formula.** 10mm/14mm fit `spine = 6 + 0.1 × pages` exactly, consistent with ~0.2mm per leaf on a 160gsm stock. Worth confirming with Printsmarter, but low risk: if they are two rounded data points rather than a formula, the approach is unchanged and only two constants move.
- 🔴 **Photo slots are positioned independently of the SVG.** Slots are absolutely-positioned divs sized from millimetres; the SVG is an overlay `<img>`. So stretching the SVG across a wider sheet would move the artwork **without** moving the photo beneath it — up to 5mm of drift at 80pp. This is the failure the panel split exists to prevent, and it is why "just stretch it" is not an option.
- 🔴 **Bleed lives outside the viewBox.** The cover viewBox frames content only; the back and spine background rects extend 18mm beyond it, which is why `export-pdf.js:1070` expands the viewBox before rendering. A panel split that clips at the viewBox edge will cut the bleed off and produce white edges in print. See Geometry → bleed rule.
- 🔴 **The PDF renderer must move in step with the engines.** If the engines split panels and the PDF keeps one stretched image, screen and print disagree silently — and only the print is real. `scripts/export-pdf.js` and `services/pdf-renderer/index.js` are in scope, not follow-ups.
- 🔴 **Shaped cover openings are the sharp edge.** `clipShapes.coverFrame` exists in **Newborn, Papercut and Tender** (not Scribble, which has none). The clip path lives in cover-SVG coordinate space and is converted via `pxPerMm`, so it registers with the transparent window in the artwork. Any artwork/slot drift shows as misregistration around the shaped opening.
- ⚠ **Re-authoring SVGs per size was considered and rejected** (S152). It would require two cover SVGs, two clip paths and two `pxPerMm` values per template — ten hand-synced files with no generator and no drift test — and it would **still** require the front-panel coordinate shift, because slots are data, not artwork. Keeping one SVG means `pxPerMm` and the clip path stay valid permanently. This is a two-way door: if clipping produces a visually unacceptable result in Phase 1, re-authoring remains available.
- ⚠ **The spine carries nothing but CSV captions** (owner, S152 — "we don't place our logo on the spine, never"). Consistent with the files: the `LOGO` group's path sits at x ≈ 108.8 user units ≈ 38mm, on the **back** panel. So the spine background is a flat colour strip and widening it is lossless. Still confirm per template in Phase 2 that no rule or hairline was drawn there, and that `sections.spine.bgColor` matches the SVG's spine fill exactly if the engine takes over painting it.
- ⚠ **CSV→`data.js` sync is manual** for all templates except Joyride (`scripts/sync-joyride-csv.mjs`). Editing a CSV alone changes nothing at runtime.
- ⚠ **Joyride's cover CSV is structurally different** — comma-delimited with a title row, where the others are semicolon-delimited with a header row. Handle in Phase 2, not now.
- ⚠ **Spine caption X was normalised to the true centre (204.5) in S152**, correcting a half-millimetre error in the older templates. As of this writing **Papercut's `caption1` is still 204** — the last one outstanding. All others (Scribble, Tender, Newborn, Wander, Joyride) are at 204.5. Every 204.5 converts to an offset of `0`; confirm Papercut before converting.
- **Cost:** no infrastructure change. Rendering is client-side; the only spend is a dashboard-generated PDF if the owner chooses to make one.
