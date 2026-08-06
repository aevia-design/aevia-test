# Review: Printsmarter Print API Integration Brief

**Reviewer:** Claude Code (critic-agent)  
**Date:** 2026-08-06  
**Artifact reviewed:** `work/print-api/brief.md`  
**Context files:** `printsmarter-api.md`, `print-api-integration.md`, `printsmarter-call-onepager.md`, `CLAUDE.md`, `ARCHITECTURE.md`, `functions/index.js`

---

## Verdict

**GO-WITH-FIXES** — The brief is largely sound and usable, but contains gaps and contradictions that will cause clarification questions or wrong implementation choices if not addressed.

The brief stands alone reasonably well for someone familiar with Aevia's codebase, but an implementer working solo (especially Evgeny, new to coding) would hit snags on 4–5 points. The developments mentioned in the prompt (manual button decision, guards, Stripe plan, etc.) are **partially reflected** — some are clear, others are buried or missing — and one critical decision (dashboard button) is still not explicitly documented as decided.

---

## Critical Issues (Must Fix)

### 1. **Dashboard button decision still not owned in the brief** 🔴
**Location:** brief.md §Constraints, line 53; §Context, line 85  
**Severity:** Blocks implementation  

The brief marks "Trigger point undecided" and lists it as an open decision, but the prompt says the owner decided on a manual button (not automatic). This is **decided but not updated in the brief**. An implementer reading only the brief would not know this.

**Action:** Add to §Context / Open decisions:
```
**DECIDED:** Staff dashboard has a manual "Send to print" button with an are-you-sure 
confirm. Automatic submission on approval is not implemented (potential future work, 
but blocked on live Printsmarter testing). No automatic trigger exists in MVP.
```

---

### 2. **Missing `printsmarter-call-onepager.md` file reference chain breaks** 🔴
**Location:** brief.md line 69  
**Severity:** Creates false dependency  

Line 69 references `printsmarter-call-onepager.md` as a companion document:
> `docs/briefs/printsmarter-call-onepager.md` — §D–§G questions are still unanswered

But **this file does not exist in the aevia-api worktree.** It lives only in the source repo (`aevia-test`). An implementer in the worktree cannot find it, and the brief will not stand alone.

**Action:** Either (a) copy the file from source to worktree, or (b) rewrite lines 69–70 to acknowledge the file is in the source repo and explain its relevance briefly inline (the four unanswered sections are covered in the API contract doc anyway).

---

### 3. **Postback URL registration is dangerously underspecified** 🔴
**Location:** brief.md §Context lines 84–86, and §Requirements, line 46  
**Severity:** Security and implementation gap  

The brief correctly flags postback authentication as an open risk:
> Postback authentication is undocumented. An unauthenticated endpoint lets anyone who learns the URL trigger a dispatch email to a real customer with a fake tracking link.

But the brief then provides **no concrete guard or mitigation** for the implementer:
- No requirement to implement postback auth ourselves (signing check, token validation, IP allowlist)
- No decision on which approach to use
- No placeholder or guidance in the Success Criteria

The prompt mentions "postback-URL and API setup on OURS" but not how to secure it. An implementer reading only this brief might build an endpoint that accepts any POST to a public URL and ships it.

**Action:** Add to §Requirements:
```
- [ ] The postback receiver validates the caller. Until Printsmarter confirms 
authentication in their API, implement one of: (a) HMAC signature validation 
using a shared secret, (b) a per-request token sent by Printsmarter and stored 
in config, or (c) IP allowlist if Printsmarter publishes their webhook IPs. 
This is not optional — the endpoint touches customer email. Decision on which 
method TBD with Printsmarter confirmation.
```

And update Success Criteria line 2 to include postback validation as a checklist item.

---

### 4. **`product_id` status is unclear — conflicts with build order** 🟡
**Location:** brief.md §Constraints line 51; §Context line 84  
**Severity:** Misaligned expectations  

The brief correctly states:
> Nothing can be submitted until they issue ours. Treat it as a config value and build around the gap.

