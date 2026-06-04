// Drives the Wander order form to the FP1 country-select and verifies the real
// region map + pins render in the order preview (chunk-022 integration).
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import path from 'path';

const OUT = path.resolve('sessions/qa-runs/map-smoke');
mkdirSync(OUT, { recursive: true });

const q = new URLSearchParams({
  template: 'Wander', category: 'adventures', pages: '40', price: '70',
  back: 'wander.html',
  addons: 'Travel map & itinerary', addon_inputs: 'map', addon_slugs: 'fp1',
});
// extensionless URL so `serve` keeps the query string
const url = `http://localhost:8080/pages/order?${q.toString()}`;

const b = await chromium.launch();
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));

await p.goto(url, { waitUntil: 'load' });
await p.waitForTimeout(600);

// step 1 — name/email
await p.fill('#inp-name', 'Test Wanderer');
await p.fill('#inp-email', 'test@example.com');
await p.click('text=Continue', { timeout: 3000 }).catch(() => {});
await p.waitForTimeout(500);

// add a few EU countries via the FP1 select
for (const c of ['France', 'Italy', 'Spain', 'Germany', 'Greece']) {
  await p.selectOption('#country-add-fp1', c).catch(() => {});
  await p.waitForTimeout(150);
}
await p.waitForTimeout(800);

const info = await p.evaluate(() => {
  const canvas = document.getElementById('map-canvas-fp1');
  return {
    state: window._fpCountries?.fp1 || null,
    hasCanvas: !!canvas,
    pins: canvas ? canvas.querySelectorAll('.map-pin').length : 0,
    overlaySrc: canvas?.querySelector('img:not(.map-pin)')?.getAttribute('src') || null,
  };
});
const region = await p.locator('#region-map-fp1');
await region.screenshot({ path: path.join(OUT, 'order-fp1-map.png') }).catch(() => {});
console.log(JSON.stringify({ info, errs }, null, 2));
await b.close();
