import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import path from 'path';

const OUT = path.resolve('sessions/qa-runs/map-smoke');
mkdirSync(OUT, { recursive: true });

const regions = ['EU', 'Asia', 'Africa', 'N.America', 'S.America', 'Oceania'];
const b = await chromium.launch();

for (const region of regions) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:8080/qa/map-smoke?region=${encodeURIComponent(region)}`,
               { waitUntil: 'load' });
  await p.waitForTimeout(1500);
  const info = await p.evaluate(() => ({
    svgLoaded: !!window.__svgLoaded,
    pins: window.__pinsPlaced,
    label: document.getElementById('label').textContent,
  }));
  const file = path.join(OUT, `${region.replace('.', '')}.png`);
  await p.locator('#canvas').screenshot({ path: file });
  console.log(JSON.stringify({ region, ...info, errs }));
  await p.close();
}
await b.close();
