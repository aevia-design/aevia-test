# Business & Legal Facts — Aevia

Reference facts for the Impressum, Datenschutzerklärung (privacy policy), and AGB
(terms & conditions) pages. Source of truth for anything that must be legally
accurate on the site — update this file first, then the pages that quote it.

## Entity
- **Legal name (current):** Evgenii Miasin e.U.
- **Trading as:** Aevia
- **Status:** "Aevia" is not yet the registered legal name — the owner is in the
  process of adding it to the Firmenbuch (trade name amendment). Once that lands,
  this becomes **Aevia e.U.** — update this file and all three legal pages the
  same day the registration confirms. Until then, the Impressum MUST show
  "Evgenii Miasin e.U." as the legal entity (showing "Aevia e.U." before
  registration completes would misstate the registered name).
- **Legal form:** e.U. (Einzelunternehmen — Austrian sole proprietorship)

## Address
Bloch-Bauer-Promenade 20/18, 1100 Wien, Austria
*(Note: functions/email.js already publishes this as "Bloch-Bauer-Promenade 20/18,
1100 Vienna, Austria" — keep the two in sync; the /18 unit was in the emailer but
dropped from the address given in chat, using the emailer's fuller version.)*

## Registration numbers
- **UID / VAT ID:** ATU83177107
- **GISA number:** 39598240 (already public — used in transactional email footers
  since S105/S106, and referenced in `docs/briefs/domain-migration.md` for
  LocalBusiness schema)

## Privacy contact (Datenschutz)
- **Name:** Evgenii Miasin
- **Contact:** support@aevia.at (existing shared inbox — no separate privacy@
  address exists yet; simplest to route through the one inbox already staffed)
- GDPR's Art. 13 minimum is a name + a reachable contact method — no phone or DPO
  is required at this scale (sole proprietor, no systematic large-scale
  processing). If order volume grows enough to require a formal DPO, revisit.

## Third-party processors (for the Datenschutz page's "who we share data with")
Derived from the codebase, not asked — verify before publishing:
- **Stripe** — payment processing (checkout, cards)
- **Firebase / Google Cloud** — auth, Firestore (orders, accounts), Cloud Storage
  (photo uploads), Cloud Run (PDF rendering) — see `project_aevia` memory / ADR-0005/0006 for regions
- **Brevo** — transactional email delivery (see `project_brevo_sender_auth` memory)
- **OpenAI** — AI caption generation (Stage 5, not yet live) — only relevant once shipped
- **Printsmarter** — print fulfilment partner (receives finished book files + shipping address once integration goes live — not yet deployed)

## Open items before these numbers can be trusted on a live legal page
- [ ] Confirm the Firmenbuch registration date once it lands, then flip entity name to "Aevia e.U."
- [ ] Confirm the /18 unit number is correct for the registered address
- [ ] Decide if a dedicated privacy@aevia.at inbox is worth creating, or support@ stays the contact
