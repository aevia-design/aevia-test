# Marketing Agent Skills for Aevia — adopt vs author

**Purpose:** decide which existing Claude Agent Skills (SKILL.md format) Aevia should adopt/adapt vs. author from scratch, for a non-technical expert marketer (Xenia) developing strategy for Aevia's own premium photo-book brand — correcting a first, flawed single-query search that surfaced only `coreyhaines31/marketingskills` and mistook its SaaS skew for the whole picture.

---

## Executive summary

**Verdict: adopt selectively and adapt, don't author from scratch, and don't adopt any single pack wholesale.** No pack found — including Haines's — is built for a premium physical gift product with occasion-driven, mostly one-shot purchases. But the underlying *marketing craft* in the best skills (positioning frameworks, brand-voice systems, storytelling technique, zero-data customer-research method, pricing-research methods) is largely business-model-agnostic; what's SaaS-specific is concentrated in **examples, benchmarks, and output templates**, not in the reasoning method itself. The practical path is a **small adopted core + light rewrites + two or three skills authored from scratch** for the gaps no pack fills.

Four things emerged that revise the brief's starting assumption:

1. **The Haines pack is not uniformly SaaS-skewed.** `marketing-council`, `product-marketing` (the context-file pattern), `copywriting`, and `content-strategy` are near business-model-agnostic in their core method — the SaaS residue is in examples ("Start Free Trial," "Calendly vs SavvyCal") that are trivial to swap. By contrast `pricing` and `customer-research` are SaaS/B2B-locked at the *template* level (subscription tiers, ARPU/churn, company-size/job-title personas) — these need real translation, not just find-and-replace. Full detail in Sub-question 3.
2. **The single best find in the entire sweep is not in the Haines pack at all**: `rampstackco/claude-skills`'s `brand-discovery` skill (Sub-question 2) is a genuinely excellent, product-agnostic upstream-discovery framework that explicitly names "doing nothing / status quo" as a brand's real competitor — exactly Aevia's situation (the alternative to Aevia is a phone camera roll, not another photo-book company).
3. **Nobody has built occasion/gift-purchase psychology, or founder-operated (not agency) framing, as a skill.** These are confirmed empty results across 121 registry-surfaced repos and the wider GitHub search — genuine authoring gaps, not a search failure.
4. **Craft quality varies wildly *within* a single repo**, not just between repos — `nexscope-ai/ecommerce-skills`'s `etsy-pricing-strategy` is a content-free vendor-marketing shell while its `ecommerce-marketing-strategy-builder` in the same repo has real cited benchmarks and a forced intake procedure. This confirms the method requirement: score the file, never the repo name.

**Recommended action:**
- **Adopt as-is or with light copy-edits:** Haines `marketing-council`, `copywriting`, `content-strategy`, `product-marketing` (the context-file pattern); Anthropic `brand-review`, `brand-voice-enforcement` (from `knowledge-work-plugins`); `rampstackco/claude-skills`'s `brand-discovery`.
- **Adopt and materially rewrite the template/benchmarks:** Haines `pricing` (keep Van Westendorp/pricing-psychology, discard tier/subscription apparatus), Haines `customer-research` (keep the confidence-scoring and zero-data proxy-research method, discard the B2B persona template and source list), Haines `referrals` (keep the loop/trigger-moment mechanics, discard churn/LTV framing and SaaS-affiliate tool list — directly relevant since Aevia already runs a Stripe-based referral program), `arnabbagxd/brand-building-skills`'s `d2c-marketing` (keep launch checklist/UGC system, discard subscription-retention flywheel and paid-first channel ordering).
- **Author from scratch (no usable existing skill found):** occasion/gift-purchase psychology and messaging; a founder-operated (2-person, zero-budget) discipline layer for cheap experiments and benchmark sourcing at Aevia's actual scale (existing packs are either SaaS-scale or, in `thatrebeccarae/claude-marketing`'s `market-research`, consulting-report-scale — both wrong altitude); an Aevia-specific brand-guidelines applicator (trivial, cloned from Anthropic's own `brand-guidelines` skill with Aevia's colours/fonts).

