# Session Status
_Last updated: 2026-06-01 (session 14)_

## Status
Session 14 built **TO-DO #55** — staff can now **drag the heart-mask photo to reposition it** inside the heart so it never crops a face (the heart pinches at top/bottom, so a centred vertical photo lost the head). New `heartCrop` state = per-photo `object-position` % (`{x,y}`, default 50/50 = old centred behaviour), keyed by photo name. Staff drag + render in `template-engine.html`; read-only apply in `customer-preview.html`; PDF replicates via scale-to-cover + `extract()` in `export-pdf.js`; persisted through local export, cloud save/load (`staffHeartCrop`, `functions/index.js`). Scope: **heart slot only** (other slots match photo orientation, so centre-crop is fine). Verified by user: staff drag feel + PDF export. **Not yet tested in customer-preview view** (read-only mirror, expected to match).

### Earlier (session 13)
Session 13 fixed **TO-DO #54** — the birthday "wishes" text panel printed ~1.26× smaller in the PDF than it looks in the engine. Root cause was a **size**, not font, mismatch: the engine renders text panels in raw CSS pt @96dpi (~1.26× larger on the 3px/mm = 76.2dpi canvas), while the PDF read the same sizePt as a true 72dpi point. Fixed by scaling the PDF's regular text-panel size by `PANEL_PT_SCALE = (96/25.4)/3` in `scripts/export-pdf.js`. Both engines left untouched (the bigger on-screen look is wanted). User verified the exported PDF now looks right.

### Earlier (session 12)
Session 12 built **chunk-006** (PDF export pulls full-res originals from GCS by order number) and fixed a **critical state-fidelity bug**: the staff and customer engines ordered the photo pool differently (staff sorts by EXIF date, customer uses upload order) but stored assignments as positional indices — so the customer's approved layout was scrambled in the staff engine and PDF. Now fixed by saving the book layout **by photo name**, not index. Verified spread-for-spread identical across both engines. Also added: staff restores saved book state on load (was silently auto-arranging), an "Export book state" button in Order mode, and a **view-only lock** on customer-preview after approval. All deployed/pushed.

**Meta-task bar (user, explicit):** customer-rendered book must look EXACTLY like staff (fonts, styling, captions, photo positions, spreads, cover). Customer can change photo sequence, captions, caption styling AND alignment, always using our layout.

### Completed this session (2026-06-01, session 12)
- **chunk-006 done** — `scripts/export-pdf.js` accepts `--order <orderNumber>` (alternative to `--photos <dir>`): calls `getOrder` for fresh signed URLs to the full-res ORIGINALS, matched to `book-state.json` by filename, downloaded on demand. Added `scripts/package.json` so it runs on any machine (`cd scripts && npm install`). Verified end-to-end on AEV-019/AEV-020.
- **Staff restore fix** — `loadOrderIntoEngine` now applies the saved book state (assignments, captions, sequence, caption styles) instead of letting `renderBook` auto-arrange. One-shot `_restoreState` guard. Mirrors the customer engine.
- **Name-based assignments (the big fix)** — both engines translate assignments to/from photo **basename** at the save/load boundary (`assignmentsToNames`/`assignmentsToIndices`); internal state stays index-based. Match by basename (staff stores bare filenames, customer stores full GCS paths). Legacy index saves still load via passthrough. Export/PDF already used names, so all three consumers now agree.
- **Export button in Order mode** — "Export book state (JSON)" added to the order panel (was Local-mode only).
- **Customer view-only lock** — `getOrder` now returns `status` (deployed); customer-preview locks editing + disables approve + shows a notice once `approved`/`paid`. Customer can still browse.
- **Order form photo-count guard** — re-tested by user: correctly blocks submitting fewer than the required photos. ✓
- **PDF live-tested** by user — works great. Two issues found for next session (see below).

## Immediate next steps
1. **Verify #55 in customer-preview view** — confirm the heart crop renders identically (read-only) on a customer preview link. Only remaining check.
2. **chunk-009** — Cloudflare Access setup (~20 min dashboard config). Unblocks Xenia's remote engine access.
3. **chunk-005** — Code done. Pending: fill in Stripe keys in `functions/.env`, run `npm install` in `functions/`, deploy functions, then add the webhook endpoint in Stripe dashboard. See below.

_TO-DO #55 done this session (staff + PDF verified; customer view untested) — see Status above._

## Deferred
- **Playwright browser tests** — deferred until customer preview is stable in production.
- **chunk-005** — Stripe payment. Blocked: Stripe account not yet set up.
- **chunks 010–017** — Template digitisation. Wait for CSV + SVG files from Kseniia.
- **TO-DO #50** — sentSnapshot visual view (`?view=sent`). Low priority.
- **TO-DO #51** — Customer preview load performance. Low priority.

## Open questions
1. **Stripe account** — not yet set up. Needed before chunk-005.
2. **"Approved for print" flow** — dashboard button, CLI flag, or both? Resolve before chunk-008.
3. **PDF script shared access** — each installs Node locally (near-term) vs Cloud Run job (long-term). Resolve before second founder needs to generate PDFs.

