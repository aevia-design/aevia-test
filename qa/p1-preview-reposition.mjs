// P1-9 — reposition (✥) drag in EDIT mode: does the photo track the cursor 1:1?
// Catalogue: work/pre-launch-qa/case-catalogue_v1.md
//
// Pass = drag-gain ≈ 1.00 in Chromium AND WebKit, at every window width (the book is
// CSS transform:scale-fitted, so a naive handler tracks at the wrong gain on a scaled
// book — the S118 bug), on BOTH a cover slot (always-on drag) and an interior spread
// slot (drag only after the ✥ handle arms it).
//
// HOW GAIN IS MEASURED (quantitative, not eyeballed)
//   The photo is object-fit:cover inside its slot with object-position: X% Y%.
//   In LAYOUT px the image's offset inside the slot is  off = -overflow * pct/100,
//   where overflow = (cover-scaled image size − slot size) on that axis.
//   The slot sits inside a transform:scale(s) book, so ON SCREEN that offset is off * s,
//   with s = slotRect.width / slot.clientWidth (screen px ÷ layout px).
//   So the on-screen distance the photo actually moved for a pointer delta of D screen px:
//       moved = (pctBefore − pctAfter)/100 * overflow_layout * s
//   and                       GAIN = moved / D.       1.00 = tracks the cursor exactly.
//   Every input is read straight from the DOM — naturalWidth/Height, clientWidth/Height,
//   getBoundingClientRect(), the inline object-position — so it does not merely re-derive
//   the product's own arithmetic.
//
// HARNESS GOTCHA (cost a run): customer-preview.html:121 sets `html{scroll-behavior:smooth}`,
// so scrollIntoView ANIMATES. Reading a rect and then moving the mouse to it races the
// scroll and the pointerdown lands on empty space → a false "gain = 0". Scroll with
// behavior:'instant', wait for scrollY to settle, and re-read the rect immediately before
// the drag. The script also counts the pointer events the <img> actually received, so a
// missed drag is visibly a harness miss rather than a product failure.
//
// Reads only. Never saves, never approves. Crop state is reset in-memory (window.heartCrop)
// between measurements so drags can't accumulate into the 0/100 clamp.
//
// Run: node qa/p1-preview-reposition.mjs [previewUrl]
//   (defaults to qa/.preview-url-AEV-053.txt, written by qa/p1-preview-token.mjs)

import { chromium, webkit } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const URL_FILE = path.resolve('qa/.preview-url-AEV-053.txt');
const PREVIEW_URL = process.argv[2] || (fs.existsSync(URL_FILE) ? fs.readFileSync(URL_FILE, 'utf8').trim() : null);
if (!PREVIEW_URL) { console.error('No preview URL. Run: node qa/p1-preview-token.mjs AEV-053'); process.exit(1); }

const WIDTHS = [1600, 1440, 1280, 1100, 950];
const TOL = 0.05;                    // gain outside 1.00 ± TOL = the photo doesn't track the cursor
const RUN_DIR = path.resolve('sessions/qa-runs', `${new Date().toISOString().slice(0, 10)}-p1-preview-reposition`);
fs.mkdirSync(RUN_DIR, { recursive: true });

const log = [], findings = [], rows = [];
const note = (m) => { const l = `[${new Date().toISOString().slice(11, 19)}] ${m}`; console.log(l); log.push(l); };
const finding = (sev, msg) => { findings.push({ sev, id: 'P1-9', msg }); note(`  ⚠️  ${sev} ${msg}`); };

// ── in-page helpers (serialised into the page) ────────────────────────────────

// Centre the slot WITHOUT the page's smooth-scroll animation, and reset its crop to 50/50.
const PREP = (sel) => {
  const slot = document.querySelectorAll(sel.q)[sel.i];
  if (!slot) return { err: 'slot not found' };
  const img = slot.querySelector('img.slot-photo');
  if (!img) return { err: 'no img in slot' };
  if (!img.naturalWidth) return { err: 'img has no pixels yet' };
  // inline:'center' matters. The book can be wider than the viewport, so a previous
  // scrollIntoView (e.g. to the cover) leaves scrollX > 0; with the default inline:'nearest'
  // the next slot is judged "visible enough" and keeps that offset — landing it under the
  // FIXED 240px photo sidebar (z-index 80). The pointer then hits a sidebar thumbnail
  // instead of the photo. Centre horizontally too, and PREP is idempotent.
  slot.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
  const name = img.alt || window.__coverName || '';
  if (name && window.heartCrop) window.heartCrop[name] = { x: 50, y: 50 };
  img.style.objectPosition = '50% 50%';
  return { ok: true, name };
};

