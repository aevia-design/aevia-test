// Shared geometry for reading a captured cover-wrap texture.
//
// The capture (qa/capture-cover-wrap.mjs) screenshots the staff engine's `.cover-canvas`
// ELEMENT, which carries a 1px CSS frame border. At deviceScaleFactor 3 that lands as a
// ~3px chrome band on each edge — not cover artwork. It used to disappear by accident in
// the flat composer, where resize(…, {fit:'cover'}) happened to crop it away; when the
// S154 spine change widened the wrap from 3681px to 3690px the crop shrank and the border
// survived as a white strip along the bottom of every mockup.
//
// The second trap is the wrap's total width. It was hardcoded as 409mm in both composers,
// but the spine is now page-count dependent (9mm authored, 10mm at 40pp, 14mm at 80pp), so
// the wrap is 409/410/414mm. A fixed 409 slices the front face 4px off at 40pp and 22px
// off at 80pp, pulling spine artwork onto the front cover. The wrap is always 200mm TALL,
// so derive the width from the aspect and it is right at any spine width.

import sharp from 'sharp';

const WRAP_H_MM = 200;   // a cover wrap is always 200mm tall (the book is square)
const MAX_CHROME = 12;   // backstop: never trim more than this many px from an edge

/**
 * The cover artwork's box inside a captured wrap, excluding the canvas border chrome.
 *
 * Each edge line is compared against a REFERENCE line taken well inside the image, and
 * trimmed only while they differ. Safe in both directions: with chrome present the
 * reference is artwork and the chrome differs, so it goes; on an already-clean capture the
 * edge line IS artwork and matches, so nothing is trimmed. A cover with a flat edge
 * (Papercut's is solid blue) therefore survives untouched.
 *
 * Compared by DOMINANT colour rather than exact equality — the corners carry a few
 * anti-aliased pixels that would otherwise defeat the match.
 */
export async function contentBox(file) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const at = (x, y) => { const i = (y * info.width + x) * ch; return `${data[i]},${data[i + 1]},${data[i + 2]}`; };
  const dominant = (n, horizontal) => {
    const counts = new Map();
    const len = horizontal ? info.width : info.height;
    for (let i = 0; i < len; i++) {
      const c = horizontal ? at(i, n) : at(n, i);
      counts.set(c, (counts.get(c) || 0) + 1);
    }
    let best = null, bestN = -1;
    for (const [c, k] of counts) if (k > bestN) { best = c; bestN = k; }
    return best;
  };

  const refTop = dominant(MAX_CHROME + 2, true);
  const refBot = dominant(info.height - MAX_CHROME - 3, true);
  const refLef = dominant(MAX_CHROME + 2, false);
  const refRig = dominant(info.width - MAX_CHROME - 3, false);

  let top = 0, bottom = info.height - 1, left = 0, right = info.width - 1;
  while (top < MAX_CHROME && dominant(top, true) !== refTop) top++;
  for (let n = 0; n < MAX_CHROME && dominant(bottom, true) !== refBot; n++) bottom--;
  while (left < MAX_CHROME && dominant(left, false) !== refLef) left++;
  for (let n = 0; n < MAX_CHROME && dominant(right, false) !== refRig; n++) right--;

  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

/**
 * Content box plus the derived scale: how many mm wide the wrap is, and px per mm.
 * `wrapMm` comes out ~410 for a 40pp capture and ~414 for 80pp, never assumed.
 */
export async function wrapGeometry(file) {
  const box = await contentBox(file);
  const wrapMm = box.width / box.height * WRAP_H_MM;
  return { ...box, wrapMm, pxPerMm: box.width / wrapMm };
}
