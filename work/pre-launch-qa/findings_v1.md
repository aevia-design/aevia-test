# Pre-Launch QA — Findings Log

Triage doc for the owner. One row per confirmed finding, newest batch first.
Severity per `case-catalogue_v1.md`: **S1** blocker · **S2** major · **S3** minor.

---

## Batch 5 — P0-4 account email vs autofill (S124, 2026-07-13)

Guards the S109 bug (autofill's stale address hijacked a signed-in customer's order).
Script: `qa/p0-4-account-email.mjs`.

**PASS — 0 findings.** Created a real verified account, then placed a newborn order with a
decoy address injected into `#inp-email` **before** `onAuthStateChanged` resolved — exactly
when Chrome autofills.

| Check | Result |
|---|---|
| Signup → verification email (`noreply@aevia.at`) → link → verified | ✅ |
| Decoy injected pre-auth | account email **won the race**; field `readOnly=true` |
| Email at submit time | still the account email |
| Order AEV-059 confirmation | landed in the **account** inbox |
| Decoy inbox | **empty** — nothing misrouted |
| "My orders" | AEV-059 **linked to the account** |

Signup + verification + sign-in all worked, so **P1-5 effectively passes** here too.

**P0 IS NOW COMPLETE — all four cases green.**

### QA-infra gotcha (cost two hung runs)

`waitForEmail()` uses testmail's `livequery=true`, which **long-polls**: the server holds the
connection open until mail arrives. On an inbox that never receives anything the `fetch`
just hangs and the function's own timeout never fires. **To assert an inbox is EMPTY, use
`getEmails()` (a plain snapshot) after a grace period — never `waitForEmail()`.**

---

## Batch 4 — P0-3 approve + pay (S124, 2026-07-13)

Full money path on AEV-054 (wander), fresh from P0-2. Stripe **test mode** — no real money.
Script: `qa/p0-3-payment.mjs <AEV-nnn> <testmail-tag> [card]`.

**PASS — 0 findings.**

| Step | Result |
|---|---|
| Customer opens preview | book renders |
| "Approve & confirm" | → status `approved`, Pay button revealed |
| Pay button label | **"Pay now · €70"** (price carried from order time) |
| Stripe Checkout | session created, **Total due €70.00** |
| Test card `4242…` | accepted, redirects back to the preview |
| Order status | → **`paid`** (webhook fired) ✓ |
| Payment email | *"Payment received for your Aevia order AEV-054"* ✓ |

Re-approving an already-approved order is correctly a no-op — the button locks to
"Approved ✓" and the page goes read-only (this is P2-9, passing early).

### Observations — not defects, but worth a decision

- **Stripe Checkout now collects a shipping address** (name, address, postal code, city;
  Austria pre-filled) and shows **no delivery line** — total = book price only. Consistent
  with delivery fee still being TBD, but the customer gives an address and is charged
  nothing for shipping. Confirm that is intended before launch.
- **Payment methods offered:** Card, Bancontact, MB WAY, Klarna, with EPS buried under
  "More payment methods". Bancontact (BE) and MB WAY (PT) are prominent while **EPS — the
  Austrian one — is hidden**. Worth reordering in the Stripe dashboard for a DACH audience.
- Stripe warns in console that `link`, `klarna` and `amazon_pay` are **not activated** — they
  show in test mode but will be hidden in live. Informational.

---

## Batch 3 — P0-2 staff preview flow (S124, 2026-07-13)

Ran the full staff journey on AEV-053 (newborn): engine deep-link → auto-layout → save
book state → generate preview link → send preview → customer opens the emailed link.
Script: `qa/p0-2-preview.mjs <AEV-nnn> <testmail-tag>`.

**PASS — 0 findings.** Every step green:

| Step | Result |
|---|---|
| Engine loads order (`?order=AEV-053`) | 51 photos into the pool |
| Auto-layout → `checkBookComplete()` | **COMPLETE straight after load** — no manual design needed |
| Save book state | `Saved ✓` |
| Generate preview link | token minted, Send button appears |
| Send preview to customer | confirm → `Preview sent to …` |
| Order status | → **`review_sent`** ✓ |
| Preview-ready email | *"Your Aevia preview is ready — AEV-053"* from `Aevia <orders@aevia.at>` |
| "View your book" link | lands on `customer-preview?token=…`, **54 photos render** |

Resend is safe: a second run re-sends and the button correctly reads "Resend preview".

### Ruled out — correct behaviour, no action

- **Dashboard console `TypeError: Failed to fetch` on every order's PDF check.** Looked
  like a CORS fault. It is not: on a clean dashboard load **all 96 `getPdfUrl` calls
  return 200** (48 orders × preview+print). The errors only appear when a script reloads
  or closes the page while those fetches are in flight — aborted requests, harness-only.
- **Brevo rewrites every email link** into a click-tracking redirect
  (`sendibt3.com/tr/cl/…`), so the raw HTML never contains `customer-preview`. Not a
  broken link — any test must FOLLOW the link rather than string-match it.

---

## Batch 2 — P0-1 across all 5 templates (S124, 2026-07-13)

Ran the full customer order (configurator → wizard → cover → special pages → photos →
submit → confirmation email → staff dashboard) once per template against the live dev
site. Script: `qa/p0-1-template.mjs <template>`.

