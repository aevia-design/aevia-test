# Brief: Read the photo before uploading it

**Created:** 2026-09-13 (Session 187)
**Objective:** Eliminate the upload stall caused by files that are not fully present on disk, and make a genuinely unreadable file fail promptly with a message naming the photo — instead of hanging for 98 seconds and reporting a connection problem that did not happen.
**Audience:** developer-agent (implements), then the owner (Evgeny) who verifies on the live rig.
**Applicable Standards:** `CLAUDE.md` (project + global coding conventions), `AGENTS.md` (invariants and settled decisions), `rageatc-code-oss:test-driven-development`, `rageatc-code-oss:verifying-work`

## Why

Photo upload is the part of Aevia that has actually cost the business: five stranded orders, four sessions, and a root cause that `docs/briefs/upload-failures.md` closed in S150 **unproven** — "No failure has yet been captured with diagnostics in place."

S187 captured one. AEV-096's diagnostic record settles it, and the answer is not what that brief predicted.

**The evidence.** Slot 29 (`Girl_on_dad_s_shoulders_300ppi.png`, 2,106,366 bytes) was attempted three times and stopped at **exactly 371,712 bytes every time**:

| attempt | error | ms | bytesTransferred |
|---|---|---|---|
| 1 | `STALL: no progress for 30000 ms` | 30269 | 371,712 |
| 2 | `STALL: no progress for 30000 ms` | 30130 | 371,712 |
| 3 | `STALL: no progress for 30000 ms` | 30125 | 371,712 |

A failing network stops at a different offset each time. Stopping at the identical byte three times means the browser could not **read** past that offset — the transport was never the problem.

**Two things this rules out.** `upload-failures.md` named one decisive observation: whether the failing photo is reused elsewhere in the order (the duplicate-`File` hypothesis). It is not — 55 pool photos, 55 distinct originals, that file used exactly once. The same theory predicted Safari; this was Chrome 151 on Windows. **The duplicate-`File` hypothesis is dead.**

**The cause.** The owner confirmed the photos lived in a **OneDrive sync folder**. With Files On-Demand, a file that looks local is a placeholder whose contents are still in the cloud. `xhr.send(file)` streams from that placeholder; when the stream reaches the end of the locally cached prefix, hydration must happen mid-request, and when it does not the read never returns another byte. No error, no HTTP status — just silence. That matches every observation: a fixed offset, a stall rather than a failure, one file out of 55, identical retries, Windows + Chrome.

**Why this is not a test-data quirk.** iPhone's *Optimise iPhone Storage* does the same thing to iCloud photos: the full-resolution original lives in the cloud and the device keeps a smaller copy. That is a large share of Aevia's customers uploading exactly the photos they care most about. Android and iOS have never been tested on real hardware (`STATUS.md`, open questions), so the scale is unmeasured — but the mechanism is identical, and this is the first hard evidence of what the failure looks like.

**What is already fixed, and why it is not enough.** S173/S174 stopped one bad photo from stranding the whole order (`bb311f1`, `fc1145a`). Today AEV-096 would lose one photo, not 28. That contains the blast radius; it does not stop the customer losing a photo, and it still reports "your connection stopped" for a fault that has nothing to do with the connection.

## Requirements Extracted from Standards

**From `CLAUDE.md` (global — simplicity and surgical edits):**
- [ ] Fix the root cause (the file is read lazily, mid-upload) rather than the symptom (stall thresholds, retry counts) — no band-aid left behind
- [ ] Smallest change that solves the problem; no speculative abstraction for uploads we do not have yet
- [ ] Change only what this task needs — no reformatting or refactoring of unrelated code in `pages/order.html`
- [ ] No new dependencies — the File and XHR APIs are browser built-ins, nothing is added
- [ ] Non-obvious decisions explained in plain language in the final report (owner is new to coding)

**From `CLAUDE.md` (project — order form and cost):**
- [ ] `npm run qa:order` passes before push; `pages/order.html` is not executed by `npm test`, which is how a crash reached the live rig in S154 with 281 tests green
- [ ] No change to what counts as an acceptable photo — `PHOTO_FORMATS` in `assets/js/photo-utils.js` stays the single source of truth (RAW/TIFF/WebP and the 40 MB cap are settled; do not re-raise)
- [ ] No change to GCS region, bucket, or the shape of what is stored — this is a client-side change with no new cloud spend

**From `rageatc-code-oss:test-driven-development`:**
- [ ] A failing test exists before the fix: a `File` whose read rejects must produce a named, fast, customer-legible failure
- [ ] The diagnostic record distinguishes "could not read the file" from "the upload stalled" — they are different faults needing opposite responses

**From `rageatc-code-oss:verifying-work`:**
- [ ] Completion is claimed only with fresh output pasted — `npm test`, `npm run qa:order`, and a real upload on the live rig
- [ ] The OneDrive case is exercised deliberately (a dehydrated file, Files On-Demand on) rather than assumed fixed

