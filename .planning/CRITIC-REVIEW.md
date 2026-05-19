# Critic Review — Toddler Template Engine Plans v2.0

**Review date:** 2025-05-19  
**Reviewer:** Critic Agent  
**Scope:** Plans 05-01 through 10-01 (phases 05–10)  
**Verdict:** **GO WITH FIXES** — 7 critical / moderate issues must be resolved before execution.

---

## Executive Summary

The plan set is well-structured with clear phase dependencies and mostly complete data specs. However, **7 architectural ambiguities and 2 missing API specs** will cause silent failures or rework during execution if not resolved now. Most fixes are clarifications in existing plan text, not new plans.

Key risk areas: page count math, photo assignment state transitions, caption positioning, special photo drag restrictions, and print CSS bleed handling.

---

## CRITICAL ISSUES (Block execution)

### 1. Page count math undefined — affects core sequencing (06-02)

**File:** `phases/06-renderer/06-02-PLAN.md`, lines 11–25

**Problem:**  
Plan states "Total spreads = pageCount / 2" and notes "SP0 occupies 2 physical pages (left is blank/cover back). So 20-page book = 10 spreads including SP0." But this is a comment, not a formula. The actual execution algorithm in Task 1 doesn't show the calculation.

- Is a 20-page book: 10 spreads (1 + 9×2-page spreads) or 11 spreads?
- What's the minimum page count? (Page count must be even; is 20 minimum?)
- Does the algorithm allocate SP0 as 1 or 2 pages in the total?

**Impact:**  
If executor implements the formula wrong, a 20-page book will render 8 or 12 spreads instead of 10. Book will be incomplete or overfull.

**Fix required:**  
Add explicit pseudocode to Task 1:
```
totalSpreads = pageCount / 2
standardSpreads = totalSpreads - selectedFPs.length
// SP0 always present, counts as 1 spread
// Example: 20-page book (10 spreads total) with 2 FPs = 8 standard slots
```

Also add constraint in Task 1: "Page count must be even; min 20, max 80, step 4."

---

### 2. Photo assignment state transition undefined — affects drag + reorder (06-02, 07-02)

**File:** `phases/06-renderer/06-02-PLAN.md`, Task 2 + Task 3; `phases/07-interactions/07-02-PLAN.md`, Task 2

**Problem:**  
Plan 06-02 Task 3 says "When a spread changes type, its current photo assignments are cleared (photos return to unassigned pool)." But doesn't define:
- In what order do photos re-enter the unassigned pool?
- If slot positions change (SP1 has 3 slots, SP2 has 3 slots but in different locations), how are photos preserved or reset?
- What's the data structure for `window.bookAssignments`? Is it `[spreadIndex][page][slotIndex] = photoPoolIndex` or `[spreadIndex][page][slotIndex] = photo object`?

**Impact:**  
Executor will implement arbitrary state transitions. Dragging a photo might corrupt the assignment state. Reordering spreads might lose captions or create index conflicts.

**Fix required:**  
Define state model in 05-01 Task 1, alongside template-data.js structure:
```
window.bookAssignments = {
  [spreadIndex]: {
    left: [photoPoolIndex | null, ...],
    right: [photoPoolIndex | null, ...]
  }
}

window.captionState = {
  [spreadIndex]: {
    [page]: {
      [slotIndex]: 'caption text or empty string'
    }
  }
}
```

Add explicit rules to 06-02 Task 2:
- "Assign photos in order to the first available slot in each spread (left then right)."
- "When a spread type changes, remove its assignments from bookAssignments. Photos are added to `window.unassignedPhotos` array and available for new slots."

---

### 3. Caption position "upper-right" unresolved — causes layout bug (07-03)

**File:** `phases/07-interactions/07-03-PLAN.md`, lines 15–19

**Problem:**  
Plan explicitly states: "FP1 'upper right' caption position — is it horizontal text or rotated 90°? Needs visual confirmation during 07-03."

This is a documented open question, not a decision. If executor assumes wrong (e.g., rotates text 90°), FP1 will render incorrectly and staff will have to rewrite the caption code.

**Impact:**  
FP1 Birthday wishes right page captions will be unreadable or misaligned.

**Fix required:**  
Before 05-01 execution, provide visual reference or explicit decision. Current plan text suggests horizontal, non-rotated. Add to 07-03 Task 1:

