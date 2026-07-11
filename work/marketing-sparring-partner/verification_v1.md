# Verification: marketing-plan rubric score + marketing-council dossier accuracy

**Purpose:** Close two load-bearing gaps flagged by a prior critic review of the marketing-skills research, feeding a build decision for a skill-pack. Scope is deliberately narrow — two checks only.

**Source repo:** `coreyhaines31/marketingskills` (GitHub), fetched via raw.githubusercontent.com, 2026-07-11.

---

## Task 1 — Rubric score: `marketing-plan` skill for Aevia

**Files read in full:** `skills/marketing-plan/SKILL.md` (270 lines), and references: `plan-template.md` (494 lines), `methodology.md` (363 lines), `aarrr-framework.md` (180 lines), `client-types.md` (373 lines), `current-state-rubric.md` (255 lines), `funding-stage-unlocks.md` (230 lines), `idea-cross-reference.md` (265 lines).

### Scores

| # | Criterion | Score /2 | Rationale |
|---|---|---|---|
| 1 | Premium physical consumer product / DTC (not SaaS/B2B) | **1** | An "Archetype 7 — Commerce/DTC (non-subscription)" exists in `client-types.md` (lines 309–355) and is a reasonable partial fit. But it's 1 of 7 archetypes bolted onto a spine (funding tiers, ARR growth phases, the 17-section rubric's "Sales material," "Internationalization" items) that assumes SaaS/VC-backed as the default case. The archetype itself still frames retention as "repeat purchase rate is the key retention metric" (line 315) — not built for a one-shot gift purchase. |
| 2 | Occasion/gift purchase psychology, one-shot buyers | **0** | No treatment of occasion-driven purchase psychology anywhere in SKILL.md or references. "Gifting flows" appear only as one bullet under Referral in two archetypes (`client-types.md` lines 136, 335) — a footnote, not a designed-for case. Section 6 (Retention) is structurally built on "lifecycle flows, churn prevention, win-back" (SKILL.md line 72; `plan-template.md` lines 198–215) — concepts that don't exist for a customer who may buy once every few years for a wedding/baby milestone. |
| 3 | Brand positioning + organic/content-led acquisition | **2** | Genuine strength. Tier 1 (`funding-stage-unlocks.md` lines 22–39) is built explicitly for "organic only" bootstrapped operation with $0 paid. `aarrr-framework.md` line 89: "Build the organic compound first... Only layer paid on top of a working organic baseline. Premature paid amplifies what's broken." This maps well onto Aevia's actual acquisition model. |
| 4 | Startup-with-zero-data discipline | **1** | Good instincts exist: `current-state-rubric.md` line 180 explicitly says pre-seed clients score 0 on paid "without treating it as a weakness"; `methodology.md` line 359: "don't guess... mark `[TBD — to confirm with team]`." But this discipline is entirely wrapped in VC funding-round logic ("what changes when the next round closes," `funding-stage-unlocks.md` throughout) that is inapplicable to a bootstrapped two-person team with no funding rounds, ARR concept, or intent to raise. |
| 5 | Founder-operated framing (not agency serving clients) | **0** | Structurally the opposite. SKILL.md line 6: "You are an expert marketing strategist operating at fCMO (fractional CMO) level... produce a comprehensive, executable 12-month marketing plan **for a specific client or company**." Title block (`plan-template.md` lines 12–17): "Prepared by: {Author / fCMO name} / For: {Founders / leadership team}." File layout is `~/marketing-plans/{client-slug}/` throughout. The entire document is written in second/third person as an external advisor serving a client, not as founder self-authorship. |
| 6 | Craft: real procedure vs vibes | **2** | Genuinely strong. A resumable INIT → REVIEW → FINALIZE → finalized state machine with an explicit `progress.md` schema and resumption decision tree (`methodology.md` Step 1.1.2, lines 60–71); a 17-section current-state rubric with 0–5 scoring anchors per section (`current-state-rubric.md`); an explicit verification checklist before publish (`methodology.md` Step 3.2, lines 311–320); named failure modes. This is real procedure, not vibes. |

**Total: 6/12**

### How deeply AARRR / fCMO-for-clients / funding-stage milestones are baked into structure (not just examples)

All three are structural, not incidental:

