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
| chunk-001: `getOrder` customer token path + `saveOrderState` | ✅ done |
| chunk-002: Dashboard generate/revoke preview link | ✅ done |
| chunk-003: `customer-preview.html` — limited customer engine | ✅ done (needs live test) |

---

## Phase 1 — Customer Preview Pipeline

_Goal: Staff can send a customer a link; customer can view, make minor edits, and approve their book._

### chunk-001: getOrder customer token path

**Type:** feature
**Component:** Firebase backend
**Status:** done
**Size:** S
**Depends on:** —
**Files:** `functions/index.js`, `functions/upload.js`

**Description:** Extend `getOrder` Cloud Function to accept `?token=` query param (UUID) as an alternative to `X-Staff-Key` header. Validate token against `previewToken` field in the order's Firestore doc. Return same payload as staff path. Add `previewToken` field to Firestore order schema on `createUploadSession`.

**Acceptance criteria:**
- `getOrder` called with a valid `?token=` param returns HTTP 200 with the full order payload (signedUrls, fpTexts, pageCount, etc.) — same shape as the staff path
- `getOrder` called with an invalid, expired, or absent token returns HTTP 403 `{ error: '...' }` — never 401, never 500
- `createUploadSession` writes a Firestore order doc that includes `previewToken: null` (field present, value null) so chunk-002 can write to it without schema surprise
- The response payload on the customer path does not include `previewToken` or any staff-only credential field

**Pattern references:**
- No existing customer token pattern — this chunk establishes it. The staff auth block at `functions/index.js:81–83` (X-Staff-Key check) is the pattern being extended — customer path branches from that same point
- Firestore order doc creation lives in `functions/upload.js` — add `previewToken: null` to the doc written there

**Contextual notes:**
- See ARCHITECTURE.md > Firebase backend > `getOrder` for the function's current responsibilities
- Constrained by ADR-0002: token lookup uses a Firestore query (`where previewToken == token`), not HMAC — do not use crypto verification

---

### chunk-002: Dashboard — generate preview link

**Type:** feature
**Component:** Staff dashboard
**Status:** done
**Size:** S
**Depends on:** chunk-001
**Files:** `pages/dashboard.html`, `functions/index.js`

**Description:** Add a "Generate preview link" action to the dashboard per order. Clicking it: generates a UUID, writes it to Firestore as `previewToken`, constructs the preview URL (`/pages/customer-preview.html?token=UUID`), and copies it to clipboard or shows it for staff to send. Also adds a "Revoke link" action that clears `previewToken`.

