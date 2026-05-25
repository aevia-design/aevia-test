## 2026-05-22 — Print provider PDF requirements

**Content pages:** Each book page exported as its own PDF page (single pages, not spread pairs).
Page size 206×206mm = 200mm content + 3mm bleed on all 4 sides. Bleed is added by Puppeteer at
export time — 3mm of the page's bgColor extending beyond the rendered page canvas on all sides.
The SVG layout files are unchanged; bleed sits outside them.

**Cover:** Single wide PDF — back + spine + front on one canvas (Artboard 1.svg already has
this layout). Add 18mm bleed on all outer edges (top, bottom, left edge of back, right edge of
front). Total canvas with bleed: 445×236mm (200 back + 9 spine + 200 front + 18+18 bleed wide;
200 + 18+18 bleed tall). Spine width 9mm for current book size — may change for future templates.

**Key rule:** Bleed must be filled with the page's own background color, not white.

## 2026-05-25 — Order flow must be template-agnostic from day one

Everything in the pipeline (order form FP prompts, Firestore schema, engine order
loader, PDF exporter) is being built for Scribble first — but must not hardcode
Scribble-specific details. FP types, text prompts, photo slot counts, and accepted
FP keys all live in `scribble-data.js` (each template gets its own `<name>-data.js`).
New templates add a new data file; pipeline code needs no changes. Read from the
data file, never from `if (template === 'scribble')` branches.
