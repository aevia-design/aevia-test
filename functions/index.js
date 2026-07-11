const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createUploadSessionHandler, confirmUploadHandler } = require('./upload');
const { normalizeEmail, projectOrderForCustomer, sortOrdersNewestFirst } = require('./account-utils');
const { generateReferralCode, extractPromotionCodeId, referrerRewardDecision } = require('./referral-utils');
const { createTransporter, FROM, renderEmail, emailButton } = require('./email');

// Where the auth-email links send the customer back to after they click. Must be
// an Authorised Domain in Firebase Console → Authentication → Settings.
const ACCOUNT_URL = 'https://aevia-test.pages.dev/pages/account.html';

admin.initializeApp();

// ── Staff auth (chunk-018) ─────────────────────────────────────────────────
// Allowlist of staff Firebase Auth accounts. Email/Password sign-up is open on
// the project, so we must check the email — a valid token alone is NOT enough.
// Emails compared lower-case. Add/remove people here (redeploy to apply).
const STAFF_EMAILS = ['evg.myasin@gmail.com', 'xenia@aevia.at', 'claude-test@aevia.at'];

// Returns true if the request is from authorised staff: either a valid Firebase
// ID token (Authorization: Bearer <token>) for an allowlisted email, OR the
// static staff key. As of chunk-018 the key is no longer used by any browser
// page (dashboard + engine send tokens) — it is retained ONLY for the local PDF
// export CLI (scripts/export-pdf.js), which has no logged-in user. To fully
// retire the key, migrate that script to admin credentials.
async function isStaff(req) {
  const authHeader = req.headers.authorization || '';
  const m = authHeader.match(/^Bearer (.+)$/);
  if (m) {
    try {
      const decoded = await admin.auth().verifyIdToken(m[1]);
      const email = (decoded.email || '').toLowerCase();
      if (STAFF_EMAILS.includes(email)) return true;
    } catch (e) {
      // invalid/expired token — fall through to legacy key check
    }
  }
  return req.headers['x-staff-key'] === process.env.STAFF_KEY;
}

exports.createUploadSession = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 120, memory: '256MB' })
  .https.onRequest(createUploadSessionHandler);

// ── CHUNK 4 PART B: Confirm uploads complete, flip status to 'new', send customer email ──
exports.confirmUpload = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(confirmUploadHandler);

// ── Caption generator ────────────────────────────────────────────────────────
// Accepts multipart/form-data: image (JPEG blob) + collection + note (optional)
// Returns { caption: "..." }
const fs = require('fs');
const path = require('path');
const CAPTION_VOICE = fs.readFileSync(path.join(__dirname, 'caption/caption-voice.md'), 'utf8');

exports.generateCaption = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

    try {
      const OpenAI = require('openai');
      const client = new OpenAI.default({ apiKey: process.env.OPENAI_API_KEY });

      // Expect JSON body: { image: "<base64>", collection: "kids", note: "optional", previousCaptions: [] }
      const { image, collection = 'kids', note, previousCaptions } = req.body;
      if (!image) { res.status(400).json({ error: 'image (base64) is required' }); return; }

      const userLines = [`Collection: ${collection}`];
      if (note) userLines.push(`Customer note: "${note}"`);
      if (Array.isArray(previousCaptions) && previousCaptions.length > 0) {
        userLines.push('');
        userLines.push('Captions already used elsewhere in this book — do not repeat similar phrasing, structure, opening words, or emotional register:');
        previousCaptions.slice(-8).forEach(c => userLines.push(`- ${c}`));
      }
      userLines.push('', 'IMPORTANT: Do not start the caption with the word "A" or "An".');
      userLines.push('Generate one caption for this photo. Return only the caption text, nothing else.');

      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 100,
        messages: [
          { role: 'system', content: CAPTION_VOICE },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } },
              { type: 'text', text: userLines.join('\n') },
            ],
          },
        ],
      });

      const caption = response.choices[0].message.content.trim();
      res.json({ caption });
    } catch (err) {
      console.error('generateCaption error:', err);
      res.status(500).json({ error: err.message });
    }
  });

