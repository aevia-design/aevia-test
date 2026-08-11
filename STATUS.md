# Session Status
_Last updated: 2026-08-11 (session 165)_
_Context at save: **everything is pushed** — `main` is clean against `origin/main` at
`5e62914`. 441 tests green, `qa:order` 12/12. The S163/S164 backlog of seven unpushed commits
went out this session too. The S156 business-case deletion, a `test photos/IMG_5249.HEIC`
deletion and ~14 untracked `qa/` one-offs remain deliberately uncommitted._

## Status
**Session 165 (2026-08-11) — Customer-entered data was disappearing between the order form and
both places staff read it. Three defects found, all fixed; one of them was not in the code at
all but outlined into Xenia's cover artwork.**

**Immediate next action: deploy the upload function.** `functions/upload.js` is committed but
**inert until deployed** — no cover text reaches `order-details.txt` until then.
```bash
firebase deploy --only functions:createUploadSession
```
Then place **one throwaway order** and check `order-details.txt` in the bucket contains a
`Cover text:` block. That is the only part of S165 that is unit-tested rather than proven
end to end.

### What S165 changed
1. **The staff panel was template-blind.** `showOrderInfoPanel` labelled everything from
   `coverLabels = { year, name, spineName, spineYear }` and `fpLabels = { FP1: 'Birthday
   wishes', … }` — Scribble's and Papercut's key sets applied to all seven templates.
   **Wander showed nothing; Joyride, Newborn, Tender and Heirloom showed only `name`.** Labels
   now come from each template's own definitions, and an undeclared key still renders under its
   raw key. Verified live on AEV-094, AEV-070, AEV-088, AEV-072.
2. **`order-details.txt` had NEVER recorded cover or spine text** — for any template, in any
   order. Verified against **38 real orders spanning all seven templates**. Firestore always
   had it, so nothing was destroyed. Now written as a `Cover text:` block; labels ride in from
   the client (`coverCaptionLabels`) because `functions/` cannot read the template data files.
