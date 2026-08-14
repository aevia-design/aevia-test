// Stage 0 static checks for the germanization DE artwork drop (S177).
// For each DE-suffixed file under assets/, find its EN counterpart in the same
// folder and compare: viewBox, width/height, live <text> elements, embedded
// <image> elements (filled photo windows), file size.
// Usage: node work/germanization/stage0-static-checks.mjs
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..', 'assets');

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const all = walk(ROOT);
const deFiles = all.filter((p) => /(?:[-_]DE)\.(svg|txt)$/i.test(basename(p)));

// Normalise a filename for counterpart matching: drop -DE/_DE suffix and any
// standalone "DE" word, collapse spaces.
const norm = (name) =>
  name
    .replace(/\.(svg|txt)$/i, '')
    .replace(/[-_]DE$/i, '')
    .replace(/\bDE\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

function svgInfo(path) {
  const src = readFileSync(path, 'utf8');
  const viewBox = (src.match(/viewBox="([^"]+)"/) || [])[1] || null;
  const width = (src.match(/<svg[^>]*?\swidth="([^"]+)"/) || [])[1] || null;
  const height = (src.match(/<svg[^>]*?\sheight="([^"]+)"/) || [])[1] || null;
  const textCount = (src.match(/<text[\s>]/g) || []).length;
  const imageCount = (src.match(/<image[\s>]/g) || []).length;
  const kb = Math.round(statSync(path).size / 1024);
  return { viewBox, width, height, textCount, imageCount, kb };
}

const rows = [];
for (const de of deFiles) {
  const dir = dirname(de);
  const isSvg = /\.svg$/i.test(de);
  const target = norm(basename(de));
  const siblings = readdirSync(dir).filter(
    (n) => n !== basename(de) && !/[-_]DE\./i.test(n) && n.toLowerCase().endsWith(isSvg ? '.svg' : '.txt')
  );
  const match = siblings.find((n) => norm(n) === target) || null;
  const row = { de: de.slice(ROOT.length + 1), en: match, issues: [] };
  if (isSvg) {
    const d = svgInfo(de);
    row.deInfo = d;
    if (d.textCount > 0) row.issues.push(`LIVE <text> x${d.textCount}`);
    if (match) {
      const e = svgInfo(join(dir, match));
      row.enInfo = e;
      if (d.viewBox !== e.viewBox) row.issues.push(`viewBox differs: DE "${d.viewBox}" vs EN "${e.viewBox}"`);
      if (d.imageCount !== e.imageCount) row.issues.push(`<image> count differs: DE ${d.imageCount} vs EN ${e.imageCount}`);
      if (e.kb > 0 && Math.abs(d.kb - e.kb) / e.kb > 0.5) row.issues.push(`size differs a lot: DE ${d.kb}KB vs EN ${e.kb}KB`);
    } else {
      row.issues.push('NO EN counterpart found in folder');
    }
  } else if (!match) {
    row.issues.push('NO EN counterpart txt found in folder');
  }
  rows.push(row);
}

for (const r of rows) {
  console.log(`\n${r.de}`);
  console.log(`  EN counterpart: ${r.en || '—'}`);
  if (r.deInfo) console.log(`  DE: viewBox=${r.deInfo.viewBox} images=${r.deInfo.imageCount} text=${r.deInfo.textCount} ${r.deInfo.kb}KB`);
  if (r.enInfo) console.log(`  EN: viewBox=${r.enInfo.viewBox} images=${r.enInfo.imageCount} text=${r.enInfo.textCount} ${r.enInfo.kb}KB`);
  console.log(r.issues.length ? `  ⚠ ${r.issues.join(' | ')}` : '  ✓ clean');
}
console.log(`\n${rows.length} DE files checked; ${rows.filter((r) => r.issues.length).length} with issues.`);
