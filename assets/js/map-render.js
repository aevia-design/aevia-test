/* ── Wander map-page render helper (chunk-022) ──────────────────────────────
 * The single source of truth for the Travel-map functional page (FP1):
 *   - which regional map SVG to show, given the selected countries
 *   - where each country's pin lands on that map
 *
 * Used by the smoke-test page, the staff engine, and customer-preview so the
 * map renders identically everywhere (engine-parity rule). PURE of any single
 * page's globals — callers pass in the FP1 definition + mapCoordinates from the
 * active template data, plus the canvas scale/bleed they already use.
 *
 * Coordinates: mapCoordinates[country] = { region, xMm, yMm } where xMm/yMm are
 * the pin CENTRE in WITH-BLEED mm (same convention as caption boxes). Pins are
 * centre-anchored: top-left = (coordMm - bleed) * scale - halfSize.
 * ───────────────────────────────────────────────────────────────────────── */
(function (root) {
  'use strict';

  // Given the selected country names, work out which region(s) they fall in.
  // Returns the region to render, whether the selection spans regions (a state
  // the order form must block), and any names missing from mapCoordinates.
  function pickRegion(countries, mapCoordinates) {
    const regions = [];
    const unknown = [];
    (countries || []).forEach((name) => {
      const entry = mapCoordinates && mapCoordinates[name];
      if (!entry) { unknown.push(name); return; }
      if (!regions.includes(entry.region)) regions.push(entry.region);
    });
    return {
      region: regions[0] || null,   // the map to draw (first region in selection)
      regions,                       // all distinct regions present
      crossRegion: regions.length > 1,
      unknown,
    };
  }

  // The left-page map SVG path for a region, from the FP1 `maps` dictionary.
  function resolveMapSvg(region, fp1Def) {
    if (!region || !fp1Def || !fp1Def.maps) return null;
    return fp1Def.maps[region] || null;
  }

  // Append one centre-anchored pin <img> per selected country that belongs to
  // the rendered region. Returns the number of pins placed. Browser-only (needs
  // `document`); the pure functions above are what the unit tests exercise.
  // opts: { scale=3, bleedMm=3, assetBase='' }
  function placeMapPins(canvasEl, countries, fp1Def, mapCoordinates, opts) {
    opts = opts || {};
    const scale = opts.scale != null ? opts.scale : 3;
    const bleed = opts.bleedMm != null ? opts.bleedMm : 3;
    const assetBase = opts.assetBase || '';
    const pin = (fp1Def && fp1Def.pin) || {};
    const pinW = (pin.wMm || 12) * scale;
    const pinH = (pin.hMm || 23) * scale;
    const { region } = pickRegion(countries, mapCoordinates);

    let placed = 0;
    (countries || []).forEach((name) => {
      const c = mapCoordinates && mapCoordinates[name];
      if (!c || c.region !== region) return; // only pins on the drawn region's map
      const img = document.createElement('img');
      img.className = 'map-pin';
      img.src = assetBase + (pin.png || '');
      img.alt = name;
      img.style.position = 'absolute';
      img.style.width = pinW + 'px';
      img.style.height = pinH + 'px';
      img.style.left = ((c.xMm - bleed) * scale - pinW / 2) + 'px';
      img.style.top = ((c.yMm - bleed) * scale - pinH / 2) + 'px';
      img.style.zIndex = 4;            // above the map SVG (svg-overlay z-index 2)
      img.style.pointerEvents = 'none';
      canvasEl.appendChild(img);
      placed++;
    });
    return placed;
  }

  const api = { pickRegion, resolveMapSvg, placeMapPins };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; // Node/tests
  root.MapRender = api;                                                      // browser
})(typeof window !== 'undefined' ? window : this);
