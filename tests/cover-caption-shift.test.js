/**
 * cover-caption-shift.test.js
 *
 * When the spine widens (40pp → 10mm, 80pp → 14mm) the front panel moves right by
 * `spineWidth − referenceSpine`. renderCoverImage already shifts front-panel PHOTO
 * slots by that delta, and the engine shifts front-panel CAPTIONS by the same amount
 * (template-engine.html: `capDeltaPx`). drawCoverCaptions did not — so at 80pp the
 * Newborn cover printed its name 5mm left of the photo it is centred under, while the
 * engine showed them aligned. Invisible at 40pp on Newborn, whose reference spine is
 * 9mm... but 40pp is 10mm, so even there it was 1mm out.
 */

const { coverCaptionShiftMm, computeCoverDimensions } = require('../scripts/export-pdf.js');

const NEWBORN_REF_SPINE = 9;
const frontName  = { key: 'name',     xMm: 327 };    // front panel (>= 218)
const frontSub   = { key: 'subtitle', xMm: 327 };
const spineCap   = { key: 'spine',    xMm: 222.5 };  // spine — recentred separately
const backCap    = { key: 'backNote', xMm: 100 };    // back panel — must never move

describe('Front-panel cover captions follow the widened spine', () => {
  test('80pp shifts a front caption by the full delta (14 − 9 = 5mm)', () => {
    const { spineWidthMm } = computeCoverDimensions(80);
    expect(spineWidthMm).toBe(14);
    expect(coverCaptionShiftMm(frontName, spineWidthMm, NEWBORN_REF_SPINE)).toBe(5);
    expect(coverCaptionShiftMm(frontSub, spineWidthMm, NEWBORN_REF_SPINE)).toBe(5);
  });

  test('40pp shifts by 1mm (10 − 9) — small, but not zero', () => {
    const { spineWidthMm } = computeCoverDimensions(40);
    expect(spineWidthMm).toBe(10);
    expect(coverCaptionShiftMm(frontName, spineWidthMm, NEWBORN_REF_SPINE)).toBe(1);
  });

  test('a caption on the back panel never moves', () => {
    const { spineWidthMm } = computeCoverDimensions(80);
    expect(coverCaptionShiftMm(backCap, spineWidthMm, NEWBORN_REF_SPINE)).toBe(0);
  });

  test('spine captions are excluded — they are recentred on the new spine centre', () => {
    const { spineWidthMm } = computeCoverDimensions(80);
    expect(coverCaptionShiftMm(spineCap, spineWidthMm, NEWBORN_REF_SPINE)).toBe(0);
  });

  test('a template authored at the rendered spine width needs no shift', () => {
    expect(coverCaptionShiftMm(frontName, 14, 14)).toBe(0);
  });

  // The whole point is that the caption tracks the photo it sits under. Both use the
  // same 218mm boundary and the same delta, so they must agree for any page count.
  test('front captions shift by the same delta as front photo slots', () => {
    for (const pages of [40, 80]) {
      const { spineWidthMm } = computeCoverDimensions(pages);
      const slotShift = 327 >= 218 ? spineWidthMm - NEWBORN_REF_SPINE : 0;  // renderCoverImage
      expect(coverCaptionShiftMm(frontName, spineWidthMm, NEWBORN_REF_SPINE)).toBe(slotShift);
    }
  });
});