---

## Sub-question 1: skills.sh registry deep sweep

### Method
Ran `curl "https://skills.sh/api/search?q=<TERM>&limit=10"` for 31 terms (all specified plus variants). Fuzzy name-match, max 10 results/query — surfaces candidates, not an exhaustive skill catalogue. **121 distinct repos** surfaced across the sweep (raw output: `work/marketing-sparring-partner/sweep_raw.json`). Most are irrelevant noise from substring fuzzy-matching (e.g. `dynatrace-oss/dtctl` matching "dtc"). After name+skillId triage, **~20 skills across 10 repos were read in full** (raw `SKILL.md`, never scored from repo name/README alone).

### Verified findings (file content read)

| Repo (skill read) | What it actually is | Craft | Fit notes |
|---|---|---|---|
| `anthropics/skills` (`brand-guidelines`) | Hardcoded applicator of **Anthropic's own** colours/fonts to generated docs — not a brand-strategy skill | Low as strategy; the *mechanism* is good | High install count (65k) is an artefact of being bundled in every example-skills install, not a quality signal |
| `anthropics/knowledge-work-plugins` (`brand-review`) | Voice-attribute spectrums, severity-scored review table, before/after rewrites, terminology/legal-flag checklist | High — real rubric | SaaS residue only in examples, not framework |
| same repo (`brand-voice-enforcement`) | Forced guideline-lookup sequence, "voice constant/tone flexes" model, conflict-handling protocol | High | Mild B2B flavour in trigger list ("pitch deck," "company stage") |
| same repo (`customer-research`, in the `customer-support` plugin) | **False positive by name** — this is support-ticket/CRM research (KB→CRM→chat→web tiers, escalation to legal/billing/engineering) | High as a support tool, irrelevant here | Assumes existing CRM/support-ticket infra Aevia doesn't have |
| same repo (`campaign-plan`) | Channel-agnostic (owned/earned/paid) campaign brief with dependency-tracked content calendar | Good | Mild B2B flavour ("re-engage churned users") |
| `arnabbagxd/brand-building-skills` (`d2c-marketing`) | Staged DTC system: unit economics → acquisition → email/SMS → retention → social proof/UGC → content → launch checklist → metrics | High — real checklists/benchmarks | **Located skew**: whole flywheel assumes repeat/consumable purchase + subscription retention lever + paid-ads-first channel order; repurchase benchmarks from skincare/food/apparel/supplements, none map to a one-shot occasion buy |
| `nexscope-ai/ecommerce-skills` (`etsy-pricing-strategy`) | Generic "Capabilities/Install/Usage/Output" vendor-product-page template, no actual procedure | **Low — no rubric, no forced steps** | Confirms: score the file, not the repo |
| same repo (`ecommerce-marketing-strategy-builder`) | Forced single-round multiple-choice intake, cited 2025-26 benchmarks (Omnisend, Gartner, FirstPageSage), explicit estimate-flagging (⚠️) | Good — real procedure | Paid-channel-weighted (40% of budget to paid ads) and repeat-purchase-weighted; needs re-weighting for Aevia's organic/one-shot model |
| `refoundai/lenny-skills` (`brand-storytelling`, `positioning-messaging`) | Named-expert technique compilations (Andy Raskin, April Dunford, Bob Moesta, etc.) with questions + common-mistakes + deep-dive reference | High | Framed for startup pitch/investor narrative and B2B sales pipeline in quotes/examples; core techniques (movement-not-problem, "switching from," differentiation-requires-sacrifice) are universal |
| `kostja94/marketing-skills` (`strategies/brand/branding`) | Brand pillars, hero's-journey narrative arc, 12 brand archetypes (Coca-Cola, Chanel, Patagonia examples), positioning template, design-token table | High, genuinely consumer-brand-flavoured content | Sits inside a repo whose *ecosystem* (`homepage-generator`, `pages/marketing/pricing`, `domain-selection`) is built for SaaS marketing websites — usable standalone, loses cross-referenced siblings |
| same repo (`channels/partnerships/referral-program`) | Reward models, mechanism types, attribution windows, fraud prevention | Good, mechanically sound | **Explicitly scoped "for AI/SaaS products"** in its own description; benchmarks (CAC/LTV lift) are SaaS-sourced |
| `gtmagents/gtm-agents` (`storytelling`) | 34-line generic SCAR-framework template, "coaching SDRs" | **Low** | Confirms: this and `kostja94` are the two largest repos surfaced (100+ skills each) but are enterprise-B2B/agency GTM catalogues (`abm-orchestration`, `pql-framework`, `b2b-saas` plugin) — wrong end of the spectrum entirely |
| `bergside/awesome-design-skills` | "luxury"/"premium"/"storytelling" skillIds indexed by skills.sh are **README section headings in a links list**, not installable `SKILL.md` files | N/A | Not a skill pack — a curated-links resource (relevant to Sub-Q2, not itself a candidate) |

