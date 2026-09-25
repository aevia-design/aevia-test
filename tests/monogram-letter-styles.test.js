// Heirloom monogram letters take toolbar overrides like any other caption (S195).
// The engine lets staff nudge size / font / alignment; the PDF must print what they set,
// or screen and print disagree (the S154 shape). Before S195 the PDF drew the intro
// letters at the data-file size whatever staff chose, and ignored a changed alignment
// on every cover caption.
const { monoLetterStyle, coverCaptionAlign } = require('../scripts/export-pdf.js');

const L = { key: 'letter1', xMm: 107.2, yMm: 152, wMm: 8, hMm: 9, font: 'IM FELL English', sizePt: 23, color: '#312128' };

describe('intro monogram letter style', () => {
  test('no override → the data file letter as authored', () => {
    expect(monoLetterStyle(L, undefined)).toEqual({ fontName: 'IM FELL English', style: 'regular', sizePt: 23, align: 'center' });
  });

  test('staff overrides size, font, weight and alignment', () => {
    const ov = { font: 'Lora', weight: 700, italic: false, sizePt: 20, align: 'left' };
    expect(monoLetterStyle(L, ov)).toEqual({ fontName: 'Lora', style: 'bold', sizePt: 20, align: 'left' });
  });

  test('italic override', () => {
    expect(monoLetterStyle(L, { weight: 400, italic: true }).style).toBe('italic');
  });
});

describe('cover caption alignment', () => {
  test('a staff alignment override wins over the data file', () => {
    expect(coverCaptionAlign({ align: 'center' }, { align: 'right' })).toBe('right');
  });

  test('falls back to the data file, then centre', () => {
    expect(coverCaptionAlign({ align: 'left' }, {})).toBe('left');
    expect(coverCaptionAlign({}, undefined)).toBe('center');
  });
});