// ── Get order (staff tool + customer preview — returns Firestore doc + signed read URLs) ────────
exports.getOrder = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 60, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Staff-Key, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const hasStaffAuth = await isStaff(req);
    const { orderNumber, token } = req.body;

    // Auth: require either staff key or customer token
    if (!hasStaffAuth && !token) {
      return res.status(403).json({ error: 'Unauthorised' });
    }

    try {
      const db = admin.firestore();
      let doc;

      if (hasStaffAuth) {
        // Staff path: fetch by orderNumber
        if (!orderNumber) return res.status(400).json({ error: 'orderNumber required' });
        doc = await db.collection('orders').doc(orderNumber).get();
        if (!doc.exists) return res.status(404).json({ error: `Order ${orderNumber} not found` });
      } else {
        // Customer path: fetch by previewToken
        const snapshot = await db.collection('orders')
          .where('previewToken', '==', token)
          .limit(1)
          .get();

        if (snapshot.empty) {
          return res.status(403).json({ error: 'Invalid or expired token' });
        }

        doc = snapshot.docs[0];
      }

      const order    = doc.data();
      const manifest = order.photoManifest || { cover: null, special: {}, pool: [] };

      const { Storage } = require('@google-cloud/storage');
      const storage  = new Storage({ keyFilename: './serviceAccountKey.json' });
      const bucket   = storage.bucket('aevia-uploads-eu');
      const expires  = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      async function signedReadUrl(storedName) {
        if (!storedName) return null;
        const [url] = await bucket.file(storedName).getSignedUrl({ action: 'read', version: 'v4', expires });
        return url;
      }

      // ── Chunk-023: Derive derivative URLs (web-resolution for screen rendering) ──
      // For each original, derive the derivative path and check if it exists in GCS.
      // If yes, return signed URL for derivative. If no (legacy orders), return null
      // so engines fallback to the original.
      const { deriveDerivativePath } = require('./derivative-utils');

      async function signedDerivativeUrl(originalStoredName) {
        if (!originalStoredName) return null;
        const derivativePath = deriveDerivativePath(originalStoredName);
        if (!derivativePath) return null;
        try {
          // Check if derivative exists (GCS file.exists() is fast, uses head request)
          const [exists] = await bucket.file(derivativePath).exists();
          if (!exists) return null;
          // Derivative exists — sign and return its URL
          const [url] = await bucket.file(derivativePath).getSignedUrl({ action: 'read', version: 'v4', expires });
          return url;
        } catch (err) {
          console.warn(`Error checking derivative for ${originalStoredName}:`, err.message);
          return null; // Graceful fallback if derivative check fails
        }
      }

      const signedUrls = { cover: null, special: {}, pool: [] };
      const derivativeUrls = { cover: null, special: {}, pool: [] };

      // Originals (for PDF export — chunk-023 does not modify this path)
      signedUrls.cover = await signedReadUrl(manifest.cover);
      for (const [slug, paths] of Object.entries(manifest.special || {})) {
        signedUrls.special[slug] = await Promise.all((Array.isArray(paths) ? paths : [paths]).map(p => signedReadUrl(p)));
      }
      signedUrls.pool = await Promise.all((manifest.pool || []).map(p => signedReadUrl(p)));

      // Derivatives (for engine rendering — chunk-023, with fallback to originals)
      derivativeUrls.cover = await signedDerivativeUrl(manifest.cover);
      for (const [slug, paths] of Object.entries(manifest.special || {})) {
        derivativeUrls.special[slug] = await Promise.all((Array.isArray(paths) ? paths : [paths]).map(p => signedDerivativeUrl(p)));
      }
      derivativeUrls.pool = await Promise.all((manifest.pool || []).map(p => signedDerivativeUrl(p)));

      return res.status(200).json({
        orderNumber:          order.orderNumber,
        customerName:         order.customerName,
        templateName:         order.templateName || null,
        email:                order.email || null,
        status:               order.status || null,
        price:                order.price || null,
        pageCount:            order.pageCount,
        fpSelections:         order.fpSelections || [],
        fpTexts:              order.fpTexts || {},
        photoNotes:           order.photoNotes || null,
        coverCaptions:        order.coverCaptions || null,
        coverCaptionStyles:   order.coverCaptionStyles || null,
        staffBookAssignments: order.staffBookAssignments || null,
        staffBookCaptions:    order.staffBookCaptions    || null,
        staffBookSequence:    order.staffBookSequence    || null,
        staffHeartCrop:       order.staffHeartCrop       || null,
        staffCoverCaptionStyles:  order.staffCoverCaptionStyles  || null,
        staffSpreadCaptionStyles: order.staffSpreadCaptionStyles || null,
        // Customer's own saved edits — replayed on reopen so a closed tab loses nothing.
        customerBookAssignments:    order.customerBookAssignments    || null,
        customerCaptions:           order.customerCaptions           || null,
        customerCaptionStyles:      order.customerCaptionStyles      || null,
        customerCoverCaptionStyles: order.customerCoverCaptionStyles || null,
        customerHeartCrop:          order.customerHeartCrop          || null,
        signedUrls,
        derivativeUrls, // chunk-023: web-resolution URLs for engine rendering (fallback to signedUrls)
        storedNames: {
          cover:            manifest.cover            || null,
          special:          manifest.special          || {},
          pool:             manifest.pool             || [],
          poolOriginalNames: manifest.poolOriginalNames || [],
        },
      });
    } catch (err) {
      console.error('getOrder error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

// ── Save order state (customer preview edits) ────────────────────────────────
// Accepts { token, bookAssignments, captions, spreadCaptionStyles } from customer-preview.html
exports.saveOrderState = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const { token, bookAssignments, captions, spreadCaptionStyles, coverCaptionStyles, heartCrop } = req.body;
    if (!token) return res.status(403).json({ error: 'Token required' });

    try {
      const db = admin.firestore();
      const snapshot = await db.collection('orders')
        .where('previewToken', '==', token)
        .limit(1)
        .get();

      if (snapshot.empty) return res.status(403).json({ error: 'Invalid or expired token' });

      await snapshot.docs[0].ref.update({
        customerBookAssignments: bookAssignments || null,
        customerCaptions:        captions        || null,
        customerCaptionStyles:   spreadCaptionStyles || null,
        customerCoverCaptionStyles: coverCaptionStyles || null,
        customerHeartCrop:       heartCrop || null,
        customerUpdatedAt:       admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('saveOrderState error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

// ── Approve order (customer approves book, staff state merges to final) ────────
exports.approveOrder = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const { token } = req.body;
    if (!token) return res.status(403).json({ error: 'Token required' });

    try {
      const db = admin.firestore();
      const snapshot = await db.collection('orders')
        .where('previewToken', '==', token)
        .limit(1)
        .get();

      if (snapshot.empty) return res.status(403).json({ error: 'Invalid or expired token' });

      const orderRef = snapshot.docs[0].ref;
      const orderData = snapshot.docs[0].data();

      if (orderData.status === 'approved' || orderData.status === 'paid') {
        return res.status(409).json({ error: 'Order is already approved or paid' });
      }

      // Merge customer-approved state into staff fields
      // Only overwrite if customer field exists and is not null
      const updates = {
        status: 'approved',
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        statusHistory: admin.firestore.FieldValue.arrayUnion({
          status: 'approved',
          timestamp: admin.firestore.Timestamp.now()
        })
      };

      // Copy customer fields to staff fields, respecting existing staff values if customer is null
      if (orderData.customerBookAssignments != null) {
        updates.staffBookAssignments = orderData.customerBookAssignments;
      }
      if (orderData.customerCaptions != null) {
        updates.staffBookCaptions = orderData.customerCaptions;
      }
      if (orderData.customerCaptionStyles != null) {
        updates.staffSpreadCaptionStyles = orderData.customerCaptionStyles;
      }
      if (orderData.customerCoverCaptionStyles != null) {
        updates.staffCoverCaptionStyles = orderData.customerCoverCaptionStyles;
      }
      if (orderData.customerBookSequence != null) {
        updates.staffBookSequence = orderData.customerBookSequence;
      }
      if (orderData.customerHeartCrop != null) {
        updates.staffHeartCrop = orderData.customerHeartCrop;
      }

      await orderRef.update(updates);

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('approveOrder error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

// ── Report an issue (customer flags a problem from the preview) ───────────────
// Token-gated (only someone with the preview link can call it). Records the note
// on the order, flips a review_sent order to 'issue' so it surfaces on the staff
// dashboard, and emails support@ so it's seen even if no one is watching the
// dashboard. Deliberately one-way: the back-and-forth then happens over email.
exports.reportOrderIssue = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const { token, message } = req.body;
    if (!token) return res.status(403).json({ error: 'Token required' });
    const note = String(message || '').trim().slice(0, 1000);
    if (!note) return res.status(400).json({ error: 'Message required' });

    try {
      const db = admin.firestore();
      const snapshot = await db.collection('orders')
        .where('previewToken', '==', token)
        .limit(1)
        .get();

      if (snapshot.empty) return res.status(403).json({ error: 'Invalid or expired token' });

      const orderRef  = snapshot.docs[0].ref;
      const orderData = snapshot.docs[0].data();

      const updates = {
        issueNote:       note,
        issueReportedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      // Only knock the order back to 'issue' from the preview stage — never
      // clobber an approved/paid/in-production order's status. The note + email
      // still land so staff see it regardless.
      if (orderData.status === 'review_sent') {
        updates.status = 'issue';
        updates.statusHistory = admin.firestore.FieldValue.arrayUnion({
          status: 'issue',
          timestamp: admin.firestore.Timestamp.now(),
        });
      }
      await orderRef.update(updates);

      try {
        const transporter = createTransporter();
        await transporter.sendMail({
          from:    FROM.orders.from,
          to:      'support@aevia.at',
          replyTo: orderData.email || undefined,
          subject: `Issue reported — ${orderData.orderNumber}`,
          html: `
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#2a2a2a;line-height:1.6">
              <p><strong>${orderData.orderNumber}</strong> — the customer reported an issue with their book.</p>
              <p><strong>Customer:</strong> ${orderData.customerName || '—'} (${orderData.email || '—'})<br>
                 <strong>Current status:</strong> ${orderData.status || '—'}</p>
              <p><strong>Their message:</strong></p>
              <blockquote style="margin:0;padding:10px 14px;border-left:3px solid #dc2626;background:#fff5f5;white-space:pre-wrap">${note.replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</blockquote>
              <p style="margin-top:16px"><a href="https://aevia-test.pages.dev/pages/staff/dashboard.html">Open the staff dashboard →</a></p>
            </div>`,
        });
      } catch (mailErr) {
        // The note is already saved; don't fail the customer's request if the
        // email hiccups — staff still see the flag on the dashboard.
        console.error('reportOrderIssue email error:', mailErr);
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('reportOrderIssue error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

// ── Save staff book state (assignments + captions) ───────────────────────────
// Accepts { orderNumber, bookAssignments, bookCaptions } with x-staff-key header
exports.saveStaffState = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Staff-Key, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    if (!(await isStaff(req))) {
      return res.status(403).json({ error: 'Unauthorised' });
    }

    const { orderNumber, bookAssignments, bookCaptions, bookSequence,
            coverCaptionStyles, spreadCaptionStyles, heartCrop,
            bookComplete, incompleteReasons } = req.body;
    if (!orderNumber) return res.status(400).json({ error: 'orderNumber required' });

    try {
      const db = admin.firestore();
      const doc = await db.collection('orders').doc(orderNumber).get();
      if (!doc.exists) return res.status(404).json({ error: `Order ${orderNumber} not found` });

      await doc.ref.update({
        staffBookAssignments: bookAssignments || null,
        staffBookCaptions:    bookCaptions    || null,
        staffBookSequence:    bookSequence    || null,
        staffCoverCaptionStyles:  coverCaptionStyles  || null,
        staffSpreadCaptionStyles: spreadCaptionStyles || null,
        staffHeartCrop:       heartCrop || null,
        staffBookComplete:    bookComplete === true,
        staffIncompleteReasons: incompleteReasons || [],
        staffSavedAt:         admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('saveStaffState error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

// ── Save book state to GCS (staff tool) ──────────────────────────────────────
// Accepts { orderNumber, bookState } with x-staff-key header
// Writes book-state.json to GCS at {folderName}/book-state.json
exports.saveBookState = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Staff-Key, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    if (!(await isStaff(req))) {
      return res.status(403).json({ error: 'Unauthorised' });
    }

    const { orderNumber, bookState } = req.body;
    if (!orderNumber) return res.status(400).json({ error: 'orderNumber required' });
    if (!bookState) return res.status(400).json({ error: 'bookState required' });

    try {
      const db = admin.firestore();
      const doc = await db.collection('orders').doc(orderNumber).get();
      if (!doc.exists) return res.status(404).json({ error: `Order ${orderNumber} not found` });

      const order = doc.data();
      const folderName = order.folderName;
      if (!folderName) return res.status(400).json({ error: 'Order has no folderName' });

      const { Storage } = require('@google-cloud/storage');
      const storage = new Storage({ keyFilename: './serviceAccountKey.json' });
      const bucket = storage.bucket('aevia-uploads-eu');
      const gcsPath = `${folderName}/book-state.json`;
      const jsonString = JSON.stringify(bookState, null, 2);

      await bucket.file(gcsPath).save(jsonString, { contentType: 'application/json' });

      return res.status(200).json({ success: true, gcsPath });
    } catch (err) {
      console.error('saveBookState error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

// ── Generate PDF (chunk-024) ─────────────────────────────────────────────────
// Staff-triggered from the dashboard. Delegates to the Cloud Run pdf-renderer
// service which reads photos from GCS in-region (no egress) and renders the PDF.
// The service URL is configured via the PDF_RENDERER_URL environment variable.
// generatePdf is a thin TRIGGER, not a synchronous waiter. The render takes
// 3–13 min depending on book size — far longer than a Cloud Function can stay
// alive — so we fire the Cloud Run renderer, confirm it has started (by polling
// the pdfRender.status it writes to Firestore, which covers cold starts), then
// return immediately. The dashboard polls getPdfStatus for live progress + the
// final signed URL. Cloud Run keeps rendering after this function disconnects.
exports.generatePdf = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 60, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Staff-Key, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    if (!(await isStaff(req))) {
      return res.status(403).json({ error: 'Unauthorised' });
    }

    const { orderNumber } = req.body;
    if (!orderNumber) return res.status(400).json({ error: 'orderNumber required' });

    const rendererUrl = process.env.PDF_RENDERER_URL;
    if (!rendererUrl) return res.status(500).json({ error: 'PDF_RENDERER_URL not configured' });

    try {
      // Verify order exists and has valid status
      const db = admin.firestore();
      const docRef = db.collection('orders').doc(orderNumber);
      const doc = await docRef.get();
      if (!doc.exists) return res.status(404).json({ error: `Order ${orderNumber} not found` });
      const order = doc.data();
      if (!['approved', 'paid', 'new'].includes(order.status)) {
        return res.status(400).json({ error: `Order status '${order.status}' is not eligible for PDF generation` });
      }

      // Pre-empt the silent 0%-forever hang: the renderer builds the book from
      // staffBookSequence/staffBookAssignments (written by "Save book state" in the
      // engine). If they're missing, there are no spreads to render — the renderer
      // sits at total=0 until the dashboard's 16-min poll ceiling. Catch it here.
      if (!Array.isArray(order.staffBookSequence) || order.staffBookSequence.length === 0) {
        return res.status(400).json({
          error: 'This book hasn’t been saved yet. Open it in the template engine and press “Save book state” before generating the PDF.',
        });
      }

      // Mark queued so the dashboard sees movement instantly, even before Cloud Run
      // (possibly cold-starting) writes its first 'rendering' status.
      await docRef.update({ pdfRender: { status: 'starting', updatedAt: new Date() } });

      // Fire the renderer. We deliberately do NOT await it to completion — Cloud Run
      // continues server-side after we disconnect. .catch swallows the expected
      // connection drop when this function returns and freezes.
      fetch(`${rendererUrl}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber }),
      }).catch(() => {});

      // Confirm the render actually started (Cloud Run sets status='rendering' first
      // thing). Poll up to ~45s to absorb a cold start, then return.
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const deadline = Date.now() + 45000;
      while (Date.now() < deadline) {
        await sleep(1500);
        const pr = (await docRef.get()).data().pdfRender || {};
        if (pr.status === 'error') return res.status(500).json({ error: pr.error || 'Render failed to start' });
        if (pr.status === 'rendering' || pr.status === 'done') {
          return res.status(202).json({ started: true });
        }
      }
      return res.status(504).json({ error: 'Renderer did not start in time — try again' });
    } catch (err) {
      console.error('generatePdf error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

// ── Get PDF render status (chunk-024, polling) ───────────────────────────────
// The dashboard polls this for the progress bar. Returns the order's pdfRender
// field; when status is 'done', also mints the signed preview URL (the renderer
// can't sign — no private key; this function has serviceAccountKey.json).
exports.getPdfStatus = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Staff-Key, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    if (!(await isStaff(req))) {
      return res.status(403).json({ error: 'Unauthorised' });
    }

    const { orderNumber } = req.body;
    if (!orderNumber) return res.status(400).json({ error: 'orderNumber required' });

    try {
      const db = admin.firestore();
      const doc = await db.collection('orders').doc(orderNumber).get();
      if (!doc.exists) return res.status(404).json({ error: `Order ${orderNumber} not found` });
      const order = doc.data();
      const pr = order.pdfRender || { status: 'none' };

      const out = {
        status:    pr.status || 'none',
        done:      pr.done    || 0,
        total:     pr.total   || 0,
        sizeBytes: pr.sizeBytes || 0,
        error:     pr.error   || null,
      };

      if (pr.status === 'done') {
        const folderName = order.folderName;
        const gcsPath = pr.gcsPath || `${folderName}/pdfs/${orderNumber}_preview.pdf`;
        const { Storage } = require('@google-cloud/storage');
        const storage = new Storage({ keyFilename: './serviceAccountKey.json' });
        const bucket  = storage.bucket('aevia-uploads-eu');
        const expires = new Date(Date.now() + 60 * 60 * 1000);
        const [url] = await bucket.file(gcsPath).getSignedUrl({ action: 'read', version: 'v4', expires });
        out.previewUrl = url;
      }

      return res.status(200).json(out);
    } catch (err) {
      console.error('getPdfStatus error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

// ── HEIC → JPEG converter ────────────────────────────────────────────────────
exports.convertHeic = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 120, memory: '1GB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

    try {
      const heicConvert = require('heic-convert');
      const sharp = require('sharp');
      const exifr = require('exifr');
      const inputBuffer = req.rawBody;
      if (!inputBuffer || inputBuffer.length === 0) {
        res.status(400).json({ error: 'Empty body' });
        return;
      }

      // Read EXIF orientation from the original HEIC before conversion
      // (heic-convert strips EXIF, so we must capture it first)
      let exifOrientation = 1;
      try {
        const exif = await exifr.parse(inputBuffer, ['Orientation']);
        if (exif && exif.Orientation) exifOrientation = exif.Orientation;
        console.log('HEIC EXIF orientation:', exifOrientation);
      } catch (e) { console.warn('EXIF read failed:', e.message); }

      // Convert HEIC → JPEG (pixels only, no rotation applied yet)
      const jpegBuffer = await heicConvert({
        buffer: inputBuffer,
        format: 'JPEG',
        quality: 0.9,
      });

      // Physically rotate pixels so output JPEG needs no rotation tag.
      // EXIF orientation values → degrees: 3=180°, 6=90° CW, 8=90° CCW
      const rotationMap = { 3: 180, 6: 90, 8: -90 };
      const rotateDeg = rotationMap[exifOrientation] || 0;
      let finalBuffer = Buffer.from(jpegBuffer);
      if (rotateDeg !== 0) {
        finalBuffer = await sharp(finalBuffer).rotate(rotateDeg).jpeg({ quality: 90 }).toBuffer();
        console.log(`Rotated JPEG by ${rotateDeg}°`);
      }

      res.set('Content-Type', 'image/jpeg');
      res.send(finalBuffer);
    } catch (err) {
      console.error('convertHeic error:', err);
      res.status(500).json({ error: err.message });
    }
  });

// ── Create Checkout Session (Stripe payment) ─────────────────────────────────
exports.createCheckoutSession = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Staff-Key, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const hasStaffAuth = await isStaff(req);
    const { orderNumber, token } = req.body;

    // Auth: require either staff key or customer token
    if (!hasStaffAuth && !token) {
      return res.status(403).json({ error: 'Unauthorised' });
    }

    try {
      const db = admin.firestore();
      let order;
      let resolvedOrderNumber;

      if (hasStaffAuth) {
        // Staff path: fetch by orderNumber
        if (!orderNumber) return res.status(400).json({ error: 'orderNumber required' });
        const doc = await db.collection('orders').doc(orderNumber).get();
        if (!doc.exists) return res.status(404).json({ error: `Order ${orderNumber} not found` });
        order = doc.data();
      } else {
        // Customer path: fetch by previewToken
        if (!token) return res.status(400).json({ error: 'token required' });
        const snapshot = await db.collection('orders')
          .where('previewToken', '==', token)
          .limit(1)
          .get();

        if (snapshot.empty) {
          return res.status(403).json({ error: 'Invalid or expired token' });
        }

        order = snapshot.docs[0].data();
        resolvedOrderNumber = snapshot.docs[0].id;
      }

      const orderNum = hasStaffAuth ? (order.orderNumber || orderNumber) : resolvedOrderNumber;

      // Validate order status is approved
      if (order.status !== 'approved') {
        return res.status(409).json({ error: 'Order must be approved before payment' });
      }

      // Construct success/cancel URLs with token
      const baseUrl = 'https://aevia-test.pages.dev/pages/customer-preview.html';
      const successUrl = `${baseUrl}?token=${token || order.previewToken}&payment=success`;
      const cancelUrl = `${baseUrl}?token=${token || order.previewToken}`;

      // Pick the Stripe price by book size: 80-page books use STRIPE_PRICE_ID_80,
      // everything else the 40-page STRIPE_PRICE_ID_40 (both set in functions/.env).
      // Server-controlled — the price is NEVER taken from the client order amount.
      // Each var falls back to the legacy STRIPE_PRICE_ID so payment never breaks if
      // one is unset (it just bills the legacy price until the new vars are configured).
      const price40 = process.env.STRIPE_PRICE_ID_40 || process.env.STRIPE_PRICE_ID;
      const price80 = process.env.STRIPE_PRICE_ID_80 || price40;
      const priceId = (Number(order.pageCount) >= 80) ? price80 : price40;

      // Look up saved address for pre-fill + the Stripe Customer id, from the
      // same customer doc (best-effort — never blocks checkout).
      let savedAddress = null;
      let stripeCustomerId = null;
      const customerEmail = normalizeEmail(order.email);
      if (customerEmail) {
        try {
          const custRef = db.collection('customers').doc(customerEmail);
          const custDoc = await custRef.get();
          if (custDoc.exists) {
            savedAddress = custDoc.data().shippingAddress || null;
            stripeCustomerId = custDoc.data().stripeCustomerId || null;
          }
          // Attach a Stripe Customer keyed by email so Stripe can enforce
          // per-customer promo rules. The referral share code is
          // first_time_transaction only, which Stripe checks against the
          // Customer's payment history — without a Customer it never binds and
          // a returning buyer could reuse the discount. Create once, cache the
          // id, reuse on every later order for this email.
          if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
              email: customerEmail,
              name: order.customerName || undefined,
            });
            stripeCustomerId = customer.id;
            await custRef.set({
              stripeCustomerId,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
          }
        } catch (e) {
          console.warn('createCheckoutSession: customer lookup/attach failed', e.message);
        }
      }

      const sessionParams = {
        mode: 'payment',
        // Show Stripe's hosted "Add promotion code" field. Inert until a coupon/
        // promotion code exists in the Stripe account (Phase 1 F&F: FRIENDS30).
        allow_promotion_codes: true,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          orderNumber: orderNum,
          token: token || order.previewToken,
        },
      };

      // Bind the session to the Stripe Customer so first_time_transaction and
      // any future per-customer promo restrictions actually apply.
      if (stripeCustomerId) sessionParams.customer = stripeCustomerId;

      if (savedAddress) {
        // Signed-in customer with an Aevia-owned saved address: pass it straight to
        // the PaymentIntent so they never retype it, and skip Stripe's address form.
        // shipping_details is read-only on create — payment_intent_data.shipping is
        // the valid create-time param (verified against Stripe docs, S91).
        sessionParams.payment_intent_data = {
          shipping: {
            address: savedAddress,
            name: order.customerName || order.email || 'Customer',
          },
        };
        // Because we skip shipping_address_collection, the webhook won't see an
        // address on the session — stamp it onto the order now so staff/print have it.
        try {
          await db.collection('orders').doc(orderNum).update({ shippingAddress: savedAddress });
        } catch (e) {
          console.warn('createCheckoutSession: could not stamp saved address on order', e.message);
        }
      } else {
        // Guests: Stripe's hosted checkout collects the shipping address (Austria only).
        sessionParams.shipping_address_collection = { allowed_countries: ['AT'] };
      }

      // Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create(sessionParams);

      return res.status(200).json({ url: session.url });
    } catch (err) {
      console.error('createCheckoutSession error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

// ── Referral reward (promo codes Phase 2) ────────────────────────────────────
// Called by stripeWebhook after an order flips to paid. If the session used a
// referral share code (looked up via the referralCodes/{promotionCodeId} index),
// mint the referrer a single-use €10 reward code, store it on their customer
// doc, stamp the order for audit, and email them. Idempotent: the webhook's
// already-paid guard stops redelivered events upstream, and the order's
// referrerRewardIssued flag covers a crash-retry after the paid flip.
// Errors here are caught by the caller — a referral hiccup must never break
// the payment flow.
// Count a customer email's OTHER paid orders (excluding the current one). Used
// as the DB-side first-time-customer guard for referral rewards. Filters status
// in code (not a compound where) so no composite Firestore index is needed —
// order counts per email are tiny at F&F scale.
async function countPriorPaidOrders(db, email, excludeOrderNumber) {
  const norm = normalizeEmail(email);
  if (!norm) return 0;
  const snap = await db.collection('orders').where('email', '==', norm).get();
  let count = 0;
  snap.forEach((doc) => {
    if (doc.id === excludeOrderNumber) return;
    if (doc.data().status === 'paid') count++;
  });
  return count;
}

async function handleReferralReward(db, session, orderRef, order, orderNumber) {
  // Cheap pre-check: no discount on the session → no code was used.
  if (!session.total_details?.amount_discount) return;

  // The webhook payload omits the discount breakdown — re-fetch with it expanded.
  const full = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['total_details.breakdown'],
  });
  const promoId = extractPromotionCodeId(full);
  if (!promoId) return;

  const refDoc = await db.collection('referralCodes').doc(promoId).get();
  const referral = refDoc.exists ? refDoc.data() : null;
  // Only count prior paid orders when a real referral code was used (skips the
  // query for FRIENDS30 / unknown codes, which resolve to no_referral anyway).
  const refereePriorPaidOrders = referral
    ? await countPriorPaidOrders(db, order.email, orderNumber)
    : 0;
  const decision = referrerRewardDecision({
    paymentStatus: session.payment_status,
    order,
    referral,
    refereePriorPaidOrders,
  });
  if (!decision.issue) {
    if (decision.reason !== 'no_referral') {
      console.log('Referral reward skipped:', decision.reason, orderNumber);
    }
    return;
  }

  const referrerEmail = decision.referrerEmail;
  const couponId = process.env.STRIPE_REFERRAL_COUPON_ID;
  if (!couponId) {
    console.warn('Referral reward: STRIPE_REFERRAL_COUPON_ID not set, skipping', orderNumber);
    return;
  }

  // Mint the single-use €10 reward code (retry on the rare code collision).
  // Rewards expire 12 months after issue — generous, but no open-ended liability.
  const expiresAt = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
  let reward = null;
  for (let attempt = 0; attempt < 4 && !reward; attempt++) {
    try {
      reward = await stripe.promotionCodes.create({
        coupon: couponId,
        code: generateReferralCode('Thanks'),
        max_redemptions: 1,
        expires_at: expiresAt,
        metadata: { aevia_kind: 'referral_reward', referrerEmail, referredOrder: orderNumber },
      });
    } catch (e) {
      if (e && e.code === 'resource_already_exists') continue;
      throw e;
    }
  }
  if (!reward) throw new Error('could not mint reward code after retries');

  // Audit + idempotency on the order and the reward onto the referrer's
  // customer doc, in ONE batch — a crash can't leave the flag set without the
  // reward (or vice versa), so a webhook redelivery can't double-issue.
  const rewardBatch = db.batch();
  rewardBatch.update(orderRef, { referredBy: referrerEmail, referrerRewardIssued: true });
  rewardBatch.set(db.collection('customers').doc(referrerEmail), {
    rewardCodes: admin.firestore.FieldValue.arrayUnion(reward.code),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  await rewardBatch.commit();

  console.log('Referral reward issued:', reward.code, 'to', referrerEmail, 'for', orderNumber);

  // Tell the referrer — without this they would never know to check their account.
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      ...FROM.customer,
      to: referrerEmail,
      subject: 'You earned 10 € off your next Aevia book',
      html: renderEmail(`
        <p style="margin:0 0 22px">A friend ordered their Aevia book with your referral code. As a thank-you, here is 10&nbsp;&euro; off your next order:</p>
        <p style="margin:0 0 22px;font-family:Georgia,serif;font-size:22px;letter-spacing:.06em"><strong>${reward.code}</strong></p>
        <p style="margin:0;font-size:15px;color:#6a6a6a;line-height:1.7">Enter it at checkout on your next book. It works once and stays valid for 12 months. You can also find it any time in your account.</p>
      `, { support: true }),
    });
  } catch (e) {
    console.warn('Referral reward email failed (code still issued):', e.message);
  }
}

// ── Stripe Webhook (payment completion) ──────────────────────────────────────
exports.stripeWebhook = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      // Verify Stripe signature
      const signature = req.headers['stripe-signature'];
      const event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      // Handle checkout.session.completed event
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const orderNumber = session.metadata?.orderNumber;
        const token = session.metadata?.token;

        if (!orderNumber) {
          console.warn('Webhook: no orderNumber in metadata');
          return res.status(200).json({ received: true });
        }

        const db = admin.firestore();
        const orderRef = db.collection('orders').doc(orderNumber);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
          console.warn('Webhook: order not found:', orderNumber);
          return res.status(200).json({ received: true });
        }

        const order = orderDoc.data();

        // Idempotency guard — Stripe may deliver the same event more than once
        if (order.status === 'paid') {
          console.log('Webhook: order already paid, skipping:', orderNumber);
          return res.status(200).json({ received: true });
        }

        // Save shipping address from Stripe session
        const shippingAddress = session.shipping_details?.address || null;
        const orderUpdate = {
          status: 'paid',
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          statusHistory: admin.firestore.FieldValue.arrayUnion({
            status: 'paid',
            timestamp: admin.firestore.Timestamp.now(),
          }),
        };
        if (shippingAddress) orderUpdate.shippingAddress = shippingAddress;

        // Update order status to 'paid' and append to statusHistory
        await orderRef.update(orderUpdate);

        // Persist address to customer record for future pre-fill
        if (shippingAddress && order.email) {
          const customerEmail = normalizeEmail(order.email);
          if (customerEmail) {
            const db2 = admin.firestore();
            await db2.collection('customers').doc(customerEmail).set(
              { shippingAddress, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
              { merge: true }
            );
          }
        }

        // Referral attribution + referrer reward (promo codes Phase 2).
        // Isolated so a Stripe/Firestore hiccup here never breaks the paid flow.
        try {
          await handleReferralReward(db, session, orderRef, order, orderNumber);
        } catch (e) {
          console.error('Webhook referral reward failed (order still marked paid):', e);
        }

        // Send staff notification email
        const transporter = createTransporter();

        await transporter.sendMail({
          ...FROM.orders,
          to: process.env.EMAIL_NOTIFY,
          subject: `[${orderNumber}] Payment received — ready for print`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;color:#333">
              <h2 style="border-bottom:2px solid #eee;padding-bottom:12px">
                Payment Received
              </h2>
              <p style="margin:16px 0">Payment confirmed for order <strong>${orderNumber}</strong>.</p>
              <p style="margin:16px 0">Customer: <strong>${order.customerName}</strong></p>
              <p style="margin:16px 0">The book is ready to be sent to print.</p>
              <p style="color:#999;font-size:12px;margin-top:24px">
                Received ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/London' })}
              </p>
            </div>
          `,
        });

        // Customer payment confirmation (TO-DO #56 — previously missing)
        if (order.email) {
          await transporter.sendMail({
            ...FROM.customer,
            to: order.email,
            subject: `Payment received for your Aevia order ${orderNumber}`,
            html: renderEmail(`
              <p style="margin:0 0 18px">Hi ${order.customerName || ''},</p>
              <p style="margin:0 0 22px">Thank you. We've received your payment for order <strong>${orderNumber}</strong>, and your book is on its way to print.</p>
              <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#8a8a8a">What happens next</p>
              <p style="margin:0;font-size:15px;color:#6a6a6a;line-height:1.7">We'll email you again with tracking as soon as your book ships.</p>
            `, { support: true }),
          });
        }

        console.log('Order paid:', orderNumber);
      }

      // Always return 200 for webhook success
      return res.status(200).json({ received: true });
    } catch (err) {
      console.error('stripeWebhook error:', err);
      return res.status(400).json({ error: err.message });
    }
  });

// ── Get PDF signed URL (staff tool) ─────────────────────────────────────────
// Accepts { orderNumber, type } with x-staff-key header
// Returns { url } — signed GCS URL (1h expiry) if file exists, or { url: null } if not
exports.getPdfUrl = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Staff-Key, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    if (!(await isStaff(req))) {
      return res.status(403).json({ error: 'Unauthorised' });
    }

    const { orderNumber, type } = req.body;
    if (!orderNumber) return res.status(400).json({ error: 'orderNumber required' });
    if (!type || !['preview', 'print'].includes(type)) {
      return res.status(400).json({ error: 'type must be "preview" or "print"' });
    }

    try {
      const db = admin.firestore();
      const doc = await db.collection('orders').doc(orderNumber).get();
      if (!doc.exists) return res.status(404).json({ error: `Order ${orderNumber} not found` });

      const order = doc.data();
      const folderName = order.folderName;
      if (!folderName) return res.status(400).json({ error: 'Order has no folderName' });

      const { Storage } = require('@google-cloud/storage');
      const storage = new Storage({ keyFilename: './serviceAccountKey.json' });
      const bucket = storage.bucket('aevia-uploads-eu');
      const gcsPath = `${folderName}/pdfs/${orderNumber}_${type}.pdf`;

      // Check if file exists
      const [exists] = await bucket.file(gcsPath).exists();
      if (!exists) {
        return res.status(200).json({ url: null });
      }

      // Generate 1-hour signed URL
      const expires = new Date(Date.now() + 60 * 60 * 1000);
      const [url] = await bucket.file(gcsPath).getSignedUrl({
        action: 'read',
        version: 'v4',
        expires
      });

      return res.status(200).json({ url });
    } catch (err) {
      console.error('getPdfUrl error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

// ── Mark order as sent to print (staff tool) ────────────────────────────────
// Accepts { orderNumber } with x-staff-key header
// Transitions order from 'paid' to 'sent_to_print', guarded against wrong state
exports.markSentToPrint = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Staff-Key, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    if (!(await isStaff(req))) {
      return res.status(403).json({ error: 'Unauthorised' });
    }

    const { orderNumber } = req.body;
    if (!orderNumber) return res.status(400).json({ error: 'orderNumber required' });

    try {
      const db = admin.firestore();
      const doc = await db.collection('orders').doc(orderNumber).get();
      if (!doc.exists) return res.status(404).json({ error: `Order ${orderNumber} not found` });

      const order = doc.data();

      // Guard: only transition from 'paid' status (idempotency + state guard)
      if (order.status !== 'paid') {
        return res.status(409).json({ error: 'Order must be in paid status' });
      }

      // Transition to 'sent_to_print' with server timestamp and statusHistory entry
      // NOTE (S11 invariant): Timestamp.now() inside arrayUnion, not serverTimestamp()
      await doc.ref.update({
        status: 'sent_to_print',
        sentToPrintAt: admin.firestore.FieldValue.serverTimestamp(),
        statusHistory: admin.firestore.FieldValue.arrayUnion({
          status: 'sent_to_print',
          timestamp: admin.firestore.Timestamp.now()
        })
      });

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('markSentToPrint error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

// ── Send preview to customer ─────────────────────────────────────────────────
// Staff-triggered from the dashboard "Send preview to customer" button. Does two
// things in one atomic step: (1) transitions the order to 'review_sent' and
// captures an immutable snapshot of the staff book state (with the send time),
// and (2) emails the customer the branded preview-ready message with their link.
// Separated from generatePreviewLink (which only mints the token for staff QA) so
// an incomplete or unreviewed book never reaches a customer. Safe to call again
// to resend — it re-stamps sentAt and re-sends the email without duplicating the
// status-history entry.
const PRE_APPROVAL_STATUSES = ['uploading', 'new', 'designing', 'needs_info', 'review_sent'];

exports.sendPreviewEmail = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, X-Staff-Key, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    if (!(await isStaff(req))) {
      return res.status(403).json({ error: 'Unauthorised' });
    }

    const { orderNumber } = req.body;
    if (!orderNumber) return res.status(400).json({ error: 'orderNumber required' });

    try {
      const db = admin.firestore();
      const ref = db.collection('orders').doc(orderNumber);
      const doc = await ref.get();
      if (!doc.exists) return res.status(404).json({ error: `Order ${orderNumber} not found` });

      const order = doc.data();

      // Gate 1: a link must exist (staff generates + QAs it first).
      if (!order.previewToken) {
        return res.status(409).json({ error: 'Generate a preview link first, then send it.' });
      }
      // Gate 2: only send while the order is still awaiting the customer. Past
      // approval, the customer has already seen and accepted the book.
      if (!PRE_APPROVAL_STATUSES.includes(order.status)) {
        return res.status(409).json({ error: `Order is already past the preview stage (${order.status}).` });
      }
      // Gate 3: the book must be saved as complete in the engine — never send a
      // half-finished book. staffBookComplete is stamped on save (book-completeness.js).
      if (order.staffBookComplete !== true) {
        const reasons = (order.staffIncompleteReasons && order.staffIncompleteReasons.length)
          ? order.staffIncompleteReasons.join(', ')
          : 'the book has not been saved as complete yet';
        return res.status(409).json({ error: `Book is not ready to send — ${reasons}.` });
      }

      // Capture the immutable snapshot of what the customer is about to see,
      // stamped with the send time. Read straight from the order doc so this is
      // authoritative (not whatever a stale browser tab holds).
      const sentSnapshot = {
        bookAssignments:     order.staffBookAssignments     || null,
        bookCaptions:        order.staffBookCaptions         || null,
        bookSequence:        order.staffBookSequence         || null,
        coverCaptionStyles:  order.staffCoverCaptionStyles   || null,
        spreadCaptionStyles: order.staffSpreadCaptionStyles  || null,
        sentAt:              admin.firestore.FieldValue.serverTimestamp(),
      };

      const update = { status: 'review_sent', sentSnapshot };
      // Only add a history entry on the first transition into review_sent — a
      // resend re-stamps sentAt but shouldn't pile up duplicate history rows.
      if (order.status !== 'review_sent') {
        update.statusHistory = admin.firestore.FieldValue.arrayUnion({
          status: 'review_sent',
          timestamp: admin.firestore.Timestamp.now(),
        });
      }
      await ref.update(update);

      // Email the customer their preview link (S105-approved shell).
      const previewUrl = `https://aevia-test.pages.dev/pages/customer-preview.html?token=${order.previewToken}`;
      const pagesRow = order.pageCount
        ? `<tr class="div">
             <td style="padding:6px 0;border-top:1px solid #f0eee9;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#8a8a8a">Pages</td>
             <td style="padding:6px 0;border-top:1px solid #f0eee9;font-size:16px;color:#2a2a2a;text-align:right">${order.pageCount}</td>
           </tr>`
        : '';

      const transporter = createTransporter();
      await transporter.sendMail({
        ...FROM.customer,
        to:      order.email,
        subject: `Your Aevia preview is ready — ${orderNumber}`,
        html: renderEmail(`
          <p style="margin:0 0 18px">Hi ${order.customerName},</p>
          <p style="margin:0 0 22px">Your book is ready to see. We've designed your <strong>${order.templateName}</strong> book from the photos you sent, and you can look through every page now.</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e2e2;border-radius:4px;margin:0 0 22px">
            <tr><td style="padding:16px 20px 4px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#8a8a8a">Order</td>
                  <td style="padding:6px 0;font-size:16px;color:#2a2a2a;text-align:right">${orderNumber}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0;border-top:1px solid #f0eee9;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#8a8a8a">Book</td>
                  <td style="padding:6px 0;border-top:1px solid #f0eee9;font-size:16px;color:#2a2a2a;text-align:right">${order.templateName}</td>
                </tr>
                ${pagesRow}
              </table>
            </td></tr>
          </table>

          ${emailButton(previewUrl, 'View your book')}

          <p style="margin:26px 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#8a8a8a">Before you approve</p>
          <p style="margin:0;font-size:15px;color:#6a6a6a;line-height:1.7">Take your time. You can move a photo or fix a caption yourself, right on the page. When it looks right, approve it and we'll take you to payment. Nothing is charged until you approve.</p>
        `, { support: true }),
      });

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('sendPreviewEmail error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

// ── Generate web-resolution photo derivatives (chunk-023) ────────────────────
// GCS Storage trigger: onFinalize for all files in the bucket.
// When an original photo is uploaded, generates a ~1600px long-edge JPEG derivative.
// Skips files already under a 'previews/' path (avoid infinite recursion).
// Skips non-image objects (avoid crashes on text/JSON/PDF).
//
// Derivative spec: ~1600px long edge, JPEG quality ~80 (screen-only, not print).
// Naming: original `<folder>/<category>/<name>` → derivative `<folder>/<category>/previews/<name>`
// This allows getOrder to derive the derivative URL from the original's storedName path.
const { deriveDerivativePath, isDerivativePath, isImageFile } = require('./derivative-utils');

exports.generateDerivative = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 120, memory: '1GB' })
  .storage.bucket('aevia-uploads-eu').object().onFinalize(async (object, context) => {
    const storagePath = object.name; // Full path in GCS
    const bucketName = object.bucket;

    // Guard 1: Skip objects already under a 'previews/' path (avoid infinite recursion)
    if (isDerivativePath(storagePath)) {
      console.log(`Skipping derivative path: ${storagePath}`);
      return;
    }

    // Guard 2: Skip non-image objects (avoid crashes when sharp decodes them)
    if (!isImageFile(storagePath)) {
      console.log(`Skipping non-image file: ${storagePath}`);
      return;
    }

    try {
      const sharp = require('sharp');
      const { Storage } = require('@google-cloud/storage');
      const storage = new Storage();
      const bucket = storage.bucket(bucketName);

      // Download the original photo
      const originalFile = bucket.file(storagePath);
      const [originalBuffer] = await originalFile.download();

      // Generate web-resolution derivative (~1600px long edge, JPEG quality 80)
      const derivativeBuffer = await sharp(originalBuffer)
        .resize(1600, 1600, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();

      // Derive the destination path from the original (pure function, no Firestore)
      const derivativePath = deriveDerivativePath(storagePath);
      if (!derivativePath) {
        console.error(`Could not derive derivative path for: ${storagePath}`);
        return;
      }

      // Upload the derivative to GCS
      const derivativeFile = bucket.file(derivativePath);
      await derivativeFile.save(derivativeBuffer, {
        contentType: 'image/jpeg',
        metadata: {
          cacheControl: 'public, max-age=31536000', // 1 year (content-hash is the version)
        },
      });

      const sizeKB = Math.round(derivativeBuffer.length / 1024);
      console.log(`Generated derivative: ${derivativePath} (${sizeKB} KB)`);
    } catch (err) {
      console.error(`Error generating derivative for ${storagePath}:`, err);
      // Don't re-throw — log and continue so the function doesn't fail completely
      // (subsequent retries would cause duplicate derivatives)
    }
  });

// ── Artist application (Our Artists page "Work with us" form) ────────────────
// Accepts JSON { name, email, work, note } and emails it to hello@aevia.at.
// Public form → CORS open, no auth. Email-only, no storage, no infra cost.
// Recipient is set in email.js FROM.artists — change there if it moves.
exports.submitArtistApplication = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    try {
      const { name, email, work, note } = req.body || {};

      // Server-side validation: name, valid email, at least one work link.
      const nameTrim = (name || '').trim();
      const emailTrim = (email || '').trim();
      const workTrim = (work || '').trim();
      const noteTrim = (note || '').trim();

      if (!nameTrim) return res.status(400).json({ error: 'Please tell us your name.' });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }
      if (!workTrim) return res.status(400).json({ error: 'Please share a link to your work.' });

      const esc = (s) => String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

      const transporter = createTransporter();

      await transporter.sendMail({
        ...FROM.artists,
        replyTo: emailTrim,
        subject: `New artist application — ${nameTrim}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;color:#333">
            <h2 style="border-bottom:2px solid #eee;padding-bottom:12px">New artist application</h2>
            <p style="margin:16px 0"><strong>Name:</strong> ${esc(nameTrim)}</p>
            <p style="margin:16px 0"><strong>Email:</strong> ${esc(emailTrim)}</p>
            <p style="margin:16px 0"><strong>Work:</strong> ${esc(workTrim)}</p>
            ${noteTrim ? `<p style="margin:16px 0"><strong>About:</strong><br>${esc(noteTrim).replace(/\n/g, '<br>')}</p>` : ''}
            <p style="color:#999;font-size:12px;margin-top:24px">
              Received ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/Vienna' })}
            </p>
          </div>
        `,
      });

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('submitArtistApplication error:', err);
      return res.status(500).json({ error: 'Something went wrong sending your message. Please try again.' });
    }
  });

// ── Customer account: list the signed-in customer's orders (Phase 1) ─────────
// Auth: verified Firebase ID token (Authorization: Bearer <idToken>). Ownership
// = orders whose `email` equals the token's verified email (normalised). We
// REQUIRE email_verified so a freshly-signed-up password user can't read orders
// for an address they haven't proven they own (Google sign-ins are verified).
// Returns a minimal, safe projection per order (see account-utils.js); the
// previewToken is handed back only for orders that have a viewable preview, so
// the account can deep-link into the existing customer-preview.html without the
// customer ever hunting a token. This AUGMENTS the token flow — getOrder and the
// edit/approve functions are untouched (ADR-0007).
exports.getMyOrders = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    // Verify the Firebase ID token.
    const m = (req.headers.authorization || '').match(/^Bearer (.+)$/);
    if (!m) return res.status(401).json({ error: 'Sign in to view your orders.' });

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(m[1]);
    } catch (e) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }

    const email = normalizeEmail(decoded.email);
    if (!email) return res.status(400).json({ error: 'No email on this account.' });

    // Require a verified email before exposing any orders for that address.
    if (!decoded.email_verified) {
      return res.status(403).json({ error: 'unverified', message: 'Please verify your email to see your orders.' });
    }

    try {
      const db = admin.firestore();
      const snap = await db.collection('orders').where('email', '==', email).get();
      const orders = snap.docs.map((d) => projectOrderForCustomer({ orderNumber: d.id, ...d.data() }));
      sortOrdersNewestFirst(orders);
      return res.status(200).json({ email, orders });
    } catch (err) {
      console.error('getMyOrders error:', err);
      return res.status(500).json({ error: 'Could not load your orders. Please try again.' });
    }
  });

// ── Get saved shipping address (customer) ────────────────────────────────────
exports.getMyAddress = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 10, memory: '128MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const auth = req.headers.authorization || '';
    const m = auth.match(/^Bearer (.+)$/);
    if (!m) return res.status(401).json({ error: 'Unauthorised' });

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(m[1]);
    } catch (e) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }

    const email = normalizeEmail(decoded.email);
    if (!email) return res.status(400).json({ error: 'No email on this account.' });
    if (!decoded.email_verified) {
      return res.status(403).json({ error: 'unverified' });
    }

    try {
      const db = admin.firestore();
      const doc = await db.collection('customers').doc(email).get();
      const data = doc.exists ? doc.data() : {};
      const address = data.shippingAddress || null;
      const name = data.shippingName || '';
      return res.status(200).json({ address, name });
    } catch (err) {
      console.error('getMyAddress error:', err);
      return res.status(500).json({ error: 'Could not load your address.' });
    }
  });

// ── Referral programme: get (or mint) the customer's share code ─────────────
// Promo codes Phase 2 (docs/briefs/promo-codes.md). Auth: verified Firebase ID
// token — referral codes are issued to VERIFIED account holders only. On first
// call this mints a unique Stripe promotion code (backed by the €10 coupon in
// STRIPE_REFERRAL_COUPON_ID, restricted to the referee's first order), stores
// it on customers/{email} and in the referralCodes/{promotionCodeId} reverse
// index that stripeWebhook uses for attribution. Subsequent calls just read.
// Also returns any earned reward codes so account.html can show them.
exports.getMyReferralCode = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '256MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const m = (req.headers.authorization || '').match(/^Bearer (.+)$/);
    if (!m) return res.status(401).json({ error: 'Sign in to see your referral code.' });

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(m[1]);
    } catch (e) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }

    const email = normalizeEmail(decoded.email);
    if (!email) return res.status(400).json({ error: 'No email on this account.' });
    if (!decoded.email_verified) {
      return res.status(403).json({ error: 'unverified' });
    }

    try {
      const db = admin.firestore();
      const custRef = db.collection('customers').doc(email);
      const custDoc = await custRef.get();
      const cust = custDoc.exists ? custDoc.data() : {};

      // Already minted — just return it (plus any earned rewards).
      if (cust.referralCode) {
        return res.status(200).json({ code: cust.referralCode, rewardCodes: cust.rewardCodes || [] });
      }

      const couponId = process.env.STRIPE_REFERRAL_COUPON_ID;
      if (!couponId) {
        console.warn('getMyReferralCode: STRIPE_REFERRAL_COUPON_ID not set');
        return res.status(503).json({ error: 'The referral programme is not available yet.' });
      }

      // Mint a unique share code. Stripe rejects duplicate active codes with
      // resource_already_exists, so retry with a fresh random suffix.
      const displayName = decoded.name || '';
      let promo = null;
      for (let attempt = 0; attempt < 4 && !promo; attempt++) {
        const candidate = generateReferralCode(displayName);
        try {
          promo = await stripe.promotionCodes.create({
            coupon: couponId,
            code: candidate,
            // Referee side: €10 off their FIRST order only. The share code is
            // multi-use (each new friend can redeem it once).
            restrictions: { first_time_transaction: true },
            metadata: { aevia_kind: 'referral_share', referrerEmail: email },
          });
        } catch (e) {
          if (e && e.code === 'resource_already_exists') continue; // collision — retry
          throw e;
        }
      }
      if (!promo) {
        return res.status(500).json({ error: 'Could not create your code. Please try again.' });
      }

      // Commit in a transaction: if a concurrent request already minted a code
      // for this customer (double-click race), keep THAT one, deactivate ours
      // in Stripe, and return the winner. Otherwise write the reverse index
      // (for webhook attribution) + mirror onto the customer doc atomically.
      const result = await db.runTransaction(async (tx) => {
        const fresh = await tx.get(custRef);
        const existing = fresh.exists ? fresh.data().referralCode : null;
        if (existing) return { code: existing, lostRace: true };
        tx.set(db.collection('referralCodes').doc(promo.id), {
          referrerEmail: email,
          code: promo.code,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        tx.set(custRef, {
          referralCode: promo.code,
          referralPromotionCodeId: promo.id,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        return { code: promo.code, lostRace: false };
      });

      if (result.lostRace) {
        // Best-effort cleanup of the orphaned Stripe code — never blocks the response.
        try { await stripe.promotionCodes.update(promo.id, { active: false }); }
        catch (e) { console.warn('getMyReferralCode: could not deactivate duplicate code', promo.id, e.message); }
      }

      return res.status(200).json({ code: result.code, rewardCodes: cust.rewardCodes || [] });
    } catch (err) {
      console.error('getMyReferralCode error:', err);
      return res.status(500).json({ error: 'Could not load your referral code. Please try again.' });
    }
  });

// ── Save shipping address (customer) ─────────────────────────────────────────
// Aevia-owned address form (account settings) writes here. Same auth gate as
// getMyAddress (verified ID token + email_verified). Stores to the same
// customers/{normalizedEmail} doc that getMyAddress reads and createCheckoutSession
// pre-fills from. Austria-only for now (trial phase) — enforced server-side.
exports.saveMyAddress = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 10, memory: '128MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const m = (req.headers.authorization || '').match(/^Bearer (.+)$/);
    if (!m) return res.status(401).json({ error: 'Unauthorised' });

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(m[1]);
    } catch (e) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }

    const email = normalizeEmail(decoded.email);
    if (!email) return res.status(400).json({ error: 'No email on this account.' });
    if (!decoded.email_verified) {
      return res.status(403).json({ error: 'unverified' });
    }

    // Build a clean address from the request — only the fields we store, all strings.
    const a = (req.body && req.body.address) || {};
    const str = (v) => (typeof v === 'string' ? v.trim() : '');
    const name = str(req.body && req.body.name);
    const address = {
      line1: str(a.line1),
      line2: str(a.line2),
      city: str(a.city),
      postal_code: str(a.postal_code),
      state: str(a.state),
      country: str(a.country).toUpperCase(),
    };

    // Required fields + Austria-only (trial phase).
    if (!name || !address.line1 || !address.city || !address.postal_code) {
      return res.status(400).json({ error: 'Please fill in your name, street, city and postal code.' });
    }
    if (address.country !== 'AT') {
      return res.status(400).json({ error: 'We currently ship to Austria only.' });
    }

    try {
      const db = admin.firestore();
      await db.collection('customers').doc(email).set(
        {
          shippingName: name,
          shippingAddress: address,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return res.status(200).json({ ok: true, address });
    } catch (err) {
      console.error('saveMyAddress error:', err);
      return res.status(500).json({ error: 'Could not save your address. Please try again.' });
    }
  });

// ── Signup verification email (Brevo-branded) ────────────────────────────────
// Auth onCreate trigger, NOT a public callable: no endpoint to spray means no
// account-existence enumeration, and Firebase retries it on failure so an account
// can't be created without its verification email being attempted. Fires for every
// new account; we skip anyone who is already verified (Google sign-in gives a
// verified email, so those users get nothing). account.html no longer calls the
// client-side sendEmailVerification() on signup — this owns it.
exports.onUserCreated = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 30, memory: '128MB' })
  .auth.user()
  .onCreate(async (user) => {
    if (!user.email || user.emailVerified) return; // Google/social already verified
    try {
      const link = await admin.auth().generateEmailVerificationLink(user.email, {
        url: `${ACCOUNT_URL}?verify=1`,
        handleCodeInApp: false,
      });
      const transporter = createTransporter();
      const name = (user.displayName || '').split(' ')[0];
      await transporter.sendMail({
        ...FROM.account,
        to: user.email,
        subject: 'Confirm your Aevia account',
        html: renderEmail(`
          <p style="margin:0 0 18px">Hi${name ? ' ' + name : ''},</p>
          <p style="margin:0 0 22px">Welcome to Aevia. Please confirm your email address to activate your account and see your orders.</p>
          ${emailButton(link, 'Confirm my email')}
          <p style="margin:22px 0 0;font-size:14px;color:#6a6a6a">If you didn't create an Aevia account, you can ignore this email.</p>
        `, { noReply: true }),
      });
    } catch (err) {
      // Logged, not thrown — Firebase retries onCreate on a thrown error, but a
      // bad/duplicate email would loop forever. Owner can watch logs for failures.
      console.error('onUserCreated verification email failed for', user.email, err);
    }
  });

// ── Resend verification email (Brevo-branded) ───────────────────────────────
// Authenticated callable for the "Resend the email" button. It can only ever
// email the signed-in user's OWN address (from the verified token), so it can't
// enumerate or spam a third party — but we still throttle to 5/hour per email so
// a scripted client can't flood that one inbox (matches sendPasswordResetEmail).
exports.resendVerificationEmail = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 20, memory: '128MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const m = (req.headers.authorization || '').match(/^Bearer (.+)$/);
    if (!m) return res.status(401).json({ error: 'Unauthorised' });
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(m[1]);
    } catch (e) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }
    if (decoded.email_verified) return res.status(200).json({ ok: true }); // already done
    const email = decoded.email;
    if (!email) return res.status(400).json({ error: 'No email on this account.' });

    try {
      // Per-email throttle: 5 resends/hour. Return the same success shape when
      // throttled so the UI just shows its normal cooldown.
      const db = admin.firestore();
      const ref = db.collection('resendThrottle').doc(normalizeEmail(email));
      const now = Date.now();
      const hourAgo = now - 60 * 60 * 1000;
      const snap = await ref.get();
      const recent = ((snap.exists && snap.data().times) || []).filter((t) => t > hourAgo);
      if (recent.length >= 5) return res.status(200).json({ ok: true }); // silently throttled
      recent.push(now);
      await ref.set({ times: recent }, { merge: true });

      const link = await admin.auth().generateEmailVerificationLink(email, {
        url: `${ACCOUNT_URL}?verify=1`,
        handleCodeInApp: false,
      });
      const transporter = createTransporter();
      const name = (decoded.name || '').split(' ')[0];
      await transporter.sendMail({
        ...FROM.account,
        to: email,
        subject: 'Confirm your Aevia account',
        html: renderEmail(`
          <p style="margin:0 0 18px">Hi${name ? ' ' + name : ''},</p>
          <p style="margin:0 0 22px">Here's your confirmation link again. Please confirm your email address to activate your account.</p>
          ${emailButton(link, 'Confirm my email')}
          <p style="margin:22px 0 0;font-size:14px;color:#6a6a6a">If you didn't create an Aevia account, you can ignore this email.</p>
        `, { noReply: true }),
      });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('resendVerificationEmail error for', email, err);
      return res.status(500).json({ error: 'Could not resend just now — try again shortly.' });
    }
  });

