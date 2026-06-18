// compose-closed.mjs — composite an engine cover render into the CLOSED-book mockup using
// the PSD's real layer stack (assets/mockup example/closed book.psd). Sibling of
// compose-mockup.mjs (open book). We drop the customer's FRONT cover into the "Cover"
// multiply slot and rebuild the light/shadow stack in sharp.
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

const comp = psd.canvas.getContext('2d').getImageData(8, 8, 1, 1).data;
const bg = { r: comp[0], g: comp[1], b: comp[2] };

// Front cover = last 200mm of the 409mm wrap (back 200 | spine 9 | front 200), 9px/mm.
const wrap = sharp(WRAP);
const wm = await wrap.metadata();
const pxPerMm = wm.width / 409;
const frontX = Math.round((200 + 9) * pxPerMm);
const COVER_SLOT = byName['Cover']; // multiply slot for the front cover face
const coverArt = await wrap.clone()
  .extract({ left: frontX, top: 0, width: wm.width - frontX, height: wm.height })
  .resize(COVER_SLOT.right - COVER_SLOT.left, COVER_SLOT.bottom - COVER_SLOT.top, { fit: 'fill' })
  .png().toBuffer();

const layers = [];
const add = (raw, blend) => layers.push({ input: raw.buffer, raw: { width: raw.width, height: raw.height, channels: 4 }, left: raw.left || 0, top: raw.top || 0, blend });

add(withOpacity(layerRaw('BG Highlights'), 0.6), 'screen');
add(withOpacity(layerRaw('Shadows'), 0.5), 'multiply');
add(layerRaw('Pages'), 'over');
add(tint(layerRaw('Book'), COVER), 'over');             // book silhouette → cover colour (spine / edges)
add(layerRaw('Edge copy'), 'multiply');                  // spine / page-edge shading
layers.push({ input: coverArt, left: COVER_SLOT.left, top: COVER_SLOT.top, blend: 'multiply' });
add(tint(layerRaw('Back cover color'), COVER), 'multiply'); // cover-colour tint on exposed edges
add(layerRaw('Highlights'), 'screen');

const base = sharp({ create: { width: W, height: H, channels: 3, background: bg } });
const composed = await base.composite(layers).png().toBuffer();
await sharp(composed)
  .linear(1.07, -4)
  .modulate({ brightness: 1.05, saturation: 1.03 })
  .png()
  .toFile(path.resolve(OUT));
console.log('wrote', OUT, '(bg', bg, ')');
