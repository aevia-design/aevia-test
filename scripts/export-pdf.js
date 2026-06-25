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
  const naive = s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<div>/gi, '\n').replace(/<\/div>/gi, '')
    .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/ /g, ' ').trim();
  if (stripped !== naive) {
    console.warn('stripHtml: unhandled HTML tags detected — check caption formatting:', s.slice(0, 120));
  }
  // Collapse whitespace per line to match how the browser renders the contenteditable:
  // runs of spaces/tabs become one space and each line is trimmed. Without this, a
  // trailing space (typically an NBSP inserted before a manual line break, normalised to
  // a space above) inflates the measured line width in the PDF word-wrap and spuriously
  // wraps a line that fits on one line on screen. Newlines are preserved as line breaks.
  // Decode HTML entities AFTER the tag-mismatch check (so the check compares like-for-like).
  // contentEditable serialises typed characters as named/numeric entities in innerHTML
  // (e.g. "&" → "&amp;", "<" → "&lt;"), which the engine saves verbatim; without decoding
  // they print literally ("Anna &amp; Michael"). Decode numeric forms first, then named
  // ones, and &amp; LAST so an already-escaped entity like "&amp;lt;" survives as "&lt;"
  // rather than collapsing to "<".
  const decodeEntities = t => t
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
  return stripped.split('\n').map(l => decodeEntities(l.replace(/[ \t]+/g, ' ').trim())).join('\n');
};

// ── Runtime config (set by CLI or by generatePdfFromFirestore for server mode) ─
let photosDir   = null;
let orderNumber = null;
let staffKey    = null;
let stateFile   = null;
let outDir      = null;
let mode        = null;

// ── Load state + template data ────────────────────────────────────────────────
// In --order mode, state is loaded from GCS by setupPhotoSource() and assigned in main() after.
// In --photos mode, state is loaded from disk (CLI) or injected directly (server mode).
let state = null;

// Server mode: pre-fetched photo buffers keyed by basename (set by generatePdfFromFirestore).
// When set, loadPhoto reads from this map instead of disk or signed URLs.
let photoBufferMap = null;

// Server mode: optional progress callback (set by generatePdfFromFirestore). Called
// once per spread with (spreadsDone, totalSpreads) so the caller can report progress.
let onProgress = null;

// Initialize print constants and DATA lazily (they depend on state which is loaded asynchronously in --order mode)
let DPI, MM_TO_PX, CONTENT_MM, BLEED_MM, FULL_MM, FULL_PX, CONTENT_PX, BLEED_PX, DATA;
let slotLeft, slotTop, slotW, slotH;

// template-data.js assigns to window.SCRIBBLE_DATA / window.WANDER_DATA
global.window = {};
require(path.resolve(__dirname, '../assets/Template_Scribble/scribble-data.js'));
require(path.resolve(__dirname, '../assets/Template_Wander/wander-data.js'));
require(path.resolve(__dirname, '../assets/Template_Newborn/newborn-data.js'));
require(path.resolve(__dirname, '../assets/Template_Papercut/papercut-data.js'));
require(path.resolve(__dirname, '../assets/Template_Tender/tender-data.js'));
DATA = global.window.SCRIBBLE_DATA; // default; will be updated in main() if needed

