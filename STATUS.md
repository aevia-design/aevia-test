# Session Status
_Last updated: 2026-07-20 (session 144)_
_Context at save: **aevia.at is LIVE.** The domain migration (ADR-0009) executed end-to-end in one afternoon with zero mail downtime — DNS moved to Cloudflare, the site serves from `aevia.at`, ordering is gated behind a waitlist, and the whole live site is `noindex` until launch. `aevia-test.pages.dev` stays the test rig where ordering works. All customer-facing URLs are now derived per-request, so a test order round-trips entirely on pages.dev. Functions deployed; Firebase/Geoapify dashboard settings done. Also synced the Wander sizing CSV into `wander-data.js`. The pre-existing open fronts (DE order flow still English, Xenia's native-speaker check, 48h sweep) are untouched._

## Status
**Session 144 (2026-07-20) — aevia.at domain migration, Phases 2–5 complete.**

1. **Phase 2 — gate + waitlist (`6a8de86`).** New `pages/waitlist.html` with an embedded Brevo double-opt-in form (verified end-to-end: submit → confirmation email → contact in list). New `assets/js/site-mode.js`: host-aware, adds `noindex` on pages.dev, and on aevia.at shows the "opening this autumn" banner plus a belt that redirects order pages to the waitlist. One-line include added to 25 EN+DE pages.
2. **Phase 3 — the DNS cutover.** Cloudflare zone created, **14 records** migrated, three rules deployed (order gate 302→waitlist, www→apex 301, `X-Robots-Tag: noindex`), nameservers moved from helloly. **Mail verified passing before the site went public**: Brevo→Yahoo `dkim=pass (s=brevo2) spf=pass dmarc=pass`; Xenia's M365→Gmail pass; inbound + Firebase password reset delivered.
3. **Phase 4 — content-independent SEO (`8a274da`).** Real `robots.txt` (replaces the Content Signals Policy file Cloudflare injects), canonical tags on 24 pages, hreflang on the 11 EN/DE pairs. Verified every canonical self-references and every pair is reciprocal.
4. **Phase 5 — app points at the new domain (`8a274da`).** Four hardcoded `pages.dev` literals in `functions/index.js` replaced by `siteOrigin(req)` against a 3-origin allowlist; logo moved off an uncontrolled Webflow CDN; dashboard uses `location.origin`; `upload.js` CORS tightened and anchored. ARCHITECTURE/LINKS/CLAUDE/qa-README corrected, ADR-0009 marked executed, ADR-0001 footnoted.
5. **Wander CSV → JS sync (`c6896a0`).** Owner edited the sizing CSV; carried across SP0 background (`#f8ead9`→`#f4f7f6`, both H+V), SP0/SP3 caption `yMm 179.5→153`, and the new `overlay_position=below` → `overlayAbovePhotos:false` on SP5 right H+V. Verified all 36 standard slots match the CSV exactly.

## Recent decisions
- **The live site stays `noindex` until launch (S144, owner):** since `noindex` still lets Google *crawl*, early discovery is preserved either way — so indexing now buys nothing and costs a draft-copy first impression. Google's first indexed crawl will be the finished, photographed site. Implemented as a Cloudflare header rule, deleted on launch day (TO-DOS #81).
- **Migrate now rather than at launch (ADR-0009, executed S144):** the dangerous DNS work happens with nothing at stake, and no customer ever holds a `pages.dev` link.
- **Customer-facing URLs derive from the request origin, never a constant (S144):** a flat `aevia.at` constant would hand test checkouts to the live domain mid-payment. Now **ARCHITECTURE.md invariant 6**.
- **Homepage stays at `/pages/home` for now (S144):** the 200-rewrite the brief wanted breaks the site's bare-filename relative links. Deferred with reasoning to TO-DOS #82; the noindex decision removed the urgency.
- **`captions_position` column removal deferred (S144):** investigated, found safe in principle but the six CSVs are not uniform (Joyride is comma-delimited with a mislabelled title row; 36 vs 37 columns; `center` is a real value on Functional rows). TO-DOS #83.
- **EN wins every DE contradiction (S139, still in force):** Austria-only, €10, no "Who makes it".

## Next steps (priority order)
1. **Eyeball Wander SP0 and SP3 in the engine** — the caption moved from 50mm below the photo to ~23.5mm. Numbers verified, appearance not.
2. **Xenia native-speaker check** of all German — the 6 "About this template" paragraphs, UI words ("Wählen"/"Gewählt ✓", "großen Foto", "Begrüßung"), spec translations, Joyride tagline. Flagged in `docs/website-copy-DE.md` → "На проверку носителем".
3. **Localise the order flow / emails / account to DE** — currently English. A DE customer from a `/de/` product page hits the English `order.html`. The real remaining gap for a usable German journey.
4. **48h preview-promise sweep (owner's step 2, still open)** — order flow, emails, account still say 24h in places. Marketing pages already 48h.
5. **TO-DOS #80** — real print specs after the production visit; before launch; mirror to DE.

## Open questions
- **Xenia's mailbox aliases don't sort (pre-existing, NOT migration-caused):** mail to `hello@`/`support@` all lands in one folder because Outlook rules match the mailbox's primary address, not the alias. Likely fixes: rule on the message *header* instead of the recipient picker, or promote the aliases to shared mailboxes. Deliberately not touched during migration week.
- **Joyride mockups** (owner) + **Dorottya's portrait photo** still gate a clean Joyride merge and are the only QA 404s (EN and DE). Both degrade gracefully.
- **"Twentysix"** (Budapest restaurant in Dorottya's bio) spelling still unverified — live on both EN and DE our-artists.
- **DE order flow** — when localised, decide whether `/de/` product pages point to a `/de/order.html` or a language-aware single order page.

## Watch-outs for the next session
- 🔴 **Do NOT touch the helloly DNS zone until ~2026-07-27.** It is the migration rollback floor. Say no if helloly prompts to "clean up unused records", and do not cancel their DNS hosting.
- 🔴 **The Cloudflare `noindex` rule must be deleted at launch** (TO-DOS #81) or the finished site launches invisible to Google, silently.
- **QA scripts' `BASE` deliberately stays `pages.dev`** — pointing them at `aevia.at` makes every order-flow script fail at the gate. Noted in `qa/README.md`.
- **Never hardcode a hostname in a customer-facing link** — use `siteOrigin(req)`/`accountUrl(req)` (ARCHITECTURE invariant 6). Adding an origin means adding it to `SITE_ORIGINS` **and** to Firebase Authorised Domains.
- **Cloudflare Rules only apply to proxied (orange) hostnames** — if the gate ever looks broken, check the DNS record is still orange before debugging the rule.
- **DNS cannot be enumerated from outside.** The S130 probe found 9 records; the registrar export had **14**. The 5 extras were Firebase auth-email records that would have broken password resets. Always export from the registrar.
- **Windows Wi-Fi can lose its IPv4 lease (S143)** — if git/npm can't resolve hosts, check for a `169.254.x.x` address; `ipconfig /renew "WiFi"` fixed it.
- **`product.js` is locale-aware (S141):** a new template's `/de/` copy needs `orderUrl:'../order.html'` + `labels` + `back:'de/X.html'` in its `window.PRODUCT`.
- **`.step-name{min-height:2.6em}` is DE-home-only (S142)**; **`product.css` `.panel{min-width:0}` (S141)** — keep both.
- **Engine parity still applies** to the staff/customer engines.
- **DE pages are N inline copies** — a shared string is 11 DE + 11 EN copies. `docs/website-copy-deltas.md` maps where strings live.
- **Known QA 404s that are NOT regressions** — Joyride mockups + Dorottya's portrait. Don't chase them.