// Reset the crop only — no scrolling (the page is already parked where we want it).
const RESET = (sel) => {
  const slot = document.querySelectorAll(sel.q)[sel.i];
  const img = slot.querySelector('img.slot-photo');
  const name = img.alt || window.__coverName || '';
  if (name && window.heartCrop) window.heartCrop[name] = { x: 50, y: 50 };
  img.style.objectPosition = '50% 50%';
};

// Everything the drag plan needs, read fresh, plus instrumentation counters on the <img>.
const GEOM = (sel) => {
  const slot = document.querySelectorAll(sel.q)[sel.i];
  const img = slot.querySelector('img.slot-photo');
  const r = slot.getBoundingClientRect();
  const cw = slot.clientWidth, ch = slot.clientHeight;
  const nw = img.naturalWidth, nh = img.naturalHeight;
  const s = Math.max(cw / nw, ch / nh);            // object-fit: cover
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  if (!img.__qaWired) {
    img.__qaWired = true;
    img.__qaDown = 0; img.__qaMove = 0;
    img.addEventListener('pointerdown', () => { img.__qaDown++; }, true);
    img.addEventListener('pointermove', () => { img.__qaMove++; }, true);
  }
  const hit = document.elementFromPoint(cx, cy);
  return {
    cx, cy,
    dispScale: r.width / cw,
    overflowX: nw * s - cw,                        // LAYOUT px
    overflowY: nh * s - ch,
    hasHandle: !!slot.querySelector('.reposition-handle'),
    repositioning: slot.classList.contains('repositioning'),
    hitTag: hit ? (hit.tagName + '.' + String(hit.className.baseVal ?? hit.className ?? '')).slice(0, 40) : 'null',
    hitIsImg: hit === img,
    down: img.__qaDown, move: img.__qaMove,
    objPos: img.style.objectPosition,
  };
};

const READ = (sel) => {
  const slot = document.querySelectorAll(sel.q)[sel.i];
  const img = slot.querySelector('img.slot-photo');
  const p = (img.style.objectPosition || '50% 50%').split(/\s+/);
  return { x: parseFloat(p[0]), y: parseFloat(p[1]), down: img.__qaDown || 0, move: img.__qaMove || 0 };
};

// Scroll is instant, but layout/fitBook still settles — wait for scrollY to hold still.
async function settle(page) {
  let last = -1;
  for (let i = 0; i < 20; i++) {
    const y = await page.evaluate(() => Math.round(window.scrollY));
    if (y === last) return;
    last = y;
    await page.waitForTimeout(100);
  }
}

