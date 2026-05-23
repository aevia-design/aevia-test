#!/usr/bin/env node
/**
 * export-pdf.js — Plan 11-02
 * Composites a Scribble photobook at 300dpi using Sharp + pdf-lib.
 *
 * Usage:
 *   node scripts/export-pdf.js --photos <dir> [--state book-state.json] [--out pdf-out]
 *
 * Output:
 *   <out>/content.pdf  — all content pages at 206×206mm, 300dpi
 */

const path = require('path');
const fs   = require('fs');
const sharp = require('sharp');
const { PDFDocument, rgb } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');

// ── CLI args ──────────────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

const photosDir = getArg('--photos');
const stateFile = getArg('--state') || 'book-state.json';
const outDir    = getArg('--out')   || 'pdf-out';

if (!photosDir) {
  console.error('Usage: node scripts/export-pdf.js --photos <dir> [--state book-state.json] [--out pdf-out]');
  process.exit(1);
}
if (!fs.existsSync(photosDir)) { console.error('Photos dir not found:', photosDir); process.exit(1); }
if (!fs.existsSync(stateFile)) { console.error('State file not found:', stateFile); process.exit(1); }

fs.mkdirSync(outDir, { recursive: true });

// ── Load state + template data ────────────────────────────────────────────────
const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));

// template-data.js assigns to window.SCRIBBLE_DATA
global.window = {};
require(path.resolve(__dirname, '../assets/Template_Scribble/template-data.js'));
const DATA = global.window.SCRIBBLE_DATA;

// ── Print constants ───────────────────────────────────────────────────────────
const DPI        = 300;
const MM_TO_PX   = DPI / 25.4;                          // 11.811 px/mm
const CONTENT_MM = DATA.pageSize;                        // 200mm
const BLEED_MM   = DATA.bleed;                           // 3mm
const FULL_MM    = CONTENT_MM + BLEED_MM * 2;            // 206mm
const FULL_PX    = Math.round(FULL_MM * MM_TO_PX);       // 2433px
const CONTENT_PX = Math.round(CONTENT_MM * MM_TO_PX);   // 2362px
const BLEED_PX   = Math.round(BLEED_MM * MM_TO_PX);     // 35px
// slot.x/y are CENTER coords in mm; slot.w/h are dimensions in mm
// (same as template engine: left = (x - w/2) * SCALE, top = (y - h/2) * SCALE)
const slotLeft = (s) => Math.round((s.x - s.w / 2) * MM_TO_PX + BLEED_PX);
const slotTop  = (s) => Math.round((s.y - s.h / 2) * MM_TO_PX + BLEED_PX);
const slotW    = (s) => Math.round(s.w * MM_TO_PX);
const slotH    = (s) => Math.round(s.h * MM_TO_PX);

const ASSET_BASE = path.resolve(__dirname, '../assets/Template_Scribble/Spreads');

// ── Helpers ───────────────────────────────────────────────────────────────────
function hexToSharpColor(hex) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16), alpha: 1 };
}

function photoPath(name) {
  return path.join(photosDir, name);
}

// Normalise a photo entry — handle both old string format and new {name,orientation} format
function toPhotoObj(p) {
  if (!p) return null;
  if (typeof p === 'string') return { name: p, orientation: 'horizontal' };
  return p;
}

// Determine H or V variant from a list of photo entries
function pickVariant(photos) {
  const vCount = (photos || []).filter(p => toPhotoObj(p)?.orientation === 'vertical').length;
  const hCount = (photos || []).filter(p => toPhotoObj(p)?.orientation === 'horizontal').length;
  return vCount > hCount ? 'V' : 'H';
}

// Get a page definition, falling back through variant → 'default' → first available key
function getPageDef(sidePages, variant) {
  if (!sidePages) return null;
  return sidePages[variant] || sidePages['default'] || sidePages[Object.keys(sidePages)[0]] || null;
}

