/**
 * compose-flat-mockup.mjs
 * Render a template's flat FRONT/BACK single-cover book mockups by reusing the
 * newborn PSD scene EXACTLY and changing only (a) the cover-face artwork and
 * (b) the front spine-sliver color. See docs/briefs/flat-mockup-compositor.md.
 *
 * Model (established empirically in S96 — see memory project_svg_flat_mockups):
 *   - `Main Image`  = white 3D-lit book FORM (the swap target / cover-face region).
 *   - `111` (front) / `""` (back) = flat printed artwork wrap [back|spine|front];
 *     its spine band renders in the composite as a thin light-blue (#c0d5ee)
 *     sliver at the book's LEFT fold (front view only; the back shows no blue spine).
 *   - `Layer 1` (multiply) + `Highlight` (screen ×0.145) = the baked 3D lighting.
 *   - `Shadow` + `BG texture` = drop shadow + backdrop.
 *
 * Pipeline per side:
 *   1. Base = the PSD composite (psd.canvas) — exact geometry/shadows/lighting.
 *   2. Paste the order's flat cover face over the Main Image region and re-apply
 *      Layer 1 (multiply) + Highlight (screen). This rebuilds the cover WITH the
 *      baked fold/crease shading, so the hinge crease becomes a darkened version of
 *      the NEW cover colour automatically (neutral on light covers — no blue tint).
 *      The thin spine sliver at the left fold is skipped so it survives the paste.
 *   3. (front only) Recolour the preserved spine sliver from newborn-blue to the
 *      template's spine colour, luminance-preserving. Identity for newborn.
 *
 * Order-independent: cover face comes from the order's cover-wrap; the scene +
 * spine recipe are template-level. Re-running newborn with a different order
 * reproduces the approved render with that order's photos.
 *
 * Usage: node scripts/compose-flat-mockup.mjs <order> <template>
 *   e.g. node scripts/compose-flat-mockup.mjs AEV-041 scribble
 */

import * as ag from 'ag-psd';
import { createCanvas } from '@napi-rs/canvas';
import sharp from 'sharp';
import { wrapGeometry } from './lib/cover-wrap.mjs';
import fs from 'fs';
import path from 'path';

ag.initializeCanvas(createCanvas);

// ── CLI args ──────────────────────────────────────────────────────────────────
const [order, template] = process.argv.slice(2);
if (!order || !template) {
  console.error('Usage: node scripts/compose-flat-mockup.mjs <order> <template> [--scratch]');
  process.exit(1);
}
const SCRATCH = process.argv.includes('--scratch'); // write PNG only, skip webp into assets

// ── Spine geometry (composite scene coords) ───────────────────────────────────
// The book is face-on with a perfectly vertical left fold (measured, constant
// across all rows): Main-Image left edge = x935; the light-blue spine sliver
// occupies x935..939 (5px); the front cover begins at x940.
//   Spine face  : x935..939  → repaint in the template's real spine colour
//                 (sampled per-order from the cover-wrap, NOT hardcoded),
//                 luminance-modulated so the baked 3D highlight survives.
//   Hinge groove: x940..GROOVE.xEnd → a soft darkening ramp on the pasted cover,
//                 deepest right against the spine and easing back to the cover.
//   This is scene-fixed geometry (same camera/book for every template), so it
//   needs no per-template tuning.
const FRONT_SPINE = { xLo: 935, xHi: 939 };
// Hinge joint = a soft SHADOW valley (the recess) followed by a subtle HIGHLIGHT
// (the raised cover edge catching light), both Gaussian so there is no hard line.
// Left→right across the cover: spine | shadow dip | highlight | flat cover.
// Scene-fixed (same camera/book for every template) → one rule for all fronts.
const GROOVE = {
  x0: 940, x1: 964,                                  // effect band, right of the 5px spine
  shadowAt: 943.5, shadowW: 3.6, shadowDepth: 0.26,  // recessed joint (multiply down ~26%)
  hiAt: 952,       hiW: 4.0,     hiAmp: 0.08,         // soft raised-edge highlight (up ~8%)
};
const NB_SPINE_LUM = 0.299 * 192 + 0.587 * 213 + 0.114 * 238; // ≈ 210 (newborn spine #c0d5ee)
// Back view: Xenia's mockup renders the back spine as the cover-coloured fold (no
// distinct spine colour); we leave it as-is — face-swap only, no back spine recolour.