// ── one measurement: browser × width × slot ───────────────────────────────────
async function measure(page, browserName, width, label, sel) {
  const prep = await page.evaluate(PREP, sel);
  if (prep.err) { note(`  ${label}: SKIP (${prep.err})`); return; }
  await settle(page);

  let g = await page.evaluate(GEOM, sel);
  if (g.hasHandle && !g.repositioning) {
    // Interior regular slot: the ✥ handle arms reposition mode (swap-drag is the default gesture).
    await page.evaluate((s) => document.querySelectorAll(s.q)[s.i].querySelector('.reposition-handle').click(), sel);
    await page.waitForTimeout(150);
    g = await page.evaluate(GEOM, sel);
    if (!g.repositioning) { finding('S2', `${browserName} @${width}px, ${label}: ✥ handle did not arm reposition mode`); return; }
  }

  const out = { browser: browserName, width, slot: label, dispScale: +g.dispScale.toFixed(4), hit: g.hitTag };
  for (const axis of ['x', 'y']) {
    const AX = axis.toUpperCase();
    const overflow = axis === 'x' ? g.overflowX : g.overflowY;
    if (overflow < 40) { out['gain' + AX] = null; out['note' + AX] = `no measurable overflow (${overflow.toFixed(1)} layout px)`; continue; }

    // Drag far enough to measure precisely, but only ~25 percentage points of travel from
    // the 50% start, so the object-position clamp (0–100) can never truncate the result.
    const D = Math.max(10, Math.min(60, Math.round(0.25 * overflow * g.dispScale)));

    await page.evaluate(RESET, sel);
    const geo = await page.evaluate(GEOM, sel);   // fresh coords immediately before the drag
    const p0 = await page.evaluate(READ, sel);

    await page.mouse.move(geo.cx, geo.cy);
    await page.mouse.down();
    for (let k = 1; k <= 6; k++) {
      await page.mouse.move(geo.cx + (axis === 'x' ? (D * k) / 6 : 0), geo.cy + (axis === 'y' ? (D * k) / 6 : 0));
      await page.waitForTimeout(25);
    }
    await page.mouse.up();
    await page.waitForTimeout(100);

    const p1 = await page.evaluate(READ, sel);
    const gotDown = p1.down - p0.down, gotMove = p1.move - p0.move;
    if (!gotDown || !gotMove) {
      // The <img> never saw the gesture — that is a HARNESS miss (bad coords / overlay),
      // not the product failing to track. Flag it as such rather than as a gain of 0.
      out['gain' + AX] = null;
      out['note' + AX] = `HARNESS MISS — img got ${gotDown} pointerdown / ${gotMove} pointermove; hit-test at drag origin = ${geo.hitTag}`;
      finding('S3', `[harness] ${browserName} @${width}px ${label} axis ${AX}: pointer never reached the img (down=${gotDown} move=${gotMove}, hit=${geo.hitTag}, at ${geo.cx.toFixed(0)},${geo.cy.toFixed(0)})`);
      continue;
    }

    const dPct = p0[axis] - p1[axis];                     // + = image moved with the cursor
    const movedScreenPx = (dPct / 100) * overflow * geo.dispScale;
    const gain = movedScreenPx / D;
    out['gain' + AX] = +gain.toFixed(3);
    out['drag' + AX + 'px'] = D;
    out['overflow' + AX] = +overflow.toFixed(1);
    out['dPct' + AX] = +dPct.toFixed(2);

    if (Math.abs(gain - 1) > TOL) {
      finding('S2', `${browserName} @${width}px, ${label}: drag-gain ${AX} = ${gain.toFixed(3)} (expected 1.00 ±${TOL}) — photo does not track the cursor 1:1 at book scale ${geo.dispScale.toFixed(3)}`);
    }
  }
  rows.push(out);
  note(`  ${label} @${width}  scale=${out.dispScale}  gainX=${out.gainX ?? '—'}  gainY=${out.gainY ?? '—'}  ${out.noteX || out.noteY || ''}`);
}

