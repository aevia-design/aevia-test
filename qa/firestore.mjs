// Read-only Firestore + GCS-metadata helper for QA scripts.
//
// Some pass criteria (order status, staffBookSequence, pdfRender progress) live in
// Firestore and are NOT exposed on window by the dashboard (it is a module script,
// so `allOrders` is module-scoped). Rather than scrape the DOM for them, read the
// source of truth directly with the admin SDK.
//
// Uses functions/serviceAccountKey.json (already on disk, gitignored).
//
// COST: Firestore document reads are negligible. `folderBytes()` LISTS object
// metadata only — it never downloads an object, so it generates NO GCS egress.

import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const KEY = path.resolve('functions/serviceAccountKey.json');

const admin = require(path.resolve('functions/node_modules/firebase-admin'));
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(require(KEY)), storageBucket: 'aevia-uploads-eu' });
}

export const db = admin.firestore();

/** Raw order doc, or null. */
export async function getOrder(orderNumber) {
  const d = await db.collection('orders').doc(orderNumber).get();
  return d.exists ? d.data() : null;
}

/** The fields QA actually asserts on. */
export async function orderState(orderNumber) {
  const o = await getOrder(orderNumber);
  if (!o) return null;
  return {
    status: o.status,
    seq: Array.isArray(o.staffBookSequence) ? o.staffBookSequence.length : 0,
    saved: !!o.staffSavedAt,
    complete: o.staffBookComplete === true,
    pdf: o.pdfRender || null,
    issueNote: o.issueNote || null,
    issueReportedAt: o.issueReportedAt ? o.issueReportedAt.toDate().toISOString() : null,
    statusHistory: (o.statusHistory || []).map(h => h.status),
    previewToken: o.previewToken || null,
    email: o.email || null,
    folderName: o.folderName || null,
  };
}

/**
 * Total bytes of the ORIGINALS the PDF renderer downloads for this order
 * (photoManifest cover + specials + pool). Metadata listing only — no egress.
 */
export async function orderPhotoBytes(orderNumber) {
  const o = await getOrder(orderNumber);
  if (!o) return null;
  const m = o.photoManifest || {};
  const paths = new Set();
  if (m.cover) paths.add(m.cover);
  for (const v of Object.values(m.special || {})) {
    for (const p of (Array.isArray(v) ? v : [v])) if (p) paths.add(p);
  }
  for (const p of (m.pool || [])) if (p) paths.add(p);

  const bucket = admin.storage().bucket();
  let bytes = 0, missing = 0, largest = { name: null, bytes: 0 };
  await Promise.all([...paths].map(async (p) => {
    try {
      const [meta] = await bucket.file(p).getMetadata();
      const n = Number(meta.size || 0);
      bytes += n;
      if (n > largest.bytes) largest = { name: p, bytes: n };
    } catch { missing++; }
  }));
  return { count: paths.size, bytes, missing, largest };
}