- **AARRR** is the organizing skeleton of the entire 13-section template — Sections 4–8 are literally titled Acquisition/Activation/Retention/Referral/Revenue (SKILL.md lines 70–74); Section 9's roadmap is "AARRR-tagged" (line 75); Section 11's ops stack and Section 12's idea bank are both tables keyed by AARRR stage; Section 13's leading indicators table is keyed by AARRR stage. This is the deepest possible bake-in — removing AARRR means rebuilding the document's spine, not swapping an example.
- **fCMO-for-clients framing** is declared in the persona line of SKILL.md ("You are an expert marketing strategist operating at fCMO level," line 6) and reinforced in the title block, the folder-naming convention (`{client-slug}`), and Section 11's RACI table which explicitly plans for "Series A often the moment the fCMO transitions out or transitions to advisor" (`funding-stage-unlocks.md` line 107). This is a structural role assumption, not example dressing — a founder running this on themselves has to mentally substitute "client" = "us" throughout, and the transition-out-at-scale logic simply doesn't apply.
- **Funding-stage milestones** get their own dedicated reference file (`funding-stage-unlocks.md`, 230 lines, entirely about pre-seed → Series B+ VC tiers) and are required inputs, not optional colour: Section 3 must "state the funding-stage tier this maps to" (`plan-template.md` line 95); the per-section completion heuristic for Section 10 is literally "Each quarter names the funding stage explicitly" (`plan-template.md` line 491); Section 10's budget math ties to "New ARR" and the "3-3-2-2-2" VC growth rule (SKILL.md lines 135–139). Aevia has no funding rounds, no ARR concept, and no intent to raise — this entire reference file and its cross-references throughout the template are dead weight requiring a full swap, not an edit.

### Are Retention (§6) and Revenue (§8) meaningful or hollow for a one-shot ~€95 purchase?

**Hollow as templated.** Section 8's required unit-economics table (`plan-template.md` lines 254–265) is: ARPC (avg **monthly** revenue per customer), Blended CAC, **annual retention rate**, LTV = ARPC × 12 / annual churn, LTV/CAC > 3 benchmark. Every one of these terms assumes recurring/subscription revenue. Aevia has no monthly revenue per customer, no churn, and "annual retention rate" is meaningless for a gift purchased for a wedding or a baby's first year. Section 6 (Retention) is built on "lifecycle email flows... subscription/preference centers... churn reconciliation... annual plan default tests" (`plan-template.md` lines 206–211) — none of which exist for Aevia. Both sections would need a full rebuild around AOV, multi-year repeat-occasion purchase, and gift-driven referral economics rather than a light edit of the existing template.

### Is the 139-idea `marketing-ideas` cross-reference a hard dependency?

**Yes, a hard dependency on a separate skill.** `idea-cross-reference.md` states plainly (lines 1, 262–265) that it is sourced from `skills/marketing-ideas/SKILL.md` and `skills/marketing-ideas/references/ideas-by-category.md` in the same repo — a different skill entirely. Section 12 of the plan template requires cross-referencing "all 139 ideas" (SKILL.md line 78, `plan-template.md` lines 384–422). Spot-checking the idea list itself shows heavy SaaS/dev-tool skew irrelevant to Aevia: "Free Migrations (SaaS-specific)," "Public APIs (Developer products)," "Contract Buyouts (B2B SaaS only)," "Open Source as Marketing," "Source Platforms (B2B SaaS only)," "Powered By Marketing." Adopting Section 12 as designed means also importing/adapting a second, largely-mismatched skill — compounding the mismatch rather than fixing it.

### Recommendation: **REWRITE**

Not ADOPT-with-light-edits — the AARRR skeleton, fCMO/client framing, and funding-tier system are structural requirements checked at nearly every section, and light edits can't remove a spine. Not DROP either — the procedural craft is genuinely good and domain-agnostic: the resumable phase state machine, the scored current-state rubric mechanic, and the verification-before-publish checklist all transfer cleanly to a much simpler plan. The two strong scores (organic/content-led acquisition discipline, and the phased-review craft) are worth keeping; the four weak scores (physical/gift fit, occasion psychology, zero-data-without-VC-framing, founder-not-agency framing) all stem from the same root cause — a document built for a VC-funded, subscription-revenue, agency-serves-client model — and are exactly what a rewrite should replace: keep the state machine and interactive review process, drop AARRR's Retention/Revenue SaaS math and the funding-tier reference file, drop or radically shrink Section 12's idea bank rather than import the mismatched 139-idea library, and reframe the persona from "fCMO serving a client" to "founder planning for themselves."