## Open watch-outs
- **(S14)** Heart crop parity rests on ONE number: engine sets `object-position: x% y%`; PDF computes `window-left = (scaledW − CONTENT_PX) × x/100` (exact inverse of CSS object-position). Don't change one side's math without the other. `heartCrop`/`getHeartCrop` exist in BOTH engines (parallel copies) — keep in sync. `attachHeartDrag` (staff only) is a dedicated pointer handler because the heart is `pool:'special'` (non-draggable via the normal path); img `draggable=false` kills the native drag-ghost. Default 50/50 = old centred behaviour, so existing books are unchanged. Persisted as `staffHeartCrop` in Firestore via `saveStaffState`; returned by `getOrder`; survives approval (approveOrder doesn't touch it).
- **(S12)** Book layout is saved **by photo basename**, not pool index. `assignmentsToNames`/`assignmentsToIndices` exist in BOTH engines (parallel copies) — keep in sync. Match is by basename because staff stores bare filenames (`photo_053.jpg`) and customer stores full GCS paths. Never go back to index-based saves: the two engines order the pool differently (staff sorts by EXIF date, customer = upload order).
- **(S12)** Legacy (pre-S12) orders have index-based saves. They load via a numeric passthrough — correct only if their photos were dateless/sequential (staff sort == manifest order). Orders with date-bearing photos need ONE re-save through the staff engine to convert to name-based. AEV-019/AEV-020 are test orders.
- **(S12)** Staff `renderBook` auto-arranges UNLESS `window._restoreState` is set (one-shot, set in `loadOrderIntoEngine` when the order has saved assignments). Don't remove the guard or saved layouts get clobbered.
- **(S12)** PDF script: `--order` mode fetches signed URLs via `getOrder` (1h expiry) and downloads originals on demand. Run from repo root; deps live in `scripts/node_modules` (`scripts/package.json`).
- **(S11)** `FieldValue.serverTimestamp()` cannot be nested inside `arrayUnion` — throws "Element at index 0 is not a valid array element." Use `Timestamp.now()` inside array entries only.
- **(S11)** Any new field written from the browser (not Cloud Function) must be added to the `hasOnly([...])` allowlist in `firestore.rules`. Cloud Function writes (admin SDK) bypass rules; browser writes do not.
- **(S11)** `sentSnapshot` is frozen at preview-link generation time. The customer preview link always shows live customer state — after approval it shows their approved version, not what was originally sent. `sentSnapshot` in Firestore is the only record of the original.
- **(S11)** Toolbar `offsetWidth` fallback 340px — if toolbar layout changes significantly, update this fallback in both engines.
- **(S10)** Caption `align` override lives in `coverCaptionStyles`/`spreadCaptionStyles` (key `align`). `setActiveAlignPill` exists in BOTH engines — keep in sync.
- **(S10)** funnyWords/textPanel overrides only exist on orders saved AFTER the S10 deploy. Older saves fall back to CSV `tpCap.sizePt`.
- **(S9)** `wouldMixPage` + `showToast` live in BOTH engines (parallel copies) — keep in sync.
- **(S9)** Customer load precedence is customer > staff > defaults.
- **(S8)** Customer & staff are parallel copies of the same render logic — change one, mirror the other.
- **(S8)** Text panels: regular use raw `pt` (96dpi); funnyWords uses `sizePt*SCALE px`. Asymmetry is intentional — do not normalise. **(S13 note)** Because the engine renders regular panels at 96dpi but the PDF reads sizePt as true 72dpi pt, the PDF printed ~1.26× too small. `export-pdf.js` now multiplies the regular panel size by `PANEL_PT_SCALE = (96/25.4)/3` to match the engine's on-screen size. If SCALE (=3 px/mm) ever changes, update that constant too.
- `order-details.txt` in GCS only on orders after 2026-05-27 deploy. `photoManifest` only after Plan 12-03 deploy. `coverCaptions` only after 2026-05-28 deploy.
- `staffBookAssignments`/`staffBookCaptions` only on orders where staff clicked "Save book state" — else customer auto-assigns.
- Firestore `hasOnly([...])` allowlist now includes: `status`, `statusHistory`, `previewToken`, `sentSnapshot`.
- Processing pool photos remains sequential (`processOneFile`) — HEIC WASM has shared state. Do not parallelise.
- Cover `sections.back/spine/front.xMm` are content-relative; cover photo slot + captions `xMm/yMm` are absolute (bleed included).
- EB Garamond uses per-character `drawText` (LIGATURE_FONTS). New ligature-heavy fonts need same treatment.
- `markDuplicates(existingPool, incoming)` excludes pool entries already flagged `duplicate:true` from the "seen" set — intentional, don't revert.

## Key files
- Session log: `sessions/2026-06-01.md` (sessions 11 & 12)
- Previous session log: `sessions/2026-05-29.md` (sessions 7–10)
- PDF export script + its deps: `scripts/export-pdf.js`, `scripts/package.json`
- Product requirements: `PRD.md`
- Architecture: `ARCHITECTURE.md`
- Roadmap (active): `ROADMAP.md`
- Backlog: `TO-DOS.md`
- Customer engine design spec: `.interface-design/system.md`
- Pure upload utils + tests: `assets/js/photo-utils.js`, `tests/photo-utils.test.js`
- getOrder tests: `tests/getOrder.test.js`
- Staff engine: `pages/template-engine.html`
- Customer preview page: `pages/customer-preview.html`
- Cloud Functions: `functions/index.js`
- Firestore rules: `firestore.rules`
- Template data (shared by both engines): `assets/Template_Scribble/scribble-data.js`
- ADRs: `docs/decisions/`
