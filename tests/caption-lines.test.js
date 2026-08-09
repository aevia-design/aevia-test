// The engine decides where captions break; the PDF draws those lines verbatim.
//
// Before S159 the PDF word-wrapped every caption a SECOND time, with its own measurement
// (pdf-lib glyph advances against the full wMm box) versus the engine's browser layout
// inside a padded box. Two implementations of one job drift. On AEV-088 an 18pt panel
// broke after "every" on screen and after "single" in print, and a 50pt cover name wrapped
// on screen but printed as one line running off the artwork.
//
// That is a trust problem, not a cosmetic one: staff and the customer approve the engine's
// render, so anything the PDF re-derives can silently disagree with what was approved.
// These tests pin the rule that removes the second implementation.

const { captionLinesFor, coverCaptionLines } = require('../scripts/export-pdf.js');

// Monospace stub: every glyph is half the font size wide. No TTF needed, and the
// arithmetic stays obvious — at 10pt each char is 5pt.
const stubFont = { widthOfTextAtSize: (s, size) => s.length * size * 0.5 };
const MM_TO_PT = 72 / 25.4;

describe('stored engine line breaks win over re-wrapping', () => {
  test('stored lines are drawn exactly as recorded', () => {
    // Deliberately NOT how wrapText would break it — proves the stored value is used
    // rather than merely agreed with.
    const stored = ['She is my favorite person, every', 'single day.'];
    expect(captionLinesFor(stored, 'She is my favorite person, every single day.',
                           stubFont, 10, 9999, 0)).toEqual(stored);
  });

  test('a box wide enough for one line still yields the stored two', () => {
    // The AEV-088 case: the PDF measured the line as fitting, the engine had already
    // broken it. The engine wins.
    const stored = ['She is my favorite person, every', 'single day.'];
    const wide = 500 * MM_TO_PT;
    expect(captionLinesFor(stored, 'She is my favorite person, every single day.',
                           stubFont, 10, wide, 0)).toEqual(stored);
  });

  test('blank lines in stored breaks survive (paragraph spacing)', () => {
    // The blank line is how staff and customers space paragraphs; it must reach the PDF
    // as a real line so it reserves one line-height.
    const stored = ['Her smile brightens every room.', '', 'I admire her gentle heart.'];
    const text   = 'Her smile brightens every room.\n\nI admire her gentle heart.';
    expect(captionLinesFor(stored, text, stubFont, 10, 9999, 0)).toEqual(stored);
  });

  test('cover captions honour stored lines too', () => {
    const stored = ['ANNA &', 'MICHAEL'];
    expect(coverCaptionLines('ANNA & MICHAEL', stubFont, 50, { wMm: 100 }, {}, '', stored))
      .toEqual(stored);
  });
});

// Stored lines and stored text can fall out of step — approveOrder replaces
// staffBookCaptions with the customer's text while the staff-recorded lines survive.
// Drawing stale lines would drop or duplicate WORDS in print, which is worse than a
// break in the wrong place. The lines are trusted only while they still reconstruct
// the text.
describe('stale stored lines are rejected, not drawn', () => {
  test('lines describing different text are ignored', () => {
    const stale = ['His laugh is my', 'favorite sound.'];
    const lines = captionLinesFor(stale, 'Her smile brightens every room.',
                                  stubFont, 10, 9999, 0);
    expect(lines).toEqual(['Her smile brightens every room.']);
  });

  test('a dropped word is caught', () => {
    const stale = ['She is my favorite person,', 'every day.'];
    expect(captionLinesFor(stale, 'She is my favorite person, every single day.',
                           stubFont, 10, 9999, 0))
      .toEqual(['She is my favorite person, every single day.']);
  });

  test('whitespace differences alone are NOT treated as stale', () => {
    // The space a line wrapped on is dropped when recorded, so the join can never
    // reproduce it. Only non-space characters are compared.
    const stored = ['She is my favorite person, every', 'single day.'];
    expect(captionLinesFor(stored, 'She is my favorite person, every single day.',
                           stubFont, 10, 9999, 0)).toEqual(stored);
  });

  test('stale cover lines fall back to wrapping too', () => {
    expect(coverCaptionLines('ANNA & MICHAEL', stubFont, 10, { wMm: 500 }, {}, '',
                             ['NINA &', 'MICHAEL']))
      .toEqual(['ANNA & MICHAEL']);
  });
});

describe('fallback for orders saved before S159', () => {
  test('no stored lines → the PDF wraps as before', () => {
    const lines = captionLinesFor(undefined, 'a b c d e f g h i j', stubFont, 10, 20 * MM_TO_PT, 0);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(' ')).toBe('a b c d e f g h i j');
  });

  test('an empty stored array is treated as absent, not as "draw nothing"', () => {
    // A caption that recorded no lines must not silently vanish from print — that is the
    // failure mode the Joyride cover hit in S136 (lookupFont null → caption skipped).
    expect(captionLinesFor([], 'Hello world', stubFont, 10, 9999, 0)).toEqual(['Hello world']);
  });

  test('blank source lines still reserve one line-height when wrapping', () => {
    expect(captionLinesFor(null, 'one\n\ntwo', stubFont, 10, 9999, 0)).toEqual(['one', '', 'two']);
  });

  test('non-array stored values are ignored rather than trusted', () => {
    expect(captionLinesFor('not an array', 'Hello', stubFont, 10, 9999, 0)).toEqual(['Hello']);
  });
});