// Render one page (left or right) as a PNG buffer
async function renderPage(spreadId, side, pageDef, assignedPhotos, specialPhotos) {
  const { bgColor, svg, slots } = pageDef;
  const col = hexToSharpColor(bgColor || '#ffffff');

  // Start with a solid-color canvas (this IS the bleed on all sides)
  let canvas = sharp({
    create: { width: FULL_PX, height: FULL_PX, channels: 4,
               background: { r: col.r, g: col.g, b: col.b, alpha: 1 } }
  }).png();

  const composites = [];

  // ── Photo slots ─────────────────────────────────────────────────────────────
  for (let i = 0; i < (slots || []).length; i++) {
    const slot = slots[i];
    const sw = slotW(slot);
    const sh = slotH(slot);
    const sx = slotLeft(slot);
    const sy = slotTop(slot);

    // Determine photo source
    let photo = null;
    if (slot.pool === 'special') {
      // Special photo (FP3 toy, FP4 steps, FP5 art, FP1 birthday)
      const spKey = spreadId; // e.g. 'FP3'
      const spName = specialPhotos[spKey];
      if (spName) photo = { name: spName };
    } else if (slot.pool === 'artwork') {
      // Artwork slot — no photo
    } else {
      photo = toPhotoObj(assignedPhotos[i]) || null;
    }

    if (!photo || !photo.name) continue;

    const pPath = photoPath(photo.name);
    if (!fs.existsSync(pPath)) {
      console.warn(`  ⚠ Photo not found: ${photo.name}`);
      continue;
    }

    try {
      if (slot.heartClip) {
        // Heart slot covers full content area; clip-path is in 600px canvas space → scale to CONTENT_PX
        const scale = CONTENT_PX / 600;
        const heartPath = 'M315.61,569.29 c189.41,-32.30,353.76,-502.10,161.52,-504.13 -75.98,-.82,-144.62,37.88,-166.39,37.88 -29.30,0,-56.97,-92.27,-165.83,-47.06 -200.49,83.33,48.24,534.15,170.70,513.31Z';
        const maskSvg = Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${CONTENT_PX}" height="${CONTENT_PX}">` +
          `<g transform="scale(${scale})"><path d="${heartPath}" fill="white"/></g>` +
          `</svg>`
        );
        const maskBuffer = await sharp(maskSvg).resize(CONTENT_PX, CONTENT_PX).png().toBuffer();
        const photoBuffer = await sharp(pPath)
          .resize(CONTENT_PX, CONTENT_PX, { fit: 'cover', position: 'centre' })
          .png()
          .toBuffer();
        const maskedBuffer = await sharp(photoBuffer)
          .composite([{ input: maskBuffer, blend: 'dest-in' }])
          .png()
          .toBuffer();
        composites.push({ input: maskedBuffer, left: BLEED_PX, top: BLEED_PX });
      } else {
        const photoBuffer = await sharp(pPath)
          .resize(sw, sh, { fit: 'cover', position: 'centre' })
          .png()
          .toBuffer();
        composites.push({ input: photoBuffer, left: sx, top: sy });
      }
    } catch (e) {
      console.warn(`  ⚠ Failed to process photo ${photo.name}: ${e.message}`);
    }
  }

  // ── SVG overlay ─────────────────────────────────────────────────────────────
  // SVG viewBox covers the 200mm content area — resize to CONTENT_PX and offset by BLEED_PX
  if (svg) {
    const svgPath = path.join(ASSET_BASE, svg);
    if (fs.existsSync(svgPath)) {
      try {
        const svgBuffer = await sharp(fs.readFileSync(svgPath))
          .resize(CONTENT_PX, CONTENT_PX, { fit: 'fill' })
          .png()
          .toBuffer();
        composites.push({ input: svgBuffer, left: BLEED_PX, top: BLEED_PX });
      } catch (e) {
        console.warn(`  ⚠ SVG overlay failed (${path.basename(svg)}): ${e.message}`);
      }
    } else {
      console.warn(`  ⚠ SVG not found: ${svg}`);
    }
  }

  // Composite everything and return PNG buffer
  const buf = await canvas.composite(composites).toBuffer();
  return buf;
}

// ── Caption rendering ─────────────────────────────────────────────────────────
const FONT_DIR   = path.resolve(__dirname, '../assets/fonts');
const MM_TO_PT   = 72 / 25.4;
const BLEED_PT   = BLEED_MM * MM_TO_PT;
const CAPTION_COLOR = rgb(0.12, 0.12, 0.12);

