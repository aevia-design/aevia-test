// Every photo-drawing branch in the PDF exporter must honour the staff-set reposition
// offset (`state.heartCrop`, legacy name — it is the general per-slot offset for all
// templates, see the S50 decision not to rename it).
//
// S163: it did not. `export-pdf.js` had three branches — heart slot, regular slot,
// full-bleed slot — and the full-bleed one hardcoded sharp's `position: 'centre'`,
// ignoring the offset entirely. Both engines apply object-position to any slot shape,
// so a repositioned photo looked right in the staff engine and in customer-preview and
// then printed centred. Heirloom's FPhim/FPher are full-bleed, and the drift was spotted
// only by the owner eyeballing generated PDFs of AEV-091 and AEV-092.
//
// The check is on the SOURCE rather than a render because rendering needs sharp plus real
// photos, and the failure mode is precisely "a branch forgot to read the offset" — which
// is visible in the text. Same reasoning as cover-svg-viewbox.test.js.

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'scripts', 'export-pdf.js'), 'utf8'
);

// The exporter's own helper. It reproduces CSS object-fit:cover + object-position, so
// "draws a photo correctly" and "calls coverExtract" are the same statement.
const COVER_EXTRACT_CALLS = (SRC.match(/coverExtract\(/g) || []).length - 1; // minus the definition

describe('PDF exporter photo crop paths', () => {
  test('no photo branch resizes with a hardcoded centre position', () => {
    // sharp's fit:'cover' + position:'centre' is the exact thing that drops the offset.
    // Full-bleed backgrounds or non-photo art may legitimately centre; photos may not.
    const offenders = SRC
      .split('\n')
      .map((line, i) => ({ line: line.trim(), n: i + 1 }))
      .filter(({ line }) => /position:\s*'centre'/.test(line) && !line.startsWith('//'));

    expect(offenders).toEqual([]);
  });

  test('every slot branch reads the staff-set crop offset', () => {
    // heart slot, regular slot, full-bleed slot, cover slot = 4 reads.
    const reads = (SRC.match(/heartCrop(\s*&&\s*state\.heartCrop)?\[/g) || []).length;
    expect(reads).toBeGreaterThanOrEqual(4);
  });

  test('the crop offset defaults to 50/50 wherever it is read', () => {
    // An un-repositioned photo must render exactly as it always did.
    const xDefaults = (SRC.match(/typeof hc\.x === 'number' \? hc\.x : 50/g) || []).length;
    const yDefaults = (SRC.match(/typeof hc\.y === 'number' \? hc\.y : 50/g) || []).length;
    expect(xDefaults).toBe(yDefaults);
    expect(xDefaults).toBeGreaterThanOrEqual(4);
  });

  test('coverExtract is the single shared crop implementation', () => {
    // Four call sites: heart, regular, full-bleed, cover.
    expect(COVER_EXTRACT_CALLS).toBeGreaterThanOrEqual(4);
  });
});
