# Review: Upload Failure Recovery Brief v1

**Reviewed:** 2026-08-13  
**Artefact Type:** Implementation Brief  
**Applicable Standards:** CLAUDE.md (project + global), AGENTS.md, LEARNINGS.md, rageatc-code-oss:verifying-work

## Summary

The brief articulates a real, live problem (5 stranded orders, staff notified about uploads that never arrive) and proposes a lean five-piece solution. The core strategy is sound: retry catches failures while the customer is present (cheapest path), automation catches everything else. However, **the Retry button specification (Piece 0) is under-specified about state persistence**, and **the scheduled job implementation lacks concrete technology and deployment guidance** that a developer-agent would need to start without clarification. These are fixable; the brief's problem diagnosis and overall architecture are solid.

## What Meets Standards

- **Problem grounded in live data.** Five specific orders (AEV-067/073/074/079/096) with documented failure mode; the cost of silence on both sides is acknowledged.
- **Cost reasoning up-front.** Brief flags negligible cost and identifies the cost driver (hourly Firestore query, no GCS reads, nothing per-photo), satisfying CLAUDE.md cost-awareness requirement. Approach avoids egress and cross-region reads correctly.
- **Customer-facing copy flagged for /stop-slop pass.** Piece 3's customer email is correctly marked as needing the pass before shipment; staff surfaces (dashboard) correctly exempted.
- **Status enumeration risk properly named.** The brief calls out "at least seven enumerations" and locates them (I verified 5 distinct status arrays + others in dashboard.html, plus account-utils.js). The risk is well-documented.
- **1-hour threshold defensible.** Claimed longest legitimate upload ~5 min, with signed URLs valid 24 hours remaining. Evidence cited (S53, S62) is real.
- **Verification requirement stated.** Brief correctly requires proving detection against AEV-096 (a real stranded order), not a mock.
- **Requirements extracted from standards.** CLAUDE.md, AGENTS.md, and rageatc-code-oss:verifying-work signals correctly identified. Surgical edits requirement stated.

## Priority Issues

### High Priority

**Retry button (Piece 0) state persistence is unspecified**
- **Symptom:** Brief claims "photo files are still in browser memory" and "signed URLs are good for another 24 hours", suggesting retry can reuse both. But the context for WHEN retry happens is missing. If it happens after page reload, File objects are lost.
- **Root cause:** The brief treats the retry as an immediate recovery during the same page session, without specifying whether the "Retry" button lives on an error overlay (same-session) or a saved error screen the customer returns to later (requires state rehydration).
- **Impact:** Developer will have to guess whether to:
  1. Show a retry button on the immediate error overlay (File objects and URLs available; limited time window before user navigates away)
  2. Store the failed slot IDs + order state in sessionStorage and offer retry on page reload (URLs still valid, File objects lost, requires re-picking photos for failed slots)
  3. Build a "resume upload" flow that re-issues signed URLs (requires a new endpoint, explicitly deferred in the brief)

  The cost and complexity of the button changes dramatically depending on this choice.
- **Where to next:** Clarify in Piece 0 whether retry is:
  - Immediate (on the error overlay, same execution context) — simplest, File objects available
  - Resumed (user returns to page later, error state persisted) — requires sessionStorage + re-picking or re-issuing URLs
  Specify which File objects/URLs survive and which are lost, so the developer knows what to reconstruct.

**Scheduled job lacks technology and deployment specifics**
- **Symptom:** Pieces 1–5 specify WHAT to build (a `upload_failed` status, move staff email, detect & email) but not HOW or WHERE the detection job runs. The brief says "A scheduled job flips `uploading` → `upload_failed`" without naming the technology, deployment method, or exact location in the codebase.
- **Root cause:** The brief treats deployment as out-of-scope, but a developer-agent needs to know whether to:
  - Write a Cloud Function triggered by Cloud Scheduler (functions/check-stranded-orders.js)
  - Write a Cloud Run service triggered by Cloud Pub/Sub
  - Add a `/admin/check-stranded-orders` HTTP endpoint to an existing function and schedule it from Cloud Console
  - Use Firestore's TTL policies to automatically delete uploading orders after 1 hour

  Each has different code paths, deployment commands, and maintenance implications.
- **Impact:** Developer-agent will either ask for clarification (blocking implementation) or make a wrong choice and require rework.
- **Where to next:** Specify:
  - Technology: Cloud Scheduler → Cloud Function (recommended per cost + pattern match with existing chunk-024), or alternative with rationale
  - Location: `functions/check-stranded-uploads.js` (new file) or inline in existing function
  - Exact deployment: `firebase deploy --only functions:checkStrandedUploads` or equivalent
  - Frequency: "every hour" or a specific cron expression (e.g., `0 * * * *`)

