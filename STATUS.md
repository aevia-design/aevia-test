# Session Status
_Last updated: 2026-08-10 (session 161)_
_Context at save: **S161's three commits are pushed (`0a1307b`, `c1d0278`, `3a9a1f5`).** All
four colourways match their CSVs; the engine no longer blanks order text; the Heirloom product
page is built with placeholder gallery images. 351 tests green. The S156 business-case deletion
and a `test photos/IMG_5249.HEIC` deletion are still deliberately uncommitted._

## Status
**Session 161 (2026-08-10) — the mockup pipeline is unblocked, the product page is built, the
letter geometry is synced across all four colourways, and a real engine bug that blanked every
Heirloom order's text is fixed. The owner is placing the four capture orders now.**

**Immediate next action: the owner runs the mockup capture runbook** (4 orders × 3 monograms
= 12 image sets). The exact commands live in `docs/briefs/heirloom-build.md`, Stage 8. Then
fill `HEIRLOOM_ORDERS` in `scripts/exp2-images.mjs` and flip `ASSETS_READY` to `true` in
`pages/heirloom.html`.

### What S161 changed
1. **AEV-088 verified (owner)** — PDF caption breaks match the engine exactly. S159 closed.
2. **Engine bug fixed: order text was being wiped.** `loadOrderIntoEngine` seeds FP text
   panels (step 7) and cover captions (step 8); step 9 then called `renderBook()` to paint the
   monogram initials, and **renderBook resets `bookCaptions` on a full rebuild** — discarding
   all of it, including the initials it had just written. A fresh Heirloom order therefore
   opened with a blank intro page, blank story panels and no album name while the order info
   panel showed the text correctly. `renderBook` now takes `{ preserveCaptions: true }`.
   Heirloom-only, because step 9 fires only when `applyMonogramInitials` returns true.
3. **Letter geometry synced across all four colourways** from the owner's re-nudged CSVs.
   New `scripts/check-heirloom-letters.mjs` compares all 24 coordinates per colourway and
   enforces the bleed rule; `--write` syncs the data files, touching only xMm/yMm.
4. **Mockup capture wired for Heirloom's 12 sets.** `qa/select-monogram.mjs` drives the
   engine's monogram picker so ONE order yields all three monograms; the capture/compose chain
   carries a monogram suffix end to end and feeds `exp2-images.mjs`.
5. **`pages/heirloom.html` built** — colourway swatches + monogram cards in the panel, Xenia's
   descriptions, `&monogram=` on the order link. Monogram cards crop the real cover SVG, so
   they are correct today without any mockups.

### Heirloom facts (carried, still current)
1. **4 colourways × 3 monograms.** Colour is a registry key, never a runtime variant.
2. **Colours split by SURFACE.** Brown and Green flip the cover to light-on-dark while keeping
   Beige's inner pages; monogram letters follow their surface. Blue is the only one with a
   different page ground (`#cfc4b8`).
3. **Green and Blue name their intros `V1/V2/V3`** (V1=Roots, V2=Birds, V3=Roses).
4. **Monograms select ARTWORK, not just text** — read via `getActiveMonogramDef()`.
5. **The intro is MANDATORY** (always Spread 0); the order form shows it checked-and-locked.
6. **`referenceSpineMm: 10`** — Heirloom's covers are authored at a 10mm spine (410mm).
7. **IM FELL English forms ligatures** despite being a serif → in `LIGATURE_FONTS`.
8. **All four colourways now share identical letter geometry.** Only the cover slot centre
   differs (Beige 327.62, the rest 328mm).

## Recent decisions
- **Both product-page selectors live in the PANEL (S161, owner).** Order: name → description →
  pages/price → colourway → monogram → story pages. Putting the colourway under the hero,
  beside the image it changes, was rejected — the owner could not find it.
- **Monogram cards crop the real cover SVG, not a mockup (S161).** Correct before any mockup
  exists, sharp at any size, and follows the colourway.
- **Xenia's monogram descriptions ship verbatim (S161, owner)** — no `/stop-slop` pass.
- **ONE order per colourway, three monograms from each (S161).** Switching template resets
  photos; switching monogram does not.
