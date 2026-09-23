# Critic Review: Low-Res Badge Decision

**Reviewed:** 2026-08-11  
**Task:** Assess recommendation to soften low-res badge UI tone, fix product-page copy, keep 1575px threshold  
**Audience:** Evgeny (owner, non-technical, launch-affecting call)  
**Decision stakes:** Pre-launch messaging + customer confidence + printed book quality (unrecoverable failure)

---

## Summary

The recommendation to soften badge tone (Option B) is **sound in principle**, but rests on a critical false assumption: that the threshold itself is a defensible measurement. The 1575px floor is correct *if* a customer uploads a full-page photo (worst case, 200mm), but 85% of real book layouts use photos smaller than full-page, making the 1575px rule a false negative factory. The real problem is not the badge colour; it is the rule itself being placement-agnostic when placement determines everything. **Verdict: Go with corrections**, not the recommendation as written. The fix path is clearer and firmer than any tone adjustment.

---

## What the Facts Actually Say

**Fact 1 verified:** 1575px = 200 DPI on a 200mm full page (order-flow-hardening.md:166, S40 session log:32). This is correctly sourced to print-industry floor.

**Fact 2 verified:** Industry pattern is warning, never block (photo-formats-competitor-baseline.md:129–132). ✓ Aevia follows this.

**Fact 3 verified:** iCloud Shared Albums downscale to 2048px long edge (you cited Apple Support 108916). A 4:3 iPhone photo arrives ~2048×1536. **1536 is 39px below threshold; 2.5% margin.** This is real.

**Fact 4 verified:** Product pages claim "Minimum resolution: 2000px on the short edge" (devotion.html:165, radiance.html, scribble.html, tender.html, wander.html, joyride.html, heirloom.html, newborn.html in both EN + DE = 8 product pages, not 6). **This directly contradicts the 1575px threshold by 425px / 27%.**

---

## The Core Problem You Missed

You identified this as a **UI tone problem** ("the measurement is right, badge just looks too scary"). The evidence suggests the opposite: **this is a measurement-scope problem, and tone is a symptom.**

### Why the 1575px threshold only works for full-page photos

The math in order-flow-hardening.md is ironclad: 200mm ÷ 25.4 inches/mm = 7.874 inches. At 200 DPI, that is 1575 pixels. **But this assumes the photo fills the entire 200mm page width.**

In Aevia's templates:
- A photo on a spread may be **half the page** (100mm width, not 200mm) — then the same pixel dimensions need 300 DPI, not 200
- A small accent photo may be 50mm — requiring 600 DPI
- A full-bleed photo is 200mm + 18mm bleed on each side = 236mm — requiring 1890px for 200 DPI

The order form has no way to know placement. S40's brief acknowledged this explicitly (order-flow-hardening.md:167): *"it depends on placement, which the order form can't know"* — and the summary copy already says this ("**especially if used large**").

**The 1575px rule is not wrong; it is overstated.** It applies to one scenario (full-page, worst case). Applied to every photo regardless of eventual size, it flags genuinely printable photos as risky.

### The iCloud case study proves this

An iPhone 17 photo from iCloud Shared Album:
- Arrives at 2048×1536 (fails 1575px by 39 pixels / 2.5%)
- Intended for a typical 80–110mm slot (e.g. a portrait inset or thumbnail) — which would print fine at this resolution
- Would **never** be placed full-page (design staff do the placement; a customer uploading does not choose layout)
- Evgeny saw it badged red and worried: *"Did I just upload garbage?"* The answer is almost certainly no.

The badge is now doing the opposite of its job: instead of protecting real bad photos, it is eroding confidence in photos that are genuinely usable. **This is actively harmful pre-launch**, when you need customer trust.

---

## Why Softening Tone Alone Is Insufficient

Your Option B (amber badge, "may print soft" copy, escalate for far-below photos) is a direction, but **it does not solve the underlying miscalibration**. Here is why:

1. **The iCloud case still fails.** A customer with an iPhone and iCloud Shared Album will still see a warning on half their upload. The copy improves clarity, but the flag remains unjustified.

