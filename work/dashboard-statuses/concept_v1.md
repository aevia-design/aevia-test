# Dashboard Statuses + Order-Issue Channel

## What
Two coupled changes to the staff dashboard and the customer-facing order view:
(1) trim the order-status set down to what's actually used, and (2) add a
customer→staff "report an issue" channel that both emails support and flags the
order on the dashboard.

## Why
`designing` and `needs_info` are dead statuses — nothing fires when they're set,
so they're manual bookkeeping with no payoff. Meanwhile there's a real gap: once
a preview is sent, the customer has no way to say "something's wrong" without
falling back to email, and staff have no in-dashboard signal when that happens.
Separately, the customer-facing `paid → "Approved"` label undersells a paid order.

## How
**Status trim:**
- Remove `designing` and `needs_info` everywhere (badges, filters, sequence
  arrays, customer label map, tests). An order sits at `new` from upload until
  `review_sent`.

**New `issue` status + report channel:**
- Customer-preview gets a "Report an issue" button → short text box → new
  `reportOrderIssue` Cloud Function (token-gated via `previewToken`).
- The function: sets `order.status = 'issue'`, stores the message + timestamp on
  the order, pushes to `statusHistory`, and emails `support@aevia.at` (order
  number + message) via the existing Brevo transporter.
- Dashboard: red "Issue raised" badge, a new **Issues** filter (replacing the two
  removed filters), and issue-flagged orders sorted to the top of the list.
- Customer sees status **"Under review."** Staff resolve it and re-send the
  preview → order returns to `review_sent`.

**Customer label fix:**
- `paid → "Payment confirmed"` (was "Approved"). `sent_to_print`/`printing` still
  show "In production."

## Boundaries
- Not building an in-app chat or reply thread — the issue channel is one-way
  (customer → support inbox); the back-and-forth happens over email as it does today.
- No analytics/tracking in this batch.
- No dashboard search / payment-state-at-a-glance in this batch.
- Backend functions deploy is owner-triggered.

## Open Questions (parked for next round)
- **Client analytics** — needs one concrete decision it would inform before
  building; GDPR + cost implications to weigh (self-built event log vs
  third-party like Plausible).
- **Other dashboard gaps** — quick-find by order number/email; Stripe/payment
  state visible at a glance.
