// A cover caption whose text is wider than its box must WRAP in the PDF, because that is
// what the engine does: it renders the caption into a `width: wMm * SCALE` div and lets the
// browser wrap. Engine and PDF must agree, or staff sign off on a two-line cover and print
// gets one line running off the artwork.
//
// S159: exactly that shipped. drawCoverCaptions had two branches — `autoShrink` (wraps) and
// everything else (`text.split('\n').filter(...)`, no wrap at all). `autoShrink` is declared
// by ONE template (Joyride), so wrapping was effectively a Joyride-only feature. Heirloom's
// 50pt front-cover name — "ANNA & MICHAEL" measures 471pt in a 283pt box — printed as a
// single line. The five earlier templates never exposed it: their cover text all fits on one
// line, so the branch looked correct for years.
//
// Pinned here rather than at the Heirloom bug, so the next template with a long cover name
// fails in CI instead of in a customer's printed book.

const { coverCaptionLines, wrapText } = require('../scripts/export-pdf.js');

// Monospace stub: every glyph is half the font size wide. Keeps the arithmetic obvious and
// needs no TTF, matching how cover-caption-fonts.test.js stubs font resolution.
const stubFont = { widthOfTextAtSize: (s, size) => s.length * size * 0.5 };
const MM_TO_PT = 72 / 25.4;

describe('cover captions wrap at their box width', () => {
  test('text wider than wMm is split across lines', () => {
    // 20mm box = 56.7pt; at 10pt each char is 5pt, so ~11 chars fit per line.
    const lines = coverCaptionLines('ANNA & MICHAEL', stubFont, 10, { wMm: 20 });
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(' ')).toBe('ANNA & MICHAEL');
    for (const l of lines) {
      expect(stubFont.widthOfTextAtSize(l, 10)).toBeLessThanOrEqual(20 * MM_TO_PT);
    }
  });

  test('text that already fits is left on one line', () => {
    expect(coverCaptionLines('Nico', stubFont, 10, { wMm: 100 })).toEqual(['Nico']);
  });

  test('explicit newlines are still honoured, and wrap applies within each', () => {
    const lines = coverCaptionLines('ANNA & MICHAEL\n2026', stubFont, 10, { wMm: 20 });
    expect(lines[lines.length - 1]).toBe('2026');
    expect(lines.length).toBeGreaterThan(2);
  });

  test('spine captions do NOT wrap — a rotated label must stay on one line', () => {
    // Same overflowing text, but rotate: 270. Wrapping this would run a second line
    // alongside the first across a ~10mm spine band.
    const lines = coverCaptionLines('ANNA & MICHAEL', stubFont, 10, { wMm: 20, rotate: 270 });
    expect(lines).toEqual(['ANNA & MICHAEL']);
  });

  test('letterSpacing overrides count toward the measured width', () => {
    const bare  = coverCaptionLines('AAAAAAAAAA', stubFont, 10, { wMm: 20 });
    const spaced = coverCaptionLines('AAAAAAAAAA', stubFont, 10, { wMm: 20 }, { letterSpacing: 0.5 }, 'Stub');
    expect(bare).toEqual(['AAAAAAAAAA']);
    expect(spaced.length).toBeGreaterThan(1);
  });
});

describe('wrapText edge cases', () => {
  test('a zero/absent box width disables wrapping', () => {
    expect(wrapText(stubFont, 'a b c d e f g', 10, 0, 0)).toEqual(['a b c d e f g']);
  });

  test('a single word wider than the box is hard-split rather than dropped', () => {
    const lines = wrapText(stubFont, 'AAAAAAAAAAAAAAAAAAAAAAAA', 10, 20 * MM_TO_PT, 0);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join('')).toBe('AAAAAAAAAAAAAAAAAAAAAAAA');
  });
});
