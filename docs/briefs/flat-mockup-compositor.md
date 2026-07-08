# Brief: Cross-Template Flat Front/Back Mockup Compositor

**Created:** 2026-06-30 (Session 95)
**Objective:** Produce a repeatable compositor that renders any template's flat front/back book mockups by reusing the newborn PSD scene exactly and changing only the cover-face content and the spine colors — so adding a template is a parameter change, not a per-template debugging session.
**Audience:** Future Claude Code sessions (and the owner, who inspects the output) — the recipe must survive into memory so the next template takes minutes.
**Applicable Standards:** systematic-debugging (root-cause before fixes), project memory conventions.

## Why

S94 produced owner-approved newborn flat front/back mockups (`assets/images/mockups/newborn/{front,back}-new.webp`) from Xenia's layered PSDs, then **deleted the throwaway scripts** — so the method was lost. S95 then brute-forced scribble: multiple wrong fixes, misleading zoom crops called "success," and a detached/floating spine. The owner's point is correct and central: the PSD already defines all geometry, shadows, and layering; every other template is the **same scene** with only the cover artwork and the spine color swapped. We need that as a documented, parameterized recipe, plus the lessons captured in memory so we stop repeating the first-mockup-round (closed/hero) pain — a full day of exceptions that was never written down.

## Background facts established this session (ground truth)

**PSD structure** (`assets/mockup example/new/{front,back}.psd`, scene 3000×2000):
- `Main Image` — white placeholder for the **cover face**, normal blend, scene `[935,436 → 2063,1563]` (1128×1127). Swap target for the template's front/back artwork.
- `111` (front) / empty-named layer (back) — the **complete baked newborn book** (back+spine+front), fully opaque, sits above Main Image. **The spine color `#c0d5ee` (192,213,238) is baked here**, with a darker seam crease `(33,56,110)`. Front body at `[-336,351]` 2502×1327; back body at `[812,367]` 2559×1266.
- `Layer 1` (multiply) + `Highlight` (screen, opacity 0.145) — the 3D lighting over the cover face.
- `Shadow` (linear burn) — drop shadow. `Cover` layer = opacity 0, ignore.
- Spine side: front → LEFT of cover face; back → RIGHT.

**Cover-face source:** `sessions/qa-runs/cover-wrap-AEV-0xx.png` = `[back|spine|front]` trim wrap, 3681×1803. Front face = right 200/409; back face = left 200/409; resize to 1128×1127.

**Spine colors (`mockupEdges.spine`):** newborn `#c0d5ee`, wander `#86A37B`, scribble `#fdd16f`, papercut `#8bb8d8`, tender `#fbf8f6`.

**Orders:** 039 newborn, 040 wander, 041 scribble, 043 papercut, 044 tender.

## The spine is TWO components (owner's key correction)

1. **Spine face color** — the lit face of the spine binding. Newborn = light blue `#c0d5ee`. Per template = hue-swap to `mockupEdges.spine`, preserving the baked shading (gradient, curve, highlight).
2. **Hinge shadow / indentation crease** — the recessed groove between cover and spine. In newborn it reads bluish **because the book is dark**; for a light cover (scribble cream) it will NOT be blue and may be much subtler. Its color/darkness is a function of geometry we don't fully have and **must be approximated per template**, not copied as literal blue.

## The core failure to fix

The S95 compositor recolored the spine using the **flat `111` layer's coordinates**, which do not align with where the spine actually renders in the 3D-lit composite → detached, floating strip. The fix must operate in the **same coordinate space as the approved newborn render** (the geometric ground truth), so the recolor lands exactly on the existing spine and cannot detach.

## Requirements

**From systematic-debugging:**
- [ ] Use the approved newborn render (`assets/images/mockups/newborn/{front,back}-new.webp`) as the geometric base / ground truth; verify alignment against it before claiming success.
- [ ] No "success" claim from a zoom crop alone — verify the full-size image AND a pixel probe of the spine zone.
- [ ] One change at a time; if a result is wrong, re-investigate rather than stacking fixes.

**Functional:**
- [ ] Swap the cover face inside the existing face region, carrying newborn's baked lighting (Layer 1 × Highlight) onto the new artwork so shading matches.
- [ ] Recolor the spine **face** to the template spine color, preserving shading via luminance scaling, aligned to the composite (not flat-layer) coordinates — spine stays attached to the cover edge, full height, with the rounded top/bottom.
- [ ] Parameterize the **hinge-shadow crease** separately from the spine face; approximate it so it reads correctly on both dark (newborn) and light (scribble/tender) covers. Document the parameter and its reasoning.
- [ ] Everything else (drop shadow, 3D form, edges, page block, backdrop) stays byte-identical to the newborn scene.
- [ ] Newborn output is unchanged (don't regenerate the approved files).
- [ ] One reusable script: `node scripts/<name>.mjs <order> <template>` → writes `mockups/AEV-0xx/{front,back}-new.png` + `assets/images/mockups/<template>/{front,back}-new.webp`.
- [ ] **Order-independent**: the script must work for ANY order of a given template, not just the reference order — e.g. re-running newborn with a different order (different cover photos) must produce a correct mockup. The cover face comes from that order's cover-wrap; the scene/spine recipe is template-level.

**From project memory conventions:**
- [ ] Update `project_svg_flat_mockups` memory with the final working recipe (replace the superseded RC1–RC4 / synthetic-strip notes).
- [ ] Capture the closed/hero first-round lessons (the day of exceptions) in memory so they inform future mockup work.

## Constraints

- No browser, no GCS egress — pure `ag-psd` + `sharp` (libs live in `scripts/node_modules`); run from `scripts/`.
- Do not touch the newborn approved files or any live product page in this brief's scope (wiring into product pages is a separate later step).
- Per-template PSDs do NOT exist and won't — the newborn PSD shell is recolored for all.

## Success Criteria

The deliverable is complete when:
1. Scribble front + back render with the spine **attached, full-height, correctly yellow**, and the hinge crease reads naturally on the cream cover — owner-confirmed against the newborn reference.
2. The same script reproduces correct output for wander, papercut, tender (spot-checked) with only the order+template args changed — no per-template code edits.
3. The recipe + closed/hero lessons are written to memory.
4. All requirements above are met.

## References

**Approved reference:** `assets/images/mockups/newborn/{front,back}-new.webp`
**PSDs:** `assets/mockup example/new/{front,back}.psd`
**Cover wraps:** `sessions/qa-runs/cover-wrap-AEV-0{39,40,41,43,44}.png`
**Current (broken) script:** `scripts/compose-flat-mockup.mjs`
**Memory:** `project_svg_flat_mockups`, `project_mockup_pipeline`, `project_3d_renderer`

## Known risks

- **Hinge-crease approximation is the genuine unknown** — needs a reasoned parameter (e.g., darken the cover-edge by a factor rather than tint it blue), validated on both a dark and a light cover before rollout.
- **Lighting transfer** — pasting a flat face loses the baked gloss; deriving light from `newborn_face_lit ÷ newborn_face_flat` and multiplying onto the new face is the likely approach, but must be verified so light covers don't blow out.
- **Back geometry differs** (body layer offset/size) — verify back alignment independently, don't assume mirror symmetry.
