# Business Model — Pricing & Marketing (Concept)

_Shaping session, 2026-07-07 (S111). A grounded pass on go-to-market to replace the RWR-visa-era placeholders in the financial model. Working assumptions, not final decisions._

> **Revised S148 (2026-07-31).** Price is now treated as an **output of the business case, not an
> input to this brief.** The earlier €89–99 / €95 recommendation and its margin table are
> **superseded and removed** — they silently assumed a price and made the CAC maths look healthy.
> This brief now holds only the researched CAC/acquisition mechanics; the **business-case skeleton
> in §4** solves for the minimum viable price from cost + CAC + target LTV:CAC + VAT. Owner will
> build the live model in Excel. Live shipped price today is €70/€100 (`assets/js/prices.js`), also
> not firm — it is an input to revisit, not a fact this brief asserts.

---

## What
A concept for how Aevia should model customer acquisition — moving from a flat "10% of revenue"
marketing placeholder to a bottom-up model grounded in unit economics, category CAC benchmarks,
and a defined organic-content operation — and a skeleton that lets **price fall out of** those
numbers rather than being assumed up front.

## Why
The earlier financial model was built for the RWR startup-founder visa, not for real operating
decisions. The **marketing** line — a flat 10%-of-revenue assumption — hid the real mechanics of
paid acquisition and made the case look artificially healthy (flagged by the incubator's financial
coach). **Pricing** was previously guessed here; it belongs in the business case as a solved
result, because the viable price depends on CAC, repurchase, VAT and cost — none of which were
settled when a price was first written down.

---

## How — the decisions and grounded numbers

### 1. Positioning (not price)
_Price itself is solved in §4. What stays here is the market-positioning judgement, which is
independent of the exact number:_
- **Stop benchmarking against CEWE.** CEWE/Fotobuch are DIY tools + commodity print; Aevia is
  a done-for-you designed object. Sitting just above them ("CEWE + 10–15%") is the **worst square**:
  too dear for the commodity shopper, too cheap to signal "designed art object," and it invites
  the exact comparison Aevia loses.
- **Reframe as a gift / occasion purchase** (newborn, anniversary, memorial, milestone) where
  price sensitivity drops and "I don't want to DIY this" is the pitch. Framed as a bespoke gift,
  a higher price reads as cheap, not aggressive.
- **The friends' price pushback is weak evidence** — it came from a test that *allowed direct
  comparison* to a generic book, so it measured "curated vs generic?" (yes), not the target
  buyer's willingness to pay. Don't let it anchor the price low.
- **Under-pricing starves the marketing engine.** Every euro of gross profit is what funds CAC;
  the whole point of §4 is to find the price where that engine can actually run. This is a demand
  question, not a cost one — cost only sets the floor.

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
| CVR (visitor→purchase) | **2% base, 3% stretch** | global e-com 1.8–3% (SmartInsights) |
| Paid CAC | **€45–70** (conservative; US-skewed) | Meta 2025 CPA median $38, Baby $30, marked up for premium considered purchase (Triple Whale) |
| CPC (cross-check) | €0.90–1.30 | Meta e-com CPC ~$1.03; Instagram Feed $3.35 → visual brand leans IG = pricier |
| Referral share of orders | **3–5% yr0–1 → 8–10% mature** | DTC referral revenue share 5–10% median (Eightx/ReferralCandy) |
| Referral reward cost | €10–20/customer | e.g. $10+$10 (Artifact Uprising model) |
| Organic orders | **ramp 15–30/mo up** | set as assumption; funnel-check via IG engagement 2–6% small accounts |
| Repurchase (18mo) | **~20%** (owner gut; defensible) | retail repeat 20–35%; DTC "strong" ≥20–25% |

**The make-or-break finding (direction, not fixed numbers):**
_The ratios below were originally computed at the withdrawn €95 price; treat them as **directional**
— the live LTV:CAC comes out of the §4 solver at whatever price and margin you actually set. What
survives price changes is the **ordering**: blended beats paid, and the gap is large._
- **Paid-only** premium photobook: CAC is high relative to first-order margin → grind,
  capital-hungry, degrades as ad costs rise. *Avoid this version.*
- **Blended @ ~50% organic** pulls blended CAC toward ~€30, which is where the economics turn
  healthy — provided the price supports it.
- Aevia's closest premium analog, **Artifact Uprising, was built on organic** — Instagram +
  Pinterest + UGC + $10/$10 referral, not paid. Validates the organic-led ("win on order one")
  strategy. The real question is not "can I afford €50 CAC?" but **"can we build the organic
  engine that keeps blended CAC near €30?"** — and §4 tells you what price that demands.

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

### 4. Business-case skeleton (marketing → price solver)

_A structure to build in Excel. Price is **solved**, not typed in. Two directions: the **forward**
model checks a candidate price; the **inverse** model returns the minimum price a target LTV:CAC
demands. All money is **net of VAT** unless a row says "gross (incl. VAT)". Fill the yellow inputs;
everything else is a formula. Bands from §2/§3 are starting defaults, not truth — replace as you
get real Austrian data._

**Block A — Inputs (the only cells you edit)**

