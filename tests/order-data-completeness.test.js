/**
 * Customer-entered data must never vanish between the order form and the two places
 * staff read it: the engine's "Customer's order data" panel and order-details.txt.
 *
 * THE BUG THIS REPLACES (S165). Both surfaces decided what to show from a HARDCODED map
 * written when only Scribble and Papercut existed:
 *
 *   coverLabels = { year, name, spineName, spineYear }   // template-engine.html
 *
 * Five of the seven templates use different keys. Wander (front/spine) showed NOTHING;
 * Joyride, Newborn, Tender and Heirloom showed only 'name' and silently dropped the
 * subtitle and spine. The same file labelled every template's FP1 'Birthday wishes', so a
 * Wander itinerary was filed under a Scribble birthday page. And order-details.txt never
 * wrote coverCaptions at all — verified against 38 real orders across all 7 templates,
 * not one contained the customer's cover or spine text.
 *
 * The whitelist survived seven templates because NOTHING CHECKED. That is what this file
 * is for. It asserts the shape that makes the bug impossible — labels come from the
 * template — rather than asserting one template's current key names, which is what let
 * the original map look correct for as long as it did.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ENGINE = fs.readFileSync(path.join(ROOT, 'pages/staff/template-engine.html'), 'utf8');
const ORDER  = fs.readFileSync(path.join(ROOT, 'pages/order.html'), 'utf8');
const UPLOAD = fs.readFileSync(path.join(ROOT, 'functions/upload.js'), 'utf8');

/** Every template's data file, loaded the way the engine loads them. */
function templates() {
  const out = [];
  const dirs = fs.readdirSync(path.join(ROOT, 'assets')).filter(d => d.startsWith('Template_'));
  for (const d of dirs) {
    const base = path.join(ROOT, 'assets', d);
    // Heirloom keeps one data file per colourway in a subfolder; everyone else is flat.
    const candidates = [base, ...fs.readdirSync(base)
      .map(s => path.join(base, s))
      .filter(p => fs.statSync(p).isDirectory())];
    for (const dir of candidates) {
      for (const f of fs.readdirSync(dir)) {
        if (!/-data\.js$/.test(f)) continue;
        const src = fs.readFileSync(path.join(dir, f), 'utf8');
        const sandbox = { window: {} };
        // The data files are plain `window.X_DATA = {...}` assignments.
        new Function('window', src)(sandbox.window);
        const key = Object.keys(sandbox.window).find(k => /_DATA$/.test(k));
        if (key) out.push({ name: `${d}/${f}`, data: sandbox.window[key] });
      }
    }
  }
  return out;
}

const ALL = templates();

describe('every template is discoverable', () => {
  test('found all seven templates (ten data files, Heirloom has four colourways)', () => {
    expect(ALL.length).toBeGreaterThanOrEqual(10);
  });
});

describe('every caption a customer can fill in carries a human label', () => {
  test.each(ALL.map(t => [t.name, t.data]))('%s cover captions all have labels', (_name, data) => {
    const caps = data?.cover?.captions || [];
    expect(caps.length).toBeGreaterThan(0);
    // A caption without a label would fall back to its raw key ('spineSub') in the staff
    // panel and in order-details.txt. Readable, but not what staff should be reading.
    const unlabelled = caps.filter(c => !c.label).map(c => c.key);
    expect(unlabelled).toEqual([]);
  });

  test.each(ALL.map(t => [t.name, t.data]))('%s functional spreads all have labels', (_name, data) => {
    const spreads = data?.spreads || {};
    const unlabelled = Object.entries(spreads)
      .filter(([, s]) => s.type === 'functional' && !s.label)
      .map(([id]) => id);
    expect(unlabelled).toEqual([]);
  });
});

describe('the staff panel reads the template, not a hardcoded map', () => {
  // Anchored on the exact maps that caused the bug. If someone reintroduces a literal
  // key->label table for cover captions or spreads, this fails and names the reason.
  test('no hardcoded cover-caption label whitelist', () => {
    expect(ENGINE).not.toMatch(/coverLabels\s*=\s*\{/);
  });

  test('no hardcoded FP label map', () => {
    expect(ENGINE).not.toMatch(/fpLabels\s*=\s*\{/);
  });

  test('cover captions are labelled from the active template', () => {
    expect(ENGINE).toMatch(/getActiveTemplateData\(\)\?\.cover\?\.captions/);
  });

  test('a caption key the template does not declare is still shown', () => {
    // The safety net: a renamed data-file key must not make customer text disappear.
    expect(ENGINE).toMatch(/if \(!shown\.has\(key\)\) addRow\(key, val\)/);
  });
});

describe('order-details.txt records the cover text', () => {
  test('upload.js writes a Cover text block', () => {
    expect(UPLOAD).toMatch(/Cover text:/);
  });

  test('the block is driven by coverCaptions, with labels from the client', () => {
    expect(UPLOAD).toMatch(/coverCaptionLabels/);
  });

  test('the order form sends the labels', () => {
    // functions/ cannot read the template data files, so the labels must travel with
    // the order or the details file can only print raw keys.
    expect(ORDER).toMatch(/coverCaptionLabels:/);
  });
});

describe('fpTexts values survive being written to text', () => {
  const { formatFpValue } = require('../functions/upload.js');

  test('a travel map object renders its countries and itinerary', () => {
    // The exact shape order.html sends for Wander/Joyride FP1.
    const val = { region: 'europe', countries: ['Italy'], itinerary: 'Day 1: Bolzano\nDay 2: Seceda' };
    expect(formatFpValue(val)).toBe('Italy — Day 1: Bolzano; Day 2: Seceda');
  });

  test('never produces "[object Object]"', () => {
    // Every Wander and Joyride order in the bucket has this string where its itinerary
    // should be. Any object shape, known or not, must render something readable.
    for (const val of [
      { region: 'europe', countries: ['Italy'], itinerary: 'Day 1' },
      { countries: [], itinerary: '' },
      { somethingNew: 'we have not seen this shape yet' },
    ]) {
      expect(String(formatFpValue(val))).not.toContain('[object Object]');
    }
  });

  test('arrays and strings are unchanged', () => {
    expect(formatFpValue(['Mama', 'Bubu'])).toBe('Mama, Bubu');
    expect(formatFpValue('Welcome to the world')).toBe('Welcome to the world');
  });
});
