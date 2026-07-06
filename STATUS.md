# Session Status
_Last updated: 2026-07-06 (session 110)_
_Context at save: Customer-preview polish shipped (`c04e183`) — instruction-bar wrap fix + Preview made view-only. Owner ran `firebase deploy --only functions` (closes the S109 email-design deploy gap). No OPEN owner blockers; verification-on-live pending._

## Status
**Session 110 (2026-07-06) — Customer-preview interface review. ONE commit pushed to `main` (`c04e183`) → Cloudflare. (1) Instruction top-bar: split each tip into a non-breaking `<span>` with leading `·` dividers so phrases no longer wrap mid-sentence / orphan "through your finished book". (2) Preview mode is now genuinely VIEW-ONLY — added a `window._previewMode` guard on the crop-drag (reposition) plus one scoped CSS rule `.page-body.preview-mode #book-canvas [contenteditable],.photo-slot{pointer-events:none}` that also kills slot-swap drag + caption editing; scoped to `#book-canvas` so flip nav stays clickable, auto-restores on Edit. Customer engine only (no staff mirror needed). (3) Owner's point-3 question (why special/cover photos can't be dragged to the sidebar) reviewed + PARKED in `ideas.md` — the lock is intentional (required slots, `book-completeness` guard); repositioning already covers the real need; build a "Replace this photo" flow only if a real customer asks. Owner also ran `firebase deploy --only functions` (closes S109 bug-2 email-design deploy gap). `npm test` = 167/167. Full log: `sessions/2026-07-06-s110.md`.**

