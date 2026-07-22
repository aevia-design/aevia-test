const crypto = require('crypto');
const { Storage } = require('@google-cloud/storage');
// CORS is NOT an access control here — every function sets
// Access-Control-Allow-Origin and authorisation is 100% bearer-credential
// (ADR-0009). This list only keeps stray browsers off the upload endpoint.
// Tidied S144: dropped the dead Webflow prototype origins, and anchored the
// patterns — the old /\.pages\.dev$/ was unanchored, so ANY pages.dev project
// in the world matched it.
const cors = require('cors')({
  origin: [
    'https://aevia.at',
    'https://www.aevia.at',
    'https://aevia-test.pages.dev',
    /^https:\/\/[a-z0-9-]+\.aevia-test\.pages\.dev$/, // branch preview deploys
    /^http:\/\/localhost(:\d+)?$/,
  ],
});
const admin = require('firebase-admin');
const { createTransporter, FROM, renderEmail } = require('./email');

// ─── Config ──────────────────────────────────────────────────────────────────
const BUCKET_NAME = 'aevia-uploads-eu';
const MIN_UPLOAD_SLOTS = 60;

// Storage client using your service account key
const storage = new Storage({ keyFilename: './serviceAccountKey.json' });

// ─── Order number (AEV-001, AEV-002 …) ───────────────────────────────────────
async function getNextOrderNumber() {
  const db = admin.firestore();
  const counterRef = db.collection('counters').doc('orders');
  const num = await db.runTransaction(async (tx) => {
    const doc = await tx.get(counterRef);
    const next = doc.exists ? doc.data().count + 1 : 1;
    tx.set(counterRef, { count: next });
    return next;
  });
  return `AEV-${String(num).padStart(3, '0')}`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function limitedConcurrent(tasks, limit = 10) {
  const results = new Array(tasks.length);
  let index = 0;
  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, worker);
  await Promise.all(workers);
  return results;
}

function emailRow(label, value, shaded) {
  if (!value && value !== 0) return '';
  return `<tr${shaded ? ' style="background:#f9f9f9"' : ''}>
    <td style="padding:10px 14px;font-weight:bold;width:160px;vertical-align:top">${label}</td>
    <td style="padding:10px 14px">${value}</td>
  </tr>`;
}

