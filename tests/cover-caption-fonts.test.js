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
};
const FILES = {
  Scribble: '../assets/Template_Scribble/scribble-data.js',
  Wander:   '../assets/Template_Wander/wander-data.js',
  Tender:   '../assets/Template_Tender/tender-data.js',
  Newborn:  '../assets/Template_Newborn/newborn-data.js',
  Papercut: '../assets/Template_Papercut/papercut-data.js',
  Joyride:  '../assets/Template_Joyride/joyride-data.js',
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

  test('Mulish has no regular cut — the fallback cannot rescue a wrong style', () => {
    // Guards the assumption that made the bug invisible: for every OTHER family a
    // wrong style silently degrades to _regular, so only Mulish actually vanished.
    expect(FONT_FILE_MAP['Mulish_regular']).toBeUndefined();
    expect(FONT_FILE_MAP['Mulish_light']).toBeDefined();
    expect(lookupFont(fontMapStub, 'Mulish', 'regular')).toBeNull();
  });
});
