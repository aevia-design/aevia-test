# Order Flow — Failure-Mode Map

**Created:** 2026-06-12
**Scope:** From the customer landing on a product page through to the confirmation email arriving in their inbox. Excludes the downstream journey (staff preview → approve → Stripe payment), which is a separate flow with its own todos (#56, #57).
**Purpose:** Give Evgeny a complete, code-verified picture of where the order-intake flow can break — so fixes are chosen against the whole risk surface, not one symptom at a time. Answers the question: *"is the known #68 list exhaustive?"* — **No. It found 2 of ~8 real failure modes.**
**Method:** Line-by-line trace of `pages/order.html` (`submitOrder` + photo handling) and `functions/upload.js` (`createUploadSession`). No live order was submitted (that would create a real Firestore doc + send real emails — orphan-order risk per #60).

---

## The flow in six stages

```
A. Product page → order.html   (config passed via URL params)
B. Photo selection             (HEIC convert, resolution check, count gate)  — client
C. Submit validation           (name/email/cover/addon checks)              — client
D. createUploadSession         (order# → signed URLs → EMAILS → GCS txt → Firestore)  — backend
E. Browser → GCS upload        (PUT each photo, 5 concurrent)               — client
F. Completion                  (success screen)                            — client
```

**The single most important fact:** in Stage D the order is *announced* (both emails sent) before it is *persisted* (Firestore doc) and long before it is *complete* (photos uploaded in Stage E). Every "silent success" bug below stems from this ordering.

---

## Failure modes

Severity: 🔴 high (silent, customer-affecting) · 🟠 medium · 🟡 low. "Silent" = nobody (customer or staff) is told it broke.

### Stage B — Photo selection

| # | What can break | Current handling | Severity | Silent? |
|---|---|---|---|---|
| B1 | **HEIC conversion fails** (`convertHeic` returns null after 3 tries, `order.html:1253`) | Original HEIC is kept and uploaded; only the browser *thumbnail* is missing. Pipeline handles HEIC originals downstream, so not fatal — but customer sees a broken preview and may think the photo failed. | 🟡 | partly |
| B2 | **Low-resolution photos** | Flagged with a badge (`_lowRes`) but **not blocked** — customer can submit photos too small for quality print. Warned, not gated. | 🟠 | no (warned) |
| B3 | **Photo-count promise mismatch (#58)** | Configurator says "~36–45 photos", order form requires an exact `calcPhotoTarget()` (e.g. 51). Customer is told one number, blocked at another mid-flow. | 🟠 | no |
| B4 | **No max count / total-size cap** | Large orders (110 photos / 1+ GB) take 3–5 min to upload (#62, #53); raises the odds of Stage E tab-close/timeout. No client-side guard or warning about size. | 🟡 | no |

### Stage C — Submit validation

| # | What can break | Current handling | Severity | Silent? |
|---|---|---|---|---|
| C1 | **Typo'd / invalid email** | Input is `type="email"` but submit is a JS button click, not a native form submit — so the browser constraint may not fire, and there's **no JS email-format check** before send. A typo'd address means the confirmation email silently goes nowhere (or bounces), while the order is created normally. **This is exactly the "email vs reality" gap, in reverse.** | 🔴 | yes |
| C2 | Empty name/email | Backend rejects missing fields with 400 (`upload.js:78`). Good — covered. | ✅ | — |

### Stage D — createUploadSession (backend) — **the core problem area**

| # | What can break | Current handling | Severity | Silent? |
|---|---|---|---|---|
| D1 | **Emails sent before order is persisted.** Sequence is: send staff email (`:156`) → send customer email (`:190`) → write `order-details.txt` (`:271`) → write Firestore doc (`:276`). If the Firestore write throws, both emails already went out but **no order exists in the dashboard** — an invisible orphan the customer was told is "confirmed". | None — a throw after `:190` lands in the 500 catch, but the emails are already gone. | 🔴 | yes |
| D2 | **Emails sent before photos exist.** Both emails say "Your photos have been received" (`:207`) while zero bytes have uploaded — Stage E hasn't run yet. Any Stage E failure leaves the customer holding a "confirmed" email for a partial/empty order. **This is the concern you raised.** | None. | 🔴 | yes |
| D3 | **Partial email send.** If the staff email sends but the customer email throws (or vice-versa), the function 500s; customer sees an error and retries → **new order number, duplicate order**, possibly one stray email already out. | None — no rollback, emails not transactional. | 🟠 | partly |
| D4 | **Signed-URL generation fails** for one slot → whole batch rejects → 500, no order, no Firestore doc, but order number already burned. | Caught → 500. Customer can retry cleanly (no orphan), but order numbers gap. | 🟡 | no |

### Stage E — Browser → GCS upload

| # | What can break | Current handling | Severity | Silent? |
|---|---|---|---|---|
| E1 | **PUT result never checked (#68b)** (`order.html:1759`). A non-2xx (expired URL / 403 / 500) resolves the promise, so `uploadedCount++` runs and a **failed upload is counted as success.** | None. | 🔴 | yes |
| E2 | **Tab closed mid-upload (#68a).** Upload stops at e.g. 30/106; order + emails already exist; staff see a partial book with no "incomplete" signal. | None — no `beforeunload` guard. | 🔴 | yes |
| E3 | **Signed-URL 24h expiry.** If order.html sits open >24h before/while uploading, PUTs 403. Manifests as E1 (silently counted as success). | None. | 🟡 | yes |
| E4 | **Network drop mid-upload.** `fetch` rejects (no per-file try) → `Promise.all` rejects → outer catch shows the error screen — but the order + emails were *already* created in Stage D. Customer gets a contradictory "error" + "confirmed email". | Error screen shown, but dual signal; no retry. | 🟠 | partly |

### Stage F — Completion

| # | What can break | Current handling | Severity | Silent? |
|---|---|---|---|---|
| F1 | **Success screen shows even if photos failed** (because of E1 — failures counted as success). | None. | 🔴 | yes |
| F2 | **No server-side "upload complete" record.** Firestore stores `fileCount` = *expected* count; actual GCS object count is never reconciled. Staff cannot tell a complete order from a truncated one. | None (this is option (c) from #68). | 🟠 | yes |

---

## What this means

- **The #68 list was not exhaustive.** It captured E1 and E2 (the two it named). The trace surfaced **six more** material failure modes — most importantly the Stage D email-ordering issues (D1, D2), which are the actual root cause behind your "don't email on failed upload" instinct, and C1 (typo email), which is the same "claimed success ≠ real" pattern from the front of the flow.
- **All nine 🔴/🟠 modes share one root cause:** the system announces success (emails, success screen) at points where success isn't yet guaranteed. There are three "lies": the emails (D2), the progress counter (E1), and the success screen (F1).

## Suggested fix tiers (for discussion — not yet a plan)

**Tier 1 — stop the lies (highest value, mostly client-side):**
- C1: add a JS email-format check before submit (~10 min).
- E1: check `res.ok` + retry per photo (#68b) — turns failures into real failures (~30 min).
- E2: `beforeunload` guard while uploads in flight (#68a) (~10 min).
- F1: success screen only shows if all photos confirmed-OK (falls out of E1).

**Tier 2 — fix the email ordering (backend, needs redeploy — you OK'd this):**
- The clean fix is to **split the flow**: `createUploadSession` creates the order (Firestore first, then signed URLs) and sends only the *staff* "new order received" email; the **customer confirmation email moves to a new `confirmUpload` call the browser makes after all photos land** (or is triggered by an `uploadComplete` flag). This closes D1, D2, and F2 together, and means the customer is only ever emailed once their photos genuinely arrived. (~1–2 hrs, this is option (c) done properly.)

**Tier 3 — robustness polish:**
- B1 HEIC fallback messaging, B2 low-res gate decision, B3 photo-count promise (#58), D3 idempotency/dedupe on retry, B4 large-order warning.

---

## → Executable plan

This map is the diagnosis. The chunked, developer-ready implementation plan lives in **`order-flow-hardening.md`** (5 ordered chunks on branch `order-flow-hardening`). Tier 1 = chunks 1–3, Tier 2 = chunks 4–5.

## Open question for Evgeny

Tier 1 is cheap and removes the worst *visible* customer harm today. Tier 2 is the real fix for your exact concern (no confirmation email until upload is genuinely complete) but it's a backend change + redeploy and reshapes the order-creation sequence. **Do you want to do Tier 1 now and Tier 2 as a deliberate next piece, or treat Tier 2 as the headline and do it together with Tier 1 in one pass?** That choice decides whether the next brief is "patch the client" or "re-sequence order creation."
