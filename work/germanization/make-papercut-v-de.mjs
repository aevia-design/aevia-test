// Papercut FP5 (Art) — generate the DE artwork for the VERTICAL photo layout.
//
// Xenia supplied one German file per side, drawn at the HORIZONTAL heading position.
// The vertical layout carries a 140mm-tall photo (vs 100mm), so its heading sits 5mm
// higher to clear it — in her own English pair, V is exactly H shifted up by 14.174
// user units (5.00mm at 566.929u / 200mm). Measured, not assumed: see the y-ranges in
// stage0-report.md. Dropping the H-positioned German heading on a V page overlaps the
// photo by 0.68mm, and this spread draws artwork ABOVE photos, so it would print.
//
// The shift is applied as a transform on the artwork group rather than by rewriting
// path data: identical result, no risk of misparsing curve commands.
//
// ⚠ If Xenia ever re-exports FP Art 09 Left-DE.svg / Right-DE.svg, RE-RUN THIS.
// Usage: node work/germanization/make-papercut-v-de.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const DIR = 'assets/Template_Papercut/SVG/FP Spread 5 Art/';
const SHIFT = -14.174; // user units = -5.00mm, measured from the EN H/V pair

for (const side of ['Left', 'Right']) {
  const src = readFileSync(`${DIR}FP Art 09 ${side}-DE.svg`, 'utf8');

  // Sanity: the source must be outlined artwork, not live text.
  if (/<text[\s>]/.test(src)) {
    throw new Error(`${side}-DE.svg contains live <text> — outline it before shifting.`);
  }

  // Wrap the artwork group in the vertical offset. The file's structure is
  // <svg><g id="b"><g id="c">…paths…</g></g></svg>; shifting the outer group moves
  // every glyph together.
  const out = src.replace(
    /<g id="b"([^>]*)>/,
    `<g id="b"$1 transform="translate(0 ${SHIFT})">`,
  );
  if (out === src) throw new Error(`${side}-DE.svg: could not find the <g id="b"> artwork group`);

  writeFileSync(`${DIR}FP Art 09 V ${side}-DE.svg`, out);
  console.log(`wrote FP Art 09 V ${side}-DE.svg (heading shifted ${SHIFT}u = -5mm)`);
}
