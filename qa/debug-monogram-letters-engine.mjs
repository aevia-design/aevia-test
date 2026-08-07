// Debug — same measurement as debug-monogram-letters.mjs but in the STAFF ENGINE
// (local mode), which is the surface staff actually look at. Reports each monogram
// letter's rendered centre-x/y and computed colour, for every monogram in turn.
//   node qa/debug-monogram-letters-engine.mjs
import { chromium } from 'playwright';
import { readdirSync } from 'fs';
import path from 'path';

const PHOTO_DIR = path.resolve('assets/test photos/Wedding');
const files = readdirSync(PHOTO_DIR).filter(f => /\.jpe?g$/i.test(f)).slice(0, 12).map(f => path.join(PHOTO_DIR, f));

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));

await p.goto('http://localhost:8080/pages/staff/template-engine.html', { waitUntil: 'load' });
await p.waitForTimeout(800);
// The login gate would otherwise swallow the page in a headless probe.
await p.evaluate(() => { const l = document.getElementById('eng-lock'); if (l) l.remove(); });
await p.selectOption('#template-select', 'Heirloom-Beige');
await p.waitForTimeout(400);
await p.setInputFiles('#photo-file-input', files);
await p.waitForTimeout(4000);

for (const mono of ['roots', 'birds', 'roses']) {
  await p.selectOption('#monogram-select', mono);
  await p.waitForTimeout(1200);
  // Type A into the first letter and M into the second, on the cover and the intro.
  const typed = await p.evaluate(() => {
    const setText = (el, ch) => {
      el.textContent = ch;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const cover = document.querySelector('.cover-canvas');
    const back = [...cover.querySelectorAll('[data-label^="Monogram"]')];
    back.forEach((el, i) => setText(el, i === 0 ? 'A' : 'M'));
    const introCanvas = [...document.querySelectorAll('.page-canvas:not(.cover-canvas)')]
      .find(c => c.querySelector('[data-label="A"]'));
    const intro = introCanvas
      ? [...introCanvas.querySelectorAll('[data-label="A"], [data-label="B"]')] : [];
    intro.forEach((el, i) => setText(el, i === 0 ? 'A' : 'M'));
    return { back: back.length, intro: intro.length };
  });
  await p.waitForTimeout(400);

  const out = await p.evaluate((mono) => {
    const m = window.HEIRLOOM_DATA.monograms[mono];
    const read = (el, root) => {
      const r = el.getBoundingClientRect(), rr = root.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { text: el.textContent.trim(),
               centreX: +(r.left - rr.left + r.width / 2).toFixed(2),
               centreY: +(r.top - rr.top + r.height / 2).toFixed(2),
               color: cs.color, fontSize: cs.fontSize };
    };
    const cover = document.querySelector('.cover-canvas');
    const back = [...cover.querySelectorAll('[data-label^="Monogram"]')].map(e => read(e, cover));
    const introCanvas = [...document.querySelectorAll('.page-canvas:not(.cover-canvas)')]
      .find(c => c.querySelector('[data-label="A"]'));
    const intro = introCanvas
      ? [...introCanvas.querySelectorAll('[data-label="A"], [data-label="B"]')].map(e => read(e, introCanvas)) : [];
    return {
      monogram: mono,
      dataBackX:  m.backLetters.map(L => L.xMm),
      dataIntroX: m.introLetters.map(L => L.xMm),
      back, intro,
      backAligned:  back.length  === 2 ? Math.abs(back[0].centreX  - back[1].centreX)  : null,
      introAligned: intro.length === 2 ? Math.abs(intro[0].centreX - intro[1].centreX) : null,
    };
  }, mono);
  console.log(JSON.stringify(out, null, 2));
}
console.log('pageErrors:', errs);
await p.close(); await b.close();
