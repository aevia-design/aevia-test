# Codex second opinion — upload-failure-recovery brief (S173, 2026-08-13)

⚠ **Two caveats before acting on any of this.**

1. **Unverified.** Codex ran headless (`codex exec`, gpt-5.6-sol) with **no skill and no
   rubric** — only a task file. Every finding below is a CLAIM to check against the code, not
   an accepted finding. Finding 1 looks correct by inspection; the rest are unchecked.
2. **Truncated.** Codex did not save its review to this directory as instructed, so this is
   the captured run output, piped through `tail -120`. **The opening "factual check" section
   is missing.** Re-run if that part is needed.

---


`tests/chunk-4-order-flow.test.js` simulates copied behavior and imports neither `functions/upload.js` nor the deployed handler. Updating that test can stay green while the real email move is broken. This is exactly the failure recorded in `LEARNINGS.md`: a test that mirrors code proves nothing.

**Fix:** Test the shipped handler with mocked dependencies, or extract and directly test a small pure decision helper used by the handler. Keep `npm run qa:order` for the real order page, including single failure, breaker/trailing slots, repeated Retry, and confirmation-call count.

## Simplicity: anything to cut

- **Cut piece 5 as a separate sent flag in the design as written.** The job queries `uploading` and atomically changes it to `upload_failed` before mail; that transition already prevents selection on the next run. A second boolean duplicates the state and, when written before SMTP, falsely says “sent” after a send failure. Keep per-channel attempt/result timestamps only for audit.

- **Do not add a Firestore composite index or analytics counter.** Query the small `uploading` set and apply age/cutoff in code; query the small per-email set and apply created-time/success filtering in code. This follows existing repo prior art and keeps deployment smaller.

- **Do not cut the retry, status, staff-email move, customer gating, or two-bucket classification.** Each addresses a distinct observed failure. Piece 0 is not a button-only change, though; the brief must admit the small extraction needed to make it correct.

No proposal contradicts an `AGENTS.md` settled decision. The brief itself repeats two `LEARNINGS.md` failures: misunderstanding `const` scope in `order.html`, and relying on tests that mirror rather than execute shipped code. Its guaranteed-zero cost wording also conflicts with the lesson to distinguish measured facts from assumptions.

## Verdict

**No. Implementation cannot start as written.** The retry instructions are technically impossible from the catch block and can confirm an incomplete book after the circuit breaker. The email move also lacks a concurrency-safe, failure-isolated confirmation design. Fix findings 1–4 and define the status/disposition behavior before implementation; the remaining changes are small.
tokens used
155,952
The workspace is read-only, so the requested file could not be created. Here is the complete review intended for `work/upload-worker-resilience/codex-second-opinion.md`.

# Second opinion: upload-failure recovery brief

## Factual check

- **`fileObjects`, `uploadUrls`, and `uploadFailures` are all `const` inside `submitOrder()`: VERIFIED, but the conclusion drawn from that is FALSE.** `fileObjects` is declared at `pages/order.html:2507` and `uploadFailures` at `:2574` in the function body, so the `catch` can see them. `uploadUrls` is a destructured `const` at `:2606` inside the `try` block. A sibling `catch` cannot see it. The worker and its state (`total`, `nextIndex`, `circuitTripped`, counters) are also scoped inside the `try`. Therefore “attach the handler from inside the catch as a closure that still sees them” cannot work as written. The brief must permit a small extraction or declare retry state outside the `try`.

- **Signed upload URLs are valid for 24 hours: VERIFIED.** `functions/upload.js:109` sets expiry to `Date.now() + 24 hours`, and `:144-146` uses it for each V4 write URL. “Good for another 24 hours” is overstated: Retry gets only the unexpired remainder. At the one-hour threshold, nominally about 23 hours remain.

- **The staff “New Order” email is sent at order creation: VERIFIED.** The order is written at `functions/upload.js:190-213`; staff mail is awaited at `:218-250`, before `createUploadSession` returns signed URLs at `:288-296`. A staff SMTP failure can currently strand a newly created order before the browser receives any upload URLs. Moving the email removes that failure mode.

- **An unenumerated status disappears from the staff dashboard: FALSE as stated.** `loadOrders()` loads every order, and the All view returns `allOrders`; `upload_failed` would remain visible there. What actually breaks is still serious: it is omitted from category counts, has no filter, has no selected option in the status dropdown—which will visually fall back to “Uploading”—has no label, and the progression guard does not understand it. Also, the cited badge CSS is not currently used by the table; success criterion 2 asks for a badge that this dashboard does not render today.

