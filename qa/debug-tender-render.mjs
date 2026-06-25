import { chromium } from 'playwright';
import { readdirSync } from 'fs';
import path from 'path';
const PHOTO_DIR = 'C:/Users/evgmy/aevia-test/sessions/qa-runs/tender-debug';
const files = readdirSync(PHOTO_DIR).filter(f => f.endsWith('.jpg')).map(f => path.join(PHOTO_DIR, f));
const b = await chromium.launch();
async function run(template) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8080/pages/staff/template-engine.html', { waitUntil: 'load' });
  await p.waitForTimeout(800);
  await p.selectOption('#template-select', template);
  await p.waitForTimeout(400);
  await p.evaluate(() => document.querySelectorAll('#local-mode-controls input[type=checkbox], .fp-toggle input[type=checkbox], #local-fp-list input[type=checkbox]').forEach(c=>{ if(!c.checked) c.click(); }));
  await p.waitForTimeout(300);
  await p.setInputFiles('#photo-file-input', files);
  await p.waitForTimeout(3000);
  const state = await p.evaluate(() => {
    const canvas = document.getElementById('book-canvas');
    return {
      poolLen: (window.photoPool || []).length,
      spreadCount: canvas.querySelectorAll('.spread').length,
      pageCanvasCount: canvas.querySelectorAll('.page-canvas').length,
      coverPresent: !!canvas.querySelector('.cover-canvas'),
    };
  });
  await p.screenshot({ path: path.join(PHOTO_DIR, `_render-${template}.png`), fullPage: true });
  await p.close();
  return { template, ...state, pageErrors: errs };
}
console.log(JSON.stringify(await run('Tender'), null, 2));
await b.close();
