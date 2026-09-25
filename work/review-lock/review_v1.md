# Review: Review lock brief + decision record v1

**Reviewed:** 2026-09-25
**Artefact Type:** Implementation brief (`docs/briefs/review-lock.md`) + decision record (`work/review-lock/decision.md`)
**Applicable Standards:** creating-briefs template; CLAUDE.md (engine parity, getOrder whitelist, /stop-slop, STATUS_SEQUENCE rule); correctness against code

## Summary
Both documents are clear and short, and most of their code claims are accurate. The decision (lock = status, promote on report, subcollection) is sound. The design has three gaps, each verified in code, that would recreate the exact bug #99 exists to prevent. Customer saves are never gated by status. A customer tab left open can overwrite the staff fix when the customer approves. And the dashboard's "set `issue` by hand" unlock skips the promotion step. The brief must close all three before build.

## What Meets Standards
- Verified accurate: the customer draft wins on reopen field by field (`customer-preview.html:1380-1401`). The staff engine has zero `customer*` references. `reportOrderIssue` is at 443, stores only the latest `issueNote`, flips to `issue` only from `review_sent`, and emails support@ with reply-to set to the customer. `approveOrder` refuses only approved/paid (`index.js:383`). `PRE_APPROVAL_STATUSES` excludes `issue` (`index.js:1719`), so the re-send dead end is real. `sentSnapshot` is overwritten on every send and lacks `heartCrop` and caption lines (`index.js:1767-1774`). `STATUS_SEQUENCE` is at `dashboard.html:1205`.
- Requirements are testable, the success criteria walk the real loop end to end, and old-order behaviour (absent fields) is specified.
- The decision record states its trade-offs and assumptions honestly ("a status set by hand can unlock staff").

## Priority Issues

### High Priority

**1. `saveOrderState` has no status gate, so the "read-only editor" is client-only**
- Symptom: `saveOrderState` (`index.js:322-356`) writes `customer*` for any valid token, whatever the status. The customer page decides read-only once, at load (`customer-preview.html:1363`), and only for approved/paid. The report handler (`:3680-3700`) closes the modal and leaves the page editable.
- Root cause: B2 specifies read-only as UI behaviour only, and R52 ("server-side") covers approval but not saves.
- Impact: after a blocking report, the reporter's own tab can still Save. That recreates `customer*` over the promoted copy, and after the re-send the customer's reopen precedence (customer wins) hides the staff fix again. This is the original bug.
- Where to next (prescriptive): add a requirement that `saveOrderState` refuse unless the status is `review_sent`. Also require that a successful blocking report switch the open page to read-only immediately, without a reload.

**2. A stale tab's approve auto-save overwrites the staff fix**
- Symptom: Approve always runs `saveBookState()` first (`customer-preview.html:3637`) and then `approveOrder`, which promotes `customer*` → `staffBook*` (`index.js:395-423`). Nothing ties a save or approval to the version that was sent.
- Scenario: the customer reports and leaves the tab open. Staff fix and re-send (status back to `review_sent`). The customer clicks Approve in the old tab. The old state is saved, then promoted, then printed. Fix #1 does not stop this, because the status really is `review_sent` again.
- Root cause: A1 says "status is the single source of lock truth", but status cannot tell one send round from the next.
- Where to next (suggestive): have the client send the send number (`sentVersions` n or `sentSnapshot.sentAt`) it loaded, and have `saveOrderState`/`approveOrder` refuse with 409 if it no longer matches. The page then prompts the customer to reload. C2 already creates this counter.

**3. The dashboard's manual `issue` unlock bypasses the promotion**
- Symptom: the brief (Open questions) and A1 say an emailed report is unlocked by "staff setting `issue` in the dashboard". `updateStatus` writes `status` directly through the Firestore client SDK (`dashboard.html:1236`), and `firestore.rules` allows any staff update. No promotion or `customer*` clearing runs.
- Impact: staff unlock, then edit the stale `staffBook*` while `customer*` survives. After the re-send the customer reopens their old draft. This is the bug again, on the path the brief itself names for emailed reports.
- Root cause: B2's promotion lives only in `reportOrderIssue`. The brief doesn't list every writer of `status`.
- Where to next (prescriptive): route the `review_sent` → `issue` change through a server function that runs the same promotion helper (for example a staff-auth `openIssue` function, or `reportOrderIssue` with staff auth). Have the dashboard call it for that transition. Add it to R47-R49.

### Medium Priority