const FONT_FILE_MAP = {
  'NT Somic_regular':          'NTSomic-Regular.woff2',
  'NT Somic_medium':           'NTSomic-Medium.woff2',
  'EB Garamond_regular':       'EBGaramond-Regular.woff2',
  'EB Garamond_italic':        'EBGaramond-Italic.woff2',
  'EB Garamond_semibold':      'EBGaramond-SemiBold.woff2',
  'FirstTimeWriting_regular':  'FirstTimeWriting!.ttf',
};

// Pre-embed all fonts into a PDFDocument; returns a lookup map
async function embedAllFonts(pdfDoc) {
  pdfDoc.registerFontkit(fontkit);
  const map = {};
  for (const [key, filename] of Object.entries(FONT_FILE_MAP)) {
    const filePath = path.join(FONT_DIR, filename);
    if (!fs.existsSync(filePath)) { console.warn(`Font file missing: ${filename}`); continue; }
    try {
      map[key] = await pdfDoc.embedFont(fs.readFileSync(filePath), { subset: false });
    } catch (e) {
      console.warn(`Failed to embed font ${filename}: ${e.message}`);
    }
  }
  return map;
}

function lookupFont(fontMap, fontName, style) {
  const key = `${fontName}_${(style || 'regular').toLowerCase()}`;
  return fontMap[key] || fontMap[`${fontName}_regular`] || null;
}

