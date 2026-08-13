# Session Status
_Last updated: 2026-08-13 (session 172)_
_Context at save: **all S172 work is committed and pushed.** `origin/main` = `935ac1f`.
Still uncommitted, all pre-existing and belonging to no logged session: the six re-encoded
`Template_Wander` map PNGs, a `test photos/IMG_5249.HEIC` deletion, the tracked-but-missing
`Business case v10.xlsx`, `.claude/settings.local.json` (S170's deny rules), and ~14
untracked `qa/` one-offs._

## Status
**Session 172 (2026-08-13) — LAGUNA IS BUILT. All ten stages closed.** Xenia's corrected
SVGs validated, mockups captured and composed, product page and collections card filled,
E2E chain green, and a clean PDF off the redeployed Cloud Run renderer.

**Laguna needs nothing before it can take an order.** What remains is copy review and two
artwork questions, none of which block.

### What S172 changed
1. **Clémence's bio, portfolio link and portrait** — revised in both copy masters, then
   both `our-artists` pages. Link moved from Instagram to `https://clemencetrossevin.com/`.
2. **Caught a cover that would have printed wrong.** The first re-export brought the
   back-cover lettering back as LIVE `<text>` in **Baskerville**, a macOS-only font. It
   mis-spaces mid-word on Windows and on the Linux renderer. Re-outlined and verified.
   `qa/probe-cover-svg-text.mjs` had **no Laguna entry** — the cover had never been probed.
3. **Cover re-optimised** 34.83 MB → 3.56 MB; cover CSV subtitle synced (Y 193, height 6).
4. **Six spreads validated** — SP2/SP6 vertical artwork moved right page → left; the
   pairings are deliberate, checked by rendering.
5. **17 mockups** from AEV-095 on the warm-grey backdrop; product page + collections card.
6. **Stages 9 + 10 closed by the owner** — chain green (Paid: true), renderer redeployed,
   Laguna PDF clean.

### Facts worth carrying
1. **The QA captures read from the DEPLOYED rig**, not your machine
   (`BASE = 'https://aevia-test.pages.dev/pages'`). Push → wait for deploy → capture.
   Same root cause as S171's wrong-template render. See LEARNINGS (S172).
2. **Verify a deploy by BYTES, not faith** — a failed Pages deploy leaves the old file in
   place and still returns 200. And **a 404 right after a deploy proves nothing**: the edge
   rollout is not atomic across files; re-check a minute later.
3. **The mockup grey backdrop is OPT-IN** — `BG_R=216 BG_G=212 BG_B=207`. The default is
   near-white and the output looks *plausible*, so it only reads as wrong beside another
   product page. Verify colour by sampling pixels.
4. **A new template needs THREE mockup registrations** — `compose-all.mjs`,
   `exp2-images.mjs` **and** `web-mockups.mjs` (the last feeds the collections card).
5. **`cover-wrap-newborn.png` is a fixed-name alias**, not the Newborn template. Every
   capture writes it alongside the order-stamped file. Harmless, badly named.
6. **A template's blank-stub list goes stale on every re-export.** Re-derive it.
7. **Artwork text renders perfectly on the designer's Mac and wrongly everywhere else.**
   Probe every cover drop; add every new template to the probe's list.

## Recent decisions
- **Laguna's five product-page spreads are captures 01/04/07/09/12 (S172, owner).** Two are
  the same SP1 layout, which is why `exp2-images.mjs` now names them explicitly.
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
1. **Owner review of the Laguna page copy** (EN + DE) — TO-DOS #110. The only Laguna item
   with a customer-visible consequence.
2. **Downscale Clémence's portrait** — 3.48 MB against 86 KB for Kevin's, ~45× the
   convention, on a page that displays it small. One-file change, offered and not taken up.
3. **Decide the two artwork questions for Xenia/Clémence** — the back cover reads
   "In memory of those warm summer days…" and credits **@clemence_trossevin** (Instagram),
   while her artist page now links to her portfolio. Both are outlined into the artwork, so
   changing either means a re-export.
4. **Send Xenia the cover-artwork brief** — (a) no customer-fillable text outlined into the
   artwork, (b) **no live `<text>` at all** — outline it, or it breaks off-Mac (new, S172),
   (c) artboard = trim with correct bleed in Document Setup, (d) artwork must reach the full
   bleed rectangle, not stop at a rounded transform.
5. **Eyeball the next Laguna proof** for the three things stage 7 could only verify by
   reading code: spine-label centring, the Fredoka Bold cover title, map pins on the chosen
   countries.
6. **Open `help.html` + `de/help.html` in a browser** — the S166 formats FAQ has never been
   rendered. Carried from S166/S167/S168/S171.
7. **Joyride Stage 9–10** — E2E then merge; letdorabe's real bio + portrait still lorem
   (her portrait 404s on both artist pages).
8. **Delete Joyride's dead placeholder plumbing** — ⚠ check Laguna does not depend on the
   same `phBroken()` fallback first; its page was copied from Joyride's for exactly that.
9. **Extend `cover-svg-viewbox.test.js` to assert bleed coverage** — TO-DOS #109.
10. **TO-DOS #111 (new)** — slow photo decode silently guesses orientation.
11. **Server-side validation in `functions/upload.js`.**
12. **Customer-preview must record caption line breaks** (open since S159).
13. **German order flow — TO-DOS #101.**
14. **Clean up the QA scripts (#60/#95)** — ~14 untracked one-offs in `qa/`.
15. **Rename `cover-wrap-newborn.png`** to something honest, and make the capture scripts
    print the URL they open. Both are small; both cost a session's time today.

## Open questions
- **Does the Laguna approve click work?** The E2E chain skipped it — AEV-095 was already
  approved. That hop is unexercised for Laguna.
- **Does Clémence's portrait crop correctly?** Hers is portrait; Kevin's is landscape.
  Never checked against `our-artists.html` — and the file has now been replaced again.
- **Does a repositioned full-bleed photo now print off-centre?** Never eyeballed.
- **Would a 60–100MP camera's max-quality JPEG exceed 40 MB?** TO-DOS #105.
- **Is Wander's trim 409mm or 408mm?** Xenia has not confirmed.
- **Does a Google Photos pick ever arrive with no extension AND no MIME type?** Needs a device.
- **Does `.rotate()` double-rotate HEIC?** Accepted on trust — untestable locally.
- **Should existing derivatives be regenerated?** Costs egress; default is to leave them.
- **`wander-data.js` placeholders still quote the artwork's old wording** ("Dolomites, 2026").
- **The six `Template_Wander` map PNGs are still uncommitted and unexplained** (since S170).
- **`assets/Aevia - Business case v10.xlsx` is tracked but missing from disk.**
- **The DE copy has never been read by a native speaker.**
- **Intro letter colour assumed `#7c746e`** — resolved for Beige; confirm with Xenia.
- **The Printsmarter button is visible on the staff dashboard** but cannot fire.
- **Pre-13-July Papercut orders have `name`/`year` swapped in Firestore.**
- **Approval overwrites staff edits blindly.**
- **Prices live in THREE places** — Stripe, `assets/js/prices.js`, `PRICE_BY_PAGE_COUNT`.
- **Android is entirely untested on real hardware.**
- **Staff test password is weak** for an account that can read real customer orders.