// ── Password reset email (Brevo-branded) ─────────────────────────────────────
// Must be user-initiated (they're locked out, can't be signed in), so it IS a
// public callable. Two safeguards against abuse: (1) always returns the same
// success response whether or not the email is registered (no account-existence
// disclosure); (2) per-email throttle of 3 requests/hour via a Firestore doc.
exports.sendPasswordResetEmail = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 20, memory: '128MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const email = normalizeEmail((req.body && req.body.email) || '');
    // Constant response — never reveal whether the address exists.
    const ok = () => res.status(200).json({ ok: true });
    if (!email) return ok();

    try {
      const db = admin.firestore();
      const ref = db.collection('resetThrottle').doc(email);
      const now = Date.now();
      const hourAgo = now - 60 * 60 * 1000;
      const snap = await ref.get();
      const recent = ((snap.exists && snap.data().times) || []).filter((t) => t > hourAgo);
      if (recent.length >= 3) return ok(); // silently throttled
      recent.push(now);
      await ref.set({ times: recent }, { merge: true });

      const fbLink = await admin.auth().generatePasswordResetLink(email, {
        url: `${ACCOUNT_URL}`,
        handleCodeInApp: false,
      });
      // Firebase mints the reset code, but we point the email at our OWN branded
      // reset page rather than Firebase's default screen: extract the oobCode and
      // wrap it into account.html?mode=resetPassword&oobCode=… . account.html then
      // verifies the code and lets the customer set a new password in-brand.
      const oobCode = new URL(fbLink).searchParams.get('oobCode');
      const link = `${ACCOUNT_URL}?mode=resetPassword&oobCode=${encodeURIComponent(oobCode)}`;
      const transporter = createTransporter();
      await transporter.sendMail({
        ...FROM.account,
        to: email,
        subject: 'Reset your Aevia password',
        html: renderEmail(`
          <p style="margin:0 0 18px">Hi,</p>
          <p style="margin:0 0 22px">We received a request to reset the password for your Aevia account. Click below to choose a new one.</p>
          ${emailButton(link, 'Reset my password')}
          <p style="margin:22px 0 0;font-size:14px;color:#6a6a6a">If you didn't ask for this, you can ignore this email.</p>
        `, { noReply: true }),
      });
    } catch (err) {
      // auth/user-not-found lands here — swallow it so the response stays constant.
      if (err.code !== 'auth/user-not-found') {
        console.error('sendPasswordResetEmail error for', email, err);
      }
    }
    return ok();
  });

