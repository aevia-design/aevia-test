# Decision: how an upload survives a failed photo (TO-DOS #112)

**Date:** 2026-08-13 (S173)
**Status:** Committed and implemented
**Decision type:** Reversible — a loop change and one constant in `pages/order.html`,
guarded by a mocked test. If the threshold is wrong we change a number.

## Context

`order.html` uploads photos with five parallel workers sharing one cursor. A photo that
exhausted its three attempts threw out of its worker's `while` loop, so that worker stopped
pulling work permanently. The pool bled 5 → 0 and the rest of the queue was never
attempted. Reproduced live in S173 as **AEV-096**: slot 29 failed, slots 30–56 were never
tried, and the order sat at `uploading` forever because `confirmUpload` never fired.

Fixing only that would make a dead connection take ~9 minutes to report instead of ~90
seconds, because every remaining photo would burn 3 × 30s of stall detection. So the fix
needed a stopping rule as well.

## Options considered

1. **No breaker** — catch inside the loop, try every photo. Simplest, no invented
   constants, but ~9 minutes before a customer on a dead link is told anything.
2. **Consecutive-failure limit** — one counter, +1 on failure, reset to zero on success.
3. **Total-failure limit** — stop after N failures anywhere in the upload.
4. **Wall-clock limit** — stop after X minutes.

## Decision

**Option 2, limit 5.**

Five equals `CONCURRENCY`, so tripping the breaker means *every worker in flight failed
without a single success in between* — the connection is gone, not one awkward photo. It
is the smallest value that carries that meaning, so it is not an arbitrary number.

- **We gain:** one bad photo costs one photo instead of the order. A dead connection still
  reports in ~90 seconds, as before. Failures are reported once, as a complete list.
- **We accept:** five *adjacent* bad photos would stop an upload that could have continued.
  Close to hypothetical — the form already rejects non-images and non-decodable files
  before upload, so most real failures are connection failures.
- **We assume:** a success is genuine evidence the link is alive. That is what makes the
  rule self-correcting and un-tunable.

**Why not the others.** Option 3 cannot tell five scattered failures across a healthy
106-photo upload from five in a row. Option 4 reintroduces exactly the mistake S151 was
written to undo: a wall-clock number behaves differently on fast and slow connections,
which is why the original 60-second timeout had to go.

## Consequences

Two further defects fixed as a side effect: `Promise.all` no longer rejects while
survivors keep uploading (so `uploadInFlight = false` no longer disarms the close-tab
guard mid-upload), and the customer sees one message naming every failed photo rather than
whichever failed first.

**What this does NOT fix (owner's question, S173).** An order with 105 of 106 photos is
still stranded. `confirmUpload` is deliberately not called when anything failed — an
incomplete book must never reach staff looking ready — so the order sits at `uploading`,
indistinguishable on the dashboard from an upload still running (**#89**), and the
customer cannot resume: resubmitting calls `createUploadSession` again, minting a NEW
order number and re-uploading all 106 (**#90**). This change shrinks the damage and makes
the failure legible; it does not make a partial order completable.

That raises the value of **#90**: the expensive half of a resume — getting the bytes into
GCS — is now already done in the common case.

**What we will watch:** whether the breaker ever fires on a link that turns out to have
been healthy. `uploadErrors` captures enough per attempt to tell.

## Verification

`qa/order-hardening-mock.mjs` gained a case with five *scattered* failures — spaced so a
success always lands between them, which is precisely what the reset rule must survive.
It discriminates:

- **Pre-fix code:** `35 slots never attempted behind the failures: 21, 22, 23, 24, 25…`
- **Post-fix code:** `all 51 healthy photos uploaded despite 5 failures`

An earlier version of this test failed a single slot and passed on the broken code too —
one dead worker still leaves four to drain the queue. Reproducing the bug needs enough
failures to kill the whole pool.

15/15 `npm run qa:order`; 453/453 unit tests.