// ── one browser ───────────────────────────────────────────────────────────────
async function runBrowser(engine, name) {
  note(`\n════ ${name} ════`);
  const browser = await engine.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: WIDTHS[0], height: 950 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => note(`  pageerror: ${e.message}`));
  page.on('dialog', d => d.accept().catch(() => {}));

  await page.goto(PREVIEW_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('#book-canvas', { timeout: 120000 });
  await page.waitForFunction(
    () => [...document.querySelectorAll('#book-canvas .photo-slot img.slot-photo')].filter(i => i.naturalWidth > 0).length >= 20,
    null, { timeout: 180000 }
  );
  await page.waitForTimeout(4000);

  const state = await page.evaluate(() => {
    window.__coverName = window.specialPhotos?.cover?.[0]?.name || '';
    return {
      status: window.orderData?.status,
      readOnly: !!window._readOnly,
      previewMode: !!window._previewMode,
      coverSlots: document.querySelectorAll('.cover-canvas .photo-slot').length,
      spreadSlots: document.querySelectorAll('.spread-row .photo-slot').length,
      handles: document.querySelectorAll('.reposition-handle').length,
    };
  });
  note(`status=${state.status} _readOnly=${state.readOnly} _previewMode=${state.previewMode} coverSlots=${state.coverSlots} spreadSlots=${state.spreadSlots} ✥handles=${state.handles}`);
  if (state.readOnly) {
    finding('S1', `Order is ${state.status} → the preview is read-only. P1-9 needs a review_sent order (run: node qa/p1-set-status.mjs AEV-053 review_sent)`);
    await browser.close();
    return;
  }

  // Two interior slots: the first horizontally-overflowing one (tests the X branch) and the
  // most vertically-overflowing one (tests the Y branch — a slot whose photo is cropped
  // top/bottom rather than left/right). Both must have a ✥ handle.
  const picks = await page.evaluate(() => {
    const slots = [...document.querySelectorAll('.spread-row .photo-slot')];
    const meta = slots.map((s, i) => {
      const img = s.querySelector('img.slot-photo');
      if (!img || !img.naturalWidth || !s.querySelector('.reposition-handle')) return null;
      const cw = s.clientWidth, ch = s.clientHeight, nw = img.naturalWidth, nh = img.naturalHeight;
      const k = Math.max(cw / nw, ch / nh);
      return { i, ox: nw * k - cw, oy: nh * k - ch };
    }).filter(Boolean);
    const x = meta.filter(m => m.ox > 40).sort((a, b) => b.ox - a.ox)[0];
    const y = meta.filter(m => m.oy > 40).sort((a, b) => b.oy - a.oy)[0];
    return { xIdx: x ? x.i : -1, yIdx: y ? y.i : -1 };
  });
  note(`Interior slots under test: X-overflow slot [${picks.xIdx}], Y-overflow slot [${picks.yIdx}]`);

  const COVER = { q: '.cover-canvas .photo-slot', i: 0 };
  const SPREAD_X = { q: '.spread-row .photo-slot', i: picks.xIdx };
  const SPREAD_Y = { q: '.spread-row .photo-slot', i: picks.yIdx };

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 950 });
    await page.waitForTimeout(800);         // fitBook runs on rAF after resize
    note(` ── ${name} @ ${width}px`);
    await measure(page, name, width, 'cover', COVER);
    if (picks.xIdx >= 0) await measure(page, name, width, 'spread-x', SPREAD_X);
    if (picks.yIdx >= 0) await measure(page, name, width, 'spread-y', SPREAD_Y);
  }

  await page.setViewportSize({ width: 1280, height: 950 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(RUN_DIR, `${name}-1280.png`) });
  await browser.close();
}

try {
  const only = process.env.QA_ONLY;                 // QA_ONLY=chromium|webkit to narrow a debug run
  if (!only || only === 'chromium') await runBrowser(chromium, 'chromium');
  if (!only || only === 'webkit') await runBrowser(webkit, 'webkit');
} catch (e) {
  note(`❌ P1-9 ERROR: ${e.message}`);
  finding('S1', `P1-9 harness threw: ${e.message}`);
}

// ── Report ────────────────────────────────────────────────────────────────────
note('');
note('════════ P1-9 DRAG-GAIN TABLE (1.00 = photo tracks the cursor exactly) ════════');
note('browser    width  slot     bookScale  gainX   gainY   note');
for (const r of rows) {
  note(
    `${r.browser.padEnd(10)} ${String(r.width).padEnd(6)} ${r.slot.padEnd(8)} ` +
    `${String(r.dispScale).padEnd(10)} ${String(r.gainX ?? '—').padEnd(7)} ${String(r.gainY ?? '—').padEnd(7)} ` +
    `${r.noteX || r.noteY || ''}`
  );
}
const real = findings.filter(f => !/^\[harness\]/.test(f.msg));
note('');
note(`Findings: ${findings.length} (product: ${real.length})`);
findings.forEach(f => note(`  ${f.sev} ${f.msg}`));
if (!real.length && rows.some(r => r.gainX !== null && r.gainX !== undefined || r.gainY !== null)) {
  note('✅ P1-9 PASS — every measured gain is 1.00 ± ' + TOL);
}

fs.writeFileSync(path.join(RUN_DIR, 'run-log.txt'), log.join('\n'));
fs.writeFileSync(path.join(RUN_DIR, 'findings.json'), JSON.stringify({ previewUrl: PREVIEW_URL, tolerance: TOL, rows, findings }, null, 2));
note(`Artefacts → ${RUN_DIR}`);
process.exit(real.some(f => f.sev === 'S1') ? 1 : 0);
