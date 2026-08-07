// Heirloom family monogram — the PDF exporter must resolve the SAME monogram the two
// engines do, or the printed book gets different artwork from the one the customer
// approved. The monogram selects the cover SVG, its clip variant, the intro SVG and
// the four letter positions, so a wrong resolution is a wrong book, not a cosmetic slip.
//
// Guards the fallback chain: state.monogram → template defaultMonogram → null for
// templates that declare no monograms.

const { activeMonogramDef, setActiveTemplate } = require('../scripts/export-pdf.js');

describe('activeMonogramDef (PDF) mirrors the engines', () => {
  beforeAll(() => setActiveTemplate('heirloom-beige'));

  test('resolves the monogram the order chose', () => {
    const m = activeMonogramDef({ monogram: 'roses' });
    expect(m).toBeTruthy();
    expect(m.label).toBe('Roses');
    expect(m.coverSvg).toMatch(/Roses/);
    expect(m.introSvg).toMatch(/Roses/);
  });

  test('each monogram carries its own artwork, clip variant and letter positions', () => {
    const data = global.window.HEIRLOOM_DATA;
    for (const key of Object.keys(data.monograms)) {
      const m = activeMonogramDef({ monogram: key });
      expect(m.coverSvg).toBeTruthy();
      expect(m.introSvg).toBeTruthy();
      expect(data.cover.clipShapes[m.coverClipShape]).toBeTruthy();
      expect(m.backLetters).toHaveLength(2);
      expect(m.introLetters).toHaveLength(2);
    }
  });

  test('falls back to defaultMonogram when the order carries none', () => {
    const data = global.window.HEIRLOOM_DATA;
    expect(activeMonogramDef({}).label).toBe(data.monograms[data.defaultMonogram].label);
    expect(activeMonogramDef({ monogram: null }).label).toBe(data.monograms[data.defaultMonogram].label);
  });

  test('an unknown monogram falls back rather than throwing', () => {
    // A stale product-page link or a typo must still render a book.
    expect(activeMonogramDef({ monogram: 'nonesuch' })).toBeTruthy();
  });

  test('Roots letters share one x; Birds and Roses are offset, per the CSV', () => {
    const back = (k) => activeMonogramDef({ monogram: k }).backLetters.map(L => L.xMm);
    const intro = (k) => activeMonogramDef({ monogram: k }).introLetters.map(L => L.xMm);
    // Roots is a stacked monogram — both letters on the same vertical axis.
    expect(back('roots')[0]).toBe(back('roots')[1]);
    expect(intro('roots')[0]).toBe(intro('roots')[1]);
    // Birds/Roses sit apart by the amounts the sizing CSV specifies.
    expect(Math.abs(back('birds')[1] - back('birds')[0])).toBe(5);
    expect(Math.abs(back('roses')[1] - back('roses')[0])).toBe(30);  // 29 before Xenia's S158 nudge
  });

  // All live text is plum. The letter rows were blank in the first CSV and briefly
  // rendered taupe on an assumption; the owner set every captions_color to #312128
  // (S158). Pinned here so a future re-sync from a CSV cannot quietly revert it.
  test('every monogram letter is #312128 on both surfaces', () => {
    for (const key of Object.keys(global.window.HEIRLOOM_DATA.monograms)) {
      const m = activeMonogramDef({ monogram: key });
      m.backLetters.forEach(L => expect(L.color).toBe('#312128'));
      m.introLetters.forEach(L => expect(L.color).toBe('#312128'));
    }
  });

  test('no caption anywhere in the template is still taupe', () => {
    // Catches a half-done colour sync: the letters are checked above, but the text
    // panels (intro, Our story, both whylove spreads) are just as easy to miss.
    const json = JSON.stringify(global.window.HEIRLOOM_DATA, (k, v) =>
      typeof v === 'function' ? undefined : v);
    // `colors.taupe` is the palette entry and is allowed to remain.
    const captionTaupe = json.replace(/"taupe":"#7c746e"/, '');
    expect(captionTaupe).not.toContain('#7c746e');
  });

  test('returns null for a template with no monograms', () => {
    setActiveTemplate('scribble');
    expect(activeMonogramDef({ monogram: 'roses' })).toBeNull();
    setActiveTemplate('heirloom-beige');
  });
});
