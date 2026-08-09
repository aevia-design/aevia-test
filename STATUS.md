# Session Status
_Last updated: 2026-08-09 (session 159)_
_Context at save: **Stage 7 is DONE — the first Heirloom PDF rendered.** It exposed two
engine↔PDF caption divergences, both fixed. 339 tests green, all 7 templates pass the new
parity gate. **NOTHING FROM S159 IS COMMITTED OR DEPLOYED.** The S156 business-case deletion
and a `test photos/IMG_5249.HEIC` deletion are still deliberately uncommitted._

## Status
**Session 159 (2026-08-09) — the first Heirloom PDF was generated and reviewed. Two
discrepancies found and fixed, both from the same cause: the engine and the PDF each
word-wrapped captions independently.**

**Immediate next action: commit, then deploy in order — Firebase functions → Cloud Run
renderer → Cloudflare. Then RE-SAVE AEV-088 in the engine before regenerating** (line
breaks only exist for books saved after the frontend ships). See Next steps 1.

### What S159 changed
1. **Cover captions never word-wrapped in the PDF** unless the template declared
   `autoShrink` — which only Joyride does. Heirloom's 50pt `ANNA & MICHAEL` is 471pt in a
   283pt box: the engine wrapped it, print drew one line over the artwork. Now wraps at
   `wMm` (`coverCaptionLines`); spine captions deliberately excluded. Sweep confirmed no
   other template's cover overflows → the five signed-off covers are unchanged.
2. **The engine now records where each caption actually broke; the PDF draws those lines.**
   `collectCaptionLines()` → `bookCaptionLines` → `staffBookCaptionLines` →
   `state.captionLines` → `captionLinesFor()`. Removes the second wrap implementation
   entirely rather than tuning it to match. Missing lines → old wrap, so pre-S159 orders
   render exactly as before.
3. **Stale lines are refused twice:** `approveOrder` nulls `staffBookCaptionLines` when it
   copies `customerCaptions`, and `export-pdf` only trusts stored lines that still
   reconstruct the stored text (`linesMatchText`).
4. **`qa/verify-caption-parity.mjs`** is the new gate — local mode, no order load, no GCS
   cost. Passes on all 7 templates. It caught a rotated-spine bug review had missed.

### Heirloom facts (carried from S157/S158)
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
- **The ENGINE is the source of truth for caption line breaks (S159, owner).** The customer
  approves the engine's render, so the PDF must not re-derive anything it can be told.
  Generalises: any value both surfaces compute independently is a latent divergence.
- **Never fix an engine/PDF divergence as a per-template opt-in (S159).** `autoShrink` and
  `LIGATURE_FONTS` are the two existing examples; both hid the general bug. Fix the shared
  path, let templates opt OUT.
- **`customer-preview` does NOT record line breaks yet (S159, deliberate).** Engine-parity
  rule outstanding — see Next steps 2.
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
1. **Ship S159: commit, deploy, re-verify on AEV-088.** Nothing is live. Order matters —
   **backend first** (S40 rule): (a) `firebase deploy --only functions:saveStaffState` and
   `functions:approveOrder` (deploy one at a time — the PowerShell comma gotcha); (b)
   `gcloud run deploy aevia-pdf-renderer --source . --memory 8Gi`; (c) push for Cloudflare.
   **Then RE-SAVE AEV-088 in the engine** — `staffBookCaptionLines` only exists for books
   saved after the frontend is live — and regenerate the PDF from the dashboard.
   ⛔ **Never render locally** (GCS egress on the owner's bill).
   Check: cover reads `ANNA &` / `MICHAEL` on two lines, and the "Why I love her" panel
   breaks after "every" exactly as the engine shows.
   **Failure signature:** breaks still differ → the engine save predates the frontend
   deploy, or `linesMatchText` rejected the lines as stale (text edited after saving).
2. **Customer-preview must record line breaks too (engine-parity rule).** Mirror
   `captionVisualLines`/`collectCaptionLines` into `pages/customer-preview.html`, send them
   with the customer save, copy them in `approveOrder` instead of nulling them. Until this
   lands, an approved customer edit falls back to PDF word-wrap — correct words, possibly a
   different break than the customer saw.
3. **Heirloom letter pockets — Xenia is looking into it.** The 8mm letter box is ~40% too
   tight for wide capitals (`M` at 23pt inks 7.62mm). Owner: not critical, fix later. **Do NOT
   nudge coordinates** — see the S158 log for why box width has no visual effect.
4. **Stage 8 — the Heirloom product page.** The monogram is chosen HERE (owner, S158) and
   appended as `&monogram=<key>`; the order form already preselects from it. Needs the 12
   mockup sets (4 colours × 3 monograms), which are therefore **launch-blocking**, plus a
   description per monogram from the owner.
5. **Wire the three new colourways** — `Brown`, `Green`, `Blue` are on disk (untracked) but
   NOT built. Each is a full sub-template: data file + registry ×3 surfaces + its own cover
   clip extraction (openings move per drop). Do this only after Beige is proven end to end.
6. **Re-verify the other four templates' covers at 80pp** (carried from S156) — the S156
   caption fix moved every template; Scribble and Tender were signed off carrying a 1mm error.
7. **Verify the stall detection (#94) properly** (carried from S156). The decisive test is a
   throttled upload exceeding 60s that SUCCEEDS. `qa/quick-stall-test.mjs` is broken.
8. **Chase Printsmarter on the five open questions (S155)** — the sandbox answer gates any real test.
9. **Clean up the QA scripts (#60/#95)** — 13 untracked one-offs remain in `qa/`. Also fix the
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
- **Approval overwrites staff edits blindly.** Corrected in S159 — the old wording here
  ("customer Save changes never reaches the PDF") was misleading. Customer edits DO reach
  print, but only **on approval**: `approveOrder` copies `customerCaptions` →
  `staffBookCaptions`, which the PDF reads. A save WITHOUT approval does not. The real
  defect is that the copy is wholesale — no merge, no staleness check — so staff edits made
  after the customer saved are silently discarded at approval.
- **Newborn's cover slot is 0.11mm short** on its left edge. Flagged, deliberately not fixed.
- **Is Printsmarter idempotent on `order_id_client`?** Unconfirmed.
- **Prices live in THREE places** — Stripe, `assets/js/prices.js`, `PRICE_BY_PAGE_COUNT`.
- **Is 10/14mm a formula or two data points?** `spine = 6 + 0.1 × pages` fits exactly.
- **Android is entirely untested on real hardware.**
- ~~`ARCHITECTURE.md` has two invariants numbered 6~~ — **checked S159, no longer true.**
  ARCHITECTURE is 1–10 and AGENTS 1–12, agreeing on 1–9 with AGENTS carrying three extras.
- **Staff test password is weak** for an account that can read real customer orders.
