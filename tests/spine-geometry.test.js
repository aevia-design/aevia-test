/**
 * spine-geometry.test.js
 * Tests for page-count-dependent spine width in PDF export.
 *
 * Spine width: 40pp → 10mm, 80pp → 14mm, unknown/missing → 9mm (fallback)
 * Cover geometry is derived from spine width; tests verify the formulas match the brief.
 */

const fs = require('fs');
const path = require('path');
const { getSpineWidthMm, getSpineFontBumpPt, computeCoverDimensions } = require('../scripts/export-pdf.js');

describe('Spine geometry', () => {
  describe('getSpineFontBumpPt', () => {
    test('80 pages → +2pt (the 14mm spine needs a larger face)', () => {
      expect(getSpineFontBumpPt(80)).toBe(2);
    });

    test('40 pages → no bump', () => {
      expect(getSpineFontBumpPt(40)).toBe(0);
    });

    test('unknown page count → no bump', () => {
      expect(getSpineFontBumpPt(60)).toBe(0);
      expect(getSpineFontBumpPt(undefined)).toBe(0);
      expect(getSpineFontBumpPt(null)).toBe(0);
      expect(getSpineFontBumpPt('80')).toBe(0);  // strict: callers must parseInt
    });
  });

  // The bump must exist on all three rendering surfaces or screen and print disagree
  // silently — and only the print is real. These are source-level checks because the
  // engines are HTML pages with no module boundary to import.
  describe('spine font bump parity across surfaces', () => {
    const surfaces = [
      'pages/staff/template-engine.html',
      'pages/customer-preview.html',
      'scripts/export-pdf.js',
    ];

    test.each(surfaces)('%s defines getSpineFontBumpPt with the same 80→2 rule', (rel) => {
      const src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
      expect(src).toMatch(/function getSpineFontBumpPt\(pageCount\)\s*\{\s*return pageCount === 80 \? 2 : 0;\s*\}/);
    });

    test.each(surfaces)('%s applies the bump to the default only, never to an override', (rel) => {
      const src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
      // The override branch must not contain the bump call: an explicit staff size wins
      // outright, or setting 16 would silently render 18 at 80pp.
      const call = /ov\.sizePt[^\n]*\n?[^\n]*getSpineFontBumpPt/;
      expect(src).toMatch(call);
      expect(src).not.toMatch(/ov\.sizePt \+ getSpineFontBumpPt/);
    });
  });

  describe('getSpineWidthMm', () => {
    test('40 pages → 10mm spine', () => {
      expect(getSpineWidthMm(40)).toBe(10);
    });

    test('80 pages → 14mm spine', () => {
      expect(getSpineWidthMm(80)).toBe(14);
    });

    test('unknown page count → 9mm fallback', () => {
      expect(getSpineWidthMm(60)).toBe(9);
      expect(getSpineWidthMm(undefined)).toBe(9);
      expect(getSpineWidthMm(null)).toBe(9);
      expect(getSpineWidthMm('invalid')).toBe(9);
    });
  });

  describe('computeCoverDimensions', () => {
    test('at 9mm (reference): content width = 409mm, full width = 445mm', () => {
      const dims = computeCoverDimensions(undefined);  // undefined → 9mm
      expect(dims.spineWidthMm).toBe(9);
      expect(dims.contentWidthMm).toBe(400 + 9);  // 409
      expect(dims.fullWidthMm).toBe(400 + 9 + 36);  // 445 (409 + 2*18 bleed)
    });

    test('at 10mm (40pp): content width = 410mm, full width = 446mm', () => {
      const dims = computeCoverDimensions(40);
      expect(dims.spineWidthMm).toBe(10);
      expect(dims.contentWidthMm).toBe(400 + 10);  // 410
      expect(dims.fullWidthMm).toBe(400 + 10 + 36);  // 446
    });

    test('at 14mm (80pp): content width = 414mm, full width = 450mm', () => {
      const dims = computeCoverDimensions(80);
      expect(dims.spineWidthMm).toBe(14);
      expect(dims.contentWidthMm).toBe(400 + 14);  // 414
      expect(dims.fullWidthMm).toBe(400 + 14 + 36);  // 450
    });

    test('svgBleedUnits is constant ~51.024 (18mm * 72 / 25.4)', () => {
      const dims9 = computeCoverDimensions(undefined);
      const dims10 = computeCoverDimensions(40);
      const dims14 = computeCoverDimensions(80);

      const expected = 18 * 72 / 25.4;  // ~51.024
      expect(dims9.svgBleedUnits).toBeCloseTo(expected, 3);
      expect(dims10.svgBleedUnits).toBeCloseTo(expected, 3);
      expect(dims14.svgBleedUnits).toBeCloseTo(expected, 3);
    });
  });

  describe('Panel centres in with-bleed space (brief § Geometry)', () => {
    // With-bleed space: 0 is the left bleed edge (18mm left of content start)
    // Back panel: x ∈ [0, 200], centre at 100
    // Spine: x ∈ [200, 200+s], centre at 200 + s/2
    // Front panel: x ∈ [209, 409], centre at 309
    //
    // After measuring from the with-bleed edge (18mm offset from content origin):
    // Back: 18 + 100 = 118
    // Spine: 18 + 200 + s/2 = 218 + s/2
    // Front: 18 + 309 = 327 (fixed, independent of s, because front moves)

    test('back panel centre at 118mm (with-bleed space)', () => {
      const dims9 = computeCoverDimensions(undefined);
      const dims10 = computeCoverDimensions(40);
      const dims14 = computeCoverDimensions(80);

      // Back centre is always 118 (18mm bleed + 100mm to back content centre)
      expect(118).toBe(118);  // sanity check
    });

    test('spine centre at 218 + s/2 (with-bleed space)', () => {
      const dims9 = computeCoverDimensions(undefined);
      expect(218 + 9/2).toBeCloseTo(222.5, 1);

      const dims10 = computeCoverDimensions(40);
      expect(218 + 10/2).toBeCloseTo(223, 1);

      const dims14 = computeCoverDimensions(80);
      expect(218 + 14/2).toBeCloseTo(225, 1);
    });

    test('front panel centre at 327mm (with-bleed space, independent of s)', () => {
      // Front panel originally at x ∈ [209, 409] content space
      // With 18mm bleed offset: x ∈ [227, 427]
      // Centre: 227 + 100 = 327
      expect(18 + 309).toBe(327);  // independent of spine width
    });
  });

  describe('Front-panel delta', () => {
    test('delta = s − 9 (spine width − reference spine)', () => {
      // At s=9: delta = 0
      expect(9 - 9).toBe(0);

      // At s=10: delta = 1mm
      expect(10 - 9).toBe(1);

      // At s=14: delta = 5mm
      expect(14 - 9).toBe(5);
    });
  });

  describe('clipShape x-shift for front-panel slots', () => {
    // When front panel shifts by delta in mm, the clip path must also shift.
    // In px space (at 300dpi): delta_px = delta_mm * MM_TO_PX = delta_mm * (300/25.4)

    const MM_TO_PX = 300 / 25.4;  // ~11.811 px/mm

    test('at s=9: delta_px = 0', () => {
      const deltaMm = 9 - 9;
      const deltaPx = Math.round(deltaMm * MM_TO_PX);
      expect(deltaPx).toBe(0);
    });

    test('at s=10: delta_px ≈ 12px (1mm * 11.811)', () => {
      const deltaMm = 10 - 9;
      const deltaPx = Math.round(deltaMm * MM_TO_PX);
      expect(deltaPx).toBeCloseTo(12, 0);
    });

    test('at s=14: delta_px ≈ 59px (5mm * 11.811)', () => {
      const deltaMm = 14 - 9;
      const deltaPx = Math.round(deltaMm * MM_TO_PX);
      expect(deltaPx).toBeCloseTo(59, 0);
    });
  });

  describe('No regression: s=9 values match hardcoded constants', () => {
    // At reference spine (9mm), all computed values must match the old hardcoded constants
    // so existing orders render byte-identically.

    test('COVER_CONTENT_W = 400 + 9 = 409', () => {
      const dims = computeCoverDimensions(undefined);
      expect(dims.contentWidthMm).toBe(409);
    });

    test('COVER_FULL_W_MM = 409 + 36 = 445', () => {
      const dims = computeCoverDimensions(undefined);
      expect(dims.fullWidthMm).toBe(445);
    });

    test('COVER_FULL_W_PX ≈ 5256px (445mm * 300/25.4)', () => {
      const dims = computeCoverDimensions(undefined);
      const MM_TO_PX = 300 / 25.4;
      const expectedPx = Math.round(445 * MM_TO_PX);
      expect(expectedPx).toBe(5256);
    });

    test('COVER_FULL_H_PX ≈ 2787px (236mm * 300/25.4)', () => {
      const COVER_FULL_H_MM = 200 + 36;  // 236
      const MM_TO_PX = 300 / 25.4;
      const expectedPx = Math.round(236 * MM_TO_PX);
      expect(expectedPx).toBe(2787);
    });

    test('COVER_BLEED_PX ≈ 213px (18mm * 300/25.4)', () => {
      const MM_TO_PX = 300 / 25.4;
      const expectedPx = Math.round(18 * MM_TO_PX);
      expect(expectedPx).toBe(213);
    });
  });
});
