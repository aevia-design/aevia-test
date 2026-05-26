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

// Strip HTML tags from caption strings (template engine saves innerHTML for inline styles).
// Converts <br> and <div> boundaries to \n before stripping so line breaks are preserved.
// Also normalises non-breaking spaces (U+00A0 / &nbsp;) to regular spaces so PDF fonts
// don't render them as missing-glyph boxes.
const stripHtml = s => {
  if (typeof s !== 'string') return s || '';
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<div>/gi, '\n').replace(/<\/div>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/ /g, ' ')
    .trim();
};

// ── CLI args ──────────────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

const photosDir = getArg('--photos');
const stateFile = getArg('--state') || 'book-state.json';
const outDir    = getArg('--out')   || 'pdf-out';
// --mode preview  → single combined preview.pdf (cover + all content pages)
// --mode print    → individual PDFs in <outDir>/print/  (cover.pdf + page-001.pdf etc.)
// default: preview
const mode = getArg('--mode') || 'preview';

if (!photosDir) {
  console.error('Usage: node scripts/export-pdf.js --photos <dir> [--state book-state.json] [--out pdf-out] [--mode preview|print]');
  process.exit(1);
}
if (!fs.existsSync(photosDir)) { console.error('Photos dir not found:', photosDir); process.exit(1); }
if (!fs.existsSync(stateFile)) { console.error('State file not found:', stateFile); process.exit(1); }

fs.mkdirSync(outDir, { recursive: true });

// ── Load state + template data ────────────────────────────────────────────────
const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));

