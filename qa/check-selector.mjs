import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
const errs = [];
p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
p.on('pageerror', e => errs.push('pageerror: '+e.message));
await p.goto('http://localhost:8080/pages/staff/template-engine.html', { waitUntil:'load' });
await p.waitForTimeout(1200);
const snap = async () => p.evaluate(() => ({
  fpCount: document.querySelectorAll('#fp-group input[name="fp"]').length,
  fpLabels: Array.from(document.querySelectorAll('#fp-group .fp-checkbox-item')).map(l=>l.textContent.trim()),
  fpGroupHidden: document.getElementById('fp-config-group').style.display === 'none',
  coverZoneDisplay: document.getElementById('special-zone-cover').style.display,
}));
console.log('Scribble (default):', JSON.stringify(await snap()));
await p.selectOption('#template-select', 'Wander');
await p.waitForTimeout(500);
console.log('Wander:           ', JSON.stringify(await snap()));
await p.selectOption('#template-select', 'Scribble');
await p.waitForTimeout(500);
console.log('Back to Scribble: ', JSON.stringify(await snap()));
console.log('console errors:', errs.length, errs.slice(0,5));
await b.close();
