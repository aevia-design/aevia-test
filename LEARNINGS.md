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
