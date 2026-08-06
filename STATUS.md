# Session Status
_Last updated: 2026-08-06 (session 156)_
_Context at save: **All work committed and pushed to `main`; the tracked tree is clean.** The
`api-integration` branch is MERGED — there is no longer an unmerged branch in this repo. The Cloud
Run renderer was redeployed by the owner mid-session. One uncommitted deletion is deliberately
left for the owner's judgement (see Open questions)._

## Status
**Session 156 (2026-08-06) — the live rig could not take a single order for a day; that is fixed,
and so is the reason nothing caught it. The spine brief is CLOSED. Printsmarter is merged and
still inert.**

1. **Every upload was broken on the live rig** from `10536f2` (S154) until `61c22a4` today.
   `const workerInFlightBytes` was read 15 lines before it was declared — a temporal dead zone
   error that fires on any connection, not just the 3G the owner was testing. The `|| {}` fallback
   on the read could never run. **Verified fixed: the owner completed a 3G upload.**
2. **281 green tests said nothing about it.** No test executes `order.html` — three name it, but
   they transcribe its logic and assert the *copy* behaves. Third use-before-definition bug in
   four sessions, every one with a green suite.
3. **The browser harness that covered this path already existed and had rotted unrun.**
   `qa/order-hardening-mock.mjs` mocks every backend call (no order created, no cloud cost) but
   waited on a reworded button and knew nothing of step 2's new sub-steps. Repaired and proven:
   it fails on the broken commit **naming the error**, and passes 12/12 on the fix.
4. **`.githooks/pre-push` now runs it automatically** when `pages/order.html` changes, and blocks
   the push if a customer could not complete an order. `npm run qa:order` runs it by hand.
5. **`api-integration` merged** (`f9f814e`) — zero overlapping files, no conflicts. **306 tests.**
   Guards verified directly, not taken on trust. Still cannot fire.
6. **Front cover captions ignored the widened spine in the PDF — every template.** The photo
   slot shifted for the wider spine and the caption did not, so print disagreed with both engines
   by 5mm at 80pp and 1mm at 40pp. Fixed test-first (`27ffeeb`). **312 tests.**
7. **Newborn proven at 80pp** — the last unproven shaped clip. Measured in the real PDF: photo
   centre 331.68mm against captions at ~331.4/332.4mm. **The spine brief is closed.**
8. **The grey strip at the top of the spine is NOT a bug.** The page is exactly 450×236mm, the
   image fills it from the origin, and the first pixel row reads navy → `#c0d5ee` at exactly
   218–232mm → navy. It is the PDF viewer's page frame.

## Recent decisions
- **Repair the existing harness, do not add a new smoke test (S156).** `/critic-agent` rejected an
  ESLint proposal and was right; the capability was already in the repo, just rotted. A second
  forgettable check would rot the same way — hence the pre-push hook.
- **ESLint declined (S156).** Reconsider only if a use-before-definition bug appears somewhere the
  hook does not cover.
- **Merge early while inert (S156, owner).** Nothing on `api-integration` can fire, so merging
  clean beat merging dirty later.
- **Business case untracked (S156, owner).** `.gitignore` + `git rm --cached`; last tracked
  version is `0edb8ee`. **It is no longer backed up by git.**
- **Printsmarter token NOT rotated (S155, owner).** **Never put it in any summary, log or memory.**
- **Button-first, never auto-submit on approval (S155).** No documented sandbox — the first real
  call prints and invoices a book.
- **Wander's viewBox patched in-repo, Xenia not asked again (S154, owner).**
- **The violet hairline is not critical (S154, owner)** — absent from the PDF, so print is safe.
- **`autoShrink` declined for Tender's spine (S154, owner).**
- **#88 closed without root cause (S150, owner).** Read `docs/briefs/upload-failures.md` first.
- **No price rise at launch (S148, owner).** Price is an OUTPUT of the business case.
- **Working assumption: 20% VAT on photo books (S145, owner).** Steuerberater to confirm.
- **The live site stays `noindex` until launch (S144)** — TO-DOS #81.

## Next steps (priority order)
1. **Re-verify the other four templates' covers at 80pp.** The caption fix moved every template,
   not just Newborn — Scribble and Tender were signed off in S153 carrying the 1mm error. Each
   needs a redeploy-free regeneration and a look.
2. **Verify the stall detection (#94) properly.** It has never been exercised: the decisive test
   is a **throttled upload exceeding 60s that succeeds**, which fails on the pre-S151 code. Then a
   dead connection aborting in ~30s, the byte counter climbing mid-transfer, and
   `inspect-upload-failure.js` still parsing a real record. `qa/quick-stall-test.mjs` is broken.
3. **Chase Printsmarter on the five open questions (S155)** — the sandbox answer gates any real
   test; the duplicate-order answer gates how far to trust the once-only guard.
4. **Fix `qa/capture-cover-wrap.mjs` to clip to the canvas content box** — it promises "no UI
   chrome" and delivers 3px per edge. Needs a re-capture, so bundle it with the next mockup run.
5. **Clean up the QA scripts (#60/#95).** 13 untracked files in `qa/`, at least one known broken.
6. **Finish P2-12** — preview-ready and dispatch emails still unverified.
7. **TO-DOS #91** — pin and vendor the four CDN libraries before launch.

## Open questions
- **`assets/Aevia - Business case v10.xlsx` is tracked but missing from disk.** The deletion is
  left uncommitted deliberately. CLAUDE.md calls v10 corrupted, so removing it is probably right —
  but it is the owner's call. A stale Excel lock file `~$Aevia…v11.xlsx` also sits in `assets/`.
- **The Printsmarter button is now visible on the staff dashboard** after the next Cloudflare
  deploy. It cannot fire, but it looks live.
- **The pre-push hook needs `git config core.hooksPath .githooks` per clone.** A fresh clone has
  no protection until that runs. Recorded in CLAUDE.md.
- **Pre-13-July Papercut orders have `name`/`year` swapped in Firestore.** Order data, not template
  data. AEV-043 was corrected by hand; unknown whether real orders are affected.
- **Customer "Save changes" never reaches the PDF, and approval overwrites blindly.** `approveOrder`
  copies `customer*` → `staff*` with no merge and no staleness check, so a customer approving after
  a staff edit silently discards it, and vice versa.
- **Newborn's cover slot is 0.11mm short** on its left edge. Flagged, deliberately not fixed.
- **Is Printsmarter idempotent on `order_id_client`?** Unconfirmed — assume a retry could print two
  books; the once-only guard is the only defence.
- **Prices live in THREE places** — Stripe, `assets/js/prices.js`, `PRICE_BY_PAGE_COUNT` in
  `functions/`. Sync all three on any change.
- **Is 10/14mm a formula or two data points?** `spine = 6 + 0.1 × pages` fits exactly.
- **Android is entirely untested on real hardware.** Owner's plan: cover it in the F&F pilot.
- **`ARCHITECTURE.md` has two invariants numbered 6**, so everything after is off by one;
  `AGENTS.md` renumbers 1–9 and the two disagree.
- **Staff test password is weak** for an account that can read real customer orders.