**QA order exclusion mechanism unspecified**
- **Symptom:** Brief says "existing orders stuck at `uploading` (AEV-067/073/074/079/096) must not be emailed about — they are QA orders. Bound the job by creation date or exclude them explicitly." Two approaches offered, neither chosen.
- **Root cause:** This is a constraint, not an architectural choice — but without picking one, the developer doesn't know whether to:
  - Write a hardcoded list of order numbers to skip
  - Query only orders created after a cutoff date (e.g., `createdAt > 2026-08-13T00:00Z`)
  - Check for a `_isQAOrder: true` flag on the order
  - Bind the job to fire only after a specific deploy timestamp
- **Impact:** Mishandling this sends emails to staff about QA orders, or incorrectly flips live customer orders. Small mistake, high visibility.
- **Where to next:** Choose one approach and state it explicitly:
  - Option A (recommended): Exclude by creation date — "the job runs only against orders created on or after 2026-08-13" (safe, self-updating)
  - Option B: Exclude by ID list — "the job skips AEV-067, AEV-073, AEV-074, AEV-079, AEV-096" (brittle, requires code change if more QA orders occur)
  State which in the brief's Constraints section and the job's implementation notes.

### Medium Priority

**Cost figure is vague and unverified**
- **Symptom:** Brief states "expected negligible — one Cloud Scheduler job (free tier covers three), an hourly Firestore query filtered on status, a handful of function invocations a day. No GCS reads, no egress, nothing per-photo."
- **Root cause:** "Negligible" and "handful" are estimates, not measurements. Cloud Scheduler itself is free tier, but the triggered function has compute cost per invocation. The Firestore query cost depends on whether it's indexed.
- **Impact:** CLAUDE.md requires "expected cost and the main cost driver stated in plain language before acting." The brief satisfies the spirit but not the letter — an owner reading "negligible" expects $0.00/month; if it's actually $5–10/month, the surprise is worse than stating it upfront.
- **Where to next:** Calculate and state concretely:
  - Cloud Scheduler cost: $0 (free tier)
  - Cloud Function invocation cost: 1 invocation/hour × 730 hours/month × $0.40/million = ~$0.0003/month (negligible, true)
  - Firestore read cost (hourly query): 730 queries × $0.06 per 100k reads = ~$0.0004/month (negligible, true)
  - Total expected: ~$0.0007/month — actually negligible. State this figure so the owner knows it's been calculated, not guessed.

**Idempotency and retry semantics for Piece 3 (customer email) under-specified**
- **Symptom:** Brief states customer email should fire "when the system is sure" — only if no later order from the same email succeeded. But it doesn't specify the email's idempotency or what happens on retry.
- **Root cause:** If the first send fails (SMTP timeout, transient error), will the job retry it? If so, does it check whether a success email already landed before the send failure? The brief's condition is "check if a later order succeeded," but doesn't address temporal ordering if the job reruns.
- **Impact:** Edge case: customer email is sent, Firestore update fails, job reruns and checks "did a later order succeed?" If not, it re-sends the same email. Customer sees it twice. Or if send fails and job retries before a later order arrives, timing matters.
- **Where to next:** Specify:
  - The Piece 3 email includes a unique `Message-ID` header so customer email systems deduplicate it
  - The job records `emailSentAt` on the order and never re-sends the same email twice, even on retry
  - Or: add an explicit sent-flag (brief mentions this as Piece 5, good) and gate the send on it

**Piece 4 (two buckets: uploadErrors present vs absent) lacks concrete acceptance criteria**
- **Symptom:** Brief says the ratio between "has error" and "no error" orders "is the number that decides whether self-service resume is ever worth building." But no acceptance criterion for Piece 4 is stated — is it just "track the ratio for future decision-making"? Are any thresholds triggering action now?
- **Root cause:** Brief defers self-service resume but frames Piece 4 data as decision-input for later. Without criteria, it's unclear whether the job should log this, raise an alert, or just let the data accrete in Firestore for manual review.
- **Impact:** Developer doesn't know whether Piece 4 is "add a flag to the order" (simple) or "build a dashboard to chart the ratio over time" (medium effort) or "trigger an alert when the ratio shifts" (adds complexity).
- **Where to next:** Clarify:
  - Piece 4's output is a simple boolean flag on the order (`hasUploadErrors: true/false`) and nothing more
  - Or: add a metric/counter that the dashboard can later query to chart the ratio
  - The decision point for self-service resume is not tied to any live threshold; data is collected for later review

### Low Priority / Recommendations

**The brief could name a specific owner for Pieces 1–5 deployment sequence**
- The brief correctly notes "Piece 0 is independent; Pieces 1–5 depend on each other." But it doesn't say whether all five pieces deploy together (one commit, one firebase deploy) or whether some can stage (e.g., deploy Pieces 1–2, verify detection works, then add email pieces).
- Recommendation: add a sentence like "Deploy all five pieces in one changeset so the detection job and email flows ship together — staging increases the risk of a partial state (orders flagged `upload_failed` with no email sent)."

