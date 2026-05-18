<original_task>
Build the full Toddler template engine — a staff-facing browser tool that renders a complete photobook from order parameters, with all spreads, functional pages, photo sequencing, SVG overlays, staff reorder controls, and caption editing. Integrates with bloom.html order flow.
</original_task>

<work_completed>
## This session — planning only (no code written yet)

### Scope clarified (understanding-the-ask)
- Tool is staff-facing now; customer preview (captions + photo swap only) reuses same code later
- Integration target: bloom.html order → Firestore → template engine loads order data
- Photo count math: must tell customers exactly how many photos to prepare at order time
- Text content (Birthday message, First words) comes from order form — staff doesn't retype
- Spread reorder = drag spreads to different positions (not swapping layout types)
- FPs auto-distributed initially, staff can move them
- Local upload for testing; GCS swap is a 1-line change later (same objectURL interface)
- FP preview images on bloom.html: use existing bloom carousel photos as placeholders

### Planning documents created
- `.planning/BRIEF.md` — updated with full v2.0 architecture
- `.planning/ROADMAP.md` — v2.0 phases 05–10 added
- 10 executable plan files written across 6 phase folders:
  - `05-01` — template-data.js config + page shell
  - `06-01` — single spread renderer
  - `06-02` — book sequence builder + photo allocator
  - `06-03` — full book scroll view
  - `07-01` — photo slot drag-and-drop
  - `07-02` — spread reorder + type swap
  - `07-03` — caption layer
  - `08-01` — FP text panels (Birthday/Words) + heart clip
  - `08-02` — special photo upload zones (Toy/Steps/Art)
  - `09-01` — print export + resolution warnings + AI captions
  - `10-01` — bloom.html FP selector + photo count calculator

### Key architectural decisions documented
- New page only: `pages/template-engine.html` — spread-preview.html untouched
- Coordinate system: px = mm × 3 (600px canvas = 200mm page)
- Heart photo (FP1): SVG clip path does the masking, photo sits behind SVG layer
- Photo pools: regular pool (EXIF-sorted) + named special pools per FP type
- Caption state stored in window.captionState — survives spread re-renders
- SVG file map fully resolved for all 14 standard + 15 functional page SVGs
</work_completed>

<work_remaining>
## Template engine — execute plans in order

### Phase 05 — Data + Shell (start here)
**05-01**: Create `assets/Template_Toddler/template-data.js` + `pages/template-engine.html` shell
- See `.planning/phases/05-data-shell/05-01-PLAN.md` for full spec
- All Excel data is pre-parsed and included in the plan — no need to re-read the xlsx
- SVG file map is fully resolved in the plan

### Phase 06 — Renderer
- 06-01: Single spread renderer
- 06-02: Book sequence builder (page count + FP → ordered spread list + photo allocator)
- 06-03: Full book scroll view

### Phase 07 — Staff Interactions
- 07-01: Photo slot drag-and-drop
- 07-02: Spread reorder + type swap
- 07-03: Caption layer (positioned per Excel spec)

### Phase 08 — Functional Pages
- 08-01: Text panels (Birthday/Words) + heart clip photo
- 08-02: Special photo upload zones

### Phase 09 — Export
- 09-01: Print CSS + resolution warnings + AI caption generation

### Phase 10 — bloom.html Amendments
- 10-01: "Personalise your book" FP selector section + photo count calculator + order form integration
- FP preview images: use existing bloom.html carousel photos as placeholders
- Conditional text fields for Birthday message + First words in order form

## Pre-existing work (unchanged)
- Dashboard: `previewUrl` input field (TO-DO #2)
- Auto-email on status → review_sent (TO-DO #3)
- Puppeteer PDF pipeline (TO-DO #4)
- 6 missing product pages: vows, radiance, wander, terrain, sprout, wonder
- Caption position spec (TO-DO #38) — resolved: data is in Toddler_sizing_full.xlsx and compiled into plans
</work_remaining>

<open_questions>
1. FP1 "upper right" caption position — is it horizontal text or rotated 90°? Needs visual confirmation during 07-03.
2. FP2 right page x=100, y=100, w=200, h=200 — this overflows a 200mm page. Likely means full bleed (photo fills entire page). Confirm interpretation during 06-01.
3. Book page count minimum — is 20 the minimum or can it be lower? (Current dropdown starts at 20.)
4. How does the order form currently handle page count on bloom.html — is there an existing field or does 10-01 add one from scratch?
</open_questions>

<current_state>
## Spread preview tool (pages/spread-preview.html)
- All features complete and deployed ✓
- Caption position/size TO-DO #36 still open (user hasn't shared reference image)

## Template engine (pages/template-engine.html)
- Not started — 10 plans written and ready to execute

## bloom.html
- Not amended yet — plan 10-01 written and ready

## Firebase backend
- All functions deployed and live ✓

## Cloudflare Pages
- Auto-deploys from GitHub main
- Live URL: https://aevia-test.pages.dev

## Assets
- Toddler_sizing_full.xlsx: delivered and parsed into plans ✓
- All SVGs (SP + FP spreads): delivered and file map resolved ✓
- Old `Spread 1/` folder (L1/L2/R1/R2): redundant — replaced by SP Spread 1
</current_state>
