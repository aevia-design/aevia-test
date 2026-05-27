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
