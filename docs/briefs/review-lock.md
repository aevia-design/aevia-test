# Brief: Review lock and issue flow (TO-DOS #99)

**Created:** 2026-09-25 (S194)
**Objective:** After the preview is sent, there is exactly one copy of the book: the customer's.
Staff fixes land on that copy and reach the customer, and approval is blocked while a real problem is open.
**Audience:** Customers reviewing their book (`pages/customer-preview.html`) and staff (owner, Xenia) fixing reported problems.
**Applicable Standards:** Engine parity (memory `feedback_engine_parity`), `/stop-slop` for customer-facing copy (CLAUDE.md),
`context/design-principles.md`, and `rageatc-code-oss:test-driven-development`.

## Why

The customer journey is send preview → customer edits/approves → pay → print. Today the staff copy
(`staffBook*`) and the customer's draft (`customer*`) drift apart after sending, and nothing notices.
Nothing has gone wrong on a real order yet. This work pre-empts it before the F&F trial.

## Current behaviour (verified in code, S194)

- The customer's saved draft wins on reopen, field by field (`customer-preview.html:1380-1401`).
  Approval copies it over `staffBook*` (`functions/index.js:405-423`). The customer's copy is already
  the source of truth, and that stays.
- **The staff engine never reads `customer*` fields** (there are zero references under `pages/staff/`).
  Scenario: the customer swaps photos and saves, then reports a blurry cover. Staff fix our copy and
  re-send. The customer reopens and sees **their old draft**, approves, and the unfixed book prints.
- Staff can keep editing after sending, and approval silently erases those edits.
- `reportOrderIssue` (`index.js:443`) stores `issueNote` (the latest note only, which overwrites
  earlier ones), sets `status: 'issue'` (only from `review_sent`), and emails **support@aevia.at** with
  the subject "Issue reported — AEV-XXX" and reply-to set to the customer. The dashboard floats `issue`
  rows to the top. **It does not block approval**, because `approveOrder` only refuses approved/paid (`index.js:~383`).
- Customers can: swap photos between slots, reposition within a frame (heartCrop), and edit caption
  text, line breaks and styling (font, weight/italic pill, size, alignment), including cover captions
  and Heirloom initials. They cannot: reorder or add pages, edit intro/map/monogram/language, use AI
  captions, or add photos. **There is no unused-photo pool in practice**, because customers upload the exact count.
  **Nobody, staff included, can add a new photo after ordering.**

## Requirements

**Report form (customer-preview):**
- [ ] Two paths replace the single message box. **"Something needs fixing that I can't change myself"**
      requires a description, blocks approval, and unlocks staff editing. **"Just sharing feedback"** is
      delivered but leaves approval open.
- [ ] Both paths keep today's routing: email to support@aevia.at (reply-to the customer) and the dashboard flag.
      Feedback is visibly distinct from a blocking issue in both.
- [ ] Every report is kept, not only the latest one.
- [ ] While a blocking issue is open, the customer sees why they cannot approve and that we will get back to them.

**Lock and unlock:**
- [ ] Once the preview is sent, the staff engine cannot save book edits for that order.
- [ ] A blocking report unlocks staff. The engine then **opens the customer's saved draft** (all `customer*`
      fields, including `customerCaptionLines`, heartCrop and styles), not the stale staff copy.
- [ ] Re-sending locks staff again. On reopen, the customer sees the fixed version, and the blocking issue is closed.
- [ ] After approval the book is locked for everyone (unchanged).
- [ ] `approveOrder` refuses while a blocking issue is open. This is enforced **server-side**, not only by a hidden button.

**Sent-version history:**
- [ ] Each send (first and re-sends) stores a frozen copy of the book as sent, numbered with a timestamp.
      Nothing edits it afterwards, and approval does not touch it.

**Standards:**
- [ ] Staff and customer engines stay in parity for anything touching load/save of book state.
- [ ] Customer-facing copy (form, block message, emails) has passed `/stop-slop` and is ready for DE via `order-strings`-style pairs if the page is bilingual.
- [ ] Server rules (approval refusal, lock, version snapshot) are covered by `npm test`.

## Constraints

- The customer's saved draft is the source of truth. Staff always fix on top of it, never merge two copies.
- No new photo-upload path (see Open questions).
- Old orders must keep working: absent new fields mean "no blocking issue, no history".
- Firestore field additions must be added to `getOrder`'s response whitelist.
- Out of scope: tracking customer activity or diffs (separate card), email wording beyond what the two paths need, and multi-round workflow tooling.

## Success Criteria

1. On the rig: customer edits and saves → reports a blocking issue → approve is blocked → staff open the order and
   see the customer's edits → fix and re-send → customer reopens and sees the fix → approves → the PDF matches.
2. Feedback-only report: approve still works, and support@ plus the dashboard show it as feedback.
3. After sending, and with no blocking issue, a staff save is refused.
4. All requirements above are met, with `npm test` green.

## Open questions

