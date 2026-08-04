# Upload failures — evidence log and reporting procedure

**Status:** open, root cause NOT found. TO-DOS #88.
**Created:** 2026-07-22 (S147)

Photo uploads occasionally stall and never finish. The order strands at
`status: uploading`, the customer gets no confirmation email, and staff get a
"New Order" email for a book whose photos never fully arrived.

---

## What is actually known

**The "stalls on the last photo" symptom is a display artefact.** The uploader
runs 5 workers in parallel and the counter increments on completion in any
order, so *one* file hanging anywhere in the queue always renders as
"N−1 of N". It looks like the last photo no matter which file it really is.

Evidence from GCS cross-checked against the Firestore manifest:

| Order | Template | Expected | Missing | Browser |
|---|---|---|---|---|
| AEV-067 | Wander | 55 | photos 049–055 (trailing block) | Safari / macOS |
| AEV-073 | Papercut | 50 | `special_pages/fp4.png` | Safari / macOS |
| AEV-074 | Papercut | 50 | `special_pages/fp4.png` | Safari / macOS |
| AEV-075 | Papercut | 50 | `special_pages/fp4.png` | Safari / macOS |
| AEV-072 | Scribble | 50 | none — succeeded, *including its own fp4* | — |
| AEV-076 | Papercut | 50 | none — succeeded, with fp4 selected | Safari / macOS |

So Papercut/fp4 is **3 failures, 1 success**. Not deterministic, but far too
concentrated on one slot to be chance. AEV-067's trailing block is a different
shape: one worker throwing rejects `Promise.all`, which abandons the queue.

**Root cause is not established.** No failure has yet been captured with
diagnostics in place.

### Unproven hypothesis worth testing

Xenia's test set reuses one source photo across cover, special pages and the
pool — identical byte sizes are visible in AEV-074. Slots 1–5 upload
concurrently. Safari streaming the *same* `File` object into two simultaneous
requests would explain the concentration on an early special-page slot and the
browser-specificity. **Not confirmed.** The decisive observation is whether the
photo assigned to fp4 is also used elsewhere in the same order.

### Two real defects found regardless of root cause

1. **The retry is decorative.** Three attempts with 100ms/200ms backoff all land
   inside half a second. No real transient recovers that fast. Deliberately left
   alone for now: if a retry fails identically, that is evidence the failure is
   deterministic rather than transient.
2. **One dead file kills the whole batch.** The worker rethrows, `Promise.all`
   rejects, queued files are abandoned. This is the AEV-067 signature.

---

## Instrumentation in place (S147)

- `pages/order.html` records per-attempt HTTP status, GCS error body, exception
  and **timings** for any file that gives up, then POSTs them to the server.
- A 60s `AbortController` timeout per attempt turns a silent stall into a
  recorded failure. Without it a stalled fetch never rejects, the catch never
  runs, and the failure leaves no trace — which is exactly what happened to
  AEV-075. `AbortError` is logged as `TIMEOUT` so "stalled" stays
  distinguishable from "refused"; they need opposite fixes.
- `functions/upload.js` → `reportUploadFailure` stores it on the order as
  `uploadErrors`. It does **not** change status or send email.
- `scripts/inspect-upload-failure.js` reads it back and cross-checks against
  what is actually in the bucket.

⚠ The 60s timeout is a **diagnostic** threshold, not a tuned one — a whole
115 MB order uploads in ~15s on the studio connection. Revisit before real
customers upload over slow mobile links.

---

## Automated probe (S149) — built, not yet run

`qa/p2-upload-probe.mjs`. Closes a gap that had gone unnoticed: **every failure was
Safari/macOS, every QA script runs headless Chromium.** The engine where the bug
happens had never been tested. The probe defaults to WebKit and logs every GCS PUT's
status, duration and outcome, so a stall registers as a *never-resolved* request
instead of vanishing.

It targets the two hypotheses directly:

- **H1 (duplicate source photo)** — `--reuse` pins one photo into cover + every special
  zone + the whole pool, the strongest form of Xenia's set. `--distinct` is the control.
  The run log prints a **slot → file map**, which is the single observation that
  confirms or kills the hypothesis.
- **H2 (decorative retry)** — `--throttle` slows the link so the ~50 benign
  `ERR_ABORTED`s seen on a fast studio link get a chance to exhaust the
  3 × (100 ms, 200 ms) retry.

**Limit to hold onto: Playwright's WebKit is not Safari.** Same rendering and JS engine,
different networking stack, no ITP. The suspected fault is *in the transport layer*,
which is precisely where they diverge — so a clean run does not exonerate the code.
Treat a reproduction as gold and a pass as inconclusive.

The authoritative test remains a **real Safari order on the Mac where it already
failed**, following the procedure below. Worth making that run decisive rather than
another wait-and-see: place **two** Papercut orders — one where a single photo is used
for cover, fp4 and the pool, one where every photo is distinct.

---

## If an upload stalls — what to do

**1. Do not close or refresh the tab.** Closing it loses the report. This is the
single most important step.

**2. Wait about 4 minutes.** The stuck file burns 3 attempts × 60s before giving
up. The overlay sitting at "N−1 of N" for ~3 minutes is the timeout working, not
a new hang. You should then get an error screen instead of an endless spinner.

**3. Get the order number.** It is not shown during upload. Take it from the
staff "New Order" email (subject `[AEV-0nn] …`), which is sent when the order is
created, before uploads — or from the newest `uploading` row on the dashboard.

**4. Screenshot the browser console**, including any red lines. Safari sometimes
reports a network-level refusal there and nowhere else, and the page's
JavaScript never sees it.

**5. Read back the record:**

```bash
node scripts/inspect-upload-failure.js AEV-0nn
```

**6. Note which photo was assigned to the failing slot** — and whether that same
photo is used anywhere else in the order. This is the one observation that
confirms or kills the duplicate-`File` hypothesis.

### If it stalls for more than ~5 minutes with no error screen

That is itself a finding: the timeout did not fire. Say so, and grab the console
screenshot anyway.

### Reading the result

- **`TIMEOUT` on all three attempts** → a true stall. Points at the transport;
  the duplicate-`File` hypothesis becomes the leading candidate.
- **A real HTTP status** (403, 5xx) → not a stall. The status and the GCS error
  body name the cause directly.
- **No `uploadErrors` recorded at all** → check the order was placed *after* the
  diagnostics deployed, and that the tab stayed open.

---

## Related

- `docs/briefs/order-flow-failure-map.md` — the wider failure surface. D2 (staff
  emailed before photos exist) is still live and is why a stranded order is
  invisible.
- TO-DOS #89 — `uploading` status is ambiguous; planned `upload_failed` state.
- TO-DOS #90 — AEV-067/073/074/075 stranded with no resume path.
