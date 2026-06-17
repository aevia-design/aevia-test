// Session 44 — Stage 3 render smoke for the Newborn template (staff engine).
// Verifies: cover renders with the custom scalloped clip + both fonts; Labour
// spread shows 2 labour photos + a zodiac overlay; Intro renders a text panel.
// Also a regression pass: Scribble + Wander still render with no page errors.
import { chromium } from 'playwright';
import { readdirSync } from 'fs';
import path from 'path';

const PHOTO_DIR = path.resolve('sessions/qa-runs/wander-debug');
const files = readdirSync(PHOTO_DIR).filter(f => f.endsWith('.jpg')).map(f => path.join(PHOTO_DIR, f)).slice(0, 8);

const b = await chromium.launch();
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));

await p.goto('http://localhost:8080/pages/staff/template-engine.html', { waitUntil: 'load' });
await p.waitForTimeout(800);

async function loadTemplate(name) {
  await p.selectOption('#template-select', name);
  await p.waitForTimeout(300);
  await p.setInputFiles('#photo-file-input', files);
  await p.waitForTimeout(2500);
}

// ── Newborn ──
await loadTemplate('Newborn');
const newborn = await p.evaluate(() => {
  // Enable both functional pages
  document.querySelectorAll('input[name="fp"]').forEach(cb => {
    if (['FPintro', 'FPlabour'].includes(cb.value)) { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  // Inject cover + labour photos from the loaded pool, and a zodiac sign.
  const pool = window.photoPool || [];
  window.specialPhotos.cover = pool[0] ? [pool[0]] : [];
  window.specialPhotos.FPlabour = [pool[1], pool[2]].filter(Boolean);
  window._newbornZodiac = 'Leo';
  rerenderCover();
  renderBook();
  return null;
});
await p.waitForTimeout(1500);

const nb = await p.evaluate(() => {
  const out = { coverClip: false, coverCaps: 0, labourPhotos: 0, zodiac: false, introPanel: false, spreadCount: 0 };
  // Cover clip: the cover photo-slot carries a clip-path url(#coverClip-*)
  const coverRow = document.querySelector('.spread-row[data-spread-id="cover"]');
  if (coverRow) {
    const slot = coverRow.querySelector('.photo-slot');
    if (slot && /coverClip-/.test(slot.style.clipPath || '')) out.coverClip = true;
    out.coverCaps = coverRow.querySelectorAll('.cover-caption').length;
  }
  const rows = Array.from(document.querySelectorAll('.spread-row'));
  out.spreadCount = rows.length;
  rows.forEach(r => {
    const id = r.dataset.spreadId || '';
    if (id === 'FPlabour') {
      out.labourPhotos = r.querySelectorAll('.slot-photo').length;
      r.querySelectorAll('img.svg-overlay').forEach(img => {
        if (/Labour Right/.test(decodeURIComponent(img.src))) out.zodiac = true;
      });
    }
    if (id === 'FPintro') {
      out.introPanel = !!r.querySelector('.slot-caption, [data-testid], .text-panel, [contenteditable]');
    }
  });
  return out;
});

// ── Regression: Scribble + Wander render without errors ──
const errsBefore = errs.length;
await loadTemplate('Scribble');
await p.evaluate(() => renderBook());
await p.waitForTimeout(800);
const scribbleSpreads = await p.evaluate(() => document.querySelectorAll('.spread-row').length);

await loadTemplate('Wander');
await p.evaluate(() => renderBook());
await p.waitForTimeout(800);
const wanderSpreads = await p.evaluate(() => document.querySelectorAll('.spread-row').length);

await p.selectOption('#template-select', 'Newborn');
await p.waitForTimeout(300);
await p.evaluate(() => {
  document.querySelectorAll('input[name="fp"]').forEach(cb => {
    if (['FPintro', 'FPlabour'].includes(cb.value)) { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  const pool = window.photoPool || [];
  window.specialPhotos.cover = pool[0] ? [pool[0]] : [];
  window.specialPhotos.FPlabour = [pool[1], pool[2]].filter(Boolean);
  window._newbornZodiac = 'Leo';
  rerenderCover(); renderBook();
});
await p.waitForTimeout(1200);
await p.screenshot({ path: 'sessions/qa-runs/verify-newborn-render.png', fullPage: true });

console.log(JSON.stringify({ newborn: nb, scribbleSpreads, wanderSpreads, pageErrors: errs }, null, 2));
await b.close();
