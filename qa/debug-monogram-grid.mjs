// Debug — screenshot every Heirloom monogram (colourway × monogram × letter pair) on the
// back cover and the intro page, in the staff engine (local mode, no Firebase).
//   node qa/debug-monogram-grid.mjs   → sessions/qa-runs/mono/<colour>-<mono>-<surface>-<pair>.png
import { chromium } from 'playwright';
import { readdirSync, mkdirSync } from 'fs';
import path from 'path';
import { createRequire } from 'module';
const sharp = createRequire(import.meta.url)('../scripts/node_modules/sharp');

const OUT = path.resolve('sessions/qa-runs/mono');
mkdirSync(OUT, { recursive: true });
const PHOTO_DIR = path.resolve('assets/test photos/Wedding');
const files = readdirSync(PHOTO_DIR).filter(f => /\.jpe?g$/i.test(f)).slice(0, 12).map(f => path.join(PHOTO_DIR, f));
const PAIRS = ['AM', 'WI', 'JL', 'MW', 'QG'];

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1800, height: 1100 }, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8080/pages/staff/template-engine.html', { waitUntil: 'load' });
await p.waitForTimeout(800);
await p.evaluate(() => { const l = document.getElementById('eng-lock'); if (l) l.remove(); });

for (const colour of ['Beige', 'Blue', 'Brown', 'Green']) {
  await p.selectOption('#template-select', `Heirloom-${colour}`);
  await p.waitForTimeout(600);
  await p.setInputFiles('#photo-file-input', files);
  await p.waitForTimeout(3000);
  for (const mono of ['roots', 'birds', 'roses']) {
    await p.selectOption('#monogram-select', mono);
    await p.waitForTimeout(1200);
    for (const pair of PAIRS) {
      await p.evaluate((pair) => {
        const set = (el, ch) => { el.textContent = ch; el.dispatchEvent(new Event('input', { bubbles: true })); };
        const cover = document.querySelector('.cover-canvas');
        [...cover.querySelectorAll('[data-label^="Monogram"]')].forEach((el, i) => set(el, pair[i]));
        const intro = [...document.querySelectorAll('.page-canvas:not(.cover-canvas)')].find(c => c.querySelector('[data-label="A"]'));
        if (intro) [...intro.querySelectorAll('[data-label="A"], [data-label="B"]')].forEach((el, i) => set(el, pair[i]));
      }, pair);
      await p.waitForTimeout(300);
      for (const surface of ['back', 'intro']) {
        const clip = await p.evaluate((surface) => {
          const cover = document.querySelector('.cover-canvas');
          let els;
          if (surface === 'back') els = [...cover.querySelectorAll('[data-label^="Monogram"]')];
          else {
            const intro = [...document.querySelectorAll('.page-canvas:not(.cover-canvas)')].find(c => c.querySelector('[data-label="A"]'));
            els = intro ? [...intro.querySelectorAll('[data-label="A"], [data-label="B"]')] : [];
          }
          if (!els.length) return null;
          const canvas = els[0].closest('.page-canvas, .cover-canvas');
          canvas.setAttribute('data-shot', '1');
          const cr = canvas.getBoundingClientRect();
          const rs = els.map(e => { const r = e.getBoundingClientRect(); return { left: r.left - cr.left, right: r.right - cr.left, top: r.top - cr.top, bottom: r.bottom - cr.top }; });
          const x0 = Math.min(...rs.map(r => r.left)), x1 = Math.max(...rs.map(r => r.right));
          const y0 = Math.min(...rs.map(r => r.top)), y1 = Math.max(...rs.map(r => r.bottom));
          const pad = Math.max(x1 - x0, y1 - y0) * 0.9 + 30;
          return { x: Math.max(0, x0 - pad), y: Math.max(0, y0 - pad), width: Math.min(cr.width, x1 + pad) - Math.max(0, x0 - pad), height: Math.min(cr.height, y1 + pad) - Math.max(0, y0 - pad) };
        }, surface);
        if (!clip) { console.log('no letters', colour, mono, surface); continue; }
        const loc = p.locator('[data-shot="1"]');
        const buf = await loc.screenshot();
        await p.evaluate(() => document.querySelectorAll('[data-shot]').forEach(e => e.removeAttribute('data-shot')));
        const k = 2;
        await sharp(buf).extract({ left: Math.round(clip.x * k), top: Math.round(clip.y * k), width: Math.round(clip.width * k), height: Math.round(clip.height * k) })
          .toFile(path.join(OUT, `${colour}-${mono}-${surface}-${pair}.png`));
      }
    }
    console.log('done', colour, mono);
  }
}
console.log('pageErrors:', errs);
await b.close();
