// Session 33 verification — Wander FP1 map renders in the staff engine book.
// Loads Wander, enables FP1, adds photos, injects a map selection, re-renders,
// and inspects the FP1 left page for the region SVG overlay + pins.
import { chromium } from 'playwright';
import { readdirSync } from 'fs';
import path from 'path';

const PHOTO_DIR = path.resolve('sessions/qa-runs/wander-debug');
const files = readdirSync(PHOTO_DIR).filter(f => f.endsWith('.jpg')).map(f => path.join(PHOTO_DIR, f));

const b = await chromium.launch();
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));

await p.goto('http://localhost:8080/pages/staff/template-engine.html', { waitUntil: 'load' });
await p.waitForTimeout(800);
await p.selectOption('#template-select', 'Wander');
await p.waitForTimeout(300);
// Enable FP1 (the map page) if a checkbox exists
await p.evaluate(() => {
  const cb = document.querySelector('input[name="fp"][value="FP1"]');
  if (cb && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }
});
await p.waitForTimeout(300);
await p.setInputFiles('#photo-file-input', files);
await p.waitForTimeout(2500);

// Force the FP1 map spread into the book (Wander FP1 is order-only, no local
// checkbox) and inject a map selection the way loadOrderIntoEngine would.
await p.evaluate(() => {
  window._wanderMap = { region: 'EU', countries: ['France', 'Italy', 'Spain', 'Germany', 'Greece'] };
  window.bookCaptions = { 0: { right: { textPanel: 'Vienna → Hallstatt → Salzburg' } } };
  window._restoreState = { sequence: ['FP1'], assignments: {}, captions: window.bookCaptions };
  renderBook();
});
await p.waitForTimeout(1500);

const result = await p.evaluate(() => {
  const canvas = document.getElementById('book-canvas');
  // Find the FP1 left page-canvas (the one carrying mapCanvas → has a map svg-overlay or stub)
  const pages = Array.from(canvas.querySelectorAll('.page-canvas'));
  let mapImgs = 0, pins = 0, stub = 0;
  pages.forEach(pc => {
    pc.querySelectorAll('img.svg-overlay').forEach(img => {
      if (/Map Left/.test(decodeURIComponent(img.src))) mapImgs++;
    });
    pins += pc.querySelectorAll('img.map-pin').length;
    if (/no region selected|preview pending/.test(pc.textContent)) stub++;
  });
  return { mapImgs, pins, stub };
});

await p.screenshot({ path: 'sessions/qa-runs/verify-map-render.png', fullPage: true });
console.log(JSON.stringify({ ...result, pageErrors: errs }));
await b.close();
