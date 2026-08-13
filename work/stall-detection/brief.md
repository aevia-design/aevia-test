# Brief: Progress-based stall detection for photo upload

**Created:** 2026-08-04 (Session 151)
**Objective:** Replace the fixed 60-second per-attempt upload timeout with a no-progress stall timer, so a slow-but-healthy upload never aborts and a genuinely stalled one is reported in ~30 seconds instead of ~3 minutes.
**Audience:** developer-agent (implements), then the owner (Evgeny) who verifies on the live rig.
**Applicable Standards:** `CLAUDE.md` (project + global coding conventions), `AGENTS.md` (invariants and settled decisions), `rageatc-code-oss:verifying-work`

## Why

Photo upload is the part of Aevia that has actually hurt the business: four orders stranded in July (TO-DOS #88), three sessions spent on it, and a root cause never proven. The pre-launch QA gate (P0/P1/P2) is now clear and friends-and-family piloting is pencilled for September 2026, which means real customers uploading 1–4 GB books over home and mobile connections for the first time.

The current per-attempt timeout is **60 seconds**, and the code comment at [`pages/order.html:2458-2465`](../../pages/order.html#L2458-L2465) says outright that this is a *diagnostic* threshold chosen on a studio connection where a whole 115 MB order completes in ~15 seconds — explicitly to be revisited "before real customers upload over slow mobile links."

It has not been revisited, and it is now the single most likely way a real customer's upload breaks at launch. A 12 MB photo on a weak 1 Mbit uplink legitimately takes ~95 seconds; on a poor signal, closer to three minutes. Today all three attempts would abort and the order would strand — a healthy upload killed by a threshold, indistinguishable in the logs from the real fault we spent three sessions chasing.

Raising the number alone trades one failure for another: at five minutes a genuinely dead upload hangs for fifteen before the customer sees anything. The defect is not the value, it is that the timer measures **elapsed time** rather than **whether bytes are moving** — so it cannot tell "slow" from "stalled", which are the two cases needing opposite responses.

## Requirements Extracted from Standards

**From `CLAUDE.md` (global — simplicity and surgical edits):**
- [ ] Fix the root cause (progress-blind timer), not the symptom (threshold value) — no band-aid left behind
- [ ] Change only what this task needs; do not reformat, refactor or "improve" unrelated code in `order.html`
- [ ] No new dependencies — `XMLHttpRequest` is a browser built-in, nothing is added
- [ ] Non-obvious decisions explained in plain language in the final report (owner is new to coding)

**From `CLAUDE.md` (project — frontend delivery constraint):**
- [ ] No build step, no npm on the frontend; the change is plain JS inside `pages/order.html`
- [ ] Both customer-facing engines stay in step where the change touches shared behaviour (see Constraints — expected to be N/A here, confirm)

**From `AGENTS.md` / `rageatc-code-oss:verifying-work`:**
- [ ] No completion claim without fresh verification output pasted into the report — "should work" is not acceptable
- [ ] Both halves proven by evidence: a throttled-but-healthy upload succeeds, and a dead connection reports in ~30s

**From the existing diagnostics contract (S147):**
- [ ] The `uploadErrors` payload shape stays readable by `scripts/inspect-upload-failure.js` without modifying that script
- [ ] A stall stays distinguishable from an HTTP refusal in the log — they need opposite fixes

## What to build

**1. Progress-based stall detection (the core change).**
Replace the GCS `PUT` inside the worker loop ([`pages/order.html:2483-2488`](../../pages/order.html#L2483-L2488)) with `XMLHttpRequest`. `fetch()` cannot report upload progress — this is a genuine gap in the API and the sole reason for the swap. Attach `xhr.upload.onprogress`, and on each event reset a stall timer. Abort only when **no progress event has fired for `STALL_TIMEOUT_MS`**.

- `STALL_TIMEOUT_MS = 30000` — a healthy connection fires progress events every few hundred milliseconds, so 30s of total silence is unambiguous.
- Keep a generous absolute ceiling per attempt, `MAX_ATTEMPT_MS = 900000` (15 min), purely as a backstop against a pathological case where progress events keep firing but the transfer never completes.

**2. Real byte-level progress in the UI.**
`uploadedBytes` currently only increments when a whole file finishes ([`order.html:2547`](../../pages/order.html#L2547)), which is why one stuck file renders as "49 of 50" and looks like it is stalling on the last photo — the display artefact described in `docs/briefs/upload-failures.md`. With `onprogress` available, track in-flight bytes per worker and include them in the total. **Take care not to double-count** when a file completes and its in-flight tally is folded into the committed total.

**3. Fix the decorative retry backoff.**
Retries currently wait 100 ms then 200 ms ([`order.html:2502`](../../pages/order.html#L2502), [`:2540`](../../pages/order.html#L2540)), so all three attempts land inside half a second — no real transient recovers that fast. This was **deliberately** left broken as evidence-gathering for #88; that reason expired when #88 closed (S150). Move to seconds (suggested 2s then 5s).

**4. Extend the failure record.**
Add `bytesTransferred` and `totalBytes` per attempt to the `uploadErrors` entry, and label a stall distinctly (e.g. `STALL: no progress for 30000 ms`, keeping the existing `timedOut: true` flag so nothing downstream breaks). "Died after 200 KB of 12 MB" is far more diagnostic than "it timed out."

## Constraints

- **Files:** `pages/order.html` only. The change is confined to the upload worker loop and its failure logging.
- **Do not touch:** `createOrder` or `confirmUpload` — both stay on `fetch`. The `confirmUpload` `res.ok` + 3-retry logic shipped in S150 (#92) is correct and must be preserved verbatim.
- **Do not touch:** the `beforeunload` / `uploadInFlight` guard, or the S150 (#93) file-validation checks (non-images and non-decodable files rejected).
- **Out of scope — flag, do not fix:** `Promise.all` at [`order.html:2553`](../../pages/order.html#L2553) means one dead file abandons the whole remaining queue (the AEV-067 signature). A real defect, but a separate change with its own risk; note it in the report for a follow-up. Also out of scope: upload resume (#90), Android `accept` attribute (see Context), and any cloud-provider import.
- **Backwards compatibility:** `scripts/inspect-upload-failure.js` must keep working unmodified against the new records.
- **Size:** expected ~40–60 changed lines. If the implementation is heading well beyond that, stop and report rather than expanding scope.

## Success Criteria

The deliverable is complete when:

1. **A slow but healthy upload completes.** Demonstrated under network throttling severe enough that at least one file's single attempt exceeds 60 seconds — proving the case that fails on `main` today now succeeds. Evidence: run output showing per-file duration >60s and a successful order.
2. **A dead connection is reported quickly.** With the connection cut mid-transfer, the attempt aborts after ~30 seconds of no progress (not ~60), the failure is recorded with `bytesTransferred`, and `node scripts/inspect-upload-failure.js AEV-0nn` reads it back **without that script being modified**.
3. **The progress bar moves within a single large file**, not only when a file completes.
4. **No regression:** an ordinary unthrottled order still completes and reaches `status: new` / `uploadComplete: true`.
5. All requirements from standards are met, with verification output included in the report.

## References

**Code:** [`pages/order.html:2456-2553`](../../pages/order.html#L2456-L2553) (worker loop), [`:2558-2612`](../../pages/order.html#L2558-L2612) (confirmUpload — preserve), [`functions/upload.js`](../../functions/upload.js) (`reportUploadFailure`), [`scripts/inspect-upload-failure.js`](../../scripts/inspect-upload-failure.js) (must not change)
**Briefs:** [`docs/briefs/upload-failures.md`](../../docs/briefs/upload-failures.md) — **read the header block first**; S150 corrected several claims in the body below it.
**QA:** [`qa/README.md`](../../qa/README.md) for script conventions and gotchas; [`qa/p2-upload-probe.mjs`](../../qa/p2-upload-probe.mjs) already implements a `--throttle` flag — reuse that approach rather than inventing one.
**Standards:** `CLAUDE.md`, `AGENTS.md`

## Context

**Background decisions already made:**
- **#88 was closed on the owner's call (S150) without a proven root cause.** This work is *not* a fix for #88 and must not be described as one. It removes a threshold that would manufacture *new* failures at launch, and improves the evidence captured if #88 ever recurs.
- **Cloud-provider import (Google Photos/Drive) was considered and dropped this session.** Phone pickers on both iOS and Android already reach the customer's cloud photos natively, so the feature would only serve desktop users.
- The leading untested hypothesis for #88 is that the FP4 source file was an **iCloud placeholder** — present in Finder, bytes not local, so reading it stalls. Unverified; Xenia unavailable. Relevant only in that better stall evidence would help confirm or kill it.

**Known risks:**
- **`qa/test-photos/` is missing** on this machine. Use `assets/test photos/DTS_PARENTHOOD` as the P2 scripts do.
- **Every real-world failure was Safari/macOS; all QA runs headless Chromium.** Playwright's WebKit is not Safari — same JS engine, different networking stack. A clean WebKit run does **not** exonerate the transport. Treat a reproduction as gold and a pass as inconclusive.
- **Cost:** no infrastructure change. Test uploads write to GCS in-region (ingress is free); the only spend is negligible storage for test orders. Clean up test orders per TO-DOS #60.
- **Do not run a local PDF render** as part of verification — that bills GCS egress to the owner.

**Numbers chosen by the orchestrator, open to the owner's revision:** `STALL_TIMEOUT_MS = 30000` and retry backoff of 2s/5s. Both are judgement calls, not measurements.
