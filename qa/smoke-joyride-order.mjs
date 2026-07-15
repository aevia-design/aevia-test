// Smoke test: order.html renders correctly for Joyride (4-slot cover) and that
// single-cover Scribble is unregressed. Drives step 1 → step 2 (cover section).
import { chromium } from 'playwright';

const BASE = 'http://localhost:8080/pages';
const browser = await chromium.launch();
const results = [];

async function run(label, query, checks) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(`${BASE}/order.html?${query}`, { waitUntil: 'networkidle' });
  await page.fill('#inp-name', 'Test User');
  await page.fill('#inp-email', 'test@example.com');
  await page.click('button[onclick="advance()"]', { timeout: 3000 }).catch(async () => {
    await page.evaluate(() => advance());
  });
  await page.waitForTimeout(400);
  const out = await checks(page);
  out.jsErrors = errors;
  results.push([label, out]);
  await page.close();
}

// ── Scribble parity: single cover zone still works (no regression from refactor)
await run('SCRIBBLE', 'template=Scribble&category=kids&pages=40&price=70&back=scribble.html', async (page) => {
  return await page.evaluate(() => ({
    singleCoverZone: !!document.getElementById('dz-cover'),
    multiCoverZones: document.querySelectorAll('[id^="dz-cover-"]').length,
    coverCapInputs: document.querySelectorAll('[id^="cover-cap-"]').length,
    isMulti: isMultiCover(),
  }));
});

// ── Joyride: FOUR labelled cover zones, four caption fields, isMultiCover() true
await run('JOYRIDE', 'template=Joyride&category=adventures&pages=40&price=70&back=collections.html', async (page) => {
  const base = await page.evaluate(() => ({
    singleCoverZone: !!document.getElementById('dz-cover'),
    multiCoverZones: [...document.querySelectorAll('[id^="dz-cover-"]')].map(e => e.id),
    coverCapKeys: [...document.querySelectorAll('[id^="cover-cap-"]')].map(e => e.id),
    isMulti: isMultiCover(),
    slotKeys: coverSlots().map(s => s.key),
  }));
  // Simulate uploading all four cover photos, then check the validator passes.
  const validation = await page.evaluate(() => {
    coverSlots().forEach(s => { coverFiles[s.key] = new File([new Uint8Array([1])], `${s.key}.jpg`, { type: 'image/jpeg' }); });
    // fill primary caption so caption validation passes too
    const cap = document.getElementById('cover-cap-name');
    if (cap) cap.value = 'Hot Getaway in Milan';
    return validateCoverStep();
  });
  // And that removing one is caught.
  const missingOne = await page.evaluate(() => {
    delete coverFiles.coverLeft;
    return validateCoverStep();
  });
  return { ...base, validationAll: validation, validationMissingLeft: missingOne };
});

console.log(JSON.stringify(results, null, 2));
await browser.close();
