import { chromium } from 'playwright';
import { readdirSync } from 'fs';
import path from 'path';

const PHOTO_DIR = path.resolve('sessions/qa-runs/wander-debug');
const files = readdirSync(PHOTO_DIR).filter(f => f.endsWith('.jpg')).map(f => path.join(PHOTO_DIR, f));

const b = await chromium.launch();

async function run(template) {
  const p = await b.newPage();          // fresh page per template = clean state
  const errs = [];
  p.on('pageerror', e => errs.push(`${e.message}`));
  await p.goto('http://localhost:8080/pages/staff/template-engine.html', { waitUntil: 'load' });
  await p.waitForTimeout(800);
  await p.selectOption('#template-select', template);
  await p.waitForTimeout(300);
  await p.setInputFiles('#photo-file-input', files);
  await p.waitForTimeout(2500);
  const state = await p.evaluate(() => {
    const canvas = document.getElementById('book-canvas');
    return {
      poolLen: (window.photoPool || []).length,
      spreadCount: canvas.querySelectorAll('.spread').length,
      pageCanvasCount: canvas.querySelectorAll('.page-canvas').length,
      coverPresent: !!canvas.querySelector('.cover-canvas'),
      mapStubCount: Array.from(canvas.querySelectorAll('.page-canvas div'))
                         .filter(d => /Travel map/.test(d.textContent)).length,
    };
  });
  await p.close();
  return { template, ...state, pageErrors: errs };
}

for (const t of ['Wander', 'Scribble']) {
  console.log(JSON.stringify(await run(t)));
}
await b.close();
