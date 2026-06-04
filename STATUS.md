# Session Status
_Last updated: 2026-06-04 (session 27)_

## Status
**Session 27 (2026-06-04) — chunk-022 (Travel map page) STARTED: render proven in isolation, then PAUSED on a Kseniia asset dependency.** Built the reusable map-render core as a shared helper (`assets/js/map-render.js`: `pickRegion`/`resolveMapSvg`/`placeMapPins`), unit tests (`tests/map-render.test.js`, 7/7), and a standalone smoke harness (`pages/staff/map-smoke.html`). Verified in browser: EU countries → correct region SVG + 6 pins on coords + Cormorant itinerary panel, no console errors — all through the same helper the engine will call. **BLOCKED:** user found the region map SVGs render "weird" → Kseniia must fix + re-upload. **Do not wire into the engine until corrected SVGs land** — `mapCoordinates` (183 countries) was measured against the current maps, so new maps likely need coordinates re-derived from a fresh CSV. The smoke page is the re-verification tool. Also this session: captured QA-script knowledge in `qa/README.md` (+ memory `project_qa_scripts.md`) before the template-2 pivot. Nothing committed yet. **Resume:** wire helper into `template-engine.html` (mapCanvas branch + staff country picker) → mirror into `customer-preview.html`; PDF + customer QA still deferred. See `sessions/2026-06-04.md`.

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
