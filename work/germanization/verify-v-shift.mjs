// Verifies the generated Papercut V DE artwork by MEASURING THE RENDER, not the source.
// Rasterises each SVG and finds the ink bounding box (first/last row containing a
// non-background pixel), then checks the German V heading sits at the same height as
// the English V heading and clears the 140mm portrait photo.
// Usage (dev server up): node work/germanization/verify-v-shift.mjs
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const DIR = 'assets/Template_Papercut/SVG/FP Spread 5 Art/';
const FILES = [
  'FP Art 09 H Left.svg', 'FP Art 09 V Left.svg',
  'FP Art 09 Left-DE.svg', 'FP Art 09 V Left-DE.svg',
  'FP Art 09 H Right.svg', 'FP Art 09 V Right.svg',
  'FP Art 09 Right-DE.svg', 'FP Art 09 V Right-DE.svg',
];
const PX = 600;               // render size
const MM = 200 / PX;          // mm per pixel

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: PX, height: PX } });
const rows = [];

for (const f of FILES) {
  // The harness must be served from the SAME origin as the SVGs, or the canvas is
  // tainted and getImageData throws.
  const rel = `../../${DIR}${f}`.replace(/ /g, '%20');
  writeFileSync(
    'work/germanization/_probe.html',
    `<body style="margin:0;background:#fff"><img id="i" width="${PX}" height="${PX}" src="${rel}"></body>`,
  );
  await p.goto('http://localhost:8080/work/germanization/_probe.html');
  await p.waitForFunction(() => { const i = document.getElementById('i'); return i.complete && i.naturalWidth; });
  await p.waitForTimeout(250);
  const box = await p.evaluate((PX) => {
    const c = document.createElement('canvas');
    c.width = c.height = PX;
    const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, PX, PX);
    x.drawImage(document.getElementById('i'), 0, 0, PX, PX);
    const d = x.getImageData(0, 0, PX, PX).data;
    let top = -1, bot = -1;
    for (let y = 0; y < PX; y++) {
      for (let xx = 0; xx < PX; xx++) {
        const i = (y * PX + xx) * 4;
        if (d[i] < 240 || d[i + 1] < 240 || d[i + 2] < 240) { if (top < 0) top = y; bot = y; break; }
      }
    }
    return { top, bot };
  }, PX);
  rows.push({ f, topMm: box.top * MM, botMm: box.bot * MM });
}

console.log('\nRendered heading position (mm from page top):');
for (const r of rows) console.log(`  ${r.f.padEnd(26)} ${r.topMm.toFixed(2)} → ${r.botMm.toFixed(2)}`);

// The V photo is 140mm tall, centred at y=100mm → its top edge is at 30mm.
const PHOTO_TOP_MM = 100 - 140 / 2;
let ok = true;
for (const side of ['Left', 'Right']) {
  const en = rows.find(r => r.f === `FP Art 09 V ${side}.svg`);
  const de = rows.find(r => r.f === `FP Art 09 V ${side}-DE.svg`);
  const drift = Math.abs(de.topMm - en.topMm);
  const clear = PHOTO_TOP_MM - de.botMm;
  const pass = drift < 1.0 && clear > 0;
  if (!pass) ok = false;
  console.log(
    `\n${side}: DE V top ${de.topMm.toFixed(2)}mm vs EN V ${en.topMm.toFixed(2)}mm ` +
    `(drift ${drift.toFixed(2)}mm) | clearance above photo ${clear.toFixed(2)}mm  ${pass ? '✅' : '❌'}`,
  );
}
await b.close();
console.log(ok ? '\nPASS — German V headings align with English V and clear the photo.' : '\nFAIL');
process.exit(ok ? 0 : 1);
