// Verify the RENDERED z-index of every Wander page overlay, per spread/side.
// Proves overlayBelow actually reaches the DOM, rather than trusting the data file.
import { chromium } from 'playwright';
import { readdirSync } from 'fs';
import path from 'path';

const PHOTO_DIR = path.resolve('sessions/qa-runs/wander-debug');
const files = readdirSync(PHOTO_DIR).filter(f => f.endsWith('.jpg')).map(f => path.join(PHOTO_DIR, f));

const b = await chromium.launch();
const p = await b.newPage();
p.on('pageerror', e => console.log('PAGEERROR:', e.message));
await p.goto('http://localhost:8080/pages/staff/template-engine.html', { waitUntil: 'load' });
await p.waitForTimeout(800);
await p.selectOption('#template-select', 'Wander');
await p.waitForTimeout(300);
await p.setInputFiles('#photo-file-input', files);
await p.waitForTimeout(3000);

const rows = await p.evaluate(() => {
  const out = [];
  document.querySelectorAll('#book-canvas .page-canvas').forEach(pc => {
    const ov = pc.querySelector('.svg-overlay');
    if (!ov) return;
    out.push({
      side: pc.dataset.side,
      variant: pc.dataset.variant,
      svg: decodeURIComponent(ov.getAttribute('src')).split('/').slice(-2).join('/'),
      zIndex: getComputedStyle(ov).zIndex,
    });
  });
  return out;
});
console.table(rows);
await b.close();
