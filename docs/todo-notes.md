# TO-DOS — detailed notes

> **What this is:** the long-form detail for backlog items whose full context does not live in a
> dedicated brief. `TO-DOS.md` is the scannable list; this is where an item's reasoning, ruled-out
> hypotheses and gotchas live so they do not clutter it.
>
> **Read the note before working an item.** Several record what was already tried and ruled out.
>
> Items with their own brief are NOT duplicated here — `TO-DOS.md` links straight to the brief.
> Created 2026-08-12 (S169) when `TO-DOS.md` was restructured.

---

## #83 — Drop the unused `captions_position` column from the sizing CSVs

S144, owner request. **Investigated and deliberately deferred — not a quick win.**

Verified safe in principle: no code reads `captions_position` (it appears only in the 6 CSVs and 2
historical planning docs), and `scripts/sync-joyride-csv.mjs` resolves columns *by header name*, not
position, so removing one does not shift anything.

What stopped it — the CSVs are not uniform:
- `Joyride_sizing_full.csv` is **comma**-delimited; the others are **semicolon**. Its title row still
  reads `Tender_sizing_full-2` from a copy-paste.
- Header widths differ: Wander/Tender/Papercut have 37 columns, Newborn/Scribble 36.
- The column is **not purely decorative** — most rows hold prose like `below (50mm from photo)`, but
  Functional rows hold `center`, a real distinct meaning.

Doing it properly = one pass normalising delimiter + title rows + column set across all 6, with a
render smoke test per template afterwards. A half-done pass on canonical print geometry risks a
silent bug that only appears in a printed book. Removal script drafted (scratchpad, dry-run clean on
5 of 6).

---

## #84 — Decide the fate of "Export book state (JSON)" in the engine

**It is not what feeds the PDF, and it looks like it is.** Two buttons write two different things:

- **"Save book state"** → `saveStaffState` → Firestore `staffBook*` → **this is what the cloud
  renderer reads.**
- **"Export book state (JSON)"** → in Order mode uploads `{folderName}/book-state.json` to GCS via
  `saveBookState`; in Local mode downloads the file to the browser.

Its only consumer is the **local CLI** (`npm run pdf -- AEV-XXX`, `fetchBookStateFromGCS`) — the one
path we deliberately never run, because it pulls originals out of GCS and bills egress.

S112 papered over the confusion with warning text rather than fixing the structure; the chunk-024
brief calls the Export-then-CLI flow "the #64 footgun". S145 weakened the case further: print mode
was the CLI's last exclusive capability and it now runs from the dashboard.

**Options:** (a) hide the button in Order mode, keep it in Local mode for offline/debug —
*recommended, kills the daily confusion without discarding a debug tool*; (b) drop the CLI order path
entirely and delete both the button and the `saveBookState` function.

Files: `pages/staff/template-engine.html` (~L1065 button, L1662 `exportToGCS`), `functions/index.js`
(`saveBookState` ~L515), `scripts/export-pdf.js` (`fetchBookStateFromGCS`).

---

## #85 — Update documented `gsutil` commands to `gcloud storage`

Google removes `gsutil` from the default Cloud CLI bundle in **March 2027** (email 2026-07-21,
project `aevia-uploads`).

**Impact is near-zero:** no production code calls `gsutil`. The app and functions use the
`@google-cloud/storage` **Node library** (an SDK, unaffected), the Cloud Run image installs no gcloud
CLI, and there is no CI using it. Every hit in the repo is a documented human-run command in
`LEARNINGS.md` and session logs. Evgeny's SDK is a tarball install, so bundled `gsutil` stops
receiving updates rather than disappearing.

**The only real risk** is copying a documented command into a fresh install where it no longer
exists — the CORS recipe especially, since it gets reached for in an emergency when uploads break
after a bucket change.

**Do:** rewrite the recipes in `LEARNINGS.md` (~L274-334) and the `project_bucket_cors` memory:

| Old | New |
|---|---|
| `gsutil cors get gs://B` | `gcloud storage buckets describe gs://B --format="default(cors_config)"` |
| `gsutil cors set f.json gs://B` | `gcloud storage buckets update gs://B --cors-file=f.json` |
| `gsutil -m cp -r` | `gcloud storage cp --recursive` |
| `gsutil -m rm -r` | `gcloud storage rm --recursive` |
| `gsutil ls -l` | `gcloud storage ls --long` |

