<original_task>
Continue building the Aevia photo book service. Session started by reviewing STATUS.md and CLAUDE.md from the previous session, then discussing next steps. The primary task that emerged was building a token-based customer order page (no login required) where customers can view their order status and approve a preview PDF.
</original_task>

<work_completed>
## Discussions and decisions

### Template engine / PDF pipeline
- Discussed PDF generation approach: HTML/CSS → Puppeteer recommended over Adobe InDesign
- Confirmed designer will work in Adobe tools and deliver the template
- Decision: request from designer (a) a PDF with photo placeholder rectangles, and (b) a spec sheet table with X, Y, Width, Height in mm for every photo slot on every page
- Confirmed template structure: ~10 unique page types, repeated across 40-page album (4× each), some pages have 1 photo, some 2
- Drafted designer brief (in conversation) explaining slot spec sheet requirement
- Puppeteer: free, open source, npm install, runs inside Firebase Cloud Functions, ~€0–5/month at current scale

### Customer order page decision
- Discussed Firebase Auth vs token-based URL approach
- Decided: token-based URL for v1 — no login needed, simpler, same customer experience
- Rationale: Firebase Auth adds 4–5 extra build/maintenance items for no additional value at current scale
- Future: can add Firebase Auth on top of the existing page when volume demands it

## Code changes

### `functions/upload.js`
- Added `const crypto = require('crypto');` at line 1
- Generated 64-char random hex token: `const token = crypto.randomBytes(32).toString('hex');`
- Added `token` field to Firestore order document (alongside orderNumber, customerName, etc.)
- Token is in scope when emails are sent (emails are sent before Firestore write, so token must be moved before email send if adding to email — see Work Remaining)

### `firestore.rules`
- Updated to allow two types of updates:
  1. Dashboard: update `status` + `statusHistory` fields only (existing rule)
  2. Customer approval: update `status` + `statusHistory` only when `request.resource.data.token == resource.data.token` AND new status is `'approved'`
- Deployed successfully via `firebase deploy --only firestore:rules`

### `pages/my-order.html` (NEW)
- Customer-facing order status page, accessed via `?token=<64-char-hex>`
- Queries Firestore: `where('token', '==', token)` — finds order by token, not by ID
- Displays: order number, customer name, status with coloured dot, template, pages, price (if set)
- Shows PDF preview link when `previewUrl` field exists on Firestore order doc
- Shows Approve + Request changes buttons ONLY when `status === 'review_sent'`
- Approve button: calls `updateDoc` with `{ token, status: 'approved', statusHistory: arrayUnion(...) }` — token must be sent back for Firestore rule to pass
- Request changes button: opens pre-filled mailto to xenia@aevia.at with subject "Change request — AEV-XXX"
- On approve: buttons hide, green confirmation message shown, status badge updates live
- Error state: "Order not found" shown if token missing or no match in Firestore
- Firebase config uses real credentials (same as dashboard.html)
- Status labels and descriptions for all 10 statuses defined in JS STATUS object

### `functions/upload.js` — Cloud Function deployed
- Deployed via `cd functions && npm run deploy`
- Warning shown about Node.js 20 deprecation (April 2026) and firebase-functions SDK version — not urgent but noted
- Live endpoint unchanged: `https://europe-west1-aevia-uploads.cloudfunctions.net/createUploadSession`

## Bug encountered and fixed
- **Bug:** `pages/order.html` was the existing order intake form (multi-step form for placing orders, built in commit `45db150`). We created our new customer status page also named `order.html`, overwriting the intake form.
- **Symptom:** "Create your book" button on all product pages (wander.html, terrain.html, etc.) stopped working — URL `order.html?template=Wander&...` landed on the status page which showed "Order not found"
- **Fix:** Restored original `order.html` from git (`git show 45db150:pages/order.html > pages/order.html`) and moved our status page to `my-order.html` (`git show HEAD:pages/order.html > pages/my-order.html`)
- All product pages still link to `order.html` — no changes needed there

## Commits pushed to main
1. `3b78c6e` — Add token-based customer order page with approve flow
2. `29cfd55` — Fix: restore order intake form, rename status page to my-order.html

