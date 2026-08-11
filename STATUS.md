# Session Status
_Last updated: 2026-08-11 (session 166)_
_Context at save: **five commits sit on local `main`, UNPUSHED** (`f65d632`, `b3f85db`,
`661c2d4`, `e4564a2`, `fa4eb81`). The live rig is still serving S165 code. 441 tests green,
`qa:order` 12/12. The S156 business-case deletion, a `test photos/IMG_5249.HEIC` deletion and
~14 untracked `qa/` one-offs remain deliberately uncommitted._

## Status
**Session 166 (2026-08-11) — Heirloom Stage 10 was already finished and only needed proving.
Then the real work: an order full of red LOW RES badges on photos that were fine, and a
warning customers could not act on.**

**Immediate next action: push, then open the help pages in a browser.** The new formats FAQ
has never been rendered — `npm test` does not execute HTML, and the accordion is the only
untested part of this session's work.

### What S166 changed
1. **Heirloom Stage 10 closed** — both halves were already done and the brief was stale.
   Nothing to merge (Heirloom went to `main` incrementally, never a branch), and Cloud Run is
   serving revision `00028`, built 100 seconds after the crop fix `a0fb1ff` landed.
2. **The low-res warning now names the cause and the fix.** It said "may print soft if used
   large", which the customer cannot act on because staff decide placement. It now names
   iCloud Shared Albums and messaging apps, and tells them to upload the originals. Red badge
   → amber. **Threshold left at 1575** — the verified 200 DPI floor was never the problem.
3. **`JPEG or RAW both work` removed from 18 locations.** The brief said four. It was on every
   product page in both languages.
4. **`Minimum resolution: 2000px on the short edge` removed from 14 pages** — it contradicted
   our own 1575px code and no code enforced it.
5. **`devotion.html` + `radiance.html` deleted.** S145 flagged them as a launch-day liability:
   they advertise DE/CH/UK/USA delivery with shipping included.
6. **RAW / TIFF / the 40 MB cap all declined**, reasoning recorded in `photo-formats.md`.

### Facts worth carrying
1. **An iCloud Shared Album 4:3 photo is 2048×1536** and misses the 1575px floor by 39 pixels.
   **WhatsApp is worse** (~1600px long edge). There is **no Google Photos equivalent** of the
   Shared Album cap — messaging is the Android path. Do not invent one.
2. **RAW carries no more detail than the JPEG beside it.** Same sensor. Tonal latitude, not
   resolution. Rendering one ourselves would override the photographer's grade.
3. **Wander's "high silence / between / us" is intended artwork (owner, S166).** Do not
   re-flag it. The "Dolomites, 2026" defect is genuinely gone from panel and spine.
4. **`gcloud` works from PowerShell, fails from the Bash tool** (Windows Python execution
   alias). The `reference_gcloud_python` note applies to PowerShell only.
5. **`git commit` commits the whole index**, not the paths you just added — see LEARNINGS.

## Recent decisions
- **RAW, TIFF and a bigger 40 MB cap ALL DECLINED (S166, owner).** Full reasoning in
  `docs/briefs/photo-formats.md` → "Settled S166". **Do not re-raise without new evidence.**
- **Low-res threshold stays 1575px (S166)** — the fix was tone and copy, not the measurement.
- **Customer copy states no bare resolution number (S166)** — it depends on placement, which
  the order form cannot know.
- **No backfill of existing `order-details.txt` (S165, owner).** Fix forward only.
- **WebP REFUSED (S164, owner).** Print pipelines reject it. **Do not re-raise.**
- **RAW stays rejected (S164)** — reconfirmed and expanded in S166.
- **Android extension-less files are accepted via MIME (S164).** Not any `image/*`.
- **DE address rule (S162, owner):** `du` = the buyer; `euer/ihr` = the people in the book.
- **Business case untracked (S156, owner).** **No longer backed up by git.**
- **Printsmarter token NOT rotated (S155, owner).** **Never put it in any summary or memory.**
- **#88 closed without root cause (S150, owner).** Read `docs/briefs/upload-failures.md` first.
- **No price rise at launch (S148, owner).**
- **Working assumption: 20% VAT on photo books (S145, owner).**
- **The live site stays `noindex` until launch (S144)** — TO-DOS #81.

## Next steps (priority order)
1. **Push the five commits**, then hard-refresh and check `help.html` + `de/help.html` render
   the new formats FAQ, desktop and mobile, console clean.
2. **Eyeball one dashboard PDF** of a Heirloom order with `FPhim` repositioned. Closes the last
   Heirloom unknown: the full-bleed reposition fix has never been seen in print.
3. **Send Xenia the cover-artwork brief** — (a) no customer-fillable text outlined into the
   artwork, (b) artboard = trim 409×200mm with 18mm bleed in Document Setup. Written out in
   the S165 log. Carried from S165.
4. **Nothing here — see TO-DOS #106.** S145 listed `sprout`/`horizon`/`terrain` as orphans
   alongside the two deleted this session. **They do not exist** and have not since `c32990f`.
   `website-copy-deltas.md:235` and `domain-migration.md:99` still claim otherwise.
5. **Guard test for baked-in placeholder text** — `npm test` catches a wrong viewBox but
   nothing catches artwork carrying caption text, and that reaches print. Carried from S165.
6. **Verify `.rotate()` on HEIC** — order from an iPhone with rotated HEIC photos and open it
   in the staff engine. Untestable locally. Carried from S164.
7. **Test on a real Android device** — can a Google Photos pick arrive with no extension AND
   no MIME type? Owner sourcing a device.
8. **Server-side validation in `functions/upload.js`** — it validates nothing. Own deploy.
   **Do not** couple `confirmUpload` to derivative success (races `onFinalize`).
9. **Customer-preview must record caption line breaks** (engine-parity, open since S159).
10. **Nav wraps to two rows at ~900px** and buries 17px of the breadcrumb (S162).
11. **German order flow — TO-DOS #101.**
12. **Clean up the QA scripts (#60/#95)** — ~14 untracked one-offs remain in `qa/`.

## Open questions
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