// Draw captions for one page side onto `pg` (pdf-lib page object).
// pageSizePt = the PDF page size in points (square).
function drawCaptions(pg, fontMap, pageDef, si, side, captions, pageSizePt) {
  const sideCaps = captions?.[si]?.[side];
  if (!sideCaps) return;

  const { slots, textPanel } = pageDef;

  // ── Slot captions ──────────────────────────────────────────────────────────
  for (let i = 0; i < (slots || []).length; i++) {
    const slot = slots[i];
    const capDef = slot.caption;
    if (!capDef?.allowed) continue;

    const text = sideCaps[i];
    if (!text || !text.trim()) continue;

    const font = lookupFont(fontMap, capDef.font, capDef.style);
    if (!font) { console.warn(`  ⚠ Caption font not found: ${capDef.font} ${capDef.style}`); continue; }

    const sizePt        = capDef.sizePt || 14;
    const lineSpacingPt = sizePt * (capDef.lineSpacing || 1.28);
    const charSpacing   = (capDef.letterSpacing || 0) * sizePt; // em → pt

    // Top of caption block in mm from content top
    const capTopMm = slot.y + slot.h / 2 + (capDef.offset || 0);

    const lines = String(text).split('\n');
    lines.forEach((line, li) => {
      if (!line.trim()) return;
      const textWidthPt = font.widthOfTextAtSize(line, sizePt)
                        + charSpacing * Math.max(0, line.length - 1);
      const xPt = BLEED_PT + slot.x * MM_TO_PT - textWidthPt / 2;
      // pdf-lib y=0 is page bottom; baseline sits ~sizePt*0.75 below line top
      const lineTopPt = pageSizePt - BLEED_PT - capTopMm * MM_TO_PT - li * lineSpacingPt;
      const baselinePt = lineTopPt - sizePt * 0.75;
      pg.drawText(line, { x: xPt, y: baselinePt, size: sizePt, font,
                          color: CAPTION_COLOR, characterSpacing: charSpacing });
    });
  }

  // ── Text panel caption (FP spreads) ───────────────────────────────────────
  const panelText = sideCaps['textPanel'];
  if (textPanel?.caption?.allowed && panelText && panelText.trim()) {
    const capDef = textPanel.caption;
    const font = lookupFont(fontMap, capDef.font, capDef.style);
    if (font) {
      const sizePt        = capDef.sizePt || 16;
      const lineSpacingPt = sizePt * (capDef.lineSpacing || 1.28);
      const charSpacing   = (capDef.letterSpacing || 0) * sizePt;
      // Text panel is centered at x=100mm, starting at y=50mm (middle of content area)
      const centerXMm = 100, startYMm = 50;
      const lines = String(panelText).split('\n');
      lines.forEach((line, li) => {
        if (!line.trim()) return;
        const textWidthPt = font.widthOfTextAtSize(line, sizePt)
                          + charSpacing * Math.max(0, line.length - 1);
        const xPt = BLEED_PT + centerXMm * MM_TO_PT - textWidthPt / 2;
        const lineTopPt = pageSizePt - BLEED_PT - startYMm * MM_TO_PT - li * lineSpacingPt;
        pg.drawText(line, { x: xPt, y: lineTopPt - sizePt * 0.75, size: sizePt, font,
                            color: CAPTION_COLOR, characterSpacing: charSpacing });
      });
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n📖 Aevia PDF export`);
  console.log(`   Template : ${state.template}`);
  console.log(`   Pages    : ${state.pageCount}`);
  console.log(`   Spreads  : ${state.sequence.length}`);
  console.log(`   Photos   : ${photosDir}`);
  console.log(`   Output   : ${outDir}/content.pdf`);
  console.log(`   Canvas   : ${FULL_PX}×${FULL_PX}px (${FULL_MM}mm at ${DPI}dpi)\n`);

  const pdfDoc = await PDFDocument.create();
  const PAGE_SIZE_PT = FULL_MM / 25.4 * 72; // 206mm in PDF points
  const fontMap = await embedAllFonts(pdfDoc);

  const specialPhotos = state.specialPhotos || {};
  const captions = state.captions || {};
  let pageNum = 0;

  for (let si = 0; si < state.sequence.length; si++) {
    const spreadId  = state.sequence[si];
    const spreadDef = DATA.spreads[spreadId];
    if (!spreadDef) { console.warn(`Unknown spread: ${spreadId}`); continue; }

    const asgn     = state.assignments[si] || {};
    const leftArr  = asgn.left  || [];
    const rightArr = asgn.right || [];

    // Pick variants based on assigned photo orientations
    const leftVariant  = pickVariant(leftArr);
    const rightVariant = pickVariant(rightArr);

    const pages = spreadDef.pages || {};

    // ── Left page ────────────────────────────────────────────────────────────
    if (!spreadDef.rightOnly) {
      const leftDef = getPageDef(pages.left, leftVariant);
      if (leftDef) {
        process.stdout.write(`  [${si+1}/${state.sequence.length}] ${spreadId} left (${leftVariant})… `);
        try {
          const buf = await renderPage(spreadId, 'left', leftDef, leftArr, specialPhotos);
          const img = await pdfDoc.embedPng(buf);
          const pg  = pdfDoc.addPage([PAGE_SIZE_PT, PAGE_SIZE_PT]);
          pg.drawImage(img, { x: 0, y: 0, width: PAGE_SIZE_PT, height: PAGE_SIZE_PT });
          drawCaptions(pg, fontMap, leftDef, String(si), 'left', captions, PAGE_SIZE_PT);
          pageNum++;
          console.log(`✓ (page ${pageNum})`);
        } catch (e) {
          console.log(`✗ ${e.message}`);
        }
      } else {
        // Blank white left page (e.g. rightOnly spreads that still need a placeholder)
        const pg = pdfDoc.addPage([PAGE_SIZE_PT, PAGE_SIZE_PT]);
        pageNum++;
        console.log(`  [${si+1}] ${spreadId} left — blank (page ${pageNum})`);
      }
    }

    // ── Right page ───────────────────────────────────────────────────────────
    const rightDef = getPageDef(pages.right, rightVariant);
    if (rightDef) {
      process.stdout.write(`  [${si+1}/${state.sequence.length}] ${spreadId} right (${rightVariant})… `);
      try {
        const buf = await renderPage(spreadId, 'right', rightDef, rightArr, specialPhotos);
        const img = await pdfDoc.embedPng(buf);
        const pg  = pdfDoc.addPage([PAGE_SIZE_PT, PAGE_SIZE_PT]);
        pg.drawImage(img, { x: 0, y: 0, width: PAGE_SIZE_PT, height: PAGE_SIZE_PT });
        drawCaptions(pg, fontMap, rightDef, String(si), 'right', captions, PAGE_SIZE_PT);
        pageNum++;
        console.log(`✓ (page ${pageNum})`);
      } catch (e) {
        console.log(`✗ ${e.message}`);
      }
    }
  }

  const pdfBytes = await pdfDoc.save();
  const outPath  = path.join(outDir, 'content.pdf');
  fs.writeFileSync(outPath, pdfBytes);

  console.log(`\n✅ Done — ${pageNum} pages → ${outPath}`);
  console.log(`   File size: ${(pdfBytes.length / 1024 / 1024).toFixed(1)} MB\n`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
