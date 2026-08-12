// Laguna Phase B stage 5 smoke test — order.html renders correctly for Laguna, and
// Joyride (the multi-cover template) is unregressed by the same registry edit.
//
// Laguna is a SINGLE-cover template with THREE cover captions (front / front-sub /
// spine) and two functional add-ons: an Intro page with free-text fields and a Travel
// map with a country picker + route text. All of it is data-driven off laguna-data.js,
// so this asserts the data actually reaches the form rather than that new code runs.
//
//   npx http-server . -p 8080 -c-1     # in another shell
//   node qa/smoke-laguna-order.mjs
import { chromium } from 'playwright';

const BASE = 'http://localhost:8080/pages';
const browser = await chromium.launch();
const results = [];

async function run(label, query, checks) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(`${BASE}/order.html?${query}`, { waitUntil: 'networkidle' });
  await page.fill('#inp-name', 'Test User');
  await page.fill('#inp-email', 'test@example.com');
  await page.click('button[onclick="advance()"]', { timeout: 3000 }).catch(async () => {
    await page.evaluate(() => advance());
  });
  await page.waitForTimeout(600);
  const out = await checks(page);
  out.jsErrors = errors;
  results.push([label, out]);
  await page.close();
}

await run('LAGUNA', 'template=Laguna&category=adventures&pages=40&price=70&back=laguna.html', async (page) =>
  page.evaluate(() => {
    const tpl = window.LAGUNA_DATA;
    const capKeys = (tpl?.cover?.captions || []).map((c) => c.key);
    return {
      templateResolved: !!tpl && tpl.template === 'laguna',
      // Single-cover path: one drop zone, no per-slot zones (that is Joyride's shape).
      singleCoverZone: !!document.getElementById('dz-cover'),
      multiCoverZones: document.querySelectorAll('[id^="cover-slot-empty-"]').length,
      // One caption input per cover.captions entry, ids derived from the key.
      coverCaptionKeys: capKeys,
      coverCaptionInputs: capKeys.filter((k) => !!document.getElementById(`cover-cap-${k}`)),
      // The add-on rail is built from the functional spreads.
      addonLabels: [...document.querySelectorAll('.addon-card, [class*=addon]')]
        .map((e) => (e.textContent || '').trim().slice(0, 40)).filter(Boolean).slice(0, 8),
      notePlaceholder: (document.getElementById('album-notes')?.placeholder || '').slice(0, 40),
    };
  })
);

// Add-ons arrive as URL params written by product.js from the page's window.PRODUCT.fp
// map — they are NOT derived from the data file — so this mirrors exactly what Laguna's
// product page will send (same two functional pages as Joyride: intro + map).
const ADDONS = 'addons=Intro,Travel%20map%20%26%20itinerary&addon_inputs=intro,map&addon_slugs=fpintro,fp1';
await run('LAGUNA + add-ons', `template=Laguna&category=adventures&pages=40&price=70&back=laguna.html&${ADDONS}`, async (page) => {
  await page.evaluate(() => advance()).catch(() => {});
  await page.waitForTimeout(700);
  return page.evaluate(() => ({
    // `const ORDER` at script top level is NOT a window property — it is reachable only
    // as a bare identifier in the page's global scope, which is where evaluate() runs.
    addonSlugs: (typeof ORDER !== 'undefined' ? ORDER.addons || [] : []).map((a) => a.slug),
    // Intro renders one input per orderFormMeta field: id `intro-<slug>-<key>`.
    introFieldInputs: ['place', 'when', 'line']
      .filter((k) => !!document.getElementById(`intro-fpintro-${k}`)),
    // The map renders a country picker + an itinerary list, ids suffixed by slug.
    countryPicker: !!document.getElementById('country-add-fp1'),
    itineraryList: !!document.getElementById('itin-list-fp1'),
    regionMap: !!document.getElementById('region-map-fp1'),
  }));
});

// Joyride parity: the four-slot cover must be unaffected by Laguna's registry entry.
await run('JOYRIDE (parity)', 'template=Joyride&category=adventures&pages=40&price=70&back=joyride.html', async (page) =>
  page.evaluate(() => ({
    // Joyride deliberately uses ONE drop zone feeding four labelled slots, so the
    // parity check counts the SLOTS, not the zones.
    coverSlotCells: document.querySelectorAll('[id^="cover-slot-empty-"]').length,
    templateResolved: window.JOYRIDE_DATA?.template === 'joyride',
  }))
);

await browser.close();

let bad = 0;
for (const [label, out] of results) {
  console.log(`\n──── ${label} ────`);
  console.log(JSON.stringify(out, null, 2));
  if (out.jsErrors?.length) bad++;
}
const laguna = results[0][1];
const addons = results[1][1];
const joyride = results[2][1];
const checks = [
  ['template resolves to laguna', laguna.templateResolved],
  ['single cover drop zone present', laguna.singleCoverZone],
  ['no multi-cover slot grid', laguna.multiCoverZones === 0],
  ['3 cover captions declared', laguna.coverCaptionKeys.length === 3],
  ['every cover caption has an input', laguna.coverCaptionInputs.length === laguna.coverCaptionKeys.length],
  ['Laguna note placeholder used', laguna.notePlaceholder.startsWith('e.g. Two weeks in Greece')],
  ['add-ons expand to fpintro + fp1', JSON.stringify(addons.addonSlugs) === JSON.stringify(['fpintro', 'fp1'])],
  ['Intro renders all 3 text fields', addons.introFieldInputs.length === 3],
  ['Travel map renders the country picker', addons.countryPicker],
  ['Travel map renders the itinerary list', addons.itineraryList],
  ['Travel map renders the region map', addons.regionMap],
  ['Joyride still has 4 cover slots', joyride.coverSlotCells === 4],
  ['no JS errors on either page', results.every((r) => !r[1].jsErrors.length)],
];
console.log('');
for (const [name, ok] of checks) { console.log(`${ok ? '✅' : '❌'} ${name}`); if (!ok) bad++; }
console.log(bad ? `\n❌ ${bad} problem(s)` : '\n✅ all checks passed');
process.exit(bad ? 1 : 0);
