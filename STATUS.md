# Session Status
_Last updated: 2026-08-10 (session 160)_
_Context at save: **S159 is shipped and S160's colourways are pushed (`e1efd85`).** All four
Heirloom colourways render in both engines. 351 tests green. The S156 business-case deletion
and a `test photos/IMG_5249.HEIC` deletion are still deliberately uncommitted._

## Status
**Session 160 (2026-08-10) — S159 deployed, and Heirloom's three remaining colourways
(Brown, Green, Blue) built end to end through the engines, order form and PDF registry.
Stage 8 (the product page) is the last piece of Heirloom and is blocked on assets.**

**Immediate next action: verify AEV-088** — re-save it in the staff engine (hard-refresh
first), then regenerate the PDF from the dashboard. This is the only unverified part of
S159. See Next steps 1.

### What S160 changed
1. **S159 shipped.** `saveStaffState` + `approveOrder` deployed to europe-west1, Cloud Run
   already redeployed by the owner, frontend pushed. ⚠ The Firebase CLI's discovery step is
   flaky here — set `$env:FUNCTIONS_DISCOVERY_TIMEOUT = "120"` before deploying or it fails
   with `Cannot determine backend specification. Timeout after 10000` (not a code fault).
2. **Brown, Green and Blue built** — data file + registry on all FOUR surfaces (staff engine,
   customer-preview, order form, `export-pdf.js`) + staff dropdown. Verified structurally:
   stripping colours, paths and clips leaves them byte-identical to Beige. **The only
   differing number is the cover slot centre, 327.62 → 328mm.**
3. **Nine cover SVGs cleaned** — every new cover shipped with the photo window painted solid
   (repeat of the S157 bug), and Green/Roses had a 3.1MB placeholder PHOTO embedded inside
   the window clip. All patched; 144 Heirloom SVGs now scan clean.
4. **`cover-svg-viewbox.test.js` extended** — it had never covered Heirloom at all (looked
   only one directory deep). Coverage 6 → 18 covers; reads `referenceSpineMm` per template.
5. **Two caption-editing fixes in BOTH engines** — the focus wash now flips by ink luminance
   (light ink was invisible while being typed on Brown/Green covers), and the four monogram
   initials show no placeholder in their 8×9mm boxes, revealing a dashed outline on hover.

### Heirloom facts (carried, still current)
1. **4 colourways × 3 monograms.** All four colourways now EXIST and render
   (`heirloom-beige|brown|green|blue`). Colour is a registry key, never a runtime variant.
2. **Colours split by SURFACE.** Brown and Green flip the cover to light-on-dark while
   keeping Beige's inner pages; monogram letters follow their surface (Green's are `#404737`
   on the intro, `#dad0c5` on the back cover). Blue is the only one with a different page
   ground (`#cfc4b8`).
3. **Green and Blue name their intros `V1/V2/V3`** (V1=Roots, V2=Birds, V3=Roses) and renamed
   two folders. Brown kept Beige's names.
4. **Monograms select ARTWORK, not just text** — cover SVG, intro SVG, clip variant and four
   letter positions, all data (`monograms` block), read via `getActiveMonogramDef()`.
5. **The intro is MANDATORY** (always Spread 0); `mandatory: true` spreads always enter
   `buildBookSequence`, and the order form shows the checkbox checked-and-locked.
6. **`referenceSpineMm: 10`** — Heirloom's covers are authored at a 10mm spine (410mm),
   unlike every other template's 9mm.
7. **IM FELL English forms ligatures** despite being a serif → in `LIGATURE_FONTS`. Endalian
   Script is outlined into the artwork and never registered.

## Recent decisions
- **Xenia is NOT asked to re-export the new covers (S160, owner).** Filled windows and the
  stray embedded photo were patched in-repo, the S157/S154 precedent. **Re-apply on any
  re-export.** This is now the second drop to ship filled photo windows.
- **The focus wash flips, not the ink (S160).** Driven by luminance so any future colourway
  works with no per-template rule — the same "fix the shared path" principle as S159.
- **Screenshots were the acceptance evidence for the caption fixes (S160, owner).** A
  contrast-metric gate was started and deleted as gold-plating; the owner tests visually.
- **The ENGINE is the source of truth for caption line breaks (S159, owner).**
- **Never fix an engine/PDF divergence as a per-template opt-in (S159).**
- **`customer-preview` does NOT record line breaks yet (S159, deliberate)** — Next steps 3.
- **Monogram is chosen on the PRODUCT page, not the order form (S158, owner).** Arrives as
  `&monogram=<key>`; travels in `fpTexts` (no backend change).
