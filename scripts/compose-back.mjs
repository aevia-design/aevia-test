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

const comp = psd.canvas.getContext('2d').getImageData(8, 8, 1, 1).data;
const bg = { r: comp[0], g: comp[1], b: comp[2] };

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
const q = coverQuad('Pages');
const ring = [q.top, q.right, q.bot, q.left];
const ROT = parseInt(process.env.ROT || '0', 10);
const DST = [0, 1, 2, 3].map(i => ring[(i + ROT) % 4]);

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

// Whole wrap = source rectangle.
const wrap = sharp(WRAP);
const wm = await wrap.metadata();
const aw = wm.width, ah = wm.height;
const artBuf = await wrap.clone().ensureAlpha().raw().toBuffer();

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
    const x0 = Math.floor(u), y0 = Math.floor(v), fx = u - x0, fy = v - y0;
    const o = (y - minY) * ow * 4 + (x - minX) * 4;
    for (let c = 0; c < 3; c++) {
      const p00 = artBuf[(y0 * aw + x0) * 4 + c], p10 = artBuf[(y0 * aw + x0 + 1) * 4 + c];
      const p01 = artBuf[((y0 + 1) * aw + x0) * 4 + c], p11 = artBuf[((y0 + 1) * aw + x0 + 1) * 4 + c];
      warped[o + c] = (p00 * (1 - fx) + p10 * fx) * (1 - fy) + (p01 * (1 - fx) + p11 * fx) * fy;
    }
    warped[o + 3] = 255;
  }
}

const layers = [];
const add = (raw, blend) => layers.push({ input: raw.buffer, raw: { width: raw.width, height: raw.height, channels: 4 }, left: raw.left || 0, top: raw.top || 0, blend });

add(withOpacity(layerRaw('BG Highlights'), 0.6), 'screen');
add(withOpacity(layerRaw('Shadows'), 0.5), 'multiply');
add(layerRaw('Pages'), 'over');                          // blank cover surface
layers.push({ input: warped, raw: { width: ow, height: oh, channels: 4 }, left: minX, top: minY, blend: 'over' }); // warped wrap design
add(layerRaw('Edge '), 'multiply');                      // spine fold shading (note trailing space)
add(layerRaw('Highlights'), 'screen');                   // cover sheen

const base = sharp({ create: { width: W, height: H, channels: 3, background: bg } });
const composed = await base.composite(layers).png().toBuffer();
await sharp(composed)
  .linear(1.07, -4)
  .modulate({ brightness: 1.05, saturation: 1.03 })
  .png()
  .toFile(path.resolve(OUT));
console.log('wrote', OUT, '(bg', bg, ') quad', DST);
