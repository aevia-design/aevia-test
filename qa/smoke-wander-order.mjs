// Smoke test: order.html renders correctly for Scribble (parity) AND Wander (new).
// Drives step 1 → step 2 to inspect the cover section + FP sections per template.
import { chromium } from 'playwright';

const BASE = 'http://localhost:8080/pages';
const browser = await chromium.launch();
const results = [];

async function run(label, query, checks) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(`${BASE}/order?${query}`, { waitUntil: 'networkidle' });
  // Step 1 → fill name/email → continue
  await page.fill('#inp-name', 'Test User');
  await page.fill('#inp-email', 'test@example.com');
  await page.click('button[onclick="goToStep2()"]', { timeout: 3000 }).catch(async () => {
    // fallback: find the continue button
    await page.evaluate(() => goToStep2());
  });
  await page.waitForTimeout(400);
  const out = await checks(page);
  out.jsErrors = errors;
  results.push([label, out]);
  await page.close();
}

// ── Scribble (parity): cover photo zone present, 4 caption fields, FP1 photo addon
await run('SCRIBBLE', 'template=Scribble&category=kids&pages=40&price=70&back=scribble.html&addons=Birthday%20spread&addon_inputs=photo&addon_slugs=fp1', async (page) => {
  return await page.evaluate(() => ({
    coverPhotoZone: !!document.getElementById('dz-cover'),
    coverCapInputs: document.querySelectorAll('[id^="cover-cap-"]').length,
    capKeys: [...document.querySelectorAll('[id^="cover-cap-"]')].map(e => e.id),
    countrySelect: !!document.querySelector('[id^="country-add-"]'),
  }));
});

// ── Wander (new): NO cover photo zone, 2 free-text caption fields, country select present
await run('WANDER', 'template=Wander&category=adventures&pages=40&price=60&back=wander.html&addons=Travel%20map%20%26%20itinerary&addon_inputs=map&addon_slugs=fp1', async (page) => {
  // interact with country select: add Austria (EU), then try Japan (Asia) → should be blocked
  const base = await page.evaluate(() => ({
    coverPhotoZone: !!document.getElementById('dz-cover'),
    coverCapInputs: document.querySelectorAll('[id^="cover-cap-"]').length,
    capKeys: [...document.querySelectorAll('[id^="cover-cap-"]')].map(e => e.id),
    countrySelect: !!document.querySelector('[id^="country-add-"]'),
  }));
  // add a EU country then an Asia country
  await page.evaluate(() => addCountry('fp1', 'Austria'));
  await page.evaluate(() => addCountry('fp1', 'Japan'));
  const after = await page.evaluate(() => ({
    selected: (window._fpCountries.fp1 || {}).countries,
    region: (window._fpCountries.fp1 || {}).region,
    errVisible: document.getElementById('country-err-fp1')?.style.display === 'block',
    regionMapText: document.getElementById('region-map-fp1')?.textContent.trim(),
  }));
  return { ...base, ...after };
});

console.log(JSON.stringify(results, null, 2));
await browser.close();
