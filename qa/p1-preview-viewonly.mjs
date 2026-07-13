// P1-8 — the customer preview in VIEW-ONLY (Preview) mode.
// Catalogue: work/pre-launch-qa/case-catalogue_v1.md
//
// Pass = in Preview mode: no photo reposition-drag, no caption editing, no slot swap —
// but flip navigation still works. Toggling back to Edit restores all three interactions.
//
// Tests BEHAVIOUR, not CSS. Every check drives a real gesture (mouse drag, click+type,
// HTML5 drag-and-drop) and then asserts on the resulting DOM/state:
//   photo   → img.style.objectPosition must not move
//   caption → the caption's text must not change, and it must not take focus
//   swap    → window.bookAssignments must be byte-identical afterwards
//   flip    → window.previewSpreadIndex must advance and the visible .spread-row change
// The Edit-mode leg is what makes the Preview-mode leg meaningful: it proves each gesture
// DOES work when it is supposed to, so "nothing happened" in Preview isn't vacuous.
//
// Read-only w.r.t. the backend: never clicks Save, never approves. Caption/crop edits made
// in the Edit leg live in memory only.
//
// Run: node qa/p1-preview-viewonly.mjs [previewUrl]

import { chromium, webkit } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const URL_FILE = path.resolve('qa/.preview-url-AEV-053.txt');
const PREVIEW_URL = process.argv[2] || (fs.existsSync(URL_FILE) ? fs.readFileSync(URL_FILE, 'utf8').trim() : null);
if (!PREVIEW_URL) { console.error('No preview URL. Run: node qa/p1-preview-token.mjs AEV-053'); process.exit(1); }

const RUN_DIR = path.resolve('sessions/qa-runs', `${new Date().toISOString().slice(0, 10)}-p1-preview-viewonly`);
fs.mkdirSync(RUN_DIR, { recursive: true });

const log = [], findings = [], results = [];
const note = (m) => { const l = `[${new Date().toISOString().slice(11, 19)}] ${m}`; console.log(l); log.push(l); };
const finding = (sev, msg) => { findings.push({ sev, id: 'P1-8', msg }); note(`  ⚠️  ${sev} ${msg}`); };
const check = (browser, mode, name, pass, detail) => {
  results.push({ browser, mode, check: name, pass, detail });
  note(`  ${pass ? '✅' : '❌'} [${mode}] ${name}${detail ? ' — ' + detail : ''}`);
  return pass;
};

// ── in-page helpers ───────────────────────────────────────────────────────────

// Centre a slot without the page's smooth scroll, and horizontally too: the book can be
// wider than the viewport and a stale scrollX parks the slot under the fixed 240px sidebar.
const FOCUS_SLOT = (sel) => {
  const el = document.querySelectorAll(sel.q)[sel.i];
  if (!el) return { err: 'not found' };
  el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
  const r = el.getBoundingClientRect();
  return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height };
};

const SLOT_STATE = (sel) => {
  const slot = document.querySelectorAll(sel.q)[sel.i];
  const img = slot.querySelector('img.slot-photo');
  return {
    objPos: img ? img.style.objectPosition : null,
    slotPE: getComputedStyle(slot).pointerEvents,
    draggable: slot.draggable,
  };
};

async function settle(page) {
  let last = -1;
  for (let i = 0; i < 20; i++) {
    const y = await page.evaluate(() => Math.round(window.scrollY));
    if (y === last) return;
    last = y; await page.waitForTimeout(100);
  }
}

// ── gestures ──────────────────────────────────────────────────────────────────

/** Drag a photo 60px right. Returns whether object-position moved. */
async function tryPhotoDrag(page, sel, { arm }) {
  await page.evaluate(FOCUS_SLOT, sel);
  await settle(page);
  if (arm) {
    // Interior slots need the ✥ handle to arm reposition mode. In Preview the handle is
    // itself inside the slot (pointer-events:none), so a real user cannot click it — we
    // call .click() directly, which is the STRONGEST version of the test: even if the
    // handle were somehow reachable, the drag must still not move the photo.
    await page.evaluate((s) => {
      const h = document.querySelectorAll(s.q)[s.i].querySelector('.reposition-handle');
      if (h) h.click();
    }, sel);
    await page.waitForTimeout(150);
  }
  const before = await page.evaluate(SLOT_STATE, sel);
  const g = await page.evaluate(FOCUS_SLOT, sel);
  await page.mouse.move(g.cx, g.cy);
  await page.mouse.down();
  for (let k = 1; k <= 6; k++) { await page.mouse.move(g.cx + (60 * k) / 6, g.cy); await page.waitForTimeout(25); }
  await page.mouse.up();
  await page.waitForTimeout(150);
  const after = await page.evaluate(SLOT_STATE, sel);
  return { moved: before.objPos !== after.objPos, before: before.objPos, after: after.objPos, slotPE: before.slotPE };
}