No `-m` needed — `gcloud storage` parallelises by default. Verified S145: it already works on
Evgeny's machine.

---

## #89 — Order stuck at `uploading` is indistinguishable from one still uploading

S147, owner's call — deliberately deferred until #88's diagnostics came back so it did not muddy the
reproduction.

`uploading` currently means two opposite things: "working, wait" and "dead, never finishing". Staff
need opposite reactions and it is the same pixel — part of why #88 survived three test sessions
looking random.

**Plan:**
1. A real `upload_failed` status set by `reportUploadFailure`, which fires on an *observed* give-up
   event, not a timeout guess — label "Upload failed" in red on the dashboard.
2. A **derived** dashboard label for the case that cannot self-report (tab closed mid-upload →
   nothing ever calls the endpoint): render any `uploading` order older than ~30 min as "Upload
   incomplete". Derived at display time, so no new stored state, no sweep job, no background
   function. Even a 4 GB order finishes well inside 30 min.

**Keep "failed" out of customer-facing copy** — these orders never reached `confirmUpload` so no
confirmation email went out, but they can appear in a signed-in customer's account. Use something
like "Needs attention — we'll be in touch", matching the S114 `issue` → "Under review" pattern.

**Related, still live:** staff get the "New Order" email from `createUploadSession` *before any photo
uploads*, so AEV-073/074 both emailed staff about orders that never completed (failure mode D2 in
`docs/briefs/order-flow-failure-map.md` — Tier 2 moved only the *customer* email). The email says
"new order", so the dashboard has to be what says "except this one is broken".

---

## #90 — Orders stranded at `uploading` with no resume path

**S150: now reproducible on demand in ~30 s** — `node qa/p2-order-abuse.mjs scribble --refresh`
(QA case P2-10) refreshes mid-upload and reliably produces this state. It made **AEV-079**.

That closes the gap that made the open design question untestable: *should a customer be able to
resume a failed upload?* An answer can now be tried against a state we can recreate at will.

Two aggravating details it surfaced:
- Staff already hold a "New Order" email (sent by `createUploadSession` before any photo uploads).
- The refreshed page reads **"Choose a template first"** — the wizard has no memory of the order it
  just created, so from the customer's side the order simply vanished while Firestore still holds it.

**Stranded orders:** AEV-067, AEV-073, AEV-074 (S147) + AEV-079 (S150). All Xenia's mock orders, so
no customer harm today — but a real order in this state is invisibly broken: the customer got no
confirmation email, staff got a "New Order" email, and nothing reconciles the two.

Decide per order: delete (with its GCS folder) or re-upload the missing files and call
`confirmUpload`. Related: #60, #88, #89.

---

## #91 — Frontend libraries load from public CDNs, unpinned and unverified

S150, found incidentally while auditing frontend dependencies. Not a review finding — no evidence of
any problem today.

Six `<script>`/`<link>` tags fetch third-party JS at page load: `exifr`
(`customer-preview.html:16`, `spread-preview.html:37`, `staff/template-engine.html:16`),
`heic2any@0.0.4` (`spread-preview.html:38`), `@geoapify/geocoder-autocomplete@3` JS + CSS
(`account.html:114-115`).

**Zero `integrity=` attributes across all of `pages/`** — grep returns nothing. Two distinct
problems:
- **Version drift** — `exifr` has no version at all and Geoapify is a floating `@3`, so live
  behaviour can change with no commit on our side, and a local copy would still look fine while
  debugging.
- **No SRI + no pinning** — a compromised or hijacked CDN can run arbitrary JS on the order form and
  account page. Third: a CDN outage breaks those pages while our own hosting is healthy.

**Calibrate the risk honestly:** cards are entered on Stripe's domain (Payment Links), so this is
*not* card skimming. Real exposure is personal data on the order form, the Firebase auth token on
`account.html`, and link rewriting (repointing "Pay now" at a fake Stripe page).

