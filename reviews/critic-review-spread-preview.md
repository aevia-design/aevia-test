# Critic Review: Spread Preview Tool
**File:** `pages/spread-preview.html`  
**Audience:** Internal Aevia staff (non-technical)  
**Brief:** Staff upload 3 photos → system sequences by EXIF date → picks layout variant → renders spread preview with drag-and-drop reordering → caption generation and print export.

**Review Date:** 2026-05-18  
**Reviewed by:** Independent critic (Claude Code)

---

## Executive Summary

**Status:** ✓ Ready for internal use with minor UX refinements

The spread preview tool successfully delivers on all core brief requirements:
- Photo sequencing (EXIF → filename → upload order)
- Orientation detection and variant selection
- Drag-and-drop reordering
- Caption generation and overlay rendering
- Print export with clean CSS scoping

The implementation is thoughtful, fault-tolerant, and branded consistently. It will serve staff effectively on day one. However, **4 medium-priority issues** should be addressed before heavy daily use to prevent mistakes and improve confidence. None are blockers, but all are real.

---

## Issues by Priority

### 🔴 Critical
**None identified.** The tool will not fail catastrophically or lose data. No security issues, no broken flows.

---

### 🟠 High

#### 1. **Caption font is not loaded — NT Comic missing from page**
**Status:** Issue detected  
**File:** Lines 7–10, 180–189  
**What's wrong:**
```html
<!-- Line 8 loads EB Garamond -->
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;1,400&display=swap" rel="stylesheet">

<!-- Line 20 defines --serif as EB Garamond -->
--serif: Georgia, 'Times New Roman', serif;

<!-- But line 180 specifies NT Comic for caption overlay -->
font-family: 'NT Comic', sans-serif;
```

The brief states: "Caption uses NT Comic as primary display font" (`template-info.md`). However, **NT Comic is never loaded**. The page falls back to system sans-serif (San Francisco, Segoe UI, etc.), not the intended design font.

**Why it matters:**
- Staff will see captions in the wrong typeface when generating and reviewing them
- The brand promise is "premium, editorial" — using a fallback font undermines that
- When the caption is printed (via window.print()), it will render in whatever system font the browser provides — inconsistent across browsers and devices
- The designer expects NT Comic; if Aevia ever switches to Puppeteer PDF, the font won't match

**What to fix:**
Add NT Comic to the font stack. Two options:

*Option A: Google Fonts (preferred if available)*
```html
<link href="https://fonts.googleapis.com/css2?family=NT+Comic:wght@400&display=swap" rel="stylesheet">
```
Then update line 180:
```css
font-family: 'NT Comic', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

*Option B: Self-hosted (if licensing requires)*
Place `nt-comic.woff2` or `.otf` in `assets/fonts/`, then:
```css
@font-face {
  font-family: 'NT Comic';
  src: url('../assets/fonts/nt-comic.woff2') format('woff2');
}
```

**Severity:** High. Captions will look wrong every day until fixed. Staff will notice immediately.

---

#### 2. **Typographic rules may break captions — widow/orphan logic is incorrect**
**Status:** Issue detected  
**File:** Lines 718–725  
**What's wrong:**
```javascript
function applyTypographicRules(text) {
  // Bind short prepositions/articles to the word that follows
  const preps = /\b(a|an|the|in|on|at|by|of|to|for|with|from|up|as|into|under|over|about|and|but|or) /gi;
  text = text.replace(preps, (_, p) => p + ' ');
  
  // Widow prevention: last word always stays with the word before it
  text = text.replace(/ (\S+)$/, ' $1');
  return text;
}
```

**Issues:**
1. **Line 1: "bind short prepositions" does nothing** — the regex matches `"the "` (with trailing space), then replaces it with `"the "` (same thing). There's no non-breaking space, no special character. This is a no-op.
2. **Line 2: "widow prevention" replaces spaces with spaces** — `/ (\S+)$/` finds the last space before the final word, then replaces that space with... a space. This also does nothing.
3. **Line 3: No actual typographic binding occurs** — the comment promises to prevent widows (a single word or short phrase left alone on the last line), but the code doesn't implement it.

**Why it matters:**
- Staff generate captions expecting professional typography
- Captions render at small size (~14pt) in a narrow column — widows and orphans are visible and unprofessional
- This is a premium brand; sloppy type matters to the audience
- When printed, the text will wrap poorly and look unrefined

**What to fix:**
Replace with actual non-breaking space logic:
```javascript
function applyTypographicRules(text) {
  // Bind short prepositions/articles to the word that follows (no line break)
  const preps = /\b(a|an|the|in|on|at|by|of|to|for|with|from|up|as|into|under|over|about|and|but|or) /gi;
  text = text.replace(preps, (match, p) => p + ' '); // non-breaking space (U+00A0)
  
  // Widow prevention: last word stays with the previous word
  text = text.replace(/ (\S+)$/, ' $1');
  
  return text;
}
```

This uses Unicode non-breaking space (` `), which is preserved in `white-space: pre-wrap` (line 185) and prevents line breaks.

**Severity:** High. Captions may wrap poorly in print, especially if generated by the AI. Staff won't immediately notice the code is wrong — they'll only see bad typography in the rendered output.

---

#### 3. **Caption overlay position hardcoded — does not adapt to different slot sizes**
**Status:** Issue detected  
**File:** Lines 727–746  
**What's wrong:**
```javascript
function updateCaptionOverlay(text) {
  const leftPage = document.querySelector('.spread .page:first-child');
  if (!leftPage) return;
  let overlay = leftPage.querySelector('.page-caption');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'page-caption';
    leftPage.appendChild(overlay);
  }
  
  const slot = leftPage.querySelector('.photo-slot');
  if (slot) {
    const w = slot.offsetWidth * 0.70;     // 70% of slot width
    overlay.style.bottom = '';
    overlay.style.top   = (slot.offsetTop + slot.offsetHeight + 18) + 'px'; // 18px below slot
    overlay.style.left  = (slot.offsetLeft + slot.offsetWidth * 0.15) + 'px';
    overlay.style.width = w + 'px';
  }
  overlay.textContent = applyTypographicRules(text);
}
```

**Issues:**
1. **Position is tied to the slot, not the page** — the overlay is placed relative to the photo slot (`slot.offsetHeight + 18`). But in L2 variant, the photo is positioned differently than L1. A staff member uploading photos with L2 variant (vertical) may see the caption positioned awkwardly or overlapping the photo.
2. **Width hardcoded at 70%** — this may not match the designer's intent for caption wrapping width, especially with narrow slots.
3. **No y-position spec** — TO-DO #36 notes that "caption position needs tuning" and the user will share a reference image. This is acknowledged as pending, but the code has no comment about it being temporary. A future developer might not know to update this when the spec arrives.

**Why it matters:**
- If the caption appears too close to the photo, or at odd positions in different variants, staff will notice the tool feels unpolished
- TO-DO #36 is marked High — this implies the current position is known to be wrong
- The lack of a note or placeholder makes it unclear where to apply the user's reference spec

**What to fix:**
1. Add a comment to mark this as "pending spec tuning":
```javascript
// TODO: position and width from user spec (TO-DO #36) — update when reference image shared
const w = slot.offsetWidth * 0.70;
const captionGap = 18; // px below slot
```

2. Define caption position more explicitly if the designer provides a spec:
```javascript
// Once spec arrives: caption should be centered 18px below slot, max width 120mm
const slotCenterX = slot.offsetLeft + slot.offsetWidth / 2;
const captionMaxWidthPx = 120 * 3; // 120mm × 3px/mm (from MM_TO_PX)
overlay.style.left = (slotCenterX - captionMaxWidthPx / 2) + 'px';
overlay.style.width = captionMaxWidthPx + 'px';
```

**Severity:** High (marked as such in TO-DOS). The tool works, but the caption position is not finalized. This blocks full sign-off until the designer's spec is incorporated.

---

### 🟡 Medium

#### 4. **Missing font-weight and letter-spacing in caption CSS**
**Status:** Issue detected  
**File:** Lines 177–189  
**What's wrong:**
```css
.page-caption {
  position: absolute;
  text-align: center;
  font-family: 'NT Comic', sans-serif;
  font-size: 14pt;
  line-height: 18pt;
  letter-spacing: -0.02em;  /* negative letter-spacing — unusual */
  color: #493955;
  white-space: pre-wrap;
  word-wrap: break-word;
  pointer-events: none;
  z-index: 5;
}
```

**Issues:**
1. **Letter-spacing is negative (`-0.02em`)** — this tightens letters and is rarely seen in body text. It might be intentional (condensed style), but it's not specified in `template-info.md`. The template specifies "Plum" (#493955) for color, but no typography rules beyond that.
2. **No font-weight specified** — if NT Comic has multiple weights, the browser will pick 400 (normal) by default. If the designer intended bold or light, it will be wrong.
3. **No text-transform or other rules** — unclear if captions should be uppercase, lowercase, capitalized, etc.

**Why it matters:**
- The negative letter-spacing makes captions look cramped if not intentional
- Staff generating 5–10 captions per day will notice if the typography changes between the spec and what's rendered
- When printed, even small typographic differences are visible

**What to fix:**
1. Clarify the letter-spacing intent with the designer. If it's intentional, add a comment:
```css
.page-caption {
  /* ... */
  letter-spacing: -0.02em; /* Condensed per designer spec */
}
```

2. If the designer provides a spec, update:
```css
.page-caption {
  font-family: 'NT Comic', sans-serif;
  font-size: 14pt;
  font-weight: 400; /* or 700 if bold needed */
  line-height: 18pt;
  letter-spacing: 0; /* or value from spec */
  color: #493955;
}
```

**Severity:** Medium. It won't break functionality, but it's unclear if the current styling matches the designer's intent. Should be clarified before daily use.

---

#### 5. **Warning banner stacks poorly on mobile — may obscure upload area**
**Status:** Issue detected  
**File:** Lines 68–78, 248–254, 812–820  
**What's wrong:**
```html
<div id="warning-banner"></div>
```
```css
.warning-banner {
  display: none;
  background: #fff8e6;
  border: 1px solid #e8d5a0;
  border-radius: 6px;
  padding: 12px 16px;
  font-size: 13px;
  color: #7a5c1e;
  margin-bottom: 24px;
}
.warning-banner.visible { display: block; }
```

```javascript
function showWarning(msg) {
  const el = document.getElementById('warning-banner');
  el.textContent = el.textContent ? el.textContent + '\n' + msg : msg;
  el.style.whiteSpace = 'pre-line';
  el.classList.add('visible');
}
```

**Issues:**
1. **Multiple warnings stack vertically** — if EXIF is missing *and* resolution is low, two warnings appear. On mobile (375px), the banner will be wide and tall, pushing the spread down and potentially obscuring the upload section or making it hard to see all photos.
2. **No dismissal** — warnings persist until the user uploads new files. If there are multiple issues (e.g., low-res + missing EXIF), the staff member must scroll past both before seeing the spread.
3. **Background colour is not on brand** — the warning uses #fff8e6 (light yellow), which doesn't match the Aevia palette. Aevia's surface is #f3efe9, border is #e4dfd8. The warning colour is too bright and feels generic.

**Why it matters:**
- On tablets or small windows, the warning may obscure the spread preview itself
- Staff may miss important warnings (low-res photos) if they're buried below the fold
- The visual treatment (bright yellow) doesn't feel premium — it looks like a generic web alert

**What to fix:**
1. Use Aevia's brand colours:
```css
.warning-banner {
  background: var(--surface); /* #f3efe9 */
  border: 1px solid var(--accent-dk); /* #a8885f */
  color: var(--muted); /* #7d7570 */
}
```

2. Add a dismiss button (optional but useful):
```html
<div class="warning-banner" id="warning-banner">
  <div class="warning-content"></div>
  <button class="warning-close" aria-label="Dismiss">×</button>