// ─── Handler ─────────────────────────────────────────────────────────────────
async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      customerName, email, templateName, pageCount, files,
      specialRequests, photoNotes, price, fpTexts, fpSelections, photoCount, coverCaptions,
    } = req.body;

    const missing = ['customerName', 'email', 'templateName', 'pageCount']
      .filter(f => !req.body[f]);
    if (missing.length) {
      return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
    }

    const orderNumber = await getNextOrderNumber();
    const folderName  = orderNumber;
    const fileList    = Array.isArray(files) ? files : [];
    const totalSlots = Math.max(fileList.length, MIN_UPLOAD_SLOTS);

    const bucket    = storage.bucket(BUCKET_NAME);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const tasks = Array.from({ length: totalSlots }, (_, i) => async () => {
      const fileInfo = fileList[i];
      let storedName, contentType;

      if (fileInfo) {
        const rawExt = (fileInfo.name || '').split('.').pop().toLowerCase() || 'bin';
        const ext = rawExt === 'heic' ? 'heic' : rawExt === 'jpg' ? 'jpg' : rawExt;
        contentType = fileInfo.type && fileInfo.type !== ''
          ? fileInfo.type
          : ext === 'heic' ? 'image/heic' : 'image/jpeg';
        if (fileInfo.fileType === 'cover') {
          // Multi-cover templates (Joyride, 4 photos) send a slotIndex so each
          // cover gets a distinct name; single-cover templates omit it.
          const suffix = (fileInfo.slotIndex !== undefined && fileInfo.slotIndex !== null)
            ? `-${fileInfo.slotIndex}` : '';
          storedName = `${folderName}/cover/cover${suffix}.${ext}`;
        } else if (fileInfo.fileType === 'special') {
          const slug = fileInfo.addonSlug || `special_${String(i + 1).padStart(3, '0')}`;
          // Multi-photo special pages (only FP5 art gallery, 2 photos) send a
          // slotIndex; without it both files would share one name and the second
          // would overwrite the first in GCS. Single-photo pages omit the suffix.
          const suffix = (fileInfo.slotIndex !== undefined && fileInfo.slotIndex !== null)
            ? `-${fileInfo.slotIndex}` : '';
          storedName = `${folderName}/special_pages/${slug}${suffix}.${ext}`;
        } else {
          storedName = `${folderName}/photos/photo_${String(i + 1).padStart(3, '0')}.${ext}`;
        }
      } else {
        storedName  = `${folderName}/photos/slot_${String(i + 1).padStart(3, '0')}`;
        contentType = 'application/octet-stream';
      }

      const file  = bucket.file(storedName);
      const [url] = await file.getSignedUrl({
        action: 'write', version: 'v4', expires: expiresAt, contentType,
      });
      return { slot: i + 1, storedName, originalName: fileInfo ? fileInfo.name : null, contentType, url };
    });

    const uploadUrls  = await limitedConcurrent(tasks, 10);

    // Build photoManifest: records which GCS path belongs to which category
    // poolOriginalNames runs parallel to pool[] (same order/length): it keeps the
    // customer's original filename (e.g. IMG_2156.jpg) for each pool photo so staff
    // can recognise photos and the chronological sort can fall back to those numbers.
    // The stored key (photo_001) stays the stable internal identifier for save/load.
    const photoManifest = { cover: null, special: {}, pool: [], poolOriginalNames: [] };
    uploadUrls.forEach(u => {
      const fileInfo = fileList[u.slot - 1];
      if (!fileInfo) return;
      if (fileInfo.fileType === 'cover') {
        // Single-cover templates keep cover as a string; multi-cover (Joyride)
        // sends a slotIndex per photo → cover becomes a slot-ordered array.
        if (fileInfo.slotIndex !== undefined && fileInfo.slotIndex !== null) {
          if (!Array.isArray(photoManifest.cover)) photoManifest.cover = [];
          photoManifest.cover[fileInfo.slotIndex] = u.storedName;
        } else {
          photoManifest.cover = u.storedName;
        }
      } else if (fileInfo.fileType === 'special') {
        const slug = fileInfo.addonSlug;
        if (!photoManifest.special[slug]) photoManifest.special[slug] = [];
        photoManifest.special[slug].push(u.storedName);
      } else {
        photoManifest.pool.push(u.storedName);
        photoManifest.poolOriginalNames.push(u.originalName || null);
      }
    });

    const token = crypto.randomBytes(32).toString('hex');

    const folderLink =
      `https://console.cloud.google.com/storage/browser/` +
      `${BUCKET_NAME}/${encodeURIComponent(folderName)}`;

    // ─ CHUNK 4 PART A: Write Firestore order doc FIRST (before any emails) ─
    // Status is 'uploading' until confirmUpload is called; uploadComplete flag
    // prevents double-emails on retry. Store the normalised email (Chunk 1 sends it trimmed+lowercased).
    const db = admin.firestore();
    await db.collection('orders').doc(orderNumber).set({
      orderNumber,
      customerName,
      email,
      templateName,
      pageCount,
      price: price || null,
      specialRequests: specialRequests || null,
      photoNotes: photoNotes || null,
      fpTexts: fpTexts || null,
      fpSelections: fpSelections && fpSelections.length ? fpSelections : null,
      photoCount: photoCount || null,
      fileCount: fileList.length,
      folderName,
      photoManifest,
      folderLink,
      status: 'uploading',
      uploadComplete: false,
      token,
      previewToken: null,
      coverCaptions: coverCaptions || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ─ Send ONLY the STAFF email (customer email moves to confirmUpload) ─
    const transporter = createTransporter();

    await transporter.sendMail({
      ...FROM.orders,
      to:      process.env.EMAIL_NOTIFY,
      subject: `[${orderNumber}] New Order — ${customerName} (${templateName})`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;color:#333">
          <h2 style="border-bottom:2px solid #eee;padding-bottom:12px">
            New Aevia Photo Book Order
          </h2>
          <table style="width:100%;border-collapse:collapse;margin-top:16px">
            ${emailRow('Order Number', `<strong>${orderNumber}</strong>`, true)}
            ${emailRow('Customer', customerName, false)}
            ${emailRow('Email', `<a href="mailto:${email}">${email}</a>`, true)}
            ${emailRow('Template', templateName, false)}
            ${emailRow('Page Count', pageCount, true)}
            ${emailRow('Photos', fileList.length, false)}
            ${emailRow('Storage Folder', `<span style="font-family:monospace">${folderName}</span>`, true)}
            ${specialRequests ? emailRow('Special Requests', specialRequests, false) : ''}
            ${photoNotes      ? emailRow('Photo Notes',      photoNotes,      true)  : ''}
          </table>
          <div style="margin-top:24px">
            <a href="${folderLink}"
               style="background:#4285f4;color:#fff;padding:12px 20px;
                      text-decoration:none;border-radius:4px;display:inline-block">
              Open in Google Cloud Console
            </a>
          </div>
          <p style="color:#999;font-size:12px;margin-top:24px">
            Submitted ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}
          </p>
        </div>
      `,
    });

    // Save order-details.txt to GCS so staff can read it in the bucket browser
    const detailLines = [
      `Order:     ${orderNumber}`,
      `Customer:  ${customerName}`,
      `Email:     ${email}`,
      `Template:  ${templateName}`,
      `Pages:     ${pageCount}`,
      `Photos:    ${fileList.length}`,
      `Submitted: ${new Date().toISOString()}`,
    ];
    if (photoNotes)      detailLines.push(``, `About this album:`, photoNotes);
    if (specialRequests) detailLines.push(``, `Special requests:`, specialRequests);
    if (fpSelections && fpSelections.length) {
      detailLines.push(``, `Add-ons: ${fpSelections.join(', ')}`);
    }
    if (fpTexts && Object.keys(fpTexts).length) {
      detailLines.push(``, `Add-on notes:`);
      Object.entries(fpTexts).forEach(([key, val]) => {
        const display = Array.isArray(val) ? val.join(', ') : val;
        detailLines.push(`  ${key}: ${display}`);
      });
    }
    await bucket.file(`${folderName}/order-details.txt`)
      .save(detailLines.join('\n'), { contentType: 'text/plain; charset=utf-8' });

    // ─ CHUNK 4 PART A: Return response with token (Chunk 5 needs it) ─
    return res.status(200).json({
      success: true,
      orderNumber,
      folderName,
      totalSlots,
      uploadUrls,
      expiresAt: expiresAt.toISOString(),
      token,
    });

  } catch (err) {
    console.error('[createUploadSession] Error:', err);
    return res.status(500).json({
      error: 'Server error — please try again or contact support.',
      detail: err.message,
    });
  }
}

exports.createUploadSessionHandler = (req, res) => cors(req, res, () => handler(req, res));

// ─── CHUNK 4 PART B: confirmUpload Cloud Function ───────────────────────────────
// Input: { orderNumber, token }
// Auth: validate token against stored token; reject mismatch with 403
// Action: set status='new', uploadComplete=true; send customer confirmation email
// Idempotent: if uploadComplete already true, return 200 without re-sending
async function confirmUploadHandler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderNumber, token } = req.body;

    if (!orderNumber || !token) {
      return res.status(400).json({ error: 'orderNumber and token are required' });
    }

    const db = admin.firestore();
    const doc = await db.collection('orders').doc(orderNumber).get();

    // Auth: order must exist and token must match
    if (!doc.exists) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    const order = doc.data();
    // Defensive: require a stored non-empty string token and an exact match.
    // Guards against a falsy/missing stored token ever satisfying the comparison.
    if (!order.token || typeof order.token !== 'string' || order.token !== token) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Idempotency: if uploadComplete is already true, return 200 without re-sending
    if (order.uploadComplete === true) {
      return res.status(200).json({ success: true });
    }

    // Update order: status → 'new', uploadComplete → true
    await db.collection('orders').doc(orderNumber).update({
      status: 'new',
      uploadComplete: true,
    });

    // Send customer confirmation email (template moved from createUploadSession)
    const transporter = createTransporter();
    const customerName = order.customerName;
    const customerEmail = order.email;
    const templateName = order.templateName;
    const pageCount = order.pageCount;
    const price = order.price;

    await transporter.sendMail({
      ...FROM.customer,
      to:       customerEmail,
      subject:  `Your Aevia order ${orderNumber} is confirmed`,
      html: renderEmail(`
        <p style="margin:0 0 18px">Hi ${customerName},</p>
        <p style="margin:0 0 22px">Thank you. Your order <strong>${orderNumber}</strong> is confirmed, and we've started designing your book.</p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e2e2;border-radius:4px;margin:0 0 22px">
          <tr><td style="padding:16px 20px 4px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#8a8a8a">Book</td>
                <td style="padding:6px 0;font-size:16px;color:#2a2a2a;text-align:right">${templateName}</td>
              </tr>
              ${price ? `<tr>
                <td style="padding:6px 0;border-top:1px solid #f0eee9;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#8a8a8a">Book price</td>
                <td style="padding:6px 0;border-top:1px solid #f0eee9;font-size:16px;color:#2a2a2a;text-align:right">&euro;${price}</td>
              </tr>` : ''}
            </table>
          </td></tr>
          <tr><td style="padding:8px 20px 18px">
            <p style="margin:0;font-size:14px;color:#6a6a6a;line-height:1.6">Delivery is added at checkout, and you won't be charged until you approve your book.</p>
          </td></tr>
        </table>

        <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#8a8a8a">What happens next</p>
        <p style="margin:0;font-size:15px;color:#6a6a6a;line-height:1.7">We'll have your preview ready within 48 hours. You'll get an email the moment it's ready for you to review and approve.</p>
      `, { support: true }),
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[confirmUpload] Error:', err);
    return res.status(500).json({
      error: 'Server error — please try again or contact support.',
      detail: err.message,
    });
  }
}

exports.confirmUploadHandler = (req, res) => cors(req, res, () => confirmUploadHandler(req, res));

// ─── S147: reportUploadFailure ───────────────────────────────────────────────
// Diagnostics only. When a photo PUT gives up, the browser posts what it saw
// (status codes, error text, timings) so the failure survives the tab being
// closed. Deliberately does NOT change status or email anyone — an order left
// at 'uploading' is still the signal that something went wrong; this only
// explains WHY. Same token auth as confirmUpload.
async function reportUploadFailureHandler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderNumber, token, failures, userAgent } = req.body;

    if (!orderNumber || !token) {
      return res.status(400).json({ error: 'orderNumber and token are required' });
    }

    const db = admin.firestore();
    const doc = await db.collection('orders').doc(orderNumber).get();
    if (!doc.exists) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    const order = doc.data();
    if (!order.token || typeof order.token !== 'string' || order.token !== token) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Bound what we store: a runaway client must not be able to bloat the doc
    // (Firestore's hard limit is 1 MiB and this field is pure diagnostics).
    const capped = (Array.isArray(failures) ? failures : []).slice(0, 25);

    await db.collection('orders').doc(orderNumber).update({
      uploadErrors:   capped,
      uploadErrorAt:  admin.firestore.FieldValue.serverTimestamp(),
      uploadErrorUA:  String(userAgent || '').slice(0, 300),
    });

    console.error(`[reportUploadFailure] ${orderNumber}:`, JSON.stringify(capped));

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[reportUploadFailure] Error:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
}

exports.reportUploadFailureHandler = (req, res) => cors(req, res, () => reportUploadFailureHandler(req, res));
