/* Heirloom (Blue) — archival wedding photobook template (Aevia "Love" collection).
 * Parallel in shape to TENDER_DATA; registry key 'heirloom-beige'. Heirloom ships in four
 * COLOUR variants, each a fully designed sub-template with its own folder, data file and
 * registry entry (heirloom-beige, plus three colourways to come). Nothing is recoloured at
 * render time. SVG paths are relative to assets/Template_Heirloom/Blue/SVG/.
 *
 * Built from Heirloom_sizing_full_Blue.csv + Heirloom_Template_Sizing_Cover_40_Blue.csv
 * (comma-delimited export; geometry verified identical to Beige, S160). Square 200×200mm book, content bleed 3mm, cover wrap
 * bleed 18mm.
 *
 * Fonts: IM FELL English (Regular + Italic) for ALL live text — cover, spine, captions,
 *   functional panels, monogram letters. Low ligature risk (serif, not a connected script).
 *   Endalian Script exists in the drop but is OUTLINED into the SVG artwork (no <text>/
 *   font-family anywhere in the 39 SVGs) — it is never registered.
 *
 * NEW vs other templates:
 *   1. MONOGRAMS. The customer picks a family monogram (Roots / Birds / Roses) on the
 *      product page. The choice selects artwork on two surfaces — the cover SVG (monogram
 *      on the back panel) and the intro SVG — and positions four live "letter" captions:
 *      two on the intro page and two on the back cover, each showing a partner's initial.
 *      All per-monogram data lives in `monograms` below; `defaultMonogram` is the render
 *      fallback when an order carries no choice.
 *   2. The Intro is MANDATORY — always Spread 0, never an optional special page. There is
 *      no standard Spread 0 in this template (standard spreads are 1–6). The CSV labels
 *      the intro page "Left", but its x-coords (105/108) follow the right-page convention
 *      used everywhere else in the file, so it renders as a right page like Tender's intro.
 *   3. "Why I love Him/Her" is ONE optional add-on that adds TWO spreads (FPhim + FPher),
 *      each: left text panel / right full-bleed photo. Separate order-form inputs per
 *      spread (pools 'him' and 'her'); both spreads carry addonGroup 'whylove' so the
 *      order form sells them as a single add-on.
 *   4. The cover photo opening is a CUSTOM rounded-corner 80×80mm square (r = 2mm).
 *      Birds/Roses cover art sits 1.418px (0.5mm) right of Roots, so there are two clip
 *      variants; each monogram names its own via coverClipShape.
 *
 * Coordinate model (same as every template): data coords are WITH-BLEED, box-CENTRE;
 * page SVG viewBoxes frame CONTENT only (566.929 = 200mm); the cover viewBox frames the
 * TRIM — 1162.205 × 566.929 = 410×200mm at 2.83465 px/mm. 410, not 409: Heirloom's cover
 * is authored against the 40pp 10mm spine, hence referenceSpineMm 10 (Tender's is 9).
 *
 * Caption letterSpacing: CSV "10" = InDesign tracking (1/1000 em) → 0.01 em here.
 * ALL live text is dark plum #312128 — standard captions, functional text panels and
 * the four monogram letters alike. The letter and panel rows were briefly blank in the
 * CSV and were rendered taupe #7c746e on an assumption; the owner filled every
 * captions_color cell with #312128 (S158), so nothing is assumed any more. The taupe in
 * `colors` below is the palette entry, no longer used by any caption.
 */
