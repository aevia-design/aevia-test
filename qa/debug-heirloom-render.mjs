// Heirloom (Beige) engine render smoke test — Phase A gate (S157).
// Pattern: debug-tender-render.mjs. Loads the staff engine locally, selects
// Heirloom-Beige, enables all functional toggles, feeds local test photos, and
// asserts: canvases render, cover present, zero pageerrors.
// Run: npx http-server . -p 8080 -c-1   (project root)   then   node qa/debug-heirloom-render.mjs
import { chromium } from 'playwright';
import { readdirSync, mkdirSync } from 'fs';
import path from 'path';

const PHOTO_DIR = 'C:/Users/evgmy/aevia-test/assets/test photos/Newborn';
const OUT_DIR   = 'C:/Users/evgmy/aevia-test/sessions/qa-runs/heirloom-debug';
mkdirSync(OUT_DIR, { recursive: true });
const files = readdirSync(PHOTO_DIR).filter(f => /\.(jpe?g|png)$/i.test(f)).slice(0, 30).map(f => path.join(PHOTO_DIR, f));

const b = await chromium.launch();
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
const failed404 = [];
p.on('response', r => { if (r.status() === 404) failed404.push(r.url()); });

await p.goto('http://localhost:8080/pages/staff/template-engine.html', { waitUntil: 'load' });
await p.waitForTimeout(800);
await p.selectOption('#template-select', 'Heirloom-Beige');
await p.waitForTimeout(400);
// enable every functional-spread toggle (intro, story, him, her)
await p.evaluate(() => document.querySelectorAll('#local-mode-controls input[type=checkbox], .fp-toggle input[type=checkbox], #local-fp-list input[type=checkbox]').forEach(c => { if (!c.checked) c.click(); }));
await p.waitForTimeout(300);
await p.setInputFiles('#photo-file-input', files);
await p.waitForTimeout(4000);

const state = await p.evaluate(() => {
  const canvas = document.getElementById('book-canvas');
  const zones = [...document.querySelectorAll('[data-pool]')].map(z => z.dataset.pool);
  return {
    poolLen: (window.photoPool || []).length,
    spreadCount: canvas.querySelectorAll('.spread').length,
    pageCanvasCount: canvas.querySelectorAll('.page-canvas').length,
    coverPresent: !!canvas.querySelector('.cover-canvas'),
    functionalZonePools: [...new Set(zones)],
  };
});
await p.screenshot({ path: path.join(OUT_DIR, '_render-heirloom-beige.png'), fullPage: true });
await p.close(); await b.close();

const svg404s = failed404.filter(u => u.includes('Template_Heirloom'));
const ok = state.pageCanvasCount > 0 && state.coverPresent && errs.length === 0 && svg404s.length === 0;
console.log(JSON.stringify({ ...state, pageErrors: errs, heirloomSvg404s: svg404s, PASS: ok }, null, 2));
process.exit(ok ? 0 : 1);
