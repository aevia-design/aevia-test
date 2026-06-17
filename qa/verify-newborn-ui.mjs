// Drives the staff-engine LOCAL TESTER through the Newborn Labour + zodiac controls.
import { chromium } from 'playwright';
import { readdirSync } from 'fs';
import path from 'path';
const dir = path.resolve('sessions/qa-runs/wander-debug');
const files = readdirSync(dir).filter(f => f.endsWith('.jpg')).map(f => path.join(dir, f)).slice(0, 6);
const b = await chromium.launch();
const p = await b.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:8080/pages/staff/template-engine.html', { waitUntil: 'load' });
await p.waitForTimeout(700);
await p.selectOption('#template-select', 'Newborn');
await p.waitForTimeout(300);
await p.setInputFiles('#photo-file-input', files);
await p.waitForTimeout(2500);
// Tick Labour + Intro checkboxes
await p.evaluate(() => {
  document.querySelectorAll('input[name="fp"]').forEach(cb => {
    if (['FPintro','FPlabour'].includes(cb.value) && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change',{bubbles:true})); }
  });
});
await p.waitForTimeout(400);
const zoneVisible = await p.evaluate(() => ({
  labourZone: getComputedStyle(document.getElementById('special-zone-FPlabour')).display,
  zodiacZone: getComputedStyle(document.getElementById('special-zone-zodiac')).display,
  zodiacOptions: document.getElementById('zodiac-select').options.length,
}));
// Upload 2 labour photos through the FPlabour input
await p.setInputFiles('[data-fp-input="FPlabour"]', files.slice(0,2));
await p.waitForTimeout(2000);
// Pick a zodiac
await p.selectOption('#zodiac-select', 'Leo');
await p.waitForTimeout(1200);
const result = await p.evaluate(() => {
  const out = { labourPhotos: 0, zodiacSrc: null };
  document.querySelectorAll('.spread-row').forEach(r => {
    if (r.dataset.spreadId === 'FPlabour') {
      out.labourPhotos = r.querySelectorAll('.slot-photo').length;
      const z = Array.from(r.querySelectorAll('img.svg-overlay')).find(i => /Labour Right/.test(decodeURIComponent(i.src)));
      out.zodiacSrc = z ? decodeURIComponent(z.src).split('/').pop() : null;
    }
  });
  return out;
});
console.log(JSON.stringify({ zoneVisible, result, pageErrors: errs }, null, 2));
await b.close();
