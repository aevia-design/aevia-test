# Brief: Branded, deliverable customer email

**Created:** 2026-07-02 (session 102)
**Objective:** Every email Aevia sends or receives — order emails, account emails, contact/artist enquiries — is branded `@aevia.at`, lands in the inbox (not spam), routes to the right human, and reads well. Minimum extra cost.
**Audience:** Developer (future Claude session) implementing this on the Aevia codebase.
**Applicable Standards:** `CLAUDE.md` (cost-awareness, backend-first deploy discipline), `ARCHITECTURE.md`.

## Why

Today's email is a liability, not a brand touchpoint. Automated mail goes out via personal Gmail SMTP (`evg.myasin@gmail.com`) and Firebase Auth's default domain (`noreply@aevia-uploads.firebaseapp.com`) — neither branded, and the Firebase one is already landing in customers' spam. There's one real mailbox (`xenia@aevia.at`) but no system for routing different kinds of mail to it, no customer-facing contact channel besides the artist form, and two known gaps in the order journey (no post-payment confirmation, no stale-preview reminder). This brief exists because the fix touches DNS, a paid mailbox, a new third-party service, and five separate code touchpoints — worth planning once rather than patching piecemeal.

## Key facts about the existing system (do not re-derive)

Full inventory from a S102 codebase audit:

