# Aevia — Product Requirements Document

**Status:** Draft  
**Date:** 2026-05-28  
**Version:** 1.1

---

## Problem

The photo book market is dominated by DIY platforms (Photobox, Cewe, Artifact Uprising) where customers drag and drop every photo themselves, choose layouts, and write their own captions. The result is often mediocre — customers spend hours on it, and the finished product reflects their layout skills more than their memories.

Aevia is building the first alternative: a premium, full-service photo book where the customer simply uploads their photos and shares a few notes about the album. Aevia's team handles the creative work — layout, photo selection, captions — and the customer gets a professionally designed book. The experience is closer to hiring a designer than using a tool.

There is no existing pipeline. This project is building it from scratch. The first 20–30 orders will run with friendly testers to validate the full cycle before public launch.

---

## Target Users

**Customer** — Someone who wants a premium personalised photo book but does not want to spend hours designing it themselves. They are ordering from a phone or laptop, may have dozens or hundreds of photos, and expect a smooth, guided experience. The first templates cover children's milestones, love stories, and travel albums. They will encounter the website, order form, upload flow, and preview/approval interface.

**Aevia founders (staff)** — Aevia is a founder-led business at MVP stage. Evgenii and Xenia handle all orders themselves. They use the staff template engine on a desktop to assemble each book, review photos, write AI-assisted captions, and manage orders through to print. The tooling must be reliable and not require workarounds — there is no technical support staff to fix problems mid-order.

---

## Success Criteria

The MVP is successful when, across 20–30 test orders:

1. **Every order completes end-to-end** without requiring a manual workaround outside the system — no email attachments, no spreadsheets, no ad-hoc file transfers at any stage.
2. **Customers can approve their book** without needing a phone call or direct guidance from Aevia staff to understand what to do.
3. **The preview and approval interface works on all major desktop browsers** (Chrome, Firefox, Safari, Edge). Mobile users are shown a clear, friendly gate directing them to a desktop — no broken or partially functional mobile UI.

---

## Requirements

### Must Have (P0 — MVP)

**Order intake**

- As a customer, I want to select a template, choose functional page addons, and choose a page count on the product page, so that my order reflects exactly what I want before I start uploading.
  - Acceptance: Selecting/deselecting addons updates the required photo count live. Customer cannot submit an order with an invalid configuration — mandatory fields unfilled or required addon content (photos, texts) missing.

- As a customer, I want to provide my contact details and context about my album in the order form, so that Aevia has what they need to design a personalised book.
  - Acceptance: Name, email, and album notes are saved to Firestore on submission and visible in the staff dashboard. Album notes are template-appropriate (e.g. notes about a child for Scribble, notes about a trip for a travel template) — the form adapts per template rather than hard-coding child-specific language.

- As a customer, I want to upload my photos and any template-specific content (addon photos, addon texts) directly in the order form, so that all content is submitted in one place.
  - Acceptance: All photos and addon-specific content are uploaded to GCS and associated with the order. HEIC files are converted automatically. Low-resolution photos are flagged with a visible warning before submission. The upload experience is smooth and fast — large batches (50–100+ photos) upload without stalling or crashing, with clear progress feedback throughout.

- As a customer, I want to receive a confirmation email when my order is submitted, so that I know it was received and what to expect next.
  - Acceptance: Confirmation email arrives within 2 minutes of submission and includes the order number and a summary of what was ordered.

- As Aevia staff, I want to receive an email notification when a new order is submitted, so that I can begin working on it promptly.
  - Acceptance: Notification email arrives within 2 minutes and includes order number, customer name, template, and page count.

**Order management**

- As Aevia staff, I want to see all orders in a dashboard with their current status, so that I can manage my workload and track progress.
  - Acceptance: Dashboard shows all orders with status, customer name, template, and submission date. Status can be updated manually.