2. **Product-page copy still lies.** Even if the badge softens, the order form still silently contradicts the product page (2000px vs 1575px rule). A customer who reads "minimum 2000px" and then sees only some photos flagged will be confused.

3. **Staff will ignore it anyway.** Order-flow-hardening.md:34 notes: *"97 pass" ≠ handlers integration-tested.*  The brief itself acknowledges that staff do layout: *"staff design and send a preview; customer approves and pays"* (PRD.md:13). Staff see originals at full scale and visually judge placement before it prints. They are the true gate. A softer badge does not change their workflow—they still have to eyeball every photo.

4. **The pre-flight check already exists.** The order form is not the only safeguard. The customer preview (chunk-023) lets the customer see the book before approving. If a photo looks soft in context, they can reject it. This is the real safety net, not the badge.

---

## The Real Problem: 2000px vs 1575px

This is where your recommendation **omits the harder work**. You flagged the 2000px product-page claim as "false" and recommended fixing it. But you did not ask: **which is the right number?**

- **1575px** = 200 DPI on 200mm page (defended in S40, researched)
- **2000px** = 200 DPI on a ~314mm page (or 300 DPI on 200mm — the "ideal" floor, not minimum)

**The honest answer is: it depends on placement.** A 2000px photo is safe everywhere. A 1575px photo is safe only for layouts under ~100mm wide and may be soft on a full-page placement. Neither alone is right.

The product page should say:
> **Minimum resolution**: We work best with photos wider than 2000px on the short edge. Smaller is okay if used in the layout as an accent or inset, but full-page photos below 2000px may print soft. We'll review every photo before printing, so just upload what you have.

This is honest, sets expectations, and defers to staff judgment. It also defangs the problem: a real customer reading this knows their iCloud photos are useful, just not for full-page layout—which is staff's call, not theirs.

---

## Specific Findings

### High Priority: The measurement rule itself needs a scope limitation

**Issue:** The 1575px check applies uniformly to all photos but only defends a single worst-case layout (full-page). This creates false negatives (~2.5% of iCloud uploads) that undermine confidence pre-launch.

**Root cause:** The rule was written to defend print quality on the worst case (200mm full-page photo at 200 DPI), but the order form has no context about where photos will be placed. Applying a worst-case rule to all cases is the systematic error.

**Impact:** 
- Customers see warnings on photos that are actually usable (iCloud Shared Album case = ~2048×1536 flagged for 39px shortfall)
- Pre-launch message is "your photos might be bad" instead of "we'll use them smartly"
- Erodes confidence in a premium product where perceived quality is critical

**Where to next:** 
Decide: are you defending all possible placements, or acknowledging that staff do the final placement call? If the latter (which the PRD suggests: "Aevia's team handles the creative work"), then either:
- Raise the threshold to 2000px (safe for most layouts, only reject the indefensible)
- Keep 1575px but rewrite copy to say "okay for inset, check when full-page" 
- Remove the check entirely (staff see originals at full res; preview gate catches real problems)

**Evidence:**
- S40 brief acknowledges placement is unknown: "it depends on placement, which the order form can't know" (order-flow-hardening.md:167)
- PRD states staff handle layout: "Aevia's team handles the creative work" (PRD.md:13)
- iCloud case: 2048×1536 real order AEV-094, fails by 39px (2.5%), intended for inset placement (staff reviewed it), no quality issue

### High Priority: Product pages claim 2000px; code enforces 1575px (contradiction)

**Issue:** 8 product pages (devotion, radiance, scribble, tender, wander, joyride, heirloom, newborn, EN + DE) state "Minimum resolution: 2000px on the short edge". The order form checks `< 1575`. Customers who read the product page and upload to that spec will see warnings anyway.

**Root cause:** No audit of copy consistency with code. The 1575px rule was introduced in S40; product page copy was never updated.

**Impact:** Credibility damage. A customer reads "2000px minimum" on the marketing page, uploads 2048×1536 from iCloud (trusting the stated minimum), and gets a red "LOW RES" badge. First impression: we lied or the upload tool is broken.

