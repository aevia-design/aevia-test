# 0009 — Serve the site from aevia.at now; gate the order flow; keep pages.dev as the test rig

**Date:** 2026-07-14 (session 130)
**Status:** Accepted — not yet executed (implementation plan: `docs/briefs/domain-migration.md`)
**Relates to:** ADR-0001 (its supersession rationale expires — see Consequences), ADR-0002 (preview tokens survive the move untouched), ADR-0006 (anticipated this migration), ADR-0007 (Firebase authorized domains), ADR-0008 (Stripe redirect URLs move)

## Context

The site is served from `https://aevia-test.pages.dev`. We own `aevia.at` and want to serve from it. The F&F launch is ~1.5 months out (~Sep 2026), Xenia's copy is not final, and there is no photography yet. The obvious instinct is to wait until the site is finished.

Two things argue against waiting, and one thing argues that waiting is actively expensive.

**Transactional emails bake the hostname in permanently.** `functions/index.js` mints preview links, account links and Stripe redirect URLs from hardcoded `pages.dev` literals (`:12`, `:420`, `:878`, `:1436`). The moment an F&F customer holds an email containing a `pages.dev` preview link, that hostname is load-bearing: migrating afterwards means live customers holding dead links.

**The dangerous part is DNS, not the website.** `aevia.at` carries the company's live M365 mail — `xenia@aevia.at` is a real person's real inbox, plus `orders@`, `hello@`, `support@` aliases. Serving the apex domain from Cloudflare Pages requires moving the nameservers to Cloudflare, which moves the *mail* records too. Done carelessly, it silently kills business email. That work should happen on a calm weekday morning with nothing at stake — not in launch week.

**And URLs get more expensive to change the longer we wait.** Today `_redirects` 301s `/` → `/pages/home.html`, which then 308s to `/pages/home` — so the canonical homepage is `aevia.at/pages/home`, reached via two hops. Once that URL is in customer emails and in Google's index, changing it costs permanent redirects and lost ranking.

The owner's stated concern — *"if aevia.at is discoverable, a stranger could place a real order while I'm still testing"* — is real but is a separate problem from the domain, and has a separate, cheap solution.

The counter-argument in the original brief — that we need a six-week SEO head start — is **weak and we are not relying on it.** Six weeks of a thin, unlinked, pre-content site accrues effectively no ranking. It is not a reason to migrate.

## Options Considered

1. **Migrate at launch (~Sep).** Do nothing now. Simplest today, but it means performing the one genuinely dangerous operation (nameserver move, live mail at risk) during the busiest week, *and* migrating customers who already hold `pages.dev` links. Worst possible timing for both.
2. **Migrate now, order flow open.** Fastest, but leaves a live, orderable shop on a public domain while the product is untested and the copy is a draft. A stranger could place an order we would have to honour.
3. **Migrate now; gate the order flow behind a waitlist; keep `pages.dev` as a `noindex` test rig.** Separates the two concerns: the domain moves, the shop stays shut.
4. **Keep nameservers at helloly; serve `www.aevia.at` only via CNAME.** Zero mail risk (the zone is never touched), but Cloudflare Pages cannot serve an apex domain on third-party DNS — so the bare `aevia.at` would depend on a helloly forwarding feature we have not confirmed exists, and could land on a parking page.

## Decision

We chose **Option 3 — migrate now, gate the order flow, keep `pages.dev` as the `noindex` test rig.**

**The gate is a Cloudflare Redirect Rule, not application code.** Becoming a Cloudflare *zone* — which the apex requirement forces anyway — unlocks Redirect Rules on the Free plan: per-host, evaluated at the edge, before the origin is reached. A rule matching `http.host eq "aevia.at" and starts_with(http.request.uri.path, "/pages/order")` redirects to the waitlist. This **fails closed**, works with JavaScript disabled, and is obeyed by crawlers. `pages.dev` is not in the zone, so the rule cannot touch the test rig — there is no `location.hostname` branch to get wrong.

A client-side JS gate was considered and **rejected as primary**: its failure mode (script 404s or throws) is *silently ungating the order form on the live domain*, which is precisely the risk being defended against. It is retained only as a belt.

