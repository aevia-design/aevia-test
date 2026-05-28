const { isRaw, filenameNumber, comparePhotos, markDuplicates } = require('../assets/js/photo-utils');

// ─── helpers ────────────────────────────────────────────────────────────────
function file(name) { return { name }; }
function photo(name, date = null) { return { name, date }; }

// ─── isRaw ──────────────────────────────────────────────────────────────────
describe('isRaw', () => {
  test.each([
    ['photo.dng',  true],
    ['photo.raw',  true],
    ['photo.cr2',  true],
    ['photo.nef',  true],
    ['photo.arw',  true],
  ])('%s → true', (name, expected) => {
    expect(isRaw(file(name))).toBe(expected);
  });

  test.each([
    ['photo.jpg',  false],
    ['photo.jpeg', false],
    ['photo.png',  false],
    ['photo.heic', false],
    ['photo.webp', false],
  ])('%s → false', (name, expected) => {
    expect(isRaw(file(name))).toBe(expected);
  });

  test('uppercase extension .DNG is raw', () => {
    expect(isRaw(file('IMG_001.DNG'))).toBe(true);
  });

  test('uppercase .CR2 is raw', () => {
    expect(isRaw(file('IMG_001.CR2'))).toBe(true);
  });

  test('double extension photo.cr2.jpg is NOT raw (extension is .jpg)', () => {
    expect(isRaw(file('photo.cr2.jpg'))).toBe(false);
  });

  test('no extension is not raw', () => {
    expect(isRaw(file('photofile'))).toBe(false);
  });
});

// ─── filenameNumber ──────────────────────────────────────────────────────────
describe('filenameNumber', () => {
  test('IMG_1234.jpg → 1234', () => {
    expect(filenameNumber('IMG_1234.jpg')).toBe(1234);
  });

  test('DSC00042.jpg → 42', () => {
    expect(filenameNumber('DSC00042.jpg')).toBe(42);
  });

  test('photo-7.jpeg → 7', () => {
    expect(filenameNumber('photo-7.jpeg')).toBe(7);
  });

  test('20230515_143022.jpg → last number group = 143022', () => {
    expect(filenameNumber('20230515_143022.jpg')).toBe(143022);
  });

  test('2023-05-15.jpg → 15 (last number)', () => {
    expect(filenameNumber('2023-05-15.jpg')).toBe(15);
  });

  test('vacation.jpg has no number → null', () => {
    expect(filenameNumber('vacation.jpg')).toBeNull();
  });

  test('img.png has no number → null', () => {
    expect(filenameNumber('img.png')).toBeNull();
  });

  test('001.jpg → 1', () => {
    expect(filenameNumber('001.jpg')).toBe(1);
  });
});

// ─── comparePhotos ────────────────────────────────────────────────────────────
describe('comparePhotos', () => {
  test('both have EXIF date: earlier date sorts first', () => {
    const a = photo('a.jpg', new Date('2023-01-01'));
    const b = photo('b.jpg', new Date('2023-06-01'));
    expect(comparePhotos(a, b)).toBeLessThan(0);
    expect(comparePhotos(b, a)).toBeGreaterThan(0);
  });

  test('same EXIF date: equal (0)', () => {
    const d = new Date('2023-03-15');
    expect(comparePhotos(photo('a.jpg', d), photo('b.jpg', d))).toBe(0);
  });

  test('dated photo sorts before undated photo', () => {
    const a = photo('a.jpg', new Date('2023-01-01'));
    const b = photo('b.jpg', null);
    expect(comparePhotos(a, b)).toBeLessThan(0);
    expect(comparePhotos(b, a)).toBeGreaterThan(0);
  });

  test('two undated photos sort by filename number', () => {
    const a = photo('IMG_0010.jpg');
    const b = photo('IMG_0020.jpg');
    expect(comparePhotos(a, b)).toBeLessThan(0);
    expect(comparePhotos(b, a)).toBeGreaterThan(0);
  });

  test('undated-with-number sorts before undated-without-number', () => {
    const a = photo('IMG_0001.jpg');
    const b = photo('vacation.jpg');
    expect(comparePhotos(a, b)).toBeLessThan(0);
    expect(comparePhotos(b, a)).toBeGreaterThan(0);
  });

  test('two undated photos both without numbers: stable (0)', () => {
    expect(comparePhotos(photo('alpha.jpg'), photo('beta.jpg'))).toBe(0);
  });

  test('sorting an array: date → filename number → no-number last', () => {
    const pool = [
      photo('IMG_0030.jpg'),
      photo('vacation.jpg'),
      photo('IMG_0010.jpg'),
      photo('dated-late.jpg',  new Date('2023-12-01')),
      photo('dated-early.jpg', new Date('2023-01-01')),
    ];
    const sorted = [...pool].sort(comparePhotos);
    expect(sorted.map(p => p.name)).toEqual([
      'dated-early.jpg',
      'dated-late.jpg',
      'IMG_0010.jpg',
      'IMG_0030.jpg',
      'vacation.jpg',
    ]);
  });
});

// ─── markDuplicates ───────────────────────────────────────────────────────────
describe('markDuplicates', () => {
  test('new files with unique names: no duplicates', () => {
    const result = markDuplicates([], [photo('a.jpg'), photo('b.jpg')]);
    expect(result.every(p => !p.duplicate)).toBe(true);
  });

  test('file already in pool: marked duplicate', () => {
    const pool    = [photo('a.jpg')];
    const incoming = [photo('a.jpg')];
    const result  = markDuplicates(pool, incoming);
    expect(result[0].duplicate).toBe(true);
  });

  test('same file twice in one batch: second marked duplicate', () => {
    const result = markDuplicates([], [photo('a.jpg'), photo('a.jpg')]);
    expect(result[0].duplicate).toBeUndefined();
    expect(result[1].duplicate).toBe(true);
  });

  test('mix: first occurrence fine, re-upload marked duplicate', () => {
    const pool    = [photo('keep.jpg')];
    const incoming = [photo('new.jpg'), photo('keep.jpg'), photo('new.jpg')];
    const result  = markDuplicates(pool, incoming);
    expect(result[0].duplicate).toBeUndefined(); // new.jpg first time
    expect(result[1].duplicate).toBe(true);       // keep.jpg in pool
    expect(result[2].duplicate).toBe(true);       // new.jpg second time
  });

  test('pool photos marked duplicate are ignored when checking for duplicates', () => {
    // If a.jpg was already flagged duplicate in the pool, uploading a.jpg again
    // should still be considered a duplicate of the original, not of a duplicate.
    const pool    = [{ ...photo('original.jpg') }, { ...photo('a.jpg'), duplicate: true }];
    const incoming = [photo('a.jpg')];
    // 'a.jpg' is NOT in the non-duplicate pool entries, so this new one should be fine
    const result  = markDuplicates(pool, incoming);
    expect(result[0].duplicate).toBeUndefined();
  });
});
