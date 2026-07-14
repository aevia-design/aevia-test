# QA browser scripts

Playwright-via-Node scripts (`.mjs`, ESM) that drive the **live** site
(`https://aevia-test.pages.dev`) in a headless Chromium, screenshot every
milestone, and let a human (or Claude) judge the result. They are **not** unit
tests — those live in `tests/` (`npm test`). These exercise the real customer +
staff journey end-to-end against real Firebase/GCS/Stripe (test mode).

Run from the **project root**. Artefacts (screenshots + logs) write to
`sessions/qa-runs/…`, which is gitignored.

## Reuse orders — don't mint new ones (owner directive, S126)

Test against an order that **already exists**. Only place a new order when the case under test
*is* the order-creation path, and then let that one order serve the whole batch. S124/S125 left
a dozen junk orders behind because each agent minted its own; the owner does not want that
volume of test data in the live project. `QA_ORDER` (below) is how you point a script at an
existing one.

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

### Pre-launch QA suite (S124) — the current, maintained set

These four cover **P0** of `work/pre-launch-qa/case-catalogue_v1.md`. Each writes a findings
log + screenshots to `sessions/qa-runs/`, and exits non-zero on an S1. Findings triage lives
in `work/pre-launch-qa/findings_v1.md`.

| Script | Case | Run |
|---|---|---|
| `p0-1-template.mjs` | P0-1 — full customer order, **any** template (generic special-page filler) | `node qa/p0-1-template.mjs <newborn\|wander\|scribble\|papercut\|tender>` |
| `p0-2-preview.mjs` | P0-2 — engine save → generate link → **send preview** → customer opens the emailed link | `node qa/p0-2-preview.mjs <AEV-nnn> <testmail-tag>` |
| `p0-3-payment.mjs` | P0-3 — approve → Stripe **test** card → `paid` + payment email | `node qa/p0-3-payment.mjs <AEV-nnn> <testmail-tag> [card]` |
| `p0-4-account-email.mjs` | P0-4 — signup/verify, then a decoy email raced against auth (the S109 guard) | `node qa/p0-4-account-email.mjs` |

The `<testmail-tag>` for an order is in its P0-1 run's `findings.json`.
`p0-1-newborn.mjs` is the original calibration script, superseded by `p0-1-template.mjs`.

### P1 staff-side suite (S125)

| Script | Case | Run |
|---|---|---|
| `p1-staff-10-issue.mjs` | P1-10 — customer reports an issue → status `issue` + dashboard flag (+ the S114 post-approval branch) | `node qa/p1-staff-10-issue.mjs <AEV-nnn>` (order must be `review_sent`) |
| `p1-staff-11-pdf-unsaved.mjs` | P1-11 — Generate PDF on an **unsaved** book is blocked, not a 0% hang | `node qa/p1-staff-11-pdf-unsaved.mjs <AEV-nnn>` |
| `p1-staff-12-pdf-large.mjs` | P1-12 — Generate PDF on a **GB-scale** order; records duration + total photo bytes | `node qa/p1-staff-12-pdf-large.mjs <AEV-nnn>` |
| `p1-staff-13-staff-as-customer.mjs` | P1-13 — a staff-allowlisted account on `account.html` + a customer preview (privilege-leak check, both directions) | `node qa/p1-staff-13-staff-as-customer.mjs <AEV-nnn>` |

`firestore.mjs` — read-only Firestore + GCS-**metadata** helper (`orderState`,
`orderPhotoBytes`) used by the P1 scripts. Pass criteria like "status flipped to `issue`"
and "the render finished" live in Firestore, not the DOM, and the dashboard is a module
script so its `allOrders` is **not** reachable from `page.evaluate()`. `orderPhotoBytes()`
lists object metadata only — it never downloads an object, so it costs **no GCS egress**.

### P1 promo track (S125/S127)

Catalogue: P1-1..4, the ADR-0008 money-path regression. `p1-promo-adr8.mjs` is current —
code entry happens on OUR pay page (`customer-preview.html` `#promo-input`/`#promo-apply`),
not in Stripe's hosted checkout. `p1-promo-pay.mjs` predates ADR-0008 and targets Stripe's
now-disabled hosted promo field — **STALE**, do not copy selectors from it.

