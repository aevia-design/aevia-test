// compose-closed.mjs — composite an engine cover render into the CLOSED-book mockup using
// the PSD's real layer stack (assets/mockup example/closed book.psd). Sibling of
// compose-mockup.mjs (open book).
//
// The book is photographed AT AN ANGLE, so the front cover is a tilted quad, not an
// axis-aligned rectangle. The PSD places the cover design via a smart object whose
// perspective transform ag-psd does NOT expose. So we supply the warp ourselves: a
// 4-corner perspective (homography) mapping the flat front-cover artwork onto the book's
// top-face quad, then rebuild the light/shadow stack in sharp.
//
//   "Book"  = the blank white book body (cover board + page block), no design.
//   "Cover" = the flat, un-warped cover design (hidden smart-object content) — replaced.
//   top-face quad = detected from "Book"'s axis-extreme points (a rotated rectangle).
//
// Input: a full cover-wrap PNG (back|spine|front) as captured by qa/capture-cover-wrap.mjs.
//        Front cover = the last 200mm of the 409mm wrap.
// Usage: node compose-closed.mjs <cover-wrap.png> <out.png> [#coverhex]
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { createCanvas } from '@napi-rs/canvas';
import * as ag from 'ag-psd';

ag.initializeCanvas((w, h) => createCanvas(w, h));

const WRAP = process.argv[2] || '../sessions/qa-runs/cover-wrap-newborn.png';
const OUT  = process.argv[3] || '../sessions/qa-runs/mockup-closed.png';
const PSD  = '../assets/mockup example/closed book.psd';
// Cover colour for the exposed spine / board edges (template's own cover colour).
const COVER_HEX = process.argv[4] || process.env.COVER_HEX || '#142a4f';
const COVER = { r: parseInt(COVER_HEX.slice(1,3),16), g: parseInt(COVER_HEX.slice(3,5),16), b: parseInt(COVER_HEX.slice(5,7),16) };

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
function tint(raw, rgb) { const d = raw.buffer; for (let i = 0; i < d.length; i += 4) { const f = d[i]/255; d[i]=Math.round(rgb.r*f); d[i+1]=Math.round(rgb.g*f); d[i+2]=Math.round(rgb.b*f); } return raw; }

// Background colour from a corner of the flattened composite (periwinkle backdrop).
const comp = psd.canvas.getContext('2d').getImageData(8, 8, 1, 1).data;
const bg = { r: comp[0], g: comp[1], b: comp[2] };

// --- Cover top-FACE quad (the flat front surface, NOT the outer book silhouette).
// Calibrated from the example design baked into the PSD composite: the book's outer
// silhouette includes the cover-board thickness hanging below the near (front) edge, so the
// silhouette's bottom corner sits ~70px below the real top face. Mapping art there spilled
// onto the page block. These four corners are the actual top face. The PSD geometry is fixed
// and shared across ALL templates (only the printed wrap changes), so they're constants.
const q = { top: [1641, 361], right: [2465, 1086], bot: [1104, 1620], left: [410, 754] };
// Correspondence (flat front-cover art [artTL,artTR,artBR,artBL] → book top-face quad).
// ROT rotates the assignment so the design lands upright on the tilted face; ROT=3 is the
// correct orientation for this PSD (photo up, title below, spine to the left) — verified.
const ring = [q.top, q.right, q.bot, q.left];
const ROT = parseInt(process.env.ROT || '3', 10);
const DST = [0, 1, 2, 3].map(i => ring[(i + ROT) % 4]);

// --- Perspective solve: homography mapping srcPts → dstPts (8 coeffs).
// dx = (a·u+b·v+c)/(g·u+h·v+1),  dy = (d·u+e·v+f)/(g·u+h·v+1)
function solveHomography(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [u, v] = src[i], [x, y] = dst[i];
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); b.push(x);
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]); b.push(y);
  }
  // Gaussian elimination on the 8×8 system.
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
  const h = b.map((v, i) => v / A[i][i]);
  return h; // [a,b,c,d,e,f,g,h]
}

