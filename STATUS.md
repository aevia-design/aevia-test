# Session Status
_Last updated: 2026-07-21 (session 145)_
_Context at save: **Print PDFs now generate from the dashboard and the owner has verified them working.** A Wander overlay flag that S144 wrote with the wrong key — silently inert across all three render surfaces — was found and fixed. Customer-facing prices now show VAT and disclose that shipping is extra (the owner is VAT-registered; the site had no VAT statement at all). The 48h preview promise sweep is complete in the order flow and confirmation email, though the email needs one Functions deploy to go live. Two dead pages contradicting live shipping policy are flagged and awaiting a delete decision._

## Status
**Session 145 (2026-07-21) — print PDFs shipped, Wander overlay fixed, VAT labelled.**

1. **Wander SP5 overlay (`13c6932`).** S144's CSV sync wrote `overlayAbovePhotos: false` on a **page variant** — the spread-level key at the wrong level, matching neither branch of `spreadDef.overlayAbovePhotos === false || variant.overlayBelow`. Inert in engine, customer-preview and PDF. Fixed to `overlayBelow: true`; verified in the rendered DOM (SP5 right `z-index:0`, all 37 others `2`). Guard test added.
2. **Print PDFs from the dashboard (`0ec5b2b`).** New "Generate print PDFs" button → `{order}_print_cover.pdf` (wide wrap) + `{order}_print_inside.pdf` (square single pages, blank QR last). **Owner confirmed working.** Two documents on purpose: mixed page sizes get rejected by print houses.
3. **VAT labelling (`e729be6`, `0d08def`).** 17 files. Final wording `INCL. VAT · PLUS SHIPPING` / `INKL. USt. · ZZGL. VERSAND`. No price figures changed.
4. **48h sweep (`00d34ee`).** Order flow + confirmation email. The email-correction "within 24h" on `order.html:2512` deliberately left alone — different meaning, same line.
5. **Backlog (`0e81d06`, `1fd86fd`).** TO-DOS #84 (Export book state button) and #85 (gsutil → gcloud storage).

## Recent decisions
- **Print interior is single pages, not reader spreads (S145):** the print house does the imposition and no Aevia artwork crosses the gutter. Owner corroborated — the first physical samples were printed from single pages. Reversible in ~20 lines.
- **Print output is two files, never one (S145):** cover and interior are different page sizes; a mixed-size PDF gets bounced. The old CLI merge lumped them together.
- **RGB is settled, do not re-ask (S119, reconfirmed S145):** Elanders convert to CMYK themselves. `docs/briefs/print-api-integration.md` §4.
- **Working assumption: 20% VAT on photo books (S145, owner):** CEWE and Journi both charge it. Steuerberater to confirm; 10% would be ~€5/book.
- **Spine stays 9mm (S145):** correct for the 40pp samples. Wrong for 80pp — that is Elanders' Q1.
- **The live site stays `noindex` until launch (S144):** implemented as a Cloudflare header rule, deleted on launch day (TO-DOS #81).

## Next steps (priority order)
1. **Deploy `confirmUpload`** — `firebase deploy --only functions:confirmUpload`. Then place a test order and confirm the email says 48 hours. The 48h copy is committed but not live until this runs.
2. **Decide on `devotion.html` + `radiance.html`** — dead pages, still live, advertising shipping-included delivery to DE/CH/UK/USA. Delete, or noindex + drop from sitemap.
3. **Confirm `prices.js` €70 is gross, not net** — if those figures are what Aevia receives, the new VAT label is untrue and the real price is €84.
4. **Xenia native-speaker check** of all German — the 6 "About this template" paragraphs, UI words, spec translations, Joyride tagline. Flagged in `docs/website-copy-DE.md`.
5. **Localise the order flow / emails / account to DE** — still English. Write the preview promise as 48h from the start; there is no 24h to fix there because the copy does not exist yet.
6. **TO-DOS #80** — real print specs after the production visit; before launch; mirror to DE.

## Open questions
- **For Elanders:** is the blank QR page inside the 40 pages or does it make 41 — and do they need a multiple of four for binding? Also their Q1 (spine formula) and Q6 (single pages vs spreads, now answered in practice but unconfirmed by them).
- **For the Steuerberater:** 10% book rate or 20% standard on a personalised photo book?
- **VAT research unfinished** (web-search outage during S145): the Austrian price-display statute citation, the 2025 EU cross-border SME scheme, and whether the 14-day withdrawal right applies to personalised goods. The last one matters for the terms.
- **Xenia's mailbox aliases don't sort** (pre-existing, not migration-caused).
- **Joyride mockups** (owner) + **Dorottya's portrait photo** still gate a clean Joyride merge; the only QA 404s.
- **DE order flow** — when localised, decide `/de/order.html` vs a language-aware single page.

## Watch-outs for the next session
- 🔴 **`devotion.html` + `radiance.html` contradict live shipping policy.** Harmless only while the site is `noindex`. Do not let launch day arrive with them indexable.
- 🔴 **The Cloudflare `noindex` rule must be deleted at launch** (TO-DOS #81) or the finished site launches invisible.
- **Cross-border EU B2C is allowed** — a VAT-reporting question, not permission. One EU-wide **€10,000 net** threshold across all other member states *combined*; above it, destination rate filed via **OSS** in Austria.
- **A data-file key that nothing reads fails silently.** Verifying values against a CSV does not verify that any reader consumes the key. If one template does a shared thing differently from the other four, that is a finding. See LEARNINGS 2026-07-21.
- **PowerShell splits unquoted comma lists** — `firebase deploy --only "functions:a,functions:b"` must be quoted or it matches nothing.
- **Never run the PDF CLI against a real order** — it pulls originals over the internet and bills egress. The dashboard path is in-region and free. TO-DOS #84 covers the confusing Export button.
- **Wander SP5 V variant** was fixed but never seen rendering (fixture photos are landscape).
- **Engine parity still applies** to the staff/customer engines.
- **DE pages are N inline copies** — `docs/website-copy-deltas.md` maps where strings live.
- **`product.js` is locale-aware (S141)**; **`.step-name{min-height:2.6em}` is DE-home-only (S142)**; **`product.css` `.panel{min-width:0}` (S141)** — keep all three.
- **Known QA 404s that are NOT regressions** — Joyride mockups + Dorottya's portrait.
