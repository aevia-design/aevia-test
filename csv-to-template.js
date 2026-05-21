/**
 * csv-to-template.js
 * Reads assets/Template_Scribble/Scribble_sizing_full.csv and regenerates
 * assets/Template_Scribble/template-data.js
 *
 * SVG file paths are preserved from the existing template-data.js.
 * New variants added in the CSV get a TODO placeholder SVG path.
 *
 * Run: node csv-to-template.js
 */

const fs   = require('fs');
const path = require('path');

const DIR          = path.join(__dirname, 'assets/Template_Scribble');
const CSV_PATH     = path.join(DIR, 'Scribble_sizing_full.csv');
const COVER_CSV    = path.join(DIR, 'Scribble_Template_Sizing_Cover.csv');
const OUT_PATH     = path.join(DIR, 'template-data.js');

// ── 1. Parse CSV ───────────────────────────────────────────────────────────
const rawLines = fs.readFileSync(CSV_PATH, 'utf8').split('\n').filter(l => l.trim());
const headers  = rawLines[0].split(';').map(h => h.trim());

const rows = rawLines.slice(1).map(line => {
  const parts = line.split(';');
  const obj   = {};
  headers.forEach((h, i) => { obj[h] = (parts[i] || '').trim(); });
  return obj;
});

// ── 2. Extract SVG paths from existing template-data.js ───────────────────
// Returns map: { 'SP0.right.H': 'SP Spread 0/SP 06 H Right.svg', ... }
function extractSvgPaths(filePath) {
  const map = {};
  if (!fs.existsSync(filePath)) return map;
  const src   = fs.readFileSync(filePath, 'utf8');
  const lines = src.split('\n');
  let spreadId = null, side = null, variantKey = null;
  for (const line of lines) {
    const sm = line.match(/^\s+(SP\d+|FP\d+):\s*\{/);
    if (sm) { spreadId = sm[1]; side = null; variantKey = null; }
    const dm = line.match(/^\s+(left|right):\s*\{/);
    if (dm) { side = dm[1]; variantKey = null; }
    const vm = line.match(/^\s+(H|V|S|default):\s*\{/);
    if (vm) variantKey = vm[1];
    const pm = line.match(/svg:\s*'([^']+)'/);
    if (pm && spreadId && side && variantKey) {
      map[`${spreadId}.${side}.${variantKey}`] = pm[1];
    }
  }
  return map;
}

const existingSvgs = extractSvgPaths(OUT_PATH);

// ── 3. Helpers ─────────────────────────────────────────────────────────────
function normaliseRatio(raw) {
  if (!raw || raw === 'n.a' || raw === '-' || !raw.includes(':')) return null;
  // Strip trailing :00  (e.g. "33:35:00" → "33:35")
  const cleaned = raw.replace(/:00$/, '');
  // Remove leading zeros from each part: "03:02" → "3:2"
  return cleaned.split(':').map(n => String(parseInt(n, 10) || n)).join(':');
}

function parseCaption(allowedStr, posRaw) {
  if (allowedStr !== 'yes') return { allowed: false };
  const trimmed = (posRaw || '').trim();
  if (!trimmed || trimmed === 'center') return { allowed: true, position: 'center' };
  // "below (50mm from photo)", "upper right (5mm from photo)", etc.
  const m = trimmed.match(/^([\w\s]+?)\s*\((\d+)mm/i);
  if (!m) return { allowed: true, position: trimmed.toLowerCase().replace(/\s+/g, '-') };
  const pos    = m[1].trim().toLowerCase().replace(/\s+/g, '-');
  const offset = parseInt(m[2], 10);
  return { allowed: true, position: pos, offset };
}

function orientToVariantKey(orientStr) {
  const o = (orientStr || '').toLowerCase();
  if (o === 'horizontal') return 'H';
  if (o === 'vertical')   return 'V';
  if (o === 'square')     return 'S';
  return 'default';
}

// ── 4. Build a slot object from one CSV row ────────────────────────────────
function buildSlot(row, slotNumber, isFunctional) {
  const x = parseInt(row['X (mm) - without bleed'], 10);
  const y = parseInt(row['Y (mm) - without bleed'], 10);
  const w = parseInt(row['Width (mm)'],             10);
  const h = parseInt(row['Height (mm)'],            10);
  const ratio   = normaliseRatio(row['Aspect ratio']);
  const caption = parseCaption(row['captions allowed'], row['captions_position']);

  const slot = { slot: slotNumber, x, y, w, h };
  if (ratio) slot.ratio = ratio;

  // heartClip: FP1 right heart-shaped slot — detected by its unique 33:35 ratio
  if (ratio === '33:35') slot.heartClip = true;

  // fullBleed: indicated by bgColor field containing 'full bleed'
  const bgRaw = row['bgColor'] || '';
  if (bgRaw.toLowerCase().includes('full bleed')) {
    slot.fullBleed = true;
    slot.pool = 'regular';
  } else if (isFunctional) {
    const fp = row['functional_photo'];
    if (fp === 'yes') {
      // Art-Gallery spreads use 'artwork' pool (they have their own 2-slot special panel)
      slot.pool = (row['Syb-type'] === 'Art-Gallery') ? 'artwork' : 'special';
    } else if (fp === 'no') {
      slot.pool = 'regular';
    }
  }

  slot.caption = caption;
  return slot;
}

// ── 5. Group rows ──────────────────────────────────────────────────────────
const standardRows   = rows.filter(r => r['Type'] === 'Standard');
const functionalRows = rows.filter(r => r['Type'] === 'Functional');

function groupBy(arr, key) {
  const map = {};
  for (const item of arr) {
    const k = item[key];
    if (!map[k]) map[k] = [];
    map[k].push(item);
  }
  return map;
}

const standardBySpread   = groupBy(standardRows,   'Spread');
const functionalBySpread = groupBy(functionalRows,  'Spread');

// ── 6. Build standard spread ───────────────────────────────────────────────
function buildStandardSpread(spreadNum, rows) {
  const id       = 'SP' + spreadNum;
  const rightOnly = spreadNum === '0';
  const pages    = {};

  for (const row of rows) {
    const pageStr = row['Page'];           // "Left H", "Right V", etc.
    const [sideRaw, orientRaw] = pageStr.split(' ');
    const side   = sideRaw.toLowerCase();
    const vKey   = orientRaw;             // H or V (already the right letter)
    const slotNum = parseInt(row['Slot'], 10);

    if (!pages[side])       pages[side]       = {};
    if (!pages[side][vKey]) {
      const svgKey = `${id}.${side}.${vKey}`;
      pages[side][vKey] = {
        bgColor: row['bgColor'],
        svg:     existingSvgs[svgKey] || `TODO: ${svgKey}`,
        slots:   []
      };
    }
    pages[side][vKey].slots.push(buildSlot(row, slotNum, false));
  }

  const result = { type: 'standard', id, label: `Spread ${spreadNum}`, pages };
  if (rightOnly) result.rightOnly = true;
  // Reorder so rightOnly spreads only have right key
  return result;
}

// ── 7. Build functional spread ─────────────────────────────────────────────
function detectFpFlags(rows) {
  if (rows.some(r => r['Syb-type'] === 'Art-Gallery')) return { allArtwork: true };
  if (rows.some(r => r['Page'] === '-'))               return { textLeft:    true };
  if (rows.some(r => r['Page'].startsWith('Left') && r['functional_photo'] === 'yes'))
                                                        return { specialLeft: true };
  return {};
}

function getFpLabel(rows) {
  const r = rows.find(r => r['Syb-type'] && r['Syb-type'] !== 'n.a');
  return r ? r['Syb-type'] : 'Functional';
}

function buildFunctionalSpread(spreadNum, rows) {
  const id    = 'FP' + spreadNum;
  const flags = detectFpFlags(rows);
  const label = getFpLabel(rows);
  const pages = {};

  // Text-panel pages (Page = '-')
  const textRows = rows.filter(r => r['Page'] === '-');
  if (textRows.length > 0) {
    const tr     = textRows[0];
    const svgKey = `${id}.left.default`;
    const textPanel = {
      caption: { allowed: true, position: 'center' },
      ...(tr['Syb-type'] === 'Funny words' ? { funnyWords: true } : {})
    };
    pages.left = {
      default: {
        bgColor:   tr['bgColor'],
        svg:       existingSvgs[svgKey] || `TODO: ${svgKey}`,
        slots:     [],
        textPanel
      }
    };
  }

  // Photo/slot rows
  const slotRows = rows.filter(r => r['Page'] !== '-');
  for (const row of slotRows) {
    const pageStr  = row['Page'];                    // "Left H", "Right V", "Right S"
    const parts    = pageStr.split(' ');
    const side     = parts[0].toLowerCase();
    const vKey     = parts[1];                       // H, V, S
    const slotNum  = parseInt(row['Slot'], 10);

    if (!pages[side]) pages[side] = {};
    if (!pages[side][vKey]) {
      const svgKey = `${id}.${side}.${vKey}`;
      const bgRaw  = row['bgColor'] || '';
      const bg     = bgRaw.toLowerCase().includes('full bleed') ? null : bgRaw;
      pages[side][vKey] = {
        ...(bg ? { bgColor: bg } : {}),
        svg:   existingSvgs[svgKey] || `TODO: ${svgKey}`,
        slots: []
      };
    }
    pages[side][vKey].slots.push(buildSlot(row, slotNum, true));
  }

  return { type: 'functional', id, label, ...flags, pages };
}

// ── 8. Parse cover CSV ────────────────────────────────────────────────────
function parseCoverCsv(csvPath) {
  const lines = fs.readFileSync(csvPath, 'utf8').split('\n').filter(l => l.trim());
  // Strip BOM and deduplicate headers by appending index to duplicates
  const rawHdrs = lines[0].split(';').map(h => h.trim().replace(/^﻿/, ''));
  const hdrs = rawHdrs.map((h, i) => rawHdrs.indexOf(h) === i ? h : h + '_' + i);

  const rows  = lines.slice(1).map(line => {
    const parts = line.split(';');
    const obj = {};
    hdrs.forEach((h, i) => { obj[h] = (parts[i] || '').trim(); });
    // Column 0 is always the page name regardless of header collision
    obj['_page'] = (parts[0] || '').trim();
    return obj;
  });

  const frontRow = rows.find(r => r['_page'] === 'Front page');
  const spineRow = rows.find(r => r['_page'] === 'Spine');

  // sections — widths come from CSV "Page size" field on front row
  // spine width parsed from its own row if present, else keep existing value
  const frontBg = (frontRow && frontRow['bgColor']) ? frontRow['bgColor'] : '#f8ead9';

  // Parse font size string like "33pt" → number
  function parsePt(s) { return parseInt((s || '0').replace('pt', ''), 10); }

  // Front photo slot
  const slots = [];
  if (frontRow) {
    slots.push({
      xMm:  parseFloat(frontRow['Photo_X (mm)']),
      yMm:  parseFloat(frontRow['Photo_Y (mm)']),
      wMm:  parseFloat(frontRow['Photo_Width (mm)']),
      hMm:  parseFloat(frontRow['Photo_Height (mm)']),
      pool: 'cover'
    });
  }

  // Captions
  const captions = [];
  if (frontRow && frontRow['captions allowed'] === 'yes') {
    captions.push({
      key: 'year', xMm: parseFloat(frontRow['Captions_1_X (mm)']), yMm: parseFloat(frontRow['Captions_1_Y (mm)']),
      wMm: 180, font: frontRow['Captions_1_font'], sizePt: parsePt(frontRow['Captions_1_fontsize']),
      align: 'center', label: 'Year'
    });
    captions.push({
      key: 'name', xMm: parseFloat(frontRow['Captions_2_X (mm)']), yMm: parseFloat(frontRow['Captions_2_Y (mm)']),
      wMm: 180, font: frontRow['Captions_2_font'], sizePt: parsePt(frontRow['Captions_2_fontsize']),
      align: 'center', label: 'Name'
    });
  }
  if (spineRow && spineRow['captions allowed'] === 'yes') {
    captions.push({
      key: 'spineName', xMm: parseFloat(spineRow['Captions_1_X (mm)']), yMm: parseFloat(spineRow['Captions_1_Y (mm)']),
      wMm: 130, font: spineRow['Captions_1_font'], sizePt: parsePt(spineRow['Captions_1_fontsize']),
      rotate: 270, label: 'Name (spine)'
    });
    captions.push({
      key: 'spineYear', xMm: parseFloat(spineRow['Captions_2_X (mm)']), yMm: parseFloat(spineRow['Captions_2_Y (mm)']),
      wMm: 70, font: spineRow['Captions_2_font'], sizePt: parsePt(spineRow['Captions_2_fontsize']),
      rotate: 270, label: 'Year (spine)'
    });
  }

  return { frontBg, slots, captions };
}

function serializeCover(c) {
  let out = `  cover: {\n`;
  out += `    svg: 'Cover/Artboard 1.svg',\n`;
  out += `    sections: {\n`;
  out += `      back:  { xMm: 0,   wMm: 200, bgColor: '#3d1f5c' },\n`;
  out += `      spine: { xMm: 200, wMm: 9,   bgColor: '#fdd16f' },\n`;
  out += `      front: { xMm: 209, wMm: 200, bgColor: '${c.frontBg}' },\n`;
  out += `    },\n`;
  out += `    slots: [\n`;
  for (const s of c.slots) {
    out += `      { xMm: ${s.xMm}, yMm: ${s.yMm}, wMm: ${s.wMm}, hMm: ${s.hMm}, pool: '${s.pool}' }\n`;
  }
  out += `    ],\n`;
  out += `    captions: [\n`;
  for (const cap of c.captions) {
    let line = `      { key: '${cap.key}', xMm: ${cap.xMm}, yMm: ${cap.yMm}, wMm: ${cap.wMm}, font: '${cap.font}', sizePt: ${cap.sizePt}`;
    if (cap.align)  line += `, align: '${cap.align}'`;
    if (cap.rotate !== undefined) line += `, rotate: ${cap.rotate}`;
    line += `, label: '${cap.label}' },\n`;
    out += line;
  }
  out += `    ]\n`;
  out += `  },\n\n`;
  return out;
}

const coverData = fs.existsSync(COVER_CSV) ? parseCoverCsv(COVER_CSV) : null;

// ── 9. Assemble all spreads ────────────────────────────────────────────────
const spreads = {};

for (const n of Object.keys(standardBySpread).sort((a, b) => +a - +b)) {
  spreads['SP' + n] = buildStandardSpread(n, standardBySpread[n]);
}
for (const n of Object.keys(functionalBySpread).sort((a, b) => +a - +b)) {
  spreads['FP' + n] = buildFunctionalSpread(n, functionalBySpread[n]);
}

// ── 10. Serialize ──────────────────────────────────────────────────────────
function serializeCaption(c) {
  if (!c.allowed) return `{ allowed: false }`;
  let s = `{ allowed: true, position: '${c.position}'`;
  if (c.offset !== undefined) s += `, offset: ${c.offset}`;
  s += ` }`;
  return s;
}

function serializeSlot(s) {
  const parts = [`slot: ${s.slot}`, `x: ${s.x}`, `y: ${s.y}`, `w: ${s.w}`, `h: ${s.h}`];
  if (s.ratio)     parts.push(`ratio: '${s.ratio}'`);
  if (s.heartClip) parts.push(`heartClip: true`);
  if (s.fullBleed) parts.push(`fullBleed: true`);
  if (s.pool)      parts.push(`pool: '${s.pool}'`);
  parts.push(`caption: ${serializeCaption(s.caption)}`);
  return `              { ${parts.join(', ')} }`;
}

function serializeVariant(vKey, v) {
  const I = '          ';
  let out = `${I}${vKey}: {\n`;
  if (v.bgColor)   out += `${I}  bgColor: '${v.bgColor}',\n`;
  out += `${I}  svg: '${v.svg}',\n`;
  if (v.textPanel) {
    const tp = v.textPanel;
    let tpStr = `{ caption: { allowed: ${tp.caption.allowed}, position: '${tp.caption.position}' }`;
    if (tp.funnyWords) tpStr += `, funnyWords: true`;
    tpStr += ` }`;
    // slots first, then textPanel (matches existing convention)
    out += `${I}  slots: [],\n`;
    out += `${I}  textPanel: ${tpStr}\n`;
  } else {
    out += `${I}  slots: [\n`;
    const slotLines = (v.slots || []).map(s => serializeSlot(s));
    out += slotLines.join(',\n') + (slotLines.length ? '\n' : '');
    out += `${I}  ]\n`;
  }
  out += `${I}},\n`;
  return out;
}

function serializeSpread(key, sp) {
  let flags = '';
  if (sp.rightOnly)   flags += `, rightOnly: true`;
  if (sp.textLeft)    flags += `, textLeft: true`;
  if (sp.specialLeft) flags += `, specialLeft: true`;
  if (sp.allArtwork)  flags += `, allArtwork: true`;

  let out = `\n    ${key}: {\n`;
  out += `      type: '${sp.type}', id: '${sp.id}', label: '${sp.label}'${flags},\n`;
  out += `      pages: {\n`;

  for (const side of ['left', 'right']) {
    if (!sp.pages[side]) continue;
    out += `        ${side}: {\n`;
    for (const [vKey, v] of Object.entries(sp.pages[side])) {
      out += serializeVariant(vKey, v);
    }
    out += `        },\n`;
  }

  out += `      }\n    },\n`;
  return out;
}

// ── 11. Write output ───────────────────────────────────────────────────────
let output = `window.SCRIBBLE_DATA = {
  template: 'scribble',
  pageSize: 200,
  bleed: 3,
  canvasPx: 600,

`;

if (coverData) output += serializeCover(coverData);

output += `  scale: 3,
  fonts: { display: 'NT Comic', body: 'EB Garamond' },
  colors: {
    plum:     '#493955',
    beige:    '#FDF1E5',
    coral:    '#F47E67',
    lagoon:   '#3EA0CE',
    meadow:   '#2DA46E',
    mango:    '#F4CA6F',
    amethyst: '#B56BB3',
  },

  spreads: {
`;

for (const [key, sp] of Object.entries(spreads)) {
  output += serializeSpread(key, sp);
}

output += `
  }
};\n`;

fs.writeFileSync(OUT_PATH, output);
console.log('✓ Written', OUT_PATH);

// Warn about any TODO placeholders
const todos = [...output.matchAll(/svg: 'TODO: ([^']+)'/g)].map(m => m[1]);
if (todos.length) {
  console.log('\n⚠  SVG paths missing — add these manually in template-data.js:');
  todos.forEach(t => console.log('   ' + t));
} else {
  console.log('✓ All SVG paths resolved from existing file.');
}
