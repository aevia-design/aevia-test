/**
 * simulate-photo-count.js
 *
 * Runs calcPhotoTarget() logic for all orientation combos (all-H, all-V,
 * and each spread toggled independently) to quantify how much the H-only
 * estimate can be off.
 *
 * Usage: node scripts/simulate-photo-count.js
 */

'use strict';

// ── Load SCRIBBLE_DATA from the browser-style window.SCRIBBLE_DATA assignment ──
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../assets/Template_Scribble/scribble-data.js');
const src = fs.readFileSync(dataPath, 'utf8');

// Replace `window.SCRIBBLE_DATA = ...` with a module export
const patched = src.replace('window.SCRIBBLE_DATA =', 'const SCRIBBLE_DATA =') + '\nmodule.exports = SCRIBBLE_DATA;';
const tmpPath = path.join(__dirname, '_scribble-data-tmp.js');
fs.writeFileSync(tmpPath, patched, 'utf8');

let DATA;
try {
  DATA = require(tmpPath);
} finally {
  fs.unlinkSync(tmpPath);
}

// ── Build spread sequence (mirrors calcPhotoTarget in order.html) ──
function buildSequence(pageCount, selectedFPs) {
  const totalSpreads  = pageCount / 2;
  const remaining     = totalSpreads - 1;
  const standardCount = remaining - selectedFPs.length;
  const stdIds = ['SP1','SP2','SP3','SP4','SP5','SP6'];
  const standards = [];
  for (let i = 0; i < standardCount; i++) standards.push(stdIds[i % stdIds.length]);

  const fpCount   = selectedFPs.length;
  const positions = selectedFPs.map((_, i) =>
    Math.round((i + 1) * (standards.length + 1) / (fpCount + 1))
  );
  for (let i = fpCount - 1; i >= 0; i--) {
    standards.splice(positions[i], 0, selectedFPs[i]);
  }
  return ['SP0', ...standards];
}

// Count regular slots for a sequence given an orientation map: { [spreadId_side]: 'H'|'V' }
// orientationFn(spreadId, side) → 'H' | 'V'
function countSlots(sequence, orientationFn) {
  let total = 0;
  sequence.forEach(spreadId => {
    const spreadDef = DATA.spreads[spreadId];
    if (!spreadDef) return;
    const sides = spreadDef.rightOnly ? ['right'] : ['left', 'right'];
    sides.forEach(side => {
      const pageDef = spreadDef.pages?.[side];
      if (!pageDef) return;
      const orient = orientationFn(spreadId, side);
      const variantDef = pageDef[orient]
        || pageDef[orient === 'H' ? 'V' : 'H']  // fallback to opposite
        || pageDef['default']
        || pageDef[Object.keys(pageDef)[0]];
      if (!variantDef?.slots) return;
      total += variantDef.slots.filter(s => !s.pool || s.pool === 'regular').length;
    });
  });
  return total;
}

// ── Run simulations ──
const PAGE_COUNTS = [40, 80];
const FP_COMBOS = [
  [],
  ['FP1'],
  ['FP3'],
  ['FP4'],
  ['FP5'],
  ['FP1', 'FP3'],
  ['FP1', 'FP4'],
  ['FP1', 'FP5'],
  ['FP3', 'FP4'],
  ['FP1', 'FP3', 'FP4'],
  ['FP1', 'FP3', 'FP4', 'FP5'],
];

console.log('=== Aevia Photo Count Simulation ===\n');
console.log('Compares all-H (current estimate) vs all-V and max/min across all per-page combos.\n');

let anyDifference = false;

PAGE_COUNTS.forEach(pages => {
  console.log(`\n── ${pages}-page book (${pages / 2} spreads) ──`);
  console.log(
    'FPs selected'.padEnd(32),
    'All-H'.padStart(6),
    'All-V'.padStart(6),
    'Min'.padStart(6),
    'Max'.padStart(6),
    'Range?'.padStart(8)
  );
  console.log('─'.repeat(68));

  FP_COMBOS.forEach(fps => {
    const seq = buildSequence(pages, fps);

    const allH = countSlots(seq, () => 'H');
    const allV = countSlots(seq, () => 'V');

    // Enumerate all 2^n orientation combos for a more thorough search
    // For sequences up to ~20 spread-sides, this is fast enough
    const sides = [];
    seq.forEach(spreadId => {
      const spreadDef = DATA.spreads[spreadId];
      if (!spreadDef) return;
      const pageSides = spreadDef.rightOnly ? ['right'] : ['left', 'right'];
      pageSides.forEach(side => sides.push({ spreadId, side }));
    });

    // Instead of 2^n full enumeration (could be 2^38 for 80p), we compute
    // per-side slot counts for H and V then find the min/max by greedy choice.
    const perSide = sides.map(({ spreadId, side }) => {
      const pageDef = DATA.spreads[spreadId]?.pages?.[side];
      if (!pageDef) return { h: 0, v: 0 };
      const hDef = pageDef['H'] || pageDef['default'] || pageDef[Object.keys(pageDef)[0]];
      const vDef = pageDef['V'] || pageDef['default'] || pageDef[Object.keys(pageDef)[0]];
      const countDef = def => def?.slots?.filter(s => !s.pool || s.pool === 'regular').length ?? 0;
      return { h: countDef(hDef), v: countDef(vDef) };
    });

    const minSlots = perSide.reduce((acc, s) => acc + Math.min(s.h, s.v), 0);
    const maxSlots = perSide.reduce((acc, s) => acc + Math.max(s.h, s.v), 0);

    const label = fps.length === 0 ? '(none)' : fps.join(', ');
    const hasRange = minSlots !== maxSlots;
    if (hasRange) anyDifference = true;

    console.log(
      label.padEnd(32),
      String(allH).padStart(6),
      String(allV).padStart(6),
      String(minSlots).padStart(6),
      String(maxSlots).padStart(6),
      (hasRange ? `±${maxSlots - minSlots}` : '=').padStart(8)
    );
  });
});

console.log('\n');
if (anyDifference) {
  console.log('⚠️  Orientation DOES affect slot count in some combos.');
  console.log('   Consider showing a range in the order form, or keep H-only and note it may vary.');
} else {
  console.log('✅ Orientation has no effect — H-only estimate is exact for all combos.');
}
console.log('\nDone.\n');