---

## Task 2 — Verify `marketing-council` advisor dossiers

**Files read in full:** `april-dunford.md` (41 lines), `byron-sharp.md` (43 lines), `rory-sutherland.md` (42 lines), `david-ogilvy.md` (42 lines), all from `skills/marketing-council/references/advisors/`.

### April Dunford

Sourced and accurate. Correctly attributes the five-(plus-one)-components framework and the three positioning styles (head-to-head / big fish-small pond / create a new game) to *Obviously Awesome* (2019), and the eight-step Sales Pitch framework to *Sales Pitch* (2023) — both real books with these real frameworks, matching what's publicly known about her work. The "positioning baggage" and "biggest competitor is the status quo" positions match her recurring talk-circuit content. Blind spots are honestly stated (B2B-tech-derived, no quantitative validation step) rather than glossed over.

### Byron Sharp

Sourced and accurate — the strongest technical match of the four. Mental/physical availability, the double jeopardy law (correctly noted as originating with McPhee/Ehrenberg, not Sharp himself — a genuine attribution nuance most summaries miss), distinctive assets (correctly credited to Romaniuk's extension of the work, not claimed as Sharp's own), and the duplication-of-purchase law are all real, correctly attributed concepts from *How Brands Grow* (2010) and *Part 2* (2016/2021). The documented critique from Mark Ritson is a real, publicly known tension in marketing-science circles, not invented. Director, Ehrenberg-Bass Institute — correct current role.

### Rory Sutherland

Sourced and accurate. Psycho-logic, costly signaling (correctly traced to Zahavi's handicap principle), the doorman fallacy, and the Eurostar/Uber "psychological moonshot" examples are all real content from *Alchemy* (2019) and his TED talks. "Vice Chairman, Ogilvy UK" is his correct real-world title. The AI-era quotes are attributed to specific named venues (MAD//Masters livestream via PPC Land, May 2026; The Spectator, Jan 2024) with an explicit caveat that his AI positions evolve quickly — appropriately hedged rather than presented as settled doctrine.

### David Ogilvy

Sourced and accurate, and independently verified: I confirmed via web search that the "brand image" concept's attribution to Gardner & Levy's 1955 Harvard Business Review article "The Product and the Brand," and Ogilvy's own "I pinched it" admission, are both genuine and match the historical record (source: Branding Strategy Insider's account of the same episode). The "consumer is not a moron, she's your wife" and "never stop statues of committees" quotes are genuine, well-documented Ogilvy lines from *Confessions of an Advertising Man* (1963) and Ogilvy's collected quotations. Notably, the dossier itself flags one quote as unverified ("Do not quote 'I was wrong about humor' verbatim — unverified; paraphrase the reversal") — a strong positive signal: the author distinguishes verified from unverified material rather than fabricating confidently.

### Verdict: dossiers sound — **YES**

All four dossiers carry sourced, documented positions tied to named books, years, and real frameworks, accurately matching each person's actual published work as far as I can verify (one claim independently confirmed via live web search). No fabricated quotes were found. Where the source material itself is uncertain, the dossiers explicitly flag it rather than inventing confidently (see the Ogilvy caveat above) — this is a mark of good editorial discipline, not a gap. The council's "grounded in documented positions, no fabricated quotes" promise **holds** for all four dossiers checked.

---

## Limitations

- Task 1 rubric scoring reflects one rater's judgment against the stated criteria; reasonable people could weight criterion 1 or 4 half a point differently, though the overall REWRITE conclusion is robust to small scoring shifts.
- Task 2 verification relied primarily on prior knowledge plus one targeted live web check (Ogilvy/Gardner-Levy attribution, confirmed). The other three dossiers' claims were assessed against training-data knowledge of these public figures' well-known published work rather than independently web-verified line-by-line; confidence is nonetheless high given how closely each dossier's specific attributions (author, year, co-author credit) match well-established public record, and the dossiers' own habit of flagging uncertain material.
- Neither the `marketing-ideas` skill (139-idea source) nor other `marketing-council` advisors were read — out of scope per the task brief.