**Acceptance criteria:**
- Clicking "Generate preview link" writes a `crypto.randomUUID()` to Firestore as `previewToken` and displays the full URL (`/pages/customer-preview.html?token=<UUID>`) for staff to copy — or copies it to clipboard automatically
- Clicking "Revoke link" clears `previewToken` in Firestore; the link shown in the dashboard disappears
- If an order already has a `previewToken`, generating a new one overwrites the old value (implicitly revoking the previous link) — no duplicate tokens possible
- The constructed URL uses exactly `?token=` as the query param name (must match chunk-001's `getOrder` implementation)

**Pattern references:**
- Follow the existing order action button pattern in `pages/dashboard.html` (load order, status update buttons already present)
- Firestore write: follow the direct Firestore SDK write pattern already used in the dashboard (staff is Cloudflare Access authenticated — no additional Cloud Function needed for the write)

**Contextual notes:**
- See ARCHITECTURE.md > Data Flow > Step 4 (Customer Preview) — this action initiates that flow
- Constrained by ADR-0002: token generated client-side via `crypto.randomUUID()`; written directly to Firestore
- Integrates with chunk-001 — the `?token=` param name in the constructed URL must match exactly what `getOrder` reads on the customer path

---

### chunk-003: customer-preview.html — limited engine (customer mode)

**Type:** feature
**Component:** Customer preview engine
**Status:** done — needs live test
**Size:** L
**Depends on:** chunk-001, chunk-002
**Files:** `pages/customer-preview.html`

**Description:** New page implementing the customer-facing limited version of the engine. Loads order via `?token=` (calls `getOrder` customer path). Shows all spreads read-only. Enables: thumbnail drag-drop between slots, inline caption text editing, FP text panel editing. Disables: spread reorder/type-swap, AI caption button, export, Local mode. Shows mobile gate message (friendly desktop redirect) on narrow viewports. Saves edits to Firestore on "Submit changes."

**Acceptance criteria:**
- Opening `customer-preview.html?token=VALID` renders all spreads with photos and captions — visually identical to the staff engine for the same order
- On viewport width < 900px the engine is entirely replaced by the mobile gate message (order reference visible, no partial UI, no JavaScript errors)
- Photo drag-drop between slots works; "Submit changes" persists updated slot assignments to Firestore
- Inline caption editing works for all spread captions and FP text panels; edited values are included in the "Submit changes" payload
- None of the following are present in the DOM or reachable: Export PDF button, AI caption button, spread reorder/type-swap controls, template/size selectors, Local/Order mode toggle
- Approve button is present in the nav bar but shows a "coming soon" or disabled state (wired up by chunk-004)

**Pattern references:**
- Start from `pages/template-engine.html` as the base — strip staff-only controls per `.interface-design/system.md > What's removed vs staff engine`
- Order load via token: follow the `getOrder` call pattern in `pages/template-engine.html` (Order mode fetch), substituting `?token=` for `X-Staff-Key`
- Apply all design tokens and layout patterns from `.interface-design/system.md`

**Contextual notes:**
- See ARCHITECTURE.md > Key Patterns > Three-mode engine (customer preview column)
- See `.interface-design/system.md` for full UX spec: Edit/Preview toggle, nav structure, photo swap interaction, mobile gate copy, states table
- Integrates with chunk-001 — confirm `?token=` param name matches `getOrder` customer path before writing the fetch call
- Integrates with chunk-004 — Approve button must be present in the nav from the start; chunk-004 wires its action

---

### chunk-004: Approve flow

**Type:** feature
**Component:** Customer preview engine + Firebase backend
**Status:** pending
**Size:** M
**Depends on:** chunk-003
**Files:** `pages/customer-preview.html`, `functions/index.js`

**Description:** "Approve" button on customer-preview.html calls a new `approveOrder` Cloud Function. Function updates Firestore status → `approved`, sends notification email to staff, and returns a Stripe Payment Link URL. Customer preview page immediately shows the payment link — no manual staff step required between approval and payment.

**Acceptance criteria:**
- Clicking "Approve" shows a confirmation step with the warning copy from `.interface-design/system.md > Approve flow` before any write occurs; customer can cancel at this point
- On confirmation, Firestore `status` field is updated to `'approved'` and a notification email is sent to Aevia staff
- The customer preview page immediately displays the Stripe Payment Link URL — no page reload required, no staff action needed
- If `approveOrder` fails, the customer sees a clear inline error message and the Approve button is re-enabled for retry — no silent failure, no stuck state

**Pattern references:**
- `approveOrder` Cloud Function: follow the handler structure at `functions/index.js:71–132` (getOrder) — CORS headers, method guard, try/catch, consistent error response shape `{ error: '...' }`
- Staff notification email: follow the nodemailer pattern in `functions/upload.js` (staff notification already sent on order creation)

**Contextual notes:**
- See ARCHITECTURE.md > Data Flow > Steps 4–5 (Customer Preview → Payment)
- Stripe Payment Link: at MVP this is a static pre-configured URL (not dynamically created per order). Build `approveOrder` to return the URL from a config value or Firestore field — do not block on Stripe account creation. The URL can be a placeholder until chunk-005 is complete.
- Integrates with chunk-003 — the Approve button placeholder in the nav is wired here

---

## Phase 2 — Payment + Print Handoff

_Goal: Customer pays; staff can generate and deliver the print PDF._

### chunk-005: Stripe Checkout + webhook

**Type:** integration
**Component:** Firebase backend + customer preview
**Status:** ✅ done (2026-06-01, session 15)
**Size:** M
**Depends on:** chunk-004
**Files:** `functions/index.js`, `pages/customer-preview.html`

**Description:** Integrate Stripe Prebuilt Checkout (hosted redirect). New `createCheckoutSession` Cloud Function (customer-token auth) takes an order number, creates a Stripe Checkout Session with the configured price ID, and returns the Checkout URL. Customer-preview "Pay now" button (shown after approval) calls this function and redirects. New `stripeWebhook` Cloud Function receives `checkout.session.completed`, verifies the Stripe signature, updates Firestore status → `paid`, appends to `statusHistory`, and sends staff notification email. Customer-preview handles `?payment=success` on return (show confirmation message, no further action needed beyond the view-only lock already in place).

**Prerequisites (manual, in Stripe dashboard before coding):**
1. Create a Product + one-time Price (EUR) → copy the **Price ID** (`price_...`)
2. Developers → API keys → copy **Secret key** (`sk_test_...`) and **Publishable key** (`pk_test_...`)
3. After deploy: Developers → Webhooks → Add endpoint (URL = `stripeWebhook` function URL), event = `checkout.session.completed` → copy **Webhook signing secret** (`whsec_...`)
4. Add to `functions/.env`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`

**Acceptance criteria:**
- Approved orders show a "Pay now" button in customer-preview; clicking it redirects to the Stripe-hosted Checkout page
- On successful payment, customer is returned to customer-preview with `?payment=success`; a confirmation message is shown
- `stripeWebhook` verifies the Stripe signature; on `checkout.session.completed` sets Firestore status → `paid` and appends to `statusHistory`
- Staff notification email is sent on payment (same nodemailer pattern as existing order notification)
- Test mode: Stripe test card `4242 4242 4242 4242` completes the full flow end-to-end
- No regressions on unapproved or already-paid orders (button not shown / already locked)

---

### chunk-006: PDF export uses GCS photos (Plan 12-04)

**Type:** feature
**Component:** PDF export script
**Status:** ✅ done (2026-06-01, session 12)
**Size:** S
**Depends on:** —
**Files:** `scripts/export-pdf.js`, `scripts/package.json`

**Description:** Currently the PDF script reads photos from a local directory. Update it to accept GCS signed read URLs from `book-state.json` and download photos at export time. This unblocks running export from any machine with Node.js installed, without needing photos present locally.

**Implemented:** Added `--order <orderNumber>` mode — calls `getOrder` (staff key) for fresh signed URLs to the full-res ORIGINALS (from `photoManifest`), matched to `book-state.json` by filename, downloaded on demand via a single cached `loadPhoto()`. Local `--photos` mode preserved. Added `scripts/package.json` (pdf-lib, fontkit, sharp) so it runs on any machine. Live-tested end-to-end on AEV-019/AEV-020.

---

### chunk-007: PDF pipeline — state handoff, render, artefact management

**Type:** feature
**Component:** Staff engine + PDF export script + Staff dashboard + Firebase backend
**Status:** ✅ done (2026-06-02, session 17)
**Size:** M
**Depends on:** chunk-006
**Files:** `pages/template-engine.html`, `scripts/export-pdf.js`, `pages/dashboard.html`, `functions/index.js`

**Description:** Three connected pieces that together replace the current "run a local command, get a random-named file" workflow with a proper production pipeline.

**Part 1 — State handoff: "Export" button in staff engine**
Staff clicks "Export book state" in the engine → saves the current `book-state.json` to GCS under `{folderName}/book-state.json` (overwrites previous). This replaces the current local-download approach and ensures the render script always pulls the authoritative version from GCS.

**Part 2 — Render script upgrade**
`npm run pdf AEV-001` (run locally by staff) fetches `book-state.json` from GCS, renders two PDFs:
- `{folderName}/pdfs/preview.pdf` — spread view, lower res, for internal QA only
- `{folderName}/pdfs/print.pdf` — bleed, full res, for Elanders

Both uploaded to GCS automatically after render. Script prints signed URLs on completion. Named files, not random.

**Part 3 — Dashboard links + retention**
New `getPdfUrl` Cloud Function (staff-authed) returns signed GCS URLs for both PDFs. Dashboard shows "Preview PDF" and "Print PDF" download links per order once files exist. Retention policy:
- Preview PDF: deleted when order status moves to `approved` (served its purpose)
- Print PDF: deleted 90 days after status moves to `sent_to_print`
Auto-deletion can be a GCS lifecycle rule or a scheduled Cloud Function — decide at build time.

**Acceptance criteria:**
- Clicking "Export" in the staff engine writes `book-state.json` to GCS (verified in GCS console)
- `npm run pdf AEV-001` completes without error, produces two named PDFs in GCS under `AEV-001/pdfs/`
- Dashboard shows download links for both PDFs once they exist; links work (signed URL, no auth required to download)
- Preview PDF is not shown to customers at any point
- Script does not require photos on local disk (uses GCS signed URLs from `getOrder`, already implemented in chunk-006)

**Future upgrade path (not in scope now):**
When Kseniia needs to trigger renders remotely, add a GitHub Actions workflow on top — the script itself won't change, only the trigger mechanism. Tracked separately.

---

### chunk-008: "Approved for print" dashboard action

**Type:** feature
**Component:** Staff dashboard
**Status:** done (session 19, commit 70db5d1)
**Size:** S
**Depends on:** chunk-007
**Files:** `pages/dashboard.html`, `functions/index.js`

**Description:** Dashboard button on paid orders: "Mark approved for print." Updates Firestore status → `sent_to_print`. Human checkpoint before print house submission. For MVP, actual PDF hand-off to Elanders is manual (staff downloads PDF and uploads to SiteFlow). The button records the decision and changes status.

---

## Phase 2.5 — Security hardening (do next)

_Goal: Staff tools and order data are usable only by authenticated staff — no scrapeable secrets, no anonymous tampering. Replaces the Cloudflare Access plan (see chunk-009 and the Decisions Log)._

### chunk-018: Staff authentication (Firebase Auth)

**Type:** security
**Component:** Staff pages + Firestore rules + Cloud Functions
**Status:** ✅ DONE (session 21, 2026-06-02, commit `1a7a3fa`)
**Size:** M
**Priority:** High — this is the real access boundary; supersedes chunk-009.
**Depends on:** —
**Files:** `pages/staff/dashboard.html`, `pages/staff/template-engine.html`, `firestore.rules`, `functions/index.js`

**Why:** Today `firestore.rules` has `allow read: if true` on `/orders` (every order is world-readable, incl. by automated Firebase scanners), the anonymous `update` branch lets anyone change order `status`/`previewToken`/`sentSnapshot`, and the only "lock" is a hardcoded password (`keanuredcat`) + staff key (`865865`) sitting in client JS — both scrapeable from View Source. Founder's stated need: only authorised people should reach the dashboard and tweak orders / generate links.

**Description:** Introduce real staff login via Firebase Authentication (already in the stack — no new dependency). Email/Password method, two accounts (Evgenii, Xenia) created in the Firebase Console. Both staff pages show a login screen and only render after auth. `firestore.rules` lock `/orders` read + staff-write to authenticated staff emails (keep the customer token-match approve branch untouched). Staff Cloud Functions verify the Firebase Auth ID token instead of the static `865865` key; delete the hardcoded password + key from client JS.

**Acceptance criteria:**
- Visiting either staff page while logged out shows a login screen and **no** order data or controls; no password/staff-key string present in page source
- After login with an allowed account, dashboard + engine work exactly as before (list orders, generate/revoke links, mark approved for print, load/save engine state)
- An unauthenticated direct Firestore read of `/orders` is **denied**; an unauthenticated write (status flip) is **denied**
- Customer preview + approve-and-pay flow is unchanged (still token-based, no login)
- Removing/disabling an account in the Console immediately revokes that person's access

**Build order (avoid locking yourself out):**
1. Enable Firebase Auth + create the two accounts in the Console.
2. Add the login screen + auth gate to the dashboard; confirm **you** can log in and the page still works **before** touching rules.
3. Update Cloud Functions to accept the Firebase Auth ID token (keep the static key working in parallel for one step, then remove).
4. Tighten `firestore.rules`; re-verify staff flows + customer flow.
5. Delete the hardcoded password + staff key; mirror the auth gate onto the template-engine page.

**Pattern references:**
- Firebase is already initialised in both staff pages (`firebaseConfig` in `dashboard.html`); add the Auth SDK alongside the Firestore SDK import
- Customer token path in `getOrder` (chunk-001) is the model for "this request is authorised differently from staff" — leave it as the customer branch; staff branch switches from key to ID token
- `firestore.rules` already uses `hasOnly([...])` allowlists — extend with `request.auth` checks

---

## Phase 3 — Infrastructure + Templates

_Goal: Staff tool accessible remotely; full 9-template catalogue ready for launch._

### chunk-009: Cloudflare Access setup — RETIRED (superseded by chunk-018)

**Type:** infrastructure
**Component:** Hosting / security
**Status:** retired — replaced by chunk-018 (Firebase Auth)
**Size:** S
**Depends on:** —
**Files:** Cloudflare Zero Trust dashboard (no code changes)

**What happened (session 20, 2026-06-02):** Attempted the ADR-0001 plan. Two findings killed it:
1. **Path-scoped Cloudflare Access does not enforce on a single `*.pages.dev` project.** A self-hosted Access app pointed at `aevia-test.pages.dev/pages/staff/*` never sits in the request path (verified: unauthenticated requests returned 200 with no Access challenge). Cloudflare's supported pages.dev method is the whole-project Access toggle, which is all-or-nothing and would lock customers out of the shared project. Proper path-scoping needs a custom domain in a Cloudflare zone (aevia.at), not yet live.
2. **Page-gating was the wrong tool anyway.** The real exposure is `firestore.rules` (`allow read: if true`) + scrapeable client-side secrets — gating the page would not have closed either. The founder's actual need (only authorised people can reach + tamper with the dashboard) is met by **real staff login on the data + page**, not an edge gate.

**Done & kept:** Staff pages moved to `pages/staff/` (commit `c2682a2`) — tidy URL grouping, still useful. The non-enforcing Cloudflare self-hosted Access app should be **deleted** in the dashboard to avoid the illusion of protection.

**Decision:** Retired in favour of chunk-018 (Firebase Auth). Cloudflare Access not needed once the dashboard requires login and the data requires auth — a publicly-reachable but login-walled page is acceptable. May revisit only as optional defence-in-depth after aevia.at migration.

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

ADR-0001 decided Cloudflare Access for staff auth. No application code changes needed. Included as chunk-009 so it is tracked and doesn't fall through the cracks. **— Superseded 2026-06-02, see below.**

### 2026-06-02: Staff auth moved from Cloudflare Access to Firebase Auth (chunk-009 retired → chunk-018)

Tried to implement chunk-009. Discovered (a) path-scoped Cloudflare Access can't enforce on a single `*.pages.dev` project — only the all-or-nothing whole-project toggle works, which would lock customers out of the shared project; proper path-scoping needs the aevia.at custom domain (not live), and (b) page-gating wouldn't close the actual hole anyway: `firestore.rules` is `allow read: if true` and the staff password/key are hardcoded in client JS (scrapeable). Founder's real need is "only authorised people can reach + tamper with the dashboard." Decided real staff login (Firebase Auth — already in the stack) on the data + pages is the correct, simpler single-system fix. chunk-009 retired; **chunk-018 (Firebase Auth) is the new next chunk** and supersedes the Cloudflare approach. Kept: staff pages relocated to `pages/staff/` (commit `c2682a2`). ADR-0001 should be updated to record this reversal.

### 2026-05-28: "Approved for print" is a manual checkpoint for MVP

Print house hand-off (Elanders SiteFlow API) is P2. chunk-008 records the approval decision and changes status, but actual PDF submission to Elanders is manual. API integration deferred to post-MVP.
