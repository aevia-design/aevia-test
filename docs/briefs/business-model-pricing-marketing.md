# Business Model — Pricing & Marketing (Concept)

_Shaping session, 2026-07-07 (S111). A grounded pass on pricing + go-to-market to replace the RWR-visa-era placeholders in the financial model. Working assumptions, not final decisions._

---

## What
A concept for how Aevia should price its book and model customer acquisition, moving from
top-down placeholders (€66–69 price, flat "10% of revenue" marketing) to a bottom-up model
grounded in unit economics, category CAC benchmarks, and a defined organic-content operation.

## Why
The earlier financial model was built for the RWR startup-founder visa, not for real operating
decisions. Two things were unresolved and coupled: (1) **pricing** — how far above commodity
DIY competitors (CEWE, Fotobuch.at ~€60/40pp) a premium done-for-you book can sit; (2)
**marketing** — a flat 10%-of-revenue line hides the real mechanics of paid acquisition and
makes the case look artificially healthy (flagged by the incubator's financial coach).

---

## How — the decisions and grounded numbers

### 1. Pricing: €89–99, leaning €95 "shipping included"
- **Stop benchmarking against CEWE.** CEWE/Fotobuch are DIY tools + commodity print; Aevia is
  a done-for-you designed object. "CEWE + 10–15%" (the €66–69 zone) is the **worst square**:
  too dear for the commodity shopper, too cheap to signal "designed art object," and it invites
  the exact comparison Aevia loses. The friends' price pushback came from a test that *allowed
  direct comparison* — it measured "do people prefer curated over generic?" (yes), not
  willingness-to-pay of the target buyer.
- **Reframe as a gift / occasion purchase** (newborn, anniversary, memorial, milestone) where
  price sensitivity drops and "I don't want to DIY this" is the pitch. At €90+ framed as a
  bespoke gift, the price reads as cheap, not aggressive.
- **Unit economics make this a demand question, not a cost one.** Variable cost ≈ **€15–16/book**
  (print €10.60 @ ~50 orders/mo · packaging €1.56 · Stripe ~€1.5–2 · artist royalty 2% · cloud
  ~€0). Template design (€600–1000) is a **one-time fixed cost**, not per-book.

  | Price | Variable cost | Gross profit | Margin |
  |------|------|------|------|
  | €66 | ~15.0 | €51 | 77% |
  | €90 | ~15.9 | €74 | 82% |
  | €95 | ~16.0 | €79 | 83% |
  | €99 | ~16.1 | €83 | 84% |

  The €23–28/book gap between €66 and €95 is ~pure profit at zero extra cost — and that margin
  is what funds customer acquisition. Under-pricing starves the marketing engine.
- **Open:** delivery — "customer pays separately" is fine operationally, but a visible shipping
  fee cheapens a premium checkout. Consider €95 with shipping included (absorb ~€5) for one
  clean number.

### 2. Marketing: model bottom-up from CAC, not % of revenue
Two engines that meet at the bottom, modelled **differently**:

```
   PAID (budget-driven, linear)        ORGANIC + REFERRAL (effort-driven, capped)
   Paid budget ÷ CAC → paid orders     assumption that RAMPS with content cadence
                       └──── Total orders → × price → revenue → × gross profit − spend
                             blended CAC = spend ÷ orders ;  LTV:CAC ≥ 3 target
```

- **Paid** = clean formula: `orders = budget ÷ CAC`. (CAC = CPC ÷ CVR as a cross-check.)
- **Organic** = do NOT model as budget-linear; set as a ramping absolute orders/month, sanity-
  checked against a follower funnel. It scales with time/effort and has a ceiling.
- **Referral** = model as **% of total orders** (all channels).

**Grounded assumptions (see Sources; note geography caveat):**
| Input | Estimate | Source basis |
|------|------|------|
| Price | €95 | this doc |
| Gross profit/book | ~€79 | unit economics above |
| CVR (visitor→purchase) | **2% base, 3% stretch** | global e-com 1.8–3% (SmartInsights) |
| Paid CAC | **€45–70** (conservative; US-skewed) | Meta 2025 CPA median $38, Baby $30, marked up for premium considered purchase (Triple Whale) |
| CPC (cross-check) | €0.90–1.30 | Meta e-com CPC ~$1.03; Instagram Feed $3.35 → visual brand leans IG = pricier |
| Referral share of orders | **3–5% yr0–1 → 8–10% mature** | DTC referral revenue share 5–10% median (Eightx/ReferralCandy) |
| Referral reward cost | €10–20/customer | e.g. $10+$10 (Artifact Uprising model) |
| Organic orders | **ramp 15–30/mo up** | set as assumption; funnel-check via IG engagement 2–6% small accounts |
| Repurchase (18mo) | **~20%** (owner gut; defensible) | retail repeat 20–35%; DTC "strong" ≥20–25% |
| LTV | ~€95 (at 20% repurchase) | €79 + 0.2×€79 |

**The make-or-break finding:**
- **Paid-only** premium photobook: LTV:CAC ≈ **1.6:1** → grind, capital-hungry, degrades as ad
  costs rise. *Avoid this version.*
- **Blended @ ~50% organic** (CAC ~€30): LTV:CAC ≈ **3.2:1** → healthy.
- Aevia's closest premium analog, **Artifact Uprising, was built on organic** — Instagram +
  Pinterest + UGC + $10/$10 referral, not paid. Validates the organic-led ("win on order one")
  strategy. The real question is not "can I afford €50 CAC?" but **"can we build the organic
  engine that keeps blended CAC near €30?"**

### 3. Content operation (the organic engine, day 0, no agency)
Xenia (marketing generalist, not a full-time SMM specialist) runs it with AI tooling.

**Division of labour:** human owns taste, story, relationships, final yes/no; AI owns production
and volume (caption drafts, upscaling/retouching, still→motion video, resizing, scheduling).
**Do NOT let AI fabricate fake lifestyle/people scenes** — that is where "AI slop" damages a
premium tactile brand. AI's job is to **multiply and polish REAL assets** (books, spreads,
studio flatlays, real customer moments). Anti-slop = editorial layouts (magazine not SaaS),
negative-constraint prompts, a 1-page brand design-system doc, real assets fed in, human review.

