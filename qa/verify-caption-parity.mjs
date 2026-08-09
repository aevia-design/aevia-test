// Proves the S159 guarantee: the PDF draws the SAME caption lines the engine displayed.
//
// Staff and customers approve the engine's render, so any line the PDF re-derives can
// silently disagree with what was approved. Since S159 the engine records where each
// caption actually broke (collectCaptionLines) and the PDF draws those lines verbatim.
// This script checks that the recording is faithful — the half a unit test cannot reach,
// because it depends on real browser layout.
//
// Runs entirely in LOCAL mode: no order is loaded, so no GCS reads and no cost.
// Run: npx http-server . -p 8080 -c-1   (project root)   then
//      node qa/verify-caption-parity.mjs [templateValue]
import { chromium } from 'playwright';
import { readdirSync, mkdirSync } from 'fs';
import path from 'path';

const TEMPLATE  = process.argv[2] || 'Heirloom-Beige';
const PHOTO_DIR = 'C:/Users/evgmy/aevia-test/assets/test photos/Wedding';
const OUT_DIR   = 'C:/Users/evgmy/aevia-test/sessions/qa-runs/caption-parity';
mkdirSync(OUT_DIR, { recursive: true });

// Long enough to wrap at any sane box width, and the AEV-088 line that started this.
const PANEL_TEXT = 'Her smile brightens every room.\n\nShe makes ordinary days unforgettable.\n\nShe is my favorite person, every single day.';
const COVER_TEXT = 'ANNA & MICHAEL';

const files = readdirSync(PHOTO_DIR).filter(f => /\.(jpe?g|png)$/i.test(f)).slice(0, 30)
  .map(f => path.join(PHOTO_DIR, f));

const b = await chromium.launch();
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));

await p.goto('http://localhost:8080/pages/staff/template-engine.html', { waitUntil: 'load' });
await p.waitForTimeout(800);
await p.selectOption('#template-select', TEMPLATE);
await p.waitForTimeout(400);
await p.evaluate(() => document.querySelectorAll('#local-mode-controls input[type=checkbox], .fp-toggle input[type=checkbox], #local-fp-list input[type=checkbox]')
  .forEach(c => { if (!c.checked) c.click(); }));
await p.waitForTimeout(300);
await p.setInputFiles('#photo-file-input', files);
await p.waitForTimeout(4000);

// Fill every text panel and cover caption so there is something to measure, then bump
// one panel's size — the staff size control is what pushes lines near a box edge, which
// is exactly when the old double-wrap diverged.
await p.evaluate(({ PANEL_TEXT, COVER_TEXT }) => {
  document.querySelectorAll('.fp-text-panel[data-panel-key="textPanel"]').forEach((el, i) => {
    el.innerHTML = PANEL_TEXT.replace(/\n/g, '<br>');
    if (i === 0) el.style.fontSize = (18 * 3 * 25.4 / 72).toFixed(1) + 'px';  // 18pt, as on AEV-088
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  // Per-photo slot captions: long enough to wrap in every template's caption box.
  document.querySelectorAll('.slot-caption[data-slot-idx]').forEach(el => {
    el.innerHTML = 'A long afternoon in the old town, the light going gold behind us.';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  // Every cover caption, not just 'name' — templates key them differently (Wander uses
  // 'front', Papercut has 'year' and two spine labels), and an unfilled one is skipped.
  document.querySelectorAll('.cover-caption[data-cover-caption-key]').forEach(el => {
    el.innerHTML = COVER_TEXT;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
}, { PANEL_TEXT, COVER_TEXT });
await p.waitForTimeout(600);

const report = await p.evaluate(() => {
  const lineRectCount = (el) => {
    // Independent of captionVisualLines: one client rect per rendered line box.
    const r = document.createRange();
    r.selectNodeContents(el);
    const tops = new Set([...r.getClientRects()].filter(x => x.width > 0).map(x => Math.round(x.top)));
    return tops.size;
  };
  const checks = [];
  const inspect = (el, id) => {
    // Compare with ALL whitespace stripped: textContent renders <br> as nothing, while
    // the recorded lines are separate strings, so any space-preserving comparison is a
    // false negative. What matters is that no character was lost or duplicated.
    const squash = (s) => s.replace(/\s+/g, '');
    const text = squash(el.textContent);
    if (!text) return;
    const lines = window.captionVisualLines(el);
    checks.push({
      id,
      lines,
      // The recorded lines must reconstruct the caption exactly …
      textPreserved: squash(lines.join('')) === text,
      // … and there must be exactly as many of them as the browser drew.
      countMatches: lines.filter(l => l.trim()).length === lineRectCount(el),
      rendered: lineRectCount(el),
    });
  };
  document.querySelectorAll('.slot-caption[data-spread-index]').forEach(el =>
    inspect(el, `${el.dataset.spreadIndex}/${el.dataset.side}/${el.dataset.panelKey || el.dataset.slotIdx}`));
  document.querySelectorAll('.cover-caption[data-cover-caption-key]').forEach(el =>
    inspect(el, `cover/${el.dataset.coverCaptionKey}`));
  return { checks, collected: window.collectCaptionLines() };
});

await p.screenshot({ path: path.join(OUT_DIR, `_${TEMPLATE}.png`), fullPage: true });
await p.close(); await b.close();

const bad = report.checks.filter(c => !c.textPreserved || !c.countMatches);
// Informational only. How many lines a cover name takes is a per-template fact — Scribble
// and Papercut have wide enough boxes (510pt / 340pt) that it fits on one, and Wander's
// key is 'front', not 'name'. The invariant under test is faithful RECORDING, not a
// particular break.
const coverLines = report.collected?.cover || {};

console.log(`template: ${TEMPLATE}`);
console.log(`captions inspected: ${report.checks.length}`);
console.log(`cover caption lines: ${JSON.stringify(coverLines)}`);
const panel = report.checks.find(c => c.id.endsWith('/textPanel'));
if (panel) console.log(`sample panel lines:\n   ${panel.lines.join('\n   ')}`);
if (bad.length) {
  console.log('\nMISMATCHES (recorded lines do not match what was rendered):');
  bad.forEach(c => console.log(`  ${c.id}: rendered ${c.rendered} lines, recorded ${c.lines.length} — ${JSON.stringify(c.lines)}`));
}
if (errs.length) console.log('\npage errors:', errs);

const ok = report.checks.length > 0 && bad.length === 0 && errs.length === 0
        && Object.keys(coverLines).length > 0;
console.log(`\nPASS: ${ok}`);
process.exit(ok ? 0 : 1);
