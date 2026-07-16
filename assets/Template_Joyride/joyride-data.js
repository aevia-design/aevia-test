/* Joyride — playful travel photobook template (Aevia "Adventures" collection).
 * Parallel in shape to TENDER_DATA; the engine/customer-preview/PDF select between
 * templates by the order's template name (registry key 'joyride').
 * SVG paths are relative to assets/Template_Joyride/SVG/.
 *
 * Built from Joyride_sizing_full.csv + Joyride_Template_Sizing_Cover.csv (comma-
 * delimited). Square 200×200mm book, content bleed 3mm, cover wrap bleed 18mm.
 * All CSV coordinates are BOX-CENTRES (verified against photo/caption gap math and
 * the cover SVG flower positions at 2.835 px/mm).
 *
 * Fonts: Lora Regular (cover title 35pt / spine 12pt / intro title 36pt) + Mulish
 *   Light (everything else, 12–22pt). Neither is a connected script (LOW ligature
 *   risk) but both are NEW to the book pipeline → static cuts + fontkit GSUB check
 *   at the fonts stage. The variable TTFs in assets/fonts/SourceSans3/ serve the
 *   browser only; the PDF needs static Lora-Regular / Mulish-Light.
 *
 * NEW vs other templates:
 *   1. FOUR square cover photos (60×60mm) around the centred title: top / left /
 *      right / bottom. All prior templates have exactly one cover slot — the cover
 *      render + order form must iterate cover.slots, not read slots[0].
 *   2. Cover title has a SIZED text box (52×43mm at 35pt) and wraps to ~3 lines;
 *      autoShrink:true = reduce font size to keep the text inside the box
 *      (owner decision S128, maxLength 40).
 *   3. M pages (SP4 right, SP8 right): the only pages allowed to MIX orientations —
 *      slot 1 is a fixed VERTICAL frame, slot 2 a fixed HORIZONTAL frame, and the
 *      vertical photo renders ON TOP where they overlap (zIndex — design intent,
 *      deliberately NOT a CSV column; see work/joyride-template/decision-m-page-
 *      allocation.md). `mixed:true` on the variant tells the allocator to use
 *      window-local V/H matching instead of the same-orientation group rule.
 *   4. Intro page has TWO text boxes (Lora 36pt title + Mulish 22pt body) —
 *      textPanelTitle alongside the standard textPanel.
 *
 * Cover geometry: total wrap 409mm = back 200 + spine 9 + front 200 — the standard
 *   Aevia cover, same as every other template. (S128 read 428mm / a 28mm spine off
 *   the original artboard; Xenia confirmed that was an export error and re-issued
 *   both the SVG and the cover CSV at S129. Two independent checks now agree on 9mm:
 *   the SVG is 408.774×200mm, and the CSV's spine-caption centre sits at x=204.5
 *   without bleed = 200 + 9/2. The photo grid also now centres on the front page's
 *   true centre, x=309 — the old 5mm offset was the same artboard error.)
 *   Cover coords below are WITH-BLEED (18mm) box-centres.
 *
 * ⚠ The cover SVG STILL contains LIVE <text> (the back-cover "Curated by @letdorabe"
 *   quote, font-family "MulishRoman-Light"). The SVG loads via <img>, which cannot
 *   pull in our @font-face Mulish, so the quote renders in a fallback face with
 *   visibly broken letter-spacing. Ask Xenia to outline it. Cosmetic, not a blocker.
 */
