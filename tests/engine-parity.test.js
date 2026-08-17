// Engine-parity tripwire.
//
// The staff engine (pages/staff/template-engine.html) and the customer preview
// (pages/customer-preview.html) each carry their OWN inline copy of the book-render
// pipeline. They must stay in sync so a customer sees exactly what staff approved.
//
// This test does NOT compare the insides of those functions (some differ on purpose:
// the customer engine has read-only mode, payment, no photo-rearranging). It only
// checks that every render function which is meant to exist in BOTH still exists in
// BOTH — catching the most common and most damaging slip: a shared function gets
// renamed or removed on one side and forgotten on the other.
//
// When you intentionally add/remove a shared render function on both engines, update
// SHARED_RENDER_FUNCTIONS below. A red test here means the two engines have drifted.

const fs = require('fs');
const path = require('path');

const STAFF    = path.join(__dirname, '..', 'pages', 'staff', 'template-engine.html');
const CUSTOMER = path.join(__dirname, '..', 'pages', 'customer-preview.html');

// Pull every `function NAME(` declaration out of a file into a Set of names.
function functionNames(file) {
  const src = fs.readFileSync(file, 'utf8');
  const names = new Set();
  const re = /\bfunction\s+([A-Za-z0-9_]+)\s*\(/g;
  let m;
  while ((m = re.exec(src)) !== null) names.add(m[1]);
  return names;
}

// The render pipeline that MUST live in both engines. Keep this list current: it is
// the contract that both copies honour the same drawing steps.
const SHARED_RENDER_FUNCTIONS = [
  'applyStyleToSpreadCapEl',
  // 'applyTypographicRules' was removed from BOTH engines in S181. It injected
  // non-breaking spaces into the caption DOM that the save path stripped, so the
  // recorded line breaks could describe a string nobody stored — which printed
  // AEV-099 with letters moved across the breaks.
  'assignPhotosToSpreads',
  'assignmentsToIndices',
  'assignmentsToNames',
  'attachCropDrag',
  'attachRepositionHandle',
  'buildBookSequence',
  'freshSpecialPhotos',
  'getActiveTemplateData',
  'getHeartCrop',
  'getOrientationFromBlob',
  'handleSlotDrop',
  'makeSidebarThumb',
  'rebuildStylePills',
  'renderBook',
  'renderCover',
  'renderPhotoSidebar',
  'renderSpread',
  'rerenderSpread',
  'resolveVariant',
  'setActiveAlignPill',
  'setActiveTemplate',
  'setHeartCrop',
  'showCoverCaptionToolbar',
  'showToast',
  'tbUpdate',
  'templateFonts',
  'wouldMixPage',
];

describe('Staff engine ⇄ customer preview render parity', () => {
  const staff = functionNames(STAFF);
  const customer = functionNames(CUSTOMER);

  test.each(SHARED_RENDER_FUNCTIONS)('"%s" exists in both engines', (fn) => {
    const missing = [];
    if (!staff.has(fn)) missing.push('staff engine (template-engine.html)');
    if (!customer.has(fn)) missing.push('customer preview (customer-preview.html)');
    expect(missing).toEqual([]);
  });
});
