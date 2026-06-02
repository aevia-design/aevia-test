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
  const stripped = s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<div>/gi, '\n').replace(/<\/div>/gi, '')
    .replace(/<b>/gi, '').replace(/<\/b>/gi, '')
    .replace(/<i>/gi, '').replace(/<\/i>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/ /g, ' ')
    .trim();
  // Warn if unrecognised tags remain (e.g. <span style="...">) so new tag types
  // are caught at export time rather than silently discarding formatting.
  const naive = s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/ /g, ' ').trim();
  if (stripped !== naive) {
    console.warn('stripHtml: unhandled HTML tags detected — check caption formatting:', s.slice(0, 120));
  }
  return stripped;
};

// ── CLI args ──────────────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };

// Photo source: exactly one of --photos (local dir) or --order (pull full-res
// ORIGINALS from GCS via getOrder, matched to book-state.json by filename).
const photosDir   = getArg('--photos');
const orderNumber = getArg('--order');
const staffKey    = getArg('--staff-key') || process.env.STAFF_KEY || '865865';
const stateFile = getArg('--state') || 'book-state.json';
const outDir    = getArg('--out')   || 'pdf-out';
// --mode preview  → single combined preview.pdf (cover + all content pages)
// --mode print    → individual PDFs in <outDir>/print/  (cover.pdf + page-001.pdf etc.)
// default: preview
const mode = getArg('--mode') || 'preview';

if (!photosDir && !orderNumber) {
  console.error('Usage: node scripts/export-pdf.js (--photos <dir> | --order <orderNumber>) [--state book-state.json] [--out pdf-out] [--mode preview|print] [--staff-key <key>]');
  process.exit(1);
}
if (photosDir && orderNumber) { console.error('Provide either --photos or --order, not both.'); process.exit(1); }
if (photosDir && !fs.existsSync(photosDir)) { console.error('Photos dir not found:', photosDir); process.exit(1); }
// In --order mode, state is fetched from GCS, so skip disk check
if (!orderNumber && !fs.existsSync(stateFile)) { console.error('State file not found:', stateFile); process.exit(1); }

fs.mkdirSync(outDir, { recursive: true });

// ── Load state + template data ────────────────────────────────────────────────
// In --order mode, state is loaded from GCS by setupPhotoSource() and assigned in main() after.
// In --photos mode, state is loaded from disk.
let state = null;
if (!orderNumber) {
  state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
}

// Initialize print constants and DATA lazily (they depend on state which is loaded asynchronously in --order mode)
let DPI, MM_TO_PX, CONTENT_MM, BLEED_MM, FULL_MM, FULL_PX, CONTENT_PX, BLEED_PX, DATA;
let slotLeft, slotTop, slotW, slotH;

// template-data.js assigns to window.SCRIBBLE_DATA
global.window = {};
require(path.resolve(__dirname, '../assets/Template_Scribble/scribble-data.js'));
DATA = global.window.SCRIBBLE_DATA;

function initializePrintConstants() {
  // Check schema version (Plan 13-04)
  if (!state.schemaVersion || state.schemaVersion < 3) {
    console.warn('⚠  book-state.json is schema v' + (state.schemaVersion || 1) +
      '. Re-export from the template engine to get correct bleed coordinates and caption boxes.');
  }

  // ── Print constants ───────────────────────────────────────────────────────────
  // SCALE=3 px/mm lives in pages/template-engine.html only. DPI=300 is the print target.
  // If either changes, update both files and re-verify caption sizing math: sizePt * SCALE * 25.4 / 72.
  DPI        = 300;
  MM_TO_PX   = DPI / 25.4;                          // 11.811 px/mm
  CONTENT_MM = DATA.pageSize;                        // 200mm
  BLEED_MM   = DATA.bleed;                           // 3mm
  FULL_MM    = CONTENT_MM + BLEED_MM * 2;            // 206mm
  FULL_PX    = Math.round(FULL_MM * MM_TO_PX);       // 2433px
  CONTENT_PX = Math.round(CONTENT_MM * MM_TO_PX);   // 2362px
  BLEED_PX   = Math.round(BLEED_MM * MM_TO_PX);     // 35px

  // slot.xBleed/yBleed are CENTER coords (with bleed). Subtract half-dimension to get top-left corner.
  slotLeft = (s) => Math.round((s.xBleed - s.w / 2) * MM_TO_PX);
  slotTop  = (s) => Math.round((s.yBleed - s.h / 2) * MM_TO_PX);
  slotW    = (s) => Math.round(s.w * MM_TO_PX);
  slotH    = (s) => Math.round(s.h * MM_TO_PX);

  // Downstream constants that depend on the lazy MM_TO_PX / BLEED_MM above.
  // Must be assigned here (not at module load) or they become NaN in --order mode,
  // corrupting SVG viewBoxes and the cover canvas dimensions.
  SPREAD_SVG_BLEED_UNITS = BLEED_MM * 72 / 25.4;       // ~8.504
  BLEED_PT      = BLEED_MM * MM_TO_PT;
  COVER_FULL_W_PX = Math.round(COVER_FULL_W_MM * MM_TO_PX); // 5256px
  COVER_FULL_H_PX = Math.round(COVER_FULL_H_MM * MM_TO_PX); // 2787px
  COVER_BLEED_PX  = Math.round(COVER_BLEED_MM * MM_TO_PX);  // 213px
}

