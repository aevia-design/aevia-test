// compose-all.mjs — generate the FULL mockup set for one order in a single run.
//
// Reads the spread manifest produced by qa/capture-spread.mjs and composes:
//   - one OPEN-book mockup per interior spread (named by its book-sequence id/label),
//   - one CLOSED-book mockup + one BACK-book mockup from the cover wrap.
// All three composers reuse the SAME physical PSDs (template-agnostic book); only the
// captured textures + the cover colour change per template — so this just drives them.
//
// Prereqs (run by Evgeny, each needs the staff password — see the qa/ scripts):
//   node qa/capture-cover-wrap.mjs     → sessions/qa-runs/cover-wrap-<order>.png
//   node qa/capture-spread.mjs         → spread-<order>-<NN>.png + spread-<order>-manifest.json
//
// Usage (from scripts/):
//   node compose-all.mjs <order> <template>
//   node compose-all.mjs AEV-040 wander
//   node compose-all.mjs AEV-039 newborn
// The template name selects the per-surface cover colours (cover.mockupEdges in the data file)
// the composers use to tint exposed board edges. A legacy single #hex is still accepted (used
// as one uniform edge colour) for ad-hoc runs.
//
// Output (mockups/<order>/, gitignored — kept separate from the raw captures):
//   closed.png
//   back.png
//   open-<NN>-<id>.png   (one per spread; NN = manifest index, id = book-sequence id)

import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QA = path.resolve(__dirname, '../sessions/qa-runs');           // raw captures live here

const ORDER = process.argv[2] || 'AEV-039';
const ARG3  = process.argv[3] || process.env.TEMPLATE || 'newborn';  // template name (or legacy #hex)

// Resolve the three exposed-edge cover colours. Prefer the template data file's cover.mockupEdges
// (single source of truth, shared with the engine's colour set); fall back to a uniform #hex.
const TEMPLATES = {
  scribble: '../assets/Template_Scribble/scribble-data.js',
  wander:   '../assets/Template_Wander/wander-data.js',
  newborn:  '../assets/Template_Newborn/newborn-data.js',
};
let EDGES;
if (ARG3.startsWith('#')) {
  EDGES = { front: ARG3, spine: ARG3, back: ARG3 };                 // legacy uniform colour
} else {
  const tpl = ARG3.toLowerCase();
  if (!TEMPLATES[tpl]) { console.error(`❌ Unknown template '${ARG3}'. Use one of: ${Object.keys(TEMPLATES).join(', ')} (or a #hex).`); process.exit(1); }
  global.window = {};                                              // the data files assign to window.X_DATA
  createRequire(import.meta.url)(path.resolve(__dirname, TEMPLATES[tpl]));
  const data = global.window[`${tpl.toUpperCase()}_DATA`];
  EDGES = data?.cover?.mockupEdges;
  if (!EDGES) { console.error(`❌ ${tpl}-data.js has no cover.mockupEdges`); process.exit(1); }
}
const COVER_HEX = EDGES.front;                                      // back-compat single arg = front colour
const EDGE_ENV = { EDGE_FRONT: EDGES.front, EDGE_SPINE: EDGES.spine, EDGE_BACK: EDGES.back };
console.log(`Cover edges → front ${EDGES.front}  spine ${EDGES.spine}  back ${EDGES.back}`);

// Composed results go to a clean per-order folder (NOT mixed in with the raw captures).
const OUT = path.resolve(__dirname, '../mockups', ORDER);
fs.mkdirSync(OUT, { recursive: true });

const manifestPath = path.join(QA, `spread-${ORDER}-manifest.json`);
if (!fs.existsSync(manifestPath)) {
  console.error(`❌ No manifest at ${manifestPath}\n   Run: node qa/capture-spread.mjs  (QA_ORDER=${ORDER})`);
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Cover wrap: prefer the order-stamped capture, fall back to the stable copy.
const wrapStamped = path.join(QA, `cover-wrap-${ORDER}.png`);
const wrapStable  = path.join(QA, 'cover-wrap-newborn.png');
const wrap = fs.existsSync(wrapStamped) ? wrapStamped : (fs.existsSync(wrapStable) ? wrapStable : null);

// Run a composer script (cwd = scripts/, matching its ../-relative path defaults). The
// EDGE_* env carries the per-surface cover colours; composers read them to tint exposed edges.
const run = (script, args) => {
  console.log(`\n▶ ${script} ${args.join(' ')}`);
  execFileSync('node', [path.join(__dirname, script), ...args], { cwd: __dirname, stdio: 'inherit', env: { ...process.env, ...EDGE_ENV } });
};

// Safe filename fragment from a book-sequence id/label.
const slug = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'x';

// ── OPEN: one per spread ───────────────────────────────────────
console.log(`\n=== OPEN spreads (${manifest.length}) ===`);
for (const m of manifest) {
  const inPng  = path.join(QA, m.file);
  const outPng = path.join(OUT, `open-${String(m.idx).padStart(2,'0')}-${slug(m.id)}.png`);
  if (!fs.existsSync(inPng)) { console.warn(`  ⚠ missing ${m.file} — skipping`); continue; }
  run('compose-mockup.mjs', [inPng, outPng, COVER_HEX]);
}

// ── CLOSED + BACK: from the cover wrap ─────────────────────────
if (wrap) {
  console.log(`\n=== CLOSED + BACK (from ${path.basename(wrap)}) ===`);
  run('compose-closed.mjs', [wrap, path.join(OUT, `closed.png`), COVER_HEX]);
  run('compose-back.mjs',   [wrap, path.join(OUT, `back.png`)]);
} else {
  console.warn(`\n⚠ No cover wrap found (cover-wrap-${ORDER}.png) — skipping closed + back.`);
  console.warn(`  Run: node qa/capture-cover-wrap.mjs  (QA_ORDER=${ORDER})`);
}

console.log(`\n✅ Done. Mockups in ${OUT}`);
