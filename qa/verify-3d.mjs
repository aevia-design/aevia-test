// Headless multi-angle screenshot of the 3D book harness, so we can verify the
// front / back / spine faces without hand-driving the browser.
// Assumes a local server is running:  npx serve . -p 8080
import { chromium } from '@playwright/test';
import path from 'path';

const BASE = process.env.BASE || 'http://localhost:8080';
const URL  = `${BASE}/prototypes/book-3d-render.html`;
const OUT  = path.resolve('sessions/qa-runs');

const browser = await chromium.launch();
const page = await browser.newContext({ viewport: { width: 1100, height: 800 }, deviceScaleFactor: 2 }).then(c => c.newPage());
page.on('console', m => { if (m.type() === 'error') console.log('  console.error:', m.text()); });
page.on('pageerror', e => console.log('  pageerror:', e.message));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
await page.waitForTimeout(800);

// Orbit the camera around the (centred) book to face each side, then screenshot.
async function angle(name, az, el = 0.25, dist = 5.2) {
  await page.evaluate(({ az, el, dist }) => {
    const { camera, controls } = window.__three;
    camera.position.set(Math.sin(az) * dist, el * dist, Math.cos(az) * dist);
    camera.lookAt(0, 0, 0);
    controls.update();
    window.__three.renderer.render(window.__three.scene, camera);
  }, { az, el, dist });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, `3d-${name}.png`) });
  console.log(`📸 3d-${name}.png`);
}

// True hero view — the harness's own camera/pose, exactly what's shown in-app.
await page.screenshot({ path: path.join(OUT, '3d-hero.png') });
console.log('📸 3d-hero.png');

await angle('front', 0.5);     // three-quarter front (default-ish)
await angle('back', Math.PI - 0.5); // three-quarter back
await angle('spine', -1.45, 0.12, 5.2);   // looking at the -x spine side
await angle('spine-3q', -0.9, 0.18, 5.2);  // three-quarter showing front + spine
await angle('front-flat', 0.0, 0.05); // straight-on front for brightness check

await browser.close();
console.log('done');