- **A fix that needs a photo the customer never uploaded.** Nobody can add one today. For now it is handled
  by email; if it recurs, it becomes its own card. Not built here.
- ~~What unlocks staff after an emailed report?~~ Decided: staff set `issue` in the dashboard.

## Approach (decided S194, `work/review-lock/decision.md`)

- **Lock = status.** Staff save refused from `review_sent` on; `issue` unlocks; approve refused in `issue`;
  `sendPreviewEmail` must accept `issue` (today it refuses it, which is a dead end) and re-locks by setting `review_sent`.
- **One live copy.** A blocking report saves the customer's pending edits, promotes `customer*` → `staffBook*`
  (shared helper with `approveOrder`), and clears `customer*`. The customer editor is read-only while in `issue`.
- **History.** Each send writes `orders/{id}/sentVersions/{n}`; `sentSnapshot` stays as the latest and gains
  `heartCrop` and caption lines.

### Review v1 fixes (`work/review-lock/review_v1.md`, High items verified S194)
- **Customer saves must respect status.** `saveOrderState` accepts saves in any status today. It must refuse
  unless the status is `review_sent`. The page switches to read-only as soon as a blocking report succeeds, not only on reload.
- **Stale tabs cannot approve over a fix.** Approve auto-saves first (`customer-preview.html:3637`), so an old tab
  would re-save the old book after a re-send. Save and approve carry the **send number** the page loaded. The server
  refuses with 409 ("your book was updated, please reload") if it has changed.
- **No unlock bypasses the promotion.** The dashboard status dropdown writes Firestore directly (`dashboard.html:~1236`).
  Setting `issue` (email-reported problems) goes through the same server function and helper as a form report.
  The dropdown must also stop offering `review_sent`/`approved`, which have their own server paths (send / approve).
- **The report request carries the customer's unsaved edits**, and the server saves, promotes and flips the status in
  **one transaction**. Approve also runs in a transaction so the two cannot race.
- **A blocking report is only accepted in `review_sent`.** After approval, the report is kept as feedback plus the email (as today).
- **Promotion resets `staffBookComplete`** so a re-send requires a fresh staff save.
- **Reports are stored as a list** (type, message, time). The dashboard shows feedback on any status and marks it
  seen. `issueNote` stays for old orders.
- Line refs have drifted: `getOrder` ~177, approve mapping ~395, `saveStaffState` ~518, `sendPreviewEmail` 1721.
- The customer page is English-only today, so the DE-strings requirement does not apply (checked by the reviewer, not verified).

### Codex review fixes (S194; `gpt-5.6-sol`, findings 1 and 3 verified in code)
The send number is **replaced** by one rule that covers every writer:
- **`bookRevision`** is a counter on the order, returned by `getOrder` and the staff load. **Every** write of book state
  (customer save, blocking report + promotion, staff save, send, approve) runs in a Firestore transaction. It must
  present the revision its tab loaded, it bumps the counter, and it returns the new value. A mismatch returns 409
  ("your book was updated elsewhere, please reload").
  This covers: a staff tab opened before the report and saved after the unlock (verified: the engine loads once,
  `template-engine.html:5191`, and saves wholesale, `:5375`); two customer tabs overwriting each other; and an old tab after a re-send.
- **Approve carries the displayed book state in the same request** and saves plus promotes it in one transaction.
  It replaces today's separate save followed by approve (`customer-preview.html:3634-3644`), so approval can never
  promote a draft the approving tab did not show.
- Send: in one transaction, bump the revision, write `sentSnapshot`, and `create()` (never overwrite) `sentVersions/{n}`.
- Writer audit (Codex, not independently verified): `staffBook*` is written only by approve and `saveStaffState`;
  `customer*` only by `saveOrderState`. Status is also written by upload, payment, print/delivery and upload-failure
  jobs (unaffected), and by the dashboard dropdown (handled above).

## References

- Trello #99 (S192 discussion comment); `docs/todo-notes.md#99`
- `functions/index.js`: `getOrder` (~280), `saveOrderState` (~330), `approveOrder` (~383-425), `reportOrderIssue` (443)
- `pages/customer-preview.html`: load (1380-1401), save (3408-3440), approve (3613-3657), report (913, 3663)
- `pages/staff/dashboard.html`: issue styling and sorting (134-148, 446)
- Memory: `project_order_statuses` (the `issue` side-state), `feedback_engine_parity`

## Context

- **Decided (owner, S192/S194):** no staff edits after sending; unlock only on a blocking report; re-send re-locks;
  fixes go on top of the customer's draft; keep the form (not a mailto link) because it drives the dashboard flag and the block.
- #129 added `customerCaptionLines`. It must travel with captions through the unlock, fix and re-send loop.
- `upload_failed` and `issue` are side-states outside `STATUS_SEQUENCE`. Don't add either to it (S190).
- Risk: preview-mode edits only persist on Save, so an unsaved customer edit is invisible to staff. That is acceptable, but the block message should mention it.
