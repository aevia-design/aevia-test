# Aevia — Backlog

> **Scope:** items NOT covered by ROADMAP.md. The sequenced product build lives there.
> **Sorted by when it must happen, not by topic.** Within each section, 🔴 first.
> **Long detail lives in `docs/todo-notes.md`** or in a dedicated brief — never in this table.
> Numbers are stable and referenced across the repo as "TO-DOS #NN". Do not renumber.
>
> _Last pruned: 2026-08-13 (S173) — removed 9 obsolete/resolved items (see foot of file).
> Previous prune: 2026-08-12 (S169) — 25 items, notes split out, two duplicate IDs renumbered._

---

## 1 · Before the F&F trial (~Sep 2026)
_Real people place real orders. Anything that strands or silently corrupts an order belongs here._

| # | Item | Notes |
|---|------|-------|
| 111 | Slow photo decode silently guesses orientation | `template-engine.html:1473` races a 10s timeout; on timeout it assumes **horizontal**, w=0/h=0. A vertical photo guessed horizontal seats into the wrong slot. Fired once on 51 photos in the S172 E2E run. |
| 89 | 🔴 `uploading` means both "working" and "dead" | **Brief READY TO IMPLEMENT as of S174** (do-not-implement lifted; every review claim verified against the code) → `docs/briefs/upload-failure-recovery.md`. A scheduled job flips `uploading` → **`upload_failed` after 1h**, the staff "New Order" email moves to `confirmUpload`, and the customer is emailed only if no later order from the same address succeeded. Supersedes the old "derived label" plan → [notes](docs/todo-notes.md#89) |
| 90 | Stranded orders have no resume path | AEV-067/073/074/079, AEV-096. **Partly answered S173** — the Retry button and the detection job are in `docs/briefs/upload-failure-recovery.md`. What stays open is only **self-service resume after the tab has closed** (an emailed link that reopens the order with just the missing slots), deliberately deferred until that brief ships and produces real numbers. Competitors solve this with saved projects, but they are DIY tools and Aevia is done-for-you → [notes](docs/todo-notes.md#90) |
| 92 | Verify the `confirmUpload` retry fix live | Fixed S150 (`769b47e`), never tested on the rig. Place a test order; the happy path is what the retry could break → [notes](docs/todo-notes.md#92) |
| 99 | Approval overwrites staff edits blindly | No staleness check between `customerUpdatedAt` and the last staff save. Either side can silently discard the other → [notes](docs/todo-notes.md#99) |
| 95 | Spine geometry for Papercut, Newborn, Wander | Small per template — **but audit `sections.spine.bgColor` first**, it is now the only source of the spine colour and Tender's was wrong → `work/spine-geometry/brief.md` |
| 102 | Verify the full-bleed reposition fix in print | Do at the Printsmarter samples run: reposition on the *overflowing* axis, one order per template → [notes](docs/todo-notes.md#102) |
| 60 | Clean up QA test orders | AEV-023, 024, 025, 078, 079, **096** (S173 stall test, stranded at `uploading`). ⚠ Never demo AEV-078 — it carries deliberate injection payloads. |
| 98 | Papercut orders before 13 July have `name`/`year` swapped | Likely zero real orders affected. Check, then swap the two Firestore fields → [notes](docs/todo-notes.md#98) |

---

## 2 · Before public launch
_Customer-visible untruths, legal exposure, and anything that makes the site look unfinished._

| # | Item | Notes |
|---|------|-------|
| 110 | Laguna product-page copy has not been owner-reviewed | EN + DE first draft written S171, mirrored into both copy masters. DE also still unread by a native speaker. |
| 80 | 🔴 Print specs on product pages are invented | Cover, paper, binding, FSC, "Printed in the EU" — all placeholder, on 6 pages × 2 languages. Real specs come from the Aug print visit. |
| 78 | 🔴 Copy promises Google Drive / Dropbox upload; neither exists | Either ship Dropbox Chooser (days, no OAuth) or change the copy → [notes](docs/todo-notes.md#78) |
| 25 | Terms & Conditions page | Minimum: refund/returns. Something must exist before taking payments. |
| 91 | CDN libraries are unpinned with no SRI | 6 tags, zero `integrity=`. Not card skimming (Stripe hosts checkout) but auth tokens and link rewriting are exposed. Fix = vendor into `assets/js/` → [notes](docs/todo-notes.md#91) |
| 11 | OG image tags | Zero pages have them today. Shared links look blank on WhatsApp/iMessage. |
| 12 | SEO: meta descriptions, schema, sitemap.xml | Canonicals, hreflang and robots.txt shipped S144. The rest describes content, so it waits on copy + photography. |
| 9 | Google Analytics | Nothing tracked today. Needed before spending on ads. |
| 10 | Meta Pixel | Required for Instagram ads + conversion measurement. |
| 21 | Instagram page creation | Core channel per the concept test. |

---

## 3 · Launch day switches
_Do these **on the day**. Forgetting #81 launches the site invisible to Google._

| # | Item | Notes |
|---|------|-------|
| 81 | 🔴 Delete the Cloudflare `noindex` rule | Also delete the `Order gate` redirect rule and the "opening this autumn" banner in `assets/js/site-mode.js`. Verify with `curl -sI https://aevia.at/ \| grep -i x-robots-tag` → ADR-0009 |

---

## 4 · After launch
_Real improvements, but nothing breaks if they wait._

| # | Item | Notes |
|---|------|-------|
| 112 | Golden set for the caption AI | Ten sample inputs + the output the owner accepts, checked in, re-run after any prompt change. Voice drift is invisible — a tweak for one page quietly degrades captions elsewhere with every test still green. **Deferred S175 (owner): only test orders exist, too early to pick real samples.** → `docs/briefs/caption-ai-modes.md` |
| 1 | Review the order-page link in the confirmation email | Token generation timing and email structure may be suboptimal. `functions/upload.js:130–226` |
| 13 | Dashboard: overdue order tracking | Highlight orders that haven't moved status in X days. |
| 44 | Prune the dashboard status bar | Unclear what it shows; may hold stale or redundant states. `pages/staff/dashboard.html` |
| 30 | Dashboard: internal notes per order | Free-text staff field, e.g. "customer requested warmer tones". |
| 101 | German order flow — the form is still English | **Germanization Stage 4.** Brief written and approach settled S177: a **string table in `order.html` keyed off `?lang=`**, NOT a `de/order.html` fork. The `lang` param already arrives. → `docs/briefs/germanization.md` |
| 108 | Book language option (EN / DE) | **Stages 0–3 DONE S177** — selector, Firestore `language`, DE artwork in both engines and the PDF. Remaining: #101 (form), German captions, DE mockups. → `docs/briefs/germanization.md` |
| 113 | German transactional emails | Order confirmation, preview-ready, approval. Scoped OUT of the germanization brief; a DE customer gets German artwork, a German form and an English email. **Own session (owner, S178).** First decision is bilingual-in-one-email vs German-only off the order's `language` — not yet made. |
| 17 | Customer delivery tracking | Send the tracking number when status → `in_delivery`; show it in `my-order.html`. |
| 18 | Post-delivery review collection | Automated email after delivery. Concept-test leads are the first targets. |
| 19 | Repeat-order prompt | "Make another book?" via email or `my-order.html`. |
| 20 | Artist profile pages | Bio, style, which templates. Key differentiator. Do when 3+ templates are live. |
| 84 | Decide the fate of "Export book state (JSON)" | It is NOT what feeds the PDF and it looks like it is. Recommended: hide in Order mode, keep in Local → [notes](docs/todo-notes.md#84) |
| 64 | Staff Save vs Export are two separate clicks | Same root confusion as #84. You find out when a PDF fails with "No such object: book-state.json". |
| 73 | Data-driven cover photo shape (clipShape) + orientation | Enables non-rectangular cutouts without per-template engine code. Blocked on Xenia's "Little Annette" assets → [notes](docs/todo-notes.md#73) |
| 67 | Rich-text caption editor: partial styling | Ctrl+B on a selection behaves unpredictably. Needs a decided model + parity across all 3 surfaces → [notes](docs/todo-notes.md#67) |
| 107 | `capture-cover-wrap.mjs` bakes UI chrome into the texture | Worked around at consumption time, not fixed. Bundle the re-capture with the next mockup run (egress) → [notes](docs/todo-notes.md#107) |
| 82 | Serve the homepage at `aevia.at/` not `/pages/home` | A 200 rewrite breaks bare relative links; the real fix conflicts with the CLAUDE.md path convention. Needs a decision → ADR-0009 |
| 53 | Improve upload speed on the order form | 1.12 GB took 5+ min. Parallelise further, consider client-side resize. |
| 62 | 80-page uploads take ~3 min | 110 files at ~1.7s each. Mostly a reassurance/progress-feedback problem. |
| 66 | Customer book load is slow for large books | AEV-026 took ~95s to fetch+render. Sequential fetches in `loadPhotos`. |
| 51 | Customer preview loads photos as blobs | Use the signed URL as `img.src` directly — saves ~150 MB through JS memory. |
| 65 | Preview PDF is ~383 MB | Full-res originals, no downscale. Fine for staff, unwieldy to share. |
| 43 | Template engine scroll performance | Stalls 10–15s after alt-tab and return. |
| 77 | Papercut cover year prints regular instead of bold | `weight: 'bold'` as a string fails a numeric `>= 700` compare. Cosmetic. Fix by mapping string weights, which guards the next template too. |
| 93 | Photos dedupe on filename alone | Two distinct `IMG_0001.JPG` → one silently dropped, count comes up short → [notes](docs/todo-notes.md#93) |
| 50 | Sent-snapshot visual view (`?view=sent`) | Renders `sentSnapshot` instead of live state. Visual audit of sent vs approved. |
| 59 | Server-side hardening for incomplete-book approve | Approve-gate is client-side only. Only hurts the customer's own order. |
| 26 | Quality promise page | Needs a real photoshoot of printed books. |
| 28 | Press / "as seen in" section | Placeholder space on the homepage. |

---

## 5 · Someday / parked
_Deliberately not now. Several were investigated and declined — read the note before reviving._

| # | Item | Notes |
|---|------|-------|
| 100 | "Generate with AI" on engine text panels | Needs a brief first: model, where it runs, cost, voice spec, the fixed 110×110mm overflow constraint → [notes](docs/todo-notes.md#100) |
| 96 | Spine formula unconfirmed | 10mm/14mm fit `6 + 0.1 × pages` exactly. Ask Printsmarter for the formula on the next call. Low risk — two constants either way. |
| 83 | Drop `captions_position` from the sizing CSVs | Safe in principle, **not a quick win** — the 6 CSVs disagree on delimiter, title row and column count → [notes](docs/todo-notes.md#83) |
| 105 | 40 MB cap may refuse a professional's max-quality JPEG | Money is not the blocker, compute is. **Raise `generateDerivative` to 2 GB and prove one large file FIRST — never the cap alone** → `docs/briefs/photo-formats.md` |
| 85 | Update documented `gsutil` commands to `gcloud storage` | No production code affected. Risk is copying a dead command from `LEARNINGS.md` during an emergency → [notes](docs/todo-notes.md#85) |
| 109 | `cover-svg-viewbox.test.js` cannot see artwork that fails to fill the bleed | It checks the viewBox frames the trim, not that the art reaches the bleed edge. S171's 0.5mm hairline was harmless; the same slip at 5mm would print. Extend it to assert coverage. |
| 103 | Test suite needs an undeclared local install | A fresh clone or worktree fails 6 suites with `Cannot find module 'sharp'`. Fix = document `npm install --prefix scripts` or make `test` depend on it. |
| 29 | Referral mechanic | After the first 20 orders. 50% of concept-test participants signed up. |
| 22 | Instagram content tooling | Later, Buffer, or Notion-based planning. |
| 23 | Newsletter setup | Decide the email tool first. |
| 24 | Footer subscribe form → real email tool | Currently leads nowhere. Depends on #23. |
| 31 | Turkish / Russian site | After German, based on order patterns. |
| 32 | B2B order flow | After the B2C MVP is validated. |
| 40 | iOS + Android app | **Deferred, not rejected.** Native shell + WKWebView engine. Revisit after the F&F trial → `docs/briefs/ios-app.md` |

---

## Housekeeping notes (S173)

**Removed by the owner's audit (2026-08-13):**
- **#86** Google sign-in on iPhone — checked from another device, works.
- **#57** Customer save overrides staff book — stale; the live hazard is covered by **#99**.
- **#58** Configurator photo count — the "36–45 photos" string no longer exists anywhere.
- **#97** Re-check the four covers — old, superseded by the per-template cover work.
- **#87** `waitlist.html` mobile styling — owner's call: doesn't matter.
- **#14** Placeholder product-page copy — real copy is in place.
- **#15** `/stop-slop` copy audit — applied across the customer-facing pages.
- **#27** Copyright lines review — done.
- **#16** VAT rate — **resolved: 20%**.
- **#56** Post-payment customer email — **already implemented** in `stripeWebhook`
  (`functions/index.js`, the block marked "TO-DO #56 — previously missing"). Never ticked off.

**#94 VERIFIED AND CLOSED (S173).** The code had been on `main` since `10536f2` (S151); the
note claiming it was uncommitted was wrong. All four success criteria are now met with
evidence — see `work/stall-detection/VERIFICATION.md`.

**#112 FIXED AND CLOSED (S173), same day it was opened.** A failed photo no longer kills
its upload worker, so one bad photo costs one photo instead of stranding the order. A
consecutive-failure breaker (5, reset on any success) keeps a dead connection reporting in
~90s. Rationale in `work/upload-worker-resilience/decision.md`; guarded by a `qa:order`
case proven to fail on the pre-fix code.

---

## Housekeeping notes (S169)

**Removed as done:** #2, #7, #8, #16 (rate question kept), #42, #47, #48, #49, #54, #55, #61, #63,
#68, #69, #70, #71, #72, #74, #75, #76, #79, #104 — plus the `68-orig` and `74-spec` history rows.
All are recorded in git and the session logs.

**Removed as closed / not a task:** #88 (closed S150 without root cause) and #106 (the orphan pages
never existed). Both kept in `docs/todo-notes.md` because the reasoning is worth not repeating.

**Duplicate IDs resolved:** #44 and #97 were each in use for two different items.
`#44` now means only *prune the dashboard status bar*; the book-language item became **#108**.
`#97` now means only *re-check the four covers*; the mockup UI-chrome bug became **#107**.

**Also fixed:** three stray blank lines were splitting the old "Technical improvements" table into
four fragments, which is why #84, #101 and #102 rendered as loose text.
