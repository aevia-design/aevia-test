// Order text seeding survives the monogram re-render (S161 regression guard).
//
// THE BUG: loadOrderIntoEngine seeds the order's FP text panels (step 7) and cover
// captions (step 8), then step 9 called renderBook() again to paint Heirloom's monogram
// initials. renderBook resets window.bookCaptions on a full rebuild, so that second
// render threw away everything just seeded — and the initials it had itself written.
// A fresh Heirloom order therefore opened with a blank intro page, blank story panels
// and no album name, while the order info panel showed the text correctly. Only
// Heirloom hit it: step 9 re-renders only when applyMonogramInitials returns true, and
// no other template has monogram letters.
//
// This drives the engine in LOCAL mode (no order, no GCS, no cost) and reproduces the
// step 7 → step 9 ordering directly against the real functions.
//
// Run: npx http-server . -p 8080 -c-1   (project root)   then
//      node qa/verify-order-text-seeding.mjs
import { chromium } from 'playwright';
import { readdirSync } from 'fs';
import path from 'path';

const PHOTO_DIR = 'C:/Users/evgmy/aevia-test/assets/test photos/Wedding';
const files = readdirSync(PHOTO_DIR).filter(f => /\.(jpe?g|png)$/i.test(f)).slice(0, 20).map(f => path.join(PHOTO_DIR, f));

let pass = 0, fail = 0;
const ok  = (m) => { pass++; console.log('  ✅ ' + m); };
const bad = (m, d) => { fail++; console.log('  ❌ ' + m + (d ? `\n       ${d}` : '')); };

const b = await chromium.launch();
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));

await p.goto('http://localhost:8080/pages/staff/template-engine.html', { waitUntil: 'load' });
await p.waitForTimeout(800);
await p.selectOption('#template-select', 'Heirloom-Beige');
await p.waitForTimeout(400);
await p.evaluate(() => document.querySelectorAll('#local-mode-controls input[type=checkbox], .fp-toggle input[type=checkbox], #local-fp-list input[type=checkbox]')
  .forEach(c => { if (!c.checked) c.click(); }));
await p.setInputFiles('#photo-file-input', files);
await p.waitForTimeout(5000);

const INTRO = 'On June 14th, 2026,\nin Vienna, Austria,\nwe said "I do."';

const result = await p.evaluate((introText) => {
  // Step 7 equivalent: seed the intro text panel the way loadOrderIntoEngine does.
  const panel = document.querySelector('.fp-text-panel');
  if (!panel) return { error: 'no .fp-text-panel rendered' };
  const si = panel.dataset.spreadIndex, side = panel.dataset.side;
  panel.textContent = introText;
  window.bookCaptions[si] = window.bookCaptions[si] || {};
  window.bookCaptions[si][side] = window.bookCaptions[si][side] || {};
  window.bookCaptions[si][side]['textPanel'] = introText;

  // Step 8 equivalent: cover captions (the album name).
  window.bookCaptions['cover'] = window.bookCaptions['cover'] || {};
  window.bookCaptions['cover']['name'] = 'Anna & Michael';

  // Step 9: initials, then the re-render that used to wipe everything.
  const wrote = applyMonogramInitials(['A', 'M']);
  if (wrote) { rerenderCover(); renderBook({ preserveCaptions: true }); }

  // The repainted panel holds line breaks as <br> (it is contenteditable HTML), so
  // textContent would report the text run together. Normalise before comparing.
  const after = document.querySelector('.fp-text-panel');
  return {
    wroteInitials: wrote,
    // &nbsp; is the browser's contenteditable serialisation, not our text; the engine
    // itself normalises it back to a space when it reads captions (renderSpread).
    panelText:     after ? after.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/&nbsp;/g, ' ') : '(panel gone)',
    savedPanel:    window.bookCaptions?.[si]?.[side]?.['textPanel'] || '',
    coverName:     window.bookCaptions?.cover?.name || '',
    backLetter1:   window.bookCaptions?.cover?.backLetter1 || '',
    monoLetter1:   window.bookCaptions?.[0]?.right?.monoLetter1 || '',
  };
}, INTRO);

console.log('\n— Order text survives the monogram re-render —');
if (result.error) { bad(result.error); }
else {
  result.wroteInitials ? ok('applyMonogramInitials wrote the initials') : bad('applyMonogramInitials wrote the initials');
  result.savedPanel === INTRO ? ok('intro text survives in bookCaptions') : bad('intro text survives in bookCaptions', `got ${JSON.stringify(result.savedPanel)}`);
  result.panelText === INTRO ? ok('intro text still painted in the DOM') : bad('intro text still painted in the DOM', `got ${JSON.stringify(result.panelText)}`);
  result.coverName === 'Anna & Michael' ? ok('album name survives') : bad('album name survives', `got ${JSON.stringify(result.coverName)}`);
  result.backLetter1 === 'A' ? ok('back-cover initial survives') : bad('back-cover initial survives', `got ${JSON.stringify(result.backLetter1)}`);
  result.monoLetter1 === 'A' ? ok('intro initial survives') : bad('intro initial survives', `got ${JSON.stringify(result.monoLetter1)}`);
}
// ── The PICKER path (S162) ────────────────────────────────────────────────────
// The seeding fix above patched loadOrderIntoEngine's own call site. The monogram
// SELECT's change handler is a second, independent caller of renderBook — and the one
// qa/select-monogram.mjs drives on every mockup capture. It wiped every caption, so
// all 12 captured image sets came out with blank covers and blank interior pages.
const picked = await p.evaluate(() => {
  const sel = document.getElementById('monogram-select');
  if (!sel) return { error: 'no #monogram-select in the DOM' };
  const to = [...sel.options].map(o => o.value).find(v => v !== sel.value) || sel.value;
  const panel = document.querySelector('.fp-text-panel');
  const si = panel.dataset.spreadIndex, side = panel.dataset.side;
  sel.value = to;
  sel.dispatchEvent(new Event('change'));   // exactly what selectMonogram does
  return {
    to,
    savedPanel:  window.bookCaptions?.[si]?.[side]?.['textPanel'] || '',
    coverName:   window.bookCaptions?.cover?.name || '',
    backLetter1: window.bookCaptions?.cover?.backLetter1 || '',
  };
});

console.log('\n— Captions survive a monogram CHANGE from the picker —');
if (picked.error) { bad(picked.error); }
else {
  picked.savedPanel  === INTRO            ? ok('intro text survives the picker') : bad('intro text survives the picker', `got ${JSON.stringify(picked.savedPanel)}`);
  picked.coverName   === 'Anna & Michael' ? ok('album name survives the picker') : bad('album name survives the picker', `got ${JSON.stringify(picked.coverName)}`);
  picked.backLetter1 === 'A'              ? ok('back-cover initial survives the picker') : bad('back-cover initial survives the picker', `got ${JSON.stringify(picked.backLetter1)}`);
}

errs.length ? bad(`${errs.length} page error(s)`, errs[0]) : ok('no uncaught page errors');

console.log(`\n──────── ${pass}/${pass + fail} passed ────────`);
await b.close();
process.exit(fail ? 1 : 0);
