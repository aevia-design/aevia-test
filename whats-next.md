<original_task>
Build the Aevia spread preview tool — a staff-facing browser tool that takes 3 photos, sequences by EXIF date, picks the correct layout variant, and renders a spread preview with drag-and-drop reordering.
</original_task>

<work_completed>
## Spread preview tool — pages/spread-preview.html

### What was built
A fully functional staff browser tool for Spread 1 of the Toddler template:
- Upload 3 photos via file picker (JPEG, HEIC/HEIF supported)
- Reads EXIF date metadata to sequence photos chronologically
- Detects orientation from final image dimensions (reliable, EXIF-independent)
- Picks left variant (L1 horizontal / L2 vertical) and right variant (R1/R2/R3)
- Renders spread at 600×600px per page with photos placed at spec coordinates
- SVG overlays slot in as top layer (placeholder border shown until SVG files delivered)
- Drag-and-drop between slots to manually reorder — template re-renders automatically
- "↺ By date" button resets to chronological order
- Caption text field with "Generate caption" button (calls GPT-4o mini vision API)

### Fixes applied this session
- **HEIC portrait orientation**: removed EXIF-based orientation detection entirely; always use `naturalWidth/naturalHeight` on the final converted image
- **macOS Photos app upload**: HEIC files from Photos app have no MIME type/extension — fixed with magic-byte detection (ISO BMFF `ftyp` header)
- **Drag-and-drop stop-sign cursor**: browser was intercepting drag on `<img>` elements — fixed with `img.draggable = false`
- **R3 slot assignment**: horizontal photo was landing in vertical slot and vice versa — fixed by matching photos to slots by orientation shape before rendering

### Deployed
Live at: https://aevia-test.pages.dev/pages/spread-preview
Cloudflare Pages auto-deploys from GitHub main branch.

Also fixed: removed `assets/business plan/` PDF (26.7 MB) from repo — was blocking Cloudflare deploy. Added to `.gitignore`.
</work_completed>

<work_remaining>
## Spread preview tool — next fixes (TO-DOS #33–35)

### 33. Render caption on page (High)
Caption is generated in a text field below the spread but not placed visually on the left page.
Target position: bottom-center of left page, ~Y:170mm from top.
Font: NT Comic or EB Garamond, color Plum (#493955).

### 34. PDF export button (High)
Add export button. Simplest approach: `window.print()` with print CSS that hides UI chrome.
Higher fidelity: server-side Puppeteer (needs Firebase Function).

### 35. Remove R3 mixed variant (High)
Decision needed: when photos[1] and [2] have mixed orientations (one H, one V),
what should the tool do?
- Option A: Show a warning — "these two photos have different orientations, please reorder manually"
- Option B: Fall back silently to photos[1]'s orientation (ignore photos[2]'s orientation)
**User to decide before implementing.**

## Other pending work (pre-existing)
- Dashboard: add `previewUrl` input field (TO-DO #2)
- Auto-email customer when status → `review_sent` (TO-DO #3)
- Build Puppeteer PDF pipeline (TO-DO #4)
- 6 missing product pages: vows, radiance, wander, terrain, sprout, wonder
- `motif-engine/` and `functions/caption/` still untracked in git
</work_remaining>

<open_questions>
1. R3 removal: when 2 right-page photos have mixed orientations, show warning or silently fall back? (needed for TO-DO #35)
2. Caption on page: which font — NT Comic or EB Garamond? What font size?
3. PDF export: browser print CSS (fast, free) or Puppeteer (higher fidelity, needs backend)?
</open_questions>

<current_state>
## Spread preview tool
- Core functionality: complete and deployed ✓
- HEIC + orientation detection: working ✓
- Drag-and-drop reorder: working ✓
- Caption generation API: wired and working ✓
- Caption rendered on page: NOT YET (text field only)
- PDF export: NOT YET
- R3 mixed variant: still active — removal pending decision
- SVG overlays: placeholder borders only (designer hasn't delivered SVG files yet)

## Firebase backend
- `convertHeic`, `generateCaption`, `createUploadSession` — all deployed and live
- `exifr` added as dependency (for HEIC EXIF reading in convertHeic function)

## Cloudflare Pages
- Auto-deploys from GitHub main
- Live URL: https://aevia-test.pages.dev
- Business plan PDF removed from repo to stay under 25 MB file limit
</current_state>