**4. Other status writers bypass the rules.** The same dropdown can set `review_sent` without `sendPreviewEmail` (no `sentVersions` entry, and the lock is on without a send) and `approved` without `approveOrder` (no promotion). Rules allow any staff update. Suggestive: add a Constraint either that these transitions go through functions, or that the dropdown warns/blocks for `review_sent`, `issue` and `approved`. At minimum, document the accepted gap.

**5. Report and approve aren't atomic.** `approveOrder` and `reportOrderIssue` both read and then `update()` without a transaction. A report in flight while Approve lands can produce `approved` with a blocking note, or `issue` after the promotion ran under approval. Prescriptive: require a Firestore transaction for the status check plus the promotion in both functions (and in `sendPreviewEmail`).

**6. The first save plus promotion inside the report is unspecified.** B2 says the report "first saves the customer's unsaved edits". Today `reportOrderIssue` takes only `{token, message}`. The brief should state that the report request carries the same payload as `saveBookState` and that the server writes and promotes it in one transaction. Otherwise an implementer will call two endpoints from the client (not atomic, and a race with #5).

**7. Blocking reports outside `review_sent` are undefined.** Today a report in approved/paid records a note but no status. The brief doesn't say what the blocking path does there (approval already done, so it cannot block anything), nor whether the two-path form shows at all. Specify it, for example: after approval only the feedback/email path exists.

**8. The dashboard shows notes only in `issue`.** `dashboard.html:551` renders `issueNote` only when `status === 'issue'`. Feedback leaves the status at `review_sent`, so feedback is invisible on the dashboard unless the rendering changes. R41 needs a concrete field design (for example an `orders/{id}/reports` subcollection or `reports` array with `kind: 'blocking'|'feedback'`) and a dashboard display rule. It also needs a rule for how a feedback flag is cleared.

**9. `staffBookComplete` after promotion.** The promotion rewrites `staffBook*` but not `staffBookComplete`/`staffIncompleteReasons`, so send gate 3 (`index.js:1757`) passes on the pre-report flag. Staff could re-send without saving the fix. Suggestive: have the promotion set `staffBookComplete: false` (forcing a staff save before re-send), or require that re-send refuse unless `staffSavedAt` > `issueReportedAt`.

**10. Line references drift.** `getOrder` starts at 177 (its response whitelist is at ~280). The `approveOrder` mapping is 395-423, not 405. `saveStaffState` is at 518 and isn't in References, though A1 changes it. `sendPreviewEmail` 1721 and dashboard send ~910/`updateStatus` 1212 are also missing from References. Fix the refs and add these.

### Low Priority / Recommendations
- **Firestore rules:** `firestore.rules` only matches `orders/{orderId}`, so staff clients cannot read `sentVersions` (the default is deny). Writes through the admin SDK are fine. Add a rule only if the dashboard will read history. Note this in the brief.
- **Customer page language:** the page chrome is English-only (`<html lang="en">`; only book language is switched, `:1340`). R60's "if the page is bilingual" resolves to no. Say so explicitly so the implementer doesn't build DE pairs.
- **Lock from `review_sent` "or later":** it also blocks staff saves on paid orders. Needs validation: does staff ever fix a paid book before print today?
- The dashboard comment at `dashboard.html:536` says `sentAt` is stamped by `generatePreviewLink`, but it is stamped by `sendPreviewEmail`. Harmless, but it will mislead whoever touches that code.
- Old orders already in `review_sent` with `customer*` present: after deploy, a blocking report will promote them, which is correct. Worth one test.

## Assessment Against Standards
- [x] Current behaviour verified in code (accurate, minor line drift)
- [~] Report form requirements: feedback visibility on the dashboard needs a data design (#8)
- [ ] Lock and unlock: not enforceable as written (#1, #2, #3)
- [~] Approval refusal server-side: stated, but not atomic (#5)
- [x] Sent-version history: clear; rules note missing (Low)
- [x] Old-order compatibility and getOrder whitelist constraint present
- [x] STATUS_SEQUENCE rule respected
- [~] References complete (#10)

## Next Steps
1. Add requirements for the server-side save gate, a send-version token on save/approve, and a server-side manual unlock with promotion (#1-3).
2. Specify transactions and the report payload (#5, #6).
3. Define the report storage and dashboard display for blocking vs feedback, plus out-of-stage reports (#7, #8).
4. Decide the `staffBookComplete` behaviour after promotion (#9), then fix the references (#10).