3. **`fp1: [object Object]`** replaced by `formatFpValue()` (was TO-DOS #102, renumbered #104).
4. **Wander's cover carried "Dolomites, 2026" in the artwork**, outlined as vector paths, on
   both the front panel and the spine — under the customer's caption, and it reaches print.
   Owner re-exported without it. **Every other template checked and clean.**
5. **`tests/order-data-completeness.test.js`** (31 tests) — the part that stops recurrence.

### Cover-artwork facts (new, carry these)
1. **Outlined text is invisible to `grep` AND to a DOM query.** It has no characters, and the
   cover SVG loads as an `<img>` so its contents are not queryable. `qa/probe-cover-svg-text.mjs`
   renders all ten cover SVGs standalone in ~20s — **run it on any Xenia drop.**
2. **A template's `placeholder` must never be copied from text baked into the artwork.** That
   is what made this invisible: the order form suggested the artwork's own wording.
3. **The viewBox patch is lost on every re-export, by design.** It lives downstream of
   Illustrator. `tests/cover-svg-viewbox.test.js` catches it — run `npm test` on any SVG drop.
4. **Illustrator always writes the artboard as the viewBox.** There is no "Use Artboards"
   option in Save As to hunt for. The fix is document setup: **artboard = trim 409×200mm,
   bleed = 18mm in Document Setup**, artwork extending past it, no "clip to artboard".
5. **409mm trim = 200 back + 9 spine + 200 front.** One owner export came back at 408mm; the
   replacement is correct at 409.

## Recent decisions
- **No backfill of existing `order-details.txt` (S165, owner).** Fix forward only.
- **Scope of "customer's entered data" = captions + add-on selections (S165, owner).**
- **No brief written for the S165 fixes (S165)** — root cause, scope and blast radius were
  already established by probing; a brief would have re-derived them.
- **WebP REFUSED (S164, owner).** Print pipelines reject it. **Do not re-raise.**
- **40 MB per-file cap (S164, owner)** — matches Artifact Uprising.
- **RAW stays rejected (S164)** — universal industry practice. Copy fix only, no code.
- **Android extension-less files are accepted via MIME (S164).** Not any `image/*`.
- **Byte-sniffing, not renaming derivatives (S164).**
- **Delegation abandoned mid-session (S164)** — supervision cost exceeded the work.
- **DE address rule (S162, owner):** `du` = the buyer; `euer/ihr` = the people in the book.
- **Business case untracked (S156, owner).** **No longer backed up by git.**
- **Printsmarter token NOT rotated (S155, owner).** **Never put it in any summary or memory.**
- **#88 closed without root cause (S150, owner).** Read `docs/briefs/upload-failures.md` first.
- **No price rise at launch (S148, owner).**
- **Working assumption: 20% VAT on photo books (S145, owner).**
- **The live site stays `noindex` until launch (S144)** — TO-DOS #81.

## Next steps (priority order)
1. **Deploy `createUploadSession`** (command above), then one throwaway order to confirm the
   `Cover text:` block appears in the bucket.
2. **Send Xenia the cover-artwork brief** — two rules: (a) no customer-fillable text outlined
   into the artwork (album name, spine name, year), (b) artboard = trim 409×200mm with 18mm
   bleed in Document Setup. Both are written out in the S165 log.
3. **Guard test for baked-in placeholder text.** `npm test` catches a wrong viewBox but nothing
   catches artwork carrying caption text, and that reaches print. Proposed, not written.
4. **Verify `.rotate()` on HEIC** (carried from S164, now deployable-testable): order from an
   iPhone with deliberately rotated HEIC photos and open it in the staff engine. Untestable
   locally — sharp on Windows has no HEVC plugin.
5. **Test on a real Android device** — the open question is whether a Google Photos pick can
   arrive with no extension AND no MIME type. Claude can write the probe page in minutes.
6. **Tier 4 — customer-facing photo-format copy.** Spec in `docs/briefs/photo-formats.md`.
   Remove `JPEG or RAW both work`, state the list + 40 MB, warn about iCloud Shared Albums
   arriving at 2048px.
7. **Server-side validation in `functions/upload.js`** — it validates nothing. Own change, own
   deploy. **Do not** couple `confirmUpload` to derivative success (races `onFinalize`).
8. **Heirloom E2E + merge** — Stages 9 and 10 of `heirloom-build.md`, carried from S162/S163.
   Stage 10 still needs a second Cloud Run redeploy for the full-bleed reposition fix.
9. **Customer-preview must record caption line breaks** (engine-parity, open since S159).
10. **Nav wraps to two rows at ~900px** and buries 17px of the breadcrumb (S162).
11. **German order flow — TO-DOS #101.**
12. **Clean up the QA scripts (#60/#95)** — ~14 untracked one-offs remain in `qa/`.

## Open questions
- **Is Wander's trim 409mm or 408mm?** Owner's second export is 409 and matches every other
  template, so nothing is blocked — but Xenia has not confirmed it.
- **Does a Google Photos pick ever arrive with no extension AND no MIME type?** Needs the
  device test.
- **Does `.rotate()` double-rotate HEIC?** Expected no, **accepted on trust** — untestable
  locally.
- **Should existing derivatives be regenerated?** `.rotate()` only affects new uploads.
  Regenerating costs egress; default is to leave them.
- **TO-DOS had two items numbered 102** — the `[object Object]` one is renumbered 104 and
  marked DONE. Worth a scan for other collisions.
- **`assets/Aevia - Business case v10.xlsx` is tracked but missing from disk.**
- **The DE copy has never been read by a native speaker.**
- **Intro letter colour assumed `#7c746e`** — resolved for Beige (`#312128`); confirm with Xenia.
- **The Printsmarter button is visible on the staff dashboard** but cannot fire.
- **Pre-13-July Papercut orders have `name`/`year` swapped in Firestore.**
- **Approval overwrites staff edits blindly.**
- **Prices live in THREE places** — Stripe, `assets/js/prices.js`, `PRICE_BY_PAGE_COUNT`.
- **Android is entirely untested on real hardware.**
- **Staff test password is weak** for an account that can read real customer orders.
