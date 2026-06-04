# QA browser scripts

Playwright-via-Node scripts (`.mjs`, ESM) that drive the **live** site
(`https://aevia-test.pages.dev`) in a headless Chromium, screenshot every
milestone, and let a human (or Claude) judge the result. They are **not** unit
tests — those live in `tests/` (`npm test`). These exercise the real customer +
staff journey end-to-end against real Firebase/GCS/Stripe (test mode).

Run from the **project root**. Artefacts (screenshots + logs) write to
`sessions/qa-runs/…`, which is gitignored.

```bash
node qa/<script>.mjs
```

Scripts that touch staff pages need the staff password in the environment first
(PowerShell). It is never written to disk, screenshots, or logs:

```powershell
$env:STAFF_PW = Read-Host "Staff password"
$env:QA_ORDER = "AEV-026"        # scripts that act on an existing order
node qa/staff-customer-chain.mjs
```

---

## The scripts

| Script | What it does | Touches staff? | Template-coupled? |
|---|---|---|---|
| `order-journey.mjs` | Mints a fresh order via the **Scribble** product flow (uploads `DTS_PARENTHOOD` photos, configures all 5 special pages), screenshots each milestone. Leaves a real `AEV-xxx` in Firestore. | no | **Scribble-specific** |
| `order-80-fp1-fp5.mjs` | Same idea, but an 80-page order with only FP1+FP5. Records GCS upload duration. | no | **Scribble-specific** |
| `staff-customer-chain.mjs` | Picks up an **existing** order (`$env:QA_ORDER`) and drives the rest: staff login → load in engine → save → dashboard generate-preview-link → customer approve → Stripe pay → confirm paid. Status-aware (won't re-approve a paid order). | yes | template-agnostic |
| `downstream-chain.mjs` | Like the chain above but **skips the engine load+save leg** — picks up an order whose book the staff already saved in their own browser, drives only generate-link → approve → pay. Use this so an automated run can't clobber the staff's creative edits via a save-before-render race. | yes | template-agnostic |
| `probe-photos.mjs` | Read-only. Loads a public customer-preview token, waits generously, reports real photo-load state. Tells "product bug" from "screenshot timing". | no | template-agnostic |
| `verify-completeness.mjs` | Read-only. Confirms `checkBookComplete` is wired and a known-complete book evaluates as complete. | no | template-agnostic |
| `inspect-shapes.mjs` | Read-only. Dumps `customerBookAssignments` placed/null counts + DOM slot state for a token. Diagnoses empty-render / corrupted-fixture cases. | no | template-agnostic |

The read-only probes hardcode a sample token URL — override with
`$env:QA_PREVIEW_URL` (or edit the literal in `inspect-shapes.mjs`).

---

## Reusable techniques (the hard-won bits)

These cost real debugging time across sessions 22–24. Keep them when writing new
drivers (e.g. a Wander variant of `order-journey`):

- **Wait for data, not a timer.** Big-book customer load is slow (~95s for 110
  photos). Judge the rendered book only after
  `await page.waitForFunction(() => (window.photoPool||[]).length >= N)` — a
  fixed `waitForTimeout(6000)` captures empty slots mid-paint. For load-done,
  prefer waiting on `#load-progress-label` to detach.
- **Stripe Checkout payment-method picker.** Checkout opens with **nothing
  selected**; the card fields don't render until "Karte"/Card is chosen. Stripe's
  radios are custom components — target by role/label, `click({force:true})`,
  then **verify** `#cardNumber` became visible before filling. Test card
  `4242 4242 4242 4242`, any future expiry, any CVC. (`staff-customer-chain.mjs:152`)
- **Modern Stripe renders fields on-page**, not in cross-origin iframes — fill
  `#cardNumber`/`#cardExpiry`/`#cardCvc` directly. Email + postal code are
  required.
- **Use `networkidle` sparingly.** It hangs on pages with long-poll/streaming
  connections. Prefer `domcontentloaded` + an explicit `waitForSelector` /
  `waitForFunction` for the thing you actually need.
- **Status-aware chains.** Re-running a chain on the same order must read
  `window.orderData.status` and branch — the customer page sets `_readOnly` and
  disables `#approve-btn` for already approved/paid orders. Don't blind-click.
- **Auto-accept dialogs.** Register `page.on('dialog', d => d.accept())` — the
  flow throws confirm() prompts that otherwise hang a headless run.
- **Headless by design — the human does creative edits.** These scripts run
  invisibly, so they can't be the staff member curating a book. The handoff
  model: **the user does creative edits (swaps, crops, captions) in their own
  logged-in browser; the script runs the deterministic legs + inspects.** That's
  why `downstream-chain.mjs` exists and skips the engine save leg.

## Gotchas

- **`serve` drops query strings on `.html`.** For a **local** customer-preview
  with a token, use the clean URL `…/customer-preview?token=…` — the `.html`
  form 301-redirects and loses `?token=`. (Live is unaffected.)
- **Save ≠ Export.** The PDF CLI (`npm run pdf`) reads GCS `book-state.json`,
  written only by the engine's **"Export book state (JSON)"** button — *not* by
  **"Save book state"** (which writes Firestore for the customer view). Two
  separate clicks. (STATUS watch-out, S24.)
- **Customer save can override good staff data.** Load precedence is
  customer > staff > defaults. An automated approve that serialises an
  empty/partial book writes `customerBookAssignments` that replace the intact
  staff arrangement on reload. This bricked AEV-023. Prefer `downstream-chain`.
- **Real orders accumulate.** The minting scripts leave real `AEV-xxx` test
  orders in Firestore (test mode). Clean-up backlog is TO-DO #60.

---

## Extending to a new template (Wander)

When Wander's product flow lands, the **minting** scripts (`order-journey`,
`order-80-fp1-fp5`) are the ones that need a variant — they encode the Scribble
order form (photo upload, 5 special pages, `DTS_PARENTHOOD` photos). Wander's
order form differs (country multi-select, no photo upload), so copy
`order-journey.mjs` → `order-journey-wander.mjs` and rework the form-fill leg.

Everything **downstream of order creation** (`staff-customer-chain`,
`downstream-chain`, all three read-only probes) is template-agnostic — it acts
on an existing order by number/token and should work for a Wander order
unchanged. Pass the Wander order via `$env:QA_ORDER`.
