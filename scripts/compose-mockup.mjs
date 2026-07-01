// compose-mockup.mjs — composite an engine spread into the open-book mockup using the
// PSD's REAL layer stack (assets/mockup example/open book.psd).
//
// Why the PSD and not the SVG: the SVG export flattened the blend-mode layers (the
// "Highlights"/"Shadows"/"Contrast" grades baked the original photos in), so the SVG
// can't be re-skinned. The PSD keeps them as proper light-only blend layers over white
// page bases. We extract each layer's pixels + blend mode via ag-psd, drop the customer
// spread into the two artwork slots (multiply), and rebuild the stack in sharp. All the
// physical realism (soft fold, page sheen, studio shadow, page-edge thickness) comes
// from the template's own light layers — we re-fake nothing.
//
// Usage: node compose-mockup.mjs <spread.png> <out.png>
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { createCanvas } from '@napi-rs/canvas';
import * as ag from 'ag-psd';

ag.initializeCanvas((w, h) => createCanvas(w, h));

const SPREAD = process.argv[2] || '../sessions/qa-runs/spread-newborn.png';
const OUT    = process.argv[3] || '../sessions/qa-runs/mockup-open.png';
const PSD    = '../assets/mockup example/open book.psd';
// Per-surface cover colours for the exposed board edges around the open spread. The book lies
// open, so the LEFT page's edge is the FRONT cover, the RIGHT page's edge is the BACK cover, and
// the centre fold is the SPINE. Sourced from cover.mockupEdges (passed as EDGE_* by compose-all);
// falls back to a single legacy colour (argv[4]/COVER_HEX) used uniformly for all three.
const hexRgb = (h) => ({ r: parseInt(h.slice(1,3),16), g: parseInt(h.slice(3,5),16), b: parseInt(h.slice(5,7),16) });
const FALLBACK = process.argv[4] || process.env.COVER_HEX || '#142a4f';
const FRONT = hexRgb(process.env.EDGE_FRONT || FALLBACK);
const BACK  = hexRgb(process.env.EDGE_BACK  || FALLBACK);
const SPINE = hexRgb(process.env.EDGE_SPINE || FALLBACK);

const psd = ag.readPsd(fs.readFileSync(path.resolve(PSD)), { skipCompositeImageData: false, skipThumbnail: true });
const W = psd.width, H = psd.height;

// Flatten the layer tree to a name→layer map (leaf layers only).
// Skip hidden layers — the PSD has hidden smart-object SOURCE layers ("Left page",
// "Right page" at 2539²) whose names collide with the visible multiply artwork slots.
const byName = {};
(function walk(ls) { for (const l of ls || []) { if (l.hidden) continue; if (l.children) walk(l.children); else byName[l.name] = l; } })(psd.children);

// A PSD layer's pixels as a {buffer,width,height,left,top} for sharp.
function layerRaw(name) {
  const l = byName[name];
  if (!l || !l.canvas) throw new Error('no pixels for layer: ' + name);
  const w = l.canvas.width, h = l.canvas.height;
  const data = l.canvas.getContext('2d').getImageData(0, 0, w, h).data;
  return { buffer: Buffer.from(data.buffer), width: w, height: h, left: l.left, top: l.top };
}
async function pngFromRaw(r) {
  return sharp(r.buffer, { raw: { width: r.width, height: r.height, channels: 4 } }).png().toBuffer();
}

// Backdrop: soft off-white (#f0f0f0, just below the paper tone so page/cover edges stay crisp on it), shared across all three mockups (closed/open/back). The contact shadow
// still renders via the multiply "Shadows" layer; "BG Highlights" (screen) is a no-op on white.
// Override with BG_R/BG_G/BG_B (pre-grade values) for a warm-grey backdrop matching
// front-new/back-new (#E3DFDA ≈ 227,223,218 post-grade). Default stays near-white.
const bg = (process.env.BG_R !== undefined)
  ? { r: Number(process.env.BG_R), g: Number(process.env.BG_G), b: Number(process.env.BG_B) }
  : { r: 240, g: 240, b: 240 };

// The two artwork slots. Each edge is sourced from whichever layer is correct for it:
//  - OUTER (fore) edges from the WHITE PAGE BASE ("Page left"/"Page right") — the multiply
//    artwork layers overhang the real page onto the cover (e.g. "Left page " starts at
//    x=397 vs the white page at x=409), which pushed the near-edge swallow off the page.
//  - GUTTER (spine) edges from the MULTIPLY layers ("Left page "/"Right page") — they
//    reach ~7px further into the fold; the page base stops short, leaving a white seam at
//    the crease. Hugging the fold matches how the original template fills the gutter.
const pgL = byName['Page left'],  mulL = byName['Left page '];   // note trailing space
const pgR = byName['Page right'], mulR = byName['Right page'];
const LEFT  = { left: pgL.left,  top: pgL.top, right: mulL.right, bottom: pgL.bottom }; // gutter on right
const RIGHT = { left: mulR.left, top: pgR.top, right: pgR.right,  bottom: pgR.bottom }; // gutter on left

