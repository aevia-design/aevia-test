# Brief: Solo-founder ops — knowing when Aevia breaks

**Created:** 2026-07-13
**Objective:** Give a one-person business a way to find out that something is broken **before a customer does**, with alerts that reach the owner's phone, recovery paths he can execute alone, and no recurring cost beyond a few euros a month.
**Audience:** The developer (Claude) implementing it, and the owner (Evgeny) who will receive the alerts and act on them; non-technical, so alerts must say what broke in plain language and what to do about it.
**Applicable Standards:** project `CLAUDE.md` conventions, cost-awareness rule (`CLAUDE.md`), existing `qa/` Playwright harness conventions (`qa/README.md`).

## Why

After launch there is no team, no on-call rota, and no ops function. The owner's question was "what if the website is down — how would I know?" The honest answer today is: **he wouldn't**, until a customer emailed him.

But "the website is down" is the *least* likely failure. The site is static files on Cloudflare's CDN; it essentially does not go down, and if it did, we could not fix it anyway. The failures that will actually cost Aevia a customer are **silent** — the site looks perfectly healthy while the machinery behind it has stopped:

- **Brevo quietly stops delivering.** Already happened once: mail showed Sent + Error, never Delivered, until `aevia.at` was domain-authenticated (`project_brevo_sender_auth`).
- A Cloud Function starts throwing on new orders and orders vanish.
- A Stripe webhook fails and a paid order never advances past `paid`.
- The GCP card is declined, the project suspends, and **everything** dies at once.
- An expired credential or a bad deploy breaks the PDF renderer.

A ping monitor detects none of these. So the work is deliberately weighted away from uptime checks and toward **detecting silent failure on the money path**.

## Approach (decided direction)

Four layers, cheapest and highest-value first. Explicitly **not** an SLA, a status page, or an on-call system — those are organisational answers to a problem this business doesn't have.

**1. Daily synthetic order (the one that matters).** Aevia already has the hard part: `qa/p0-1-template.mjs` and its siblings drive a real order end to end through the live site. Schedule one of them on a **GitHub Actions cron**, once a day, against the live site. If it fails, the owner gets an alert. This catches "orders are silently broken" within 24 hours — the failure that actually loses a customer — and is mostly reuse of existing work.

**2. Uptime ping (cheap insurance).** UptimeRobot or Better Stack free tier: homepage plus one lightweight Cloud Function health endpoint, every 5 minutes, alerting to the owner's phone. Low value, but it is the literal answer to "how would I know if the site is down."

**3. Blast-radius alerts.** A GCP **budget alert** (so a declined card or a runaway cost cannot kill the project unannounced) and a **log-based alert** that emails the owner when a Cloud Function throws. Both are console settings, both free.

**4. Recovery, not prevention.** Firestore backup (PITR or scheduled export) because a wiped Firestore is the **only unrecoverable failure** — everything else can be redeployed in ten minutes. Plus a written, plain-language runbook: what to check first, how to roll back a Cloudflare Pages deploy (one click), how to redeploy functions from a git tag.

**On SLAs:** do not promise uptime; promise **response time**. Aevia has a human in the loop by design — staff design the book, the customer approves. Nobody is harmed by two hours of downtime at 3am. What customers care about is "someone replies to me and my book arrives." Commit to that.

## Requirements

**Synthetic order check:**
- [ ] One existing `qa/` order script is adapted to run unattended (no local photo dependency, or photos committed/fetched in CI)
- [ ] It runs on a GitHub Actions cron, once daily, against the live site
- [ ] It creates a clearly-marked test order and does **not** leave junk that a real staff member must clean up (either self-cleans, or the order is trivially identifiable and the cleanup is documented)
- [ ] It asserts the **full money path**, not just page load: order submitted → Firestore doc created → confirmation email delivered
- [ ] Failure sends an alert the owner will actually see on his phone (not just a red tick in a GitHub tab he never opens)
- [ ] The run does **not** hit live Stripe with a real charge (test mode, or stop before payment — decide and document which)

**Uptime + errors:**
- [ ] External uptime monitor on the homepage and one Cloud Function endpoint, ≤5 min interval, phone alert
- [ ] A minimal `health` Cloud Function endpoint exists if one is needed (cheap, no Firestore reads on every ping)
- [ ] GCP log-based alert emails the owner on Cloud Function errors, with sane grouping so one bad hour is not 400 emails
- [ ] GCP billing budget alert at a threshold the owner sets, warning **before** suspension

