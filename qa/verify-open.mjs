// Headless multi-angle screenshot of the OPEN-book harness (book-3d-open.html).
// Assumes a local server: npx serve . -p 8080
import { chromium } from '@playwright/test';
import path from 'path';
const BASE = process.env.BASE || 'http://localhost:8080';
const URL  = `${BASE}/prototypes/book-3d-open.html`;
const OUT  = path.resolve('sessions/qa-runs');
const browser = await chromium.launch();
const page = await browser.newContext({ viewport: { width: 1100, height: 800 }, deviceScaleFactor: 2 }).then(c => c.newPage());
page.on('pageerror', e => console.log('  pageerror:', e.message));
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
await page.waitForTimeout(1000);
// Hero = the harness's own fit() pose.
await page.evaluate(() => window.__three.renderer.render(window.__three.scene, window.__three.camera));
await page.waitForTimeout(150);
await page.screenshot({ path: path.join(OUT, 'open-hero.png') });
console.log('open-hero.png');
async function angle(name, az, el, dist) {
  await page.evaluate(({ az, el, dist }) => {
    const { camera, controls } = window.__three;
    const ty = controls.target.y;
    camera.position.set(Math.sin(az)*dist, ty + el*dist, Math.cos(az)*dist);
    camera.lookAt(0, ty, 0); controls.update();
    window.__three.renderer.render(window.__three.scene, camera);
  }, { az, el, dist });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(OUT, `open-${name}.png`) });
  console.log(`open-${name}.png`);
}
await angle('top', 0.0, 1.6, 4.6);
await angle('3q', 0.45, 0.55, 5.2);
await browser.close();
console.log('done');