| Template | Order | Email | Dashboard | Verdict |
|---|---|---|---|---|
| newborn  | AEV-053 | ✅ | ✅ | **PASS** (0 findings) |
| wander   | AEV-054 | ✅ | ✅ | **PASS** (0 findings) |
| scribble | AEV-055 | ✅ | ✅ | **PASS** (0 findings) |
| papercut | AEV-056 | ✅ | ✅ | **PASS** with 1 × S2 (below) |
| tender   | AEV-057 | ✅ | ✅ | **PASS** (0 findings) |

P0-1 is **green on all five templates**. Console clean on every run; no HTTP errors.

### 🟠 F-001 (S2) — Papercut cover: "album name" field silently truncates at 10 characters

**What happens.** On the papercut order form, typing an album name into the field
labelled **"Front — album name"** (`#cover-cap-name`) cuts it off at 10 characters with
no warning. Typing `Our sweet Ann` stores `Our sweet ` — the customer's name is
mangled and nothing tells them.

**Root cause.** In `assets/Template_Papercut/papercut-data.js:34-35` the `year` and
`name` captions have each other's `placeholder`, `maxLength` **and** geometry. Compare
with scribble, its structural twin, which is correct:

| | scribble (correct) | papercut (swapped) |
|---|---|---|
| `year` | placeholder `2026`, maxLength **10**, width 180mm | placeholder `Our sweet Ann`, maxLength **60**, width **120mm** |
| `name` | placeholder `Our sweet Ann`, maxLength **60**, width 180mm | placeholder `2026`, maxLength **10**, width **60mm** |

So in papercut the `key`+`label` pair say one thing while the
`placeholder`+`maxLength`+cover geometry say the opposite. The wide, bold, 60-char slot
is keyed `year`; the narrow 10-char slot is keyed `name`.

**Which is wrong?** Most likely the **`key`/`label` pair is swapped**, not the geometry:
the wide bold slot (`xMm 301, wMm 120, 26pt bold`) is physically where a *name* belongs,
and its placeholder and 60-char limit agree. Two of the three signals point the same way.

**STATUS — half fixed, one open question.** The owner corrected the CSV (option **b**):
`year` → `2026`/10, `name` → `Our sweet Ann`/60, and `papercut-data.js` is synced to match.
The truncation is **gone** (verified locally: typing `Our sweet Ann` into `#cover-cap-name`
now stores it in full). 186/186 tests pass.

**Still open — the name is now in the wrong box on the cover.** Rendering the caption boxes
over the artwork (`sessions/qa-runs/2026-07-13-papercut-cover/papercut-caption-boxes.png`)
shows the two captions sit side by side on one line under the photo:

- `name` is the **narrow 60mm box hard against the right cover edge** (trim 342–402mm, just
  7mm of clearance). Its own placeholder "Our sweet Ann" fits with **1px to spare**;
  anything longer overflows the book.
- `year` gets the **wide 120mm box** (trim 223–343mm), where "2026" uses 55px of 360px.

The boxes cannot simply be widened: at centre 372mm a 120mm `name` box would end at 432mm,
**23mm past the 409mm trim edge**.

So the deeper mix-up is the **`key`/`label` pair**, not the placeholders. Reading the
artwork, the layout wants *name (wide, left) → year (narrow, right)*.

**RESOLVED (owner, S124) — no further change.** The owner's cover art confirms the layout is
**year left, name right**, so the keys/labels were right all along; only the placeholder and
maxLength were swapped, and that is now fixed. He has decided to **keep `maxLength: 60`** on
the name — album names can legitimately be long.

**Residual, accepted:** a name longer than ~12 characters will not fit the 60mm slot and
will wrap or overflow toward the cover edge. Mitigation is manual: the staff engine's
per-caption font-size/position overrides let the designer shrink a long name by hand. Worth
Xenia eyeballing the cover on any order with a long album name.

**Repro:** `node qa/p0-1-template.mjs papercut` → see run log, cover step.
**Artefacts:** `sessions/qa-runs/2026-07-13-p0-1-papercut/` (`03-cover.png`, `run-log.txt`).

### Ruled out — correct behaviour, no action

Four things looked like findings and are not. Recorded so they aren't re-raised:

- **Low-res badges (wander, 6 of 52).** True positives. 7 of the 57 wander source images
  are `_upscaled` files at 1024px on the short side, under the ~1575px print threshold.
  The guard flagged exactly the right ones.
- **Pre-submit warning modal (scribble, papercut, tender).** Fires correctly. The warning
  is *"your cover photo is the wrong orientation … it will be cropped to fit"* — the
  harness picks an arbitrary photo as the cover, so it often mismatches. Note the modal's
  low-res count spans cover + special + main photos, so it can open with **zero** badges in
  the main grid.
- **GCS `ERR_ABORTED` uploads (~50 per order).** Absorbed by the 3-attempt retry in
  `order.html:2255`; every file lands and the success screen renders. **Still worth a
  deliberate throttled-network test (P2)** — the abort rate is high on a fast link, and a
  slow customer connection could plausibly exhaust the retries.
- **Newborn has no labour-name input.** By design — the name comes from the cover text
  (`order.html:1143`).

---

## Batch 1 — P0-1 calibration, newborn (S122, 2026-07-13)

### ✅ F-000 (S1) — Staff allowlists had drifted — **FIXED + DEPLOYED (S124)**

`claude-test@aevia.at` was added to `STAFF_EMAILS` in `functions/index.js` but not to
`firestore.rules`. The dashboard reads Firestore directly from the browser, so the rules
gate it: staff login succeeded but the orders query was denied. Fixed in `firestore.rules`
and deployed by the owner; the dashboard now loads and shows every test order.

**Standing rule:** any staff-account change must touch **both** files.
