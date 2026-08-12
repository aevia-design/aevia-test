#!/usr/bin/env node
/**
 * Re-encode the rasters embedded inside Laguna's SVGs (S168).
 *
 * WHY THIS EXISTS
 * ---------------
 * Clemence's artwork reaches us as full-page paintings embedded in the SVGs as
 * base64 PNGs. Illustrator writes them as 8-bit RGBA PNG, which is the wrong
 * format for gouache twice over: PNG is built for flat colour and hard edges
 * (a painting is neither), and the alpha channel is ~100% opaque (we are paying
 * for a fourth channel that describes nothing). Base64 then inflates the result
 * by a further 33% on the way into the SVG.
 *
 * The damage is not cosmetic. Two hard thresholds sit above these files:
 *   - >25 MiB  -> the Cloudflare Pages deploy fails SILENTLY and the whole site
 *                 goes stale (see CLAUDE.md / project_cloudflare_file_limit).
 *   - >8 MB    -> the SVG silently drops out of the print PDF
 *                 (project_pdf_font_rules).
 * The cover ships at 36 MB and every map at 7-11 MB, so as delivered the cover
 * cannot be deployed and no map can be printed.
 *
 * WHAT IT DOES
 * ------------
 * For each SVG below: decode the embedded raster, downsample to 300 DPI at the
 * size the SVG actually places it, flatten the alpha onto the flat colour that
 * sits behind it on the page, re-encode as JPEG (4:4:4 chroma - no colour
 * subsampling, so hues stay exact), and write it back into the same <image>
 * tag. Nothing else in the SVG is touched; the vector layers, the transform and
 * the viewBox are left exactly as Illustrator wrote them.
 *
 * WHY 300 DPI AND JPEG ARE SAFE HERE
 * ----------------------------------
 * 300 DPI is the press requirement - resolution above it is discarded by the
 * printer, not printed. JPEG artefacts appear at hard edges and in flat
 * gradients; gouache has neither. Flattening is exact rather than approximate
 * because each raster is composited over ONE flat colour, so painting that
 * colour into the transparent pixels produces the identical result.
 *
 * The originals stay in git as the archive master. This is re-runnable: if
 * Clemence reissues a drop, restore the original SVGs and run this again.
 *
 *   node scripts/optimise-laguna-rasters.mjs          # report only, writes nothing
 *   node scripts/optimise-laguna-rasters.mjs --write  # apply
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('../functions/node_modules/sharp');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SVG = path.join(ROOT, 'assets/Template_Laguna/SVG');

const DPI = 300;
const QUALITY = 92;

// `behind` is the flat colour the raster is composited over on the page, taken
// from the sizing CSVs' bgColor column. Getting this wrong shows up as a halo
// on the soft edges of the painting, so it is stated per file rather than
// guessed once.
const TARGETS = [
  { file: 'Cover/Artboard 1.svg',                   behind: '#fbf8f6' }, // cover front panel
  { file: 'FP Travel Itinerary/Africa Map.svg',     behind: '#c6ceba' },
  { file: 'FP Travel Itinerary/Asia Map.svg',       behind: '#c6ceba' },
  { file: 'FP Travel Itinerary/EU Map.svg',         behind: '#c6ceba' },
  { file: 'FP Travel Itinerary/N.America Map.svg',  behind: '#c6ceba' },
  { file: 'FP Travel Itinerary/Oceania.svg',        behind: '#c6ceba' },
  { file: 'FP Travel Itinerary/S.America.svg',      behind: '#c6ceba' },
];

const mib = (b) => (b / 1048576).toFixed(2) + ' MB';

/** mm-per-user-unit for an SVG, from its declared mm width over its viewBox width. */
function mmPerUnit(svg) {
  const w = svg.match(/\bwidth="([\d.]+)mm"/);
  const vb = svg.match(/viewBox="([^"]+)"/);
  if (!w || !vb) throw new Error('SVG declares no mm width or no viewBox');
  return parseFloat(w[1]) / parseFloat(vb[1].trim().split(/[\s,]+/)[2]);
}

async function processFile({ file, behind }, write) {
  const abs = path.join(SVG, file);
  const svg = fs.readFileSync(abs, 'utf8');
  const before = Buffer.byteLength(svg);

  const tag = svg.match(/<image\b[^>]*>/);
  const b64 = svg.match(/base64,([A-Za-z0-9+/=]+)/);
  if (!tag || !b64) {
    console.log(`  ${file} — no embedded raster, skipped`);
    return { before, after: before };
  }

  const src = Buffer.from(b64[1], 'base64');
  const meta = await sharp(src).metadata();

  // The size the SVG actually paints it at, so we can compute its true DPI:
  // the <image> element's own width in user units, times any scale() in its
  // transform, times mm-per-unit.
  const declaredW = parseFloat(tag[0].match(/\bwidth="([\d.]+)"/)[1]);
  const scale = parseFloat((tag[0].match(/scale\(([\d.]+)/) || [, 1])[1]);
  const perUnit = mmPerUnit(svg);
  const placedWmm = declaredW * scale * perUnit;
  const placedHmm = placedWmm * (meta.height / meta.width);
  const srcDpi = meta.width / (placedWmm / 25.4);

  // Never upsample: if the artwork arrives below 300 DPI, keep its own pixels
  // and report it rather than inventing detail that was never painted.
  const targetW = Math.min(meta.width, Math.round((placedWmm / 25.4) * DPI));
  const targetH = Math.min(meta.height, Math.round((placedHmm / 25.4) * DPI));

  const jpeg = await sharp(src)
    .resize(targetW, targetH)
    .flatten({ background: behind })
    .jpeg({ quality: QUALITY, chromaSubsampling: '4:4:4' })
    .toBuffer();

  const out = svg.replace(
    /(xlink:href|href)="data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+"/,
    `$1="data:image/jpeg;base64,${jpeg.toString('base64')}"`
  );
  const after = Buffer.byteLength(out);

  const warn = after > 8 * 1024 * 1024 ? '  ** STILL OVER THE 8 MB PDF LIMIT **' : '';
  console.log(
    `  ${file}\n` +
    `      raster ${meta.width}x${meta.height} ${meta.format} ch${meta.channels}` +
    ` placed at ${placedWmm.toFixed(0)}mm = ${srcDpi.toFixed(0)} dpi\n` +
    `      -> ${targetW}x${targetH} jpeg q${QUALITY} on ${behind}\n` +
    `      svg ${mib(before)} -> ${mib(after)}  (${(100 * (1 - after / before)).toFixed(0)}% smaller)${warn}`
  );

  if (write) fs.writeFileSync(abs, out);
  return { before, after };
}

const write = process.argv.includes('--write');
console.log(write ? 'Rewriting Laguna SVGs in place:\n' : 'Dry run (pass --write to apply):\n');

let totalBefore = 0, totalAfter = 0;
for (const t of TARGETS) {
  const { before, after } = await processFile(t, write);
  totalBefore += before;
  totalAfter += after;
}
console.log(`\nTotal: ${mib(totalBefore)} -> ${mib(totalAfter)} (${(100 * (1 - totalAfter / totalBefore)).toFixed(0)}% smaller)`);
