# Decision: Joyride M-page photo allocation (SP4/SP8 Right)

**Date:** 2026-07-14
**Status:** Committed (owner-approved, S128)

## Context

Joyride's SP4 Right and SP8 Right are fixed mixed-orientation pages: slot 1 is always a
vertical frame, slot 2 always horizontal, vertical overlaps horizontal. No other template
forces orientations — pages normally adapt to the photo via H/V variants. Auto-layout
needed a rule for feeding these pages one V + one H photo without wrecking the book's
chronological order.

## Options Considered

1. **Window-local matching** — match V/H from the spread's own contiguous photo window;
   fall back to crop-into-frame when the window is one-orientation.
2. **Global pair search** — reserve the chronologically closest V+H pair from anywhere in
   the pool; punches photos out of sequence, most code.
3. **Bounded lookahead** — like 1, but peek a few photos ahead when the window lacks an
   orientation; extra machinery for a marginal gain.

## Decision

We chose **window-local matching** because it is the smallest rule consistent with how
`assignPhotosToSpreads` already works (chronology guaranteed at spread granularity;
orientation resolved inside the window; fixed frames — see square pages — crop whatever
arrives, reposition fixes framing).

- We gain: zero new machinery, chronology preserved exactly as on every other spread,
  graceful degradation (crop + placement-audit warning + staff/customer reposition).
- We accept: an all-one-orientation window puts a mismatched photo in a fixed frame
  (cropped); within-spread order may shuffle (e.g. photo 56 above 55) — same shuffle the
  allocator already does on multi-slot pages, owner OK'd it.
- We assume: runs of same-orientation photos are common enough that the fallback must be
  graceful, but not so harmful that a crop is unacceptable.

## Consequences

- M-page rule lives entirely in the allocator + joyride-data.js; reversible any time.
- Rules out global reordering of the pool for pairing purposes.
- Monitor: the existing placement audit logs every fallback — if F&F books show it firing
  constantly, upgrade to bounded lookahead (option 3) with evidence in hand.
