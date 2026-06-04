// Wander map-page render helper (chunk-022) — pure-logic tests.
// Pin placement is visual (verified in the smoke page); here we cover region
// selection, cross-region detection, unknown names, and SVG resolution against
// the REAL Wander data.

const MapRender = require('../assets/js/map-render.js');

if (!global.window) global.window = {};
require('../assets/Template_Wander/wander-data.js');
const WANDER = global.window.WANDER_DATA;
const COORDS = WANDER.mapCoordinates;
const FP1 = WANDER.spreads.FP1;

describe('pickRegion', () => {
  test('single-region selection returns that region, no cross-region flag', () => {
    const r = MapRender.pickRegion(['Austria', 'Germany', 'France'], COORDS);
    expect(r.region).toBe('EU');
    expect(r.crossRegion).toBe(false);
    expect(r.unknown).toEqual([]);
  });

  test('selection spanning regions sets crossRegion', () => {
    const r = MapRender.pickRegion(['Austria', 'Russia'], COORDS); // EU + Asia
    expect(r.crossRegion).toBe(true);
    expect(r.regions).toContain('EU');
    expect(r.regions).toContain('Asia');
  });

  test('unknown country names are reported, not crashed on', () => {
    const r = MapRender.pickRegion(['Austria', 'Atlantis'], COORDS);
    expect(r.region).toBe('EU');
    expect(r.unknown).toEqual(['Atlantis']);
  });

  test('empty selection yields null region', () => {
    const r = MapRender.pickRegion([], COORDS);
    expect(r.region).toBeNull();
    expect(r.crossRegion).toBe(false);
  });
});

describe('resolveMapSvg', () => {
  test('returns the region map path from FP1.maps', () => {
    expect(MapRender.resolveMapSvg('EU', FP1)).toBe(FP1.maps.EU);
    expect(MapRender.resolveMapSvg('Asia', FP1)).toBe(FP1.maps.Asia);
  });

  test('every region in mapCoordinates has a corresponding map SVG', () => {
    const regions = new Set(Object.values(COORDS).map((c) => c.region));
    regions.forEach((region) => {
      expect(MapRender.resolveMapSvg(region, FP1)).toBeTruthy();
    });
  });

  test('null/unknown region resolves to null', () => {
    expect(MapRender.resolveMapSvg(null, FP1)).toBeNull();
    expect(MapRender.resolveMapSvg('Mars', FP1)).toBeNull();
  });
});