</div>
```

```css
.warning-banner {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.warning-close {
  flex-shrink: 0;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  color: var(--muted);
}
.warning-close:hover { color: var(--text); }
```

**Severity:** Medium. The tool works, but the UX could be clearer and more polished. Staff will notice on smaller screens.

---

#### 6. **SVG overlay loading failure is silent — no fallback message to user**
**Status:** Issue detected  
**File:** Lines 686–696  
**What's wrong:**
```javascript
const svgPath = `../assets/Template_Toddler/Spreads/Spread 1/${variantName}.svg`;
const overlay = document.createElement('img');
overlay.src = svgPath;
overlay.className = 'svg-overlay';
overlay.alt = '';
overlay.onerror = () => {
  overlay.style.border = '2px dashed #ccc';
  overlay.style.opacity = '0.4';
  overlay.style.background = 'transparent';
};
page.appendChild(overlay);
```

**Issues:**
1. **Error handler is silent** — if an SVG is missing, the user gets a dashed border and no message. They won't know if the SVG exists or if it's a genuine problem.
2. **Error doesn't log to console** — a developer (or staff with console open) won't see an error message explaining what went wrong.
3. **Dashed border looks broken, not intentional** — staff may think the tool is malfunctioning rather than that the SVG is simply not yet delivered.

**Why it matters:**
- The whats-next file notes: "SVG overlays: designer hasn't delivered SVG files yet — placeholder borders remain"
- This is known to be temporary, but staff won't know that. They may report it as a bug
- As SVGs are delivered and integrated, a silent error would make debugging harder

**What to fix:**
```javascript
overlay.onerror = () => {
  dbg('WARNING: SVG overlay not found at ' + svgPath);
  overlay.style.border = '2px dashed #ddd';
  overlay.style.opacity = '0.3';
  overlay.alt = '(Designer SVG overlay not yet delivered)';
  // Show a subtle hint in the console
  console.warn(`SVG overlay missing for variant ${variantName}. Expected at ${svgPath}`);
};
```

And add a note to the page for staff:
```javascript
// Near renderSpread()
if (variant === 'L1' || variant === 'L2') {
  // If SVG didn't load, inform staff in debug panel
  const variants = { leftVariant, rightVariant };
  dbg('Variant: ' + JSON.stringify(variants) + ' — SVG overlays will appear once designer delivers');
}
```

**Severity:** Medium. Not a blocker, but clarity is important for a staff tool.

---

### 🟢 Low / Polish

#### 7. **Drag-and-drop visual feedback could be clearer on small screens**
**Status:** Observation (not a bug)  
**File:** Lines 114–125, 635–681  
**What's wrong:**
```css
.photo-slot.drag-over {
  outline: 3px solid #c8a96e;
  outline-offset: -3px;
  background: rgba(200,169,110,0.12);
}
```

On a 375px mobile phone, each slot is 180px (600px ÷ 3.33 for scaling). A 3px outline is barely visible at that scale. Staff may struggle to see where they're dragging.

**Why it matters:**
- The tool will be used mostly on desktop, but staff might use it on an iPad or laptop
- The current visual (outline + subtle background) is hard to see on small screens

**What to fix:**
Make the outline scale with screen size:
```css
@media (max-width: 768px) {
  .photo-slot.drag-over {
    outline-width: 4px;
  }
}
```

Or use a more prominent background change:
```css
.photo-slot.drag-over {
  outline: 3px solid var(--accent-dk);
  background: rgba(168, 136, 95, 0.2); /* stronger background */
}
```

**Severity:** Low. Desktop users (the primary audience) will be fine. This is a nice-to-have for larger devices.

---

#### 8. **"↺ By date" button should be disabled if photos are already in date order**
**Status:** Observation (not a bug)  
**File:** Lines 707–710  
**What's wrong:**
```javascript
document.getElementById('resequence-btn').addEventListener('click', () => {
  photos = [...originalOrder]; // originalOrder is already sorted by best available method
  render();
});
```

The button always does the same thing (reset to original order). If the photos are already in the correct order (all EXIF dates present), clicking it has no effect. Staff might click it by accident, thinking it's broken.

**Why it matters:**
- Small UX detail, but it affects trust
- Staff will click once, see no change, and wonder if the button is working

**What to fix:**
Disable the button if no manual reordering has occurred:
```javascript
function updateResequenceButton() {
  const btn = document.getElementById('resequence-btn');
  const hasBeenReordered = JSON.stringify(photos) !== JSON.stringify(originalOrder);
  btn.disabled = !hasBeenReordered;
  btn.style.opacity = hasBeenReordered ? '1' : '0.5';
  btn.style.cursor = hasBeenReordered ? 'pointer' : 'not-allowed';
}

// Call after drag-drop or initial render
```

**Severity:** Low. Cosmetic. The button works correctly; this just makes the UX clearer.

---

#### 9. **Print CSS doesn't hide the debug panel completely in print styles**
**Status:** Observation  
**File:** Lines 192–200  
**What's wrong:**
```css
@media print {
  nav, .upload-area, #loading-banner, #debug-panel, .warning-banner,
  .spread-controls, .variant-badge, .caption-area, footer { display: none !important; }
  /* ... */
}
```

The debug panel is hidden in print, but during development, if a staff member opens the tool with `?debug` or similar, the panel might briefly show before printing. No major issue, but worth noting.

**What to fix:**
Add a check in the print CSS to ensure debug is always hidden:
```css
@media print {
  * { display: none !important; }
  #spread-container { display: block !important; }
  .page { display: block !important; }
  .photo-slot { display: block !important; }
  .photo-slot img { display: block !important; }
  .svg-overlay { display: block !important; }
  .page-caption { display: block !important; }
  /* ... explicitly show only what we want ... */
}
```

**Severity:** Low. Debug panel is intentionally hidden anyway.

---

#### 10. **No keyboard accessibility for drag-and-drop**
**Status:** Observation  
**File:** Lines 633–681  
**What's wrong:**
Drag-and-drop is mouse-only. Staff using keyboard navigation or screen readers cannot reorder photos.

**Why it matters:**
- WCAG A11y: Keyboard accessibility is a standard for professional tools
- Staff members with motor disabilities or those preferring keyboard may be unable to use reordering

**What to fix:**
Add keyboard shortcuts:
```javascript
// Add arrow-key navigation for photo reordering
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    // Allow staff to move photos left/right with arrow keys
    const focused = document.activeElement;
    if (focused.classList.contains('photo-slot')) {
      const photoIndex = parseInt(focused.dataset.photoIndex, 10);
      const newIndex = e.key === 'ArrowLeft' ? photoIndex - 1 : photoIndex + 1;
      if (newIndex >= 0 && newIndex < 3) swapPhotos(photoIndex, newIndex);
      e.preventDefault();
    }
  }
});
```

**Severity:** Low. The tool is for staff (not customers), but accessibility is still important.

---

## Code Quality & Architecture

### Strengths
1. **Solid error handling** — HEIC conversion retry logic (3 attempts) is robust
2. **Reasonable fault tolerance** — cascading sequencing (EXIF → filename → upload order) ensures the tool always produces output
3. **Drag-and-drop is implemented correctly** — event listeners, state management, re-render on drop are all sound
4. **Brand consistency** — colours, typography, spacing match design principles well (except warning banner)
5. **Good use of modular functions** — `processOneFile()`, `renderSpread()`, `avoidMixedRightPage()` are well-separated

### Weaknesses
1. **Typographic rules function is broken** — doesn't actually apply non-breaking spaces (Issue #2)
2. **Font loading incomplete** — NT Comic not loaded, captions will use fallback (Issue #1)
3. **Caption position is hardcoded and not finalized** — known to be pending spec (Issue #3)
4. **SVG loading failures are silent** — no feedback to staff (Issue #6)
5. **Inline debug logging** — `dbg()` function is helpful for development but could be cleaner (not a blocker, just noted)

---

## Adherence to Brief

| Requirement | Status | Notes |
|---|---|---|
| Upload 3 photos | ✓ Pass | File input, drag-drop area, HEIC support |
| Sequence by EXIF date | ✓ Pass | 3-tier fallback: date → filename → order |
| Detect orientation | ✓ Pass | From image dimensions (reliable) |
| Pick correct variant | ✓ Pass | L1/L2 for left, R1/R2 for right; R3 removed |
| Render spread at 600×600px | ✓ Pass | Rendered correctly with MM_TO_PX conversion |
| SVG overlays | ⚠ Partial | Placeholder borders; real SVGs not yet delivered |
| Drag-and-drop reorder | ✓ Pass | Smooth, visual feedback, re-renders on drop |
| Caption generation | ✓ Pass | API wired to `generateCaption` Cloud Function |
| Caption overlay on left page | ⚠ Needs tuning | Rendered, but position/size pending spec (TO-DO #36) |
| Print/PDF export | ✓ Pass | `window.print()` with clean CSS scoping |
| Resolution warning | ✓ Pass | Warns if < 1500px on shortest side |
| RAW format block | ✓ Pass | Detects by MIME type, shows error message |
| Fit staff mental model | ⚠ Needs review | Tool is clear, but some UX details could be refined |

**Overall:** Brief is 85% complete. Remaining 15% is polish and spec tuning (caption position, SVG delivery, font loading).

---

## Recommendation

### Go / No-Go

**✓ GO** — Deploy for internal staff use with the following caveats:

1. **Before first daily use (today):**
   - Fix Issue #1 (load NT Comic font) — 5 minutes
   - Fix Issue #2 (correct typographic rules function) — 10 minutes
   - Add comment to Issue #3 (caption position is pending spec) — 1 minute
   
   These three fixes take 15 minutes and remove the biggest UX gotchas.

2. **Before the second day of use:**
   - Fix Issue #6 (SVG loading feedback) — optional but nice
   - Address Issue #5 (warning banner colours) — 10 minutes
   
3. **After designer provides caption spec (TO-DO #36):**
   - Measure exact caption position, size, width
   - Update `updateCaptionOverlay()` with finalized values
   - Ask designer to export SVG overlays for all 4 variants

4. **Track ongoing:**
   - Monitor for any staff feedback on caption visibility, drag-drop clarity, or sequencing mistakes
   - Adjust based on real usage patterns

### Confidence Level
**High.** The tool is fundamentally sound. Issues are refinements, not structural failures. Staff will be able to do their jobs immediately, and the tool will become more polished as these fixes and specs are incorporated.

---

## Summary Table

| Issue | Priority | Impact | Fix Time | Status |
|---|---|---|---|---|
| NT Comic font not loaded | High | Captions render in fallback font | 5 min | Unfixed |
| Typographic rules broken | High | Widows/orphans in caption text | 10 min | Unfixed |
| Caption position not finalized | High | Pending user spec (TO-DO #36) | Pending | Unfixed |
| Caption CSS missing weights | Medium | Unclear if intended styling | 5 min | Unfixed |
| Warning banner off-brand colours | Medium | Yellow alert doesn't fit Aevia | 10 min | Unfixed |
| SVG loading failures silent | Medium | Staff won't know SVGs are missing | 10 min | Unfixed |
| Drag feedback weak on mobile | Low | Small screen drag targets hard to see | 5 min | Cosmetic |
| Resequence button doesn't disable | Low | Button always works, but UI suggests it might be broken | 5 min | Cosmetic |
| Debug panel in print styles | Low | Minor print CSS detail | 5 min | Cosmetic |
| No keyboard accessibility | Low | Drag-drop mouse-only | 20 min | Cosmetic |

---

## Questions for Handoff

1. **Caption spec (TO-DO #36):** When will the user share the reference image for caption position/size?
2. **NT Comic font:** Is this available on Google Fonts, or should it be self-hosted? Check licensing.
3. **SVG overlays:** Designer deliverable expected when? (Blocking: can't finalize without these.)
4. **Warning banner:** Should dismiss button be added, or keep as-is?
5. **Accessibility:** Is keyboard accessibility a hard requirement for staff tools, or nice-to-have?

---

## Files to Update (if all fixes applied)

| File | Changes | Estimated Time |
|---|---|---|
| `pages/spread-preview.html` | Load NT Comic (link); fix typographic rules function; add font-weight to CSS; update warning colours; improve SVG error feedback; add caption position comment | ~45 min total |

---

**End of Review**
