# Session Status
_Last updated: 2026-08-11 (session 164)_
_Context at save: **S164's four commits are on `main` and unpushed** (`fc97655`, `a5077d5`,
`7009f53`, `dbda3d5`). 410 tests green, `qa:order` 12/12. The Tier 1 fix is **verified live**
— the owner reloaded AEV-094 and all 52 photos are present. The S156 business-case deletion,
a `test photos/IMG_5249.HEIC` deletion and ~14 untracked `qa/` one-offs remain deliberately
uncommitted._

## Status
**Session 164 (2026-08-11) — A live bug was deleting iPhone customers' photos between storage
and the staff engine. Found, fixed, and confirmed fixed on a real order. Photo-format handling
rebuilt around one policy instead of six disagreeing ones.**

**Immediate next action: deploy the functions.** `functions/index.js` and
`functions/derivative-utils.js` are committed but **inert until deployed** — `.rotate()` and
the corrected format list do nothing until then.
```bash
firebase deploy --only functions:generateDerivative
```

### What S164 changed
1. **HEIC photos were vanishing (live, on production).** Derivatives are written under the
   original's filename, so a HEIC original yields `previews/*.heic` containing **JPEG bytes**.
   `isHeicFile()` judged by extension, sent that JPEG to `convertHeic`, and after three
   failures dropped the photo **silently**. AEV-094: 52 uploaded, 38 shown, the 14 missing
   were exactly the HEIC ones. The bytes now decide (`isHeicMagic` in `photo-utils.js`).
   **Repaired by the read path alone — nothing in GCS was regenerated or renamed.**
2. **Failures are now visible.** Order-load casualties are collected and staff get a blocking
   alert naming each missing photo. A photo the browser cannot decode is now a failure, not a
   silent success. A 10s decode *timeout* stays distinct and keeps the photo.
3. **One format policy.** `PHOTO_FORMATS` in `assets/js/photo-utils.js` — JPG/PNG/HEIC/HEIF,
   40 MB. Read by the picker, drag-and-drop, cover, special pages, MIME declaration and
   `derivative-utils`. `photoRejection()` returns the customer-facing reason.
4. **`.rotate()`** added to `generateDerivative` (not live until deployed).
5. **Android extension-less uploads handled** — see Recent decisions.
6. **Two briefs + research:** `docs/briefs/photo-formats.md` (the plan, with an independent
   review at `photo-formats-review.md`), `docs/briefs/photo-formats-competitor-baseline.md`,
   `work/photo-formats/research_android-testing_v1.md`, and a full audit trail in
   `work/photo-formats/ORCHESTRATION-LOG.md`.

### Photo-format facts (carried, still current)
1. **The industry standard is JPG + PNG + HEIC.** Every competitor sampled accepts that set
   and nothing more. **No competitor accepts RAW.** We were never behind on coverage.
2. **Client and server HEIC brand lists must stay identical.** `isHeicMagic` and
   `heic-decode/lib.js` both gate on `mif1 msf1 heic heix hevc hevx` at bytes 8-12.
   **Do not extend one without the other.**
3. **`mif1`/`msf1` are structural HEIF brands, not codec brands** — an AVIF declaring `mif1`
   cannot be told from HEIC in 12 bytes. Deliberate, covered by a named test. Narrowing the
   set would reject real HEIC the converter accepts.
4. **HEIC decode cannot be tested locally on Windows** — sharp here has no HEVC plugin
   (`fileSuffix` lists only `.avif`). `.metadata()` is a header read, not a decode.
5. **The PDF uses ORIGINALS, not derivatives** (`export-pdf.js:305`). A mis-rotated
   derivative harms what staff *see* and the slot-shape classification — not print pixels
   directly. **Test rotation in the staff engine, not by generating a PDF.**
6. **iCloud Shared Albums downscale to 2048px** long edge (Apple Support 108916).
7. **`customer-preview.html` has no HEIC code and needs none** — it lets the browser identify
   files by content. Do not "restore parity" by adding conversion there.

## Recent decisions
- **WebP REFUSED (S164, owner).** Only Artifact Uprising accepts it; print pipelines reject
  it. Accepted list is the industry-standard three. **Do not re-raise.**
- **40 MB per-file cap (S164, owner)** — matches Artifact Uprising, the premium comparator.
- **RAW stays rejected (S164)** — universal industry practice. Copy fix only, no code.
- **Android extension-less files are accepted via MIME (S164).** Extension decides when known;
  otherwise an *exact* accepted MIME does. **Not** any `image/*` — that is what admitted WebP.
  Stored under a canonical name so `isImageFile()` still generates a derivative.
