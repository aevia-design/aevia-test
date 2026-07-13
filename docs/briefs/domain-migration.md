# Brief: aevia.at domain migration + indexing groundwork

**Created:** 2026-07-13
**Objective:** Serve the live site from `https://aevia.at`, with the marketing pages indexable by Google and AI crawlers, the order flow gated until launch, and `aevia-test.pages.dev` demoted to a `noindex` test rig — all without a minute of mail downtime and without a real customer order arriving before we want one.
**Audience:** The developer (Claude) implementing it, and the owner (Evgeny) who owns the DNS/registrar and Cloudflare accounts; non-technical, needs plain-language steps and explicit "do this in the dashboard" instructions.
**Applicable Standards:** project `CLAUDE.md` conventions, cost-awareness rule (`CLAUDE.md`), `/stop-slop` for customer-facing copy, `seo-technical` + `seo-geo` skills for the indexing work.

## Why

F&F launch is ~1.5 months out (ideal timeline: F&F trial ~Sep 2026). Two things force the domain decision now rather than at launch:

1. **Indexing takes calendar time we can't compress.** A brand-new domain needs weeks to be crawled, indexed and settled. If `aevia.at` goes live the same week we invite testers, we launch into an SEO cold start. Six weeks of quiet indexing is close to free if we start now.
2. **Real orders bake the domain into history.** Transactional emails hardcode `aevia-test.pages.dev` today. Once F&F customers hold emails with preview links, the domain is effectively load-bearing and migrating gets expensive.

The migration itself is low-risk and reversible — a Cloudflare Pages custom domain is **additive** (both hostnames serve, zero downtime; we merely choose which is canonical). The genuinely risky part is **DNS, not the website**: `aevia.at` already carries M365 mail (`xenia@`, `orders@`, `hello@`, `support@`), so a careless nameserver move silently kills Xenia's inbox.

## Approach (decided direction)

**Migrate now; gate the order flow; keep pages.dev as the test rig.**

The owner's concern — "if aevia.at is discoverable, a stranger could place a real order while I'm still testing" — is resolved by separating the two things rather than delaying the migration:

- Google ranks **marketing pages** (home, collections, about, our-artists). Nobody has ever ranked for an order form.
- So: `aevia.at` goes live and the **marketing pages are indexable**, while the **order flow is gated** behind a pre-launch state until F&F opens. Full indexing head start, zero accidental-order risk.
- `aevia-test.pages.dev` stays alive, serves the ungated site, and is `noindex`'d. All test orders continue there exactly as today, on the same Firebase backend.
- At launch, the gate is removed. Nothing else changes.

Base rate for reassurance: a fresh domain with no backlinks and no promotion draws effectively no organic humans in six weeks. The gate is belt-and-braces, not the load-bearing protection.

## Requirements

**DNS and mail safety (highest risk — do first, verify before proceeding):**
- [ ] Current `aevia.at` DNS zone is exported/screenshotted **before any change** (registrar + current DNS host identified and recorded)
- [ ] Every M365 record (MX, SPF TXT, DKIM CNAMEs, Autodiscover, any `_domainconnect`) is present in the Cloudflare zone **before** nameservers are switched at the registrar
- [ ] MX/SPF/DKIM records are DNS-only (grey cloud), not proxied
- [ ] After cutover: a test email is sent **to** and **from** `xenia@aevia.at` and confirmed delivered, before any other step continues
- [ ] Brevo domain authentication for `aevia.at` is completed in the same DNS pass (see `project_brevo_sender_auth` — Brevo silently drops all automated mail until this is done)

**Hosting cutover:**
- [ ] `aevia.at` and `www.aevia.at` added as Cloudflare Pages custom domains; `www` → apex redirect (or the reverse — pick one, be consistent)
- [ ] HTTPS serves correctly on both; the existing `_redirects` root rule still works
- [ ] `aevia-test.pages.dev` returns `X-Robots-Tag: noindex` (Pages `_middleware` matching on request host — keep it to ~10 lines)
- [ ] Site is verified in Google Search Console for `aevia.at`

