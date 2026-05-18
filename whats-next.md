<original_task>
Build the Aevia spread preview tool — a staff-facing browser tool that takes 3 photos, sequences by EXIF date, picks the correct layout variant, and renders a spread preview with drag-and-drop reordering.
</original_task>

<work_completed>
## Spread preview tool — pages/spread-preview.html

### What was built
A fully functional staff browser tool for Spread 1 of the Toddler template:
- Upload 3 photos via file picker (JPEG, HEIC/HEIF supported)
- Reads EXIF date metadata to sequence photos chronologically
- Filename number extraction as fallback sequencing (e.g. IMG_5256 → 5256) when EXIF unavailable
- Detects orientation from final image dimensions (reliable, EXIF-independent)
- Picks left variant (L1 horizontal / L2 vertical) and right variant (R1 HH / R2 VV) — R3 removed
- Renders spread at 600×600px per page with photos placed at spec coordinates
- SVG overlays slot in as top layer (placeholder border shown until SVG files delivered)
- Drag-and-drop between slots to manually reorder — template re-renders automatically
- "↺ By date" button resets to chronological order
- Caption text field with "Generate caption" button (calls GPT-4o mini vision API)
- Caption rendered visually on left page (EB Garamond, Plum #493955, bottom-center)
- Print button → window.print() with print CSS that hides all UI chrome
- Per-photo resolution warning if below 1500px on shortest side (300 DPI × 150mm threshold)
- RAW format detection with clear block message (ProRAW not accepted, matches print industry standard)

### Session fixes (this session)
- **Caption rendered on page (#33)**: EB Garamond overlay at bottom-center of left page, updates live as user types
- **PDF export (#34)**: Print button wired to window.print(); dashed slot borders hidden in print via CSS scoping
- **R3 removed (#35)**: Mixed H+V right page eliminated; smart reorder algorithm moves odd-orientation photo to left slot automatically
- **Sequencing fallback**: EXIF date → filename trailing number → upload order (3-tier cascade)
- **Slot border fix**: border scoped to `.photo-slot:not(.has-photo)` so filled slots are clean in print/PDF

### Deployed
Live at: https://aevia-test.pages.dev/pages/spread-preview
Cloudflare Pages auto-deploys from GitHub main branch.
</work_completed>

<work_remaining>
## Spread preview tool — next fix

### 36. Adjust caption size and position on left page (High)
Caption overlay is rendered but size and position need tuning. User will share reference image/spec.
Current defaults: 13px EB Garamond, bottom-center, 18px from bottom.
File: `pages/spread-preview.html` — `.page-caption` CSS class.

## PDF / preview delivery architecture (decided, not yet built)
- Client preview = browser link (HTML render + Approve button), NOT a PDF download
- Puppeteer PDF only at print submission stage (TO-DO #4)
- No immediate action needed — current window.print() is sufficient for staff internal use

## Customer-facing sequencing tool — direction decided, pending Kseniia sign-off

⚠️ **Discuss with Kseniia before building.**

**Decision:** The internal spread preview tool becomes the customer preview interface — same engine, constrained UI. When Aevia sends the preview link, customer sees their photos pre-sequenced and pre-captioned. They can:
- Drag to reorder photos between slots
- Edit caption text freely
- Press "Approve & Pay" when happy

**What they cannot do:** change template, layout variants, fonts, margins — all design decisions stay locked.

**Caption regeneration:** No "Generate" button on the customer side. Aevia generates captions in the staff tool before sending the link. Customer edits the pre-written text manually. Zero API cost on customer side, and the pre-filled captions add to the "magical first impression" feeling.

**Rationale:** Eliminates revision back-and-forth before payment. Customers hold private information (sequence preference, caption content) that Aevia structurally cannot supply. Giving them this instrument costs little — it's the same tool. The brand promise shifts from "we do everything" to "we handle all design decisions, you tell us your story" — which is more honest and more sustainable operationally.

## Other pending work (pre-existing)
- Dashboard: add `previewUrl` input field (TO-DO #2)
- Auto-email customer when status → `review_sent` (TO-DO #3)
- Build Puppeteer PDF pipeline (TO-DO #4)
- 6 missing product pages: vows, radiance, wander, terrain, sprout, wonder
- `motif-engine/` and `functions/caption/` still untracked in git
</work_remaining>

<open_questions>
1. Caption position: user to share reference image for exact font size, line width, and Y position spec
2. SVG overlays: designer hasn't delivered SVG files yet — placeholder borders remain
</open_questions>

<current_state>
## Spread preview tool
- Core functionality: complete and deployed ✓
- HEIC + orientation detection: working ✓
- Drag-and-drop reorder: working ✓
- Caption generation API: wired and working ✓
- Caption rendered on page: working ✓ (position/size TBD — TO-DO #36)
- PDF export (staff): working via window.print() ✓
- R3 mixed variant: removed ✓
- Smart reorder (avoid mixed right page): working ✓
- Filename fallback sequencing: working ✓
- Resolution warning: working ✓
- RAW format block: working ✓
- SVG overlays: placeholder borders only (designer hasn't delivered SVG files yet)

## Firebase backend
- `convertHeic`, `generateCaption`, `createUploadSession` — all deployed and live
- `exifr` added as dependency (for HEIC EXIF reading in convertHeic function)

## Cloudflare Pages
- Auto-deploys from GitHub main
- Live URL: https://aevia-test.pages.dev
- Business plan PDF removed from repo to stay under 25 MB file limit
</current_state>