/** Click a caption and type. Returns whether its text changed / whether it took focus. */
async function tryCaptionEdit(page, scope = '#book-canvas') {
  const target = await page.evaluate((sc) => {
    const els = [...document.querySelectorAll(sc + ' [contenteditable]')]
      .filter(e => e.offsetParent !== null && e.getBoundingClientRect().width > 20);
    if (!els.length) return null;
    const el = els[0];
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    el.dataset.qaTarget = '1';
    const r = el.getBoundingClientRect();
    return {
      text: el.textContent, editable: el.isContentEditable,
      pe: getComputedStyle(el).pointerEvents,
      cx: r.left + r.width / 2, cy: r.top + r.height / 2,
    };
  }, scope);
  if (!target) return { err: `no visible caption in ${scope}` };
  await settle(page);
  const pos = await page.evaluate(() => {
    const el = document.querySelector('[data-qa-target="1"]');
    const r = el.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  });
  await page.mouse.click(pos.cx, pos.cy);
  await page.waitForTimeout(150);
  const focused = await page.evaluate(() => document.activeElement?.dataset?.qaTarget === '1');
  await page.keyboard.type('ZZZ');
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => {
    const el = document.querySelector('[data-qa-target="1"]');
    const t = el.textContent;
    delete el.dataset.qaTarget;
    return t;
  });
  return { changed: after !== target.text, focused, before: target.text, after, pe: target.pe, editable: target.editable };
}

/** HTML5 drag one placed slot onto another. Returns whether bookAssignments changed. */
async function trySlotSwap(page) {
  const pair = await page.evaluate(() => {
    const placed = [...document.querySelectorAll('.spread-row .photo-slot')]
      .filter(s => s.querySelector('img.slot-photo')?.naturalWidth > 0 && s.querySelector('.reposition-handle'));
    if (placed.length < 2) return null;
    // Two slots in the SAME spread row so both are on screen at once.
    const row = placed[0].closest('.spread-row');
    const same = placed.filter(s => s.closest('.spread-row') === row);
    const [a, b] = same.length >= 2 ? same : placed;
    a.dataset.qaA = '1'; b.dataset.qaB = '1';
    a.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    return { ok: true, sameRow: same.length >= 2 };
  });
  if (!pair) return { err: 'need two placed interior slots' };
  await settle(page);
  const before = await page.evaluate(() => JSON.stringify(window.bookAssignments));
  try {
    await page.dragAndDrop('[data-qa-a="1"]', '[data-qa-b="1"]', { timeout: 15000 });
  } catch (e) {
    // pointer-events:none makes the source unhittable → Playwright times out. That IS the
    // block working; record it rather than treating it as an error.
    const after0 = await page.evaluate(() => JSON.stringify(window.bookAssignments));
    await page.evaluate(() => { document.querySelectorAll('[data-qa-a],[data-qa-b]').forEach(e => { delete e.dataset.qaA; delete e.dataset.qaB; }); });
    return { changed: before !== after0, blocked: true, reason: e.message.split('\n')[0].slice(0, 80) };
  }
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => JSON.stringify(window.bookAssignments));
  await page.evaluate(() => { document.querySelectorAll('[data-qa-a],[data-qa-b]').forEach(e => { delete e.dataset.qaA; delete e.dataset.qaB; }); });
  return { changed: before !== after, blocked: false };
}