function initializePrintConstants() {
  // Check schema version (Plan 13-04)
  if (!state.schemaVersion || state.schemaVersion < 3) {
    console.warn('⚠  book-state.json is schema v' + (state.schemaVersion || 1) +
      '. Re-export from the template engine to get correct bleed coordinates and caption boxes.');
  }

  // ── Print constants ───────────────────────────────────────────────────────────
  // SCALE=3 px/mm lives in pages/staff/template-engine.html only. DPI=300 is the print target.
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

// ── Multi-template seam ──
// Registry keyed by template name (matched case-insensitively against the
// order's templateName, which the product form sets — e.g. 'Scribble',
// 'Wander'). Add a new template by adding one entry here. Falls back to
// Scribble for unknown/missing names. ASSET_BASE is set in main() before any
// asset operations.
const TEMPLATES = {
  scribble: { data: () => global.window.SCRIBBLE_DATA, assetBase: path.resolve(__dirname, '../assets/Template_Scribble/Spreads') },
  wander:   { data: () => global.window.WANDER_DATA,   assetBase: path.resolve(__dirname, '../assets/Template_Wander') },
  newborn:  { data: () => global.window.NEWBORN_DATA,  assetBase: path.resolve(__dirname, '../assets/Template_Newborn') },
  tender:   { data: () => global.window.TENDER_DATA,   assetBase: path.resolve(__dirname, '../assets/Template_Tender') },
  papercut: { data: () => global.window.PAPERCUT_DATA, assetBase: path.resolve(__dirname, '../assets/Template_Papercut/SVG') },
};

let ASSET_BASE = TEMPLATES.scribble.assetBase; // default

function setActiveTemplate(templateName) {
  const key = String(templateName || '').toLowerCase();
  // Empty/missing template = legacy book-state with no template field → default to scribble.
  // But a SPECIFIED template that we can't resolve must fail loudly: silently rendering the
  // wrong template (the old behaviour) produces a plausible-but-wrong PDF and hides real bugs
  // like a stale renderer deploy that doesn't yet know a newly-added template.
  let t;
  if (!key) {
    t = TEMPLATES.scribble;
  } else if (TEMPLATES[key] && TEMPLATES[key].data()) {
    t = TEMPLATES[key];
  } else {
    throw new Error(
      `Unknown template "${templateName}". Known: ${Object.keys(TEMPLATES).join(', ')}. ` +
      `If this template was added recently, the PDF renderer needs to be redeployed.`);
  }
  DATA = t.data();
  ASSET_BASE = t.assetBase;
}

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

// Some Wander overlay SVGs embed full-resolution rasters (one <image> per design
// element) drawn at a tiny scale — e.g. a 2508px PNG placed at scale(.02), occupying
// only ~215px on the printed page (~12× over-resolution). The base64 for these blows
// past libxml2's ~10MB-per-node limit, so sharp/librsvg refuses to parse the SVG and
// the entire overlay silently drops from the PDF (browsers have no such limit, so the
// staff/customer engines render it fine). This downsamples each embedded raster to ~2×
// its on-page display size (already beyond what 300dpi print can resolve, so lossless)
// so the file drops below the limit and renders normally. Gated on `thresholdBytes`:
// the live Scribble template's largest SVG is 5.5MB, so it is never touched. Any per-
// image failure leaves that image untouched; a whole-file failure returns the original.
async function shrinkOversizedSvg(svgStr, canvasPx, thresholdBytes = 8 * 1024 * 1024) {
  try {
    if (svgStr.length <= thresholdBytes) return svgStr;
    const tags = svgStr.match(/<image\b[^>]*>/gi);
    if (!tags) return svgStr;
    const vbM = svgStr.match(/viewBox="([^"]+)"/i);
    const viewBoxW = vbM ? Number(vbM[1].trim().split(/[\s,]+/)[2]) : 0;
    let out = svgStr;
    for (const tag of tags) {
      try {
        const hrefM = tag.match(/(?:xlink:href|href)="data:image\/(png|jpe?g);base64,([^"]+)"/i);
        if (!hrefM) continue;
        const fmt = hrefM[1].toLowerCase().startsWith('jp') ? 'jpeg' : 'png';
        const b64 = hrefM[2];
        const intrinsicW = Number((tag.match(/\bwidth="([\d.]+)"/) || [])[1]) || 0;
        // Effective horizontal scale from scale(a) or matrix(a,…); default 1 (full size).
        // A negative-first scale (e.g. a horizontal flip, scale(-.06 .06)) won't match and
        // defaults to 1 → the image is treated as full-size and skipped below: fail-safe.
        const tr = (tag.match(/transform="([^"]+)"/i) || [])[1] || '';
        const sM = tr.match(/scale\(\s*([\d.]+)/i);
        const mM = tr.match(/matrix\(\s*([\d.eE+-]+)/i);
        const scale = sM ? Number(sM[1]) : (mM ? Number(mM[1]) : 1);
        const displayPx = (intrinsicW && viewBoxW)
          ? (intrinsicW * scale / viewBoxW) * canvasPx : canvasPx;
        const targetPx = Math.max(1, Math.min(intrinsicW || canvasPx, Math.ceil(displayPx * 2)));
        if (intrinsicW && targetPx >= intrinsicW) continue; // already at/below target
        const inBuf  = Buffer.from(b64, 'base64');
        const pipe   = sharp(inBuf).resize(targetPx, null, { withoutEnlargement: true });
        const outBuf = fmt === 'jpeg'
          ? await pipe.jpeg({ quality: 90 }).toBuffer()
          : await pipe.png().toBuffer();
        if (outBuf.length >= inBuf.length) continue; // no size gain — keep original
        out = out.replace(b64, outBuf.toString('base64'));
      } catch { /* leave this embedded image untouched */ }
    }
    return out;
  } catch { return svgStr; }
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
const svgRasterCache = new Map(); // svgPath|FULL_PX → rasterised PNG Buffer (a book reuses ~7 spread designs across 40 pages; rasterising heavy SVGs once instead of per-page is the main speed lever)
let gcsUrlByName  = null;        // basename → signed URL (built by setupPhotoSource)
let folderName    = null;        // derived from storedNames in setupPhotoSource
let gcsOrder      = null;        // full order object from getOrder (for book-state.json fetch in --order mode)

async function setupPhotoSource() {
  if (photoBufferMap) return;    // server mode: photos already injected + state pre-built; never call getOrder
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
  if (photoBufferMap) {
    // Server mode: photos pre-fetched from GCS in-region by generatePdfFromFirestore.
    buf = photoBufferMap.get(name) || photoBufferMap.get(path.basename(name));
    if (!buf) { console.warn(`  ⚠ Photo not in buffer map: ${name}`); return null; }
  } else if (orderNumber) {
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
  // iPhone photos record orientation as an EXIF flag instead of rotating the
  // pixels. The browser auto-applies it (engine/customer preview look upright)
  // but sharp ignores it unless we call .rotate() with no args. Bake the
  // orientation into the pixels here so every downstream sharp() call — slot
  // render, cover, heart-crop math, orientation detection — sees an upright
  // image that matches the preview. No-op for photos without an EXIF flag
  // (e.g. laptop uploads), so existing orders are unaffected.
  try { buf = await sharp(buf).rotate().toBuffer(); }
  catch (e) { /* non-image or sharp failure — fall back to the raw buffer */ }
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

// Replicate CSS object-fit:cover + object-position exactly: scale the image to cover
// the target box, then extract a targetW×targetH window offset by the crop %. Default
// 50/50 = centred (matches sharp's fit:'cover', position:'centre'). Shared by the heart
// slot and every regular slot (#74) so a staff-set crop prints identically.
async function coverExtract(photoData, targetW, targetH, cropX = 50, cropY = 50) {
  const tw = Math.round(targetW), th = Math.round(targetH);
  const meta = await sharp(photoData).metadata();
  const coverScale = Math.max(tw / meta.width, th / meta.height);
  const scaledW = Math.round(meta.width  * coverScale);
  const scaledH = Math.round(meta.height * coverScale);
  const clamp = (v, max) => Math.max(0, Math.min(max, v));
  const exLeft = clamp(Math.round((scaledW - tw) * cropX / 100), scaledW - tw);
  const exTop  = clamp(Math.round((scaledH - th) * cropY / 100), scaledH - th);
  return sharp(photoData)
    .resize(scaledW, scaledH)
    .extract({ left: exLeft, top: exTop, width: tw, height: th })
    .png()
    .toBuffer();
}

// Render one page (left or right) as a PNG buffer
async function renderPage(spreadId, side, pageDef, assignedPhotos, specialPhotos, variantKey) {
  const { bgColor, slots } = pageDef;
  let svg = pageDef.svg;
  const col = hexToSharpColor(bgColor || '#ffffff');

  // ── Newborn zodiac overlay (Labour-right) ──────────────────────────────────
  // The Labour right page has no fixed base SVG (svg:null); its overlay IS the
  // chosen zodiac constellation, resolved from the data's zodiac.path(orientation,
  // sign). 'None' resolves to the empty (None) SVG. Sign comes from state.zodiacSign.
  // The engine appends it with the same .svg-overlay class + default positioning as
  // a normal spread base SVG, so it flows through the identical content-SVG path below.
  if (pageDef.zodiacOverlay) {
    const spreadDef = DATA.spreads[spreadId] || {};
    if (spreadDef.zodiac) {
      const sign = state.zodiacSign || 'None';
      svg = spreadDef.zodiac.path(variantKey || 'H', sign);
    }
  }

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

    // Determine photo source. Mirrors the engine's de-hardcoded resolver (S79):
    // ANY pool except regular/cover is a special functional photo, stored in
    // specialPhotos[spreadId]. The stored SHAPE encodes per-side-ness: an array
    // [leftName, rightName] is one photo per page (FP5 art gallery, Newborn Labour);
    // a scalar (string or {name}) is a single photo on its one side (FP3 toy, FP1
    // birthday, Tender Our-story / Words). Legacy string-on-array templates fall back
    // to the same photo on both pages.
    let photo = null;
    const isSpecialPool = slot.pool && slot.pool !== 'regular' && slot.pool !== 'cover';
    if (isSpecialPool) {
      const spRaw = specialPhotos[spreadId];
      let spName;
      if (Array.isArray(spRaw)) {
        const entry = spRaw[side === 'left' ? 0 : 1];
        spName = typeof entry === 'string' ? entry : entry?.name;
      } else {
        spName = typeof spRaw === 'string' ? spRaw : spRaw?.name;
      }
      if (spName) photo = { name: spName };
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
        // Heart path: template-specific if defined (Papercut has its own outline), else Scribble's.
        // Mirrors the engine's getActiveTemplateData().heartClipPath || <scribble fallback>.
        const heartPath = DATA.heartClipPath || 'M315.61,569.29 c189.41,-32.30,353.76,-502.10,161.52,-504.13 -75.98,-.82,-144.62,37.88,-166.39,37.88 -29.30,0,-56.97,-92.27,-165.83,-47.06 -200.49,83.33,48.24,534.15,170.70,513.31Z';
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
        const photoBuffer = await coverExtract(photoData, CONTENT_PX, CONTENT_PX, cropX, cropY);
        const maskedBuffer = await sharp(photoBuffer)
          .composite([{ input: maskBuffer, blend: 'dest-in' }])
          .png()
          .toBuffer();
        composites.push({ input: maskedBuffer, left: BLEED_PX, top: BLEED_PX });
      } else {
        // Regular slot: apply the staff-set crop offset (#74). Default 50/50 reproduces
        // the old fit:'cover', position:'centre' exactly, so un-repositioned photos are
        // byte-identical to before.
        const hc = (state.heartCrop && state.heartCrop[photo.name]) || {};
        const cropX = typeof hc.x === 'number' ? hc.x : 50;
        const cropY = typeof hc.y === 'number' ? hc.y : 50;
        const photoBuffer = await coverExtract(photoData, sw, sh, cropX, cropY);
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
        // The decorative SVG for a given file rasterises to the same image every time it
        // appears, but a book reuses ~7 spread designs across its pages — so cache the
        // rasterised PNG by path+canvas-size and reuse it, instead of re-running librsvg
        // (slow on heavy SVGs, e.g. Tender's 5.8 MB SP5) once per page. Cache is cleared
        // between requests (see generatePdfFromFirestore) so book sizes can't cross over.
        const svgCacheKey = `${svgPath}|${FULL_PX}`;
        let svgBuffer = svgRasterCache.get(svgCacheKey);
        if (!svgBuffer) {
          const svgStr      = fs.readFileSync(svgPath, 'utf8');
          const svgShrunk   = await shrinkOversizedSvg(svgStr, FULL_PX);
          const svgExpanded = expandSvgViewBox(svgShrunk, SPREAD_SVG_BLEED_UNITS);
          svgBuffer = await sharp(Buffer.from(svgExpanded))
            .resize(FULL_PX, FULL_PX, { fit: 'fill' })
            .png()
            .toBuffer();
          svgRasterCache.set(svgCacheKey, svgBuffer);
        }
        // Z-order: composites paint in array order. Default (push) = SVG on top of photos,
        // matching overlayAbovePhotos:true. When a spread sets overlayAbovePhotos:false
        // (Papercut SP4), the photos must sit ON TOP, so insert the SVG BEFORE them.
        // Scribble/Wander/Newborn omit the flag (undefined) → unchanged push behaviour.
        // overlayBelow (per page, CSV overlay_position=below) OR spread-level
        // overlayAbovePhotos:false → SVG paints BEFORE photos so the photos sit on top.
        const _spreadDef = DATA.spreads[spreadId] || {};
        if (_spreadDef.overlayAbovePhotos === false || pageDef.overlayBelow) {
          composites.unshift({ input: svgBuffer, left: 0, top: 0 });
        } else {
          composites.push({ input: svgBuffer, left: 0, top: 0 });
        }
      } catch (e) {
        console.warn(`  ⚠ SVG overlay failed (${path.basename(svg)}): ${e.message}`);
      }
    } else {
      console.warn(`  ⚠ SVG not found: ${svg}`);
    }
  }

  // ── Wander FP1 Travel map (chunk-022) ────────────────────────────────────────
  // The left map page draws a regional SVG + one pin per selected country. The
  // selection lives in state.mapSelection {region, countries} (written by the
  // engine's Export). Region SVGs are ALREADY bleed-framed (viewBox = 206mm), so
  // — unlike content SVGs above — they are NOT viewBox-expanded: resize straight
  // to FULL_PX at origin. Pin coords are with-bleed mm measured from the canvas
  // (bleed) edge, so they map directly to FULL_PX (no bleed subtraction; the
  // browser subtracts bleed only because its canvas origin is the content edge).
  if (pageDef.mapCanvas) {
    const sel       = state.mapSelection || {};
    const spreadDef = DATA.spreads[spreadId] || {};
    const region    = sel.region;
    const mapPath   = region && spreadDef.maps ? spreadDef.maps[region] : null;
    if (mapPath) {
      const mapSvgPath = path.join(ASSET_BASE, mapPath);
      if (fs.existsSync(mapSvgPath)) {
        try {
          const mapBuffer = await sharp(fs.readFileSync(mapSvgPath))
            .resize(FULL_PX, FULL_PX, { fit: 'fill' })
            .png()
            .toBuffer();
          composites.push({ input: mapBuffer, left: 0, top: 0 });
        } catch (e) {
          console.warn(`  ⚠ Map SVG failed (${path.basename(mapPath)}): ${e.message}`);
        }
      } else {
        console.warn(`  ⚠ Map SVG not found: ${mapPath}`);
      }

      // Pins — one per selected country in the drawn region.
      const pin    = spreadDef.pin || {};
      const coords = DATA.mapCoordinates || {};
      const pinW   = Math.round((pin.wMm || 12) * MM_TO_PX);
      const pinH   = Math.round((pin.hMm || 23) * MM_TO_PX);
      if (pin.png) {
        const pinPath = path.join(ASSET_BASE, pin.png);
        if (fs.existsSync(pinPath)) {
          const pinBuffer = await sharp(fs.readFileSync(pinPath))
            .resize(pinW, pinH, { fit: 'fill' })
            .png()
            .toBuffer();
          for (const name of (sel.countries || [])) {
            const c = coords[name];
            if (!c || c.region !== region) continue;
            const left = Math.round(c.xMm * MM_TO_PX - pinW / 2);
            const top  = Math.round(c.yMm * MM_TO_PX - pinH / 2);
            composites.push({ input: pinBuffer, left, top });
          }
        } else {
          console.warn(`  ⚠ Map pin not found: ${pin.png}`);
        }
      }
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
  'Cormorant Garamond_light':    'CormorantGaramond-Light.ttf',
  'Cormorant Garamond_regular':  'CormorantGaramond-Regular.ttf',
  'Cormorant Garamond_medium':   'CormorantGaramond-Medium.ttf',
  'Cormorant Garamond_semibold': 'CormorantGaramond-SemiBold.ttf',
  'Cormorant Garamond_bold':     'CormorantGaramond-Bold.ttf',
  'Twinkle Star_regular':        'TwinkleStar-Regular.ttf',
  'Parisienne_regular':          'Parisienne-Regular.ttf',
  'Baskervville_regular':        'Baskervville-Regular.ttf',
  'Baskervville_italic':         'Baskervville-Italic.ttf',
  'Baskervville_mediumitalic':   'Baskervville-MediumItalic.ttf',
  'Source Sans 3_regular':       'SourceSans3/SourceSans3-Regular.ttf',
  'Source Sans 3_bold':          'SourceSans3/SourceSans3-Bold.ttf',
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
// Cormorant Garamond has the same fontkit GSUB bug and needs the same workaround.
// Baskervville (Newborn body/caption font) + Twinkle Star (Newborn cover display)
// both expose a `liga` GSUB feature and form ligatures (fi/fl/ffi collapse), the same
// profile that triggered the bug on EB Garamond + Cormorant. Added pre-emptively so
// Newborn print can't ship with mid-word gaps; confirm visually at E2E (Stage 7).
// Source Sans 3 forms fi/fl/ff ligatures (verified: 26 chars → 23 glyphs via fontkit.layout),
// so it hits the same advance-width bug → per-character draw workaround.
const LIGATURE_FONTS = new Set(['EB Garamond', 'Cormorant Garamond', 'Baskervville', 'Twinkle Star', 'Source Sans 3', 'Parisienne']);
// EB Garamond additionally suppresses letter-spacing in the char-by-char path; the shaping
// context loss caused irregular gaps when spacing was also applied. Cormorant Garamond keeps
// its defined letter-spacing because the -0.02em tightening is aesthetically required.
const SUPPRESS_LETTER_SPACING_FONTS = new Set(['EB Garamond']);

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
    const charSpacing   = SUPPRESS_LETTER_SPACING_FONTS.has(fontName) ? 0
      : ((ov.letterSpacing !== undefined ? ov.letterSpacing : capDef.letterSpacing) || 0) * sizePt;

    // Preserve empty lines as blank lines ('') — see the textPanel render below for rationale.
    // The engine renders \n\n as <br><br> (a visible paragraph gap); filtering them out here
    // collapsed that spacing in the PDF. Blank lines are skipped at draw time but still occupy
    // one line-height via the forEach index.
    const lines = String(text).split('\n');

    // xMm/yMm are CENTER coords (with-bleed mm). Convert to pdf-lib box origin (bottom-left of box).
    const boxWidthPt  = capDef.wMm * MM_TO_PT;
    const boxHeightPt = capDef.hMm * MM_TO_PT;
    // Top-left X: center minus half-width
    const textXPt = (capDef.xMm - capDef.wMm / 2) * MM_TO_PT;
    // pdf-lib y=0 is bottom. Box bottom = pageSizePt - (center_y + hMm/2) * MM_TO_PT
    const textYPt = pageSizePt - (capDef.yMm + capDef.hMm / 2) * MM_TO_PT;

    // Word-wrap text to fit box width
    const wrappedLines = lines.flatMap(l => l.trim() ? wrapText(font, l, sizePt, boxWidthPt, charSpacing) : ['']);

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
      if (!line.trim()) return; // blank line: reserve space (via li) but draw nothing
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
      // Regular panels: the engine now renders sizePt at its true physical size
      // (sizePt * SCALE * 25.4/72 px = sizePt typographic points), same as the per-photo
      // slot captions above. So the PDF draws the panel at raw sizePt PDF points — no
      // PANEL_PT_SCALE fudge (that compensated for the old raw-CSS-pt engine bug, now fixed).
      const sizePt        = isFunnyWords
        ? ((ov.sizePt !== undefined ? ov.sizePt : capDef.sizePt) || 20) * MM_TO_PT
        : ((ov.sizePt !== undefined ? ov.sizePt : capDef.sizePt) || 16);
      const lineSpacingPt = sizePt * ((ov.lineSpacing !== undefined ? ov.lineSpacing : capDef.lineSpacing) || 1.28);
      const charSpacing   = SUPPRESS_LETTER_SPACING_FONTS.has(fontName) ? 0
      : ((ov.letterSpacing !== undefined ? ov.letterSpacing : capDef.letterSpacing) || 0) * sizePt;
      // xMm/yMm are CENTER coords (with-bleed mm). Convert to pdf-lib box origin (bottom-left).
      const boxWidthPt  = capDef.wMm * MM_TO_PT;
      const boxHeightPt = capDef.hMm * MM_TO_PT;
      const textXPt = (capDef.xMm - capDef.wMm / 2) * MM_TO_PT;
      const textYPt = pageSizePt - (capDef.yMm + capDef.hMm / 2) * MM_TO_PT;
      const lines = String(panelText).split('\n');
      // Apply word-wrap so long lines flow within the caption box (same as slot captions).
      // FunnyWords panels: each "word" is already one line — wrapText still works correctly.
      // Empty lines are PRESERVED as a single blank line ('') so they reserve one line-height
      // of vertical space — matching the engine, which renders \n\n as <br><br> (a visible gap
      // staff/customers use to space paragraphs). Dropping them collapsed the spacing in the PDF.
      const wrappedLines = lines.flatMap(l => l.trim() ? wrapText(font, l, sizePt, boxWidthPt, charSpacing) : ['']);
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
async function renderCoverImage(coverDef, coverPhotoName, heartCrop = {}) {
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
      // Custom photo silhouette (data-driven clip, e.g. Newborn's scalloped frame).
      // The path lives in cover-SVG space (clipDef.pxPerMm, trim-origin, NO bleed).
      // Mirror the engine's translate(-slotL,-slotT) scale(f): here the PDF canvas
      // origin is the bleed edge and sx/sy are bleed-origin, so map a path point P to
      // slot-local px = P*g + COVER_BLEED_PX − sx, where g = MM_TO_PX / clipDef.pxPerMm.
      const clipDef = slot.clipShape && coverDef.clipShapes
        ? coverDef.clipShapes[slot.clipShape] : null;
      try {
        // Honour the staff-set cover crop (object-position %). coverExtract reproduces
        // CSS object-fit:cover + object-position exactly; default 50/50 = centred, which
        // matches the old fit:'cover', position:'centre' for un-repositioned covers.
        const hc = heartCrop[coverPhotoName] || {};
        const cropX = typeof hc.x === 'number' ? hc.x : 50;
        const cropY = typeof hc.y === 'number' ? hc.y : 50;
        const photoBuffer = await coverExtract(photoData, sw, sh, cropX, cropY);
        if (clipDef) {
          const g  = MM_TO_PX / clipDef.pxPerMm;
          const tx = COVER_BLEED_PX - sx;
          const ty = COVER_BLEED_PX - sy;
          const maskSvg = Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${sw}" height="${sh}">` +
            `<path transform="translate(${tx.toFixed(2)},${ty.toFixed(2)}) scale(${g.toFixed(5)})" d="${clipDef.d}" fill="white"/>` +
            `</svg>`
          );
          const maskBuffer = await sharp(maskSvg).resize(sw, sh).png().toBuffer();
          const maskedBuffer = await sharp(photoBuffer)
            .composite([{ input: maskBuffer, blend: 'dest-in' }])
            .png().toBuffer();
          composites.push({ input: maskedBuffer, left: sx, top: sy });
        } else {
          composites.push({ input: photoBuffer, left: sx, top: sy });
        }
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
        const svgShrunk   = await shrinkOversizedSvg(svgStr, COVER_FULL_W_PX);
        // Strip the root <svg> width/height (e.g. width="409mm" height="200mm") so the
        // (bleed-expanded) viewBox alone governs the coordinate mapping. The cover is
        // NON-square (409×200mm), so once we widen the viewBox by 18mm bleed its aspect
        // (1.886) no longer matches the mm box's aspect (2.045); with width/height present,
        // librsvg applies preserveAspectRatio "meet" and letterboxes the artwork, shifting
        // the decorative frame off the photo clip (the clip is computed directly in px and
        // stays put). Removing width/height makes the viewBox stretch to fill — matching the
        // photo clip exactly. (Square spread SVGs are unaffected; Scribble's cover, which
        // ships without width/height, was always correct — this brings the others in line.)
        const svgExpanded = expandSvgViewBox(svgShrunk, COVER_SVG_BLEED_UNITS)
          .replace(/<svg\b[^>]*>/i, t => t.replace(/\s(?:width|height)="[^"]*"/gi, ''));
        const svgBuffer   = await sharp(Buffer.from(svgExpanded))
          .resize(COVER_FULL_W_PX, COVER_FULL_H_PX, { fit: 'fill' })
          .png().toBuffer();
        // Z-order: default (push) draws the cover SVG on top of the photo — correct for
        // Scribble/Newborn, whose SVG has a transparent photo window + decorations on top.
        // Papercut's cover sets overlayAbovePhotos:false: the photo must sit ON TOP of the
        // graphics, so insert the SVG BEFORE the (already-pushed) photo composite.
        if (coverDef.overlayAbovePhotos === false) {
          composites.unshift({ input: svgBuffer, left: 0, top: 0 });
        } else {
          composites.push({ input: svgBuffer, left: 0, top: 0 });
        }
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
    // Route through stripHtml (like spread captions) so NBSP (U+00A0) and any stray
    // markup are normalised — the embedded print font has no NBSP glyph and would
    // otherwise draw a .notdef box (e.g. the box that appeared after "WILD").
    const text = stripHtml(coverCaptions[capDef.key] || '');
    if (!text) continue;

    const ov = coverCaptionStyles?.[capDef.key] || {};
    if (ov.weight !== undefined && typeof ov.weight !== 'number') {
      console.warn('cover caption override schema mismatch (weight should be numeric):', ov);
    }
    const fontName = ov.font || capDef.font || 'NT Somic';
    // Default weight/italic from the caption's own styling (capDef), not a hardcoded
    // 400/non-italic — so e.g. the Newborn Baskervville subtitle is italic 500 (→
    // mediumitalic) by default. User overrides (ov.*) still win. Mirrors the engine.
    const capWeight = ov.weight !== undefined ? ov.weight : (capDef.weight !== undefined ? capDef.weight : 400);
    const capItalic = ov.italic !== undefined ? ov.italic : (capDef.italic || false);
    const style    = (capItalic && capWeight >= 500 && capWeight < 600) ? 'mediumitalic'
                   : capWeight >= 700 ? 'bold'
                   : capWeight >= 600 ? 'semibold'
                   : capWeight >= 500 ? 'medium'
                   : capItalic        ? 'italic'
                   :                    'regular';
    const font = lookupFont(fontMap, fontName, style);
    if (!font) { console.warn(`  ⚠ Cover caption font not found: ${fontName}`); continue; }

    const sizePt      = ov.sizePt || capDef.sizePt || 20;
    const lineSpacing = sizePt * (ov.lineSpacing || 1.28);
    const charSpacing = SUPPRESS_LETTER_SPACING_FONTS.has(fontName) ? 0 : ((ov.letterSpacing || 0)) * sizePt;
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

      // Center the glyph line-box on the spine center, matching the engine (which rotates the
      // caption box about its center → text visual-center sits on xMm). After 90° CCW rotation
      // ascenders extend LEFT of the baseline (by ascent) and descenders RIGHT (by descent), so
      // the content-box horizontal center = baseline_x − (ascent − descent)/2. Solving for the
      // baseline so that center lands on xMm gives the +(ascent − descent)/2 offset below.
      //
      // IMPORTANT: read ascent/descent from the underlying fontkit font, NOT pdf-lib's
      // heightAtSize. pdf-lib returns INVERTED ascent/descent for some fonts (e.g. Parisienne:
      // asc 8.05 / desc 16.47 — backwards), which flips this offset negative and shoves the
      // spine caption ~3mm off the band. fontkit reports correct metrics, and for every other
      // spine font (Cormorant, Twinkle Star, NT Somic, EB Garamond) it yields the identical
      // value pdf-lib already gave — so the shipped templates are unchanged.
      let spineOffsetPt;
      const fkFont = font.embedder && font.embedder.font;
      if (fkFont && fkFont.unitsPerEm) {
        const s = sizePt / fkFont.unitsPerEm;       // fkFont.descent is negative (below baseline)
        spineOffsetPt = (fkFont.ascent + fkFont.descent) / 2 * s;
      } else {
        const ascenderPt  = font.heightAtSize(sizePt, { descender: false });
        const descenderPt = font.heightAtSize(sizePt) - ascenderPt;
        spineOffsetPt = (ascenderPt - descenderPt) / 2;
      }
      const spineXPt   = capDef.xMm * MM_TO_PT + spineOffsetPt;
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
  const bucket = storage.bucket('aevia-uploads-eu');
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

  // Set active template based on order's templateName (--order mode only; gcsOrder is set by setupPhotoSource)
  if (gcsOrder && gcsOrder.templateName) {
    setActiveTemplate(gcsOrder.templateName);
  }

  // In --order mode, fetch book-state.json from GCS after setupPhotoSource() sets folderName
  await fetchBookStateFromGCS();

  // Now that state is loaded, initialize print constants
  initializePrintConstants();

  console.log(`\n📖 Aevia PDF export`);
  console.log(`   Template : ${state.template}`);
  console.log(`   Pages    : ${state.pageCount}`);
  console.log(`   Spreads  : ${state.sequence.length}`);
  console.log(`   Photos   : ${photoBufferMap ? `server buffer (${photoBufferMap.size} originals)` : orderNumber ? `GCS order ${orderNumber} (${gcsUrlByName.size} originals)` : photosDir}`);
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
    const coverBuf = await renderCoverImage(coverDef, coverPhotoName, state.heartCrop || {});

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
    // Report progress before each spread (server mode only). Best-effort: a failed
    // progress write must never abort the render.
    if (onProgress) { try { await onProgress(si, state.sequence.length); } catch (_) {} }
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
          const buf = await renderPage(spreadId, 'left', leftDef, leftArr, specialPhotos, leftVariant);
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
        const buf = await renderPage(spreadId, 'right', rightDef, rightArr, specialPhotos, rightVariant);
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
    console.log(`\n✅ Done — cover + ${pageNum} pages (incl. blank QR page)`);
    console.log(`   File size: ${(pdfBytes.length / 1024 / 1024).toFixed(1)} MB\n`);

    if (photoBufferMap) {
      // Server mode (Cloud Run): return bytes — caller handles GCS upload.
      return pdfBytes;
    } else if (orderNumber) {
      // CLI --order mode: GCS is the system of record — upload directly, keep no local copy.
      await uploadAndSignPdf(pdfBytes, `${folderName}/pdfs/${orderNumber}_preview.pdf`, `${orderNumber}_preview.pdf`);
    } else {
      // Local (--photos) mode: write to disk for manual inspection.
      const outPath = path.join(outDir, 'preview.pdf');
      fs.writeFileSync(outPath, pdfBytes);
      console.log(`   → ${outPath}`);
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
        await uploadAndSignPdf(mergedBytes, `${folderName}/pdfs/${orderNumber}_print.pdf`, `${orderNumber}_print.pdf`);
      }
    }
  }
}

// Helper: upload a PDF to GCS and print its signed download URL
async function uploadAndSignPdf(fileBytes, gcsPath, label) {
  try {
    const { Storage } = require('@google-cloud/storage');
    const storage = new Storage({ keyFilename: path.join(__dirname, '..', 'functions', 'serviceAccountKey.json') });
    const bucket = storage.bucket('aevia-uploads-eu');

    // Upload straight from the in-memory bytes — no local file is kept in --order mode.
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

// ── CLI entry point ───────────────────────────────────────────────────────────
if (require.main === module) {
  const args   = process.argv.slice(2);
  const getArg = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
  photosDir   = getArg('--photos');
  orderNumber = getArg('--order');
  staffKey    = getArg('--staff-key') || process.env.STAFF_KEY || '865865';
  stateFile   = getArg('--state') || 'book-state.json';
  outDir      = getArg('--out')   || 'pdf-out';
  mode        = getArg('--mode')  || 'preview';

  if (!photosDir && !orderNumber) {
    console.error('Usage: node scripts/export-pdf.js (--photos <dir> | --order <orderNumber>) [--state book-state.json] [--out pdf-out] [--mode preview|print] [--staff-key <key>]');
    process.exit(1);
  }
  if (photosDir && orderNumber) { console.error('Provide either --photos or --order, not both.'); process.exit(1); }
  if (photosDir && !fs.existsSync(photosDir)) { console.error('Photos dir not found:', photosDir); process.exit(1); }
  if (!orderNumber && !fs.existsSync(stateFile)) { console.error('State file not found:', stateFile); process.exit(1); }

  fs.mkdirSync(outDir, { recursive: true });

  if (!orderNumber) {
    state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  }

  main().catch(e => { console.error('Fatal:', e); process.exit(1); });
}

// ── Server-side API (used by Cloud Run pdf-renderer service) ─────────────────
// Injects pre-built state + pre-fetched photo buffers, runs the preview render,
// returns the PDF bytes without touching disk or signing any URLs.
// The caller (pdf-renderer/index.js) is responsible for photo fetching + GCS upload.
async function generatePdfFromFirestore({ ordNum, stateData, bufferMap, fName, progressCb }) {
  // Reset module globals for this invocation (Cloud Run handles one request at a time)
  orderNumber    = ordNum;
  state          = stateData;
  photoBufferMap = bufferMap;   // Map<basename, Buffer> — loadPhoto reads from here
  onProgress     = progressCb || null;
  folderName     = fName;
  photosDir      = null;
  gcsUrlByName   = null;
  gcsOrder       = null;
  mode           = 'preview';
  outDir         = '/tmp/pdf-out';
  Object.assign(photoCache, new Map()); // clear photo cache between requests
  photoCache.clear();
  svgRasterCache.clear();               // clear SVG raster cache between requests (book size / template may change)

  fs.mkdirSync(outDir, { recursive: true });
  setActiveTemplate(stateData.template || '');
  initializePrintConstants();
  return main();  // main() returns previewPdfBytes in server mode
}

module.exports = { generatePdfFromFirestore };
