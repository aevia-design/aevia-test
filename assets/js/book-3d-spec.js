// book-3d-spec.js — PURE geometry/texture math for the 3D book renderer.
//
// No Three.js / WebGL here: this is the unit-tested logic the renderer consumes
// (the WebGL scene itself is screenshot-verified, not unit-tested — see ADR 0005).
//
// Two jobs:
//   1. coverTextureRegions — slice a full cover-WRAP image (back|spine|front, as the
//      engine renders it) into per-face UV offset+repeat so each box face shows the
//      right slice. Derived from the template's mm sections, NOT hardcoded (the spike
//      hardcoded 0.60/0.40 and clipped the front panel).
//   2. bookProportions — turn cover/spine mm into 3D box proportions (cover aspect +
//      thickness ratio), handling square (Newborn 200×200) and non-square books.
//
// Shared by the renderer (browser global) + jest (CommonJS), like book-completeness.js.

// Total trim width of the wrap = the far edge of the rightmost section.
function coverWrapWidthMm(sections) {
  return Math.max(...Object.values(sections).map((s) => s.xMm + s.wMm));
}

// → { back, spine, front: { offsetX, repeatX } } in 0..1 UV space.
function coverTextureRegions(sections) {
  const total = coverWrapWidthMm(sections);
  const region = (s) => ({ offsetX: s.xMm / total, repeatX: s.wMm / total });
  const out = {};
  for (const key of Object.keys(sections)) out[key] = region(sections[key]);
  return out;
}

// frontWmm × pageHeightMm = the visible cover; spineWmm = book thickness.
// aspect = width/height; depthRatio = thickness relative to cover width (for the box).
function bookProportions({ frontWmm, pageHeightMm, spineWmm }) {
  return {
    aspect: frontWmm / pageHeightMm,
    depthRatio: spineWmm / frontWmm,
  };
}

// Assemble both from raw template data (e.g. window.NEWBORN_DATA).
// pageSize is a single value for square books; pageHeight overrides for non-square.
function buildBookSpec(data) {
  const sections = data.cover.sections;
  const frontWmm = sections.front.wMm;
  const pageHeightMm = data.pageHeight || data.pageSize;
  return {
    regions: coverTextureRegions(sections),
    proportions: bookProportions({
      frontWmm,
      pageHeightMm,
      spineWmm: sections.spine.wMm,
    }),
  };
}

if (typeof module !== 'undefined') {
  module.exports = { coverWrapWidthMm, coverTextureRegions, bookProportions, buildBookSpec };
}
