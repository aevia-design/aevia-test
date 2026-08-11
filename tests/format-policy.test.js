const fs = require('fs');
const path = require('path');
const { PHOTO_FORMATS, photoRejection, isAcceptedPhoto, photoMimeType, isRaw } =
  require('../assets/js/photo-utils');
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

  test('a file with no extension is refused rather than assumed to be a JPEG', () => {
    // Android pickers can hand over a name with no extension at all.
    expect(photoRejection(file('image'))).toContain(PHOTO_FORMATS.label);
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
