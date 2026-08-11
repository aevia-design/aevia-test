// Pure utility functions for the photo upload pipeline.
// Extracted here so they can be unit-tested with Jest independent of the browser.
// template-engine.html loads this file and uses these globals directly.

function isRaw(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  return ['dng', 'raw', 'cr2', 'nef', 'arw'].includes(ext);
}

// Is this actually a HEIC file? Decided from the first 12 bytes, never the filename.
// S164 (AEV-094): web derivatives are stored under the original's name, so a JPEG can
// legitimately be called photo_024.heic. Trusting that name sent JPEGs to the HEIC
// converter, which rejected them, and 14 of one order's 52 photos vanished from the
// engine with no error. The bytes cannot lie; the name and the MIME type both can.
//
// HEIC is ISO base media format: bytes 4-7 are the literal 'ftyp', bytes 8-11 name
// the brand. Takes a Uint8Array so it stays pure and testable — callers do the read.
function isHeicMagic(bytes) {
  if (!bytes || bytes.length < 12) return false;
  const str = (from, to) => String.fromCharCode(...Array.from(bytes.slice(from, to)));
  return str(4, 8) === 'ftyp' && /heic|heix|hevc|hevx|mif1|msf1/i.test(str(8, 12));
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
  module.exports = { isRaw, isHeicMagic, filenameNumber, comparePhotos, markDuplicates };
}
