# Session Status
_Last updated: 2026-08-07 (session 158)_
_Context at save: **Heirloom Phase A + B are built and PUSHED** (`6120b74`, `a310d54`,
`eae4e2d`, `2846e44`). 320 tests green. Stage 7 (PDF) code is written but **UNVERIFIED** —
it needs an owner Cloud Run redeploy + a dashboard render. The S156 business-case deletion
and a `test photos/IMG_5249.HEIC` deletion are still deliberately uncommitted._

## Status
**Session 158 (2026-08-07) — Heirloom Phase B. Stage 5 (order form) and Stage 6
(customer-preview parity) are DONE and verified. Stage 7 (PDF) is CODE-COMPLETE but has
never been run: the owner was about to generate the first PDF when the session ended.**

**Immediate next action: generate the first Heirloom PDF** (see Next steps 1).

1. **Heirloom = 4 colourways × 3 monograms.** Colour is modelled as **one registry entry +
   data file per colourway** (`heirloom-beige`); the order form, engines and PDF stay
   colour-blind downstream of the product page. Only Beige exists; three colourways pending
   from Xenia.
2. **Monograms (Roots/Birds/Roses) select ARTWORK, not just text** — a first for the engine.
   Each monogram carries its own cover SVG, intro SVG, photo-clip variant and four
   letter-caption positions (partners' initials: 2 on the intro, 2 on the back cover).
   All of it is data (`monograms` block); the staff engine reads it via `getActiveMonogramDef()`.
3. **Phase A verified:** 41 page canvases, 0 pageerrors, 0 SVG 404s, 312 tests green. Owner
   eyeballed the cover, intro and monogram switching. `qa/debug-heirloom-render.mjs` is the gate.
4. **The intro is MANDATORY** (always Spread 0, never an add-on) — `mandatory: true` spreads
   now always enter `buildBookSequence`; its checkbox renders checked-and-locked.
5. **Two cover bugs found and fixed:** Xenia's cover SVGs shipped with the photo window
   painted solid `#312128` instead of transparent (patched in-repo, **re-apply on any
   re-export**), and the cover slot sat 15mm high because the CSV photo row uses a different
   bleed convention (+3) than its own caption rows (+18).
6. **IM FELL English forms ligatures** despite being a serif (fontkit: 52 chars → 45 glyphs)
   → added to `LIGATURE_FONTS`. Endalian Script is outlined into the artwork and is never registered.
7. **Xenia authored Heirloom's cover at a 10mm spine** (410mm sheet), not the 9mm every other
   template uses → `referenceSpineMm: 10`. Owner confirmed.

## Recent decisions
- **Monogram is chosen on the PRODUCT page, not the order form (S158, owner).** Arrives as
  `&monogram=<key>`; travels in `fpTexts` (no backend change). The order form shows no picker.
- **Our story = Tender's model (S158, owner):** customer's own words on the page, staff polish
  by hand. Xenia's `Our Story Page_Text.txt` is a voice REFERENCE, not a template.
  "Why I love him/her" is free-form customer text. Only the **intro** is fill-in-the-blanks.
- **All Heirloom inner-page captions are `#312128` (S158, owner set it in the CSV).** The
  earlier taupe `#7c746e` was an assumption and is gone. Back-cover letters were always plum.
- **Do NOT nudge letter coordinates to fix the lopsided monogram (S158).** Position is correct;
  the letter box is too tight for wide capitals. Xenia to widen the artwork.
- **Colour = registry key, not a runtime variant (S157, owner).** Four designed sub-templates,
  nothing recoloured on the fly.
- **Monograms are data, not code (S157).** One `monograms` block drives three surfaces.
- **Cover SVGs patched in-repo, Xenia not asked to re-export (S157)** — same call as Wander's
  viewBox (S154). The patch must be re-applied if the covers are re-exported.
- **Repair the existing harness, do not add a new smoke test (S156).**
- **ESLint declined (S156).** Reconsider only for a use-before-definition bug the hook misses.
- **Business case untracked (S156, owner).** **No longer backed up by git**; last tracked `0edb8ee`.
- **Printsmarter token NOT rotated (S155, owner).** **Never put it in any summary, log or memory.**
- **Button-first, never auto-submit on approval (S155).**
- **#88 closed without root cause (S150, owner).** Read `docs/briefs/upload-failures.md` first.
- **No price rise at launch (S148, owner).** Price is an OUTPUT of the business case.
- **Working assumption: 20% VAT on photo books (S145, owner).** Steuerberater to confirm.
- **The live site stays `noindex` until launch (S144)** — TO-DOS #81.

## Next steps (priority order)
1. **Generate the first Heirloom PDF — Stage 7's gate.** A real Beige order already exists
   (owner placed it S158). Sequence: open it in the engine → **Save book state** →
   `gcloud run deploy aevia-pdf-renderer --source . --memory 8Gi` → **Generate PDF** from the
   dashboard. ⛔ **Never render locally** — that pulls full-res originals from GCS and bills
   egress. Check: cover shows the ORDERED monogram (not Roots), the four initials sit in the
   artwork's pockets, the spine label centres on the band, the intro passage doesn't clip.
   **Two failure signatures:** `Unknown template "heirloom-beige"` = the redeploy didn't take;
   a **Roots** cover on a Roses order = renderer running old code (`services/pdf-renderer/
   index.js` carries the monogram and ships in the container, not via Cloudflare).
2. **Heirloom letter pockets — Xenia is looking into it.** The 8mm letter box is ~40% too
   tight for wide capitals (`M` at 23pt inks 7.62mm). Owner: not critical, fix later. **Do NOT
   nudge coordinates** — see the S158 log for why box width has no visual effect.
3. **Stage 8 — the Heirloom product page.** The monogram is chosen HERE (owner, S158) and
   appended as `&monogram=<key>`; the order form already preselects from it. Needs the 12
   mockup sets (4 colours × 3 monograms), which are therefore **launch-blocking**, plus a
   description per monogram from the owner.
4. **Wire the three new colourways** — `Brown`, `Green`, `Blue` are on disk (untracked) but
   NOT built. Each is a full sub-template: data file + registry ×3 surfaces + its own cover
   clip extraction (openings move per drop). Do this only after Beige is proven end to end.
5. **Re-verify the other four templates' covers at 80pp** (carried from S156) — the S156
   caption fix moved every template; Scribble and Tender were signed off carrying a 1mm error.
6. **Verify the stall detection (#94) properly** (carried from S156). The decisive test is a
   throttled upload exceeding 60s that SUCCEEDS. `qa/quick-stall-test.mjs` is broken.
7. **Chase Printsmarter on the five open questions (S155)** — the sandbox answer gates any real test.
8. **Clean up the QA scripts (#60/#95)** — 13 untracked one-offs remain in `qa/`. Also fix the
   success/error race in `qa/order-hardening-mock.mjs`: if NEITHER screen appears it hangs
   forever with no output (cost three runs in S158 to spot). `qa/heirloom-order-mock.mjs` has
   the fixed shape — a wall-clock deadline that screenshots and names the visible panels.

## Open questions
- **Heirloom product page needs assets that do not exist yet:** 12 mockup sets (4 colours ×
  3 monograms) for swap-on-select thumbnails, and a description per monogram (owner to supply).
  Phase C can ship Beige-only as an interim.
- **Intro letter colour assumed `#7c746e`** — the CSV leaves it blank (back-cover letters are
  explicitly `#312128`). Looks right on screen; confirm with Xenia if print disagrees.
- **The letter boxes (8×9mm) have no empty-state hint** in the engine — staff may not find
  them. Offered a hover outline; not built.
- **`assets/Aevia - Business case v10.xlsx` is tracked but missing from disk** (deletion left
  uncommitted deliberately; CLAUDE.md calls v10 corrupted). Stale Excel lock file in `assets/`.
- **The Printsmarter button is visible on the staff dashboard** but cannot fire.
- **The pre-push hook needs `git config core.hooksPath .githooks` per clone.**
- **Pre-13-July Papercut orders have `name`/`year` swapped in Firestore.**
- **Customer "Save changes" never reaches the PDF, and approval overwrites blindly.**
  `approveOrder` copies `customer*` → `staff*` with no merge and no staleness check.
- **Newborn's cover slot is 0.11mm short** on its left edge. Flagged, deliberately not fixed.
- **Is Printsmarter idempotent on `order_id_client`?** Unconfirmed.
- **Prices live in THREE places** — Stripe, `assets/js/prices.js`, `PRICE_BY_PAGE_COUNT`.
- **Is 10/14mm a formula or two data points?** `spine = 6 + 0.1 × pages` fits exactly.
- **Android is entirely untested on real hardware.**
- **`ARCHITECTURE.md` has two invariants numbered 6**; `AGENTS.md` renumbers and they disagree.
- **Staff test password is weak** for an account that can read real customer orders.
