# Session Status
_Last updated: 2026-08-12 (session 167)_
_Context at save: **everything is pushed.** `origin/main` is at `27c7733`; the live rig serves
S166 + S167. 441 tests green, `qa:order` 12/12. The S156 business-case deletion, a
`test photos/IMG_5249.HEIC` deletion, an untracked `assets/Template_Laguna/` drop and ~14
untracked `qa/` one-offs remain uncommitted._

## Status
**Session 167 (2026-08-12) — short. Pushed S166's six-commit backlog, then produced the
Joyride mockup set that had been deferred since S134 waiting for a good order.**

**Immediate next action: open the help pages in a browser.** Carried from S166 and displaced
by the Joyride work. `help.html` + `de/help.html` are now live on the rig with the new formats
FAQ, and no human has rendered it — `npm test` does not execute HTML.

### What S167 changed
1. **S166 is live.** Six commits pushed (`f65d632`…`1c20b52`). The first push attempt was
   blocked by the pre-push hook failing to start `http-server` within its 15s window, not by
   anything in the order flow; starting a server by hand and re-pushing gave 12/12.
2. **Joyride mockups shipped** (`27c7733`). Nine webp in
   `assets/images/mockups/exp2/joyride/` (front, back, **sp1–sp5**, fpintro, fp1) from
   **AEV-069**, plus `assets/images/mockups/joyride/closed.webp` for the collections card,
   which had been a grey placeholder icon in both languages.
3. **Joyride was missing from both compositor tables** and the pipeline could not run for it:
   `compose-all.mjs` (needs the data file + global name) and `exp2-images.mjs` (needs the
   order + spread map). Both now have entries; a re-capture is a one-liner.
4. **Five spreads, not four** (owner). Every sibling template ships sp1–sp4.

### Facts worth carrying
1. **`resolveSpread()` accepts bare book-sequence ids** (`sp1`) as well as `open-NN-sp1`. The
   NN index shifts with photo count, so **bare ids are the right choice for a new template.**
2. **A blocked push is more likely the server start than the order form.** Read which line of
   the hook output failed before assuming a regression.
3. **The lightbox's empty `<img>` reports as a broken image** on every product page until it is
   opened. Not a defect — do not chase it.
4. **`gcloud` works from PowerShell, fails from the Bash tool** (S166, still true).
5. **`git commit` commits the whole index**, not the paths you just added — see LEARNINGS.

## Recent decisions
- **Joyride's product page shows five spreads (S167, owner)** — the other templates show four.
- **RAW, TIFF and a bigger 40 MB cap ALL DECLINED (S166, owner).** Full reasoning in
  `docs/briefs/photo-formats.md` → "Settled S166". **Do not re-raise without new evidence.**
- **Low-res threshold stays 1575px (S166)** — the fix was tone and copy, not the measurement.
- **Customer copy states no bare resolution number (S166)** — it depends on placement, which
  the order form cannot know.
- **No backfill of existing `order-details.txt` (S165, owner).** Fix forward only.
- **WebP REFUSED (S164, owner).** Print pipelines reject it. **Do not re-raise.**
- **Android extension-less files are accepted via MIME (S164).** Not any `image/*`.
- **DE address rule (S162, owner):** `du` = the buyer; `euer/ihr` = the people in the book.
- **Business case untracked (S156, owner).** **No longer backed up by git.**
- **Printsmarter token NOT rotated (S155, owner).** **Never put it in any summary or memory.**
- **#88 closed without root cause (S150, owner).** Read `docs/briefs/upload-failures.md` first.
- **No price rise at launch (S148, owner).**
- **Working assumption: 20% VAT on photo books (S145, owner).**
- **The live site stays `noindex` until launch (S144)** — TO-DOS #81.

## Next steps (priority order)
1. **Open `help.html` + `de/help.html` in a browser** — the S166 formats FAQ has never been
   rendered. Desktop + mobile, console clean. Carried from S166.