- As Aevia staff, I want to load a customer's order into the template engine by entering an order number, so that I do not need to manually download and re-upload photos.
  - Acceptance: Entering a valid order number downloads all photos from GCS, pre-ticks addon checkboxes, sets page count, and pre-fills addon text panels automatically.

**Book assembly**

- As Aevia staff, I want photos to be sorted chronologically and auto-placed into spread slots when I load an order, so that the initial layout requires minimal rearrangement.
  - Acceptance: Photos are sorted by EXIF date on initial load where available. Where EXIF date is absent, filename is used as a fallback. All photos are placed across available slots. HEIC files converted transparently.

- As Aevia staff, I want to drag photos between slots and reorder spreads, so that I can adjust the layout to tell the best story.
  - Acceptance: Drag-drop between slots works reliably. Spread reorder and type-swap persists until export.

- As Aevia staff, I want to generate AI caption suggestions per slot and edit them inline, so that I can write warm, personalised captions efficiently.
  - Acceptance: AI caption button sends the photo to a caption API and returns a suggestion within 5 seconds. Caption is editable. Addon text panels (pre-filled from order) are also editable. The specific AI model or provider is not fixed — it may be switched to whichever model delivers the best quality-to-cost ratio at any point.

**Customer preview and approval**

- As Aevia staff, I want to send the customer a link to preview and approve their book, so that they can review it without needing a call or email attachment.
  - Acceptance: Staff can generate a preview link from the dashboard. Link is unique per order and accessible without login.

- As a customer, I want to open my preview link and see my book page by page, so that I can review the layout and captions before approving.
  - Acceptance: Preview link opens a desktop interface showing all spreads. Customer can view each spread clearly.

- As a customer, I want to make small adjustments to the preview (reorder photos via thumbnail, edit captions manually) before approving, so that I can correct anything without going back and forth with Aevia.
  - Acceptance: Customer can drag photos between slots via thumbnail strip and edit caption text directly. Spread reorder, AI caption button, and export are disabled. Changes are saved to Firestore when customer clicks "Submit changes."

- As a customer, I want to see a clear message if I open the preview on a mobile device, so that I understand I need to use a desktop to interact with my book.
  - Acceptance: On mobile/tablet screen widths, the interactive interface is replaced with a friendly message directing the customer to open the link on a laptop or desktop. No broken or partial UI is shown.

- As a customer, I want to approve my book with one click once I am happy, so that I can signal I am ready to proceed and receive a payment link immediately.
  - Acceptance: "Approve" button updates order status to `approved` in Firestore, sends a notification email to Aevia staff, and immediately presents the customer with a payment link — no manual step required from staff before payment can be made.

**Payment**

- As a customer, I want to pay for my book after approving it, so that I can complete my order.
  - Acceptance: A Stripe Payment Link is presented to the customer immediately after approval. On successful payment, Stripe webhook updates order status to `paid` and sends an email notification to Aevia staff.

**PDF generation and print**

- As Aevia staff, I want to generate a print-ready PDF for an approved and paid order, so that it can be sent to the print house.
  - Acceptance: Running the export script produces a cover PDF and per-page PDFs at full print resolution — 2433×2433px per page (206mm at 300 DPI). Customer photos are used without compression. Artwork extends into the bleed area (3mm per side on spreads, 18mm on cover). Output is suitable for direct submission to the print house.

- As Aevia staff, I want to review the PDF before sending to print, so that I can catch any rendering issues.
  - Acceptance: Staff can download or view the generated PDF. A clear "Approved for print" action exists before the order is transmitted to the print house.

---

### Should Have (P1 — next iteration)