| # | Input | Default | Unit | Notes |
|---|---|---|---|---|
| A1 | VAT rate | 20% | % | 10% if the book rate applies — Steuerberater to confirm. Swings everything. |
| A2 | Print cost / book | 8.47 | € net | Printsmarter 40pp; drops toward €6–8 at Elanders volume. Sub in per scenario. |
| A3 | Handling + packaging / order | 2.34 | € net | Printsmarter "incl. packaging". |
| A4 | Add-ons / order (sticker+flyer) | 0.40 | € net | €0.20 × 2. |
| A5 | Stripe % | 1.5% | % of gross | On the gross amount collected. Confirm your real EU-card rate. |
| A6 | Stripe fixed / order | 0.25 | € | Per-transaction fixed fee. |
| A7 | Artist royalty | 2% | % of net rev | Per §1 unit economics. |
| A8 | Repurchase rate (18mo) | 20% | % | Biggest LTV lever. Owner gut — validate with real data. |
| A9 | Target LTV:CAC | 3.0 | ratio | The health bar. Inverse model solves to hit exactly this. |
| A10 | Paid CAC | 55 | € | Mid of €45–70 band. Austrian number still unsourced. |
| A11 | Paid budget / month | 1000 | € | Scenario input. |
| A12 | Organic orders / month | 20 | orders | Ramp assumption (§2: 15–30). Effort-capped, not budget-linear. |
| A13 | Referral share of orders | 4% | % of total | §2: 3–5% yr0–1. |
| A14 | Referral reward / referred order | 15 | € | §2: €10–20. |
| A15 | Content tools / month | 50 | € | §3: €30–70 early. |
| A16 | Xenia time / month | _tbd_ | € | Optional. Model as a separate line — don't bury it in CAC. |

**Block B — Channel model → blended CAC** (formulas)

| # | Line | Formula |
|---|---|---|
| B1 | Paid orders/mo | `A11 / A10` |
| B2 | Referral orders/mo | `A13 × B4` (uses total below — see note) |
| B3 | Organic orders/mo | `A12` |
| B4 | **Total orders/mo** | `(B1 + B3) / (1 − A13)` |
| B5 | Referral orders/mo | `A13 × B4` |
| B6 | Acquisition spend/mo | `A11 + (A14 × B5) + A15` (add `A16` if counting time) |
| B7 | **Blended CAC** | `B6 / B4` |

_Note: referral is a % of **total** orders, which makes it circular; B4 resolves it algebraically
(total = (paid+organic)/(1−referral share)). In Excel, use B4's closed form — don't loop._

**Block C — Cost & margin per book** (given a gross price `P`)

| # | Line | Formula |
|---|---|---|
| C1 | Net revenue | `P / (1 + A1)` |
| C2 | Variable cost | `A2 + A3 + A4 + (A5 × P) + A6 + (A7 × C1)` |
| C3 | **Gross profit / book** | `C1 − C2` |
| C4 | **LTV** | `C3 × (1 + A8)` |
| C5 | **LTV:CAC** | `C4 / B7` |

**Block D — The two solve modes**

- **Forward (check a price):** type a candidate gross price into `P`, read C5. Green if `≥ A9`.
- **Inverse (solve for price):** set the target and let Excel return the minimum gross price.
  Closed form (no circularity, since Stripe % and royalty are linear in `P`):

  ```
  required_gross_profit = A9 × B7 / (1 + A8)
  required_price (gross, incl VAT) =
      ( required_gross_profit + A2 + A3 + A4 + A6 )
      ────────────────────────────────────────────
              ( (1 − A7) / (1 + A1)  −  A5 )
  ```

  That price is the **floor** the economics demand at the current CAC. Then sense-check it against
  willingness-to-pay: if the floor sits above what the target buyer will pay, the fix is **lower
  CAC** (more organic) or **higher repurchase**, not a lower price.

**How to read it:** the model turns "what price?" into "at this CAC and repurchase, the price must
be at least €X to clear LTV:CAC = 3." Change A10/A12/A13 (the organic mix) and watch the required
price fall — that visual *is* the argument for the organic engine.

---

## Boundaries (what this is NOT)
- Not a finished financial model — the §4 skeleton is a structure to build in Excel, not the model.
- **Asserts no price.** Price is an output of the business case (§4). The live €70/€100 is an
  input to revisit, not a recommendation this brief makes.
- Not an agency plan — explicitly build-it-yourself with Xenia + AI for year 0–1.
- CAC numbers are **US/global-skewed**, not Austrian — treat €45–70 as a conservative band.

## Open questions
1. **DACH/Austria-specific CAC** — not yet sourced; Austrian ad costs likely below US. Pull before locking.
2. **Repurchase validation** — 20% is a gut number; the single biggest LTV swing. Validate with real data as orders accrue.
3. **Can we actually build the organic engine?** — the whole model hinges on it. Cheap to test
   (M0–M3 above) before committing capital.
4. **Willingness-to-pay** from the *right* sample (target buyers, not friends) — this is the ceiling
   the §4 price-floor must sit under. Without it, the solver gives a floor but not a chosen price.
5. **AOV levers** — add-ons/extra pages/bundles to lift first-order profit and CAC payback.
6. **Delivery fee** (still TBD, also blocks dispatch/checkout) — and the shipping-included pricing call.

## Sources
Meta Ads benchmarks 2025 (Triple Whale); e-com CAC (Userpilot, Shopify); Meta CPC (Superads,
WordStream); e-com CVR (SmartInsights, Convertibles); referral share (Eightx, ReferralCandy,
Rivo); repeat-purchase (ATTN Agency); photo-book market/retention (Dataintelo); Artifact Uprising
(Later case study); AI tools (LumiChats, Tech-Insider, Canva/Adobe/CapCut pricing pages, Apaya,
CreatorFlow); anti-slop (WRITER, HeyOrca, MindStudio). Full URLs in S111 session log.
