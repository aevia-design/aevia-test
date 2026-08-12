// Every cover caption must resolve to a font cut that export-pdf.js actually
// registers. If it doesn't, lookupFont() returns null and drawCoverCaptions()
// silently `continue`s — the text just isn't in the PDF. No error, no crash: the
// customer gets a cover with missing words.
//
// S136: Joyride's cover sub-labels vanished from print exactly this way. Its cover
// captions describe their cut as `style: 'light'` (mirroring Xenia's CSV) and carry
// no numeric `weight`. The cover path derived the cut from `weight` alone, defaulted
// to 400 → 'regular', and asked for `Mulish_regular`. Mulish is the ONE family in
// FONT_FILE_MAP with no `_regular` cut (only Mulish-Light), so lookupFont's
// `|| ${font}_regular` fallback resolved to the same missing key → null → skipped.
// The three SPREAD caption paths already fell back to capDef.style, which is why
// Joyride's spread captions printed fine and only the cover lost text.
//
// This pins the invariant rather than the single bug: any future template whose
// cover asks for an unregistered cut fails here instead of in a customer's book.

const { coverCaptionStyle, lookupFont, FONT_FILE_MAP } = require('../scripts/export-pdf.js');

if (!global.window) global.window = {};
const TEMPLATES = {
  Scribble: 'SCRIBBLE_DATA', Wander: 'WANDER_DATA', Tender: 'TENDER_DATA',
  Newborn: 'NEWBORN_DATA', Papercut: 'PAPERCUT_DATA', Joyride: 'JOYRIDE_DATA',
  Laguna: 'LAGUNA_DATA',
};
const FILES = {
  Scribble: '../assets/Template_Scribble/scribble-data.js',
  Wander:   '../assets/Template_Wander/wander-data.js',
  Tender:   '../assets/Template_Tender/tender-data.js',
  Newborn:  '../assets/Template_Newborn/newborn-data.js',
  Papercut: '../assets/Template_Papercut/papercut-data.js',
  Joyride:  '../assets/Template_Joyride/joyride-data.js',
  Laguna:   '../assets/Template_Laguna/laguna-data.js',
};
for (const f of Object.values(FILES)) require(f);

// lookupFont needs a map of name→font object; FONT_FILE_MAP's keys are the truth
// about which cuts get embedded, so a stub keyed the same way tests resolution
// without loading any TTFs.
const fontMapStub = Object.fromEntries(Object.keys(FONT_FILE_MAP).map(k => [k, { _cut: k }]));

describe('cover caption fonts resolve to a registered cut', () => {
  for (const [name, global_] of Object.entries(TEMPLATES)) {
    const data = global.window[global_];
    const captions = data?.cover?.captions || [];

    test(`${name}: every cover caption resolves`, () => {
      expect(captions.length).toBeGreaterThan(0);
      const missing = [];
      for (const capDef of captions) {
        const fontName = capDef.font || 'NT Somic';
        const style = coverCaptionStyle(capDef, {});
        if (!lookupFont(fontMapStub, fontName, style)) {
          missing.push(`${capDef.key} → ${fontName}_${style} (declared style: ${capDef.style ?? 'none'})`);
        }
      }
      expect(missing).toEqual([]);
    });
  }
});