- **An unmapped status leaks the raw string to `account.html`: FALSE.** `functions/account-utils.js:32-46` returns `labels[status] || 'In progress'`, and `account.html` renders the projected `statusLabel`. Without a mapping, customers see the misleading generic label “In progress,” not `upload_failed`.

- **`npm test` does not execute `pages/order.html`: VERIFIED.** `package.json` runs Jest over `tests/**/*.test.js`. Some tests read the file as text or copy its logic, but none loads and executes the page in a browser. `npm run qa:order` runs the real page via Playwright and is the relevant gate.

- **The scheduled-function mechanics are mostly VERIFIED.** The repo uses `firebase-functions` 4.9 through the v1 namespace and existing functions use `.region('europe-west1')`; no scheduled function exists in this checkout. A scheduled deploy automatically creates a Scheduler job and Pub/Sub topic. Thus “no separate deploy path” is correct, but “no new infrastructure” is FALSE: the infrastructure is new, just automatically provisioned. [Firebase documents those automatically created resources.](https://firebase.google.com/docs/functions/1st-gen/schedule-functions-1st)

- **The stated €0.00 monthly cost is UNVERIFIABLE from the repo.** Scheduler provides three free jobs per billing account, not per repo or project, so “this is the first” does not prove a free slot exists. Firestore and function free-tier consumption elsewhere is also unknown. The likely cost is tiny, and the no-GCS/no-egress claim is sound, but it should say “expected near zero; the scheduler component is US$0.10/month if no free slot remains, plus negligible reads and compute,” not guarantee zero. [Current Scheduler pricing is US$0.10/job/month with three free jobs per billing account.](https://cloud.google.com/scheduler/pricing)

- **“Prove it against AEV-096” is incompatible with the new cutoff: FALSE as an acceptance test.** The brief requires the shipped job to ignore every pre-deploy order, including AEV-096, while also requiring AEV-096 to flip. Both cannot be true. Use a fresh, deliberately stranded post-cutoff test order with an owned inbox.

## Findings the previous review missed

### 1. Critical: retrying only recorded failures can confirm a book with missing photos

The circuit breaker deliberately stops after five consecutive failures. Later queue entries were never attempted and therefore are not in `uploadFailures`. If Retry uploads only `uploadFailures` and then calls `confirmUpload`, those unattempted slots remain absent from GCS while the order becomes `new` / `uploadComplete: true`. AEV-096 is the exact triggering shape: slots 30–56 were unattempted.

**Fix:** Track successful slot indexes. On retry, upload every slot not known successful, not merely entries in `uploadFailures`; call `confirmUpload` only when the successful set size equals `fileObjects.length`. Clear per-run failures and reset all worker state before each retry. Permit extracting the existing pool into an inner `uploadSlots(indices)` function; the current “do not modify the worker pool” constraint conflicts with the requested reuse. Add a QA case where the breaker leaves trailing slots unattempted, then Retry proves every slot received a successful PUT before confirmation.

### 2. High: `confirmUpload` is not concurrency-safe, and moving another email into it can lose staff mail

Current idempotency is a read followed by an update. Two concurrent calls can both read `uploadComplete: false`, both update, and both send mail.

Conversely, the update happens before email. If the customer email throws and the moved staff email is later in the function, retry sees `uploadComplete: true`, returns 200 immediately, and staff are never notified. “Exactly once” cannot be guaranteed across Firestore and SMTP without a transactional mail system.

**Fix:** Use a Firestore transaction to make one caller the confirmation winner and set `uploadComplete`/`status` as the claim. The winner must attempt customer and staff mail independently using `Promise.allSettled` or separate guarded sends, recording success/error timestamps for each; one SMTP failure must not prevent the other attempt. State the actual guarantee as **at most once**, matching piece 5’s declared preference. Disable Retry while running and replace, rather than stack, its click handler.

### 3. High: `uploadErrors` does not mean the customer saw an upload error

When all photos uploaded but `confirmUpload` fails, `order.html:2912-2934` writes an `uploadErrors` entry with `stage: 'confirmUpload'` and still shows the success screen. The scheduled job would put that order in the brief’s “customer saw an error” bucket and email “your upload did not finish.”

Both assertions are false: the bytes may all be present and the customer was told success. Moving staff mail makes this path more important because staff may also have heard nothing.

**Fix:** Classify actual photo failures only when an entry represents a PUT/slot failure. Treat `stage: 'confirmUpload'` as `finalization_failed`, with accurate copy or a staff-only alert. Do not use mere field presence as the predicate.

### 4. High: the “later successful order” rule is underspecified and is not certainty

Guest orders are not a problem: they still store an email. New browser submissions are lowercased at `order.html:2386`. However, `createUploadSession` trusts the caller and stores the supplied email without server normalization, so casing is not guaranteed.

More importantly, the same address may legitimately place two books; the second successful book then suppresses help for the first. Shared household addresses have the same problem. The phrase “when the system is sure” is wrong.

**Fix:** Define success precisely as `uploadComplete === true`, regardless of the order’s later workflow status. Normalize email server-side on creation with the existing `normalizeEmail` behavior. Follow the existing simple pattern at `functions/index.js:1078-1091`: query by normalized email and filter `createdAt`/`uploadComplete` in code, avoiding a composite index. Call the suppression a heuristic and ensure the dashboard tells staff `later_order_succeeded`, so a legitimate second-book case remains recoverable by a human.

### 5. Medium: scheduler and same-session retry can send contradictory emails

Near the one-hour boundary, the job can mark/send an upload-failure notice while the open tab successfully retries and `confirmUpload` sends confirmation. The customer can receive both.

**Fix:** Make the scheduled transition conditional in a Firestore transaction, and re-read `uploadComplete` immediately before sending the failure notice. This cannot make SMTP and Firestore atomic, but it closes the normal race. Add a test in which confirmation wins between the job’s query and update/send.

### 6. Medium: `upload_failed` has no defined state-machine semantics

Putting it into `STATUS_SEQUENCE` makes failure look like a mandatory normal step between `uploading` and `new`; omitting it makes the guard silently allow any jump because `indexOf()` returns `-1`. The browser and backend pre-approval lists also differ already. The brief says “add it to every enumeration” without saying where it should deliberately not be included.

**Fix:** Define it as a triage side-state, like `issue`, with explicit allowed recovery `upload_failed -> new` from `confirmUpload`. Do not include it in preview-send eligibility. Add `uploadFailedAt` and a `statusHistory` entry. Test dashboard counts/filter/dropdown and account projection using shipped helpers/pages, not copied arrays.

### 7. Medium: “flag to staff” and the two-bucket measurement have no concrete output

All stranded orders receive the same status. The brief does not specify how staff can distinguish:

- Customer notified
- Later success found; delete orphan
- No client error; do not chase
- Finalization failed

A non-technical owner cannot recover that distinction from logs.

**Fix:** Store one explicit disposition, such as `uploadFailureDisposition`, with those four outcomes, and show it in the failed-order row. No chart or metrics service is needed; Firestore fields are enough to count later.

### 8. Medium: the existing backend tests repeat a recorded project mistake

`tests/chunk-4-order-flow.test.js` simulates copied behavior and imports neither `functions/upload.js` nor the deployed handler. Updating that test can stay green while the real email move is broken. This is exactly the failure recorded in `LEARNINGS.md`: a test that mirrors code proves nothing.

**Fix:** Test the shipped handler with mocked dependencies, or extract and directly test a small pure decision helper used by the handler. Keep `npm run qa:order` for the real order page, including single failure, breaker/trailing slots, repeated Retry, and confirmation-call count.

## Simplicity: anything to cut

- **Cut piece 5 as a separate sent flag in the design as written.** The job queries `uploading` and atomically changes it to `upload_failed` before mail; that transition already prevents selection on the next run. A second boolean duplicates the state and, when written before SMTP, falsely says “sent” after a send failure. Keep per-channel attempt/result timestamps only for audit.

- **Do not add a Firestore composite index or analytics counter.** Query the small `uploading` set and apply age/cutoff in code; query the small per-email set and apply created-time/success filtering in code. This follows existing repo prior art and keeps deployment smaller.

- **Do not cut the retry, status, staff-email move, customer gating, or two-bucket classification.** Each addresses a distinct observed failure. Piece 0 is not a button-only change, though; the brief must admit the small extraction needed to make it correct.

No proposal contradicts an `AGENTS.md` settled decision. The brief itself repeats two `LEARNINGS.md` failures: misunderstanding `const` scope in `order.html`, and relying on tests that mirror rather than execute shipped code. Its guaranteed-zero cost wording also conflicts with the lesson to distinguish measured facts from assumptions.

## Verdict

**No. Implementation cannot start as written.** The retry instructions are technically impossible from the catch block and can confirm an incomplete book after the circuit breaker. The email move also lacks a concurrency-safe, failure-isolated confirmation design. Fix findings 1–4 and define the status/disposition behavior before implementation; the remaining changes are small.