window.JOYRIDE_DATA = {
  template: 'joyride',
  pageSize: 200,
  bleed: 3,
  canvasPx: 600,

  cover: {
    svg: 'Cover/Artboard 1.svg',
    sections: {
      back:  { xMm: 0,   wMm: 200, bgColor: '#f2c7de' },
      spine: { xMm: 200, wMm: 9,   bgColor: '#f2c7de' },
      front: { xMm: 209, wMm: 200, bgColor: '#efe7d3' },
    },
    mockupEdges: { front: '#efe7d3', spine: '#f2c7de', back: '#f2c7de' },
    // Four square photos around the centred title (grid centre x=327 with-bleed =
    // 309 without = the front page's true centre). Each supports the reposition drag.
    slots: [
      { key: 'coverTop',    xMm: 327, yMm: 57,  wMm: 57, hMm: 57, pool: 'cover', ratio: '1:1' },
      { key: 'coverLeft',   xMm: 266, yMm: 118, wMm: 57, hMm: 57, pool: 'cover', ratio: '1:1' },
      { key: 'coverRight',  xMm: 388, yMm: 118, wMm: 57, hMm: 57, pool: 'cover', ratio: '1:1' },
      { key: 'coverBottom', xMm: 327, yMm: 179, wMm: 57, hMm: 57, pool: 'cover', ratio: '1:1' },
    ],
    // Every cover caption sits in a FIXED box and autoShrinks to stay inside it — the
    // boxes are small and none of them can afford to overflow onto the artwork or, on
    // the spine, wrap onto a second line across a 9mm band. Spine: TWO rotated labels,
    // box dims are pre-rotation (w = length ALONG the spine), same convention as Tender.
    //
    // maxLength comes from Xenia's S129 CSV (60 front / 30 spine / 20 spine-sub) and
    // supersedes the S128 owner decision of 40. Those caps sit slightly ABOVE what the
    // boxes physically hold at full size (measured: spine label 27 chars in 60mm at Lora
    // 12pt; spine sub 16 chars in 35mm at Mulish 12pt; front sub ~24 chars in 40mm at
    // Mulish 20pt) — autoShrink is what makes the caps safe rather than a silent overflow.
    captions: [
      { key: 'name',     xMm: 327,   yMm: 112, wMm: 50, hMm: 41, font: 'Lora',   sizePt: 28, style: 'regular', halign: 'center', valign: 'center', color: '#d94027', autoShrink: true, label: 'Front — title',     placeholder: 'Hot Getaway in Milan', maxLength: 60 },
      { key: 'subtitle', xMm: 327,   yMm: 140, wMm: 40, hMm: 8,  font: 'Mulish', sizePt: 20, style: 'light',   halign: 'center', valign: 'center', color: '#d94027', autoShrink: true, label: 'Front — sub label',  placeholder: 'July, 2026', maxLength: 60 },
      { key: 'spine',    xMm: 222.5, yMm: 61,  wMm: 60, hMm: 5,  font: 'Lora',   sizePt: 14, style: 'regular', halign: 'center', valign: 'center', color: '#d94027', autoShrink: true, rotate: 270, label: 'Spine — label',     placeholder: 'Hot Getaway in Milan', maxLength: 60 },
      { key: 'spineSub', xMm: 222.5, yMm: 193, wMm: 40, hMm: 5,  font: 'Mulish', sizePt: 14, style: 'light',   halign: 'center', valign: 'center', color: '#d94027', autoShrink: true, rotate: 270, label: 'Spine — sub label', placeholder: 'July, 2026', maxLength: 60 },
    ]
  },

  scale: 3,
  // Joyride's inner artwork has irregular shapes that hide the default top-left ✥
  // reposition affordance; centre it on the photo instead (S131 owner request).
  repositionHandle: 'center',
  fonts: { display: 'Lora', body: 'Mulish' },
  fontPicker: ['Lora', 'Mulish'],
  colors: {
    cream:  '#efe7d3',
    pink:   '#f2c7de',
    red:    '#d94027',
    yellow: '#f9d84d',
    green:  '#476045',
    sage:   '#c2dbcc',
    blue:   '#9eb7e0',
    ink:    '#231f20',
  },

  spreads: {

    SP0: {
      type: 'standard', id: 'SP0', label: 'Spread 0', rightOnly: true,
      pages: {
        right: {
          H: { bgColor: '#c2dbcc', svg: 'SP Spread 0/SP 00 H Right.svg',
            slots: [ { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 168, wMm: 115, hMm: 10, halign: 'center', valign: 'top', font: 'Mulish', sizePt: 22, style: 'light', letterSpacing: 0, lineSpacing: 1.28, color: '#231f20' } } ] },
          V: { bgColor: '#c2dbcc', svg: 'SP Spread 0/SP 00 V Right.svg',
            slots: [ { slot: 1, x: 105, y: 94, xBleed: 108, yBleed: 97, w: 120, h: 150, ratio: '4:5', caption: { allowed: true, xMm: 108, yMm: 185, wMm: 115, hMm: 10, halign: 'center', valign: 'top', font: 'Mulish', sizePt: 22, style: 'light', letterSpacing: 0, lineSpacing: 1.28, color: '#231f20' } } ] },
        },
      }
    },

    // S131: spreads 1 & 2 swapped (Xenia reorder). SP1 now carries the single-photo
    // blue/red layout (was SP2); SP2 now carries the two-photo cream "art-below" layout
    // (was SP1). SVG files were physically moved between the two folders to match.
    SP1: {
      type: 'standard', id: 'SP1', label: 'Spread 1',
      pages: {
        left: {
          H: { bgColor: '#9eb7e0', svg: 'SP Spread 1/SP 01 H Left.svg',
            slots: [ { slot: 1, x: 94.3, y: 77, xBleed: 97.3, yBleed: 80, w: 150, h: 100, ratio: '3:2', caption: { allowed: false } } ] },
          V: { bgColor: '#9eb7e0', svg: 'SP Spread 1/SP 01 V Left.svg',
            slots: [ { slot: 1, x: 95, y: 81, xBleed: 98, yBleed: 84, w: 107, h: 135, ratio: '107:135', caption: { allowed: false } } ] },
        },
        right: {
          H: { bgColor: '#d94027', svg: 'SP Spread 1/SP 01 H Right.svg',
            slots: [ { slot: 1, x: 104.3, y: 100, xBleed: 107.3, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: false } } ] },
          V: { bgColor: '#d94027', svg: 'SP Spread 1/SP 01 V Right.svg',
            slots: [ { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 120, h: 160, ratio: '3:4', caption: { allowed: false } } ] },
        },
      }
    },

    SP2: {
      type: 'standard', id: 'SP2', label: 'Spread 2',
      pages: {
        left: {
          H: { bgColor: '#efe7d3', svg: 'SP Spread 2/SP 02 H Left.svg', overlayBelow: true,
            slots: [ { slot: 1, x: 75, y: 53, xBleed: 78, yBleed: 56, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
                     { slot: 2, x: 114, y: 147, xBleed: 117, yBleed: 150, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } } ] },
          V: { bgColor: '#efe7d3', svg: 'SP Spread 2/SP 02 V Left.svg', overlayBelow: true,
            slots: [ { slot: 1, x: 52, y: 62, xBleed: 55, yBleed: 65, w: 74, h: 99, ratio: '74:99', caption: { allowed: false } },
                     { slot: 2, x: 137.5, y: 137.5, xBleed: 140.5, yBleed: 140.5, w: 74, h: 99, ratio: '74:99', caption: { allowed: false } } ] },
        },
        right: {
          default: { bgColor: '#efe7d3', svg: 'SP Spread 2/SP 02 S Right.svg',
            slots: [ { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 200, h: 200, ratio: '1:1', caption: { allowed: false } } ] },
        },
      }
    },

    SP3: {
      type: 'standard', id: 'SP3', label: 'Spread 3',
      pages: {
        left: {
          H: { bgColor: '#f2c7de', svg: 'SP Spread 3/SP 03 H Left.svg',
            slots: [ { slot: 1, x: 95, y: 100, xBleed: 98, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 98, yMm: 168, wMm: 115, hMm: 10, halign: 'center', valign: 'top', font: 'Mulish', sizePt: 22, style: 'light', letterSpacing: 0, lineSpacing: 1.28, color: '#d94027' } } ] },
          V: { bgColor: '#f2c7de', svg: 'SP Spread 3/SP 03 V Left.svg',
            slots: [ { slot: 1, x: 95, y: 95, xBleed: 98, yBleed: 98, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 98, yMm: 188, wMm: 115, hMm: 10, halign: 'center', valign: 'top', font: 'Mulish', sizePt: 22, style: 'light', letterSpacing: 0, lineSpacing: 1.28, color: '#d94027' } } ] },
        },
        right: {
          // Full-bleed square photo (206×206 over the 206mm canvas), no background.
          default: { bgColor: '#efe7d3', svg: 'SP Spread 3/SP 03 S Right.svg',
            slots: [ { slot: 1, x: 100, y: 100, xBleed: 103, yBleed: 103, w: 206, h: 206, ratio: '1:1', fullBleed: true, caption: { allowed: false } } ] },
        },
      }
    },

    SP4: {
      type: 'standard', id: 'SP4', label: 'Spread 4',
      pages: {
        left: {
          H: { bgColor: '#c2dbcc', svg: 'SP Spread 4/SP 04 H Left.svg',
            slots: [ { slot: 1, x: 95, y: 120, xBleed: 98, yBleed: 123, w: 150, h: 100, ratio: '3:2', caption: { allowed: false } } ] },
          V: { bgColor: '#c2dbcc', svg: 'SP Spread 4/SP 04 V Left.svg',
            slots: [ { slot: 1, x: 79, y: 104, xBleed: 82, yBleed: 107, w: 120, h: 160, ratio: '3:4', caption: { allowed: false } } ] },
        },
        right: {
          // M page — the mixed-orientation exception (see header note 3). Single
          // fixed variant: slot 1 vertical ON TOP (zIndex 2), slot 2 horizontal.
          default: { bgColor: '#476045', svg: 'SP Spread 4/SP 04 M Right.svg', mixed: true,
            slots: [ { slot: 1, x: 60, y: 66.7, xBleed: 63, yBleed: 69.7, w: 80, h: 107, ratio: '80:107', orient: 'vertical', zIndex: 2, caption: { allowed: true, xMm: 46, yMm: 169, wMm: 53, hMm: 46, halign: 'left', valign: 'top', font: 'Mulish', sizePt: 22, style: 'light', letterSpacing: 0, lineSpacing: 1.28, color: '#ffffff' } },
                     { slot: 2, x: 135.7, y: 145.7, xBleed: 138.7, yBleed: 148.7, w: 107, h: 80, ratio: '4:3', orient: 'horizontal', caption: { allowed: false } } ] },
        },
      }
    },

    SP5: {
      type: 'standard', id: 'SP5', label: 'Spread 5',
      pages: {
        left: {
          default: { bgColor: '#f9d73c', svg: 'SP Spread 5/SP 05 S Left.svg',
            slots: [ { slot: 1, x: 95, y: 100, xBleed: 98, yBleed: 103, w: 90, h: 90, ratio: '1:1', caption: { allowed: false } } ] },
        },
        right: {
          default: { bgColor: '#f2c7de', svg: 'SP Spread 5/SP 05 S Right.svg',
            slots: [ { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 200, h: 200, ratio: '1:1', caption: { allowed: false } } ] },
        },
      }
    },

    SP6: {
      type: 'standard', id: 'SP6', label: 'Spread 6',
      pages: {
        left: {
          H: { bgColor: '#f9d84d', svg: 'SP Spread 6/SP 06 H Left.svg',
            slots: [ { slot: 1, x: 95, y: 100, xBleed: 98, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 98, yMm: 168, wMm: 115, hMm: 10, halign: 'center', valign: 'top', font: 'Mulish', sizePt: 22, style: 'light', letterSpacing: 0, lineSpacing: 1.28, color: '#d94027' } } ] },
          V: { bgColor: '#f9d84d', svg: 'SP Spread 6/SP 06 V Left.svg',
            slots: [ { slot: 1, x: 95, y: 95, xBleed: 98, yBleed: 98, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 98, yMm: 188, wMm: 115, hMm: 10, halign: 'center', valign: 'top', font: 'Mulish', sizePt: 22, style: 'light', letterSpacing: 0, lineSpacing: 1.28, color: '#d94027' } } ] },
        },
        right: {
          default: { bgColor: '#efe7d3', svg: 'SP Spread 6/SP 06 S Right.svg',
            slots: [ { slot: 1, x: 100, y: 100, xBleed: 103, yBleed: 103, w: 206, h: 206, ratio: '1:1', fullBleed: true, caption: { allowed: false } } ] },
        },
      }
    },

    SP7: {
      type: 'standard', id: 'SP7', label: 'Spread 7',
      pages: {
        left: {
          H: { bgColor: '#9eb7e0', svg: 'SP Spread 7/SP 07 H Left.svg',
            slots: [ { slot: 1, x: 95, y: 100, xBleed: 98, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 98, yMm: 168, wMm: 115, hMm: 10, halign: 'center', valign: 'top', font: 'Mulish', sizePt: 22, style: 'light', letterSpacing: 0, lineSpacing: 1.28, color: '#d94027' } } ] },
          V: { bgColor: '#9eb7e0', svg: 'SP Spread 7/SP 07 V Left.svg',
            slots: [ { slot: 1, x: 95, y: 94, xBleed: 98, yBleed: 97, w: 120, h: 150, ratio: '4:5', caption: { allowed: true, xMm: 98, yMm: 185, wMm: 115, hMm: 10, halign: 'center', valign: 'top', font: 'Mulish', sizePt: 22, style: 'light', letterSpacing: 0, lineSpacing: 1.28, color: '#d94027' } } ] },
        },
        right: {
          H: { bgColor: '#9eb7e0', svg: 'SP Spread 7/SP 07 H Right.svg',
            slots: [ { slot: 1, x: 105, y: 50, xBleed: 108, yBleed: 53, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
                     { slot: 2, x: 105, y: 150, xBleed: 108, yBleed: 153, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } } ] },
          V: { bgColor: '#9eb7e0', svg: 'SP Spread 7/SP 07 V Right.svg',
            slots: [ { slot: 1, x: 69, y: 62, xBleed: 72, yBleed: 65, w: 74, h: 99, ratio: '74:99', caption: { allowed: false } },
                     { slot: 2, x: 152, y: 138, xBleed: 155, yBleed: 141, w: 74, h: 99, ratio: '74:99', caption: { allowed: false } } ] },
        },
      }
    },

    SP8: {
      type: 'standard', id: 'SP8', label: 'Spread 8',
      pages: {
        left: {
          H: { bgColor: '#f7e9dd', svg: 'SP Spread 8/SP 08 H Left.svg',
            slots: [ { slot: 1, x: 95, y: 120, xBleed: 98, yBleed: 123, w: 150, h: 100, ratio: '3:2', caption: { allowed: false } } ] },
          V: { bgColor: '#f7e9dd', svg: 'SP Spread 8/SP 08 V Left.svg',
            slots: [ { slot: 1, x: 79, y: 104, xBleed: 82, yBleed: 107, w: 120, h: 160, ratio: '3:4', caption: { allowed: false } } ] },
        },
        right: {
          // M page — same fixed mixed layout as SP4 right, sage colourway.
          default: { bgColor: '#c2dbcc', svg: 'SP Spread 8/SP 08 M Right.svg', mixed: true,
            slots: [ { slot: 1, x: 60, y: 67, xBleed: 63, yBleed: 70, w: 80, h: 107, ratio: '80:107', orient: 'vertical', zIndex: 2, caption: { allowed: true, xMm: 46, yMm: 169, wMm: 53, hMm: 46, halign: 'left', valign: 'top', font: 'Mulish', sizePt: 22, style: 'light', letterSpacing: 0, lineSpacing: 1.28, color: '#231f20' } },
                     { slot: 2, x: 135.7, y: 146, xBleed: 138.7, yBleed: 149, w: 107, h: 80, ratio: '4:3', orient: 'horizontal', caption: { allowed: false } } ] },
        },
      }
    },

    SP9: {
      type: 'standard', id: 'SP9', label: 'Spread 9',
      pages: {
        left: {
          H: { bgColor: '#f2c7de', svg: 'SP Spread 9/SP 09 H Left.svg', overlayBelow: true,
            slots: [ { slot: 1, x: 75, y: 53, xBleed: 78, yBleed: 56, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
                     { slot: 2, x: 114, y: 147, xBleed: 117, yBleed: 150, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } } ] },
          V: { bgColor: '#f2c7de', svg: 'SP Spread 9/SP 09 V Left.svg', overlayBelow: true,
            slots: [ { slot: 1, x: 52, y: 62, xBleed: 55, yBleed: 65, w: 74, h: 99, ratio: '74:99', caption: { allowed: false } },
                     { slot: 2, x: 137.5, y: 137.8, xBleed: 140.5, yBleed: 140.8, w: 74, h: 99, ratio: '74:99', caption: { allowed: false } } ] },
        },
        right: {
          default: { bgColor: '#f2c7de', svg: 'SP Spread 9/SP 09 S Right.svg',
            slots: [ { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 200, h: 200, ratio: '1:1', caption: { allowed: false } } ] },
        },
      }
    },

    // ── FPintro — Intro (text only). OPENS the book, replacing standard SP0 when
    //    selected (same mechanic as Tender/Newborn Intro; the CSV labels the page
    //    "Left" but the intro renders on the right page like every other template).
    //    TWO text boxes: textPanelTitle (Lora 36) + textPanel body (Mulish 22). ──
    FPintro: {
      type: 'functional', id: 'FPintro', label: 'Intro',
      replacesFirstSpread: true,
      rightOnly: true,
      orderFormPhoto: null,
      // Draft fields — customer-facing copy gets a /stop-slop pass + owner review
      // at the order-form stage (Phase B).
      orderFormMeta: {
        introFields: true,
        heading: 'Your trip',
        fields: [
          { key: 'place', label: 'Where you went',      placeholder: 'Milan' },
          { key: 'when',  label: 'When',                placeholder: 'July, 2026' },
          { key: 'line',  label: 'A line to remember it by', placeholder: 'Two days of sun, trains and gelato.' },
        ],
        hint: 'A few details about the trip. We set them on the opening page.',
        compose: (v) => `${v.line}\n\n${v.place}, ${v.when}`
      },
      pages: {
        right: {
          default: {
            bgColor: '#f9d84d',
            svg: 'FP Intro/FP 00 Intro.svg',
            slots: [],
            textPanelTitle: { caption: { allowed: true, xMm: 108, yMm: 63, wMm: 120, hMm: 15, halign: 'center', valign: 'center', font: 'Lora', sizePt: 36, style: 'regular', letterSpacing: 0, lineSpacing: 1.28, color: '#d94027' } },
            textPanel: { introFields: true, caption: { allowed: true, xMm: 108, yMm: 107, wMm: 100, hMm: 50, halign: 'center', valign: 'center', font: 'Mulish', sizePt: 22, style: 'light', letterSpacing: 0, lineSpacing: 1.28, color: '#d94027' } }
          },
        },
      }
    },

    // ── FP1 — Travel map + itinerary (1:1 with Wander, owner decision S129) ──────
    // Joyride is a travel template too, so it reuses Wander's map page wholesale:
    // the six region maps, the pin, the right-page itinerary art and the coordinate
    // table are BYTE-IDENTICAL copies of Wander's (verified S129). Left page = the
    // regional map with one pin per selected country; right page = the framed
    // itinerary text panel staff format from the customer's raw route. No photo.
    // TYPE + COLOUR are Joyride's as of S129 (owner re-did the CSV row): itinerary in
    //   Lora 28pt Regular, red #d94027 on yellow #f9d84d. The MAP IMAGES + the right
    //   page's frame SVG are still Wander's ARTWORK (cream parchment map, navy labels)
    //   — those are raster/vector art, not CSV-driven, so restyling them needs Xenia.
    FP1: {
      orderFormPhoto: null,
      orderFormMeta: { countrySelect: true, sameRegionOnly: true, textPrompt: 'Your route', hint: 'List the places on your trip, in order, and we\'ll lay out the itinerary for you.', placeholder: 'e.g. Vienna → Hallstatt → Salzburg → Innsbruck' },
      type: 'functional', id: 'FP1', label: 'Travel map', mapPage: true,
      pin: { png: 'FP Spread 1 - Special Files/GEO pin.png', wMm: 12, hMm: 23, anchor: 'center' },
      // region code (from mapCoordinates) → left-page map image
      maps: {
        'EU':         'FP Spread 1/FP 01 Left EU.png',
        'Asia':       'FP Spread 1/FP 01 Left Asia.png',
        'Africa':     'FP Spread 1/FP 01 Left Africa.png',
        'N.America':  'FP Spread 1/FP 01 Left N.America.png',
        'S.America':  'FP Spread 1/FP 01 Left S.America.png',
        'Oceania':    'FP Spread 1/FP 01 Left Oceania.png',
      },
      pages: {
        left: {
          // svg is set at render time from `maps[region]`; mapCanvas flags pin overlay.
          default: { bgColor: '#f9d84d', svg: null, mapCanvas: true, slots: [] },
        },
        right: {
          default: {
            bgColor: '#f9d84d',
            svg: 'FP Spread 1/FP 01 Right.svg',
            slots: [],
            textPanel: { caption: { allowed: true, xMm: 108, yMm: 94, wMm: 136, hMm: 70, halign: 'center', valign: 'center', font: 'Mulish', sizePt: 20, style: 'light', letterSpacing: 0, lineSpacing: 1.28, color: '#d94027' }, itinerary: true }
          },
        },
      }
    },

  },

  mapCoordinates: {
    // ── EU ──
    "Iceland": { region: "EU", xMm: 35, yMm: 20 },
    "Norway": { region: "EU", xMm: 88, yMm: 50 },
    "Sweden": { region: "EU", xMm: 107, yMm: 42 },
    "Finland": { region: "EU", xMm: 132, yMm: 38 },
    "Denmark": { region: "EU", xMm: 89, yMm: 80 },
    "United Kingdom": { region: "EU", xMm: 53, yMm: 79 },
    "Ireland": { region: "EU", xMm: 36, yMm: 84 },
    "Netherlands": { region: "EU", xMm: 78, yMm: 96 },
    "Belgium": { region: "EU", xMm: 71, yMm: 104 },
    "Luxembourg": { region: "EU", xMm: 77, yMm: 112 },
    "Germany": { region: "EU", xMm: 99, yMm: 102 },
    "France": { region: "EU", xMm: 60, yMm: 118 },
    "Switzerland": { region: "EU", xMm: 82, yMm: 126 },
    "Austria": { region: "EU", xMm: 103, yMm: 123 },
    "Czechia": { region: "EU", xMm: 103, yMm: 112 },
    "Slovakia": { region: "EU", xMm: 128, yMm: 117 },
    "Poland": { region: "EU", xMm: 117, yMm: 96 },
    "Hungary": { region: "EU", xMm: 130, yMm: 123 },
    "Slovenia": { region: "EU", xMm: 111, yMm: 131 },
    "Croatia": { region: "EU", xMm: 113, yMm: 137 },
    "Bosnia and Herzegovina": { region: "EU", xMm: 119, yMm: 140 },
    "Serbia": { region: "EU", xMm: 125, yMm: 139 },
    "Montenegro": { region: "EU", xMm: 125, yMm: 153 },
    "Kosovo": { region: "EU", xMm: 129, yMm: 150 },
    "North Macedonia": { region: "EU", xMm: 134, yMm: 155 },
    "Albania": { region: "EU", xMm: 127, yMm: 158 },
    "Romania": { region: "EU", xMm: 141, yMm: 128 },
    "Moldova": { region: "EU", xMm: 148, yMm: 120 },
    "Bulgaria": { region: "EU", xMm: 155, yMm: 146 },
    "Ukraine": { region: "EU", xMm: 167, yMm: 104 },
    "Belarus": { region: "EU", xMm: 143, yMm: 88 },
    "Estonia": { region: "EU", xMm: 137, yMm: 62 },
    "Latvia": { region: "EU", xMm: 139, yMm: 72 },
    "Lithuania": { region: "EU", xMm: 125, yMm: 82 },
    "Portugal": { region: "EU", xMm: 17, yMm: 156 },
    "Spain": { region: "EU", xMm: 30, yMm: 156 },
    "Italy": { region: "EU", xMm: 92, yMm: 139 },
    "Greece": { region: "EU", xMm: 136, yMm: 163 },
    "Turkey": { region: "EU", xMm: 169, yMm: 159 },
    "Cyprus": { region: "EU", xMm: 187, yMm: 180 },
    // ── Asia ──
    "Russia": { region: "Asia", xMm: 106, yMm: 35 },
    "Kazakhstan": { region: "Asia", xMm: 76, yMm: 58 },
    "Mongolia": { region: "Asia", xMm: 124, yMm: 64 },
    "Georgia": { region: "Asia", xMm: 36, yMm: 54 },
    "Armenia": { region: "Asia", xMm: 35, yMm: 57 },
    "Azerbaijan": { region: "Asia", xMm: 39, yMm: 57 },
    "Syria": { region: "Asia", xMm: 21, yMm: 68 },
    "Lebanon": { region: "Asia", xMm: 17, yMm: 70 },
    "Israel": { region: "Asia", xMm: 17, yMm: 77 },
    "Jordan": { region: "Asia", xMm: 20, yMm: 78 },
    "Iraq": { region: "Asia", xMm: 30, yMm: 73 },
    "Saudi Arabia": { region: "Asia", xMm: 25, yMm: 98 },
    "Yemen": { region: "Asia", xMm: 36, yMm: 123 },
    "Oman": { region: "Asia", xMm: 56, yMm: 112 },
    "UAE": { region: "Asia", xMm: 54, yMm: 107 },
    "Kuwait": { region: "Asia", xMm: 37, yMm: 92 },
    "Qatar": { region: "Asia", xMm: 44, yMm: 103 },
    "Bahrain": { region: "Asia", xMm: 42, yMm: 101 },
    "Iran": { region: "Asia", xMm: 49, yMm: 79 },
    "Uzbekistan": { region: "Asia", xMm: 61, yMm: 67 },
    "Turkmenistan": { region: "Asia", xMm: 56, yMm: 74 },
    "Kyrgyzstan": { region: "Asia", xMm: 83, yMm: 71 },
    "Tajikistan": { region: "Asia", xMm: 75, yMm: 76 },
    "Afganistan": { region: "Asia", xMm: 70, yMm: 83 },
    "Pakistan": { region: "Asia", xMm: 82, yMm: 94 },
    "India": { region: "Asia", xMm: 89, yMm: 105 },
    "Sri Lanka": { region: "Asia", xMm: 90, yMm: 141 },
    "China": { region: "Asia", xMm: 129, yMm: 83 },
    "Nepal": { region: "Asia", xMm: 97, yMm: 98 },
    "Bhutan": { region: "Asia", xMm: 103, yMm: 101 },
    "Bangladesh": { region: "Asia", xMm: 104, yMm: 105 },
    "Myanmar": { region: "Asia", xMm: 118, yMm: 113 },
    "Laos": { region: "Asia", xMm: 129, yMm: 113 },
    "Thailand": { region: "Asia", xMm: 121, yMm: 120 },
    "Cambodia": { region: "Asia", xMm: 129, yMm: 128 },
    "Vietnam": { region: "Asia", xMm: 134, yMm: 128 },
    "Malaysia": { region: "Asia", xMm: 145, yMm: 146 },
    "Singapore": { region: "Asia", xMm: 125, yMm: 152 },
    "Indonesia": { region: "Asia", xMm: 140, yMm: 156 },
    "Philippines": { region: "Asia", xMm: 157, yMm: 127 },
    "Taiwan": { region: "Asia", xMm: 149, yMm: 106 },
    "North Korea": { region: "Asia", xMm: 155, yMm: 66 },
    "South Korea": { region: "Asia", xMm: 153, yMm: 77 },
    "Japan": { region: "Asia", xMm: 172, yMm: 80 },
    "Brunei": { region: "Asia", xMm: 140, yMm: 141 },
    "Timor-Leste": { region: "Asia", xMm: 164, yMm: 177 },
    "Maldives": { region: "Asia", xMm: 73, yMm: 150 },
    // ── Africa ──
    "Egypt": { region: "Africa", xMm: 135, yMm: 34 },
    "Morocco": { region: "Africa", xMm: 46, yMm: 21 },
    "Algeria": { region: "Africa", xMm: 66, yMm: 30 },
    "Tunisia": { region: "Africa", xMm: 79, yMm: 15 },
    "Libya": { region: "Africa", xMm: 113, yMm: 37 },
    "Western Sahara": { region: "Africa", xMm: 30, yMm: 38 },
    "Mauritania": { region: "Africa", xMm: 38, yMm: 51 },
    "Mali": { region: "Africa", xMm: 54, yMm: 59 },
    "Niger": { region: "Africa", xMm: 89, yMm: 57 },
    "Chad": { region: "Africa", xMm: 114, yMm: 63 },
    "Sudan": { region: "Africa", xMm: 149, yMm: 63 },
    "Eritrea": { region: "Africa", xMm: 158, yMm: 64 },
    "Djibouti": { region: "Africa", xMm: 167, yMm: 75 },
    "Ethiopia": { region: "Africa", xMm: 151, yMm: 86 },
    "Somalia": { region: "Africa", xMm: 183, yMm: 82 },
    "Senegal": { region: "Africa", xMm: 21, yMm: 66 },
    "The Gambia": { region: "Africa", xMm: 19, yMm: 74 },
    "Guinea-Bissau": { region: "Africa", xMm: 21, yMm: 78 },
    "Guinea": { region: "Africa", xMm: 36, yMm: 81 },
    "Sierra Leone": { region: "Africa", xMm: 29, yMm: 88 },
    "Liberia": { region: "Africa", xMm: 33, yMm: 89 },
    "Cote d'Ivoire": { region: "Africa", xMm: 44, yMm: 83 },
    "Ghana": { region: "Africa", xMm: 56, yMm: 83 },
    "Togo": { region: "Africa", xMm: 61, yMm: 83 },
    "Benin": { region: "Africa", xMm: 67, yMm: 79 },
    "Burkina Faso": { region: "Africa", xMm: 57, yMm: 72 },
    "Nigeria": { region: "Africa", xMm: 73, yMm: 79 },
    "Cameroon": { region: "Africa", xMm: 94, yMm: 88 },
    "Equatorial Guinea": { region: "Africa", xMm: 84, yMm: 103 },
    "Sao Tome and Principe": { region: "Africa", xMm: 75, yMm: 107 },
    "Gabon": { region: "Africa", xMm: 89, yMm: 106 },
    "Congo": { region: "Africa", xMm: 103, yMm: 105 },
    "Democratic Republic of the Congo": { region: "Africa", xMm: 126, yMm: 108 },
    "Central African Republic": { region: "Africa", xMm: 117, yMm: 84 },
    "South Sudan": { region: "Africa", xMm: 127, yMm: 88 },
    "Uganda": { region: "Africa", xMm: 146, yMm: 99 },
    "Rwanda": { region: "Africa", xMm: 138, yMm: 108 },
    "Burundi": { region: "Africa", xMm: 136, yMm: 113 },
    "Kenya": { region: "Africa", xMm: 152, yMm: 103 },
    "Tanzania": { region: "Africa", xMm: 145, yMm: 118 },
    "Angola": { region: "Africa", xMm: 96, yMm: 130 },
    "Zambia": { region: "Africa", xMm: 124, yMm: 137 },
    "Malawi": { region: "Africa", xMm: 142, yMm: 135 },
    "Mozambique": { region: "Africa", xMm: 150, yMm: 143 },
    "Zimbabwe": { region: "Africa", xMm: 132, yMm: 146 },
    "Namibia": { region: "Africa", xMm: 93, yMm: 149 },
    "Botswana": { region: "Africa", xMm: 112, yMm: 153 },
    "South Africa": { region: "Africa", xMm: 106, yMm: 176 },
    "Lesotho": { region: "Africa", xMm: 128, yMm: 171 },
    "Eswatini": { region: "Africa", xMm: 134, yMm: 164 },
    "Madagascar": { region: "Africa", xMm: 177, yMm: 143 },
    "Comoros": { region: "Africa", xMm: 170, yMm: 125 },
    "Seychelles": { region: "Africa", xMm: 189, yMm: 116 },
    "Mauritius": { region: "Africa", xMm: 194, yMm: 149 },
    "Reunion": { region: "Africa", xMm: 186, yMm: 151 },
    // ── N.America ──
    "Canada": { region: "N.America", xMm: 79, yMm: 53 },
    "United States": { region: "N.America", xMm: 111, yMm: 100 },
    "Alaska (USA)": { region: "N.America", xMm: 45, yMm: 22 },
    "Hawaii (USA)": { region: "N.America", xMm: 33, yMm: 151 },
    "Mexico": { region: "N.America", xMm: 87, yMm: 140 },
    "Greenland (Denmark)": { region: "N.America", xMm: 177, yMm: 15 },
    "The Bahamas": { region: "N.America", xMm: 138, yMm: 141 },
    "Cuba": { region: "N.America", xMm: 129, yMm: 149 },
    "Jamaica": { region: "N.America", xMm: 138, yMm: 161 },
    "Haiti": { region: "N.America", xMm: 162, yMm: 160 },
    "Dominican Republic": { region: "N.America", xMm: 166, yMm: 161 },
    "Puerto Rico (USA)": { region: "N.America", xMm: 175, yMm: 164 },
    "Belize": { region: "N.America", xMm: 111, yMm: 161 },
    "Guatemala": { region: "N.America", xMm: 108, yMm: 166 },
    "El Salvador": { region: "N.America", xMm: 111, yMm: 170 },
    "Honduras": { region: "N.America", xMm: 117, yMm: 166 },
    "Nicaragua": { region: "N.America", xMm: 119, yMm: 173 },
    "Costa Rica": { region: "N.America", xMm: 119, yMm: 179 },
    "Panama": { region: "N.America", xMm: 125, yMm: 183 },
    // ── S.America ──
    "Peru": { region: "S.America", xMm: 58, yMm: 61 },
    "Colombia": { region: "S.America", xMm: 59, yMm: 18 },
    "Venezuela": { region: "S.America", xMm: 94, yMm: 15 },
    "Ecuador": { region: "S.America", xMm: 46, yMm: 36 },
    "Guyana": { region: "S.America", xMm: 103, yMm: 16 },
    "Suriname": { region: "S.America", xMm: 117, yMm: 20 },
    "French Guiana (France)": { region: "S.America", xMm: 126, yMm: 26 },
    "Trinidad & Tobago": { region: "S.America", xMm: 96, yMm: 9 },
    "Brazil": { region: "S.America", xMm: 127, yMm: 63 },
    "Bolivia": { region: "S.America", xMm: 87, yMm: 80 },
    "Paraguay": { region: "S.America", xMm: 101, yMm: 97 },
    "Chile": { region: "S.America", xMm: 69, yMm: 137 },
    "Argentina": { region: "S.America", xMm: 89, yMm: 140 },
    "Uruguay": { region: "S.America", xMm: 112, yMm: 128 },
    // ── Oceania ──
    "Australia": { region: "Oceania", xMm: 51, yMm: 94 },
    "Papua New Guinea": { region: "Oceania", xMm: 68, yMm: 44 },
    "Solomon Islands": { region: "Oceania", xMm: 107, yMm: 44 },
    "New Caledonia (France)": { region: "Oceania", xMm: 121, yMm: 108 },
    "Fiji": { region: "Oceania", xMm: 139, yMm: 88 },
    "New Zealand": { region: "Oceania", xMm: 153, yMm: 144 },
    "Samoa": { region: "Oceania", xMm: 176, yMm: 72 },
    "Tonga": { region: "Oceania", xMm: 180, yMm: 113 }
  }
};
