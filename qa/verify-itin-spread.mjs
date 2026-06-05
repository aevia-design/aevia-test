// Verify S35 #2 (structured itinerary lines) + #3 (rough spread preview) in the
// Wander order form: line inputs default to 3, cap at 7, feed the right-page text,
// and the spread shows a map page + itinerary page once a region is chosen.
import { chromium } from 'playwright';

const q = new URLSearchParams({
  template: 'Wander', category: 'adventures', pages: '40', price: '70',
  back: 'wander.html',
  addons: 'Travel map & itinerary', addon_inputs: 'map', addon_slugs: 'fp1',
});
const url = `http://localhost:8080/pages/order.html?${q.toString()}`;

const b = await chromium.launch();
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));

await p.goto(url, { waitUntil: 'load' });
await p.waitForTimeout(400);
await p.fill('#inp-name', 'Test Wanderer');
await p.fill('#inp-email', 'test@example.com');
await p.click('text=Continue').catch(() => {});
await p.waitForTimeout(400);

const defaultRows = await p.locator('#itin-list-fp1 input.itin-line').count();

// add countries → region map appears, spread renders
for (const c of ['France', 'Italy', 'Spain']) {
  await p.selectOption('#country-add-fp1', c).catch(() => {});
  await p.waitForTimeout(120);
}
await p.waitForTimeout(500);

// fill the 3 default itinerary lines
const inputs = p.locator('#itin-list-fp1 input.itin-line');
await inputs.nth(0).fill('Day 1: Arrival in Rome');
await inputs.nth(1).fill('Days 2–4: Dolomites');
await inputs.nth(2).fill('Days 5–6: Florence');
await p.waitForTimeout(200);

// click +Add until capped
for (let i = 0; i < 8; i++) {
  const btn = p.locator('#itin-add-btn-fp1');
  if (!(await btn.isVisible().catch(() => false))) break;
  await btn.click().catch(() => {});
  await p.waitForTimeout(60);
}
const cappedRows = await p.locator('#itin-list-fp1 input.itin-line').count();
const addBtnVisible = await p.locator('#itin-add-btn-fp1').isVisible().catch(() => false);

const info = await p.evaluate(() => {
  const canvas = document.getElementById('map-canvas-fp1');
  const itinPanel = document.getElementById('itin-text-fp1');
  const rightSvg = itinPanel?.parentElement?.querySelector('img')?.getAttribute('src') || null;
  return {
    hasMapCanvas: !!canvas,
    pins: canvas ? canvas.querySelectorAll('.map-pin').length : 0,
    hasItinPanel: !!itinPanel,
    rightPageSvg: rightSvg,
    itinPanelText: itinPanel ? itinPanel.innerText.replace(/\n/g, ' | ') : null,
  };
});

console.log(JSON.stringify({
  defaultRows, cappedRows, addBtnVisible, info, errs,
}, null, 2));
await b.close();
