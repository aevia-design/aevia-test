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
// Cover colour for the exposed cover sliver/edges — the template's own cover colour.
// Default = Newborn cover (newborn-data.js cover.surfaces.front.bgColor #142a4f).
const COVER_HEX = process.argv[4] || process.env.COVER_HEX || '#142a4f';
const COVER = { r: parseInt(COVER_HEX.slice(1,3),16), g: parseInt(COVER_HEX.slice(3,5),16), b: parseInt(COVER_HEX.slice(5,7),16) };

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
const bg = { r: 240, g: 240, b: 240 };

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

// Customer spread → two halves resized to each artwork slot.
const img = sharp(SPREAD);
const meta = await img.metadata();
const halfW = Math.floor(meta.width / 2);
async function half(left, w, slot) {
  return img.clone().extract({ left, top: 0, width: w, height: meta.height })
    .resize(slot.right - slot.left, slot.bottom - slot.top, { fit: 'fill' }).png().toBuffer();
}
const leftArt  = await half(0, halfW, LEFT);
const rightArt = await half(halfW, meta.width - halfW, RIGHT);

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

const layers = [];
const add = (raw, blend) => layers.push({ input: raw.buffer ? raw.buffer : raw, ...(raw.width ? { raw: { width: raw.width, height: raw.height, channels: 4 } } : {}), left: raw.left || 0, top: raw.top || 0, blend });

// BG Highlights softened (was over-emphasising the top spine "bump" — issue #7).
add(withOpacity(layerRaw('BG Highlights'), 0.6), 'screen');
// Shadows softened: the PSD layer is LINEAR-BURN; multiply at full strength reads too
// dark/concentrated under the spine (issue #4). ~0.5 diffuses it toward linear-burn.
add(neutralize(withOpacity(layerRaw('Shadows'), 0.5)), 'multiply');
add(tint(layerRaw('Book'), COVER), 'over');   // cover silhouette tinted to the template cover colour
add(neutralize(layerRaw('Back cover')), 'multiply'); // neutralised: its warm drop-shadow tinted the white backdrop pink
add(layerRaw('Pages'), 'over');
add(layerRaw('Page left'), 'over');
add(layerRaw('Page right'), 'over');
layers.push({ input: leftArt,  left: LEFT.left,  top: LEFT.top,  blend: 'multiply' });
layers.push({ input: rightArt, left: RIGHT.left, top: RIGHT.top, blend: 'multiply' });
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