- **Xenia is NOT asked to re-export the new covers (S160, owner).** Re-apply patches on any
  re-export.
- **The focus wash flips, not the ink (S160).**
- **The ENGINE is the source of truth for caption line breaks (S159, owner).**
- **Never fix an engine/PDF divergence as a per-template opt-in (S159).**
- **`customer-preview` does NOT record line breaks yet (S159, deliberate)** — Next steps 4.
- **Monogram is chosen on the PRODUCT page, not the order form (S158, owner).**
- **Our story = Tender's model (S158, owner):** customer's own words, staff polish by hand.
- **Do NOT nudge letter coordinates by hand (S158).** Change the CSV, then sync.
- **Business case untracked (S156, owner).** **No longer backed up by git**; last tracked `0edb8ee`.
- **Printsmarter token NOT rotated (S155, owner).** **Never put it in any summary, log or memory.**
- **#88 closed without root cause (S150, owner).** Read `docs/briefs/upload-failures.md` first.
- **No price rise at launch (S148, owner).** Price is an OUTPUT of the business case.
- **Working assumption: 20% VAT on photo books (S145, owner).** Steuerberater to confirm.
- **The live site stays `noindex` until launch (S144)** — TO-DOS #81.

## Next steps (priority order)
1. **Owner: run the mockup capture runbook** — `docs/briefs/heirloom-build.md`, Stage 8. Four
   orders, three monograms each. `BG_R/G/B=216/212/207` is not optional (S98). Then fill
   `HEIRLOOM_ORDERS` in `scripts/exp2-images.mjs` and flip `ASSETS_READY` in
   `pages/heirloom.html`.
2. **Owner: confirm the engine fix on a NEW order.** Orders SAVED while blank keep their
   blanks — the `restoring` branch returns before seeding by design, so those need re-placing.
   Any order not yet saved should now open with the customer's text on the page.
3. **Heirloom product page loose ends** — `pages/de/heirloom.html` does not exist (the nav DE
   link 404s), and `collections.html` has no Heirloom card, so the page is reachable only by
   direct URL. Both are launch-blocking for Heirloom.
4. **Customer-preview must record caption line breaks too (engine-parity rule).** Mirror
   `captionVisualLines`/`collectCaptionLines` into `pages/customer-preview.html`.
5. **One PDF per new colourway** — no Brown, Green or Blue book has ever been rendered.
6. **Heirloom letter pockets — Xenia is looking into it.** The 8mm box is ~40% too tight for
   wide capitals. Owner: not critical.
7. **Re-verify the other four templates' covers at 80pp** (carried from S156).
8. **Verify the stall detection (#94) properly** (carried from S156). `qa/quick-stall-test.mjs`
   is broken.
9. **Chase Printsmarter on the five open questions (S155).**
10. **Clean up the QA scripts (#60/#95)** — 13 untracked one-offs remain in `qa/`.

## Open questions
- **Will the monogram cards still want a mockup crop once the 12 sets exist?** The SVG crop is
  sharper and always correct; a mockup would add the book's physicality. Owner's call.
- **Does the monogram hover-outline belong in the CUSTOMER preview?** It ships there via a
  shared class (S160).
- **Intro letter colour assumed `#7c746e`** — resolved for Beige (`#312128`); confirm with
  Xenia if print disagrees.
- **`assets/Aevia - Business case v10.xlsx` is tracked but missing from disk** (deletion left
  uncommitted deliberately). Stale Excel lock file in `assets/`.
- **The Printsmarter button is visible on the staff dashboard** but cannot fire.
- **The pre-push hook needs `git config core.hooksPath .githooks` per clone.** (Configured on
  this machine — it ran on all three S161 pushes.)
- **Pre-13-July Papercut orders have `name`/`year` swapped in Firestore.**
- **Approval overwrites staff edits blindly.**
- **Newborn's cover slot is 0.11mm short** on its left edge. Deliberately not fixed.
- **Is Printsmarter idempotent on `order_id_client`?** Unconfirmed.
- **Prices live in THREE places** — Stripe, `assets/js/prices.js`, `PRICE_BY_PAGE_COUNT`.
- **Android is entirely untested on real hardware.**
- **Staff test password is weak** for an account that can read real customer orders.
