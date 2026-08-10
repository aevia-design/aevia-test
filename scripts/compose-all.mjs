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
//   node compose-all.mjs <order> <template> [monogram]
//   node compose-all.mjs AEV-040 wander
//   node compose-all.mjs AEV-039 newborn
//   node compose-all.mjs AEV-089 heirloom-beige birds
//
// Heirloom: the template name is the COLOURWAY registry key (heirloom-beige|-brown|-green
// |-blue), and the optional monogram (roots|birds|roses) matches the QA_MONOGRAM suffix the
// capture scripts wrote. It selects the suffixed captures and writes to mockups/<order>-<mono>/,
// so all three monograms of one order compose without overwriting each other.
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
// Heirloom only: which monogram's captures to compose. Must match the QA_MONOGRAM the
// capture scripts ran with — it is a filename suffix on both sides, nothing more.
const MONO   = (process.argv[4] || process.env.MONOGRAM || '').trim().toLowerCase();
const SUFFIX = MONO ? `-${MONO}` : '';

// Resolve the three exposed-edge cover colours. Prefer the template data file's cover.mockupEdges
// (single source of truth, shared with the engine's colour set); fall back to a uniform #hex.
// file = the data file to load; global = the window.* it assigns itself to. The global is
// named explicitly rather than derived from the key, because Heirloom's colourway keys carry
// a hyphen (heirloom-beige → window.HEIRLOOM_BEIGE_DATA) and Beige's file and global both
// predate the colour split (heirloom-data.js → window.HEIRLOOM_DATA).
const TEMPLATES = {
  scribble: { file: '../assets/Template_Scribble/scribble-data.js', global: 'SCRIBBLE_DATA' },
  wander:   { file: '../assets/Template_Wander/wander-data.js',     global: 'WANDER_DATA' },
  newborn:  { file: '../assets/Template_Newborn/newborn-data.js',   global: 'NEWBORN_DATA' },
  papercut: { file: '../assets/Template_Papercut/papercut-data.js', global: 'PAPERCUT_DATA' },
  tender:   { file: '../assets/Template_Tender/tender-data.js',     global: 'TENDER_DATA' },
  'heirloom-beige': { file: '../assets/Template_Heirloom/Beige/heirloom-data.js',       global: 'HEIRLOOM_DATA' },
  'heirloom-brown': { file: '../assets/Template_Heirloom/Brown/heirloom-brown-data.js', global: 'HEIRLOOM_BROWN_DATA' },
  'heirloom-green': { file: '../assets/Template_Heirloom/Green/heirloom-green-data.js', global: 'HEIRLOOM_GREEN_DATA' },
  'heirloom-blue':  { file: '../assets/Template_Heirloom/Blue/heirloom-blue-data.js',   global: 'HEIRLOOM_BLUE_DATA' },
};
let EDGES;
if (ARG3.startsWith('#')) {
  EDGES = { front: ARG3, spine: ARG3, back: ARG3 };                 // legacy uniform colour
} else {
  const tpl = ARG3.toLowerCase();
  if (!TEMPLATES[tpl]) { console.error(`❌ Unknown template '${ARG3}'. Use one of: ${Object.keys(TEMPLATES).join(', ')} (or a #hex).`); process.exit(1); }
  global.window = {};                                              // the data files assign to window.X_DATA
  createRequire(import.meta.url)(path.resolve(__dirname, TEMPLATES[tpl].file));
  const data = global.window[TEMPLATES[tpl].global];
  EDGES = data?.cover?.mockupEdges;
  if (!EDGES) { console.error(`❌ ${tpl}-data.js has no cover.mockupEdges`); process.exit(1); }
}
const COVER_HEX = EDGES.front;                                      // back-compat single arg = front colour
const EDGE_ENV = { EDGE_FRONT: EDGES.front, EDGE_SPINE: EDGES.spine, EDGE_BACK: EDGES.back };
console.log(`Cover edges → front ${EDGES.front}  spine ${EDGES.spine}  back ${EDGES.back}`);

// Composed results go to a clean per-order folder (NOT mixed in with the raw captures).
const OUT = path.resolve(__dirname, '../mockups', ORDER + SUFFIX);
fs.mkdirSync(OUT, { recursive: true });

const manifestPath = path.join(QA, `spread-${ORDER}${SUFFIX}-manifest.json`);
if (!fs.existsSync(manifestPath)) {
  console.error(`❌ No manifest at ${manifestPath}\n   Run: node qa/capture-spread.mjs  (QA_ORDER=${ORDER}${MONO ? `, QA_MONOGRAM=${MONO}` : ''})`);
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Cover wrap: prefer the order-stamped capture, fall back to the stable copy. A monogram run
// must NOT fall back — the stable copy carries whichever monogram was captured last, so a
// silent fallback would give three "different" covers that are all the same artwork.
const wrapStamped = path.join(QA, `cover-wrap-${ORDER}${SUFFIX}.png`);
const wrapStable  = path.join(QA, 'cover-wrap-newborn.png');
const wrap = fs.existsSync(wrapStamped) ? wrapStamped
  : (!MONO && fs.existsSync(wrapStable) ? wrapStable : null);

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
  console.warn(`\n⚠ No cover wrap found (cover-wrap-${ORDER}${SUFFIX}.png) — skipping closed + back.`);
  console.warn(`  Run: node qa/capture-cover-wrap.mjs  (QA_ORDER=${ORDER}${MONO ? `, QA_MONOGRAM=${MONO}` : ''})`);
}

console.log(`\n✅ Done. Mockups in ${OUT}`);