**Recommended fix:** vendor all four libraries into `assets/js/` and serve from our own origin —
kills drift, third-party execution and outage risk in one move, and needs no build step (same
`<script>` tag, different path), so Invariant 1 is untouched. Pinning + SRI is the lighter
alternative but leaves the outage risk and needs re-hashing on every upgrade. ~1 hr, but touches
`order.html`/`customer-preview.html` so it needs a live-rig test of the upload + preview path.

**Related (S169):** the Geoapify key on `account.html:279` was flagged by an external secret scanner.
It is a public browser key, domain-restricted, working as designed — see the S169 session log.

---

## #92 — `confirmUpload` HTTP errors are treated as success

**FIXED S150 (`769b47e`) — awaiting live verification.**

**Fix:** `pages/order.html` only, no backend change, no redeploy. Check `res.ok`; retry 3× with
1s/3s backoff — safe because the handler is idempotent (returns 200 immediately when `uploadComplete`
is already true, `upload.js:311`). If all three fail, still show the success screen (photos are in
GCS, the customer can do nothing useful with the error) but POST to the existing
`reportUploadFailure` endpoint so the detail lands in `uploadErrors` for staff.

**Verify live:** place a test order, confirm the success screen still appears and the confirmation
email still arrives — the happy path is what the retry loop could plausibly break.

**Original finding (S150, independent Codex review, verified in code):** `pages/order.html:2531` did
`await fetch(CONFIRM_URL, …)` inside a try/catch. `fetch` only rejects on *network* failure — an HTTP
403 or 500 resolves normally and `res.ok` was never read, so the customer saw the success screen
while the order stayed at `status: uploading`.

**Severity was corrected down from High to Medium** on reading the handler: the Firestore update
(`status: 'new'`, `uploadComplete: true`) runs **before** the email send (`functions/upload.js:316-320`),
so the *likeliest* 500 — an SMTP failure — leaves the order correct and only loses the confirmation
email. The genuine stranding paths are narrower: a Firestore write failure, an unreachable function,
or a 403 token mismatch.

Independent of #88: no photo has to fail for this to happen. Related: #88, #89, #90.

---

## #93 — Main photos dedupe on filename alone

S150, independent Codex review, verified in code. `handleMainFiles()` at `pages/order.html:1858`
builds `existingNames` from `f.name` and filters any incoming file whose name already appears.

Two genuinely different photos both named `IMG_0001.JPG` (e.g. combined from two camera exports or
two folders) → the second is silently discarded, no warning, and the customer cannot reach the
required photo count.

The dedupe itself is deliberate and wanted — **the defect is narrower: name alone is being used as
identity.** Fix: key on `name + size + lastModified`. Low frequency but silent data loss when it
hits, and the customer has no way to understand why their count is short.

**Also noted while here, not worth its own item:** `mimeType()` at `pages/order.html:2691` has no
`png` in its extension fallback map, so a `.png` whose `File.type` is empty is declared `image/jpeg`
and stored in GCS with the wrong content type. Only fires when the browser reports no type (rare for
PNG). One-word fix whenever someone is next in that function.

---

## #97 — Re-check the other four covers after the S156 caption shift

S156. `drawCoverCaptions` never applied the front-panel shift that `renderCoverImage` applies to
front-panel photo slots when the spine widens, so printed front captions sat at the reference-spine
position. All five templates declare `referenceSpineMm: 9`, so **every** cover was affected: 1mm off
at 40pp (10mm spine), 5mm at 80pp (14mm).

Newborn exposed it because its name caption and cover photo share a centre (`xMm: 327`) — elsewhere
1mm reads as nothing, which is why Scribble and Tender passed their S153 "proven in print" sign-off
carrying it.

Fixed in `27ffeeb` (`coverCaptionShiftMm`, `tests/cover-caption-shift.test.js`) and verified in the
real AEV-087 PDF: photo centre 331.68mm vs captions at ~331.4/332.4mm against an expected 332.00mm.

**What is left is confirmation, not repair** — regenerate a cover for Scribble, Tender, Papercut and
Wander (80pp shows it most clearly) and check the front captions sit where the engine shows them.
Needs no redeploy. Both engines were always correct; only the PDF moved.

---

## #98 — Pre-13-July Papercut orders have `name`/`year` swapped in Firestore

**Order data, not template data — the S154 fix does not touch it.**