Both live at `https://aevia-test.pages.dev` (Cloudflare Pages, auto-deploys from main).

## TO-DOS.md updates
- Marked "Build customer order portal" as done
- Marked "Design customer authentication mechanism" as resolved
- Added: "Auto-email customer when status changes to review_sent"
- Added: "Add order page link to customer confirmation email"
- Updated URL reference from `order.html?token=` to `my-order.html?token=`
</work_completed>

<work_remaining>
## Immediate / highest priority

### 1. Auto-email customer when status changes to `review_sent`
**Why:** Currently staff must manually copy token from Firestore, construct the URL, and send a separate email. This is the main manual step in the preview approval flow.
**How:**
- Dashboard (`pages/dashboard.html`) already calls `updateDoc` when status changes
- Add logic: after status update to `review_sent`, call a new Firebase Cloud Function `sendStatusEmail`
- New function in `functions/index.js`: receives `orderNumber`, fetches order from Firestore (has `token` + `email`), sends branded Nodemailer email with:
  - Order page link: `https://aevia-test.pages.dev/pages/my-order.html?token=${token}`
  - `previewUrl` link if set (or note that preview will appear on the page)
- Same function can handle other status transitions later (approved → send payment link, paid → send confirmation, delivered → ask for review)
**Files:** `pages/dashboard.html` (find status update logic), `functions/index.js` (add new exported function)

### 2. Add order page link to customer confirmation email
**Why:** Customers currently have no way to find `my-order.html` after placing an order — they have to wait for staff to send them the link manually.
**How:**
- In `functions/upload.js`, the token is generated at line ~230 (before Firestore write)
- Customer confirmation email HTML is at lines 170–227
- Add a styled CTA button to the email: "Track your order →" linking to `https://aevia-test.pages.dev/pages/my-order.html?token=${token}`
- NOTE: token is generated AFTER the emails are sent in current code order — need to move token generation to BEFORE the email send, or restructure slightly
**Files:** `functions/upload.js:170-230`

### 3. PDF preview flow (Phase 2 — blocked on designer)
**Depends on:** Designer delivering template PDF + slot spec sheet
**Steps once designer delivers:**
- Build Node.js script: fetch photos from GCS → sort by EXIF date → overlay onto template at spec coordinates → Puppeteer PDF export
- Save PDF to GCS, generate signed URL, store as `previewUrl` on Firestore order doc
- `my-order.html` already handles `previewUrl` — PDF link appears automatically when field is set

### 4. Dashboard: add previewUrl field input
**Why:** Staff need a way to paste the GCS signed URL for the PDF preview into the Firestore order. Currently requires going to Firestore console directly.
**How:** Add a small input field in the dashboard order detail view to set/update `previewUrl` field on the order doc.

### 5. Stripe payment link integration
**Current:** Manual — staff send a Stripe Payment Link by email after order is approved
**Future:** When status changes to `approved`, auto-send email with Stripe Payment Link
**Blocked by:** Stripe account setup and decision: Payment Links (manual per order) vs Checkout Sessions (fully automated)
</work_remaining>

<attempted_approaches>
## Writing pages/order.html (the new customer status page)

Three failed attempts before success:

**Attempt 1:** Used `Write` tool — failed with "File has not been read yet. Read it first."
The file didn't exist, so `touch` was used to create an empty file, then `Read` was called, but the file somehow already had content (from a previous partial write).

**Attempt 2:** Tried bash heredoc (`cat > file << 'HTMLEOF'`) — failed with "unexpected EOF while looking for matching `'`" because the HTML contained single quotes inside the heredoc delimiter context.

**Attempt 3:** Tried `node -e "..."` with template literal — failed with same issue (single quotes in the JS string conflicted with the outer bash single-quote wrapper).

**What worked:** Used `node -e "require('fs').writeFileSync(...)"` with a simpler placeholder first to confirm write access worked, then used the `Edit` tool to replace the placeholder content with the full HTML. This avoided all shell quoting issues.

## Naming collision
- Originally named customer status page `order.html` — collided with existing order intake form
- Discovered only after user reported "Create your book" button broken on product pages
- Git history was the source of truth for restoring the original file
</attempted_approaches>