But the prompt says:
> Printsmarter emailed next steps: product setup, contract, spine definition table, delivery options on THEIR side

This reads as "product_id is coming," which is good. However, **the brief does NOT tell the implementer how to unblock build work while waiting.** The proposed build order (line 7 of prompt) starts with "client module → submit function," but if you can't test submit without a `product_id`, what does testing look like?

**Action:** Add to §Constraints:
```
**Until `product_id` arrives:**
1. Build all functions with `product_id` as a placeholder config value (e.g., 
   `PRINTSMARTER_PRODUCT_ID="pending"`).
2. Unit-test submit and postback logic in isolation (mock the Printsmarter call).
3. Do not attempt live submission to Printsmarter until they confirm the product ID.
4. When it arrives, update `functions/.env` and run an end-to-end test against 
   the test rig before touching production.
```

---

## Moderate Issues (Should Fix)

### 5. **"Egress cost measured" requirement is aspirational but not checkable** 🟡
**Location:** §Success Criteria line 4  
**Severity:** Requirement is vague  

Line 4 says:
> The real per-order egress cost is measured from an actual print PDF pair and written down.

This is good, but **"written down" has no acceptance criterion.** Where does it go? What form? What threshold counts as "known"?

**Action:** Rewrite as:
```
The real per-order egress cost is measured: generate one print PDF pair 
(cover + content) from a real order, record the file sizes, calculate 
€0.11/GB × size_in_GB × 2 (Printsmarter fetches both), and document in 
`docs/briefs/printsmarter-api.md` under a new "Cost" section. Cost must 
be <= €1/order for approval.
```

---

### 6. **Price field default assumption needs confirmation flag** 🟡
**Location:** brief.md §Context line 86  
**Severity:** Deferred but not guarded  

The brief says:
> What goes in `price` — our retail price or what we pay them — and whether it appears on a delivery note the customer sees. Unanswered since the S123 brief (Q13).

The prompt adds:
> Tentative decision pending confirmation: `price` field = what the customer paid (€70/€100) as default until Printsmarter clarifies.

**The brief does not record this tentative decision.** An implementer reading only the brief would not know there is a "pending Printsmarter confirmation" vs. "fully open."

**Action:** Update §Context line 86 to:
```
**What goes in `price`** — Tentative default: our retail price (customer paid: €70 or €100). 
This is pending Printsmarter confirmation on whether it appears on delivery notes visible 
to the customer. Implement with the retail price initially; pivot when confirmed.
```

---

### 7. **Return address is flagged but no guard provided** 🟡
**Location:** brief.md §Context line 87  
**Severity:** Configuration gap  

The brief correctly warns:
> What goes in `return_address`. Their example is an Elanders address. A failed delivery must not arrive at a flat in Vienna.

But there is **no requirement to configure it** or ensure it's a company address, not a residential flat.

**Action:** Add to §Requirements:
```
- [ ] `return_address` is configured in `functions/.env` as a company (not 
residential) address to receive failed deliveries. Unanswered field: 
where should this be? (Aevia office? Printsmarter warehouse?)
```

---

## Minor Issues (Nice to Fix)

### 8. **Cost language is repetitive and not precise** 🟡
**Location:** brief.md §Requirements line 34–35  
**Severity:** Clarity  

Lines 34–35 repeat the same point twice with slightly different wording. Could consolidate:

**Current:**
```
Egress is measured, not assumed: Printsmarter fetches both PDFs from us by URL, 
so record the real size of a print cover + content pair and multiply, rather 
than repeating the earlier ~6-cents-per-order estimate.

New functions stay in `europe-west1`, co-located with the bucket. No cross-region traffic.
```

**Suggested:**
```
Egress is measured, not assumed: Printsmarter fetches both PDFs from us by URL 
(~€0.11/GB to internet). Record the real size of a print PDF pair and calculate 
per-order egress cost; the earlier ~6-cents estimate was not measured. Functions 
stay in `europe-west1` co-located with the bucket; no cross-region traffic.
```

---

### 9. **Success Criteria #1 uses vague language ("verified by output")** 🟡
**Location:** §Success Criteria line 59  
**Severity:** Weakly checkable  

