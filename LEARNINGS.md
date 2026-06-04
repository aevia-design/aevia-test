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
