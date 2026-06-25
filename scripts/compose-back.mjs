// compose-back.mjs — composite the FULL cover wrap (back|spine|front) onto the back-book
// mockup (assets/mockup example/back book.psd), which shows the book laid open flat with its
// OUTSIDE covers up (blue back cover left, front cover right). Sibling of compose-closed.mjs.
//
// Like the closed book, the spread is photographed at an angle, so we perspective-warp the
// flat wrap onto the book's outer-surface quad (detected from the "Pages" layer) and rebuild
// the light/shadow stack. The whole 409mm wrap maps onto the single open-spread quad.
//
// Input: a full cover-wrap PNG (back|spine|front) from qa/capture-cover-wrap.mjs.
// Usage: node compose-back.mjs <cover-wrap.png> <out.png>
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { createCanvas } from '@napi-rs/canvas';
import * as ag from 'ag-psd';

ag.initializeCanvas((w, h) => createCanvas(w, h));

const WRAP = process.argv[2] || '../sessions/qa-runs/cover-wrap-newborn.png';
const OUT  = process.argv[3] || '../sessions/qa-runs/mockup-back.png';
const PSD  = '../assets/mockup example/back book.psd';

const psd = ag.readPsd(fs.readFileSync(path.resolve(PSD)), { skipCompositeImageData: false, skipThumbnail: true });
const W = psd.width, H = psd.height;

const byName = {};
(function walk(ls) { for (const l of ls || []) { if (l.hidden) continue; if (l.children) walk(l.children); else byName[l.name] = l; } })(psd.children);

function layerRaw(name) {
  const l = byName[name];
  if (!l || !l.canvas) throw new Error('no pixels for layer: ' + name);
  const w = l.canvas.width, h = l.canvas.height;
  const data = l.canvas.getContext('2d').getImageData(0, 0, w, h).data;
  return { buffer: Buffer.from(data.buffer), width: w, height: h, left: l.left, top: l.top };
}
function withOpacity(raw, op) { const d = raw.buffer; for (let i = 3; i < d.length; i += 4) d[i] = Math.round(d[i] * op); return raw; }

// Backdrop: a soft warm greige surface the book sits on. Deliberately darker than the old
// near-white (#f0f0f0) so a LIGHT cover (e.g. Papercut's pale blue) reads as a distinct object
// instead of dissolving into the background at its edges. The final brightness grade lifts this
// ~15–20, so the pre-grade value is set low to land on a visible light grey. The contact shadow
// still renders via the multiply "Shadows" layer.
// Override with BG_GRAY=240 for a near-white backdrop matching the closed/open composers
// (e.g. Tender, whose cream cover suits a uniform white image set).
const _g = process.env.BG_GRAY ? Number(process.env.BG_GRAY) : null;
const bg = _g !== null ? { r: _g, g: _g, b: _g } : { r: 209, g: 206, b: 200 };

// Outer-surface quad from the blank "Pages" layer (axis-extreme corners of the tilted rect).
function coverQuad(name) {
  const l = byName[name];
  const w = l.canvas.width, h = l.canvas.height;
  const d = l.canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const L = l.left, T = l.top;
  let top = null, right = null, bot = null, left = null;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (d[(y * w + x) * 4 + 3] < 40) continue;
    const px = L + x, py = T + y;
    if (!top   || py < top[1])   top   = [px, py];
    if (!bot   || py > bot[1])   bot   = [px, py];
    if (!left  || px < left[0])  left  = [px, py];
    if (!right || px > right[0]) right = [px, py];
  }
  return { top, right, bot, left };
}
// Three placement quads, taken from the PSD's own shading layers (their alpha SHAPES mark
// exactly where each surface sits): back cover (left page), front cover (right page), and the
// thin spine fold between them. The "Pages" layer underneath is the photographed book body
// INCLUDING the page block, which shows below/around the covers → the open-book "folded" depth.
const Q_BACK  = coverQuad('Back cover'); // left page
const Q_FRONT = coverQuad('Cover');      // right page (the multiply "Cover" is last in the stack)
const Q_SPINE = coverQuad('Edge ');      // spine fold (trailing space in the layer name)

function solveHomography(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [u, v] = src[i], [x, y] = dst[i];
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); b.push(x);
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]); b.push(y);
  }
  for (let i = 0; i < 8; i++) {
    let p = i; for (let r = i + 1; r < 8; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
    for (let r = 0; r < 8; r++) {
      if (r === i) continue;
      const f = A[r][i] / A[i][i];
      for (let c = i; c < 8; c++) A[r][c] -= f * A[i][c];
      b[r] -= f * b[i];
    }
  }
  return b.map((v, i) => v / A[i][i]);
}