**The waitlist is a Brevo hosted form, not a Cloud Function.** Brevo is already the transactional mail provider (`functions/email.js:12`). Its hosted forms bring double opt-in, consent capture and unsubscribe — all of which we need anyway for EU addresses — and the list lands in Brevo, where marketing will actually use it. No new Cloud Function, no new Firestore collection, no new abuse surface, no hand-rolled GDPR.

**Homepage moves to `aevia.at/`.** `_redirects` changes from a 301 to a **200 rewrite** (`/ /pages/home.html 200`), so the homepage is served *at* the root rather than redirecting twice. Verified supported by Cloudflare Pages for relative paths. Decided now because Phase 4 bakes URLs into emails.

**SEO splits by whether it depends on content.** Content-independent work ships with the migration (canonical tags, a real `robots.txt`, Search Console, the URL decision). Content-dependent work (meta descriptions, Open Graph, schema, sitemap) waits for Xenia's copy and the photography — writing it against placeholders means writing it twice, and Google recrawls continuously, so nothing is lost.

Key trade-offs:
- **We gain:** the dangerous DNS work happens with nothing at stake; no customer ever holds a `pages.dev` link; the homepage URL is settled before it is indexed; a warm waitlist instead of six wasted weeks; a Cloudflare zone (which incidentally re-opens the path-scoped-Access option ADR-0001 originally wanted).
- **We accept:** a propagation window of several hours where both helloly and Cloudflare answer DNS queries and must answer identically; the obligation to leave the helloly zone intact for ~a week; and a live `aevia.at` that shows draft copy and no photography to anyone who finds it (nobody will — no backlinks, no promotion).
- **We assume:** the zone really is the 9 records we found (see brief — this is *verified from the registrar export*, not inferred from DNS queries, precisely because DNS cannot be enumerated from outside).

## Consequences

- **ADR-0001's supersession rationale expires.** It was superseded because "path-scoped Cloudflare Access can't enforce on a single `*.pages.dev` project" — which needed a real Cloudflare zone. `aevia.at` provides one. Staff auth is Firebase now and works; **we are not re-opening this**, but the ADR should be annotated so a future reader doesn't act on an obsolete constraint.
- **ADR-0002 is unaffected, and this is worth stating.** Preview tokens are Firestore-looked-up UUIDs with no host binding (`functions/index.js:139-146`), so **in-flight preview links keep working across the migration.** ADR-0002 also pre-rejected `aevia.at/preview/abc123` short links as presentational; that stance stands.
- **Security posture does not change, and the migration cannot weaken it.** Every Cloud Function sets `Access-Control-Allow-Origin: *`; authorisation is 100% bearer-credential (Firebase ID token, preview UUID, Stripe webhook signature) and `firestore.rules` contains no origin logic. **No function trusts an origin.** Adding a hostname to an allowlist therefore buys nothing — and nobody should "harden CORS" and believe they have secured something. (Separately noted, not caused by this migration: `functions/upload.js:4` allows `/\.pages\.dev$/` and `/\.webflow\.io$/` unanchored, so any pages.dev project matches. Harmless given CORS is not a control here; worth cleaning up while we are in the file.)
- **The Stripe webhook does NOT move.** It is a Cloud Function URL, trusted by signature (`functions/index.js:1133`). Only `success_url`/`cancel_url` move. The original brief said otherwise and was wrong.
- **New dependency:** M365 mail resolution now depends on the Cloudflare DNS zone. `ARCHITECTURE.md:275` must record this.
- **Reversibility:** the Pages custom domain is a **two-way door** (additive; both hostnames serve). The nameserver move is a **slow-reversal door** — revertible at helloly, but only over hours, and only while the helloly zone remains intact. Hence the week-long freeze on tidying it up.
- **`ARCHITECTURE.md` is factually wrong today** at `:18-24` (it claims the staff engine sits on a "staff subdomain" behind "Cloudflare Access" — both untrue since ADR-0001 was superseded). Fixing it is in scope.

## Next Steps

Implementation plan: `docs/briefs/domain-migration.md` (rewritten for this ADR). Append an "Executed / verified" banner here once the cutover is done and mail authentication is confirmed passing, following the ADR-0006 precedent.