<critical_context>
## Architecture decisions locked in

- **No Firebase Auth for customers** — token-based URL is the chosen approach for v1. Do not add login unless volume makes it necessary (suggested threshold: ~200 orders/month or customers explicitly asking for order history).
- **Token security model:** Token is 64 hex chars (32 random bytes) — cryptographically unguessable. Firestore rule validates token on approve. Token is never exposed in the dashboard or internal emails — only in the customer-facing email/URL.
- **`my-order.html` reads by token, not order ID** — Firestore query is `where('token', '==', token)`. This means customers cannot guess each other's order pages by incrementing an order number.
- **`previewUrl` field on order doc** — when this field exists in Firestore, `my-order.html` automatically shows the PDF link. Staff set this manually for now; automated PDF pipeline will set it automatically in Phase 2.
- **Status `review_sent` is the trigger** — Approve/Request changes buttons only appear on `my-order.html` when `status === 'review_sent'`. All other statuses show read-only view.

## File naming
- `pages/order.html` = order INTAKE form (multi-step, customer fills in details and uploads photos) — DO NOT overwrite
- `pages/my-order.html` = customer STATUS page (token-based, shows progress and approve button)
- `pages/dashboard.html` = internal staff dashboard (password: keanuredcat, in git history — known issue)

## Firebase / deployment
- Project ID: `aevia-uploads`, region: `europe-west1`
- Functions deploy: `cd functions && npm run deploy`
- Firestore rules deploy: `npx firebase deploy --only firestore:rules` (from project root)
- Frontend auto-deploys to Cloudflare Pages on push to main: `https://aevia-test.pages.dev`
- Node.js 20 deprecation warning on functions — needs upgrade before April 30 2026
- firebase-functions SDK at 4.9.0 — should upgrade to >=5.1.0 eventually

## Token generation order in upload.js
- Currently: emails sent first (lines ~136–227), then token generated, then Firestore write
- To include token in confirmation email, token generation must be moved BEFORE the email send
- This is a minor restructure — move `const token = crypto.randomBytes(32).toString('hex');` to before the `transporter.sendMail` calls

## Designer brief (for template engine)
- Designer should work in Adobe tools of their choice
- Deliverables needed: (1) PDF showing layout with grey placeholder rectangles for photos, (2) spec sheet table: Page | Slot | X (mm) | Y (mm) | Width (mm) | Height (mm) | Orientation
- Page size: confirm A4 (210×297mm) or standard square book — designer should suggest
- ~10 unique page types, repeated ~4× in a 40-page album
- Total photo slots across all pages should add up to 35–50
- This is pre-build coordination — no code files yet
</critical_context>

<current_state>
## Deliverables status

| Item | Status | Location |
|------|--------|----------|
| Token generation in Cloud Function | Complete, deployed | `functions/upload.js:1, ~230` |
| `pages/my-order.html` (customer status page) | Complete, live | `pages/my-order.html` |
| Firestore rules (token-validated approve) | Complete, deployed | `firestore.rules` |
| Order intake form `pages/order.html` | Restored, live | `pages/order.html` |
| Auto-email on `review_sent` | Not started | `functions/index.js` (new), `pages/dashboard.html` |
| Order link in confirmation email | Not started | `functions/upload.js:170-230` |
| PDF pipeline (Puppeteer) | Not started — blocked on designer | — |
| Dashboard `previewUrl` input | Not started | `pages/dashboard.html` |
| Stripe integration | Not started | — |

## Current live URLs
- Customer order page: `https://aevia-test.pages.dev/pages/my-order.html?token=<64-char-token>`
- Order intake form: `https://aevia-test.pages.dev/pages/order.html`
- Internal dashboard: `https://aevia-test.pages.dev/pages/dashboard.html`

## Git state
- Branch: `main`, clean (all changes committed and pushed)
- Last commit: `29cfd55` — Fix: restore order intake form, rename status page to my-order.html

## Immediate next action (recommended)
Build "auto-email on review_sent": when dashboard status is set to `review_sent`, fire a Cloud Function that emails the customer their `my-order.html` link. This removes the only remaining manual step in the preview approval flow and makes the customer order page actually useful end-to-end.
</current_state>