const ASSET_BASE = path.resolve(__dirname, '../assets/Template_Scribble/Spreads');

// ── Helpers ───────────────────────────────────────────────────────────────────

// Resolve a colour value to a pdf-lib rgb() colour.
// Accepts a hex string ('#493955'), a named colour key that looks up DATA.colors, or nothing.
// Used for both spread captions and cover captions — single source of truth.
function resolveColor(value) {
  if (!value) return CAPTION_COLOR;
  const hex = value.startsWith('#') ? value : DATA.colors?.[value];
  if (!hex) return CAPTION_COLOR;
  const h = hex.replace('#', '');
  if (h.length !== 6) return CAPTION_COLOR;
  return rgb(parseInt(h.slice(0,2),16)/255, parseInt(h.slice(2,4),16)/255, parseInt(h.slice(4,6),16)/255);
}

function hexToSharpColor(hex) {
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16), alpha: 1 };
}

// Expand an SVG's viewBox by `bleedUnits` on every side so bleed artwork outside the
// original content area becomes visible when sharp renders it.
// E.g. "0 0 566.93 566.93" + 8.5 → "-8.5 -8.5 583.93 583.93"
function expandSvgViewBox(svgStr, bleedUnits) {
  return svgStr.replace(/viewBox="([^"]+)"/i, (_, vb) => {
    const [x, y, w, h] = vb.trim().split(/[\s,]+/).map(Number);
    const nx = (x - bleedUnits).toFixed(4);
    const ny = (y - bleedUnits).toFixed(4);
    const nw = (w + bleedUnits * 2).toFixed(4);
    const nh = (h + bleedUnits * 2).toFixed(4);
    return `viewBox="${nx} ${ny} ${nw} ${nh}"`;
  });
}

// SVG user units per mm at 72 dpi (SVG default).
// Spread SVG: 200mm content → 566.93 user units; 3mm bleed → 8.504 units.
// Assigned in initializePrintConstants() — depends on BLEED_MM, which is lazy (--order mode loads state async).
let SPREAD_SVG_BLEED_UNITS;
// COVER_SVG_BLEED_UNITS is defined near the cover constants below (depends on COVER_BLEED_MM).

// ── Photo source ────────────────────────────────────────────────────────────
// loadPhoto(name) returns a Buffer (or null if missing) so sharp() reads the
// same way regardless of source. In --order mode the bytes are the uncompressed
// ORIGINALS the customer uploaded (from photoManifest), never the render-
// compressed versions. URLs come from getOrder and are fresh (1h expiry).
const GET_ORDER_ENDPOINT = 'https://europe-west1-aevia-uploads.cloudfunctions.net/getOrder';
const photoCache  = new Map();   // name → Buffer (avoids re-downloading a photo used twice)
let gcsUrlByName  = null;        // basename → signed URL (built by setupPhotoSource)
let folderName    = null;        // derived from storedNames in setupPhotoSource
let gcsOrder      = null;        // full order object from getOrder (for book-state.json fetch in --order mode)

async function setupPhotoSource() {
  if (!orderNumber) return;      // local --photos mode: nothing to set up
  const resp = await fetch(GET_ORDER_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Staff-Key': staffKey },
    body: JSON.stringify({ orderNumber }),
  });
  if (!resp.ok) {
    const msg = await resp.text().catch(() => '');
    throw new Error(`getOrder failed (HTTP ${resp.status}) for order ${orderNumber}: ${msg}`);
  }
  const orderData = await resp.json();
  const { signedUrls = {}, storedNames = {} } = orderData;

  // Store the full order for later (used to fetch book-state.json from GCS)
  gcsOrder = orderData;

  // Derive folderName from the first available storedName (e.g., cover or pool[0])
  const firstPath = storedNames.cover || (Array.isArray(storedNames.pool) && storedNames.pool[0]) || Object.values(storedNames.special || {})?.[0]?.[0];
  if (firstPath) {
    folderName = firstPath.split('/')[0];
  }

  gcsUrlByName = new Map();
  const add = (storedPath, url) => {
    if (!storedPath || !url) return;
    const base = path.basename(storedPath);
    if (gcsUrlByName.has(base)) console.warn(`  ⚠ Duplicate photo filename in manifest: ${base} — later entry wins`);
    gcsUrlByName.set(base, url);
  };
  add(storedNames.cover, signedUrls.cover);
  for (const slug of Object.keys(storedNames.special || {})) {
    const paths = storedNames.special[slug] || [];
    const urls  = (signedUrls.special || {})[slug] || [];
    paths.forEach((p, i) => add(p, urls[i]));
  }
  (storedNames.pool || []).forEach((p, i) => add(p, (signedUrls.pool || [])[i]));
}

