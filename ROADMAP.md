# Aevia — Implementation Roadmap

**Project:** Aevia photo book service
**Architecture source:** ARCHITECTURE.md (confirmed 2026-05-28)
**PRD source:** PRD.md (v1.1, 2026-05-28)
**Created:** 2026-05-28
**Status:** in-progress

## Definition of Done (applies to every chunk)

- Feature works end-to-end in the browser (or script runs cleanly)
- No regressions in existing pages (check browser console)
- STATUS.md updated
- Committed and pushed

---

## Completed Work (reference)

All foundation, template engine, and order intake work is complete. See `sessions/` for details.

| What | Status |
|---|---|
| Public website + order form (`order.html`) | ✅ done |
| Firebase backend: `createUploadSession`, `getOrder` (staff path), `generateCaption` | ✅ done |
| Staff template engine — Scribble template, drag-drop, captions, cover, FP pages | ✅ done |
| PDF export script (`scripts/export-pdf.js`) — print + preview modes | ✅ done |
| Staff dashboard (`dashboard.html`) | ✅ done |
| Plan 12-03: load order into engine (GCS download, FP pre-fill) | ✅ done |
| Bleed coords, caption coord system (Phase 13) | ✅ done |

---

## Phase 1 — Customer Preview Pipeline

_Goal: Staff can send a customer a link; customer can view, make minor edits, and approve their book._

### chunk-001: getOrder customer token path

**Type:** feature
**Component:** Firebase backend
**Status:** pending
**Size:** S
**Depends on:** —
**Files:** `functions/index.js`, `functions/upload.js`

**Description:** Extend `getOrder` Cloud Function to accept `?token=` query param (UUID) as an alternative to `X-Staff-Key` header. Validate token against `previewToken` field in the order's Firestore doc. Return same payload as staff path. Add `previewToken` field to Firestore order schema on `createUploadSession`.

---

### chunk-002: Dashboard — generate preview link

**Type:** feature
**Component:** Staff dashboard
**Status:** pending
**Size:** S
**Depends on:** chunk-001
**Files:** `pages/dashboard.html`, `functions/index.js`

**Description:** Add a "Generate preview link" action to the dashboard per order. Clicking it: generates a UUID, writes it to Firestore as `previewToken`, constructs the preview URL (`/pages/customer-preview.html?token=UUID`), and copies it to clipboard or shows it for staff to send. Also adds a "Revoke link" action that clears `previewToken`.

---

### chunk-003: customer-preview.html — limited engine (customer mode)

**Type:** feature
**Component:** Customer preview engine
**Status:** pending
**Size:** L
**Depends on:** chunk-001, chunk-002
**Files:** `pages/customer-preview.html`

**Description:** New page implementing the customer-facing limited version of the engine. Loads order via `?token=` (calls `getOrder` customer path). Shows all spreads read-only. Enables: thumbnail drag-drop between slots, inline caption text editing, FP text panel editing. Disables: spread reorder/type-swap, AI caption button, export, Local mode. Shows mobile gate message (friendly desktop redirect) on narrow viewports. Saves edits to Firestore on "Submit changes."

---

### chunk-004: Approve flow

**Type:** feature
**Component:** Customer preview engine + Firebase backend
**Status:** pending
**Size:** M
**Depends on:** chunk-003
**Files:** `pages/customer-preview.html`, `functions/index.js`

**Description:** "Approve" button on customer-preview.html calls a new `approveOrder` Cloud Function. Function updates Firestore status → `approved`, sends notification email to staff, and returns a Stripe Payment Link URL. Customer preview page immediately shows the payment link — no manual staff step required between approval and payment.

---

## Phase 2 — Payment + Print Handoff

_Goal: Customer pays; staff can generate and deliver the print PDF._

### chunk-005: Stripe payment link + webhook

**Type:** integration
**Component:** Firebase backend + Stripe
**Status:** pending
**Size:** M
**Depends on:** chunk-004
**Files:** `functions/index.js`, `functions/stripe.js`

**Description:** Set up Stripe account (manual prerequisite). Create a Stripe Payment Link per order or per template/price point. Add a `stripeWebhook` Cloud Function that receives `payment_intent.succeeded`, verifies it, updates Firestore status → `paid`, and sends email notification to staff. Payment Link URL stored in Firestore per order for re-sending if needed.

---

### chunk-006: PDF export uses GCS photos (Plan 12-04)

**Type:** feature
**Component:** PDF export script
**Status:** pending
**Size:** S
**Depends on:** —
**Files:** `scripts/export-pdf.js`

**Description:** Currently the PDF script reads photos from a local directory. Update it to accept GCS signed read URLs from `book-state.json` and download photos at export time. This unblocks running export from any machine with Node.js installed, without needing photos present locally.

---

### chunk-007: PDF-to-GCS upload + dashboard download link

**Type:** feature
**Component:** PDF export script + Staff dashboard
**Status:** pending
**Size:** S
**Depends on:** chunk-006
**Files:** `scripts/export-pdf.js`, `pages/dashboard.html`, `functions/index.js`

**Description:** After export, script auto-uploads generated PDFs to GCS under `{folderName}/pdfs/`. A new `getPdfUrl` Cloud Function (staff-authed) returns a signed download URL. Dashboard shows a "Download PDF" link per order once PDFs are present. Resolves the shared-access open question — either founder can trigger export and both can download the result.

---

### chunk-008: "Approved for print" dashboard action

**Type:** feature
**Component:** Staff dashboard
**Status:** pending
**Size:** S
**Depends on:** chunk-007
**Files:** `pages/dashboard.html`, `functions/index.js`

