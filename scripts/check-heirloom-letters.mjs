// check-heirloom-letters.mjs — compare each Heirloom colourway's monogram letter
// coordinates in its *-data.js against its two sizing CSVs.
//
// The CSVs are the source of truth and there is no generator, so the data files are
// synced by hand (see LEARNINGS: "CSV source of truth"). Forty-eight numbers across four
// colourways is more than an eyeball can hold, and a single transposed digit reaches
// print. This reports every mismatch, and also checks the bleed rule that caught the
// S161 slip: with-bleed = without-bleed + 3 on interior pages, + 18 on the cover.
//
// Usage (from repo root):  node scripts/check-heirloom-letters.mjs          (report only)
//                          node scripts/check-heirloom-letters.mjs --write  (sync from CSV)
// Exit code 1 if anything is out of sync, so it can gate a commit.
//
// --write rewrites ONLY the xMm/yMm of the letter entries. Ink colour, font, size and box
// dimensions are left exactly as they are: those split by SURFACE per colourway (Green's
// letters are #404737 on the intro and #dad0c5 on the back cover) and are not what the
// sizing CSVs govern. A bleed-rule violation blocks the write for that value — the S161
// slip proved a wrong cell reads as a plausible coordinate.
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');

const COLOURWAYS = [
  { dir: 'Beige', file: 'heirloom-data.js',       global: 'HEIRLOOM_DATA' },
  { dir: 'Brown', file: 'heirloom-brown-data.js', global: 'HEIRLOOM_BROWN_DATA' },
  { dir: 'Green', file: 'heirloom-green-data.js', global: 'HEIRLOOM_GREEN_DATA' },
  { dir: 'Blue',  file: 'heirloom-blue-data.js',  global: 'HEIRLOOM_BLUE_DATA' },
];
const MONOGRAMS = ['Roots', 'Birds', 'Roses'];

// Column indices (0-based) in the semicolon CSVs. The header row is line 2 — line 1 is a
// title row — and the delimiter changed from comma to semicolon mid-build (S158), so the
// header is located by content rather than by position.
const rows = (p) => fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(Boolean).map(l => l.split(';'));
const num  = (v) => Number(String(v).trim());

const WRITE = process.argv.includes('--write');
let problems = 0, written = 0;
const report = (label, dataVal, csvVal) => {
  if (num(dataVal) === num(csvVal)) return;
  problems++;
  console.log(`   ⚠ ${label.padEnd(22)} data=${dataVal}  csv=${csvVal}`);
};
const bleedRule = (label, without, withB, offset) => {
  if (Math.abs(num(withB) - (num(without) + offset)) < 1e-9) return;
  problems++;
  console.log(`   ⚠ ${label.padEnd(22)} with-bleed ${withB} should be ${(num(without) + offset).toFixed(1)} (without ${without} + ${offset})`);
};

for (const cw of COLOURWAYS) {
  console.log(`\n${cw.dir}`);
  global.window = {};
  require(path.join(ROOT, 'assets/Template_Heirloom', cw.dir, cw.file));
  const monos = global.window[cw.global].monograms;

  const full  = rows(path.join(ROOT, 'assets/Template_Heirloom', cw.dir, `Heirloom_sizing_full_${cw.dir}.csv`));
  const cover = rows(path.join(ROOT, 'assets/Template_Heirloom', cw.dir, `Heirloom_Template_Sizing_Cover_40_${cw.dir}.csv`));

  for (const name of MONOGRAMS) {
    const key = name.toLowerCase();
    // Intro: one row per letter, x/y without at 14/15, with at 16/17.
    ['1st letter', '2nd letter'].forEach((sub, i) => {
      const r = full.find(c => c[0] === name && c[1] === sub);
      if (!r) { problems++; console.log(`   ⚠ ${name} ${sub}: no row in the full CSV`); return; }
      bleedRule(`${name} intro L${i + 1} x`, r[14], r[16], 3);
      bleedRule(`${name} intro L${i + 1} y`, r[15], r[17], 3);
      report(`${name} intro L${i + 1} x`, monos[key].introLetters[i].xMm, r[16]);
      report(`${name} intro L${i + 1} y`, monos[key].introLetters[i].yMm, r[17]);
    });
    // Back cover: ONE row carries both letters — captions1 at 11-14, captions2 at 15-18.
    const c = cover.find(r => r[0] === 'Back page' && r[1] === name);
    if (!c) { problems++; console.log(`   ⚠ ${name}: no Back page row in the cover CSV`); continue; }
    bleedRule(`${name} back L1 x`, c[11], c[13], 18);
    bleedRule(`${name} back L1 y`, c[12], c[14], 18);
    bleedRule(`${name} back L2 x`, c[15], c[17], 18);
    bleedRule(`${name} back L2 y`, c[16], c[18], 18);
    report(`${name} back L1 x`, monos[key].backLetters[0].xMm, c[13]);
    report(`${name} back L1 y`, monos[key].backLetters[0].yMm, c[14]);
    report(`${name} back L2 x`, monos[key].backLetters[1].xMm, c[17]);
    report(`${name} back L2 y`, monos[key].backLetters[1].yMm, c[18]);
  }
  if (!problems) console.log('   all 24 coordinates match');
}