Before S124 (`fc45d3e`, 13 July) the Papercut cover form attached the label/placeholder/maxlength to
the wrong caption boxes, and critically put `maxLength: 10` on the album-name field. A 13-character
album name was therefore *physically impossible* to enter correctly, so anyone filling the form put
the name into the year field and vice versa. Every Papercut order created before that date is
affected. AEV-043 was corrected by hand in the engine during S154.

**Do:** check whether any real (non-test) Papercut orders exist from before 13 July; if so, swap
`coverCaptions.name` and `coverCaptions.year` on those documents. Low volume expected, likely zero.

---

## #99 — Approval overwrites staff edits with no merge or staleness check

`approveOrder` (`functions/index.js` ~L366) copies `customer*` → `staff*` field by field with a blind
overwrite. The renderer reads only `staffBook*`, so customer edits are correctly a draft until
approval — that part is by design.

**The gap: nothing compares `customerUpdatedAt` against the last staff save.** If a customer saves
changes, staff then edit and save in the engine, and the customer approves, the customer's older
snapshot silently discards the staff work. The reverse also holds: staff edits made after a customer
saved are invisible to the customer, who approves a book they never saw.

**Two proposals, neither built:**
- (a) show staff, next to *Generate PDF*, that unapproved customer edits exist and that the PDF will
  render the staff version;
- (b) warn or block at approval time when the customer's snapshot predates the last staff save.

(a) is cheaper and addresses the confusion that surfaced in S154.

---

## #100 — "Generate with AI" button on engine text-panel pages

**Needs a proper brief before any code — S158.**

Today staff polish the customer's raw answers by hand on every text-panel spread (Tender + Heirloom
"Our story": inputs "How you met" + "How your relationship started"; Heirloom intro is fixed house
copy and needs none).

Proposal: a button on the text panel that takes the customer's answers from `order.fpTexts` and
drafts the page copy in the template's voice, editable afterwards like any caption.

**Open questions the brief must settle:**
- Which model, and where it runs (a Cloud Function, not the browser — no API key client-side).
- Cost per draft and per order.
- The voice/length spec per template. Xenia's `assets/Template_Heirloom/Our Story Page_Text.txt` is
  the reference passage for Heirloom (~15 short lines) and the panel is a fixed 110×110mm box, so
  overflow is a real constraint.
- Whether staff can re-roll, and whether drafts are stored.
- What happens when the customer wrote nothing, or wrote in German.

Applies to `pages/staff/template-engine.html` text panels; mirror into `customer-preview.html` only
if customers ever see the button (probably not).

---

## #101 — German order flow: `pages/de/order.html` does not exist

**A German customer switches language mid-purchase.** Every DE product page sets
`orderUrl:'../order.html'`, so `de/heirloom.html`, `de/tender.html` and the rest hand off to the
**English** order form: field labels, hints, validation messages, the summary panel and the submit
confirmation are all EN. Pre-existing since the DE pages were built; surfaced in S162.

**Scope to settle in a brief, not to guess at:**
1. Mirror `order.html` as `pages/de/order.html` — but it is ~2500 lines with heavy inline JS, so a
   copy is a maintenance fork, and engine-parity has already bitten us twice (see LEARNINGS).
2. **Or** make the single `order.html` bilingual off a `?lang=de` param + a strings map, which avoids
   the fork but touches every label in the file. **Option 2 is the smaller long-term cost and the
   bigger one-off change.**
3. Either way: the customer-facing emails, `customer-preview.html` and the Stripe checkout locale are
   also EN today — decide whether "DE order flow" means the whole journey or just the form.

**Gate before shipping:** `npm run qa:order` must pass for both languages; add DE cases to
`qa/order-journey.mjs`. Blocks a real German launch, not the test rig.

---

## #102 — Verify the full-bleed reposition fix on real prints, all templates

**S163 fixed a PDF bug; the blast radius is unproven.**

`scripts/export-pdf.js` had three photo branches — heart, regular, full-bleed — and the full-bleed
one hardcoded sharp's `position:'centre'`, never reading `state.heartCrop`. It had been that way
since the branch was written (2026-05-26); #74 added crop handling to the other two in S50 and missed
it. Both engines apply `object-position` to any slot shape, so a repositioned photo looked right in
the staff engine and in customer-preview, then printed centred. Found by the owner eyeballing
Heirloom PDFs for AEV-091/092, where `FPhim` is full-bleed.

