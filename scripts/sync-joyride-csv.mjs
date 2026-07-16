#!/usr/bin/env node
/**
 * sync-joyride-csv.mjs — push photo coordinates from the Joyride sizing CSV
 * into joyride-data.js, so you can edit numbers in the spreadsheet and let the
 * script update the data file (no manual hand-editing, no Claude tokens).
 *
 * WHAT IT SYNCS
 *   Only the six geometry fields of each STANDARD-spread photo slot:
 *     x, y, xBleed, yBleed, w, h
 *   (CSV columns: photo_Xmm_without/with bleed, photo_Ymm_without/with bleed,
 *    photo_Width_mm, photo_Height_mm.)
 *   It does NOT touch captions, colours, the cover, functional/map pages, or
 *   any structural JS (svg paths, ratios, zIndex, comments). Those are hand-
 *   maintained — this only moves the numbers you nudge in the sheet.
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
  spread:col('Spread'),
  page:  col('Page'),
  slot:  col('Slot'),
  x:     col('photo_Xmm_without bleed'),
  y:     col('photo_Ymm_without bleed'),
  xB:    col('photo_Xmm_with bleed'),
  yB:    col('photo_Ymm_with bleed'),
  w:     col('photo_Width_mm'),
  h:     col('photo_Height_mm'),
};

// Build the wanted values, keyed by spread/orient/side/slot.
const wanted = []; // { spread, orient, side, slot, x, y, xB, yB, w, h, label }
for (let i = headerIdx + 1; i < csvLines.length; i++) {
  const r = parseCsvLine(csvLines[i], delim);
  if ((r[C.type] || '').toLowerCase() !== 'standard') continue;      // skip Functional
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
    label: `SP${r[C.spread]} ${pageParts[0]} ${orient} slot${slot}`,
  });
}

// ---- read JS + locate each page block by its svg anchor -------------------
let js = readFileSync(JS_PATH, 'utf8');

// Every standard page svg: 'SP Spread N/SP 0N X Side.svg'  (single-letter orient)
const svgRe = /svg:\s*'SP Spread \d+\/SP 0*(\d+) ([HVSM]) (Left|Right)\.svg'/g;
const blocks = []; // { spread, orient, side, index }
for (let m; (m = svgRe.exec(js)); ) {
  blocks.push({ spread: +m[1], orient: m[2], side: m[3].toLowerCase(), index: m.index });
}

const findBlock = (w) => blocks.find((b) => b.spread === w.spread && b.orient === w.orient && b.side === w.side);
const blockEnd = (b) => {
  const next = js.indexOf('svg:', b.index + 1);
  return next === -1 ? js.length : next;
};

// ---- apply -----------------------------------------------------------------
const FIELDS = [['x','x'],['y','y'],['xBleed','xB'],['yBleed','yB'],['w','w'],['h','h']];
const changes = [];
const unmatched = [];

for (const w of wanted) {
  const b = findBlock(w);
  if (!b) { unmatched.push(w.label + '  (no matching svg block in JS)'); continue; }
  const start = b.index, end = blockEnd(b);
  const region = js.slice(start, end);

  // Capture this slot's geometry in strict field order: x, y, xBleed, yBleed, w, h
  const slotRe = new RegExp(
    `(slot:\\s*${w.slot}\\s*,\\s*x:\\s*)(-?[\\d.]+)(\\s*,\\s*y:\\s*)(-?[\\d.]+)` +
    `(\\s*,\\s*xBleed:\\s*)(-?[\\d.]+)(\\s*,\\s*yBleed:\\s*)(-?[\\d.]+)` +
    `(\\s*,\\s*w:\\s*)(-?[\\d.]+)(\\s*,\\s*h:\\s*)(-?[\\d.]+)`
  );
  const mm = region.match(slotRe);
  if (!mm) { unmatched.push(w.label + '  (slot not found in its block)'); continue; }

  const cur = { x: mm[2], y: mm[4], xBleed: mm[6], yBleed: mm[8], w: mm[10], h: mm[12] };
  const next = { x: w.x, y: w.y, xBleed: w.xB, yBleed: w.yB, w: w.w, h: w.h };
  const diffs = [];
  for (const [jsField] of FIELDS) {
    if (Number(cur[jsField]) !== Number(next[jsField])) {
      diffs.push(`${jsField} ${cur[jsField]}→${numStr(next[jsField])}`);
    }
  }
  if (!diffs.length) continue; // already in sync

  // Rebuild the matched substring with normalised new numbers.
  const rebuilt =
    mm[1] + numStr(next.x) + mm[3] + numStr(next.y) +
    mm[5] + numStr(next.xBleed) + mm[7] + numStr(next.yBleed) +
    mm[9] + numStr(next.w) + mm[11] + numStr(next.h);
  const newRegion = region.replace(slotRe, rebuilt);
  js = js.slice(0, start) + newRegion + js.slice(end);

  changes.push({ label: w.label, diffs });
}

// ---- report ----------------------------------------------------------------
console.log(`Joyride CSV → JS sync${DRY ? '  (dry run — nothing written)' : ''}`);
console.log(`  CSV: ${CSV_PATH.replace(ROOT + '/', '')}`);
console.log(`  JS : ${JS_PATH.replace(ROOT + '/', '')}`);
console.log(`  CSV standard slots read: ${wanted.length}\n`);

if (changes.length) {
  console.log(`${changes.length} slot(s) ${DRY ? 'would change' : 'updated'}:`);
  for (const c of changes) console.log(`  • ${c.label.padEnd(22)}  ${c.diffs.join('   ')}`);
} else {
  console.log('✓ Already in sync — no coordinate differences.');
}
if (unmatched.length) {
  console.log(`\n⚠ ${unmatched.length} CSV row(s) could not be matched (left untouched):`);
  for (const u of unmatched) console.log(`  • ${u}`);
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