// Front cover = last 200mm of the 409mm wrap (back 200 | spine 9 | front 200), 9px/mm.
const wrap = sharp(WRAP);
const wm = await wrap.metadata();
const pxPerMm = wm.width / 409;
const frontX = Math.round((200 + 9) * pxPerMm);
const aw = wm.width - frontX, ah = wm.height;
const artBuf = await wrap.clone().extract({ left: frontX, top: 0, width: aw, height: ah }).ensureAlpha().raw().toBuffer();

// Warp the flat art onto the book top-face quad. We solve the INVERSE map (dst→src) so we
// can iterate output pixels and sample the source: solveHomography(DST_quad, art_rect).
const SRC = [[0, 0], [aw, 0], [aw, ah], [0, ah]];
const hi = solveHomography(DST, SRC);
const minX = Math.max(0, Math.floor(Math.min(...DST.map(p => p[0]))));
const maxX = Math.min(W, Math.ceil(Math.max(...DST.map(p => p[0]))));
const minY = Math.max(0, Math.floor(Math.min(...DST.map(p => p[1]))));
const maxY = Math.min(H, Math.ceil(Math.max(...DST.map(p => p[1]))));
const ow = maxX - minX, oh = maxY - minY;
const warped = Buffer.alloc(ow * oh * 4, 0);
for (let y = minY; y < maxY; y++) {
  for (let x = minX; x < maxX; x++) {
    const w_ = hi[6] * x + hi[7] * y + 1;
    const u = (hi[0] * x + hi[1] * y + hi[2]) / w_;
    const v = (hi[3] * x + hi[4] * y + hi[5]) / w_;
    if (u < 0 || v < 0 || u >= aw - 1 || v >= ah - 1) continue;
    // Bilinear sample.
    const x0 = Math.floor(u), y0 = Math.floor(v), fx = u - x0, fy = v - y0;
    const o = (oy => (oy * ow + (x - minX)) * 4)(y - minY);
    for (let c = 0; c < 3; c++) {
      const p00 = artBuf[(y0 * aw + x0) * 4 + c], p10 = artBuf[(y0 * aw + x0 + 1) * 4 + c];
      const p01 = artBuf[((y0 + 1) * aw + x0) * 4 + c], p11 = artBuf[((y0 + 1) * aw + x0 + 1) * 4 + c];
      warped[o + c] = (p00 * (1 - fx) + p10 * fx) * (1 - fy) + (p01 * (1 - fx) + p11 * fx) * fy;
    }
    warped[o + 3] = 255;
  }
}

// Build the composite, bottom → top.
const layers = [];
const add = (raw, blend) => layers.push({ input: raw.buffer, raw: { width: raw.width, height: raw.height, channels: 4 }, left: raw.left || 0, top: raw.top || 0, blend });

add(withOpacity(layerRaw('BG Highlights'), 0.6), 'screen');
add(withOpacity(layerRaw('Shadows'), 0.5), 'multiply');
add(layerRaw('Pages'), 'over');                          // page block fore-edge
add(tint(layerRaw('Book'), COVER), 'over');              // book body → cover colour (spine / board edges)
layers.push({ input: warped, raw: { width: ow, height: oh, channels: 4 }, left: minX, top: minY, blend: 'over' }); // warped cover design on the top face
add(withOpacity(layerRaw('Edge copy'), 0.45), 'multiply'); // spine / board-edge shading — softened so the edge reads as cover navy, not black
add(layerRaw('Highlights'), 'screen');                   // cover sheen over the design

const base = sharp({ create: { width: W, height: H, channels: 3, background: bg } });
const composed = await base.composite(layers).png().toBuffer();
await sharp(composed)
  .linear(1.07, -4)
  .modulate({ brightness: 1.05, saturation: 1.03 })
  .png()
  .toFile(path.resolve(OUT));
console.log('wrote', OUT, '(bg', bg, ') quad', DST);
