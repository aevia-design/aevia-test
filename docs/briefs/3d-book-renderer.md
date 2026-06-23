# Brief: 3D book renderer (Three.js)

**Created:** 2026-06-17 (session 52)
**Objective:** Produce a durable, reusable browser renderer that turns our own engine cover/spread renders into a premium 3D book, and use it to export static product imagery that dresses the website placeholders across Scribble/Wander/Newborn.
**Audience:** Aevia developers (this build) + the future customer-preview integration (the renderer's second consumer).
**Applicable Standards:** `test-driven-development`, `verifying-work`, `reviewing-code`; visual bar = `context/design-principles.md` + `context/style-guide.md`.

## Why

Pre-launch the website shows grey placeholder boxes — it doesn't read as a real
product, which undercuts a premium brand. We will dress it with 3D book imagery
generated from our **own** renders (not a photoshoot). Per ADR 0005 this is **not
throwaway**: the renderer is a durable capability that will later power a "see your
book in 3D" moment inside the live customer-preview. So the deliverable is *the
renderer*, built to be reusable; the website images are its first output (and are
themselves temporary — replaced by real book photos once printing starts).

## Scope decision (ADR 0005): edit-flat / present-in-3D

Editing stays flat and instant (today's behaviour, untouched). 3D is a
**presentation** surface, never an editing surface. This build delivers the renderer
+ static website images. Live preview integration and page-flip animation are the
*next* effort — the renderer must be architected so they can be added without a
rewrite, but they are **out of scope now**.

## Requirements Extracted from Standards

**From test-driven-development (red→green→refactor; failing test before prod code):**
- [ ] A pure **book-spec builder** (template data → renderer config: box dimensions, which texture region maps to front/back/spine/pages) is written test-first.
- [ ] **Dimension math** is unit-tested: square (Newborn 200×200mm) and non-square books produce correct proportional box geometry + aspect ratios.
- [ ] **Texture-region math** is unit-tested: a full cover-wrap image is sliced into correct front / spine / back UV offset+repeat regions (the spike hardcoded 0.60/0.40 — replace with derived values from book dimensions).
- [ ] **Export orchestration** logic (which views to render per template, output filenames/paths) is unit-tested independent of the actual WebGL render.
- [ ] No production logic module ships without a failing test written first; visual/WebGL code is exempt (see Constraints).

**From verifying-work (evidence, not "should work"):**
- [ ] Every completion claim carries fresh evidence: `npm test` output for logic; a saved screenshot per rendered view for visuals.
- [ ] Renders are screenshot-verified across all three templates (Scribble/Wander/Newborn), not just the one used in the spike.

**From reviewing-code / project conventions:**
- [ ] Renderer is a self-contained module with a clear input contract (book-spec + texture sources) and no coupling to the editing UI.
- [ ] Three.js loaded via CDN `<script>` / importmap, no build step (consistent with the spike; ADR 0005 sanctions the dependency).
- [ ] A flat-image fallback path exists if WebGL is unavailable.

## Constraints

- Format: plain HTML/CSS/JS module + a Node-driven export script (Playwright screenshot of the render, mirroring the `qa/` pattern) that writes PNGs into `assets/images/mockups/`.
- Templates: Scribble, Wander, Newborn (must be data-driven per template, not hardcoded to one).
- Book sizes: handle square and non-square dimensions from template data.
- Views this build must produce: **cover hero** (angled premium front), **back cover**, and at least one **inside spread**; special-page views if cheap once spreads work.
- TDD exemption: WebGL/Three.js scene code (lighting, materials, camera, posing) is verified by **screenshot inspection**, not unit tests — only the surrounding pure logic is TDD'd. State this split explicitly in the work.
- Out of scope: live customer-preview integration; page-flip animation; sample photo *content* / AI image generation; swapping in real printed-book photos; OG/social imagery.

## Success Criteria

The deliverable is complete when:
1. The renderer produces a **premium-looking** 3D book (cover hero + back + a spread) from real engine renders for **all three templates**, screenshot-verified, and Evgeny agrees the look clears the premium bar.
2. The renderer is a reusable module with a documented input contract, architected so the future customer-preview "see your book" moment can consume it without a rewrite (verified by review against ADR 0005, not by building the integration).
3. Static PNGs are exported and wired into the website placeholders for the three templates.
4. All TDD'd logic has passing tests run fresh; all requirements from standards are met.

## References

**Decision:** `docs/decisions/0005-3d-book-renderer.md`
**Ideas origin:** `ideas.md` (2026-06-16 "Engine-driven mockup imagery")
**Spike (throwaway reference, NOT the build):** `prototypes/book-3d-spike.html` + screenshot `sessions/qa-runs/book-3d-spike.png`
**Render pipelines to draw textures from:** staff engine (Playwright screenshot, pixel-faithful) + `scripts/export-pdf.js` (composites each page to a sharp PNG).
**Conventions:** `project_qa_scripts` (qa/ Playwright pattern), `project_template_seam` (per-template registry), `context/design-principles.md`, `context/style-guide.md`.

## Context

**Spike findings:** in-browser Three.js textures a real cover render with lighting +
soft shadow from a CDN script; pipeline confirmed. The spike's cover-region slicing
and pose were rough (cover landed on the wrong faces, hero angle was edge-on) — the
real build derives texture regions from dimensions and gets posing right.
**Texture source:** the engine renders a **full cover wrap** (back | spine | front)
as one image — the renderer slices it, so the input contract should expect a wrap
plus per-spread images.
**Known risks:** (1) premium realism is the hard part and is subjective — calibrate
the look with Evgeny early via screenshots before polishing; (2) high-res textures,
not 3D math, are the performance cost — keep export-resolution and (future) live
resolution separable; (3) non-square dimension handling must be data-driven from the
start or it bakes in the square assumption.