## Constraints

- **Format:** plain JS in `pages/order.html`, matching surrounding style. No framework, no build step, no npm on the frontend.
- **Memory is the real risk.** `CONCURRENCY = 5` and `PHOTO_FORMATS.maxBytes` is 40 MB, so a naive "read every file into memory" peaks near 200 MB and will hurt older phones. Peak memory must stay bounded and must not scale with the size of the order (books run 1–4 GB).
- **The happy path must not get slower.** TO-DOS #53 and #62 already log upload speed as a complaint; a 1.12 GB order takes 5+ minutes today.
- **Preserve what S173/S174 built:** the worker pool must still record a failure and take the next photo, the consecutive-failure breaker must still work, and `uploadFailures` must still mean exactly "not in GCS" including `neverAttempted` slots.
- **Out of scope — the stranded-order lifecycle.** `upload_failed` status, the detection job, the staff/customer emails and the Retry button are `docs/briefs/upload-failure-recovery.md` (TO-DOS #89/#90), ready since S174. This brief stops photos going missing; that one handles what happens when they do.
- **Out of scope — resumable uploads.** The signed URL uses `action: 'write'`, which the GCS client documents as a single-shot PUT that is **not** resumable, so every retry restarts from byte zero. Moving to `action: 'resumable'` is the correct hardening for weak networks and deserves its own session; it would **not** have fixed AEV-096, because resuming from byte 371,712 hits the same unreadable offset.

## Success Criteria

The deliverable is complete when:

1. A photo that cannot be read produces a failure that names the photo and tells the customer what to do, instead of 98 seconds ending in "your connection stopped". ⚠ "Fast" cannot be a flat deadline: hydrating a large file from OneDrive or iCloud is *legitimately* slow, and aborting it would recreate the S151 defect of killing a healthy-but-slow operation. The distinction is the same one the stall timer already makes — is anything happening, or has it stopped — and it must be made on the read, not on elapsed time.
2. The diagnostic record on the order distinguishes an unreadable file from a transport stall, so the next occurrence is self-diagnosing rather than needing another session of forensics.
3. A real upload from a dehydrated OneDrive folder on the live rig either succeeds, or fails fast with the correct message — verified by the owner, not inferred.
4. Peak browser memory stays bounded regardless of order size, and a full 40-photo order is no slower than today.
5. `npm test` and `npm run qa:order` pass, with a new case covering the unreadable-file path.
6. All requirements from standards are met.

## References

**Skills:** `rageatc-code-oss:test-driven-development`, `rageatc-code-oss:verifying-work`, `rageatc-code-oss:systematic-debugging`
**Previous work:**
- `docs/briefs/upload-failures.md` — the S150 investigation, CLOSED unproven. **This brief supplies the capture it was waiting for and kills its leading hypothesis.** Update it rather than leaving it stale.
- `docs/briefs/upload-failure-recovery.md` — the stranded-order lifecycle (out of scope here, but the natural next session)
- `work/stall-detection/brief.md` — how the 30s progress-based stall timer came to exist (S151)
- `work/upload-worker-resilience/decision.md` — why the consecutive-failure breaker is 5 (S173)

**Code:**
- `pages/order.html:2734-2975` — the worker pool, retry loop, stall timer and circuit breaker
- `functions/upload.js:144-145` — where the signed URL is minted (`action: 'write'`, v4)
- `assets/js/photo-utils.js` — `PHOTO_FORMATS`, including `maxBytes`

**Evidence:** order `AEV-096` in Firestore (`uploadErrors`, `photoManifest`); read it with `node scripts/inspect-upload-failure.js AEV-096` — metadata only, no egress.

## Context

**Background decisions already made:**
- The cascade is fixed and must stay fixed (S173/S174). This brief must not regress it.
- The 30-second progress-based stall timer is deliberate (S151) and is not the defect here — it did its job, it just reported the wrong cause.
- AEV-096 is a test order the owner does not need recovered. It is evidence, not a job. It is already listed for cleanup in TO-DOS #60.

**Known risks:**
- **Reproducing the fault is awkward.** A dehydrated OneDrive placeholder cannot be conjured in a unit test. Split it: unit-test the readable/unreadable branch with a `File` whose read rejects, and verify the real OneDrive case by hand on the rig.
- **iOS cannot be tested here.** The iCloud variant is the higher-value case and there is no hardware. Do not claim it fixed; state what was verified and what was inferred.
- **A read that hangs is not a read that throws.** If hydration blocks rather than failing, a plain read will hang exactly as the upload did. The fast-failure requirement implies a bound on the read, not just a `try`/`catch` — this is the part most likely to be got wrong.
- **Do not let this grow into resumable uploads.** They are genuinely worth doing and are explicitly a different session; scope creep here delays a fix that is ready now.
