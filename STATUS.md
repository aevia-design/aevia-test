# Session Status
_Last updated: 2026-07-22 (session 146)_
_Context at save: **The mobile site was polished and shipped — cards, footer, widows and nav order, all CSS-only in shared files, verified on device by the owner.** A native iOS app was explored in depth and deliberately deferred until after the F&F trial; the reasoning is briefed so it can be resumed rather than re-argued. Google sign-in is broken on iPhone in two places, one of them inside the purchase path — diagnosed and briefed, not yet fixed. The owner is away on a trip; nothing is left half-finished._

## Status
**Session 146 (2026-07-21/22) — mobile polish shipped, iOS app deferred, sign-in bug briefed.**

1. **Mobile fixes (`2bd4a84`).** Value cards go 1-up (were ~165px wide, breaking descriptions to 2–3 words per line); footer link groups go 2-up with the brand spanning both; `text-wrap: pretty` on body copy site-wide; burger menu reordered so Account precedes DE. **All CSS-only in `mobile.css` + `type.css`** — no copy, no markup, no per-page edits. Verified with Playwright at 390/375/1440px, desktop unchanged. **Owner confirmed on his phone.**
2. **Native iOS app — deferred, not rejected (`docs/briefs/ios-app.md`).** Owner time is the binding constraint (2–3 months part-time vs print house Aug → F&F Sep → marketing year-end). Revisit after the first real orders. TO-DOS #40 repointed; its "Capacitor wrap" framing is superseded by native shell + engine in a WKWebView.
3. **Google sign-in on iPhone (`docs/briefs/google-signin-ios.md`, TO-DOS #86).** Diagnosed, four options costed (all €0), deferred by the owner to after his trip.
4. **TO-DOS #87** — `waitlist.html` may have no mobile styling, and it is the production gate page. Unverified.

## Recent decisions
- **The iOS app waits for evidence, not enthusiasm (S146):** an app is a retention tool and there are zero customers to retain. Triggers that would revive it are written down in the brief.
- **If the app is built: native shell + engine in a WKWebView (S146).** Never a native rebuild of the rendering engine — it is print-critical geometry, and two implementations that must agree exactly is how a customer approves a preview that doesn't match what prints.
- **Engine extraction is parked (S146).** It was claimed to be a prerequisite for the app. It is not — a webview can point at `customer-preview.html` as-is. Revisit only on independent merit.
- **Copy must not diverge between mobile and desktop (S146, owner).** Desktop is verified and the DE mirrors double any divergence. Mobile problems get layout fixes, not shortened copy.
- **Working assumption: 20% VAT on photo books (S145, owner):** CEWE and Journi both charge it. Steuerberater to confirm; 10% would be ~€5/book.
- **Print interior is single pages, not reader spreads; print output is two files, never one (S145).**
- **RGB is settled, do not re-ask (S119, reconfirmed S145).** Elanders convert to CMYK themselves.
- **The live site stays `noindex` until launch (S144)** — Cloudflare header rule, deleted on launch day (TO-DOS #81).

## Next steps (priority order)
1. **Deploy `confirmUpload`** — `firebase deploy --only functions:confirmUpload`. Still pending from S145. The 48h email copy is committed but not live until this runs. Then place a test order and confirm the email says 48 hours.
2. **Correct the 1–4 GB/order figure in `CLAUDE.md`** — it is wrong (real orders are ~150–450 MB) and it inflates every cloud cost estimate that references it. **Needs the owner's real number**; Claude should not guess.
3. **Verify TO-DOS #87** — does `waitlist.html` render unstyled on a phone? It is what every real aevia.at visitor currently sees.
4. **TO-DOS #86 (Google sign-in)** — next step is one question on a real iPhone: when the tab opens, does sign-in complete or still strand the user? That decides cheap fix vs proxy work.
5. **Decide on `devotion.html` + `radiance.html`** — dead pages, still live, advertising shipping-included delivery to DE/CH/UK/USA. Delete, or noindex + drop from sitemap.
6. **Confirm `prices.js` €70 is gross, not net** — if those figures are what Aevia receives, the VAT label is untrue and the real price is €84.
7. **Xenia native-speaker check** of all German — flagged in `docs/website-copy-DE.md`.
8. **Localise the order flow / emails / account to DE** — still English. Write the preview promise as 48h from the start.
9. **TO-DOS #80** — real print specs after the production visit; before launch; mirror to DE.

## Open questions
- **When the Google sign-in tab does open on iOS, does sign-in complete?** Decides the fix. See `docs/briefs/google-signin-ios.md`.
- **What is the real per-order upload size?** Needed to fix `CLAUDE.md`.
- **For Elanders:** is the blank QR page inside the 40 pages or does it make 41 — and do they need a multiple of four for binding? Plus their Q1 (spine formula) and Q6 (single pages vs spreads).
- **For the Steuerberater:** 10% book rate or 20% standard on a personalised photo book?
- **VAT research unfinished:** the Austrian price-display statute citation, the 2025 EU cross-border SME scheme, and whether the 14-day withdrawal right applies to personalised goods. The last matters for the terms.
- **Would a PWA** deliver the app's loyalty goals at a fraction of the cost? Rejected on preference in S146, never on merit.
- **DE order flow** — when localised, decide `/de/order.html` vs a language-aware single page.
- **Joyride mockups** (owner) + **Dorottya's portrait photo** still gate a clean Joyride merge; the only QA 404s.

## Watch-outs for the next session
- 🔴 **Ask where a number came from before letting it decide anything.** Three unverified figures steered decisions in S146 and all three were wrong in the direction that made work look bigger. See LEARNINGS 2026-07-22.
- 🔴 **A "29-file" CSS change is often a 1-file change.** Mobile rules live in shared `assets/css/mobile.css`; only markup changes cost per-page. Check where the rule lives before quoting a cost.
- 🔴 **`devotion.html` + `radiance.html` contradict live shipping policy.** Harmless only while the site is `noindex`.
- 🔴 **The Cloudflare `noindex` rule must be deleted at launch** (TO-DOS #81) or the finished site launches invisible.
- **Cloudflare Pages auto-detects a root `functions/` dir** — and this repo's is Firebase Cloud Functions. Anything needing a Pages Function (e.g. the sign-in proxy) must resolve that collision first.
- **`text-wrap`: `balance` evens line lengths (headings), `pretty` prevents lone last words (body).** Both now in use; don't swap them.
- **Never run the PDF CLI against a real order** — it pulls originals over the internet and bills egress. The dashboard path is in-region and free.
- **Engine parity still applies** to the staff/customer engines.
- **DE pages are N inline copies** — `docs/website-copy-deltas.md` maps where strings live.
- **`product.js` is locale-aware (S141)**; **`.step-name{min-height:2.6em}` is DE-home-only (S142)**; **`product.css` `.panel{min-width:0}` (S141)** — keep all three.
- **PowerShell splits unquoted comma lists** — `firebase deploy --only "functions:a,functions:b"` must be quoted.
- **Known QA 404s that are NOT regressions** — Joyride mockups + Dorottya's portrait.
