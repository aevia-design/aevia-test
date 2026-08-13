# Brief: stranded-upload lifecycle — `upload_failed` status, staff email timing, and automated detection

**Created:** 2026-08-13 (Session 173) · **Revised:** 2026-08-13 (Session 174)
**Objective:** Make a failed upload a visible, self-detecting state that reaches the customer without a human watching for it, and stop staff being notified about orders that do not yet exist.
**Audience:** developer-agent (implements), then the owner (Evgeny) who verifies on the live rig.
**Applicable Standards:** `CLAUDE.md` (global + project), `AGENTS.md`, `rageatc-code-oss:verifying-work`, the customer-facing copy rule (`/stop-slop` pass before shipping)

> ## Status (S174): READY TO IMPLEMENT
>
> S173 marked this brief do-not-implement after a `critic-agent` review and a harder
> **Codex second opinion** (`work/upload-worker-resilience/codex-second-opinion.md`).
> **Every Codex claim has now been checked against the code.** Results:
>
> - **The blocking finding is fixed in code, not in prose.** Retry could have confirmed a
>   book with photos missing, because the #112 breaker leaves later slots *unattempted* and
>   unattempted slots never entered `uploadFailures`. Closed by commit `7864391` (S174):
>   `uploadFailures` now records never-attempted slots too, so **it means exactly "not in
>   GCS"**. Retry can trust it. Covered by a new `qa:order` case, confirmed red first.
> - **Six further claims verified true** and are now written into the brief below:
>   `uploadUrls` scope, `confirmUpload` non-atomicity, the `uploadErrors` mis-bucketing, the
>   "later order" heuristic, the scheduler/retry race, and the `STATUS_SEQUENCE` `-1` trap.
> - **Two claims the previous version of this brief got WRONG** are corrected below — the
>   dashboard does *not* drop an unenumerated status, and `account.html` does *not* leak a
>   raw string. Both were repeated from the critic review and neither was true.
> - **One claim dropped as immaterial (owner, S174):** the Cloud Scheduler free-tier
>   arithmetic. Corrected in the cost section for honesty; it does not affect the decision.

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
- [ ] The detection job proven against a **fresh, deliberately stranded post-cutoff order with an inbox we own** — see the acceptance-test note in Constraints, which explains why AEV-096 cannot serve this purpose

