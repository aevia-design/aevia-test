// S175 — verify the ✦ Generate button appears ONLY on standard spreads.
//
// Adapted from debug-all-templates-render.mjs (same mechanics: select template, tick
// every functional page, load photos, wait on the real condition). Two differences:
//   1. photos come from `assets/test photos/` — qa/test-photos/ is missing (see CLAUDE.md)
//   2. it asserts button placement per spread row, not just "did it render"
//
// The rule under test (docs/briefs/caption-ai-modes.md): every SP* row with captions
// keeps its button; every FP* row has none, because that text is the customer's own.
//
// Needs `npx http-server . -p 8080 -c-1` running (http-server, NOT serve — CLAUDE.md).
import { chromium } from 'playwright';
import { readdirSync } from 'fs';
import path from 'path';

const PHOTOS = {
  Scribble:          'assets/test photos/Toddler',
  Papercut:          'assets/test photos/Toddler',
  Wander:            'assets/test photos/Hiking',
  Joyride:           'assets/test photos/City vibes',
  Laguna:            'assets/test photos/Sea',
  Newborn:           'assets/test photos/Newborn',
  Tender:            'assets/test photos/Wedding',
  'Heirloom-Beige':  'assets/test photos/Wedding',
};

const b = await chromium.launch();
let failures = 0;

for (const [tpl, dir] of Object.entries(PHOTOS)) {
  const files = readdirSync(path.resolve(dir), { recursive: true })
    // PNG as well as JPG: the Sea set (Laguna's) is entirely PNG, and a jpg-only
    // filter silently fed it zero photos — which reads as a render failure, not a
    // harness bug. Both are accepted formats (assets/js/photo-utils.js PHOTO_FORMATS).
    .filter(f => /\.(jpg|jpeg|png)$/i.test(String(f)))
    .slice(0, 24)
    .map(f => path.resolve(dir, String(f)));

  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));

  await p.goto('http://localhost:8080/pages/staff/template-engine.html', { waitUntil: 'load' });
  await p.waitForTimeout(700);

  // Template names in the select may not match the registry key exactly; match on text.
  const picked = await p.evaluate((want) => {
    const sel = document.getElementById('template-select');
    if (!sel) return null;
    const opt = [...sel.options].find(o =>
      o.value.toLowerCase() === want.toLowerCase() ||
      o.textContent.trim().toLowerCase() === want.toLowerCase());
    if (!opt) return null;
    sel.value = opt.value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    return opt.value;
  }, tpl);

  if (!picked) {
    console.log(`− ${tpl.padEnd(16)} SKIPPED (not in #template-select)`);
    await p.close();
    continue;
  }
  await p.waitForTimeout(400);

  await p.evaluate(() => document.querySelectorAll('#fp-group input[type=checkbox]')
    .forEach(c => { if (!c.checked) c.click(); }));
  await p.waitForTimeout(300);

  const coverInput = await p.$('[data-fp-input="cover"]');
  if (coverInput) {
    const max = await p.evaluate(() =>
      parseInt(document.querySelector('.special-upload-btn[data-fp="cover"]')?.dataset.max || '1', 10));
    await coverInput.setInputFiles(files.slice(0, max));
    await p.waitForTimeout(800);
  }

  // Functional pages with their own photo pools need filling too, or their rows may
  // not render the slots that would carry a caption.
  for (const h of await p.$$('[data-fp-input]')) {
    const fp = await h.evaluate(el => el.dataset.fpInput);
    if (fp === 'cover') continue;
    await h.setInputFiles(files.slice(0, 2)).catch(() => {});
    await p.waitForTimeout(250);
  }

  await p.setInputFiles('#photo-file-input', files);
  await p.waitForFunction(
    (n) => (window.photoPool || []).length >= n &&
           document.querySelectorAll('#book-canvas .page-canvas').length > 0,
    files.length,
    { timeout: 30000 },
  ).catch(() => {});
  await p.waitForTimeout(800);

  const st = await p.evaluate(() => {
    const rows = [...document.querySelectorAll('.spread-row[data-spread-id]')];
    const out = {
      standardWithBtn: 0, standardNoBtn: [], functionalWithBtn: [],
      composeRows: [], composeOnStandard: [], canvases: 0,
    };
    out.canvases = document.querySelectorAll('#book-canvas .page-canvas').length;
    rows.forEach(r => {
      const id = r.dataset.spreadId;
      if (id === 'cover') return;
      const compose = r.querySelectorAll('.caption-compose-btn').length;
      // Compose is its own button; exclude it from the generate count so the two
      // rules stay independently checkable.
      const btns = r.querySelectorAll('.caption-ai-btn:not(.caption-compose-btn)').length;
      const caps = r.querySelectorAll('.slot-caption:not(.fp-text-panel)').length;
      if (compose > 0) (/^SP/i.test(id) ? out.composeOnStandard : out.composeRows).push(`${id}(${compose})`);
      if (/^SP/i.test(id)) {
        if (btns > 0) out.standardWithBtn++;
        else if (caps > 0) out.standardNoBtn.push(id);   // has captions but lost its button
      } else if (btns > 0) {
        out.functionalWithBtn.push(`${id}(${btns})`);
      }
    });
    return out;
  });

  // Compose belongs on Our story and nowhere else. Tender and Heirloom must have it;
  // every other template must not.
  const wantsCompose = /^(Tender|Heirloom)/i.test(tpl);
  const composeOk = wantsCompose
    ? st.composeRows.length === 1 && st.composeRows[0].startsWith('FPstory')
    : st.composeRows.length === 0;

  const ok = errs.length === 0
    && st.canvases > 0
    && st.functionalWithBtn.length === 0
    && st.standardNoBtn.length === 0
    && st.standardWithBtn > 0
    && st.composeOnStandard.length === 0
    && composeOk;
  if (!ok) failures++;

  console.log(
    `${ok ? '✓' : '✗'} ${tpl.padEnd(16)} SP-with-button=${String(st.standardWithBtn).padStart(2)}` +
    ` FP-with-button=${st.functionalWithBtn.length ? st.functionalWithBtn.join(',') : '0'}` +
    ` compose=${st.composeRows.length ? st.composeRows.join(',') : '0'}${wantsCompose ? '(want FPstory)' : ''}` +
    `${st.composeOnStandard.length ? ' COMPOSE-ON-SP=' + st.composeOnStandard.join(',') : ''}` +
    `${st.standardNoBtn.length ? ' SP-MISSING-button=' + st.standardNoBtn.join(',') : ''}` +
    ` errors=${errs.length}${errs.length ? ' :: ' + errs[0] : ''}`);

  await p.close();
}

await b.close();
console.log(failures ? `\n${failures} template(s) FAILED` : '\nAI button scope correct on all templates');
process.exit(failures ? 1 : 0);
