# Brief: aevia.at domain migration + order gate

**Created:** 2026-07-13 · **Rewritten:** 2026-07-14 (session 130), after live-DNS verification and an independent critic pass
**Decision:** `docs/decisions/0009-migrate-to-aevia-at-and-gate-orders.md` — read that first for *why*
**Objective:** Serve the site from `https://aevia.at`, with the order flow gated behind a waitlist until F&F launch, `aevia-test.pages.dev` kept as a `noindex` test rig, and **not one minute of mail downtime**.
**Audience:** Claude (implementation) and Evgeny (owns the helloly + Cloudflare + M365 + Brevo dashboards; non-technical — every dashboard step must be explicit).

> **Version note.** The 2026-07-13 first pass of this brief was written without looking at the live DNS. It contained stale line numbers, a proposed mechanism that would have broken the deploy, a claim that the Stripe webhook must move (it must not), and a client-side gate that fails open. All corrected below. Do not work from git history of this file.

---

## The live zone (verified 2026-07-14 by DNS-over-HTTPS, twice, independently)

| | |
|---|---|
| **Nameservers** | `ns1–ns4.helloly.com` — DNS is hosted at helloly, the registrar. One place. |
| **DNSSEC** | **OFF** (no DS, no DNSKEY) — the classic silent killer in a nameserver move; we are not exposed to it |
| **CAA** | **None** — good; a restrictive CAA would silently block Cloudflare's certificate |
| **MX** | `0 aevia-at.mail.protection.outlook.com` (TTL 3600) |
| **SPF** | `v=spf1 include:spf.protection.outlook.com -all` |
| **M365 verify** | TXT `MS=ms14043695` |
| **Autodiscover** | CNAME → `autodiscover.outlook.com` |
| **Brevo verify** | TXT `brevo-code:85939332d1ca33b7400753ff2e4d80de` |
| **Brevo DKIM** | CNAME `brevo1._domainkey` → `b1.aevia-at.dkim.brevo.com`; `brevo2._domainkey` → `b2.aevia-at.dkim.brevo.com` |
| **DMARC** | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` |
| **Web** | apex + `www` → A `185.198.232.16` (helloly parking — the only records we replace) |

Probed and confirmed **absent**: `sip`, `lyncdiscover`, `enterpriseregistration`, `enterpriseenrollment`, `msoid`, `mail`, `webmail`, `smtp`, `imap`, `email`, `track`, `link`, `ftp`, `_domainconnect`; SRV `_sip._tls`, `_sipfederationtls._tcp`, `_autodiscover._tcp`. No wildcard record. Certificate Transparency logs for `%.aevia.at` are empty.

> ⚠ **This table is a cross-check, not the source of truth.** DNS has no "list everything" operation from outside — a record at a name nobody thought to query is indistinguishable from a record that does not exist. **The registrar's own export is the source of truth.** See Phase 3 step 1.

**Two pre-existing quirks — do NOT touch during the migration.** They work today, and changing them mid-cutover would confound any mail failure:
- Brevo is **not** in SPF, and SPF ends in `-all`. Brevo mail still delivers because its DKIM aligns and DMARC is `p=none`. Improve later, separately.
- **M365 DKIM is not configured** (`selector1/2._domainkey` absent). Xenia's outbound mail passes on SPF alone. Also later, separately.

**Brevo domain auth is DONE** (completed S107) and the live DKIM + verification records confirm it. Do not re-do it. If automated mail ever stops arriving, `project_brevo_sender_auth` holds the diagnosis to run first — and it explicitly warns: **do not touch the SPF record** to fix a Brevo delivery problem.

---

## Security posture (read before touching anything)

**The migration cannot open a security hole, because no part of this system authorises by origin.**

Every Cloud Function sets `Access-Control-Allow-Origin: *` (~23 occurrences in `functions/index.js`). `firestore.rules` contains no host or origin logic — it gates `/orders/{orderId}` on `isStaff()` (a Firebase ID-token email allowlist) and sets `create, delete: if false`, so customers cannot write orders from the browser at all; every customer flow goes through a Cloud Function using the admin SDK. Authorisation is **100% bearer-credential**: Firebase ID token (staff + accounts), preview UUID (customer preview), Stripe webhook signature.

Consequences to hold onto:
- **Adding `aevia.at` to a CORS allowlist buys nothing.** Do not "harden CORS" and believe you have secured something.
- **Preview tokens are not host-bound** (`functions/index.js:139-146` is a bare Firestore `where('previewToken','==',token)`). **In-flight preview links survive the migration** and work on either host. This is a real non-risk worth stating.
- **The order gate is a courtesy, not a security control.** It stops an accidental stranger order. A hand-crafted POST straight to a Cloud Function URL bypasses it regardless of host — and that is fine pre-launch; do not add App Check for this.
- **Pre-existing, not caused by this migration:** `functions/upload.js:4` allows `/\.pages\.dev$/` and `/\.webflow\.io$/` **unanchored**, so *any* pages.dev project matches, and `localhost` on any port is allowed in production. Harmless (CORS is not a control here), but clean it up while we are in the file.

**`/security-review` timing:** not now — there is no migration code to review yet, and the decisions above are design-level, captured in ADR-0009. **Run it at the end of Phase 5**, once `site-mode.js`, the `_redirects` rewrite, and the per-request `SITE_URL` origin allowlist exist as a diff. The allowlist is the one genuinely review-worthy change (it introduces the system's first origin-derived value).

---

## Hard rule: `/functions/` is off limits to Cloudflare

`/functions/` at the repo root is the **Firebase** Cloud Functions source (`firebase.json`). Cloudflare Pages auto-detects a root `/functions/` directory as *Pages Functions*. Verified against the live deploy: `/functions/email.js` returns **404** while `/package.json` returns **200** — Pages already treats that directory as Functions and excludes it from static upload. The build only survives because no file in it exports a handler in the shape Pages looks for.

**Adding `_middleware.js` there would be the first file exporting a real handler**, lighting up a compile path over 2000 lines of `firebase-admin` code. **Never put a Cloudflare file in `/functions/`.** Everything host-conditional goes in Cloudflare Rules instead — which is better anyway (see Phase 3 step 6).

(The 2026-07-13 draft also claimed this could leak `functions/serviceAccountKey.json`. **It could not** — that file is gitignored and is not in the repo Cloudflare deploys from.)

---

## Phase 1 — Reference: what actually needs to change in code

| What | Where | Note |
|---|---|---|
| `ACCOUNT_URL` | `functions/index.js:12` | |
| Staff dashboard link in email | `functions/index.js:420` | |
| Preview base URL → **Stripe `success_url`/`cancel_url`** | `functions/index.js:878` (fed to `:931-932`) | **The trap.** See Phase 5. |
| Preview link in email | `functions/index.js:1436` | |
| `LOGO_URL` | `functions/email.js:45` | Points at a dead **Webflow CDN** from the old prototype |
| Preview link builder | `pages/staff/dashboard.html:503` | |
| CORS allowlist | `functions/upload.js:4` | `aevia.at` + `www.aevia.at` **already present** — no change needed; drop the stale `webflow.io` entries |
| QA `BASE` constant | 22 × `qa/*.mjs` | **Deliberately stays `pages.dev`** — it is the test rig. Record in `qa/README.md`. |

**No customer-facing page hardcodes the domain** — they all use relative links. **The Stripe *webhook* does NOT move** (it is a Cloud Function URL, trusted by signature at `functions/index.js:1133`); only the checkout redirect URLs move.

Dashboard-only settings (will never appear in a diff — highest silent-breakage risk after mail):
- **Firebase Auth → Authorized domains:** add `aevia.at`, `www.aevia.at`. Failure is visible as `auth/unauthorized-domain` (`pages/account.html:337`).
- **Geoapify → allowed origins:** lists `aevia.at` but **not `www.aevia.at`** (`STATUS.md:318`). Address autocomplete dies silently without it.

---

## Phase 2 — Ship the gate and waitlist (code; no DNS yet)

Done **first**, so `aevia.at` is already gated the moment it goes live. All of it is inert on `pages.dev`.

- **`pages/waitlist.html`** (new) — "Opening this autumn. Leave your email and we'll let you know." With an **embedded Brevo signup form** (Brevo → Contacts → Forms). Brevo is already in the stack; its hosted form brings double opt-in, consent capture and unsubscribe, and the list lands where marketing will use it. **No Cloud Function, no Firestore collection, no new abuse surface, no hand-rolled GDPR.**
  - Copy gets a **`/stop-slop`** pass (customer-facing).
  - **Avoid "beta"** — software register, wrong for a craft brand. **Avoid a hard date** — a stranger can screenshot a promise. "This autumn" is enough.
- **`assets/js/site-mode.js`** (new, ~15 lines) — `location.hostname.endsWith('aevia.at')`. Two jobs: inject `<meta name="robots" content="noindex">` on the **test rig** (pages.dev stays noindex forever), and act as the **belt** behind the Cloudflare gate (redirect `order.html` → waitlist if it somehow renders on the live host). Note: the **live** `aevia.at` noindex is handled server-side by a Cloudflare header rule, not this JS — see Phase 3 step 6 and the S144 amendment.
- **Banner** on marketing pages when live: same message, links to the waitlist. **Must be added to the 11 DE pages too** (`pages/de/*.html`) — the German site was built after this brief (S141) and shares no banner markup with EN.

> **S144 additions — the DE site.** After this brief was written, a full German mirror shipped (`pages/de/` — 11 marketing pages, EN/DE switcher). DE has **no** order/account/preview pages; every DE product page points at the shared `../order.html`, so **the order gate (Phase 3 step 6) already covers German visitors — no rule change needed.** The DE deltas that DO need doing are all SEO-side and are folded into Phase 4 below.

**Why not gate at the CTAs:** the 10 "Create your book" buttons call `goToOrder()`, whose implementation is **split** — 5 pages use shared `assets/js/product.js:108`; 5 have inline duplicates (`devotion.html:198`, `radiance.html:112`, `horizon.html:113`, `sprout.html:111`, `terrain.html:111`). Anyone gating at the button layer patches `product.js`, sees five pages behave, and misses the other five. **Gate at the destination.**

## Phase 3 — DNS cutover (owner-driven; the careful hour)

**Schedule it: weekday morning, Xenia forewarned and available to test her own inbox.** Not a Friday evening.

**Reassurance, and it is true:** a *missing* MX does not vaporise mail — sending servers retry for 24–48 hours. The genuine danger is a *wrong* record, not a missing one.

1. **Enumerate the zone from the authorities, not from guesses.**
   - **helloly → export the zone file** (look for "export" / "BIND" / "zone file"). If unavailable, screenshot every page of the record list. **This is the source of truth.**
   - **M365 admin → Settings → Domains → aevia.at → DNS records** — Microsoft lists exactly what its tenant expects. Diff it.
   - **Brevo → Senders, Domains & Dedicated IPs → aevia.at** — check specifically for a **dedicated tracking domain** (it adds a CNAME under a name nobody would guess).
   - The table at the top of this brief is the cross-check.
2. **Add `aevia.at` to Cloudflare** as a zone (Free plan). It auto-scans and imports. **Do not trust the auto-scan** — it works by guessing common names, i.e. it has the same blind spot the table does. Verify every record against the helloly export.
3. **Cloud settings:** mail records (MX, TXT, DKIM CNAMEs, autodiscover) **grey / DNS-only**. The web records Cloudflare creates for Pages **are proxied / orange — correct, leave them.** (Not "all grey" — that would break the site.)
4. **⚠ Do NOT enable Cloudflare Email Routing.** It is prominent in a new-zone dashboard, it sounds helpful, and **it rewrites your MX records.** On a zone carrying live M365 mail, that is a one-click outage.
5. Add `aevia.at` and `www.aevia.at` as **Pages custom domains** on the existing project; remove the two `185.198.232.16` A records.
6. **Two Cloudflare Redirect Rules** (Free plan, same dashboard session):
   - **The order gate** — `(http.host eq "aevia.at" or http.host eq "www.aevia.at") and starts_with(http.request.uri.path, "/pages/order")` → **302** → `/pages/waitlist`. Server-side, **fails closed**, works with JS off, obeyed by crawlers. `pages.dev` is not in the zone, so it cannot touch the test rig.
   - **`www` → apex** — `http.host eq "www.aevia.at"` → **301** → `https://aevia.at${uri.path}`. Without this, both hostnames serve the site and we ship duplicate content.
   - **⭐ S144 (pending owner confirm) — live-site `noindex` until launch.** One **Response Header Transform Rule**: for `http.host eq "aevia.at" or http.host eq "www.aevia.at"`, set response header `X-Robots-Tag: noindex`. Server-side, obeyed by Google, no JS to fail. Keeps the whole live site out of Google's index while it shows draft copy / no photography — Google still *crawls* and discovers URLs (noindex ≠ blocked), so discovery is not lost. **Delete this one rule on launch day (~Sep)** — it is an explicit item in the Phase 6 launch checklist. Rationale + options in the S144 amendment under Phase 4.
7. **Only now: change the nameservers at helloly** to the two Cloudflare gives you.
8. **⚠ Leave the helloly zone completely intact for at least a week.** Do not delete records, do not tidy up, do not cancel DNS hosting. For hours after the switch some resolvers still read helloly and some read Cloudflare — **both authorities must answer identically.** This is the step most likely to go wrong on the owner's own initiative, because once "we've moved," cleaning up feels natural. It is also the rollback floor.
9. **Test mail properly — arrival is NOT the test.** With DMARC at `p=none`, mail with broken DKIM/SPF **still arrives**; it just quietly starts landing in spam, and you find out weeks later when F&F testers say they never got their preview link. The test is the **`Authentication-Results` header**:
   - Trigger a **Brevo transactional email** (place a test order on `pages.dev`) to a Gmail address → open → **Show original** → confirm **SPF, DKIM and DMARC all PASS**.
   - Send **from Xenia's M365 mailbox** to Gmail → same check.
   - Send **to** `xenia@aevia.at` and to one alias → confirm arrival.
   - If something is wrong: **fix forward in Cloudflare first** (~60s once a resolver points there) — but you are in a split-brain window, so understand the fix is invisible to resolvers still on helloly. If mail breaks in a way you cannot diagnose, reverting the nameservers at helloly is slow but real.

**Cost: €0.** Cloudflare Free covers the zone, both Pages custom domains, and the Redirect Rules. No new GCP resources, no new egress.

## Phase 4 — Content-independent SEO (ships with Phase 3)

Each of these gets **more expensive the longer we wait**, because URLs bake into emails and into Google's index.

- **Homepage URL — owner decided: `aevia.at/`.** Change `_redirects` from `/ /pages/home.html 301` to a **200 rewrite**: `/ /pages/home.html 200`. Verified supported by Cloudflare Pages (proxying, relative paths only). Today the homepage costs two hops (`/` →301→ `/pages/home.html` →308→ `/pages/home`); after this it is served at the root.
- **Canonical tags** — `<link rel="canonical" href="https://aevia.at/...">`. Host-independent, no JS. This is the *robust* fix for the pages.dev duplicate-content problem and backs up the JS `noindex`. **S144: every DE page needs its own self-referencing canonical** (`.../pages/de/home` → itself, not the EN page). Neither EN nor DE pages carry a canonical today (verified S144).
- **⭐ S144 — hreflang tags (NEW; the DE site created this need).** Each EN page and its DE twin must cross-declare each other, or Google may treat them as duplicate content or serve the wrong language:
  ```html
  <link rel="alternate" hreflang="en" href="https://aevia.at/pages/home">
  <link rel="alternate" hreflang="de" href="https://aevia.at/pages/de/home">
  <link rel="alternate" hreflang="x-default" href="https://aevia.at/pages/home">
  ```
  Both pages in a pair carry the **same** block (bidirectional). The 5 EN-only product pages (`devotion`, `radiance`, `horizon`, `sprout`, `terrain`) have no DE twin — self-canonical only, no hreflang. Use the **`seo-hreflang`** skill to generate and validate.
- **A real `robots.txt`.** One already exists and is not ours: Cloudflare auto-injects a **Content Signals Policy** file (`pages.dev/robots.txt` → 200) containing no `Allow`/`Disallow`, only AI-licensing statements made on Aevia's behalf that nobody here has read. Committing a real one overrides it. Allow Google + AI crawlers on marketing pages (**incl. `/pages/de/*`**); disallow `/pages/staff/*`, `/pages/order*`, `/pages/customer-preview*`. **Keep crawling open even while the live site is `noindex` (S144) — noindex is set by header, not by `Disallow`, precisely so Google still discovers URLs.**
- **Search Console verification** for `aevia.at` — five minutes, and the only early warning of an indexing problem.

> **⭐ S144 amendment — noindex the whole live site until launch (Q2, pending owner confirm).** The original plan indexes the live marketing pages now. Re-examined S144: since the ADR values an early "SEO head start" at ≈zero, and `noindex` via header still lets Google *crawl and discover* every URL, the only thing indexing-now buys (early discovery) is preserved either way — while indexing-now costs a draft-copy/thin-content first impression in search. **Recommendation: keep the live site `noindex` until the September launch** (Cloudflare header rule, Phase 3 step 6), then remove that one rule so Google's first indexed crawl is the finished, photographed site. Reversible one-line change; the only risk is forgetting to flip it at launch, mitigated by the Phase 6 checklist item. Test rig (pages.dev) stays noindex forever via `site-mode.js`. **If owner prefers early presence, skip the header rule and the plan's original "index now" stance stands.**

**Note:** the `.html` → clean-URL 308 **does preserve the query string** (verified: `?token=…&payment=success` survives). `LINKS.md:5` claims the token is dropped — **that is wrong**; fix it. Emailed preview links are safe.

## Phase 5 — Point the app at the new domain (only after Phase 3 is green)

- **`SITE_URL` derived per-request — NOT a constant.** `functions/index.js:878` feeds Stripe's `success_url`/`cancel_url`. A flat constant pointing at `aevia.at` means a test order on `pages.dev` goes to Stripe and **lands on the live domain mid-checkout** — the test rig stops round-tripping. These are `onRequest` functions, so:
  ```js
  const SITE_ORIGINS = ['https://aevia.at', 'https://www.aevia.at', 'https://aevia-test.pages.dev'];
  const siteUrl = SITE_ORIGINS.includes(req.headers.origin) ? req.headers.origin : 'https://aevia.at';
  ```
  ~5 lines. Production round-trips on `aevia.at`; the test rig round-trips entirely on `pages.dev`. Replaces all four literals in the Phase 1 table.
- Re-host the logo (`assets/images/aevia_logo_transparent.png`) on our own domain; repoint `functions/email.js:45`.
- `pages/staff/dashboard.html:503`.
- Firebase Auth authorized domains; Geoapify origins (incl. `www`); Stripe checkout redirect URLs (now derived).
- `functions/upload.js:4` — drop the stale `webflow.io` origins; anchor the regexes.
- Update `LINKS.md` (incl. the wrong token-dropping note) and the `CLAUDE.md` "Live site" line.
- **`ARCHITECTURE.md` is factually wrong and must be fixed:** `:18-24` claims the staff engine is on a "staff subdomain" behind "Cloudflare Access" — untrue since ADR-0001 was superseded (auth is Firebase; staff pages are at `/pages/staff/*` on the same project). Also update `:209-216` (security table — state that no function authorises by origin), `:275` (dependencies — Cloudflare DNS zone is now a dependency of *mail* resolution), and consider a new invariant: *"Customer-facing URLs are derived from one server-side origin allowlist; never hardcode a hostname."*
- Annotate **ADR-0001**: its supersession rationale ("path-scoped Access can't work on a `*.pages.dev` project") expires once `aevia.at` is a zone. We are **not** re-opening it — Firebase auth works — but a future reader must not act on an obsolete constraint.
- Wipe test orders AEV-052…059 — **three separate wipes** (Firestore + Auth accounts + Storage).
- Owner redeploys functions.
- **Run `/security-review`** on the resulting diff.

## Phase 6 — Content-dependent SEO (DEFERRED to ~Sep, when copy + photography land)

Meta descriptions, Open Graph, `Organization`/`LocalBusiness` schema (Vienna address, GISA 39598240 — already in the footer), `sitemap.xml`, and a `/seo-audit` run.

**⭐ Launch-day flip (S144, if the noindex recommendation is taken):** delete the Cloudflare `X-Robots-Tag: noindex` header rule (Phase 3 step 6) so the finished live site becomes indexable. **Forgetting this launches the site invisible to Google** — treat it as a hard gate on the launch checklist. Confirm in Search Console that pages start indexing within a week. These describe the content; writing them against placeholder copy means writing them twice. Nothing is lost by waiting — Google recrawls continuously, and there is no one-shot first impression to blow.

**We are explicitly not relying on an "SEO head start" argument.** Six weeks of a thin, unlinked site ranks for nothing. The reasons to migrate now are the emails and the DNS risk (ADR-0009).

---

## Success criteria

1. **Mail:** `Authentication-Results` shows **SPF + DKIM + DMARC all PASS** on (a) a Brevo transactional email and (b) a message sent from Xenia's M365 mailbox. Mail arrives to `xenia@` and to one alias.
2. **Gate:** on `aevia.at`, `/pages/order.html` 302s to the waitlist **with JavaScript disabled**. On `pages.dev`, ordering works exactly as today.
3. **Test rig intact:** `qa/p0-1-template.mjs` passes unchanged against `pages.dev`, **including the Stripe round-trip landing back on `pages.dev`.**
4. `https://aevia.at/` serves the homepage at the root; `www` 301s to apex; HTTPS valid on both.
5. **Emails:** a test order on `pages.dev` keeps every link on `pages.dev`; a live order keeps every link on `aevia.at`; the logo loads from our own domain, not Webflow.
6. `npm test` green (currently 202/202). `/security-review` clean.
7. `ARCHITECTURE.md` no longer describes hosting that does not exist.

## References

**Decision:** `docs/decisions/0009-migrate-to-aevia-at-and-gate-orders.md`
**Related ADRs:** 0001 (annotate), 0002 (tokens survive — no change), 0006 (anticipated this), 0007 (authorized domains), 0008 (Stripe redirect URLs)
**Memory:** `project_brevo_sender_auth` (domain auth already done; holds the first-response diagnosis if mail stops), `project_bucket_cors`, `project_cloudflare_file_limit` (Pages silently rejects files >25 MiB — if the site looks stale after cutover, check this before blaming DNS or cache), `feedback_owner_tests_live`
**Skills:** `/stop-slop` (waitlist copy), `/security-review` (end of Phase 5), `seo-technical` + `seo-geo` (Phase 6)