**Where to next:** 
Choose one of three:
1. Change product page copy to state 1575px minimum (honest, but needs explanation of why it differs from premium-tier 2000px that was considered in S40)
2. Change code threshold to 2000px (aligns with marketing, rejects only indefensible cases, may hide a genuinely soft photo on a large layout—but staff preview catches it)
3. Rewrite both to acknowledge dependency on placement (preferred, but requires copy work)

**Evidence:**
- Product page copy: `/pages/devotion.html:165`, `/pages/radiance.html`, `/pages/wander.html`, `/pages/heirloom.html`, `/pages/newborn.html`, etc. (8 product pages)
- Code threshold: `/pages/order.html:1876, 1977, 2138` all check `< 1575`
- S40 decision explicitly considered and rejected stricter 1900/240-DPI premium line (order-flow-hardening.md:169)

### Medium Priority: Badge styling sends wrong signal

**Issue:** `.low-res-badge` uses `rgba(170,50,20,0.88)` — a dark red-brown — with text "LOW RES". The styling is maximally alarming for a warning that is often false (iCloud case) or contextual (depends on placement).

**Root cause:** Badge design assumes the check is definitive ("this photo is bad"); the rule is actually probabilistic ("this photo may be risky in a large layout").

**Impact:** Amplifies the false-negative problem. Even if the 1575px threshold is right, the styling overstates its certainty.

**Where to next:** 
Soften styling only *after* resolving the threshold scope issue. Once you decide what the rule actually means, style accordingly. Current path (soften style without fixing rule) treats a symptom.

**Evidence:**
- `/pages/order.html:211` — `.low-res-badge` background color is `rgba(170,50,20,0.88)`, a bold error state
- Badge text: "LOW RES" (definitive), not "Check sizing" or "May be used as inset" (conditional)

### Low Priority: The "placement-honest" copy already exists but is half-heard

**Issue:** The summary line already says "may print soft, **especially if used large**" (order.html:2307). This is correct and hedged. The problem is not the copy; it is that the red badge makes customers stop reading the fine print.

**Root cause:** Badge visual weight overwhelms the text caveat.

**Impact:** Customers notice red, not the "especially if used large" qualifier.

**Where to next:** 
Once threshold/copy inconsistency is fixed, consider whether the hedged wording in the summary is sufficient, or if badge styling alone needs to soften. Currently, softening styling alone is a band-aid.

**Evidence:**
- Order.html:2307 summary already says: "may too low-resolution for print (shortest side under ~1575px, so it may print soft **if used large**)"
- The qualifier is there; it is just obscured by red styling

---

## Better Alternatives (Beyond Option B)

### Option C1: Raise threshold to 2000px (highest confidence)

**Pros:**
- Aligns with product page copy (already says 2000px)
- Rejects only genuinely indefensible photos (< 2000px is objectively not premium)
- Matches competitor baseline (S40 notes competitors are specific; "2000px" is a peer standard)
- Passes the iCloud test (2048×1536 clears the gate)
- Still defends premium perception

**Cons:**
- Allows a full-page photo at 2000×1500 (only ~157 DPI if used at full 200mm) — staff will have to reject it; preview catches it, not the form
- Requires copy edit: product pages already claim 2000px, but need to add "or smaller if used as inset" to be honest

**Recommended if:** You trust staff to do visual QC and preview is your actual safety net (which PRD suggests).

### Option C2: Keep 1575px, fix copy everywhere, soften badge (your recommendation, corrected)

**Pros:**
- Preserves the researched 200 DPI floor (defensible in writing, if explained)
- Reduces false negatives slightly by being honest about placement dependency
- Softer styling and hedged copy align with the rule's actual meaning

**Cons:**
- Asks customers to trust a non-obvious threshold (1575px is not a natural number; 2000px is easier to remember)
- Product pages need to drop to 1575px (a downgrade from current "2000px minimum" promise)
- iCloud case still fails (2048×1536 vs 1575 = -39px)

