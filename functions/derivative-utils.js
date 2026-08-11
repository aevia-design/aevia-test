// Pure utility functions for web-resolution derivative generation (chunk-023).
// No side effects, no dependencies on Cloud Functions or GCS.
// Extracted here so they can be unit-tested with Jest independent of Firebase.

/**
 * Derive the derivative path from an original's GCS path.
 * The derivative path MUST be a pure function of the original's path so getOrder can
 * derive and sign it without Firestore schema changes.
 *
 * Convention: original `<folder>/<category>/<name>` → derivative `<folder>/<category>/previews/<name>`
 *
 * Examples:
 *   AEV-040/photos/photo_001.jpg → AEV-040/photos/previews/photo_001.jpg
 *   AEV-040/special_pages/fp1.jpg → AEV-040/special_pages/previews/fp1.jpg
 *   AEV-040/cover/cover.heic → AEV-040/cover/previews/cover.heic
 *
 * @param {string} originalPath - The full GCS path of the original photo
 * @returns {string|null} The derived path, or null if invalid
 */
function deriveDerivativePath(originalPath) {
  if (!originalPath || typeof originalPath !== 'string') return null;
  const parts = originalPath.split('/');
  if (parts.length < 2) return null; // Must have at least folder/filename
  // Insert 'previews' before the last component (filename)
  parts.splice(parts.length - 1, 0, 'previews');
  return parts.join('/');
}

/**
 * Guard: check if a GCS path is already a derivative (under 'previews/').
 * The Cloud Function must skip such paths to avoid infinite recursion
 * when the derivative is finalized in GCS.
 *
 * @param {string} gcsPath - The full GCS path to check
 * @returns {boolean} True if the path is a derivative path
 */
function isDerivativePath(gcsPath) {
  if (!gcsPath || typeof gcsPath !== 'string') return false;
  return gcsPath.includes('/previews/');
}

/**
 * Guard: check if a GCS path is an image file (by extension).
 * The Cloud Function must skip non-image objects to avoid crashes
 * when sharp tries to decode them (e.g., JSON, text, PDF).
 *
 * @param {string} gcsPath - The full GCS path to check
 * @returns {boolean} True if the extension is a supported image format
 */
function isImageFile(gcsPath) {
  if (!gcsPath || typeof gcsPath !== 'string') return false;
  const ext = gcsPath.split('.').pop().toLowerCase();
  // MUST match PHOTO_FORMATS.extensions in assets/js/photo-utils.js — the accepted-format
  // policy (S164). Previously this listed webp and gif, which the order form never accepted,
  // while omitting heif, which it now does. A format accepted at upload but missing here
  // gets no derivative and silently falls back to the full-size original, which is exactly
  // the egress the derivative system exists to avoid.
  return ['jpg', 'jpeg', 'png', 'heic', 'heif'].includes(ext);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { deriveDerivativePath, isDerivativePath, isImageFile };
}
