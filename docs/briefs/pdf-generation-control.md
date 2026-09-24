# Brief: PDF generation you can walk away from

**Created:** 2026-09-24 (Session 193) · **Card:** Trello #138
**Objective:** Any dashboard tab shows a running PDF render, the same order cannot render twice,
a render cannot start by accident, and a started render can be cancelled without losing the
previous PDF, all at negligible added cloud cost.
**Audience:** developer-agent (implements), then the owner (Evgeny) and Xenia, who use the staff
dashboard daily and verify on the live rig.
**Applicable Standards:** `CLAUDE.md` (global + project), `AGENTS.md`, `LEARNINGS.md`,
`rageatc-code-oss:test-driven-development`, `rageatc-code-oss:verifying-work`

## Why

A render takes 3–13 minutes, and its progress bar lives only in the tab that pressed the button.
Refresh the page, open a second tab, or let Xenia look, and a running render is invisible, so it can
be started twice. A fresh "Generate" has no confirmation (only "Regenerate" does), and nothing can
stop a misclick. The owner wants to start renders for up to 3 orders and walk away with confidence.

## Requirements Extracted from Standards

**From CLAUDE.md (global + project):**
- [ ] Every changed line traces to one of the four pieces below; no unrelated edits or reformatting
- [ ] No new dependencies, frameworks or build steps (the dashboard stays plain HTML/JS)
- [ ] Cost stated before it is incurred: the report gives the number of Firestore reads/writes added per render
- [ ] Root-cause fixes only: a crashed render must not lock an order forever (stale guard, below)
- [ ] Nothing claimed as verified that was not run; unverified items marked as such

**From AGENTS.md / LEARNINGS.md:**
- [ ] Server-side guards, not just UI: a second tab can bypass any client-only check
- [ ] Follow the existing `pdfRender` write pattern in `services/pdf-renderer/index.js`; no parallel status mechanism

**From test-driven-development:**
- [ ] Pure decisions (is this render in flight or stale? should the renderer stop?) extracted into small
      helpers in `functions/` (pattern: `functions/caption-line-utils.js`), with tests written first in `tests/`

**From verifying-work:**
- [ ] Test counts reported from a fresh run, including any suites that failed for environmental reasons
- [ ] Local UI check with mocked status data: an in-flight order shows the bar and a cancel ×, with zero console errors

## Scope: the four pieces

1. **Shared status.** On load and on Refresh, the dashboard shows the progress bar for every order whose
   `pdfRender.status` is `starting` or `rendering`, and resumes polling `getPdfStatus`.
2. **One render per order.** Buttons disabled in the UI **and** `generatePdf` returns 409 in a Firestore
   transaction when a render is in flight. A status older than ~20 min counts as dead (the renderer's
   hard timeout is 15 min).
3. **Confirm a fresh Generate**, naming the order and mode, as Regenerate already does.
4. **Cancel ×.** It sets `pdfRender.cancelRequested`, and the renderer checks that flag at its existing
   checkpoints (photo download, `progressCb`, just before `uploadPdf`). It then stops, uploads nothing
   and writes `status: 'cancelled'`. The dashboard shows "Cancelled" and re-enables the buttons.

Plus a config change: set Cloud Run **`--concurrency 1`** so parallel renders never share one
instance's 8 GiB. Add the flag to the redeploy command in `STATUS.md`.

## Constraints

- **Do not deploy** functions or Cloud Run, **do not push**, **do not render PDFs** or read GCS/Firestore
  (egress lands on the owner's bill). Commit on the worktree branch.
- Staff screens only: `pages/staff/dashboard.html`, `functions/`, `services/pdf-renderer/`, `tests/`, `STATUS.md`.
- Jest in a worktree: pass `--testPathIgnorePatterns=node_modules` on the CLI; do not edit `package.json`.
- Out of scope: notifications (email when ready), batch generation, a job queue, any change to rendering itself.

## Success Criteria

The work is complete when:
1. Mid-render, a refreshed or second dashboard tab shows the bar with live progress (owner, live).
2. Generate on an in-flight order is blocked in the UI, and a forced POST gets 409. A status stuck for more than 20 min no longer blocks (owner, live, plus unit tests).
3. Cancelling a Regenerate mid-render ends as `cancelled` within seconds, and the **previous PDF still opens** (owner, live).
4. All requirements from standards are met.

## References

**Skills:** `rageatc-code-oss:test-driven-development`, `rageatc-code-oss:verifying-work`
**Code (verified S193):** `pages/staff/dashboard.html` `generatePdfFromDashboard` (~686, polls from
its own tab only; never reads `pdfRender` on load); `functions/index.js` `generatePdf` (~575) and
`getPdfStatus`; `services/pdf-renderer/index.js` status helper (~173), photo download (~132),
`progressCb` (~240), `uploadPdf` (~266/283)
**Previous work:** `docs/briefs/chunk-024-server-side-pdf.md` (how the render pipeline was built)

## Context

**Background decisions:**
- Cancel is cooperative ("please stop" read at checkpoints), not a hard kill. The owner agreed to this in S193.
- The renderer uploads **only at the end**, so a render stopped before upload leaves the previous PDF untouched. This is the property cancel relies on.
- Realistic parallelism is at most 3 orders (owner).

**Known risks:**
- Live Cloud Run config (S193): `containerConcurrency: 160`, 4 CPU / 8 GiB, maxScale 10, timeout 900s. Renders can share an instance today, and a book is 1–4 GB of photos. **Unconfirmed** whether this has ever caused an out-of-memory failure.
- An 80-page render takes up to ~13 min against the 15-min timeout. Don't add work to the render path.
- Firestore reads for cancel checks must ride the existing throttled progress cadence, not one read per spread.
