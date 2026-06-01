# Session Status
_Last updated: 2026-06-01 (session 15)_

## Status
Session 15 built **chunk-005** — full Stripe Checkout payment flow. Customer clicks "Pay now" on an approved order, gets redirected to Stripe-hosted Checkout, returns to customer-preview with a confirmation toast. Webhook marks order `paid` in Firestore and emails staff. Idempotency guard added (duplicate webhook events silently skipped). Verified end-to-end with Stripe test card. All deployed and pushed.

### Earlier (session 14)
Session 14 built **TO-DO #55** — staff can drag the heart-mask photo to reposition it inside the heart. New `heartCrop` state = per-photo `object-position` % (default 50/50), keyed by photo name. Staff drag in `template-engine.html`; read-only apply in `customer-preview.html`; PDF replicates in `export-pdf.js`; persisted via `staffHeartCrop` in Firestore. Verified: staff drag + PDF export. Customer-preview view not yet tested (read-only mirror, expected to match).

### Earlier (session 13)
Session 13 fixed **TO-DO #54** — birthday text panel printed ~1.26× smaller in PDF. Fixed by `PANEL_PT_SCALE = (96/25.4)/3` in `export-pdf.js`. Engines untouched.

### Earlier (session 12)
Session 12 built **chunk-006** (PDF uses full-res GCS originals) and fixed the critical name-vs-index layout bug. Staff engine restores saved state on load. View-only lock on customer-preview after approval.

**Meta-task bar (user, explicit):** customer-rendered book must look EXACTLY like staff (fonts, styling, captions, photo positions, spreads, cover). Customer can change photo sequence, captions, caption styling AND alignment, always using our layout.

## Immediate next steps
1. **Verify #55 in customer-preview view** — confirm heart crop renders identically (read-only) on a live customer preview link. Only remaining check from S14.
2. **chunk-009** — Cloudflare Access setup (~20 min dashboard config). Unblocks Xenia's remote engine access. No code changes needed.
3. **Switch Stripe to live mode** — when website is live, swap `sk_test_` → `sk_live_` in `functions/.env`, create live webhook endpoint, redeploy.

## Deferred
- **Playwright browser tests** — deferred until customer preview is stable in production.
- **chunks 010–017** — Template digitisation. Wait for CSV + SVG files from Kseniia.
- **TO-DO #50** — sentSnapshot visual view (`?view=sent`). Low priority.
- **TO-DO #51** — Customer preview load performance. Low priority.

## Open questions
1. **"Approved for print" flow** — dashboard button, CLI flag, or both? Resolve before chunk-008.
2. **PDF script shared access** — each installs Node locally (near-term) vs Cloud Run job (long-term). Resolve before second founder needs to generate PDFs.
3. **Stripe live mode** — requires live website URL for full Stripe account activation. Currently running in test mode.

## Open watch-outs
- **(S15)** Stripe webhook idempotency: guard checks `order.status === 'paid'` before writing. Stripe can deliver the same event twice — this prevents double emails and double writes.
- **(S15)** `createCheckoutSession` validates `order.status === 'approved'` before creating a session — blocks payment on unapproved or already-paid orders. Price is set server-side via `STRIPE_PRICE_ID` env var (not passed from browser).
- **(S15)** Stripe fee reality: 1.5% + €0.25 for European cards; 3.0% + €0.25 for non-European/international cards. Test card `4242...` is treated as US card (3%). Use `4000002500000003` (Austrian Visa) for accurate fee simulation in test mode.
- **(S15)** Three Stripe env vars in `functions/.env`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`. Never commit. Swap all three for live equivalents when going live.
- **(S14)** Heart crop parity rests on ONE number: engine sets `object-position: x% y%`; PDF computes `window-left = (scaledW − CONTENT_PX) × x/100`. Don't change one side's math without the other. `heartCrop`/`getHeartCrop` exist in BOTH engines — keep in sync.
- **(S12)** Book layout saved by photo **basename**, not pool index. `assignmentsToNames`/`assignmentsToIndices` in BOTH engines — keep in sync. Never revert to index-based saves.
- **(S12)** Staff `renderBook` auto-arranges UNLESS `window._restoreState` is set. Don't remove the guard.
- **(S12)** PDF script: `--order` mode fetches signed URLs via `getOrder` (1h expiry). Run from repo root; deps in `scripts/node_modules`.
- **(S11)** `FieldValue.serverTimestamp()` cannot be nested inside `arrayUnion`. Use `Timestamp.now()` inside array entries only.
- **(S11)** Any new field written from the browser must be added to the `hasOnly([...])` allowlist in `firestore.rules`.
- **(S11)** `sentSnapshot` is frozen at preview-link generation time — only record of original sent state.
- **(S11)** Toolbar `offsetWidth` fallback 340px — update if toolbar width changes significantly (both engines).
- **(S10)** Caption `align` override in `coverCaptionStyles`/`spreadCaptionStyles`. `setActiveAlignPill` in BOTH engines — keep in sync.
- **(S9)** `wouldMixPage` + `showToast` live in BOTH engines (parallel copies) — keep in sync.
- **(S9)** Customer load precedence: customer > staff > defaults.
- **(S8)** Customer & staff are parallel copies of the same render logic — change one, mirror the other.
- **(S8)** Text panels: regular use raw `pt` (96dpi); funnyWords uses `sizePt*SCALE px`. Asymmetry intentional. PDF multiplies regular panel size by `PANEL_PT_SCALE = (96/25.4)/3`.
- Firestore `hasOnly([...])` allowlist includes: `status`, `statusHistory`, `previewToken`, `sentSnapshot`.
- Processing pool photos remains sequential (`processOneFile`) — HEIC WASM has shared state.

## Key files
- Session log: `sessions/2026-06-01.md` (sessions 11–15)
- Previous session log: `sessions/2026-05-29.md` (sessions 7–10)
- Cloud Functions: `functions/index.js`
- Customer preview page: `pages/customer-preview.html`
- PDF export script: `scripts/export-pdf.js`, `scripts/package.json`
- Product requirements: `PRD.md`
- Architecture: `ARCHITECTURE.md`
- Roadmap (active): `ROADMAP.md`
- Backlog: `TO-DOS.md`
- Staff engine: `pages/template-engine.html`
- Firestore rules: `firestore.rules`
- Template data: `assets/Template_Scribble/scribble-data.js`
- ADRs: `docs/decisions/`
