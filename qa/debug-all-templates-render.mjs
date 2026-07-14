// Cross-template render regression. Every template must render with 0 pageerrors.
// Cheap guard for the shared-engine code (renderCover / renderSpread / the allocator /
// buildBookSequence), where a change made for one template silently breaks another.
// Run after ANY edit to template-engine.html. Needs `npx serve . -p 8080` running.
import { chromium } from 'playwright';
import { readdirSync } from 'fs';
import path from 'path';

const PHOTOS = {
  Scribble: 'qa/test-photos/scribble-papercut',
  Papercut: 'qa/test-photos/scribble-papercut',
  Wander:   'qa/test-photos/wander',
  Newborn:  'qa/test-photos/newborn',
  Tender:   'qa/test-photos/tender',
  Joyride:  'qa/test-photos/tender',   // no dedicated set yet; Tender's is the closest mix
};

const b = await chromium.launch();
let failures = 0;

for (const [tpl, dir] of Object.entries(PHOTOS)) {
  const files = readdirSync(path.resolve(dir), { recursive: true })
    .filter(f => String(f).endsWith('.jpg'))
    .slice(0, 24)
    .map(f => path.resolve(dir, String(f)));

  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));

  await p.goto('http://localhost:8080/pages/staff/template-engine.html', { waitUntil: 'load' });
  await p.waitForTimeout(700);
  await p.selectOption('#template-select', tpl);
  await p.waitForTimeout(300);
  // Tick every functional page (the live checkbox group is #fp-group — note the older
  // debug-tender/debug-wander scripts use a STALE selector and silently tick nothing).
  await p.evaluate(() => document.querySelectorAll('#fp-group input[type=checkbox]')
    .forEach(c => { if (!c.checked) c.click(); }));
  await p.waitForTimeout(300);

  // Cover photos first — this ordering is what exposed the uninitialised
  // window.bookCaptions crash (renderCover ran before renderBook).
  const coverInput = await p.$('[data-fp-input="cover"]');
  if (coverInput) {
    const max = await p.evaluate(() =>
      parseInt(document.querySelector('.special-upload-btn[data-fp="cover"]')?.dataset.max || '1', 10));
    await coverInput.setInputFiles(files.slice(0, max));
    await p.waitForTimeout(800);
  }

  await p.setInputFiles('#photo-file-input', files);
  // Wait on the actual condition, not a fixed timeout: photo decode+EXIF is much slower
  // for some sets (Newborn ships 300dpi originals) and a flat sleep false-failed it.
  await p.waitForFunction(
    (n) => (window.photoPool || []).length >= n &&
           document.querySelectorAll('#book-canvas .page-canvas').length > 0,
    files.length,
    { timeout: 30000 },
  ).catch(() => {});
  await p.waitForTimeout(500);

  const st = await p.evaluate(() => {
    const c = document.getElementById('book-canvas');
    return {
      canvases: c.querySelectorAll('.page-canvas').length,
      cover: !!c.querySelector('.cover-canvas'),
    };
  });

  const ok = errs.length === 0 && st.canvases > 0;
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${tpl.padEnd(9)} canvases=${String(st.canvases).padStart(2)} cover=${st.cover ? 'y' : 'n'} errors=${errs.length}${errs.length ? ' :: ' + errs[0] : ''}`);
  await p.close();
}

await b.close();
console.log(failures ? `\n${failures} template(s) FAILED` : '\nall templates clean');
process.exit(failures ? 1 : 0);