// Page silhouettes are CURVED (open-book perspective): the page is tallest in the middle and
// shorter at the outer fore-edge, but the artwork slots above are axis-aligned RECTANGLES built
// from each layer's bounding box. So at the outer top/bottom corners the rectangle pokes past the
// real page edge and the multiply art spills onto the cover. Clip each art half to its real page
// shape: union of the white page base ("Page left/right", the curved silhouette) and the multiply
// layer ("Left page "/"Right page", which reaches into the fold) so corners are trimmed but the
// gutter still fills. Returns an absolute-pixel alpha sampler (0..255).
function alphaSampler(names) {
  const ls = names.map(layerRaw);
  return (ax, ay) => {
    let m = 0;
    for (const r of ls) {
      const lx = ax - r.left, ly = ay - r.top;
      if (lx >= 0 && ly >= 0 && lx < r.width && ly < r.height) { const a = r.buffer[(ly * r.width + lx) * 4 + 3]; if (a > m) m = a; }
    }
    return m;
  };
}
const maskLeft  = alphaSampler(['Page left', 'Left page ']);
const maskRight = alphaSampler(['Page right', 'Right page']);

// Customer spread → two halves resized to each artwork slot.
// The capture frames `.spread-pages`, which carries an asymmetric strip of container
// background (#fafafa ≈ 250,250,248) beyond the two real pages — measured ~168px on the
// RIGHT, 0 on the left. Splitting the raw frame at width/2 therefore lands ~80px RIGHT of
// the true gutter: the right page's inner strip is shoved into the fold AND the right slot
// inherits the container strip as a blank band on the fore-edge. So: detect the real
// content box (trim uniform container-bg margins on all four edges) and split THAT in half.
const img = sharp(SPREAD);
const meta = await img.metadata();
const { data: sd, info: si } = await img.clone().raw().toBuffer({ resolveWithObject: true });
const isContainer = (x, y) => {
  const i = (y * si.width + x) * si.channels;
  return Math.abs(sd[i] - 250) < 4 && Math.abs(sd[i+1] - 250) < 4 && Math.abs(sd[i+2] - 248) < 5;
};
// A row/column is "content" if it is NOT almost entirely container background.
const colContent = (x) => { let n = 0, t = 0; for (let y = 0; y < si.height; y += 6) { t++; if (!isContainer(x, y)) n++; } return n / t > 0.05; };
const rowContent = (y) => { let n = 0, t = 0; for (let x = 0; x < si.width; x += 6) { t++; if (!isContainer(x, y)) n++; } return n / t > 0.05; };
let cL = 0, cR = si.width - 1, cT = 0, cB = si.height - 1;
while (cL < cR && !colContent(cL)) cL++;
while (cR > cL && !colContent(cR)) cR--;
while (cT < cB && !rowContent(cT)) cT++;
while (cB > cT && !rowContent(cB)) cB--;
const contentW = cR - cL + 1, contentH = cB - cT + 1;
const gutter = cL + Math.floor(contentW / 2);   // split the REAL spread, not the raw frame
async function half(left, w, slot, mask) {
  const sw = slot.right - slot.left, sh = slot.bottom - slot.top;
  const { data } = await img.clone().extract({ left, top: cT, width: w, height: contentH })
    .resize(sw, sh, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // Clip to the page silhouette: scale each pixel's alpha by the mask at its absolute position.
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const i = (y * sw + x) * 4;
    data[i + 3] = Math.round(data[i + 3] * mask(slot.left + x, slot.top + y) / 255);
  }
  return { buffer: data, width: sw, height: sh };
}
const leftArt  = await half(cL, gutter - cL, LEFT, maskLeft);
const rightArt = await half(gutter, cR - gutter + 1, RIGHT, maskRight);