> verified by output, not asserted

This is a good instinct but the phrase is jargon. What does "by output" mean?

**Suggested rewrite:**
```
A real order placed on the test rig reaches Printsmarter, is visible in their 
order dashboard under our order_id_client, and its Printsmarter order ID appears 
in the Firestore order document — verify by screenshot or API poll, not by log assertion.
```

---

### 10. **No mention of test-mode Stripe, which the prompt flagged as decided** 🟡
**Location:** brief.md does not mention Stripe at all  
**Severity:** Missing context  

The prompt says:
> Stripe plan decided: test-mode Stripe for end-to-end pipeline tests; one real-Stripe order ~1 week before friends-and-family launch

This is a key decision for integration testing but **does not appear in the brief.** An implementer might assume no testing against real Stripe, or might test against production by accident.

**Action:** Add to §Context:
```
**Testing approach:** 
- Dev/test: Stripe test mode for end-to-end pipeline tests (test orders, test card)
- Pre-launch: One real-Stripe order ~1 week before F&F, with one real Printsmarter book
- Print samples may bypass the customer pipeline via direct submission (TBD)
```

---

## Strengths Verified

✅ **Standards alignment:** The brief correctly extracts requirements from CLAUDE.md (token handling, function shape, cost awareness, `/stop-slop` pass on copy) and ARCHITECTURE.md (state machine extension, Firestore as source of truth).

✅ **API contract is accurate:** The Printsmarter payload (§3 of printsmarter-api.md) is correctly summarized, and the four-operation shape is clearly stated.

✅ **Open questions are explicit:** The §Open decisions section clearly flags trigger point, price field, return address. This is good discipline.

✅ **Risk flagging is solid:** §Known risks correctly identifies "No sandbox," "Idempotency undocumented," "German free-text status," "Postback auth undocumented" as high-consequence unknowns.

✅ **References are solid:** The brief correctly points to `export-pdf.js`, `functions/index.js`, the API contract doc, and explains why the Site Flow brief is superseded.

✅ **Cost awareness:** §Requirements correctly calls out egress measurement and region co-location, matching CLAUDE.md requirements.

---

## Final Checks

| Check | Result |
|-------|--------|
| Stands alone for context-free implementer? | 🟡 Mostly — missing onepager file and a few explicit decisions |
| Requirements genuinely checkable? | 🟡 Yes, but #5 and #7 are aspirational without acceptance thresholds |
| Open decisions still open, or now decided? | 🔴 Button decision is decided but not updated; price/return are still open |
| Contradicts API contract? | ✅ No — API contract is accurately reflected |
| Contradicts CLAUDE.md? | ✅ No — standards are correctly applied |
| Contradicts ARCHITECTURE.md? | ✅ No — state machine extension and Firestore truth are correctly stated |
| Missing that would cause wrong implementation? | 🟡 Yes: postback auth, return address, Stripe test approach |

---

## Ranked Fixes (Priority Order)

1. **Update button decision to "decided" in §Context** — removes a false open door and unblocks dashboard design.

2. **Add postback authentication requirement + method decision TBD** — critical for security, currently risks an unguarded endpoint.

3. **Copy or reference printsmarter-call-onepager.md** — brief cannot stand alone without it.

4. **Flag `product_id` waiting strategy** — tells implementer what to build while waiting for Printsmarter to issue it.

5. **Record Stripe test-mode decision in §Context** — clarifies testing approach and prevents production-mode surprises.

6. **Clarify price field as "tentative pending confirmation"** — removes ambiguity on whether it's a full decision or not.

---

## Recommendation for Implementer (if not fixed)

This brief is **usable but not perfect.** An experienced developer can infer the missing pieces and ask for clarification. **Evgeny (new to coding) should pair these fixes into the brief before work begins,** or be prepared to ask for clarification on: postback security, Stripe testing, button placement, and where the onepager file lives.

If implementing without fixes: start with the postback auth (it's a security gate, not optional) and the button placement (it blocks dashboard design).

