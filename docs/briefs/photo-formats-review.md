# Review: Photo Formats Brief v1

**Reviewed:** 2026-08-11
**Brief Type:** Implementation scope and technical investigation
**Applicable Standards:** `CLAUDE.md` (simplicity, surgical edits, root cause), brief competence, technical accuracy
**Reviewer Method:** Verification against code (line numbers, file paths, evidence base)

---

## Summary

The brief accurately documents the root cause of the AEV-094 HEIC photo loss (derivatives saved with `.heic` filename but JPEG content, triggering failed conversion in template-engine). Evidence base is credible and well-sourced. However, the brief contains one material scope error (listing customer-preview.html as needing HEIC fixes when it doesn't), and several technical claims need calibration. The prescribed approach (magic-byte sniffing) is sound and simpler than the rejected alternative (renaming). Tier 1 is independently shippable. Ready for implementation with one scope correction required.

---

## What Meets Standards

**Accuracy of investigation:**
- Root cause correctly traced: derivatives written with HEIC filename but JPEG Content-Type, causing `isHeicFile()` at template-engine.html:1412 to trigger conversion (line checks extension first) on bytes that are not HEIC (line 1418 magic bytes fail, causing line 1498 error).
- Evidence table properly calibrated: three claims marked Confirmed (AEV-094 counts exact, derivatives have wrong type, heic-convert rejects JPEG bytes), others marked Unverified or properly cautioned (Android device unavailable, competitor help centres via search index not direct access).
- All cited file paths verified: order.html lines 435, 2932, 2936 exist and match claims; template-engine.html lines 1410–1420 contain the `isHeicFile` logic; functions/index.js line 1798 sets contentType to JPEG on derivatives; derivative-utils.js line 50 contains `isImageFile`.

**Reasoning about the fix:**
- Approach (byte-sniffing) is correct and simpler than rejected alternative (renaming derivatives). Renaming `deriveDerivativePath` would break legacy orders; byte-sniffing fixes both past and future.
- Scope framing follows `CLAUDE.md` principle (simplest thing that solves the problem). Adding `.rotate()` at Tier 3 is correctly scoped as insurance, not a blocker.
- Decision to refuse WebP is defended (only Artifact Uprising takes it; print industry rejects it). Consequence correctly noted: `isImageFile` can safely retain `webp`/`gif` since they won't reach the guard if door is closed.

**Constraints and risks:**
- Known risks properly identified: `isHeicFile` is async (performance check needed), three-surface engine parity drift history noted (S159, S162), order.html line conflict with S163 acknowledged.
- Decisions marked settled and rationale sound: 40 MB cap matches premium competitor (Artifact Uprising), justified on cost-efficiency grounds.

**Evidence base structure:**
- Competitor baseline research properly caveated (search-index sourced, not direct pages; owner has since confirmed two key sources verbally).
- References complete and traceable: competitor-baseline.md exists, prior-art briefs listed, key code lines cited.

**Tier 1 success criteria:**
- AEV-094 as regression fixture: concrete and testable (reloading must show 52, not 38).
- Test for regression ("JPEG bytes under `.heic` filename") is the exact case nobody wrote — correctly identified as critical gap.
- Conversion failure surfacing to staff is a real UX gap today (line 1502 returns `null` silently).

---

## Priority Issues

### High Priority

**Scope error: customer-preview.html is not one of the three HEIC surfaces**

- Symptom: Brief claims (line 61) that HEIC detection must be fixed in "`pages/staff/template-engine.html`, `pages/customer-preview.html`, `pages/spread-preview.html`". Verification shows customer-preview.html has **zero HEIC conversion code**: `grep -n "convertHeic\|heic-convert\|isHeicFile" pages/customer-preview.html` returns no matches (line 1473 calls `fetchPhoto` which only extracts orientation, no format conversion).
- Root cause: Brief was written from memory of order-processing flow without re-auditing customer-preview.html's actual code path. Customer-preview is a **read-only preview surface** (loads derivatives that are already JPEG from GCS), not a conversion surface.
- Impact: Implementer will write and test HEIC detection in customer-preview.html on false premise. Adds ~1–2 hours of unnecessary work. If the code is added and tested, it creates maintenance debt (checking code that should not exist).
- Where to next: **Strike customer-preview.html from line 61.** Replace with accurate list: "the two surfaces that convert HEIC: `pages/staff/template-engine.html` and `pages/spread-preview.html`" (verified: spread-preview.html has HEIC conversion at line 409). Audit customer-preview.html's `fetchPhoto` once to confirm it's read-only, then document why it doesn't need fixing.

**Tier 1 scope under-specifies the implementation boundary**

- Symptom: Line 62 states the fix "repairs **existing orders** (AEV-094 among them) without regenerating any derivative or renaming any stored object". This is true, but leaves ambiguous whether this means: (A) code shipped, existing orders automatically work on next load, or (B) code shipped, staff manually re-loads AEV-094 to verify. The latter is implied by line 149 ("Verifiable immediately by reloading AEV-094"), but line 62 should say so explicitly.
- Root cause: Brief assumes implementer will understand that `processOneFile`'s HEIC detection logic runs on fetch, not storage. No regeneration needed because existing derivatives are already in GCS; the fix is in the **read path**, not write path.
- Impact: Implementer might attempt to batch-regenerate derivatives (cost exposure, unnecessary). Or they might miss that they need to wire the new magic-byte sniff into the flow correctly (reading 12 bytes from a Blob, not a file path).
- Where to next: **Expand line 62 to:** "The fix repairs existing orders without regenerating or renaming stored files. When an order is reloaded, the HEIC detector will read the derivative blob's magic bytes (not filename) and correctly identify it as JPEG, skipping unnecessary conversion." This makes clear the fix is in the read path.

### Medium Priority

**Line 172 key-code list incomplete for Tier 3**

- Symptom: "Key code:" section (line 170–172) lists `functions/index.js:1780` (the `generateDerivative` function body), but does not list line 1750 (the function declaration itself, which contains the `onFinalize` trigger and timeout). For someone implementing Tier 3 (adding `.rotate()`), the context of when this function runs is important.
- Root cause: List focuses on specific points (the line where sharp is called) rather than function boundaries.
- Impact: Low — implementer can navigate to 1780 and scroll up. But brief is slightly less complete for Tier 3 implementer than Tier 1.
- Where to next: Add "and `functions/index.js:1750` (function declaration and trigger)" to line 170 for context.

**Line 1412 of order.html cited but contains no decision point**

- Symptom: Brief cites `order.html:2936` as `isHeic` function definition (line 2935–2936 confirmed), but line 2932 and 2936 are redundant checks (both test the name extension via regex, differing only in return logic). The six-place reconciliation (line 75–80) lists line 2936 as separate from line 2932, suggesting they serve different purposes, when both are purely extension-based.
- Root cause: Brief was written during investigation and conflates two related but distinct issues: (A) extension-based guards that fail on format mismatches (lines 2932, 2936 order.html), and (B) the derivative system's use of stored extensions regardless of actual content-type (derivative-utils.js line 50).
- Impact: Low, but precision matters for Tier 2 (one-format-policy). Implementer reading line 75–80 should understand that lines 2932 and 2936 are both extension-based and will both be affected by the byte-sniff fix.
- Where to next: Add a clarifying note to lines 75–80: "Both `isImage` (line 2932) and `isHeic` (line 2936) use extension-based checks; they will both be consulted during Tier 1 fixes and both should gain magic-byte fallbacks in Tier 2."

**Decision consequence at line 119–121 is stated but not actioned**

- Symptom: Brief correctly notes that `isImageFile` in derivative-utils.js line 54 includes `webp` and `gif` and that this is "harmless to leave". However, Tier 2 scope (line 74–89) does not include removing these from `isImageFile`, leaving the code in a state where the policy says "three formats" but the code still accepts `webp` and `gif` at the derivative-guard level.
- Root cause: Brief recommends policy change (refuse WebP at the door) without specifying that `isImageFile` should be updated to match. The "harmless" note assumes the door guard will stop WebP; if the door guard is not added, then `isImageFile` becomes a lurking bug.
- Impact: Medium — if implementer reads Tier 2 and forgets to add the door guard (the accept attribute and drag-drop validator), WebP could still reach the derivative generator and be processed. Conversely, if the door guard is added, then `isImageFile` is over-permissive but safe.
- Where to next: **Add to Tier 2 (around line 83):** "Update `isImageFile` (derivative-utils.js:54) to list only supported formats: `['jpg', 'jpeg', 'heic', 'heif', 'png']`. This ensures the derivative guard matches policy even if a file slips past the intake guard." Alternatively, note that `isImageFile` cleanup is Tier 2a (critical for coherence) vs Tier 2b (nice to have after door guard).

### Low Priority / Recommendations

**Evidence table confidence calibration**

- Observation: Line 40 marks "Derivatives keep `.heic` name but hold JPEG bytes" as Confirmed via Content-Type inspection. This is solid (verified: line 1798 in functions/index.js sets `contentType: 'image/jpeg'`). However, the method description "previews/photo_024.heic` has `Content-Type: image/jpeg`" is phrased as if someone fetched the object; the brief should clarify that this was verified via GCS metadata inspection, not a manual HTTP fetch (which would trigger the CORS issue noted in MEMORY.md).
- Recommendation: This is minor; just a note that "GCS object metadata verified" is sufficient evidence and the brief has done this work. No action required unless the brief is re-used in contexts where others might doubt the method.

**Tier 4 copy localization rule at line 109**

- Observation: Brief correctly notes S162 address rule ("du" = buyer, "euer/ihr" = people in book). However, the photo-formats copy change (telling customers what counts as a photo) is not an address or personalization case — it is a straightforward feature description. The rule is correct but not a strong constraint for this specific change.
- Recommendation: No action; just noting that Tier 4's German localization is straightforward and the S162 rule is orthogonal.

**Success criterion 3 ("Every format the order form accepts produces a web derivative") is outcome-focused but not testable**

- Observation: Line 153 states success criterion as "Every format the order form accepts produces a web derivative." This is outcome-focused (desirable end state) but the test is indirect — you'd need to (A) verify that only three formats are accepted, (B) upload each one, (C) check derivatives exist. A more direct test would name the three formats explicitly.
- Recommendation: For clarity in Tier 2 work, restate as: "JPG, PNG, and HEIC/HEIF each produce a derivative. WebP, AVIF, BMP, RAW are refused at upload with an error message naming supported formats." This makes the test explicit.

---

## Assessment Against Standards

| Requirement | Status | Notes |
|---|---|---|
| Root cause correctly identified | ✅ | Derivatives saved with wrong filename/content-type combination; file-type checks trust filename over bytes. |
| Evidence base credible and cited | ✅ | Three claims Confirmed (AEV-094 counts, derivative metadata, heic-convert failure), others appropriately caveated. Competitor research notes search-index limitation, owner has since verbally confirmed key sources. |
| Scope is independently shippable per tier | ✅ Tier 1 only | Tier 1 (byte-sniffing) is shippable alone and fixes the live bug. Tiers 2–4 can follow independently. **EXCEPTION:** customer-preview.html scope error must be corrected. |
| Approach justified (simpler than alternatives) | ✅ | Byte-sniffing is simpler and backwards-compatible vs. renaming (would leave legacy orders broken). Reasoning correct. |
| Constraints and risks identified | ✅ | Engine-parity drift history noted, performance risk of async `isHeicFile` flagged, S163 merge conflict anticipated. AEV-094 regression fixture protected. |
| Owner decisions ratified and marked settled | ✅ | WebP refused (only Artifact Uprising accepts it), 40 MB cap justified vs. competitors. Both decisions marked settled and will not be re-raised. Consequence of WebP decision (keep webp in `isImageFile` harmless) correctly noted. |
| Code citations accurate | ✅ except | All checked lines exist and match claims. **EXCEPTION:** customer-preview.html (line 61) does not have HEIC conversion code. Tier 2 line numbers are accurate; Tier 3/4 are incomplete (see Medium Priority section). |
| Success criteria testable | ✅ | AEV-094 reload, error message feedback, test for JPEG-bytes-under-.heic, npm test + qa:order pass. All specific. |
| Applicable standards (CLAUDE.md) honoured | ✅ | Brief recognizes simplicity principle, surgical edits (don't rename legacy paths), root cause (not symptom), and verification (AEV-094 as fixture). |

---

## Next Steps

**Before handoff to implementer (BLOCKING):**

1. **Correct scope:** Strike customer-preview.html from line 61. Verify and document that customer-preview.html is read-only and does not convert HEIC. This removes ~2 hours of false work.

2. **Clarify Tier 1 boundary:** Expand line 62 to explain that the fix is in the **read path** (HEIC detector, which runs on download), not the write path. Existing derivatives in GCS don't need regeneration.

3. **Finalize Tier 2 action on `isImageFile`:** Decide and document whether Tier 2 includes updating derivative-utils.js:54 to remove webp/gif, or whether this is Tier 2a (must do) vs Tier 2b (can defer). Current brief leaves it ambiguous.

**Before shipping (VERIFICATION):**

4. Performance validation: Ensure reading the first 12 bytes of a 100-photo order (line 1414 `arrayBuffer()` on Blob slice) is not a bottleneck. Brief flagged this as a risk; brief does not quantify it.

5. Engine parity: After Tier 1 changes to template-engine.html, audit spread-preview.html for consistency. Brief correctly notes drift has been a source of production bugs (S159, S162).

6. Copy pass: Before Tier 4, run the format-description copy through `/stop-slop` to remove AI patterns per project standard (line 10 notes this).

---

## Recommendation

**Go with corrections.** The brief is technically sound and well-researched. The scope error (customer-preview.html) is material but easily fixed. The approach is simple and correct. Tier 1 is independently shippable and will fix the live bug. The implementer has clear success criteria and known risks. Apply the three blocking corrections above, then this brief is implementation-ready.