- **Page-flip preview viewer** — A realistic book-flipping interface (e.g. StPageFlip) embedded in the preview page, using individual page images exported from the script. High visual impact for the customer experience; deferred because the interactive limited engine delivers approval capability without it.
- **PDF auto-save to GCS** — After generation, PDF is saved to GCS and a signed download URL is returned to staff. Currently staff downloads locally.
- **Stripe Checkout Session with webhooks** — Currently a static Payment Link; move to Checkout Sessions for automated status updates and a smoother payment flow.
- **Reminder emails** — Firebase Scheduled Function sends a reminder to the customer if no approval or payment after X days.
- **Mobile responsiveness for order form and home page** — Order form is functional on mobile but not optimised; home page layout needs a responsive audit.
- **German language version** — Site copy and emails in German. First version is English-only; German to follow as a priority given Austrian market.

---

### Could Have (P2 — future consideration)

- **Customer account / order history** — Customers can log in to see past orders and reorder. Not needed for the first 20–30 test orders.
- **Automated preview delivery** — Staff currently triggers the preview link manually; automate on `designing → review_sent` status transition.
- **Print house API integration (SiteFlow / Elanders)** — Automatically transmit print PDF to Elanders via their SiteFlow API on staff approval. Currently the hand-off will be manual for MVP.

---

### Won't Have (this version)

- **Social or sharing features** — Customers cannot share their book or make it public.
- **Customer-initiated orders without staff review** — Every order goes through Aevia assembly; fully automated no-touch production is out of scope.
- **Native mobile app** — Web only.
- **Subscription or recurring orders** — Single order flow only.
- **Self-service template editor** — Customers cannot design their own layout; that is the opposite of the Aevia proposition.

---

## Non-Goals

This version will NOT:

- Replace founder judgement — the tool assists assembly; Aevia always reviews before any preview is sent.
- Be a self-service DIY platform. The entire value proposition is that the customer does not have to design the book.
- Handle print house logistics (shipping, tracking) programmatically — managed manually or via the print house's interface until a future phase.
- Support multiple concurrent templates in the same order.

---

## Templates

Nine templates are planned for MVP. The pipeline is template-agnostic — each template requires a data file (`<name>-data.js`) and a sizing CSV. Only the Scribble template (children's milestones) is fully digitised and engine-tested at time of writing. Remaining eight templates are a core MVP deliverable, not a future consideration.

---

## Constraints

- **Platform:** Web (HTML/CSS/JS — no frameworks, no build tools). Backend: Firebase Cloud Functions (Node.js), Firestore, GCS. Staff template engine hosted publicly (not local-only) so both founders can access it remotely.
- **Tech stack:** Established. No new dependencies without explicit decision. PDF generation via `pdf-lib` + `sharp` (Node.js script). AI captions via external API — provider may change; currently OpenAI GPT-4o mini, switchable.
- **Existing system:** Significant parts already built — order form, template engine (Scribble), PDF export script, Firebase backend, staff dashboard. PRD describes the complete intended system; built parts are noted in `context/customer-journey-v1.md`.
- **Customer preview interface:** Desktop-only. Mobile shows a friendly gate directing to desktop. No mobile-optimised interaction layer required.
- **Performance:** Upload flow must handle large batches (50–100+ photos) without stalling. AI caption response within 5 seconds. No other specific targets.
- **Security / data:** Photos stored in GCS with access controlled via signed URLs. Order data in Firestore. Staff tool protected by a staff key. Customer preview protected by an unguessable per-order token. No personal data beyond name, email, and uploaded photos.
- **Print house:** Elanders (preliminary choice), SiteFlow API capable. PDF hand-off is manual for MVP; API integration is P2.

---

## Open Questions

- **Preview link token** — How is the customer preview token generated and stored? Options needed before building the customer preview interface. — Owner: Evgenii + Claude — resolve before starting customer preview build.
- **Stripe account** — Not yet set up for Aevia. — Owner: Evgenii — needed before payment step can be built.
- **"Approved for print" flow** — Dashboard button, CLI confirmation, or both? — Owner: Evgenii — resolve before PDF-to-GCS and Elanders hand-off work begins.
- **Staff tool hosting** — Needs to be publicly accessible (both founders work remotely). Authentication method TBD — current staff key approach may be sufficient or may need a proper login. — resolve before publishing the engine.
