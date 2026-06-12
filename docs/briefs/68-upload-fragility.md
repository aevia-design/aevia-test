# Brief: Harden order-form photo upload against silent truncation (TO-DO #68)

> **⚠️ SUPERSEDED 2026-06-12.** This brief covered only the two cheap fixes (beforeunload + res.ok/retry). A full failure-mode audit (`order-flow-failure-map.md`) found six more issues sharing the same root cause. The executable plan is now **`order-flow-hardening.md`** — fixes A and B here are its **Chunk 3** and **Chunk 2** respectively. Use the hardening brief; this file is kept for history only.

**Created:** 2026-06-12
**Objective:** Stop an order from silently completing as a partial upload — warn the customer before they close a tab mid-upload, and make each photo PUT confirm it actually succeeded (retry on failure) instead of counting non-2xx responses as done.
**Audience:** Developer implementing the fix (next working session); Evgeny reviewing.
**Applicable Standards:** Project CLAUDE.md — simplicity-first, surgical edits, root-cause fixes, plain HTML/CSS/JS (no new deps).

## Why

With Wander live there are now two working templates and a real order is plausible. The current upload flow has a silent-failure hole that turns into a support nightmare: `createUploadSession` creates the Firestore order **and sends both the staff and customer confirmation emails BEFORE any photo is uploaded** (`functions/upload.js`). Photos are then PUT directly browser→GCS, 5 concurrent (`pages/order.html:1759`), and the server never hears that uploads finished. Two concrete defects follow:

1. **Tab-close = truncated order, no signal.** Close the tab at photo 30 of 106 and the order exists, emails are already out, and staff see a partial book with nothing flagging it as incomplete.
2. **The PUT never checks its response.** `await fetch(url, {method:'PUT', ...})` (`order.html:1759-1763`) ignores the result — an expired signed URL / 403 / 500 resolves the promise, so `uploadedCount++` runs and a *failed* upload is counted as success. This is a standalone latent bug independent of tab-close.

This brief covers only the two cheap, high-value fixes (a + b from the #68 investigation). The heavyweight option (c — server-side `uploadComplete` flag via a new callback function) is explicitly out of scope here.

## Requirements

**From the #68 investigation (sessions/2026-06-05-s38.md, S39 entry) and TO-DOS.md #68:**

Fix (a) — beforeunload guard:
- [ ] A `beforeunload` warning fires only while uploads are actually in flight — not before submit, not after the success screen shows.
- [ ] The guard is armed immediately before the upload loop starts (after Step 1 returns signed URLs) and disarmed on both success and the `catch` path (so a failed-but-handled order doesn't leave a stuck warning).
- [ ] Uses the standard `beforeunload` + `preventDefault()` / `returnValue` pattern — no custom modal (browsers ignore custom text anyway).

Fix (b) — PUT result check + retry:
- [ ] Each photo PUT checks `res.ok`; a non-2xx response is treated as a failure, not a success.
- [ ] A failed PUT retries 2–3 times before giving up (simple bounded loop; a short backoff is fine but not required).
- [ ] `uploadedCount` / `uploadedBytes` increment only after a confirmed-OK upload, so the progress bar reflects real successes.
- [ ] If a photo still fails after all retries, the whole submit throws into the existing `catch` block (`order.html:1782`) — the customer sees the existing inline error and the order is surfaced as failed rather than silently partial.

**From CLAUDE.md (project standards):**
- [ ] No new dependencies, frameworks, or build steps — plain JS edits inside the existing `submitOrder` flow.
- [ ] Surgical: touch only the upload loop, the guard arm/disarm points, and the `catch`/success disarm. Don't refactor the worker pool, progress logic, or unrelated code.
- [ ] Root cause, no band-aid: the `res.ok` check must be the real fix, not a try/catch that swallows the error.

## Constraints

- Files: `pages/order.html` (primary — the `submitOrder` upload section, ~lines 1686–1789). `functions/upload.js` only if a trivial change genuinely helps; default expectation is **client-only, no function redeploy**.
- Out of scope: server-side `uploadComplete` flag / new callback function (option c); true background upload (Service Worker Background Sync — rejected in S39); parallelism/speed changes (#53, #62); progress-UX redesign.
- The retry must not multiply a successful upload (don't re-PUT a photo that returned OK).
- Keep the existing 5-concurrent worker-pool structure intact.

## Success Criteria

The fix is complete when:
1. Attempting to close/reload the tab mid-upload triggers the browser's "leave site?" confirmation; doing so after the success screen does not.
2. A PUT that returns a non-2xx status is retried, and if it ultimately fails the customer sees the existing error screen — the order is never reported as successfully submitted when photos are missing.
3. A normal happy-path order still completes end-to-end with no spurious warning and a correct progress bar (verified against a real or test order).
4. No console errors; no new dependencies; diff limited to the upload section.

## References

**Code:** `pages/order.html:1686-1789` (submitOrder Step 1 + Step 2 upload loop), `:1759-1769` (the worker pool to modify), `:1782-1788` (existing catch).
**Backend context:** `functions/upload.js` — `createUploadSession` (sends emails before upload; do not change email timing in this brief).
**Investigation:** `sessions/2026-06-05-s38.md` → "S39 — Upload fragility investigated (TO-DO #68)"; `TO-DOS.md` #68.

## Context

- The PUT response bug (b) is genuinely independent of tab-close — worth fixing for its own sake (expired signed URLs would otherwise vanish silently).
- The guard (a) is presentation-only: it cannot *prevent* a determined close, only prompt. That's acceptable and the stated intent — the real durability fix is option (c), deliberately deferred.
- Known watch-out: don't arm `beforeunload` so early that it nags during form filling, and make absolutely sure the `catch` path disarms it, or a customer who hit a real error gets a phantom warning on every later navigation.
