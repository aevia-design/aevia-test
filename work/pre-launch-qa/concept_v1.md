# Pre-Launch Exploratory Testing

## What
An orchestrated, mostly-automated exploratory testing pass across the whole Aevia
journey — customer *and* staff side — run by Claude against the live dev site
(`aevia-test.pages.dev`) using a dedicated `claude-test@` staff login and tagged
fake customer accounts. Real occasion photo libraries (provided by the owner) make
the test books genuine enough to eyeball; deliberately-broken inputs are derived
from them. The goal is to find breakages before Friends & Family testers ever see
them. All test data is cleared when the site migrates to `aevia.at`.

## Why
Two-person team (owner + Xenia), no QA function. The owner finds bugs ad hoc but
can't catch them systematically and can't afford to be a full-time tester. F&F
testers are hand-picked first customers — a version that breaks on an obvious edge
case burns goodwill that can't be recovered. This buys a "not raw" baseline before
real people touch it.

## How
- **Orchestrated (foreman + workers).** Claude acts as coordinator: it plans the
  cases, delegates batches to worker subagents (via `orchestrating-work`) that do
  the repetitive clicking and report back a compact findings list, then triages and
  reports to the owner. Keeps the main thread lean and lets runs happen in the
  background. Test-running delegated to the `general-purpose` agent (full tool
  access for Playwright).
- **Automated**, via the existing `qa/` Playwright harness — log in, click through
  the journey, upload photos, pay with Stripe test cards; scripted and repeatable.
- **Real photos.** Owner provides per-occasion libraries (`qa/test-photos/<occasion>/`);
  Claude uses a realistic subset per template and *derives* broken cases (a
  downscaled low-res image, a renamed `.txt`, one large original for the OOM test).
- **Stripe test mode** for all payments (no real money); **fake tagged emails** for
  customer accounts.
- **Email testing** via a free-tier testing-inbox service (e.g. testmail.app): test
  accounts use real, API-readable addresses, so verification / confirmation / preview
  / referral-reward emails are fetched and their links followed fully automatically.
  One manual owner eyeball per email *type* covers cross-client rendering + spam
  placement (which no test inbox can judge). Upgrade to a paid tier only if a
  recurring regression suite is later built.
- **Prioritised** into P0/P1/P2 (below) so we don't boil the ocean.
- **Two approval gates:** (1) this concept; (2) a detailed numbered case catalogue,
  signed off before anything runs at scale.
- **Pacing is a dial the owner holds.** Start gated — one case, report, stop, owner
  checks usage, says go. Widen to autonomous background batches as cost-per-finding
  proves out.
- **Deliverable:** a findings log — each item with repro steps + severity — that the
  owner triages. Claude reports; it does not auto-fix.

### Prioritised test surface
**P0 — the money path (must never break):**
- Place an order in each of the 5 templates: upload → cover text + captions →
  submit → confirmation email + order lands on the dashboard.
- Staff: open the order in the engine → design → Save book state → generate + send
  preview → status flips + email sends.
- Customer: open preview → approve → Stripe checkout (test card) → paid →
  confirmation email.
- Account linking: a signed-in order uses the *account* email, not a browser-autofill
  one (guards the S109 bug that unlinked an order).

**P1 — known sharp edges + accounts:**
- Referral: first order −€10, same email on a 2nd order rejected (S118 fix);
  FRIENDS30 gives 30% off; a plain no-code order still pays cleanly.
- Auth: signup → email-verify gate → sign in; forgot password → branded reset;
  wrong-account email mismatch.
- Preview: Edit vs view-only lock; reposition tracks the cursor incl. Safari +
  scaled book; "Report an issue" → dashboard flag + support email.
- PDF: unsaved-book guard fires; a large pro-camera order renders (or fails loudly,
  not a silent hang).

**P2 — the broad "won't break for many" net:**
- Upload boundaries: too few / too many photos, wrong file type, huge files, delete
  mid-upload, low-res badges.
- Weird input: very long / emoji / special-character names + captions (also catches
  HTML injection in editable fields).
- Flow abuse: double-click pay, back button after paying, expired preview token,
  approving an already-approved order, refresh mid-upload.
- Cross-browser: Safari/WebKit + Chromium, desktop + mobile widths.
- Email: each transactional email lands, correct sender/reply-to.

## Boundaries (what this is NOT)
- Not load/performance testing and not a full security pentest — obvious
  injection/XSS flagged if tripped over, nothing more.
- Not a permanent automated regression suite yet — hardening the worst findings into
  one is a later, separate decision.
- Not testing the print/fulfilment side past "paid" — largely unbuilt.
- Not testing the full checkout total — delivery fee is still TBD (payment *success*
  is tested; the delivery line is deferred).
- Not auto-fixing bugs — Claude reports, owner decides what's worth fixing pre-launch.

## Open Questions
- **Staff credentials** stored in gitignored `qa/.env` (`STAFF_TEST_EMAIL` /
  `STAFF_TEST_PASSWORD`). Resolved.
- **Customer email-verify handling — resolved:** free-tier testing-inbox service
  (testmail.app) gives API-readable addresses, so signup verification and all
  transactional emails are read + links followed automatically. Owner does a one-time
  cross-client rendering/spam eyeball. Revisit a paid tier only if a recurring
  regression suite is built.
- Playwright browsers need reinstalling in this Codespace (one-time setup step).
- Whether to later harden the worst findings into a pre-deploy regression suite —
  decide after seeing the findings.
- Cleanup at migration is three wipes (Firestore + Auth + Storage) + optional counter
  reset — script it and confirm the counter mechanism before launch day.
