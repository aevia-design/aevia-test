// S51 — verifies the step-based order form UX on Scribble:
//  (a) WITH add-ons: stepper shows Details → Cover → Special pages → Photos;
//      advancing validates each step; back-navigation via clicking a done step;
//  (b) WITHOUT add-ons: Special step auto-skips (3 steps only).
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import path from 'path';

const OUT = path.resolve('sessions/qa-runs/step-form');
mkdirSync(OUT, { recursive: true });

const base = 'http://localhost:8080/pages/order';
const withAddons = new URLSearchParams({
  template: 'Scribble', category: 'kids', pages: '40', price: '70', back: 'scribble.html',
  addons: 'Birthday party', addon_inputs: 'text', addon_slugs: 'fp1',
});
const noAddons = new URLSearchParams({
  template: 'Scribble', category: 'kids', pages: '40', price: '70', back: 'scribble.html',
});

const b = await chromium.launch();

async function stepperLabels(p) {
  return p.$$eval('#stepper .step .step-label', els => els.map(e => e.textContent.trim()));
}
async function activeLabel(p) {
  return p.$eval('#stepper .step.active .step-label', e => e.textContent.trim()).catch(() => null);
}

// ── (a) WITH add-ons ──────────────────────────────────────────────
{
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(`${base}?${withAddons}`, { waitUntil: 'load' });
  await p.waitForTimeout(400);

  console.log('[with addons] stepper:', await stepperLabels(p), '| active:', await activeLabel(p));

  // Try to advance with empty details → should stay on Details with an error.
  await p.click('#step1 button.btn-primary');
  await p.waitForTimeout(200);
  console.log('[with addons] blocked on empty details, active still:', await activeLabel(p),
    '| err shown:', await p.$eval('#err-step1', e => e.style.display !== 'none'));

  // Fill details, advance to Cover.
  await p.fill('#inp-name', 'Test Parent');
  await p.fill('#inp-email', 'test@example.com');
  await p.click('#step1 button.btn-primary');
  await p.waitForTimeout(300);
  console.log('[with addons] after details advance, active:', await activeLabel(p),
    '| step-cover visible:', await p.$eval('#step-cover', e => e.style.display !== 'none'));

  // Cover has a photo on Scribble → advancing with no cover photo should block.
  await p.click('#step-cover button.btn-primary');
  await p.waitForTimeout(200);
  console.log('[with addons] blocked on empty cover, active:', await activeLabel(p),
    '| err-cover shown:', await p.$eval('#err-cover', e => e.style.display !== 'none'));

  // Back-navigate: click the Details step in the stepper (it should be done/clickable).
  await p.click('#stepper .step.clickable >> nth=0');
  await p.waitForTimeout(300);
  console.log('[with addons] clicked stepper back → active:', await activeLabel(p));

  await p.screenshot({ path: path.join(OUT, 'with-addons.png'), fullPage: true });
  console.log('[with addons] page errors:', errs);
  await p.close();
}

// ── (b) WITHOUT add-ons → Special step auto-skips ─────────────────
{
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(`${base}?${noAddons}`, { waitUntil: 'load' });
  await p.waitForTimeout(400);

  const labels = await stepperLabels(p);
  console.log('[no addons] stepper:', labels, '| has Special:', labels.includes('Special pages'));

  await p.fill('#inp-name', 'Test Parent');
  await p.fill('#inp-email', 'test@example.com');
  await p.click('#step1 button.btn-primary');
  await p.waitForTimeout(300);
  // From Cover, advancing should go straight to Photos (no Special between).
  console.log('[no addons] after details advance, active:', await activeLabel(p));

  await p.screenshot({ path: path.join(OUT, 'no-addons.png'), fullPage: true });
  console.log('[no addons] page errors:', errs);
  await p.close();
}

await b.close();
