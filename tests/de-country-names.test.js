// TO-DOS #133 — German country names on the travel-map order form.
//
// The English name is the stored key into mapCoordinates (and the value stored
// on the order); the German name is a display-only label carried alongside it
// as `.de`. Three templates (Joyride, Laguna, Wander) share the same 183-country
// list — a label added to one and forgotten in another would give a German
// Wander customer German names but a German Joyride customer English ones.

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function loadTemplate(relPath, globalName) {
  const src = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const sandbox = { window: {} };
  new Function('window', src).call(sandbox, sandbox.window);
  return sandbox.window[globalName];
}

const TEMPLATES = {
  Joyride: ['assets/Template_Joyride/joyride-data.js', 'JOYRIDE_DATA'],
  Laguna:  ['assets/Template_Laguna/laguna-data.js',   'LAGUNA_DATA'],
  Wander:  ['assets/Template_Wander/wander-data.js',   'WANDER_DATA'],
};

const DATA = {};
for (const [name, [file, globalName]] of Object.entries(TEMPLATES)) {
  DATA[name] = loadTemplate(file, globalName);
}

describe('German country names (#133)', () => {
  test('every country in every travel template has a non-empty German label', () => {
    for (const [name, data] of Object.entries(DATA)) {
      const coords = data.mapCoordinates || {};
      const countries = Object.keys(coords);
      expect(countries.length).toBeGreaterThan(100); // sanity: the real list, not a stub
      for (const country of countries) {
        expect(typeof coords[country].de).toBe('string');
        expect(coords[country].de.length).toBeGreaterThan(0);
      }
    }
  });

  test('the three travel templates agree on every German label (and region/coords)', () => {
    const [first, ...rest] = Object.keys(DATA);
    const base = DATA[first].mapCoordinates;
    for (const name of rest) {
      const other = DATA[name].mapCoordinates;
      expect(Object.keys(other).sort()).toEqual(Object.keys(base).sort());
      for (const country of Object.keys(base)) {
        expect(other[country]).toEqual(base[country]);
      }
    }
  });

  test('German labels are display-only: the English name stays untouched as the key', () => {
    const coords = DATA.Wander.mapCoordinates;
    expect(coords.Austria.de).toBe('Österreich');
    expect(coords.Germany.de).toBe('Deutschland');
    // The key itself — what gets stored on the order — is still the English name.
    expect(Object.prototype.hasOwnProperty.call(coords, 'Austria')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(coords, 'Österreich')).toBe(false);
  });

  test('order.html resolves the visible country label the same way as other DE strings (source check)', () => {
    // Mirrors the ORDER.language === 'de' && x.fooDe fallback pattern used
    // throughout order.html (tdText, signLabels, etc.) rather than a bespoke rule.
    const src = fs.readFileSync(path.join(ROOT, 'pages/order.html'), 'utf8');
    expect(src).toMatch(/function countryLabel\(/);
    expect(src).toMatch(/ORDER\.language === 'de'/);
  });
});
