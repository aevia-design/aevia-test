// Local PDF-render verification for Papercut (no live services).
// 1. Drives the staff engine headless → builds a synthetic Papercut book → exports book-state.json
// 2. Generates a matching JPG for every referenced photo name (sharp)
// 3. Runs scripts/export-pdf.js --photos against that fixture
// 4. Asserts: exit 0, no "⚠" warnings, PDF produced.
// Run: node qa/render-papercut-pdf.mjs   (needs `npx serve . -p 8080` running)
import { chromium } from 'playwright';
import sharp from '../scripts/node_modules/sharp/lib/index.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'papercut-pdf-'));
const photosDir = path.join(work, 'photos');
const statePath = path.join(work, 'book-state.json');
const outDir = path.join(work, 'pdf-out');
fs.mkdirSync(photosDir);

const LOCAL = 'http://localhost:8080/pages/staff/template-engine.html';
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('dialog', d => { console.log('DIALOG:', d.message()); d.accept(); });
await page.goto(LOCAL, { waitUntil: 'networkidle' });

// Build a synthetic Papercut book in the engine, then export its state.
await page.evaluate(() => {
  const sel = document.getElementById('template-select');
  sel.value = 'Papercut';
  sel.dispatchEvent(new Event('change'));
  const px = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
  window.photoPool = Array.from({ length: 30 }, (_, i) => ({
    url: px, name: 'p' + i + '.jpg', orientation: i % 2 ? 'vertical' : 'horizontal',
  }));
  window.specialPhotos = window.freshSpecialPhotos
    ? window.freshSpecialPhotos() : { cover: [], FP1: [], FP3: [], FP4: [], FP5: [] };
  window.specialPhotos.cover = [{ url: px, name: 'cover.jpg', orientation: 'horizontal' }];
  ['FP1', 'FP3', 'FP4'].forEach(k => { window.specialPhotos[k] = [{ url: px, name: k + '.jpg', orientation: 'horizontal' }]; });
  window.specialPhotos.FP5 = [
    { url: px, name: 'FP5-left.jpg', orientation: 'horizontal' },
    { url: px, name: 'FP5-right.jpg', orientation: 'vertical' },
  ];
  window._sidebarThumbs = [];
  document.querySelectorAll('input[name="fp"]').forEach(cb => { cb.checked = true; });
  window.renderBook();
});

const seqLen = await page.evaluate(() => (window._bookSequence || []).length);
console.log('_bookSequence length after renderBook:', seqLen);

// Capture the book-state JSON: intercept the Blob the exporter hands to createObjectURL.
const stateJson = await page.evaluate(async () => {
  let captured = null;
  const orig = URL.createObjectURL;
  URL.createObjectURL = (blob) => { captured = blob; return 'blob:capture'; };
  window.exportBookState();           // top-level engine fn → builds state, triggers download
  URL.createObjectURL = orig;
  return captured ? await captured.text() : null;
});
await browser.close();
if (!stateJson) { console.error('Failed to capture book-state JSON'); process.exit(1); }
fs.writeFileSync(statePath, stateJson);

const state = JSON.parse(stateJson);
console.log('Exported state: template=' + state.template + ' sequence(' + state.sequence.length + ')');

// Collect every photo name the state references.
const names = new Set();
for (const sides of Object.values(state.assignments || {}))
  for (const arr of Object.values(sides || {}))
    (arr || []).forEach(p => p && p.name && names.add(p.name));
for (const v of Object.values(state.specialPhotos || {}))
  (Array.isArray(v) ? v : [v]).forEach(n => n && names.add(typeof n === 'string' ? n : n.name));

// Generate a real JPG for each (color block; orientation-ish dims).
for (const name of names) {
  const portrait = /left|FP1|FP3|FP4/.test(name) ? false : Math.random() > 0.5;
  const w = portrait ? 1200 : 1600, h = portrait ? 1600 : 1200;
  await sharp({ create: { width: w, height: h, channels: 3, background: { r: 180, g: 200, b: 210 } } })
    .jpeg().toFile(path.join(photosDir, name));
}
console.log('Generated ' + names.size + ' photo fixtures');

// Run the real PDF export.
let out = '';
let failed = false;
try {
  out = execFileSync('node', ['scripts/export-pdf.js', '--photos', photosDir, '--state', statePath, '--out', outDir],
    { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (e) {
  failed = true;
  out = (e.stdout || '') + '\n' + (e.stderr || '');
}
console.log('\n──── export-pdf.js output ────');
console.log(out.split('\n').filter(l => l.trim()).join('\n'));

const warnings = (out.match(/⚠/g) || []).length;
const pdfs = fs.existsSync(outDir) ? fs.readdirSync(outDir).filter(f => f.endsWith('.pdf')) : [];
console.log('\nWarnings:', warnings, '| PDFs produced:', pdfs.join(', ') || 'none');

const pass = !failed && warnings === 0 && pdfs.length > 0;
console.log('\n' + (pass ? '✅ PDF RENDER PASS' : '❌ PDF RENDER FAIL') + '  (fixture: ' + work + ')');
process.exit(pass ? 0 : 1);
