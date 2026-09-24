# Brief: PDF generation you can walk away from: shared status, one render per order, confirm, cancel

**Created:** 2026-09-24 (Session 193) · **Card:** Trello #138
**Objective:** Make a running PDF render visible from any dashboard tab, impossible to start twice
for the same order, hard to start by accident, and stoppable, without adding cloud cost.
**Audience:** developer-agent (implements), then the owner (Evgeny), who verifies on the live rig.
**Applicable standards:** `CLAUDE.md` (global + project), `AGENTS.md`, `LEARNINGS.md`,
`rageatc-code-oss:verifying-work`. Staff-only screens, so no `/stop-slop` pass is needed.

## The problem (owner, S193)
The progress bar lives only in the tab that pressed the button. Refresh the dashboard, open a second
tab, or let Xenia look, and a running render is invisible. A second tab can start the same order
again. A fresh "Generate" has no confirmation (only "Regenerate" does), and nothing can stop a render.

## How it works today (verified from code, S193)
- `pages/staff/dashboard.html` `generatePdfFromDashboard` (~line 686) POSTs `generatePdf`, then polls
  `getPdfStatus` from THAT tab only (~16 min ceiling). `dashboard.html` never reads `pdfRender` on load.
- `functions/index.js` `generatePdf` (~line 575) writes `pdfRender: {status:'starting', mode}`,
  fires the renderer without awaiting, and waits for `rendering` (45s) → 202.
- `services/pdf-renderer/index.js` writes `pdfRender` via a status helper (~line 173); photo
  download (~line 132), then render with a throttled `progressCb(done, tot)` per spread (~line 240),
  then **uploads only at the end** (`uploadPdf`, ~lines 266/283). So a render stopped before
  upload leaves the previous PDF untouched.
- Statuses seen: `starting`, `rendering`, `done`, `error`.

## Scope: four pieces
1. **Shared status.** On dashboard load (and on Refresh), every order whose `pdfRender.status` is
   `starting` or `rendering` shows the progress bar and resumes polling `getPdfStatus`. Check
   whether the order list the dashboard loads already carries `pdfRender`; if a function whitelists
   fields, add it there.
2. **One render per order.** While an order's render is in flight, its Generate/Regenerate buttons
   are disabled in the UI **and** `generatePdf` refuses (409) server-side, since the UI alone cannot
   stop a second tab. **Stale guard:** treat a `starting`/`rendering` status whose `updatedAt` is
   older than ~20 min as dead (the renderer's hard timeout is 15 min), so a crashed render cannot
   lock an order forever. Use a Firestore transaction for the check-and-set.
3. **Confirm a fresh Generate** as well as Regenerate: one `confirm()` naming the order and mode.
4. **Cancel (×)** beside the progress bar:
   - The dashboard asks a function to set `pdfRender.cancelRequested = true` (staff-auth, same as
     `generatePdf`; new small function or an action on an existing one, whichever is simpler).
   - The renderer checks the flag **at its existing checkpoints**: before/while downloading photos,
     in `progressCb`, and immediately before `uploadPdf`. On seeing it, it stops, uploads nothing
     and writes `pdfRender.status = 'cancelled'`. Keep the Firestore reads cheap: piggyback on the
     already-throttled progress write cadence, not a read per spread if that is more frequent.
   - The dashboard shows "Cancelled" and re-enables the buttons.
   - The previous PDF must survive a cancelled Regenerate. This is the property that matters.

## Out of scope
Notifications (e.g. email when ready), batch generation, a job queue, and any change to how PDFs are rendered.

## Also: the Cloud Run concurrency setting (one-line config, owner deploys)
The renderer runs with `containerConcurrency: 160` (4 CPU / 8 GiB, maxScale 10, timeout 900s).
Several renders can therefore share one instance's 8 GiB; a book is 1–4 GB of photos. **Unconfirmed**
whether it has ever caused an out-of-memory failure. Recommend `--concurrency 1` so each render gets its own instance.
There is no idle cost (billing is per request), and 3 parallel orders need 3 of the 10 instances. Add
the flag to the documented redeploy command in `STATUS.md`. Do NOT deploy.

## Constraints
- Surgical edits; no new dependencies; follow LEARNINGS.
- **Do not deploy** functions or Cloud Run, **do not push**, **do not render PDFs** (GCS egress on
  the owner's bill; see memory "No local PDF render"). Work in the worktree; commit there.
- Cost: added Firestore reads must be negligible (a few per render). State the number in the report.
- `npm test` from a worktree finds 0 tests because jest ignores `.claude/`. Pass an inline
  `--testPathIgnorePatterns` override on the CLI; do not change `package.json`.

## Success criteria
1. Refresh or open a second tab mid-render: the bar appears with live progress.
2. Second tab presses Generate on the same order: blocked in the UI; a forced POST gets 409.
3. Fresh Generate asks for confirmation.
4. Cancel mid-render: status becomes `cancelled` within seconds, no new PDF is written, and the old PDF
   still opens.
5. A render whose status is stuck for more than 20 min no longer blocks Generate.
6. `npm test` green, with unit tests for the pure parts (in-flight/stale decision, cancel decision).

## Verification split
The agent verifies 6, plus whatever the UI shows with mocked status data locally. Criteria 1–5 need
the deployed functions and renderer and are verified by the owner on the live rig: one render,
two tabs, one cancel on a Regenerate.
