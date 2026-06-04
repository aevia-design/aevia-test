# 0004 — Story-page photos are locked on the customer side (for now)

**Date:** 2026-06-04 (session 29)
**Status:** Committed (reversible)

## Context

Special pages (FP1–FP5, shown to customers as "Story pages") carry photos the
customer provides at order time, stored in `specialPhotos` rather than the
rearrangeable photo pool. While testing the Scribble end-to-end flow we hit two
linked issues: (1) `checkBookComplete` falsely flagged a Story-page slot as an
"empty photo slot" because special slots are intentionally `null` in
`bookAssignments`; (2) the customer side rendered special slots as draggable /
droppable, so a customer could displace the fixed photo — which is also how the
stray `null` got introduced. Open worry: a customer might dislike their own
Story-page photo and want to swap it for a pool photo or upload a new one.

## Options Considered

1. **Lock + toast (now)** — Story-page photos can't be moved/removed/replaced;
   any interaction shows an explanatory toast.
2. **Allow replace-from-pool** — customer can drop a pool photo onto a Story slot
   to swap it (special photo still can't leave into the pool).
3. **Replace + upload-new** — full flexibility incl. uploading a fresh photo for a
   Story page (touches upload flow, GCS, order schema, PDF).

## Decision

Chose **Option 1 (lock + toast)** because it's the simplest thing that fully
solves the present problem and is the precondition for Option 2 anyway (you need
clear locked behaviour before adding a deliberate "replace" affordance).

Key trade-offs:
- We gain: no false "incomplete"; the fixed photo can't be displaced by accident.
- We accept: a customer who dislikes a Story-page photo must contact us to change
  it (no self-serve swap yet).
- We assume: Story-page swaps are rare enough to handle manually for now.

## Consequences

- Decision is reversible (UI policy, no data migration). Revisit Option 2 when a
  real customer asks to swap a Story-page photo.
- The completeness fix (special slots never counted as empty) is independent and
  correct regardless of this UI policy — it lives in `book-completeness.js` and is
  fed by `window._specialSlots`, recorded during render in both engines.

## Next Steps

If/when Option 2 is wanted: add a "replace from pool" drop target on Story slots,
define save semantics for a customer-overridden special photo, and ensure the PDF
reads the override.