// ── Password-changed confirmation (Brevo-branded) ────────────────────────────
// Sent right after a customer completes a reset on our branded page. It's a
// security alert ("your password changed — wasn't you? contact us"). Authenticated
// so it can only ever email the caller's OWN address (the client signs in with the
// new password first), which means it can't be used to spam or alarm anyone else.
exports.sendPasswordChangedEmail = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 20, memory: '128MB' })
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const m = (req.headers.authorization || '').match(/^Bearer (.+)$/);
    if (!m) return res.status(401).json({ error: 'Unauthorised' });
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(m[1]);
    } catch (e) {
      return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }
    const email = decoded.email;
    if (!email) return res.status(400).json({ error: 'No email on this account.' });

    try {
      const when = new Date().toLocaleString('en-GB', {
        timeZone: 'Europe/Vienna', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
      const transporter = createTransporter();
      const name = (decoded.name || '').split(' ')[0];
      await transporter.sendMail({
        ...FROM.account,
        to: email,
        subject: 'Your Aevia password was changed',
        html: renderEmail(`
          <p style="margin:0 0 18px">Hi${name ? ' ' + name : ''},</p>
          <p style="margin:0 0 22px">Your Aevia account password was changed on ${when} (Vienna time).</p>
          <p style="margin:0 0 22px">If this was you, there's nothing to do. If it wasn't, please write to us at support@aevia.at right away and we'll help you secure your account.</p>
        `, { noReply: true }),
      });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('sendPasswordChangedEmail error for', email, err);
      return res.status(500).json({ error: 'Could not send confirmation.' });
    }
  });
