#!/usr/bin/env node
/**
 * sync-joyride-csv.mjs — push photo coordinates from the Joyride sizing CSV
 * into joyride-data.js, so you can edit numbers in the spreadsheet and let the
 * script update the data file (no manual hand-editing, no Claude tokens).
 *
 * WHAT IT SYNCS
 *   STANDARD spread rows — each photo slot:
 *   1. The six geometry fields:  x, y, xBleed, yBleed, w, h
 *      (CSV: photo_Xmm_without/with bleed, photo_Ymm_without/with bleed,
 *       photo_Width_mm, photo_Height_mm.)
 *   2. Every field of an existing caption:  xMm, yMm, wMm, hMm, halign, valign,
 *      font, sizePt, style, letterSpacing, lineSpacing, color
 *      (CSV: the captions_* / caption_* columns. Note xMm/yMm come from the
 *       WITH-BLEED columns — caption coords carry bleed, see ADR/bleed model.)
 *
 *   FUNCTIONAL rows — the Intro title/body and the itinerary text panel:
 *   3. The same caption fields, aimed at a named panel via FUNCTIONAL_TARGETS.
 *      No geometry (functional rows have "-" in the photo columns).
 *
 * WHAT IT IGNORES COMPLETELY  (S136 — checked, deliberate)
 *   • "Aspect ratio" — this CSV column is decorative and rotted. Nothing reads
 *     it at runtime, so nothing ever forced it to stay correct, and it now
 *     contradicts its own width/height columns on 23 of 38 slots (a 200×200
 *     square row reads "03:02"; a 107×80 horizontal reads "03:04"). The JS
 *     `ratio` is the truth and is derived by hand from w×h. Not even reported —
 *     23 warnings every run would just train you to ignore the audit.
 *     ⚠ If you ever nudge w/h in the sheet, update the JS `ratio` by hand too.
 *   • "Orientation" — nothing reads it either. The `orient` the engines use on
 *     mixed M pages is hand-written in the JS.
 *
 * WHAT IT ONLY REPORTS, NEVER WRITES
 *   • bgColor, and JS `orient` where a slot has one — in sync everywhere today;
 *     reported so a real divergence surfaces instead of passing silently.
 *   • caption allowed yes/no flips — turning a caption ON needs a full object
 *     (position, font, colour), which is a design decision, not a number nudge.
 *
 * It does NOT touch the cover, functional/map pages, or any structural JS
 * (svg paths, zIndex, comments). Those stay hand-maintained.
 *
 * HOW MATCHING WORKS (why it's safe)
 *   Each page block in the JS is anchored by its svg filename, which encodes
 *   spread + orientation + side, e.g.  'SP Spread 1/SP 01 H Left.svg'.
 *   A CSV row's  Spread + Page ("Left H") + Slot  maps to the same anchor, so
 *   every value lands in exactly one place. A CSV row that finds no match is
 *   reported, never guessed.
 *
 * USAGE  (run from the repo root)
 *   node scripts/sync-joyride-csv.mjs            # apply changes, print a summary
 *   node scripts/sync-joyride-csv.mjs --dry-run  # preview only, write nothing
 *
 *   Advanced (testing): --csv=PATH  --js=PATH  point at alternate files.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

// ---- args -----------------------------------------------------------------
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run') || args.includes('--check');
const getOpt = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const CSV_PATH = resolve(ROOT, getOpt('csv') || 'assets/Template_Joyride/Joyride_sizing_full.csv');
const JS_PATH  = resolve(ROOT, getOpt('js')  || 'assets/Template_Joyride/joyride-data.js');

// ---- tiny CSV parser (handles quoted fields + "a, b" headers) -------------
function parseCsvLine(line, delim) {
  const out = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === delim) { out.push(cur); cur = ''; }
      else cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

// Normalise a number the way the JS wants it: "108"→108, "94.50"→94.5.
const numStr = (v) => String(Number(v));
const isNum  = (v) => v !== '' && v !== '-' && Number.isFinite(Number(v));

// ---- read + parse CSV -----------------------------------------------------
const csvRaw = readFileSync(CSV_PATH, 'utf8').replace(/\r/g, '');
const csvLines = csvRaw.split('\n').filter((l) => l.length);
// The real header is the row whose first cell is "Type" (line 1 is a title row).
const delim = (csvLines.find((l) => /(^|[,;])Type([,;])/.test(l)) || '').includes(';') ? ';' : ',';
const headerIdx = csvLines.findIndex((l) => parseCsvLine(l, delim)[0] === 'Type');
if (headerIdx === -1) { console.error('✗ Could not find the "Type" header row in the CSV.'); process.exit(1); }
const header = parseCsvLine(csvLines[headerIdx], delim);
const col = (name) => {
  const i = header.indexOf(name);
  if (i === -1) { console.error(`✗ CSV is missing expected column "${name}".`); process.exit(1); }
  return i;
};
const C = {
  type:  col('Type'),
  syb:   col('Syb-type'),
  spread:col('Spread'),
  page:  col('Page'),
  slot:  col('Slot'),
  x:     col('photo_Xmm_without bleed'),
  y:     col('photo_Ymm_without bleed'),
  xB:    col('photo_Xmm_with bleed'),
  yB:    col('photo_Ymm_with bleed'),
  w:     col('photo_Width_mm'),
  h:     col('photo_Height_mm'),
  // captions — xMm/yMm read the WITH-BLEED columns (caption coords carry bleed)
  capOn:  col('captions allowed'),
  capX:   col('captions_Xmm_with bleed'),
  capY:   col('captions_Ymm_with bleed'),
  capW:   col('captions_Width_mm'),
  capH:   col('captions_Height_mm'),
  capHal: col('captions_Halignment'),
  capVal: col('captions_Valignment'),
  capFont:col('caption_font'),
  capSize:col('caption_size_pt'),
  capStyle:col('caption_style'),
  capLs:  col('caption_letter_spacing'),
  capLine:col('caption_line_spacing'),
  capCol: col('captions_color'),
  // audit-only (reported, never written)
  bg:     col('bgColor'),
  ratio:  col('Aspect ratio'),
  orient: col('Orientation'),
};

// FUNCTIONAL rows → the text panel they describe.
// Keyed by the CSV's "Syb-type" cell, which is why that cell must be unique per
// panel: an Intro page holds TWO panels (title + body), and before S136 both
// rows just said "Intro" — indistinguishable, so the script skipped them and a
// caption change made in the sheet was silently ignored. If you add a functional
// text panel, give it a unique Syb-type and add a line here.
const FUNCTIONAL_TARGETS = {
  'intro title':      { svg: 'FP Intro/FP 00 Intro.svg',    key: 'textPanelTitle' },
  'intro text':       { svg: 'FP Intro/FP 00 Intro.svg',    key: 'textPanel' },
  'travel itinerary': { svg: 'FP Spread 1/FP 01 Right.svg', key: 'textPanel' },
};

// Caption field map: JS key → { csv column, kind }.
// 'num' writes a bare number; 'str' writes a single-quoted, lower-cased string
// (the JS uses lower-case for halign/valign/style/colour; font keeps its case).
const CAPTION_FIELDS = [
  ['xMm',           C.capX,     'num'],
  ['yMm',           C.capY,     'num'],
  ['wMm',           C.capW,     'num'],
  ['hMm',           C.capH,     'num'],
  ['halign',        C.capHal,   'str'],
  ['valign',        C.capVal,   'str'],
  ['font',          C.capFont,  'strRaw'],
  ['sizePt',        C.capSize,  'num'],
  ['style',         C.capStyle, 'str'],
  ['letterSpacing', C.capLs,    'num'],
  ['lineSpacing',   C.capLine,  'num'],
  ['color',         C.capCol,   'str'],
];

// Build the wanted values, keyed by spread/orient/side/slot.
const wanted = [];   // STANDARD photo slots: { spread, orient, side, slot, x, y, ..., label }
const wantedFn = []; // FUNCTIONAL text panels: { svg, key, row, label }
const unkeyed = [];  // functional rows whose Syb-type has no target

for (let i = headerIdx + 1; i < csvLines.length; i++) {
  const r = parseCsvLine(csvLines[i], delim);
  const type = (r[C.type] || '').toLowerCase();

  if (type === 'functional') {
    const syb = (r[C.syb] || '').trim();
    const target = FUNCTIONAL_TARGETS[syb.toLowerCase()];
    if (!target) { unkeyed.push(`Functional "${syb || '(blank)'}"  (no FUNCTIONAL_TARGETS entry — add one)`); continue; }
    wantedFn.push({ ...target, row: r, label: `FN ${syb}` });
    continue;
  }
  if (type !== 'standard') continue;

  const pageParts = (r[C.page] || '').split(/\s+/);                  // "Left H" -> [Left,H]
  if (pageParts.length !== 2) continue;
  const side = pageParts[0].toLowerCase();                          // left|right
  const orient = pageParts[1].toUpperCase();                        // H|V|S|M
  if (!['left', 'right'].includes(side) || !['H','V','S','M'].includes(orient)) continue;
  const slot = parseInt(r[C.slot], 10);
  if (!Number.isFinite(slot)) continue;
  if (![C.x, C.y, C.xB, C.yB, C.w, C.h].every((c) => isNum(r[c]))) continue; // need all 6
  wanted.push({
    spread: parseInt(r[C.spread], 10), orient, side, slot,
    x: r[C.x], y: r[C.y], xB: r[C.xB], yB: r[C.yB], w: r[C.w], h: r[C.h],
    capOn: (r[C.capOn] || '').toLowerCase() === 'yes',
    row: r,
    label: `SP${r[C.spread]} ${pageParts[0]} ${orient} slot${slot}`,
  });
}

// ---- read JS + locate each page block by its svg anchor -------------------
let js = readFileSync(JS_PATH, 'utf8');

// Locate a page block by its svg anchor: 'SP Spread N/SP 0N X Side.svg'.
// The filename encodes spread + orient + side, so each CSV row maps to exactly
// one block.
//
// ⚠ This MUST re-search the *current* `js` on every call. An earlier version
// pre-computed all offsets once, but each write changes the string's length and
// shifts every later offset — so the edits drifted out of their blocks. Geometry
// edits only shift by a char or two and happened to survive; caption edits shift
// far more and broke 37 of 38 rows. Re-finding is O(n) per row and always right.
const findBlock = (w) => {
  const side = w.side === 'left' ? 'Left' : 'Right';
  const re = new RegExp(`svg:\\s*'SP Spread ${w.spread}\\/SP 0*${w.spread} ${w.orient} ${side}\\.svg'`);
  const index = js.search(re);
  if (index === -1) return null;
  const next = js.indexOf('svg:', index + 1);
  return { index, end: next === -1 ? js.length : next };
};

// Parse the ORIGINAL data file once, for the read-only audit. Writing is done
// by regex (to preserve formatting + comments); auditing reads the real object,
// which is simpler and can see page-level fields like bgColor.
const parsedBefore = (() => {
  const sb = { window: {} };
  vm.runInNewContext(js, sb);
  return sb.window.JOYRIDE_DATA;
})();

// ---- helpers for scoping an edit to one slot / its caption -----------------
// Returns [start,end) of the balanced { ... } object that opens at `from`.
const braceSpan = (text, from) => {
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return { start: from, end: i + 1 };
  }
  return null;
};
// The `{ slot: N, ... }` object inside a page block.
const slotSpan = (region, slot) => {
  const m = region.match(new RegExp(`\\{\\s*slot:\\s*${slot}\\s*,`));
  return m ? braceSpan(region, m.index) : null;
};
// The `caption: { ... }` object inside a slot.
const captionSpan = (slotText) => {
  const m = slotText.match(/caption:\s*\{/);
  return m ? braceSpan(slotText, m.index + m[0].length - 1) : null;
};

// CSV value → the exact literal the JS should hold.
const cleanValue = (kind, raw) => {
  const v = String(raw).trim();
  if (kind === 'num')    return numStr(v.replace(/pt$/i, ''));   // "20pt" → "20"
  if (kind === 'strRaw') return v;                                // font keeps its case
  return v.toLowerCase();                                         // halign/valign/style/color
};

// Rewrite every caption field inside one `caption: { ... }` literal from one CSV
// row. Shared by the standard-slot and functional-panel passes. Pushes a
// human-readable note per change onto `diffs`; returns the new text.
const applyCaptionFields = (capText, row, diffs, prefix) => {
  for (const [jsKey, csvCol, kind] of CAPTION_FIELDS) {
    const raw = row[csvCol];
    if (raw == null || raw === '' || raw === '-') continue;
    const val = cleanValue(kind, raw);
    const re = kind === 'num'
      ? new RegExp(`(\\b${jsKey}:\\s*)(-?[\\d.]+)`)
      : new RegExp(`(\\b${jsKey}:\\s*')([^']*)(')`);
    const hit = capText.match(re);
    if (!hit) continue;                         // field absent in JS — leave alone
    const same = kind === 'num' ? Number(hit[2]) === Number(val) : hit[2] === val;
    if (same) continue;
    diffs.push(`${prefix}${jsKey} ${hit[2]}→${val}`);
    capText = capText.replace(re, kind === 'num' ? `$1${val}` : `$1${val}$3`);
  }
  return capText;
};

// ---- apply -----------------------------------------------------------------
const FIELDS = [['x','x'],['y','y'],['xBleed','xB'],['yBleed','yB'],['w','w'],['h','h']];
const changes = [];
const unmatched = [];
const audit = [];

for (const w of wanted) {
  const b = findBlock(w);
  if (!b) { unmatched.push(w.label + '  (no matching svg block in JS)'); continue; }
  const start = b.index, end = b.end;
  let region = js.slice(start, end);
  const diffs = [];

  // --- 1. geometry: x, y, xBleed, yBleed, w, h (strict field order) ---------
  const slotRe = new RegExp(
    `(slot:\\s*${w.slot}\\s*,\\s*x:\\s*)(-?[\\d.]+)(\\s*,\\s*y:\\s*)(-?[\\d.]+)` +
    `(\\s*,\\s*xBleed:\\s*)(-?[\\d.]+)(\\s*,\\s*yBleed:\\s*)(-?[\\d.]+)` +
    `(\\s*,\\s*w:\\s*)(-?[\\d.]+)(\\s*,\\s*h:\\s*)(-?[\\d.]+)`
  );
  const mm = region.match(slotRe);
  if (!mm) { unmatched.push(w.label + '  (slot not found in its block)'); continue; }

  const cur  = { x: mm[2], y: mm[4], xBleed: mm[6], yBleed: mm[8], w: mm[10], h: mm[12] };
  const next = { x: w.x, y: w.y, xBleed: w.xB, yBleed: w.yB, w: w.w, h: w.h };
  for (const [jsField] of FIELDS) {
    if (Number(cur[jsField]) !== Number(next[jsField])) {
      diffs.push(`${jsField} ${cur[jsField]}→${numStr(next[jsField])}`);
    }
  }
  if (diffs.length) {
    region = region.replace(slotRe,
      mm[1] + numStr(next.x)      + mm[3] + numStr(next.y) +
      mm[5] + numStr(next.xBleed) + mm[7] + numStr(next.yBleed) +
      mm[9] + numStr(next.w)      + mm[11] + numStr(next.h));
  }

  // --- 2. caption fields ----------------------------------------------------
  const sSpan = slotSpan(region, w.slot);
  const slotText = sSpan ? region.slice(sSpan.start, sSpan.end) : null;
  const cSpan = slotText ? captionSpan(slotText) : null;
  const jsHasCaption = !!cSpan && /allowed:\s*true/.test(slotText.slice(cSpan.start, cSpan.end));

  if (w.capOn !== jsHasCaption) {
    // Turning a caption on/off needs a full object (position, font, colour) —
    // a design decision, not a number nudge. Report, never guess.
    audit.push(`${w.label.padEnd(22)} caption allowed: CSV=${w.capOn ? 'yes' : 'no'}  JS=${jsHasCaption ? 'yes' : 'no'}  (not written — needs a hand edit)`);
  } else if (w.capOn && cSpan) {
    const capText = applyCaptionFields(slotText.slice(cSpan.start, cSpan.end), w.row, diffs, 'caption.');
    // splice caption → slot → region
    const newSlot = slotText.slice(0, cSpan.start) + capText + slotText.slice(cSpan.end);
    region = region.slice(0, sSpan.start) + newSlot + region.slice(sSpan.end);
  }

  // --- 3. audit-only fields (reported, never written) ------------------------
  const pages = parsedBefore.spreads?.[`SP${w.spread}`]?.pages?.[w.side];
  const pageObj = pages?.[w.orient] || pages?.default;
  const slotObj = (pageObj?.slots || []).find((s) => s.slot === w.slot);
  const csvBg = (w.row[C.bg] || '').trim();
  if (csvBg && csvBg !== '-' && pageObj && csvBg.toLowerCase() !== String(pageObj.bgColor).toLowerCase()) {
    audit.push(`${w.label.padEnd(22)} bgColor: CSV=${csvBg}  JS=${pageObj.bgColor}`);
  }
  const csvOr = (w.row[C.orient] || '').trim();
  if (csvOr && slotObj?.orient && csvOr.toLowerCase() !== String(slotObj.orient).toLowerCase()) {
    audit.push(`${w.label.padEnd(22)} orient: CSV=${csvOr}  JS=${slotObj.orient}`);
  }

  if (!diffs.length) continue;                  // nothing changed for this slot
  js = js.slice(0, start) + region + js.slice(end);
  changes.push({ label: w.label, diffs });
}

// ---- apply: FUNCTIONAL text panels -----------------------------------------
// Functional pages carry no photo slots (their CSV geometry cells are "-"), so
// only the caption fields are synced. Each row is aimed at one named panel via
// FUNCTIONAL_TARGETS, since Syb-type is the only thing telling two panels on the
// same page apart.
for (const f of wantedFn) {
  // Find the page block by its FP svg anchor, in the CURRENT js (see findBlock).
  const anchor = js.indexOf(`svg: '${f.svg}'`);
  if (anchor === -1) { unmatched.push(`${f.label}  (svg '${f.svg}' not found in JS)`); continue; }
  const nextSvg = js.indexOf('svg:', anchor + 1);
  const start = anchor, end = nextSvg === -1 ? js.length : nextSvg;
  let region = js.slice(start, end);

  // `textPanel:` will not match `textPanelTitle:` — the colon disambiguates.
  const pm = region.match(new RegExp(`\\b${f.key}:\\s*\\{`));
  if (!pm) { unmatched.push(`${f.label}  (${f.key} not found on that page)`); continue; }
  const pSpan = braceSpan(region, pm.index + pm[0].length - 1);
  const panelText = region.slice(pSpan.start, pSpan.end);
  const cSpan = captionSpan(panelText);
  if (!cSpan) { unmatched.push(`${f.label}  (${f.key} has no caption object)`); continue; }

  const diffs = [];
  const capText = applyCaptionFields(panelText.slice(cSpan.start, cSpan.end), f.row, diffs, `${f.key}.`);
  if (!diffs.length) continue;

  const newPanel = panelText.slice(0, cSpan.start) + capText + panelText.slice(cSpan.end);
  region = region.slice(0, pSpan.start) + newPanel + region.slice(pSpan.end);
  js = js.slice(0, start) + region + js.slice(end);
  changes.push({ label: f.label, diffs });
}

// ---- report ----------------------------------------------------------------
console.log(`Joyride CSV → JS sync${DRY ? '  (dry run — nothing written)' : ''}`);
console.log(`  CSV: ${CSV_PATH.replace(ROOT + '/', '')}`);
console.log(`  JS : ${JS_PATH.replace(ROOT + '/', '')}`);
console.log(`  CSV rows read: ${wanted.length} standard slots, ${wantedFn.length} functional panels\n`);

if (changes.length) {
  console.log(`${changes.length} row(s) ${DRY ? 'would change' : 'updated'}:`);
  for (const c of changes) console.log(`  • ${c.label.padEnd(22)}  ${c.diffs.join('   ')}`);
} else {
  console.log('✓ Already in sync — no geometry or caption differences.');
}
if (unmatched.length) {
  console.log(`\n⚠ ${unmatched.length} CSV row(s) could not be matched (left untouched):`);
  for (const u of unmatched) console.log(`  • ${u}`);
}
if (unkeyed.length) {
  console.log(`\n⚠ ${unkeyed.length} functional row(s) skipped — unknown Syb-type:`);
  for (const u of unkeyed) console.log(`  • ${u}`);
}
if (audit.length) {
  console.log(`\n⚠ ${audit.length} difference(s) this script will NOT write — check by hand:`);
  for (const a of audit) console.log(`  • ${a}`);
}

// ---- write + verify --------------------------------------------------------
if (!DRY && changes.length) {
  // Safety: confirm the edited file still loads and still has all its spreads.
  try {
    const sandbox = { window: {} };
    vm.runInNewContext(js, sandbox);
    const n = Object.keys(sandbox.window.JOYRIDE_DATA?.spreads || {}).length;
    if (!n) throw new Error('JOYRIDE_DATA.spreads is empty after edit');
    writeFileSync(JS_PATH, js);
    console.log(`\n✓ Written. Data file loads cleanly (${n} spreads).`);
  } catch (e) {
    console.error(`\n✗ ABORTED — edited JS failed to load, file NOT written: ${e.message}`);
    process.exit(1);
  }
}
