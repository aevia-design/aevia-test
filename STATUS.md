# Session Status
_Last updated: 2026-06-23 (session 73)_

## Status
**Session 73 (2026-06-23) — Papercut pre-demo polish + a real bug from S72's EU migration. FOUR fixes, all working-tree only EXCEPT one live-infra change; nothing committed. (1) "Failed to fetch" loading a paid order into the staff engine — ROOT-CAUSED: S72's EU migration copied photo DATA but not the bucket's CORS config, so the new `aevia-uploads-eu` had NO CORS and every cross-origin `fetch()` of a photo (urlToFile→blob, template-engine.html:4210) was browser-blocked. FIXED by applying the old bucket's CORS policy to the EU bucket (`gsutil cors set`, free/reversible/live now — also un-breaks new uploads). (2) Papercut Spread 5 left SVGs — Xenia re-uploads; only a decorative shape moved, slot geometry unchanged → no data sync needed. (3) Papercut heart page (FP1) layering — removed the solid-heart backing (group `f`) from `FP Birthday 02 Right.svg` + set `overlayAbovePhotos:true`, so balloons/clouds sit ON TOP of the heart-clipped photo (photo already clipped independently, so the backing was invisible). SP4+Cover `false` untouched (those are the real "art behind" pages). (4) Removed the false low-res yellow border/badge in engine + customer-preview — since chunk-023 they load the ~1600px web derivative so `min(w,h)<1500` false-flagged EVERY real photo; genuine print-res warning still lives at order-form upload (on originals) + PDF renders from originals. Owner verified items 1–3 render well, then broke for lunch. NEXT: commit/push S73 → mockup → website UX → E2E → record demo. Full detail in `sessions/2026-06-23-s73.md`.**

### ▶ NEXT SESSION (Session 74) — resume pre-demo plan
0. (Optional) **Commit + push** S73's working-tree changes so the Papercut fixes reach live (`papercut-data.js`, `FP Birthday 02 Right.svg`, `SP 09 H/V Left.svg`, `template-engine.html`, `customer-preview.html`; leave `.claude/settings.local.json`).
1. Polish any other Papercut template moments.
2. Create a Papercut mockup + add it to the website (`scripts/compose-mockup.mjs` + ag-psd; memory `project_mockup_pipeline`).
3. Fix a few website UX things before the demo.
4. One full E2E test.
5. Record the demo per `docs/naitive-fellowship/walkthrough-script.md`.

### ⚠ Watch-outs (S73)
- **Nothing committed this session.** All UI/template changes are working-tree only; the CORS change is live infra (not a file). Items 2–4 reach live only on push (Cloudflare auto-deploys main).
- **CORS lesson:** a new GCS bucket needs its CORS policy copied too, or browser `fetch()`/uploads fail with the generic "Failed to fetch" — easy to misdiagnose as auth/network (the frontend never names the bucket).
- Owner still owes (carried from S72): a dashboard PDF run on **AEV-043** + a billing check (egress near-zero; one-time ~€0.2–0.9 migration-copy charge expected).

### Previous: Session 72
**Session 72 (2026-06-23) — Two threads. (1) First pass on the nAItive fellowship application: decided the "one concrete thing" = a live, end-to-end automated photo-book production system built solo by a non-engineer via AI orchestration; captured the plan + a demo-video script in `docs/naitive-fellowship/`. (2) Shipped the chunk-024 async dashboard PDF to live (`24d2ead`), then MIGRATED ALL PHOTO STORAGE TO THE EU (`8f5171d`, ADR-0006): the bucket was in US-WEST1 while everything else is EU, causing cross-region egress. Created `aevia-uploads-eu` (europe-west1), copied 9.22 GiB, repointed all code, re-bound the generateDerivative trigger (verified firing), redeployed 17 functions + the renderer. Full EU data residency + in-region PDF reads now free. Added a cost-awareness rule to CLAUDE.md. TWO live checks still owed by owner: a dashboard PDF run on AEV-043, and tomorrow's billing (expect near-zero egress; one-time ~€0.2–0.9 from the migration copy). NEXT: Papercut polish → mockup on website → website UX → E2E → record demo. Full detail in `sessions/2026-06-23-s72.md`.**

### ▶ NEXT SESSION (Session 73) — pre-demo for the fellowship
1. Polish a couple of Papercut template pages.
2. Create a Papercut mockup + add it to the website (pipeline: `scripts/compose-mockup.mjs` + ag-psd; memory `project_mockup_pipeline`).
3. Fix a few website UX things before the demo.
4. One full E2E test before recording.
5. Record the demo per `docs/naitive-fellowship/walkthrough-script.md`.

### ⚠ Owner to verify (carried from S72)
- Run a dashboard PDF on **AEV-043** to confirm the renderer reads the EU bucket end-to-end.
- Check billing the day after: "Download Worldwide Destinations" should be near-zero; today shows a one-time ~€0.2–0.9 migration-copy charge (expected).
- Old US bucket retained empty as fallback — can be emptied once billing confirms the win.

---

### Previous: Session 71
**Session 71 (2026-06-23) — chunk-024 PDF generation RE-ARCHITECTED to async after /systematic-debugging found the dashboard "Generate PDF" was failing on a 300s function timeout (the render works — ~6m43s — but the function was synchronously waiting on it). Now: function fires Cloud Run + returns fast; Cloud Run writes progress to Firestore; dashboard shows a live PROGRESS BAR. Also fixed a customer-side crop bug (cover/special photos). Backend (Cloud Run `--cpu 4` + `generatePdf`/`getPdfStatus` functions) DEPLOYED by Evgeny. NOT committed; dashboard NOT yet pushed to main. Evgeny testing overnight — E2E confirmation is the S72 first task.**

### What happened this session (S71)
1. **Customer-side crop fix** (`pages/customer-preview.html`) — drag-to-reposition crop wasn't applying customer-side for **cover + special (FP)** photos. Crop is keyed by photo basename; customer-preview passed full GCS paths for those two (pool was already fixed). Wrapped both in `_baseName()`. See LEARNINGS 2026-06-23.
2. **chunk-024 root-caused (3 layers):** (a) Cloud Run Compute SA lacked Firestore/GCS roles → granted `datastore.user` + `storage.objectCreator`; (b) `gcsUrlByName.size` log threw in server mode → gated on `photoBufferMap`; (c) **the real bug** — `generatePdf` synchronously awaited a ~7-min render and died at its 300s cap (render itself succeeded; PDF was in GCS; browser saw "Failed to fetch").
3. **Async redesign** — `generatePdf` = thin trigger (fire Cloud Run, poll Firestore for `status='rendering'`, return 202, timeout 300→60s); new `getPdfStatus` returns progress + signs the URL when done; Cloud Run writes `pdfRender{status,done,total,sizeBytes,gcsPath}` per spread; dashboard polls every 2.5s → **progress bar**. CPU bumped to 4 (cost-neutral for CPU-bound work; avoided the `--no-cpu-throttling` idle-billing trap). 116/116 tests.

### ▶ NEXT SESSION (Session 72)
1. **TEST PDF creation from the dashboard** (Evgeny testing overnight). Expect progress bar → Preview PDF link. AEV-043 already has a valid preview PDF in GCS from the earlier "failed" run to eyeball. Confirm a fresh run completes + output is correct, then **commit** the 5 changed files (`functions/index.js`, `scripts/export-pdf.js`, `services/pdf-renderer/index.js`, `pages/customer-preview.html`, `pages/staff/dashboard.html`) and **push** so the dashboard reaches live.
2. **Review GCC costs for 22.06** — egress + chunk-024 render costs; confirm 4-vCPU Cloud Run is as cheap as predicted (~$0.024/render).
3. **Generate a Papercut mockup + add visuals to the website** (special-pages check, product-page imagery). Pipeline: `scripts/compose-mockup.mjs` + ag-psd (memory `project_mockup_pipeline`).

### ⚠ Watch-outs (S71)
- **Nothing committed this session** — all 5 files are working-tree only; `.claude/settings.local.json` left out as usual. Dashboard not on live until pushed.
- **Backend already deployed** (Cloud Run + both functions) — backend-first ordering satisfied.
- **Async render relies on Cloud Run continuing after the function disconnects** (CPU stays allocated during the active request — why we did NOT use `--no-cpu-throttling`). Fine for a low-volume internal tool; if renders ever stop mid-way, revisit (min-instances / Cloud Tasks).
- **Cloud Run URL still public** (`--allow-unauthenticated`) — harden before prod (carried from S70).
- **PowerShell `--only` comma gotcha** when deploying multiple functions — quote the filter (see LEARNINGS).
- Untracked `assets/mockup example/` — pre-existing; relevant to task 3.

### Previous: Session 70
**Session 70 (2026-06-22) — chunk-024 (server-side PDF) BUILT, REVIEWED, DEPLOYED + Papercut shipped to main. All on `main` + live infra. NOT yet E2E-tested on a real order by Evgeny — that's the first task next session.**