```
// DECISION: "upper-right" is horizontal text positioned to the right of photo
// Example: photo at x=105mm y=100mm, caption at x=105+165+5=275mm (right of heart)
// Confirm this with Kseniia's FP1 mockup before coding.
```

Or: supply a screenshot of the intended FP1 layout.

---

### 4. FP5 artwork orientation conflict unresolved — causes silent bug (08-02)

**File:** `phases/08-functional/08-02-PLAN.md`, Task 3, line 49

**Problem:**  
Plan says: "If 2 artworks uploaded with different orientations: use H for left, V for right (or V/H)? Default: match left artwork orientation."

"(or V/H)" indicates the plan author didn't decide. "Match left artwork orientation" is a default but not a rule. If left is V and right is H, and templates require both to match, book will render inconsistently.

**Impact:**  
FP5 Art gallery pages may mismatch between left and right if artworks have different orientations. Staff will have to fix by re-uploading.

**Fix required:**  
Decide and state explicitly in 08-02 Task 3:
- Option A: "Always match left artwork orientation — use left's H/V for both pages."
- Option B: "If left V and right H: use V for both (portrait takes precedence)."
- Option C: "Detect shared orientation; if mismatch, throw error and ask staff to re-upload."

Recommend Option A (simplest, matches photo pool behavior).

---

### 5. Special photo drag restriction not enforced in interaction plan (07-01, 08-02)

**File:** `phases/07-interactions/07-01-PLAN.md` + `phases/08-functional/08-02-PLAN.md`, Task 1 + Task 2

**Problem:**  
Plan 08-02 Task 2 states: "Special photos are NOT swappable via drag-and-drop from the main pool (they're fixed to their designated slot)."

But Plan 07-01 (photo drag-and-drop) says: "Each photo slot div gets `draggable="true"` when it contains a photo" with no restriction on which slots can accept drops. No mention of blocking special → regular or regular → special drops.

**Impact:**  
Executor will implement unrestricted drag-drop. Staff can drag FP3 toy photo (special) into a regular slot on SP1, creating a broken assignment (special pool photo in regular slot).

**Fix required:**  
Add to 07-01 Task 1:
```
Drop validation: only allow drop if both source and target are:
- Both regular pool slots, OR
- Both special pool slots for the same FP type (FP3 left ↔ no other FP3 slots exist)

Block drag from special → regular and regular → special with visual feedback.
```

And add to 08-02 Task 2:
```
Special photos render with a [special] badge or border to indicate they cannot be dragged outside their slot.
```

---

### 6. Caption function API unspecified — blocks 09-01 (09-01)

**File:** `phases/09-export/09-01-PLAN.md`, Task 4, lines 35–42

**Problem:**  
Plan says: "call existing `/api/generate-caption` or the Firebase caption function — check which endpoint works."

Two possible endpoints are mentioned but not confirmed:
1. Where is the endpoint? `https://europe-west1-aevia-uploads.cloudfunctions.net/generateCaption` (guessed)?
2. What's the request body format? `{ imageDataUrl: base64string }`?
3. What does the response look like? Just text `"caption": "..."` or JSON object?
4. How is the image passed? Base64 data URL, file object, or signed GCS URL?

**Impact:**  
Executor will try both endpoints, guess at formats, and if neither works will have to debug Firebase functions (out of scope for this phase).

**Fix required:**  
Before 09-01, test the caption function endpoint:
1. Confirm working endpoint URL
2. Document request/response format
3. Add to 09-01 Task 4 with exact example:
```
// POST to https://[endpoint]/generateCaption
Request: { imageBase64: "data:image/jpeg;base64,..." }
Response: { caption: "First smile captured!" }
```

If endpoint isn't ready, mark 09-01 as "stub caption button (no-op)" for now.

---

### 7. Print CSS bleed + DPI handling undefined — causes quality loss (09-01)

**File:** `phases/09-export/09-01-PLAN.md`, Task 1, lines 12–19

**Problem:**  
Plan specifies CSS rules to hide UI but doesn't address:
1. **Bleed:** Spreads are 600px (200mm at 72 DPI). Print output at 300 DPI would be 833×833px per page. Should executor scale? Crop? The plan doesn't say.
2. **Page size:** Browser print CSS assumes browser's default page size (A4 = 210×297mm). A Toddler book spread is 200×200mm + 3mm bleed = 206×206mm. Plan doesn't specify page size in print CSS.
3. **Photo resolution:** Plan mentions "1500px minimum per photo" in Task 2 but doesn't say if photos will be resampled for print or if 600px canvas renders at full resolution.