// template-data.js assigns to window.SCRIBBLE_DATA
global.window = {};
require(path.resolve(__dirname, '../assets/Template_Scribble/scribble-data.js'));
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
      // Single special photo (FP3 toy, FP4 steps, FP1 birthday) — stored as string or {name}
      const spRaw = specialPhotos[spreadId];
      const spName = typeof spRaw === 'string' ? spRaw : spRaw?.name;
      if (spName) photo = { name: spName };
    } else if (slot.pool === 'artwork') {
      // FP5 art gallery — stored as array [leftName, rightName], or legacy plain string
      const artArr = specialPhotos[spreadId];
      const artIdx = side === 'left' ? 0 : 1;
      let artName;
      if (Array.isArray(artArr)) {
        const entry = artArr[artIdx];
        artName = typeof entry === 'string' ? entry : entry?.name;
      } else {
        // Legacy / single-photo fallback — same photo on both pages
        artName = typeof artArr === 'string' ? artArr : artArr?.name;
      }
      if (artName) photo = { name: artName };
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
const CAPTION_COLOR = rgb(0.12, 0.12, 0.12); // default near-black

const FONT_FILE_MAP = {
  'NT Somic_regular':          'NTSomic-Regular.ttf',
  'NT Somic_medium':           'NTSomic-Medium.ttf',
  'NT Somic_bold':             'NTSomic-Bold.ttf',
  'EB Garamond_regular':       'EBGaramond-VariableFont_wght.ttf',
  'EB Garamond_italic':        'EBGaramond-Italic-VariableFont_wght.ttf',
  'EB Garamond_semibold':      'EBGaramond-VariableFont_wght.ttf',
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

// Word-wrap `text` so each line fits within `maxWidthPt` at the given font/size.
// Returns an array of line strings. Hard-splits words that alone exceed maxWidthPt.
function wrapText(font, text, sizePt, maxWidthPt, charSpacing) {
  if (!maxWidthPt || maxWidthPt <= 0) return [text];
  const measuredWidth = (s) =>
    font.widthOfTextAtSize(s, sizePt) + (charSpacing || 0) * Math.max(0, s.length - 1);
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measuredWidth(candidate) <= maxWidthPt) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      // If the word alone is too wide, force-break it character by character
      if (measuredWidth(word) > maxWidthPt) {
        let chunk = '';
        for (const ch of word) {
          if (measuredWidth(chunk + ch) > maxWidthPt) { lines.push(chunk); chunk = ch; }
          else chunk += ch;
        }
        current = chunk;
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [text];
}

// Draw captions for one page side onto `pg` (pdf-lib page object).
// pageSizePt = the PDF page size in points (square).
// spreadId is used to determine caption color (FP spreads use plum).
// spreadCaptionStyles carries per-slot user overrides from book-state.json.
function drawCaptions(pg, fontMap, pageDef, si, side, captions, pageSizePt, spreadId, spreadCaptionStyles) {
  const sideCaps = captions?.[si]?.[side];
  if (!sideCaps) return;

  const { slots, textPanel } = pageDef;

  // Resolve a color to a pdf-lib rgb() value.
  // Accepts a hex string ('#493955'), a named color ('plum' → looks up DATA.colors), or nothing.
  function resolveColor(value) {
    if (!value) return CAPTION_COLOR;
    const hex = value.startsWith('#') ? value : DATA.colors[value];
    if (!hex) return CAPTION_COLOR;
    const h = hex.replace('#', '');
    return rgb(parseInt(h.slice(0,2),16)/255, parseInt(h.slice(2,4),16)/255, parseInt(h.slice(4,6),16)/255);
  }

  // Per-slot style overrides from spreadCaptionStyles[si][side][slotIdx]
  const scsOverrides = spreadCaptionStyles?.[si]?.[side] || {};

  // ── Slot captions ──────────────────────────────────────────────────────────
  for (let i = 0; i < (slots || []).length; i++) {
    const slot = slots[i];
    const capDef = slot.caption;
    if (!capDef?.allowed) continue;

    const text = stripHtml(sideCaps[i]);
    if (!text || !text.trim()) continue;

    // Merge per-slot style overrides (font, weight, italic, sizePt, lineSpacing, letterSpacing)
    const ov       = scsOverrides[i] || {};
    const fontName = ov.font          !== undefined ? ov.font     : capDef.font;
    const ovStyle  = ov.weight !== undefined
      ? (ov.weight >= 700 ? 'bold' : ov.weight >= 600 ? 'semibold' : ov.weight >= 500 ? 'medium' : ov.italic ? 'italic' : 'regular')
      : (ov.italic ? 'italic' : capDef.style || 'regular');
    const font = lookupFont(fontMap, fontName, ovStyle);
    if (!font) { console.warn(`  ⚠ Caption font not found: ${fontName} ${ovStyle}`); continue; }

    const sizePt        = (ov.sizePt !== undefined ? ov.sizePt : capDef.sizePt) || 14;
    const lineSpacingPt = sizePt * ((ov.lineSpacing !== undefined ? ov.lineSpacing : capDef.lineSpacing) || 1.28);
    const charSpacing   = ((ov.letterSpacing !== undefined ? ov.letterSpacing : capDef.letterSpacing) || 0) * sizePt;

    // Compute caption position based on capDef.position
    const pos = capDef.position || 'below';
    const lines = String(text).split('\n').filter(l => l.trim());

    // Right-margin content area limit: text must not exceed the page right boundary.
    // pageSizePt is the full page dimension (206mm). Content right = pageSizePt - BLEED_PT.
    const pageRightPt = pageSizePt - BLEED_PT;

    // Gap between photo right edge and caption left edge — matches engine: cap.offset (mm)
    const gapMm = capDef.offset || 2;
    // Engine reserves ~6px (2mm) right padding before the content edge
    const rightPadMm = 2;

    if (pos === 'upper-right') {
      // Right-margin column, top-aligned: X right of slot, lines run downward from slot top.
      const slotRightMm = slot.x + slot.w / 2;
      const slotTopMm   = slot.y - slot.h / 2;
      const xPt = BLEED_PT + slotRightMm * MM_TO_PT + gapMm * MM_TO_PT;
      const maxWidthPt = pageRightPt - xPt - rightPadMm * MM_TO_PT;
      // Word-wrap each raw line to fit within the right margin (matches engine width calc)
      const wrappedLines = lines.flatMap(l => wrapText(font, l, sizePt, maxWidthPt, charSpacing));
      wrappedLines.forEach((line, li) => {
        const slotTopPt  = pageSizePt - BLEED_PT - slotTopMm * MM_TO_PT;
        const baselinePt = slotTopPt - sizePt * 0.75 - li * lineSpacingPt;
        pg.drawText(line, { x: xPt, y: baselinePt, size: sizePt, font,
                            color: resolveColor(capDef.color), characterSpacing: charSpacing });
      });
    } else if (pos === 'lower-right') {
      // Right-margin column, bottom-aligned: X right of slot, lines stack upward from slot bottom.
      const slotRightMm  = slot.x + slot.w / 2;
      const slotBottomMm = slot.y + slot.h / 2;
      const xPt = BLEED_PT + slotRightMm * MM_TO_PT + gapMm * MM_TO_PT;
      const maxWidthPt = pageRightPt - xPt - rightPadMm * MM_TO_PT;
      const wrappedLines = lines.flatMap(l => wrapText(font, l, sizePt, maxWidthPt, charSpacing));
      wrappedLines.slice().reverse().forEach((line, li) => {
        const slotBottomPt = pageSizePt - BLEED_PT - slotBottomMm * MM_TO_PT;
        const baselinePt   = slotBottomPt + li * lineSpacingPt;
        pg.drawText(line, { x: xPt, y: baselinePt, size: sizePt, font,
                            color: resolveColor(capDef.color), characterSpacing: charSpacing });
      });
    } else {
      // 'above': caption sits above the slot
      // 'below' / default: caption sits below the slot
      let capTopMm;
      if (pos === 'above') {
        // Estimate caption block height (2 lines), then place above slot top - offset
        const capBlockMm = (sizePt / MM_TO_PT) * 2.5;
        capTopMm = slot.y - slot.h / 2 - (capDef.offset || 0) - capBlockMm;
      } else {
        capTopMm = slot.y + slot.h / 2 + (capDef.offset || 0);
      }
      // Max width = slot width (same constraint as engine contenteditable width)
      const maxWidthPt = slot.w * MM_TO_PT;
      const align = capDef.align || 'center';
      const wrappedLines = lines.flatMap(l => wrapText(font, l, sizePt, maxWidthPt, charSpacing));
      wrappedLines.forEach((line, li) => {
        const textWidthPt = font.widthOfTextAtSize(line, sizePt)
                          + charSpacing * Math.max(0, line.length - 1);
        const slotCenterPt = BLEED_PT + slot.x * MM_TO_PT;
        const xPt = align === 'left'  ? slotCenterPt - slot.w / 2 * MM_TO_PT
                  : align === 'right' ? slotCenterPt + slot.w / 2 * MM_TO_PT - textWidthPt
                  :                     slotCenterPt - textWidthPt / 2; // center
        // pdf-lib y=0 is page bottom; baseline sits ~sizePt*0.75 below line top
        const lineTopPt = pageSizePt - BLEED_PT - capTopMm * MM_TO_PT - li * lineSpacingPt;
        const baselinePt = lineTopPt - sizePt * 0.75;
        pg.drawText(line, { x: xPt, y: baselinePt, size: sizePt, font,
                            color: resolveColor(capDef.color), characterSpacing: charSpacing });
      });
    }
  }

  // ── Text panel caption (FP spreads) ───────────────────────────────────────
  const panelText = stripHtml(sideCaps['textPanel']);
  if (textPanel?.caption?.allowed && panelText && panelText.trim()) {
    const capDef = textPanel.caption;
    // Text panels also support per-slot style overrides stored under key 'textPanel'
    const ov = scsOverrides['textPanel'] || {};
    const fontName = ov.font !== undefined ? ov.font : capDef.font;
    const ovStyle  = ov.weight !== undefined
      ? (ov.weight >= 600 ? (ov.weight >= 700 ? 'bold' : 'semibold') : ov.italic ? 'italic' : 'regular')
      : (ov.italic ? 'italic' : capDef.style || 'regular');
    const font = lookupFont(fontMap, fontName, ovStyle);
    if (font) {
      const isFunnyWords = capDef.font === 'FirstTimeWriting';
      // FunnyWords: template sizePt is in mm (canvas-scaled units), convert to PDF pt.
      // Regular panels: sizePt is standard typographic pt.
      const sizePt        = isFunnyWords
        ? ((ov.sizePt !== undefined ? ov.sizePt : capDef.sizePt) || 20) * MM_TO_PT
        : ((ov.sizePt !== undefined ? ov.sizePt : capDef.sizePt) || 16);
      const lineSpacingPt = sizePt * ((ov.lineSpacing !== undefined ? ov.lineSpacing : capDef.lineSpacing) || 1.28);
      const charSpacing   = ((ov.letterSpacing !== undefined ? ov.letterSpacing : capDef.letterSpacing) || 0) * sizePt;
      // Panel position: centered at x=100mm; top starts at 30% of content height (60mm)
      // This matches template-engine.html: top = 200 * SCALE * 0.30 → 60mm
      const centerXMm = 100, startYMm = 60;
      const lines = String(panelText).split('\n');
      lines.forEach((line, li) => {
        if (!line.trim()) return;
        const textWidthPt = font.widthOfTextAtSize(line, sizePt)
                          + charSpacing * Math.max(0, line.length - 1);
        const xPt = BLEED_PT + centerXMm * MM_TO_PT - textWidthPt / 2;
        const lineTopPt = pageSizePt - BLEED_PT - startYMm * MM_TO_PT - li * lineSpacingPt;
        pg.drawText(line, { x: xPt, y: lineTopPt - sizePt * 0.75, size: sizePt, font,
                            color: resolveColor(capDef.color), characterSpacing: charSpacing });
      });
    }
  }
}

// ── Cover rendering ───────────────────────────────────────────────────────────
// Cover canvas: back(200mm) + spine(9mm) + front(200mm) = 409mm wide × 200mm tall
// With 18mm bleed on all outer edges: 445×236mm total
const COVER_BLEED_MM    = 18;
const COVER_CONTENT_W   = 200 + 9 + 200;   // 409mm
const COVER_CONTENT_H   = 200;              // 200mm
const COVER_FULL_W_MM   = COVER_CONTENT_W + COVER_BLEED_MM * 2;   // 445mm
const COVER_FULL_H_MM   = COVER_CONTENT_H + COVER_BLEED_MM * 2;   // 236mm
const COVER_FULL_W_PX   = Math.round(COVER_FULL_W_MM * MM_TO_PX); // 5256px
const COVER_FULL_H_PX   = Math.round(COVER_FULL_H_MM * MM_TO_PX); // 2787px
const COVER_BLEED_PX    = Math.round(COVER_BLEED_MM * MM_TO_PX);  // 213px

// Render the full cover spread as a PNG buffer.
// coverDef = DATA.cover; coverPhoto = filename string; coverCaptions = { year, name, spineName, spineYear }
async function renderCoverImage(coverDef, coverPhotoName, photosDir) {
  const { sections, slots, svg } = coverDef;
  // Cover SVG lives in the same Spreads/ folder as content SVGs (ASSET_BASE already points there)
  const COVER_ASSET_BASE = ASSET_BASE;

  // Build the background: three coloured horizontal sections + bleed fill.
  // Strategy: fill entire canvas with back bgColor (leftmost section), then overlay
  // spine and front sections at their correct x positions, then add bleed extensions.
  const backColor  = hexToSharpColor(sections.back.bgColor);
  const spineColor = hexToSharpColor(sections.spine.bgColor);
  const frontColor = hexToSharpColor(sections.front.bgColor);

  // Start with solid back color covering the whole canvas (this fills left bleed area too)
  let canvas = sharp({
    create: { width: COVER_FULL_W_PX, height: COVER_FULL_H_PX, channels: 4,
               background: { r: backColor.r, g: backColor.g, b: backColor.b, alpha: 1 } }
  }).png();

  const composites = [];

  // Spine section rectangle
  const spineXPx = COVER_BLEED_PX + Math.round(sections.spine.xMm * MM_TO_PX);
  const spineWPx = Math.round(sections.spine.wMm * MM_TO_PX);
  const spineRect = await sharp({
    create: { width: spineWPx, height: COVER_FULL_H_PX, channels: 4,
               background: { r: spineColor.r, g: spineColor.g, b: spineColor.b, alpha: 1 } }
  }).png().toBuffer();
  composites.push({ input: spineRect, left: spineXPx, top: 0 });

  // Front section rectangle (extends to right bleed edge)
  const frontXPx = COVER_BLEED_PX + Math.round(sections.front.xMm * MM_TO_PX);
  const frontWPx = COVER_FULL_W_PX - frontXPx;
  const frontRect = await sharp({
    create: { width: frontWPx, height: COVER_FULL_H_PX, channels: 4,
               background: { r: frontColor.r, g: frontColor.g, b: frontColor.b, alpha: 1 } }
  }).png().toBuffer();
  composites.push({ input: frontRect, left: frontXPx, top: 0 });

  // ── Front photo slot ──────────────────────────────────────────────────────
  if (coverPhotoName) {
    const pPath = path.join(photosDir, coverPhotoName);
    if (fs.existsSync(pPath)) {
      const slot = slots[0]; // single cover photo slot
      // slot coords are center-based in mm, measured from back left edge (x=0)
      const sw = Math.round(slot.wMm * MM_TO_PX);
      const sh = Math.round(slot.hMm * MM_TO_PX);
      const sx = COVER_BLEED_PX + Math.round((slot.xMm - slot.wMm / 2) * MM_TO_PX);
      const sy = COVER_BLEED_PX + Math.round((slot.yMm - slot.hMm / 2) * MM_TO_PX);
      try {
        const photoBuffer = await sharp(pPath)
          .resize(sw, sh, { fit: 'cover', position: 'centre' })
          .png().toBuffer();
        composites.push({ input: photoBuffer, left: sx, top: sy });
      } catch (e) {
        console.warn(`  ⚠ Cover photo failed: ${e.message}`);
      }
    } else {
      console.warn(`  ⚠ Cover photo not found: ${coverPhotoName}`);
    }
  }

  // ── SVG overlay ─────────────────────────────────────────────────────────
  if (svg) {
    const svgPath = path.join(COVER_ASSET_BASE, svg);
    if (fs.existsSync(svgPath)) {
      try {
        // SVG covers the 409×200mm content area; place it at bleed offset
        const svgW = Math.round(COVER_CONTENT_W * MM_TO_PX);
        const svgH = Math.round(COVER_CONTENT_H * MM_TO_PX);
        const svgBuffer = await sharp(fs.readFileSync(svgPath))
          .resize(svgW, svgH, { fit: 'fill' })
          .png().toBuffer();
        composites.push({ input: svgBuffer, left: COVER_BLEED_PX, top: COVER_BLEED_PX });
      } catch (e) {
        console.warn(`  ⚠ Cover SVG overlay failed: ${e.message}`);
      }
    } else {
      console.warn(`  ⚠ Cover SVG not found: ${svg}`);
    }
  }

  const buf = await canvas.composite(composites).toBuffer();
  return buf;
}

// Draw cover captions onto a pdf-lib page.
// coverDef.captions has: key, xMm, yMm, font, sizePt, align, rotate (optional)
// xMm/yMm are center coords measured from the left edge of the back section (not including bleed)
function drawCoverCaptions(pg, fontMap, coverDef, coverCaptions, coverCaptionStyles, pageSizeWPt, pageSizeHPt) {
  if (!coverCaptions) return;
  const COVER_BLEED_PT = COVER_BLEED_MM * MM_TO_PT;

  // Resolve a hex color string (e.g. '#493955') to a pdf-lib rgb() value.
  function resolveCapColor(hex) {
    if (!hex) return CAPTION_COLOR;
    const h = hex.replace('#', '');
    if (h.length !== 6) return CAPTION_COLOR;
    return rgb(parseInt(h.slice(0,2),16)/255, parseInt(h.slice(2,4),16)/255, parseInt(h.slice(4,6),16)/255);
  }

  for (const capDef of coverDef.captions) {
    const text = (coverCaptions[capDef.key] || '').trim();
    if (!text) continue;

    const ov = coverCaptionStyles?.[capDef.key] || {};
    const fontName = ov.font || capDef.font || 'NT Somic';
    const style    = ov.weight >= 700 ? 'bold'
                   : ov.weight >= 600 ? 'semibold'
                   : ov.weight >= 500 ? 'medium'
                   : ov.italic        ? 'italic'
                   :                    'regular';
    const font = lookupFont(fontMap, fontName, style);
    if (!font) { console.warn(`  ⚠ Cover caption font not found: ${fontName}`); continue; }

    const sizePt      = ov.sizePt || capDef.sizePt || 20;
    const lineSpacing = sizePt * (ov.lineSpacing || 1.28);
    const charSpacing = ((ov.letterSpacing || 0)) * sizePt;
    const color       = resolveCapColor(ov.color || capDef.color);
    const lines = text.split('\n').filter(l => l.trim());

    const isRotated = !!capDef.rotate; // spine captions have rotate: 270 (CSS CW degrees)

    if (isRotated) {
      // Spine captions: draw with 90° CCW rotation (pdf-lib CCW = standard math convention).
      // CSS rotate(270deg) CW  =  90° CCW in pdf-lib.
      // After 90° CCW rotation, a text drawn at (x, y):
      //   - runs UPWARD  from y  to y+textWidth  (y controls vertical position along spine)
      //   - extends LEFT from x  to x-sizePt     (x controls horizontal centering on spine)
      //
      // xMm = horizontal center of spine (e.g. 204.5mm from back-left content edge)
      //   → after rotation the character body extends LEFTWARD from drawing baseline by ~cap height
      //     (NOT full sizePt — cap height is ~0.7 × sizePt). Visual center = drawing_x − capHeight/2.
      //   → so x = spine_center + capHeight/2 to put visual center on spine center.
      //
      // yMm = vertical center of caption along spine height (e.g. 140mm from top)
      //   → in page space (y=0 at bottom): y_center = pageSizeHPt - COVER_BLEED_PT - yMm*MM_TO_PT
      //   → text spans y_center ± totalW/2, so origin y = y_center - totalW/2

      // Ascender height ≈ cap height for typical fonts; better centering than sizePt/2.
      const ascenderPt = font.heightAtSize(sizePt, { descender: false });
      const spineXPt   = COVER_BLEED_PT + capDef.xMm * MM_TO_PT + ascenderPt / 2;
      const yCenterPt  = pageSizeHPt - COVER_BLEED_PT - capDef.yMm * MM_TO_PT;
      const totalW     = lines.reduce((sum, l) => sum + font.widthOfTextAtSize(l, sizePt), 0)
                       + (lines.length - 1) * lineSpacing;
      let curYPt = yCenterPt - totalW / 2;

      for (const line of lines) {
        const lineW = font.widthOfTextAtSize(line, sizePt);
        pg.drawText(line, {
          x: spineXPt, y: curYPt,
          size: sizePt, font, color, characterSpacing: charSpacing,
          rotate: { type: 'degrees', angle: 90 }, // 90° CCW = text reads upward
        });
        curYPt += lineW + lineSpacing;
      }
    } else {
      // Front cover captions: horizontal text centered at capDef.xMm
      const blockH   = lines.length * lineSpacing;
      const startYPt = pageSizeHPt - COVER_BLEED_PT - capDef.yMm * MM_TO_PT + blockH / 2 - sizePt * 0.75;
      lines.forEach((line, li) => {
        const textW     = font.widthOfTextAtSize(line, sizePt) + charSpacing * Math.max(0, line.length - 1);
        const centerXPt = COVER_BLEED_PT + capDef.xMm * MM_TO_PT;
        const xPt = capDef.align === 'left'  ? centerXPt - capDef.wMm / 2 * MM_TO_PT
                  : capDef.align === 'right' ? centerXPt + capDef.wMm / 2 * MM_TO_PT - textW
                  :                            centerXPt - textW / 2;
        pg.drawText(line, {
          x: xPt, y: startYPt - li * lineSpacing,
          size: sizePt, font, color, characterSpacing: charSpacing,
        });
      });
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const isPrint = mode === 'print';
  const printDir = path.join(outDir, 'print');
  if (isPrint) fs.mkdirSync(printDir, { recursive: true });

  console.log(`\n📖 Aevia PDF export`);
  console.log(`   Template : ${state.template}`);
  console.log(`   Pages    : ${state.pageCount}`);
  console.log(`   Spreads  : ${state.sequence.length}`);
  console.log(`   Photos   : ${photosDir}`);
  console.log(`   Mode     : ${mode}`);
  console.log(`   Output   : ${isPrint ? printDir : path.join(outDir, 'preview.pdf')}`);
  console.log(`   Canvas   : ${FULL_PX}×${FULL_PX}px (${FULL_MM}mm at ${DPI}dpi)\n`);

  const PAGE_SIZE_PT = FULL_MM / 25.4 * 72; // 206mm in PDF points

  // For preview mode: one shared PDFDocument; for print mode: we create one per page.
  let previewDoc = null;
  let previewFontMap = null;
  if (!isPrint) {
    previewDoc = await PDFDocument.create();
    previewFontMap = await embedAllFonts(previewDoc);
  }

  // Helper: write a single-page print PDF and return nothing; used in print mode.
  async function writePrintPage(label, imgBuf, captionFn) {
    const doc = await PDFDocument.create();
    const fm  = await embedAllFonts(doc);
    const img = await doc.embedPng(imgBuf);
    const pg  = doc.addPage([PAGE_SIZE_PT, PAGE_SIZE_PT]);
    pg.drawImage(img, { x: 0, y: 0, width: PAGE_SIZE_PT, height: PAGE_SIZE_PT });
    if (captionFn) captionFn(pg, fm);
    const bytes = await doc.save();
    fs.writeFileSync(path.join(printDir, label), bytes);
  }

  // Helper: add a page to the preview PDF.
  async function addPreviewPage(imgBuf, captionFn) {
    const img = await previewDoc.embedPng(imgBuf);
    const pg  = previewDoc.addPage([PAGE_SIZE_PT, PAGE_SIZE_PT]);
    pg.drawImage(img, { x: 0, y: 0, width: PAGE_SIZE_PT, height: PAGE_SIZE_PT });
    if (captionFn) captionFn(pg, previewFontMap);
  }

  const specialPhotos        = state.specialPhotos        || {};
  const captions             = state.captions             || {};
  const coverCaptions        = state.coverCaptions        || {};
  const coverCaptionStyles   = state.coverCaptionStyles   || {};
  const spreadCaptionStyles  = state.spreadCaptionStyles  || {};
  let pageNum = 0;

  // ── Cover ────────────────────────────────────────────────────────────────────
  console.log('  [cover] Rendering cover spread…');
  const coverDef      = DATA.cover;
  const coverPhotoName = typeof specialPhotos.cover === 'string'
    ? specialPhotos.cover : specialPhotos.cover?.name;

  try {
    const coverBuf = await renderCoverImage(coverDef, coverPhotoName, photosDir);

    const COVER_W_PT = COVER_FULL_W_MM / 25.4 * 72;
    const COVER_H_PT = COVER_FULL_H_MM / 25.4 * 72;

    if (isPrint) {
      // For print: cover is its own PDF at correct wide dimensions
      const doc = await PDFDocument.create();
      const fm  = await embedAllFonts(doc);
      const img = await doc.embedPng(coverBuf);
      const pg  = doc.addPage([COVER_W_PT, COVER_H_PT]);
      pg.drawImage(img, { x: 0, y: 0, width: COVER_W_PT, height: COVER_H_PT });
      drawCoverCaptions(pg, fm, coverDef, coverCaptions, coverCaptionStyles, COVER_W_PT, COVER_H_PT);
      fs.writeFileSync(path.join(printDir, 'cover.pdf'), await doc.save());
      console.log('  ✓ cover.pdf');
    } else {
      // For preview: add cover as first page (wide) then continue with square content pages
      const img = await previewDoc.embedPng(coverBuf);
      const pg  = previewDoc.addPage([COVER_W_PT, COVER_H_PT]);
      pg.drawImage(img, { x: 0, y: 0, width: COVER_W_PT, height: COVER_H_PT });
      drawCoverCaptions(pg, previewFontMap, coverDef, coverCaptions, coverCaptionStyles, COVER_W_PT, COVER_H_PT);
      console.log('  ✓ cover added to preview');
    }
  } catch (e) {
    console.log(`  ✗ cover failed: ${e.message}`);
  }

  // ── Content pages ────────────────────────────────────────────────────────────

  // Pick variants based on assigned photo orientations.
  // For FP spreads where one side has no regular photos but has a special photo,
  // probe the special photo's actual dimensions to determine V vs H.
  async function pickVariantWithSpecial(photos, spreadId, isLeft) {
    if (photos.length > 0) return pickVariant(photos);
    const spRaw = specialPhotos[spreadId];
    let spName;
    if (Array.isArray(spRaw)) {
      const entry = spRaw[isLeft ? 0 : 1];
      spName = typeof entry === 'string' ? entry : entry?.name;
    } else {
      spName = typeof spRaw === 'string' ? spRaw : spRaw?.name;
    }
    if (!spName) return 'H';
    const spPath = photoPath(spName);
    if (!fs.existsSync(spPath)) return 'H';
    try {
      const meta = await sharp(spPath).metadata();
      return (meta.height > meta.width) ? 'V' : 'H';
    } catch (e) { return 'H'; }
  }

  for (let si = 0; si < state.sequence.length; si++) {
    const spreadId  = state.sequence[si];
    const spreadDef = DATA.spreads[spreadId];
    if (!spreadDef) { console.warn(`Unknown spread: ${spreadId}`); continue; }

    const asgn     = state.assignments[si] || {};
    const leftArr  = asgn.left  || [];
    const rightArr = asgn.right || [];

    const leftVariant  = await pickVariantWithSpecial(leftArr, spreadId, true);
    const rightVariant = await pickVariantWithSpecial(rightArr, spreadId, false);

    const pages = spreadDef.pages || {};

    // ── Left page ────────────────────────────────────────────────────────────
    if (!spreadDef.rightOnly) {
      const leftDef = getPageDef(pages.left, leftVariant);
      if (leftDef) {
        pageNum++;
        const label = `page-${String(pageNum).padStart(3, '0')}.pdf`;
        process.stdout.write(`  [${si+1}/${state.sequence.length}] ${spreadId} left (${leftVariant})… `);
        try {
          const buf = await renderPage(spreadId, 'left', leftDef, leftArr, specialPhotos);
          const capFn = (pg, fm) => drawCaptions(pg, fm, leftDef, String(si), 'left', captions, PAGE_SIZE_PT, spreadId, spreadCaptionStyles);
          if (isPrint) { await writePrintPage(label, buf, capFn); }
          else         { await addPreviewPage(buf, capFn); }
          console.log(`✓ (page ${pageNum})`);
        } catch (e) {
          console.log(`✗ ${e.message}`);
        }
      } else {
        // Blank left page placeholder
        pageNum++;
        if (!isPrint) {
          previewDoc.addPage([PAGE_SIZE_PT, PAGE_SIZE_PT]);
        } else {
          const doc = await PDFDocument.create();
          doc.addPage([PAGE_SIZE_PT, PAGE_SIZE_PT]);
          fs.writeFileSync(path.join(printDir, `page-${String(pageNum).padStart(3, '0')}.pdf`), await doc.save());
        }
        console.log(`  [${si+1}] ${spreadId} left — blank (page ${pageNum})`);
      }
    }

    // ── Right page ───────────────────────────────────────────────────────────
    const rightDef = getPageDef(pages.right, rightVariant);
    if (rightDef) {
      pageNum++;
      const label = `page-${String(pageNum).padStart(3, '0')}.pdf`;
      process.stdout.write(`  [${si+1}/${state.sequence.length}] ${spreadId} right (${rightVariant})… `);
      try {
        const buf = await renderPage(spreadId, 'right', rightDef, rightArr, specialPhotos);
        const capFn = (pg, fm) => drawCaptions(pg, fm, rightDef, String(si), 'right', captions, PAGE_SIZE_PT, spreadId, spreadCaptionStyles);
        if (isPrint) { await writePrintPage(label, buf, capFn); }
        else         { await addPreviewPage(buf, capFn); }
        console.log(`✓ (page ${pageNum})`);
      } catch (e) {
        console.log(`✗ ${e.message}`);
      }
    }
  }

  if (!isPrint) {
    const pdfBytes = await previewDoc.save();
    const outPath  = path.join(outDir, 'preview.pdf');
    fs.writeFileSync(outPath, pdfBytes);
    console.log(`\n✅ Done — cover + ${pageNum} pages → ${outPath}`);
    console.log(`   File size: ${(pdfBytes.length / 1024 / 1024).toFixed(1)} MB\n`);
  } else {
    console.log(`\n✅ Done — cover + ${pageNum} pages → ${printDir}/`);
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
