# Session Status
_Last updated: 2026-08-12 (session 168)_
_Context at save: **NOTHING FROM S168 IS COMMITTED.** `origin/main` is still at `27c7733`
(S167). The entire Laguna build sits in the working tree, alongside the pre-existing
uncommitted items: the S156 business-case deletion, a `test photos/IMG_5249.HEIC`
deletion, and ~14 untracked `qa/` one-offs._

## Status
**Session 168 (2026-08-12) — Laguna, the third Adventures template, in collaboration with
Clémence Trossevin. `/add-template` Phase A complete and owner-signed-off; Phase B stage 5
(order form) complete. Stages 6–10 remain.**

**Read `docs/briefs/laguna-build.md` first next session** — it is the build-state doc and
carries the full stage checklist, the open issues, and the facts that cost time to establish.

**Immediate next action: Phase B stage 6 — customer-preview parity.** Then stage 7 (PDF).

### What S168 changed
1. **Laguna Phase A** — `assets/Template_Laguna/laguna-data.js` (all 36 CSV slot rows
   machine-verified), Fredoka + Mulish Regular/Medium on all three surfaces, registry
   entries, and `qa/debug-laguna-render.mjs`. **Gate passed with zero engine changes** —
   unusual; Joyride needed six generalisations.
2. **The drop's rasters were unshippable** — 85 MB of base64 PNG, cover at 36 MB (over the
   25 MiB Cloudflare limit AND the 8 MB PDF-drop threshold; two files could not even be
   parsed by librsvg). `scripts/optimise-laguna-rasters.mjs` took it to **11.7 MB** at
   300 DPI, verified by pixel-diff (mean 0.6/255).
3. **Owner's first eyeball found three bugs — all fixed with DATA, no code:**
   `cover.overlayAbovePhotos: false` (the artwork was covering the cover photo),
   `overlayBelow: true` on 26 page variants, and caption box dims from the new CSV columns.
4. **Phase B stage 5** — `pages/order.html` wired with four data edits and no new logic.
   `qa/smoke-laguna-order.mjs` 13/13.
5. **Clémence Trossevin added** to `our-artists.html` (EN + DE), both copy docs, and
   `docs/templates.md`.
6. **A Mulish landmine closed** — Mulish had only a `_light` cut, the exact gap that
   silently deleted Joyride's cover sub-labels from print in S136. Laguna's captions ask
   for `regular`/`medium`, so it would have repeated.

### Facts worth carrying
1. **`referenceSpineMm` is NOT the printed spine.** Print spec is fixed for all templates:
   40pp → 10mm, 80pp → 14mm via `getSpineWidthMm()`. The field records what the ARTWORK was
   drawn against; the code shifts by the delta. **`referenceSpineMm: 9` is not a defect.**
   I claimed otherwise in S168 and was wrong — see LEARNINGS.
2. **"The photo isn't loading" can mean the artwork is on top of it.** An opaque shape at
   the photo position looks identical to a failed load in a screenshot. Read the live DOM
   stacking order.
3. **`photosDecoded: 1` in the render smoke test is normal** — the engine gives
   `img.slot-photo` an empty `src` and fills it elsewhere. Wander behaves identically.
4. **`const ORDER` in `order.html` is not `window.ORDER`** — bare global, reachable in
   `page.evaluate` only as an identifier.
5. **Joyride has ONE cover drop zone feeding four slot cells**, not four zones.
6. **Add-ons come from URL params**, written by `product.js` from `window.PRODUCT.fp` — not
   from the data file. Until `laguna.html` exists they must be passed by hand.

## Recent decisions
- **Laguna is authored at 10mm / 410mm (S168)** — `referenceSpineMm: 10`, like Heirloom.
  40pp needs no shift, 80pp gets +4mm from existing code. **Settled with the owner.**
- **Laguna's cover raster re-encoded to 300 DPI JPEG (S168)** — 406 DPI was above what the
  press uses. Originals are NOT in git; the owner must archive them externally.
- **Laguna × Clémence Trossevin is an artist collaboration (S168, owner)** — needs the
  credit line on the product page + collections card at Stage 8.
