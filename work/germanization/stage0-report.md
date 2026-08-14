# Germanization Stage 0 — DE drop validation report (S177)

Checked: 33 DE-suffixed files (29 SVG + 4 TXT) + every functional-page SVG referenced by the
eight template data files, rendered side-by-side in `contact-sheet.html` (view with the dev
server: `/work/germanization/contact-sheet.html`). Static checks in `stage0-static-checks.mjs`.

## Verdict per template

| Template | DE SVGs | State |
|---|---|---|
| Tender | 2 + intro txt | ✅ **Complete & clean** (outlined, correct fonts, viewBox matches) |
| Wander | 1 | ✅ Complete & clean |
| Joyride | 1 | ✅ Complete & clean |
| Laguna | 1 | ✅ Complete & clean |
| Heirloom ×4 | 3 each + intro txt | ✅ Complete & clean (Beige "Brown" names are labels only — owner confirmed) |
| Newborn | 0 + 2 txt | ✅ Nothing needed — its FP artwork carries no words; DE lives in the predefined-text files |
| Scribble | 6 | ⚠ 4 orientation variants missing; one oversized file |
| Papercut | 5 + 1 mis-named | ❌ All its DE files carry LIVE text; 4 variants missing; two files are enormous |

## Findings for Xenia (re-exports needed)

### 1. Papercut: every DE file has live `<text>` instead of outlines — MUST re-export
The font (Myriad Variable Concept) is not embedded, so browsers/PDF render a fallback with
broken kerning — visible in the contact sheet as "ALLES GUTEHUM GEBURTSTAG", "ERSTE SCHRTE",
and serif "KUNSTGALERIE" while the EN versions are outlined and correct. Files:
- `FP Spread 1 Birthday/FP Birthday 01 Left-DE.svg`
- `FP Spread 2 Words/FP Words 03 Left-DE.svg`
- `FP Spread 3 Toys/FP Toy 05 Left-DE.svg`
- `FP Spread 4 Steps/FP Steps 07 Left.svg` ← also **mis-named**: German content, no `-DE`
  suffix, no H marker
- `FP Spread 5 Art/FP Art 09 Left-DE.svg`, `FP Art 09 Right-DE.svg`
Same convention as the cover brief: **no live `<text>` at all — outline everything.**

### 2. Oversized files: embedded rasters that the EN versions don't have
- `Papercut … Toy 05 Left-DE.svg` — **66 MB** (2 embedded images; EN is 8 KB, none)
- `Papercut … Birthday 01 Left-DE.svg` — **63 MB** (1 embedded image; EN is 9 KB, none)
- `Scribble … Birthday 01 L-DE.svg` — **13 MB**, 6 embedded images vs EN's 5 (extra raster)
Anything over 25 MiB **breaks the whole Cloudflare deploy silently**; over ~8 MB an SVG
silently drops from the PDF. Re-export without the embedded raster(s).

### 3. Missing orientation variants — narrowed to the four ART pages only (validated S177)
Owner suspected H and V share the same artwork; path-level comparison confirms it for Toys and
Steps in both templates (identical paths, ≤0.07mm jitter) — **one DE file serves both
orientations there; no extra exports needed.** But on all four Art pages the outlined
"ART GALLERY" heading sits **exactly 5mm higher in the V variant**, baked into the SVG paths —
almost certainly to clear the taller portrait photo window, so reusing the H file risks the
heading crowding the photo. Still needed in German:
- Scribble: `FP Art 09 V L`, `FP Art 12 V R`
- Papercut: `FP Art 09 V Left`, `FP Art 09 V Right` (part of the Papercut re-export anyway —
  same artwork as H with the heading block 5mm higher)

### Not needed (confirmed by render): 
right-hand pages of Scribble/Papercut Birthday, Words, Toys, Steps spreads carry no words;
Newborn's intro/labour artwork carries no words; Heirloom "Why" right pages carry no words.

## Green lights
- All DE viewBoxes match their EN counterparts (Scribble's 566.929 vs 566.93 is rounding noise).
- Tender / Wander / Joyride / Laguna / Heirloom DE files are outlined, correctly fonted,
  size-matched to EN — ready to wire as-is.
- The 4 predefined-text TXT files (Heirloom, Tender, Newborn ×2) all have EN counterparts.

## Interim decision available
Stages 1–5 can proceed with the clean templates while Xenia re-exports Papercut and the eight
V variants — the fallback-to-EN rule means partial coverage degrades gracefully.
