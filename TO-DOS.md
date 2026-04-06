# Aevia — To-Do Backlog

---

## Customer Email Sequence + Portal - 2026-04-06 14:46

- **Design and build full customer email sequence** - Extend beyond initial order confirmation to cover all key status transitions. **Problem:** Currently only one email is sent (order confirmation after upload). Customers need to be notified at each meaningful stage. **Files:** `functions/upload.js` (email logic), `pages/dashboard.html` (status change triggers). **Solution:** Add email sends triggered by status changes in Firestore — designing started, preview ready, payment received, shipped, delivered. Use existing Nodemailer setup.

- **Build customer order portal (login area)** - Customers should be able to log in and track their order status on the website, with a less granular view than the internal dashboard. **Problem:** No customer-facing order tracking exists; all communication is email-only. **Files:** `pages/` (new page needed, e.g. `pages/my-order.html`), `functions/index.js` (new auth/lookup function needed). **Solution:** Firebase Authentication for customer login; Firestore order lookup by email/order number; read-only status view.

- **Design customer authentication mechanism** - Customers need a way to log in to view their order. **Problem:** No auth system exists on the frontend yet. **Files:** `pages/` (new auth pages), `functions/index.js`. **Blocked by:** Decision on auth approach (Firebase Auth email link vs. password vs. order number + email lookup — no-password magic link is simplest for one-time customers).
