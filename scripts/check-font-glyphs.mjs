// Does every font we print with actually contain the German letters?
//
// Why this exists (S180): captions and cover text are PRINTED. German needs
// ä ö ü Ä Ö Ü ß and the German quote marks „ “. A font that lacks a glyph does
// not error — the renderer silently substitutes another face or draws nothing,
// so a missing umlaut reaches the printed book looking like a design choice.
// Several of our faces are decorative or handwriting fonts (Twinkle Star,
// FirstTimeWriting), and those very often ship Latin-basic only.
//
// Reads the TrueType/OpenType `cmap` table directly — no dependency. Formats 4
// and 12 cover every font in the repo; anything else is reported as UNKNOWN
// rather than silently passed.
//
// Usage:  node scripts/check-font-glyphs.mjs
//         node scripts/check-font-glyphs.mjs --all     (every weight, not just
//                                                       the ones templates name)
// Exit code 1 if any font used by a template is missing a required character.

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SHOW_ALL = process.argv.includes('--all');

// The characters German book text actually needs.
const REQUIRED = [
  ['ä', 0x00E4], ['ö', 0x00F6], ['ü', 0x00FC],
  ['Ä', 0x00C4], ['Ö', 0x00D6], ['Ü', 0x00DC],
  ['ß', 0x00DF],
];
// Nice to have: German quotation marks. Reported separately — a font without
// them is a copy constraint, not a broken book.
const OPTIONAL = [['„', 0x201E], ['“', 0x201C]];

// ── Minimal cmap reader ──────────────────────────────────────────────────────

function u16(b, o) { return b.readUInt16BE(o); }
function u32(b, o) { return b.readUInt32BE(o); }

function cmapCodepoints(buf) {
  const tag = u32(buf, 0);
  // 0x00010000 = TrueType, 'OTTO' = CFF/OpenType, 'true'/'ttcf' also seen.
  let base = 0;
  if (tag === 0x74746366) base = u32(buf, 12); // 'ttcf' — first font in collection
  const numTables = u16(buf, base + 4);
  let cmapOff = null;
  for (let i = 0; i < numTables; i++) {
    const rec = base + 12 + i * 16;
    if (buf.slice(rec, rec + 4).toString('latin1') === 'cmap') cmapOff = u32(buf, rec + 8);
  }
  if (cmapOff === null) return null;

  const nSub = u16(buf, cmapOff + 2);
  const found = new Set();
  let sawKnownFormat = false;

  for (let i = 0; i < nSub; i++) {
    const rec = cmapOff + 4 + i * 8;
    const off = cmapOff + u32(buf, rec + 4);
    const format = u16(buf, off);

    if (format === 4) {
      sawKnownFormat = true;
      const segX2 = u16(buf, off + 6);
      const segs = segX2 / 2;
      const endO = off + 14, startO = endO + segX2 + 2, deltaO = startO + segX2, rangeO = deltaO + segX2;
      for (let s = 0; s < segs; s++) {
        const end = u16(buf, endO + s * 2);
        const start = u16(buf, startO + s * 2);
        if (start === 0xFFFF) continue;
        const delta = u16(buf, deltaO + s * 2);
        const rangeOff = u16(buf, rangeO + s * 2);
        for (let c = start; c <= end && c !== 0x10000; c++) {
          let g;
          if (rangeOff === 0) g = (c + delta) & 0xFFFF;
          else {
            const gi = rangeO + s * 2 + rangeOff + (c - start) * 2;
            if (gi + 1 >= buf.length) continue;
            g = u16(buf, gi);
            if (g !== 0) g = (g + delta) & 0xFFFF;
          }
          if (g !== 0) found.add(c);
        }
      }
    } else if (format === 12) {
      sawKnownFormat = true;
      const nGroups = u32(buf, off + 12);
      for (let g = 0; g < nGroups; g++) {
        const go = off + 16 + g * 12;
        const start = u32(buf, go), end = u32(buf, go + 4);
        // Guard against a pathological range blowing memory.
        for (let c = start; c <= end && c - start < 0x10000; c++) found.add(c);
      }
    }
  }
  return sawKnownFormat ? found : null;
}

// ── Which fonts do the templates actually name? ───────────────────────────────
// The data files name fonts by family ("Twinkle Star"), the files are
// "TwinkleStar-Regular.ttf". Match on the family name with spaces stripped.

function templateFontFamilies() {
  const families = new Set();
  const dataFiles = [];
  for (const dir of fs.readdirSync(path.join(ROOT, 'assets'))) {
    if (!dir.startsWith('Template_')) continue;
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory() && e.name !== 'node_modules') walk(p);
        else if (e.name.endsWith('-data.js')) dataFiles.push(p);
      }
    };
    walk(path.join(ROOT, 'assets', dir));
  }
  for (const f of dataFiles) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/font:\s*'([^']+)'/g)) families.add(m[1]);
  }
  return { families, dataFiles };
}

function findFontFiles() {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory() && e.name !== 'node_modules') walk(p);
      else if (/\.(ttf|otf)$/i.test(e.name)) out.push(p);
    }
  };
  walk(path.join(ROOT, 'assets'));
  return out;
}

// ── Run ──────────────────────────────────────────────────────────────────────

const { families, dataFiles } = templateFontFamilies();
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const wanted = new Set([...families].map(norm));

const files = findFontFiles();
const rows = [];

for (const file of files) {
  const stem = path.basename(file).replace(/\.(ttf|otf)$/i, '');
  const famPart = norm(stem.split(/[-_]/)[0]);
  const used = [...wanted].some(w => w.startsWith(famPart) || famPart.startsWith(w));
  if (!used && !SHOW_ALL) continue;

  let cps;
  try { cps = cmapCodepoints(fs.readFileSync(file)); }
  catch (err) { rows.push({ file, status: 'ERROR', detail: err.message, used }); continue; }

  if (!cps) { rows.push({ file, status: 'UNKNOWN', detail: 'no readable cmap subtable', used }); continue; }

  const missing  = REQUIRED.map(([ch, cp]) => cps.has(cp) ? null : ch).filter(Boolean);
  const noQuotes = OPTIONAL.map(([ch, cp]) => cps.has(cp) ? null : ch).filter(Boolean);
  rows.push({ file, status: missing.length ? 'MISSING' : 'ok', missing, noQuotes, used });
}

rows.sort((a, b) => (a.status === 'ok') - (b.status === 'ok') || a.file.localeCompare(b.file));

console.log(`\nFont families named by template data files (${families.size}):`);
console.log('  ' + [...families].sort().join(', '));
console.log(`\nChecked ${rows.length} font file(s) for: ${REQUIRED.map(r => r[0]).join(' ')}\n`);

let failed = false;
for (const r of rows) {
  const rel = path.relative(ROOT, r.file);
  if (r.status === 'ok') {
    const q = r.noQuotes.length ? `   (no German quotes: ${r.noQuotes.join(' ')})` : '';
    console.log(`  ✓  ${rel}${q}`);
  } else if (r.status === 'MISSING') {
    console.log(`  ✗  ${rel}  — MISSING: ${r.missing.join(' ')}`);
    if (r.used) failed = true;
  } else {
    console.log(`  ?  ${rel}  — ${r.status}: ${r.detail}`);
    if (r.used) failed = true;
  }
}

console.log(failed
  ? '\nFAIL — a font a template prints with cannot render German.\n'
  : '\nAll checked fonts carry the German characters.\n');
process.exit(failed ? 1 : 0);