// ── Paths ─────────────────────────────────────────────────────────────────────
const ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
// Heirloom: one order carries three monograms, each captured to a suffixed cover wrap
// (see qa/select-monogram.mjs). MONOGRAM selects which one to compose, and keeps the
// three sets of output PNGs apart. Empty = the plain single-cover order, as before.
const MONO   = (process.env.MONOGRAM || '').trim().toLowerCase();
const SUFFIX = MONO ? `-${MONO}` : '';
const coverWrapPath = path.join(ROOT, 'sessions/qa-runs', `cover-wrap-${order}${SUFFIX}.png`);
const psdFrontPath  = path.join(ROOT, 'assets/mockup example/new/front.psd');
const psdBackPath   = path.join(ROOT, 'assets/mockup example/new/back.psd');
const outDir        = path.join(ROOT, 'mockups', order + SUFFIX);
const webpDir       = path.join(ROOT, 'assets/images/mockups', template);

fs.mkdirSync(outDir, { recursive: true });
if (!SCRATCH) fs.mkdirSync(webpDir, { recursive: true });

// Cover wrap = [back|spine|front]. The face is 200mm of it, but the TOTAL is not fixed:
// the spine grew with page count in S154 (9mm authored, 10mm at 40pp, 14mm at 80pp), so a
// 409 constant slices the wrong column. The wrap is always 200mm TALL, so derive the total
// from the aspect instead of hardcoding it — correct at any spine width.
const FACE_W = 200;

function findLayer(layers, name) {
  for (const l of layers) {
    if (l.name === name) return l;
    if (l.children) { const r = findLayer(l.children, name); if (r) return r; }
  }
}

async function extractFace(coverWrapPath, side) {
  const box   = await wrapGeometry(coverWrapPath);
  const faceW = Math.round(FACE_W * box.pxPerMm);
  const left   = box.left + (side === 'front' ? box.width - faceW : 0);
  return sharp(coverWrapPath)
    .extract({ left, top: box.top, width: faceW, height: box.height })
    .resize(1128, 1127, { fit: 'cover' })
    .raw().toBuffer({ resolveWithObject: true });
}

// Sample the template's REAL spine colour from the cover-wrap's centre strip
// ([back|spine|front] → the spine is the middle band). Averaged over a small box
// around the centre to shrug off stray pixels. This replaces the old hardcoded
// per-template table, so each template picks up its own spine colour automatically.
async function sampleSpineColor(coverWrapPath) {
  const { data, info } = await sharp(coverWrapPath).raw().toBuffer({ resolveWithObject: true });
  const ch = info.channels;
  const cx = Math.round(info.width * 0.50), cy = Math.round(info.height * 0.50);
  const box = 6; // ±px
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = cy - box; y <= cy + box; y++) {
    for (let x = cx - box; x <= cx + box; x++) {
      const i = (y * info.width + x) * ch;
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
    }
  }
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}