- **Joyride's product page shows five spreads (S167, owner).**
- **RAW, TIFF and a bigger 40 MB cap ALL DECLINED (S166, owner).** **Do not re-raise.**
- **Low-res threshold stays 1575px (S166).**
- **No backfill of existing `order-details.txt` (S165, owner).** Fix forward only.
- **WebP REFUSED (S164, owner).** **Do not re-raise.**
- **DE address rule (S162, owner):** `du` = the buyer; `euer/ihr` = the people in the book.
- **Business case untracked (S156, owner).** **No longer backed up by git.**
- **Printsmarter token NOT rotated (S155, owner).** **Never put it in any summary or memory.**
- **#88 closed without root cause (S150, owner).** Read `docs/briefs/upload-failures.md` first.
- **No price rise at launch (S148, owner).**
- **Working assumption: 20% VAT on photo books (S145, owner).**
- **The live site stays `noindex` until launch (S144)** — TO-DOS #81.

## Next steps (priority order)
1. **Laguna Phase B stage 6** — customer-preview parity. Mirror every engine rule; the
   fonts and registry are already registered there. Re-run the Scribble smoke test.
2. **Laguna Phase B stage 7** — PDF. ⛔ **Never render locally** (GCS egress on the owner's
   bill). Get `export-pdf.js` right by reading, then the owner generates via the dashboard.
   The **Cloud Run renderer must be redeployed** or Laguna errors `Unknown template`.
3. **Ask the owner / Clémence about the Fredoka title weight** — the CSV's "Fredoka Light
   Bold" is not a real cut; currently read as Light. Visible on the cover if wrong.
4. **Laguna Phase C** — `laguna.html` + DE, mockups (needs entries in **BOTH**
   `compose-all.mjs` and `exp2-images.mjs`), E2E, merge. `our-artists.html` already links
   to `laguna.html`, so that link is dead until this lands.
5. **Commit S168.** Nothing from this session is in git.
6. **Open `help.html` + `de/help.html` in a browser** — the S166 formats FAQ has never been
   rendered. Carried from S166 and S167.
7. **Eyeball one dashboard PDF** of a Heirloom order with `FPhim` repositioned.
8. **Send Xenia the cover-artwork brief** — (a) no customer-fillable text outlined into the
   artwork, (b) artboard = trim with correct bleed in Document Setup. Carried from S165.
9. **Joyride Stage 9–10** — E2E then merge; letdorabe's real bio + portrait still lorem.
10. **Delete Joyride's dead placeholder plumbing** in `pages/joyride.html` + DE.
11. **Guard test for baked-in placeholder text** in artwork. Carried from S165.
12. **Verify `.rotate()` on HEIC** — untestable locally. Carried from S164.
13. **Server-side validation in `functions/upload.js`.**
14. **Customer-preview must record caption line breaks** (open since S159).
15. **German order flow — TO-DOS #101.**
16. **Clean up the QA scripts (#60/#95)** — ~14 untracked one-offs in `qa/`.

## Open questions
- **Is the Fredoka cover title Light, or something heavier?** The CSV names a cut that does
  not exist. Owner or Clémence.
- **Does Clémence's portrait crop correctly?** Hers is 760×1118 portrait; Kevin's is
  1200×800 landscape. Not checked against `our-artists.html`.
- **Is 3491×3773 Clémence's true original, or an upscale?** If upscaled, the real detail
  ceiling is lower than the 406 DPI measured. Does not change the 300 DPI decision.
- **Does a repositioned full-bleed photo now print off-centre?** Never eyeballed.
- **Would a 60–100MP camera's max-quality JPEG exceed 40 MB?** Not acted on. TO-DOS #105.
- **Is Wander's trim 409mm or 408mm?** Xenia has not confirmed.
- **Does a Google Photos pick ever arrive with no extension AND no MIME type?** Needs a device.
- **Does `.rotate()` double-rotate HEIC?** Accepted on trust — untestable locally.
- **Should existing derivatives be regenerated?** Costs egress; default is to leave them.
- **`wander-data.js` placeholders still quote the artwork's old wording** ("Dolomites, 2026").
- **`assets/Aevia - Business case v10.xlsx` is tracked but missing from disk.**
- **The DE copy has never been read by a native speaker** — now includes Clémence's bio.
- **Intro letter colour assumed `#7c746e`** — resolved for Beige; confirm with Xenia.
- **The Printsmarter button is visible on the staff dashboard** but cannot fire.
- **Pre-13-July Papercut orders have `name`/`year` swapped in Firestore.**
- **Approval overwrites staff edits blindly.**
- **Prices live in THREE places** — Stripe, `assets/js/prices.js`, `PRICE_BY_PAGE_COUNT`.
- **Android is entirely untested on real hardware.**
- **Staff test password is weak** for an account that can read real customer orders.
