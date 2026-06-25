## 2026-06-25 — Three PDF-renderer traps a new template hits (Tender, S81)

Bringing Tender live surfaced three issues that will recur for **every** future template. All
three only show up at the dashboard-PDF stage, never in `npm test` or the engine.

**1. The Cloud Run renderer is a SEPARATE deploy from the website.** Pushing to `main` deploys
the site (Cloudflare); it does **not** update the `aevia-pdf-renderer` Cloud Run container. A
newly-added template renders correctly in the engine but the **dashboard PDF comes out as the
wrong template** until you `gcloud run deploy aevia-pdf-renderer --source .` (it builds from the
working tree). Root cause was masked by a silent fallback: `setActiveTemplate()` in
`export-pdf.js` quietly defaulted to **Scribble** when it met an unknown template — so a stale
renderer produced a plausible-but-wrong PDF instead of an error. **Fixed:** an unknown-but-
specified template now `throw`s (`Unknown template "X"… renderer needs redeploy`); empty/legacy
book-state still defaults to Scribble. Lesson: silent "sensible default" fallbacks hide
deploy-skew — fail loud on an explicitly-requested-but-unknown value.

**2. The preview PDF can OOM Cloud Run on long/heavy books.** Each page is composited to a
full-resolution **lossless PNG** (~2433² at 300dpi) and embedded via `embedPng`, so the preview
PDF balloons (Tender 40pp = ~177 MB). The render holds every embedded page in memory; a 40-page
Tender with heavy 5.8 MB decorative SVGs **OOM-killed the 4 GB container at page 38/40**. The
signature: progress **freezes at 95%** (per-spread progress ends before the final spread +
silent `save()`+upload tail) and the log shows the render reaching the last spread then a fresh
`listening on port 8080` = container restart. **Not** a timeout (it died at ~3.5 min, far under
the 900s cap). Fix applied: bump `--memory 8Gi` (cost ≈ +$0.002/render — memory is billed per
GiB-second only during the ~3.5 min request, scales to zero idle). Real lever if it ever needs
one: embed the **preview** pages as JPEG (captions are vector pdf-lib text, untouched; print
path is separate) → ~177 MB → ~15-25 MB. Diagnose stall-at-95% from Cloud Run logs (timeout vs
OOM vs a thrown error swallowed by `onProgress`'s `catch(_){}`) before changing code.

**3. pdf-lib's `heightAtSize()` returns INVERTED ascent/descent for some fonts.** The rotated
**spine caption** centres across the band by offsetting the baseline by `(ascent−descent)/2`,
read from pdf-lib. For Parisienne (Tender) pdf-lib reports **asc 8.05 / desc 16.47 — backwards**
(every other spine font is correct), flipping the offset to −4.2pt and shoving the caption ~3 mm
off the band. The engine (browser metrics) centred it fine, so engine≠PDF. **Fixed:** read
ascent/descent from the underlying **fontkit** font (`font.embedder.font.ascent/descent /
unitsPerEm`) instead of `heightAtSize`. For Cormorant/Twinkle Star/NT Somic/EB Garamond fontkit
yields the *identical* value pdf-lib gave → shipped templates byte-unchanged; only Parisienne
corrected. **Method note (reinforces [[feedback_inspect_render_first]]):** I burned time
reasoning from font math that kept "proving" engine==PDF. The answer came from *measuring* —
browser `measureText` font/ink metrics, fontkit raw metrics, and pdf-lib `heightAtSize` side by
side. For any caption-position bug, measure all three renderers' metrics; don't reason from one.

## 2026-06-24 — Never render a book PDF locally without an explicit per-render go-ahead (egress)

S79 agent-failure: off a vague "let's go with stage 7" I ran a local PDF render
(`generatePdfFromFirestore` in a temp script). The local path downloads the order's
**full-resolution originals** from GCS = real **egress on Evgeny's Google bill** — exactly
what chunk-024's in-region Cloud Run renderer exists to avoid. PDF generation is the user's
job via the **dashboard "Generate PDF"** (in-region = egress-free). Rule (now also in the
`/add-template` skill + memory `feedback_no_local_pdf`): treat any local PDF render as a
billable action — "continue / go ahead with the stage" is NOT permission; require an explicit,
per-render go-ahead for the specific order. Generalises the CLAUDE.md cost-awareness rule to
the PDF leg. Engines are safe (they load cheap ~1600px derivatives); only the PDF needs originals.

## 2026-06-23 — A new GCS bucket needs its CORS policy copied, or browser `fetch()` breaks ("Failed to fetch")

S72's EU migration copied 9.22 GiB of photos US→EU but **not the bucket's CORS configuration**. Result (S73): loading a paid order into the staff engine threw *"Failed to fetch"*. Mechanism: order load calls `urlToFile()` → `fetch(signedUrl)` → `.blob()` (template-engine.html:4210) — a **cross-origin read** of a `storage.googleapis.com` URL from the `pages.dev` origin. The browser blocks the response unless the bucket returns CORS headers; the generic TypeError surfaces as "Failed to fetch". The old US bucket had `origin:["*"]` GET/PUT/OPTIONS; the new `aevia-uploads-eu` had none. Fix: `gsutil cors set <same-policy.json> gs://aevia-uploads-eu` (free, no egress, instant). Reusable rules:

1. **CORS is bucket-level config, separate from data + IAM.** Creating/migrating a bucket does NOT carry it over. Copy `gsutil cors get` → `gsutil cors set` as part of any bucket move.
2. **It hits both reads and writes.** PUT is in the policy because uploads (signed PUT from the order form) are also cross-origin — a missing policy breaks new orders too, not just order-load.
3. **Easy to misdiagnose.** The frontend never names the bucket (it uses opaque signed URLs), so "Failed to fetch" looks like auth/network/function-down. Distinguish: a real server error resolves with `res.status` ("Server error NNN"); a CORS/network failure rejects `fetch()` itself with TypeError "Failed to fetch". Only `<img src>` is CORS-exempt — JS reading bytes (`fetch`+`blob`, canvas) is not.

## 2026-06-23 — Low-res warnings must measure the ORIGINAL, not the web derivative

Since chunk-023 the engine + customer-preview load the ~1600px web derivative (egress optimisation). The engine's low-res check `Math.min(w,h) < 1500` then false-flagged **every** real-order photo (a 3:2 derivative's short edge ≈ 1066px), even when the upload was high-res — a yellow slot border + "⚠ Low res" badge on everything. Removed both visuals (engine + customer-preview, S73). **Rule: any print-resolution judgement must run on the original, not the derivative.** The genuine safeguard already lives at order-form upload (checks originals, threshold 1575px, warns the customer) and the PDF always renders from originals — so removing the engine/preview flag loses no real protection. If a working in-engine warning is ever wanted back, base it on original dimensions carried in the order payload, not the loaded derivative.