window.HEIRLOOM_BLUE_DATA = {
  template: 'heirloom-blue',
  pageSize: 200,
  bleed: 3,
  canvasPx: 600,

  // ── Per-monogram artwork + letter-caption geometry. The engine picks cover.svg /
  //    FPintro svg / coverClipShape from here by the order's monogram; letters render the
  //    partners' initials (derived from the intro's name fields at order time).
  //    Letter coords are WITH-BLEED box-centres: intro = page bleed (3mm), back = cover
  //    wrap space (18mm). All letters IM FELL English, centre/centre, 8×9mm boxes.
  defaultMonogram: 'roots',
  monograms: {
    roots: {
      label: 'Roots',
      coverSvg: 'Cover/Cover_40_Roots.svg',
      introSvg: 'FP Spread 0 Intro/FP 01 Intro V1.svg',
      coverClipShape: 'coverFrameShifted',
      introLetters: [
        { key: 'letter1', xMm: 107.2, yMm: 152, wMm: 8, hMm: 9, font: 'IM FELL English', sizePt: 23, color: '#3d3d4f' },
        { key: 'letter2', xMm: 107.2, yMm: 174, wMm: 8, hMm: 9, font: 'IM FELL English', sizePt: 23, color: '#3d3d4f' },
      ],
      backLetters: [
        { key: 'letter1', xMm: 117.5, yMm: 107, wMm: 8, hMm: 9, font: 'IM FELL English', sizePt: 22, color: '#3d3d4f' },
        { key: 'letter2', xMm: 117.5, yMm: 130, wMm: 8, hMm: 9, font: 'IM FELL English', sizePt: 22, color: '#3d3d4f' },
      ],
    },
    birds: {
      label: 'Birds',
      coverSvg: 'Cover/Cover_40_Birds.svg',
      introSvg: 'FP Spread 0 Intro/FP 01 Intro V2.svg',
      coverClipShape: 'coverFrameShifted',
      introLetters: [
        { key: 'letter1', xMm: 106, yMm: 153, wMm: 8, hMm: 9, font: 'IM FELL English', sizePt: 23, color: '#3d3d4f' },
        { key: 'letter2', xMm: 111, yMm: 169.5, wMm: 8, hMm: 9, font: 'IM FELL English', sizePt: 23, color: '#3d3d4f' },
      ],
      backLetters: [
        { key: 'letter1', xMm: 116, yMm: 108, wMm: 8, hMm: 9, font: 'IM FELL English', sizePt: 22, color: '#3d3d4f' },
        { key: 'letter2', xMm: 121, yMm: 124.5, wMm: 8, hMm: 9, font: 'IM FELL English', sizePt: 22, color: '#3d3d4f' },
      ],
    },
    roses: {
      label: 'Roses',
      coverSvg: 'Cover/Cover_40_Roses.svg',
      introSvg: 'FP Spread 0 Intro/FP 01 Intro V3.svg',
      coverClipShape: 'coverFrameShifted',
      // Roses letters nudged by Xenia (S158): intro 95,166/121,166 → 94,167/121,167;
      // back 104,121/133,121 → 103,123/133,123. Roots and Birds were not touched.
      introLetters: [
        { key: 'letter1', xMm: 93.7,  yMm: 167, wMm: 8, hMm: 9, font: 'IM FELL English', sizePt: 23, color: '#3d3d4f' },
        { key: 'letter2', xMm: 120.7, yMm: 167, wMm: 8, hMm: 9, font: 'IM FELL English', sizePt: 23, color: '#3d3d4f' },
      ],
      backLetters: [
        { key: 'letter1', xMm: 102.7, yMm: 123, wMm: 8, hMm: 9, font: 'IM FELL English', sizePt: 22, color: '#3d3d4f' },
        { key: 'letter2', xMm: 132.7, yMm: 123, wMm: 8, hMm: 9, font: 'IM FELL English', sizePt: 22, color: '#3d3d4f' },
      ],
    },
  },

  cover: {
    // Placeholder default — the engine substitutes monograms[<choice>].coverSvg.
    svg: 'Cover/Cover_40_Roots.svg',
    sections: {
      back:  { xMm: 0,   wMm: 200, bgColor: '#afafbe' },
      // Spine band is the same beige as the panels (cover SVG rect at x 566.929, 10mm wide).
      spine: { xMm: 200, wMm: 10,  bgColor: '#afafbe' },
      front: { xMm: 210, wMm: 200, bgColor: '#afafbe' },
    },
    // Cover artwork + coordinates authored against the 40pp 10mm spine (410mm trim).
    referenceSpineMm: 10,
    mockupEdges: { front: '#afafbe', spine: '#afafbe', back: '#afafbe' },
    // Cover coords are WITH-BLEED (18mm) and box-CENTRE. Photo clipped to the rounded-
    // square opening. NOTE: the CSV's photo row gives y-with-bleed as 83 (a +3 page-style
    // offset, inconsistent with its own caption rows which use +18). The artwork's opening
    // centre is at trim y = 80mm (clip 113.386–340.159px), and the engine subtracts 18
    // from BOTH axes — so yMm here is 98 (98 − 18 = 80). Verified against the render S157.
    slots: [
      // xMm tracks the Roots opening centre (309.62 trim + 18 bleed). The second cover
      // drop moved the opening 0.62mm right; without this the photo sits off-centre in
      // the frame by that much and background shows down one edge.
      { key: 'cover', xMm: 328, yMm: 98, wMm: 80, hMm: 80, pool: 'cover', orientation: 'square', clipShape: 'coverFrameShifted' }
    ],
    // Rounded-corner 80×80mm square opening (r = 2mm), expressed in the cover SVG's space:
    // viewBox 1162.205×566.929 over the 410mm trim ⇒ 2.83465 px/mm, origin at trim
    // top-left (NO bleed offset). Birds/Roses art is shifted +1.418px (0.5mm) right.
    clipShapes: {
      // RE-EXTRACTED S158 from Xenia's second cover drop. The opening kept its 80mm
      // size but moved right (Roots +0.62mm, Birds/Roses +1.00mm) and down 0.03mm.
      // Source of truth is the `fill="none"` rounded-square PATH in each cover SVG —
      // NOT the solid rect beside it, whose x disagrees with the path by up to 1.8px.
      // Re-extract on every re-export; a stale path clips the photo off-centre.
      coverFrameShifted: {   // all three monograms in this colourway
        pxPerMm: 2.83465,
        bboxPx: { minX: 765.354, minY: 113.464, maxX: 992.127, maxY: 340.237 },
        d: 'M771.028,113.464h215.425c3.133,0,5.674,2.54,5.674,5.674v215.425c0,3.133-2.54,5.674-5.674,5.674h-215.425c-3.133,0-5.674-2.54-5.674-5.674V119.137c0-3.133,2.54-5.674,5.674-5.674Z'
      }
    },
    // Front: couple's names (IM FELL 50pt, one caption — no subtitle). Spine: label
    // rotated 270 (CSV box 6w×70h → wMm 70 / hMm 6, same swap Tender's data makes).
    // Back-cover monogram letters live in monograms[*].backLetters, not here.
    captions: [
      { key: 'name',  xMm: 327, yMm: 183, wMm: 100, hMm: 30, font: 'IM FELL English', sizePt: 50, align: 'center', color: '#3d3d4f', letterSpacing: 0.01, label: 'Front — names', placeholder: 'ANNA & MICHAEL', maxLength: 100 },
      { key: 'spine', xMm: 223, yMm: 118, wMm: 70,  hMm: 6,  font: 'IM FELL English', sizePt: 16, align: 'center', color: '#3d3d4f', letterSpacing: 0.01, rotate: 270, label: 'Spine — label', placeholder: 'Anna & Michael', maxLength: 100 },
    ]
  },

  scale: 3,
  fonts: { display: 'IM FELL English', body: 'IM FELL English' },
  fontPicker: ['IM FELL English'],
  colors: {
    plum:  '#3d3d4f',
    taupe: '#7c746e',
    beige: '#cfc4b8',
    paper: '#cfc4b8',
  },

  spreads: {

    SP1: {
      type: 'standard', id: 'SP1', label: 'Spread 1',
      pages: {
        left: {
          H: { bgColor: '#cfc4b8', svg: 'SP Spread 1/SP 01 H Left.svg',
            slots: [ { slot: 1, x: 95, y: 100, xBleed: 98, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 98, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'IM FELL English', sizePt: 16, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#3d3d4f' } } ] },
          V: { bgColor: '#cfc4b8', svg: 'SP Spread 1/SP 01 V Left.svg',
            slots: [ { slot: 1, x: 95, y: 90, xBleed: 98, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 98, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'IM FELL English', sizePt: 16, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#3d3d4f' } } ] },
        },
        right: {
          H: { bgColor: '#cfc4b8', svg: 'SP Spread 1/SP 02 H Right.svg',
            slots: [ { slot: 1, x: 105, y: 55, xBleed: 108, yBleed: 58, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
                     { slot: 2, x: 105, y: 150, xBleed: 108, yBleed: 153, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } } ] },
          V: { bgColor: '#cfc4b8', svg: 'SP Spread 1/SP 02 V Right.svg',
            slots: [ { slot: 1, x: 60, y: 100, xBleed: 63, yBleed: 103, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
                     { slot: 2, x: 150, y: 100, xBleed: 153, yBleed: 103, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } } ] },
        },
      }
    },

    SP2: {
      type: 'standard', id: 'SP2', label: 'Spread 2',
      pages: {
        left: {
          H: { bgColor: '#cfc4b8', svg: 'SP Spread 2/SP 03 H Left.svg',
            slots: [ { slot: 1, x: 95, y: 55, xBleed: 98, yBleed: 58, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
                     { slot: 2, x: 95, y: 145, xBleed: 98, yBleed: 148, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } } ] },
          V: { bgColor: '#cfc4b8', svg: 'SP Spread 2/SP 03 V Left.svg',
            slots: [ { slot: 1, x: 50, y: 130, xBleed: 53, yBleed: 133, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
                     { slot: 2, x: 140, y: 70, xBleed: 143, yBleed: 73, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } } ] },
        },
        right: {
          H: { bgColor: '#cfc4b8', svg: 'SP Spread 2/SP 04 H Right.svg',
            slots: [ { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: false } } ] },
          V: { bgColor: '#cfc4b8', svg: 'SP Spread 2/SP 04 V Right.svg',
            slots: [ { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 120, h: 160, ratio: '3:4', caption: { allowed: false } } ] },
        },
      }
    },

    SP3: {
      type: 'standard', id: 'SP3', label: 'Spread 3',
      pages: {
        left: {
          H: { bgColor: '#cfc4b8', svg: 'SP Spread 3/SP 05 H Left.svg',
            slots: [ { slot: 1, x: 95, y: 55, xBleed: 98, yBleed: 58, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
                     { slot: 2, x: 95, y: 145, xBleed: 98, yBleed: 148, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } } ] },
          V: { bgColor: '#cfc4b8', svg: 'SP Spread 3/SP 05 V Left.svg',
            slots: [ { slot: 1, x: 50, y: 70, xBleed: 53, yBleed: 73, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
                     { slot: 2, x: 140, y: 130, xBleed: 143, yBleed: 133, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } } ] },
        },
        right: {
          H: { bgColor: '#cfc4b8', svg: 'SP Spread 3/SP 06 H Right.svg',
            slots: [ { slot: 1, x: 105, y: 70, xBleed: 108, yBleed: 73, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 179.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'IM FELL English', sizePt: 16, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#3d3d4f' } } ] },
          V: { bgColor: '#cfc4b8', svg: 'SP Spread 3/SP 06 V Right.svg',
            slots: [ { slot: 1, x: 85, y: 100, xBleed: 88, yBleed: 103, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 173, yMm: 43, wMm: 40, hMm: 40, halign: 'left', valign: 'top', font: 'IM FELL English', sizePt: 16, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#3d3d4f' } } ] },
        },
      }
    },

    SP4: {
      type: 'standard', id: 'SP4', label: 'Spread 4',
      pages: {
        left: {
          H: { bgColor: '#cfc4b8', svg: 'SP Spread 4/SP 07 H Left.svg',
            slots: [ { slot: 1, x: 95, y: 55, xBleed: 98, yBleed: 58, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
                     { slot: 2, x: 95, y: 145, xBleed: 98, yBleed: 148, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } } ] },
          V: { bgColor: '#cfc4b8', svg: 'SP Spread 4/SP 07 V Left.svg',
            slots: [ { slot: 1, x: 50, y: 100, xBleed: 53, yBleed: 103, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
                     { slot: 2, x: 140, y: 100, xBleed: 143, yBleed: 103, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } } ] },
        },
        right: {
          H: { bgColor: '#cfc4b8', svg: 'SP Spread 4/SP 08 H Right.svg',
            slots: [ { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'IM FELL English', sizePt: 16, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#3d3d4f' } } ] },
          V: { bgColor: '#cfc4b8', svg: 'SP Spread 4/SP 08 V Right.svg',
            slots: [ { slot: 1, x: 105, y: 90, xBleed: 108, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 108, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'IM FELL English', sizePt: 16, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#3d3d4f' } } ] },
        },
      }
    },

    SP5: {
      type: 'standard', id: 'SP5', label: 'Spread 5',
      pages: {
        left: {
          H: { bgColor: '#cfc4b8', svg: 'SP Spread 5/SP 09 H Left.svg',
            slots: [ { slot: 1, x: 75, y: 55, xBleed: 78, yBleed: 58, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
                     { slot: 2, x: 115, y: 145, xBleed: 118, yBleed: 148, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } } ] },
          V: { bgColor: '#cfc4b8', svg: 'SP Spread 5/SP 09 V Left.svg',
            slots: [ { slot: 1, x: 50, y: 70, xBleed: 53, yBleed: 73, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
                     { slot: 2, x: 140, y: 130, xBleed: 143, yBleed: 133, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } } ] },
        },
        right: {
          H: { bgColor: '#cfc4b8', svg: 'SP Spread 5/SP 10 H Right.svg',
            slots: [ { slot: 1, x: 105, y: 130, xBleed: 108, yBleed: 133, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 66.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'IM FELL English', sizePt: 16, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#3d3d4f' } } ] },
          V: { bgColor: '#cfc4b8', svg: 'SP Spread 5/SP 10 V Right.svg',
            slots: [ { slot: 1, x: 105, y: 110, xBleed: 108, yBleed: 113, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 108, yMm: 21.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'IM FELL English', sizePt: 16, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#3d3d4f' } } ] },
        },
      }
    },

    SP6: {
      type: 'standard', id: 'SP6', label: 'Spread 6',
      pages: {
        left: {
          H: { bgColor: '#cfc4b8', svg: 'SP Spread 6/SP 11 H Left.svg',
            slots: [ { slot: 1, x: 95, y: 100, xBleed: 98, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 98, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'IM FELL English', sizePt: 16, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#3d3d4f' } } ] },
          V: { bgColor: '#cfc4b8', svg: 'SP Spread 6/SP 11 V Left.svg',
            slots: [ { slot: 1, x: 95, y: 90, xBleed: 98, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 98, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'IM FELL English', sizePt: 16, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#3d3d4f' } } ] },
        },
        right: {
          H: { bgColor: '#cfc4b8', svg: 'SP Spread 6/SP 12 H Right.svg',
            slots: [ { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'IM FELL English', sizePt: 16, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#3d3d4f' } } ] },
          V: { bgColor: '#cfc4b8', svg: 'SP Spread 6/SP 12 V Right.svg',
            slots: [ { slot: 1, x: 105, y: 90, xBleed: 108, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 108, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'IM FELL English', sizePt: 16, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#3d3d4f' } } ] },
        },
      }
    },

    // ── FPintro — Intro (text only, MANDATORY: always Spread 0; not offered as an
    //    optional special page). SVG chosen per monogram (monograms[*].introSvg); the
    //    default below is the render fallback. The two monogram initials render from
    //    monograms[*].introLetters, derived from the name fields at order time. ──────────
    FPintro: {
      type: 'functional', id: 'FPintro', label: 'Intro',
      mandatory: true,
      replacesFirstSpread: true,
      rightOnly: true,
      orderFormPhoto: null,
      orderFormMeta: {
        introFields: true,
        heading: 'Your day',
        fields: [
          { key: 'date',  label: 'Wedding date', placeholder: 'June 14th, 2026' },
          { key: 'place', label: 'Place',        placeholder: 'Vienna, Austria' },
          { key: 'bride', label: 'One name',     placeholder: 'Anna' },
          { key: 'groom', label: 'Partner name', placeholder: 'Michael' },
        ],
        // The two monogram initials are the first letters of these two fields — the
        // customer never types them separately. Order of keys = order of letters.
        initialsFrom: ['bride', 'groom'],
        hint: 'A few details about your day. We weave these into a short opening on the intro page, beside your family monogram.',
        // Canonical intro copy — assets/Template_Heirloom/Intro Page_Text.txt. Only the
        // four bracketed fields vary; the rest of the passage is fixed house copy.
        compose: (v) => `On ${v.date},\nin ${v.place},\nwe said “I do.”\n\n`
          + `Surrounded by the people we love,\nwe promised to choose each other\ntoday and always.\n\n`
          + `The beginning of our forever.\n\n${v.bride} & ${v.groom}`
      },
      pages: {
        right: {
          default: {
            bgColor: '#cfc4b8',
            svg: 'FP Spread 0 Intro/FP 01 Intro V1.svg',
            monogramSvg: true,          // engine substitutes monograms[<choice>].introSvg
            monogramLetters: 'introLetters',
            slots: [],
            textPanel: { introFields: true, caption: { allowed: true, xMm: 108, yMm: 83, wMm: 110, hMm: 100, halign: 'center', valign: 'center', font: 'IM FELL English', sizePt: 16, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#3d3d4f' } }
          },
        },
      }
    },

    // ── FPstory — Our story (optional full spread: left square photo / right text panel) ──
    FPstory: {
      type: 'functional', id: 'FPstory', label: 'Our story',
      orderFormPhoto: { pool: 'story', count: 1, label: 'Our story photo', hint: 'One photo for the Our-story spread.' },
      orderFormMeta: {
        introFields: true,
        heading: 'Our story',
        fields: [
          { key: 'meet',    label: 'How you met',                  placeholder: 'Through work and mutual friends…' },
          { key: 'started', label: 'How your relationship started', placeholder: 'A simple hello that became coffee, long walks…' },
        ],
        hint: 'Tell us how you met. We shape it into the Our-story page and polish the wording.',
        compose: (v) => `${v.meet}\n\n${v.started}`
      },
      pages: {
        left: {
          default: { bgColor: '#cfc4b8', svg: 'FP Spread 1 Our story/FP 02 Our story Left.svg',
            slots: [ { slot: 1, x: 95, y: 100, xBleed: 98, yBleed: 103, w: 100, h: 100, ratio: '1:1', pool: 'story', caption: { allowed: false } } ] },
        },
        right: {
          default: { bgColor: '#cfc4b8', svg: 'FP Spread 1 Our story/FP 02 Our story Right.svg', slots: [],
            textPanel: { introFields: true, aiCompose: true, caption: { allowed: true, xMm: 108, yMm: 98, wMm: 110, hMm: 110, halign: 'center', valign: 'center', font: 'IM FELL English', sizePt: 16, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#3d3d4f' } } },
        },
      }
    },

    // ── "Why I love Him/Her" — ONE optional add-on, TWO spreads. Each: left editable
    //    text panel / right FULL-BLEED photo. Separate order-form inputs (pools 'him' /
    //    'her'); addonGroup ties them into a single product-page add-on. ────────────────
    FPhim: {
      type: 'functional', id: 'FPhim', label: 'Why I love him',
      addonGroup: 'whylove',
      orderFormPhoto: { pool: 'him', count: 1, label: 'Why-I-love-him photo', hint: 'One full-bleed photo for the "Why I love him" spread.' },
      orderFormMeta: {
        introFields: true,
        heading: 'Why I love him',
        fields: [
          { key: 'whyhim', label: 'Why you love him', placeholder: 'The way he laughs at his own jokes…' },
        ],
        hint: 'A few lines about him. We set them on the left page, facing your photo.',
        compose: (v) => v.whyhim
      },
      pages: {
        left: {
          default: { bgColor: '#cfc4b8', svg: 'FP Spread 2 Why I love/FP 03 Why Him Left.svg', slots: [],
            textPanel: { introFields: true, caption: { allowed: true, xMm: 98, yMm: 98, wMm: 110, hMm: 110, halign: 'center', valign: 'center', font: 'IM FELL English', sizePt: 16, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#3d3d4f' } } },
        },
        right: {
          default: { bgColor: '#cfc4b8', svg: 'FP Spread 2 Why I love/FP 03 Why Him Right.svg',
            slots: [ { slot: 1, x: 100, y: 100, xBleed: 103, yBleed: 103, w: 206, h: 206, ratio: '1:1', fullBleed: true, pool: 'him', caption: { allowed: false } } ] },
        },
      }
    },

    FPher: {
      type: 'functional', id: 'FPher', label: 'Why I love her',
      addonGroup: 'whylove',
      orderFormPhoto: { pool: 'her', count: 1, label: 'Why-I-love-her photo', hint: 'One full-bleed photo for the "Why I love her" spread.' },
      orderFormMeta: {
        introFields: true,
        heading: 'Why I love her',
        fields: [
          { key: 'whyher', label: 'Why you love her', placeholder: 'The way she dances in the kitchen…' },
        ],
        hint: 'A few lines about her. We set them on the left page, facing your photo.',
        compose: (v) => v.whyher
      },
      pages: {
        left: {
          default: { bgColor: '#cfc4b8', svg: 'FP Spread 2 Why I love/FP 03 Why Her Left.svg', slots: [],
            textPanel: { introFields: true, caption: { allowed: true, xMm: 98, yMm: 98, wMm: 110, hMm: 110, halign: 'center', valign: 'center', font: 'IM FELL English', sizePt: 16, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#3d3d4f' } } },
        },
        right: {
          default: { bgColor: '#cfc4b8', svg: 'FP Spread 2 Why I love/FP 03 Why Her Right.svg',
            slots: [ { slot: 1, x: 100, y: 100, xBleed: 103, yBleed: 103, w: 206, h: 206, ratio: '1:1', fullBleed: true, pool: 'her', caption: { allowed: false } } ] },
        },
      }
    },

  }
};