**Starter tool stack (~€30–70/mo entry):**
| Layer | Pick | ~€/mo |
|------|------|------|
| Hub: design/layout/scheduling (+Veo video) | Canva Pro | 12 |
| Editorial hero imagery | Midjourney Basic | 9 |
| Reels editing | CapCut (free→Pro) | 0–18 |
| Captions/copy | Claude/ChatGPT (already have) | 0 |
| Scheduling | Meta Business Suite | 0 |
| Video credit top-ups | Kling/Veo | 10–30 |
- Legally-safe imagery: **Adobe Firefly** (only tool with commercial indemnification) if needed.
- **Avoid Sora** — being discontinued (apps off Apr 2026, API Sept 2026).
- This €30–70/mo (rising to €100–150 as video scales) is the **content-cost line** in the
  organic channel. The bigger real cost is Xenia's *time*, not tools — split them in the model.

**Weekly loop (~4–6 hrs/wk once running):** monthly shoot → bank of 30–50 real assets → batch-
create 6–8 posts (polish + some motion + human-edited captions) → schedule → daily 15-min
engagement.

**First-months cadence (from a cold account) — qualitative goals, not sales:**
- **M0 setup:** brand design-system doc; one shoot; 5–6 grid-setting posts before going public; tools.
- **M1 establish:** 3 feed posts/wk + Stories; find rhythm; expect ~zero reach (calibrating).
- **M2 motion:** +1 Reel/wk; start Pinterest (search-driven, premium content performs); quietly begin referral.
- **M3 read & double down:** watch saves/shares not likes; kill weak pillar; only now a small
  €200–300 paid boost behind the best organic post — to **measure real Austrian CAC** before committing budget.

---

## Boundaries (what this is NOT)
- Not a finished financial model — inputs to rebuild one bottom-up.
- Not a committed price — €95 is a working assumption pending a real target-buyer WTP signal.
- Not an agency plan — explicitly build-it-yourself with Xenia + AI for year 0–1.
- CAC numbers are **US/global-skewed**, not Austrian — treat €45–70 as a conservative band.

## Open questions
1. **DACH/Austria-specific CAC** — not yet sourced; Austrian ad costs likely below US. Pull before locking.
2. **Repurchase validation** — 20% is a gut number; the single biggest LTV swing. Validate with real data as orders accrue.
3. **Can we actually build the organic engine?** — the whole model hinges on it. Cheap to test
   (M0–M3 above) before committing capital.
4. **Willingness-to-pay** from the *right* sample (target buyers, not friends) — de-risk €90 vs €99.
5. **AOV levers** — add-ons/extra pages/bundles to lift first-order profit and CAC payback.
6. **Delivery fee** (still TBD, also blocks dispatch/checkout) — and the shipping-included pricing call.

## Sources
Meta Ads benchmarks 2025 (Triple Whale); e-com CAC (Userpilot, Shopify); Meta CPC (Superads,
WordStream); e-com CVR (SmartInsights, Convertibles); referral share (Eightx, ReferralCandy,
Rivo); repeat-purchase (ATTN Agency); photo-book market/retention (Dataintelo); Artifact Uprising
(Later case study); AI tools (LumiChats, Tech-Insider, Canva/Adobe/CapCut pricing pages, Apaya,
CreatorFlow); anti-slop (WRITER, HeyOrca, MindStudio). Full URLs in S111 session log.