- **`functions/upload.js`**: `createUploadSession` sends a staff notification (order intake) to `EMAIL_NOTIFY` (`xenia@aevia.at`); `confirmUpload` sends the customer's order-confirmation email to `order.email`. Both via nodemailer + Gmail SMTP, `from: EMAIL_USER` (personal Gmail).
- **`functions/index.js`**: `stripeWebhook` sends a staff payment-received notification to `EMAIL_NOTIFY`. `submitArtistApplication` sends artist enquiries to a hardcoded `xenia@aevia.at`. Both same Gmail SMTP path.
- **Credentials**: `functions/.env` — `EMAIL_USER` (Gmail account), `EMAIL_PASS` (Gmail app password), `EMAIL_NOTIFY` (`xenia@aevia.at`). No retry queue; **silent failure on bad credentials** (bit us once before, per `ARCHITECTURE.md`).
- **Firebase Auth** built-in emails (signup verification, password reset) send from the default `noreply@aevia-uploads.firebaseapp.com`, triggered client-side via `sendEmailVerification()` in `pages/account.html`. This is the spam-flagged one.
- **No general contact form exists** — only "Our Artists" (`pages/our-artists.html`) sends mail; the footer "Subscribe" form on multiple pages is a non-functional stub (TO-DOS #24).
- **Known open gaps**: TO-DO #56 (missing post-payment customer confirmation), TO-DO #74 (review the preview-link mechanics in the confirmation email), Chunk-019 in `ROADMAP.md` (unbuilt stale-preview reminder emails).
- **`STAFF_EMAILS` allowlist** (`functions/index.js`) and Cloudflare Access (ADR-0001) both key off `evg.myasin@gmail.com` / `xenia@aevia.at` — unrelated to sending, but any mailbox changes should double check these aren't silently affected.

## Locked decisions (from S102 shaping conversation, verified against primary sources)

- **Split human mail from robot mail.** Keep it as two separate systems that both present as `@aevia.at`:
  1. **Microsoft 365** (existing, `xenia@aevia.at`) — for mail a human reads and writes: contact enquiries, artist/partner applications, replies to order emails. Three aliases, decided S103: `orders@aevia.at`, `hello@aevia.at`, `partners@aevia.at` (no separate `contact@` — redundant with `hello@` while there's no general contact form).
  2. **Brevo** (new, free tier) — for mail the app sends automatically: order confirmations, payment receipts, account verification.
- **Why not just send app mail through M365 SMTP:** confirmed via Microsoft Learn — Basic Auth SMTP submissions start being rejected **March 1, 2026**, ramping to 100% rejection by **April 30, 2026**; fully disabled by default for existing tenants by end of **December 2026**. Building automated sending on that path now means it breaks within months. Separately, mixing bulk/automated sends into a human mailbox risks that mailbox's reputation.
- **Why Brevo specifically:** free tier is 300 emails/day (~9,000/month) — comfortably covers current + near-term volume at zero cost; EU-hosted (Paris HQ, GDPR-native, ISO 27001), 600k+ customers, publicly traded — a mainstream, low-risk choice, not a scrappy startup bet. **Open item:** confirm the free-tier "Brevo branding" add-on-to-remove applies only to *marketing* sends, not *transactional* sends, before committing (unverified as of this brief).
- **Mailbox count: one, for now.** No new paid mailboxes. Add free **aliases** on `xenia@aevia.at` (Microsoft 365 supports up to ~300-400 aliases per mailbox at zero cost, confirmed via Microsoft Learn): `orders@aevia.at`, `hello@aevia.at`, `partners@aevia.at`, `support@aevia.at` (decided S103 — not `contact@`/`artists@` as earlier drafted; `support@` added S103 for customer post-purchase questions). All land in Xenia's inbox; **inbox rules must be set up** to auto-file each alias into its own folder so the shared inbox doesn't become unsorted noise — this is a required part of the rollout, not optional polish. **Done S103:** all four aliases added in M365 admin + a matching Outlook inbox rule (per-alias folder) for each.
- **Aliases are reassignable later at no cost** — if the owner (Evgeny) later gets his own mailbox (e.g. `evgenii@aevia.at`), any alias can be moved or split between mailboxes in the M365 admin panel; today's "everything to Xenia" choice is not a one-way door.
- **Reply-to routing:** app-sent emails (via Brevo) set `replyTo` to the relevant alias (e.g. `orders@aevia.at`), so a customer replying to an automated email lands back in a human inbox, not at Brevo.
- **Firebase Auth:** point it at the custom domain via Firebase's built-in custom-domain support (Console → Authentication → Templates; requires DNS TXT/CNAME verification) rather than rebuilding the auth-email flow. Keep Firebase's built-in templates for Phase 1; a Cloud-Function-triggered custom email (via Brevo) is a Phase-2 option only if design polish becomes a priority.
  - **UPDATE S104:** custom-domain verification fixes the spam-flagged sender but caps out at plain text forever — it is not a stepping stone to a branded email. Owner has since said he wants a properly branded HTML email (like Papier's), not plain text. The "Phase 2 Brevo-routed" option above is now the likely real target, not optional polish — confirm priority/timeline before treating this as done once the custom domain verifies.
- **Cost:** stays at today's baseline, ~$6/month (Xenia's existing M365 mailbox). Brevo free tier, free aliases: $0 additional.

## DNS work required (once, on `aevia.at`)

- **SPF**: single record with two `include` mechanisms — one for Microsoft 365, one for Brevo (e.g. `v=spf1 include:spf.protection.outlook.com include:sendinblue.com ~all` — exact Brevo include value to confirm from their setup docs at implementation time). Stays well under the 10-DNS-lookup SPF limit with just these two.
- **DKIM**: separate DKIM record/selector from each service (Microsoft 365 and Brevo each provide their own) — both get added to DNS, no conflict.
- **DMARC**: one policy record, covers both senders. Start in `p=none` (monitor) mode, tighten to `p=quarantine`/`p=reject` once alignment is confirmed via reports.
- **Firebase custom domain**: separate TXT/CNAME verification per Firebase's custom-domain-for-auth-emails flow.

## Touchpoints and what changes

| Touchpoint | Today | Target |
|---|---|---|
| Order intake → staff | Gmail SMTP → `xenia@aevia.at` | Brevo → `orders@aevia.at` alias |
| Order confirmation → customer | Gmail SMTP | Brevo, `from: noreply@aevia.at` (or `orders@`), `replyTo: orders@aevia.at` |
| Payment received → staff | Gmail SMTP | Brevo → `orders@aevia.at` |
| Post-payment confirmation → customer | **Missing (TO-DO #56)** | New, built alongside this migration since it's the same code path as the others |
| Artist application → staff | Gmail SMTP, hardcoded `xenia@aevia.at` | Brevo → `partners@aevia.at` |
| General contact | **No form exists** | Out of scope for this brief unless the owner wants a contact page built — flagged as open question below |
| Signup verification / password reset | Firebase default domain | Firebase, custom domain `aevia.at` |
| Stale-preview reminder (Chunk-019) | **Unbuilt** | Build on Brevo once the migration lands, not before (avoid building on the path being replaced) |

## Boundaries — what this is NOT

- Not a redesign of email *copy/HTML* beyond what's needed for branding — visual template polish is a follow-on, not blocking.
- Not adding a newsletter/marketing tool (TO-DOS #23-24) — Brevo happens to support that later, but this brief scopes transactional email only.
- Not building a general contact form unless confirmed as in-scope (open question below).
- Not adding a second paid mailbox — single mailbox + aliases only, per the cost-efficiency decision.
- Not touching `customer-preview.html`'s token-based auth or edit/approve flow — unrelated to this work.

## Open questions

1. ~~**Artist-enquiry alias**~~ — **RESOLVED S103:** `partners@aevia.at`, a dedicated generic-collaboration alias (not `hello@`/`contact@`, not `artists@`).
2. **General contact form**: does the site need one (currently only "Our Artists" has a form; footer "Subscribe" is dead)? If yes, scope as part of this work or a follow-on.
3. **Brevo transactional-branding**: confirm at implementation time whether the free tier stamps "sent via Brevo" on transactional emails (vs. only marketing) — affects whether Phase 1 needs the ~$11/month branding-removal add-on.
4. ~~**Inbox rules**~~ — **RESOLVED S103:** owner set these up directly in Outlook (per-alias folders); no separate rule needed for *sent* mail (Outlook's rule engine can't reliably distinguish which alias a message was sent as — a **Search Folder** filtered on `From` is the practical substitute if the owner wants a sent-mail view per alias later).
5. **DDoS/abuse protection**: flagged by the owner as an unknown risk (e.g. the open `submitArtistApplication` CORS endpoint). Worth a lightweight look (rate limiting / reCAPTCHA on public-facing send endpoints) as part of implementation, not fully scoped in this brief.
6. **Customer account password reset**: found S103 — `account.html` has no `sendPasswordResetEmail` call and no "forgot password" UI; customers who forget their password have no self-serve recovery path today. Not in original scope but surfaced during this work; needs a decision on priority.
7. **Alias "From" display bug (found S103, root cause found S104):** sending manually from `support@aevia.at` via Outlook, the recipient sees the message as **from `xenia@aevia.at`**, not the alias. Root cause found S104: the aliases were added in M365 Active Users (Entra ID) but hadn't synced through to Exchange Online yet — confirmed via the OWA compose "From" field, where the alias could be typed manually but was not *selectable* (i.e. not yet recognised by Exchange as an authorized proxy address, so it silently sends as the primary address instead). Not a "Send As"/Delegation permissions issue (that tab is for other people sending as Xenia, not her own aliases). Fix is to wait for the Entra→Exchange sync to complete; re-check the OWA From-dropdown periodically, escalate to Microsoft support if still not selectable 24h+ after the aliases were added. **This only affects manual/human-sent mail from Outlook — automated Brevo sends are unaffected**, since those set `from`/`replyTo` explicitly in code (see `functions/email.js`).

## Suggested phasing

1. **Buy nothing new** — confirm Brevo free-tier transactional-branding question, set up DNS (SPF/DKIM/DMARC), verify domain in Brevo and Firebase. ✅ done S102.
2. **Migrate the four existing Gmail-SMTP sends** (`upload.js` x2, `index.js` x2) to Brevo; add the missing post-payment customer email in the same pass. ✅ built S102, code fixes applied S103 (see below), **deployed S103**.
3. **Add M365 aliases + inbox rules** on Xenia's mailbox. ✅ done S103 — `orders@`, `hello@`, `partners@`, `support@`.
4. **Point Firebase Auth at the custom domain.** Not yet done — next up.
5. **Backend-first deploy** per usual discipline — functions deployed by the owner before any frontend change ships.

## S103 code fixes (post-deploy audit)

Two bugs found reading the S102-built code against the final alias decisions, both fixed and deployed S103:
- `functions/.env` `EMAIL_NOTIFY` was still `xenia@aevia.at` directly, bypassing the `orders@aevia.at` alias entirely — meant the Outlook "Orders" folder rule would never catch staff notifications. Fixed → `EMAIL_NOTIFY=orders@aevia.at`.
- `functions/email.js` `FROM.artists` still routed to `hello@aevia.at` (a stale draft value) instead of the finally-decided `partners@aevia.at`. Fixed.

## Email design/visual approach (decided S103, via `/conducting-research`)

**Decision: author templates in MJML as a design-time-only tool, paste compiled static HTML into `email.js` — no new runtime dependency, no build pipeline added to the stack.**

- Options compared: Brevo's built-in drag-and-drop editor (free but stamps "Sent with Brevo" on the free tier, and templated look doesn't fit the premium/editorial brand), hand-coded raw HTML tables (fragile across Gmail/Outlook/Apple Mail, high maintenance burden for a non-technical team), React Email / Maizzle (both assume a JS build pipeline — a new dependency Aevia doesn't have today), MJML (recommended).
- MJML is used purely as an authoring aid: write `.mjml`, compile via the free web playground at mjml.io (no install required) or the CLI, paste the resulting static HTML into `functions/email.js` as a template string. Nothing new ships to production; the send path stays plain nodemailer + HTML string, unchanged from today.
- Caveat: MJML output can be verbose; long/image-heavy templates risk Gmail's ~102KB clipping limit. Not a concern at the length of a typical transactional email.
- **Not yet built**: the actual template copy/HTML for order confirmation, payment received, and post-payment confirmation. Next session's task.