### What shipped this session
1. **Papercut template → main + live** (`3d057d6`). Committed all s67/68/69 work (48 SVGs, 16 Source Sans 3 weights, papercut.html, registry across all surfaces, PDF). Then **Xenia re-exported the oversized `FP Toy 05 H Left.svg`** (67 MB → 1 MB — it had an embedded sample raster that blew past Cloudflare's 25 MiB/file limit); replacement committed (`2f485ea`). Cloudflare deploy unblocked.
2. **chunk-024 — server-side PDF generation, DEPLOYED.** Moves PDF render off the local CLI to a Cloud Run job triggered from the dashboard. Eliminates the GCS photo egress on the PDF leg (the last egress source after chunk-023).
   - **Cloud Run service** `aevia-pdf-renderer` (`europe-west1`, 4 GB / 2 CPU / 900s). Reads order from Firestore + photos from GCS **in-region**, calls the ported `export-pdf.js`, uploads `{folder}/pdfs/{AEV}_preview.pdf`. Health check 200. URL: `https://aevia-pdf-renderer-677807969667.europe-west1.run.app`.
   - **`generatePdf` Cloud Function** (deployed, 300s timeout) — staff-auth gated, validates order status, calls the renderer, **signs the PDF URL itself** (the function has `serviceAccountKey.json`; Cloud Run's SA can't sign).
   - **Dashboard** — "Generate PDF" button per order (new/approved/paid) → becomes "Preview PDF" link + file size.
   - **`export-pdf.js`** — made importable (CLI guarded by `require.main===module`), `photoBufferMap` injection, `generatePdfFromFirestore()` export. **CLI (`npm run pdf -- AEV-XXX`) unchanged.**
   - Data source = Firestore (`staffBook*` fields, written by engine **Save**), NOT `book-state.json`/Export — closes the TO-DO #64 footgun. Data-shape audit passed (assignments/sequence/captions/heartCrop/styles all match; specialPhotos derived from manifest).
   - 116/116 tests. Commits `b294cdb` (build) + `667d3ae` (review fixes) + `001544f` (timeout bump), merged to main + pushed.

### ▶ NEXT SESSION (Session 71 — E2E test chunk-024, then harden)
1. **TEST the dashboard "Generate PDF"** on a real order that has been **Saved in the engine** (e.g. AEV-042). Click → expect a "Preview PDF" link. Compare output to `npm run pdf -- AEV-XXX` (acceptance criterion #2). First click is slow (Cloud Run cold start + photo fetch + render).
2. **Confirm the egress win** — check billing the day after a PDF run: Cloud Storage egress should be near-zero where a local CLI run would've shown GB-scale.
3. **Harden the renderer** — it's currently `--allow-unauthenticated` (public URL) for testing. Lock to private + identity token before it's a permanent prod path. See brief `docs/briefs/chunk-024-server-side-pdf.md`.
4. **Wire print-mode PDF** to the dashboard (only preview is wired today) — easy follow-up.

### ⚠ Watch-outs (chunk-024)
- **Renderer reads `staffBook*` Firestore fields** — an order must have been **Saved in the engine** (or approved, which copies customer→staff) or the PDF renders empty. Brand-new never-opened orders won't work.
- **Cloud Run URL is PUBLIC** (`--allow-unauthenticated`). The dashboard path is still protected (dashboard login → `generatePdf` checks `isStaff`), but the raw `…run.app` URL is directly reachable. Harden before prod (item 3 above).
- **Function signs, renderer doesn't** — Cloud Run's default SA has no private key for v4 signing, so `generatePdf` mints the signed URL via `serviceAccountKey.json`. Don't move signing back into the renderer without granting `iam.serviceAccountTokenCreator`.
- **Dockerfile lives at REPO ROOT** (not `services/pdf-renderer/`) because `gcloud run deploy --source` only auto-detects a root Dockerfile. Deps install at `/app` so `scripts/export-pdf.js` resolves sharp/pdf-lib. `.dockerignore` keeps the build context lean.
- **Redeploy the service** after any change to `export-pdf.js`, `services/pdf-renderer/`, or template assets: `gcloud run deploy aevia-pdf-renderer --source <repo> --region europe-west1 --memory 4Gi --cpu 2 --timeout 900 --allow-unauthenticated --project aevia-uploads` (with the `CLOUDSDK_PYTHON` fix — see memory `reference_gcloud_python`).
- **Function timeout 300s** — it waits synchronously on the render. If a huge book exceeds it, the function errors but the PDF likely still completed in Cloud Run (900s) → check the existing `getPdfUrl`/PDF link.

### ⚠ Watch-outs (Papercut, carried)
- **Cover clip shape path** from `<clipPath id="ac">` in `Cover/Artboard 1.svg` — re-extract if Xenia re-exports.
- **Spine width is 9mm** for all templates (18mm in the cover CSV is the bleed size).
- **FP1 overlayAbovePhotos:false** — balloons/clouds behind the heart photo is intentional.
- **heartClipPath is pre-scaled to 600px canvas** (×1.0584 vs SVG viewBox 566.929). Re-extract `<clipPath id="g">` from FP Birthday 02 Right.svg and rescale if re-exported.
- **Oversized-SVG trap** — Papercut's FP Toy 05 shipped at 67 MB (embedded sample raster) and silently failed Cloudflare. Any re-exported template SVG >25 MiB freezes the whole deploy. Check file sizes before pushing new template art (see memory `project_cloudflare_file_limit`).
- **FP special slot crop drag** — alwaysOn:true; any new `pool:'special'/'artwork'/'labour'` slot gets drag automatically.

### ⚠ S66 watch-outs
- **chunk-023 is now LIVE on main/Cloudflare.** Old orders only get small previews if back-filled — 039/040/041 done; all other legacy orders still fall back to full-res originals on load (by design, safe). Back-fill recipe in LEARNINGS 2026-06-22.
- **PDF still serves full-res originals by design** — chunk-024 (not yet built) is what removes the PDF egress leg. A PDF export will still show GB-scale egress until then.
- **`.claude/settings.local.json`** left out of commits as usual. **`assets/mockup example/`** untracked — pre-existing, not this session's work, left alone.

### Previous: Session 65
**Session 65 (2026-06-21) — chunk-023 DEPLOYED (Firebase) + VERIFIED on a real order; 3 small UX fixes committed on branch `egress-web-res-previews` (NOT merged to main, NOT on Cloudflare). Egress verified working on AEV-042.**

Evgeny deployed `generateDerivative` (Firebase) at the start of the session. I verified the web-res pipeline end-to-end on a real Wander order **AEV-042** (52 photos): the bucket has all 52 derivatives (`AEV-042/photos/previews/`, **11.74 MiB** total vs **1.02 GiB** originals — ~87× smaller), and both engines served them on load.

**Committed this session (`9e52d16`, branch `egress-web-res-previews`):**
1. **Cover photo reposition** — drag-to-reposition inside the cover frame (staff engine, always-on like the heart slot), saved crop applied read-only in customer-preview, baked into PDF via `coverExtract`. Crop keyed by `photo.name`, consistent across all 3 surfaces. Wander cover (no photo) correctly skipped via the `slotDef` guard. 116/116 tests.
2. **Wander itinerary left-align** — FP1 text panel `halign` center→left, synced in BOTH `Wander_sizing_full.csv` (source of truth) and `wander-data.js`. (Evgeny edited the CSV; I synced the JS — see new CSV-source-of-truth rule, LEARNINGS 2026-06-21 + memory `feedback_csv_source_of_truth`.)
3. **customer-preview submit-bar fix** — Save/Approve bar disappearing after Preview→Edit. Root cause: bar visibility relied on a one-time inline `display=''` that the resize handler could stomp and never restore. Fix: edit handler re-asserts the inline display; resize desktop-branch now restores submit-bar + preview-controls (was asymmetric).

**Cost verification (the session's main goal):**
- Evgeny's debugging activity on AEV-042 = ~4 customer loads + 1 staff load, **no PDF**. Each load pulled ~11.74 MiB derivatives, NOT the 1.02 GiB originals.
- **Estimated egress today ≈ 5 × 11.74 MiB ≈ 59 MiB ≈ €0.006** (vs ~€0.56 without the fix — same repeated-reload-on-big-order pattern that caused the €5.59 spike).

### ▶ NEXT SESSION (Session 66)
1. **CHECK BILLING (June 22)** — GCS egress lags ~1 day. Expect today's Cloud Storage egress to be **negligible (tens of MB, ~€0.00–0.01)**, NOT GB-scale. That near-zero IS the confirmation the web-res fix works on a live order. GB-scale would mean originals were served → investigate.
2. **Merge `egress-web-res-previews` → main** once Evgeny is confident (billing confirms + UX fixes eyeballed). Cloudflare auto-deploys main. The function is ALREADY deployed (Firebase), so backend-first ordering is satisfied.
3. **Eyeball the 3 UX fixes** on a maximized window: cover reposition (needs an order WITH a cover photo — AEV-042 is Wander/no cover), itinerary left-align (load a Wander order), submit-bar Preview→Edit persistence.
4. **chunk-024 (server-side in-region PDF)** — still the next cost piece (removes the PDF full-res egress leg; needed for prod ops). Brief not yet written.

### ⚠ S65 watch-outs
- **Branch only — NOT merged, NOT on Cloudflare.** The `generateDerivative` FUNCTION is deployed to Firebase; the 3 UX commits are local to the branch. `.claude/settings.local.json` left OUT (as usual).
- **"Missing Save/Approve buttons" was a RED HERRING / environmental** — Evgeny's Chrome window was 880px tall on an 816px usable screen (overshoot +64px, 112% display scaling), so the bottom-fixed bar sat behind the taskbar. Win+↑ (proper maximize) fixed it. NOT a code bug. The real bug (Preview→Edit disappearance) IS fixed.
- **CSV source-of-truth:** don't edit `*-data.js` values that originate from a CSV — see LEARNINGS 2026-06-21 + memory `feedback_csv_source_of_truth`.
- **PDF cover crop is new + untested in print** — `coverExtract` now honours the cover crop; no PDF was run this session, so verify a cover-reposition carries to the PDF when next exporting a template that has a cover photo (Scribble/Newborn).
- **Untracked `assets/mockup example/`** — pre-existing, not this session's work; left alone.

### Previous: Session 64
**Session 64 (2026-06-21) — GCS EGRESS COST decided + chunk-023 (web-res previews) BUILT + COMMITTED on branch `egress-web-res-previews` (NOT on main, NOT deployed). No production change yet.** Diagnosed the post-trial bill: 99.7% was GCS **egress** (full-res originals re-downloaded on every engine view + every local PDF run), not storage. Verified the real rate from Evgeny's own billing report: **€0.103/GB** (post-trial: €5.62 / 54.53 GiB). Decision in **ADR-0005**: commit to web-res previews (#1) + in-region server-side PDF (#6, chunk-024); defer CDN (#3); park R2 (#7). Built chunk-023 via developer-agent + reviewed (critic-agent passed the decision; I hand-reviewed the code + fixed a deploy bug). 116/116 tests.

**What was done this session:**
1. **Decision package committed** (`82f4b9d`): `docs/decisions/0005-…`, `docs/briefs/web-res-previews.md` (revised per critic: explicit PoC gate, firm naming rule, export-pdf.js guard), ROADMAP Phase 5 (chunk-023 + chunk-024 + Decisions Log), ARCHITECTURE **Invariant 8** (engines load derivative, PDF loads original) + egress cost note + Open Questions #5/#7 resolved.
2. **chunk-023 code committed** (`95ed8e4`): custom GCS `onFinalize` function `generateDerivative` (~1600px JPEG derivative per photo at `<folder>/<cat>/previews/<name>`); `getOrder` returns `derivativeUrls` alongside originals; BOTH engines load the derivative with per-photo fallback to original (legacy orders unchanged); `export-pdf.js` untouched. New `functions/derivative-utils.js` (pure path logic, 14 tests).
3. **Fixed a real deploy bug** the agent introduced: firebase-functions v4 needs `.storage.object().onFinalize(...)`, not `.storage.onFinalize(...)`. `node -e "require('./index.js')"` now loads clean.

### Cost picture (verified @ €0.103/GB) — egress happens on 4 events/order: staff load, customer load, staff export load, PDF
- **80-page / 4 GB order:** today €1.65 → after chunk-023 **€0.42** (PDF leg remains) → after 023+024 **€0.008**.
- **Your testing pattern** (10 reloads of a 4 GB order): €4.12 → **€0.03** after 023. This repeated-reload-on-big-orders is what caused the €5.59 spike.
- chunk-023 fixes the 3 screen loads (~25×). Step 5 (PDF, full-res originals) only drops with **chunk-024** (in-region render).

### ▶ NEXT SESSION (Session 65)
1. **Deploy chunk-023:** `firebase deploy --only functions:generateDerivative` (backend-first, per the S40 deploy-ordering rule). The fix only makes derivatives for NEW uploads — existing orders fall back to originals (by design).
2. **Verify on a real order** (deploy is the gate before merging to main → Cloudflare). You CAN'T make a 5–10 photo order (flow blocks incomplete books); smallest valid is a 40-page order. Test is a ONE-TIME load (~€0.03), not the repeated pattern that ran up the bill. **Two test routes:** (a) place a minimum 40-page order → load it → DevTools Network: photo URLs contain `/previews/` and are ~100–300 KB not multi-MB; or (b) zero-new-order — after deploy, re-trigger derivatives on an existing order with a **server-side** GCS copy (`gsutil cp gs://…/AEV-031/photos/ gs://…/AEV-031/photos/` — in-cloud, no egress), then load AEV-031. Claude can run the bucket check `gsutil ls -l …/AEV-XXX/photos/previews/` to confirm derivatives exist.
3. **Regression checks:** PDF still full-res/sharp (loads originals, no `/previews/`); a legacy order (AEV-031) still renders with clean console (fallback).
4. **Merge `egress-web-res-previews` → main** only after Evgeny confirms on a real order (Cloudflare auto-deploys main).
5. **chunk-024 (server-side in-region PDF)** is the next cost piece — removes the PDF egress leg (step 5) + needed for prod ops (staff can't run a Node CLI per order). Brief not yet written.

### ⚠ S64 watch-outs
- **NOT deployed, branch only.** `firebase deploy` is required for the function to exist; until then the order pipeline is unchanged. `getOrder` already returns `derivativeUrls` once merged, but every value is null until the function runs on new uploads → engines fall back to originals (safe).
- **Design note (not a bug):** `getOrder` does a GCS `.exists()` check **per photo** (≈100 HEAD calls on a big order, every load). Works, parallelised; possible follow-up = always sign the derivative URL + let `<img>` onerror fall back, dropping the existence checks.
- **HEIC:** originals are normally JPEG (browser converts HEIC→JPEG before upload). If a `.heic` original sneaks through, `sharp` in the function may fail to decode it → caught → no derivative → fallback to original. Acceptable.
- **firebase-functions v4.9.0 + Node 20 are deprecation-warned** (Node 20 decommissioned 2026-10-30). Do NOT upgrade as part of this — it's breaking across ALL functions; separate maintenance session before October.
- **Worktree isolation didn't hold** — the developer-agent wrote into the MAIN working tree (on the egress branch), not its throwaway worktree. No harm; result is committed. Watch for this if spawning isolated agents again.
- **chunk-024 will make the PDF egress-free but the web-res fix does NOT touch the PDF** — print genuinely needs originals.

### Previous: Session 51
**Session 51 (2026-06-17) — STEP-BASED ORDER FORM UX SHIPPED to `main` (`723fac4`, pushed → Cloudflare auto-deploys). The order form's long single-scroll upload stage is now discrete guided steps — Details → Cover → Special pages → Photos — across all templates, data-driven (Special auto-skips with no add-ons), linear-forward/free-backward nav. Independent /reviewer-agent + /design-review both passed. 102/102 tests. Read `sessions/2026-06-17-s51.md`.**

**What shipped this session (branch `step-form-ux`, 3 commits, merged `--no-ff`):**
1. **`000a2e8` — the refactor** (`pages/order.html`). Step engine (`buildSteps`/`goToStep`/`advance`/`renderStepper`/`showStepError`); `#step2` → three `<section class="form-step">` panels; data-driven `#stepper`; `goToStep2()` → `validateDetailsStep()` + `prepareUploadSteps()`; validation re-homed into `validateCoverStep/validateSpecialStep/validatePhotosStep` (submit re-runs them as a final guard that navigates to the failing step). S40 upload-hardening untouched.
2. **`8a47815` — Wander/Newborn follow-ups.** Wander: country-select autofill guard (`onCountryPick` requires a user gesture — Chrome was autofilling "Austria"), spread sizing fix (`refreshCountryMaps()` on step-show + width fallback), "Your route" moved above the spread, **click-to-enlarge** spread preview (`openSpreadZoom` → `#spread-lightbox`). Newborn product page: special spreads default **unticked**.
3. **`0a2a5c9` — logo** aligned to `aevia_logo_transparent.png` (was the lone outlier).

### ▶ NEXT SESSION (Session 52)
1. **Verify the step-form order flow on LIVE** once Cloudflare deploys — it's customer-facing AND feeds the staff engine. Walk Scribble/Wander/Newborn; **real-device phone test** (Evgeny: not yet done — design-review only covered the 375px viewport).
2. **Newborn end-to-end** still not eyeballed by Evgeny through the new stepped flow (renders headlessly; do a real Intro+Labour order).
3. **Carried from S50/S48/S49:** verify #74 crop on live; live Newborn first real E2E; S47 pt→px caption resize on live Scribble/Wander; S49 no-prompt order-load.
4. **Stripe price split** — confirm `STRIPE_PRICE_ID_40/_80` are real `price_…` IDs + `firebase deploy --only functions:createCheckoutSession`. (Evgeny: "maybe later.")
5. **Next build candidates** (ideas.md / TO-DOS): engine-driven mockup imagery (needs brief, go-3D); customer "my-orders" dashboard (needs brief + ADR); #73 data-driven cover clipShape (blocked on Xenia's assets). The order-phase "preview my data" panel now has a ready seam in the stepped form (Cover/Special `<section class="form-step">`).

### ⚠ S51 watch-outs
- **Step engine invariant:** `advance()` is the ONLY extender of `furthestReached`; `goToStep` refuses any `idx > furthestReached`. Preserve or "can't skip past an invalid step" breaks.
- **Country select gesture guard:** any new programmatic select-set must set `dataset.touched='1'` first or the change is ignored (intentional anti-autofill).
- **Region-map previews need a visible panel to size right** — redrawn via `refreshCountryMaps()` when the Special step shows; hidden render falls back to 480px.
- **Untracked `qa/review-step-form.mjs`** left by the design-review agent — review/delete if unwanted.

### Previous: Session 50
**Session 50 (2026-06-17) — TO-DO #74 SHIPPED: drag-to-reposition crop for ALL photo slots. Committed + PUSHED (`f005ea9` + `35f3c13`). Hand-verified all 3 surfaces. Read `sessions/2026-06-17-s50.md`.** ⚠ Watch-outs still live: `photo.name` must stay basename-consistent across staff↔customer↔PDF; PDF `coverExtract()` default 50/50 reproduces `fit:cover`/centre exactly; reposition handle disables `slotEl.draggable` while active (exit handlers must restore it).

### Previous: Session 49
**Session 49 (2026-06-17) — MINOR UX/SAFETY FIXES.** Three small changes committed + PUSHED to `main`, each clarified with Evgeny first. 102/102 tests. Read `sessions/2026-06-17-s49.md`. (1) Caption formatting guard `027931d` — `beforeinput` blocks `format*` on engine + customer-preview (PDF can't keep inline bold); regression check `qa/verify-format-block.mjs`. (2) Slim customer-preview footer `09ffec8`. (3) Always restore saved book on order load `ca44ab2` (removed destructive `confirm()`; staff-only, not browser-verified).

### Previous: Session 48
**Session 48 (2026-06-17) — NEWBORN SHIPPED TO `main`. Fixed the last E2E bug (PDF dropped blank lines → paragraph spacing collapsed) + two Intro order-copy tweaks, then merged `newborn-template` → `main` (`fc972d0`) and pushed. Cloudflare auto-deploys. 102/102 tests. The Newborn template (#4) is now LIVE end-to-end: order form → staff engine → customer preview → PDF.**

**What shipped this session (committed `5319cc3`, merged to main `fc972d0`):**
1. **PDF blank-line drop (root-caused via /systematic-debugging)** — both PDF text-render paths (`scripts/export-pdf.js`: text-panel wrap ~788, per-photo caption split ~709) deleted empty lines, collapsing paragraph spacing vs the engine (which renders `\n\n` as `<br><br>`). Fixed generically across ALL templates: empty line preserved as `['']` (reserves one line-height, drawn as nothing). Evgeny visually confirmed on AEV-037. See LEARNINGS 2026-06-17.
2. **Newborn Intro order copy** — DOB placeholder `'May 15th'`→`'15 May, 2026'`; gender placeholder `'Boy / Girl'`→`'boy / girl'`; gender lowercased in `composeIntroBlock` so the caption always reads "Our sweet little boy/girl". (`newborn-data.js`, `pages/order.html`.)
3. **Folded in S47 caption/PDF parity fixes** (pt→px formula, dropped weight/italic, PANEL_PT_SCALE removed, Labour photos in PDF, data-driven per-side pool export, spine centering) + dangling S46 photo-count guard.

### ▶ NEXT SESSION (Session 49)
1. **Watch live Newborn after Cloudflare deploys** — first real end-to-end Newborn order (order form → engine → customer → PDF) on the live site. The pt→px caption fix also resized **Scribble (FP1/FP2)** and **Wander (itinerary)** text panels live — eyeball those on the deployed site (they were checked locally, not yet on live).
2. **Stripe price split (carried, TO-DO #60-adjacent)** — confirm `STRIPE_PRICE_ID_40/_80` are real `price_…` IDs + `firebase deploy --only functions:createCheckoutSession`. A real Newborn submit mints a live `AEV-xxx` to clean up.
3. Pick next priority from TO-DOS / ROADMAP.

### ⚠ S48 watch-outs
- **Newborn is now on `main` and deploying live.** The pt→px caption fix changed Scribble/Wander text-panel sizes on the live site too — verified locally, confirm on live.
- **Blank lines are the only vertical-spacing lever in text panels** (leading spaces collapse in HTML on both surfaces). Any future line-based PDF text code must NOT `.filter(l => l.trim())` or it re-eats paragraph gaps — see LEARNINGS 2026-06-17.

### Previous: Session 47
**Session 47 (2026-06-16) — NEWBORN E2E bug-fixing: caption parity (engine↔engine) + PDF parity (3 bugs). Branch `newborn-template` (NOT main). NOTHING COMMITTED — all fixes are working-tree only, pending Evgeny's visual confirm of the regenerated AEV-037 PDF (he stopped to inspect; resumes next session). 102/102 tests. Read `sessions/2026-06-16-s47.md` first.**

**Fixed this session (all UNCOMMITTED):**
1. **Intro caption staff↔customer mismatch** — two stacked bugs: (a) text-panel render dropped `weight`+`italic` from the style override (staff italic, customer roman); (b) render used raw `sizePt+'pt'` (~26% too big) while the toolbar used the canvas-scaled `sizePt*SCALE*25.4/72` px. Both render blocks fixed to scaled formula + full field read-back. Verified by live DOM measurement (16.9px italic = staff).
2. **PDF Intro panel ~26% too big** — removed the `PANEL_PT_SCALE≈1.26` fudge (it compensated for the now-fixed engine pt-bug). Engine=customer=PDF.
3. **PDF Labour photos missing** — (a) PDF now handles `pool:'labour'` like `'artwork'`; (b) engine Export was collapsing all non-FP5 special keys to a single filename → made it data-driven (any artwork/labour pool → `[left,right]` array). Recurring "new per-side pool breaks export" bug, now generic.
4. **PDF spine caption off-center** — changed `+ascenderPt/2` → `+(ascent−descent)/2` to center the glyph line-box like the engine. ⚠ unconfirmed (Twinkle Star metrics) — Evgeny to eyeball.

### ▶ NEXT SESSION (Session 48) — Evgeny inspects PDF, then commit + finish E2E
**Read `sessions/2026-06-16-s47.md` first. Confirm branch `newborn-template`.**
1. **Pick up Evgeny's PDF inspection** (Intro size, spine centering, Labour photos). Spine (bug 4) is the watch item.
2. **Labour photos need a re-Export** — the PDF Evgeny is viewing used the OLD book-state (string `FPlabour`), so both Labour pages show the SAME photo. For 2 distinct: re-click **"Export book state (JSON)"** in the staff engine, then `cd scripts && npm run pdf -- AEV-037`.
3. **Commit everything** once approved: `customer-preview.html`, `template-engine.html`, `scripts/export-pdf.js`, `LEARNINGS.md`, S46 dangling (`pages/order.html` guard + `tests/photo-count-guard.test.js`, `ideas.md`, `TO-DOS.md`), Evgeny's CSV (`Newborn_sizing_full.csv`), new `qa/measure-intro-panel.mjs`. `.claude/settings.local.json` left OUT.
4. **Merge to `main` only after Evgeny approves.** The pt→px + PANEL_PT_SCALE fixes also resize **Scribble (FP1/FP2) + Wander (itinerary)** text panels (now correct/smaller, matching PDF) — eyeball those before merge; they're live.
5. Carried: Stripe price split (`STRIPE_PRICE_ID_40/_80` real `price_…` + deploy `createCheckoutSession`); real submit → live `AEV-xxx` to clean (TO-DO #60).

### ⚠ S47 watch-outs
- **Branch only, NOT pushed/merged. NOTHING committed this session** — all fixes working-tree only.
- **The pt→px caption fix touches ALL templates' text panels** (Newborn/Scribble/Wander) — correct direction but visible change on live Scribble/Wander.
- **Spine centering fix is metric-based + unconfirmed** — verify on the regenerated PDF.
- **Caption render rules now codified in `LEARNINGS.md` (2026-06-16)** — read before any caption work. The recurring caption hiccups (pt-vs-px, dropped style fields, per-side pool export) are documented there.
- **Low-res yellow engine border = intended warning** — not a bug (AI sample photos sub-print-res).

### Previous: Session 45
**Session 45 (2026-06-16) — NEWBORN template (#4) Stage 4 (order form) DONE + committed (`5dd84e9`) on branch `newborn-template` (NOT on `main`). Order form drives cover captions + Intro fields + Labour caption/photos/zodiac. Independent reviewer pass (Revise→fixed). Evgeny eyeballed BOTH the order form AND the resulting engine render: "renders well." Next: Stage 5 (customer-preview fonts + PDF).**

**Context:** "Little Annette" is actually the **Newborn** template. Xenia delivered `assets/Template_Newborn/` (CSVs + SVGs). Square 200×200mm book. It will land on the **Bloom** product page — Bloom is being **renamed to Newborn EVERYWHERE incl. the URL** (`bloom.html→newborn.html`) + Stripe wiring (Stage 6). All work is isolated on the branch; do NOT merge to `main` until Evgeny approves locally (Cloudflare auto-deploys `main`).

**Planning artefacts:** brief `docs/briefs/newborn-template.md`; session logs `sessions/2026-06-15-s43.md` (Stages 1–2), `sessions/2026-06-16-s44.md` (Stage 3), `sessions/2026-06-16-s45.md` (Stage 4 — READ THIS FIRST next session).

**What's DONE + committed on `newborn-template`:**
1. **Stage 1 — `newborn-data.js`** (`468cfb6`). Data model: SP0–SP6, cover (custom clip path), FPintro (text), FPlabour (2 photos + zodiac).
2. **Stage 2 — fonts** (`34dff26`). Twinkle Star + Baskervville registered (engine + customer-preview + PDF font map).
3. **Stage 3 — registry + engine render** (`3af559b`). Registry in all 3 surfaces. Cover clip, zodiac overlay, Labour pool, Intro-replaces-SP0. 8 fixes. Scribble + Wander unchanged.
4. **Stage 4 — order form** (`5dd84e9`, `pages/order.html` + `template-engine.html` + data/CSV). Cover captions (data-driven, already worked); **Intro** 5 labelled fields → composed block (`composeIntroBlock`), Intro opens book in place of SP0; **Labour** left caption + 2 photo uploads (slug `fplabour`) + zodiac select (12+None). **Root fix:** mixed-case functional keys — new `fpKeyForSlug` (order) + `resolveFpKey` (engine) replace `slug.toUpperCase()`; fpSelections now exact-cased ids; `calcPhotoTarget` mirrors `replacesFirstSpread`. **Zodiac rides `fpTexts.zodiac` → NO backend deploy needed.** Reviewer-flagged single-caption fill now targets the non-`aiGenerated` side (protects Labour's AI right page; FP3/FP4 still left). 97/97 tests; order form + engine render verified headless (0 errors); Scribble+Wander unchanged.

### ▶ NEXT SESSION (Session 46) — Stage 5: customer-preview parity + PDF
**Read `sessions/2026-06-16-s45.md` first.** Confirm branch `newborn-template`.
1. **Stage 5 — customer-preview parity + PDF.** Add Baskervville/Twinkle Star (+scope) to customer `CAPTION_FONTS` (currently old 3-font Scribble list). PDF render of the custom clip + zodiac overlay in `export-pdf.js` (only registry/data-load wired). **fontkit GSUB ligature check** on Baskervville + Twinkle Star (both expose `liga`; Twinkle Star is connected script — HIGH risk). PDF cover-subtitle needs style token `mediumitalic` → `Baskervville_mediumitalic`.
2. **Stage 6 — Bloom→Newborn rename** (URL `bloom.html→newborn.html`, links, `template` param, Stripe price wiring).
3. **Stage 7 — E2E** (order→engine→customer→PDF, real order) + merge to `main` after Evgeny approves.

### ⚠ S45 watch-outs
- **Branch only; NOT pushed/merged.** Cloudflare deploys `main`. `.claude/settings.local.json` again left OUT of the commit (pre-existing local change).
- **Full order→engine round-trip with a REAL order NOT yet run.** Stage 4 verified: (a) order-form rendering/validation/payload headless; (b) Evgeny eyeballed the engine render via the local tester. But the engine's `resolveFpKey` applying `fpTexts.fplabour`/`fpintro` from a *real submitted order* is unit-correct yet unseen on a live payload — that's Stage 7 E2E (needs Stage 6 product page to mint an order).
- **Intro block format is a CHOICE** (`composeIntroBlock`: name / "Born {dob} at {time}" / "{weight} · {length}", empties dropped). Staff-editable starting point, like the Wander itinerary. Revisit if Evgeny/Xenia want a different editorial layout.
- **Customer-preview `CAPTION_FONTS`** still the old 3-font list — Stage-5 item (carried from S44).
- **No backend `zodiacSign` field** — zodiac travels via `fpTexts.zodiac` (engine reads `order.zodiacSign || order.fpTexts.zodiac`). If a proper column is ever added it needs a Firebase deploy (affects all templates live).
- Carried: Cover SVG is edited (`#d8eaf0`→`none`) — re-apply if Xenia re-exports the cover. Wander cover caption colour shifts `#493955`→`#3E2A55` on next deploy (intended).

### Previous: Session 42
**Session 42 (2026-06-15) — COVER PHOTO ORIENTATION + pre-submit confirmation shipped to `main` (`3102591`). Roadmap reviewed (core complete; remaining items blocked or P1). One ideation captured. Groundwork laid for data-driven cover clip shapes (#73).**

**What shipped (live on `main`; `pages/order.html` + `scribble-data.js`):** (1) cover orientation hint from CSV `Orientation`; (2) non-blocking amber orientation warning on wrong-orientation cover photo; (3) pre-submit "Before we start" modal listing soft issues (wrong-orientation cover + low-res count, excl. FP5 art) with Go back / Submit anyway. 97/97 tests; browser-verified. **#73 groundwork:** `Photo shape` column added across the 4 template CSVs — now being realised in the Newborn build (S43). **ideas.md:** multi-tab template workbook idea (parked).

### Previous: Session 41
**Session 41 (2026-06-15) — MOBILE RESPONSIVENESS (#47) shipped + verified on a real iPhone; 4 follow-on bugs found via E2E and all fixed. Strategic question settled: web flow is sufficient, no app needed.**

**What shipped (live on `main` + Cloudflare; PDF fix is CLI-only):**
1. **#47 Axis A — mobile layout.** Root cause: `order.html` never linked the shared `assets/css/mobile.css`, and product-page stacking rules only matched the `#la` wrapper (7 of 10 product pages lack it). Fix = one `<link>` + broadened selectors (`assets/css/mobile.css`, `pages/order.html`). All 10 product pages + home + order steps 1–2 now reflow to device width (iPhone 13 + Pixel 7), hamburger functional. Independently code-reviewed (accept). New audit tools `qa/mobile-audit.mjs` (live) + `qa/full-audit.mjs` (local, all pages). Commit `9992b66`.
2. **#47 Axis B — EXIF / web-vs-app DECISION.** Evgeny ran a real iPhone Safari order: upload easy, **EXIF dates survived, engine auto-sorted correctly.** → **Aevia stays web-only; the Capacitor app (TO-DO #40) stays parked.** Do not re-litigate unless a new need emerges.
3. **Bug #4 (critical) — PDF rotated iPhone photos.** EXIF-orientation: iPhone photos store orientation 6 (rotate 90° CW) as a flag; browser preview applies it but `sharp` didn't → sideways prints. Fixed with `.rotate()` baked into `loadPhoto()` in `scripts/export-pdf.js` (single chokepoint). Proven on AEV-032 (dims flip 5712×4284→4284×5712); regenerated PDF confirmed by Evgeny. Commit `6bc871b`.
4. **Bug #3 (critical) — customer slot-drag broke.** Slot `<img>` lacked `draggable=false` → native image drag hijacked the slot dragstart. Fixed by mirroring the staff engine's pattern (`pages/customer-preview.html`). Commit `6bc871b`. ⚠ **Needs browser confirm on a fresh (non-approved) order.**
5. **Bug #1 — price inconsistency.** home/collections showed stale €60/€120; wired both to `prices.js` (`BOOK_PRICES`) so they can't drift. Commit `c38a5aa`.
6. **Bug #2 — mobile-gate placeholder.** Gate returned before the order fetch → showed literal "Order preview". Now fetches the order number from the token and shows the real reference. Commit `c38a5aa`.
7. **Housekeeping:** `LINKS.md` (quick links, local + live), permission allowlist broadened in `.claude/settings.local.json` (dev/qa/read-only-git commands no longer prompt; push/deploy still gated).

### ⚠ OPEN WATCH-OUT (new, S41)
- **`assets/css/mobile.css` is shared across home + 10 product pages + order.html (customer-facing only).** The staff engine / customer-preview / dashboard are deliberately desktop-only (PRD lines 33/91/163) and must NOT link it. New customer-facing pages should link it; new product-page layouts that don't use the `.zone`/`.panel`/`.product-title` pattern will need their own rules.
- **`export-pdf.js loadPhoto()` now auto-orients via `.rotate()`** — every photo passes through it upright. If you add a new photo-read path, route it through `loadPhoto` (don't read GCS/disk directly) or you'll reintroduce the EXIF-rotation bug.
- **Pricing single source of truth = `assets/js/prices.js` (`BOOK_PRICES`).** Product pages, home, and collections all read it. Changing a price = edit `prices.js` + the product-page chip `onclick` values + the Stripe SKU (`STRIPE_PRICE_ID`). home/collections auto-follow.

### Previous: Session 40
**Session 40 (2026-06-12 → verified 2026-06-13) — ORDER-FLOW HARDENING shipped to prod + verified live. TO-DO #68 resolved (and expanded). 6 chunks + dashboard, deployed backend-first, confirmed on a real Wander order.**

**What shipped (live on `main` + Firebase):** the order-intake flow no longer "lies" (announced success before it was real). Diagnosis in `docs/briefs/order-flow-failure-map.md`; plan in `docs/briefs/order-flow-hardening.md`.
1. **Ch1** — `order.html` validates + **lowercases** the customer email; success screen states the address + "if that's not right, reply within 24h". (Note: `goToStep2()` already format-checked email; Ch1's real new value is normalisation + the success catch.)
2. **Ch2** — upload worker now checks each PUT `res.ok`, retries ≤3×, and only counts confirmed uploads → the success screen can't show on a failed upload. + large-order "keep this tab open" reassurance (folded into the rotating line so it recurs).
3. **Ch3** — `beforeunload` guard while uploads are in flight (armed before the worker pool; disarmed on success AND catch).
4. **Ch4 (backend)** — `createUploadSession` writes Firestore FIRST (status `uploading`, `uploadComplete:false`) and sends only the STAFF email; new **`confirmUpload`** Cloud Function sends the CUSTOMER email + flips status→`new` (idempotent, 403 on bad token). Returns `token` for the frontend.
5. **Ch4b** — dashboard recognises `uploading` (amber badge + "Uploading" filter to surface stuck/abandoned uploads).
6. **Ch5** — `order.html` calls `confirmUpload` after all photos land — happy path only; a failed/aborted upload never sends the customer email.
7. **Ch6** — HEIC-conversion failure shows "preview unavailable, still included" (cover + special + main grid); low-res threshold 1500→**1575px** (verified 200 DPI on a 200mm page) with placement-honest copy. FP5 art exemption intact; warning, never a block.

**Verified LIVE (2026-06-13, real Wander order):** customer email arrives only AFTER upload completes (not at submit); aborting mid-upload (tab close/reload → "Leave site?") leaves the order stuck at `Uploading` with NO confirmation email. Both work as designed. Tier-1 mocked browser test `qa/order-hardening-mock.mjs` is green (12/12).

### ▶ NEXT SESSION (Session 41)
1. **Clean up live test orders** (TO-DO #60) — the real Wander order(s) from this session's live verification, incl. the deliberately-aborted one stuck at `Uploading`. Delete from Firestore.
2. **Pick the next priority** (was the post-#68 plan): **#64** (Save vs Export footgun, ~30 min) OR a pre-launch blocker — **#47** (mobile responsiveness, home + order form — High) / **#56** (post-payment customer email) / **#58** (configurator photo-count promise vs real requirement).
3. **Customer my-orders dashboard** (`ideas.md`) — committed direction, build *after* this; its data foundation (`uploading→new` status, email-as-owner) now exists. Needs its own brief + an ADR extending 0003 when started.
4. Parked: TO-DO #67 rich-text caption editor = whole dedicated session.

### ⚠ OPEN WATCH-OUT (new, S40)
- **Ch4 backend unit tests are house-style** (`tests/chunk-4-order-flow.test.js` mirrors the logic inline; it does NOT invoke the real handlers — same pattern as `getOrder.test.js`). "97 pass" proves the spec'd logic, NOT the handlers. Real backend verification = Firebase emulator or a live order.
- **Deploy ordering for any future change to this flow: backend first** (`firebase deploy --only functions`), THEN merge frontend to `main`. The two are deployed by different systems (Firebase vs Cloudflare); a gap where the new frontend calls a missing `confirmUpload` is swallowed by Ch5's try/catch but skips the customer email.
- **Status vocabulary now includes `uploading`** — kept customer-readable on purpose (future my-orders dashboard will display it). Any new dashboard/status code must tolerate it.

### Previous: Session 39
**Session 39 (2026-06-05) — UX polish + price unification. Three customer-facing fixes done, NOT yet committed/pushed. Investigated upload fragility → logged TO-DO #68 (High).**

**What changed (all LOCAL, uncommitted):**
1. **Customer-preview loading copy** — "Loading your book preview…" → "Your book is loading…"; rotating line "Your book is nearly ready." → "Almost ready…" (no trailing dots, per Evgeny).
2. **Hide editing chrome during load** — photo sidebar, edit-hint, submit-bar (Save/Approve), preview-controls, and the nav Edit/Preview toggle are all hidden on load; new `showBookChrome()` reveals them together only after `renderBook()` succeeds. Error path stays clean.
3. **Unified prices across all 10 product pages** — 40p = **€70**, 80p = **€100** (was a mix: €60/70 for 40p, €100/120 for 80p). **Wander was showing €60 while its Stripe SKU is €70 — now consistent.** New `assets/js/prices.js` (`BOOK_PRICES={p40:70,p80:100}`) is the shared source of truth, included `<script defer>` in every product page; it rewrites chip labels + default display on load. The chip `onclick="pick(this,NN)"` values were ALSO hand-edited (that number is what flows to Stripe — prices.js only syncs display text).

### ▶ NEXT SESSION (Session 40)
1. **Commit + push S39 changes** — `customer-preview.html`, all 10 product pages (`scribble/wonder/sprout/bloom/wander/horizon/terrain/radiance/devotion/vows.html`), new `assets/js/prices.js`, `TO-DOS.md`. Local-only, not yet on live. Cloudflare auto-deploys `main`.
2. **Verify S39 in browser before/after deploy** — (a) open a Wander customer-preview link: confirm loading screen is clean (no sidebar/buttons until book renders) and copy reads right; (b) hard-refresh each product page: confirm 40p=€70 / 80p=€100 everywhere and the price flows correctly into order.html → Stripe.
3. **TO-DO #68 (High) — upload fragility** — Evgeny's S39 question. Cheapest-first fix: (a) `beforeunload` guard while uploads in flight; (b) check PUT `res.ok` + retry (also fixes a standalone silent-failure bug); (c) server-side `uploadComplete` flag so dashboard shows partial orders. See TO-DOS.md #68 for full root-cause.
4. Parked: bug #5 fetch-retry (not reproduced); TO-DO #67 rich-text caption editor = whole dedicated session.

### ⚠ OPEN WATCH-OUT (new, S39)
- **`assets/js/prices.js` display-sync vs HTML onclick must stay in agreement.** prices.js only rewrites the visible price *text*; the `onclick="pick(this,NN)"` number in each chip is what actually flows to order.html → Stripe. Change one, change both. bloom.html uses the `pick('a',this,NN)` signature. The Stripe SKU price (`STRIPE_PRICE_ID` in `functions/.env`) is independent — editing prices.js does NOT change what Stripe charges.

### Previous: Session 38
**Session 38 (2026-06-05) — Wander end-to-end FULLY VERIFIED (staff engine ✓, customer preview ✓, payment ✓, PDF ✓). Fixed 4 PDF export bugs in `scripts/export-pdf.js`. Committed + pushed (S39 confirmed by Evgeny).**

**What happened:**
1. **Wander E2E — all surfaces confirmed.** Staff engine, customer preview, and payment all work. PDF also now works after the fixes below.
2. **PDF: oversized SVG overlays** — SP04 and SP10 right-page overlays silently dropped from PDF. Root cause: those SVGs embed 11–17 MB of base64 rasters, exceeding libxml2's ~10 MB XML node limit. Fixed with `shrinkOversizedSvg()` helper (downsamples embedded rasters to ~2× on-page display size before passing to sharp; gated at >8 MB so Scribble is never touched).
3. **PDF: caption line-wrap mismatch** — Windows contenteditable stores line breaks as `\r` + `<div>`. After HTML stripping, `\r` lingered as a trailing character, inflating the measured line width and causing extra wraps vs the engine. Fixed: `stripHtml()` now does per-line `.trim()` + whitespace collapse at the return value.
4. **PDF: Cormorant Garamond fontkit GSUB ligature bug** — same bug as EB Garamond (S27): fontkit incorrectly stores ligature glyph advance widths, causing visible gaps. Fixed: added `'Cormorant Garamond'` to `LIGATURE_FONTS` (char-by-char draw path). Split concern: new `SUPPRESS_LETTER_SPACING_FONTS` set keeps EB Garamond at charSpacing=0; Cormorant Garamond keeps its `-0.02em` letter spacing.
5. **PDF: `stripHtml` false-positive warning** — fixed naive comparison to mirror the same `<br>`/`<div>` → newline handling as the real strip, so captions with manual line breaks no longer fire a spurious warning.

### ▶ NEXT SESSION (Session 39)
1. **Commit + push `scripts/export-pdf.js`** (4 PDF fixes from S38). Confirmed working by Evgeny on AEV-029.
2. **Delete `docs/briefs/wander-map-reexport-spec.md`** (untracked, now moot — S35 proved the maps were fine; the bug was CSS then a cache artefact). Tell Kseniia to stop re-exporting.
3. **Wander is now fully live and end-to-end verified.** Next feature work TBD.
4. Parked: bug #5 fetch-retry (not reproduced); TO-DO #67 rich-text caption editor (partial bold / Ctrl+B) = whole dedicated session.

### ⚠ OPEN WATCH-OUT (new, S38)
- **Every new font added to the project must be tested for the fontkit GSUB ligature bug.** Symptom: engine renders correctly, PDF has a gap at a specific character position. Diagnosis: add the font to `LIGATURE_FONTS`; if the gap disappears it was the bug. Do NOT add to `SUPPRESS_LETTER_SPACING_FONTS` unless the font explicitly needs zero letter-spacing (only EB Garamond does). See memory `project_pdf_font_rules.md`.
- **SVG overlays >8 MB silently drop from PDF** — `shrinkOversizedSvg()` handles it, but only safe when embedded `<image>` elements carry their OWN transform (no parent `<g transform>`). Verify with grep before assuming the fix applies.

### Previous: Session 35
**Session 35 (2026-06-05) — order-form polish + map render fix. All shipped + PUSHED to `main`.**

**What shipped (live on `main`):**
1. **Structured itinerary lines (#2)** — Wander itinerary is now line-by-line (3 default, "+ Add a line" capped at 7, example placeholders). Submit joins lines with `\n` into the existing `itinerary` string → no downstream changes. (`order.html`)
2. **Realistic FP1 spread preview (#3)** — order form now shows the real two-page spread: region map (left) + actual right-page SVG with route text in the engine's exact text-panel position (Cormorant Garamond, navy, centred). Added Cormorant `@font-face` to order.html.
3. **Region maps SVG → PNG** — all 6 `maps{}` entries flipped to PNG. Clean swap (resolver returns path verbatim; PDF `sharp` auto-detects). Deleted the 6 now-unused left-map SVGs.
4. **Cloudflare deploy unblocked** — deploys had failed SILENTLY since S32: `FP 01 Map Left (N.America).svg` was 26.5 MB > Cloudflare's 25 MiB per-file limit, so the site was frozen on S31 for ~18h. Deleting the SVGs fixed it. (memory: `project_cloudflare_file_limit`)
5. **Map "shifted/cut frame" ROOT CAUSE = our CSS, not the artwork** — global `img { max-width:100% }` clamped the bleed-expanded map overlay's width but not its height → square PNG rendered non-square, breaking the symmetric 3 mm crop. Fixed with `max-width/height:none` on the map overlay in **all 3 surfaces** (order/engine/preview); order.html also scales off canvas `clientWidth` (excludes 1px border) → crop overhang now equal on all 4 edges (measured 2.78/2.78/2.80/2.80). Kseniia's maps were fine — `docs/briefs/wander-map-reexport-spec.md` is now MOOT.

### ▶ NEXT SESSION (Session 36)
0. **Evgeny: test the latest map fix (`72ff941`) on live.** Hard-refresh the Wander order form, add EU countries, confirm the map frame is even on all sides (this is the one thing not yet eyeball-confirmed by Evgeny). Then check the staff engine + customer preview map render too (same fix, mirrored, but unrun with a real order).
1. customer-preview + PDF map render are still **code-complete but never E2E-tested with a real order** (carried from S33).
2. Optionally delete the moot `docs/briefs/wander-map-reexport-spec.md` and tell Kseniia to stop re-exporting.
3. Parked: bug #5 fetch-retry (not reproduced); TO-DO #67 rich-text caption editor (partial bold / Ctrl+B) = whole dedicated session.

### Previous: Session 33
**Session 33 (2026-06-04) — chunk-022 (Travel map): wired the real map into the BOOK across all 3 render surfaces (staff engine, customer-preview, PDF), replacing the S28 stub. Fixed 2 latent Wander bugs. 85/85 tests. ⚠ NOTHING browser-tested by Evgeny yet — only the staff-engine render was Claude-verified headlessly. NOT committed, NOT pushed → live still shows the stub.**

**What changed (all LOCAL, uncommitted):** (1) **Map wired into the book** — replaced the `variant.mapCanvas` stub in `template-engine.html` (~line 2262) + the mirror in `customer-preview.html` with the real region SVG + pins via shared `map-render.js` (now actually `<script>`-included in both — was comment-only before). Added the map render to `scripts/export-pdf.js renderPage()`. FP1 selection read from `window._wanderMap = {region, countries}`, set from `order.fpTexts.fp1` BEFORE `renderBook`; PDF reads new `state.mapSelection` from book-state.json. (2) **`fpTexts.fp1` object handling** — engine now extracts `value.itinerary` for the text panel (was `[object Object]`) and persists the panel to its ACTUAL side (Wander itinerary = RIGHT page; Scribble = left) via `panel.closest('.page-canvas').dataset.side`. (3) **Bug: `exportBookState()` hardcoded `template:'scribble'`** → every Wander PDF would silently load Scribble data. Fixed via `_activeTemplateKey`. So no Wander PDF before today was ever valid. (4) **Local-dev fix** — `npx serve` drops the `?template=` query on its clean-URL 301 redirect → order form showed "Choose a template first". Use `python -m http.server 8080` (literal serve, keeps query; needs `.html` on every URL). Added `serve.json` (`cleanUrls:false`) as the serve alternative.

**Verified (headless only):** `qa/verify-map-render.mjs` — engine renders 1 map SVG + 5 on-country pins (EU) + itinerary in Cormorant, 0 JS errors. Screenshot `sessions/qa-runs/verify-map-render.png`. **customer-preview + PDF are code-complete but UNRUN** — the real risk for S34. Cormorant registered everywhere (`@font-face` both HTMLs, FONT_MAP in export-pdf).

### ▶ NEXT SESSION (Session 34) — Evgeny's real end-to-end Wander test FIRST
0. **Evgeny tests locally before any commit.** Server: `python -m http.server 8080` (NOT `npx serve` — clean-URL gotcha). Start at `http://localhost:8080/pages/wander.html` (always include `.html`). Flow: order form (add Travel-map FP1, pick ~5 EU countries + itinerary, submit) → staff engine (log in, Order mode, load AEV-xxx; verify map+pins+itinerary; **Save** then **Export book state (JSON)** — both buttons) → customer preview link (must match staff) → `cd scripts && npm run pdf -- AEV-xxx` (verify FP1 map+pins+itinerary in the PDF).
1. **Fix whatever the test surfaces** — pin calibration, itinerary font/position, clipped edges, "font not found"/"SVG not found" path errors. customer-preview + PDF are the unrun surfaces.
2. **Then commit + push** all S33 edits (engine, customer-preview, export-pdf, serve.json, qa/verify-map-render.mjs) — only after the E2E passes. Live (Cloudflare) auto-deploys `main`.
3. When all 3 surfaces render + a real order passes → **tell Evgeny the full Wander flow is live to test.**

### Previous: Session 32
**Session 32 (2026-06-04) — chunk-022: re-uploaded region SVGs smoke-tested + the real map wired into the ORDER FORM. Map coordinates re-synced from the CSV. Committed + PUSHED (`ec6960a`). 85/85 tests.** Diagnosed edge-drift as a **bleed-viewBox** issue (region maps carry 3 mm bleed → render bleed-fit, 206 mm overlay, −3 mm offset — see LEARNINGS 2026-06-04). `mapCoordinates` re-synced from `Map_Coordinates_upd.csv` (now semicolon-delimited), 0 mismatches across 183 countries. New testers `qa/map-tester.html`, `qa/map-smoke.{html,mjs}`, `qa/order-map-preview.mjs`. See `sessions/2026-06-04-s32.md`.

### Previous: Session 31
**Session 31 (2026-06-04) — Wander order flow wired end-to-end; `order.html` made template-aware. Committed + PUSHED (`9182309`). 85/85 tests; both order forms browser-verified.** First dropped a proposed engine "de-hardcoding" as YAGNI (constants, not assumptions — see memory `project_dehardcoding_dropped`).

**What shipped:** (1) `order.html` no longer hardwired to Scribble — resolves the active template via `TEMPLATE_REGISTRY`/`templateData()` (the 4th surface the chunk-020 seam missed). (2) Cover section **data-driven**: photo zone only if `cover.slots` non-empty (Wander = free-text, no cover photo); caption fields from `cover.captions` (`label`/`placeholder`/`maxLength`). (3) `wander.html` rebuilt onto the Scribble product-page pattern (real Travel-map FP1 addon, photo counter, correct `addons/addon_inputs/addon_slugs` param contract — was a dummy placeholder). (4) **FP1 country-select UI**: region-grouped multi-select, `sameRegionOnly` enforcement, itinerary text, labelled region placeholder; payload `fpTexts.fp1 = {region, countries, itinerary}`. (5) Cover-caption copy enriched from new CSV columns, **hand-synced** into both data files (no CSV→JS generator), Scribble form copy restored.

**⚠ Map render still blocked** on Kseniia's region SVGs (chunk-022) — the order form captures country+itinerary now; engine/customer/PDF map page shows the S28 stub. Only blocked piece of a real Wander order. **A real Wander order has NOT yet been run engine→customer→PDF** (order form + parity browser-verified only). See `sessions/2026-06-04-s31.md`.

### Carried (unverified, deferred since S30)
- Browser-verify Session 30 features — original photo filenames (needs a fresh upload) + approve→pay `Pay now · €70` (AEV-023 unpaid €70 / AEV-027 paid). Flagged but deferred.

### Status (previous: Session 30)
**Session 30 (2026-06-04) — built + shipped 2 approved features: original photo filenames (staff-visible) + approve→pay flow fix. Committed (`896dd78`) and PUSHED to main; Cloud Functions deployed + verified live. 85/85 tests.** First confirmed S29 was already fully shipped (STATUS was stale — `d83eb94` was committed/pushed + `getPdfUrl` deployed).

**Feature #1 — original photo filenames (Option B):** staff see each pool photo by the customer's **original filename**; chronological sort fallback uses those numbers; customer side **hides** filenames. `upload.js` persists `photoManifest.poolOriginalNames[]` (parallel to `pool[]`); `getOrder` returns it; `comparePhotos` (shared, tested) sorts by `displayName||name`; staff engine attaches `displayName` on order load + shows it in the sidebar. Internal key `photo_NNN` untouched → save/load zero-risk. Legacy orders fall back to `photo_NNN`. **Real names only appear on a fresh upload — not yet seen in browser.**

**Feature #2 — approve→pay flow:** (a) Review→Approve→Pay progress cue; (b) forward post-approve copy *"one last step: complete payment…"* (was terminal "we'll be in touch"); (c) "we'll be in touch" now only post-payment; (d) Pay button shows order price (`Pay now · €70`) — `getOrder` now returns `price`. All in `customer-preview.html` + one field in `index.js`. ⚠ **Cost source-of-truth split:** button shows order-time `price`; Stripe charges fixed `STRIPE_PRICE_ID` — match today, could diverge if Stripe price changes. See `sessions/2026-06-04-s30.md`.

### ⚠ CARRIED-FORWARD UNVERIFIED (Session 30 features — shipped + deployed, NOT browser-verified)
Both S30 features (original photo filenames; approve→pay flow / `Pay now · €70`) are live on `main` but were **never confirmed working in a browser**. S31 chose to push on Wander instead; these still need a visual pass before being trusted. See items 1–2 below.

### Session 30 follow-ups (status after S31)
1. **Visual-verify Feature #2** on AEV-023 (approved, unpaid, €70 — token in S30 log): expect `Pay now · €70`, stepper `✓ Review ✓ Approve **Pay**`, forward copy. AEV-027 (paid): all-done stepper + "Payment received". — _still unverified (carried to S32)._
2. **Verify Feature #1 with a fresh upload** — only way to see real `IMG_xxxx` names staff-side. — _still unverified (carried to S32)._
3. ~~De-hardcoding → template contract~~ — **DROPPED S31 as YAGNI** (constants, not assumptions; see memory `project_dehardcoding_dropped`).
4. ~~Finish chunk-010 — wire Wander product page end-to-end~~ — **DONE S31** (order flow wired; map render still blocked on chunk-022 SVGs).

### Session 26 status
**Session 26 (2026-06-03) — chunk-020 (multi-template engine seam) BUILT + VERIFIED + committed (`374af3d`, not pushed).** The staff engine, customer-preview, and `export-pdf.js` now resolve template data + asset base from a `TEMPLATES` **registry** keyed by the order's `templateName` (lowercased), instead of being hardwired to `SCRIBBLE_DATA`. Adding a template = one registry entry per the 3 surfaces; unknown/missing names fall back to Scribble. **Real bug caught:** product pages send a capitalised name (`'Scribble'`/`'Wander'`) — the registry lowercases before lookup, so Wander orders won't silently render as Scribble (the literal-match version would have). Verified Scribble renders byte-identically on staff engine + customer-preview in browser; 73/73 tests. PDF leg deferred. Convention saved to memory `project_template_seam.md`. **Session also recovered a stale-checkout git mess** (local `main` was 6 behind origin/main with a leftover settings.local.json conflict) by fast-forwarding to S25 — nothing lost.

### ▶ NEXT SESSION — chunk-022 (Travel map functional page)
1. **chunk-022** — next dependency before finishing Wander. Design locked S25 (see `docs/briefs/wander-template.md` + session log 15:50): left page = regional map SVG (6 by region code), right = staff itinerary textPanel over `FP 01 Map Right.svg`, pin = `GEO PIN.png` centre-anchored 12×23mm, calibrate later. Order form: country multi-select, no photo upload, blocks cross-region.
2. Then **finish chunk-010 (Wander)** — register Cormorant Garamond (@font-face + font picker + export-pdf FONT_MAP), wire the Wander product page, end-to-end test a real Wander order (confirm `wander.html` sends `template: 'Wander'` → registry key `wander`).
3. **Push** the chunk-020 commit (`374af3d`) when ready to deploy to live (Cloudflare Pages auto-deploys `main`).
4. **Local-dev gotcha:** customer-preview needs the URL WITHOUT `.html` (`…/customer-preview?token=X`) — `npx serve` clean-URLs redirect drops the query string off the `.html` form. Live is unaffected.

---

### Session 25 (2026-06-03) — Wander (template 2) kickoff: data file + roadmap restructure. No engine code touched yet. Built `assets/Template_Wander/wander-data.js` (parses clean): cover (2 free-text captions), SP0–SP6 (Scribble geometry; Cormorant Garamond Bold captions, navy #262262; SP0 keeps NT Somic), FP1 map-page data contract, and `mapCoordinates` (183 countries → {region,xMm,yMm}, generated from the CSV). Downloaded Cormorant Garamond static .ttf (Light→Bold) into `assets/fonts/` (not yet registered anywhere). **Roadmap restructured:** Wander isn't a plain "digitisation" chunk — it carries one-time infra. Added **chunk-020 (multi-template engine seam, blocks 010–017)** + **chunk-022 (Travel map functional page, reusable)**; repurposed **chunk-010 = Wander template** (depends on 020+022, marked in-progress); renumbered duplicate page-flip chunk-018 → chunk-021. Backing plan: `docs/briefs/wander-template.md`. Brief-per-chunk policy decided: roadmap chunk entry IS the brief except for novel chunks.

### ▶ NEXT SESSION — start chunk-020 (multi-template engine seam)
1. **chunk-020 first** — it blocks everything. Make engine + customer-preview + PDF select template data + asset base by the order's template name (currently hardwired to `window.SCRIBBLE_DATA`; `SVG_BASE` at `template-engine.html:1046`; `ASSET_BASE` at `export-pdf.js:122`). **Hard gate: Scribble must render byte-identically** (verify in browser + a Scribble PDF). Plan the loader before editing the 3 files.
2. Wander SVGs are NOT in a `Spreads/` subfolder (unlike Scribble) — the per-template asset base must account for this.
3. Then chunk-022 (map page) → finish chunk-010 (register Cormorant in @font-face + font picker + export-pdf FONT_MAP, product page).
4. Open decisions for chunk-010/022: cover front-caption is free text (resolved); cross-region selection UX = block (tentative). See `docs/briefs/wander-template.md`.
5. Untracked Wander assets + `wander-data.js` + new fonts not yet committed — commit when chunk-020 lands so a Wander order can be tested.

### Session 24 status
**Session 24 (2026-06-03 afternoon) — complex-scenario QA chain finished + PDF for AEV-026 generated & verified.** The S23 verification queue is now largely cleared. (1) **Placement audit** fixed per user ("fix A"): flags only backward moves → 34 noisy "breaks" collapse to ~8 real inversions, each manually checkable. User decided NOT to tune the algorithm (B) — placement effect is minor. (2) **Downstream QA chain** (`qa/downstream-chain.mjs`, new) ran clean on AEV-026 (user's saved creative edits): `placed:106/106, spreads:40`, through Stripe `payment=success`. Skips the engine save leg so it can't clobber staff edits. (3) **PDF** (`npm run pdf -- AEV-026`) built clean (cover + 80 pages), uploaded to GCS, **cover visually confirmed by user**. Fixed two PDF issues: NBSP "tofu" box after "WILD" (cover captions now use `stripHtml`), and order-mode now uploads to GCS with **no local copy**. Learned: PDF reads GCS `book-state.json` written by the engine's **Export** button (separate from **Save** → Firestore) — footgun logged as TO-DO #64.

### ▶ NEXT SESSION
1. **Commit + deploy.** Uncommitted: `template-engine.html` (audit + export-message + the still-pending #63 FP5 render fix), `scripts/export-pdf.js` (NBSP + GCS-only — CLI, no deploy needed), `qa/downstream-chain.mjs`. Engine HTML needs `git push` → Cloudflare Pages auto-deploy to reach live. #61 (FP5 upload) already deployed; #63 (FP5 render) reaches live only on this deploy.
2. **Verify FP5 two-artwork (#63) on live** after deploy — this session ran against live where #63 wasn't deployed yet, so the browser dual-art fix is still unconfirmed (the PDF side was already correct).
3. **TO-DO #64** — decide Save/Export unification (or make PDF read Firestore).
4. Untracked `assets/Template_Wander/` — new template assets; confirm with user whether to commit.

---

### Session 23 (2026-06-03) — incomplete-book guard ALLOW-path verified end-to-end. Deployed `saveStaffState` (the deploy that unblocks the dashboard send-gate — earlier failure was transient). Extended `qa/order-journey.mjs` to configure **all five** special pages (was only FP1+FP2): FP1 Birthday, FP2 Funny words, FP3 Favourite toy, FP4 First steps, FP5 Artwork gallery (art-1/art-2 reserved + excluded from the general pool). Minted fresh order **AEV-024**, then ran `qa/staff-customer-chain.mjs` on it: engine save → `"Saved ✓"` → dashboard **Generate preview link allowed (not blocked)** → customer **Approve** proceeded → Stripe **`payment=success`**. This closes the S22 gap ("verified it blocks incomplete; NOT yet verified it allows complete"). The guard now verified both ways. Note: `checkBookComplete` reads the data model, not the painted DOM — it isn't fooled by render timing (engine screenshot 07 was mid-render/empty yet the book correctly judged complete).

**Then ran the user's complex-scenario plan (partly done).** Minted an **80-page order AEV-026** with FP1 + FP5 only via new script `qa/order-80-fp1-fp5.mjs`. Findings: an 80-page book **requires 106 main photos** though the configurator promised "75–91" (worse instance of TO-DO #58); **upload took 190.6s (~3.2 min)** for 110 files — a real customer-UX concern (TO-DO #62; a 5-min cap timed out once, leaving orphan AEV-025). User did creative staff edits on AEV-026 (swap, H/V, heart-crop, captions). Hand-off model agreed: **scripts are headless** (no visible browser) so the user does creative edits in their own logged-in browser; I run the deterministic legs + inspect.

**FIXED two FP5 bugs (both committed-pending, NOT yet deployed-to-live for the render parts):**
1. **#61 upload** — `functions/upload.js` now appends `slotIndex` → stores `fp5-0.jpg`/`fp5-1.jpg` (distinct). **DEPLOYED** (`createUploadSession`). AEV-026 is the first order with two distinct art files (verified in its load log: fp5-0 1024×1536, fp5-1 736×1104).
2. **#63 render (NEW, separate bug)** — the browser render resolved the artwork by `slotIdx` (always 0 per FP5 page) → showed the same artwork on both pages. Fixed in BOTH `template-engine.html` + `customer-preview.html` (mirrored): artwork now indexes by side (left=0, right=1). PDF (`export-pdf.js`) was already correct. **These are LOCAL HTML edits — not on aevia-test.pages.dev yet; need commit+deploy or local `npx serve` to see.**

**Sequencing logic — clarified via /understanding-the-ask + built a placement audit.** The real ask: staff curate every order and need the system to SHOW how photos were sequenced so they can decide swaps. Key correction to our mental model: **the engine already sorts the pool chronologically** (`EXIF date` → `filename number` → `upload order`, `template-engine.html:1369-1375`) — Q1(1) is already implemented; test photos just have no EXIF so it falls back to filename number. The gap was no per-photo PLACEMENT log. **Built `logPlacementAudit()`** (`template-engine.html`, staff-only console diagnostic): after auto-arrange it prints each spread→page→slot→photo+orientation, and **flags ⚠ every point where chronology breaks** (a photo placed out of date order, usually because a multi-slot page locks to one orientation). **UNVERIFIED in browser** — user is testing locally next; the chain runBook code path runs it for both fresh and restored books. Open question for next session: is the orientation-vs-chronology trade-off acceptable, or should the algorithm be tuned (step 2, deferred).

### ▶ S23 remaining / NEXT SESSION verification queue
1. **User is testing AEV-026 locally** (`npx serve . -p 8080` → `http://localhost:8080/pages/staff/template-engine.html`). Awaiting: (a) PLACEMENT AUDIT log output (confirms `logPlacementAudit` runs + shows the real break pattern on 106 photos); (b) FP5 art gallery now shows TWO different artworks.
2. **Resume the user's complex-scenario plan** mid-flow: after staff edits → send preview → customer edits (swap/caption) → **check staff vs customer state parity after approval+payment** (step 7) → **generate PDF** (`npm run pdf -- AEV-026`, step 8) and inspect.
3. **Decide on sequencing algorithm** — review the audit's break pattern; tune chronology-vs-orientation if warranted (deferred step 2).
4. **Commit + deploy** the local render fixes (#63) so they reach the live site; the upload fix (#61) is already deployed.

### S23 remaining manual negative-checks (optional, low priority)
The block path was verified once in S22. Two explicit manual sub-checks remain un-automated: (a) break a slot/caption in-engine → dashboard preview link blocked **with reasons shown**; (b) customer-side incomplete-approve **warn toast**. Re-confirm if touching the guard again.

---

### Session 22 (2026-06-03) — QA automation + incomplete-book guard (built). Built real browser testing of the customer journey (Playwright drives via Node scripts in `qa/`, Claude judges screenshots). The staff→customer→pay chain (`qa/staff-customer-chain.mjs`) now runs end-to-end through Stripe after fixing login, `networkidle` hangs, and the Stripe payment-method picker (must select "Karte"/Card radio before filling). Mid-session pivoted to a **product feature**: hard-block sending/approving an **incomplete book**.

**NEW FEATURE — incomplete-book guard (built, tested, partly verified).** Saving an incomplete book stays allowed; **sending a preview link** and **approving** are now hard-blocked when the book has empty photo slots, unplaced photos, or blank captions on special pages (data-driven: a caption is required iff the layout shows an editable text box). Shared tested helper `assets/js/book-completeness.js` (`checkBookComplete` → `{complete, reasons[]}`), 12 new jest tests, **suite 69/69 green**. Wired into customer-preview approve (live block + warn toast), staff engine save (stores `bookComplete`), `saveStaffState` function (persists `staffBookComplete`+reasons), dashboard `generatePreviewLink` (blocks send). VERIFIED it correctly **blocks** an incomplete book; NOT yet verified it **allows** a complete one.

**⚠ AEV-023 is corrupted as a fixture** — its customer-side data (`customerBookAssignments`) was saved empty by the earlier automated chain runs (Approve serialized the book before render populated it). Its customer view renders empty (51 unplaced). Staff data is intact. Do not reuse it for clean verification.

### S22→S23 carry-over (all resolved in S23)
~~Deploy `saveStaffState`~~ DONE · ~~Mint fresh order~~ DONE (AEV-024) · ~~Verify allow-complete path~~ DONE (chain through `payment=success`) · ~~Fix #61 FP5 upload~~ DONE+deployed. Active next steps are in the **S23 verification queue** above.
**Test data to clean up later (TO-DO #60):** AEV-023 (corrupted), AEV-024, AEV-025 (orphan/partial), AEV-026 (active fixture) + any chain-created orders.

### Local verification helpers (this session, in `qa/`)
- `qa/probe-photos.mjs`, `qa/verify-completeness.mjs`, `qa/inspect-shapes.mjs` — read-only diagnostics against the **public** customer-preview (no staff pw). To test LOCAL edits, run `npx serve . -p 8080` and use the **clean URL** `http://localhost:8080/pages/customer-preview?token=…` (the `.html` form 301-drops the `?token=`).

---

### Session 21 (2026-06-02) built and verified
Session 21 built and verified **chunk-018 — staff authentication (Firebase Auth)**. DONE. Committed `1a7a3fa` (not yet pushed). Both staff pages (dashboard + template-engine) now require real Firebase Email/Password login; staff Cloud Function calls send the user ID token (`Authorization: Bearer`); `functions/index.js` `isStaff()` verifies the token against a server-side allowlist (`evg.myasin@gmail.com`, `xenia@aevia.at`); `firestore.rules` `/orders` read + update now require an allowlisted staff auth email. The hardcoded password (`keanuredcat`) and staff key (`865865`) are gone from all browser pages — the key survives ONLY in `functions` env + the local PDF CLI (`scripts/export-pdf.js`). Retired legacy `my-order.html` (read Firestore directly by token → forced `allow read: if true`) and removed its "Track your order" email button (see ADR `docs/decisions/0003`). **Verified live:** staff login, dashboard read+update, engine order-load + export, PDF export, customer preview/approve/pay all work; anonymous reads denied. 57/57 tests pass.

**Outstanding wrap-up (not blocking):** (1) ✅ commit pushed; (2) ✅ dead Cloudflare Access app `Aevia Staff` deleted from Zero Trust; (3) docs ARCHITECTURE.md / ROADMAP partly still describe the old `X-Staff-Key`/Cloudflare model — updated where critical, full sweep deferred.

### Earlier (session 20)
Session 20 attempted **chunk-009 (Cloudflare Access)** and **retired it** (superseded by chunk-018). Path-scoped Cloudflare Access can't enforce on a single `*.pages.dev` project (verified). Kept: staff pages moved to `pages/staff/` (commit `c2682a2`, pushed).

### Earlier (session 19)
Session 19 built **chunk-008 — "Approved for print" dashboard button** (developer-agent + independent verify). Committed `70db5d1`, pushed; `markSentToPrint` deployed by user and verified live (a paid order flipped to `sent_to_print` in both dashboard and Firestore). chunk-008 is DONE. Decided: button only, no CLI (resolves the open question). Also installed jest at repo root so `npm test` runs (57/57 pass) and deleted two stale motif-engine trial files.

### Earlier (session 18)
Fixed bugs from the chunk-007 end-to-end test (8 issues + 4 follow-ups). Committed `0d2d8f7`, pushed; `getOrder` redeployed. **Verified:** #9 PDF — cover + all SVG overlays render in `--order` mode (AEV-021 clean).

**UNTESTED in browser (verify next session):**
- #2 post-payment thank-you screen (skips book reload on `?payment=success`)
- #3 rotating reassurance lines on customer book load (counter kept)
- #4 paste-as-plain-text in caption editors (both engines)
- Thank-you screen showing the exact customer email (needs deployed `getOrder` — done)

**Other fixes this session (lower risk):** #8 pay button appears after approve; #3 order-form "undefined" hint gone; #1 spine labels; #5 caption toolbar no longer clips/overlaps; #6 birthday text box true flexbox centering (now matches PDF); #4 order-form scroll stall fixed via downscaled display thumbnails.

### Earlier
- Session 17: chunk-007 full PDF pipeline (see `sessions/2026-06-02.md`).
- Sessions 11–16: chunks 001–006, Stripe, heart crop (see `sessions/2026-06-01.md`).

**Meta-task bar (user, explicit):** customer-rendered book must look EXACTLY like staff (fonts, styling, captions, photo positions, spreads, cover). Customer can change photo sequence, captions, caption styling AND alignment, always using our layout.

## Immediate next steps
1. ~~Push the chunk-018 commit + delete the dead Cloudflare Access app~~ — both DONE (session 22).
2. **Browser-verify Session 18 untested items** (#2, #3, #4, thank-you email) — see UNTESTED list above. Test #2 needs a fresh order paid via Stripe (returns with `?payment=success`).
3. **TO-DO #56** — post-payment confirmation email to the customer (only staff notified on payment today).
4. **Switch Stripe to live mode** — when real website is deployed.

## Deferred
- **Playwright browser tests** — deferred until customer preview is stable in production.
- **chunks 010–017** — Template digitisation. Wait for CSV + SVG files from Kseniia.
- **TO-DO #50** — sentSnapshot visual view (`?view=sent`). Low priority.
- **TO-DO #51** — Customer preview load performance. Low priority.
- **Verify #55 in customer-preview view** — confirm heart crop renders identically (read-only) on a live customer preview link. Do with a real new order.

## Open questions
1. **PDF script shared access** — each installs Node locally (near-term) vs Cloud Run job (long-term). Resolve before second founder needs to generate PDFs.
2. **Stripe live mode** — requires live website URL for full Stripe account activation. Currently running in test mode.

## Open watch-outs
- **(S24)** **PDF reads GCS `book-state.json`, written ONLY by the engine's "Export book state (JSON)" button — NOT by "Save book state"** (which writes Firestore for the customer view + guard). They're two separate clicks. If you Save but don't Export, `npm run pdf` fails with "No such object: …/book-state.json". (TO-DO #64.)
- **(S24)** **Cover captions go through `stripHtml` now** (`export-pdf.js:740`) — same as spread captions. `stripHtml` normalises NBSP (U+00A0)→space so the print font doesn't draw `.notdef` boxes. Don't reintroduce a raw `.trim()` read on caption text. The NBSP originates in the contenteditable title editor (space before a manual line break).
- **(S24)** **`export-pdf.js` order mode keeps NO local file** — uploads `preview.pdf`/`print.pdf` straight to GCS from memory. `uploadAndSignPdf` now takes bytes, not a path. Local `--photos` mode still writes to `pdf-out/`.
- **(S24)** **Big-book customer load is slow** (~95s for 110 photos) — QA chain must wait for `#load-progress-label` to detach (render-done), not a photo-count guess. (TO-DO #66.)
- **(S22)** **Incomplete-book guard needs a function deploy to work.** `firebase deploy --only functions:saveStaffState` writes `staffBookComplete`/`staffIncompleteReasons`. Until deployed, the dashboard send-gate (`generatePreviewLink`, blocks when `staffBookComplete !== true`) will refuse EVERY order. Completeness logic lives in ONE place: `assets/js/book-completeness.js` (included in engine + customer-preview via `<script src>`). Both render paths must keep pushing `{spread,side}` into `window._requiredCaptions` wherever `variant.textPanel?.caption?.allowed` — mirrored edit, per the engine-parity rule.
- **(S22)** **Customer save can override good staff data.** On reopen, load precedence is customer > staff > defaults (`customer-preview.html:916-923`). A customer (or an automated approve) that serializes an empty/partial book writes `customerBookAssignments`/`customerCaptions` that then REPLACE the intact staff arrangement on next load. AEV-023 got bricked this way. The new approve-gate mitigates (can't approve an incomplete book), but the precedence + a save-before-render race are worth a proper look.
- **(S22)** **`serve` drops query strings on `.html`.** Loading the local customer-preview with a token: use `/pages/customer-preview?token=…` (clean URL). The `.html` form 301-redirects and loses `?token=` → no order loads.
- **(S22)** **AEV-023 customer data corrupted** — empty `customerBookAssignments`, lost special-page captions. Staff data intact. Don't use it to verify the "allow complete book" path; mint a fresh order.
- **(S21)** **chunk-018 done — the S20 exposure is now CLOSED.** `firestore.rules` locks `/orders` read+update to `request.auth.token.email in ['evg.myasin@gmail.com','xenia@aevia.at']`. This allowlist exists in TWO places that MUST stay in sync: `firestore.rules` and `STAFF_EMAILS` in `functions/index.js`. Add/remove staff in both, then `firebase deploy --only firestore:rules,functions`.
- **(S21)** Staff Cloud Functions accept a Firebase ID token (`Authorization: Bearer`) OR the static `865865` key. The key is no longer in any browser page — it remains only in `functions` env (`STAFF_KEY`) and `scripts/export-pdf.js` (local PDF CLI, no logged-in user). To fully retire the key, migrate that script to admin credentials.
- **(S21)** Customer flows (preview/approve/pay/book-save) run via admin-SDK Cloud Functions and BYPASS `firestore.rules` — tightening rules never affects them. `customer-preview.html` does NOT touch Firestore directly. Do not "fix" customer auth in rules.
- **(S21)** Email/Password sign-up is technically open on the Firebase project (public apiKey) — so a valid token is NOT sufficient; `isStaff()` and the rules MUST check the email allowlist, not just `request.auth != null`. Don't relax this.
- **(S21)** Engine login gate is a separate `<script type="module">` (Firebase modular SDK needs ESM; the main engine script is a plain `<script>`). It exposes `window.staffHeaders()`. The engine renders underneath the overlay before auth resolves — expected.
- **(S21)** Pre-existing cosmetic bug (NOT fixed): `scripts/export-pdf.js` `--order` mode prints a local `pdf-out\preview.pdf` path even though it uploads to GCS. Harmless; the GCS link it also prints is the real one.
- **(S20)** chunk-018 build order matters: enable Firebase Auth + create accounts → add login to dashboard and confirm YOU can get in → switch functions to ID token (keep static key one step in parallel) → tighten `firestore.rules` → delete password/key → mirror onto engine. Tightening rules before your login works = locked out.
- **(S20)** A non-enforcing Cloudflare self-hosted Access app (`Aevia Staff`, dest `aevia-test.pages.dev/pages/staff/*`) exists in Zero Trust — delete it; it protects nothing.
- **(S19)** chunk-008: `markSentToPrint` write is admin-SDK (Cloud Function) → bypasses `firestore.rules`, no allowlist entry needed. Button only renders on `paid` orders and 404s until the function is deployed (`firebase deploy --only functions:markSentToPrint`). This function is the future hook for Elanders/SiteFlow API submission (P2) — plug the API call inside it, no UI rebuild.
- **(S19)** Repo-root `npm test` (jest) now works but needs `npm install` at repo root on a fresh clone — separate from `scripts/npm install` for the PDF export. `node_modules/` is gitignored.
- **(S18)** `scripts/export-pdf.js`: any constant derived from `MM_TO_PX`/`BLEED_MM`/`MM_TO_PT` MUST be assigned inside `initializePrintConstants()`, not at module top — they're lazy in `--order` mode. Module-load math gives `NaN` (broke cover + all SVGs).
- **(S18)** Order-form thumbnails are downscaled display-only copies (`_thumbUrl`). Full-res `_objUrl` is used for the lightbox AND the GCS upload (`fileObjects`) — never swap the upload to the thumbnail. PDF unaffected (pulls full-res originals from GCS).
- **(S18)** Birthday textPanel centering: engine now uses flexbox; PDF centers via `(boxHeight − textHeight)/2`. Both read `valign:'center'` from CSV. A future Top/Mid/Bottom toolbar control would need the PDF to read `ov.valign` too (currently reads `capDef.valign` only).
- **(S18)** `getOrder` now returns `email` — used by the post-payment thank-you screen. Deployed.
- **(S17)** GCS folder naming: new orders use `AEV-001/` as folder. Old test orders use `templatename_customername_date/` — their Firestore `folderName` still points to old path, they still work.
- **(S17)** `scripts/node_modules` must be installed (`cd scripts && npm install`) on any fresh clone before running PDF export.
- **(S17)** `npm run pdf -- AEV-001` runs from `scripts/` dir (not repo root). The `--` is required npm syntax to pass the order number to the script.
- **(S17)** `updatePdfLinks()` in dashboard fires two HTTP calls per visible order on every table render. Fine at current volumes; revisit if order count grows significantly.
- **(S15)** Stripe webhook idempotency: guard checks `order.status === 'paid'` before writing.
- **(S15)** `createCheckoutSession` validates `order.status === 'approved'` before creating a session.
- **(S15)** Three Stripe env vars in `functions/.env`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`. Never commit. Swap all three for live equivalents when going live.
- **(S14)** Heart crop parity: engine sets `object-position: x% y%`; PDF computes `window-left = (scaledW − CONTENT_PX) × x/100`. Don't change one side's math without the other.
- **(S12)** Book layout saved by photo **basename**, not pool index. `assignmentsToNames`/`assignmentsToIndices` in BOTH engines — keep in sync.
- **(S12)** Staff `renderBook` auto-arranges UNLESS `window._restoreState` is set. Don't remove the guard.
- **(S11)** `FieldValue.serverTimestamp()` cannot be nested inside `arrayUnion`. Use `Timestamp.now()` inside array entries only.
- **(S11)** Any new field written from the browser must be added to the `hasOnly([...])` allowlist in `firestore.rules`.
- **(S9)** Customer load precedence: customer > staff > defaults.
- **(S8)** Customer & staff are parallel copies of the same render logic — change one, mirror the other.

## Key files
- Session log: `sessions/2026-06-02.md` (sessions 17 + 18)
- Previous session log: `sessions/2026-06-01.md` (sessions 11–16)
- Cloud Functions: `functions/index.js`, `functions/upload.js`
- Customer preview page: `pages/customer-preview.html`
- Staff dashboard: `pages/staff/dashboard.html`
- PDF export script: `scripts/export-pdf.js`, `scripts/package.json`
- Product requirements: `PRD.md`
- Architecture: `ARCHITECTURE.md`
- Roadmap (active): `ROADMAP.md`
- Backlog: `TO-DOS.md`
- Staff engine: `pages/staff/template-engine.html`
- Firestore rules: `firestore.rules`
- Template data: `assets/Template_Scribble/scribble-data.js`
- ADRs: `docs/decisions/`