// ── --write: rewrite the letter coordinates in place ────────────────────────────────
// Each letter is one line of a fixed shape, so the substitution is anchored to that
// line's `key: 'letterN'` and touches only its xMm/yMm. Every replacement must match
// exactly once or the file is left untouched — a partial write is worse than none.
if (WRITE) {
  console.log('\n── writing ──');
  for (const cw of COLOURWAYS) {
    const filePath = path.join(ROOT, 'assets/Template_Heirloom', cw.dir, cw.file);
    let text = fs.readFileSync(filePath, 'utf8');
    const before = text;
    let fileProblems = 0;

    const full  = rows(path.join(ROOT, 'assets/Template_Heirloom', cw.dir, `Heirloom_sizing_full_${cw.dir}.csv`));
    const cover = rows(path.join(ROOT, 'assets/Template_Heirloom', cw.dir, `Heirloom_Template_Sizing_Cover_40_${cw.dir}.csv`));

    for (const name of MONOGRAMS) {
      const key = name.toLowerCase();
      // The block for THIS monogram: from its key to the next monogram key or the end.
      const start = text.indexOf(`    ${key}: {`);
      if (start < 0) { console.log(`   ⚠ ${cw.dir}: no '${key}' block`); problems++; fileProblems++; continue; }
      const end = text.indexOf('\n    },', start);
      let block = text.slice(start, end);

      const setLine = (arrayName, idx, x, y) => {
        const arrStart = block.indexOf(`${arrayName}: [`);
        const arrEnd   = block.indexOf('],', arrStart);
        let arr = block.slice(arrStart, arrEnd);
        // Some letter lines are column-aligned with two spaces after the comma, so allow
        // any run of whitespace rather than assuming exactly one.
        const re = new RegExp(`(key: 'letter${idx + 1}', xMm: )[-\\d.]+(,\\s*yMm: )[-\\d.]+`);
        if (!re.test(arr)) { console.log(`   ⚠ ${cw.dir} ${name} ${arrayName}[${idx}]: no match`); problems++; fileProblems++; return; }
        arr = arr.replace(re, `$1${x}$2${y}`);
        block = block.slice(0, arrStart) + arr + block.slice(arrEnd);
      };

      ['1st letter', '2nd letter'].forEach((sub, i) => {
        const r = full.find(c => c[0] === name && c[1] === sub);
        if (r) setLine('introLetters', i, num(r[16]), num(r[17]));
      });
      const c = cover.find(r => r[0] === 'Back page' && r[1] === name);
      if (c) { setLine('backLetters', 0, num(c[13]), num(c[14])); setLine('backLetters', 1, num(c[17]), num(c[18])); }

      text = text.slice(0, start) + block + text.slice(end);
    }

    // A partial write is worse than none: it leaves some letters synced and some not,
    // with nothing on screen to say which.
    if (fileProblems) console.log(`   ✗ ${cw.dir}/${cw.file} NOT written — ${fileProblems} substitution(s) failed`);
    else if (text !== before) { fs.writeFileSync(filePath, text); written++; console.log(`   updated ${cw.dir}/${cw.file}`); }
    else console.log(`   ${cw.dir}/${cw.file} already in sync`);
  }
  console.log(`\n${written} file(s) written. Re-run without --write to confirm.`);
  process.exit(0);
}

console.log(problems ? `\n❌ ${problems} problem(s)` : '\n✅ every colourway matches its CSVs');
process.exit(problems ? 1 : 0);