// Build the composite, bottom → top, honouring each layer's blend mode.
// (linear burn ≈ multiply for these soft shadow maps; sharp has no linear-burn.)
// Scale a raw RGBA layer's alpha by `op` (0..1) → softens its blend contribution.
// sharp's composite has no opacity option, so we bake opacity into the alpha channel.
function withOpacity(raw, op) {
  const d = raw.buffer;
  for (let i = 3; i < d.length; i += 4) d[i] = Math.round(d[i] * op);
  return raw;
}
// Neutralise a layer's colour to grey (rgb → luminance). The open-book "Shadows" layer carries
// a faint warm tint that reads as a pink wash on the white backdrop; this keeps the shadow but
// makes it neutral so all three mockups share an identical clean-white background.
function neutralize(raw) {
  const d = raw.buffer;
  for (let i = 0; i < d.length; i += 4) {
    const l = Math.round(0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2]);
    d[i] = d[i+1] = d[i+2] = l;
  }
  return raw;
}
// Tint a (greyscale) raw RGBA layer to `rgb`, preserving its per-pixel luminance as a
// brightness factor → keeps the layer's modelled form/shading but in the target hue.
// Used to colour the "Book" silhouette to the template's cover colour; the page layers
// drawn on top cover the interior, so only the exposed cover sliver/edges take the hue.
function tint(raw, rgb) {
  const d = raw.buffer;
  for (let i = 0; i < d.length; i += 4) {
    const f = d[i] / 255;
    d[i] = Math.round(rgb.r * f); d[i+1] = Math.round(rgb.g * f); d[i+2] = Math.round(rgb.b * f);
  }
  return raw;
}
// Region tint: colour each exposed Book pixel by which surface it belongs to, split on the
// book's vertical fold. Left of the fold → FRONT, right → BACK, the thin fold band → SPINE.
// `spineL/spineR` are absolute x of the gutter band (the inner page edges). Preserves each
// pixel's luminance as a brightness factor so the board's modelled shading survives.
function tintRegions(raw, spineL, spineR) {
  const d = raw.buffer;
  for (let i = 0; i < d.length; i += 4) {
    const absX = raw.left + ((i / 4) % raw.width);
    const rgb = absX < spineL ? FRONT : absX > spineR ? BACK : SPINE;
    const f = d[i] / 255;
    d[i] = Math.round(rgb.r * f); d[i+1] = Math.round(rgb.g * f); d[i+2] = Math.round(rgb.b * f);
  }
  return raw;
}
// Fold band = between the two pages' inner (gutter) edges; widen to a small fixed band if they
// meet/cross so the spine colour still reads.
let spineL = Math.min(LEFT.right, RIGHT.left), spineR = Math.max(LEFT.right, RIGHT.left);
if (spineR - spineL < 6) { const c = (spineL + spineR) / 2; spineL = c - 8; spineR = c + 8; }

const layers = [];
const add = (raw, blend) => layers.push({ input: raw.buffer ? raw.buffer : raw, ...(raw.width ? { raw: { width: raw.width, height: raw.height, channels: 4 } } : {}), left: raw.left || 0, top: raw.top || 0, blend });

// BG Highlights softened (was over-emphasising the top spine "bump" — issue #7).
add(withOpacity(layerRaw('BG Highlights'), 0.6), 'screen');
// Shadows softened: the PSD layer is LINEAR-BURN; multiply at full strength reads too
// dark/concentrated under the spine (issue #4). ~0.5 diffuses it toward linear-burn.
add(neutralize(withOpacity(layerRaw('Shadows'), 0.5)), 'multiply');
add(tintRegions(layerRaw('Book'), spineL, spineR), 'over'); // board edges: front (left) / spine (fold) / back (right)
add(neutralize(layerRaw('Back cover')), 'multiply'); // neutralised: its warm drop-shadow tinted the white backdrop pink
add(layerRaw('Pages'), 'over');
add(layerRaw('Page left'), 'over');
add(layerRaw('Page right'), 'over');
layers.push({ input: leftArt.buffer,  raw: { width: leftArt.width,  height: leftArt.height,  channels: 4 }, left: LEFT.left,  top: LEFT.top,  blend: 'multiply' });
layers.push({ input: rightArt.buffer, raw: { width: rightArt.width, height: rightArt.height, channels: 4 }, left: RIGHT.left, top: RIGHT.top, blend: 'multiply' });
add(layerRaw('Highlights'), 'screen');

const base = sharp({ create: { width: W, height: H, channels: 3, background: bg } });
const composed = await base.composite(layers).png().toBuffer();
// Final grade ≈ the PSD's skipped "Contrast" adjustment layer (a curves/levels adjustment
// with no extractable pixels). A gentle brighten + slight contrast + warm lifts the pages
// from grey/dim to a clean warm off-white (issue #5) without colour-casting the photos.
await sharp(composed)
  .linear(1.07, -4)                              // slight contrast + tiny lift
  .modulate({ brightness: 1.05, saturation: 1.03 })
  .png()
  .toFile(path.resolve(OUT));
console.log('wrote', OUT, '(bg', bg, ')');
