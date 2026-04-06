# Aevia — To-Do Backlog

---

## Customer Email Sequence + Portal - 2026-04-06 14:46

- **Design and build full customer email sequence** - Extend beyond initial order confirmation to cover all key status transitions. **Problem:** Currently only one email is sent (order confirmation after upload). Customers need to be notified at each meaningful stage. **Files:** `functions/upload.js` (email logic), `pages/dashboard.html` (status change triggers). **Solution:** Add email sends triggered by status changes in Firestore — designing started, preview ready, payment received, shipped, delivered. Use existing Nodemailer setup.

- ~~**Build customer order portal**~~ — Done (2026-04-06). Built as token-based `pages/order.html` — no login required. Token stored in Firestore, customer accesses via unique URL.

---

## Template Engine — Designer Brief + PDF Pipeline - 2026-04-06 15:46

- **Brief designer on photo slot spec sheet** - Designer is building the first professional template (likely in Adobe InDesign). They need to deliver a slot spec alongside the PDF so automation can place photos. **Problem:** Without exact X/Y coordinates and dimensions for each photo slot per page, the script cannot place photos automatically — measurements would have to be done manually. **Files:** No files yet — this is a pre-build coordination task. **Solution:** Send designer the brief (already drafted in conversation): placeholder rectangles for photo slots, spec table with X, Y, Width, Height in mm per slot per page. Page size to confirm: A4 or standard square book format.

- **Build Puppeteer PDF generation pipeline** - Once designer delivers template + spec sheet, build Node.js script that fetches order photos from GCS, sorts by EXIF date, overlays photos onto designer template at correct slot positions, and exports PDF via Puppeteer. **Problem:** No automated PDF generation exists — Phase 2 is blocked until template is ready. **Files:** `functions/index.js` (new Cloud Function), `functions/upload.js` (reference for GCS + Firestore patterns). **Solution:** Puppeteer runs inside Firebase Cloud Function; triggered when order status moves to `designing`; outputs preview PDF to GCS as signed URL; sends customer email with link.

---

## Customer Email Sequence + Portal - 2026-04-06 14:46

- ~~**Design customer authentication mechanism**~~ — Resolved (2026-04-06). Chose token-based URL over Firebase Auth. No login needed for v1.

---

## Include Order Link in Confirmation Email - 2026-04-06 16:08

- **Auto-email customer when status changes to review_sent** - When staff sets an order status to `review_sent` in the dashboard, the customer should automatically receive an email with a link to their order page (`my-order.html?token=...`) so they can view and approve the preview. **Problem:** Currently staff must manually copy the token from Firestore, construct the URL, and send a separate email — error-prone and slow. **Files:** `pages/dashboard.html` (status change logic, where `updateDoc` is called), `functions/index.js` (new Cloud Function needed: `sendStatusEmail`). **Solution:** Dashboard calls a new Firebase Cloud Function when status changes to `review_sent`, passing orderNumber. Function fetches order from Firestore (has token + email), sends branded email with order page link and PDF preview link. Same function can later handle other status transitions (approved, paid, delivered).

- **Add order page link to customer confirmation email** - The token is now generated and saved in Firestore, but the confirmation email sent to the customer does not yet include the link to their order page. **Problem:** Customers have no way to find their order page unless staff manually send them the URL. The link should be included automatically in the order confirmation email so customers can bookmark it from day one. **Files:** `functions/upload.js:170-227` (customer confirmation email HTML). **Solution:** Construct the URL as `https://aevia-test.pages.dev/pages/my-order.html?token=${token}` and add a styled button/link to the email body. Token is already available in scope when the email is sent (generated at line ~230).