- **▶ RESUME HERE (S111):** (a) **Verify the email deploy** — place a fresh order, confirm the confirmation email now renders the new footer-logo design (was the pre-S105 "— The Aevia team" layout before this session's deploy). (b) **Live E2E the preview-send flow** (carried S109): generate link → QA → "Send preview to customer" → email lands + status → Review sent + "View your book" link works. (c) **Eyeball S110** on live: instruction row wraps cleanly + Preview blocks drag/reposition/caption-edit while Edit still works. Carried: print-house RGB→CMYK reply (waiting); delivery fee (pending visit); render-pipeline extraction into a shared module (permanent fix behind the engine-parity tripwire).
- **Watch-out (S110):** S110 fixes are LIVE but UNVERIFIED in the real UI — owner tests Cloudflare (hard-refresh; cached engine HTML hides changes). Preview view-only relies on the `#book-canvas` pointer-events scope — if flip nav is ever moved inside `#book-canvas` it would get disabled too. `_previewMode` only guards crop-drag; captions/swap rely on the CSS rule. Point 3 is PARKED, not a bug — don't re-open without a real customer request.

### Previous: Session 109
**Session 109 (2026-07-06) — Preview-ready email + "Send preview to customer" flow shipped, then a live AEV-048 (Tender) test surfaced + fixed four bugs. THREE commits pushed to `main` → Cloudflare. (1) `dfafaf6` preview-send flow: split "Generate preview link" (now pure staff QA — token only) from a new **"Send preview to customer"** dashboard button → new **`sendPreviewEmail` Cloud Function** (server-side guards, status → `review_sent`, `sentSnapshot`+`sentAt` captured at send, resend-safe, sends the S105-approved preview-ready email). Nudge now measures actual send time. Actions column widened. Owner deployed `sendPreviewEmail`; not yet E2E-tested. (2) `252b2ce` — **Bug 1 (CRITICAL, FIXED + VERIFIED LIVE):** signed-in order email went to browser-autofill's gmail not the logged-in yahoo account → confirmation misrouted + order unlinked (`getMyOrders` matches on order email); fix forces + locks the email field to the verified account email when signed in (guests unaffected); owner confirmed retest landed in yahoo. Plus Bug 3 (Tender "Front — names" → "Front — title" in `tender-data.js:71`) and Bug 4 (upload-overlay copy stop-slop: em dashes, "lab"→"studio", "orders"→"albums"). (3) `39dd32f` — confirmation SCREEN copy 48h → 24h everywhere (matches the email) + em dashes dropped. Preview-ready email artifact built + owner-approved. `npm test` = 167/167. Full log: `sessions/2026-07-06-s109.md`.**

- **▶ RESUME HERE (S110):** (a) **CONFIRM Bug 2 fixed** — owner must run `firebase deploy --only functions`: the live confirmation email still renders the PRE-S105 design ("— The Aevia team", logo on top) because the `confirmUpload`/`index.js` email redesigns (S107 `00b0d86`) are committed but were never deployed (owner's deploy this session only pushed `sendPreviewEmail`). After deploy, place a fresh order and verify the new footer-logo design. (b) Owner is playing with a new order and will report thoughts/bugs. (c) **Live E2E the preview-send flow:** generate → QA → "Send preview to customer" → email lands + status → Review sent + "View your book" link works. Carried: print-house RGB→CMYK reply (waiting); delivery fee (pending visit); render-pipeline extraction (permanent fix behind the engine-parity tripwire).
- **Watch-out (S109):** `sendPreviewEmail` is a NEW function — keep it in every future `firebase deploy`. `sentSnapshot` is written only on SEND now (not generate); it is never read by the customer view (renders from live staff state), so the change is safe. AEV-048 stays attributed to gmail (test order, not relinkable). Staff 24h-SLA nudge postponed (S85 visual dashboard nudge may suffice). Owner tests the LIVE site — push + hard-refresh before asking him to verify.

### Previous: Session 108
**Session 108 (2026-07-06) — Small Tender fixes + an engine-disparity investigation. THREE commits pushed to `main` (`182187d`, `3f09354`, `0ce724e`) → Cloudflare; owner confirmed working. (1) Tender cover CSV sync — spine caption X `222.5→222`mm in `tender-data.js` (shared → hits staff engine + customer preview + PDF). (2) Reposition ✥ button on special-page photos: special slots (story/words/toy/steps/artwork) had working always-on drag but no visible button unlike normal slots — extracted a shared `attachRepositionHandle()` in EACH engine and gave special slots the same ✥ toggle. Heart + cover slots deliberately KEEP always-on drag with no button (clip-masked → a corner button gets clipped; owner picked this "option 1"). (3) Engine-disparity review: the two engines SHARE all data (`*-data.js`, 3 JS modules) but DUPLICATE the render pipeline (~29 same-named functions inlined in both HTML files). The session's two "bugs" were NOT divergence — the owner was testing the LIVE site while the 3 commits were still unpushed (+ cached `tender-data.js`); pushing + hard-refresh fixed both. Shipped a guardrail: `tests/engine-parity.test.js` fails if a shared render function is dropped from one engine. `npm test` = 167/167. Full log: `sessions/2026-07-06-s108.md`.**

- **▶ RESUME HERE (S109):** No forced next step. Candidates: (a) the big **render-pipeline extraction into a shared module** — the permanent fix for the two-engine burden the tripwire stands in for; delicate render path, deserves its own test-backed session. (b) **Emails** (carried from S107): owner tests the new order-confirmation template + `support@` reply redirection on the next real order round; then build the net-new **preview-ready + dispatch (+tracking)** emails on the `renderEmail()` helper. Blockers still open: delivery fee TBD, tracking partner, e.U. entity name.
- **Watch-out (NEW):** owner tests the **LIVE site, not localhost** — always PUSH before asking him to verify, and remind him to **hard-refresh** (cached `*-data.js` / engine HTML hides changes). The 29-function list in `engine-parity.test.js` is a hand-maintained contract — update it when a shared render fn is intentionally added/removed in both engines. ✥ button is on regular + special slots only, NOT heart/cover (by design).

### Previous: Session 107
**Session 107 (2026-07-06) — Brevo domain-auth blocker (S106) is GONE — owner confirmed mails land in the Brevo "Delivered" tab. Verified the S106 auth slice live (signup→verify→forgot-password→reset→confirmation, all pass). Then ran an INDEPENDENT auth security audit (`reviewer-agent`, verdict: Accept, no vulnerabilities) and shipped two commits. (1) `b1bda82` auth hardening: dedicated forgot-password step, BRANDED in-app password reset (reset now completes on account.html via oobCode-wrapping, not Firebase's default page), new `sendPasswordChangedEmail` security alert, server-side throttle on `resendVerificationEmail`. (2) `00b0d86` full email-wiring pass: account emails from `noreply@` (with "don't reply, contact support@" notice), order/payment from `orders@` reply-to `support@`, order+payment confirmations rebuilt on the S105 `renderEmail()` template (owner approved via artifact), `xenia@` leak fixed, dead newsletter Subscribe form removed from all 16 customer pages, and the previously-uncommitted `upload.js` Brevo migration swept in. 138/138 tests, headless-verified. Full log: `sessions/2026-07-06-s107.md`.**

- **▶ RESUME HERE (S108):** owner runs `firebase deploy --only functions` (sender/template changes; frontend already live via main→Cloudflare). Then on the next order-testing round, eyeball the new order-confirmation template + confirm `support@` reply redirection (Brevo delivery already confirmed). Then the journey's remaining NEW emails: **preview-ready + dispatch (+tracking)** on the same `renderEmail()` helper. Blockers still open: delivery fee TBD (blocks dispatch/checkout totals), tracking partner, e.U. entity name.
- **Email address map (now wired):** `hello@`=general contact (website/help); `support@`=all customer help (account/orders/payment); `partners@`=artist channel; `noreply@`=account/security emails; `orders@`=From for order/payment emails but reply-to support@.
- **Newsletter + 10%-off-first-order DEFERRED** (`/solutioning`) to the marketing phase — bundle with promo-code system (TO-DO #76). Dead Subscribe form removed now.
- **Watch-out:** branded reset needs account.html deployed; the reset link targets `ACCOUNT_URL`. Always request a FRESH reset after a deploy. `sendPasswordChangedEmail` is a NEW fn — must be in the deploy. `/shaping` skill not installed in this plugin version (use `solutioning`).

### Previous: Session 105
**Session 105 (2026-07-03) — Email design thread continued. Fixed the blocking logo-crop bug, then designed + iterated the FULL customer email journey (6 emails) as a review artifact with the owner. Researched Firmenbuch e.U. costs. Design is APPROVED in mockup form; backend implementation is the next task. Nothing committed. Full log: `sessions/2026-07-03-s105.md`.**

- **Approved mockup (draft 6):** https://claude.ai/code/artifact/04371929-d903-4a80-84aa-73a90be95cc6 — 6 emails: signup verification, order confirmation, **preview-ready (NEW)**, payment received, **dispatch (NEW)**, **password reset (NEW)**. Source HTML in S105 scratchpad (`.../dbc9b55f-.../scratchpad/email-mockups.html`) — temp, may be cleaned; rebuild from the artifact URL.
- **Logo-crop bug FIXED.** Root cause was a **corrupt base64 copy baked into the mockup** (valid header, truncated pixels → top-slice render) — NOT the CSS and NOT the logo asset. Fix = re-encode from `assets/images/logo - transparent.png`. Lesson: byte-length match ≠ integrity; render to verify.
- **Reality check vs code:** only order-confirmation (`upload.js`) + payment-received (`index.js`) + signup-verification (Firebase Auth) exist today. **Preview-ready, dispatch (+tracking), password-reset are NOT built** — net-new, not restyles. The old "shipped" mockup email was fictional.
- **Design decisions (owner-approved):** logo moved header→footer; footer LEFT-aligned, tiered (logo → italic studio description → hairline → legal line → "Questions? Write to us at hello@aevia.at" → "© 2026 Aevia. All rights reserved. · Aevia™"). Legal footer = address (Bloch-Bauer-Promenade 20/18, 1100 Vienna) + **GISA 39598240**; **entity name OMITTED** (Aevia e.U. not registered yet); **Aevia™** (filed, not ®). Order confirmation shows **"Book price €90"** + "Delivery is added at checkout, and you won't be charged until you approve" (`/solutioning`: show price but framed honestly). Dispatch shows order+price+total+delivery address+"Track your parcel". Copy: 48h→24h; preview = customer edits themselves then approves; stop-slop, no em dashes.
- **Firmenbuch e.U. cost research:** ~€100–200 one-off (court ~€79 + notary from ~€100), no capital. NeuFöG waiver likely N/A (owner already trades). Registering "Aevia e.U." → becomes legal name, no personal name in footer. Owner deciding.

### ▶ NEXT SESSION (Session 106)
1. **Implement the approved emails in code (backend-first, owner deploys).** Restyle order-confirmation (`upload.js`) + payment-received (`index.js`) to the approved design; build NEW: preview-ready email, dispatch email + tracking capture, password-reset flow (`account.html` + Cloud Fn); route signup-verification through Brevo (`generateEmailVerificationLink()`). Reuse the shared transporter (`functions/email.js`, S102). Rebuild the design from the artifact URL if the scratchpad HTML is gone.
2. **Blockers/placeholders to resolve first:** delivery fee is still TBD (blocks dispatch/checkout price lines); dispatch tracking depends on the delivery partner; footer legal name depends on the e.U. decision.
3. **Live E2E test** order → confirmation → payment → dispatch (carried since S102).
4. **Owner actions (carried from S104, status unknown):** alias Entra→Exchange sync retest; Firebase custom-domain verification.

### Previous: Session 104
**Session 104 (2026-07-03) — Email design thread: alias bug root-caused (Entra→Exchange sync lag, waiting), Firebase custom-domain verification started, premium-email research done (`docs/briefs/premium-email-research.md`), email mockups iterated 3 rounds but NOT approved — logo renders cropped, owner not happy yet. Full log: `sessions/2026-07-03-s104.md`.**

- **Mockup artifact (3 drafts, unapproved):** https://claude.ai/code/artifact/504a7cc5-be19-48f0-8e44-0e33abc73967 — 4 emails (signup verification, order confirmation, payment received, post-payment). v3 = simple logo-only header, no imagery, treat as TEMPORARY until real photography. **Open bug: embedded logo renders clipped in the header (base64 verified intact, CSS looks sane, cause not found — fix FIRST next session before more design iteration).**
- **Alias "From" bug ROOT-CAUSED:** aliases exist in M365 Active Users (Entra) but hadn't synced to Exchange Online — OWA From-dropdown doesn't offer them (typed ≠ selectable; Exchange silently sends as primary). NOT a Delegation/Send-As issue. Fix = wait for sync; Microsoft ticket if not selectable 24h+ after creation. Don't re-add the aliases.
- **Firebase Auth custom domain:** owner added DNS at Helloly; Console shows "verification in progress". Fixes sender address only — built-in template stays plain text.
- **Owner rejected plain-text auth emails** → route signup verification through Brevo (`generateEmailVerificationLink()` + Cloud Fn + branded HTML). Scope: verification only, password-reset separate. Papier reference email saved at `assets/email - examples/A warm welcome to Papier.eml`.
- **KEY: the 3 order-journey templates already exist branded** in `upload.js`/`index.js` (logo, serif, summary box) — the old "MJML templates not yet built" next-step was stale. Task = polish to premium, not build from zero.
- **Research:** `docs/briefs/premium-email-research.md` — best-practices checklist + tooling comparison; MJML re-confirmed. Brief `docs/briefs/email-communication.md` updated per `/critic-agent` review.

### ▶ NEXT SESSION (Session 105)
1. **Fix the logo-crop bug in the mockup** (reproduce in a local browser first), then iterate the design with the owner until happy — he is explicitly NOT satisfied yet. Work against `docs/briefs/email-communication.md` + `docs/briefs/premium-email-research.md`.
2. **Check alias sync:** owner re-tests the OWA From-dropdown; if aliases still not selectable, open a Microsoft support ticket.
3. **Check Firebase custom-domain verification** completed in the Console.
4. Once design approved: implement templates in `functions/email.js` (MJML → static HTML) + build the Brevo-routed signup-verification email (new Cloud Fn, backend-first deploy).
5. **Live E2E test** of the full order → confirmation → payment → post-payment chain (carried since S102).

### ⚠ Watch-outs (S104)
- **Never rewrite UTF-8 HTML via PowerShell** without explicit encoding — it mojibake'd em dashes ("â€”") in the mockup once already. Use the Edit tool.
- No em dashes in customer email copy (stop-slop rule + encoding risk).
- Emails are TEMPORARY-simple by design until the owner shoots real photography — keep a clean photography slot below the logo header; no CSS-drawn placeholder imagery (owner rejected it).

### Previous: Session 103
**Session 103 (2026-07-02) — Email migration rollout: aliases live, code bugs fixed + deployed, email design approach decided. One unresolved bug (alias "From" display) parked for a retest tomorrow. Full log: `sessions/2026-07-02-s103.md`.**

- **M365 aliases + Outlook rules DONE.** `orders@`, `hello@`, `partners@`, `support@aevia.at` added to `xenia@aevia.at`; matching per-alias inbox folders + rules created. `partners@` chosen over `artists@`/`contact@` (standard convention, more generic).
- **2 code bugs found + fixed + DEPLOYED** (`firebase deploy --only functions` run by owner): `functions/.env` `EMAIL_NOTIFY` was bypassing the `orders@` alias (now fixed); `functions/email.js` `FROM.artists` was stale-pointing at `hello@` instead of the decided `partners@` (now fixed).
- **Gap found: no password-reset flow** in `account.html` — `sendPasswordResetEmail` never called, no "forgot password" UI. Net-new finding, not previously tracked anywhere.
- **Email design tooling decided** (`/conducting-research`): author templates in **MJML as a design-time-only tool** (compile via free web playground → paste static HTML into `email.js`) — no new runtime dependency, fits the no-build-tools constraint. Chosen over Brevo's own editor (branding stamp + generic look), hand-coded HTML (fragile/high-maintenance), React Email/Maizzle (needs a build pipeline Aevia doesn't have).
- **Unresolved: alias "From" display bug.** Sending manually from `support@aevia.at` in Outlook, recipients see `From: xenia@aevia.at` (confirmed via raw headers, not just formatting) — likely M365 "Send As" permission propagation lag for brand-new aliases (can take hours, sometimes 24-48h). **Owner will retest tomorrow.**
- **Live E2E test deferred** (owner chose to prioritize the design-tooling question this session) — still needed before calling the email migration fully done.
- Full plan: `docs/briefs/email-communication.md` (fully updated this session — alias list final, phasing checkboxes marked, MJML decision + code-fix sections added, open questions updated).

### ▶ NEXT SESSION (Session 104)
1. **Retest the alias From-display bug** — if still broken after propagation time, check M365 admin → Recipients → Mailboxes → Xenia → delegation/Send-As permission explicitly.
2. **Build the MJML templates** — order confirmation, payment received, post-payment confirmation. Copy + visual design, then `/stop-slop` pass (customer-facing).
3. **Live E2E test** of the full order → confirmation → payment → post-payment chain, now that the code fixes are deployed.
4. **Firebase Auth custom domain** — independent, not started; fixes the spam-flagged `noreply@aevia-uploads.firebaseapp.com` signup email.
5. **Remaining brief open questions**: general contact form (in/out of scope?), confirm Brevo free-tier transactional-branding behavior, lightweight abuse protection on `submitArtistApplication`, and a priority decision on the password-reset gap.

### Previous: Session 102
**Session 102 (2026-07-02) — Email-communication overhaul: brief written + build STARTED, NOT DEPLOYED. Shaped a plan (`docs/briefs/email-communication.md`) to fix branding/deliverability: split human mail (Microsoft 365, `xenia@aevia.at` + free aliases) from automated app mail (new: Brevo free tier). Reasoning verified against primary sources: Microsoft is deprecating SMTP-AUTH basic auth (partial rejection from March 1 2026), so building automated sending on M365 SMTP now would break within months; Brevo chosen for its free tier (~9k emails/month, EU-hosted/GDPR, established company). Code built: new `functions/email.js` (shared Brevo transporter + sender identities) replacing 4 duplicated Gmail-SMTP blocks across `upload.js`/`index.js`; also added the previously-missing post-payment customer confirmation email (TO-DO #56) in the same pass. 138/138 tests pass; `transporter.verify()` confirmed working against Brevo with the owner's real credentials. Owner registered Brevo, added SMTP creds to `functions/.env` (not committed), and authenticated `aevia.at` in Brevo via 4 DNS records at Helloly (Brevo-code TXT, DKIM1+DKIM2 as **CNAME** — not TXT, that was the fix for an initial mismatch error — and DMARC TXT). **Decided NOT to touch the existing SPF record** — Brevo authenticates via DKIM alone per its own docs; editing a working hard-fail SPF record for no gain was flagged as unnecessary risk. Full log: `sessions/2026-07-02-s102.md`.**

- **NEXT (S103) — resume mid-build, in order:** (1) owner adds M365 aliases `orders@aevia.at` + `hello@aevia.at` onto Xenia's mailbox + 2 Outlook inbox rules to keep the shared inbox sorted; (2) owner-triggered deploy of `functions/index.js`+`upload.js`+`email.js` (backend-first — do not deploy without the owner); (3) live end-to-end test: real test order, confirm branded email arrives outside spam, reply-to routes back to Xenia; (4) Firebase Auth custom domain (Console → Authentication → Templates), independent, can run in parallel; (5) resolve brief's open questions — artist-enquiry alias (`hello@` default, unconfirmed), whether a general contact form is in scope, Brevo transactional-branding fine print, who defines Outlook inbox rules, lightweight abuse-protection look at the public `submitArtistApplication` endpoint.
- **Full plan + reasoning:** `docs/briefs/email-communication.md` — read this first.
- Carried from S101 (untouched this session): live E2E check of the photo-reposition tool on a non-approved order; print-house RGB→CMYK email; repo hygiene (large untracked probe-script pile); customer accounts Phase 2 / email journey.

### Previous: Session 101
**Session 101 (2026-07-02) — Phase 4 SHIPPED: customer photo repositioning, live both ends. Backend (`functions/index.js`: `saveOrderState` persists `customerHeartCrop`, `getOrder` returns it, `approveOrder` merges it → `staffHeartCrop` so PDF/staff engine need no change) DEPLOYED by owner. Frontend (`pages/customer-preview.html`): staff reposition tool ported 1:1 — ✥ handle on regular slots, always-on drag on cover/heart/story photos, `heartCrop` in the save payload, fully disabled when approved/paid; new edit-hint bullet. Owner manually verified the drag. Also shipped the carried S92 copy (help `#preview-quality` FAQ + customer-preview quality note + CLAUDE.md stop-slop rule). Commits `480c4a0` + `8ac3514`, pushed → Cloudflare. 138/138 tests; read-only path verified via Playwright on approved AEV-023. DECIDED: `heartCrop` legacy name STAYS (rename would touch Firestore fields on existing orders + functions + Cloud Run renderer for zero functional gain; re-affirms S50; memory `project_heartcrop_name`). Full log: `sessions/2026-07-02-s101.md`.**

- **NEXT (S102) candidates:** (1) live E2E of reposition on a NON-approved order — reposition → Save → reload link → crop persists; then approve a test order + dashboard-generate the PDF to confirm the crop prints (never render locally); (2) print-house RGB→CMYK email (drafted S100, owner to send); (3) repo hygiene — untracked probe-script pile, uncommitted `/add-template` skill, untracked session logs, `context/tone-of-voice.md` owner review still owed; (4) customer accounts Phase 2 / email journey (first verify the owner's S91 address-fns deploy happened).
- **Generate-caption button** — was OpenAI out-of-credit; owner topped up in S100. If still failing, redeploy `functions:generateCaption`.

### Previous: Session 100
**Session 100 (2026-07-02) — SHIPPED a batch of Newborn-testing-round order-flow fixes + a full `/stop-slop` copy pass across all templates. Pushed to `main` (`29737c3`, `bdc26d4`) → Cloudflare deploying. Also pushed the carried S99 exp2 redesign (`27d83e8`) + S97 flat mockups (`361b9b1`) live at the start of the session. Order form (`pages/order.html`): cover text now REQUIRED (first cover caption, template-agnostic); removed "sets the mood" copy; Labour drops the baby's-name field and auto-fills the welcome from the cover name (`coverNameValue()`) + adds per-page photo hints via new `orderFormPhoto.slotHints`; FIXED the low-res badge bug (badges vanished on delete — `buildThumbEl` now re-adds them); drop zone stays visible mid-upload; `text-wrap: pretty` on hints. Copy: owner-approved stop-slop of every field hint across newborn/wander/scribble/papercut/tender + shared strings ("staff"→"we", em dashes out); art-gallery product copy → "two of their drawings". Newborn spine caption `wMm 45→65` synced from the Cover CSV. Verified 138/138 tests + Playwright newborn-form smoke (0 console errors); owner eyeballed live. Full log: `sessions/2026-07-02-s100.md`.**

- **NEXT (S101) = Phase 4: customer photo repositioning (BACKEND-FIRST).** Port the staff reposition tool ("✥" `.reposition-handle`) to `customer-preview.html`. The customer engine already LOADS + APPLIES `heartCrop` read-only but has no edit UI and `saveBookState()` omits it. Extend the `saveOrderState` Cloud Fn + order model to persist a customer crop (owner deploys), then port handle+CSS+drag, add heartCrop to the save payload, disable under `_readOnly`, and add a `#edit-hint` bullet + tooltip (point 9). Mirror in both engines. Details: `sessions/2026-07-02-s100.md` + plan `C:\Users\evgmy\.claude\plans\cool-thanks-will-share-lovely-sedgewick.md` (Phase 4).
- **Generate-caption button** — diagnosed as OpenAI out-of-credit (billing, not a bug); owner topped up balance. If still failing after propagation, redeploy `functions:generateCaption` (deployed fn may hold an older key).
- **Print-house colour thread (open):** our PDFs are RGB; printer quoted 4/0+4/4 CMYK. Email drafted (ask printer who converts RGB→CMYK before we build a CMYK pipeline) + min-orders + API access. Launch timeline saved to memory `project_launch_timeline`.
- Carried: `.claude/skills/add-template/SKILL.md` (whole skill uncommitted); S96–S99 throwaway probe-script pile in `scripts/` still uncleaned; owner S91 backend deploy (`firebase deploy` address fns) still pending.
- **exp2 + flat mockups now LIVE** — the old "not pushed" caveats from S97–S99 are resolved.
- Orders: 039 newborn, 040 wander, 041 scribble, 043 papercut, 044 tender; cover-wraps in `sessions/qa-runs/cover-wrap-<order>.png`; local render PNGs in gitignored `mockups/<order>/`.

### Previous: Session 99
**Session 99 (2026-07-01) — SHIPPED the exp2 product-page redesign to ALL FIVE built templates (`27d83e8`; pushed in S100). Shared `assets/css/product.css` + `assets/js/product.js`; each page carries a small `window.PRODUCT` config. Grey mockups under `assets/images/mockups/exp2/<template>/`. Thumbnail balance rule in `product.js` (≤6 → one centred row; 7+ → two rows of `ceil(n/2)`). Hero 4:3 locked. Full log: `sessions/2026-07-01-s99.md`.**

### Previous: Session 98
**Session 98 (2026-07-01) — PRODUCT-PAGE REDESIGN, Scribble exp2 (iterated live with owner over ~5 rounds; NOTHING committed). New self-contained `pages/scribble-exp2.html` using the flat mockups on a warm-grey backdrop. Hero = zoomed front cover (front cover is also thumbnail #1 + default hero, AU pattern); 6+5 thumbnail grid (row1 covers+spreads, row2 the 5 specials); right column = horizontal special-spread cards (image left, name/desc/Add); click a special thumb → it becomes the hero; prev/next arrows + keyboard ←/→ (works in the full-screen lightbox too). Grey backdrop is baked at the compositor (`scripts/compose-mockup.mjs` now takes `BG_R/G/B`; DEFAULT UNCHANGED so live templates untouched); web images cropped tight-but-centred to the book via new `scripts/exp2-images.mjs` → scratch `assets/images/mockups/exp2/scribble/`. `/design-review` = approved-with-fixes (all applied: width 1160→1400, hero scale, cover-as-thumb-#1). Owner is reviewing with Kseniia and will return with comments. Full log: `sessions/2026-07-01-s98.md`.**

- **NEXT (S99):** (1) apply Kseniia's comments on scribble-exp2; (2) **decide 4:3 vs 5:4 hero** (comparison shots made — owner deferred); (3) **roll to the other 4 templates** (regen spreads on grey `BG_R=216 BG_G=212 BG_B=207 node compose-all.mjs <order> <template>` → add slot map + crop rects to `exp2-images.mjs` → build `<template>-exp2.html`); (4) then decide what to commit + whether exp2 pages replace the real product pages (interplays with the S93 uncommitted gallery rework).
- **Nothing committed.** Only tracked change = `scripts/compose-mockup.mjs` (backdrop env; default unchanged → safe). `scribble-exp2.html`, `exp2-images.mjs`, `assets/images/mockups/exp2/**` untracked. exp2 images are scratch; production `front-new`/`back-new`/spreads untouched.
- **Grey backdrop default is OFF** (240 near-white); grey spreads exist only after regenerating a template with `BG_R/G/B`. Raw captures for all 5 orders are local (no re-capture / staff pw / egress needed).
- Carried: `361b9b1` (S97 flat mockups) still NOT pushed; S93 product-page rework still uncommitted; S96 throwaway probe-script pile in `scripts/` still uncleaned.
- Orders: 039 newborn, 040 wander, 041 scribble, 043 papercut, 044 tender; cover-wraps in `sessions/qa-runs/cover-wrap-<order>.png`; local render PNGs in gitignored `mockups/<order>/`.

### Previous: Session 97
**Session 97 (2026-07-01) — FLAT MOCKUPS FINALISED + COMMITTED (`361b9b1`, on main, NOT pushed). The "last dance on the front" is done: the book's left edge now reads as a real hardcover binding joint. Two fixes to `scripts/compose-flat-mockup.mjs`: (1) spine colour is auto-sampled per template from the engine cover-wrap's centre strip — deleted the hardcoded `SPINE_COLORS` table (it was wrong: papercut was blue-grey ≈ cover → invisible; real spine is mint `121,186,155`); (2) the hinge is a scene-fixed Gaussian profile — spine → soft recessed groove (shadow) → subtle highlight → flat cover, gradient-based, one rule for all 5 fronts. Newborn reproduction gate held at 3.09 (≈ S96's 3.06). All 10 final webps regenerated + committed to `assets/images/mockups/{template}/{front,back}-new.webp` (overwrote S95-broken ones). Housekeeping: cleared `temp-screenshots/review/`, removed the `.s96.mjs` backup. Recipe updated in memory `project_svg_flat_mockups`. Full log: `sessions/2026-07-01-s97.md`.**

- **Not pushed** — `361b9b1` is local only.
- Orders: 039 newborn, 040 wander, 041 scribble, 043 papercut, 044 tender; cover-wraps in `sessions/qa-runs/cover-wrap-<order>.png`; local render PNGs in gitignored `mockups/<order>/`.

### Previous: Session 96
**Session 96 (2026-07-01) — FLAT MOCKUP COMPOSITOR BUILT + working across all 5 templates; almost done. Rewrote `scripts/compose-flat-mockup.mjs` per the S95 brief. Newborn reproduces the approved render exactly (interior diff 3.06, zero shift) = the correctness gate. Fronts recolour the spine correctly; bottom-edge navy bleed fixed; backs are face-swap only (a back-spine-recolour experiment was tried + REVERTED — Xenia rejected it). Owner + Xenia reviewed and want ONE more FRONT change (specifics not yet given) that will likely touch every template → handed over to start clean. NOTHING written to `assets/`, nothing committed (every run used `--scratch`). Previews in `temp-screenshots/review/`. Full log: `sessions/2026-07-01-s96.md`.**

- **How it works:** base = PSD `psd.canvas` composite; overwrite the Main-Image region [935,436]1128×1127 with the order cover face + reapply Layer 1 (multiply) + Highlight (screen×0.15); recolour the thin front spine sliver (x~930-938) light-blue→template via luminance; recolour the bottom-edge cool-navy bevel→cover colour; back = no spine recolour. Spine colours: newborn `#c0d5ee`, wander `#86A37B`, scribble `#fdd16f`, papercut `#8bb8d8`, tender `#fbf8f6`.
- **PSD model (verified by per-layer render):** scene FIXED; per template change ONLY cover face + front spine colour. `Main Image`=white 3D-lit book form (swap target); `111`/`""`=flat artwork wrap `[back|spine|front]`; `Layer 1`+`Highlight`=lighting; `Shadow`+`BG texture`=drop shadow+backdrop.
- **Backs have no template spine colour** — Xenia's mockup doesn't expose one (right edge = cover-colour fold → backdrop). Accepted; don't re-attempt the back-fold recolour.
- **NEXT (S97):** ASK owner what the front change is (don't guess) → apply → re-verify newborn reproduction → FINALISE by running each template WITHOUT `--scratch` to write `assets/images/mockups/{scribble,wander,papercut,tender}/{front,back}-new.webp` (overwrites S95 broken artifacts; decide whether to regenerate newborn) → resolve white-edge-lines keep/suppress → update memory `project_svg_flat_mockups` → clean up throwaway probe scripts. Product-page wiring is a separate step.
- Orders: 039 newborn, 040 wander, 041 scribble, 043 papercut, 044 tender; cover-wraps in `sessions/qa-runs/cover-wrap-<order>.png`.

### Previous: Session 95
**Session 95 (2026-06-30) — FLAT MOCKUPS: stopped brute-forcing, wrote a proper BRIEF. Attempts to recolor scribble's spine all failed (wide band → flat strip → detached floating bar); owner halted the guessing. `/systematic-debugging` + per-layer PSD inspection found the architecture + root cause; `/understanding-the-ask` + `/creating-briefs` produced `docs/briefs/flat-mockup-compositor.md`. NOT implemented — next session builds from the brief. Nothing committed, website untouched, newborn approved files intact. Full log: `sessions/2026-06-30-s95.md`; recipe + root cause in memory `project_svg_flat_mockups`.**

- **Architecture (decisive):** newborn PSD scene is FIXED. `Main Image` = cover-face swap target; `111`/empty-named layer = full baked newborn book (spine `#c0d5ee` baked in, above Main Image); `Layer 1` multiply + `Highlight` screen = lighting. Per template change ONLY cover-face content + spine colors.
- **Root cause of all failures:** recolored spine in the FLAT `111` coordinate space → misaligned with the 3D-lit composite → detached strip. Fix must work in the approved newborn render's coordinate space.
- **Spine = 2 parts:** (1) face color hue-swap; (2) hinge crease APPROXIMATED via edge-darken-by-factor (owner-agreed) — neutral on light covers, deeper on dark.
- `scripts/compose-flat-mockup.mjs` exists but is BROKEN — rewrite per brief. Scribble outputs are broken test artifacts.
- **NEXT (S96):** implement the brief → verify scribble vs newborn (full image + pixel probe, not a crop) → confirm order-independence → roll out wander/papercut/tender → then product-page wiring. Capture closed/hero lessons in memory (still owed).

### Previous: Session 93
**Session 93 (2026-06-30) — PRODUCT-PAGE GALLERY/LAYOUT EXPLORATION. ALL UNCOMMITTED, nothing pushed (owner instruction — revisit after mockups are re-done). Reworked the product-page layout (originally inspired by Artifact Uprising — confirmed via founding `Brief.md`). Direct edits to `pages/newborn.html`; 3 experimental copies (`newborn-exp.html`, `scribble-exp.html`, `wander-exp.html`). Full log: `sessions/2026-06-30-s93.md`.**

- **Wider gallery + taller hero + small thumbs + arrow/keyboard nav + wider accordion** applied to `pages/newborn.html` (real, uncommitted) and mirrored in the 3 `-exp` pages. Newborn-exp direction (taller hero, single thin thumb row à la Artifact Uprising) is **liked by owner — treat as reference.**
- **Scribble-exp NOT yet ideal.** Templates with many special pages have a tall panel → unresolved trade-off: (A) bigger thumbs to fill dead space vs (B) keep thumbs small (current) and accept dead space even with 2 rows. Owner accepts some dead space over inconsistent thumb sizes. Gallery shows only 6 images (1 special-page example, not the full catalogue). Addon cards compacted (2-line clamp, smaller ADD, trimmed copy); **Option A "ADD inline with title" tried and rejected** (button oversized, title/desc wrapped at ~145px card width).
- **BLOCKED ON MOCKUPS.** Owner wants to re-do the closed-book + back-cover mockup views (dislikes them) before finalising; the whole gallery exercise should be re-tested with new imagery.
- **Shared `addons.css` NOT touched** — all addon-card tweaks are page-local overrides in `scribble-exp.html`. Rolling the winning pattern into `addons.css` + every product page is a later step.
- Origin answered + saved to memory `project_product_page_origin`: layout inspired by **Artifact Uprising's hardcover PDP** (founding `Brief.md`, commit `2fc79e8`).

### ▶ NEXT SESSION (Session 94)
1. **GATED ON NEW MOCKUPS** — owner is re-doing closed-book + back-cover mockup views. Once new mockups exist, **re-test the gallery exercise** and resolve the scribble thumbnail trade-off (bigger thumbs to fill dead space vs keep small + accept dead space).
2. **Decide fate of S93 uncommitted work:** keep/refine `pages/newborn.html` edits; promote the winning layout from the `-exp` pages into the real product pages + shared `assets/css/addons.css`; then commit across all templates in one pass.
3. **Git hygiene (S93 leftovers):** many throwaway files were created this session (`measure.js`, `measure-gallery.mjs`, `test-layout-vars.mjs`, `screenshot.png`, `temp-screenshots/`, `qa-runs/`, several `qa/*.mjs` measurement scripts) + the 3 `-exp` pages. Decide what to delete vs gitignore vs keep.
4. **CARRIED FROM S92 (still open):** owner reviews `context/tone-of-voice.md` + wires it into design-principles/CLAUDE.md; owner signs off the a–h Help-page rewrites (drafts in S92 chat only, not on disk) then apply + `/design-review` Help page; commit the S92 print-quality reassurance + CLAUDE.md stop-slop rule + approved Help copy.
5. **CARRIED FROM S91 (owner backend deploy STILL pending):** `firebase deploy --only "functions:createCheckoutSession,functions:getMyAddress,functions:saveMyAddress"` (live Address book Save/autocomplete errors until then), then signed-in test order. Plus: Cloud Run `--memory 8Gi` regen AEV-044; Our Artists live form test.

### ⚠ Watch-outs (S93)
- **EVERYTHING from S93 is uncommitted** — incl. the REAL `pages/newborn.html` (not just exp pages). If reverting, note newborn.html changed too.
- **`-exp` pages are throwaway test copies**, not linked from nav/collections. Don't ship them as-is; the patterns get folded into the real pages later.
- **Don't touch `assets/css/addons.css` yet** — scribble-exp uses page-local overrides on purpose so the shared file (used by all product pages) stays stable until the pattern is locked.
- **Scribble thumbnail trade-off is unresolved** — do not pick A or B until new mockups are in.
- Pre-existing untracked leftovers persist (S90/S92 logs, customer-accounts-phase2 brief, settings.local.json) — left alone as usual.

### Previous: Session 92
**Session 92 (2026-06-30) — Three threads. (1) Committed the order-form inline sign-in (`414a183`, pushed). (2) Added a photo print-quality reassurance (customer-preview note + new help FAQ), researched first. (3) Set up an auto stop-slop reminder (CLAUDE.md rule + PostToolUse hook) and drafted a tone-of-voice doc. Then began a Help-page copy + UX review: research + claim-verification done, 8 rewrites DRAFTED (not applied), awaiting owner sign-off. Full log: `sessions/2026-06-30-s92.md`.**

- **Order-form sign-in shipped** (`414a183`, pushed) — the S90-approved inline sign-in; pre-fills name/email for verified accounts, guests never blocked, no new backend.
- **Print-quality reassurance (UNCOMMITTED).** `/conducting-research` confirmed: previews are deliberately compressed everywhere (Aevia = 1600px/JPEG-80 derivative on screen, originals to PDF); "looks soft" is a universal complaint fixed with copy + the existing upload-time low-res warning, NOT a full-res magnifier (egress cost + backfire risk). Added `#quality-note` in `customer-preview.html` + `#preview-quality` FAQ in `help.html`, both stop-slopped.
- **Auto stop-slop (UNCOMMITTED + local).** `CLAUDE.md` "Customer-facing copy" rule; `.claude/settings.local.json` PostToolUse hook → `.claude/hooks/stop-slop-reminder.cjs` (verified: nudges on non-staff `pages/*.html`, silent on staff/JS). A reminder, not an enforcer.
- **Tone-of-voice doc drafted** `context/tone-of-voice.md` — AWAITING OWNER REVIEW; supersedes the buried "Copy Tone" note in `design-principles.md`.
- **Help copy review — DRAFTS ONLY (not on disk):** claim-verified q1 (emit-vs-reflect TRUE; drop the "50% brightness" tip; soften "always"). Drafted stop-slopped rewrites for the hero subtitle (fixes "book" orphan) + 8 FAQ items a–h: a print-look, b preview-soft (fix misleading "before print" → flagged at upload), c photo-quality (trim), d photo-count (per-template, exact at assembly), e ordering (24h, single preview not "two layouts", change loop), f payment (warmer), g delivery (Austria-only now), h delivery cost (TBD + no-surprise reassurance).

### ▶ NEXT SESSION (Session 93)
1. **Owner reviews `context/tone-of-voice.md`** — open calls: ban "curated" as filler-only or outright? "concierge" vs more "editorial/art-forward"? Then wire `design-principles.md` + CLAUDE.md Key references to it.
2. **Owner signs off the a–h Help rewrites** (or tweaks) → apply them + the hero subtitle fix.
3. **Run `/design-review` on the updated Help page** (needs local dev server) — look/feel needs work beyond the orphan word.
4. **Commit** the print-quality reassurance + CLAUDE.md rule + approved Help copy together (hook + settings.local stay local).
5. **CARRIED — owner backend deploy still pending from S91:** `firebase deploy --only "functions:createCheckoutSession,functions:getMyAddress,functions:saveMyAddress"` (live Address book Save/autocomplete-save errors until then), then eyeball + signed-in test order.
6. Carried owner actions: Cloud Run `--memory 8Gi` regen AEV-044; Our Artists live form test.

### ⚠ Watch-outs (S92)
- **a–h Help rewrites are DRAFTS in the chat only** — not in any file. The only copy changed on disk this session: the new `#preview-quality` FAQ + the customer-preview `#quality-note`.
- **Tone doc is unreviewed** — don't wire it into CLAUDE.md/design-principles until the owner approves.
- **Phase-2b functions STILL UNDEPLOYED** (carried from S91) — the whole address feature errors on live until the owner runs `firebase deploy`. See S91 watch-outs below for the Geoapify-key + saved-address-checkout caveats (all still apply).
- **Stop-slop hook is a reminder, not an enforcer** — fires on every non-staff `pages/*.html` edit incl. code-only ones (message says ignore if code-only); the rewrite is still a manual `/stop-slop` pass.
- `.claude/settings.local.json` + `.claude/hooks/stop-slop-reminder.cjs` are local-only (not committed). Untracked leftovers persist: `docs/briefs/customer-accounts-phase2.md`, `sessions/2026-06-29-s90.md`.

### Previous: Session 91
**Session 91 (2026-06-29) — CUSTOMER ACCOUNTS PHASE 2b SHIPPED (code). One commit pushed to main (`653e492`) → Cloudflare deploying. Aevia now owns an editable address form + Geoapify autocomplete. Functions NOT yet deployed (owner action). Full log: `sessions/2026-06-29-s91.md`.**

- **Phase 2b built + committed (`653e492`, pushed):** the corrected, Aevia-owned address model from the S90 rethink.
  - New **`saveMyAddress`** Cloud Function — verified ID-token + `email_verified` gate (same as `getMyOrders`/`getMyAddress`); validates required fields + `country==='AT'`; writes `shippingName` + `shippingAddress` to `customers/{normalizedEmail}` (merge).
  - **`getMyAddress`** now also returns the saved `name`.
  - **`account.html`** Address book is now an **editable form** (country-first, Austria fixed; pre-filled from `getMyAddress`; inline save feedback). Reuses existing `.field`/`.btn-primary` styles.
  - **Geoapify address autocomplete** (MIT lib `@geoapify/geocoder-autocomplete@3` via unpkg CDN) layered on the form — Austria-filtered (`addFilterByCountry(['at'])`), fills street/postcode/city on select, **degrades gracefully** if the CDN/key fails. Public frontend key in the page source (by design); secured by domain restriction in the Geoapify dashboard. Evgeny confirmed it works locally.
  - **`createCheckoutSession`:** removed the dead `shipping_details` block; for a saved-address customer it now passes `payment_intent_data.shipping` (verified valid create-time param) **and stamps `shippingAddress` onto the order** (because skipping collection means the webhook won't see it); **guests keep `shipping_address_collection:['AT']`** unchanged.
- **Verified the Stripe open question against official docs:** `payment_intent_data.shipping` works without `shipping_address_collection`, but `session.shipping_details` is populated ONLY by collection → hence the order-stamp at create time. (Skipped collection for saved-address users so they never retype.)
- **Geoapify chosen over OSM Photon** (via `/solutioning` + `/verifying-claims`): managed, free tier 3,000/day, no credit card, EU (Cyprus) → GDPR; public Photon endpoint isn't production-safe, self-hosting is over-engineering for a one-country trial. Free tier requires "Powered by Geoapify" attribution (added to the form).

### ▶ NEXT SESSION (Session 92)
1. **OWNER MUST DEPLOY (backend-first) — until then the live Address book + Save error:** `firebase deploy --only "functions:createCheckoutSession,functions:getMyAddress,functions:saveMyAddress"` (note: `getMyAddress` was never deployed in S90 either). Then eyeball on live: sign in (verified email) → Address book → autocomplete fills fields → Save → reload persists; place a test order signed-in with a saved address and confirm checkout doesn't ask for the address again (guest path still does).
2. **Still UNDECIDED — order-form sign-in (`pages/order.html`):** done + approved in S90, still UNCOMMITTED working tree. Safe to ship (uses live Phase-1 auth, no new fn). Decide commit/push.
3. **Adding a country later = ~6 edits, no rebuild** (documented in S91 log): `functions/index.js` L728 (`allowed_countries`) + L1242 (validation); `account.html` L445 (country → dropdown), L494 (`country:'AT'` reads dropdown), L471 (Geoapify filter), L202/L455 (copy). Country is real data, not baked into the schema.
4. **Email-journey** (Evgeny flagged) — map customer email journey, mailboxes to buy, brand the Firebase auth sender (`noreply@aevia-uploads.firebaseapp.com` → branded).
5. **Carried owner actions:** redeploy Cloud Run renderer at `--memory 8Gi` → regen AEV-044 (Tender spine fix); submit Our Artists form once on LIVE to confirm email lands at xenia@aevia.at.

### ⚠ Watch-outs (S91)
- **Functions NOT deployed** — `653e492` is on main/Cloudflare, but `saveMyAddress`/`getMyAddress`/updated `createCheckoutSession` are not live until the owner runs `firebase deploy`. The Address book Save + autocomplete-then-save will fail on live until then. **Backend-first.**
- **Geoapify key is public in the page source** (`account.html` `GEOAPIFY_KEY`) — that's fine ONLY because the key is domain-restricted in the dashboard (allowed origins: `aevia-test.pages.dev`, `aevia.at`, `localhost:8080`; + referrers with `/*`). If the live domain changes or adds `www`, add it in the dashboard or autocomplete silently stops working.
- **Saved-address checkout skips Stripe's address form by design** — the address is passed via `payment_intent_data.shipping` and stamped on the order at create time. If a saved address is wrong, the customer edits it in account settings, NOT at checkout.
- **Guest address still comes via Stripe** by design (augment-only invariant) — don't "fix" by editing the token/preview flow.
- **Austria-only** is intentional (trial) — see item 3 above for the expand recipe.
- **PowerShell `--only` comma gotcha:** quote the filter string when deploying multiple functions.
- `.claude/settings.local.json` left out of commits as usual; `pages/order.html`, `docs/briefs/customer-accounts-phase2.md`, `sessions/2026-06-29-s90.md` remain uncommitted/untracked (pre-S91 leftovers).

### Previous: Session 90
**Session 90 (2026-06-29) — Phase 2 (address capture) built + order-form sign-in. Commit `cd74bc8` pushed (functions never deployed). A design rethink found Stripe was owning the address form + the pre-fill was dead (`shipping_details` read-only) → Phase 2b (S91) corrected it. Order-form sign-in modal still uncommitted. Full log: `sessions/2026-06-29-s90.md`.**

### Previous: Session 89
**Session 89 (2026-06-29) — ACCOUNT NAV LINK shipped live (`2e7841d`). Account link in primary nav across 16 customer pages via shared `mobile.css` `.nav-actions`/`.nav-account`. Full log: `sessions/2026-06-29-s89.md`.**

### Previous: Session 88
### Previous: Session 87
**Session 87 (2026-06-29) — SHIPPED LIVE the Wander cover edge-sliver fix. One commit on `main` (`f695f97`), pushed → Cloudflare deploying. Took three diagnostic passes; `/systematic-debugging` with live-DOM Playwright inspection found the real root cause after two wrong guesses. Full log: `sessions/2026-06-29-s87.md`.**

- **Wander cover edge sliver — FIXED + LIVE.** A 1px dark line on the front-cover right edge (and spine top/bottom). **Root cause (two layers):** (1) the cover's background gradient bleeds under the 1px `.cover-canvas` page-frame border because `background-clip` defaults to `border-box`; (2) the gradient is set in JS via the `background` **shorthand**, which resets `background-clip` to border-box *inline* — so a stylesheet `padding-box` rule never wins. **Fix:** set `canvas.style.backgroundClip = 'padding-box'` inline right after the gradient line, in both `template-engine.html` + `customer-preview.html`. Plus S86's back/spine bg colours (navy → maroon `#6F454C` / green `#86A37B`). Evgeny confirmed it works locally.
- **Two wrong guesses first** (both reverted): the page-frame border/box-shadow, and the front bgColor (`#f2ede3` → `#E7DED3`) — neither was the cause. Lesson reinforced: inspect the live render before changing code (memory `feedback_inspect_render_first`).
- **Walkthrough script v2 + S86 log** — committed alongside the fix.
- **AEV-045** = the Wander order used for testing this session (Evgeny had accidentally Approved it pre-recording in S86; revert path = dashboard status dropdown → `review_sent`).

### Previous: Session 86
**Session 86 (2026-06-29) — Mostly nAItive FELLOWSHIP APPLICATION writing (not code). Nothing committed. Two product touches: (1) UNCOMMITTED Wander cover bug fix, (2) advice-only revert path for an accidental AEV-045 approval. One new doc: `docs/naitive-fellowship/walkthrough-script-v2.md`. Full log: `sessions/2026-06-29-s86.md`.**

- **Wander cover fix (UNCOMMITTED).** Dark/black sliver on the back+spine edges of the Wander cover in the staff engine. Root cause: the render's background-fill gradient (behind the cover SVG) used stale navy `#262262` for back+spine while the real artwork is maroon/green; where the SVG doesn't bleed fully to the canvas edge, the navy showed through. Fixed `assets/Template_Wander/wander-data.js:19-20` → back `#6F454C`, spine `#86A37B` (matching the correct `mockupEdges`). Shared data file → covers engine + customer-preview + PDF. **Needs Evgeny's eyeball, then commit.**
- **Walkthrough script v2** — longer (~2:35–2:55), in Evgeny's voice, read-aloud, two-column + timings; "non-engineer orchestrating AI" frame at front+close. Original v1 kept as reference. Untracked — commit when ready.
- **AEV-045** — Evgeny accidentally hit Approve in customer-preview pre-recording. Revert = dashboard status dropdown → `review_sent` (S85 progression-guard confirm expected). Editing re-enables (read-only gated only on `approved`/`paid`). Advice only, no code.
- **nAItive answers** — drafted ~9 application answers (CV bio, "most significant thing", "what drew you", "right person", superpower, "visible difference" moment, "wrong call", "decision that hurt someone", one-line). They live in the application form, NOT the repo. Framing notes captured in the session log. Application reported **done** by Evgeny.

### ▶ NEXT SESSION (Session 87)
1. Eyeball the Wander cover fix on a reloaded order; **commit** it + `walkthrough-script-v2.md`.
2. **Record the demo** (script ready in v2).
3. Then the two standing forks from S84: optional customer accounts Phase 1, or resume the website copy pass.
4. **Carried owner actions:** redeploy Cloud Run renderer at `--memory 8Gi` → regen AEV-044 (Tender spine fix); submit Our Artists form once on LIVE to confirm email lands at xenia@aevia.at.

### ⚠ Watch-outs (S86)
- **Wander cover fix is UNCOMMITTED** — background fill only (not artwork); verify on a reloaded Wander order before committing.
- **Application answers are not versioned in the repo** — only the S86 log captures the framing. If Evgeny wants them saved, put them in `docs/naitive-fellowship/`.
- `.claude/settings.local.json` modified as usual (left out of commits).

### Previous: Session 85
**Session 85 (2026-06-27) — STAFF DASHBOARD tweaks + a `/evaluating-as-user` pass. Shipped LIVE — one commit on `main` (`7838135`), pushed → Cloudflare deploying. Files: `pages/staff/dashboard.html` + `pages/staff/template-engine.html`. No backend change. Full log: `sessions/2026-06-27-s85.md`.**

- **Engine deep-link.** Dashboard now has a per-order **"Open in engine →"** button + a topbar **Template engine** link; `template-engine.html` reads `?order=AEV-044` after sign-in (`maybeDeepLinkOrder`) and auto-loads it via the existing Order-mode load path (one-shot guard).
- **`/evaluating-as-user` → built 5 fixes + 1 stale-text fix** (could NOT drive live — staff-auth + live Firestore; code-grounded walkthrough): (1) **order search box** (number/name/email, composes with status chips; shared `getVisibleOrders()`); (2) **preview-sent nudge** ("sent Nd ago — awaiting response", gold + "nudge?" at ≥3d, from real `sentSnapshot.sentAt`); (3) clickable **"Open preview ↗"** (dropped the always-on URL string; copy kept); (4) **status progression guard** (confirm on backward/skip-ahead jumps; `needs_info` exempt); (5) inline **"copied ✓"** replacing the blocking alert. Plus fixed `openPdf`'s stale **"Run the export script first"** → **"use the Generate PDF button"**.
- **No "viewed" telemetry exists** — confirmed `customer-preview.html` writes nothing on view; approval recorded in `statusHistory` via `approveOrder`. The nudge is "sent N days ago", not "customer opened it".
- **Email-send-to-customer automation deferred** by Evgeny (testing phase) — the manual "Open preview ↗" is the stand-in.
- 122/122 tests. **NOT driven live** (staff-auth gated) → needs Evgeny's eyeball on the deploy.

### ▶ NEXT SESSION (Session 86)
1. **Eyeball S85 on live** (only unverified path): Open-in-engine deep-link loading AEV-044; search; the nudge line; the progression-guard confirm; inline copy feedback.
2. **Then the two standing forks from S84** (untouched): either **optional customer accounts Phase 1** (`docs/briefs/customer-accounts.md`; backend-first; confirm order-flow-hardening first) **or** resume the **S83 website copy pass** (home hero + remaining customer pages, co-review with Kseniia; replace fabricated home testimonials).
3. **Carried owner actions:** redeploy Cloud Run renderer at `--memory 8Gi` → regen AEV-044 (Tender spine fix); submit Our Artists form once on LIVE to confirm email lands at xenia@aevia.at.

### ⚠ Watch-outs (S85)
- **S85 dashboard/engine changes are LIVE but UNVERIFIED in the real UI** — they're staff-auth-gated so Claude couldn't drive them; eyeball on Cloudflare.
- **Deep-link relies on the existing button-click load path** — if the Order-mode load button IDs (`mode-order-btn`, `order-load-btn`, `order-number-input`) are ever renamed, `maybeDeepLinkOrder` silently no-ops.
- **Nudge has no "viewed" data** — don't read it as "customer saw it"; it only means "staff generated/sent the preview N days ago".
- `.claude/settings.local.json` left out of the commit as usual.

### Previous: Session 84
**Session 84 (2026-06-26) — PLANNING ONLY (no code). Scoped the OPTIONAL CUSTOMER ACCOUNTS feature end to end and committed planning artefacts to `main` (`ab98a1a`). Will be built in a nearest future session — not now.**

- Ran `/understanding-the-ask` → `/solutioning` → wrote **ADR-0007** (`docs/decisions/0007-optional-customer-accounts.md`) + a **2-phase brief** (`docs/briefs/customer-accounts.md`).
- **Researched** Papier + Milk Books account UX via web tools (declined to create real trial accounts on their live systems — studied public flows instead; Evgeny also shared Papier account screenshots). Findings: both use **password + social** (not passwordless), both lead registration with a **first-order discount**, account IA = left-rail Personal info / Orders / Address book.
- **Forks resolved:** (1) **auth = Firebase email+password + Google** — flipped from passwordless because Evgeny wants it to scale beyond photo books; Firebase makes adding passwordless later migration-free. (2) **Augment the token flow** — `customer-preview.html` + edit/approve functions stay token-based and untouched; the account is a directory in front of them. (3) **Match orders by verified email** (no schema migration; feeds the promo gate). (4) **Scope = phased** (P1 auth+Orders+status+preview button; P2 address-into-checkout + promo).
- **Retention boundary made explicit** (Evgeny's catch): we do NOT store books forever, so order *metadata* persists in history but editable preview/photo assets have a retention window — NO "we never delete your projects" promise.
- **Promo-code system split to TO-DO #76** (shares the email↔order lookup dependency).
- **No shipping address is stored today** — order form takes email only; address is collected by Stripe at checkout → address-in-account is net-new plumbing (P2).
- ideas.md "Customer account area" idea updated to point at the ADR + brief.

### ▶ NEXT SESSION (Session 85)
1. **(If building accounts)** start **Phase 1** from `docs/briefs/customer-accounts.md`: Firebase customer auth (email+password + Google), `pages/account.html` (Personal info / Orders / Address-book-placeholder), `getMyOrders` admin-SDK function (verified ID token, match by email), status line from `statusHistory`, server-side "Preview" button into the untouched `customer-preview.html`. **Backend-first.** **First confirm order-flow-hardening status** (the Orders view depends on clean status data — see brief's Known Risks).
2. **Otherwise** — resume the S83 website copy pass: hero (home) + remaining customer pages (5 product pages, collections, our-artists, order form, help), to co-review with Kseniia; replace fabricated home testimonials; confirm "hardcover binding" + print-location copy facts.
3. **Carried owner actions:** redeploy Cloud Run renderer at `--memory 8Gi` → regen AEV-044 (Tender spine fix); submit Our Artists form once on LIVE to confirm email lands at xenia@aevia.at.

### ⚠ Watch-outs (S84)
- **Accounts are PLANNED, not built.** Only docs were committed (`ab98a1a`). No auth, no functions, no pages exist yet.
- **Auth decision is email+password + Google, NOT passwordless** — earlier sessions/ideas.md leaned passwordless; ADR-0007 supersedes that reasoning (scale). Don't revert without re-reading the ADR.
- **Build must AUGMENT, not modify, the token preview flow** — touching `customer-preview.html` auth or the edit/approve functions is out of scope by design (risk to the delicate path).
- **Order-flow-hardening is the assumed foundation** — confirm its state before Phase 1 or the Orders view shows the very flakiness we're escaping.
- `.claude/settings.local.json` left out of the commit as usual.

### Previous: Session 83
**Session 83 (2026-06-26) — WEBSITE COPY PASS (home + about) shipped LIVE. Two commits on `main` (`865657a` docs, `48c16c6` home+about), pushed → Cloudflare deploying. Planning files brought up to date. /design-review APPROVED across desktop/tablet/mobile.**

- **Confirmed S82 was already done.** The "uncommitted" Tender-mockup work from S82 was in fact committed + pushed (`1bdc0f2`), and the Cloud Run renderer is already at `--memory 8Gi`. No action needed — STATUS S82 was stale.
- **Planning housekeeping (`865657a`).** ROADMAP: chunks 011/012/013 filled in as Papercut/Newborn/Tender (done), chunk-024 marked done, mockup pipeline recorded in the Completed table. ideas.md: "engine-driven mockup imagery" flipped Parked → ✅ SHIPPED.
- **Home copy + UX pass (`48c16c6`).** Process section 4 → **5 steps** (Choose / Send / We make / Approve / Receive); 5-col band desktop, single-column list mobile. **Aevia touch** dropped the 4 line-art icons (felt cheap) for a centered **gold hairline rule** per card = "option A, typographic". **Removed the false "Printed and bound in Vienna"** line + unconfirmed material specs (170gsm/linen/sewn). Tightened collections/step/touch copy, purged em-dashes, added `text-wrap: balance` to kill orphan words. Ran `/stop-slop`.
- **About rewrite (`48c16c6`, via `/ideating`).** Re-spined the story from the old permanence/nostalgia thesis to the **curation thesis** in **founder first-person voice**: pain (blank editor, "just ok" result, no design eye) → philosophy (too much choice; fewer options, ensured quality + a one-line kitchen analogy) → how quality is earned (real designers + approve-before-pay) → **Aevum/permanence as the closing payoff** (name stays up front via the sticky label). Closing: "Fewer choices. A book worth keeping."
- **Replicate/icons decision:** diffusion is the wrong tool for a *consistent icon set* (independent generations won't look like siblings; raster not SVG). Custom motif → Kseniia's job later, or stay with option A (shipped A).
- **Process note:** agreed with Evgeny that the website copy exercise deserves **Kseniia's review** (she's stronger at communication). This pass is a first draft for her to refine.

### ▶ NEXT SESSION (Session 84) — continue the copy pass
1. **HERO (home) — deferred to the Kseniia review.** Untouched this session. The 3 rotating headlines lead on *quality/materials* (not a differentiator) and never say *done-for-you* (differentiator #1). Re-prioritise with Kseniia: lead with done-for-you / artist-designed.
2. **Remaining customer pages** need the same copy + stop-slop pass: the 5 product pages (scribble/wander/papercut/newborn/tender), `collections.html`, `our-artists.html`, the order form, `help.html`. Co-review wording with Kseniia.
3. **Confirm two copy FACTS before launch-true:** is **"hardcover binding"** actually locked (Aevia touch card 3)? Print location for card 4 (decided NOT to claim "Printed in EU" — too vague; left as FSC-only).
4. **Replace the fabricated home testimonials** (fake handles/locations/quotes) with real ones — trust/legal risk before real launch.
5. Pre-launch copy/legal still open in TO-DOS: VAT (#16), T&C (#25), post-payment customer email (#56), OG tags (#11), real product copy (#14/#15).

### ⚠ Watch-outs (S83)
- **Home HERO copy is untouched** (deferred to Kseniia) — still em-dashed and materials-led; don't assume it got the stop-slop treatment.
- **Home testimonials are fabricated** — invented @handles, locations, and 5-star quotes. Replace before launch.
- **`text-wrap: balance`** (used on home step/touch/collection descriptions) needs a modern browser; older ones fall back to normal wrapping (no breakage, just possible orphans).
- **"Tactile & lasting" card now claims "a hardcover binding"** — confirm it's locked or soften (materials were flagged unconfirmed).
- **Aevia touch cards are now CENTER-aligned** (not left) — deliberate, matches the centered process steps; revert is `text-align`/rule-margin if Evgeny changes his mind.
- `.claude/settings.local.json` left out of commits as usual.

### Previous: Session 82
**Session 82 (2026-06-25) — TENDER MOCKUPS created + wired into the website. All UNCOMMITTED working-tree (pending Evgeny's eyeball). Full log: `sessions/2026-06-25-s82.md`.**

- **Mockup pipeline run for Tender (order AEV-044).** Evgeny ran the two captures (`qa/capture-cover-wrap.mjs` + `qa/capture-spread.mjs`, `QA_ORDER=AEV-044`); Claude ran `compose-all.mjs AEV-044 tender` (20 open + closed + back) → `web-mockups.mjs tender` → 7 WebPs in `assets/images/mockups/tender/`. **First pale/cream cover the pipeline has handled** — composited cleanly. Added `tender` to the maps in `scripts/compose-all.mjs` + `scripts/web-mockups.mjs`.
- **back.png backdrop → white.** Made `scripts/compose-back.mjs` backdrop env-overridable (`BG_GRAY`, default unchanged 209 so the 4 live templates are untouched); regenerated Tender's `back.png`/`hero.webp` at `BG_GRAY=240` so the hero matches the white closed+spread shots.
- **Website wiring (matched Scribble/Papercut pattern):** `pages/tender.html` — real gallery (hero + 4 thumbs + lightbox) replacing placeholder line-art, `.addons-list` → `.addons-grid` photo cards, `xtra`/`pickThumb`/`openLightbox` script. `pages/collections.html` — Tender card → `tender/closed.webp`.
- **Verified:** 122/122 tests; headless thumb-switch/lightbox/add-toggle all work, 0 console errors; both pages serve 200.

### ▶ NEXT SESSION (Session 83)
1. Eyeball Tender mockups locally (tender.html + collections.html); decide on the mirror-spine-label polish (below); then **commit + push** the mockup work → Cloudflare.
2. Resume Tender close-out: owner redeploys the Cloud Run renderer with `--memory 8Gi` (picks up S81 spine fix + SVG cache) → regen AEV-044 → Stage 9 E2E (good moment to actually drive `/add-template`).
3. Carried (owner, owed since S77): submit the Our Artists form once on the LIVE site to confirm email lands in xenia@aevia.at.

### ⚠ Watch-outs (S82)
- **Tender mockup work is UNCOMMITTED.** Changed: `pages/tender.html`, `pages/collections.html`, `scripts/{compose-all,web-mockups,compose-back}.mjs`; new `assets/images/mockups/tender/*.webp`. `.claude/settings.local.json` left out as usual.
- **Closed-book spine label reads mirror-reversed** on `closed.webp` — tiny at display size, present on other templates too; flagged as optional polish, NOT fixed.
- **`tender-data.js` `mockupEdges` still placeholder** (uniform cream); spine 9mm sliver could be resampled to `#8a817a` if it reads off.
- **`BG_GRAY` override applied to Tender only** — flip the `compose-back.mjs` default + re-compose if all templates should share white.
- **`.gitignore` gotcha (memory):** `/mockups/` is anchored so `assets/images/mockups/` is correctly trackable — never revert to bare `mockups/`.

### Previous: Session 81
**Session 81 (2026-06-25) — TENDER SHIPPED LIVE + PDF renderer hardened. Tender Phases A–C committed + pushed to `main` (`27f0e17`…`3126b22`, 7 commits) → Cloudflare deploying. Build state: `docs/briefs/tender-build.md`; full log: `sessions/2026-06-25-s81.md`.**

- **Stage 8 product page — DONE.** New `pages/tender.html` (Vows→Tender; Love category; €70/€100 via `prices.js`; 3 functional add-ons Intro/Our story/Words with `fpintro`/`fpstory`/`fpwords` slugs, no mockup imagery yet — placeholder, drops in later). Updated `collections.html` card, `home.html` testimonials, `docs/templates.md` (Tender = Built); deleted `vows.html`. Verified headless 0 console errors; 122/122 tests.
- **Stage 7 PDF — VERIFIED + fixed.** Tender PDF generates correctly from the dashboard. Four renderer fixes shipped (all in `scripts/export-pdf.js` unless noted):
  1. **Silent Scribble fallback removed** — `setActiveTemplate()` now THROWS on an unknown-but-specified template (a stale renderer rendered Tender-as-Scribble). Root cause: the Cloud Run renderer is a **separate deploy** from the website (needs `gcloud run deploy`).
  2. **OOM fix** — preview embeds full-res PNG pages (~177 MB); 4 GiB OOM-killed at page 38/40 (progress froze at 95%). Redeploy with **`--memory 8Gi`** (cost ≈ +$0.002/render). NOT a timeout.
  3. **Spine caption off-band** — pdf-lib `heightAtSize()` returns INVERTED ascent/descent for Parisienne; spine centring now reads **fontkit** metrics (`font.embedder.font`). Other templates byte-unchanged.
  4. **SVG raster cache** — repeated spread designs rasterise once (modest speed-up; not yet measured live).
- **Dashboard polish** (`pages/staff/dashboard.html`): Regenerate-PDF button (+confirm), parallelised PDF existence checks, "Notes"→"Actions" header, no duplicate Preview button.
- **Learnings codified:** LEARNINGS 2026-06-25 (3 renderer traps), `/add-template` skill (stage 7/10 + traps), memory `project_serverside_pdf` + `project_pdf_font_rules`. **#75 in TO-DOS:** wire print-mode PDF to dashboard (deferred — needs real paid orders).

### ▶ NEXT SESSION (Session 82) — finish Tender
1. **Owner action pending:** redeploy the renderer with `--memory 8Gi` (picks up the spine fix + SVG cache), then regenerate AEV-044 and eyeball the centred spine. (Owner deferred the regen to "next order".)
2. **Tender Stage 9 — E2E** on a fresh order (order → engine Save → customer → PDF). **Good moment to actually drive it via `/add-template`** to test whether the skill earns its keep (S81 worked Tender conversationally, never invoked the skill — that gap is why the trap catalogue didn't pre-empt the bugs).
3. **Tender Stage 10 — already merged** (backend-first satisfied: no Firebase function change this session; the renderer redeploy is the owner's pending action). Tender mockups still to come (separate capture pipeline; page uses placeholder imagery — drop-in later at `assets/images/mockups/tender/`).
4. **Carried (still owed):** submit the Our Artists form once on the LIVE site to confirm email lands in xenia@aevia.at (real nodemailer path never exercised, from S77).

### ⚠ Watch-outs (S81)
- **The Cloud Run renderer is a SEPARATE deploy from the website.** Pushing to `main` deploys Cloudflare, NOT `aevia-pdf-renderer`. A new template's dashboard PDF renders wrong (now: errors loud) until `gcloud run deploy aevia-pdf-renderer --source . … --memory 8Gi …`. The owner's renderer redeploy is still pending — Tender PDF on the *current live renderer* may be stale until they redeploy.
- **Always deploy the renderer with `--memory 8Gi`** now (4 GiB OOMs on 40-page Tender).
- **Spine fix + SVG cache only take effect after the renderer redeploy** — the live PDF spine stays off-band until then.
- **`/add-template` was NOT used this session** despite being the exact tool — skills only fire when invoked (`/add-template`) or when Claude proactively calls them. Worth invoking it for Stage 9.
- Tender product page has **no mockup imagery** (placeholder line-art) — intentional; real mockups are a later drop-in.
- `.claude/settings.local.json` left out of commits as usual.

### Previous: Session 79
**Session 79 (2026-06-24) — Tender template build, Phases A + B (via `/add-template`). All UNCOMMITTED working-tree. Build state: `docs/briefs/tender-build.md`; full log: `sessions/2026-06-24-s79.md`.**
- **Phase A signed off** (engine render). Fixed two eyeball bugs: (1) **spine font colour** — data file had taupe; cover CSV's per-caption `captions_1_fontcolor` for the spine is cream `#fbf8f6` (sits on the `#8a817a` band) → fixed `tender-data.js`. (2) **No upload field for Our-story/Words functional photos** — the engine's special-photo upload UI + slot resolver were hardcoded to Newborn/Scribble pools (`special/artwork/labour`). De-hardcoded in `template-engine.html`: resolver treats any pool except `regular`/`cover` as special (per-side when count≥2); new `ensureFunctionalPhotoZones()` builds upload zones for any functional spread with `orderFormPhoto`; upload handlers switched to delegation. Plus **page border/frame** added to engine + customer-preview (`.page-canvas`: hairline + soft shadow + 2px radius) so pale Tender pages don't blend into the canvas.
- **Phase B Stages 5–6 done, Stage 7 code-complete awaiting Evgeny's dashboard PDF eyeball.**
  - **5 Order form** — registered Tender in `order.html`; routed Our-story/Words through the existing `introFields` mechanic; **de-hardcoded `composeIntroBlock`** (each functional spread carries its own `compose()` in `orderFormMeta`; order.html calls `(textMeta.compose||composeIntroBlock)`); added `orderFormMeta.heading`. Verified headless.
  - **6 Customer-preview parity** — mirrored the resolver generalisation; confirmed fonts/buckets/text-seeding already work; unified leftover textPanel flags. (Not driven with a live order — full render eyeball at Phase C E2E.)
  - **7 PDF parity** — **no Tender-specific code changes needed** (cover ellipse via generic `clipShapes.coverFrame`, fullBleed/overlayBelow/Parisienne/textPanel all wired S78; renderer slug-map handles fpstory/fpwords). Renders 40 pages 0 errors but **not visually verified**.
- **Pricing decided:** Tender = standard €70/€100 (shared `prices.js`); documented in new `docs/pricing.md`.
- **Order-form copy fix:** `love` album-note placeholder honeymoon→wedding.
- **AEV-044** = real Tender order Evgeny placed + Saved in engine (good PDF test bed; not approved).
- **⚠ Process slip (corrected):** I rendered AEV-044's PDF locally off a vague go-ahead → caused GCS egress (the local CLI pulls full-res originals). Rule now hard-coded in the `/add-template` skill + memory `feedback_no_local_pdf`: **never render a PDF locally without an explicit per-render go-ahead; Evgeny generates via the dashboard (in-region, free).**

### ▶ NEXT SESSION (Session 80) — Tender Phase B finish → Phase C
1. **Evgeny reports PDF eyeball** of AEV-044 (he generates it via the **dashboard** Generate PDF, NOT local). Check: cover ellipse + taupe names + cream spine, intro/story/words Parisienne text, full-bleed Words photo, SP3 under-photo art, caption parity. Fix `scripts/export-pdf.js` from feedback → closes Stage 7.
2. **Phase C** — Stage 8: product page **Vows→Tender** rename (URL, links, `template` param, optional-spread cards, footer/type-system links, include `prices.js`) + Stripe price wiring (standard 40/80 IDs); update `docs/templates.md` (Vows→Tender, Built). Stage 9: E2E on a real order. Stage 10: merge (backend-first if any function/Stripe change), then handover.
3. **Carried from S77 (still owed):** submit the Our Artists form once on the LIVE site to confirm the email lands in xenia@aevia.at (real nodemailer path never exercised).

### ⚠ Watch-outs (S79)
- **Tender is UNCOMMITTED working-tree** (mid-build, not approved). Touched: `assets/Template_Tender/` (incl. `tender-data.js`, `Cover/Artboard 1.svg`), `pages/order.html`, `pages/customer-preview.html`, `pages/staff/template-engine.html`, `docs/briefs/tender-build.md`, `docs/pricing.md`, `qa/debug-tender-render.mjs`, `assets/fonts/Parisienne-Regular.ttf`. The `/add-template` skill is also uncommitted. `.claude/settings.local.json` left out as usual. NOTE `scripts/export-pdf.js` shows modified but Tender PDF wiring was done in S78 — no S79 edits to it.
- **⛔ Never render the Tender (or any) PDF locally** — egress on Evgeny's bill; he uses the dashboard. See memory `feedback_no_local_pdf`.
- **Cover SVG edit** (`#c1d5ef`→`none` on the photo-opening rect) must be RE-APPLIED if Xenia re-exports the Tender cover.
- **Local 177 MB PDF** at `sessions/qa-runs/AEV-044_preview_local.pdf` (gitignored) — already-paid-for, Evgeny may inspect or delete.
- **`overlayBelow` page flag** (CSV `overlay_position=below`) is the canonical under-photo mechanic now — Tender SP3 + Papercut use it.

### Previous: Session 78
**Session 78 (2026-06-24)** — (1) Shipped S77 design-review polish (`665abe4`): order.html into Lora/Inter type system, Newborn add-on card heights, form-field unification, style-guide Fonts section. (2) Created the `/add-template` skill + ran Tender **Phase A** (data file, Parisienne fonts +ligature check, registry ×3, render smoke test, CSV-driven `overlayBelow` ×3 surfaces; Words spread swap + cover placeholder fixes). 122/122 tests. Detail: `sessions/2026-06-24-s78.md`.

### Previous: Session 77
**Session 77 (2026-06-24) — SHIPPED LIVE. Built the full `artist-collaborations` feature, then rolled out a new site-wide typography system + a label-trim, both validated by an independent full-site `/design-review`. Two commits on `main` (`e997df2`, `ea725c0`), pushed → Cloudflare deploying.** (1) **Artist feature** (per `docs/briefs/artist-collaborations.md`, backend-first): new callable `submitArtistApplication` in `functions/index.js` (onRequest + CORS, nodemailer → **xenia@aevia.at**, validates name/email/≥1 work link, no infra cost) — **Evgeny deployed it** (`firebase deploy --only functions:submitArtistApplication`) BEFORE the page reached Cloudflare; new `pages/our-artists.html` (manifesto → Kevin Lucbert profile → working "Work with us" form with on-page success/error states); understated serif-italic "In collaboration with Kevin Lucbert" credit on `pages/wander.html` + the `collections.html` card → `our-artists.html#kevin-lucbert`; "Our artists" footer link on all 15 customer pages; new `docs/templates.md` roster (Wander = first collaboration). (2) **Typography rollout** (P1 from the review): new **`assets/css/type.css`** = single source of truth — **Lora** (serif headings) + **Inter** (body/UI) via Google Fonts `@import`, body **15px → 17px**; linked AFTER each page's inline `<style>` on all 15 customer pages so it overrides the legacy Georgia/system-sans baseline. (3) **Label-trim** (P1): removed the collections hero "COLLECTIONS" eyebrow (dup of title), "per book" under all 9 cards, and the "PAGES" label on the 4 active product pages. Kept the gold `.tag` category eyebrow. 122/122 tests; 0 console errors anywhere; verified desktop + 375px. Full detail in `sessions/2026-06-24-s77.md`.

### ▶ NEXT SESSION (Session 78)
1. **Owner live-check (only thing unverified):** once Cloudflare finishes, **submit the Our Artists form once on the live site** to confirm the email actually lands in xenia@aevia.at — the real nodemailer path couldn't be exercised locally.
2. **`assets/Template_Tender/`** is the next working scope (untracked Xenia template drop — a new "Tender" template). Likely a multi-stage build like Newborn (see `project_adding_templates` playbook + `docs/briefs/newborn-template.md` as the model).
3. **Remaining design-review polish (all lower priority, none urgent):** fold `pages/order.html` into the new fonts (left out this session — layout-sensitive form); one-line the optional-spread card descriptions (uneven card heights); unify form-field styling across pages using the our-artists pattern; consider darkening `--accent-dk` (#a8895f = 3.2:1 contrast — fine for labels, not body); optionally drop the gold `.tag` eyebrow if it reads as breadcrumb-duplication.
4. Document the `type.css` single-source rule in `context/style-guide.md` so fonts don't drift back to per-page Georgia.

### ⚠ Watch-outs (S77)
- **`assets/css/type.css` is the single source of truth for site fonts + base body size.** It MUST load after each page's inline `<style>` to win the cascade (it's placed right after `</style>`, before `mobile.css`). New customer pages must link it too or they'll fall back to Georgia/system-sans 15px. The expressive in-book fonts (Caveat/Twinkle Star/Baskervville/Source Sans 3) are unaffected — they live in the engine/PDF, not site chrome.
- **`order.html` was deliberately NOT migrated** to Lora/Inter — it still uses the legacy type. Folding it in is a follow-up (form layout is size-sensitive; verify before shipping).
- **`@import` in type.css chains one extra request** before fonts load — fine at this traffic; switch to per-page `<link rel="preconnect">` if speed ever matters.
- **Backend-first held:** `submitArtistApplication` was deployed before merge, so the live form works. The one true unknown is whether the email delivers (owner live-test, item 1).
- `.claude/settings.local.json` left out of commits as usual; stray `sessions/2026-06-23-s71.md` left alone; `assets/Template_Tender/` intentionally NOT committed (next scope).

### Previous: Session 76
**Session 76 (2026-06-23) — PLANNING ONLY, no code shipped. Designed the `artist-collaborations` feature end to end and produced a build-ready brief at `docs/briefs/artist-collaborations.md`.** Ran `/ideating` → `/understanding-the-ask` → `/conducting-research` → `/creating-briefs` → `/stop-slop`. Three parts: (1) understated "In collaboration with Kevin Lucbert" credit on the Wander product page + collections card (existing small-caps/gold label style, near the title, links to an on-site artist bio — NOT a loud badge, NOT a direct Instagram link); (2) new `pages/our-artists.html` as a *growing roster* (manifesto intro → artist profiles, Kevin first → a REAL "collaborate with us" form: Name · Email · work link · optional note) submitting via a new callable `submitArtistApplication` that emails xenia@aevia.at (mirrors the nodemailer pattern in `functions/index.js`; portfolio is a link, no upload, no infra cost); (3) new `docs/templates.md` roster marking which templates are artist collaborations (Wander = first). Plus a permanent footer link to Our Artists. Decisions locked: wording "In collaboration with" (= back-of-book copy); "compensated fairly" (NOT royalty-specific); Kevin bio from kevinlucbert.com + stop-slop'd (final); page is roster-not-Kevin-centric. Normalised the portrait asset to `assets/artists/kevin-lucbert/kevin-lucbert-portrait.jpg`. Decided NOT to `/decompose` (overkill — three small parts, obvious backend-first order). **Next session BUILDS it, backend-first.** Full detail + step-by-step plan in `sessions/2026-06-23-s76.md`.

### ▶ NEXT SESSION (Session 77) — BUILD artist-collaborations
Read `docs/briefs/artist-collaborations.md` first (copy is final, embedded in the brief). Backend-first: (1) write + Evgeny-deploys `submitArtistApplication`; (2) build `pages/our-artists.html` (manifesto + Kevin profile + wired form, mobile.css, 375px reflow); (3) Wander label on `pages/wander.html` + the `pages/collections.html` card → `our-artists.html#kevin-lucbert`; (4) footer link on EVERY footer-bearing page; (5) `docs/templates.md` roster; (6) `/design-review`, then merge to `main` only after the function is deployed.

### ⚠ Watch-outs (S76)
- **Backend-first or the live form breaks** (S40/S64 discipline) — deploy `submitArtistApplication` before the page reaches Cloudflare.
- **Footer is duplicated per page** — the Our Artists link must land on all footer-bearing pages.
- New untracked from this session: `assets/artists/`, `docs/briefs/artist-collaborations.md` — commit with the build (or as planning artefacts). `.claude/settings.local.json` + stray `sessions/2026-06-23-s71.md` left alone as usual.
- The pre-demo work from S75 (mockup polish, E2E, recording) is still open — see the Session 75 block below. S76 inserted the artist feature ahead of it at Evgeny's direction.

### Previous: Session 75
**Session 75 (2026-06-23) — Product-page optional-spread (functional-page add-on) UX overhaul, shipped LIVE (`4c382a8`). Also resolved the S74 "merge pending": the mockup branch was ALREADY merged to main (`c83f6f4`, "real template mockups go live") and pushed — all mockups (Papercut + Scribble/Wander/Newborn) are LIVE.** Worked the request through `/understanding-the-ask` → `/solutioning` → `/stop-slop`. NEW shared stylesheet `assets/css/addons.css` is now the single source of truth for the optional-spreads selector (every product page links it instead of its own drifted inline copy). (1) **4 functional templates (Scribble, Papercut, Wander, Newborn)** → vertical **photo-card grid** (photo on top, one-line description, an `.addon-add` pill that flips Add→Added ✓); **dropped the redundant per-card "Free" badge** (the "Optional spreads — all free" header covers it); added a `.addons-note` helper line ("you'll provide photos/details on the next step"); **removed the photo-count box** (exact count unknown at this stage — `updatePhotoCount` now guards on a missing `#photo-count` element so toggle/chip handlers are safe no-ops); Wander's single card uses `.addons-grid.cols-1` (full-width). (2) **6 placeholder pages (Sprout, Vows, Devotion, Terrain, Horizon, Radiance)** → moved onto the shared **checkbox-list variant** (`.addons-list`); they keep their `.chk` + `.addon-cost` "Included" badge (no preview imagery, priced/non-spread extras). (3) Selected-card border now rings evenly (outer `box-shadow`, not inset — inset hid under the photo making the bottom look heavier). (4) Documented the canonical markup + "don't restyle `.addon*` per page" rule in `context/style-guide.md`. 122/122 tests; render/toggle verified on all 11 pages, 0 console errors; Evgeny verified visually. Full detail in `sessions/2026-06-23-s75.md`.**

### ▶ NEXT SESSION (Session 76) — pre-demo (carried from S74/S75)
1. **Optionally polish the mockups** (they're live now, so this is non-blocking): resolve the Papercut back-corner white-vs-cream fork (A: cream frame / B: trim bleed so blue fills edge-to-edge — recommended) + propagate the greige backdrop to `compose-closed.mjs`/`compose-mockup.mjs` for a consistent thumbnail row.
2. **One full E2E test** (order → engine → customer → PDF) before recording — including a quick confirm that selecting an optional spread on the new card UI carries into `order.html` correctly (code path untouched, but unverified E2E).
3. **Record the demo** per `docs/naitive-fellowship/walkthrough-script.md`.
4. Replace the temporary mockup imagery with photos of real printed books when available (drop-in: same filenames under `assets/images/mockups/<template>/`, no code change).

### ⚠ Watch-outs (S75)
- **All mockups are LIVE on main/Cloudflare** (merge `c83f6f4`). They're temporary composite renders standing in for real book photos — intentional placeholders, swap later by replacing the `.webp`s at the same paths. The offline `compose/capture` scripts ride along in the repo but never run on the live site.
- **Papercut back-corner white-vs-cream still unresolved** — cosmetic, deferred ("ok for now"); see the S74 log for the A/B fork before touching `compose-back.mjs`.
- **`assets/css/addons.css` is shared across ALL product pages.** Change the card look there, not inline per page (see the new style-guide rule). The 4 functional templates use `.addons-grid`; the 6 placeholders use `.addons-list`.
- **`updatePhotoCount()` is now a guarded no-op** on Scribble/Papercut/Wander (the `#photo-count` box was removed). If a future change re-adds a count display, restore the element or the guard skips it silently.
- **Untracked `sessions/2026-06-23-s71.md`** left alone again (pre-existing stray). `.claude/settings.local.json` left out of the commit as usual.
- Owner still owes (carried from S72): a dashboard PDF run on **AEV-043** + a billing check (egress near-zero; one-time ~€0.2–0.9 migration-copy charge expected).

### Previous: Session 74
**Session 74 (2026-06-23) — Pre-demo plan continued. (1) Committed + PUSHED S73's Papercut polish to `main` (`fd38976`) → now LIVE (Cloudflare). (2) Built the **Papercut mockups** and wired them into the website on branch `mockup-3d-renderer` (`c8b91bb`). Evgeny ran the two gated captures on **AEV-043** (downsampled ≤1600px → ~tens of MB egress, one-time; full-res never touches the laptop); Claude registered Papercut in the pipeline (`cover.mockupEdges`, `compose-all.mjs` + `web-mockups.mjs` — FP positions identical to Scribble), composed 22 mockups, derived 9 web WebPs, and wired `papercut.html` (hero gallery + 4 thumbs + 5 functional-page previews) + the `collections.html` card. **Exact slot parity with Scribble; 0 console errors.** (3) `compose-back.mjs` (shared): clipped back/front cover art to the book body (stops decorations spilling past the trimmed edge — the "floating pink shape") + a warmer greige backdrop on the back shot so light covers read as a distinct object. **UNRESOLVED + deferred ("ok for now"):** the back-cover top-left renders WHITE instead of the engine's cream `#f7e9e1` — root-caused (the cream bleed-border IS in the capture but the dark-cover brightness grade blows it past 255 + the new edge-clip trims the rim); a fork awaits (A: show cream frame = match engine / B: trim bleed so blue fills to the edge = match the cut book). Full detail in `sessions/2026-06-23-s74.md`.**

### ▶ NEXT SESSION (Session 75) — pre-demo
1. **Decide the mockup→main merge** — brings ALL mockups (Papercut + S63 Scribble/Wander/Newborn) LIVE for the demo; they're invisible on the live site until then. Optionally first resolve the back-corner fork (A vs B) + propagate the greige backdrop to `compose-closed.mjs`/`compose-mockup.mjs` for a consistent thumbnail row.
2. Fix a few website UX things before the demo.
3. One full E2E test.
4. Record the demo per `docs/naitive-fellowship/walkthrough-script.md`.

### ⚠ Watch-outs (S74)
- **Mockups are NOT live.** All mockup work (this session + S63 Scribble/Wander/Newborn) sits on `mockup-3d-renderer`, never merged to main. The website parts (`.webp`s + product-page edits) MUST merge to appear on the demo site; the `compose/capture` scripts are offline tooling that ride along harmlessly. **Merge decision pending.**
- **Captures need Evgeny's staff password** (Claude can't run them); `compose-all.mjs` + `web-mockups.mjs` are plain Node (Claude runs them). `mockups/<order>/` + `sessions/qa-runs/*` are gitignored.
- **Back-corner white-vs-cream is unresolved** — see the S74 log for the A/B fork before touching `compose-back.mjs` again.
- Owner still owes (carried from S72): a dashboard PDF run on **AEV-043** + a billing check (egress near-zero; one-time ~€0.2–0.9 migration-copy charge expected).

### Previous: Session 73
**Session 73 (2026-06-23) — Papercut pre-demo polish + a real bug from S72's EU migration. FOUR fixes (all shipped in S74's `fd38976`). (1) "Failed to fetch" loading a paid order into the staff engine — ROOT-CAUSED: S72's EU migration copied photo DATA but not the bucket's CORS config, so the new `aevia-uploads-eu` had NO CORS and every cross-origin `fetch()` of a photo (urlToFile→blob, template-engine.html:4210) was browser-blocked. FIXED by applying the old bucket's CORS policy to the EU bucket (`gsutil cors set`, free/reversible/live now — also un-breaks new uploads). (2) Papercut Spread 5 left SVGs — Xenia re-uploads; only a decorative shape moved, slot geometry unchanged → no data sync needed. (3) Papercut heart page (FP1) layering — removed the solid-heart backing (group `f`) from `FP Birthday 02 Right.svg` + set `overlayAbovePhotos:true`, so balloons/clouds sit ON TOP of the heart-clipped photo. (4) Removed the false low-res yellow border/badge in engine + customer-preview — since chunk-023 they load the ~1600px web derivative so `min(w,h)<1500` false-flagged EVERY real photo; genuine print-res warning still lives at order-form upload + PDF renders from originals. Full detail in `sessions/2026-06-23-s73.md`.**

### Previous: Session 72
**Session 72 (2026-06-23) — Two threads. (1) First pass on the nAItive fellowship application: decided the "one concrete thing" = a live, end-to-end automated photo-book production system built solo by a non-engineer via AI orchestration; captured the plan + a demo-video script in `docs/naitive-fellowship/`. (2) Shipped the chunk-024 async dashboard PDF to live (`24d2ead`), then MIGRATED ALL PHOTO STORAGE TO THE EU (`8f5171d`, ADR-0006): the bucket was in US-WEST1 while everything else is EU, causing cross-region egress. Created `aevia-uploads-eu` (europe-west1), copied 9.22 GiB, repointed all code, re-bound the generateDerivative trigger (verified firing), redeployed 17 functions + the renderer. Full EU data residency + in-region PDF reads now free. Added a cost-awareness rule to CLAUDE.md. TWO live checks still owed by owner: a dashboard PDF run on AEV-043, and tomorrow's billing (expect near-zero egress; one-time ~€0.2–0.9 from the migration copy). NEXT: Papercut polish → mockup on website → website UX → E2E → record demo. Full detail in `sessions/2026-06-23-s72.md`.**

### ▶ NEXT SESSION (Session 73) — pre-demo for the fellowship
1. Polish a couple of Papercut template pages.
2. Create a Papercut mockup + add it to the website (pipeline: `scripts/compose-mockup.mjs` + ag-psd; memory `project_mockup_pipeline`).
3. Fix a few website UX things before the demo.
4. One full E2E test before recording.
5. Record the demo per `docs/naitive-fellowship/walkthrough-script.md`.

### ⚠ Owner to verify (carried from S72)
- Run a dashboard PDF on **AEV-043** to confirm the renderer reads the EU bucket end-to-end.
- Check billing the day after: "Download Worldwide Destinations" should be near-zero; today shows a one-time ~€0.2–0.9 migration-copy charge (expected).
- Old US bucket retained empty as fallback — can be emptied once billing confirms the win.

---

### Previous: Session 71
**Session 71 (2026-06-23) — chunk-024 PDF generation RE-ARCHITECTED to async after /systematic-debugging found the dashboard "Generate PDF" was failing on a 300s function timeout (the render works — ~6m43s — but the function was synchronously waiting on it). Now: function fires Cloud Run + returns fast; Cloud Run writes progress to Firestore; dashboard shows a live PROGRESS BAR. Also fixed a customer-side crop bug (cover/special photos). Backend (Cloud Run `--cpu 4` + `generatePdf`/`getPdfStatus` functions) DEPLOYED by Evgeny. NOT committed; dashboard NOT yet pushed to main. Evgeny testing overnight — E2E confirmation is the S72 first task.**

### What happened this session (S71)
1. **Customer-side crop fix** (`pages/customer-preview.html`) — drag-to-reposition crop wasn't applying customer-side for **cover + special (FP)** photos. Crop is keyed by photo basename; customer-preview passed full GCS paths for those two (pool was already fixed). Wrapped both in `_baseName()`. See LEARNINGS 2026-06-23.
2. **chunk-024 root-caused (3 layers):** (a) Cloud Run Compute SA lacked Firestore/GCS roles → granted `datastore.user` + `storage.objectCreator`; (b) `gcsUrlByName.size` log threw in server mode → gated on `photoBufferMap`; (c) **the real bug** — `generatePdf` synchronously awaited a ~7-min render and died at its 300s cap (render itself succeeded; PDF was in GCS; browser saw "Failed to fetch").
3. **Async redesign** — `generatePdf` = thin trigger (fire Cloud Run, poll Firestore for `status='rendering'`, return 202, timeout 300→60s); new `getPdfStatus` returns progress + signs the URL when done; Cloud Run writes `pdfRender{status,done,total,sizeBytes,gcsPath}` per spread; dashboard polls every 2.5s → **progress bar**. CPU bumped to 4 (cost-neutral for CPU-bound work; avoided the `--no-cpu-throttling` idle-billing trap). 116/116 tests.

### ▶ NEXT SESSION (Session 72)
1. **TEST PDF creation from the dashboard** (Evgeny testing overnight). Expect progress bar → Preview PDF link. AEV-043 already has a valid preview PDF in GCS from the earlier "failed" run to eyeball. Confirm a fresh run completes + output is correct, then **commit** the 5 changed files (`functions/index.js`, `scripts/export-pdf.js`, `services/pdf-renderer/index.js`, `pages/customer-preview.html`, `pages/staff/dashboard.html`) and **push** so the dashboard reaches live.
2. **Review GCC costs for 22.06** — egress + chunk-024 render costs; confirm 4-vCPU Cloud Run is as cheap as predicted (~$0.024/render).
3. **Generate a Papercut mockup + add visuals to the website** (special-pages check, product-page imagery). Pipeline: `scripts/compose-mockup.mjs` + ag-psd (memory `project_mockup_pipeline`).

### ⚠ Watch-outs (S71)
- **Nothing committed this session** — all 5 files are working-tree only; `.claude/settings.local.json` left out as usual. Dashboard not on live until pushed.
- **Backend already deployed** (Cloud Run + both functions) — backend-first ordering satisfied.
- **Async render relies on Cloud Run continuing after the function disconnects** (CPU stays allocated during the active request — why we did NOT use `--no-cpu-throttling`). Fine for a low-volume internal tool; if renders ever stop mid-way, revisit (min-instances / Cloud Tasks).
- **Cloud Run URL still public** (`--allow-unauthenticated`) — harden before prod (carried from S70).
- **PowerShell `--only` comma gotcha** when deploying multiple functions — quote the filter (see LEARNINGS).
- Untracked `assets/mockup example/` — pre-existing; relevant to task 3.

### Previous: Session 70
**Session 70 (2026-06-22) — chunk-024 (server-side PDF) BUILT, REVIEWED, DEPLOYED + Papercut shipped to main. All on `main` + live infra. NOT yet E2E-tested on a real order by Evgeny — that's the first task next session.**

### What shipped this session
1. **Papercut template → main + live** (`3d057d6`). Committed all s67/68/69 work (48 SVGs, 16 Source Sans 3 weights, papercut.html, registry across all surfaces, PDF). Then **Xenia re-exported the oversized `FP Toy 05 H Left.svg`** (67 MB → 1 MB — it had an embedded sample raster that blew past Cloudflare's 25 MiB/file limit); replacement committed (`2f485ea`). Cloudflare deploy unblocked.
2. **chunk-024 — server-side PDF generation, DEPLOYED.** Moves PDF render off the local CLI to a Cloud Run job triggered from the dashboard. Eliminates the GCS photo egress on the PDF leg (the last egress source after chunk-023).
   - **Cloud Run service** `aevia-pdf-renderer` (`europe-west1`, 4 GB / 2 CPU / 900s). Reads order from Firestore + photos from GCS **in-region**, calls the ported `export-pdf.js`, uploads `{folder}/pdfs/{AEV}_preview.pdf`. Health check 200. URL: `https://aevia-pdf-renderer-677807969667.europe-west1.run.app`.
   - **`generatePdf` Cloud Function** (deployed, 300s timeout) — staff-auth gated, validates order status, calls the renderer, **signs the PDF URL itself** (the function has `serviceAccountKey.json`; Cloud Run's SA can't sign).
   - **Dashboard** — "Generate PDF" button per order (new/approved/paid) → becomes "Preview PDF" link + file size.
   - **`export-pdf.js`** — made importable (CLI guarded by `require.main===module`), `photoBufferMap` injection, `generatePdfFromFirestore()` export. **CLI (`npm run pdf -- AEV-XXX`) unchanged.**
   - Data source = Firestore (`staffBook*` fields, written by engine **Save**), NOT `book-state.json`/Export — closes the TO-DO #64 footgun. Data-shape audit passed (assignments/sequence/captions/heartCrop/styles all match; specialPhotos derived from manifest).
   - 116/116 tests. Commits `b294cdb` (build) + `667d3ae` (review fixes) + `001544f` (timeout bump), merged to main + pushed.

### ▶ NEXT SESSION (Session 71 — E2E test chunk-024, then harden)
1. **TEST the dashboard "Generate PDF"** on a real order that has been **Saved in the engine** (e.g. AEV-042). Click → expect a "Preview PDF" link. Compare output to `npm run pdf -- AEV-XXX` (acceptance criterion #2). First click is slow (Cloud Run cold start + photo fetch + render).
2. **Confirm the egress win** — check billing the day after a PDF run: Cloud Storage egress should be near-zero where a local CLI run would've shown GB-scale.
3. **Harden the renderer** — it's currently `--allow-unauthenticated` (public URL) for testing. Lock to private + identity token before it's a permanent prod path. See brief `docs/briefs/chunk-024-server-side-pdf.md`.
4. **Wire print-mode PDF** to the dashboard (only preview is wired today) — easy follow-up.

### ⚠ Watch-outs (chunk-024)
- **Renderer reads `staffBook*` Firestore fields** — an order must have been **Saved in the engine** (or approved, which copies customer→staff) or the PDF renders empty. Brand-new never-opened orders won't work.
- **Cloud Run URL is PUBLIC** (`--allow-unauthenticated`). The dashboard path is still protected (dashboard login → `generatePdf` checks `isStaff`), but the raw `…run.app` URL is directly reachable. Harden before prod (item 3 above).
- **Function signs, renderer doesn't** — Cloud Run's default SA has no private key for v4 signing, so `generatePdf` mints the signed URL via `serviceAccountKey.json`. Don't move signing back into the renderer without granting `iam.serviceAccountTokenCreator`.
- **Dockerfile lives at REPO ROOT** (not `services/pdf-renderer/`) because `gcloud run deploy --source` only auto-detects a root Dockerfile. Deps install at `/app` so `scripts/export-pdf.js` resolves sharp/pdf-lib. `.dockerignore` keeps the build context lean.
- **Redeploy the service** after any change to `export-pdf.js`, `services/pdf-renderer/`, or template assets: `gcloud run deploy aevia-pdf-renderer --source <repo> --region europe-west1 --memory 4Gi --cpu 2 --timeout 900 --allow-unauthenticated --project aevia-uploads` (with the `CLOUDSDK_PYTHON` fix — see memory `reference_gcloud_python`).
- **Function timeout 300s** — it waits synchronously on the render. If a huge book exceeds it, the function errors but the PDF likely still completed in Cloud Run (900s) → check the existing `getPdfUrl`/PDF link.

### ⚠ Watch-outs (Papercut, carried)
- **Cover clip shape path** from `<clipPath id="ac">` in `Cover/Artboard 1.svg` — re-extract if Xenia re-exports.
- **Spine width is 9mm** for all templates (18mm in the cover CSV is the bleed size).
- **FP1 overlayAbovePhotos:false** — balloons/clouds behind the heart photo is intentional.
- **heartClipPath is pre-scaled to 600px canvas** (×1.0584 vs SVG viewBox 566.929). Re-extract `<clipPath id="g">` from FP Birthday 02 Right.svg and rescale if re-exported.
- **Oversized-SVG trap** — Papercut's FP Toy 05 shipped at 67 MB (embedded sample raster) and silently failed Cloudflare. Any re-exported template SVG >25 MiB freezes the whole deploy. Check file sizes before pushing new template art (see memory `project_cloudflare_file_limit`).
- **FP special slot crop drag** — alwaysOn:true; any new `pool:'special'/'artwork'/'labour'` slot gets drag automatically.

### ⚠ S66 watch-outs
- **chunk-023 is now LIVE on main/Cloudflare.** Old orders only get small previews if back-filled — 039/040/041 done; all other legacy orders still fall back to full-res originals on load (by design, safe). Back-fill recipe in LEARNINGS 2026-06-22.
- **PDF still serves full-res originals by design** — chunk-024 (not yet built) is what removes the PDF egress leg. A PDF export will still show GB-scale egress until then.
- **`.claude/settings.local.json`** left out of commits as usual. **`assets/mockup example/`** untracked — pre-existing, not this session's work, left alone.

### Previous: Session 65
**Session 65 (2026-06-21) — chunk-023 DEPLOYED (Firebase) + VERIFIED on a real order; 3 small UX fixes committed on branch `egress-web-res-previews` (NOT merged to main, NOT on Cloudflare). Egress verified working on AEV-042.**

Evgeny deployed `generateDerivative` (Firebase) at the start of the session. I verified the web-res pipeline end-to-end on a real Wander order **AEV-042** (52 photos): the bucket has all 52 derivatives (`AEV-042/photos/previews/`, **11.74 MiB** total vs **1.02 GiB** originals — ~87× smaller), and both engines served them on load.

**Committed this session (`9e52d16`, branch `egress-web-res-previews`):**
1. **Cover photo reposition** — drag-to-reposition inside the cover frame (staff engine, always-on like the heart slot), saved crop applied read-only in customer-preview, baked into PDF via `coverExtract`. Crop keyed by `photo.name`, consistent across all 3 surfaces. Wander cover (no photo) correctly skipped via the `slotDef` guard. 116/116 tests.
2. **Wander itinerary left-align** — FP1 text panel `halign` center→left, synced in BOTH `Wander_sizing_full.csv` (source of truth) and `wander-data.js`. (Evgeny edited the CSV; I synced the JS — see new CSV-source-of-truth rule, LEARNINGS 2026-06-21 + memory `feedback_csv_source_of_truth`.)
3. **customer-preview submit-bar fix** — Save/Approve bar disappearing after Preview→Edit. Root cause: bar visibility relied on a one-time inline `display=''` that the resize handler could stomp and never restore. Fix: edit handler re-asserts the inline display; resize desktop-branch now restores submit-bar + preview-controls (was asymmetric).

**Cost verification (the session's main goal):**
- Evgeny's debugging activity on AEV-042 = ~4 customer loads + 1 staff load, **no PDF**. Each load pulled ~11.74 MiB derivatives, NOT the 1.02 GiB originals.
- **Estimated egress today ≈ 5 × 11.74 MiB ≈ 59 MiB ≈ €0.006** (vs ~€0.56 without the fix — same repeated-reload-on-big-order pattern that caused the €5.59 spike).

### ▶ NEXT SESSION (Session 66)
1. **CHECK BILLING (June 22)** — GCS egress lags ~1 day. Expect today's Cloud Storage egress to be **negligible (tens of MB, ~€0.00–0.01)**, NOT GB-scale. That near-zero IS the confirmation the web-res fix works on a live order. GB-scale would mean originals were served → investigate.
2. **Merge `egress-web-res-previews` → main** once Evgeny is confident (billing confirms + UX fixes eyeballed). Cloudflare auto-deploys main. The function is ALREADY deployed (Firebase), so backend-first ordering is satisfied.
3. **Eyeball the 3 UX fixes** on a maximized window: cover reposition (needs an order WITH a cover photo — AEV-042 is Wander/no cover), itinerary left-align (load a Wander order), submit-bar Preview→Edit persistence.
4. **chunk-024 (server-side in-region PDF)** — still the next cost piece (removes the PDF full-res egress leg; needed for prod ops). Brief not yet written.

### ⚠ S65 watch-outs
- **Branch only — NOT merged, NOT on Cloudflare.** The `generateDerivative` FUNCTION is deployed to Firebase; the 3 UX commits are local to the branch. `.claude/settings.local.json` left OUT (as usual).
- **"Missing Save/Approve buttons" was a RED HERRING / environmental** — Evgeny's Chrome window was 880px tall on an 816px usable screen (overshoot +64px, 112% display scaling), so the bottom-fixed bar sat behind the taskbar. Win+↑ (proper maximize) fixed it. NOT a code bug. The real bug (Preview→Edit disappearance) IS fixed.
- **CSV source-of-truth:** don't edit `*-data.js` values that originate from a CSV — see LEARNINGS 2026-06-21 + memory `feedback_csv_source_of_truth`.
- **PDF cover crop is new + untested in print** — `coverExtract` now honours the cover crop; no PDF was run this session, so verify a cover-reposition carries to the PDF when next exporting a template that has a cover photo (Scribble/Newborn).
- **Untracked `assets/mockup example/`** — pre-existing, not this session's work; left alone.

### Previous: Session 64
**Session 64 (2026-06-21) — GCS EGRESS COST decided + chunk-023 (web-res previews) BUILT + COMMITTED on branch `egress-web-res-previews` (NOT on main, NOT deployed). No production change yet.** Diagnosed the post-trial bill: 99.7% was GCS **egress** (full-res originals re-downloaded on every engine view + every local PDF run), not storage. Verified the real rate from Evgeny's own billing report: **€0.103/GB** (post-trial: €5.62 / 54.53 GiB). Decision in **ADR-0005**: commit to web-res previews (#1) + in-region server-side PDF (#6, chunk-024); defer CDN (#3); park R2 (#7). Built chunk-023 via developer-agent + reviewed (critic-agent passed the decision; I hand-reviewed the code + fixed a deploy bug). 116/116 tests.

**What was done this session:**
1. **Decision package committed** (`82f4b9d`): `docs/decisions/0005-…`, `docs/briefs/web-res-previews.md` (revised per critic: explicit PoC gate, firm naming rule, export-pdf.js guard), ROADMAP Phase 5 (chunk-023 + chunk-024 + Decisions Log), ARCHITECTURE **Invariant 8** (engines load derivative, PDF loads original) + egress cost note + Open Questions #5/#7 resolved.
2. **chunk-023 code committed** (`95ed8e4`): custom GCS `onFinalize` function `generateDerivative` (~1600px JPEG derivative per photo at `<folder>/<cat>/previews/<name>`); `getOrder` returns `derivativeUrls` alongside originals; BOTH engines load the derivative with per-photo fallback to original (legacy orders unchanged); `export-pdf.js` untouched. New `functions/derivative-utils.js` (pure path logic, 14 tests).
3. **Fixed a real deploy bug** the agent introduced: firebase-functions v4 needs `.storage.object().onFinalize(...)`, not `.storage.onFinalize(...)`. `node -e "require('./index.js')"` now loads clean.

### Cost picture (verified @ €0.103/GB) — egress happens on 4 events/order: staff load, customer load, staff export load, PDF
- **80-page / 4 GB order:** today €1.65 → after chunk-023 **€0.42** (PDF leg remains) → after 023+024 **€0.008**.
- **Your testing pattern** (10 reloads of a 4 GB order): €4.12 → **€0.03** after 023. This repeated-reload-on-big-orders is what caused the €5.59 spike.
- chunk-023 fixes the 3 screen loads (~25×). Step 5 (PDF, full-res originals) only drops with **chunk-024** (in-region render).

### ▶ NEXT SESSION (Session 65)
1. **Deploy chunk-023:** `firebase deploy --only functions:generateDerivative` (backend-first, per the S40 deploy-ordering rule). The fix only makes derivatives for NEW uploads — existing orders fall back to originals (by design).
2. **Verify on a real order** (deploy is the gate before merging to main → Cloudflare). You CAN'T make a 5–10 photo order (flow blocks incomplete books); smallest valid is a 40-page order. Test is a ONE-TIME load (~€0.03), not the repeated pattern that ran up the bill. **Two test routes:** (a) place a minimum 40-page order → load it → DevTools Network: photo URLs contain `/previews/` and are ~100–300 KB not multi-MB; or (b) zero-new-order — after deploy, re-trigger derivatives on an existing order with a **server-side** GCS copy (`gsutil cp gs://…/AEV-031/photos/ gs://…/AEV-031/photos/` — in-cloud, no egress), then load AEV-031. Claude can run the bucket check `gsutil ls -l …/AEV-XXX/photos/previews/` to confirm derivatives exist.
3. **Regression checks:** PDF still full-res/sharp (loads originals, no `/previews/`); a legacy order (AEV-031) still renders with clean console (fallback).
4. **Merge `egress-web-res-previews` → main** only after Evgeny confirms on a real order (Cloudflare auto-deploys main).
5. **chunk-024 (server-side in-region PDF)** is the next cost piece — removes the PDF egress leg (step 5) + needed for prod ops (staff can't run a Node CLI per order). Brief not yet written.

### ⚠ S64 watch-outs
- **NOT deployed, branch only.** `firebase deploy` is required for the function to exist; until then the order pipeline is unchanged. `getOrder` already returns `derivativeUrls` once merged, but every value is null until the function runs on new uploads → engines fall back to originals (safe).
- **Design note (not a bug):** `getOrder` does a GCS `.exists()` check **per photo** (≈100 HEAD calls on a big order, every load). Works, parallelised; possible follow-up = always sign the derivative URL + let `<img>` onerror fall back, dropping the existence checks.
- **HEIC:** originals are normally JPEG (browser converts HEIC→JPEG before upload). If a `.heic` original sneaks through, `sharp` in the function may fail to decode it → caught → no derivative → fallback to original. Acceptable.
- **firebase-functions v4.9.0 + Node 20 are deprecation-warned** (Node 20 decommissioned 2026-10-30). Do NOT upgrade as part of this — it's breaking across ALL functions; separate maintenance session before October.
- **Worktree isolation didn't hold** — the developer-agent wrote into the MAIN working tree (on the egress branch), not its throwaway worktree. No harm; result is committed. Watch for this if spawning isolated agents again.
- **chunk-024 will make the PDF egress-free but the web-res fix does NOT touch the PDF** — print genuinely needs originals.

### Previous: Session 51
**Session 51 (2026-06-17) — STEP-BASED ORDER FORM UX SHIPPED to `main` (`723fac4`, pushed → Cloudflare auto-deploys). The order form's long single-scroll upload stage is now discrete guided steps — Details → Cover → Special pages → Photos — across all templates, data-driven (Special auto-skips with no add-ons), linear-forward/free-backward nav. Independent /reviewer-agent + /design-review both passed. 102/102 tests. Read `sessions/2026-06-17-s51.md`.**

**What shipped this session (branch `step-form-ux`, 3 commits, merged `--no-ff`):**
1. **`000a2e8` — the refactor** (`pages/order.html`). Step engine (`buildSteps`/`goToStep`/`advance`/`renderStepper`/`showStepError`); `#step2` → three `<section class="form-step">` panels; data-driven `#stepper`; `goToStep2()` → `validateDetailsStep()` + `prepareUploadSteps()`; validation re-homed into `validateCoverStep/validateSpecialStep/validatePhotosStep` (submit re-runs them as a final guard that navigates to the failing step). S40 upload-hardening untouched.
2. **`8a47815` — Wander/Newborn follow-ups.** Wander: country-select autofill guard (`onCountryPick` requires a user gesture — Chrome was autofilling "Austria"), spread sizing fix (`refreshCountryMaps()` on step-show + width fallback), "Your route" moved above the spread, **click-to-enlarge** spread preview (`openSpreadZoom` → `#spread-lightbox`). Newborn product page: special spreads default **unticked**.
3. **`0a2a5c9` — logo** aligned to `aevia_logo_transparent.png` (was the lone outlier).

### ▶ NEXT SESSION (Session 52)
1. **Verify the step-form order flow on LIVE** once Cloudflare deploys — it's customer-facing AND feeds the staff engine. Walk Scribble/Wander/Newborn; **real-device phone test** (Evgeny: not yet done — design-review only covered the 375px viewport).
2. **Newborn end-to-end** still not eyeballed by Evgeny through the new stepped flow (renders headlessly; do a real Intro+Labour order).
3. **Carried from S50/S48/S49:** verify #74 crop on live; live Newborn first real E2E; S47 pt→px caption resize on live Scribble/Wander; S49 no-prompt order-load.
4. **Stripe price split** — confirm `STRIPE_PRICE_ID_40/_80` are real `price_…` IDs + `firebase deploy --only functions:createCheckoutSession`. (Evgeny: "maybe later.")
5. **Next build candidates** (ideas.md / TO-DOS): engine-driven mockup imagery (needs brief, go-3D); customer "my-orders" dashboard (needs brief + ADR); #73 data-driven cover clipShape (blocked on Xenia's assets). The order-phase "preview my data" panel now has a ready seam in the stepped form (Cover/Special `<section class="form-step">`).

### ⚠ S51 watch-outs
- **Step engine invariant:** `advance()` is the ONLY extender of `furthestReached`; `goToStep` refuses any `idx > furthestReached`. Preserve or "can't skip past an invalid step" breaks.
- **Country select gesture guard:** any new programmatic select-set must set `dataset.touched='1'` first or the change is ignored (intentional anti-autofill).
- **Region-map previews need a visible panel to size right** — redrawn via `refreshCountryMaps()` when the Special step shows; hidden render falls back to 480px.
- **Untracked `qa/review-step-form.mjs`** left by the design-review agent — review/delete if unwanted.

### Previous: Session 50
**Session 50 (2026-06-17) — TO-DO #74 SHIPPED: drag-to-reposition crop for ALL photo slots. Committed + PUSHED (`f005ea9` + `35f3c13`). Hand-verified all 3 surfaces. Read `sessions/2026-06-17-s50.md`.** ⚠ Watch-outs still live: `photo.name` must stay basename-consistent across staff↔customer↔PDF; PDF `coverExtract()` default 50/50 reproduces `fit:cover`/centre exactly; reposition handle disables `slotEl.draggable` while active (exit handlers must restore it).

### Previous: Session 49
**Session 49 (2026-06-17) — MINOR UX/SAFETY FIXES.** Three small changes committed + PUSHED to `main`, each clarified with Evgeny first. 102/102 tests. Read `sessions/2026-06-17-s49.md`. (1) Caption formatting guard `027931d` — `beforeinput` blocks `format*` on engine + customer-preview (PDF can't keep inline bold); regression check `qa/verify-format-block.mjs`. (2) Slim customer-preview footer `09ffec8`. (3) Always restore saved book on order load `ca44ab2` (removed destructive `confirm()`; staff-only, not browser-verified).

### Previous: Session 48
**Session 48 (2026-06-17) — NEWBORN SHIPPED TO `main`. Fixed the last E2E bug (PDF dropped blank lines → paragraph spacing collapsed) + two Intro order-copy tweaks, then merged `newborn-template` → `main` (`fc972d0`) and pushed. Cloudflare auto-deploys. 102/102 tests. The Newborn template (#4) is now LIVE end-to-end: order form → staff engine → customer preview → PDF.**

**What shipped this session (committed `5319cc3`, merged to main `fc972d0`):**
1. **PDF blank-line drop (root-caused via /systematic-debugging)** — both PDF text-render paths (`scripts/export-pdf.js`: text-panel wrap ~788, per-photo caption split ~709) deleted empty lines, collapsing paragraph spacing vs the engine (which renders `\n\n` as `<br><br>`). Fixed generically across ALL templates: empty line preserved as `['']` (reserves one line-height, drawn as nothing). Evgeny visually confirmed on AEV-037. See LEARNINGS 2026-06-17.
2. **Newborn Intro order copy** — DOB placeholder `'May 15th'`→`'15 May, 2026'`; gender placeholder `'Boy / Girl'`→`'boy / girl'`; gender lowercased in `composeIntroBlock` so the caption always reads "Our sweet little boy/girl". (`newborn-data.js`, `pages/order.html`.)
3. **Folded in S47 caption/PDF parity fixes** (pt→px formula, dropped weight/italic, PANEL_PT_SCALE removed, Labour photos in PDF, data-driven per-side pool export, spine centering) + dangling S46 photo-count guard.

### ▶ NEXT SESSION (Session 49)
1. **Watch live Newborn after Cloudflare deploys** — first real end-to-end Newborn order (order form → engine → customer → PDF) on the live site. The pt→px caption fix also resized **Scribble (FP1/FP2)** and **Wander (itinerary)** text panels live — eyeball those on the deployed site (they were checked locally, not yet on live).
2. **Stripe price split (carried, TO-DO #60-adjacent)** — confirm `STRIPE_PRICE_ID_40/_80` are real `price_…` IDs + `firebase deploy --only functions:createCheckoutSession`. A real Newborn submit mints a live `AEV-xxx` to clean up.
3. Pick next priority from TO-DOS / ROADMAP.

### ⚠ S48 watch-outs
- **Newborn is now on `main` and deploying live.** The pt→px caption fix changed Scribble/Wander text-panel sizes on the live site too — verified locally, confirm on live.
- **Blank lines are the only vertical-spacing lever in text panels** (leading spaces collapse in HTML on both surfaces). Any future line-based PDF text code must NOT `.filter(l => l.trim())` or it re-eats paragraph gaps — see LEARNINGS 2026-06-17.

### Previous: Session 47
**Session 47 (2026-06-16) — NEWBORN E2E bug-fixing: caption parity (engine↔engine) + PDF parity (3 bugs). Branch `newborn-template` (NOT main). NOTHING COMMITTED — all fixes are working-tree only, pending Evgeny's visual confirm of the regenerated AEV-037 PDF (he stopped to inspect; resumes next session). 102/102 tests. Read `sessions/2026-06-16-s47.md` first.**

**Fixed this session (all UNCOMMITTED):**
1. **Intro caption staff↔customer mismatch** — two stacked bugs: (a) text-panel render dropped `weight`+`italic` from the style override (staff italic, customer roman); (b) render used raw `sizePt+'pt'` (~26% too big) while the toolbar used the canvas-scaled `sizePt*SCALE*25.4/72` px. Both render blocks fixed to scaled formula + full field read-back. Verified by live DOM measurement (16.9px italic = staff).
2. **PDF Intro panel ~26% too big** — removed the `PANEL_PT_SCALE≈1.26` fudge (it compensated for the now-fixed engine pt-bug). Engine=customer=PDF.
3. **PDF Labour photos missing** — (a) PDF now handles `pool:'labour'` like `'artwork'`; (b) engine Export was collapsing all non-FP5 special keys to a single filename → made it data-driven (any artwork/labour pool → `[left,right]` array). Recurring "new per-side pool breaks export" bug, now generic.
4. **PDF spine caption off-center** — changed `+ascenderPt/2` → `+(ascent−descent)/2` to center the glyph line-box like the engine. ⚠ unconfirmed (Twinkle Star metrics) — Evgeny to eyeball.

### ▶ NEXT SESSION (Session 48) — Evgeny inspects PDF, then commit + finish E2E
**Read `sessions/2026-06-16-s47.md` first. Confirm branch `newborn-template`.**
1. **Pick up Evgeny's PDF inspection** (Intro size, spine centering, Labour photos). Spine (bug 4) is the watch item.
2. **Labour photos need a re-Export** — the PDF Evgeny is viewing used the OLD book-state (string `FPlabour`), so both Labour pages show the SAME photo. For 2 distinct: re-click **"Export book state (JSON)"** in the staff engine, then `cd scripts && npm run pdf -- AEV-037`.
3. **Commit everything** once approved: `customer-preview.html`, `template-engine.html`, `scripts/export-pdf.js`, `LEARNINGS.md`, S46 dangling (`pages/order.html` guard + `tests/photo-count-guard.test.js`, `ideas.md`, `TO-DOS.md`), Evgeny's CSV (`Newborn_sizing_full.csv`), new `qa/measure-intro-panel.mjs`. `.claude/settings.local.json` left OUT.
4. **Merge to `main` only after Evgeny approves.** The pt→px + PANEL_PT_SCALE fixes also resize **Scribble (FP1/FP2) + Wander (itinerary)** text panels (now correct/smaller, matching PDF) — eyeball those before merge; they're live.
5. Carried: Stripe price split (`STRIPE_PRICE_ID_40/_80` real `price_…` + deploy `createCheckoutSession`); real submit → live `AEV-xxx` to clean (TO-DO #60).

### ⚠ S47 watch-outs
- **Branch only, NOT pushed/merged. NOTHING committed this session** — all fixes working-tree only.
- **The pt→px caption fix touches ALL templates' text panels** (Newborn/Scribble/Wander) — correct direction but visible change on live Scribble/Wander.
- **Spine centering fix is metric-based + unconfirmed** — verify on the regenerated PDF.
- **Caption render rules now codified in `LEARNINGS.md` (2026-06-16)** — read before any caption work. The recurring caption hiccups (pt-vs-px, dropped style fields, per-side pool export) are documented there.
- **Low-res yellow engine border = intended warning** — not a bug (AI sample photos sub-print-res).

### Previous: Session 45
**Session 45 (2026-06-16) — NEWBORN template (#4) Stage 4 (order form) DONE + committed (`5dd84e9`) on branch `newborn-template` (NOT on `main`). Order form drives cover captions + Intro fields + Labour caption/photos/zodiac. Independent reviewer pass (Revise→fixed). Evgeny eyeballed BOTH the order form AND the resulting engine render: "renders well." Next: Stage 5 (customer-preview fonts + PDF).**

**Context:** "Little Annette" is actually the **Newborn** template. Xenia delivered `assets/Template_Newborn/` (CSVs + SVGs). Square 200×200mm book. It will land on the **Bloom** product page — Bloom is being **renamed to Newborn EVERYWHERE incl. the URL** (`bloom.html→newborn.html`) + Stripe wiring (Stage 6). All work is isolated on the branch; do NOT merge to `main` until Evgeny approves locally (Cloudflare auto-deploys `main`).

**Planning artefacts:** brief `docs/briefs/newborn-template.md`; session logs `sessions/2026-06-15-s43.md` (Stages 1–2), `sessions/2026-06-16-s44.md` (Stage 3), `sessions/2026-06-16-s45.md` (Stage 4 — READ THIS FIRST next session).

**What's DONE + committed on `newborn-template`:**
1. **Stage 1 — `newborn-data.js`** (`468cfb6`). Data model: SP0–SP6, cover (custom clip path), FPintro (text), FPlabour (2 photos + zodiac).
2. **Stage 2 — fonts** (`34dff26`). Twinkle Star + Baskervville registered (engine + customer-preview + PDF font map).
3. **Stage 3 — registry + engine render** (`3af559b`). Registry in all 3 surfaces. Cover clip, zodiac overlay, Labour pool, Intro-replaces-SP0. 8 fixes. Scribble + Wander unchanged.
4. **Stage 4 — order form** (`5dd84e9`, `pages/order.html` + `template-engine.html` + data/CSV). Cover captions (data-driven, already worked); **Intro** 5 labelled fields → composed block (`composeIntroBlock`), Intro opens book in place of SP0; **Labour** left caption + 2 photo uploads (slug `fplabour`) + zodiac select (12+None). **Root fix:** mixed-case functional keys — new `fpKeyForSlug` (order) + `resolveFpKey` (engine) replace `slug.toUpperCase()`; fpSelections now exact-cased ids; `calcPhotoTarget` mirrors `replacesFirstSpread`. **Zodiac rides `fpTexts.zodiac` → NO backend deploy needed.** Reviewer-flagged single-caption fill now targets the non-`aiGenerated` side (protects Labour's AI right page; FP3/FP4 still left). 97/97 tests; order form + engine render verified headless (0 errors); Scribble+Wander unchanged.

### ▶ NEXT SESSION (Session 46) — Stage 5: customer-preview parity + PDF
**Read `sessions/2026-06-16-s45.md` first.** Confirm branch `newborn-template`.
1. **Stage 5 — customer-preview parity + PDF.** Add Baskervville/Twinkle Star (+scope) to customer `CAPTION_FONTS` (currently old 3-font Scribble list). PDF render of the custom clip + zodiac overlay in `export-pdf.js` (only registry/data-load wired). **fontkit GSUB ligature check** on Baskervville + Twinkle Star (both expose `liga`; Twinkle Star is connected script — HIGH risk). PDF cover-subtitle needs style token `mediumitalic` → `Baskervville_mediumitalic`.
2. **Stage 6 — Bloom→Newborn rename** (URL `bloom.html→newborn.html`, links, `template` param, Stripe price wiring).
3. **Stage 7 — E2E** (order→engine→customer→PDF, real order) + merge to `main` after Evgeny approves.

### ⚠ S45 watch-outs
- **Branch only; NOT pushed/merged.** Cloudflare deploys `main`. `.claude/settings.local.json` again left OUT of the commit (pre-existing local change).
- **Full order→engine round-trip with a REAL order NOT yet run.** Stage 4 verified: (a) order-form rendering/validation/payload headless; (b) Evgeny eyeballed the engine render via the local tester. But the engine's `resolveFpKey` applying `fpTexts.fplabour`/`fpintro` from a *real submitted order* is unit-correct yet unseen on a live payload — that's Stage 7 E2E (needs Stage 6 product page to mint an order).
- **Intro block format is a CHOICE** (`composeIntroBlock`: name / "Born {dob} at {time}" / "{weight} · {length}", empties dropped). Staff-editable starting point, like the Wander itinerary. Revisit if Evgeny/Xenia want a different editorial layout.
- **Customer-preview `CAPTION_FONTS`** still the old 3-font list — Stage-5 item (carried from S44).
- **No backend `zodiacSign` field** — zodiac travels via `fpTexts.zodiac` (engine reads `order.zodiacSign || order.fpTexts.zodiac`). If a proper column is ever added it needs a Firebase deploy (affects all templates live).
- Carried: Cover SVG is edited (`#d8eaf0`→`none`) — re-apply if Xenia re-exports the cover. Wander cover caption colour shifts `#493955`→`#3E2A55` on next deploy (intended).

### Previous: Session 42
**Session 42 (2026-06-15) — COVER PHOTO ORIENTATION + pre-submit confirmation shipped to `main` (`3102591`). Roadmap reviewed (core complete; remaining items blocked or P1). One ideation captured. Groundwork laid for data-driven cover clip shapes (#73).**

**What shipped (live on `main`; `pages/order.html` + `scribble-data.js`):** (1) cover orientation hint from CSV `Orientation`; (2) non-blocking amber orientation warning on wrong-orientation cover photo; (3) pre-submit "Before we start" modal listing soft issues (wrong-orientation cover + low-res count, excl. FP5 art) with Go back / Submit anyway. 97/97 tests; browser-verified. **#73 groundwork:** `Photo shape` column added across the 4 template CSVs — now being realised in the Newborn build (S43). **ideas.md:** multi-tab template workbook idea (parked).

### Previous: Session 41
**Session 41 (2026-06-15) — MOBILE RESPONSIVENESS (#47) shipped + verified on a real iPhone; 4 follow-on bugs found via E2E and all fixed. Strategic question settled: web flow is sufficient, no app needed.**

**What shipped (live on `main` + Cloudflare; PDF fix is CLI-only):**
1. **#47 Axis A — mobile layout.** Root cause: `order.html` never linked the shared `assets/css/mobile.css`, and product-page stacking rules only matched the `#la` wrapper (7 of 10 product pages lack it). Fix = one `<link>` + broadened selectors (`assets/css/mobile.css`, `pages/order.html`). All 10 product pages + home + order steps 1–2 now reflow to device width (iPhone 13 + Pixel 7), hamburger functional. Independently code-reviewed (accept). New audit tools `qa/mobile-audit.mjs` (live) + `qa/full-audit.mjs` (local, all pages). Commit `9992b66`.
2. **#47 Axis B — EXIF / web-vs-app DECISION.** Evgeny ran a real iPhone Safari order: upload easy, **EXIF dates survived, engine auto-sorted correctly.** → **Aevia stays web-only; the Capacitor app (TO-DO #40) stays parked.** Do not re-litigate unless a new need emerges.
3. **Bug #4 (critical) — PDF rotated iPhone photos.** EXIF-orientation: iPhone photos store orientation 6 (rotate 90° CW) as a flag; browser preview applies it but `sharp` didn't → sideways prints. Fixed with `.rotate()` baked into `loadPhoto()` in `scripts/export-pdf.js` (single chokepoint). Proven on AEV-032 (dims flip 5712×4284→4284×5712); regenerated PDF confirmed by Evgeny. Commit `6bc871b`.
4. **Bug #3 (critical) — customer slot-drag broke.** Slot `<img>` lacked `draggable=false` → native image drag hijacked the slot dragstart. Fixed by mirroring the staff engine's pattern (`pages/customer-preview.html`). Commit `6bc871b`. ⚠ **Needs browser confirm on a fresh (non-approved) order.**
5. **Bug #1 — price inconsistency.** home/collections showed stale €60/€120; wired both to `prices.js` (`BOOK_PRICES`) so they can't drift. Commit `c38a5aa`.
6. **Bug #2 — mobile-gate placeholder.** Gate returned before the order fetch → showed literal "Order preview". Now fetches the order number from the token and shows the real reference. Commit `c38a5aa`.
7. **Housekeeping:** `LINKS.md` (quick links, local + live), permission allowlist broadened in `.claude/settings.local.json` (dev/qa/read-only-git commands no longer prompt; push/deploy still gated).

### ⚠ OPEN WATCH-OUT (new, S41)
- **`assets/css/mobile.css` is shared across home + 10 product pages + order.html (customer-facing only).** The staff engine / customer-preview / dashboard are deliberately desktop-only (PRD lines 33/91/163) and must NOT link it. New customer-facing pages should link it; new product-page layouts that don't use the `.zone`/`.panel`/`.product-title` pattern will need their own rules.
- **`export-pdf.js loadPhoto()` now auto-orients via `.rotate()`** — every photo passes through it upright. If you add a new photo-read path, route it through `loadPhoto` (don't read GCS/disk directly) or you'll reintroduce the EXIF-rotation bug.
- **Pricing single source of truth = `assets/js/prices.js` (`BOOK_PRICES`).** Product pages, home, and collections all read it. Changing a price = edit `prices.js` + the product-page chip `onclick` values + the Stripe SKU (`STRIPE_PRICE_ID`). home/collections auto-follow.

### Previous: Session 40
**Session 40 (2026-06-12 → verified 2026-06-13) — ORDER-FLOW HARDENING shipped to prod + verified live. TO-DO #68 resolved (and expanded). 6 chunks + dashboard, deployed backend-first, confirmed on a real Wander order.**

**What shipped (live on `main` + Firebase):** the order-intake flow no longer "lies" (announced success before it was real). Diagnosis in `docs/briefs/order-flow-failure-map.md`; plan in `docs/briefs/order-flow-hardening.md`.
1. **Ch1** — `order.html` validates + **lowercases** the customer email; success screen states the address + "if that's not right, reply within 24h". (Note: `goToStep2()` already format-checked email; Ch1's real new value is normalisation + the success catch.)
2. **Ch2** — upload worker now checks each PUT `res.ok`, retries ≤3×, and only counts confirmed uploads → the success screen can't show on a failed upload. + large-order "keep this tab open" reassurance (folded into the rotating line so it recurs).
3. **Ch3** — `beforeunload` guard while uploads are in flight (armed before the worker pool; disarmed on success AND catch).
4. **Ch4 (backend)** — `createUploadSession` writes Firestore FIRST (status `uploading`, `uploadComplete:false`) and sends only the STAFF email; new **`confirmUpload`** Cloud Function sends the CUSTOMER email + flips status→`new` (idempotent, 403 on bad token). Returns `token` for the frontend.
5. **Ch4b** — dashboard recognises `uploading` (amber badge + "Uploading" filter to surface stuck/abandoned uploads).
6. **Ch5** — `order.html` calls `confirmUpload` after all photos land — happy path only; a failed/aborted upload never sends the customer email.
7. **Ch6** — HEIC-conversion failure shows "preview unavailable, still included" (cover + special + main grid); low-res threshold 1500→**1575px** (verified 200 DPI on a 200mm page) with placement-honest copy. FP5 art exemption intact; warning, never a block.

**Verified LIVE (2026-06-13, real Wander order):** customer email arrives only AFTER upload completes (not at submit); aborting mid-upload (tab close/reload → "Leave site?") leaves the order stuck at `Uploading` with NO confirmation email. Both work as designed. Tier-1 mocked browser test `qa/order-hardening-mock.mjs` is green (12/12).

### ▶ NEXT SESSION (Session 41)
1. **Clean up live test orders** (TO-DO #60) — the real Wander order(s) from this session's live verification, incl. the deliberately-aborted one stuck at `Uploading`. Delete from Firestore.
2. **Pick the next priority** (was the post-#68 plan): **#64** (Save vs Export footgun, ~30 min) OR a pre-launch blocker — **#47** (mobile responsiveness, home + order form — High) / **#56** (post-payment customer email) / **#58** (configurator photo-count promise vs real requirement).
3. **Customer my-orders dashboard** (`ideas.md`) — committed direction, build *after* this; its data foundation (`uploading→new` status, email-as-owner) now exists. Needs its own brief + an ADR extending 0003 when started.
4. Parked: TO-DO #67 rich-text caption editor = whole dedicated session.

### ⚠ OPEN WATCH-OUT (new, S40)
- **Ch4 backend unit tests are house-style** (`tests/chunk-4-order-flow.test.js` mirrors the logic inline; it does NOT invoke the real handlers — same pattern as `getOrder.test.js`). "97 pass" proves the spec'd logic, NOT the handlers. Real backend verification = Firebase emulator or a live order.
- **Deploy ordering for any future change to this flow: backend first** (`firebase deploy --only functions`), THEN merge frontend to `main`. The two are deployed by different systems (Firebase vs Cloudflare); a gap where the new frontend calls a missing `confirmUpload` is swallowed by Ch5's try/catch but skips the customer email.
- **Status vocabulary now includes `uploading`** — kept customer-readable on purpose (future my-orders dashboard will display it). Any new dashboard/status code must tolerate it.

### Previous: Session 39
**Session 39 (2026-06-05) — UX polish + price unification. Three customer-facing fixes done, NOT yet committed/pushed. Investigated upload fragility → logged TO-DO #68 (High).**

**What changed (all LOCAL, uncommitted):**
1. **Customer-preview loading copy** — "Loading your book preview…" → "Your book is loading…"; rotating line "Your book is nearly ready." → "Almost ready…" (no trailing dots, per Evgeny).
2. **Hide editing chrome during load** — photo sidebar, edit-hint, submit-bar (Save/Approve), preview-controls, and the nav Edit/Preview toggle are all hidden on load; new `showBookChrome()` reveals them together only after `renderBook()` succeeds. Error path stays clean.
3. **Unified prices across all 10 product pages** — 40p = **€70**, 80p = **€100** (was a mix: €60/70 for 40p, €100/120 for 80p). **Wander was showing €60 while its Stripe SKU is €70 — now consistent.** New `assets/js/prices.js` (`BOOK_PRICES={p40:70,p80:100}`) is the shared source of truth, included `<script defer>` in every product page; it rewrites chip labels + default display on load. The chip `onclick="pick(this,NN)"` values were ALSO hand-edited (that number is what flows to Stripe — prices.js only syncs display text).

### ▶ NEXT SESSION (Session 40)
1. **Commit + push S39 changes** — `customer-preview.html`, all 10 product pages (`scribble/wonder/sprout/bloom/wander/horizon/terrain/radiance/devotion/vows.html`), new `assets/js/prices.js`, `TO-DOS.md`. Local-only, not yet on live. Cloudflare auto-deploys `main`.
2. **Verify S39 in browser before/after deploy** — (a) open a Wander customer-preview link: confirm loading screen is clean (no sidebar/buttons until book renders) and copy reads right; (b) hard-refresh each product page: confirm 40p=€70 / 80p=€100 everywhere and the price flows correctly into order.html → Stripe.
3. **TO-DO #68 (High) — upload fragility** — Evgeny's S39 question. Cheapest-first fix: (a) `beforeunload` guard while uploads in flight; (b) check PUT `res.ok` + retry (also fixes a standalone silent-failure bug); (c) server-side `uploadComplete` flag so dashboard shows partial orders. See TO-DOS.md #68 for full root-cause.
4. Parked: bug #5 fetch-retry (not reproduced); TO-DO #67 rich-text caption editor = whole dedicated session.

### ⚠ OPEN WATCH-OUT (new, S39)
- **`assets/js/prices.js` display-sync vs HTML onclick must stay in agreement.** prices.js only rewrites the visible price *text*; the `onclick="pick(this,NN)"` number in each chip is what actually flows to order.html → Stripe. Change one, change both. bloom.html uses the `pick('a',this,NN)` signature. The Stripe SKU price (`STRIPE_PRICE_ID` in `functions/.env`) is independent — editing prices.js does NOT change what Stripe charges.

### Previous: Session 38
**Session 38 (2026-06-05) — Wander end-to-end FULLY VERIFIED (staff engine ✓, customer preview ✓, payment ✓, PDF ✓). Fixed 4 PDF export bugs in `scripts/export-pdf.js`. Committed + pushed (S39 confirmed by Evgeny).**

**What happened:**
1. **Wander E2E — all surfaces confirmed.** Staff engine, customer preview, and payment all work. PDF also now works after the fixes below.
2. **PDF: oversized SVG overlays** — SP04 and SP10 right-page overlays silently dropped from PDF. Root cause: those SVGs embed 11–17 MB of base64 rasters, exceeding libxml2's ~10 MB XML node limit. Fixed with `shrinkOversizedSvg()` helper (downsamples embedded rasters to ~2× on-page display size before passing to sharp; gated at >8 MB so Scribble is never touched).
3. **PDF: caption line-wrap mismatch** — Windows contenteditable stores line breaks as `\r` + `<div>`. After HTML stripping, `\r` lingered as a trailing character, inflating the measured line width and causing extra wraps vs the engine. Fixed: `stripHtml()` now does per-line `.trim()` + whitespace collapse at the return value.
4. **PDF: Cormorant Garamond fontkit GSUB ligature bug** — same bug as EB Garamond (S27): fontkit incorrectly stores ligature glyph advance widths, causing visible gaps. Fixed: added `'Cormorant Garamond'` to `LIGATURE_FONTS` (char-by-char draw path). Split concern: new `SUPPRESS_LETTER_SPACING_FONTS` set keeps EB Garamond at charSpacing=0; Cormorant Garamond keeps its `-0.02em` letter spacing.
5. **PDF: `stripHtml` false-positive warning** — fixed naive comparison to mirror the same `<br>`/`<div>` → newline handling as the real strip, so captions with manual line breaks no longer fire a spurious warning.

### ▶ NEXT SESSION (Session 39)
1. **Commit + push `scripts/export-pdf.js`** (4 PDF fixes from S38). Confirmed working by Evgeny on AEV-029.
2. **Delete `docs/briefs/wander-map-reexport-spec.md`** (untracked, now moot — S35 proved the maps were fine; the bug was CSS then a cache artefact). Tell Kseniia to stop re-exporting.
3. **Wander is now fully live and end-to-end verified.** Next feature work TBD.
4. Parked: bug #5 fetch-retry (not reproduced); TO-DO #67 rich-text caption editor (partial bold / Ctrl+B) = whole dedicated session.

### ⚠ OPEN WATCH-OUT (new, S38)
- **Every new font added to the project must be tested for the fontkit GSUB ligature bug.** Symptom: engine renders correctly, PDF has a gap at a specific character position. Diagnosis: add the font to `LIGATURE_FONTS`; if the gap disappears it was the bug. Do NOT add to `SUPPRESS_LETTER_SPACING_FONTS` unless the font explicitly needs zero letter-spacing (only EB Garamond does). See memory `project_pdf_font_rules.md`.
- **SVG overlays >8 MB silently drop from PDF** — `shrinkOversizedSvg()` handles it, but only safe when embedded `<image>` elements carry their OWN transform (no parent `<g transform>`). Verify with grep before assuming the fix applies.

### Previous: Session 35
**Session 35 (2026-06-05) — order-form polish + map render fix. All shipped + PUSHED to `main`.**

**What shipped (live on `main`):**
1. **Structured itinerary lines (#2)** — Wander itinerary is now line-by-line (3 default, "+ Add a line" capped at 7, example placeholders). Submit joins lines with `\n` into the existing `itinerary` string → no downstream changes. (`order.html`)
2. **Realistic FP1 spread preview (#3)** — order form now shows the real two-page spread: region map (left) + actual right-page SVG with route text in the engine's exact text-panel position (Cormorant Garamond, navy, centred). Added Cormorant `@font-face` to order.html.
3. **Region maps SVG → PNG** — all 6 `maps{}` entries flipped to PNG. Clean swap (resolver returns path verbatim; PDF `sharp` auto-detects). Deleted the 6 now-unused left-map SVGs.
4. **Cloudflare deploy unblocked** — deploys had failed SILENTLY since S32: `FP 01 Map Left (N.America).svg` was 26.5 MB > Cloudflare's 25 MiB per-file limit, so the site was frozen on S31 for ~18h. Deleting the SVGs fixed it. (memory: `project_cloudflare_file_limit`)
5. **Map "shifted/cut frame" ROOT CAUSE = our CSS, not the artwork** — global `img { max-width:100% }` clamped the bleed-expanded map overlay's width but not its height → square PNG rendered non-square, breaking the symmetric 3 mm crop. Fixed with `max-width/height:none` on the map overlay in **all 3 surfaces** (order/engine/preview); order.html also scales off canvas `clientWidth` (excludes 1px border) → crop overhang now equal on all 4 edges (measured 2.78/2.78/2.80/2.80). Kseniia's maps were fine — `docs/briefs/wander-map-reexport-spec.md` is now MOOT.

### ▶ NEXT SESSION (Session 36)
0. **Evgeny: test the latest map fix (`72ff941`) on live.** Hard-refresh the Wander order form, add EU countries, confirm the map frame is even on all sides (this is the one thing not yet eyeball-confirmed by Evgeny). Then check the staff engine + customer preview map render too (same fix, mirrored, but unrun with a real order).
1. customer-preview + PDF map render are still **code-complete but never E2E-tested with a real order** (carried from S33).
2. Optionally delete the moot `docs/briefs/wander-map-reexport-spec.md` and tell Kseniia to stop re-exporting.
3. Parked: bug #5 fetch-retry (not reproduced); TO-DO #67 rich-text caption editor (partial bold / Ctrl+B) = whole dedicated session.

### Previous: Session 33
**Session 33 (2026-06-04) — chunk-022 (Travel map): wired the real map into the BOOK across all 3 render surfaces (staff engine, customer-preview, PDF), replacing the S28 stub. Fixed 2 latent Wander bugs. 85/85 tests. ⚠ NOTHING browser-tested by Evgeny yet — only the staff-engine render was Claude-verified headlessly. NOT committed, NOT pushed → live still shows the stub.**

**What changed (all LOCAL, uncommitted):** (1) **Map wired into the book** — replaced the `variant.mapCanvas` stub in `template-engine.html` (~line 2262) + the mirror in `customer-preview.html` with the real region SVG + pins via shared `map-render.js` (now actually `<script>`-included in both — was comment-only before). Added the map render to `scripts/export-pdf.js renderPage()`. FP1 selection read from `window._wanderMap = {region, countries}`, set from `order.fpTexts.fp1` BEFORE `renderBook`; PDF reads new `state.mapSelection` from book-state.json. (2) **`fpTexts.fp1` object handling** — engine now extracts `value.itinerary` for the text panel (was `[object Object]`) and persists the panel to its ACTUAL side (Wander itinerary = RIGHT page; Scribble = left) via `panel.closest('.page-canvas').dataset.side`. (3) **Bug: `exportBookState()` hardcoded `template:'scribble'`** → every Wander PDF would silently load Scribble data. Fixed via `_activeTemplateKey`. So no Wander PDF before today was ever valid. (4) **Local-dev fix** — `npx serve` drops the `?template=` query on its clean-URL 301 redirect → order form showed "Choose a template first". Use `python -m http.server 8080` (literal serve, keeps query; needs `.html` on every URL). Added `serve.json` (`cleanUrls:false`) as the serve alternative.

**Verified (headless only):** `qa/verify-map-render.mjs` — engine renders 1 map SVG + 5 on-country pins (EU) + itinerary in Cormorant, 0 JS errors. Screenshot `sessions/qa-runs/verify-map-render.png`. **customer-preview + PDF are code-complete but UNRUN** — the real risk for S34. Cormorant registered everywhere (`@font-face` both HTMLs, FONT_MAP in export-pdf).

### ▶ NEXT SESSION (Session 34) — Evgeny's real end-to-end Wander test FIRST
0. **Evgeny tests locally before any commit.** Server: `python -m http.server 8080` (NOT `npx serve` — clean-URL gotcha). Start at `http://localhost:8080/pages/wander.html` (always include `.html`). Flow: order form (add Travel-map FP1, pick ~5 EU countries + itinerary, submit) → staff engine (log in, Order mode, load AEV-xxx; verify map+pins+itinerary; **Save** then **Export book state (JSON)** — both buttons) → customer preview link (must match staff) → `cd scripts && npm run pdf -- AEV-xxx` (verify FP1 map+pins+itinerary in the PDF).
1. **Fix whatever the test surfaces** — pin calibration, itinerary font/position, clipped edges, "font not found"/"SVG not found" path errors. customer-preview + PDF are the unrun surfaces.
2. **Then commit + push** all S33 edits (engine, customer-preview, export-pdf, serve.json, qa/verify-map-render.mjs) — only after the E2E passes. Live (Cloudflare) auto-deploys `main`.
3. When all 3 surfaces render + a real order passes → **tell Evgeny the full Wander flow is live to test.**

### Previous: Session 32
**Session 32 (2026-06-04) — chunk-022: re-uploaded region SVGs smoke-tested + the real map wired into the ORDER FORM. Map coordinates re-synced from the CSV. Committed + PUSHED (`ec6960a`). 85/85 tests.** Diagnosed edge-drift as a **bleed-viewBox** issue (region maps carry 3 mm bleed → render bleed-fit, 206 mm overlay, −3 mm offset — see LEARNINGS 2026-06-04). `mapCoordinates` re-synced from `Map_Coordinates_upd.csv` (now semicolon-delimited), 0 mismatches across 183 countries. New testers `qa/map-tester.html`, `qa/map-smoke.{html,mjs}`, `qa/order-map-preview.mjs`. See `sessions/2026-06-04-s32.md`.

### Previous: Session 31
**Session 31 (2026-06-04) — Wander order flow wired end-to-end; `order.html` made template-aware. Committed + PUSHED (`9182309`). 85/85 tests; both order forms browser-verified.** First dropped a proposed engine "de-hardcoding" as YAGNI (constants, not assumptions — see memory `project_dehardcoding_dropped`).

**What shipped:** (1) `order.html` no longer hardwired to Scribble — resolves the active template via `TEMPLATE_REGISTRY`/`templateData()` (the 4th surface the chunk-020 seam missed). (2) Cover section **data-driven**: photo zone only if `cover.slots` non-empty (Wander = free-text, no cover photo); caption fields from `cover.captions` (`label`/`placeholder`/`maxLength`). (3) `wander.html` rebuilt onto the Scribble product-page pattern (real Travel-map FP1 addon, photo counter, correct `addons/addon_inputs/addon_slugs` param contract — was a dummy placeholder). (4) **FP1 country-select UI**: region-grouped multi-select, `sameRegionOnly` enforcement, itinerary text, labelled region placeholder; payload `fpTexts.fp1 = {region, countries, itinerary}`. (5) Cover-caption copy enriched from new CSV columns, **hand-synced** into both data files (no CSV→JS generator), Scribble form copy restored.

**⚠ Map render still blocked** on Kseniia's region SVGs (chunk-022) — the order form captures country+itinerary now; engine/customer/PDF map page shows the S28 stub. Only blocked piece of a real Wander order. **A real Wander order has NOT yet been run engine→customer→PDF** (order form + parity browser-verified only). See `sessions/2026-06-04-s31.md`.

### Carried (unverified, deferred since S30)
- Browser-verify Session 30 features — original photo filenames (needs a fresh upload) + approve→pay `Pay now · €70` (AEV-023 unpaid €70 / AEV-027 paid). Flagged but deferred.

### Status (previous: Session 30)
**Session 30 (2026-06-04) — built + shipped 2 approved features: original photo filenames (staff-visible) + approve→pay flow fix. Committed (`896dd78`) and PUSHED to main; Cloud Functions deployed + verified live. 85/85 tests.** First confirmed S29 was already fully shipped (STATUS was stale — `d83eb94` was committed/pushed + `getPdfUrl` deployed).

**Feature #1 — original photo filenames (Option B):** staff see each pool photo by the customer's **original filename**; chronological sort fallback uses those numbers; customer side **hides** filenames. `upload.js` persists `photoManifest.poolOriginalNames[]` (parallel to `pool[]`); `getOrder` returns it; `comparePhotos` (shared, tested) sorts by `displayName||name`; staff engine attaches `displayName` on order load + shows it in the sidebar. Internal key `photo_NNN` untouched → save/load zero-risk. Legacy orders fall back to `photo_NNN`. **Real names only appear on a fresh upload — not yet seen in browser.**

**Feature #2 — approve→pay flow:** (a) Review→Approve→Pay progress cue; (b) forward post-approve copy *"one last step: complete payment…"* (was terminal "we'll be in touch"); (c) "we'll be in touch" now only post-payment; (d) Pay button shows order price (`Pay now · €70`) — `getOrder` now returns `price`. All in `customer-preview.html` + one field in `index.js`. ⚠ **Cost source-of-truth split:** button shows order-time `price`; Stripe charges fixed `STRIPE_PRICE_ID` — match today, could diverge if Stripe price changes. See `sessions/2026-06-04-s30.md`.

### ⚠ CARRIED-FORWARD UNVERIFIED (Session 30 features — shipped + deployed, NOT browser-verified)
Both S30 features (original photo filenames; approve→pay flow / `Pay now · €70`) are live on `main` but were **never confirmed working in a browser**. S31 chose to push on Wander instead; these still need a visual pass before being trusted. See items 1–2 below.

### Session 30 follow-ups (status after S31)
1. **Visual-verify Feature #2** on AEV-023 (approved, unpaid, €70 — token in S30 log): expect `Pay now · €70`, stepper `✓ Review ✓ Approve **Pay**`, forward copy. AEV-027 (paid): all-done stepper + "Payment received". — _still unverified (carried to S32)._
2. **Verify Feature #1 with a fresh upload** — only way to see real `IMG_xxxx` names staff-side. — _still unverified (carried to S32)._
3. ~~De-hardcoding → template contract~~ — **DROPPED S31 as YAGNI** (constants, not assumptions; see memory `project_dehardcoding_dropped`).
4. ~~Finish chunk-010 — wire Wander product page end-to-end~~ — **DONE S31** (order flow wired; map render still blocked on chunk-022 SVGs).

### Session 26 status
**Session 26 (2026-06-03) — chunk-020 (multi-template engine seam) BUILT + VERIFIED + committed (`374af3d`, not pushed).** The staff engine, customer-preview, and `export-pdf.js` now resolve template data + asset base from a `TEMPLATES` **registry** keyed by the order's `templateName` (lowercased), instead of being hardwired to `SCRIBBLE_DATA`. Adding a template = one registry entry per the 3 surfaces; unknown/missing names fall back to Scribble. **Real bug caught:** product pages send a capitalised name (`'Scribble'`/`'Wander'`) — the registry lowercases before lookup, so Wander orders won't silently render as Scribble (the literal-match version would have). Verified Scribble renders byte-identically on staff engine + customer-preview in browser; 73/73 tests. PDF leg deferred. Convention saved to memory `project_template_seam.md`. **Session also recovered a stale-checkout git mess** (local `main` was 6 behind origin/main with a leftover settings.local.json conflict) by fast-forwarding to S25 — nothing lost.

### ▶ NEXT SESSION — chunk-022 (Travel map functional page)
1. **chunk-022** — next dependency before finishing Wander. Design locked S25 (see `docs/briefs/wander-template.md` + session log 15:50): left page = regional map SVG (6 by region code), right = staff itinerary textPanel over `FP 01 Map Right.svg`, pin = `GEO PIN.png` centre-anchored 12×23mm, calibrate later. Order form: country multi-select, no photo upload, blocks cross-region.
2. Then **finish chunk-010 (Wander)** — register Cormorant Garamond (@font-face + font picker + export-pdf FONT_MAP), wire the Wander product page, end-to-end test a real Wander order (confirm `wander.html` sends `template: 'Wander'` → registry key `wander`).
3. **Push** the chunk-020 commit (`374af3d`) when ready to deploy to live (Cloudflare Pages auto-deploys `main`).
4. **Local-dev gotcha:** customer-preview needs the URL WITHOUT `.html` (`…/customer-preview?token=X`) — `npx serve` clean-URLs redirect drops the query string off the `.html` form. Live is unaffected.

---

### Session 25 (2026-06-03) — Wander (template 2) kickoff: data file + roadmap restructure. No engine code touched yet. Built `assets/Template_Wander/wander-data.js` (parses clean): cover (2 free-text captions), SP0–SP6 (Scribble geometry; Cormorant Garamond Bold captions, navy #262262; SP0 keeps NT Somic), FP1 map-page data contract, and `mapCoordinates` (183 countries → {region,xMm,yMm}, generated from the CSV). Downloaded Cormorant Garamond static .ttf (Light→Bold) into `assets/fonts/` (not yet registered anywhere). **Roadmap restructured:** Wander isn't a plain "digitisation" chunk — it carries one-time infra. Added **chunk-020 (multi-template engine seam, blocks 010–017)** + **chunk-022 (Travel map functional page, reusable)**; repurposed **chunk-010 = Wander template** (depends on 020+022, marked in-progress); renumbered duplicate page-flip chunk-018 → chunk-021. Backing plan: `docs/briefs/wander-template.md`. Brief-per-chunk policy decided: roadmap chunk entry IS the brief except for novel chunks.

### ▶ NEXT SESSION — start chunk-020 (multi-template engine seam)
1. **chunk-020 first** — it blocks everything. Make engine + customer-preview + PDF select template data + asset base by the order's template name (currently hardwired to `window.SCRIBBLE_DATA`; `SVG_BASE` at `template-engine.html:1046`; `ASSET_BASE` at `export-pdf.js:122`). **Hard gate: Scribble must render byte-identically** (verify in browser + a Scribble PDF). Plan the loader before editing the 3 files.
2. Wander SVGs are NOT in a `Spreads/` subfolder (unlike Scribble) — the per-template asset base must account for this.
3. Then chunk-022 (map page) → finish chunk-010 (register Cormorant in @font-face + font picker + export-pdf FONT_MAP, product page).
4. Open decisions for chunk-010/022: cover front-caption is free text (resolved); cross-region selection UX = block (tentative). See `docs/briefs/wander-template.md`.
5. Untracked Wander assets + `wander-data.js` + new fonts not yet committed — commit when chunk-020 lands so a Wander order can be tested.

### Session 24 status
**Session 24 (2026-06-03 afternoon) — complex-scenario QA chain finished + PDF for AEV-026 generated & verified.** The S23 verification queue is now largely cleared. (1) **Placement audit** fixed per user ("fix A"): flags only backward moves → 34 noisy "breaks" collapse to ~8 real inversions, each manually checkable. User decided NOT to tune the algorithm (B) — placement effect is minor. (2) **Downstream QA chain** (`qa/downstream-chain.mjs`, new) ran clean on AEV-026 (user's saved creative edits): `placed:106/106, spreads:40`, through Stripe `payment=success`. Skips the engine save leg so it can't clobber staff edits. (3) **PDF** (`npm run pdf -- AEV-026`) built clean (cover + 80 pages), uploaded to GCS, **cover visually confirmed by user**. Fixed two PDF issues: NBSP "tofu" box after "WILD" (cover captions now use `stripHtml`), and order-mode now uploads to GCS with **no local copy**. Learned: PDF reads GCS `book-state.json` written by the engine's **Export** button (separate from **Save** → Firestore) — footgun logged as TO-DO #64.

### ▶ NEXT SESSION
1. **Commit + deploy.** Uncommitted: `template-engine.html` (audit + export-message + the still-pending #63 FP5 render fix), `scripts/export-pdf.js` (NBSP + GCS-only — CLI, no deploy needed), `qa/downstream-chain.mjs`. Engine HTML needs `git push` → Cloudflare Pages auto-deploy to reach live. #61 (FP5 upload) already deployed; #63 (FP5 render) reaches live only on this deploy.
2. **Verify FP5 two-artwork (#63) on live** after deploy — this session ran against live where #63 wasn't deployed yet, so the browser dual-art fix is still unconfirmed (the PDF side was already correct).
3. **TO-DO #64** — decide Save/Export unification (or make PDF read Firestore).
4. Untracked `assets/Template_Wander/` — new template assets; confirm with user whether to commit.

---

### Session 23 (2026-06-03) — incomplete-book guard ALLOW-path verified end-to-end. Deployed `saveStaffState` (the deploy that unblocks the dashboard send-gate — earlier failure was transient). Extended `qa/order-journey.mjs` to configure **all five** special pages (was only FP1+FP2): FP1 Birthday, FP2 Funny words, FP3 Favourite toy, FP4 First steps, FP5 Artwork gallery (art-1/art-2 reserved + excluded from the general pool). Minted fresh order **AEV-024**, then ran `qa/staff-customer-chain.mjs` on it: engine save → `"Saved ✓"` → dashboard **Generate preview link allowed (not blocked)** → customer **Approve** proceeded → Stripe **`payment=success`**. This closes the S22 gap ("verified it blocks incomplete; NOT yet verified it allows complete"). The guard now verified both ways. Note: `checkBookComplete` reads the data model, not the painted DOM — it isn't fooled by render timing (engine screenshot 07 was mid-render/empty yet the book correctly judged complete).

**Then ran the user's complex-scenario plan (partly done).** Minted an **80-page order AEV-026** with FP1 + FP5 only via new script `qa/order-80-fp1-fp5.mjs`. Findings: an 80-page book **requires 106 main photos** though the configurator promised "75–91" (worse instance of TO-DO #58); **upload took 190.6s (~3.2 min)** for 110 files — a real customer-UX concern (TO-DO #62; a 5-min cap timed out once, leaving orphan AEV-025). User did creative staff edits on AEV-026 (swap, H/V, heart-crop, captions). Hand-off model agreed: **scripts are headless** (no visible browser) so the user does creative edits in their own logged-in browser; I run the deterministic legs + inspect.

**FIXED two FP5 bugs (both committed-pending, NOT yet deployed-to-live for the render parts):**
1. **#61 upload** — `functions/upload.js` now appends `slotIndex` → stores `fp5-0.jpg`/`fp5-1.jpg` (distinct). **DEPLOYED** (`createUploadSession`). AEV-026 is the first order with two distinct art files (verified in its load log: fp5-0 1024×1536, fp5-1 736×1104).
2. **#63 render (NEW, separate bug)** — the browser render resolved the artwork by `slotIdx` (always 0 per FP5 page) → showed the same artwork on both pages. Fixed in BOTH `template-engine.html` + `customer-preview.html` (mirrored): artwork now indexes by side (left=0, right=1). PDF (`export-pdf.js`) was already correct. **These are LOCAL HTML edits — not on aevia-test.pages.dev yet; need commit+deploy or local `npx serve` to see.**

**Sequencing logic — clarified via /understanding-the-ask + built a placement audit.** The real ask: staff curate every order and need the system to SHOW how photos were sequenced so they can decide swaps. Key correction to our mental model: **the engine already sorts the pool chronologically** (`EXIF date` → `filename number` → `upload order`, `template-engine.html:1369-1375`) — Q1(1) is already implemented; test photos just have no EXIF so it falls back to filename number. The gap was no per-photo PLACEMENT log. **Built `logPlacementAudit()`** (`template-engine.html`, staff-only console diagnostic): after auto-arrange it prints each spread→page→slot→photo+orientation, and **flags ⚠ every point where chronology breaks** (a photo placed out of date order, usually because a multi-slot page locks to one orientation). **UNVERIFIED in browser** — user is testing locally next; the chain runBook code path runs it for both fresh and restored books. Open question for next session: is the orientation-vs-chronology trade-off acceptable, or should the algorithm be tuned (step 2, deferred).

### ▶ S23 remaining / NEXT SESSION verification queue
1. **User is testing AEV-026 locally** (`npx serve . -p 8080` → `http://localhost:8080/pages/staff/template-engine.html`). Awaiting: (a) PLACEMENT AUDIT log output (confirms `logPlacementAudit` runs + shows the real break pattern on 106 photos); (b) FP5 art gallery now shows TWO different artworks.
2. **Resume the user's complex-scenario plan** mid-flow: after staff edits → send preview → customer edits (swap/caption) → **check staff vs customer state parity after approval+payment** (step 7) → **generate PDF** (`npm run pdf -- AEV-026`, step 8) and inspect.
3. **Decide on sequencing algorithm** — review the audit's break pattern; tune chronology-vs-orientation if warranted (deferred step 2).
4. **Commit + deploy** the local render fixes (#63) so they reach the live site; the upload fix (#61) is already deployed.

### S23 remaining manual negative-checks (optional, low priority)
The block path was verified once in S22. Two explicit manual sub-checks remain un-automated: (a) break a slot/caption in-engine → dashboard preview link blocked **with reasons shown**; (b) customer-side incomplete-approve **warn toast**. Re-confirm if touching the guard again.

---

### Session 22 (2026-06-03) — QA automation + incomplete-book guard (built). Built real browser testing of the customer journey (Playwright drives via Node scripts in `qa/`, Claude judges screenshots). The staff→customer→pay chain (`qa/staff-customer-chain.mjs`) now runs end-to-end through Stripe after fixing login, `networkidle` hangs, and the Stripe payment-method picker (must select "Karte"/Card radio before filling). Mid-session pivoted to a **product feature**: hard-block sending/approving an **incomplete book**.

**NEW FEATURE — incomplete-book guard (built, tested, partly verified).** Saving an incomplete book stays allowed; **sending a preview link** and **approving** are now hard-blocked when the book has empty photo slots, unplaced photos, or blank captions on special pages (data-driven: a caption is required iff the layout shows an editable text box). Shared tested helper `assets/js/book-completeness.js` (`checkBookComplete` → `{complete, reasons[]}`), 12 new jest tests, **suite 69/69 green**. Wired into customer-preview approve (live block + warn toast), staff engine save (stores `bookComplete`), `saveStaffState` function (persists `staffBookComplete`+reasons), dashboard `generatePreviewLink` (blocks send). VERIFIED it correctly **blocks** an incomplete book; NOT yet verified it **allows** a complete one.

**⚠ AEV-023 is corrupted as a fixture** — its customer-side data (`customerBookAssignments`) was saved empty by the earlier automated chain runs (Approve serialized the book before render populated it). Its customer view renders empty (51 unplaced). Staff data is intact. Do not reuse it for clean verification.

### S22→S23 carry-over (all resolved in S23)
~~Deploy `saveStaffState`~~ DONE · ~~Mint fresh order~~ DONE (AEV-024) · ~~Verify allow-complete path~~ DONE (chain through `payment=success`) · ~~Fix #61 FP5 upload~~ DONE+deployed. Active next steps are in the **S23 verification queue** above.
**Test data to clean up later (TO-DO #60):** AEV-023 (corrupted), AEV-024, AEV-025 (orphan/partial), AEV-026 (active fixture) + any chain-created orders.

### Local verification helpers (this session, in `qa/`)
- `qa/probe-photos.mjs`, `qa/verify-completeness.mjs`, `qa/inspect-shapes.mjs` — read-only diagnostics against the **public** customer-preview (no staff pw). To test LOCAL edits, run `npx serve . -p 8080` and use the **clean URL** `http://localhost:8080/pages/customer-preview?token=…` (the `.html` form 301-drops the `?token=`).

---

### Session 21 (2026-06-02) built and verified
Session 21 built and verified **chunk-018 — staff authentication (Firebase Auth)**. DONE. Committed `1a7a3fa` (not yet pushed). Both staff pages (dashboard + template-engine) now require real Firebase Email/Password login; staff Cloud Function calls send the user ID token (`Authorization: Bearer`); `functions/index.js` `isStaff()` verifies the token against a server-side allowlist (`evg.myasin@gmail.com`, `xenia@aevia.at`); `firestore.rules` `/orders` read + update now require an allowlisted staff auth email. The hardcoded password (`keanuredcat`) and staff key (`865865`) are gone from all browser pages — the key survives ONLY in `functions` env + the local PDF CLI (`scripts/export-pdf.js`). Retired legacy `my-order.html` (read Firestore directly by token → forced `allow read: if true`) and removed its "Track your order" email button (see ADR `docs/decisions/0003`). **Verified live:** staff login, dashboard read+update, engine order-load + export, PDF export, customer preview/approve/pay all work; anonymous reads denied. 57/57 tests pass.

**Outstanding wrap-up (not blocking):** (1) ✅ commit pushed; (2) ✅ dead Cloudflare Access app `Aevia Staff` deleted from Zero Trust; (3) docs ARCHITECTURE.md / ROADMAP partly still describe the old `X-Staff-Key`/Cloudflare model — updated where critical, full sweep deferred.

### Earlier (session 20)
Session 20 attempted **chunk-009 (Cloudflare Access)** and **retired it** (superseded by chunk-018). Path-scoped Cloudflare Access can't enforce on a single `*.pages.dev` project (verified). Kept: staff pages moved to `pages/staff/` (commit `c2682a2`, pushed).

### Earlier (session 19)
Session 19 built **chunk-008 — "Approved for print" dashboard button** (developer-agent + independent verify). Committed `70db5d1`, pushed; `markSentToPrint` deployed by user and verified live (a paid order flipped to `sent_to_print` in both dashboard and Firestore). chunk-008 is DONE. Decided: button only, no CLI (resolves the open question). Also installed jest at repo root so `npm test` runs (57/57 pass) and deleted two stale motif-engine trial files.

### Earlier (session 18)
Fixed bugs from the chunk-007 end-to-end test (8 issues + 4 follow-ups). Committed `0d2d8f7`, pushed; `getOrder` redeployed. **Verified:** #9 PDF — cover + all SVG overlays render in `--order` mode (AEV-021 clean).

**UNTESTED in browser (verify next session):**
- #2 post-payment thank-you screen (skips book reload on `?payment=success`)
- #3 rotating reassurance lines on customer book load (counter kept)
- #4 paste-as-plain-text in caption editors (both engines)
- Thank-you screen showing the exact customer email (needs deployed `getOrder` — done)

**Other fixes this session (lower risk):** #8 pay button appears after approve; #3 order-form "undefined" hint gone; #1 spine labels; #5 caption toolbar no longer clips/overlaps; #6 birthday text box true flexbox centering (now matches PDF); #4 order-form scroll stall fixed via downscaled display thumbnails.

### Earlier
- Session 17: chunk-007 full PDF pipeline (see `sessions/2026-06-02.md`).
- Sessions 11–16: chunks 001–006, Stripe, heart crop (see `sessions/2026-06-01.md`).

**Meta-task bar (user, explicit):** customer-rendered book must look EXACTLY like staff (fonts, styling, captions, photo positions, spreads, cover). Customer can change photo sequence, captions, caption styling AND alignment, always using our layout.

## Immediate next steps
1. ~~Push the chunk-018 commit + delete the dead Cloudflare Access app~~ — both DONE (session 22).
2. **Browser-verify Session 18 untested items** (#2, #3, #4, thank-you email) — see UNTESTED list above. Test #2 needs a fresh order paid via Stripe (returns with `?payment=success`).
3. **TO-DO #56** — post-payment confirmation email to the customer (only staff notified on payment today).
4. **Switch Stripe to live mode** — when real website is deployed.

## Deferred
- **Playwright browser tests** — deferred until customer preview is stable in production.
- **chunks 010–017** — Template digitisation. Wait for CSV + SVG files from Kseniia.
- **TO-DO #50** — sentSnapshot visual view (`?view=sent`). Low priority.
- **TO-DO #51** — Customer preview load performance. Low priority.
- **Verify #55 in customer-preview view** — confirm heart crop renders identically (read-only) on a live customer preview link. Do with a real new order.

## Open questions
1. **PDF script shared access** — each installs Node locally (near-term) vs Cloud Run job (long-term). Resolve before second founder needs to generate PDFs.
2. **Stripe live mode** — requires live website URL for full Stripe account activation. Currently running in test mode.

## Open watch-outs
- **(S24)** **PDF reads GCS `book-state.json`, written ONLY by the engine's "Export book state (JSON)" button — NOT by "Save book state"** (which writes Firestore for the customer view + guard). They're two separate clicks. If you Save but don't Export, `npm run pdf` fails with "No such object: …/book-state.json". (TO-DO #64.)
- **(S24)** **Cover captions go through `stripHtml` now** (`export-pdf.js:740`) — same as spread captions. `stripHtml` normalises NBSP (U+00A0)→space so the print font doesn't draw `.notdef` boxes. Don't reintroduce a raw `.trim()` read on caption text. The NBSP originates in the contenteditable title editor (space before a manual line break).
- **(S24)** **`export-pdf.js` order mode keeps NO local file** — uploads `preview.pdf`/`print.pdf` straight to GCS from memory. `uploadAndSignPdf` now takes bytes, not a path. Local `--photos` mode still writes to `pdf-out/`.
- **(S24)** **Big-book customer load is slow** (~95s for 110 photos) — QA chain must wait for `#load-progress-label` to detach (render-done), not a photo-count guess. (TO-DO #66.)
- **(S22)** **Incomplete-book guard needs a function deploy to work.** `firebase deploy --only functions:saveStaffState` writes `staffBookComplete`/`staffIncompleteReasons`. Until deployed, the dashboard send-gate (`generatePreviewLink`, blocks when `staffBookComplete !== true`) will refuse EVERY order. Completeness logic lives in ONE place: `assets/js/book-completeness.js` (included in engine + customer-preview via `<script src>`). Both render paths must keep pushing `{spread,side}` into `window._requiredCaptions` wherever `variant.textPanel?.caption?.allowed` — mirrored edit, per the engine-parity rule.
- **(S22)** **Customer save can override good staff data.** On reopen, load precedence is customer > staff > defaults (`customer-preview.html:916-923`). A customer (or an automated approve) that serializes an empty/partial book writes `customerBookAssignments`/`customerCaptions` that then REPLACE the intact staff arrangement on next load. AEV-023 got bricked this way. The new approve-gate mitigates (can't approve an incomplete book), but the precedence + a save-before-render race are worth a proper look.
- **(S22)** **`serve` drops query strings on `.html`.** Loading the local customer-preview with a token: use `/pages/customer-preview?token=…` (clean URL). The `.html` form 301-redirects and loses `?token=` → no order loads.
- **(S22)** **AEV-023 customer data corrupted** — empty `customerBookAssignments`, lost special-page captions. Staff data intact. Don't use it to verify the "allow complete book" path; mint a fresh order.
- **(S21)** **chunk-018 done — the S20 exposure is now CLOSED.** `firestore.rules` locks `/orders` read+update to `request.auth.token.email in ['evg.myasin@gmail.com','xenia@aevia.at']`. This allowlist exists in TWO places that MUST stay in sync: `firestore.rules` and `STAFF_EMAILS` in `functions/index.js`. Add/remove staff in both, then `firebase deploy --only firestore:rules,functions`.
- **(S21)** Staff Cloud Functions accept a Firebase ID token (`Authorization: Bearer`) OR the static `865865` key. The key is no longer in any browser page — it remains only in `functions` env (`STAFF_KEY`) and `scripts/export-pdf.js` (local PDF CLI, no logged-in user). To fully retire the key, migrate that script to admin credentials.
- **(S21)** Customer flows (preview/approve/pay/book-save) run via admin-SDK Cloud Functions and BYPASS `firestore.rules` — tightening rules never affects them. `customer-preview.html` does NOT touch Firestore directly. Do not "fix" customer auth in rules.
- **(S21)** Email/Password sign-up is technically open on the Firebase project (public apiKey) — so a valid token is NOT sufficient; `isStaff()` and the rules MUST check the email allowlist, not just `request.auth != null`. Don't relax this.
- **(S21)** Engine login gate is a separate `<script type="module">` (Firebase modular SDK needs ESM; the main engine script is a plain `<script>`). It exposes `window.staffHeaders()`. The engine renders underneath the overlay before auth resolves — expected.
- **(S21)** Pre-existing cosmetic bug (NOT fixed): `scripts/export-pdf.js` `--order` mode prints a local `pdf-out\preview.pdf` path even though it uploads to GCS. Harmless; the GCS link it also prints is the real one.
- **(S20)** chunk-018 build order matters: enable Firebase Auth + create accounts → add login to dashboard and confirm YOU can get in → switch functions to ID token (keep static key one step in parallel) → tighten `firestore.rules` → delete password/key → mirror onto engine. Tightening rules before your login works = locked out.
- **(S20)** A non-enforcing Cloudflare self-hosted Access app (`Aevia Staff`, dest `aevia-test.pages.dev/pages/staff/*`) exists in Zero Trust — delete it; it protects nothing.
- **(S19)** chunk-008: `markSentToPrint` write is admin-SDK (Cloud Function) → bypasses `firestore.rules`, no allowlist entry needed. Button only renders on `paid` orders and 404s until the function is deployed (`firebase deploy --only functions:markSentToPrint`). This function is the future hook for Elanders/SiteFlow API submission (P2) — plug the API call inside it, no UI rebuild.
- **(S19)** Repo-root `npm test` (jest) now works but needs `npm install` at repo root on a fresh clone — separate from `scripts/npm install` for the PDF export. `node_modules/` is gitignored.
- **(S18)** `scripts/export-pdf.js`: any constant derived from `MM_TO_PX`/`BLEED_MM`/`MM_TO_PT` MUST be assigned inside `initializePrintConstants()`, not at module top — they're lazy in `--order` mode. Module-load math gives `NaN` (broke cover + all SVGs).
- **(S18)** Order-form thumbnails are downscaled display-only copies (`_thumbUrl`). Full-res `_objUrl` is used for the lightbox AND the GCS upload (`fileObjects`) — never swap the upload to the thumbnail. PDF unaffected (pulls full-res originals from GCS).
- **(S18)** Birthday textPanel centering: engine now uses flexbox; PDF centers via `(boxHeight − textHeight)/2`. Both read `valign:'center'` from CSV. A future Top/Mid/Bottom toolbar control would need the PDF to read `ov.valign` too (currently reads `capDef.valign` only).
- **(S18)** `getOrder` now returns `email` — used by the post-payment thank-you screen. Deployed.
- **(S17)** GCS folder naming: new orders use `AEV-001/` as folder. Old test orders use `templatename_customername_date/` — their Firestore `folderName` still points to old path, they still work.
- **(S17)** `scripts/node_modules` must be installed (`cd scripts && npm install`) on any fresh clone before running PDF export.
- **(S17)** `npm run pdf -- AEV-001` runs from `scripts/` dir (not repo root). The `--` is required npm syntax to pass the order number to the script.
- **(S17)** `updatePdfLinks()` in dashboard fires two HTTP calls per visible order on every table render. Fine at current volumes; revisit if order count grows significantly.
- **(S15)** Stripe webhook idempotency: guard checks `order.status === 'paid'` before writing.
- **(S15)** `createCheckoutSession` validates `order.status === 'approved'` before creating a session.
- **(S15)** Three Stripe env vars in `functions/.env`: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`. Never commit. Swap all three for live equivalents when going live.
- **(S14)** Heart crop parity: engine sets `object-position: x% y%`; PDF computes `window-left = (scaledW − CONTENT_PX) × x/100`. Don't change one side's math without the other.
- **(S12)** Book layout saved by photo **basename**, not pool index. `assignmentsToNames`/`assignmentsToIndices` in BOTH engines — keep in sync.
- **(S12)** Staff `renderBook` auto-arranges UNLESS `window._restoreState` is set. Don't remove the guard.
- **(S11)** `FieldValue.serverTimestamp()` cannot be nested inside `arrayUnion`. Use `Timestamp.now()` inside array entries only.
- **(S11)** Any new field written from the browser must be added to the `hasOnly([...])` allowlist in `firestore.rules`.
- **(S9)** Customer load precedence: customer > staff > defaults.
- **(S8)** Customer & staff are parallel copies of the same render logic — change one, mirror the other.

## Key files
- Session log: `sessions/2026-06-02.md` (sessions 17 + 18)
- Previous session log: `sessions/2026-06-01.md` (sessions 11–16)
- Cloud Functions: `functions/index.js`, `functions/upload.js`
- Customer preview page: `pages/customer-preview.html`
- Staff dashboard: `pages/staff/dashboard.html`
- PDF export script: `scripts/export-pdf.js`, `scripts/package.json`
- Product requirements: `PRD.md`
- Architecture: `ARCHITECTURE.md`
- Roadmap (active): `ROADMAP.md`
- Backlog: `TO-DOS.md`
- Staff engine: `pages/staff/template-engine.html`
- Firestore rules: `firestore.rules`
- Template data: `assets/Template_Scribble/scribble-data.js`
- ADRs: `docs/decisions/`
