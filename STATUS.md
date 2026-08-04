# Session Status
_Last updated: 2026-08-04 (session 149)_
_Context at save: **QA tooling session — no product code, nothing run against the live site.** Business-case thread parked by the owner pending a conversation with Xenia about the personal/aevia finance boundary. Built the next round of QA probes (upload transport + phone profile + HEIC) and deliberately left them **unrun** until Xenia's email alias rules settle. Working tree carries both S148's and S149's changes, uncommitted; nothing broken._

## Status
**Session 149 (2026-08-04) — QA probes built and parked; finance thread on hold.**

1. **Expert-panel plugin: declined.** Owner asked about `wan-huiyan/agent-review-panel`. Advised against — unvetted third-party code next to the GCS/Gmail secrets, and more importantly it is a **diff-shaped tool for a system-shaped question**. Proved by running `/code-review`, which correctly returned "(none)" because the only pending change was a Markdown brief. `ultra` would have returned the same nothing and billed usage credits for it.
2. **The finding that drove the session.** Every recorded upload failure was **Safari/macOS**; every QA script runs **headless Chromium at 1440×950**. The one configuration known to break had never been tested, and neither had the device most customers will use. `mobile-audit.mjs` stops at order step 2, so cover / special pages / photo grid / submit have **never** been rendered at phone width. Codified in `LEARNINGS.md`.
3. **`qa/p2-upload-probe.mjs` — new (TO-DOS #88).** WebKit by default; ledger of every GCS PUT (status, duration, outcome) so a stall registers as **never-resolved** instead of vanishing; prints a **slot → file map**, the observation the brief calls decisive. `--reuse`/`--distinct` tests the duplicate-photo hypothesis, `--throttle` tests the decorative retry.
4. **`qa/p0-1-template.mjs` — extended, all flags default-off** so the P0 baseline is unchanged. `--device="iPhone 13"` (every screenshot doubles as a horizontal-overflow check), `--browser=webkit`, `--heic=N` (real `.heic` from `assets/test photos/`, swapped into the tail so the count stays exact).
5. **Both scripts pass `node --check`. Neither has been executed.** `qa/test-photos/` is gitignored and local-only, so they could not be smoke-tested.

## Recent decisions
- **QA is parked until Xenia's email rules settle (S149, owner).** She is reworking alias→folder rules and they aren't working yet. No order-minting run until she says go.
- **QA email behaviour must NOT change (S149, owner).** Claude added a `QA_ALLOW_EMAIL=1` gate; rejected and removed. Pausing QA is scheduling, not a code change — normal emails must still fire when QA runs.
- **Business case parked (S149, owner).** The cashflow tab mixes personal and *aevia* finances; that boundary needs agreeing with Xenia first.
- **CAC modelling deprioritised (S149, owner).** "Until we try some pilot 1k budget to understand OUR own CAC, this exercise is a bit useless." Consistent with the S148 watch-out that CVR and CAC are priors, not forecasts.
- **TO-DOS #86 downgraded, not closed (S149, owner).** Google sign-in works on his iPhone now; he attributes the original symptom to ~500 open Safari tabs hitting the limit. Kept at Medium — the S146 structural finding (cross-domain `authDomain` restricted on Safari 16.1+) is independent of tab count.
- **Price is an OUTPUT of the business case, not an input (S148).**
- **No price rise at launch (S148, owner).** Can't out-trust CEWE (~€60 incl. delivery) on day one.
- **Consulting stays OUT of aevia's standalone P&L on purpose (S148, owner).**
- **Elanders is not take-or-pay (S148, corrected).**
- **Working assumption: 20% VAT on photo books (S145, owner).** Steuerberater to confirm.
- **The live site stays `noindex` until launch (S144)** — TO-DOS #81.

## Next steps (priority order)
1. **Wait for Xenia's email rules.** Then, in order: `node qa/p0-1-template.mjs papercut --device="iPhone 13" --browser=webkit`, then the upload probe `--reuse` vs `--distinct`. Expect selector fixes on the first phone run.
2. **`npx playwright install webkit`** before any of the above — a Chromium-only install won't have it.
3. **Ask Xenia for two real Safari orders on her Mac** — one reusing a single photo across cover/fp4/pool, one all-distinct. This is the **authoritative** test; the WebKit probe is the cheap parallel shot.
4. **Printsmarter call about the API** (tomorrow, 2026-08-05) — same production line? same SiteFlow API + carry-over? samples before committing?
5. **Cashflow tab** — blocked on the Xenia conversation, then on four owner inputs: opening cash, personal draw, realistic 2027 consulting, funding scenario.
6. **Write `docs/briefs/business-case-model.md`** — durable map of which tab/row drives what (still owed from S148).
7. Carried: SVS tab fixes #3/#4; correct the 1–4 GB/order figure in `CLAUDE.md`; `waitlist.html` on mobile (#87); `devotion.html`/`radiance.html` dead pages; decide the delivery-charge question (below).

## Open questions
- **Where is the personal / *aevia* finance boundary?** Blocks the cashflow tab. For the Xenia conversation.
- **Does the site charge for delivery at all?** Stripe collects a shipping address and shows **no delivery line** (Batch 4), while S148 models delivery as a €4.99-capped customer charge. The product currently earns €0 on something the model earns on. Owner deprioritised it; it is a **product/PRD gap, not a QA gap**.
- **Is Printsmarter the same production line + same SiteFlow API as Elanders?**
- **Real cold-paid conversion rate** — only the €500–1,000 promo test answers it.
- **For the Steuerberater:** combined SVS/tax with consulting; 10% vs 20% VAT on a personalised photo book; the €8,085/mo max SVS base for 2026.

## Watch-outs for the next session
- 🔴 **Do not run QA until Xenia confirms.** Any order-minting script emails staff on creation (`createUploadSession`, failure mode D2). Unavoidable client-side.
- 🔴 **Playwright's WebKit is not Safari** — same rendering/JS engine, different networking stack, no ITP. The suspected fault is *in* the transport layer, exactly where they diverge. **A reproduction is gold; a clean pass proves nothing.**
- 🔴 **The new QA scripts have never run.** Expect selector fixes at phone width. If a phone run passes first time, be suspicious.
- 🔴 **Use v11 of the business case, not v10** — v10 is corrupted. Consider deleting v10.
- 🔴 **Close Excel before any openpyxl write** — an open workbook locks the file.
- 🔴 **Conversion rate and CAC are priors, not forecasts** — the promo test replaces them.
- **Keep `--heic` small** — each HEIC is one `convertHeic` Cloud Function invocation.
- **Nothing product-facing changed this session** — the S147 upload bug and QA state are unchanged.
- **Uncommitted:** S148 (v11 xlsx, briefs, print quotes, session log) **and** S149 (QA scripts + docs) are both sitting in the working tree.