**From the existing status contract — CORRECTED (S174, verified against the code):**
- [ ] `upload_failed` added to the dashboard's **counts** ([`:459`](../../pages/staff/dashboard.html#L459)), **filter** ([`:285`](../../pages/staff/dashboard.html#L285)), **status dropdown** ([`:501`](../../pages/staff/dashboard.html#L501), [`:511`](../../pages/staff/dashboard.html#L511)) and **label map** ([`:1024`](../../pages/staff/dashboard.html#L1024)).
      ⚠ The previous version of this brief claimed an unenumerated status "silently disappears from the dashboard". **That is false** — `renderOrders` returns unfiltered `allOrders` for the All view ([`:424`](../../pages/staff/dashboard.html#L424)), so the order stays visible. What actually breaks is the counts, the filter, and a status dropdown with no matching option, which falls back to displaying "Uploading" — a staff member would see the wrong status and could act on it.
- [ ] **`upload_failed` must NOT go into `STATUS_SEQUENCE`** ([`:975`](../../pages/staff/dashboard.html#L975)) — see piece 6.
- [ ] `functions/account-utils.js` gets an entry in `customerStatusLabel`.
      ⚠ The previous version claimed an unmapped status "leaks a raw string to `account.html`". **That is false** — [`account-utils.js:46`](../../functions/account-utils.js#L46) returns `labels[status] || 'In progress'`. The real defect is subtler and arguably worse: the customer is shown a **reassuring "In progress"** for an order that is dead.

## What to build

The pieces form one story: **retry catches it while the customer is present; the job catches everything else.** Every retry that succeeds is an order the job never has to chase, which is why they are briefed together.

---

**0 · A Retry button on the order form's error screen.** The first line of defence, and by far the cheapest — when the upload fails the customer is usually still looking at the page, their photo files are **still in browser memory**, and the signed URLs are still valid. So a retry re-runs the worker pool over the missing slots and calls `confirmUpload`. No file re-picking, no new endpoint, no new permissions.

After #112 the retry is typically **one photo, not 106** — seconds, not minutes.

**Which slots to retry: `uploadFailures`, and that is now safe.** As of S174 (`7864391`) `uploadFailures` contains every slot absent from GCS, including the ones the breaker never attempted (marked `neverAttempted: true`). Before that fix this instruction would have confirmed incomplete books. **Do not "optimise" the retry to skip `neverAttempted` entries** — they are the majority of the missing photos in a breaker-tripped order, and skipping them recreates the exact bug that blocked this brief.

**Confirm only when the set is closed.** Retry must call `confirmUpload` only once the number of slots successfully uploaded across all attempts equals `fileObjects.length`. Do not confirm because a retry pass ended without errors.

⚠ **Scoping — the previous version of this brief was wrong here.** `submitOrder()` opens its `try` at [`:2578`](../../pages/order.html#L2578). `fileObjects` ([`:2507`](../../pages/order.html#L2507)) and `uploadFailures` ([`:2574`](../../pages/order.html#L2574)) are declared **before** it and *are* visible to the catch. But **`uploadUrls` is destructured at [`:2606`](../../pages/order.html#L2606), inside the `try`** — a sibling catch cannot see it, and it carries the signed URLs, without which a retry cannot upload anything. The old instruction to "attach the handler from inside the catch as a closure that still sees them" is therefore impossible as written.

**Fix:** declare `let uploadUrls = null;` beside `uploadFailures` before the `try`, and assign inside. One line, no widened lifetime beyond the function.

⚠ **The worker pool must be made callable twice.** This replaces the old blanket "do not modify the worker pool" constraint, which cannot coexist with a correct retry. Extract the existing pool into an inner `uploadSlots(indices)` that resets `nextIndex`, `circuitTripped` and `consecutiveFailures` per run, and call it with the full list first and the missing list on retry. **Behaviour must not change on the first pass** — this is an extraction, not a redesign. `#112` and `#94` were both verified there and must stay verified.

**Guard the button itself:** disable it while a retry is running, and **replace** rather than stack its click handler, or a second click starts a concurrent pool over the same slots.

**Immediate-session only. This is a decision, not an omission.** The button lives on the error screen of the *same page session* that failed. If the customer reloads or closes the tab, the button is gone and the scheduled job (pieces 1–5) takes over. Do **not** add `sessionStorage`, state recovery, or a way back after a reload — that is the deferred self-service resume, and building a half-version of it here is exactly the speculative complexity `CLAUDE.md` rule 0 forbids.

⚠ This is the one piece that touches `pages/order.html`. `npm test` does **not** execute that file, which is how a crash reached the live rig in S154 with 281 tests green. **`npm run qa:order` is mandatory before pushing it** (the `.githooks/pre-push` hook does this automatically).

---

**1 · A real `upload_failed` status.** A scheduled job flips `uploading` → `upload_failed` once the order is **older than 1 hour** (owner's decision, S173). One hour clears the longest legitimate upload by a wide margin: 1.12 GB took 5+ minutes (#53), 110 files ~3 minutes (#62).

**On signed-URL lifetime:** they are minted for 24 hours ([`upload.js:109`](../../functions/upload.js#L109)) — *from order creation*, not from the flip. A flipped order has the remainder, roughly 23 hours. Do not describe a flipped order as having "another 24 hours".

**Where the job lives.** A `pubsub.schedule` function in `functions/index.js`, alongside the existing handlers and in the style they use — `firebase-functions` **v4 (v1 API)**, `.region('europe-west1')`, e.g. `functions.region('europe-west1').pubsub.schedule('every 60 minutes').onRun(...)`. It ships with the existing `firebase deploy --only functions` — **no separate deploy path**. Note for accuracy: this *does* provision new infrastructure (a Cloud Scheduler job and a Pub/Sub topic); Firebase simply creates them for you. The earlier claim of "no new infrastructure" was wrong.

**The flip must be atomic.** Use a Firestore transaction that re-checks `status === 'uploading'` and `uploadComplete !== true` before writing. See piece 5 for why.

---

**2 · Move the staff "New Order" email to `confirmUpload`.** Staff should learn about an order when it exists, not when someone starts one. In-progress orders remain visible on the dashboard for anyone who looks. This also removes a live failure mode: today a staff SMTP failure at [`upload.js:218-250`](../../functions/upload.js#L218-L250) can strand a newly created order *before the browser ever receives its signed URLs*.

⚠ **`confirmUpload` is not currently safe to put a second email into.** Verified at [`upload.js:311-360`](../../functions/upload.js#L311-L360): idempotency is a **read followed by an update**, not a transaction, and the update happens **before** any email is sent. Two consequences, both real:

- Two concurrent calls (retry racing a slow first call) can both read `uploadComplete: false` and both send mail.
- If the customer email throws *after* the update, a retry sees `uploadComplete: true` and returns 200 immediately. Move staff mail in naively and **staff are never notified, silently.**

**Fix:** make the update a Firestore transaction so exactly one caller wins the confirmation. The winner then attempts the customer and staff emails **independently** — `Promise.allSettled`, or two separately guarded sends — recording a success/error timestamp per channel. One SMTP failure must not suppress the other email.

**State the guarantee honestly: at most once.** Firestore and SMTP cannot be made atomic together. Preferring a lost email to a duplicate is the same choice piece 5 makes, and it should be made deliberately in both places.

---

**3 · A customer email on `upload_failed` — but only when the evidence supports it.** Send only when **no other order from the same email address completed successfully after this one was created**. If the customer gave up and resubmitted, a good order already exists; emailing them about the abandoned one is worse than silence.

**This is a heuristic, not certainty — say so and design for being wrong.** The same address may legitimately order two books, and households share addresses. A second successful order then suppresses help for a first one that genuinely needed it. So: when suppression fires, record the disposition `later_order_succeeded` (piece 7) and show it on the dashboard, so a human can still see the case and act. Do not describe this rule as the system "being sure".

**Define success precisely** as `uploadComplete === true`, regardless of the order's later workflow status.

**Normalise the email server-side.** `normalizeEmail` exists in [`account-utils.js:15`](../../functions/account-utils.js#L15) but `createUploadSession` never calls it — it stores whatever the caller sent. New browser submissions are lowercased at [`order.html:2386`](../../pages/order.html#L2386), so this is not a live bug today, but the matching in this piece must not depend on the client having been well-behaved. Normalise on creation.

**Query it the way the repo already does** — follow [`functions/index.js:1078-1091`](../../functions/index.js#L1078-L1091): query by normalised email, filter on `createdAt`/`uploadComplete` in code. **No composite index.**

Message shape (owner's draft, needs the copy pass): *we noticed your upload did not finish; if you have not already sorted it, write to support and we will help you submit your order.*

---

**4 · Classify the failure correctly before deciding to email.** The two-bucket rule from S173 stands, but the predicate was wrong.

- **Real photo failures** — one or more slots never reached GCS. The customer saw an error. **Email them.**
- **No client-side error at all** — the tab closed before anything could be reported (the AEV-079 signature), or they changed their mind. Ambiguous. **Flag to staff, do not chase the customer.**
- **Finalisation failure** — ⚠ **verified**: when every photo uploaded but `confirmUpload` failed, [`order.html:2912-2934`](../../pages/order.html#L2912-L2934) writes an `uploadErrors` entry with `stage: 'confirmUpload'` **and still shows the customer the success screen**. Bucketing on the mere presence of `uploadErrors` would email "your upload did not finish" to someone whose photos are all present and who was told it worked. Treat `stage: 'confirmUpload'` as its own disposition `finalization_failed`: **staff alert, no customer email.** Moving staff mail (piece 2) makes this path more important, because staff may have heard nothing either.

**Do not use field presence as the predicate.** Inspect what the entries actually are.

The ratio between these dispositions is the number that decides whether self-service resume is ever worth building.

---

**5 · Make the transition itself the guard — do not add a separate sent-flag.** S173 specified a boolean written before the email. Cut it. The job selects on `status == 'uploading'` and the transaction flips the status *before* mailing, so the order cannot be selected again on the next run. A second boolean duplicates that state and, written before SMTP, records "sent" for an email that then failed.

Keep **per-channel attempt/result timestamps** for audit. That is the useful part; the flag is not.

⚠ **The race the transaction closes.** Near the one-hour boundary the job can flip an order and email "your upload did not finish" while the still-open tab successfully retries and `confirmUpload` sends a confirmation. **The customer receives both, contradicting each other.** Make the flip conditional inside the transaction, and **re-read `uploadComplete` immediately before sending** the failure notice. This does not make Firestore and SMTP atomic — nothing can — but it closes the ordinary case.

---

**6 · `upload_failed` is a side-state, not a step.** Model it on the existing `issue` state, not on the linear workflow.

⚠ **Verified trap:** the progression guard at [`dashboard.html:975-983`](../../pages/staff/dashboard.html#L975-L983) does `STATUS_SEQUENCE.indexOf(current)`. Put `upload_failed` in that array and a failed upload reads as a normal mandatory step between `uploading` and `new`. Leave it out and `indexOf` returns `-1`, which **silently permits any jump at all**. Neither is acceptable by accident, so decide it explicitly:

- **Not** in `STATUS_SEQUENCE`. Handle the `-1` case explicitly rather than letting it fall through.
- One allowed recovery path: `upload_failed → new`, via `confirmUpload`.
- **Not** eligible for preview-send.
- Record `uploadFailedAt` and a `statusHistory` entry.

---

**7 · One disposition field, so staff know what they are looking at.** Every stranded order otherwise arrives at the same status with no indication of why or what to do. Store `uploadFailureDisposition` with one of:

| Value | Meaning | Action |
|---|---|---|
| `customer_notified` | Real photo failures, email sent | Wait, then follow up |
| `later_order_succeeded` | Suppressed; a newer order from that address completed | Check it is not a genuine second book, then delete the orphan |
| `no_client_error` | Nothing reported; tab likely closed | Do not chase |
| `finalization_failed` | All photos present, `confirmUpload` failed | Staff fix — the customer thinks it worked |

Show it in the failed-order row. **No chart, no metrics service** — Firestore fields are enough to count later, and a non-technical owner cannot recover this distinction from logs.

## Constraints

- **Files:** `functions/` (new scheduled function + `upload.js` email move and transaction), `pages/staff/dashboard.html`, `functions/account-utils.js`, `pages/order.html` (retry button + pool extraction)
- **Do not touch:** the stall detection itself (#94, verified S173). The worker pool may be **extracted** for reuse (piece 0) but its behaviour on the first pass must not change
- **Do not build:** the self-service resume page or a re-issue-signed-URLs endpoint. Explicitly deferred
- **Ship order:** piece 0 (retry) is independent of the backend work and can ship first. Pieces 1–7 depend on each other
- **Backwards compatibility:** existing orders stuck at `uploading` (AEV-067/073/074/079/096) must not be emailed about — they are QA orders. **Use a creation-date cutoff, not a hardcoded ID list**: the job ignores anything created before the deploy date. A date is self-maintaining; a list of order numbers is one forgotten entry away from emailing a test address
- ⚠ **Acceptance testing cannot use AEV-096.** S173 asked the job to both ignore every pre-deploy order *and* flip AEV-096. Those contradict. **Create a fresh stranded order after the cutoff, with an inbox we own**
- **Testing:** ⚠ [`tests/chunk-4-order-flow.test.js`](../../tests/chunk-4-order-flow.test.js) imports neither `functions/upload.js` nor the deployed handler — it **copies** the behaviour. Updating it can stay green while the real email move is broken. This is the exact failure `LEARNINGS.md` records from S154. Test the shipped handler with mocked dependencies, or extract a small pure decision helper the handler actually calls. `npm run qa:order` remains the gate for the order page, and must cover: a single failure, a **breaker-tripped run with trailing unattempted slots**, a repeated Retry click, and the number of `confirmUpload` calls
- **Region:** same region as existing functions and storage (ADR-0005, ADR-0006)

## Success Criteria

1. **Retry recovers an order without re-picking photos.** With one slot failed, pressing Retry uploads only the missing photo, `confirmUpload` fires once, and the order reaches `status: new` / `uploadComplete: true`.
2. **Retry cannot confirm an incomplete book.** In a run where the breaker trips and leaves trailing slots unattempted, Retry uploads **every** missing slot and `confirmUpload` fires only after all of them succeed. Proven in `npm run qa:order`.
3. **A stranded order flips itself.** An order left at `uploading` past the threshold becomes `upload_failed` without anyone opening the dashboard, and appears correctly in the dashboard counts, filter, dropdown and label.
4. **Staff are emailed only about orders that exist**, exactly once, and a customer-email failure does not suppress the staff email.
5. **The customer email fires only when it should.** Proven three ways: real photo failures with no later success **send**; the same with a later successful order from that address **do not** and record `later_order_succeeded`; a `stage: 'confirmUpload'` failure **does not** and records `finalization_failed`.
6. **The customer never receives contradictory emails** — a retry succeeding as the job fires produces a confirmation and no failure notice.
7. **Every stranded order carries a disposition** a non-technical owner can act on from the dashboard alone.
8. All requirements from standards are met, with verification output included in the report.

## References

**Code:** [`functions/upload.js:103-221`](../../functions/upload.js#L103-L221) (order creation + staff email), [`:311-360`](../../functions/upload.js#L311-L360) (`confirmUpload` — read-then-update, not transactional), [`functions/account-utils.js:15`](../../functions/account-utils.js#L15) (`normalizeEmail`), [`:26-74`](../../functions/account-utils.js#L26-L74) (customer status labels), [`pages/staff/dashboard.html`](../../pages/staff/dashboard.html) lines 285 (filter), 424 (All view — unfiltered), 459 (counts), 501/511 (dropdown), 975 (`STATUS_SEQUENCE`), 1024 (label map), [`pages/order.html:2862-2900`](../../pages/order.html#L2862-L2900) (S174 never-attempted recording)

**Previous work:** [`work/upload-worker-resilience/decision.md`](../../work/upload-worker-resilience/decision.md) (#112), [`work/upload-worker-resilience/codex-second-opinion.md`](../../work/upload-worker-resilience/codex-second-opinion.md) (the second opinion, all claims now verified), [`work/stall-detection/VERIFICATION.md`](../../work/stall-detection/VERIFICATION.md) (#94 closed S173), [`docs/briefs/upload-failures.md`](upload-failures.md) — **read its header block first**

**Backlog:** TO-DOS #89 (this brief supersedes its "derived label" plan — the status becomes real), #90 (unblocked in part, not closed), #60 (cleanup list)

## Context

**Background decisions already made (owner, S173/S174):**
- **Threshold is 1 hour.** `uploading` → `upload_failed`.
- **No customer email if a later order from the same address succeeded** — now explicitly a heuristic, with a disposition so a human can override it.
- **Detection is automated; recovery is human.** The owner explicitly does not want a manual monitoring habit, and equally does not want a self-service resume page built on speculation.
- **The Scheduler free-tier question is immaterial (owner, S174).** Corrected below for accuracy; it does not change the decision.
- **#112 is fixed and does not solve this.** A failed upload now leaves ~105 of 106 photos in GCS instead of ~28, and reports which photos are missing — but the order is still stranded. That is what this brief addresses.

**Known risks:**
- **The 1-hour threshold assumes uploads never legitimately exceed it.** No measurement above ~6 minutes exists. An 80pp order on a weak mobile link is untested; if the job starts flipping live uploads, raise the threshold rather than removing the job.
- **The dashboard has many status enumerations.** Missing one does not hide the order (verified), but it does corrupt counts and can display the wrong status in the dropdown, which is worse than an absence because it looks authoritative.
- **Cost: expected to round to zero, with the arithmetic stated honestly.** Cloud Scheduler bills **US$0.10/job/month with 3 free jobs per _billing account_** — not per project, so the free slot cannot be proven from this repo and the earlier "€0, this is the first" claim was unfounded. Worst case is **US$0.10/month**. Hourly firing is 720 invocations/month against a 2,000,000 free tier. The Firestore query filters on `status == 'uploading'` and returns a handful of documents against a 50,000 reads/day free tier. **No GCS object reads, no egress, no cross-region traffic, and nothing that scales with photo count or book size** — the per-order cost is one document read and one write. The only driver worth watching is firing frequency: every-minute scheduling would be 43,200 invocations/month, still inside the free tier but no longer trivially so.
