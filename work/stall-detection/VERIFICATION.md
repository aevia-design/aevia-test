# S151 stall detection — VERIFIED (Session 173, 2026-08-13)

**Status: PASSED. TO-DOS #94 closed.**

Verified by the owner on the live rig (`aevia-test.pages.dev`), Chrome 151 on Windows,
Scribble 40pp / 56 files. Firestore records read back with
`node scripts/inspect-upload-failure.js`.

## Success criteria vs evidence

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | A slow but healthy upload completes | ✅ | **AEV-097** — Chrome Slow 3G applied mid-upload and held 90s, so one file's single attempt far exceeded the old 60s timeout. Order reached `status: new`, `uploadComplete: true`, zero `uploadErrors`. |
| 2 | A dead connection reports in ~30s with bytes recorded | ✅ | **AEV-096** — three attempts at **30269 / 30130 / 30125 ms**, each labelled `STALL: no progress for 30000 ms`, each carrying `bytesTransferred: 371712` of `totalBytes: 2106366`. `inspect-upload-failure.js` read it **unmodified**. |
| 3 | The progress bar moves within a single large file | ✅ | Owner observed the MB counter advancing while the photo count stayed frozen during the throttled window. |
| 4 | No regression on an ordinary order | ✅ | **AEV-092, 093, 094, 095** all completed unthrottled on this code (committed S151); AEV-095 went through to `paid` in the S172 E2E chain. |

## Things learned in the run

**A throttle that is too harsh tests the wrong thing.** The first attempt used a custom
20 kb/s profile. Divided across `CONCURRENCY = 5` that is a few hundred bytes per second
per file — indistinguishable from a dead link, and the detector correctly aborted. The
brief's actual scenario is a **1 Mbit/s weak mobile uplink**. Chrome's built-in **Slow 3G**
preset (~400 kb/s, ~10 KB/s per worker) is the right setting, and the efficient shape of
the test is: submit unthrottled, apply Slow 3G mid-flight for 90 seconds, release.

**`bytesTransferred` was identical on all three attempts (371712).** Not a bug — the
counter resets per attempt. Each attempt flushed ~363 KB into the socket buffer instantly
and then moved nothing for 30s. The stall calls were correct, not trigger-happy.

**The customer-facing error was wrong and is now fixed (`be04e17`).** The screen showed
the raw internal reason — `AbortError` — while the record underneath correctly said
`STALL`. Neither tells a customer what to do. `order.html` now throws a legible message
naming the photo; the raw reason is kept on `.cause` and the diagnostic record is unchanged.

**`qa/verify-stall-detection.mjs` and `qa/quick-stall-test.mjs` are dead.** Both were
written in S151 and never run once. They drive the form through
`input[name="mainphoto"]`, a selector that appears **zero times** in the current
`order.html`, and they upload 8 photos when `validatePhotosStep()` requires the count to
match the book's slot count exactly. Delete them or rebuild them on
`qa/p2-upload-probe.mjs`, which reads the target off the page and has a working
`--throttle` flag.

## Defects found, not fixed here

- **TO-DOS #112 — a failed photo kills its worker permanently.** The five workers share
  one `nextIndex` cursor; a file that exhausts its retries throws out of its worker's
  `while` loop, so that worker never pulls another photo. The pool bleeds to zero and the
  rest of the queue is never attempted. AEV-096 proved it: slot 29 gave up, slots 30–56
  were never tried. Two further consequences — `Promise.all` rejects on the first failure
  while the surviving workers keep uploading, and the catch sets `uploadInFlight = false`,
  disarming the close-tab guard while photos are genuinely still in flight; and
  `confirmUpload` never fires, which is why the order sits at `uploading` forever.
  The AEV-067 signature, flagged out-of-scope by this brief in S151 and still open.
- **AEV-096 is stranded at `uploading`** with no resume path (TO-DOS #90), reproduced in
  about three minutes. Added to the #60 cleanup list.

## Not proven

Every real-world failure behind #88 was **Safari on macOS**; all of this ran on Chrome for
Windows. #94's criteria do not require Safari, so this does not block closing it, but per
the brief a clean non-Safari run does not exonerate the transport.
