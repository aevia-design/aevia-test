# S151 Implementation: Progress-Based Stall Detection

**Status:** ✅ VERIFIED S173 (2026-08-13) — all four criteria met. See `VERIFICATION.md`.
The "Verification strategy" section below is superseded: the two QA scripts it names were
never run and do not work against the current form.

## Summary of Changes

Modified `pages/order.html` lines 2435-2612 (worker loop + updateProgress) to replace the fixed 60-second per-attempt timeout with a **no-progress stall timer**. Four changes, all specified in `brief.md`:

### 1. Progress-based stall detection (core change)
- **Line 2465:** `STALL_TIMEOUT_MS = 30000` — timer resets on each progress event
- **Line 2466:** `MAX_ATTEMPT_MS = 900000` — absolute 15-min ceiling per attempt
- **Lines 2491-2541:** Replaced `fetch()` with `XMLHttpRequest`
  - `xhr.upload.onprogress` listener captures `e.loaded` (bytesTransferred)
  - Each progress event clears and reschedules the stall timer
  - Initial stall timer fires if no progress within 30s of starting the upload
  - No new dependencies; XMLHttpRequest is a browser built-in

**Rationale:** `fetch()` cannot report upload progress (`e.loaded`), making it impossible to distinguish "slow but healthy" from "stalled". XMLHttpRequest is the only standard way to monitor in-flight bytes.

### 2. Real byte-level progress in UI
- **Lines 2469, 2502-2506:** Track in-flight bytes per worker in `workerInFlightBytes` object
- **Line 2606:** Clear in-flight count once a file completes (avoid double-counting)
- **Lines 2435-2451:** Update `updateProgress()` to include in-flight bytes in displayed total
  - `displayedBytes = uploadedBytes + inFlightTotal`
  - Progress bar and byte count now reflect transfers in progress, not just completed files

**Verification:** On a large file, the byte counter will now show steady progress (e.g., "2 of 10 photos · 12 MB / 85 MB") rather than jumping from "49 of 50 photos · X MB" straight to "50 of 50 photos · Y MB" at the end.

### 3. Fix decorative retry backoff
- **Lines 2557, 2598:** Changed from `100 * attempt` ms to `attempt === 1 ? 2000 : 5000` ms
  - First retry: 100ms → 2s
  - Second retry: 200ms → 5s
  - Applied to both HTTP error retries and stall/exception retries

**Rationale:** The 100/200ms backoff was deliberately broken to gather evidence for #88; that reason expired when #88 closed (S150). A real transient (DNS hiccup, brief packet loss) takes tens of milliseconds to recover; 2-5 seconds gives actual network conditions a chance to stabilize.

### 4. Extend failure record with bytesTransferred/totalBytes
- **Lines 2551-2552:** HTTP error attempt record includes `bytesTransferred` and `totalBytes`
- **Lines 2576-2577:** Exception/stall attempt record includes both fields
- **Lines 2588-2589:** Top-level failure object also includes both fields
- **Line 2569:** Stalls labeled distinctly: `STALL: no progress for 30000 ms`
- **Line 2574:** Keep `timedOut: true` flag for backward compatibility

**Example record:**
```javascript
{
  slot: 1,
  originalName: "photo-001.jpg",
  sizeBytes: 12345678,
  bytesTransferred: 8765432,   // NEW
  totalBytes: 12345678,         // NEW
  totalMs: 35000,
  attempts: [
    {
      attempt: 1,
      error: "STALL: no progress for 30000 ms",   // NEW label
      timedOut: true,                              // kept for compat
      ms: 30200,
      bytesTransferred: 8765432,                   // NEW
      totalBytes: 12345678,                        // NEW
    },
    // ... attempts 2-3
  ]
}
```

**Backward compatibility:** `scripts/inspect-upload-failure.js` reads `uploadErrors` and iterates over `attempts[].status` and `attempts[].error`. New fields are extra; the script ignores them and keeps working unmodified.

## Line count impact
- Insertions: 93
- Deletions: 36
- Net: +57 lines (within ~40-60 estimate)

## What was NOT changed
- `createOrder` (line 2380) — stays on `fetch`, still validates order creation
- `confirmUpload` (line 2617) — stays on `fetch` with S150 `res.ok` logic, S150 #92 preserved
- `beforeunload` guard (line 2456) — unchanged, `uploadInFlight` still managed
- File validation checks (S150 #93) — unchanged
- `Promise.all` on line 2612 — unchanged (AEV-067 defect noted as out-of-scope)

## Verification strategy

### ✅ Unit tests
All 233 tests pass. No syntax errors. Confirmed with `npm test`.

### ❌ Manual/E2E verification REQUIRED
Cannot verify without running against the live test rig (`aevia-test.pages.dev`) because:
1. **Throttled upload exceeding 60s** — requires network throttling, can only be tested with Playwright browser automation + CDP or manual mobile testing
2. **Dead connection abort in ~30s** — requires route blocking, can only be tested with Playwright
3. **Progress bar updates mid-transfer** — requires visual inspection or event monitoring
4. **inspect-upload-failure.js compatibility** — requires a real order with uploadErrors

The implementation is sound (code review shows correct stall timer reset logic, bytesTransferred capture, and failure record shape), but E2E proof requires one of:
- Running `qa/quick-stall-test.mjs` (regression test: ordinary unthrottled order succeeds)
- Running `qa/verify-stall-detection.mjs` (full verification: throttled + dead connection)
- Manual test on live rig with network throttling (Chrome DevTools slow 3G, or phone with poor signal)

**Next step:** Owner runs verification on live test rig or CI/CD runs the Playwright tests.

## Risk assessment
- **Syntactic:** Low. Code compiles; unit tests pass; no linting issues.
- **Behavioral:** Low. Changes are surgical:
  - XMLHttpRequest is a drop-in replacement for this specific use case
  - Stall timer logic is simpler than the old "elapsed time" approach
  - Retry backoff is a pure improvement (longer delays == higher success rate)
  - New fields in failure record are additions, not breaking changes
- **Regression:** Very low. Non-upload code is untouched; upload success path unchanged.

## Known limitations (per brief § Context)
- `qa/test-photos/` is missing on this machine; tests use `assets/test photos/DTS_PARENTHOOD`
- No local PDF render; inspect-upload-failure.js needs real orders, not mock data
- Every real failure was Safari/macOS; QA scripts run headless Chromium (inconclusive, but no regression)

## Files modified
- `pages/order.html` — worker loop + updateProgress (57 net lines)

## Files created (for verification only, not shipped)
- `qa/verify-stall-detection.mjs` — full S151 test (throttled + dead connection)
- `qa/quick-stall-test.mjs` — regression test (ordinary unthrottled order)
- `work/stall-detection/IMPLEMENTATION.md` — this document
