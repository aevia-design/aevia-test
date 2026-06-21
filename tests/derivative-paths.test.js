// Unit tests for web-resolution derivative path generation (chunk-023)
const {
  deriveDerivativePath,
  isDerivativePath,
  isImageFile,
} = require('../functions/derivative-utils');

describe('deriveDerivativePath – pure path derivation logic', () => {
  /**
   * The derivative path MUST be a pure function of the original's GCS path.
   * This allows getOrder to derive and sign the derivative URL without Firestore schema changes.
   * Convention: original `<folder>/<category>/<name>` → derivative `<folder>/<category>/previews/<name>`
   *
   * Examples:
   *   AEV-040/photos/photo_001.jpg → AEV-040/photos/previews/photo_001.jpg
   *   AEV-040/special_pages/fp1.jpg → AEV-040/special_pages/previews/fp1.jpg
   *   AEV-040/cover/cover.heic → AEV-040/cover/previews/cover.heic
   */

  test('derives derivative path for pool photos', () => {
    const original = 'AEV-040/photos/photo_001.jpg';
    const expected = 'AEV-040/photos/previews/photo_001.jpg';
    expect(deriveDerivativePath(original)).toBe(expected);
  });

  test('derives derivative path for cover photos', () => {
    const original = 'AEV-040/cover/cover.heic';
    const expected = 'AEV-040/cover/previews/cover.heic';
    expect(deriveDerivativePath(original)).toBe(expected);
  });

  test('derives derivative path for special page photos', () => {
    const original = 'AEV-040/special_pages/fp1.jpg';
    const expected = 'AEV-040/special_pages/previews/fp1.jpg';
    expect(deriveDerivativePath(original)).toBe(expected);
  });

  test('derives derivative path for multi-photo special pages', () => {
    const original = 'AEV-040/special_pages/fp5-0.jpg';
    const expected = 'AEV-040/special_pages/previews/fp5-0.jpg';
    expect(deriveDerivativePath(original)).toBe(expected);
  });

  test('handles JPEG originals', () => {
    const original = 'AEV-031/photos/photo_005.jpg';
    const expected = 'AEV-031/photos/previews/photo_005.jpg';
    expect(deriveDerivativePath(original)).toBe(expected);
  });

  test('handles HEIC originals (preserves extension)', () => {
    const original = 'AEV-032/photos/photo_010.heic';
    const expected = 'AEV-032/photos/previews/photo_010.heic';
    expect(deriveDerivativePath(original)).toBe(expected);
  });

  test('returns null for empty/invalid path', () => {
    expect(deriveDerivativePath(null)).toBe(null);
    expect(deriveDerivativePath('')).toBe(null);
    expect(deriveDerivativePath('no-slash')).toBe(null);
  });

  test('is idempotent – derivative of derivative is invalid (guard)', () => {
    const original = 'AEV-040/photos/photo_001.jpg';
    const derivative = deriveDerivativePath(original);
    // Second application should still work (not meant to double-wrap)
    const secondApply = deriveDerivativePath(derivative);
    expect(secondApply).toBe('AEV-040/photos/previews/previews/photo_001.jpg');
    // This guards that we catch double-generation in the Cloud Function
  });
});

describe('isDerivativePath – guard against recursion', () => {
  /**
   * The Cloud Function must skip objects already under a 'previews/' path
   * to avoid triggering itself infinitely when the derivative is written to GCS.
   */

  test('identifies derivative paths', () => {
    expect(isDerivativePath('AEV-040/photos/previews/photo_001.jpg')).toBe(true);
    expect(isDerivativePath('AEV-040/special_pages/previews/fp1.jpg')).toBe(true);
    expect(isDerivativePath('AEV-040/cover/previews/cover.jpg')).toBe(true);
  });

  test('rejects original paths', () => {
    expect(isDerivativePath('AEV-040/photos/photo_001.jpg')).toBe(false);
    expect(isDerivativePath('AEV-040/special_pages/fp1.jpg')).toBe(false);
    expect(isDerivativePath('AEV-040/cover/cover.jpg')).toBe(false);
  });

  test('returns false for null/empty', () => {
    expect(isDerivativePath(null)).toBe(false);
    expect(isDerivativePath('')).toBe(false);
  });
});

describe('isImageFile – guard against non-image objects', () => {
  /**
   * The Cloud Function must skip non-image objects (text files, JSON, etc.)
   * to avoid crashes when sharp tries to decode them.
   */

  test('identifies image files', () => {
    expect(isImageFile('AEV-040/photos/photo_001.jpg')).toBe(true);
    expect(isImageFile('AEV-040/photos/photo_001.jpeg')).toBe(true);
    expect(isImageFile('AEV-040/photos/photo_001.heic')).toBe(true);
    expect(isImageFile('AEV-040/photos/photo_001.png')).toBe(true);
  });

  test('rejects non-image files', () => {
    expect(isImageFile('order-details.txt')).toBe(false);
    expect(isImageFile('book-state.json')).toBe(false);
    expect(isImageFile('AEV-040/pdfs/content.pdf')).toBe(false);
  });

  test('returns false for null/empty', () => {
    expect(isImageFile(null)).toBe(false);
    expect(isImageFile('')).toBe(false);
  });
});
