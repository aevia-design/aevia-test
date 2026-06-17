/**
 * TDD for the 3D book renderer's PURE logic (no Three.js / WebGL here).
 * Covers: cover-wrap texture-region slicing + book box proportions, derived
 * from real template data (the spike hardcoded these — see ADR 0005).
 */
const { coverTextureRegions, bookProportions, buildBookSpec } = require('../assets/js/book-3d-spec.js');

// Real Newborn cover wrap: back|spine|front across a 409mm-wide trim cover.
const NEWBORN_SECTIONS = {
  back:  { xMm: 0,   wMm: 200 },
  spine: { xMm: 200, wMm: 9 },
  front: { xMm: 209, wMm: 200 },
};

describe('coverTextureRegions', () => {
  test('slices the wrap into front/back/spine UV offset+repeat by mm', () => {
    const r = coverTextureRegions(NEWBORN_SECTIONS);
    const total = 409; // 209 + 200
    expect(r.back.offsetX).toBeCloseTo(0, 5);
    expect(r.back.repeatX).toBeCloseTo(200 / total, 5);
    expect(r.spine.offsetX).toBeCloseTo(200 / total, 5);
    expect(r.spine.repeatX).toBeCloseTo(9 / total, 5);
    expect(r.front.offsetX).toBeCloseTo(209 / total, 5);
    expect(r.front.repeatX).toBeCloseTo(200 / total, 5);
  });

  test('front sits on the right of the wrap (offset > back offset) — the spike got this wrong', () => {
    const r = coverTextureRegions(NEWBORN_SECTIONS);
    expect(r.front.offsetX).toBeGreaterThan(r.back.offsetX);
    // and the spike used 0.60 which clips the 0.489-wide front panel:
    expect(r.front.offsetX + r.front.repeatX).toBeCloseTo(1, 5);
  });
});

describe('bookProportions', () => {
  test('square book (Newborn 200x200) has aspect 1 and depth = spine width', () => {
    const p = bookProportions({ frontWmm: 200, pageHeightMm: 200, spineWmm: 9 });
    expect(p.aspect).toBeCloseTo(1, 5);
    expect(p.depthRatio).toBeCloseTo(9 / 200, 5); // thickness relative to cover width
  });

  test('non-square book keeps width:height aspect', () => {
    const p = bookProportions({ frontWmm: 210, pageHeightMm: 297, spineWmm: 12 });
    expect(p.aspect).toBeCloseTo(210 / 297, 5);
  });
});

describe('buildBookSpec', () => {
  test('assembles regions + proportions from raw template data', () => {
    const data = { pageSize: 200, cover: { sections: NEWBORN_SECTIONS } };
    const spec = buildBookSpec(data);
    expect(spec.regions.front.offsetX).toBeCloseTo(209 / 409, 5);
    expect(spec.proportions.aspect).toBeCloseTo(1, 5);
    expect(spec.proportions.depthRatio).toBeCloseTo(9 / 200, 5);
  });

  test('exposes raw mm so the renderer can scale fixed physical features (board, square)', () => {
    const data = { pageSize: 200, cover: { sections: NEWBORN_SECTIONS } };
    const spec = buildBookSpec(data);
    expect(spec.mm.frontWmm).toBe(200);
    expect(spec.mm.pageHeightMm).toBe(200);
    expect(spec.mm.spineWmm).toBe(9);
  });
});