- **Byte-sniffing, not renaming derivatives (S164).** `deriveDerivativePath` is a pure function
  `getOrder` depends on; renaming would fix new orders only and leave existing ones broken.
- **Delegation abandoned mid-session (S164)** — supervision cost exceeded the work. See LEARNINGS.
- **Selector stack aligned to one 268px module (S162, owner).**
- **No intro card on the product page (S162, owner).**
- **DE address rule (S162, owner):** `du` = the buyer; `euer/ihr` = the people in the book.
  **Tender stays `du`; do not re-raise.**
- **Business case untracked (S156, owner).** **No longer backed up by git.**
- **Printsmarter token NOT rotated (S155, owner).** **Never put it in any summary or memory.**
- **#88 closed without root cause (S150, owner).** Read `docs/briefs/upload-failures.md` first.
- **No price rise at launch (S148, owner).**
- **Working assumption: 20% VAT on photo books (S145, owner).**
- **The live site stays `noindex` until launch (S144)** — TO-DOS #81.

## Next steps (priority order)
1. **Deploy `generateDerivative`** (command above). Then place an order from an iPhone with
   **deliberately rotated HEIC photos** (Settings → Camera → Formats → High Efficiency; shoot
   the same subject upright, rotated left, rotated right) and **open it in the staff engine**.
   Everything upright = `.rotate()` is safe on HEIC, the last unverified claim closes.
   Sideways, or a portrait photo in a landscape slot = make the rotation JPEG-only (one line).
2. **Test on a real Android device** — owner is sourcing one. Load a page that prints
   `file.name` / `file.type` and pick from **Google Photos and Drive**, not just local storage.
   **The open question: does a nameless file ever also arrive with an empty `type`?** If so we
   need byte-sniffing at upload; if not, the current fix is complete. Claude can write the
   probe page in minutes.
3. **Tier 4 — the customer-facing copy.** Spec is in `docs/briefs/photo-formats.md`. Remove
   `JPEG or RAW both work` from `pages/help.html:295` and both copy files (EN `:232`/`:302`,
   DE `:222`/`:292`); state the format list + 40 MB in Papier's pattern (name the list, then
   say what to do about a file not on it); **warn that iCloud Shared Album photos arrive at
   2048px and are not print resolution**; `/stop-slop` EN, mirror DE.
4. **Server-side validation in `functions/upload.js`** — it validates nothing, so a stale page
   or altered request can mint a signed URL for any name, type or size. Client-side refusal is
   not a security boundary. Needs a deploy, so it is its own change. **Do not** couple
   `confirmUpload` to derivative success — that races an async `onFinalize` trigger.
5. **Heirloom E2E + merge** — Stages 9 and 10 of `heirloom-build.md`, carried from S162.
6. **Customer-preview must record caption line breaks** (engine-parity, open since S159).
7. **Nav wraps to two rows at ~900px** and buries 17px of the breadcrumb (S162).
8. **German order flow — TO-DOS #101.**
9. **Re-verify the other four templates' covers at 80pp** (carried from S156).
10. **Clean up the QA scripts (#60/#95)** — ~14 untracked one-offs remain in `qa/`.

## Open questions
- **Does a Google Photos pick ever arrive with no extension AND no MIME type?** The one hole
  in the format gate. Unpublished anywhere; needs the device test.
- **Does `.rotate()` double-rotate HEIC?** Expected no (libheif applies `irot` during decode
  and libvips clears the tag) but **accepted on trust, not verified** — untestable locally.
- **Should existing derivatives be regenerated after the deploy?** `.rotate()` only affects
  new uploads. No current order is known to be affected. Regenerating costs egress; default
  is to leave them.
- **`assets/Aevia - Business case v10.xlsx` is tracked but missing from disk.**
- **The DE copy has never been read by a native speaker.**
- **Intro letter colour assumed `#7c746e`** — resolved for Beige (`#312128`); confirm with Xenia.
- **The Printsmarter button is visible on the staff dashboard** but cannot fire.
- **Pre-13-July Papercut orders have `name`/`year` swapped in Firestore.**
- **Approval overwrites staff edits blindly.**
- **Newborn's cover slot is 0.11mm short** on its left edge. Deliberately not fixed.
- **Prices live in THREE places** — Stripe, `assets/js/prices.js`, `PRICE_BY_PAGE_COUNT`.
- **Android is entirely untested on real hardware.** (Now the single biggest gap.)
- **Staff test password is weak** for an account that can read real customer orders.
