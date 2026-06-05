// DOM-geometry inspection of the Wander FP1 map preview (S35 lesson: inspect the
// LIVE DOM first, don't pixel-detect the raw asset). Drives the order form to the
// country-select, then reports:
//   1. canvas vs overlay bounding rects + the overhang (crop) on each edge
//   2. the overlay PNG's natural dimensions + aspect ratio
//   3. where the brown frame band sits INSIDE the natural PNG (each edge), to tell
//      whether any unevenness is artwork (frame off-centre in the image) vs render.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import path from 'path';

const OUT = path.resolve('sessions/qa-runs/inspect-map-dom');
mkdirSync(OUT, { recursive: true });

const q = new URLSearchParams({
  template: 'Wander', category: 'adventures', pages: '40', price: '70',
  back: 'wander.html',
  addons: 'Travel map & itinerary', addon_inputs: 'map', addon_slugs: 'fp1',
});
// python http.server has NO clean-URL rewrite → must use the .html form (it keeps the query).
const url = `http://localhost:8080/pages/order.html?${q.toString()}`;

const b = await chromium.launch();
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));

await p.goto(url, { waitUntil: 'load' });
await p.waitForTimeout(600);

await p.fill('#inp-name', 'Test Wanderer').catch(() => {});
await p.fill('#inp-email', 'test@example.com').catch(() => {});
await p.click('text=Continue', { timeout: 3000 }).catch(() => {});
await p.waitForTimeout(500);

for (const c of ['France', 'Italy', 'Spain', 'Germany', 'Greece']) {
  await p.selectOption('#country-add-fp1', c).catch(() => {});
  await p.waitForTimeout(120);
}
await p.waitForTimeout(1000);

const info = await p.evaluate(async () => {
  const canvas = document.getElementById('map-canvas-fp1');
  if (!canvas) return { error: 'no canvas' };
  const overlay = canvas.querySelector('img:not(.map-pin)');
  if (!overlay) return { error: 'no overlay img' };
  const cr = canvas.getBoundingClientRect();
  const or = overlay.getBoundingClientRect();
  const round = (n) => Math.round(n * 100) / 100;

  // Crop / overhang on each edge: how far the overlay extends past the canvas.
  const overhang = {
    left:   round(cr.left - or.left),
    right:  round(or.right - cr.right),
    top:    round(cr.top - or.top),
    bottom: round(or.bottom - cr.bottom),
  };

  // Probe the brown frame band inside the NATURAL png via an offscreen canvas.
  const nat = { w: overlay.naturalWidth, h: overlay.naturalHeight };
  let frameInPng = null;
  try {
    const cv = document.createElement('canvas');
    cv.width = nat.w; cv.height = nat.h;
    const ctx = cv.getContext('2d');
    ctx.drawImage(overlay, 0, 0, nat.w, nat.h);
    const data = ctx.getImageData(0, 0, nat.w, nat.h).data;
    const px = (x, y) => { const i = (y * nat.w + x) * 4; return [data[i], data[i+1], data[i+2], data[i+3]]; };
    // "Frame" = any non-transparent, non-near-white pixel (the cream interior is
    // ~#f2ede3). Scan inward from each edge until we hit interior.
    const isFrame = (x, y) => {
      const [r, g, bl, a] = px(x, y);
      if (a < 30) return false;            // transparent margin
      return !(r > 225 && g > 220 && bl > 205); // not the cream sea
    };
    const fromLeft  = (y) => { let n = 0; while (n < nat.w && !isFrame(n, y)) n++; let f = 0; while (n + f < nat.w && isFrame(n + f, y)) f++; return { gap: n, band: f }; };
    const fromRight = (y) => { let n = 0; while (n < nat.w && !isFrame(nat.w-1-n, y)) n++; return n; };
    const fromTop   = (x) => { let n = 0; while (n < nat.h && !isFrame(x, n)) n++; return n; };
    const fromBot   = (x) => { let n = 0; while (n < nat.h && !isFrame(x, nat.h-1-n)) n++; return n; };
    const ys = [Math.round(nat.h*0.3), Math.round(nat.h*0.5), Math.round(nat.h*0.7)];
    const xs = [Math.round(nat.w*0.3), Math.round(nat.w*0.5), Math.round(nat.w*0.7)];
    const med = (a) => a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)];
    frameInPng = {
      // px of transparent/cream margin before the frame starts, each edge
      gapLeft:   med(ys.map(y => fromLeft(y).gap)),
      gapRight:  med(ys.map(fromRight)),
      gapTop:    med(xs.map(fromTop)),
      gapBottom: med(xs.map(fromBot)),
    };
  } catch (e) { frameInPng = { error: String(e) }; }

  return {
    canvas: { w: round(cr.width), h: round(cr.height), clientW: canvas.clientWidth, clientH: canvas.clientHeight },
    overlay: { w: round(or.width), h: round(or.height), natW: nat.w, natH: nat.h, natRatio: round(nat.w / nat.h),
               styleLeft: overlay.style.left, styleTop: overlay.style.top, styleW: overlay.style.width, styleH: overlay.style.height },
    overhang,
    frameInPng,
    src: overlay.getAttribute('src'),
  };
});

const out = JSON.stringify({ info, errs }, null, 2);
console.log(out);
import('fs').then(fs => fs.writeFileSync(path.join(OUT, 'result.json'), out));
await p.locator('#map-canvas-fp1').screenshot({ path: path.join(OUT, 'map-canvas.png') }).catch(() => {});
await b.close();
