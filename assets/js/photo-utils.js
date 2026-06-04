// Pure utility functions for the photo upload pipeline.
// Extracted here so they can be unit-tested with Jest independent of the browser.
// template-engine.html loads this file and uses these globals directly.

function isRaw(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  return ['dng', 'raw', 'cr2', 'nef', 'arw'].includes(ext);
}

function filenameNumber(name) {
  const match = name.replace(/\.[^.]+$/, '').match(/(\d+)\D*$/);
  return match ? parseInt(match[1], 10) : null;
}

// Comparator for sorting photos: EXIF date → filename number → stable (0)
// The filename-number fallback uses displayName (the customer's original
// filename, e.g. IMG_2156) when present, falling back to the internal
// storedName key (photo_001) for locally-uploaded or legacy orders.
function comparePhotos(a, b) {
  if (a.date && b.date) return new Date(a.date) - new Date(b.date);
  if (a.date && !b.date) return -1;
  if (!a.date && b.date) return 1;
  const na = filenameNumber(a.displayName || a.name), nb = filenameNumber(b.displayName || b.name);
  if (na !== null && nb !== null) return na - nb;
  if (na !== null) return -1;
  if (nb !== null) return 1;
  return 0;
}

// Deduplicate incoming photos against an existing pool.
// Returns incoming photos with { duplicate: true } on any whose name already appears.
// Also prevents double-adding within the same incoming batch.
function markDuplicates(existingPool, incoming) {
  const seen = new Set(existingPool.filter(p => !p.duplicate).map(p => p.name));
  return incoming.map(photo => {
    if (seen.has(photo.name)) {
      return { ...photo, duplicate: true };
    }
    seen.add(photo.name);
    return photo;
  });
}

if (typeof module !== 'undefined') {
  module.exports = { isRaw, filenameNumber, comparePhotos, markDuplicates };
}