async function loadPhoto(name) {
  if (!name) return null;
  if (photoCache.has(name)) return photoCache.get(name);
  let buf = null;
  if (orderNumber) {
    const url = gcsUrlByName.get(name) || gcsUrlByName.get(path.basename(name));
    if (!url) { console.warn(`  ⚠ Photo not in order manifest: ${name}`); return null; }
    const r = await fetch(url);
    if (!r.ok) { console.warn(`  ⚠ Download failed (HTTP ${r.status}): ${name}`); return null; }
    buf = Buffer.from(await r.arrayBuffer());
  } else {
    const p = path.join(photosDir, name);
    if (!fs.existsSync(p)) return null;
    buf = fs.readFileSync(p);
  }
  photoCache.set(name, buf);
  return buf;
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
      // FP5 art gallery: specialPhotos.FP5 must be array [leftName, rightName].
      // Legacy string fallback below handles old book-state.json from before 2026-05.
      // Re-export from the engine to upgrade to current schema.
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

    const photoData = await loadPhoto(photo.name);
    if (!photoData) {
      console.warn(`  ⚠ Photo not found: ${photo.name}`);
      continue;
    }

    try {
      if (slot.fullBleed) {
        // Full-bleed photo fills the entire 206×206mm canvas including bleed.
        // Sized to FULL_PX × FULL_PX and placed at (0,0) — no crop gap at any edge.
        const photoBuffer = await sharp(photoData)
          .resize(FULL_PX, FULL_PX, { fit: 'cover', position: 'centre' })
          .png()
          .toBuffer();
        composites.push({ input: photoBuffer, left: 0, top: 0 });
      } else if (slot.heartClip) {
        // Heart slot covers full content area; clip-path is in 600px canvas space → scale to CONTENT_PX
        const scale = CONTENT_PX / 600;
        const heartPath = 'M315.61,569.29 c189.41,-32.30,353.76,-502.10,161.52,-504.13 -75.98,-.82,-144.62,37.88,-166.39,37.88 -29.30,0,-56.97,-92.27,-165.83,-47.06 -200.49,83.33,48.24,534.15,170.70,513.31Z';
        const maskSvg = Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${CONTENT_PX}" height="${CONTENT_PX}">` +
          `<g transform="scale(${scale})"><path d="${heartPath}" fill="white"/></g>` +
          `</svg>`
        );
        const maskBuffer = await sharp(maskSvg).resize(CONTENT_PX, CONTENT_PX).png().toBuffer();
        // Crop offset (object-position %) the staff set so the heart never clips a face.
        // Default 50/50 = centred (matches the old fit:'cover', position:'centre').
        const hc = (state.heartCrop && state.heartCrop[photo.name]) || {};
        const cropX = typeof hc.x === 'number' ? hc.x : 50;
        const cropY = typeof hc.y === 'number' ? hc.y : 50;
        // Replicate CSS object-fit:cover + object-position exactly: scale the image to
        // cover the square, then extract the CONTENT_PX window offset by the same %.
        // window-left = (scaledW − CONTENT_PX) × x/100 — the inverse of CSS's object-position.
        const meta = await sharp(photoData).metadata();
        const coverScale = Math.max(CONTENT_PX / meta.width, CONTENT_PX / meta.height);
        const scaledW = Math.round(meta.width  * coverScale);
        const scaledH = Math.round(meta.height * coverScale);
        const clamp = (v, max) => Math.max(0, Math.min(max, v));
        const exLeft = clamp(Math.round((scaledW - CONTENT_PX) * cropX / 100), scaledW - CONTENT_PX);
        const exTop  = clamp(Math.round((scaledH - CONTENT_PX) * cropY / 100), scaledH - CONTENT_PX);
        const photoBuffer = await sharp(photoData)
          .resize(scaledW, scaledH)
          .extract({ left: exLeft, top: exTop, width: CONTENT_PX, height: CONTENT_PX })
          .png()
          .toBuffer();
        const maskedBuffer = await sharp(photoBuffer)
          .composite([{ input: maskBuffer, blend: 'dest-in' }])
          .png()
          .toBuffer();
        composites.push({ input: maskedBuffer, left: BLEED_PX, top: BLEED_PX });
      } else {
        const photoBuffer = await sharp(photoData)
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
  // Expand the SVG viewBox by 3mm (SPREAD_SVG_BLEED_UNITS) each side so the bleed
  // artwork Kseniia drew past the content edge becomes visible. Render to FULL_PX
  // (bleed-inclusive canvas) at origin so SVG pixels map 1:1 to the canvas.
  if (svg) {
    const svgPath = path.join(ASSET_BASE, svg);
    if (fs.existsSync(svgPath)) {
      try {
        const svgStr     = fs.readFileSync(svgPath, 'utf8');
        const svgExpanded = expandSvgViewBox(svgStr, SPREAD_SVG_BLEED_UNITS);
        const svgBuffer  = await sharp(Buffer.from(svgExpanded))
          .resize(FULL_PX, FULL_PX, { fit: 'fill' })
          .png()
          .toBuffer();
        composites.push({ input: svgBuffer, left: 0, top: 0 });
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
let   BLEED_PT;  // assigned in initializePrintConstants() — depends on lazy BLEED_MM
const CAPTION_COLOR = rgb(0.12, 0.12, 0.12); // default near-black

const FONT_FILE_MAP = {
  'NT Somic_regular':          'NTSomic-Regular.ttf',
  'NT Somic_medium':           'NTSomic-Medium.ttf',
  'NT Somic_bold':             'NTSomic-Bold.ttf',
  'EB Garamond_regular':       'EBGaramond-Regular.ttf',
  'EB Garamond_italic':        'EBGaramond-Italic.ttf',
  'EB Garamond_semibold':      'EBGaramond-SemiBold.ttf',
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

// Fonts that form OpenType ligatures (fi, fl, ff…). @pdf-lib/fontkit stores wrong advance widths
// for ligature glyphs in the PDF W array, causing visible gaps mid-word. The bulletproof workaround
// is to draw each character as its own drawText call — fontkit can't form a ligature across separate
// calls (no shaping context). Tradeoff: loses pair kerning, but barely perceptible at body sizes.
const LIGATURE_FONTS = new Set(['EB Garamond']);

// Measure a string's rendered width by summing per-character widths (no ligature shaping).
function measureNoLig(font, text, sizePt, charSpacing) {
  let w = 0;
  for (const ch of text) w += font.widthOfTextAtSize(ch, sizePt);
  return w + charSpacing * Math.max(0, [...text].length - 1);
}

// Draw text character-by-character. Each character is shaped in isolation, so no ligature can form.
// `rotate` is optional and applied to every glyph (spine captions).
function drawTextNoLig(pg, text, opts) {
  const { x, y, size, font, color, characterSpacing = 0, rotate } = opts;
  let cursor = x;
  for (const ch of text) {
    if (ch === ' ') {
      cursor += font.widthOfTextAtSize(' ', size) + characterSpacing;
      continue;
    }
    pg.drawText(ch, { x: cursor, y, size, font, color, ...(rotate ? { rotate } : {}) });
    cursor += font.widthOfTextAtSize(ch, size) + characterSpacing;
  }
}

function lookupFont(fontMap, fontName, style) {
  // Normalise: lowercase + strip hyphens so 'Semi-Bold' → 'semibold' matches the font map key.
  const normStyle = (style || 'regular').toLowerCase().replace(/-/g, '');
  const key = `${fontName}_${normStyle}`;
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

  // Per-slot style overrides from spreadCaptionStyles[si][side][slotIdx]
  const scsOverrides = spreadCaptionStyles?.[si]?.[side] || {};

  // ── Slot captions ──────────────────────────────────────────────────────────
  for (let i = 0; i < (slots || []).length; i++) {
    const slot = slots[i];
    const capDef = slot.caption;
    if (!capDef?.allowed) continue;

    const text = stripHtml(sideCaps[i]);
    if (!text || !text.trim()) continue;

    // Merge per-slot style overrides (font, weight, italic, sizePt, lineSpacing, letterSpacing).
    // Override schema: { font?, weight (number: 400/500/600/700), italic (bool),
    //   sizePt?, letterSpacing?, lineSpacing?, color? }
    // weight MUST be numeric — string style names ('bold', 'medium') are NOT supported
    // and will silently fall through to 'regular'. Engine always writes weight as a number.
    const ov       = scsOverrides[i] || {};
    if (ov.weight !== undefined && typeof ov.weight !== 'number') {
      console.warn('caption override schema mismatch (weight should be numeric):', ov);
    }
    const fontName = ov.font          !== undefined ? ov.font     : capDef.font;
    const ovStyle  = ov.weight !== undefined
      ? (ov.weight >= 700 ? 'bold' : ov.weight >= 600 ? 'semibold' : ov.weight >= 500 ? 'medium' : ov.italic ? 'italic' : 'regular')
      : (ov.italic ? 'italic' : capDef.style || 'regular');
    const font = lookupFont(fontMap, fontName, ovStyle);
    if (!font) { console.warn(`  ⚠ Caption font not found: ${fontName} ${ovStyle}`); continue; }

    const sizePt        = (ov.sizePt !== undefined ? ov.sizePt : capDef.sizePt) || 16;
    const lineSpacingPt = sizePt * ((ov.lineSpacing !== undefined ? ov.lineSpacing : capDef.lineSpacing) || 1.28);
    const charSpacing   = LIGATURE_FONTS.has(fontName) ? 0
      : ((ov.letterSpacing !== undefined ? ov.letterSpacing : capDef.letterSpacing) || 0) * sizePt;

    const lines = String(text).split('\n').filter(l => l.trim());

    // xMm/yMm are CENTER coords (with-bleed mm). Convert to pdf-lib box origin (bottom-left of box).
    const boxWidthPt  = capDef.wMm * MM_TO_PT;
    const boxHeightPt = capDef.hMm * MM_TO_PT;
    // Top-left X: center minus half-width
    const textXPt = (capDef.xMm - capDef.wMm / 2) * MM_TO_PT;
    // pdf-lib y=0 is bottom. Box bottom = pageSizePt - (center_y + hMm/2) * MM_TO_PT
    const textYPt = pageSizePt - (capDef.yMm + capDef.hMm / 2) * MM_TO_PT;

    // Word-wrap text to fit box width
    const wrappedLines = lines.flatMap(l => wrapText(font, l, sizePt, boxWidthPt, charSpacing));

    // Horizontal alignment
    const halign = capDef.halign || 'left';
    // Vertical alignment: measure total text height then offset within box
    const totalTextHeight = wrappedLines.length > 0
      ? (wrappedLines.length * lineSpacingPt - (lineSpacingPt - sizePt))
      : 0;
    let yOffsetPt = 0;
    if (capDef.valign === 'center') {
      yOffsetPt = (boxHeightPt - totalTextHeight) / 2;
    } else if (capDef.valign === 'bottom') {
      yOffsetPt = boxHeightPt - totalTextHeight;
    }
    // else 'top' — yOffsetPt stays 0

    const isLig = LIGATURE_FONTS.has(fontName);
    wrappedLines.forEach((line, li) => {
      const textWidthPt = isLig
        ? measureNoLig(font, line, sizePt, charSpacing)
        : font.widthOfTextAtSize(line, sizePt) + charSpacing * Math.max(0, line.length - 1);
      const xPt = halign === 'left'  ? textXPt
                : halign === 'right' ? textXPt + boxWidthPt - textWidthPt
                :                      textXPt + (boxWidthPt - textWidthPt) / 2; // center
      // Y position: start from top of box, advance by line height.
      // 0.75 ≈ cap-height ratio for typical serif fonts (NT Somic, EB Garamond).
      // Converts font sizePt to the vertical distance from line-top to text baseline.
      const lineTopPt = textYPt + boxHeightPt - yOffsetPt - li * lineSpacingPt;
      const baselinePt = lineTopPt - sizePt * 0.75;
      const drawOpts = { x: xPt, y: baselinePt, size: sizePt, font,
                         color: resolveColor(capDef.color), characterSpacing: charSpacing };
      if (isLig) drawTextNoLig(pg, line, drawOpts);
      else       pg.drawText(line, drawOpts);
    });
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
      // Regular panels: the engine renders these in raw CSS pt at 96dpi, which on its
      // 3px/mm (76.2dpi) canvas makes them ~1.26× larger than their nominal pt. The PDF
      // reads sizePt as a true 72dpi point, so it prints ~1.26× smaller than the screen.
      // Scale panel pt up by 96dpi / 76.2dpi so the print matches the engine appearance.
      const PANEL_PT_SCALE = (96 / 25.4) / 3;  // ≈ 1.2598  (SCALE = 3 px/mm in both engines)
      const sizePt        = isFunnyWords
        ? ((ov.sizePt !== undefined ? ov.sizePt : capDef.sizePt) || 20) * MM_TO_PT
        : ((ov.sizePt !== undefined ? ov.sizePt : capDef.sizePt) || 16) * PANEL_PT_SCALE;
      const lineSpacingPt = sizePt * ((ov.lineSpacing !== undefined ? ov.lineSpacing : capDef.lineSpacing) || 1.28);
      const charSpacing   = LIGATURE_FONTS.has(fontName) ? 0
      : ((ov.letterSpacing !== undefined ? ov.letterSpacing : capDef.letterSpacing) || 0) * sizePt;
      // xMm/yMm are CENTER coords (with-bleed mm). Convert to pdf-lib box origin (bottom-left).
      const boxWidthPt  = capDef.wMm * MM_TO_PT;
      const boxHeightPt = capDef.hMm * MM_TO_PT;
      const textXPt = (capDef.xMm - capDef.wMm / 2) * MM_TO_PT;
      const textYPt = pageSizePt - (capDef.yMm + capDef.hMm / 2) * MM_TO_PT;
      const lines = String(panelText).split('\n');
      // Apply word-wrap so long lines flow within the caption box (same as slot captions).
      // FunnyWords panels: each "word" is already one line — wrapText still works correctly.
      const wrappedLines = lines.flatMap(l => l.trim() ? wrapText(font, l, sizePt, boxWidthPt, charSpacing) : []);
      // Measure total text height for valign
      const totalTextHeight = wrappedLines.length > 0
        ? (wrappedLines.length * lineSpacingPt - (lineSpacingPt - sizePt))
        : 0;
      let yOffsetPt = 0;
      if (capDef.valign === 'center') {
        yOffsetPt = (boxHeightPt - totalTextHeight) / 2;
      } else if (capDef.valign === 'bottom') {
        yOffsetPt = boxHeightPt - totalTextHeight;
      }
      const isLigPanel = LIGATURE_FONTS.has(fontName);
      wrappedLines.forEach((line, li) => {
        if (!line.trim()) return;
        const textWidthPt = isLigPanel
          ? measureNoLig(font, line, sizePt, charSpacing)
          : font.widthOfTextAtSize(line, sizePt) + charSpacing * Math.max(0, line.length - 1);
        const halign = capDef.halign || 'center';
        const xPt = halign === 'left'  ? textXPt
                  : halign === 'right' ? textXPt + boxWidthPt - textWidthPt
                  :                      textXPt + (boxWidthPt - textWidthPt) / 2; // center
        const lineTopPt = textYPt + boxHeightPt - yOffsetPt - li * lineSpacingPt;
        const drawOpts = { x: xPt, y: lineTopPt - sizePt * 0.75, size: sizePt, font,
                           color: resolveColor(capDef.color), characterSpacing: charSpacing };
        if (isLigPanel) drawTextNoLig(pg, line, drawOpts);
        else            pg.drawText(line, drawOpts);
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
let   COVER_FULL_W_PX;   // assigned in initializePrintConstants() — depends on lazy MM_TO_PX
let   COVER_FULL_H_PX;   // (5256px)
let   COVER_BLEED_PX;    // (213px)
// Cover SVG: 409mm wide → 1159.37 user units; 18mm bleed → 51.024 user units.
const COVER_SVG_BLEED_UNITS = COVER_BLEED_MM * 72 / 25.4;  // ~51.024

// Render the full cover spread as a PNG buffer.
// coverDef = DATA.cover; coverPhoto = filename string; coverCaptions = { year, name, spineName, spineYear }
async function renderCoverImage(coverDef, coverPhotoName) {
  const { sections, slots, svg } = coverDef;
  // Cover SVG lives in the same Spreads/ folder as content SVGs (ASSET_BASE already points there)
  const COVER_ASSET_BASE = ASSET_BASE;

  // Cover compositing strategy:
  //   The cover SVG already contains the back section background and spine background,
  //   both extended into the bleed area. We expand the SVG's viewBox by COVER_SVG_BLEED_UNITS
  //   on each side and render it at origin so the SVG provides back + spine + their bleed.
  //   The front section has NO background in the SVG (no Front_BG_Color element), so we
  //   use the front colour as the canvas background — it fills the entire canvas including
  //   the front area and the top/bottom/right bleed of the front section.
  //   Composite order: canvas bg (front colour) → photo → SVG (draws back+spine on top).
  const frontColor = hexToSharpColor(sections.front.bgColor);

  // Canvas background = front colour (covers front area + all its bleed margins).
  let canvas = sharp({
    create: { width: COVER_FULL_W_PX, height: COVER_FULL_H_PX, channels: 4,
               background: { r: frontColor.r, g: frontColor.g, b: frontColor.b, alpha: 1 } }
  }).png();

  const composites = [];

  // ── Front photo slot (BEFORE SVG so decorations can overlay) ──────────────
  if (coverPhotoName) {
    const photoData = await loadPhoto(coverPhotoName);
    if (photoData) {
      const slot = slots[0]; // single cover photo slot
      // slot.xMm/yMm are CENTER coords already including the 18mm bleed — do NOT add COVER_BLEED_PX.
      const sw = Math.round(slot.wMm * MM_TO_PX);
      const sh = Math.round(slot.hMm * MM_TO_PX);
      const sx = Math.round((slot.xMm - slot.wMm / 2) * MM_TO_PX);
      const sy = Math.round((slot.yMm - slot.hMm / 2) * MM_TO_PX);
      try {
        const photoBuffer = await sharp(photoData)
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

  // ── SVG overlay (back + spine, with bleed) ───────────────────────────────
  // Expand the SVG viewBox by 18mm (COVER_SVG_BLEED_UNITS) each side so the back BG
  // and spine BG colour rects Kseniia drew into the bleed area are visible. Render to
  // the full bleed-inclusive canvas size at origin.
  if (svg) {
    const svgPath = path.join(COVER_ASSET_BASE, svg);
    if (fs.existsSync(svgPath)) {
      try {
        const svgStr      = fs.readFileSync(svgPath, 'utf8');
        const svgExpanded = expandSvgViewBox(svgStr, COVER_SVG_BLEED_UNITS);
        const svgBuffer   = await sharp(Buffer.from(svgExpanded))
          .resize(COVER_FULL_W_PX, COVER_FULL_H_PX, { fit: 'fill' })
          .png().toBuffer();
        composites.push({ input: svgBuffer, left: 0, top: 0 });
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

  for (const capDef of coverDef.captions) {
    const text = (coverCaptions[capDef.key] || '').trim();
    if (!text) continue;

    const ov = coverCaptionStyles?.[capDef.key] || {};
    if (ov.weight !== undefined && typeof ov.weight !== 'number') {
      console.warn('cover caption override schema mismatch (weight should be numeric):', ov);
    }
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
    const charSpacing = LIGATURE_FONTS.has(fontName) ? 0 : ((ov.letterSpacing || 0)) * sizePt;
    const color       = resolveColor(ov.color || capDef.color);
    const lines = text.split('\n').filter(l => l.trim());

    const isRotated = !!capDef.rotate; // spine captions have rotate: 270 (CSS CW degrees)

    if (isRotated) {
      // Spine captions: draw with 90° CCW rotation (pdf-lib CCW = standard math convention).
      // CSS rotate(270deg) CW  =  90° CCW in pdf-lib.
      // After 90° CCW rotation, a text drawn at (x, y):
      //   - runs UPWARD  from y  to y+textWidth  (y controls vertical position along spine)
      //   - extends LEFT from x  to x-sizePt     (x controls horizontal centering on spine)
      //
      // xMm = horizontal center of spine, measured from left bleed edge (absolute, 18mm bleed included)
      //   → after rotation the character body extends LEFTWARD from drawing baseline by ~cap height
      //     (NOT full sizePt — cap height is ~0.7 × sizePt). Visual center = drawing_x − capHeight/2.
      //   → so x = xMm*MM_TO_PT + capHeight/2 to put visual center on spine center.
      //
      // yMm = vertical center of caption along spine height, from TOP of page (absolute, bleed included)
      //   → in page space (y=0 at bottom): y_center = pageSizeHPt - yMm*MM_TO_PT
      //   → text spans y_center ± totalW/2, so origin y = y_center - totalW/2

      // Ascender height ≈ cap height for typical fonts; better centering than sizePt/2.
      // capDef.xMm/yMm are absolute coords (include 18mm bleed) — do NOT add/subtract COVER_BLEED_PT.
      const isLigCover = LIGATURE_FONTS.has(fontName);
      const measure = (l) => isLigCover
        ? measureNoLig(font, l, sizePt, charSpacing)
        : font.widthOfTextAtSize(l, sizePt);

      const ascenderPt = font.heightAtSize(sizePt, { descender: false });
      const spineXPt   = capDef.xMm * MM_TO_PT + ascenderPt / 2;
      const yCenterPt  = pageSizeHPt - capDef.yMm * MM_TO_PT;
      const totalW     = lines.reduce((sum, l) => sum + measure(l), 0)
                       + (lines.length - 1) * lineSpacing;
      let curYPt = yCenterPt - totalW / 2;
      const rotateOpt = { type: 'degrees', angle: 90 }; // 90° CCW = text reads upward

      for (const line of lines) {
        if (isLigCover) {
          // Per-character draw: each char rotates around its own (x, y); advancing y moves up the spine.
          for (const ch of line) {
            const chW = font.widthOfTextAtSize(ch, sizePt);
            if (ch !== ' ') {
              pg.drawText(ch, { x: spineXPt, y: curYPt, size: sizePt, font, color, rotate: rotateOpt });
            }
            curYPt += chW + charSpacing;
          }
          curYPt += lineSpacing - charSpacing; // remove the trailing inter-char gap, add line gap
        } else {
          pg.drawText(line, {
            x: spineXPt, y: curYPt,
            size: sizePt, font, color, characterSpacing: charSpacing,
            rotate: rotateOpt,
          });
          curYPt += measure(line) + lineSpacing;
        }
      }
    } else {
      // Front cover captions: horizontal text centered at capDef.xMm
      // capDef.xMm/yMm are absolute coords (include 18mm bleed) — do NOT add/subtract COVER_BLEED_PT.
      const isLigFront = LIGATURE_FONTS.has(fontName);
      const blockH   = lines.length * lineSpacing;
      // 0.75 ≈ cap-height ratio — converts sizePt to distance from line-top to baseline.
      const startYPt = pageSizeHPt - capDef.yMm * MM_TO_PT + blockH / 2 - sizePt * 0.75;
      lines.forEach((line, li) => {
        const textW = isLigFront
          ? measureNoLig(font, line, sizePt, charSpacing)
          : font.widthOfTextAtSize(line, sizePt) + charSpacing * Math.max(0, line.length - 1);
        const centerXPt = capDef.xMm * MM_TO_PT;
        const xPt = capDef.align === 'left'  ? centerXPt - capDef.wMm / 2 * MM_TO_PT
                  : capDef.align === 'right' ? centerXPt + capDef.wMm / 2 * MM_TO_PT - textW
                  :                            centerXPt - textW / 2;
        const drawOpts = {
          x: xPt, y: startYPt - li * lineSpacing,
          size: sizePt, font, color, characterSpacing: charSpacing,
        };
        if (isLigFront) drawTextNoLig(pg, line, drawOpts);
        else            pg.drawText(line, drawOpts);
      });
    }
  }
}

// ── Fetch book state from GCS (--order mode only) ────────────────────────────
async function fetchBookStateFromGCS() {
  if (!orderNumber || state) return;  // Already loaded or not in --order mode
  const { Storage } = require('@google-cloud/storage');
  const storage = new Storage({ keyFilename: path.join(__dirname, '..', 'functions', 'serviceAccountKey.json') });
  const bucket = storage.bucket('aevia-uploads.firebasestorage.app');
  const bookStateFile = bucket.file(`${folderName}/book-state.json`);
  try {
    const [content] = await bookStateFile.download();
    state = JSON.parse(content.toString('utf8'));
  } catch (err) {
    throw new Error(`Failed to fetch book-state.json from GCS at ${folderName}/book-state.json: ${err.message}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const isPrint = mode === 'print';
  const printDir = path.join(outDir, 'print');
  if (isPrint) fs.mkdirSync(printDir, { recursive: true });

  await setupPhotoSource();

  // In --order mode, fetch book-state.json from GCS after setupPhotoSource() sets folderName
  await fetchBookStateFromGCS();

  // Now that state is loaded, initialize print constants
  initializePrintConstants();

  console.log(`\n📖 Aevia PDF export`);
  console.log(`   Template : ${state.template}`);
  console.log(`   Pages    : ${state.pageCount}`);
  console.log(`   Spreads  : ${state.sequence.length}`);
  console.log(`   Photos   : ${orderNumber ? `GCS order ${orderNumber} (${gcsUrlByName.size} originals)` : photosDir}`);
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
    const coverBuf = await renderCoverImage(coverDef, coverPhotoName);

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
    const spData = await loadPhoto(spName);
    if (!spData) return 'H';
    try {
      const meta = await sharp(spData).metadata();
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

  // ── Terminal blank page (required by print house for QR code placement) ─────
  // Appended after all content pages for every book size (40 or 80 pages).
  pageNum++;
  if (isPrint) {
    const doc = await PDFDocument.create();
    doc.addPage([PAGE_SIZE_PT, PAGE_SIZE_PT]);
    const blankLabel = `page-${String(pageNum).padStart(3, '0')}.pdf`;
    fs.writeFileSync(path.join(printDir, blankLabel), await doc.save());
    console.log(`  ✓ ${blankLabel} (blank — QR code page for print house)`);
  } else {
    previewDoc.addPage([PAGE_SIZE_PT, PAGE_SIZE_PT]);
    console.log(`  ✓ blank QR page added (page ${pageNum})`);
  }

  if (!isPrint) {
    const pdfBytes = await previewDoc.save();
    const outPath  = path.join(outDir, 'preview.pdf');
    fs.writeFileSync(outPath, pdfBytes);
    console.log(`\n✅ Done — cover + ${pageNum} pages (incl. blank QR page) → ${outPath}`);
    console.log(`   File size: ${(pdfBytes.length / 1024 / 1024).toFixed(1)} MB\n`);

    // In --order mode: upload preview.pdf to GCS and print signed URL
    if (orderNumber) {
      await uploadAndSignPdf(outPath, `${folderName}/pdfs/preview.pdf`, 'preview.pdf');
    }
  } else {
    console.log(`\n✅ Done — cover + ${pageNum} pages (incl. blank QR page) → ${printDir}/`);

    // In --order mode: merge all print PDFs into print.pdf, upload to GCS, and print signed URL
    if (orderNumber) {
      // Collect all PDFs in print directory and merge them
      const printFiles = fs.readdirSync(printDir)
        .filter(f => f.endsWith('.pdf'))
        .sort(); // Ensure cover is first (alphabetically), then pages in order

      if (printFiles.length > 0) {
        const { PDFDocument: PDFDocMerge } = require('pdf-lib');
        const mergedDoc = await PDFDocMerge.create();

        for (const file of printFiles) {
          const filePath = path.join(printDir, file);
          const fileBytes = fs.readFileSync(filePath);
          const sourceDoc = await PDFDocMerge.load(fileBytes);
          const pages = await mergedDoc.copyPages(sourceDoc, sourceDoc.getPageIndices());
          pages.forEach(pg => mergedDoc.addPage(pg));
        }

        const mergedBytes = await mergedDoc.save();
        const printPdfPath = path.join(outDir, 'print.pdf');
        fs.writeFileSync(printPdfPath, mergedBytes);
        await uploadAndSignPdf(printPdfPath, `${folderName}/pdfs/print.pdf`, 'print.pdf');
      }
    }
  }
}

// Helper: upload a PDF to GCS and print its signed download URL
async function uploadAndSignPdf(localPath, gcsPath, label) {
  try {
    const { Storage } = require('@google-cloud/storage');
    const storage = new Storage({ keyFilename: path.join(__dirname, '..', 'functions', 'serviceAccountKey.json') });
    const bucket = storage.bucket('aevia-uploads.firebasestorage.app');

    // Upload
    const fileBytes = fs.readFileSync(localPath);
    await bucket.file(gcsPath).save(fileBytes, { contentType: 'application/pdf' });

    // Generate signed URL (1-hour expiry, same as photo URLs)
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    const [signedUrl] = await bucket.file(gcsPath).getSignedUrl({ action: 'read', version: 'v4', expires });

    console.log(`\n📄 ${label} uploaded to GCS`);
    console.log(`   Path: gs://${bucket.name}/${gcsPath}`);
    console.log(`   Download: ${signedUrl}\n`);
  } catch (err) {
    console.error(`Failed to upload and sign ${label}: ${err.message}`);
    process.exit(1);
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
