# Pre-Launch QA — Case Catalogue v1

Companion to `concept_v1.md`. This is the **sign-off gate**: nothing runs at scale
until the owner approves this list. Each case = an ID, what it does, and what "pass"
means. This is *what* to test, not *how* (selectors/scripts come at build time).

## Fixtures (shared setup)
- **Staff login:** `claude-test@aevia.at` (allowlisted).
- **Customer accounts:** testmail namespace `kidkd` → addresses like
  `kidkd.order01@inbox.testmail.app`, read via API to fetch verification/links.
- **Templates:** newborn, wander, scribble, papercut, tender.
- **Photos:** `qa/test-photos/<occasion>/`; a realistic subset per template.
- **Stripe test cards:** `4242…` success, `4000 0000 0000 0002` decline,
  `4000 0025 0000 3155` 3-D Secure challenge.
- **Site:** live dev site `aevia-test.pages.dev`.

## Severity scale
- **S1 Blocker** — money path broken, data loss, order lost/misrouted.
- **S2 Major** — a real user would hit it and be stuck or misled.
- **S3 Minor** — cosmetic, rare, or easy workaround.

---

## P0 — the money path (must never break)
| ID | Case | Pass = |
|----|------|--------|
| P0-1 | Place a full order in **each of the 5 templates**: upload photos → cover text + captions → submit | order appears on the dashboard; confirmation email arrives (testmail) with correct sender/reply-to |
| P0-2 | Staff opens the order in the engine → designs → **Save book state** → generate preview → **Send preview to customer** | status → `review_sent`; preview-ready email arrives with a working "View your book" link |
| P0-3 | Customer opens the preview link → approves → Stripe checkout with `4242…` → pays | status → `paid`; payment-confirmation email arrives; dashboard shows paid |
| P0-4 | Signed-in customer places an order while a *different* email sits in browser autofill | order uses the **account** email, not the autofill one (guards the S109 unlink bug); order links in "My orders" |

**Calibration run = P0-1 for one template only**, then stop for usage check.

## P1 — known sharp edges + accounts
| ID | Case | Pass = |
|----|------|--------|
| P1-1 | Referral: referrer's share code applied on a **first** paid order | −€10 in Stripe; reward email fires to the referrer; reward code appears in their account |
| P1-2 | **Same referee email** redeems a share code on a **2nd** paid order | code **rejected** (S118 fix) — no second €10 |
| P1-3 | `FRIENDS30` on a normal order | 30% off in checkout |
| P1-4 | Plain **no-code** order pays | pays cleanly — no regression from the referral/customer-attach change |
| P1-5 | Signup → verification email (read via testmail) → click link → sign in | account becomes verified; "My orders" reachable |
| P1-6 | Forgot password → reset email → set new password → sign in | branded in-app reset completes; new password works; security-alert email fires |
| P1-7 | Wrong-account email mismatch (order email ≠ signed-in account) | handled per design (locked to account email when signed in) |
| P1-8 | Preview in **view-only** mode | no photo drag, no caption edit, no slot swap; flip nav still works |
| P1-9 | Reposition (✥) drag in **Edit** mode, incl. Safari/WebKit + a scaled book | photo tracks the cursor 1:1 at every window width |
| P1-10 | Customer "Report an issue" on a `review_sent` order | order flips to `issue`, dashboard flags it, support email fires |
| P1-11 | Generate PDF on an **unsaved** book | blocked with "Save book state first", not a silent 0% hang |
| P1-12 | Generate PDF on a **large pro-camera** order (one big original) | renders successfully, or fails **loudly** with the offending path — never hangs |
| P1-13 | A **staff-allowlisted** account uses the customer preview/account pages | behaves sensibly (no crash, no privilege leak either way) |

## P2 — the broad "won't break for many" net
| ID | Case | Pass = |
|----|------|--------|
| P2-1 | Upload **too few** photos for a template | clear guidance, can't submit incomplete |
| P2-2 | Upload **too many** / delete mid-upload | counts/badges stay correct; drop zone stays usable |
| P2-3 | Upload a **wrong file type** (`.txt`/`.pdf` renamed) | rejected gracefully |
| P2-4 | Upload a **low-res** image | low-res badge shows and persists (survives delete/re-add) |
| P2-5 | **Weird text** in names/captions: very long, emoji, `<script>`/HTML | stored/escaped safely; no injection; layout survives |
| P2-6 | **Double-click** the pay button | one charge, not two |
| P2-7 | **Back button** after paying | no double order / no broken state |
| P2-8 | **Expired / tampered** preview token | rejected, not a data leak |
| P2-9 | **Re-approve** an already-approved order | no-op, no error |
| P2-10 | **Refresh mid-upload** | recovers or fails cleanly, no ghost order |
| P2-11 | **Cross-browser**: WebKit + Chromium × desktop + mobile widths on the customer flow | renders and works in all four |
| P2-12 | **Each transactional email** (confirm, preview, payment, dispatch, reset) | arrives via testmail with correct sender/reply-to; owner does a one-time real-client render/spam eyeball |

---

## Run order & pacing
1. **Calibration:** P0-1 (one template) → stop → owner checks usage.
2. **Widen:** rest of P0 across all templates (background batch) → findings log.
3. **P1**, then **P2**, as batches the owner greenlights.
4. Each batch returns a **findings log**: ID, severity, repro steps, screenshot. Owner triages.

## Out of scope (from concept)
Load/performance, full pentest, print/fulfilment past `paid`, full checkout total
(delivery fee TBD), and auto-fixing bugs.