**Full-bleed slots by template:** Heirloom `FPhim`/`FPher` (all 4 colourways), Joyride `SP3`/`SP6`,
Scribble `FP2`, Papercut `FP2`, Tender `FPwords`. Scribble's and Papercut's are `pool:'regular'` — an
ordinary customer photo — so past orders are in scope, not just functional pages.

**Why nothing was noticed before (owner, S163): on a square full-bleed slot only ONE axis
overflows.** A portrait photo has zero horizontal slack, so sideways drags move nothing in any of the
three surfaces and all agree. Only a vertical drag on a portrait (or horizontal on a landscape)
diverges — and there it is large, ~40mm for a 50→15 offset (measured).

**Do at the Printsmarter first-samples run:** place one order per template, reposition the full-bleed
photo **on its overflowing axis**, and check the printed page against the engine.

**Note the fix is not byte-identical for un-repositioned photos** — `coverExtract` resizes-then-extracts
where sharp's `fit:'cover'` does one pass; measured delta max 2/255 on 0.7% of pixels, no geometric
shift. The pre-existing #74 comment claiming byte-identity on the regular-slot branch is therefore
also slightly wrong. Guard: `tests/photo-crop-paths.test.js`.

---

## #107 — `capture-cover-wrap.mjs` emits UI chrome in the texture

**The script's own docstring promises "no UI chrome, no surrounding margin" and it does not
deliver.** It screenshots the engine's `.cover-canvas` ELEMENT, which carries a 1px CSS frame border,
so at deviceScaleFactor 3 every capture has ~3px of chrome on each edge (6px at the bottom).

This was invisible for months because the flat composer's `resize(..., {fit:'cover'})` happened to
crop it away; when the S154 spine change altered the wrap aspect the crop shrank and the border
showed as a white strip along the bottom of live customer-facing mockups.

**Worked around, not fixed:** `scripts/lib/cover-wrap.mjs` `contentBox()` now trims it at consumption
time. Fix properly by clipping the screenshot to the canvas's CONTENT box (`boundingBox()` minus
`clientLeft`/`clientTop`), which also removes the ~0.17% aspect error the border introduces.

**Needs a re-capture to verify, which costs GCS egress — bundle with the next mockup run.**

Also note `mockups/<template>/front-new,back-new,hero,fp*,spread-*` appear to be referenced nowhere;
only `closed.webp` and the `exp2/` set are used. Worth confirming and deleting.

---

## #73 — Data-driven cover photo shape (clipShape) + cover orientation

**Enables non-rectangular cover photo cutouts** (e.g. "Little Annette" ornamental frame) without
per-template engine code. Three parts:

**(1) clipShape** — generalise the hardcoded heart clip-path into a data field. Today the heart
silhouette is a literal `path(...)` string in `template-engine.html:2348` (`slotDef.heartClip`
branch). Move it into template data (e.g. `slot.clipShape = '<svg path>'`) so any cover/slot can
carry its own silhouette; engine applies it as `clipPath`, reusing the existing
drag-to-reposition-inside-shape behaviour. **Mirror in all 3 surfaces** (engine,
`customer-preview.html`, `export-pdf.js` — PDF already clips the heart, so generalise its
`extract`/mask path too). Source of the path = a dedicated **silhouette layer** in Xenia's cover SVG
(she also keeps the decorative frame as its own layer, drawn over the photo edge).

**(2) orientation** — the cover CSV already has an `Orientation` column (Scribble = `horizontal`);
pipe it into `*-data.js` (`slot.orientation`) — currently only implied by `wMm>hMm`.