**Data durability:**
- [ ] Firestore PITR or scheduled export is enabled, with the retention window and monthly cost stated in plain language
- [ ] It has been proven by restoring/reading back at least once — an untested backup is not a backup

**Runbook:**
- [ ] A short `docs/runbook.md`: the 5 most likely failures, how to recognise each, and the first thing to do — written for the owner, not for an engineer
- [ ] Includes: rollback a Pages deploy, redeploy functions, check Brevo delivery, check Stripe webhook status, what to do if the GCP project suspends
- [ ] Names the third-party dependencies that can break Aevia from the outside: Brevo, Stripe, HP Site Flow, and the fact that email logos must be served from Aevia's own domain (see `docs/briefs/domain-migration.md`)

## Constraints

- **Cost ceiling: a few euros a month, and it must be stated up front.** Uptime monitor: free tier. GitHub Actions: free tier. GCP alerts: free. Firestore PITR/export: small but non-zero — quantify it in plain language before enabling. Anything that would exceed this gets flagged, not built.
- **The daily synthetic order must not create GCS egress on the owner's bill** — no local PDF renders, no bulk photo downloads (`feedback_no_local_pdf`). Keep the test photo set small.
- **No new frameworks or paid SaaS.** Reuse `qa/` and the free tiers.
- **Out of scope:** a public status page, an on-call rota, formal SLAs/SLOs, uptime percentage targets, third-party APM, and client-side analytics (parked separately).
- **Out of scope:** fixing the failures this surfaces. This brief builds the smoke alarm, not the fire brigade.

## Success Criteria

The work is complete when:
1. The owner's phone receives an alert within ~10 minutes of the live site becoming unreachable (verifiable by deliberately pointing the monitor at a broken URL once).
2. Deliberately breaking the order path (e.g. a bad function deploy to a staging path, or a forced failure) causes the daily check to fail and alert — proven once, not assumed.
3. The owner can state, without asking anyone, what he would do in the first five minutes of each of the five failures in the runbook.
4. Monthly cost of the whole setup is written down and is under the agreed ceiling.
5. All requirements above are checked off.

## References

**Existing harness:** `qa/README.md`, `qa/p0-1-template.mjs`, `qa/p0-3-payment.mjs`
**Related briefs:** `docs/briefs/order-flow-failure-map.md`, `docs/briefs/order-flow-hardening.md`, `docs/briefs/domain-migration.md`
**Memory:** `project_brevo_sender_auth`, `feedback_no_local_pdf`, `reference_gcloud_python`, `reference_codespace_tooling`
**Architecture:** `ARCHITECTURE.md` (data flow, failure surfaces)

## Context

**Background decisions:**
- `docs/briefs/order-flow-failure-map.md` already exists and maps how orders fail. This brief should **consume** it rather than re-derive the failure list — start there.
- The `qa/` harness is mature and full of hard-won gotchas (`qa/README.md`). Reuse its techniques; do not write a parallel test rig.
- The business is human-in-the-loop by design. Hours of downtime are survivable; a lost or silently-failed order is not. Weight the work accordingly.

**Known risks:**
- **Alert fatigue kills monitoring.** If the daily check is flaky, the owner will start ignoring it and the whole thing is worthless. A flaky check is worse than no check — invest in making it stable, and prefer fewer, more meaningful alerts.
- Test orders land in the **live** Firebase project. Whatever the daily check creates must be unmistakably a test and must not pollute the real order list or the staff dashboard.
- Fresh Codespaces have no Playwright browsers / gcloud / firebase-tools (`reference_codespace_tooling`); CI must install its own.

## Open Questions (owner)

1. **Where should alerts land?** Email only, or email + phone push/SMS? (Recommendation: push to phone — an email alert at 2am that you read at 9am is the same as no alert for the one failure where minutes matter, a suspended GCP project.)
2. **What GCP budget threshold** should trigger the billing alert — and is there a monthly figure above which you want to be woken up?
3. **Does the daily synthetic order go through real Stripe payment** (a €0.50-ish real charge you'd refund, proving the *whole* path) or stop just before payment (free, but leaves the payment step untested daily)? Recommendation: stop before payment daily, and run the full paid path manually before each release.
