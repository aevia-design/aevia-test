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

// AEV-099 (S181). The engine recorded line breaks that split words in half — the caption
// DOM had lost its wrap opportunities, so the browser broke mid-word and the recorder wrote
// down what it saw. The saved TEXT was normalised on the way out and the recorded LINES were
// not, so the two described different strings. The old check compared characters with all
// whitespace squashed out, which cannot see either failure, and the book printed
// "Anna & M / ichael".
//
// These are the real stored values from that order.
describe('recorded lines that split a word are rejected (AEV-099)', () => {
  test('a cover name broken mid-word falls back to wrapping', () => {
    // 100mm box, ~4pt/char at 10pt with the stub → "Anna & Michael" fits on one line here;
    // the point is that the stored lines are refused, not what replaces them.
    expect(coverCaptionLines('Anna & Michael', stubFont, 10, { wMm: 100 }, {}, '',
                             ['Anna & M', 'ichael']))
      .toEqual(['Anna & Michael']);
  });

  test('a text panel broken mid-word falls back to wrapping', () => {
    const stored = ['We met through work, with nothing more t', 'han a simple hello.'];
    const text   = 'We met through work, with nothing more than a simple hello.';
    expect(captionLinesFor(stored, text, stubFont, 10, 9999, 0)).toEqual([text]);
  });

  test('a mid-word break is caught even when the paragraph structure is right', () => {
    // Blank lines line up and every character is present — only the break positions are
    // wrong. This is exactly what the squash-all-whitespace check waved through.
    const stored = ['Little by little, we found our way to each o', 'ther.', '', 'Anna & Michael'];
    const text   = 'Little by little, we found our way to each other.\n\nAnna & Michael';
    expect(captionLinesFor(stored, text, stubFont, 10, 9999, 0))
      .toEqual(['Little by little, we found our way to each other.', '', 'Anna & Michael']);
  });

  test('a non-breaking space is compared as a space, and never drawn as one', () => {
    // The divergence that caused the bug: the lines were laid out against a string with
    // U+00A0 where the saved text has a plain space. `\s` matches U+00A0, so squashing made
    // them identical. Where the breaks are still at word boundaries the layout is sound and
    // the lines are kept; but the print fonts have no NBSP glyph and would draw a .notdef box
    // (the box that once appeared after "WILD"), so the drawn strings are normalised.
    const stored = ['We met through work, with nothing more', 'than a simple hello.'];
    const text   = 'We met through work, with nothing more than a simple hello.';
    expect(captionLinesFor(stored, text, stubFont, 10, 9999, 0))
      .toEqual(['We met through work, with nothing more', 'than a simple hello.']);
  });

  test('a clean break at the same place is still trusted', () => {
    // The guard must not become "distrust everything" — the S159 contract still holds.
    const stored = ['We met through work, with nothing more', 'than a simple hello.'];
    const text   = 'We met through work, with nothing more than a simple hello.';
    expect(captionLinesFor(stored, text, stubFont, 10, 9999, 0)).toEqual(stored);
  });

  test('a break at a hyphen rejoins with no space and is trusted', () => {
    // Browsers do break after a hyphen, and that break has no space to restore. Rejecting it
    // would push a legitimate layout back to the PDF's own wrap for no reason.
    const stored = ['our hand-', 'written vows'];
    expect(captionLinesFor(stored, 'our hand-written vows', stubFont, 10, 9999, 0))
      .toEqual(stored);
  });

  test('an em dash break rejoins with no space too', () => {
    const stored = ['the beginning—', 'of forever'];
    expect(captionLinesFor(stored, 'the beginning—of forever', stubFont, 10, 9999, 0))
      .toEqual(stored);
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
