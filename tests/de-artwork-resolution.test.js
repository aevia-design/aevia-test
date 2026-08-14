// German book artwork — the customer picks a language on the product page and the
// order carries it; every surface that draws a page (staff engine, customer preview,
// PDF exporter) must resolve the SAME artwork from it. A mismatch means the customer
// approves a German preview and receives an English book, or vice versa.
//
// Guards three things: the DE override is taken for a German book, a page with no DE
// artwork falls back to English rather than blank, and an English book is untouched
// (the regression that matters most — every existing order is English).

const fs = require('fs');
const path = require('path');

// The resolution rule, stated once. resolvePageSvg() in template-engine.html and
// customer-preview.html and the `svg` assignment in export-pdf.js renderPage() are
// all this expression; the mirror test below asserts they stay that way.
const resolve = (def, language) => (language === 'de' && def.svgDe) || def.svg;

// Every data file that carries DE artwork, with the SVG base the engines prepend.
const TEMPLATES = {
  'Template_Scribble/scribble-data.js': 'Template_Scribble/Spreads/',
  'Template_Papercut/papercut-data.js': 'Template_Papercut/SVG/',
  'Template_Tender/tender-data.js': 'Template_Tender/',
  'Template_Wander/wander-data.js': 'Template_Wander/',
  'Template_Joyride/joyride-data.js': 'Template_Joyride/SVG/',
  'Template_Laguna/laguna-data.js': 'Template_Laguna/SVG/',
  'Template_Heirloom/Beige/heirloom-data.js': 'Template_Heirloom/Beige/SVG/',
  'Template_Heirloom/Brown/heirloom-brown-data.js': 'Template_Heirloom/Brown/SVG/',
  'Template_Heirloom/Blue/heirloom-blue-data.js': 'Template_Heirloom/Blue/SVG/',
  'Template_Heirloom/Green/heirloom-green-data.js': 'Template_Heirloom/Green/SVG/',
};

const ASSETS = path.join(__dirname, '..', 'assets');

/** Every page variant object in a template's spreads, flattened. */
function pageDefs(data) {
  const out = [];
  for (const spread of Object.values(data.spreads || {})) {
    for (const side of ['left', 'right']) {
      const page = (spread.pages || {})[side];
      if (!page) continue;
      for (const variant of Object.values(page)) {
        if (variant && typeof variant === 'object' && 'svg' in variant) out.push(variant);
      }
    }
  }
  return out;
}

function loadData(file) {
  if (!global.window) global.window = {};
  require(path.join(ASSETS, file));
  const key = Object.keys(global.window).find(
    k => k.endsWith('_DATA') && global.window[k] && typeof global.window[k] === 'object'
      && global.window[k].spreads && k !== 'lastKey'
  );
  return { key, all: global.window };
}

describe('DE artwork resolution', () => {
  test('a German book takes svgDe; an English book takes svg', () => {
    const def = { svg: 'EN.svg', svgDe: 'DE.svg' };
    expect(resolve(def, 'de')).toBe('DE.svg');
    expect(resolve(def, 'en')).toBe('EN.svg');
    // Absent language = every pre-germanization order. Must stay English.
    expect(resolve(def, undefined)).toBe('EN.svg');
    expect(resolve(def, null)).toBe('EN.svg');
  });

  test('a page with no DE artwork falls back to English, never blank', () => {
    const def = { svg: 'EN.svg' };
    expect(resolve(def, 'de')).toBe('EN.svg');
    expect(resolve(def, 'en')).toBe('EN.svg');
  });

  test('every svgDe declared in a data file exists on disk', () => {
    let checked = 0;
    for (const [file, base] of Object.entries(TEMPLATES)) {
      const src = fs.readFileSync(path.join(ASSETS, file), 'utf8');
      for (const m of src.matchAll(/svgDe: '([^']+)'/g)) {
        const full = path.join(ASSETS, base, m[1]);
        expect(fs.existsSync(full)).toBe(true);
        checked++;
      }
    }
    // A guard against the whole sweep silently matching nothing.
    expect(checked).toBeGreaterThanOrEqual(30);
  });

  test('no svgDe is declared without an English svg beside it', () => {
    // resolvePageSvg falls back to def.svg, so a DE-only page would render blank
    // for English customers. Every DE override must augment, never replace.
    for (const file of Object.keys(TEMPLATES)) {
      if (!global.window) global.window = {};
      require(path.join(ASSETS, file));
    }
    for (const key of Object.keys(global.window)) {
      const data = global.window[key];
      if (!data || typeof data !== 'object' || !data.spreads) continue;
      for (const def of pageDefs(data)) {
        if (def.svgDe) expect(typeof def.svg).toBe('string');
      }
    }
  });

  test('all three surfaces resolve identically (source mirror check)', () => {
    // The rule is duplicated by design — two engines are parallel copies and the PDF
    // renderer is a third implementation. If one drifts, print stops matching the
    // approved preview. Assert the expression is present in each.
    const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
    const engine  = read('pages/staff/template-engine.html');
    const preview = read('pages/customer-preview.html');
    const pdf     = read('scripts/export-pdf.js');

    // Both engines share resolvePageSvg with the same body.
    for (const src of [engine, preview]) {
      expect(src).toMatch(/function resolvePageSvg\(def\)/);
      expect(src).toMatch(/isGermanBook\(\) && def\.svgDe\) \|\| def\.svg/);
      // And each must actually USE it on the page overlay, not just declare it.
      expect(src).toMatch(/resolvePageSvg\(variant\)/);
      // The language must be set from the order before anything renders.
      expect(src).toMatch(/setBookLanguage\(/);
    }
    // The PDF exporter inlines the same rule in renderPage.
    expect(pdf).toMatch(/state\.language === 'de' && pageDef\.svgDe\) \|\| pageDef\.svg/);
    // …and the Cloud Run renderer must put language on the state it builds.
    expect(read('services/pdf-renderer/index.js')).toMatch(/language:\s*order\.language === 'de'/);
  });

  test('the language field is persisted and returned by the backend', () => {
    const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
    // Written on the order doc at creation…
    expect(read('functions/upload.js')).toMatch(/language: language === 'de' \? 'de' : 'en'/);
    // …and returned by getOrder, whose field whitelist would otherwise drop it.
    expect(read('functions/index.js')).toMatch(/language:\s+order\.language === 'de'/);
  });
});