// Warp a flat art strip (own raw RGBA buffer, sw×sh) onto a destination quad. The quad's
// axis-extreme corners {top,right,bot,left} correspond to the art rect [TL,TR,BR,BL] — a
// correspondence proven by the original single full-wrap warp (ROT=0) and consistent for every
// sub-rectangle of the wrap since the covers share the spread's tilt.
function warpStrip(art, sw, sh, quad) {
  const dst = [quad.top, quad.right, quad.bot, quad.left];
  const SRC = [[0, 0], [sw, 0], [sw, sh], [0, sh]];
  const hi = solveHomography(dst, SRC);
  const minX = Math.max(0, Math.floor(Math.min(...dst.map(p => p[0]))));
  const maxX = Math.min(W, Math.ceil(Math.max(...dst.map(p => p[0]))));
  const minY = Math.max(0, Math.floor(Math.min(...dst.map(p => p[1]))));
  const maxY = Math.min(H, Math.ceil(Math.max(...dst.map(p => p[1]))));
  const ow = maxX - minX, oh = maxY - minY;
  const warped = Buffer.alloc(ow * oh * 4, 0);
  for (let y = minY; y < maxY; y++) {
    for (let x = minX; x < maxX; x++) {
      const w_ = hi[6] * x + hi[7] * y + 1;
      const u = (hi[0] * x + hi[1] * y + hi[2]) / w_;
      const v = (hi[3] * x + hi[4] * y + hi[5]) / w_;
      if (u < 0 || v < 0 || u >= sw - 1 || v >= sh - 1) continue;
      const x0 = Math.floor(u), y0 = Math.floor(v), fx = u - x0, fy = v - y0;
      const o = (y - minY) * ow * 4 + (x - minX) * 4;
      for (let c = 0; c < 3; c++) {
        const p00 = art[(y0 * sw + x0) * 4 + c], p10 = art[(y0 * sw + x0 + 1) * 4 + c];
        const p01 = art[((y0 + 1) * sw + x0) * 4 + c], p11 = art[((y0 + 1) * sw + x0 + 1) * 4 + c];
        warped[o + c] = (p00 * (1 - fx) + p10 * fx) * (1 - fy) + (p01 * (1 - fx) + p11 * fx) * fy;
      }
      warped[o + 3] = 255;
    }
  }
  return { warped, ow, oh, minX, minY };
}

// Wrap geometry: back 200mm | spine 9mm | front 200mm.
const wrap = sharp(WRAP);
const wm = await wrap.metadata();
const aw = wm.width, ah = wm.height;
const pxPerMm = aw / 409;
const sp0 = Math.round(200 * pxPerMm), sp1 = Math.round(209 * pxPerMm);
const extract = async (left, width) => wrap.clone().extract({ left, top: 0, width, height: ah }).ensureAlpha().raw().toBuffer();

const backArt  = await extract(0, sp0);
const spineArt = await extract(sp0, sp1 - sp0);
const frontArt = await extract(sp1, aw - sp1);

const back  = warpStrip(backArt,  sp0,        ah, Q_BACK);
const spine = warpStrip(spineArt, sp1 - sp0,  ah, Q_SPINE);
const front = warpStrip(frontArt, aw - sp1,   ah, Q_FRONT);

// Clip a warped strip's alpha to a layer's silhouette: zero any pixel that falls outside it.
// The "Edge " spine mask pokes a few px past the book body at the top of the fold (verified by
// overlaying it on "Pages"), so the warped spine "flies" outside the book. Clipping it to the
// Pages silhouette keeps the spine's shape and removes only the overshoot.
function clipTo(s, mask) {
  const a = (X, Y) => { const x = X - mask.left, y = Y - mask.top;
    if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return 0;
    return mask.buffer[(y * mask.width + x) * 4 + 3]; };
  for (let y = 0; y < s.oh; y++) for (let x = 0; x < s.ow; x++) {
    const o = (y * s.ow + x) * 4;
    if (s.warped[o + 3] && a(s.minX + x, s.minY + y) < 128) s.warped[o + 3] = 0;
  }
}
// Clip ALL three warped strips to the photographed book body ("Pages"). Each strip fills its
// own axis-extreme-corner parallelogram, which can poke a few px past the true tilted book edge
// — on a light cover (e.g. Papercut) the spilled cover-fill is lit near-white and vanishes, but
// any opaque decoration on it (a papercut shape, confetti dot) is left "floating" on the backdrop
// just outside the corner. Clipping to Pages removes only that overshoot; Pages encloses the
// covers, so no in-book pixels are lost.
clipTo(back,  layerRaw('Pages'));
clipTo(front, layerRaw('Pages'));
clipTo(spine, layerRaw('Pages'));

const layers = [];
const add = (raw, blend) => layers.push({ input: raw.buffer, raw: { width: raw.width, height: raw.height, channels: 4 }, left: raw.left || 0, top: raw.top || 0, blend });
const push = w => layers.push({ input: w.warped, raw: { width: w.ow, height: w.oh, channels: 4 }, left: w.minX, top: w.minY, blend: 'over' });

add(withOpacity(layerRaw('BG Highlights'), 0.6), 'screen');
add(withOpacity(layerRaw('Shadows'), 0.5), 'multiply');
add(layerRaw('Pages'), 'over');                          // book body incl. page block (shows underneath)
push(back);                                              // back cover → left page
push(front);                                             // front cover → right page
push(spine);                                             // spine strip (engine caption) → spine fold
add(layerRaw('Highlights'), 'screen');                   // cover sheen

const base = sharp({ create: { width: W, height: H, channels: 3, background: bg } });
const composed = await base.composite(layers).png().toBuffer();
await sharp(composed)
  .linear(1.07, -4)
  .modulate({ brightness: 1.05, saturation: 1.03 })
  .png()
  .toFile(path.resolve(OUT));
console.log('wrote', OUT, '(bg', bg, ') quads back/front/spine', Q_BACK.top, Q_FRONT.top, Q_SPINE.top);