**Description:** Dashboard button on paid orders: "Mark approved for print." Updates Firestore status → `sent_to_print`. Human checkpoint before print house submission. For MVP, actual PDF hand-off to Elanders is manual (staff downloads PDF and uploads to SiteFlow). The button records the decision and changes status.

---

## Phase 3 — Infrastructure + Templates

_Goal: Staff tool accessible remotely; full 9-template catalogue ready for launch._

### chunk-009: Cloudflare Access setup

**Type:** infrastructure
**Component:** Hosting / security
**Status:** pending
**Size:** S
**Depends on:** —
**Files:** Cloudflare Zero Trust dashboard (no code changes)

**Description:** Configure Cloudflare Access on the staff subdomain or path to gate `template-engine.html` and `dashboard.html` behind OTP-to-allowed-emails. See ADR-0001. No code changes required — pure Cloudflare dashboard config. Unblocks remote access to the staff engine.

---

### chunk-010: Template 2 digitisation

**Type:** feature
**Component:** Template data + product pages
**Status:** pending
**Size:** M
**Depends on:** —
**Files:** `assets/Template_<Name>/`, `pages/<name>.html`

**Description:** Spread sizing CSV + cover sizing CSV (from Kseniia), SVG artwork files, run `csv-to-template.js` to generate the data file, product page following the Scribble pattern. Repeat pattern for each template.

---

### chunk-011: Template 3 digitisation

**Type:** feature
**Component:** Template data + product pages
**Status:** pending
**Size:** M
**Depends on:** —
**Files:** `assets/Template_<Name>/`, `pages/<name>.html`

**Description:** Same pattern as chunk-010. Independent of all other template chunks.

---

### chunk-012: Template 4 digitisation

**Type:** feature
**Component:** Template data + product pages
**Status:** pending
**Size:** M
**Depends on:** —
**Files:** `assets/Template_<Name>/`, `pages/<name>.html`

**Description:** Same pattern as chunk-010. Independent of all other template chunks.

---

### chunk-013: Template 5 digitisation

**Type:** feature
**Component:** Template data + product pages
**Status:** pending
**Size:** M
**Depends on:** —
**Files:** `assets/Template_<Name>/`, `pages/<name>.html`

**Description:** Same pattern as chunk-010. Independent of all other template chunks.

---

### chunk-014: Template 6 digitisation

**Type:** feature
**Component:** Template data + product pages
**Status:** pending
**Size:** M
**Depends on:** —
**Files:** `assets/Template_<Name>/`, `pages/<name>.html`

**Description:** Same pattern as chunk-010. Independent of all other template chunks.

---

### chunk-015: Template 7 digitisation

**Type:** feature
**Component:** Template data + product pages
**Status:** pending
**Size:** M
**Depends on:** —
**Files:** `assets/Template_<Name>/`, `pages/<name>.html`

**Description:** Same pattern as chunk-010. Independent of all other template chunks.

---

### chunk-016: Template 8 digitisation

**Type:** feature
**Component:** Template data + product pages
**Status:** pending
**Size:** M
**Depends on:** —
**Files:** `assets/Template_<Name>/`, `pages/<name>.html`

**Description:** Same pattern as chunk-010. Independent of all other template chunks.

---

### chunk-017: Template 9 digitisation

**Type:** feature
**Component:** Template data + product pages
**Status:** pending
**Size:** M
**Depends on:** —
**Files:** `assets/Template_<Name>/`, `pages/<name>.html`

**Description:** Same pattern as chunk-010. Independent of all other template chunks.

---

## Phase 4 — P1 Enhancements

_Start only after first test orders have completed end-to-end._

### chunk-018: Page-flip preview viewer

**Type:** feature
**Component:** Customer preview engine
**Status:** pending
**Size:** M
**Depends on:** chunk-003
**Files:** `pages/customer-preview.html`

**Description:** Embed StPageFlip (or equivalent) in customer-preview.html using individual page PNG images exported from the PDF script. Realistic book-flipping interface shown to the customer before the interactive approval section. High visual impact; deferred because the flat scroll view in chunk-003 is sufficient for approval.

---

### chunk-019: Reminder emails

**Type:** feature
**Component:** Firebase backend
**Status:** pending
**Size:** S
**Depends on:** chunk-004
**Files:** `functions/index.js`, `functions/reminders.js`

**Description:** Firebase Scheduled Function checks daily for orders stuck in `review_sent` status beyond X days with no customer approval, and sends a reminder email. Configurable threshold — start with 3 days.

---

## Decisions Log

### 2026-05-28: Roadmap scope expanded from template engine to full pipeline

Old `.planning/ROADMAP.md` was scoped to the staff template engine only (v1.0–v2.3). Aevia now has PRD.md and ARCHITECTURE.md covering the complete 11-step customer journey. This roadmap replaces the old one and tracks all remaining MVP work across all five system surfaces.

### 2026-05-28: Templates treated as parallel independent chunks

Each of the 8 remaining templates is structurally identical (CSV → data file → SVGs → product page) and has no inter-template dependencies. Grouped as chunk-010–017 but each is independent — done in whatever order artwork arrives from Kseniia.

### 2026-05-28: Cloudflare Access is a config chunk with no code

ADR-0001 decided Cloudflare Access for staff auth. No application code changes needed. Included as chunk-009 so it is tracked and doesn't fall through the cracks.

### 2026-05-28: "Approved for print" is a manual checkpoint for MVP

Print house hand-off (Elanders SiteFlow API) is P2. chunk-008 records the approval decision and changes status, but actual PDF submission to Elanders is manual. API integration deferred to post-MVP.
