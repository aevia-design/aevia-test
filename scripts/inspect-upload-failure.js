#!/usr/bin/env node
/**
 * inspect-upload-failure.js — read back the S147 upload diagnostics.
 *
 * When a photo upload gives up, order.html posts what it saw to
 * reportUploadFailure, which stores it on the order as `uploadErrors`.
 * This prints that record, plus which files are actually missing from GCS.
 *
 * Usage:  node scripts/inspect-upload-failure.js AEV-074 [AEV-073 ...]
 *
 * Cost: Firestore doc reads + a GCS object LIST. Metadata only — this never
 * downloads a photo, so it incurs no egress.
 */
const path = require('path');
const admin = require(path.join(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
const { Storage } = require(path.join(__dirname, '..', 'functions', 'node_modules', '@google-cloud', 'storage'));

const KEY_PATH = path.join(__dirname, '..', 'functions', 'serviceAccountKey.json');
const BUCKET = 'aevia-uploads-eu';

const orderNumbers = process.argv.slice(2);
if (!orderNumbers.length) {
  console.error('Usage: node scripts/inspect-upload-failure.js AEV-074 [AEV-073 ...]');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(require(KEY_PATH)) });
const db = admin.firestore();
const bucket = new Storage({ keyFilename: KEY_PATH }).bucket(BUCKET);

// Every GCS path the manifest says this order should contain.
function expectedPaths(manifest) {
  const out = [];
  const cover = manifest.cover;
  if (Array.isArray(cover)) out.push(...cover.filter(Boolean));
  else if (cover) out.push(cover);
  for (const paths of Object.values(manifest.special || {})) {
    out.push(...(Array.isArray(paths) ? paths : [paths]).filter(Boolean));
  }
  out.push(...(manifest.pool || []).filter(Boolean));
  return out;
}

(async () => {
  for (const orderNumber of orderNumbers) {
    console.log(`\n${'='.repeat(60)}\n${orderNumber}\n${'='.repeat(60)}`);

    const doc = await db.collection('orders').doc(orderNumber).get();
    if (!doc.exists) { console.log('Order not found.'); continue; }
    const order = doc.data();

    console.log(`status: ${order.status}   uploadComplete: ${order.uploadComplete}`);
    console.log(`template: ${order.templateName}   expected files: ${order.fileCount}`);

    // What the browser reported, if anything.
    if (Array.isArray(order.uploadErrors) && order.uploadErrors.length) {
      console.log(`\n--- Reported failures (${order.uploadErrors.length}) ---`);
      if (order.uploadErrorUA) console.log(`browser: ${order.uploadErrorUA}`);
      for (const f of order.uploadErrors) {
        console.log(`\n  slot ${f.slot}  ${f.storedName || '(unknown path)'}`);
        console.log(`  original : ${f.originalName}  (${f.fileType})`);
        console.log(`  size     : ${f.sizeBytes} bytes`);
        console.log(`  type     : declared=${f.declaredType}  signed=${f.signedType}`);
        console.log(`  gave up after ${f.totalMs} ms`);
        for (const a of f.attempts || []) {
          const what = a.status ? `HTTP ${a.status} ${a.statusText}` : a.error;
          console.log(`    attempt ${a.attempt}: ${what}  (${a.ms} ms)`);
          if (a.body) console.log(`      body: ${a.body.replace(/\s+/g, ' ').slice(0, 200)}`);
        }
      }
    } else {
      console.log('\nNo uploadErrors recorded (order predates S147 diagnostics, ' +
                  'or the tab closed before it could report).');
    }

    // Cross-check against what is actually in the bucket.
    const [files] = await bucket.getFiles({ prefix: `${orderNumber}/` });
    const present = new Set(files.map(f => f.name));
    const missing = expectedPaths(order.photoManifest || {}).filter(p => !present.has(p));

    console.log(`\n--- Missing from GCS (${missing.length}) ---`);
    missing.forEach(p => console.log(`  ${p}`));
    if (!missing.length) console.log('  none — every expected file is present');
  }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
