const { Storage } = require('@google-cloud/storage');
const cors = require('cors')({
  origin: ['https://aevia.at', 'https://www.aevia.at', 'https://aevia-v1.webflow.io', /\.webflow\.io$/, /^http:\/\/localhost(:\d+)?$/],
});
const nodemailer = require('nodemailer');
const admin = require('firebase-admin');

// ─── Config ──────────────────────────────────────────────────────────────────
const BUCKET_NAME = 'aevia-uploads.firebasestorage.app';
const MIN_UPLOAD_SLOTS = 60;

// Storage client using your service account key
const storage = new Storage({ keyFilename: './serviceAccountKey.json' });

// ─── Email transporter ────────────────────────────────────────────────────────
function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

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
function sanitize(str) {
  return str.toLowerCase().trim().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
}

function buildFolderName(templateName, customerName) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `${sanitize(templateName)}_${sanitize(customerName)}_${date}`;
}

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
      specialRequests, photoNotes, price,
    } = req.body;

    const missing = ['customerName', 'email', 'templateName', 'pageCount']
      .filter(f => !req.body[f]);
    if (missing.length) {
      return res.status(400).json({ error: `Missing fields: ${missing.join(', ')}` });
    }

    const folderName = buildFolderName(templateName, customerName);
    const fileList   = Array.isArray(files) ? files : [];
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
          storedName = `${folderName}/cover/cover.${ext}`;
        } else if (fileInfo.fileType === 'special') {
          const slug = fileInfo.addonSlug || `special_${String(i + 1).padStart(3, '0')}`;
          storedName = `${folderName}/special_pages/${slug}.${ext}`;
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
    const orderNumber = await getNextOrderNumber();

    const folderLink =
      `https://console.cloud.google.com/storage/browser/` +
      `${BUCKET_NAME}/${encodeURIComponent(folderName)}`;

    const transporter = createTransporter();

    await transporter.sendMail({
      from:    `"Aevia Orders" <${process.env.EMAIL_USER}>`,
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

    await transporter.sendMail({
      from:     `"Aevia" <${process.env.EMAIL_USER}>`,
      replyTo:  'xenia@aevia.at',
      to:       email,
      subject:  `Your Aevia order ${orderNumber} is confirmed`,
      html: `
        <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#333;background:#ffffff">

          <!-- Header -->
          <div style="background:#f5f5f5;padding:32px;text-align:center;border-bottom:1px solid #e0e0e0">
            <img src="https://cdn.prod.website-files.com/69b2a5d685caeaf8e1c11985/69b2a8dcbb742c4b653bd15b_ff02171a590b8dd9f5be28995c86baf1_Logo-wide-p-2000.png"
                 width="140" alt="Aevia" style="display:block;margin:0 auto">
          </div>

          <!-- Body -->
          <div style="background:#ffffff;padding:40px">
            <p style="margin:0 0 16px">Hi ${customerName},</p>
            <p style="margin:0 0 24px">Thank you for your order. Your photos have been received and we're already getting to work.</p>

            <!-- Order summary box -->
            <div style="background:#f5f5f5;border-radius:8px;padding:20px;margin:0 0 24px">
              <div style="font-size:11px;color:#999;letter-spacing:1px;font-variant:small-caps;text-transform:uppercase;margin-bottom:12px">Order Summary</div>
              <table style="width:100%;border-collapse:collapse">
                <tr>
                  <td style="padding:6px 0;color:#888;font-size:14px">Template</td>
                  <td style="padding:6px 0;color:#1a1a1a;font-size:14px;text-align:right">${templateName}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;color:#888;font-size:14px">Pages</td>
                  <td style="padding:6px 0;color:#1a1a1a;font-size:14px;text-align:right">${pageCount}</td>
                </tr>
                ${price ? `<tr>
                  <td style="padding:6px 0;color:#888;font-size:14px">Price</td>
                  <td style="padding:6px 0;color:#1a1a1a;font-size:14px;text-align:right">&euro;${price}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding:6px 0;color:#888;font-size:14px">Order reference</td>
                  <td style="padding:6px 0;color:#1a1a1a;font-size:14px;font-weight:bold;text-align:right">${orderNumber}</td>
                </tr>
              </table>
            </div>

            <p style="margin:0 0 12px">We're assembling your photo book and will send you a preview for approval within 48 hours.</p>
            <p style="color:#999;font-style:italic;font-size:13px;margin:0 0 24px">You won't be charged until you review and approve the final design.</p>

            <hr style="border:none;border-top:1px solid #e0e0e0;margin:0 0 24px">

            <p style="font-size:13px;margin:0">Questions? Write to <a href="mailto:xenia@aevia.at" style="color:#333">xenia@aevia.at</a> with <strong>${orderNumber}</strong> in the subject line.</p>
          </div>

          <!-- Footer -->
          <div style="background:#f5f5f5;padding:20px;text-align:center">
            <p style="color:#999;font-size:14px;margin:0">— The Aevia team</p>
          </div>

        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      orderNumber,
      folderName,
      totalSlots,
      uploadUrls,
      expiresAt: expiresAt.toISOString(),
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
