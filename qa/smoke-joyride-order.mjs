// Smoke test: order.html renders correctly for Joyride (4-slot cover) and that
// single-cover Scribble is unregressed. Drives step 1 → step 2 (cover section).
import { chromium } from 'playwright';
import { readdirSync } from 'fs';
import path from 'path';

const BASE = 'http://localhost:8080/pages';
const browser = await chromium.launch();
const results = [];

// Four real photos for the Joyride cover, in a known order so the smoke test can
// assert they map to Top/Left/Right/Bottom in the order they were added.
//
// Was pointed at `qa/test-photos/wander/`, which is GITIGNORED and absent on a fresh
// clone, so the script died with ENOENT before its first assertion (S170).
// `assets/test photos/` is in the repo; the sort keeps the mapping deterministic.
const PHOTO_DIR = 'assets/test photos/Sea';
const PHOTOS = readdirSync(path.resolve(PHOTO_DIR))
  .filter(f => /\.(jpe?g|png)$/i.test(f))
  .sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0) || a.localeCompare(b))
  .slice(0, 4)
  .map(f => `${PHOTO_DIR}/${f}`);
if (PHOTOS.length < 4) throw new Error(`need 4 test photos in ${PHOTO_DIR}`);

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

// ── Joyride: ONE cover zone feeding four labelled slots (S135 Pass B — was four
// separate zones). Drives a real 4-file upload through the shared input.
await run('JOYRIDE', 'template=Joyride&category=adventures&pages=40&price=70&back=collections.html', async (page) => {
  const base = await page.evaluate(() => ({
    sharedCoverZone: !!document.getElementById('dz-cover'),
    perSlotZones: [...document.querySelectorAll('[id^="dz-cover-"]')].map(e => e.id)
                    .filter(id => id !== 'dz-cover-text'),   // the zone's own label
    slotLabels: [...document.querySelectorAll('.cover-slot-label')].map(e => e.textContent),
    emptyPlaceholders: document.querySelectorAll('.cover-slot-empty').length,
    coverCapKeys: [...document.querySelectorAll('[id^="cover-cap-"]')].map(e => e.id),
    isMulti: isMultiCover(),
    dzText: document.getElementById('dz-cover-text')?.textContent.trim(),
    notePlaceholder: document.getElementById('album-notes')?.placeholder,
  }));

  // Real upload: four photos in one go through the single input.
  await page.setInputFiles('#dz-cover input[type=file]', PHOTOS);
  await page.waitForTimeout(900);

  const afterUpload = await page.evaluate(() => ({
    // Files landed in slot order = drop order.
    slotToFile: coverSlots().map(s => [s.key, coverFiles[s.key]?.name || null]),
    filledPreviews: [...document.querySelectorAll('[id^="cover-preview-"]')]
      .filter(e => e.classList.contains('single-preview') && e.style.display === 'block').length,
    hiddenPlaceholders: [...document.querySelectorAll('.cover-slot-empty')]
      .filter(e => e.style.display === 'none').length,
    dzHiddenWhenFull: document.getElementById('dz-cover')?.style.display === 'none',
  }));

  // Caption + validation.
  const validationAll = await page.evaluate(() => {
    const cap = document.getElementById('cover-cap-name');
    if (cap) cap.value = 'Hot Getaway in Milan';
    return validateCoverStep();
  });

  // Removing one photo re-opens the zone and re-shows that slot's placeholder.
  const afterRemove = await page.evaluate(() => {
    document.querySelector('#cover-preview-inner-coverLeft .single-preview-remove').click();
    return {
      leftCleared: !coverFiles.coverLeft,
      placeholderBack: document.getElementById('cover-slot-empty-coverLeft')?.style.display !== 'none',
      dzVisibleAgain: document.getElementById('dz-cover')?.style.display !== 'none',
      dzText: document.getElementById('dz-cover-text')?.textContent.trim(),
      validation: validateCoverStep(),
    };
  });

  // The re-added photo refills the freed slot (not appended at the end).
  await page.setInputFiles('#dz-cover input[type=file]', [PHOTOS[0]]);
  await page.waitForTimeout(600);
  const afterRefill = await page.evaluate(() => ({
    slotToFile: coverSlots().map(s => [s.key, coverFiles[s.key]?.name || null]),
    validation: validateCoverStep(),
  }));

  return { ...base, afterUpload, validationAll, afterRemove, afterRefill };
});

console.log(JSON.stringify(results, null, 2));
await browser.close();
