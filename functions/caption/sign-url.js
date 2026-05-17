/**
 * GCS Signed URL Generator
 * -------------------------
 * Generates a 15-minute signed URL for a private GCS file.
 *
 * Usage:
 *   node sign-url.js --path vows_yyy_20260407/photos/photo_002.jpg
 */

const { Storage } = require("@google-cloud/storage");
const path = require("path");

const args = process.argv.slice(2);
const filePath = args.includes("--path") ? args[args.indexOf("--path") + 1] : null;

if (!filePath) {
  console.error("ERROR: --path is required.");
  console.error("Usage: node sign-url.js --path folder/photos/photo.jpg");
  process.exit(1);
}

const storage = new Storage({
  keyFilename: path.join(__dirname, "../serviceAccountKey.json"),
});

const BUCKET = "aevia-uploads.firebasestorage.app";

async function run() {
  const [url] = await storage.bucket(BUCKET).file(filePath).getSignedUrl({
    action: "read",
    expires: Date.now() + 15 * 60 * 1000,
  });

  console.log("\nSigned URL (valid 15 min):\n");
  console.log(url);
  console.log();
}

run().catch((err) => {
  console.error("\nERROR:", err.message || err);
  process.exit(1);
});