2. **Eyeball one dashboard PDF** of a Heirloom order with `FPhim` repositioned. Closes the last
   Heirloom unknown: the full-bleed reposition fix has never been seen in print.
3. **Send Xenia the cover-artwork brief** — (a) no customer-fillable text outlined into the
   artwork, (b) artboard = trim 409×200mm with 18mm bleed in Document Setup. Written out in
   the S165 log. Carried from S165.
4. **Joyride Stage 9–10** — E2E via `qa/staff-customer-chain.mjs`, then merge. Mockups (the
   named blocker) are done; letdorabe's real bio + portrait in `our-artists.html` is still
   lorem ipsum and is the other pre-merge item. See `docs/briefs/joyride-build.md`.
5. **Delete Joyride's dead placeholder plumbing** — `.ph-fallback` CSS, `phBroken()`,
   `data-ph="Preview soon"` in `pages/joyride.html` + `pages/de/joyride.html`. Harmless, but
   Heirloom's equivalent was removed at this exact point.
6. **Guard test for baked-in placeholder text** — `npm test` catches a wrong viewBox but
   nothing catches artwork carrying caption text, and that reaches print. Carried from S165.
7. **Verify `.rotate()` on HEIC** — order from an iPhone with rotated HEIC photos and open it
   in the staff engine. Untestable locally. Carried from S164.
8. **Test on a real Android device** — can a Google Photos pick arrive with no extension AND
   no MIME type? Owner sourcing a device.
9. **Server-side validation in `functions/upload.js`** — it validates nothing. Own deploy.
   **Do not** couple `confirmUpload` to derivative success (races `onFinalize`).
10. **Customer-preview must record caption line breaks** (engine-parity, open since S159).
11. **Nav wraps to two rows at ~900px** and buries 17px of the breadcrumb (S162).
12. **German order flow — TO-DOS #101.**
13. **Clean up the QA scripts (#60/#95)** — ~14 untracked one-offs remain in `qa/`.

## Open questions
- **What is `assets/Template_Laguna/`?** It appeared untracked during S167 and belongs to no
  logged session. Owner drop, presumably a new template — not wired to anything.
- **Does a repositioned full-bleed photo now print off-centre?** Guarded by
  `tests/photo-crop-paths.test.js`, never eyeballed since the fix.
- **Would a 60–100MP camera's maximum-quality JPEG exceed 40 MB and be refused?** The one part
  of Xenia's challenge that stands. Not acted on (owner, S166). TO-DOS #105.
- **Is Wander's trim 409mm or 408mm?** Owner's second export is 409 and matches every other
  template. Xenia has not confirmed.
- **Does a Google Photos pick ever arrive with no extension AND no MIME type?** Needs a device.
- **Does `.rotate()` double-rotate HEIC?** Expected no, **accepted on trust** — untestable
  locally (sharp on Windows has no HEVC plugin).
- **Should existing derivatives be regenerated?** `.rotate()` only affects new uploads.
  Regenerating costs egress; default is to leave them.
- **`wander-data.js` placeholders still quote the artwork's old wording** ("Dolomites, 2026") —
  the pattern S165 says never to repeat, now harmless but unfixed.
- **`assets/Aevia - Business case v10.xlsx` is tracked but missing from disk.**
- **The DE copy has never been read by a native speaker.**
- **Intro letter colour assumed `#7c746e`** — resolved for Beige (`#312128`); confirm with Xenia.
- **The Printsmarter button is visible on the staff dashboard** but cannot fire.
- **Pre-13-July Papercut orders have `name`/`year` swapped in Firestore.**
- **Approval overwrites staff edits blindly.**
- **Prices live in THREE places** — Stripe, `assets/js/prices.js`, `PRICE_BY_PAGE_COUNT`.
- **Android is entirely untested on real hardware.**
- **Staff test password is weak** for an account that can read real customer orders.
