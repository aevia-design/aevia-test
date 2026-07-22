# Session Status
_Last updated: 2026-07-22 (session 147)_
_Context at save: **A real customer-facing bug — photo uploads occasionally stall and strand the order — was investigated properly, instrumented, and left unsolved.** That is the honest state: the evidence overturned the starting assumption, two real defects were found, diagnostics are deployed and waiting for the next occurrence. The pre-launch banner was fixed, recoloured and rewritten (live). The QA history was traced: P0/P1 green, P2 never started, nothing re-run in 8 days. Nothing is half-finished; working tree clean._

## Status
**Session 147 (2026-07-22) — upload failure instrumented (not fixed), banner shipped, QA history traced.**

1. **Upload bug (`bde868b`, `91ea866`, TO-DOS #88).** Orders strand at `status: uploading`. **Root cause NOT found.** "Stalls on the last photo" turned out to be a display artefact — 5 parallel workers finish out of order, so any single hung file renders as "N−1 of N". Real pattern: **Papercut is missing exactly `special_pages/fp4.png` in 3 of 4 orders** (AEV-073/074/075 failed, AEV-076 passed); AEV-067 (Wander) lost a trailing block of 7. Diagnostics + a 60s stall timeout are deployed and waiting. Full evidence log and reporting procedure: **`docs/briefs/upload-failures.md`**.
2. **Pre-launch banner (`6b66bb1`).** Live on aevia.at. The overlap was **not** thickness — `.nav` is `position:fixed;top:0` and the banner sits in normal flow, so the nav rendered underneath and lost its top strip. Fixed by offsetting the nav by the banner's measured height. New EN/DE copy, deep terracotta `#9a3b26`. Verified 16/16 via `qa/prelaunch-banner.mjs`.
3. **`confirmUpload` deployed** — pending since S145. The 48h preview promise is finally live.
4. **QA traced (no code).** P0 (S124) and P1 (S125) green; S127 caught a critical promo-payment bug. **P2 never started** — its agents died at a session limit and it was never resumed. **No QA run since 14 Jul**, across Joyride, a domain migration and a mobile overhaul.

## Recent decisions
- **Diagnose before fixing, even under repetition (S147).** Three failures in, the temptation was to patch the retry logic. The evidence instead showed the symptom was a display artefact and the real failure was a single named file. A patch would have hidden it.
- **The retry backoff stays broken on purpose (S147).** 100/200ms is far too fast to survive a real transient — but if a retry fails identically, that is evidence the failure is deterministic rather than transient. Fix it only after the cause is known.
- **`reportUploadFailure` does not change status or email (S147).** An order stuck at `uploading` is already the signal; the diagnostics only explain why. Keeping it inert means it cannot distort the dashboard mid-diagnosis.
- **A season + year is not a hard date (S147, owner).** S130 avoided a launch date because a stranger can screenshot a promise; "autumn 2026" was accepted as soft enough. Flagged rather than silently overwritten.
- **No fire-engine red on a craft brand (S147).** A saturated red reads as discount-sale; terracotta `#9a3b26` is as prominent and stays in the warm editorial family.
- **The iOS app waits for evidence, not enthusiasm (S146).** Triggers to revive it are in `docs/briefs/ios-app.md`.
- **Copy must not diverge between mobile and desktop (S146, owner).** Mobile problems get layout fixes, not shortened copy.
- **Working assumption: 20% VAT on photo books (S145, owner).** Steuerberater to confirm.
- **RGB is settled, do not re-ask (S119, reconfirmed S145).**
- **The live site stays `noindex` until launch (S144)** — Cloudflare header rule, deleted on launch day (TO-DOS #81).

## Next steps (priority order)
1. **Wait for the upload bug to recur, then follow `docs/briefs/upload-failures.md`.** The critical step is **not closing the tab** — a stalled fetch only reports once the 60s timeout fires. The decisive unknown: is the photo assigned to fp4 also used elsewhere in the same order?
2. **Correct the 1–4 GB/order figure in `CLAUDE.md`** — wrong (real orders are ~150–450 MB) and it inflates every cloud cost estimate. **Needs the owner's real number.**
3. **Verify TO-DOS #87** — does `waitlist.html` render unstyled on a phone? It is what every real aevia.at visitor currently sees.
4. **TO-DOS #86 (Google sign-in)** — one question on a real iPhone: when the tab opens, does sign-in complete?
5. **Decide what to do about QA** — re-run the scripted P0 suite (cheap, reusable) to check the last 8 days did not regress the customer path, and decide whether P2 gets built before real customers. Owner parked this deliberately in S147.
6. **Decide on `devotion.html` + `radiance.html`** — dead pages, still live, advertising shipping to DE/CH/UK/USA.
7. **Confirm `prices.js` €70 is gross, not net.**
8. **Xenia native-speaker check** of all German — now includes the new banner string.
9. **Localise the order flow / emails / account to DE.**
10. **TO-DOS #80** — real print specs after the production visit.

## Open questions
- **Is the fp4 photo a duplicate of another photo in the same order?** The one observation that confirms or kills the duplicate-`File` hypothesis. See `docs/briefs/upload-failures.md`.
- **What is the real per-order upload size?** Needed to fix `CLAUDE.md`.
- **When the Google sign-in tab does open on iOS, does sign-in complete?** See `docs/briefs/google-signin-ios.md`.
- **Should a customer be able to resume a failed upload at all**, or is the order abandoned and re-placed? (TO-DOS #90.)
- **For Elanders:** is the blank QR page inside the 40 pages or does it make 41 — and do they need a multiple of four for binding? Plus their Q1 (spine formula) and Q6 (single pages vs spreads).
- **For the Steuerberater:** 10% book rate or 20% standard on a personalised photo book?
- **VAT research unfinished:** the Austrian price-display statute, the 2025 EU cross-border SME scheme, and whether the 14-day withdrawal right applies to personalised goods.
- **DE order flow** — `/de/order.html` vs a language-aware single page. Related: there is **no DE waitlist page**, so the German banner links to the English one.
- **Joyride mockups** (owner) + **Dorottya's portrait photo** still gate a clean Joyride merge.

## Watch-outs for the next session
- 🔴 **A stalled `fetch` never rejects.** No timeout means no error, no catch, no report — the failure leaves zero trace and the overlay spins forever. This is why AEV-075 recorded nothing. Any long-running `fetch` needs an `AbortController`.
- 🔴 **Check a page is actually deployed before reading anything into a test.** AEV-075 was placed 7 minutes before the diagnostics were pushed, so it ran old code and "proved" nothing. Also: `curl` on `/pages/order.html` returns a **308** to the extensionless URL — without `-L` you are grepping a redirect, not the page.
- 🔴 **Do not call something deterministic on a sample of three.** Papercut/fp4 was 3-for-3, then AEV-076 passed.
- 🔴 **Ask where a number came from before letting it decide anything** (S146). Three unverified figures steered decisions and all three were wrong.
- 🔴 **`devotion.html` + `radiance.html` contradict live shipping policy.** Harmless only while the site is `noindex`.
- 🔴 **The Cloudflare `noindex` rule must be deleted at launch** (TO-DOS #81) or the finished site launches invisible.
- **A fixed-position nav does not move for injected content.** `.nav` is `position:fixed;top:0`; anything inserted at the top of `<body>` renders underneath it. Offset the nav, not the content.
- **`site-mode.js` is inert on localhost by design.** To test it, route `https://aevia.at/**` onto the dev server (see `qa/prelaunch-banner.mjs`) rather than adding a test-only flag.
- **Cloudflare Pages auto-detects a root `functions/` dir** — and this repo's is Firebase Cloud Functions. Anything needing a Pages Function must resolve that collision first.
- **Never run the PDF CLI against a real order** — it pulls originals over the internet and bills egress. The dashboard path is in-region and free.
- **Reuse QA orders, don't mint new ones** (owner directive, S126) — except when the order-creation path itself is under test.
- **Engine parity still applies** to the staff/customer engines.
- **DE pages are N inline copies** — `docs/website-copy-deltas.md` maps where strings live.
- **PowerShell splits unquoted comma lists** — `firebase deploy --only "functions:a,functions:b"` must be quoted.
- **Known QA 404s that are NOT regressions** — Joyride mockups + Dorottya's portrait.
