// Debug — measure the four Heirloom monogram letters as RENDERED: centre-x, centre-y
// and computed colour, for whichever monogram is passed. Mocked getOrder + local
// photos (no Firebase read, no egress).
//   node qa/debug-monogram-letters.mjs roots
import { chromium } from 'playwright';
import { readdirSync } from 'fs';
import path from 'path';

const MONO = (process.argv[2] || 'roots').toLowerCase();
const BASE = 'http://localhost:8080';
const PHOTO_WEB = '/assets/test%20photos/Wedding';
const PHOTO_DIR = path.resolve('assets/test photos/Wedding');
const names = readdirSync(PHOTO_DIR).filter(f => /\.jpe?g$/i.test(f)).slice(0, 20);
const urlFor = (n) => `${BASE}${PHOTO_WEB}/${encodeURIComponent(n)}`;

const ORDER = {
  orderNumber: 'AEV-MOCK', status: 'preview_sent', templateName: 'heirloom-beige',
  pageCount: 40, fpSelections: [],
  fpTexts: { monogram: MONO, monogramLetters: ['A', 'M'] },
  coverCaptions: { name: 'ANNA & MICHAEL', spine: 'Anna & Michael' },
  staffBookCaptions: { cover: { backLetter1: 'A', backLetter2: 'M' }, 0: { right: { monoLetter1: 'A', monoLetter2: 'M' } } },
  signedUrls: { cover: urlFor(names[0]), special: {}, pool: names.slice(1).map(urlFor) },
};

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
await p.route('**/getOrder**', r => r.fulfill({
  status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
  body: JSON.stringify(ORDER),
}));
await p.goto(`${BASE}/pages/customer-preview.html?token=mock`, { waitUntil: 'load' });
await p.waitForSelector('.cover-canvas', { timeout: 30000 });
await p.waitForTimeout(2500);

const out = await p.evaluate((mono) => {
  const d = window.HEIRLOOM_DATA;
  const m = d.monograms[mono];
  const SCALE = 600 / 200;   // canvasPx / pageSize — same as the render
  const read = (el, root) => {
    const r = el.getBoundingClientRect(), rr = root.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      text: el.textContent.trim(),
      centreX: +(r.left - rr.left + r.width / 2).toFixed(2),
      centreY: +(r.top - rr.top + r.height / 2).toFixed(2),
      color: cs.color, fontSize: cs.fontSize, fontFamily: cs.fontFamily.split(',')[0],
    };
  };
  const coverEl = document.querySelector('.cover-canvas');
  const back = [...coverEl.querySelectorAll('[data-label^="Monogram"]')].map(e => read(e, coverEl));
  const introCanvas = [...document.querySelectorAll('.page-canvas:not(.cover-canvas)')]
    .find(c => c.querySelector('[data-label="A"]'));
  const intro = introCanvas
    ? [...introCanvas.querySelectorAll('[data-label="A"], [data-label="B"]')].map(e => read(e, introCanvas))
    : [];
  return {
    monogram: mono,
    dataBackLetters: m.backLetters.map(L => ({ xMm: L.xMm, yMm: L.yMm, color: L.color })),
    dataIntroLetters: m.introLetters.map(L => ({ xMm: L.xMm, yMm: L.yMm, color: L.color })),
    // Expected centre in canvas px: (xMm - bleed) * SCALE
    expectedBackCentreX: m.backLetters.map(L => +((L.xMm - 18) * SCALE).toFixed(2)),
    expectedIntroCentreX: m.introLetters.map(L => +((L.xMm - 3) * SCALE).toFixed(2)),
    renderedBack: back,
    renderedIntro: intro,
  };
}, MONO);

console.log(JSON.stringify(out, null, 2));
await p.close(); await b.close();
