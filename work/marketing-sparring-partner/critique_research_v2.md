# Critique: research_v2.md + second opinion on the build plan

**Reviewed:** 2026-07-11
**Artefact type:** Research report (adopt-vs-author survey) + downstream build proposal
**Reviewer:** critic-agent (independent; no stake in the research or the build)
**Inputs assessed:** `research_v2.md`; supporting evidence `sweep_raw.json` and `fetched/` (30 SKILL.md copies); context `concept_v1.md`, `folder-instructions.md`, `xenia-flow.md`; the brief and Part-B build proposal supplied in the task.
**Method:** Read the report in full, then spot-checked its load-bearing claims against the raw files it scored — 8+ verbatim quotes across 5 Haines files plus brand-discovery, gift-cards, and the raw sweep. Specifically hunted for the v1 failure mode (anchoring, popularity-as-fit, sampling-best-and-generalising, motivated rehabilitation of the Haines pack).

---

## Summary

`research_v2.md` is a strong, honest piece of work that genuinely corrects the v1 failure rather than repeating it. Every located claim I spot-checked against `fetched/` held **verbatim** — the Haines re-score is real, quote-backed, and self-penalising (it scores the "rehabilitated" skills *low* on the fit rubric, which is the opposite of motivated reasoning). The central integrity risk the brief worried about is not present. Two real gaps keep this from a clean accept: the report never assessed **`marketing-plan`**, the skill the onboarding flow leans on most from session 3 onward, and several craft scores (most importantly `marketing-council`, Xenia's session-2 credibility test) rest on progressive-disclosure reference files that were never fetched. Verdict on (A): **Accept with caveats.** On (B): the repo-and-manifest *vehicle* is right-sized, but the v1 payload is roughly double what a sceptical expert should be handed, and the flagship author-from-scratch skill is a real trap unless reframed.

---

## Part A — Is research_v2.md trustworthy enough to build on?

### What meets the standard (validated, not assumed)

**The v1 failure mode is genuinely corrected.** This was the brief's chief worry, so I tested it directly:

- **Not a single-query anchor.** `sweep_raw.json` contains a broad sweep spanning ecommerce, brand, positioning, gift, luxury, premium, consumer, content, social, pricing, storytelling and more. This is a materially different method from v1's single popularity-ranked query.
- **Popularity is explicitly discounted, repeatedly.** The report flags the `brand-guidelines` 65k install count as "an artefact of being bundled… not a quality signal" (line 34) and Haines's heavy installs as "traction, not a quality proxy" (line 90). It scores file content, not repo fame — exactly the discipline v1 lacked.
- **The re-score is located, not asserted.** I verified the load-bearing quotes against the raw files:
  - `pricing` opens "You are an expert in SaaS pricing and monetization strategy" — confirmed, `haines_pricing.md` line 10. Van Westendorp and the pricing-psychology block (anchoring/decoy/charm/round) are present exactly where the report says (lines 122, 186–190).
  - `customer-research` B2B persona template — "Title range: Marketing Manager to VP of Marketing", "Company size: 50–500 employees, Series A–C SaaS", "Reports to", "How it makes them look to their boss/team" — all confirmed verbatim (`haines_customer-research.md` lines 194–215). The confidence rubric (96–101), the "no reviews yet" proxy-walk (173–182) and the minimum-viable-sample rule (110) are all real and correctly characterised.
  - `product-marketing` JTBD Four Forces (Push/Pull/Habit/Anxiety) — confirmed, lines 98–102; "Personas (B2B only)" self-aware skip — line 70; "Calendly vs SavvyCal" — line 82.
  - `referrals` SaaS trigger "After renewing or upgrading" (line 82) and the affiliate tool list (Rewardful/Tolt/PartnerStack, lines 242–248) — confirmed.
  - `copywriting` "Start Free Trial" (line 132), `content-strategy` "$5k MRR" (line 119), `social` "Example for a SaaS Founder" (line 61) — all confirmed verbatim.
  - `brand-discovery`'s status-quo competitor layer ("most often forgotten and most often the actual competitor," line 76–79) and "life stage" audience axis (line 53) — confirmed. The report's "single best find" framing is defensible; it is a genuinely product-agnostic procedure.
  - `finsilabs/gift-cards` is indeed a Shopify/WooCommerce technical implementation guide, not gift-purchase psychology — confirmed. The gap claim holds.

**The motivated-rehabilitation hypothesis is disconfirmed.** If v2 were salvaging the earlier Haines recommendation, you would expect inflated fit scores and glossed-over SaaS residue. Instead the report scores the four "near-agnostic" skills 8–9/12, docks `pricing` to 6 and method-only `customer-research` to 7 *because* their template layers are SaaS-locked, and states the brief's premise is "correct as a description of `pricing` and `customer-research` specifically, and wrong as a blanket description of the pack" (line 103). That is a calibrated, evidence-led correction, not a rescue. The "score the file, never the repo" rule is applied consistently (e.g. `etsy-pricing-strategy` scored 1 despite sitting in the same repo as a 5-scoring sibling).

**Honesty about limits is present and specific.** The "Gaps and honest limitations" section correctly distinguishes "not verified" from "rejected," flags the deprioritised repos as lower-confidence, and admits no skill was actually installed and run. This is the right posture.

### Priority issues

#### High

**H1 — The most-used skill in the onboarding flow was never assessed.**
- Symptom: `marketing-plan` is not mentioned anywhere in `research_v2.md`, is absent from the scoring table, and was not fetched (confirmed by search). Yet `xenia-flow.md` session 3 *is* "Run the marketing-plan skill," `concept_v1.md` names it as a pack skill (line 27), and the whole "strawman-react, section by section" working mode is that skill. The Part-B ADOPT tier also omits it.
- Root cause: the sweep and re-score fixed on the eight skills named in the brief plus discovered candidates; `marketing-plan` fell between "not named in the rubric" and "assumed adopted." No one owned assessing it.
- Impact: the execution engine for sessions 3-onward — the bulk of Xenia's actual usage — has zero fit evidence. If the build (Part B) ships a curated repo replacing the wholesale Haines install, it currently *drops the skill the flow depends on most*. This is simultaneously a research hole and a build hole.
- Where to next (prescriptive): fetch and re-score `coreyhaines31/marketingskills/skills/marketing-plan/SKILL.md` against the six-item rubric before finalising the build, and place it explicitly in a tier. It is very likely an ADOPT-with-light-edits, but that must be shown, not assumed. Check in particular whether its section structure and any benchmark defaults are SaaS-shaped (it is the skill most likely to carry AARRR/funnel scaffolding into every plan).

#### Medium

**M1 — Craft scores depend on reference files that were never read.**
- Symptom: `marketing-council` scores craft 2/2 and is the "adopt as-is" centrepiece, but its substance lives in `references/advisors/*.md` (12 dossiers) and `references/advisor-template.md`, none of which are in `fetched/`. The report scored the SKILL.md orchestration layer only. The same unread-reference caveat applies to `pricing` (`references/research-methods.md`, `tier-structure.md`), `customer-research` (`references/source-guides.md`), and `brand-discovery` (`references/discovery-report-template.md`, `interview-guide.md`).
- Root cause: SKILL.md-only assessment (which the brief permitted) does not reach progressive-disclosure files, yet those files hold the actual procedures and — for the council — the grounding that makes or breaks the "no fabricated quotes, real documented positions" promise.
- Impact: `marketing-council` is Xenia's session-2 exercise, the deliberate "AI = shallow consensus machine" killer and the moment a sceptical expert decides whether this is serious. Its credibility rests entirely on dossier quality that has not been verified. A thin or fabricated dossier would sink the sceptic-conversion thesis at first contact — the highest-stakes unverified dependency in the whole concept.
- Where to next (prescriptive): before the build, read at least 3–4 of the seated-advisor dossiers (Dunford, Sharp, Sutherland, Ogilvy are the likely session-2 seats for a positioning/channel question) and confirm they carry sourced, non-fabricated positions. Treat the council craft score as provisional until then. Mark the other reference-dependent scores "SKILL.md-level, references unverified."

**M2 — The "confirmed empty" gap claim is slightly stronger than the evidence.**
- Symptom: exec-summary point 3 says occasion/gift-purchase psychology is "confirmed empty results across 121 registry-surfaced repos and the wider GitHub search." The sweep queried "gift", "luxury", "premium", "consumer" — but never "occasion", "keepsake", "photo book", "memory", "personalised", or any German/DACH term, and every query was fuzzy-name-matched at limit 10.
- Root cause: absence-of-surfacing is being reported as absence-of-existence. The report hedges well elsewhere ("surfaces candidates, not an exhaustive skill catalogue") but the headline phrasing hardens it.
- Impact: low on the decision (the gap is almost certainly real — such a skill would be unusual), but it matters for Part B because "no reference skill exists" is the exact premise that makes the flagship author-from-scratch item risky. Overstating certainty of the gap makes the authoring decision look safer than it is.
- Where to next (suggestive): soften to "not surfaced by a 29-term fuzzy sweep or the web search performed," or run three confirming queries ("occasion", "keepsake", "photobook") to close it properly.

#### Low / recommendations

**L1 — Minor internal inconsistencies.** The report says "31 terms" (line 28) but `sweep_raw.json` contains 29 query objects; and "~20 skills across 10 repos" (line 28) vs "roughly 20 skills across 12 repos" (line 186). Neither changes a conclusion; reconcile for credibility.

**L2 — `sweep_raw.json` is concatenated JSON objects, not a single array.** Fine as an evidence dump, but note it in the Sources line so a later reader does not assume it parses as one document.

### Assessment against the brief's success criteria (A)

- [x] Verdict on trustworthiness delivered with reasoning.
- [x] Specific gaps/overreaches cited to the file (H1, M1, M2, L1).
- [x] Spot-check results where claims were verified against `fetched/` — 8+ verbatim confirmations, zero contradictions found.
- [x] Explicit accept/caveat/reject call (below).
- [~] "Does the Haines rehabilitation hold up?" — answered yes for the 4 named skills, but incomplete because `marketing-plan` (H1) was never in scope.

### Verdict (A): ACCEPT WITH CAVEATS

The report is trustworthy enough to build on. Its factual accuracy against source is exceptionally high, and it does not repeat the v1 failure — the rehabilitation is located, honest, and self-penalising, not motivated. Before committing the session of build work, close three things: (1) fetch and score `marketing-plan` (H1); (2) read the `marketing-council` advisor dossiers and confirm grounding quality (M1); (3) soften or confirm the "confirmed empty" gift-psychology gap (M2). None of these is likely to overturn the report's recommendations, but (1) and (2) are load-bearing for the build and must not be assumed.

---

## Part B — Second opinion on the build plan

Proposed: a private `aevia-marketing-skills` repo (~10 skills) with a plugin manifest for one-click install on both accounts, replacing the wholesale Haines install, across three tiers (ADOPT / REWRITE / AUTHOR).

### The vehicle is right; the payload is too big for v1

**Not over-engineered as a mechanism.** A private repo + manifest is the *same* one-click custom-marketplace install already validated in `xenia-flow.md` (step 2), just pointed at your own repo. The moment you rewrite `customer-research` or author an occasion skill, you *must* host your own pack — you cannot install edits to Haines's. So the repo is the natural, minimal consequence of the REWRITE/AUTHOR decisions, not gold-plating. Keep it.

**But ~10 skills is roughly double what a sceptical expert should get first.** The onboarding flow only exercises three or four skills in first contact: `product-marketing` (session 1 interview), `marketing-council` (session 2), `marketing-plan` (session 3+), with the discipline enforced by `folder-instructions.md` (not a skill). The other six are latent capability she may not reach for weeks — and to a sceptic, six skills that fire on overlapping triggers read as noise, the exact "skill-trigger noise" `concept_v1.md` warns against (boundary, line 55–56). The concept's own boundary — "build only the thin missing layer" — argues for a smaller v1.

**Trigger-collision risk.** `product-marketing`, `brand-discovery`, and `customer-research` all activate around "who is my audience / positioning / competitors." Installing all three at once invites two or three skills competing to run on Xenia's first question. Pick one primary intake path for v1 (I would keep `product-marketing` as the context-file builder, since the whole architecture depends on that file existing) and stage the others behind it.

### Keep / change / drop per tier

**ADOPT (light edits)** — sound picks, with two corrections:
- Keep `marketing-council` (after M1's dossier check), `product-marketing`, `brand-discovery`. These are the intake/critique spine.
- **Add `marketing-plan`** — the omission is the H1 hole surfacing in the build. Sessions 3+ have no execution skill without it.
- **Defer `brand-review` and any `brand-voice-enforcement`** to v2. They are copy-QA tools; Xenia reaches them only once she is producing copy, which is well after her first plan cycle. In v1 they are latent noise.
- Keep `copywriting`/`content-strategy` in the repo but treat them as v2-activated execution skills, not v1 handover.

**REWRITE (keep method, rebuild template)** — the strongest-justified tier, directly earned by the located re-score. Keep all four in principle, but sequence:
- `customer-research` → occasion/relationship personas: **v1**. It is intake-adjacent; Xenia needs occasion personas during/after session 1, and the confidence-scoring + proxy-walk method is the single most valuable zero-data asset found. This is the rewrite to do first and well.
- `pricing` (keep Van Westendorp + psychology), `referrals` (re-key to post-unboxing — note this is live: S115 Stripe referral programme), `social`: **v2**. All are later-stage execution skills. Doing them now is building ahead of need.

**AUTHOR (from scratch)** — this is where I most diverge from the plan:
- **Occasion/gift-purchase psychology (the flagship): treat as a trap in its proposed form; reframe or defer.** An experienced marketer will not smell an invented *question framework* — she will instantly smell invented *domain facts and benchmarks* ("gift buyers convert 23% higher at…"). The safe form of this skill is a **procedure/lens**, modelled on `brand-discovery`: forced questions (gift-giver-for-someone-else vs buy-for-self; recipient-vs-buyer decision split; occasion-timing calendar; emotional job of the keepsake), mandatory citation of any asserted number, and every claim logged to `assumptions.md`. Built that way it is authorable to standard because it asserts *no* domain knowledge — it structures Xenia's. **Better still, defer the standalone skill out of v1.** Much of its value can be delivered first by (a) the `customer-research` occasion-persona rewrite, (b) a `marketing-council` seat framed to the occasion lens, and (c) Xenia's own `product-marketing.md`. `concept_v1.md`'s open question — "how much correction the folder instructions need shows only in real use" — applies exactly here: let one real plan cycle reveal what is genuinely missing before authoring net-new domain-shaped content. This both raises quality and removes the AI-invented-knowledge risk.
- **Assumptions-ledger enforcement skill: make it conditional, probably drop from v1.** `folder-instructions.md` already enforces the ledger in prose (evidence rules; assumption/confidence/cost-if-wrong/cheapest-test; the "not finished, say so" rule). A separate skill duplicates a discipline the folder instructions already carry. Author it only if, in real use, Claude is observed ignoring the prose rule — otherwise it is a speculative abstraction for a problem you do not yet have.
- The `brand-guidelines` applicator (in the research's authoring list) is a trivial visual/copy convenience, not marketing strategy — fine to clone whenever, not a v1 concern.

### Sizing and sequencing recommendation

- **v1 (ship now, ~4–5):** `product-marketing`, `marketing-council` (dossiers verified), `marketing-plan` (assessed first), `customer-research`-occasion-rewrite, and the `folder-instructions` discipline layer. Optionally `brand-discovery` if trigger-collision with `product-marketing` is sequenced. This maps one-to-one onto `xenia-flow.md` sessions 1–3 and nothing fires that the flow does not use.
- **v2 (after Xenia's first full plan cycle):** add `copywriting`, `content-strategy`, `social`, `referrals`-rewrite, `pricing`-rewrite, `brand-review` incrementally to the *same* repo (the manifest supports drop-in additions). By then real use has shown which are wanted.
- **Author only what the first cycle proves missing:** the occasion lens and the ledger-enforcer graduate from "planned" to "built" on evidence, not upfront.

**Maintenance note (kill-criterion for the build itself):** a private fork of Haines skills forgoes upstream updates and creates a small drift-tracking burden. Acceptable for a two-person team already editing the files — but log it, and set a review trigger (e.g. "re-check upstream Haines pack once, after the first plan cycle").

### Top 3 recommendations (B)

1. **Cut v1 from ~10 to ~5 flow-critical skills and add the missing `marketing-plan`.** Ship only what `xenia-flow.md` sessions 1–3 actually invoke; add the execution skills to the same repo as a v2 increment once she is fluent. Fewer, sharper skills read as serious to a sceptic; ten overlapping ones read as noise and risk trigger-collisions.
2. **Reframe or defer the occasion/gift-psychology skill.** If built, build it as a citation-required question/lens procedure (like `brand-discovery`) that asserts no invented domain facts — that is what an expert would smell. Preferably derive the occasion lens from the `customer-research` rewrite + a `marketing-council` seat first, and only author a standalone skill if the gap survives one real plan cycle.
3. **Close the two load-bearing research gaps before committing build time:** fetch and score `marketing-plan`, and read the `marketing-council` advisor dossiers to confirm their grounding. Both are things Xenia hits in her first three sessions; neither has been verified.

---

## Next steps (prioritised)

1. Fetch + rubric-score `marketing-plan`; place it in a tier (H1). *Blocks build.*
2. Read 3–4 `marketing-council` advisor dossiers; confirm sourced, non-fabricated positions (M1). *Blocks the session-2 credibility claim.*
3. Re-scope the v1 build to ~5 skills mapped to the onboarding flow; move the rest to a v2 increment (B-1).
4. Reframe the occasion-psychology skill as a procedure, or defer it pending the first plan cycle (B-2).
5. Make the assumptions-ledger skill conditional on observed need; soften the "confirmed empty" gap phrasing and reconcile the 29-vs-31 / 10-vs-12 counts (M2, L1).