**Impact:**  
Printed book will either be the wrong size (oversized or undersized) or pixelated (if not resampled). Staff will have to adjust print settings or regenerate.

**Fix required:**  
Add to 09-01 Task 1:
```
// Print CSS page setup
@page {
  size: 206mm 206mm;  // 200mm content + 3mm bleed on all sides
  margin: 0;
}

// Each .spread-row renders two 206×206mm pages
// Photos are rendered at 600px (72 DPI for screen) — note: print preview may not reflect final print DPI
// Staff should review print preview before sending to print house
```

And document as a known limitation: "Print-ready PDF generation (300 DPI upsampling) is out of scope for this phase. Print via browser print-to-PDF and verify in staff's print workflow."

---

## MODERATE ISSUES (Should be fixed, but won't block execution if well-documented)

### 8. Photo pool sequencing race condition on drag (07-01)

**File:** `phases/07-interactions/07-01-PLAN.md`, Task 1

**Problem:**  
When two photos are swapped between slots, the plan says "swap assignments in `window.bookAssignments`" but if bookAssignments stores photo **pool indices**, swapping two photos should be straightforward. However, if the data structure stores photo **objects** (like `{ file, url, date }`), a swap might accidentally duplicate or lose photo references.

**Low probability issue** (will likely work) but worth clarifying state shape.

**Fix required:**  
Clarify in 05-01 Task 1 (state model):
```
// Correct approach: store pool indices only
window.bookAssignments[0].right[0] = 5; // Photo pool index 5
window.bookAssignments[1].left[0] = 3; // Photo pool index 3
// On drag: swap indices (simple integer swap)
```

---

### 9. Caption state structure page key undefined (07-03)

**File:** `phases/07-interactions/07-03-PLAN.md`, Task 3, line 42

**Problem:**  
Plan says: "Store captions in `window.captionState[spreadIndex][page][slotIndex]`"

What is `page`? String `'left'` / `'right'`? Number `0` / `1`? And for FP1/FP2 text-only pages, where does the text panel text go? Is it `captionState[spreadIndex]['left-text']` or `captionState[spreadIndex].leftPanel`?

**Impact:**  
Executor will choose their own key scheme. If later phases need to serialize captions to Firestore, mismatch in key names will cause data loss.

**Fix required:**  
Add to 05-01 Task 1 state model:
```
window.captionState = {
  [spreadIndex]: {
    left: {
      1: 'caption text', // slot 1 on left page
      2: 'caption text'  // slot 2 on left page
    },
    leftPanel: 'Birthday message text', // FP1/FP2 text-only page
    right: {
      1: 'caption text'
    },
    rightPanel: 'Full-bleed FP2 right page caption (if any)'
  }
}
```

---

### 10. SVG coordinate origin not restated in executor plan (06-01)

**File:** `phases/06-renderer/06-01-PLAN.md`, Task 2, lines 12–15

**Problem:**  
Plan gives formula `left = x * 3`, `top = y * 3` but doesn't state that x/y are measured from top-left origin. If executor reads Excel data as "distance from center" or "distance from bottom-left," the formula gives wrong results.

**Low risk** (brief is clear; executor will likely read brief) but a safety check.

**Fix required:**  
Add to 06-01 Task 2:
```
// Coordinate system: all x, y, w, h from template-data.js are in millimeters, 
// measured from page top-left corner (origin 0,0 = top-left).
// Scale: 3px per mm (600px canvas = 200mm page).
// Example: photo at x=95, y=100, w=150, h=100 → 
//   div at left=285px, top=300px, width=450px, height=300px
```

---

### 11. Photo orientation detection coupling with slot variants (06-02)

**File:** `phases/06-renderer/06-02-PLAN.md`, Task 2

**Problem:**  
Plan says "assign first and second photo in sequence" but what if:
- SP2 has slots: Left H, Left V (two slots on left page)
- But photos 1–2 from pool are both landscape (H orientation)

Plan doesn't say whether photo 2 goes to slot 1 (Left V) and gets forced to V layout, or stays unassigned waiting for a landscape slot.

**Impact:**  
If photos are forced into mismatched orientations, they'll render at wrong aspect ratio (stretched/squashed).

