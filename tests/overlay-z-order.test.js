// Overlay z-order vocabulary guard.
//
// Two different keys control whether the decorative SVG paints above or below
// the photos, and they live at two different levels:
//
//   spread level  (sibling of `pages`)  → overlayAbovePhotos: false
//   page variant  (sibling of `svg`)    → overlayBelow: true      ← the CSV's
//                                                                   overlay_position=below
//
// Every reader (template-engine.html, customer-preview.html, export-pdf.js)
// checks exactly `spreadDef.overlayAbovePhotos === false || variant.overlayBelow`.
// So `overlayAbovePhotos` written on a *page variant* is silently inert — it
// matches no branch and the overlay keeps painting on top. That is exactly what
// happened to Wander SP5 right (S145). This test makes that mistake loud.

const TEMPLATES = [
  ['../assets/Template_Scribble/scribble-data.js', 'SCRIBBLE_DATA'],
  ['../assets/Template_Wander/wander-data.js',     'WANDER_DATA'],
  ['../assets/Template_Papercut/papercut-data.js', 'PAPERCUT_DATA'],
  ['../assets/Template_Tender/tender-data.js',     'TENDER_DATA'],
  ['../assets/Template_Joyride/joyride-data.js',   'JOYRIDE_DATA'],
];

// A page variant is any object carrying an `svg` string. Spread-level defs
// carry `pages`/`variants` instead, never `svg` directly.
function findVariantsWithAboveFlag(node, path, hits) {
  if (!node || typeof node !== 'object') return hits;
  if (Array.isArray(node)) {
    node.forEach((v, i) => findVariantsWithAboveFlag(v, `${path}[${i}]`, hits));
    return hits;
  }
  if (typeof node.svg === 'string' && 'overlayAbovePhotos' in node) {
    hits.push(path);
  }
  for (const [key, value] of Object.entries(node)) {
    findVariantsWithAboveFlag(value, `${path}.${key}`, hits);
  }
  return hits;
}

describe('Overlay z-order flags use the right key at the right level', () => {
  if (!global.window) global.window = {};

  TEMPLATES.forEach(([modulePath, globalName]) => {
    test(`${globalName}: no page variant uses overlayAbovePhotos (use overlayBelow)`, () => {
      let data;
      try {
        require(modulePath);
        data = global.window[globalName];
      } catch (e) {
        return; // template not present in this checkout — nothing to guard
      }
      if (!data || !data.spreads) return;

      const hits = findVariantsWithAboveFlag(data.spreads, `${globalName}.spreads`, []);
      expect(hits).toEqual([]);
    });
  });
});