### Negative/empty findings (reported plainly)
- **No repo surfaced by any of the 31 queries is built for occasion/gift-purchase psychology** (rubric item 2) — nothing named or structured around gifting, one-shot purchase behaviour, or seasonal/occasion timing.
- **No repo is explicitly founder-operated-framed** (rubric item 5) as distinct from agency-serving-clients or enterprise-PM framing.
- `finsilabs/awesome-ecommerce-skills`'s `gift-cards` skill (checked directly, low install count 125) is a **technical implementation guide** for gift-card balance tracking on Shopify/WooCommerce/BigCommerce — not gift-purchase marketing psychology at all. Confirms the gap rather than filling it.

---

## Sub-question 2: beyond the registry

### Method
Web search for "awesome claude skills" lists, SKILL.md marketing/ecommerce/brand repos, and the official `anthropics/skills` catalogue (checked exhaustively via file-tree, not sampled).

### Findings

**`anthropics/skills` official repo — exhaustive check.** Full skill list: `algorithmic-art, brand-guidelines, canvas-design, doc-coauthoring, docx, frontend-design, internal-comms, mcp-builder, pdf, pptx, skill-creator, slack-gif-creator, theme-factory, web-artifacts-builder, webapp-testing, xlsx`. **Confirmed negative: no marketing-strategy skill exists in Anthropic's official repo beyond `brand-guidelines`** (already established as a visual-identity applicator, not strategy).

**`ComposioHQ/awesome-claude-skills`** (curated list, checked directly — note: lives on the `master` branch, not `main`) — Business & Marketing section is dominated by **tool-automation skills** (Klaviyo, Mailchimp, Shopify, Stripe, Brevo automation — API wrappers, not strategy craft). One new lead: **`rampstackco/claude-skills`** ("Brand Build Skills," 59 skills, "full website lifecycle: brand, design, content, SEO, dev, ops, growth, research").

**`rampstackco/claude-skills` — new find, read directly.** `brand-discovery` is the **single best skill found in this entire research**:
- Forces four discovery dimensions (audience, competitors, category, positioning territory) before any creative work
- Explicitly frames competitors in three layers — **direct, indirect, and "status quo" (doing nothing / doing it manually)** — and calls the status-quo layer "most often forgotten and most often the actual competitor." This is exactly Aevia's situation: the real alternative to an Aevia book is a phone camera roll, not a rival photo-book brand.
- Audience layer explicitly includes "life stage" as a demographic axis — maps directly onto Aevia's occasion triggers (newborn, wedding, travel) without any translation needed
- Real forced procedure (required inputs, sources per dimension, output spec), one throwaway SaaS-flavoured example ("another SaaS in the category") easily swapped
- Sits inside a 59-skill repo whose *other* skills (`onboarding-wizard-design`, `funnel-flow-architecture`, `feature-flagging`, `multi-step-form-design`) confirm the surrounding pack is a **SaaS/web-product build system** — same "good skill, wrong neighbourhood" pattern as `kostja94`. Adopt this one skill standalone; do not adopt the pack.
- License: MIT, repo dated 2026, single-maintainer (RampStack Co.) — not independently verified for update cadence beyond the file's presence.