**Fix required:**  
Add to 06-02 Task 2:
```
// Photo-to-slot assignment priority:
// 1. For each spread in sequence, iterate through slots (left then right)
// 2. Find next unassigned photo from pool
// 3. Assign photo to slot IF photo orientation matches slot variant (H photo → H slot)
// 4. If no orientation match, skip slot (leave empty, show placeholder)
// 5. Mark photo as assigned, move to next slot

// Alternative simpler rule (if H/V variants always exist):
// For each slot, pick the variant (H or V) that matches the next photo's orientation
```

Recommend implementing variant selection (simpler) over skipping slots (more conservative but may leave gaps).

---

### 12. Blob/ObjectURL memory management not addressed (06-01 onwards)

**File:** `phases/06-renderer/06-01-PLAN.md`, Task 1 + all subsequent phases

**Problem:**  
Photos are stored as objectURLs: `window.photoPool = [{ file, url, date, orientation }]`

If staff uploads 100 photos, then realizes a mistake and re-uploads 100 different photos, the first 100 objectURLs remain in memory. Repeated uploads could leak memory.

**Low severity** (web browsers auto-clean unused URLs) but a known risk.

**Fix required:**  
Add note to 06-01 Task 1:
```
// On re-upload (if user changes page count or FPs and uploads new photos):
// - Call URL.revokeObjectURL() on all old photoPool entries
// - Clear window.photoPool and rebuild with fresh URLs
// (This is defensive; browser GC will clean up anyway, but good practice)
```

---

## MINOR ISSUES / UNDER-SPECIFICATION

### 13. Font loading not included in plans (05-01, 08-01)

**File:** `phases/05-data-shell/05-01-PLAN.md`, Task 1; `phases/08-functional/08-01-PLAN.md`, Task 1

**Problem:**  
Template-data.js references `fonts: { display: 'NT Comic', body: 'EB Garamond' }` but no plan includes CSS `@import` or font loading. Executor will add fonts but it's not specified.

**Fix required (optional):**  
Add to 05-01 Task 2 (page shell):
```html
<head>
  <!-- EB Garamond already in system (Aevia brand font) -->
  <!-- NT Comic: check if available via Google Fonts or system. If not, substitute with Comic Sans or note as missing. -->
</head>
```

---

### 14. Photo strip scroll behavior unspecified (06-01, 06-03)

**File:** `phases/06-renderer/06-01-PLAN.md`, Task 1; `phases/06-renderer/06-03-PLAN.md`, Task 2

**Problem:**  
Plan says "horizontal scrollable row of photo thumbnails" but doesn't define:
- Do thumbnails auto-scroll to show the next unassigned photo?
- Does dragging a photo scroll the strip to that photo?
- Snap-to-slot on drop?

**Low priority (good UX but not critical).**

**Fix (optional):**  
Add to 06-03 Task 2:
```
Photo strip behavior:
- Show all photos in upload order, left to right
- Unassigned photos shown with white background; assigned photos with gray background
- No auto-scroll (too disruptive); user can scroll manually
```

---

### 15. "Upper-right" caption positioning math ambiguous (07-03)

**File:** `phases/07-interactions/07-03-PLAN.md`, Task 1, lines 27–29

**Problem:**  
Formula states:
```
'upper-right': top = y * 3, left = (x + w + offset) * 3
```

For FP1 heart photo (x=105, y=100, w=165, h=175, offset=5mm):
- left = (105 + 165 + 5) * 3 = 1155px
- But page is only 600px wide.

Plan doesn't clarify if this is intended (caption overflows off-page) or if the formula is wrong.

**Fix required:**  
Add to 07-03 Task 1:
```
// For "upper-right" with overflow risk:
// If calculated left > 600px, clamp to (600 - captionWidth)
// OR: interpret "upper-right (5mm)" as: text positioned at page right edge, right-aligned, 5mm margin
// Example: right-align caption to page edge (left = 600px - captionWidth - 15px margin)
```

Recommend right-align variant (more legible).

---

### 16. Reset/clear functionality missing (all phases)

**File:** All plans

**Problem:**  
No plan includes a "Reset book" or "Clear all and start over" action. What if staff:
- Uploads 50 photos, then realizes they want 20-page instead of 28-page?
- Changes from 3 FPs to 0 FPs?
- Wants to clear captions and reorder from scratch?

