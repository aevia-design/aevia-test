# Pre-Launch QA — P2 Findings

Triage doc for the owner. Severity per `case-catalogue_v1.md`:
**S1** blocker · **S2** major · **S3** minor.

P0 and P1 completed in S124/S125/S127. This is the P2 batch, started S150.

---

## Batch 1 — P2-1..4, P2-8, P2-9, P2-11 (S150, 2026-08-04)

**7 of 12 P2 cases run. 3 findings. Zero orders created** — the S126 "reuse, don't mint"
directive held for the whole batch: four cases are pre-submit form behaviour that never
reaches the backend, and three reuse AEV-042 (approved) and AEV-060 (paid).

| Case | Script | Result |
|---|---|---|
| P2-1 too few photos | `p2-form-guards.mjs` | ✅ PASS |
| P2-2 too many / delete mid-upload | `p2-form-guards.mjs` | ✅ PASS |
| P2-3 wrong file type | `p2-form-guards.mjs` | ❌ **2 findings** |
| P2-4 low-res badge | `p2-form-guards.mjs` | ✅ PASS |
| P2-8 expired / tampered token | `p2-preview-abuse.mjs` | ✅ PASS |
| P2-9 re-approve | `p2-preview-abuse.mjs` | ✅ PASS |
| P2-11 cross-browser | `p2-crossbrowser.mjs` | ❌ **1 finding** |

### F-P2-01 · S2 · Non-image files are accepted into the photo grid

`node qa/p2-form-guards.mjs scribble` — a `.txt` and a `.pdf` selected in the main photo
picker are **accepted**, appear as tiles, and **count toward the photo target** (counter
read "48 of 44 photos selected"). No message is shown.

The customer can therefore reach the exact required count using files that are not photos,
and submit. Each one occupies a book slot that can never render. Console confirms the
browser cannot decode them: `Thumbnail generation failed: InvalidStateError: The source
image could not be decoded.`

The `accept=".jpg,.jpeg,.png,.heic"` attribute on the input only filters the OS picker —
it does not filter a drag-and-drop, which is the documented way to add photos here.

### F-P2-02 · S2 · A text file renamed `.jpg` is accepted

Same run. `isImage()` (`pages/order.html:2698`) returns true on an **extension match**:

```js
return /\.(jpe?g|png|gif|webp|avif|heic|bmp)$/i.test(file.name) || file.type.startsWith('image/');
```

So junk wearing a photo extension passes the guard and reaches the upload. Related to
F-P2-01 but needs a separate fix: filtering on MIME alone will not catch it, and filtering
on extension alone will not catch F-P2-01. The reliable check is whether the file actually
decodes — the code already discovers this when it builds the thumbnail (it logs the
failure), so the fix is to act on that result rather than only warn.

**Suggested fix for both:** treat "thumbnail generation failed" as a rejection — drop the
tile, tell the customer which file was refused, and do not count it toward the target.

### F-P2-03 · S2 · Customer preview side-scrolls at 1440px, both engines

`node qa/p2-crossbrowser.mjs AEV-060` — content is **1504px wide in a 1440px viewport**
(64px of horizontal scroll), identical in Chromium and WebKit. Widest offender is
`div.spread-pages` (1204px wide, right edge at 1504px); the left photo tray takes the
remaining ~300px.

Not a rendering bug — the book itself renders correctly with all 54 photos in both engines.
It is a layout budget problem: tray + spread area exceeds a common laptop width. Worse at
1366px. Borderline S2/S3: the customer is not stuck, but a premium preview that
side-scrolls reads as broken.

### Passes worth recording

- **P2-8** — tampered, truncated, random and empty tokens all rejected with `window.orderData`
  never populated, zero photos rendered, no order reference and no customer email in the DOM.
  Control confirms the genuine token still loads AEV-042, so the rejections are meaningful.
- **P2-9** — both AEV-042 (approved) and AEV-060 (paid) set `window._readOnly`, disable the
  approve button and relabel it "Approved ✓". Re-enabling the button in JS and forcing a
  click did **not** move either order's status. A genuine no-op, not just a hidden button.
- **P2-11 mobile** — the `.mobile-gate` renders on Pixel 7 (Chromium) and iPhone 13 (WebKit),
  names the real order, and does not side-scroll. TO-DOS #72 has **not** regressed.
- **P2-1** — blocked with `"Please upload 1 more photo (43 of 44 added)."` and, critically,
  `createUploadSession` was never called, so no stray order was created.

### Harness notes (each cost a run)

- **`#err-photos` does not exist.** The photos step renders its validation message into
  **`#err-step2`** (`order.html:663` — the step's `errId` is `step2`). Reading the wrong id
  returns empty and looks like "no message shown", which produced a false S2 on first pass.
- **Photo adds drain through an async queue.** `_uploadQueue` / `_uploadBusy` keep filling the
  grid after `setInputFiles` resolves, so counting immediately gives a different answer every
  run. Wait for the queue to idle before asserting counts. **These are `let` globals — `let`
  and `const` do NOT become properties of `window`,** so they must be read as bare identifiers
  inside `page.evaluate`, not as `window._uploadQueue`.
- **The mobile gate fills its order reference asynchronously** (that was the TO-DOS #72 fix).
  Reading the gate text as soon as it becomes visible reports a regression that is not there —
  poll for the reference instead.
- **`window.orderData` is the reliable "did this order load" signal** on customer-preview.
  Matching body text is not: the app shell renders either way, so a valid token can look like
  a failure.
- **Preview tokens can be read straight from Firestore** (`orderState().previewToken`), which
  avoids driving the staff dashboard and therefore avoids needing `qa/.env`.

---

## Not yet run — and what each needs

| Case | Blocker |
|---|---|
| P2-5 weird text in names/captions | Needs a submitted order (the storage/escaping path is server-side). Would mint 1. |
| P2-6 double-click the pay button | Needs an approved, unpaid order — **AEV-042** fits, but paying it consumes it. |
| P2-7 back button after paying | Same order as P2-6, and ends it in `paid`. |
| P2-10 refresh mid-upload | Creates an incomplete order **by design** — that is the pass criterion. Overlaps TO-DOS #88. |
| P2-12 each transactional email | **Hard blocked:** needs `qa/.env` (testmail credentials), which is gitignored and absent on this machine. |

`qa/test-photos/` is also gitignored and absent, so `p0-1-template.mjs` and
`p2-upload-probe.mjs` cannot run as written. The new P2 scripts sidestep this by using
`assets/test photos/DTS_PARENTHOOD`, which is checked in.