**Hardcoded URL sweep (these break customer-facing links if missed):**
- [ ] `functions/index.js:11` — `ACCOUNT_URL`
- [ ] `functions/index.js:419` — staff dashboard link in email
- [ ] `functions/index.js:771` — customer preview base URL
- [ ] `functions/index.js:1299` — customer preview link
- [ ] All four lifted to **one** exported constant (`SITE_URL`), not four string literals
- [ ] `functions/email.js:45` — `LOGO_URL` currently points at a **Webflow CDN** left over from the pre-rebuild prototype (`aevia-v1.webflow.io`). Re-host the logo we already own (`assets/images/aevia_logo_transparent.png`) on our own domain and point `LOGO_URL` at it
- [ ] Firebase Auth → authorized domains: add `aevia.at`, `www.aevia.at`
- [ ] Stripe: Checkout success/cancel URLs and any webhook endpoints updated
- [ ] Geoapify dashboard: allowed origins already list `aevia.at` but **not** `www.aevia.at` — add it or autocomplete silently dies (see `STATUS.md:292`)
- [ ] GCS bucket CORS: `functions/upload.js:4` already allows `aevia.at` + `www.aevia.at` — **verify**, don't assume (see `project_bucket_cors`)
- [ ] `qa/*.mjs` `BASE` constants: decide deliberately whether QA keeps pointing at pages.dev (recommended: yes, it's the test rig) and record the decision
- [ ] `LINKS.md` and `CLAUDE.md` "Live site" line updated

**Pre-launch order gate:**
- [ ] The order flow on `aevia.at` is unreachable to a stranger before F&F opens (mechanism TBC — see Open Questions)
- [ ] The gate is a **single switch** to remove at launch, not a scattered set of edits
- [ ] The order page carries `noindex`; marketing pages do not
- [ ] Gate copy gets a `/stop-slop` pass (it is customer-facing)

**Indexing groundwork (after the domain is live, on the real domain):**
- [ ] `robots.txt` exists and permits Google + AI crawlers (GPTBot, ClaudeBot, PerplexityBot) on marketing pages, disallows `/pages/staff/*` and `customer-preview`
- [ ] `sitemap.xml` covers the marketing pages only
- [ ] Every marketing page has: unique `<title>`, `meta description`, `canonical` pointing at the `aevia.at` form, and Open Graph tags (currently **none** of these exist anywhere — `home.html` has a `<title>` and nothing else)
- [ ] `LocalBusiness` / `Organization` schema (Vienna address, GISA 39598240 — already in the footer)
- [ ] A `/seo-audit` run against live `aevia.at` produces a health score and a prioritised fix list

## Constraints

- **No mail downtime.** If MX verification fails at any point, stop and roll back the nameservers. Mail beats SEO.
- **No new dependencies or build steps** (project rule: plain HTML/CSS/JS).
- **Cost:** expected to be **≈€0**. Cloudflare Pages custom domains and DNS are free on the current plan; no new GCP resources, no new egress. If any step would incur cost, flag it before acting.
- **Out of scope:** content/copy rewriting for SEO, keyword research, backlink work, paid promotion, and the analytics stack (parked). Groundwork only — making the site *indexable*, not *ranked*.
- **Out of scope:** retiring `aevia-test.pages.dev`. It stays, `noindex`'d, as the test rig.

## Success Criteria

The work is complete when:
1. `https://aevia.at` serves the site, mail to and from `@aevia.at` demonstrably still works, and Brevo is domain-authenticated.
2. A stranger landing on `aevia.at` can read every marketing page and **cannot** reach the order flow; the owner can still place test orders on `aevia-test.pages.dev` exactly as before.
3. A test order placed on the live path produces emails whose links point at `aevia.at` and whose logo loads from Aevia's own domain (no Webflow).
4. `site:aevia.at` returns indexed marketing pages in Google Search Console; `site:aevia-test.pages.dev` is not being indexed.
5. All requirements above are checked off.

## References

**Skills:** `seo-technical`, `seo-geo`, `seo-audit`, `/stop-slop`
**Related briefs:** `docs/briefs/email-communication.md`, `docs/briefs/promo-codes.md`
**Memory:** `project_brevo_sender_auth`, `project_bucket_cors`, `project_cloudflare_file_limit`, `feedback_owner_tests_live`
**Key files:** `functions/index.js`, `functions/email.js`, `functions/upload.js`, `_redirects`, `LINKS.md`, `qa/`

## Context

**Background decisions:**
- The site was originally prototyped in Webflow (`aevia-v1.webflow.io`, S93 log) then rebuilt as static HTML. The Webflow logo URL in `email.js` and the stale `webflow.io` CORS origins in `upload.js` are both leftovers from that era, not live integrations.
- Cloudflare Access was previously investigated for staff-page protection and **retired** — path-scoped Access cannot enforce on a single `*.pages.dev` project, which needed a real Cloudflare zone. Once `aevia.at` is a zone this becomes *possible* again, but it is **not needed** (Firebase Auth already gates staff) and is explicitly **out of scope**. Do not re-open it.
- Test orders AEV-052…059 are real rows in the live Firebase project and were always intended to be **wiped at the aevia.at migration** — that clean-up belongs to this work.

**Known risks:**
- **Nameserver move breaks M365 mail.** This is the one genuinely dangerous step. Verify records first, cut over, then test mail before touching anything else.
- **Cloudflare Pages silently rejects any file >25 MiB** — a deploy can fail and leave the site stale (`project_cloudflare_file_limit`). If the site looks unchanged after cutover, check this before blaming DNS or cache.
- Indexing an unfinished site is fine — Google recrawls. Do not let "the site isn't perfect yet" delay the migration; that's the trap this brief exists to avoid.

## Open Questions (owner)

1. **Where does `aevia.at` DNS live today** — which registrar, and is DNS hosted there or at M365/elsewhere? This determines the exact cutover steps.
2. **What should the gated order flow show?** Options: (a) a "We open in September — join the waitlist" page that captures an email, (b) a simple access-code gate so F&F testers can start early, (c) the order button simply absent from the marketing pages. Recommendation: **(a)**, because it turns six weeks of quiet indexing into a warm list at launch instead of wasting the traffic.
3. **Apex or `www` as canonical?** Recommendation: **apex** (`https://aevia.at`) — it matches the email addresses and the brand.