| Script | Case | Run |
|---|---|---|
| `p1-promo-referrer.mjs` | Set up (or re-check) a referrer account + share code | `node qa/p1-promo-referrer.mjs` (fresh account) · `--check` (re-read the same account) · `--tag <tag>` (sign up under a SPECIFIC `address(tag)` instead of a generated one — needed to become the account holder of an existing order's email, e.g. for a self-referral test) |
| `p1-promo-adr8.mjs` | Apply a code on the pay page, optionally pay | `node qa/p1-promo-adr8.mjs <AEV-nnn> [CODE] [testmail-tag] [--approve] [--expect-denied] [--no-pay] [--expect-percent N] [--expect-amount N]` |
| `p1-promo-stripe.mjs` | Read-only — list/lookup live coupons + promotion codes in Stripe TEST | `node qa/p1-promo-stripe.mjs [codeToLookUp ...]` |

### Engine render smoke tests (local, no order, no backend)

These drive the staff engine in **Local** mode against `qa/test-photos/` — no order is minted,
nothing is written to Firestore, no email is sent. They need `npx serve . -p 8080` running.

| Script | What it does | Touches staff? | Template-coupled? |
|---|---|---|---|
| `debug-all-templates-render.mjs` | **Run this after ANY `template-engine.html` edit.** Renders **all six** templates (cover photos uploaded FIRST, every functional page ticked) and fails on any pageerror. The guard for shared-engine code — `renderCover` / `renderSpread` / the photo allocator / `buildBookSequence` are shared, so a change made for one template silently breaks another. Added S129, after three pre-existing bugs turned out to hit *every* template. Exits non-zero on failure. | no | template-agnostic |
| `debug-joyride-render.mjs` | Joyride's own gate: asserts 4 cover slots with 4 photos placed, SP7–SP9 reachable, the M page (SP4/SP8 right) gets 1 vertical + 1 horizontal, Intro shows 2 text panels, the FP1 map draws a region image + pins + itinerary panel, 0 pageerrors. | no | **Joyride** |
| `debug-tender-render.mjs`, `debug-wander-render.mjs` | ⚠ **STALE selector.** Both tick functional pages via `.fp-toggle` / `#local-fp-list` — **neither exists in the markup**, so they have silently *never* enabled an FP. The live checkbox group is `#fp-group`. Superseded by `debug-all-templates-render.mjs`. | no | per-template |

**A render smoke test cannot see a wrong colour, size, or position** — it only proves nothing
threw. Two S129 bugs (text panels ignoring their CSV colour; a cover photo clipped off the
canvas) passed every automated gate and were caught only by screenshotting and *looking*. When
geometry or styling is in question, render an image and read it.

### Older scripts

| Script | What it does | Touches staff? | Template-coupled? |
|---|---|---|---|
| `order-journey.mjs` | Mints a fresh order via the **Scribble** product flow (uploads `DTS_PARENTHOOD` photos, configures all 5 special pages), screenshots each milestone. Leaves a real `AEV-xxx` in Firestore. **STALE** — predates the multi-step wizard; do not copy selectors from it. | no | **Scribble-specific** |
| `order-80-fp1-fp5.mjs` | Same idea, but an 80-page order with only FP1+FP5. Records GCS upload duration. | no | **Scribble-specific** |
| `staff-customer-chain.mjs` | Picks up an **existing** order (`$env:QA_ORDER`) and drives the rest: staff login → load in engine → save → dashboard generate-preview-link → customer approve → Stripe pay → confirm paid. Status-aware (won't re-approve a paid order). | yes | template-agnostic |
| `downstream-chain.mjs` | Like the chain above but **skips the engine load+save leg** — picks up an order whose book the staff already saved in their own browser, drives only generate-link → approve → pay. Use this so an automated run can't clobber the staff's creative edits via a save-before-render race. | yes | template-agnostic |
| `probe-photos.mjs` | Read-only. Loads a public customer-preview token, waits generously, reports real photo-load state. Tells "product bug" from "screenshot timing". | no | template-agnostic |
| `verify-completeness.mjs` | Read-only. Confirms `checkBookComplete` is wired and a known-complete book evaluates as complete. | no | template-agnostic |
| `inspect-shapes.mjs` | Read-only. Dumps `customerBookAssignments` placed/null counts + DOM slot state for a token. Diagnoses empty-render / corrupted-fixture cases. | no | template-agnostic |
| `order-hardening-mock.mjs` | **Local + fully mocked** — intercepts every backend call (`createUploadSession`, signed-URL PUTs, `confirmUpload`, `convertHeic`) so **no real order is created and no email is sent**. Drives the real order form to verify the order-flow-hardening client chunks: email validate+normalise (Ch1), upload `res.ok`+success-gate (Ch2), `beforeunload` (Ch3), `confirmUpload` wiring incl. *not* called on failure (Ch5), low-res 1575px + HEIC "No preview" (Ch6). Exits non-zero on any failure. Needs a local static server that preserves query strings on `.html` — use `npx http-server . -p 8080 -c-1` (NOT `npx serve`, which 404s/strips query locally). Run: `node qa/order-hardening-mock.mjs`. | no | Scribble form |
| `map-smoke.mjs` | Screenshots all 6 Wander region maps (`qa/map-smoke.html`) with every pin via `map-render.js`. Verifies the region SVGs render + pins land. Artefacts → `sessions/qa-runs/map-smoke/`. | no | **Wander map** |
| `order-map-preview.mjs` | Drives the Wander order form to the FP1 country-select and verifies the real region map + pins render in the order preview. | no | **Wander map** |
| `map-tester.html` | Interactive (not a script — open `http://localhost:8080/qa/map-tester`): pick region, toggle countries, centre/tip anchor toggle. For eyeballing pin calibration. | no | **Wander map** |

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

### Added S125 (each of these cost a run)

- **Firebase auth persists per ORIGIN, across pages in the same browser context.** Signing
  into the **engine** therefore also signs you into the **dashboard**: its lock overlay
  hides itself the moment `onAuthStateChanged` resolves. A script that logs in
  unconditionally races that and `click('.lock-btn')` times out on a now-hidden button.
  **Guard it:** only log in if `#app` is not already visible. (Fixed in `p0-2-preview.mjs`.)
- **The dashboard's PDF cell is rewritten asynchronously.** `updatePdfLinks()` runs a round
  trip *after* the row paints and swaps "Generate PDF" for Preview/Print + "Regenerate PDF".
  Grab the button as soon as it appears and your handle detaches mid-click. Wait for the
  cell's button set to stop changing first.
- **Never `import()` firebase-auth inside `page.evaluate()`** — you get a fresh module
  instance with no initialised app (`No Firebase App '[DEFAULT]'`). To call an authed
  endpoint from the page, read the persisted token:
  `JSON.parse(localStorage['firebase:authUser:…']).stsTokenManager.accessToken`.
- **The dashboard is a module script**, so `allOrders` is module-scoped and **not** on
  `window`. Don't try to scrape it from `page.evaluate()` — read Firestore instead
  (`qa/firestore.mjs`).
- **Cloud Logging is closed to us**: the service-account key returns `403 Permission denied
  for all log views`. You cannot verify a Cloud Function's side effects (e.g. mail to
  `support@aevia.at`) from the logs — and `reportOrderIssue` swallows mail errors and still
  returns 200, so a 200 proves nothing about delivery.

### Added S124 (each of these cost a run)

- **`waitForEmail()` LONG-POLLS** (`livequery=true`): the server holds the connection open
  until mail arrives, so on an inbox that never receives anything the `fetch` hangs and the
  function's own timeout **never fires**. To assert an inbox is **EMPTY**, use `getEmails()`
  (plain snapshot) after a grace period — never `waitForEmail()`.
- **Brevo rewrites every email link** into a click-tracking redirect (`sendibt*.com/tr/cl/…`),
  so the raw HTML never contains your URL. **Follow** the link and assert where it lands;
  never string-match hrefs.
- **The dashboard holds an open Firestore listener**, so `networkidle` NEVER fires — `goto`
  with `domcontentloaded` and gate on elements. Its rows also paint asynchronously: wait for
  the *order's row text*, not just the first `<tr>`, before probing its buttons.
- **Playwright auto-DISMISSES native dialogs** (= Cancel). This path has three (incomplete-book
  confirm on save, send-preview confirm, post-send alert) — without `page.on('dialog', d =>
  d.accept())` the save and the send **silently no-op**.
- **Both preview buttons are on the DASHBOARD**, not the engine. The engine only saves book state.
- **Stripe Checkout**: collects a shipping address, and the card fields do not exist until the
  Card accordion row is opened. Its overlay button reports itself *invisible* to Playwright
  while still intercepting clicks → dispatch via `$eval(el => el.click())` on
  `[data-testid=card-accordion-item-button]`. Fields then mount in the **main** frame (no iframe)
  as `#cardNumber` / `#cardExpiry` / `#cardCvc`.
- **All 5 templates use `.sp-card`** (an earlier note claiming scribble uses `.addon` was wrong).
  Click the **card** element, not coordinates — a coordinate click hits `.sp-thumb`, which
  `stopPropagation()`s and only opens the preview.
- **Photo libraries are mixed JPG + PNG** (the form accepts both). A jpg-only glob leaves every
  template except newborn short of its exact photo target — and the count must match **exactly**.
- **Wander**: has NO cover photo (`cover.slots: []` → `#dz-cover` never renders), and its country
  `<select>` ignores a programmatic `selectOption()` unless `dataset.touched` is set first
  (an anti-Chrome-autofill guard in `onCountryPick`).

### Older

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