**Customer email copy (Piece 3) example is incomplete**
- The brief gives owner's draft: "we noticed your upload did not finish; if you have not already sorted it, write to support and we will help you submit your order."
- This is good and needs the /stop-slop pass, but it doesn't address *how* the customer resubmits. Does the link point back to the order form? Does it let them resume with the same order number? Brief defers resume, so the email can only say "re-submit" — clarify this in the /stop-slop pass (the word "sorted" could also be more active: "resolved" or "fixed").

**Constraints section could reference where `upload_failed` already appears (if anywhere)**
- A quick grep of the codebase shows `upload_failed` nowhere yet (it's new). But the constraints list the surfaces that NEED updates. A sentence like "Note: `upload_failed` does not yet exist in the codebase; it appears in zero status enums and must be added to all seven" would prevent a developer from missing one out of carelessness.

## Assessment Against Standards

### Completeness
| Requirement | Status | Notes |
|---|---|---|
| Problem grounded in evidence | ✓ | Five real orders with documented failure |
| Solution's five pieces outlined | ✓ | Clear; architecture sound |
| Retry button fully specified | ✗ | State persistence and timing unclear |
| Scheduled job technology specified | ✗ | WHAT to build is clear; HOW and WHERE are missing |
| QA order exclusion method chosen | ✗ | Two options offered; neither picked |
| Cost stated in plain language | ~ | Vague ("negligible"); should include calculated figure |
| Files to touch identified | ✓ | Correct list |
| Success criteria stated | ✓ | Six clear acceptance criteria |
| Verification approach named | ✓ | Against AEV-096, the real stranded order |
| Customer-facing copy flagged | ✓ | Marked for /stop-slop pass |

### Clarity
- The problem statement is crystal-clear
- The five-piece solution is logically structured
- Piece 0 (retry) reads as clear but lacks state-persistence context
- Pieces 1–5 are clear WHAT but vague HOW
- Known risks are well-articulated

### Correctness
- Factual claims verified against code: ✓
- Signed URL 24-hour validity: ✓ (confirmed line 109)
- Staff email on order creation: ✓ (confirmed lines 218–250)
- Status enumerations exist: ✓ (found 5+ distinct arrays in dashboard.html)
- Customer-facing label map in account-utils.js: ✓ (no `upload_failed` entry yet, as expected)
- 1-hour threshold evidence: ✓ (referenced uploads: S53 ~5 min, S62 ~3 min)

### Consistency
- Aligns with CLAUDE.md cost-awareness and customer-copy rules: ✓
- Aligns with AGENTS.md engineering principles (simplicity, surgical edits): ✓
- Refers to correct code locations (functions/upload.js, dashboard.html, account-utils.js): ✓
- No contradictions within the brief: ✓

### Fitness for Purpose
- Can a developer-agent implement this as written? **Mostly, but two clarifications block easy start:**
  - Which version of Piece 0 retry? (Same-session vs resumed)
  - Which technology for the scheduled job?
  - How to exclude QA orders?

  Without these, the developer will ask before starting or make wrong assumptions requiring rework.
- Will the owner recognize his decisions in it? **Yes.** The threshold decision (1 hour, S173), the automation-over-manual choice, the deferred resume, and the email-on-detection structure all reflect the decisions documented in the brief's "Context" section.

## Next Steps

**Before implementation starts:**

1. **Clarify Piece 0 retry (HIGH):** In a single sentence, specify whether the Retry button appears on an immediate error overlay (reuses File objects and URLs) or on a persisted error screen (requires state recovery). Add a note about what survives/dies across page reload.

2. **Specify scheduled job technology (HIGH):** State whether to use Cloud Scheduler → Cloud Function (recommended) or an alternative. If Cloud Function, name the file (`functions/check-stranded-uploads.js`), the trigger (Cloud Scheduler, hourly), and the deployment command.

3. **Choose QA order exclusion method (HIGH):** Pick Option A (exclude by creation date, e.g., `createdAt >= 2026-08-13T00:00Z`) or Option B (hardcode order IDs). State it explicitly in the Constraints section.

4. **Add calculated cost figure (MEDIUM):** Replace "negligible" with "$0.001/month estimated" (or your actual figure). Shows cost was measured, not guessed, satisfying CLAUDE.md.

5. **Clarify Piece 3 idempotency (MEDIUM):** Add one sentence: "The customer email includes a Message-ID header for deduplication; the order records emailSentAt so the job never sends the same email twice, even on retry."

6. **Verify `upload_failed` doesn't exist (LOW):** Run `grep -r upload_failed` to confirm it's not already in the codebase. If it is, note where and adjust the "seven enumerations" count.

**Ready for implementation?**

**No — revise and resubmit.** The high-priority gaps (Piece 0 retry spec, scheduled job tech, QA exclusion) are blocking. A developer-agent will ask for clarification on each one, which delays start. With those three clarified + the medium-priority fixes, this brief is implementation-ready.

**Why revision first:** The problem and overall strategy are sound, the risk acknowledgement is honest, and the five-piece decomposition is clean. The brief just needs specificity in three concrete places where ambiguity forces guessing. Thirty minutes of clarification saves a round of review.