async function composeSide(psdPath, faceRaw, faceCh, side, spineColor, outPng, outWebp) {
  console.log(`Compositing ${side}…`);
  const psd = ag.readPsd(fs.readFileSync(psdPath));
  const W = psd.width, H = psd.height;

  const miLayer = findLayer(psd.children, 'Main Image');
  const l1Layer = findLayer(psd.children, 'Layer 1');
  const hlLayer = findLayer(psd.children, 'Highlight');
  const mi = { x: miLayer.left, y: miLayer.top, w: miLayer.canvas.width, h: miLayer.canvas.height };

  const px = (layer) => ({
    data: layer.canvas.getContext('2d').getImageData(0, 0, layer.canvas.width, layer.canvas.height).data,
    x: layer.left, y: layer.top, w: layer.canvas.width, h: layer.canvas.height,
  });
  const l1 = px(l1Layer), hl = px(hlLayer);

  const sceneData = psd.canvas.getContext('2d').getImageData(0, 0, W, H).data;
  const out = Buffer.from(sceneData);
  const face = faceRaw;

  // ── Step 2: swap cover face into Main Image region + re-apply Layer 1 / Highlight
  for (let ly = 0; ly < mi.h; ly++) {
    for (let lx = 0; lx < mi.w; lx++) {
      const sx = mi.x + lx, sy = mi.y + ly;
      if (sx < 0 || sx >= W || sy < 0 || sy >= H) continue;

      // Skip the thin spine band (front only) so the sliver survives; it is
      // repainted in the template's spine colour in Step 3. The cover paste
      // begins cleanly at x940 (the measured cover edge).
      const paintAlpha = 1;
      if (side === 'front' && sx <= FRONT_SPINE.xHi) continue;

      const fi = (ly * mi.w + lx) * faceCh;
      const fa = faceCh === 4 ? face[fi + 3] : 255;
      if (fa === 0) continue;

      const oi = (sy * W + sx) * 4;
      // new cover pixel, shaded by Layer 1 (multiply) then Highlight (screen)
      let r = face[fi], g = face[fi + 1], b = face[fi + 2];

      const lx2 = sx - l1.x, ly2 = sy - l1.y;
      if (lx2 >= 0 && lx2 < l1.w && ly2 >= 0 && ly2 < l1.h) {
        const li = (ly2 * l1.w + lx2) * 4, la = l1.data[li + 3];
        if (la > 0) {
          const a = la / 255;
          r = r * (l1.data[li]     / 255) * a + r * (1 - a);
          g = g * (l1.data[li + 1] / 255) * a + g * (1 - a);
          b = b * (l1.data[li + 2] / 255) * a + b * (1 - a);
        }
      }
      const hx2 = sx - hl.x, hy2 = sy - hl.y;
      if (hx2 >= 0 && hx2 < hl.w && hy2 >= 0 && hy2 < hl.h) {
        const hi = (hy2 * hl.w + hx2) * 4, ha = hl.data[hi + 3];
        if (ha > 0) {
          const ea = (ha / 255) * 0.145;
          const sc = (base, ov) => (1 - (1 - base / 255) * (1 - ov / 255)) * 255;
          r = sc(r, hl.data[hi])     * ea + r * (1 - ea);
          g = sc(g, hl.data[hi + 1]) * ea + g * (1 - ea);
          b = sc(b, hl.data[hi + 2]) * ea + b * (1 - ea);
        }
      }

      // blend onto existing composite by paintAlpha (feather edge)
      out[oi]     = Math.round(r * paintAlpha + out[oi]     * (1 - paintAlpha));
      out[oi + 1] = Math.round(g * paintAlpha + out[oi + 1] * (1 - paintAlpha));
      out[oi + 2] = Math.round(b * paintAlpha + out[oi + 2] * (1 - paintAlpha));
      out[oi + 3] = 255;
    }
  }

  // ── Step 2b: recolour the book's bottom-edge bevel ──────────────────────────
  // The bevel rows just below the Main Image region render the newborn book's
  // bottom edge — a cool navy strip (plus any newborn cover element touching the
  // edge, e.g. a butterfly tip). On non-newborn templates that navy bleeds through.
  // Recolour ONLY the cool navy bevel pixels (b > r) to the new cover colour,
  // luminance-preserved. This follows the real corner geometry, keeps the white
  // edge highlight (warm/near-white) and the backdrop/shadow untouched, and is
  // order-independent. Identity for newborn (cover is navy).
  {
    for (let sy = mi.y + mi.h - 1; sy < Math.min(H, mi.y + mi.h + 10); sy++) {
      for (let lx = 0; lx < mi.w; lx++) {
        const sx = mi.x + lx;
        const oi = (sy * W + sx) * 4;
        const r = out[oi], g = out[oi + 1], b = out[oi + 2];
        if (!(b > r + 4 && b > 60)) continue;          // cool navy bevel only
        // new cover colour = face bottom-row pixel, shaded by the bevel's luminance
        const fi = ((mi.h - 1) * mi.w + lx) * faceCh;
        const cr = face[fi], cg = face[fi + 1], cb = face[fi + 2];
        const lumBevel = 0.299 * r  + 0.587 * g  + 0.114 * b;
        const lumCover = 0.299 * cr + 0.587 * cg + 0.114 * cb || 1;
        const s = lumBevel / lumCover;                 // carry the bevel shading
        out[oi]     = Math.min(255, Math.round(cr * s));
        out[oi + 1] = Math.min(255, Math.round(cg * s));
        out[oi + 2] = Math.min(255, Math.round(cb * s));
      }
    }
  }

  // ── Step 3: rebuild the left edge — spine face + hinge groove (front only) ────
  if (side === 'front') {
    // 3a. Spine face: recolour the preserved newborn sliver (x935..939) to the
    //     template's real spine colour, scaled by each pixel's luminance so the
    //     baked 3D highlight/shadow carries over (no flat paint).
    const { xLo, xHi } = FRONT_SPINE;
    for (let sy = mi.y; sy < mi.y + mi.h; sy++) {
      for (let sx = xLo; sx <= xHi; sx++) {
        const oi = (sy * W + sx) * 4;
        const r = out[oi], g = out[oi + 1], b = out[oi + 2];
        if (!((b - r) > 20 && b > 150 && g > r)) continue;   // light-blue spine family only
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const scale = lum / NB_SPINE_LUM;
        out[oi]     = Math.min(255, Math.round(spineColor.r * scale));
        out[oi + 1] = Math.min(255, Math.round(spineColor.g * scale));
        out[oi + 2] = Math.min(255, Math.round(spineColor.b * scale));
      }
    }

    // 3b. Hinge joint: a soft recessed groove (shadow valley) then a subtle raised-
    //     edge highlight, blended into the flat cover. Both are Gaussian, so the
    //     transition is gradient-based (no hard vertical line). The multiplier is
    //     template-independent: it darkens/lightens whatever cover colour is there,
    //     so it reads as a physical binding joint on light covers and stays near-
    //     identity on dark ones (newborn navy).
    const { x0, x1, shadowAt, shadowW, shadowDepth, hiAt, hiW, hiAmp } = GROOVE;
    const gauss = (x, c, w) => Math.exp(-(((x - c) / w) ** 2));
    for (let sy = mi.y; sy < mi.y + mi.h; sy++) {
      for (let sx = x0; sx <= x1; sx++) {
        const oi = (sy * W + sx) * 4;
        const r = out[oi], g = out[oi + 1], b = out[oi + 2];
        // skip grey backdrop — only shade cover pixels
        if (Math.abs(r - 156) < 12 && Math.abs(g - 152) < 12 && Math.abs(b - 147) < 12) continue;
        const f = 1 - shadowDepth * gauss(sx, shadowAt, shadowW)
                    + hiAmp      * gauss(sx, hiAt,     hiW);
        out[oi]     = Math.min(255, Math.max(0, Math.round(r * f)));
        out[oi + 1] = Math.min(255, Math.max(0, Math.round(g * f)));
        out[oi + 2] = Math.min(255, Math.max(0, Math.round(b * f)));
      }
    }
  }

  await sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toFile(outPng);
  console.log(`  → ${outPng}`);
  if (!SCRATCH) {
    await sharp(outPng).resize(1000).webp({ quality: 90 }).toFile(outWebp);
    console.log(`  → ${outWebp}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log(`\nGenerating mockups for ${order} / ${template}${SCRATCH ? ' (scratch)' : ''}`);
if (!fs.existsSync(coverWrapPath)) {
  console.error(`Cover wrap not found: ${coverWrapPath}`);
  process.exit(1);
}

const spineColor = await sampleSpineColor(coverWrapPath);
console.log(`Spine colour (from cover-wrap): rgb(${spineColor.r},${spineColor.g},${spineColor.b})`);

const front = await extractFace(coverWrapPath, 'front');
await composeSide(psdFrontPath, front.data, front.info.channels, 'front', spineColor,
  path.join(outDir, 'front-new.png'), path.join(webpDir, 'front-new.webp'));

const back = await extractFace(coverWrapPath, 'back');
await composeSide(psdBackPath, back.data, back.info.channels, 'back', spineColor,
  path.join(outDir, 'back-new.png'), path.join(webpDir, 'back-new.webp'));

console.log('\nDone.');
