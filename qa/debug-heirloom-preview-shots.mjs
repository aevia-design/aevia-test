// Debug — close-ups of the Heirloom customer preview + intro-panel overflow measurement.
// Mocked getOrder + local photos (no Firebase read, no GCS egress). Companion to
// qa/heirloom-preview-mock.mjs; this one is for LOOKING, not asserting.
import { chromium } from 'playwright';
import { mkdirSync, readdirSync } from 'fs';
import path from 'path';

const BASE = 'http://localhost:8080';
const PHOTO_WEB = '/assets/test%20photos/Wedding';
const PHOTO_DIR = path.resolve('assets/test photos/Wedding');
const OUT = path.resolve('sessions/qa-runs/heirloom-preview-mock');
mkdirSync(OUT, { recursive: true });

const names = readdirSync(PHOTO_DIR).filter(f => /\.jpe?g$/i.test(f)).slice(0, 24);
const urlFor = (n) => `${BASE}${PHOTO_WEB}/${encodeURIComponent(n)}`;

const ORDER = {
  orderNumber: 'AEV-MOCK', status: 'preview_sent', templateName: 'heirloom-beige',
  pageCount: 40, email: 'qa@example.com', customerName: 'QA Tester',
  fpSelections: ['FPstory'],
  fpTexts: {
    monogram: 'roses', monogramLetters: ['A', 'M'],
    fpintro: 'On June 14th, 2026,\nin Vienna, Austria,\nwe said “I do.”\n\nSurrounded by the people we love,\nwe promised to choose each other\ntoday and always.\n\nThe beginning of our forever.\n\nAnna & Michael',
    FPstory: 'Through mutual friends.\n\nA coffee that ran four hours.',
  },
  coverCaptions: { name: 'ANNA & MICHAEL', spine: 'Anna & Michael' },
  staffBookCaptions: {
    cover: { backLetter1: 'A', backLetter2: 'M' },
    0: { right: { monoLetter1: 'A', monoLetter2: 'M', textPanel: 'On June 14th, 2026,\nin Vienna, Austria,\nwe said “I do.”\n\nSurrounded by the people we love,\nwe promised to choose each other\ntoday and always.\n\nThe beginning of our forever.\n\nAnna & Michael' } },
  },
  signedUrls: { cover: urlFor(names[0]), special: { FPstory: [urlFor(names[1])] }, pool: names.slice(2).map(urlFor) },
};

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 2 });
await p.route('**/getOrder**', r => r.fulfill({
  status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
  body: JSON.stringify(ORDER),
}));
await p.goto(`${BASE}/pages/customer-preview.html?token=mock`, { waitUntil: 'load' });
await p.waitForSelector('.cover-canvas', { timeout: 30000 });
await p.waitForTimeout(3500);

await p.locator('.cover-canvas').screenshot({ path: path.join(OUT, 'shot-cover.png') });
const rows = p.locator('.spread-row');
await rows.nth(1).screenshot({ path: path.join(OUT, 'shot-intro.png') });

// Does the intro passage overflow its designed box?
const measure = await p.evaluate(() => {
  const panel = document.querySelector('.page-canvas .fp-text-panel');
  if (!panel) return { found: false };
  const cs = getComputedStyle(panel);
  return {
    found: true,
    text: panel.textContent.trim().slice(0, 60),
    boxH: panel.clientHeight,
    contentH: panel.scrollHeight,
    overflowPx: panel.scrollHeight - panel.clientHeight,
    fontSize: cs.fontSize,
    lineHeight: cs.lineHeight,
  };
});
console.log(JSON.stringify(measure, null, 2));
await p.close(); await b.close();
console.log('shots →', OUT);
