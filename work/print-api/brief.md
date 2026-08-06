# Brief: Printsmarter print API integration

**Created:** 2026-08-06 (Session 155)
**Objective:** Enable a paid, staff-approved Aevia order to reach Printsmarter's production queue and return a tracking number to the customer, without anyone emailing a PDF by hand.
**Audience:** The implementing developer (Claude or the owner) in a later session. Assumes no memory of the 2026-08-05 call.
**Applicable Standards:** `CLAUDE.md` (coding conventions, cost awareness, customer-facing copy), `ARCHITECTURE.md` (invariants, data flow), `docs/briefs/printsmarter-api.md` (the API contract)

## Why

Today a finished book reaches the printer by a human downloading two PDFs and emailing them. That
works for a handful of friends-and-family orders and stops working somewhere around the ~100-order
test batch on the [launch roadmap](../../ROADMAP.md) — which is the volume this integration exists
to survive. It is also the blocker on the **dispatch email**, designed in S105 and never built,
because we have no way to learn that a book has shipped.

The 2026-08-05 call removed the two things that made this expensive to start: there is **no setup
fee** and **no volume commitment**. It also replaced the API we had prepared for. The S123 brief
was written against HP Site Flow — HMAC request signing, 289 endpoints, a €900 onboarding charge.
Printsmarter's own API is four operations behind a static token. **The build got smaller, and the
reason to defer it got weaker.** This brief exists so that work starts from the real contract
rather than the superseded one.

## Requirements Extracted from Standards

**From `CLAUDE.md` — coding conventions:**
- [ ] The API token is read **server-side only**, from `functions/.env` (already gitignored). It must never appear in `assets/js/`, any page under `pages/`, or any file the browser downloads.
- [ ] Backend work lives in `functions/` and may use npm normally. No new frontend dependency.
- [ ] New Cloud Functions follow the existing shape in `functions/index.js`: `functions.region('europe-west1').https.onRequest(...)`.
- [ ] Any customer-visible text this introduces (the dispatch email) gets a `/stop-slop` pass before it ships. Staff-facing dashboard strings are exempt.
- [ ] Changed code is verified by running it, not by assertion — see Success Criteria.

**From `CLAUDE.md` — cost awareness:**
- [ ] Expected cost and its main driver are stated in plain language **before** anything is deployed.
- [ ] Egress is measured, not assumed: Printsmarter fetches both PDFs from us by URL, so record the real size of a print cover + content pair and multiply, rather than repeating the earlier ~6-cents-per-order estimate.
- [ ] New functions stay in `europe-west1`, co-located with the bucket. No cross-region traffic.

**From `ARCHITECTURE.md`:**
- [ ] Order status transitions extend the existing state machine rather than introducing a parallel one.
- [ ] Firestore remains the source of truth for order state; the Printsmarter order ID is stored on the order document, not held only in logs.

**From `docs/briefs/printsmarter-api.md` — the API contract:**
- [ ] `order_id_client` carries our order number (`AEV-052`) and is treated as the idempotency key.
- [ ] `pages` is sent per order (40 or 80); one `product_id` covers both page counts and all five templates.
- [ ] `file_cover` and `file_content` are URLs to the two PDFs `scripts/export-pdf.js --mode print` already emits.
- [ ] Status responses are **German free text**, not enum codes. Real values are collected before any string is matched against.
- [ ] The shipping postback endpoint authenticates its caller, or is otherwise not forgeable by anyone who learns the URL.

## Constraints

