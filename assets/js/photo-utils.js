// Pure utility functions for the photo upload pipeline.
// Extracted here so they can be unit-tested with Jest independent of the browser.
// template-engine.html loads this file and uses these globals directly.

// ── The format policy. One list, every surface reads it. ────────────────────
// Before S164 six places each decided independently what counted as "a photo" and they
// disagreed: the file picker offered four extensions, drag-and-drop silently accepted
// eight (incl. WebP/AVIF/BMP, which no competitor takes and our derivative pipeline
// cannot process), and the server validated nothing.
//
// JPG + PNG + HEIC is the industry standard — Artifact Uprising, Journi, Papier, Mixbook
// and Shutterfly all accept exactly this set (see docs/briefs/photo-formats-competitor-
// baseline.md). WebP was considered and REFUSED (owner, S164): only one competitor takes
// it and print pipelines reject it. Do not re-raise without a reason that brief lacks.
//
// Changing this list means changing derivative-utils.js isImageFile() in the same commit,
// or accepted photos will get no web derivative and quietly fall back to full-size
// originals — the egress the derivative system exists to prevent.
const PHOTO_FORMATS = {
  extensions: ['jpg', 'jpeg', 'png', 'heic', 'heif'],
  accept:     '.jpg,.jpeg,.png,.heic,.heif',
  label:      'JPG · PNG · HEIC',
  maxBytes:   40 * 1024 * 1024, // 40 MB, matching Artifact Uprising (the premium comparator)
};

// RAW is rejected by every competitor, for the same reason we reject it: browsers cannot
// display it. Listed so we can say "export as JPEG first" instead of "your file looks
// damaged", which is what the decode gate used to tell photographers.
const RAW_EXTENSIONS = ['dng', 'raw', 'cr2', 'nef', 'arw', 'orf', 'rw2', 'raf', 'srw'];

function fileExtension(name) {
  const parts = String(name || '').split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

// Android hands Chrome the provider's DISPLAY_NAME, which carries no guarantee of a file
// extension — a photo picked from Drive or another cloud provider can legitimately arrive
// named "image" with type "image/jpeg" (Chromium ContentUriUtils / Android OpenableColumns).
// Judging on the filename alone would refuse a real customer's real photo, which is worse
// than the bug this policy was written to fix. So: the extension decides when it is one we
// know, and otherwise an EXACT accepted MIME type does. We do not go back to accepting any
// `image/*` — that is what let WebP and BMP in.
const MIME_TO_EXT = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

function effectiveExtension(file) {
  const ext = fileExtension(file.name);
  if (PHOTO_FORMATS.extensions.includes(ext)) return ext;
  return MIME_TO_EXT[String(file.type || '').toLowerCase()] || '';
}

// The name the file is STORED under. An extension-less upload must still get one, or
// isImageFile() in derivative-utils skips it and the photo silently gets no web
// derivative — accepting the file but leaving it broken downstream.
function canonicalPhotoName(file) {
  const ext = fileExtension(file.name);
  if (PHOTO_FORMATS.extensions.includes(ext)) return file.name;
  const derived = effectiveExtension(file);
  return derived ? `${file.name}.${derived}` : file.name;
}

function isRaw(file) {
  return RAW_EXTENSIONS.includes(fileExtension(file.name));
}

// The single gate. Returns null when the file is acceptable, otherwise a customer-facing
// reason. Deciding and explaining are the same operation — that is what stops a file being
// accepted here and failing silently three steps later.
function photoRejection(file) {
  if (isRaw(file)) {
    return `RAW files can't be printed from directly — please export it as a JPEG first.`;
  }
  if (!effectiveExtension(file)) {
    return `we can only use ${PHOTO_FORMATS.label} photos.`;
  }
  if (typeof file.size === 'number' && file.size > PHOTO_FORMATS.maxBytes) {
    const mb = Math.round(file.size / 1024 / 1024);
    return `it's ${mb} MB — please keep photos under ${PHOTO_FORMATS.maxBytes / 1024 / 1024} MB.`;
  }
  return null;
}

function isAcceptedPhoto(file) {
  return photoRejection(file) === null;
}

// Declared content type for the signed upload URL. Derived from the extension, which has
// already been checked against the policy above. Before S164 this fell back to
// 'image/jpeg' for anything unrecognised, so a WebP was stored mislabelled as JPEG.
function photoMimeType(file) {
  const map = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png',
    heic: 'image/heic', heif: 'image/heif',
  };
  return map[effectiveExtension(file)] || file.type || 'application/octet-stream';
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
  module.exports = {
    PHOTO_FORMATS, RAW_EXTENSIONS, MIME_TO_EXT, fileExtension, effectiveExtension,
    canonicalPhotoName, isRaw, photoRejection, isAcceptedPhoto, photoMimeType,
    isHeicMagic, filenameNumber, comparePhotos, markDuplicates,
  };
}