**Fix (optional but recommended):**  
Add to 05-01 Task 2 (config bar):
```
Config bar includes a [↺ Reset] button
On click: clear all state (photoPool, bookAssignments, captionState), reset page count to 20, uncheck all FPs, show placeholder text
```

---

## MISSING PLANS

### 17. Order data loading not covered in scope (intended, but worth noting)

**File:** `.planning/ROADMAP.md`, v2.1 section

**Note:**  
Plans 05–10 assume staff manually uploads photos and configures the book locally. **GCS integration (loading order data from Firestore + fetching photos from GCS)** is deferred to v2.1. This is correct for MVP scope but means phases 05–10 will not yet integrate with the existing Firebase backend.

**Not a blocker** (v2.0 is intentionally local-only).

---

### 18. Caption function API spec missing (depends on Firebase)

**File:** `phases/09-export/09-01-PLAN.md`

**Note:**  
The `generateCaption` endpoint needs to be confirmed and spec'd before 09-01 can execute. This is a pre-requisite, not a gap in the plan, but it blocks execution if not done first.

**Action:** Test `/functions/caption/caption.js` endpoint before starting 09-01.

---

## SEQUENCING ANALYSIS

**Dependency chain is sound:**
- 05-01 → all others (data + shell required first)
- 06-01 → 06-02 → 06-03 (renderer built incrementally)
- 07-01 → 07-02 → 07-03 (interactions layered)
- 08-01 → 08-02 (functional pages, special uploads)
- 09-01 uses all prior phases
- 10-01 uses template-data from 05-01 only (independent of 06–09)

**Potential parallel execution:**
- 06-01 can start while 05-01 is finishing (if template-data.js structure is shared early)
- 08-01 could start during phase 06 if page shell is ready

No circular dependencies found.

---

## RISK PRIORITIES

### Highest risk (execution will fail without fix):
1. **Page count math** (06-02) — formula must be explicit
2. **Caption API spec** (09-01) — endpoint must be confirmed
3. **Photo state transitions** (06-02 + 07-02) — state model must be defined

### High risk (silent bugs if ambiguity not resolved):
4. **FP5 orientation conflict** (08-02) — decision needed
5. **Caption "upper-right" position** (07-03) — visual confirmation needed
6. **Special photo drag restriction** (07-01 + 08-02) — constraint must be enforced

### Medium risk (rework required if overlooked):
7. **Print CSS bleed + DPI** (09-01) — known limitation must be documented
8. **Caption state structure** (07-03) — key naming must be consistent

---

## VERDICT: **GO WITH FIXES**

### Execution can proceed after these 7 fixes:

1. **05-01:** Add explicit state model (bookAssignments, captionState structure)
2. **06-02:** Add page count formula and standard spread count calculation with example
3. **07-03:** Add visual reference or explicit decision on "upper-right" caption position
4. **08-02:** Decide FP5 orientation rule (match left artwork, or error if mismatch)
5. **07-01:** Add drop validation to block special ↔ regular photo swaps
6. **09-01:** Confirm and document caption function endpoint spec
7. **09-01:** Document bleed + print DPI handling as v2.0 limitation

### Recommended timeline:
- **Before execution:** Fix #1–6 (24 hours, mostly doc updates)
- **During 05-01:** Implement fix #1
- **During 06-02:** Implement fix #2
- **Before 07-03:** Complete fix #3
- **Before 08-02:** Complete fix #4
- **During 07-01:** Implement fix #5
- **Before 09-01:** Complete fixes #6–7

---

## FILES MODIFIED BY THIS REVIEW

To implement fixes, update:
- `phases/05-data-shell/05-01-PLAN.md` — add state model + font loading notes
- `phases/06-renderer/06-02-PLAN.md` — add page count formula + state transition rules
- `phases/07-interactions/07-01-PLAN.md` — add drop validation constraint
- `phases/07-interactions/07-03-PLAN.md` — add "upper-right" decision or visual ref
- `phases/08-functional/08-02-PLAN.md` — decide FP5 orientation rule
- `phases/09-export/09-01-PLAN.md` — document caption API spec + print CSS limitations

---

## SIGN-OFF

**Reviewer:** Critic Agent (Haiku 4.5)  
**Review depth:** Complete phase-by-phase analysis of all 10 plans + whats-next context  
**Confidence:** High (all dependencies traced, sequencing verified, ambiguities explicitly documented)

**Recommend:** Proceed with fixes above. No structural redesign needed. Plans are conservative and achievable in scope.