## 2026-06-22 — Papercut overlay z-order is per-spread via `overlayAbovePhotos` (and a single SVG can't be split by it)

`overlayAbovePhotos` is read by all 3 surfaces + PDF from the data file (one change propagates everywhere). Default/true → overlay `z-index:2` (above photos); `false` → `z-index:0` (behind). The **intentional "art behind photo" pages are SP4 + Cover only** — FP1 (heart) shipping with `false` was a stray value (S73 fix: → `true`). Gotcha codified S73: when a single SVG file contains BOTH a photo *backing* and *foreground* decorations (Papercut's `FP Birthday 02 Right.svg` = solid heart `#ddecf0` + balloons/clouds), one z-index flag can't separate them. If the photo is already independently clipped (engine `heartClip`), the solid backing is invisible under the photo → just delete the backing group from the SVG and set `overlayAbovePhotos:true`, rather than splitting the file into two layers across 4 code paths.

## 2026-06-23 — Async long-job pattern (Cloud Run render + Firestore-polled progress)

A Cloud Function cannot synchronously wait on a multi-minute job: gen-1 caps at 540s, and the PDF render is ~6m43s for 40 pages (≈13 min for 80). The S70 design had `generatePdf` await the render → it hit the 300s timeout while Cloud Run kept going and *succeeded* 2 min later (the browser saw "Failed to fetch"; the PDF was actually in GCS). Reusable fixes:

1. **Decouple via fire-and-confirm, not fire-and-await.** The function POSTs to Cloud Run **without awaiting completion** (`.catch(()=>{})`), then polls Firestore until the renderer writes `pdfRender.status='rendering'` (confirms start, absorbs cold starts), then returns 202. Cloud Run keeps running after the function disconnects — **a Cloud Run request handler continues to completion even after the client drops**, with CPU allocated *because the request is still active server-side*. This is why we did NOT need `--no-cpu-throttling` (which would bill idle instance time after a 202 — the real cost trap).

2. **Progress = Firestore field + dashboard poll.** Renderer writes `pdfRender:{status,done,total,sizeBytes,gcsPath}` per spread (throttled ~1/1.5s). New `getPdfStatus` function returns it and, when `done`, signs the preview URL (renderer still can't sign — no key). Dashboard polls every 2.5s → progress bar.

3. **CPU is cost-neutral for CPU-bound jobs.** Cloud Run bills vCPU-seconds, so 4 vCPU finishing in half the time ≈ same cost as 2 vCPU (both ~840 vCPU-s ≈ $0.024/render), just faster. Bumped to `--cpu 4`.

4. **Two unrelated bugs fixed en route to the timeout:** Cloud Run's Compute SA lacked Firestore/GCS roles (granted `datastore.user` + `storage.objectCreator`); and `console.log(...gcsUrlByName.size...)` threw in server mode (`gcsUrlByName` is null when `photoBufferMap` is set) — gate the log on `photoBufferMap` first.

5. **PowerShell comma gotcha:** `firebase deploy --only functions:a,functions:b` fails ("No function matches") because the `firebase.ps1` shim treats the unquoted comma as a PS array. Quote it: `--only "functions:a,functions:b"`, or deploy one at a time.

## 2026-06-23 — Crop offset (#74/#55) silently dropped on customer side for cover + special photos

The drag-to-reposition crop is keyed by photo **basename** (`heartCrop[name]`). The staff engine stores basenames; customer-preview was passing **full GCS paths** for cover + special (FP) photos, so `getHeartCrop('AEV-042/photos/special/fp1.jpg')` never matched the stored `fp1.jpg` key → always defaulted 50/50. Pool photos were already fixed (basename-stripped); cover + special were missed. Fix: wrap their names in the existing `_baseName()` helper at fetch time. **Rule: any photo name used as a crop/caption key must be basename-normalised on BOTH surfaces.**

## 2026-06-22 — Cloud Run signed-URL gotcha + porting a Node CLI to Cloud Run (chunk-024)

Two reusable lessons from moving `export-pdf.js` server-side:

1. **A Cloud Run service's default runtime SA cannot mint v4 signed URLs.** `getSignedUrl({version:'v4'})` with no key file needs the SA to have `roles/iam.serviceAccountTokenCreator` on itself (it doesn't by default) — otherwise it 500s. Two fixes: grant that role, OR don't sign in Cloud Run at all. We chose the latter: the renderer just uploads the PDF, and the `generatePdf` **Cloud Function** signs the URL (it has `serviceAccountKey.json`, a real private key). Cleaner — no IAM change, reuses the proven `getPdfUrl` signing pattern.

2. **`gcloud run deploy --source` only auto-detects a Dockerfile at the build-context ROOT.** A Dockerfile in a subdir (`services/pdf-renderer/`) is ignored → it silently falls back to buildpacks. Put the Dockerfile at repo root. And install npm deps at the image's `/app` root (not a subdir) so sibling required files (`scripts/export-pdf.js` requiring `sharp`/`pdf-lib`) resolve via `/app/node_modules` — Node walks up from each file's dir.

3. **Make the CLI importable without a rewrite:** guard the CLI arg-parsing + `main()` call behind `if (require.main === module)`, lift runtime config to module-level `let`s, add an exported async wrapper that sets them and calls `main()`. A `photoBufferMap` injection hook in `loadPhoto` lets the server pre-fetch photos in-region and bypass the signed-URL fetch. Server mode must also **skip `setupPhotoSource()`** (it would re-call `getOrder` over the internet) — gate it on the injected buffer map, not on `orderNumber`.

## 2026-06-22 — Back-filling web-res derivatives for existing orders (zero-egress recipe)

`generateDerivative` (chunk-023) only fires on NEW uploads (`onFinalize`). To give an
EXISTING order small previews without re-uploading and without internet egress, re-trigger
the function with an **in-cloud round-trip copy**:

```
# 1. Copy the order folder to a temp prefix whose path contains "/previews/"
#    → the function's isDerivativePath() guard SKIPS it (no junk derivatives made in temp):
gsutil -m cp -r gs://BUCKET/AEV-XXX gs://BUCKET/_rederive/previews/
# 2. Copy it BACK onto the real originals → overwrite fires onFinalize → derivatives generated:
gsutil -m cp -r gs://BUCKET/_rederive/previews/AEV-XXX gs://BUCKET/
# 3. Delete the temp prefix:
gsutil -m rm -r gs://BUCKET/_rederive
```

All three steps are server-side (in-cloud) → **no `Download Worldwide Destinations` egress**,
only cheap Class-A ops + function invocations. Verify with a 1:1 count of image originals vs
`/previews/` files. Two gotchas: (a) gsutil refuses an identical src==dst copy (`are the same
file — abort`), which is why the temp round-trip is needed; (b) the temp prefix MUST contain
the literal path segment `/previews/` or step 1 generates pointless derivatives in temp.
On this Windows box, set `CLOUDSDK_PYTHON` to the bundled interpreter first (memory
`reference_gcloud_python`). Bucket: `gs://aevia-uploads.firebasestorage.app`.

---

## 2026-06-22 — A split feature isn't "live" until BOTH halves are deployed

chunk-023's backend (`generateDerivative` + `getOrder` derivativeUrls) was deployed to
Firebase, but the FRONTEND that consumes `derivativeUrls` sat on an un-merged branch. The
live site therefore still served full-res originals — a full day of egress (3.59 GiB / €0.37)
after we believed the fix was working. The S65 verification looked fine because it was run
**locally with the branch checked out**, not against the live deployment.

**Rule:** for any feature split across backend (Firebase) and frontend (Cloudflare/main),
"deployed" means BOTH are live in the same place real users hit. Verify on the actual
deployed surface, not a local checkout. The deploy-ordering rule (backend first — S40) is
about safety; this is about not declaring victory at the halfway point.

---

## 2026-06-21 — Template `*-data.js` values that come from a CSV: CSV is source of truth

The `*-data.js` files (`wander-data.js`, `scribble-data.js`, `newborn-data.js`) are
**hand-synced from Xenia's delivered CSVs** (`assets/Template_*/*.csv`) — there is **no
CSV→JS generator**. So a value that exists in a CSV column (e.g. caption `halign`/`valign`
= `captions_Halignment`/`captions_Valignment` in `Wander_sizing_full.csv`) must be changed
in the **CSV first (or both together)**, never JS-only. A JS-only edit silently diverges
from the canonical CSV and is lost on the next re-sync, and the CSV stops being trustworthy.

**Rule:** before changing a data value, check if a CSV column holds it. If yes → edit the
CSV (and re-sync JS); also confirm with Evgeny whether *we* edit Xenia's CSV or hand it back
to her (she owns those files). Pure engine layout CONSTANTS that live only in JS (never in a
CSV) are exempt. Concrete instance: Wander itinerary `halign` center→left was done in both
the CSV and `wander-data.js` this session.

## 2026-06-17 — PDF dropped blank lines (paragraph spacing collapsed vs engine)

Staff/customers space paragraphs in a text panel (and per-photo captions) with **blank
lines** — the engine renders stored `\n\n` as `<br><br>`, a visible empty line that consumes
one line-height. The PDF was **deleting** empty lines in both render paths
(`scripts/export-pdf.js`): the text-panel wrap did `flatMap(l => l.trim() ? wrap(l) : [])`
and per-photo captions did `.split('\n').filter(l => l.trim())`. Both collapsed multi-paragraph
text into a single block — the Newborn Intro looked spaced on screen but cramped in print.

**Fix (generic, all templates):** preserve an empty line as a single blank line (`['']`)
instead of dropping it, so it reserves one line-height via the forEach index, and skip drawing
it (`if (!line.trim()) return;`). valign centering stays correct because blank lines now count
in the height measurement — matching the engine's flexbox centering of the full block.

**Rule:** any line-based PDF text rendering must keep empty lines as spacing. `.filter(l => l.trim())`
or a `: []` branch on a per-line map silently eats paragraph gaps. Leading *spaces* for indentation
do NOT work on either surface (HTML `white-space:normal` collapses them) — blank lines are the
only vertical-spacing lever, so they must survive into the PDF.

## 2026-06-16 — Caption / text-panel render bugs: pt-vs-px and dropped style fields

Captions — especially functional-page **text panels** (Newborn Intro/Labour, Wander
itinerary, Scribble birthday/funny-words) — are the most repeat-bug-prone area. Every
caption change touches FOUR paths that must agree: staff engine (`template-engine.html`),
customer preview (`customer-preview.html`), PDF (`scripts/export-pdf.js`), and the toolbar
live-apply. A bug = one path diverging. Session 47 hit two stacked on the Newborn Intro panel.

**Bug 1 — dropped style fields.** The text-panel render block read back only
font/sizePt/lineSpacing/letterSpacing from the style override, omitting **weight + italic**.
Staff looked italic (toolbar set it live on the element) but the customer rendered roman.
Fix: mirror the per-photo caption block — read all six fields with a CSV `style` fallback
(`style === 'italic'/'bold'/...`).

**Bug 2 — font-size formula divergence (the real root cause).** The toolbar live-apply used
`sizePt * SCALE * 25.4/72` px (canvas-scaled, correct) while the render used raw
`sizePt + 'pt'`. On our 3px/mm canvas, raw CSS `Npt` = N*96/72 px ≈ **26% too big** and
mismatched the PDF's true physical pt. Result: a size that "fit while editing" rendered
larger and overflowed on reload + on the customer side — looked like a staff↔customer
parity bug but was one engine disagreeing with itself. Fix: render uses the same
`sizePt * SCALE * 25.4/72` px formula in both engines (funnyWords panels stay `sizePt*SCALE`).

**Rules for future caption/special-page work:**
1. HTML canvas font-size is always `sizePt * SCALE * 25.4/72` px — never raw `pt`.
2. Toolbar live-apply and render formulas must be identical (else "fits while editing, wrong on reload").
3. Render must read back all six override fields (font, weight, italic, sizePt, lineSpacing, letterSpacing) with CSV fallback.
4. Customer style precedence: `customerCaptionStyles || staffSpreadCaptionStyles || {}`.
5. Override key = `slotIdx`; text panels use the literal key `'textPanel'` — toolbar write key and render read key must match.

**Fast debug:** `curl getOrder -H "X-Staff-Key: 865865" -d '{"orderNumber":"AEV-xxx"}'` to read
saved `staffSpreadCaptionStyles`, then Playwright-measure the LIVE customer render (computed
`fontSize`/`fontStyle`/box width) instead of guessing. "Same pt, different size" ⇒ formula
divergence (rules 1–2); "italic staff, roman customer" ⇒ missing field read-back (rule 3).

## 2026-06-04 — Wander region maps carry bleed IN the viewBox (render bleed-fit)

Unlike Scribble spreads + the Wander cover (content-only viewBox, `0 0 566.93` = 200mm),
the Wander **region map** SVGs (`FP 01 Map Left (*).svg`) are exported with 3mm bleed baked
into the viewBox: `0 0 583.937 583.937` (= 206mm at 72dpi). N.America is a raster export
(`0 0 4096 4096`, 206mm). The Right map (`FP 01 Map Right.svg`, `566.93`) is content-only.

**Consequence:** if a region map is sized to the 200mm content canvas (width:100%), the
206mm art is squashed → map at ~2.91 px/mm while pins are at 3 px/mm. Pins agree only at
centre and drift OUTWARD at the edges (≤~3mm). Symptom: edge-country pins (Iceland, Spain,
Turkey, Greenland…) sit off the landmass toward the canvas edge.

**Fix (used in `order.html` `renderRegionMap()`):** render the map overlay **bleed-fit** —
`width = height = (pageSize + 2·bleed)·scale` (206mm), offset `left = top = −bleed·scale`
(−3mm). The canvas clips the bleed. Then map art and pins share one scale (3 px/mm) and pins
land. `map-render.js` pin math already subtracts bleed for a content canvas — no pin change
needed. **When wiring the book render (engine/customer-preview/PDF), do the same; do NOT
content-fit region maps.** (Alternative would be asset-side: reframe the region viewBoxes to
content like the cover fix — not done; bleed-fit rendering chosen instead.)

Pin anchor convention: **centre** (coord = pin middle, not the teardrop tip).

## 2026-05-22 — Print provider PDF requirements (SUPERSEDED by 2026-05-27)

**Content pages:** Each book page exported as its own PDF page (single pages, not spread pairs).
Page size 206×206mm = 200mm content + 3mm bleed on all 4 sides.

**Cover:** Single wide PDF — back + spine + front on one canvas. 18mm bleed on all outer edges
(top, bottom, left edge of back, right edge of front). Total canvas with bleed: 445×236mm
(200 back + 9 spine + 200 front + 18+18 bleed wide; 200 + 18+18 bleed tall). Spine width 9mm
for current book size — may change for future templates.

**Page sizes still hold. The "bleed filled with bgColor" rule is wrong — see 2026-05-27 below.**

## 2026-05-27 — Bleed comes FROM the SVG, not from background colour extension

The SVG layout files Kseniia exports already contain the bleed artwork. They are designed so
decorative elements (scribbles, BG colour rects) intentionally extend past the content edge
into the bleed area. Reason: the print machine may crop 1mm above or below the registered
bleed line. By having artwork pre-extended into the bleed, the 200mm content area always
prints clean regardless of which way the trim lands.

**The catch:** the SVG's `viewBox` attribute clips this bleed artwork. Kseniia exports with
content-only viewBox (`0 0 566.93 566.93` = 200×200mm for spreads; `0 0 1159.37 566.93` =
409×200mm for cover), so the bleed-extending elements exist in the file but are not visible
unless we expand the viewBox before rendering.

**Concrete evidence:**
- Spread SVGs contain clipping rects at `x="-8.5" y="-8.5" width="583.94" height="583.94"`
  (= -3mm to 203mm in mm at 72dpi SVG user units). These permit decorations into the bleed
  but everything has `fill: none` — spreads are decorative-only overlays.
- Cover SVG contains `Back_BG_Color` rect at `-51.02,-51.02, 617.95×668.98`
  (= -18mm to 200mm × -18mm to 218mm — full back panel + left/top/bottom bleed filled with
  the back colour). `Spine_Color` rect covers spine width × full vertical bleed. No
  `Front_BG_Color` — front section bg comes from elsewhere.

**Rule:** Render every SVG with viewBox expanded by the bleed amount (3mm spreads / 18mm cover)
on each side, then output at the bleed-inclusive canvas size. The SVG provides:
- Spreads: any decorative scribbles that extend into bleed (currently subtle but correctness)
- Cover: back background colour + bleed extension, spine background colour + bleed extension

Code must still provide:
- Cover front section background colour and its right bleed (SVG has no Front_BG)
- Both: fallback background colour for areas the SVG leaves transparent (decorative spreads
  have transparent everything-except-scribbles)

**Implementation:** read SVG buffer → regex-replace viewBox → pass to sharp → render to full
bleed-inclusive output size at (0, 0). Composite order: canvas bg → photos → SVG on top
(SVG decorations may intentionally overlay photos). For cover, canvas bg = front colour, then
front section right-bleed rect → photo → SVG (SVG draws back+spine over canvas in their areas).

**Key rule:** SVG bleed is the source of truth. Background-colour extension is a fallback for
the front section only.

## 2026-05-25 — Order flow must be template-agnostic from day one

Everything in the pipeline (order form FP prompts, Firestore schema, engine order
loader, PDF exporter) is being built for Scribble first — but must not hardcode
Scribble-specific details. FP types, text prompts, photo slot counts, and accepted
FP keys all live in `scribble-data.js` (each template gets its own `<name>-data.js`).
New templates add a new data file; pipeline code needs no changes. Read from the
data file, never from `if (template === 'scribble')` branches.