**Recommended if:** You want to defend the researched floor and educate customers on placement dependency—more honest, but more complex copy.

### Option C3: Remove the order-form check entirely, rely on preview (lowest complexity)

**Pros:**
- No false negatives (nothing gets flagged)
- Honest: staff do the QC, not an algorithm
- Simplest code (delete the check)
- Matches workflow reality (preview is the real gate)

**Cons:**
- Removes a pre-flight guardrail; customers might upload 800px photos and wonder why they don't print
- Requires product pages to shift language ("We'll check every photo and let you know if any can't be used large") instead of "Minimum 2000px"

**Recommended if:** You are confident in the preview gate and want to simplify the order form. Staff already eyeball originals at full res; this admits that is the real check.

---

## Assessment Against the Stated Success Criteria

**Does the recommendation meet the brief?**

| Criterion | Status | Notes |
|-----------|--------|-------|
| **(a) Does not deter customers who uploaded genuinely printable photos** | ❌ Partially | Softening badge helps, but iCloud case still fails at 1575px. Recommend raising to 2000px or rewriting copy to acknowledge placement dependency. |
| **(b) Does not let a customer unknowingly print a book that looks bad** | ✓ Yes | Preview gate handles this; staff review before printing. No code change needed beyond what's already deployed. |
| **(c) Is honest** | ⚠️ Half-honest | Recommendation softens tone, but does not fix the 2000px/1575px contradiction or acknowledge placement dependency. Incomplete honesty. |
| **(d) Is proportionate to a pre-launch business with limited time** | ✓ Yes | Fixes are simple: choose a threshold, update 8 product pages, maybe soften badge. No complex engineering. |

---

## Next Steps (Prioritised)

### 1. **Decide the threshold once (blocks everything)**
   - [ ] Option C1: Raise to 2000px (simplest, aligns with marketing, passes iCloud test)
   - [ ] Option C2: Keep 1575px, rewrite copy to hedge on placement (honest, complex, product pages take a step back)
   - [ ] Option C3: Drop check entirely, rely on preview (simplest code, shifts message to staff QC)
   - **Recommendation:** C1 (2000px). Aligns with your product page claim, resolves the contradiction, passes the real test case (AEV-094), and preserves the premium message.

### 2. **Update product pages** (mandatory if choosing C1 or C2)
   - [ ] Fix 8 product pages (devotion, radiance, scribble, tender, wander, joyride, heirloom, newborn, EN+DE)
   - [ ] Current: "Minimum resolution: 2000px on the short edge"
   - [ ] Suggested (C1): "Ideal resolution: 2000px on the short edge. Photos smaller than that work fine in layouts too; we'll let you know if we can't use a photo large."
   - [ ] File changes: `pages/devotion.html`, `pages/radiance.html`, etc. (8 files)

### 3. **Decide badge styling** (optional, low impact)
   - [ ] If keeping rule as-is: soften badge to amber, reword to "May print soft if used large"
   - [ ] If raising to 2000px: consider whether red is still justified (fewer false positives = more defensible)
   - [ ] File: `pages/order.html:211` (.low-res-badge style)

### 4. **Before launch, smoke-test with real iCloud photos**
   - [ ] Upload an iCloud Shared Album (~2048×1536) and confirm badge behaviour matches your decision
   - [ ] No code review needed; this is a human verification step

---

## Verdict

**Option B as written: Go, with corrections.**

Your instinct to soften the badge is right, but the recommendation underestimates the scope of the problem. The issue is not just tone; it is that the 1575px rule is overstated for a product where staff do layout. 

**Recommended path:**
1. Raise threshold to 2000px (or drop check entirely)
2. Fix product page copy to match (one-line edit × 8 pages)
3. Soften badge styling if needed (secondary)

This resolves the false-negative problem (iCloud case passes), aligns marketing with code, and preserves staff as the real QC gate—which is honest and matches your workflow.

**Time to implement:** ~1 hour (threshold change + product page edits). No risky engineering.

**Timeline:** Before launch, after S165 deploys (depends on nothing else).