**`thatrebeccarae/claude-marketing`** ("full marketing department," Klaviyo/Shopify/GA4/Looker Studio tool packs) — read `brand-dna`, `icp-research`, `pricing-strategy`, `market-research`:
- `brand-dna`: reverse-engineers an *existing* website's brand identity (colours, fonts, voice-axis scoring, target audience) via WebFetch — genuinely useful for **competitor teardown** (Aevia's product page was itself inspired by Artifact Uprising's PDP per project memory; this skill could formalise that kind of benchmarking). Real forced procedure, good craft. Framed for agency-serving-clients ("brand profile for my client's website") — mechanism is reusable regardless.
- `pricing-strategy`: same SaaS-tier apparatus as Haines's `pricing` (per-seat/usage/freemium value metrics, Good/Better/Best tiers) — but *also* the same Van Westendorp method, independently corroborating it as a genuinely portable technique.
- `icp-research`: B2B persona template throughout (job title, seniority, department, budget-approver/RFP buying process) — same located skew as Haines's `customer-research`.
- `market-research`: generates **50+ page McKinsey/BCG/Gartner-style consulting reports** (Porter's Five Forces, PESTLE, TAM/SAM/SOM). Real frameworks, but **wrong altitude entirely** for a 2-person founder team with zero data — this is enterprise-consulting theatre, the opposite failure mode from Haines's SaaS skew (rubric item 4 penalty: no "cheap experiment" discipline, all heavyweight formal analysis).

**`noique/cross-border-ecommerce-skills`** — despite the promising name, its "brand-strategy" folder contains exactly one skill (`serp-content-teardown`, an SEO content-gap tool); the repo's real content is outbound B2B lead-gen tooling (LinkedIn/WhatsApp prospecting) for cross-border wholesale/export sellers — not a consumer DTC brand-strategy pack. Confirmed low fit.

### Negative findings
- No pack found anywhere (registry or web) treats gift/occasion psychology as a first-class topic.
- No pack found is scaled for a 2-person founder team specifically — packs cluster at either SaaS-founder scale (Haines, kostja94) or enterprise-consulting scale (Rebecca's `market-research`, gtmagents).

---

## Sub-question 3: Haines pack re-score — located, not asserted

Read all eight specified skills directly from `github.com/coreyhaines31/marketingskills/tree/main/skills/` (MIT-licensed, Corey Haines, 2025; skills.sh shows heavy install counts — traction, not a quality proxy per the method rule).

| Skill | Core method — transferable? | Where the SaaS/B2B assumption actually lives (located, verbatim) | Fit verdict |
|---|---|---|---|
| **marketing-council** | Yes, almost entirely | None found. The 12-advisor bench (Godin, Ogilvy, Schwartz, Hopkins, Halbert, Brunson, Hormozi, Dunford, Sutherland, Sharp, Handley, Vaynerchuk) is classic direct-response/brand advertising, largely pre-dating or business-model-agnostic to SaaS. Forced-dissent rule, grounding/no-fabricated-quotes rules, disagreement-map structure are all universal | **Adopt as-is.** Matches the folder-instructions.md "Critique" job (strongest counter-argument, not politest) almost exactly |
| **product-marketing** (context-file skill) | Yes, as a *pattern* | Section 3 "Personas (B2B only)" is self-aware and skippable; Competitive Landscape example is "Calendly vs SavvyCal" (swap trivially); **JTBD Four Forces (Push/Pull/Habit/Anxiety)** is fully generic and maps cleanly onto Aevia (Push: photos stuck on a phone; Pull: premium print quality; Habit: inertia of doing nothing; Anxiety: cost/effort of curating) | **Adopt the file-as-shared-context architecture** — converges with Aevia's own `folder-instructions.md` design (product-marketing.md read by every skill) |
| **copywriting** | Yes, mostly | Page-Specific Guidance section is entirely SaaS website page types (Homepage/Landing/Pricing/Feature/About — no Product Page); strongest-CTA example is literally "Start Free Trial" | **Adopt with light edits**: swap the free-trial CTA example and add a Product Page section; the core principles (clarity>cleverness, benefits>features, customer language, headline formulas) are stop-slop-adjacent and directly usable |
| **content-strategy** | Yes, mostly | One example header explicitly reads "How We Got Our First $5k MRR" (SaaS-founder meta-content example) | **Adopt**: searchable/shareable framework and use-case content formula ("[persona] + [use-case]") map directly to occasion content ("photo book for new parents") |
| **referrals** | Partially — mechanics yes, benchmarks no | "in-app referral prompts," triggers keyed to "renewing or upgrading," metrics are LTV/CAC/**churn**-based (churn is meaningless for a one-shot purchase); tool integrations are explicitly SaaS-affiliate (Rewardful "Stripe-native," Tolt "SaaS affiliate programs," PartnerStack "Enterprise") | **Adopt the referral-loop/trigger-moment mechanics, discard the metrics and tool list** — directly relevant since Aevia already runs a Stripe-based referral programme (S115); re-key triggers to "after unboxing/receiving the book" |
| **pricing** | Partially — research methods yes, everything else no | Opens with **"You are an expert in SaaS pricing and monetization strategy."** Every element after is subscription apparatus: value-metric table is 100% recurring (per-seat/usage/feature/transaction), Good-Better-Best tiers, ARPU/churn/conversion signals for raising prices, "annual vs monthly" toggle, "grandfather existing" price-increase strategy (meaningless without a recurring price to grandfather) | **Adopt only the Van Westendorp method and general pricing-psychology section (anchoring, decoy effect, charm/round pricing)** — corroborated as portable by an independent second source (`thatrebeccarae/claude-marketing`'s `pricing-strategy`, same method, different author). Discard everything tier/subscription-shaped |
| **customer-research** | Partially — synthesis method yes, templates no | Persona template fields are unambiguous B2B SaaS: `"Title range: Marketing Manager to VP of Marketing"`, `"Company size: 50–500 employees, Series A–C SaaS"`, `"Reports to"`, `"How it makes them look to their boss/team"`. Source-tier table lists "B2B SaaS / technical buyers" first (G2/Capterra, Hacker News, Indie Hackers); the B2C row exists but is thin (app-store reviews, hobby subreddits) and doesn't cover occasion-gift-specific communities (parenting forums, wedding-planning communities, Pinterest) | **Adopt the confidence-scoring rubric (High/Medium/Low with named criteria), the "no reviews yet" proxy-source-walking method (own differentiator → competitor reviews → adjacent-marketplace reviews → adjacent-brand audiences), and the minimum-viable-sample rule.** These are the single most valuable pieces found for Aevia's actual zero-data situation (rubric item 4) and need zero translation. **Discard the persona template and source-tier table wholesale** — author a replacement keyed to occasion/relationship-to-recipient instead of job title/company size |
| **social** | Yes, mostly | Content Pillars example is explicitly headed **"Example for a SaaS Founder"** (Industry insights/Behind-the-scenes/Educational/Personal/Promotional split) | **Adopt**: hook formulas, repurposing system, and platform table are universal — Instagram row ("Visual brands, lifestyle") is Aevia's best-fit channel already. Only the example pillar mix needs replacing with an occasion/craft/behind-the-scenes split |

**Overall re-score conclusion:** the brief's premise — that the pack is "heavily SaaS-skewed" — is correct as a description of `pricing` and `customer-research` specifically, and wrong as a blanket description of the pack. Four of eight re-scored skills (`marketing-council`, `product-marketing`, `copywriting`, `content-strategy`) are near business-model-agnostic and adoptable with minimal edits. The other four (`referrals`, `pricing`, `social`, and partially `customer-research`) mix a genuinely portable *method* with a genuinely locked *template/benchmark* layer — the fix in each case is to keep the method, discard the template, and rebuild the template around Aevia's actual buyer.

---

## Rubric scoring table (all shortlisted candidates, 0–2 per item, files read only)

Rubric: **1** premium physical/DTC (not SaaS/B2B) · **2** occasion/gift, one-shot buyer (not retention) · **3** brand positioning + organic/content-led · **4** zero-data discipline (assumptions, cheap tests, benchmarks) · **5** founder-operated (not agency-for-clients) · **6** craft (real procedure vs listicle)

| Skill (repo) | 1 | 2 | 3 | 4 | 5 | 6 | Total /12 | License / updated / author |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---|
| marketing-council (Haines) | 2 | 1 | 2 | 1 | 2 | 2 | **10** | MIT · Corey Haines, active repo |
| brand-discovery (rampstackco) | 2 | 1 | 2 | 2 | 1 | 2 | **10** | MIT · 2026 · RampStack Co. |
| brand-review (anthropics/kwp) | 2 | 0 | 2 | 1 | 1 | 2 | **8** | Official Anthropic repo |
| product-marketing context (Haines) | 1 | 1 | 2 | 1 | 2 | 2 | **9** | MIT · Corey Haines |
| copywriting (Haines) | 1 | 0 | 2 | 1 | 2 | 2 | **8** | MIT · Corey Haines |
| content-strategy (Haines) | 1 | 0 | 2 | 1 | 2 | 2 | **8** | MIT · Corey Haines |
| customer-research (Haines) — method only | 1 | 0 | 1 | 2 | 1 | 2 | **7** | MIT · Corey Haines |
| social (Haines) | 1 | 0 | 2 | 1 | 1 | 2 | **7** | MIT · Corey Haines |
| brand-voice-enforcement (anthropics/kwp) | 1 | 0 | 2 | 0 | 1 | 2 | **6** | Official Anthropic repo |
| d2c-marketing (arnabbagxd) | 2 | 0 | 1 | 1 | 1 | 2 | **7** | MIT · 2026 |
| brand-dna (thatrebeccarae) | 1 | 0 | 1 | 1 | 0 | 2 | **5** | MIT · updated 2026-03 · Rebecca Rae Barton |
| referrals (Haines) — mechanics only | 1 | 0 | 1 | 1 | 2 | 2 | **7** | MIT · Corey Haines |
| pricing (Haines) — research methods only | 0 | 0 | 0 | 2 | 2 | 2 | **6** | MIT · Corey Haines |
| branding (kostja94) | 1 | 0 | 2 | 0 | 1 | 2 | **6** | MIT · kostja94 |
| ecommerce-marketing-strategy-builder (nexscope-ai) | 1 | 0 | 1 | 1 | 1 | 1 | **5** | not verified |
| brand-guidelines (anthropics official) | 0 | 0 | 0 | 0 | 2 | 0 | **2** | Official Anthropic repo (visual template, not strategy) |
| customer-research (anthropics/kwp support skill) | 0 | 0 | 0 | 0 | 0 | 2 | **2** | Official Anthropic repo (wrong job entirely) |
| market-research (thatrebeccarae) | 0 | 0 | 0 | 0 | 0 | 1 | **1** | MIT (real frameworks, wrong altitude) |
| storytelling (gtmagents) | 0 | 0 | 1 | 0 | 0 | 0 | **1** | not verified |
| etsy-pricing-strategy (nexscope-ai) | 1 | 0 | 0 | 0 | 0 | 0 | **1** | not verified (vendor shell) |

*Scores reflect the file as written, not a hypothetical adapted version — several rows (customer-research, referrals, pricing) score low on rubric items 1/2 precisely because the template layer needs replacing, which is the point of Sub-question 3's granular treatment above.*

---

## Sub-question 4: the gap map — what to adopt vs author

| Rubric job | Good existing skill? | Verdict |
|---|---|---|
| **1. Premium physical/DTC brand strategy** | Partial — `d2c-marketing` (arnabbagxd) is the closest, but built around consumable/subscription retention | **Adapt**, not adopt whole. Rewrite the retention/repeat-purchase section around Aevia's actual repeat vector (repeat-occasion + referral, not subscription) |
| **2. Occasion/gift purchase psychology, one-shot buyers** | **None found anywhere** in 121 registry repos + wider web search | **Author from scratch.** This is the clearest, most confirmed gap in the whole research |
| **3. Brand positioning + organic/content-led acquisition** | Strong — `marketing-council`, `brand-review`, `brand-discovery`, `content-strategy`, `positioning-messaging` (Lenny) all genuinely good | **Adopt**, combine `brand-discovery`'s upstream research with `marketing-council` for stress-testing decisions and `content-strategy`/`social` for execution |
| **4. Zero-data discipline: assumptions, cheap tests, benchmarks** | Strong pieces, no single skill — Haines `customer-research`'s confidence-scoring + proxy-research method is the best found; Van Westendorp pricing research corroborated by two independent sources | **Adopt the pieces, author the glue.** Aevia's own `assumptions.md` ledger convention (confidence/cost-if-wrong/cheapest-test) already exists per `folder-instructions.md` — the missing piece is a skill that *enforces* logging every claim into that ledger the way `brand-voice-enforcement` enforces guideline lookup. Worth authoring as a thin "assumptions-ledger" skill |
| **5. Founder-operated framing (not agency-for-clients)** | Weak across the board — most packs default to "your client" language (`brand-dna`, `market-research`) even when the underlying method is fine | **No dedicated authoring needed** — this is a framing/prompt-level fix (swap "client" for "your own company" in adopted skills), not a missing capability |
| **6. Craft quality (real procedure, forced steps)** | This is a filter applied throughout, not a job to fill | N/A — used to disqualify `etsy-pricing-strategy`, `storytelling` (gtmagents), and to flag `market-research` (thatrebeccarae) as wrong-altitude despite good craft |

### Authoring list (confirmed gaps, in priority order)
1. **Occasion/gift-purchase psychology skill** — messaging and channel timing keyed to life-stage triggers (newborn, wedding, travel), gifting-for-someone-else vs. buying-for-self decision psychology, seasonal/occasion calendar planning. No existing skill anywhere covers this.
2. **Aevia customer-research persona template** — replace Haines's B2B job-title/company-size template with an occasion/relationship-to-recipient template, keeping Haines's confidence-scoring and zero-data proxy-research method as-is (this is a template swap inside an otherwise-adoptable skill, not a build-from-zero).
3. **Assumptions-ledger enforcement skill** (optional, small) — a thin wrapper that forces every recommendation through Aevia's own evidence/cost-cap/kill-criterion rule (already specified in `folder-instructions.md`) the way `brand-voice-enforcement` forces guideline lookup before content generation.
4. **Aevia brand-guidelines applicator** (trivial) — clone Anthropic's own `brand-guidelines` skill structure with Aevia's actual colours/typography from `context/style-guide.md`; a same-day task, not real "research" gap.

---

## Sources

**Registry API sweep:**
- `https://skills.sh/api/search?q=<term>&limit=10` — 31 queries; raw output saved at `work/marketing-sparring-partner/sweep_raw.json`

**Files read in full (raw GitHub content, saved to `work/marketing-sparring-partner/fetched/`):**
- anthropics/skills: `skills/brand-guidelines/SKILL.md`
- anthropics/knowledge-work-plugins: `marketing/skills/brand-review/SKILL.md`, `partner-built/brand-voice/skills/brand-voice-enforcement/SKILL.md`, `customer-support/skills/customer-research/SKILL.md`, `marketing/skills/campaign-plan/SKILL.md`
- arnabbagxd/brand-building-skills: `skills/d2c-marketing/SKILL.md`
- nexscope-ai/ecommerce-skills: `etsy-pricing-strategy/SKILL.md`, `ecommerce-marketing-strategy-builder/SKILL.md`
- refoundai/lenny-skills: `skills/brand-storytelling/SKILL.md`, `skills/positioning-messaging/SKILL.md`
- kostja94/marketing-skills: `skills/strategies/brand/branding/SKILL.md`, `skills/channels/partnerships/referral-program/SKILL.md`
- gtmagents/gtm-agents: `plugins/content-marketing/skills/storytelling/SKILL.md`
- bergside/awesome-design-skills: `README.md`
- thatrebeccarae/claude-marketing: `skills/brand-dna/SKILL.md`, `skills/icp-research/SKILL.md`, `skills/pricing-strategy/SKILL.md`, `skills/market-research/SKILL.md`
- rampstackco/claude-skills: `skills/brand-discovery/SKILL.md`
- noique/cross-border-ecommerce-skills: `brand-strategy/serp-content-teardown/SKILL.md`
- SpillwaveSolutions/running-marketing-campaigns-agent-skill: `SKILL.md` (fetched, not separately scored — single-skill repo, generic campaign checklist, no rubric-differentiating content beyond what's in the campaign-plan/d2c-marketing entries above)
- finsilabs/awesome-ecommerce-skills: `skills/pricing-promotions/gift-cards/SKILL.md`
- coreyhaines31/marketingskills: `skills/marketing-council/SKILL.md`, `skills/customer-research/SKILL.md`, `skills/pricing/SKILL.md`, `skills/referrals/SKILL.md`, `skills/copywriting/SKILL.md`, `skills/product-marketing/SKILL.md`, `skills/content-strategy/SKILL.md`, `skills/social/SKILL.md`
- LICENSE files checked directly for: anthropics/knowledge-work-plugins, arnabbagxd/brand-building-skills, refoundai/lenny-skills, coreyhaines31/marketingskills, rampstackco/claude-skills, kostja94/marketing-skills, thatrebeccarae/claude-marketing (all confirmed MIT except the official Anthropic repos, which use Anthropic's own terms)

**Web search (for sub-question 2, results synthesised not independently re-verified beyond what's listed above as "read in full"):**
- ComposioHQ/awesome-claude-skills (README, `master` branch)
- Search results surfacing thatrebeccarae/claude-marketing, noique/cross-border-ecommerce-skills, CosmoBlk/email-marketing-bible (not read — low priority after triage), SpillwaveSolutions single-skill repo, rampstackco/claude-skills, phuryn/pm-skills and deanpeters/product-manager-skills (surfaced repeatedly, both PM/SaaS-audience-scored low in the registry sweep and not re-read here)

**File-tree discovery method:** unauthenticated GitHub REST Contents API hit its 60/hour rate limit partway through; worked around via `raw.githubusercontent.com` direct fetches (once paths were known) and jsdelivr's GitHub mirror (`data.jsdelivr.com/v1/packages/gh/<repo>@<branch>?structure=flat`) for path discovery. No coverage lost, logged here for transparency per method requirements.

## Gaps and honest limitations
- 121 distinct repos surfaced by the registry sweep; roughly 20 skills across 12 repos were read in full. The remainder were triaged by name/skillId only and are explicitly *not* scored anywhere in this report — per the method rule, absence from the scoring table means "not verified," not "rejected."
- `CosmoBlk/email-marketing-bible`, `phuryn/pm-skills`, `deanpeters/product-manager-skills`, and several other repeatedly-surfaced repos were deprioritised after their names/skillIds indicated B2B SaaS product-management framing (positioning-statement, pricing-strategy for PMs) consistent with what was already found and located in kostja94/gtmagents — this is a judgement call under time constraints, not an exhaustive read, and should be treated as lower-confidence than the rows in the scoring table.
- No skill pack was actually *installed and run* against a live Aevia scenario — all assessment is from reading SKILL.md content, which is what the brief asked for, but real behaviour (how Claude actually executes the skill against Aevia's product-marketing.md) is untested.
- License/update-cadence checks were surface-level (LICENSE file presence + type, frontmatter `updated` dates where present) — not a full legal or maintenance-health review.
