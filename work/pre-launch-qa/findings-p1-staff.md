# Pre-Launch QA — Findings: P1 staff-side track (S125, 2026-07-13)

Live dev site. Scripts: `qa/p1-staff-10-issue.mjs`, `qa/p1-staff-11-pdf-unsaved.mjs`,
`qa/p1-staff-12-pdf-large.mjs`, `qa/p1-staff-13-staff-as-customer.mjs`, plus a new read-only
`qa/firestore.mjs` helper (lists GCS metadata only — no egress).

## Verdicts

| ID | Case | Verdict | Findings |
|----|------|---------|----------|
| **P1-10** | Customer "Report an issue" on a `review_sent` order | **PASS** | 1 × S3 + 1 open verification item |
| **P1-11** | Generate PDF on an **unsaved** book | **PASS** | 0 |
| **P1-12** | Generate PDF on a **2.220 GB** pro-camera order | **PASS** | 0 |
| **P1-13** | **Staff-allowlisted** account on customer preview/account pages | **PASS** | 0 |

**No S1 or S2 findings.** Both fixes these cases guard — the S112 unsaved-book pre-check and the
S112 bounded download pool — hold under real conditions.

---

## P1-10 — PASS (AEV-055, scribble; driven to `review_sent` via `qa/p0-2-preview.mjs`)

`reportOrderIssue` → HTTP 200, modal closes, toast fires. Status `review_sent` → **`issue`**;
note stored verbatim, `issueReportedAt` stamped, `statusHistory` = `review_sent → issue`. The
dashboard flags it on every axis: `.row-issue` (bg `rgb(255,245,245)`, inset 3px
`rgb(220,38,38)` bar), inline ⚠ note with the customer's words, **row 1 of 54**, Issues stat
card = 1, Issues filter returns exactly that one row.

**S114 post-approval branch confirmed deliberate and working:** after approval the link stays
visible; a second report returned 200, recorded the note, and did **not** knock the order back
(`functions/index.js:396` only flips a `review_sent` order). Dashboard showed `row-issue=false`.
Not a bug.

### 🟡 F-101 (S3) — a second issue report overwrites the first note

`issueNote` is a single string set by plain overwrite (`functions/index.js:390`). A customer
reporting twice silently erases their first message. Observed live. Survivable (follow-up
happens over email), but staff lose the earlier complaint. If the owner wants it: `arrayUnion`
an `issueNotes[]` alongside the existing field.

### ⚠ Open verification item — one minute of owner time

The support email goes to `support@aevia.at` (`functions/index.js:409`), a real mailbox the
harness cannot read, and the send is wrapped in a catch that **swallows mail errors and still
returns 200** (`functions/index.js:422-426`) — so HTTP 200 proves nothing about delivery. Cloud
Logging is also closed to the QA service account (`403 Permission denied for all log views`).

**Owner: check `support@aevia.at` for two emails titled "Issue reported — AEV-055".** The SMTP
path is known-good from P0, so this is confirmation, not suspicion.

## P1-11 — PASS (AEV-056, papercut; `status=new`, `staffBookSequence=0`, never saved)

Blocked in **6.1 s** — not the 16-min ceiling — with: *"PDF generation failed: This book hasn't
been saved yet. Open it in the template engine and press "Save book state" before generating the
PDF."* Button re-enabled, label restored, no leftover progress bar, and **no render started**
(`pdfRender` stayed absent). The guard is `functions/index.js:570-574`.

## P1-12 — PASS (AEV-051) — the bounded-pool evidence

| Evidence | Value |
|---|---|
| Originals the renderer pulls | **52 files, 2.220 GB** (2 220 290 536 bytes) |
| Largest single original | **69.2 MB** (`AEV-051/photos/photo_015.jpg`) |
| **Render duration** | **292 s (4.9 min)** |
| Outcome | `pdfRender.status = done`, 20 spreads, no error |
| Progress | climbed 1/20 → 20/20; never stalled at 0% |

Triggered from the **staff dashboard only**, so Cloud Run read the 2.2 GB in-region — no egress,
effectively free. `npm run pdf` was never run locally. 292 s sits ~3× inside Cloud Run's 900 s
ceiling. Both S112 mechanisms held: the 6-worker pool (`services/pdf-renderer/index.js:134`) and
the 120 s per-photo timeout (`:87`).

## P1-13 — PASS — no privilege leak in either direction

- Unverified staff account on `account.html` → routed to the **verify** view, the same wall as
  any customer; `getMyOrders` → **403 `{"error":"unverified"}`**.
- With `emailVerified=true` (fixture flip, **restored to `false`** in a `finally`) → reaches the
  account view, `getMyOrders` → **200, `email: claude-test@aevia.at`, `orders: []`**. No other
  customer's order number appears anywhere on the page. Root cause of the good behaviour:
  `functions/index.js:1519` queries `where('email','==', <own email>)` with no staff branch —
  being on `STAFF_EMAILS` grants nothing customer-side.
- Staff session live + AEV-055's preview token → **50 photos render, 0 page errors, not
  rejected**. No inward lockout.

---

## Ruled out

- Dashboard `TypeError: Failed to fetch` PDF checks — known harness artefact, not re-raised.
- **No "Print PDF" button after a render** — expected: the renderer only ever writes
  `{folder}/pdfs/{order}_preview.pdf` (`services/pdf-renderer/index.js:223`). Nothing in this
  path produces a print PDF.
- Post-approval report not flagging the dashboard — deliberate S114 design, confirmed.
- Console `403` on `account.html` for an unverified account — that's `getMyOrders` doing its job.
- **AEV-043 sits at `pdfRender: rendering 0/20`, last touched 2026-06-23** — a stale record from
  a **pre-fix** render, the exact 0%-forever symptom S112 fixed. Inert (only polled after a fresh
  click) and P1-12 proves the current renderer finishes a bigger book. Worth knowing nothing
  reaps an abandoned render's status; not a live bug, not from this batch.

## Harness bugs found and fixed (not product bugs)

1. **`qa/p0-2-preview.mjs` — dashboard login race (FIXED).** Firebase auth persists per-origin,
   so the engine sign-in already unlocks the dashboard in the same context; the unconditional
   `click('.lock-btn')` timed out on a hidden button. Now it only logs in if the lock is still
   up. This was a real flake in a maintained P0 script.
2. **`p1-staff-12` — button detached mid-click.** `updatePdfLinks()` rewrites the PDF cell a
   round-trip after the row paints, swapping "Generate PDF" for "Regenerate PDF". Fixed by
   waiting for the button set to settle.
3. **`p1-staff-13` — `import()` inside `page.evaluate()`** returns a fresh module instance with
   no Firebase app. Fixed by reading the persisted ID token from `localStorage`.

## Order state left behind

AEV-055 is now `approved` (leg E needed it); AEV-056 and AEV-057 untouched at `new`. AEV-051's
preview PDF was regenerated (overwrote the identical prior one). AEV-053/054 and AEV-060+ not
touched.
