# Brief: stranded-upload lifecycle — `upload_failed` status, staff email timing, and automated detection

**Created:** 2026-08-13 (Session 173)
**Objective:** Make a failed upload a visible, self-detecting state that reaches the customer without a human watching for it, and stop staff being notified about orders that do not yet exist.
**Audience:** developer-agent (implements), then the owner (Evgeny) who verifies on the live rig.
**Applicable Standards:** `CLAUDE.md` (global + project), `AGENTS.md`, `rageatc-code-oss:verifying-work`, the customer-facing copy rule (`/stop-slop` pass before shipping)

## Why

Aevia creates the order **before** any photo moves. `createUploadSession` mints the order number, writes it to Firestore with `status: 'uploading'`, and **emails staff "New Order"** — all before the first byte reaches GCS ([`functions/upload.js:103-221`](../../functions/upload.js#L103-L221)). `confirmUpload` later flips it to `new`.

Three consequences, all live today:

1. **Staff are notified about orders that may never arrive.** Four orders stranded in July (AEV-067/073/074/079) and one in S173 (AEV-096). Each generated a "New Order" email; none of them exists as a real order. Nothing reconciles the two.
2. **A dead order is invisible.** It sits at `uploading` forever, indistinguishable on the dashboard from an upload running right now (**TO-DOS #89**).
3. **The customer hears nothing.** They got no confirmation email, cannot resume, and resubmitting mints a *new* order number (**TO-DOS #90**).

F&F is ~100 real orders from roughly September 2026. This will happen to a paying customer, and today the outcome is silence on both sides.

**Why this shape and not a bigger one.** Competitors (Shutterfly, CEWE, Artifact Uprising) are DIY project tools: the customer assembles the book themselves over multiple sessions, so a saved project and self-service resume are core product features. Aevia is done-for-you — the customer's job is one upload, then a person designs the book. **A human at Aevia following up is the product, not an automation failure.** So the automation to build is the *detection*, not the recovery. Self-service resume (an emailed link that reopens the order with only the missing slots) was considered and **deliberately deferred** until this ships and produces real numbers.

## Requirements Extracted from Standards

**From `CLAUDE.md` (global — simplicity, surgical edits, root cause):**
- [ ] Smallest thing that solves the problem; no speculative abstraction for a resume flow we have not committed to
- [ ] Change only what the task needs — do not reformat or refactor unrelated dashboard code
- [ ] Non-obvious decisions explained in plain language in the final report (owner is new to coding)

**From `CLAUDE.md` (project — cost awareness, cloud spend):**
- [ ] Expected cost and the main cost driver stated in plain language **before** anything is deployed
- [ ] Scheduler/function/Firestore stay in the existing region — no cross-region reads, no egress
- [ ] Nothing added that scales per-photo or per-GB

**From `CLAUDE.md` (project — customer-facing copy):**
- [ ] The customer email gets a `/stop-slop` pass before it ships (cut filler, no em dashes, active voice)
- [ ] Staff-only surfaces (dashboard) are exempt from that pass

**From `AGENTS.md` / `rageatc-code-oss:verifying-work`:**
- [ ] No completion claim without fresh verification output pasted into the report
- [ ] The detection job proven against a real stranded order, not a mock — AEV-096 is on disk and stranded right now

**From the existing status contract:**
- [ ] `upload_failed` added to **every** place that enumerates statuses, or the dashboard silently drops the order from counts and filters
- [ ] The customer-facing label map in `functions/account-utils.js` gets an entry — an unmapped status leaks a raw string to `account.html`

## What to build

The pieces form one story: **retry catches it while the customer is present; the job catches everything else.** Every retry that succeeds is an order the job never has to chase, which is why they are briefed together.

**0 · A Retry button on the order form's error screen.** The first line of defence, and by far the cheapest — when the upload fails the customer is usually still looking at the page, their photo files are **still in browser memory**, and the signed URLs are good for another 24 hours. So a retry re-runs the worker pool over the failed slots and calls `confirmUpload`. No file re-picking, no new endpoint, no new permissions.

After #112 the retry is typically **one photo, not 106** — seconds, not minutes.

**Immediate-session only. This is a decision, not an omission.** The button lives on the error screen of the *same page session* that failed. If the customer reloads or closes the tab, the button is gone and the scheduled job (pieces 1–4) takes over. Do **not** add `sessionStorage`, state recovery, or a way back after a reload — that is the deferred self-service resume, and building a half-version of it here is exactly the speculative complexity `CLAUDE.md` rule 0 forbids.

⚠ **Where the button must be wired.** `fileObjects` ([`order.html:2507`](../../pages/order.html#L2507)), `uploadUrls` ([`:2606`](../../pages/order.html#L2606)) and `uploadFailures` ([`:2574`](../../pages/order.html#L2574)) are all `const`, declared **inside `submitOrder()`** ([`:2364`](../../pages/order.html#L2364)). They do not exist once it returns. So the retry handler has to be attached **from inside the catch block**, as a closure that still sees them. A handler wired at page load will find nothing. Do not hoist those to module scope to work around this — the closure is smaller and does not widen their lifetime.

⚠ This is the one piece that touches `pages/order.html`. `npm test` does **not** execute that file, which is how a crash reached the live rig in S154 with 281 tests green. **`npm run qa:order` is mandatory before pushing it** (the `.githooks/pre-push` hook does this automatically).

**1 · A real `upload_failed` status.** A scheduled job flips `uploading` → `upload_failed` once the order is **older than 1 hour** (owner's decision, S173). One hour clears the longest legitimate upload by a wide margin: 1.12 GB took 5+ minutes (#53), 110 files ~3 minutes (#62). Signed upload URLs stay valid 24 hours ([`upload.js:109`](../../functions/upload.js#L109)), so a flipped order is still recoverable for another 23.

**Where the job lives.** A `pubsub.schedule` function in `functions/index.js`, alongside the existing handlers and written in the same style they use — `firebase-functions` **v4 (v1 API)**, `.region('europe-west1')`, e.g. `functions.region('europe-west1').pubsub.schedule('every 60 minutes').onRun(...)`. This provisions Cloud Scheduler automatically; there is **no new infrastructure to create, no new region, and no separate deploy path**. Ships with the existing `firebase deploy --only functions`.

**2 · Move the staff "New Order" email to `confirmUpload`.** Staff should learn about an order when it exists, not when someone starts one. In-progress orders remain visible on the dashboard for anyone who looks.

**3 · A customer email on `upload_failed` — but only when the system is sure.** Send only when **no other order from the same email address completed successfully after this one was created**. If the customer gave up and resubmitted, a good order already exists; emailing them about the abandoned one is worse than silence. In that case, flag the orphan to staff for deletion instead.

Message shape (owner's draft, needs the copy pass): *we noticed your upload did not finish; if you have not already sorted it, write to support and we will help you submit your order.*

**4 · Two buckets, only one of which gets a customer email.**
- **`uploadErrors` present** — the customer saw an error and knows something went wrong. Email them.
- **No `uploadErrors`** — the tab closed before anything could be reported (the AEV-079 signature), or they simply changed their mind. Ambiguous. **Flag to staff, do not chase the customer.**

The ratio between these two buckets is the number that decides whether self-service resume is ever worth building.

**5 · A sent-flag on the order** so a stranded order is not chased on every run. **Write the flag in the same Firestore update that sets `upload_failed`, before the email is sent**, so a job that crashes mid-run cannot email the same customer twice. An email that fails to send and is never retried is a far better failure than one sent three times.

## Constraints

- **Files:** `functions/` (new scheduled function + `upload.js` email move), `pages/staff/dashboard.html`, `functions/account-utils.js`, `pages/order.html` (retry button only)
- **Do not touch:** the upload worker pool or the stall detection itself in `order.html` — S173 closed #94 and #112 there and both are verified. The retry button **reuses** that worker pool; it must not modify it
- **Do not build:** the self-service resume page or a re-issue-signed-URLs endpoint. Explicitly deferred
- **Ship order:** piece 0 (retry) is independent of the backend work and can ship first. Pieces 1–5 depend on each other
- **Backwards compatibility:** existing orders stuck at `uploading` (AEV-067/073/074/079/096) must not be emailed about — they are QA orders. **Use a creation-date cutoff, not a hardcoded ID list**: the job ignores anything created before the deploy date. A date is self-maintaining and cannot go stale; a list of order numbers is one forgotten entry away from emailing a test address, and grows forever
- **Region:** same region as existing functions and storage (ADR-0005, ADR-0006)

## Success Criteria

The deliverable is complete when:

1. **Retry recovers an order without re-picking photos.** With one slot failed, pressing Retry uploads only the missing photo, `confirmUpload` fires, and the order reaches `status: new` / `uploadComplete: true`. Proven by `npm run qa:order`, extending the existing failed-upload case.
2. **A stranded order flips itself.** An order left at `uploading` past the threshold becomes `upload_failed` without anyone opening the dashboard, and shows as such with its own badge, filter and label.
3. **Staff are emailed only about orders that exist.** A failed upload produces no "New Order" email; a successful one still does, exactly once.
4. **The customer email fires only when it should.** Proven both ways: an order with `uploadErrors` and no later successful order from that email **does** send; the same order with a later successful order from that email **does not**.
5. **No status is dropped anywhere.** `upload_failed` appears correctly in the dashboard counts, filters and sequence, and renders a sensible customer-facing label in `account.html`.
6. All requirements from standards are met, with verification output included in the report.

## References

**Code:** [`functions/upload.js:103-221`](../../functions/upload.js#L103-L221) (order creation + staff email), [`:311-350`](../../functions/upload.js#L311-L350) (`confirmUpload`), [`functions/account-utils.js:26-74`](../../functions/account-utils.js#L26-L74) (customer-facing status labels), [`pages/staff/dashboard.html`](../../pages/staff/dashboard.html) lines 135 (badge CSS), 285 (filter), 455-461 (counts), 501, 511, 975 (`STATUS_SEQUENCE`), 1024 (label map)

**Previous work:** [`work/upload-worker-resilience/decision.md`](../../work/upload-worker-resilience/decision.md) (#112, and what it does *not* fix), [`work/stall-detection/VERIFICATION.md`](../../work/stall-detection/VERIFICATION.md) (#94 closed S173), [`docs/todo-notes.md#90`](../todo-notes.md) (stranded-order history), [`docs/briefs/upload-failures.md`](upload-failures.md) — **read its header block first**

**Backlog:** TO-DOS #89 (this brief supersedes its "derived label" plan — the status becomes real), #90 (unblocked in part, not closed), #60 (cleanup list)

## Context

**Background decisions already made (owner, S173):**
- **Threshold is 1 hour.** `uploading` → `upload_failed`.
- **No customer email if a later order from the same address succeeded.** The system checks rather than hedging in the copy.
- **Detection is automated; recovery is human.** The owner explicitly does not want a manual monitoring habit, and equally does not want a self-service resume page built on speculation.
- **#112 is fixed and does not solve this.** A failed upload now leaves ~105 of 106 photos in GCS instead of ~28, and reports which photo failed — but the order is still stranded. That is what this brief addresses.

**Known risks:**
- **A status added in one place and not the others silently disappears from the dashboard.** There are at least seven enumerations to update in `dashboard.html` alone, plus two in `account-utils.js`.
- **The 1-hour threshold assumes uploads never legitimately exceed it.** No measurement above ~6 minutes exists. An 80pp order on a weak mobile link is untested; if the job starts flipping live uploads, raise the threshold rather than removing the job.
- **Cost: effectively €0.00/month, and here is the arithmetic** rather than a reassuring adjective. Cloud Scheduler bills per job per month with **3 jobs free**; this is the first, so €0. Hourly firing is **720 invocations/month** against a 2,000,000 free tier, so €0. The Firestore query is filtered on `status == 'uploading'` and returns a handful of documents, against a 50,000 reads/day free tier, so €0. **No GCS object reads, no egress, no cross-region traffic, and nothing that scales with photo count or book size** — the only per-order cost is one document read and one write. The single cost driver worth watching is firing frequency; if the schedule were ever tightened to every minute it becomes 43,200 invocations/month, still free but no longer trivially so.
