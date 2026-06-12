# Brief: Order-Flow Hardening (executable, chunked)

**Created:** 2026-06-12 · **Revised:** 2026-06-12 (6 chunks; B1/B2/B4 folded in; forward-design for the future customer dashboard)
**Branch:** `order-flow-hardening` (do NOT work on `main` — `main` auto-deploys to Cloudflare Pages on push)
**Objective:** Remove the "claimed success ≠ real success" failure modes in the order-intake flow so a customer is never told their order is confirmed unless it genuinely is, and staff can always tell a complete order from a truncated one.
**Audience:** developer-agent (implements chunk by chunk) + Evgeny (reviews).
**Diagnosis source:** `docs/briefs/order-flow-failure-map.md` — read it first; it is the WHY behind every chunk. Failure-mode IDs below (e.g. `E1`) reference that file.
**Applicable Standards:** CLAUDE.md — simplicity-first, surgical edits, root-cause fixes, no new deps, plain HTML/CSS/JS.

## How to use this brief

Six chunks, ordered. Each is independently shippable, has its own acceptance criteria, and closes specific failure modes. Do them **in order** — later chunks assume earlier ones exist. Commit each chunk separately on the `order-flow-hardening` branch. Do not merge to `main` or run `firebase deploy` without Evgeny's go-ahead.

**Deploy-ordering rule (critical):** Chunk 4 changes a Cloud Function that deploys via `firebase deploy`, independently of the website. It MUST be written backward-compatible: after the function is deployed, the *current, unmodified* `order.html` must still work. Chunk 5 is what activates the new behaviour on the frontend. Backend deploys first, frontend merges after — no broken window.

**Forward-design note (customer dashboard):** A customer "my-orders" area is a committed near-future direction (see `ideas.md` 2026-06-12, build *after* these chunks). Two cheap decisions in Chunks 1 & 4 below make it possible later at no cost now: normalising the customer email, and using customer-readable order statuses. They are flagged inline — honour them.

---

## Chunk 1 — Email: validate, normalise, confirm visibly (closes C1)

**Type:** client validation · **File:** `pages/order.html` (`submitOrder`, email collection at `:1576`; success screen `showSuccess` at `:1791-1803`) · **Size:** S

**Problem:** Submit is a JS button click, not a native form submit, so `type="email"` may not enforce. A typo'd address means the confirmation email silently goes nowhere while the order proceeds.

**Steps:**
1. After collecting `email` (`:1576`): **normalise** it — `email = email.trim().toLowerCase()`. (Forward-design: the future my-orders dashboard will look orders up by email; a normalised stored value makes that reliable and avoids `Anna@…` vs `anna@…` mismatches.)
2. **Validate** format with a simple regex (e.g. `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`). On failure: set `errEl.textContent` to a friendly message ("Please enter a valid email address so we can send your confirmation."), show it, scroll into view, `return` — mirror the existing validation-failure pattern (e.g. `:1516-1519`).
3. **Make the success-screen confirmation louder** (`showSuccess`, the line at `:1798` that already echoes the address): present the email prominently and add a gentle catch — e.g. "Confirmation sent to **{email}** — if that's not right, reply to us within 24h." This catches the typo'd-but-valid case (e.g. `anna@gmial.com`) that regex can't, without adding a confirm-email field.

**Decision recorded:** regex + normalise + louder success line, NOT a double-entry "confirm email" field (less friction; the success screen already echoes the address back).

**Acceptance criteria:**
- Submitting with `anna@`, `anna.com`, or empty-after-trim is blocked inline; no network call fires.
- The email sent to the backend is trimmed + lowercased.
- A valid address proceeds; the success screen shows the address prominently with the "not right? reply within 24h" note.
- No new dependency; matches the existing error-display pattern.

**Verify:** Local order form — bad address blocked with no POST; good address reaches success screen showing the normalised email prominently.

---

## Chunk 2 — Confirm each upload + gate success + large-order reassurance (closes E1, F1, E3; folds B4)

**Type:** client robustness · **File:** `pages/order.html` (`:1756-1769` worker pool; `:1771-1780` success; upload overlay copy near `:1668-1677`) · **Size:** M

**Problem:** The PUT never checks `res.ok` (`:1759`), so a 403/expired-URL/500 is counted as a successful upload, and the success screen shows regardless.

**Steps:**
1. In `worker()`, capture the PUT response; treat non-`res.ok` as failure.
2. Wrap the PUT in a bounded retry (2–3 attempts; short backoff optional). Only on a confirmed `res.ok` do `uploadedBytes += …`, `uploadedCount++`, `updateProgress()`.
3. If a photo still fails after all retries, `throw` — let it propagate to the existing outer `catch` (`:1782`) which shows the error screen and re-enables the button.
4. The success branch (`:1771-1780`) is now only reached when every photo confirmed OK → F1 closed for free. Do not re-PUT a photo that already returned OK (no duplicate uploads).
5. **(B4)** Add a one-line reassurance to the upload overlay for large orders — e.g. when `total` is high, show "Large orders can take a few minutes — please keep this tab open." Keep it simple; reuse the existing overlay sub-text element.

