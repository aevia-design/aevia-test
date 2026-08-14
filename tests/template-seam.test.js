// Template seam verification — test that template selection works correctly.
// (Browser-side HTML template selection must be verified manually.)

// For the PDF export script, we can verify the data object structure
// and that both templates are properly loaded.

describe('Template data structure', () => {
  test('SCRIBBLE_DATA and WANDER_DATA can both be loaded', () => {
    // Set up global.window if needed
    if (!global.window) global.window = {};

    // Load both templates (Node requires are cached, so this is safe to call multiple times)
    require('../assets/Template_Scribble/scribble-data.js');
    require('../assets/Template_Wander/wander-data.js');

    expect(global.window.SCRIBBLE_DATA).toBeDefined();
    expect(global.window.WANDER_DATA).toBeDefined();
    expect(global.window.SCRIBBLE_DATA.template).toBe('scribble');
    expect(global.window.WANDER_DATA.template).toBe('wander');
  });

  test('Both templates have required top-level fields', () => {
    const requiredFields = ['template', 'pageSize', 'bleed', 'cover', 'spreads', 'scale', 'fonts', 'colors'];

    requiredFields.forEach(field => {
      expect(global.window.SCRIBBLE_DATA[field]).toBeDefined();
      expect(global.window.WANDER_DATA[field]).toBeDefined();
    });
  });

  test('Wander asset references do not use Spreads/ subfolder', () => {
    // Wander SVGs are directly in Template_Wander/, not in a subfolder
    // For example, Wander cover.svg should be 'Cover/Cover.svg', not 'Spreads/...'
    const coverSvg = global.window.WANDER_DATA.cover.svg;
    expect(coverSvg).toBeDefined();
    // Verify that it doesn't start with 'Spreads/'
    expect(coverSvg.startsWith('Spreads/')).toBe(false);
  });

  test('Scribble asset references use Spreads/ subfolder', () => {
    // Scribble SVGs are in Template_Scribble/Spreads/
    // All spread overlays should be in the Spreads/ folder
    const spreads = global.window.SCRIBBLE_DATA.spreads;
    Object.values(spreads).forEach(spread => {
      Object.values(spread.variants || []).forEach(variant => {
        if (variant.svg) {
          expect(variant.svg.startsWith('Spreads/')).toBe(true);
        }
      });
    });
  });
});

// The engine's TEMPLATES registry carries a `collection` per template, which picks the
// caption voice register (functions/caption/caption-voice.md). getActiveCollection()
// falls back to 'kids' when the field is missing, so a new template added without one
// gets kids tone-of-voice on a wedding book and nothing fails — it just reads wrong.
// This is the guard for that. Text-scrapes the registry because the engine is a single
// HTML file with no module boundary.
describe('Caption collection registry', () => {
  const fs = require('fs');
  const path = require('path');
  const VALID = ['kids', 'travel', 'love'];

  const html = fs.readFileSync(
    path.join(__dirname, '..', 'pages', 'staff', 'template-engine.html'), 'utf8');
  const block = html.match(/const TEMPLATES = \{([\s\S]*?)\n  \};/);

  test('the registry block is findable', () => {
    expect(block).not.toBeNull();
  });

  test('every template declares a valid collection', () => {
    const found = {};
    block[1].split('\n').forEach(raw => {
      const line = raw.trim();
      if (!line || line.startsWith('//')) return;
      const key = (line.match(/^'?([a-z-]+)'?\s*:\s*\{/) || [])[1];
      if (!key) return;                       // not an entry line
      found[key] = (line.match(/collection:\s*'([a-z]+)'/) || [])[1] || null;
    });

    // Every registry key maps to one of the three voice registers. A null value means
    // the entry exists but declares no collection — the silent-'kids' failure.
    const invalid = Object.entries(found).filter(([, c]) => !VALID.includes(c));
    expect({ invalid: Object.fromEntries(invalid) }).toEqual({ invalid: {} });
    expect(Object.keys(found).length).toBeGreaterThanOrEqual(11);
  });
});

// textPanel.aiCompose opts a text panel into the ✦ Compose button (S175). It belongs on
// Our story and nowhere else: every other panel holds words the customer wants printed as
// they wrote them — vows, why-I-love-him, the birth story, funny words, the itinerary.
// Setting this flag on one of those turns AI loose on text it must not touch, which is
// the exact bug this session removed. See docs/briefs/caption-ai-modes.md.
describe('aiCompose flag placement', () => {
  const DATA = {
    'Template_Scribble/scribble-data.js': [],
    'Template_Wander/wander-data.js': [],
    'Template_Papercut/papercut-data.js': [],
    'Template_Joyride/joyride-data.js': [],
    'Template_Laguna/laguna-data.js': [],
    'Template_Newborn/newborn-data.js': [],
    'Template_Tender/tender-data.js': ['FPstory/right'],
    'Template_Heirloom/Beige/heirloom-data.js': ['FPstory/right'],
    'Template_Heirloom/Blue/heirloom-blue-data.js': ['FPstory/right'],
    'Template_Heirloom/Brown/heirloom-brown-data.js': ['FPstory/right'],
    'Template_Heirloom/Green/heirloom-green-data.js': ['FPstory/right'],
  };

  test('aiCompose appears on Our story only', () => {
    const path = require('path');
    const actual = {};
    Object.keys(DATA).forEach(rel => {
      const abs = path.join(__dirname, '..', 'assets', rel);
      // Data files assign onto window as a side effect of loading, so each one must
      // actually re-execute against the fresh window. Jest keeps its OWN module registry
      // — `delete require.cache[...]` does not touch it, and a file an earlier test in
      // this suite already required (Scribble, Wander) would silently return cached,
      // leaving window empty. jest.resetModules() is what clears it.
      jest.resetModules();
      global.window = {};
      require(abs);
      const d = Object.values(global.window).find(v => v && v.spreads);
      const hits = [];
      Object.entries(d.spreads).forEach(([id, s]) =>
        Object.entries(s.pages || {}).forEach(([side, variants]) =>
          Object.values(variants || {}).forEach(v => {
            if (v && v.textPanel && v.textPanel.aiCompose) hits.push(`${id}/${side}`);
          })));
      actual[rel] = hits;
    });
    expect(actual).toEqual(DATA);
  });
});
