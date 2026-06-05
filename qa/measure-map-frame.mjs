// Measure the EU region map's frame symmetry.
// Renders the raw SVG at 618×618 (the engine's map size: 206mm × 3px/mm),
// then scans horizontal + vertical lines and reports the brown frame-band
// width on each edge. If left≈right and top≈bottom → artwork is centred and
// any visible asymmetry is in our clip/offset. If they differ → the artwork
// itself is off-centre (re-export needed).
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('../assets/Template_Wander/FP Spread 1/FP 01 Map Left (EU).svg');
const svgB64 = fs.readFileSync(svgPath).toString('base64');
const svgUrl = 'data:image/svg+xml;base64,' + svgB64;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 700, height: 700 });

const result = await page.evaluate(async (url) => {
  const SIZE = 618; // engine map img size in px
  const img = new Image();
  img.width = SIZE; img.height = SIZE;
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const cv = document.createElement('canvas');
  cv.width = SIZE; cv.height = SIZE;
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0, SIZE, SIZE);
  const data = ctx.getImageData(0, 0, SIZE, SIZE).data;

  const px = (x, y) => { const i = (y * SIZE + x) * 4; return [data[i], data[i+1], data[i+2]]; };
  // Frame brown is ~#a38565 (163,133,101). Treat a pixel as "frame" if it's
  // close to that brown (the interior sea/cream is much lighter).
  const isFrame = (x, y) => {
    const [r, g, b] = px(x, y);
    return Math.abs(r - 163) < 40 && Math.abs(g - 133) < 40 && Math.abs(b - 101) < 45;
  };
  // Count contiguous frame pixels inward from an edge along a line.
  const bandFromLeft  = (y) => { let n = 0; while (n < SIZE && isFrame(n, y)) n++; return n; };
  const bandFromRight = (y) => { let n = 0; while (n < SIZE && isFrame(SIZE-1-n, y)) n++; return n; };
  const bandFromTop   = (x) => { let n = 0; while (n < SIZE && isFrame(x, n)) n++; return n; };
  const bandFromBot   = (x) => { let n = 0; while (n < SIZE && isFrame(x, SIZE-1-n)) n++; return n; };

  // Sample several lines, avoiding the title band (top ~60px) and pins.
  const ys = [120, 200, 300, 400, 500];
  const xs = [120, 200, 300, 400, 500];
  const med = (a) => a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)];

  return {
    left:   med(ys.map(bandFromLeft)),
    right:  med(ys.map(bandFromRight)),
    top:    med(xs.map(bandFromTop)),
    bottom: med(xs.map(bandFromBot)),
    perLineLR: ys.map(y => ({ y, left: bandFromLeft(y), right: bandFromRight(y) })),
  };
}, svgUrl);

console.log('Map size rendered: 618px (= 206mm @ 3px/mm). 1mm = 3px. Our clip removes 9px (3mm) each side.');
console.log('Frame brown band widths (px):');
console.log('  LEFT  :', result.left,  '=>', (result.left/3).toFixed(1),  'mm');
console.log('  RIGHT :', result.right, '=>', (result.right/3).toFixed(1), 'mm');
console.log('  TOP   :', result.top,   '=>', (result.top/3).toFixed(1),   'mm');
console.log('  BOTTOM:', result.bottom,'=>', (result.bottom/3).toFixed(1),'mm');
console.log('  L-R diff:', (result.left - result.right), 'px =', ((result.left-result.right)/3).toFixed(1), 'mm');
console.log('per-line L/R:', JSON.stringify(result.perLineLR));

await browser.close();
