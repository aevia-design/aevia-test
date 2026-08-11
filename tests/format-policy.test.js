const fs = require('fs');
const path = require('path');
const { PHOTO_FORMATS, photoRejection, isAcceptedPhoto, photoMimeType, isRaw,
  effectiveExtension, canonicalPhotoName } = require('../assets/js/photo-utils');
const { isImageFile } = require('../functions/derivative-utils');

// S164. Six places used to decide independently what counted as "a photo" and they
// disagreed — the picker offered four extensions, drag-and-drop accepted eight, the
// derivative function handled a sixth set, and the server checked nothing.
//
// These tests exist to make that drift impossible to reintroduce silently. They read the
// SHIPPED order.html rather than a copy of its logic: `npm test` does not execute that
// file (LEARNINGS, S154), so asserting against the real markup is the only way a stale
// accept attribute gets caught before a customer hits it.

const orderHtml = fs.readFileSync(path.join(__dirname, '..', 'pages', 'order.html'), 'utf8');

const file = (name, size = 1024) => ({ name, size, type: '' });

describe('format policy — one list, every surface', () => {
  test('every file picker in order.html offers exactly the accepted formats', () => {
    const accepts = [...orderHtml.matchAll(/<input[^>]*type="file"[^>]*accept="([^"]+)"/g)]
      .map(m => m[1]);
    expect(accepts.length).toBeGreaterThan(0); // guard: the regex must actually match
    for (const accept of accepts) {
      expect(accept).toBe(PHOTO_FORMATS.accept);
    }
  });

  test('order.html loads photo-utils.js, or none of the policy exists at runtime', () => {
    expect(orderHtml).toMatch(/<script src="\.\.\/assets\/js\/photo-utils\.js"><\/script>/);
  });

  test('the derivative generator handles every accepted format', () => {
    // A format accepted at upload but rejected here gets no web derivative and falls back
    // to the full-size original — the egress the derivative system exists to prevent.
    for (const ext of PHOTO_FORMATS.extensions) {
      expect(isImageFile(`AEV-999/photos/photo_001.${ext}`)).toBe(true);
    }
  });

  test('the derivative generator handles NOTHING we do not accept', () => {
    for (const ext of ['webp', 'gif', 'avif', 'bmp', 'tif', 'pdf', 'txt']) {
      expect(isImageFile(`AEV-999/photos/photo_001.${ext}`)).toBe(false);
    }
  });
});

describe('photoRejection — refuse at the door, and say why', () => {
  test.each(PHOTO_FORMATS.extensions)('%s is accepted', ext => {
    expect(photoRejection(file(`holiday.${ext}`))).toBeNull();
    expect(isAcceptedPhoto(file(`holiday.${ext}`))).toBe(true);
  });

  test.each([['dng'], ['cr2'], ['nef'], ['arw'], ['orf'], ['rw2']])(
    '%s is RAW and says to export as JPEG, not that the file looks damaged', ext => {
      const reason = photoRejection(file(`DSC_0001.${ext}`));
      expect(reason).toMatch(/export it as a JPEG/i);
      expect(reason).not.toMatch(/damaged/i);
      expect(isRaw(file(`DSC_0001.${ext}`))).toBe(true);
    });

  test.each([['webp'], ['avif'], ['bmp'], ['gif'], ['pdf'], ['txt']])(
    '%s is refused and the message names what we do take', ext => {
      const reason = photoRejection(file(`thing.${ext}`));
      expect(reason).toContain(PHOTO_FORMATS.label);
    });

  test('a file over the size cap is refused with its actual size', () => {
    const reason = photoRejection(file('scan.jpg', 60 * 1024 * 1024));
    expect(reason).toMatch(/60 MB/);
    expect(reason).toMatch(/40 MB/);
  });

  test('a file exactly at the cap is still accepted', () => {
    expect(photoRejection(file('big.jpg', PHOTO_FORMATS.maxBytes))).toBeNull();
  });

  test('a file with no extension and no usable type is refused', () => {
    expect(photoRejection(file('image'))).toContain(PHOTO_FORMATS.label);
  });
});

// Android hands Chrome the content provider's DISPLAY_NAME, which carries no guarantee of
// an extension — a Drive/cloud pick can arrive as name "image", type "image/jpeg". Judging
// on the filename alone would refuse a real photo and block the order, which is worse than
// the bug the policy was written to fix. Found by cross-model review, S164.
describe('extension-less uploads (the Android path)', () => {
  const androidFile = (name, type) => ({ name, type, size: 2048 });

  test.each([
    ['image/jpeg', 'jpg'],
    ['image/png',  'png'],
    ['image/heic', 'heic'],
    ['image/heif', 'heif'],
  ])('a nameless %s photo is accepted and stored as .%s', (type, ext) => {
    const f = androidFile('image', type);
    expect(photoRejection(f)).toBeNull();
    expect(effectiveExtension(f)).toBe(ext);
    // It MUST gain an extension, or isImageFile skips it and it gets no web derivative.
    expect(canonicalPhotoName(f)).toBe(`image.${ext}`);
    expect(isImageFile(`AEV-999/photos/${canonicalPhotoName(f)}`)).toBe(true);
  });

  test('a real extension always wins over the reported type', () => {
    const f = androidFile('holiday.png', 'image/jpeg');
    expect(canonicalPhotoName(f)).toBe('holiday.png');
    expect(photoMimeType(f)).toBe('image/png');
  });

  test.each([['image/webp'], ['image/avif'], ['image/bmp'], ['image/gif'], ['text/plain']])(
    'we did NOT go back to accepting any image/* — %s is still refused', type => {
      expect(photoRejection(androidFile('image', type))).toContain(PHOTO_FORMATS.label);
    });

  test('an unextensioned RAW file is still refused with the export advice', () => {
    expect(photoRejection(androidFile('DSC_0001.dng', 'image/x-adobe-dng')))
      .toMatch(/export it as a JPEG/i);
  });
});

describe('photoMimeType — declare what the file actually is', () => {
  test.each([
    ['a.jpg',  'image/jpeg'],
    ['a.jpeg', 'image/jpeg'],
    ['a.png',  'image/png'],
    ['a.heic', 'image/heic'],
    ['a.heif', 'image/heif'],
  ])('%s → %s', (name, expected) => {
    expect(photoMimeType(file(name))).toBe(expected);
  });

  test('an unknown extension is never silently declared a JPEG', () => {
    // The old fallback returned 'image/jpeg' for anything unrecognised, so a WebP was
    // stored in GCS under a content type it did not have.
    expect(photoMimeType(file('mystery.xyz'))).not.toBe('image/jpeg');
  });
});