- **Our story = Tender's model (S158, owner):** customer's own words, staff polish by hand.
- **Do NOT nudge letter coordinates to fix the lopsided monogram (S158).** Xenia to widen art.
- **Repair the existing harness, do not add a new smoke test (S156).**
- **ESLint declined (S156).**
- **Business case untracked (S156, owner).** **No longer backed up by git**; last tracked `0edb8ee`.
- **Printsmarter token NOT rotated (S155, owner).** **Never put it in any summary, log or memory.**
- **Button-first, never auto-submit on approval (S155).**
- **#88 closed without root cause (S150, owner).** Read `docs/briefs/upload-failures.md` first.
- **No price rise at launch (S148, owner).** Price is an OUTPUT of the business case.
- **Working assumption: 20% VAT on photo books (S145, owner).** Steuerberater to confirm.
- **The live site stays `noindex` until launch (S144)** — TO-DOS #81.

## Next steps (priority order)
1. **Verify AEV-088 (carried from S159, still unverified).** Re-save it in the staff engine
   after a hard refresh, then regenerate the PDF **from the dashboard**. Check: the cover
   reads `ANNA &` / `MICHAEL` on two lines, and the "Why I love her" panel breaks after
   "every" exactly as the engine shows. ⛔ **Never render locally** (GCS egress on the
   owner's bill). **Failure signature:** breaks still differ → the engine save predates the
   frontend deploy, or `linesMatchText` rejected the lines as stale.
2. **Stage 8 — the Heirloom product page.** The last piece of Heirloom. The monogram AND the
   colour are chosen here; the page appends `&monogram=<key>` and links to the colourway's
   registry key. **Blocked on assets that do not exist:** 12 mockup sets (4 colours × 3
   monograms) for swap-on-select thumbnails, and a description per monogram from the owner.
   Both are therefore **launch-blocking for Heirloom**. Can ship Beige-only as an interim
   with the selectors wired.
3. **Customer-preview must record caption line breaks too (engine-parity rule).** Mirror
   `captionVisualLines`/`collectCaptionLines` into `pages/customer-preview.html`, send them
   with the customer save, copy them in `approveOrder` instead of nulling them. Until this
   lands, an approved customer edit falls back to PDF word-wrap — correct words, possibly a
   different break than the customer saw.
4. **One PDF per new colourway** once Beige is proven (step 1). Nothing colour-specific is
   expected to break — the PDF is colour-blind and reads the same registry — but no Brown,
   Green or Blue book has ever been rendered.
5. **Heirloom letter pockets — Xenia is looking into it.** The 8mm letter box is ~40% too
   tight for wide capitals. Owner: not critical. **Do NOT nudge coordinates.**
6. **Re-verify the other four templates' covers at 80pp** (carried from S156) — the S156
   caption fix moved every template; Scribble and Tender were signed off carrying a 1mm error.
7. **Verify the stall detection (#94) properly** (carried from S156). The decisive test is a
   throttled upload exceeding 60s that SUCCEEDS. `qa/quick-stall-test.mjs` is broken.
8. **Chase Printsmarter on the five open questions (S155)** — the sandbox answer gates any real test.
9. **Clean up the QA scripts (#60/#95)** — 13 untracked one-offs remain in `qa/`. Also fix the
   success/error race in `qa/order-hardening-mock.mjs`: if NEITHER screen appears it hangs
   forever with no output. `qa/heirloom-order-mock.mjs` has the fixed shape.

## Open questions
- **Heirloom product page needs assets that do not exist yet:** 12 mockup sets (4 colours ×
  3 monograms) and a description per monogram (owner to supply). Phase C can ship Beige-only.
- **Does the monogram hover-outline belong in the CUSTOMER preview?** It ships there now via
  a shared class. Restrict it to the staff engine if it reads as fussy (S160).
- **Intro letter colour assumed `#7c746e`** — resolved for Beige (`#312128`); the new
  colourways take their inner ink. Confirm with Xenia if print disagrees.
- **`assets/Aevia - Business case v10.xlsx` is tracked but missing from disk** (deletion left
  uncommitted deliberately; CLAUDE.md calls v10 corrupted). Stale Excel lock file in `assets/`.
- **The Printsmarter button is visible on the staff dashboard** but cannot fire.
- **The pre-push hook needs `git config core.hooksPath .githooks` per clone.** (It IS
  configured on this machine — it ran on the S160 push.)
- **Pre-13-July Papercut orders have `name`/`year` swapped in Firestore.**
- **Approval overwrites staff edits blindly.** Customer edits reach print only **on
  approval**, and the copy is wholesale — no merge, no staleness check — so staff edits made
  after the customer saved are silently discarded.
- **Newborn's cover slot is 0.11mm short** on its left edge. Flagged, deliberately not fixed.
- **Is Printsmarter idempotent on `order_id_client`?** Unconfirmed.
- **Prices live in THREE places** — Stripe, `assets/js/prices.js`, `PRICE_BY_PAGE_COUNT`.
- **Is 10/14mm a formula or two data points?** `spine = 6 + 0.1 × pages` fits exactly.
- **Android is entirely untested on real hardware.**
- **Staff test password is weak** for an account that can read real customer orders.