// ── the run ───────────────────────────────────────────────────────────────────
async function runBrowser(engine, name) {
  note(`\n════ ${name} ════`);
  const browser = await engine.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => note(`  pageerror: ${e.message}`));
  page.on('dialog', d => d.accept().catch(() => {}));

  await page.goto(PREVIEW_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('#book-canvas', { timeout: 120000 });
  await page.waitForFunction(
    () => [...document.querySelectorAll('#book-canvas .photo-slot img.slot-photo')].filter(i => i.naturalWidth > 0).length >= 20,
    null, { timeout: 180000 });
  await page.waitForTimeout(4000);

  const st = await page.evaluate(() => ({ status: window.orderData?.status, readOnly: !!window._readOnly }));
  note(`status=${st.status} _readOnly=${st.readOnly}`);
  if (st.readOnly) {
    finding('S1', `Order is ${st.status} → preview is read-only; P1-8 needs review_sent (node qa/p1-set-status.mjs AEV-053 review_sent)`);
    await browser.close(); return;
  }

  const COVER = { q: '.cover-canvas .photo-slot', i: 0 };
  const spreadIdx = await page.evaluate(() => [...document.querySelectorAll('.spread-row .photo-slot')]
    .findIndex(s => s.querySelector('img.slot-photo')?.naturalWidth > 0 && s.querySelector('.reposition-handle')));
  const SPREAD = { q: '.spread-row .photo-slot', i: spreadIdx };

  // Edit-mode canvas geometry, recorded BEFORE any Preview visit (used later to prove the
  // Edit view comes back to exactly what it was).
  const wrapBefore = await page.evaluate(() => {
    const w = document.querySelector('.book-canvas-wrap');
    const cs = getComputedStyle(w);
    return { cls: w.className, maxWidth: cs.maxWidth, padding: cs.padding };
  });

  // ── 1. EDIT baseline — every gesture must WORK here ─────────────────────────
  note(' ── EDIT (baseline: the gestures must work)');
  const eCover = await tryPhotoDrag(page, COVER, { arm: false });
  check(name, 'edit', 'cover photo drag moves the photo', eCover.moved, `${eCover.before} → ${eCover.after}`);
  if (!eCover.moved) finding('S1', `${name}: cover photo cannot be repositioned in EDIT mode`);

  const eSpread = await tryPhotoDrag(page, SPREAD, { arm: true });
  check(name, 'edit', 'spread photo drag moves the photo (after ✥)', eSpread.moved, `${eSpread.before} → ${eSpread.after}`);
  if (!eSpread.moved) finding('S1', `${name}: interior photo cannot be repositioned in EDIT mode`);

  for (const [scope, lbl] of [['.cover-canvas', 'cover'], ['.spread-row', 'spread']]) {
    const c = await tryCaptionEdit(page, scope);
    check(name, 'edit', `${lbl} caption is editable by click+type`, !!c.changed, c.err || `pointer-events:${c.pe} focused:${c.focused} "${(c.before || '').slice(0, 18)}" → "${(c.after || '').slice(0, 22)}"`);
    if (!c.changed && !c.err) finding('S2', `${name}: ${lbl} caption not editable in EDIT mode`);
  }

  const eSwap = await trySlotSwap(page);
  check(name, 'edit', 'slot→slot swap changes bookAssignments', !!eSwap.changed, eSwap.err || (eSwap.blocked ? `drag blocked: ${eSwap.reason}` : 'assignments changed'));

  // ── 2. PREVIEW — the same gestures must all be INERT ────────────────────────
  note(' ── PREVIEW (view-only: the same gestures must do nothing)');
  await page.click('#mode-preview-btn');
  await page.waitForTimeout(1200);
  const inPreview = await page.evaluate(() => ({
    flag: !!window._previewMode,
    bodyCls: document.getElementById('page-body').classList.contains('preview-mode'),
    sidebarHidden: document.getElementById('photo-sidebar').classList.contains('hidden'),
    controls: document.getElementById('preview-controls').classList.contains('visible'),
  }));
  check(name, 'preview', 'window._previewMode is set', inPreview.flag, `body.preview-mode=${inPreview.bodyCls} sidebar hidden=${inPreview.sidebarHidden} flip controls visible=${inPreview.controls}`);
  await page.screenshot({ path: path.join(RUN_DIR, `${name}-preview-mode.png`) });

  const pCover = await tryPhotoDrag(page, COVER, { arm: false });
  const okCover = check(name, 'preview', 'cover photo drag is INERT', !pCover.moved, `pointer-events:${pCover.slotPE} objPos ${pCover.before} → ${pCover.after}`);
  if (!okCover) finding('S2', `${name}: the cover photo can still be dragged/repositioned in view-only Preview mode (${pCover.before} → ${pCover.after})`);

  const pSpread = await tryPhotoDrag(page, SPREAD, { arm: true });
  const okSpread = check(name, 'preview', 'interior photo drag is INERT', !pSpread.moved, `pointer-events:${pSpread.slotPE} objPos ${pSpread.before} → ${pSpread.after}`);
  if (!okSpread) finding('S2', `${name}: an interior photo can still be repositioned in view-only Preview mode (${pSpread.before} → ${pSpread.after})`);

  for (const [scope, lbl] of [['.cover-canvas', 'cover'], ['.spread-row', 'spread']]) {
    const c = await tryCaptionEdit(page, scope);
    const ok = check(name, 'preview', `${lbl} caption edit is INERT (click+type)`, !c.changed, c.err || `pointer-events:${c.pe} took focus:${c.focused} text "${(c.before || '').slice(0, 18)}" → "${(c.after || '').slice(0, 22)}"`);
    if (!ok) finding('S2', `${name}: a ${lbl} caption can still be edited by clicking + typing in view-only Preview mode`);
  }

  // Keyboard route. pointer-events:none blocks the MOUSE, but it does not take a
  // contenteditable out of the TAB ORDER. Use REAL Tab presses (not a programmatic
  // .focus(), which a user cannot do) so the finding is genuinely user-reachable.
  await page.evaluate(() => { document.body.focus(); window.scrollTo(0, 0); });
  let tabbed = null;
  for (let i = 0; i < 60 && !tabbed; i++) {
    await page.keyboard.press('Tab');
    const a = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || !el.isContentEditable || !el.closest('#book-canvas')) return null;
      return { text: el.textContent, tabIndex: el.tabIndex };
    });
    if (a) tabbed = { step: i + 1, ...a };
  }
  if (tabbed) {
    await page.keyboard.type('KBD');
    await page.waitForTimeout(250);
    const kb = await page.evaluate((b) => {
      const el = document.activeElement;
      const changed = el.textContent !== b;
      if (changed) el.textContent = b;              // undo — in-memory only, never saved
      el.blur();
      return changed;
    }, tabbed.text);
    check(name, 'preview', 'Tab-focused caption is INERT', !kb, `a caption takes keyboard focus after ${tabbed.step} Tab press(es); typing ${kb ? 'DID' : 'did not'} change it`);
    if (kb) finding('S3', `${name}: in Preview (view-only) mode a caption is still contenteditable and editable via the KEYBOARD. ${tabbed.step} Tab press(es) from the top of the page focuses the "${tabbed.text.slice(0, 20)}" caption and typing changes it. The view-only guard is CSS pointer-events:none (customer-preview.html:255-256), which blocks the mouse but does not remove the element from the tab order; unlike lockForApproval() (line 2776) the mode toggle never sets contenteditable="false".`);
  } else {
    check(name, 'preview', 'Tab-focused caption is INERT', true, 'no caption reachable by Tab');
  }

  const pSwap = await trySlotSwap(page);
  const okSwap = check(name, 'preview', 'slot→slot swap is INERT', !pSwap.changed, pSwap.err || (pSwap.blocked ? `drag source not hittable (pointer-events:none) — ${pSwap.reason}` : 'assignments unchanged'));
  if (!okSwap) finding('S2', `${name}: slots can still be swapped in view-only Preview mode`);

  // Flip navigation must still work.
  const flip0 = await page.evaluate(() => window.previewSpreadIndex);
  await page.click('#preview-next');
  await page.waitForTimeout(700);
  const flip1 = await page.evaluate(() => ({
    idx: window.previewSpreadIndex,
    visible: [...document.querySelectorAll('.spread-row')].filter(r => !r.classList.contains('preview-hidden')).length,
  }));
  await page.click('#preview-prev');
  await page.waitForTimeout(700);
  const flip2 = await page.evaluate(() => window.previewSpreadIndex);
  const flipOK = flip1.idx === flip0 + 1 && flip2 === flip0 && flip1.visible === 1;
  check(name, 'preview', 'flip navigation still works', flipOK, `next: ${flip0}→${flip1.idx}, prev: →${flip2}, spreads visible=${flip1.visible}`);
  if (!flipOK) finding('S2', `${name}: flip navigation is broken in Preview mode (${flip0}→${flip1.idx}→${flip2})`);
  await page.screenshot({ path: path.join(RUN_DIR, `${name}-preview-flipped.png`) });

  // ── 3. Back to EDIT — the interactions must come back ───────────────────────
  note(' ── EDIT again (interactions must return)');
  await page.click('#mode-edit-btn');
  await page.waitForTimeout(1200);
  const backFlag = await page.evaluate(() => !!window._previewMode);
  check(name, 'edit-2', 'window._previewMode cleared', !backFlag);

  const rCover = await tryPhotoDrag(page, COVER, { arm: false });
  check(name, 'edit-2', 'cover photo drag works again', rCover.moved, `${rCover.before} → ${rCover.after}`);
  if (!rCover.moved) finding('S2', `${name}: cover reposition does NOT come back after Preview → Edit`);

  const rSpread = await tryPhotoDrag(page, SPREAD, { arm: true });
  check(name, 'edit-2', 'interior photo drag works again', rSpread.moved, `${rSpread.before} → ${rSpread.after}`);
  if (!rSpread.moved) finding('S2', `${name}: interior reposition does NOT come back after Preview → Edit`);

  for (const [scope, lbl] of [['.cover-canvas', 'cover'], ['.spread-row', 'spread']]) {
    const c = await tryCaptionEdit(page, scope);
    check(name, 'edit-2', `${lbl} caption editable again`, !!c.changed, c.err || `"${(c.before || '').slice(0, 18)}" → "${(c.after || '').slice(0, 22)}"`);
    if (!c.changed && !c.err) finding('S2', `${name}: ${lbl} caption editing does NOT come back after Preview → Edit`);
  }

  const rSwap = await trySlotSwap(page);
  check(name, 'edit-2', 'slot swap works again', !!rSwap.changed, rSwap.err || (rSwap.blocked ? `blocked: ${rSwap.reason}` : 'assignments changed'));
  if (!rSwap.changed && !rSwap.err) finding('S2', `${name}: slot swap does NOT come back after Preview → Edit`);

  const rowsBack = await page.evaluate(() => document.querySelectorAll('.spread-row:not(.preview-hidden)').length);
  check(name, 'edit-2', 'all spreads visible again', rowsBack > 1, `${rowsBack} spread rows shown`);

  // ── 4. Leftover Preview styling on the canvas wrapper ───────────────────────
  const wrapAfter = await page.evaluate(() => {
    const w = document.querySelector('.book-canvas-wrap');
    const cs = getComputedStyle(w);
    return { cls: w.className, maxWidth: cs.maxWidth, padding: cs.padding };
  });
  const clean = wrapAfter.cls === wrapBefore.cls && wrapAfter.maxWidth === wrapBefore.maxWidth && wrapAfter.padding === wrapBefore.padding;
  check(name, 'edit-2', 'book-canvas-wrap styling restored', clean,
    `before {class:"${wrapBefore.cls}" max-width:${wrapBefore.maxWidth} padding:${wrapBefore.padding}} · after {class:"${wrapAfter.cls}" max-width:${wrapAfter.maxWidth} padding:${wrapAfter.padding}}`);
  if (!clean) {
    finding('S3', `${name}: after Preview → Edit the canvas keeps the .preview-mode class on .book-canvas-wrap — max-width ${wrapBefore.maxWidth} → ${wrapAfter.maxWidth}, padding ${wrapBefore.padding} → ${wrapAfter.padding}. customer-preview.html:2700 removes it with getElementById('book-canvas-wrap'), but that element (line 758) has only the CLASS book-canvas-wrap and no id, so the removal is a silent no-op (?. swallows the null). Preview mode ADDS the class via querySelectorAll (line 2717), so it is asymmetric.`);
  }
  await page.screenshot({ path: path.join(RUN_DIR, `${name}-back-to-edit.png`) });

  await browser.close();
}

try {
  const only = process.env.QA_ONLY;
  if (!only || only === 'chromium') await runBrowser(chromium, 'chromium');
  if (!only || only === 'webkit') await runBrowser(webkit, 'webkit');
} catch (e) {
  note(`❌ P1-8 ERROR: ${e.message}`);
  finding('S1', `P1-8 harness threw: ${e.message}`);
}

note('');
note('════════ P1-8 RESULT ════════');
const failed = results.filter(r => !r.pass);
note(`${results.length} checks, ${failed.length} failed`);
note(`Findings: ${findings.length}`);
findings.forEach(f => note(`  ${f.sev} ${f.msg}`));
if (!findings.length) note('✅ P1-8 PASS');

fs.writeFileSync(path.join(RUN_DIR, 'run-log.txt'), log.join('\n'));
fs.writeFileSync(path.join(RUN_DIR, 'findings.json'), JSON.stringify({ previewUrl: PREVIEW_URL, results, findings }, null, 2));
note(`Artefacts → ${RUN_DIR}`);
process.exit(findings.some(f => f.sev === 'S1') ? 1 : 0);