**Acceptance criteria:**
- A simulated non-2xx PUT (point one URL at a 403) is retried, then surfaces the error screen — success never shows for a failed order.
- Progress count only advances on confirmed uploads.
- Happy path still completes with a correct 100% bar.
- A large order shows the "keep this tab open / few minutes" reassurance.
- 5-concurrent worker structure unchanged; no duplicate PUTs.

**Verify:** Break one signed URL locally (or stub fetch) → error path; clean run → happy path + 100% bar; large file set → reassurance copy shows.

---

## Chunk 3 — beforeunload guard while uploading (closes E2)

**Type:** client safeguard · **File:** `pages/order.html` (`submitOrder`) · **Size:** S

**Problem:** Closing the tab mid-upload truncates the order silently.

**Steps:**
1. Add a module-scoped `let uploadInFlight = false;`.
2. Add one `beforeunload` listener (once): `if (uploadInFlight) { e.preventDefault(); e.returnValue = ''; }`.
3. Set `uploadInFlight = true` immediately before the upload loop starts (after Step 1 returns signed URLs, ~`:1715`); set it back to `false` in BOTH the success path AND the `catch` (so a handled error doesn't leave a phantom warning on every later navigation).

**Acceptance criteria:**
- Closing/reloading during upload triggers the browser's native "leave site?" prompt.
- After success OR after a caught error, closing the tab does NOT prompt.
- No prompt while merely filling the form.

**Verify:** Start an upload, attempt reload (prompt); let it finish, reload (no prompt); trigger an error, reload (no prompt).

---

## Chunk 4 — Backend: persist-first, split the emails (closes D1, D2, D3, F2) — BACKEND, backward-compatible

**Type:** backend re-sequencing · **Files:** `functions/upload.js`, plus a new `confirmUpload` handler (wired in `functions/index.js`) · **Size:** M-L

**Problem:** `createUploadSession` sends both emails (`:156`, `:190`) before the Firestore doc is written (`:276`) and before any photo uploads — so the customer is "confirmed" before anything is real, and a failed Firestore write leaves an orphan that already emailed the customer.

**New sequence inside `createUploadSession`:**
1. `getNextOrderNumber()` → generate signed URLs → build `photoManifest` (unchanged).
2. **Write the Firestore order doc FIRST**, with `status: 'uploading'` and `uploadComplete: false`. Persist before any email. Store the **already-normalised** `email` (Chunk 1 sends it trimmed+lowercased) as the order's owner field. *(Forward-design: the future my-orders dashboard queries orders by this email.)*
3. Send ONLY the **staff** "new order — uploading" email (so staff still learn an order started and can chase an abandoned upload). Do NOT send the customer email here.
4. Write `order-details.txt` to GCS (unchanged).
5. Return `{ orderNumber, token, uploadUrls, … }` — confirm `token` is in the response (Chunk 5 needs it; add if missing).

**New `confirmUpload` Cloud Function:**
- Input: `{ orderNumber, token }`. Authenticate by matching `token` against the order's `token` field (same pattern as the customer path in `getOrder`). Reject mismatch with 403.
- Action: set `status: 'new'`, `uploadComplete: true`; send the **customer** confirmation email (move the existing `:190-247` template here verbatim). Idempotent: if `uploadComplete` is already true, return 200 without re-sending (closes D3 double-email on retry).

**Status-value note (forward-design):** Keep status values **customer-readable** — a person will see them in the future dashboard. Prefer clear states (`uploading`, `new`/`received`, `in_design`, `preview_sent`, `approved`, `paid`, `shipped`) over internal codes. Stay consistent with the existing `statusHistory` vocabulary already in Firestore.

**Backward-compatibility requirement:** After deploying this, the CURRENT unmodified `order.html` (which never calls `confirmUpload`) must still produce a usable order — it just won't get the customer email or status flip until Chunk 5 ships. Do not change the existing response shape.

**Dashboard note:** `pages/staff/dashboard.html` and any status filtering must tolerate the new `'uploading'` status (ideally show it distinctly — mid-upload vs ready). Check status handling there; surface to Evgeny if it needs a follow-up rather than expanding scope here.

**Acceptance criteria:**
- Order doc exists in Firestore *before* any email is sent (verify ordering in code + a test order).
- Customer confirmation email is NOT sent by `createUploadSession`; staff email still is.
- `confirmUpload` with a valid token flips status to `new` + `uploadComplete: true` and sends the customer email exactly once; a second call does not re-send; a bad token returns 403.
- Stored `email` is normalised; status values are customer-readable.
- Old `order.html` still creates a working order against the deployed function.

**Verify:** Run the function locally or in a test context; create an order; inspect Firestore write order + that only the staff email fires; call `confirmUpload` twice → single customer email.

---

## Chunk 5 — Frontend: call confirmUpload after photos land (activates Chunk 4)

**Type:** client wiring · **File:** `pages/order.html` (`submitOrder`, after the upload loop succeeds, ~`:1769-1771`) · **Size:** S

**Problem:** Chunk 4's customer email now only fires when the browser confirms completion — the browser must make that call.

**Steps:**
1. Capture `token` from the Step 1 response (`data.token`) alongside `orderNumber`.
2. After `await Promise.all(...workers)` succeeds (all photos confirmed via Chunk 2), before showing the success screen, `await fetch(CONFIRM_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ orderNumber, token }) })`.
3. If `confirmUpload` fails, still show the success screen (photos DID upload) but log it — do not block the customer on the email call. The staff email already alerted the team; a missing customer email is recoverable, a blocked success screen on a good order is not.

**Acceptance criteria:**
- Full happy path: photos upload → `confirmUpload` called → customer receives the confirmation email → success screen shows.
- A tab closed mid-upload (Chunk 3 now prompts) never reaches `confirmUpload`, so **no customer "confirmed" email for a partial order — this is the headline outcome Evgeny asked for.**
- `confirmUpload` failure does not prevent the success screen.

**Verify:** End-to-end test order — customer email arrives only after uploads complete; simulate a mid-upload abort → no customer email.

---

## Chunk 6 — Honest messaging polish (folds B1, B2)

**Type:** client copy/accuracy · **File:** `pages/order.html` (HEIC handling `:1253-1260`, `:1163-1166`; resolution checks `:1116-1119`, `:1180-1184`, `:1287`, `:1437`) · **Size:** S

**Problem:** Two places tell the customer something misleading. (B1) A failed HEIC conversion shows a broken/blank preview, implying the photo failed — but the original HEIC still uploads fine (conversion is display-only). (B2) The low-res check is accurate but the threshold/copy could be clearer and honestly scoped.

**Steps:**
1. **(B1)** When `convertHeic` returns null (`:1253-1260` for main, `:1163-1166` for special), show a calm explanatory state instead of a broken image — e.g. a tile reading "Preview unavailable — your photo is still included." No data is at risk; this is purely reassurance.
2. **(B2)** Set the low-res threshold to a **verified 200 DPI floor**: shortest side **< 1575px** (verified: 200mm full page ÷ 7.874in × 200 DPI ≈ 1575px; 200 DPI is the print-industry "lowest still-acceptable" line, 300 DPI being ideal — sources in the failure-map / session log). Replace the current `< 1500` constants at the four check sites and the summary line. Keep it a **warning badge, not a block** (Evgeny's decision).
3. **(B2 copy)** Word the badge/summary honestly — it depends on placement, which the order form can't know: e.g. badge "LOW RES" with summary "Shortest side under ~1575px — may print soft, especially if used large." Do NOT claim certainty. Leave the FP5 art-gallery exemption (`:1176`) intact (scanned artwork is intentionally low-res).

**Decision recorded:** B2 stays a *warning*; threshold set to the verified 200 DPI = ~1575px floor (not the stricter 1900px/240 DPI premium line — that's a future product call, not done here).

**Acceptance criteria:**
- A HEIC whose conversion fails shows the "preview unavailable, still included" tile, not a broken image; the file still uploads.
- Low-res badge fires at < 1575px (not 1500) consistently across cover, special, and main; FP5 still exempt.
- Warning copy is placement-honest (no absolute "too low" claim); nothing is blocked.

**Verify:** Add a sub-1575px image → badge fires + honest copy; add a ~1600px image → no badge; (if testable) force a HEIC conversion failure → reassurance tile + file still in the upload list.

---

## Out of scope (tracked, not in this brief)

Deliberately deferred — note, don't fix here: B3/#58 (configurator photo-count promise — different surface, the product pages), D4 (order-number gaps on failure — cosmetic), the stricter 1900px/240-DPI premium low-res line (product call), and the customer my-orders dashboard (`ideas.md` — build after these chunks). If any are trivially adjacent while in the code, flag to Evgeny rather than expanding scope unasked.

## Done =
All six chunks committed on `order-flow-hardening`, each verified per its criteria, no console errors, no new deps. Merge to `main` and `firebase deploy` only on Evgeny's go-ahead, backend-first per the deploy-ordering rule.