- **Format:** Two Cloud Functions in `functions/index.js` (submit, postback receiver) plus a small `functions/printsmarter.js` client. Prefer ~100 lines over ~1000.
- **Blocked on Printsmarter:** our `product_id` does not exist yet. `printsmartergmbh_hardcover` is their example — a 126-page book of unknown trim. **Nothing can be submitted until they issue ours.** Treat it as a config value and build around the gap.
- **No dry-run exists.** Site Flow had a free `validate` endpoint; this API documents none. Assume the first real call prints and invoices a real book unless they confirm a sandbox.
- **Trigger point undecided:** whether submission fires automatically on staff approval or from a button on the dashboard is an open decision, not an assumption to make quietly. See Context.
- **Out of scope:** GDPR erasure on their side (a contract question here, not an API call), shipping price and carrier selection at checkout, and anything that changes cover geometry.

## Success Criteria

The deliverable is complete when:
1. A real order placed on the test rig reaches Printsmarter, is visible in their system under our `order_id_client`, and its Printsmarter order ID is stored on the Firestore order document — verified by output, not asserted.
2. A shipping postback moves the order to a shipped state and sends the customer a dispatch email containing a working tracking link.
3. Submitting the same order twice does not produce two books — either because their API rejects the duplicate `order_id_client` (confirmed with them) or because we guard it on our side.
4. The real per-order egress cost is measured from an actual print PDF pair and written down.
5. All requirements above are met.

## References

**API contract:** [`docs/briefs/printsmarter-api.md`](../../docs/briefs/printsmarter-api.md) — call outcome, real payload, open questions
**Superseded, read the banner first:** [`docs/briefs/print-api-integration.md`](../../docs/briefs/print-api-integration.md) — §2–§3 still hold, everything technical does not
**Pre-call question sheet:** [`docs/briefs/printsmarter-call-onepager.md`](../../docs/briefs/printsmarter-call-onepager.md) — §D–§G questions are still unanswered
**Vendor docs:** <https://www.printsmarter.de/docs/api/> (public)
**PDF producer:** [`scripts/export-pdf.js`](../../scripts/export-pdf.js) `--mode print`
**Existing function patterns:** [`functions/index.js`](../../functions/index.js) — `generatePdf` and `getPdfStatus` are the closest analogues
**Credentials:** `functions/.env` → `PRINTSMARTER_API_TOKEN`, `PRINTSMARTER_CUSTOMER_ID`, `PRINTSMARTER_API_BASE`

## Context

**Background decisions already made:**
- We integrate against **Printsmarter only**. Their API connects onward to Elanders; we never talk to Elanders directly.
- No setup fee, no volume commitment, no cloud storage fee. Post-payment, invoiced monthly.
- They accept **RGB PDFs and convert to CMYK themselves** (settled S119, do not re-raise).
- Cover geometry is settled: spine 10mm at 40pp, 14mm at 80pp, verified in printed PDFs in S153.
- The token is a bearer credential with no signing and no documented expiry. It was decided **not** to rotate it now — it already exists in plaintext email, so rotating only the local copy is theatre. The cheap moment to rotate, if ever, is before go-live while nothing depends on it.

**Open decisions the implementer must not resolve silently:**
- **Automatic on approval, or a staff button?** Automatic scales; a button means a human sees the book once more before money is spent on a physical object that cannot be un-printed. Given there is no dry-run, this is the owner's call.
- **What goes in `price`** — our retail price or what we pay them — and whether it appears on a delivery note the customer sees. Unanswered since the S123 brief (Q13).
- **What goes in `return_address`.** Their example is an Elanders address. A failed delivery must not arrive at a flat in Vienna.

**Known risks:**
- **No sandbox.** Testing costs a real book unless they provide one. This may be acceptable — it doubles as the sample round — but it should be a decision, not a discovery.
- **Idempotency is undocumented.** Until confirmed, assume a retried submission could print a second book. This is the highest-consequence unknown in the integration: it is irreversible and it bills.
- **German free-text status** breaks any naive string match the first time they reword a message.
- **Postback authentication is undocumented.** An unauthenticated endpoint lets anyone who learns the URL trigger a dispatch email to a real customer with a fake tracking link.
- **Delegated agents have repeatedly returned DONE with the central constraint violated** — four times across S152–S153. Read the diff before believing the report.
