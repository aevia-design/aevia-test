# Decision: Review lock via status, one live copy, per-send versions

**Date:** 2026-09-25 (S194)
**Status:** Committed (owner)

## Context

#99: after the preview is sent, the staff copy (`staffBook*`) and the customer's draft (`customer*`) drift apart.
Staff fixes never reach the customer, and approval can print a book with a known problem.
Brief: `docs/briefs/review-lock.md`. All three choices are reversible (code plus new fields, no real orders to migrate).

Found while deciding: `sendPreviewEmail` refuses orders in `issue` (`PRE_APPROVAL_STATUSES`, `index.js:1719`), so the
fix-and-re-send loop is a dead end today. `sentSnapshot` exists but is overwritten on every send and lacks
`heartCrop` and caption lines.

## Options Considered

- **A. Lock:** (1) derived from the existing status; (2) a separate lock flag.
- **B. Staff working on the customer's draft:** (1) the staff engine prefers `customer*` when present;
  (2) a blocking report promotes `customer*` → `staffBook*` server-side and clears `customer*`.
- **C. Version history:** (1) an array on the order doc; (2) a subcollection `orders/{id}/sentVersions/{n}`.

## Decision

**A1, B2, C2.**

- **A1:** `saveStaffState` refuses while the status is `review_sent` or later. A blocking report sets `issue`, which unlocks it.
  `approveOrder` refuses in `issue`. A feedback report changes no status. `sendPreviewEmail` accepts `issue` and sets `review_sent`
  (which locks again). An email-reported issue is unlocked by staff setting `issue` in the dashboard.
- **B2:** a blocking report first saves the customer's unsaved edits, then promotes their draft into `staffBook*`
  (same field mapping as `approveOrder`, including `customerCaptionLines`), then clears `customer*`.
  While in `issue`, the customer's editor is read-only and shows a "we're fixing this" message.
- **C2:** each send writes `sentVersions/{n}` (all book-state fields plus `sentAt`). `sentSnapshot` stays on the order
  as the latest version, gains the missing fields, and keeps the dashboard's timing working.

- We gain: exactly one live copy at any time; no staff-engine change; reuse of the existing approval mapping; history with no size cap.
- We accept: the customer cannot edit while an issue is open; a status set by hand in the dashboard can unlock staff.
- We assume: staff fix most blocking issues without the customer editing in parallel, and the status is the single source of lock truth.

## Consequences

- Enables #141 (learning from customer edits): compare `sentVersions` with the approved book.
- The promotion mapping now lives in two places (approve, report), so extract it into one helper.
- Watch: an unsaved customer edit at report time has to be captured, or it is lost.
- `issue` stays outside `STATUS_SEQUENCE` (S190 rule).