**(3) order-flow hint** — `order.html` shows an upload hint ("Choose a landscape photo for your
cover") driven by `slot.orientation`, and ideally warns if the uploaded cover photo's aspect is
wrong.

Optional CSV flag `Photo shape = rectangle|custom` to signal a silhouette layer exists (don't put the
path itself in CSV — extract from SVG). Blocked on Xenia's "Little Annette" CSV+SVGs. Precedent:
heart crop (#55).

---

## #67 — Rich-text caption editor: partial styling + robustness

The contenteditable caption editor can't style PART of a caption (e.g. bold "Day 1–3" while "Vienna"
stays regular) — styling applies to the whole field. Worse, users will instinctively press **Ctrl+B**
to bold a selection, and the editor behaves unpredictably (browser `execCommand` injects inconsistent
markup; our save/load may strip or mangle it).

**Fix:**
1. Decide the supported model — inline spans for bold/italic on selected runs, vs whole-field only.
2. Intercept Ctrl+B / Ctrl+I and normalise to our own markup.
3. Sanitise on paste + save so stored HTML is predictable.
4. Ensure engine ↔ customer ↔ PDF all render the same inline styles (parity).

**MUST include a proper automated test** exercising: select-and-bold a substring, Ctrl+B shortcut,
paste mixed formatting, save→reload round-trip, PDF render of the styled caption.

Editors: `pages/staff/template-engine.html` + `pages/customer-preview.html` (mirrored); PDF reader
`scripts/export-pdf.js`.

---

## #78 — Google Drive / Dropbox upload option

S140: product-page copy claims "We accept Google Drive, Dropbox, or direct upload" but `order.html`
only supports local file upload today. Copy left as aspirational — **must ship before real customers
land, or the copy must change.**

**Feasibility (checked S140): not hard, the existing pipeline does the heavy lifting.** Both pickers
just need to hand a File/Blob to the SAME existing flow (`checkResolution`, HEIC conversion,
thumbnailing, `createUploadSession`/`confirmUpload`) already built for local files — no new upload
pipeline needed.

- **Dropbox Chooser** — simplest: client-side widget only, no OAuth, just an app key. Days not weeks.
- **Google Drive Picker** — needs a Google Cloud OAuth client ID + the `drive.file` scope (narrow,
  does not trigger Google's sensitive-scope verification review) via `google.accounts.oauth2`, then
  the Picker widget + a token-authenticated fetch to pull the file bytes. More setup than Dropbox but
  still contained — no backend proxy required for this scope.

**Recommend Dropbox first** if only one ships before launch.

---

## Closed items worth not re-opening

### #88 — Photo upload fails intermittently; order strands at `uploading` — CLOSED S150

**Closed on the owner's call, root cause never proven.** Read `docs/briefs/upload-failures.md` before
reopening. Closed because Xenia had left the upload tab open for a very long time before submitting,
and a fresh order placed from scratch completed normally.

What S150 established, all worth keeping:
- **It was 100% deterministic, not intermittent** — AEV-073/074/075/076 are each missing exactly
  `special_pages/fp4.png` and nothing else, 4 for 4.
- **The template is ruled out** — Papercut and Scribble define FP4 identically (`count: 1`) and emit
  the identical object key through identical signing and transport code.
- **The file WAS sent** — `photoManifest` is built server-side from the client's `fileList`
  (`functions/upload.js:137-158`), so fp4 was in the payload and got a signed URL. A transport
  failure, not a slot-key bug.
- **The S147 diagnostics never saw a failure** — all five orders were created before `bde868b` landed
  the same day, so `uploadErrors: 0` is chronology, not a reporting gap.
- **It does not reproduce in Chromium** — AEV-080 completed cleanly.

**The one thing that still does not fit the closing explanation:** a stale tab or expired signed URL
should hit whichever files happen to be in flight, not the same slot four times out of four across
four separate submissions.

**If it recurs:** read `uploadErrors` (`node scripts/inspect-upload-failure.js AEV-0nn`) — now
populated — and get the exact source file Xenia used for FP4 "First steps"; that single file was the
untested variable.

### #106 — Orphan pages `sprout`, `horizon`, `terrain` — NOT A TASK

Raised and closed in S166 within minutes. `devotion.html` + `radiance.html` were deleted in S166
(`e4564a2`); S145's list was then carried forward and the other three filed for the same treatment.
**They do not exist** — they went during the German site rebuild (`c32990f`), long before S145's note
was written.

`docs/website-copy-deltas.md:235` and `docs/briefs/domain-migration.md:99` still name all four as
live orphans and are **stale on the same point**. Left as a marker: a stale note repeated across
three documents survived two sessions of being read.
