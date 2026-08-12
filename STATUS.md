# Session Status
_Last updated: 2026-08-12 (session 171)_
_Context at save: **everything is committed and pushed.** `origin/main` = `8fc19ab`, current
for the first time since S167. Still uncommitted, all pre-existing: the six re-encoded
`Template_Wander` map PNGs (belonging to no logged session), a `test photos/IMG_5249.HEIC`
deletion, `.claude/settings.local.json` (S170's deny rules), and ~14 untracked `qa/` one-offs._

## Status
**Session 171 (2026-08-12) — Laguna reached Phase C stage 8. Ten sessions of work finally
pushed to the rig, and a real bug the owner hit in production was fixed at root cause.**

**Read `docs/briefs/laguna-build.md` first next session** — it is the build-state doc and now
carries a **re-validation checklist at the top** for the incoming re-export.

**Immediate next action: nothing until Xenia's corrected SVGs land.** Laguna is deliberately
parked (see below).

### What S171 changed
1. **Pushed S168–S170** (`22a2027 → a9f919f`). Nothing had been on the rig since S167.
2. **Fixed a silent wrong-template render.** Both engines fell back to Scribble for ANY
   unrecognised `templateName`, so a Laguna order opened against the stale rig rendered as
   Scribble and was sent to a customer. Now: **missing** → Scribble (pre-seam orders need
   it); **present but unknown** → throw. `tests/template-fallback.test.js` runs the real
   shipped function out of both HTML files, verified RED against the pre-fix code.
3. **Laguna stage 7 closed** by the owner's printed AEV-095. `export-pdf.js` needed no change.
4. **Laguna stage 8 built** — `pages/laguna.html` + DE (copied from Joyride), cards on both
   collections pages, registered in **both** `compose-all.mjs` and `exp2-images.mjs`.
   `qa/smoke-laguna-product.mjs` **42/42**. No Stripe or price work was needed.
5. **The AEV-095 cover hairline is bleed** — 0.19–0.49mm short, 17.5mm outside the trim.
   No action needed; measurements and cause are in the build doc.
6. **Laguna added to both copy masters** (`docs/website-copy-EN.md` / `-DE.md`).

### Facts worth carrying
1. **A lookup miss on a value we generated ourselves is an error, not a default.** See
   LEARNINGS (S171). Defaults are for input you never controlled.
2. **Check what is DEPLOYED before diagnosing a parity bug.** The Scribble render was local
   code compared against three-session-old deployed code, not an engine divergence.
3. **The preview link always points at the deployed origin** (`siteOrigin(req)`), never
   localhost. Local testing cannot exercise the customer preview.
4. **`prices.js` and `pickPage` are template-agnostic** — a new template needs no price entry.
5. **The collections card reads `mockups/<template>/closed.webp`**, not `exp2/`. Real exception.
6. **A new product page is not done until both copy masters are updated.** Missed this in
   S171; the owner caught it.

## Recent decisions
- **Mockup capture deferred (S171, owner)** — Xenia is re-doing the Laguna SVGs; capturing now
  would bake the glitches into the product imagery.
- **Laguna's product page shows five spreads (S171)** — matches Joyride's S167 call. Not yet
  owner-confirmed; changing it means editing the thumb list AND `exp2-images.mjs` together.
- **Laguna is authored at 10mm / 410mm (S168)** — `referenceSpineMm: 10`, like Heirloom.
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
1. **⏳ BLOCKED — wait for Xenia's corrected Laguna SVGs.** On arrival run the re-validation
   checklist at the top of `docs/briefs/laguna-build.md`. **`scripts/optimise-laguna-rasters.mjs`
   is mandatory** — the raw cover is ~36 MB and a >25 MiB file kills the Cloudflare deploy
   *silently*.
2. **Then capture Laguna's mockups** (owner's job, needs the staff password):
   `qa/capture-cover-wrap.mjs` + `qa/capture-spread.mjs` on AEV-095, then
   `node compose-all.mjs AEV-095 laguna` and `node exp2-images.mjs laguna`.
   Runbook: `docs/briefs/heirloom-build.md` Stage 8.
3. **Laguna stage 9 (E2E)** — `qa/staff-customer-chain.mjs` on a real order.
4. **Laguna stage 10 (merge)** — and **redeploy the Cloud Run renderer**
   (`gcloud run deploy aevia-pdf-renderer --source . --memory 8Gi`). Pushing to `main` does
   NOT update it, and Laguna now **errors** rather than falling back silently.
5. **Owner review of the Laguna page copy** (EN + DE) — TO-DOS #110.
6. **Ask about the five-spread count** on the Laguna product page.
7. **Open `help.html` + `de/help.html` in a browser** — the S166 formats FAQ has never been
   rendered. Carried from S166/S167/S168.
8. **Eyeball one dashboard PDF** of a Heirloom order with `FPhim` repositioned.
9. **Send Xenia the cover-artwork brief** — (a) no customer-fillable text outlined into the
   artwork, (b) artboard = trim with correct bleed in Document Setup, (c) **artwork must reach
   the full bleed rectangle, not stop at a rounded transform** (new, from S171's hairline).
10. **Joyride Stage 9–10** — E2E then merge; letdorabe's real bio + portrait still lorem.
11. **Delete Joyride's dead placeholder plumbing** in `pages/joyride.html` + DE.
12. **Extend `cover-svg-viewbox.test.js` to assert bleed coverage** — TO-DOS #109.
13. **Server-side validation in `functions/upload.js`.**
14. **Customer-preview must record caption line breaks** (open since S159).
15. **German order flow — TO-DOS #101.**
16. **Clean up the QA scripts (#60/#95)** — ~14 untracked one-offs in `qa/`.

## Open questions
- **Does Clémence's portrait crop correctly?** Hers is 760×1118 portrait; Kevin's is
  1200×800 landscape. Not checked against `our-artists.html`.
- **Is 3491×3773 Clémence's true original, or an upscale?** Does not change the 300 DPI call.
- **What exactly did Xenia find wrong in the Laguna SVGs?** Not described to Claude yet.
- **Does a repositioned full-bleed photo now print off-centre?** Never eyeballed.
- **Would a 60–100MP camera's max-quality JPEG exceed 40 MB?** TO-DOS #105.
- **Is Wander's trim 409mm or 408mm?** Xenia has not confirmed.
- **Does a Google Photos pick ever arrive with no extension AND no MIME type?** Needs a device.
- **Does `.rotate()` double-rotate HEIC?** Accepted on trust — untestable locally.
- **Should existing derivatives be regenerated?** Costs egress; default is to leave them.
- **`wander-data.js` placeholders still quote the artwork's old wording** ("Dolomites, 2026").
- **`assets/Aevia - Business case v10.xlsx` is tracked but missing from disk.**
- **The DE copy has never been read by a native speaker** — now includes Laguna's page.
- **Intro letter colour assumed `#7c746e`** — resolved for Beige; confirm with Xenia.
- **The Printsmarter button is visible on the staff dashboard** but cannot fire.
- **Pre-13-July Papercut orders have `name`/`year` swapped in Firestore.**
- **Approval overwrites staff edits blindly.**
- **Prices live in THREE places** — Stripe, `assets/js/prices.js`, `PRICE_BY_PAGE_COUNT`.
- **Android is entirely untested on real hardware.**
- **Staff test password is weak** for an account that can read real customer orders.