describe('coverCaptionStyle precedence', () => {
  test('a declared style string is honoured when no weight is given (Joyride)', () => {
    expect(coverCaptionStyle({ style: 'light' }, {})).toBe('light');
  });

  test('an explicit capDef weight+italic still wins over style (Newborn subtitle)', () => {
    expect(coverCaptionStyle({ weight: 500, italic: true }, {})).toBe('mediumitalic');
  });

  test('a per-order override beats the caption definition', () => {
    expect(coverCaptionStyle({ style: 'light' }, { weight: 700 })).toBe('bold');
  });

  test('defaults to regular when nothing is declared', () => {
    expect(coverCaptionStyle({}, {})).toBe('regular');
  });

  test('the _regular fallback cannot rescue a family that lacks the cut', () => {
    // This is the mechanism that made S136 invisible: for most families a wrong style
    // silently degrades to _regular and something still prints, so the failure only
    // surfaces for a family with no _regular cut — there, lookupFont returns null and
    // the caption is dropped without an error.
    //
    // Mulish used to BE that family, and this test used to assert so directly. Laguna
    // needs Mulish Regular and Medium (S168), so those cuts now exist and that
    // assertion would only have recorded a fact we deliberately changed. The invariant
    // worth keeping is about lookupFont's behaviour, not about which fonts we ship, so
    // it is pinned here against a stub instead of against the live font map.
    const sparseMap = { 'Ghost_light': { _cut: 'Ghost_light' } };
    expect(lookupFont(sparseMap, 'Ghost', 'light')).toEqual({ _cut: 'Ghost_light' });
    expect(lookupFont(sparseMap, 'Ghost', 'regular')).toBeNull();
  });

  test('Mulish ships the cuts Laguna and Joyride declare (S168)', () => {
    for (const cut of ['Mulish_light', 'Mulish_regular', 'Mulish_medium']) {
      expect(FONT_FILE_MAP[cut]).toBeDefined();
    }
  });
});

// S154: the same silent-degradation shape, different cause. Papercut declared
// `weight: 'bold'` as a STRING. The style ladder compares numerically, and
// 'bold' >= 700 is false (the string coerces to NaN), so every branch fell through to
// 'regular' and the PDF drew the regular cut. Both engines rendered it bold anyway,
// because `font-weight: bold` is valid CSS — so screen and print disagreed, and only
// the print is real.
describe('caption weight resolution accepts CSS keywords (S154)', () => {
  const fontMap = {
    'Source Sans 3_regular': 'REG', 'Source Sans 3_bold': 'BOLD',
    'Source Sans 3_semibold': 'SEMI', 'Source Sans 3_medium': 'MED',
  };
  const resolve = (weight) => lookupFont(fontMap, 'Source Sans 3', coverCaptionStyle({ weight }, {}));

  test('numeric 700 resolves to the bold cut', () => {
    expect(resolve(700)).toBe('BOLD');
  });

  test("the string 'bold' resolves to the bold cut, not regular", () => {
    expect(resolve('bold')).toBe('BOLD');
  });

  test('capitalised and hyphenated keywords resolve', () => {
    expect(resolve('Bold')).toBe('BOLD');
    expect(resolve('Semi-Bold')).toBe('SEMI');
    expect(resolve('medium')).toBe('MED');
  });

  test("'regular' and 400 both resolve to the regular cut", () => {
    expect(resolve('regular')).toBe('REG');
    expect(resolve(400)).toBe('REG');
  });

  test('a numeric string resolves by value', () => {
    expect(resolve('700')).toBe('BOLD');
  });

  test('an unrecognised weight degrades to regular rather than throwing', () => {
    expect(resolve('chunky')).toBe('REG');
  });

  // The normaliser makes string weights work, but numeric is the repo convention and
  // keeps the data files honest. Xenia's CSVs name fonts as "Source Sans 3 Bold", so
  // the word is what gets copied in — this is the guard against it happening again.
  test('every template data file declares weight numerically', () => {
    const fs = require('fs');
    const path = require('path');
    const assets = path.join(__dirname, '..', 'assets');
    const files = fs.readdirSync(assets)
      .filter(d => d.startsWith('Template_'))
      .flatMap(d => fs.readdirSync(path.join(assets, d))
        .filter(f => f.endsWith('-data.js'))
        .map(f => path.join(assets, d, f)));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const stringWeights = (fs.readFileSync(file, 'utf8').match(/weight:\s*'[^']*'/g) || []);
      expect({ file: path.basename(file), stringWeights })
        .toEqual({ file: path.basename(file), stringWeights: [] });
    }
  });
});
