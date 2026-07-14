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
 * Cover geometry: total wrap 428mm = back 200 + spine 28 + front 200 (from the
 *   cover SVG viewBox 1213.228px / 2.835 px/mm; the CSV spine-caption centre at
 *   x=214 corroborates). ⚠ 28mm is unusually thick vs Tender's 9mm — confirm with
 *   Xenia before print. Cover coords below are WITH-BLEED (18mm) box-centres.
 *
 * ⚠ The cover SVG contains LIVE <text> (the back-cover "Curated by" quote,
 *   Mulish variable ref) — everything else is outlined. Verify it renders with the
 *   registered Mulish or ask Xenia to outline it.
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
      spine: { xMm: 200, wMm: 28,  bgColor: '#f2c7de' },
      front: { xMm: 228, wMm: 200, bgColor: '#efe7d3' },
    },
    mockupEdges: { front: '#efe7d3', spine: '#f2c7de', back: '#f2c7de' },
    // Four square photos around the centred title (grid centre x=341 with-bleed).
    // Each supports the standard reposition drag.
    slots: [
      { key: 'coverTop',    xMm: 341, yMm: 59,  wMm: 60, hMm: 60, pool: 'cover', ratio: '1:1' },
      { key: 'coverLeft',   xMm: 277, yMm: 123, wMm: 60, hMm: 60, pool: 'cover', ratio: '1:1' },
      { key: 'coverRight',  xMm: 405, yMm: 123, wMm: 60, hMm: 60, pool: 'cover', ratio: '1:1' },
      { key: 'coverBottom', xMm: 341, yMm: 187, wMm: 60, hMm: 60, pool: 'cover', ratio: '1:1' },
    ],
    // Front title wraps inside its 52×43 box (autoShrink keeps long titles inside).
    // Spine: TWO rotated labels — box dims are pre-rotation (w = length along the
    // spine), same convention as Tender's spine caption.
    captions: [
      { key: 'name',     xMm: 341, yMm: 118, wMm: 52, hMm: 43, font: 'Lora',   sizePt: 35, style: 'regular', align: 'center', color: '#d94027', autoShrink: true, label: 'Front — title',     placeholder: 'Hot Getaway in Milan', maxLength: 40 },
      { key: 'subtitle', xMm: 341, yMm: 146, wMm: 40, hMm: 8,  font: 'Mulish', sizePt: 20, style: 'light',   align: 'center', color: '#d94027', label: 'Front — sub label',  placeholder: 'July, 2026', maxLength: 40 },
      { key: 'spine',    xMm: 232, yMm: 66,  wMm: 60, hMm: 5,  font: 'Lora',   sizePt: 12, style: 'regular', align: 'center', color: '#d94027', rotate: 270, label: 'Spine — label',     placeholder: 'Hot Getaway in Milan', maxLength: 40 },
      { key: 'spineSub', xMm: 232, yMm: 198, wMm: 20, hMm: 5,  font: 'Mulish', sizePt: 12, style: 'light',   align: 'center', color: '#d94027', rotate: 270, label: 'Spine — sub label', placeholder: 'July, 2026', maxLength: 40 },
    ]
  },

  scale: 3,
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

    SP1: {
      type: 'standard', id: 'SP1', label: 'Spread 1',
      pages: {
        left: {
          H: { bgColor: '#efe7d3', svg: 'SP Spread 1/SP 01 H Left.svg', overlayBelow: true,
            slots: [ { slot: 1, x: 75, y: 53, xBleed: 78, yBleed: 56, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
                     { slot: 2, x: 114, y: 147, xBleed: 117, yBleed: 150, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } } ] },
          V: { bgColor: '#efe7d3', svg: 'SP Spread 1/SP 01 V Left.svg', overlayBelow: true,
            slots: [ { slot: 1, x: 54, y: 62, xBleed: 57, yBleed: 65, w: 73, h: 98, ratio: '73:98', caption: { allowed: false } },
                     { slot: 2, x: 136, y: 138, xBleed: 139, yBleed: 141, w: 73, h: 98, ratio: '73:98', caption: { allowed: false } } ] },
        },
        right: {
          default: { bgColor: '#efe7d3', svg: 'SP Spread 1/SP 01 S Right.svg',
            slots: [ { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 200, h: 200, ratio: '1:1', caption: { allowed: false } } ] },
        },
      }
    },

    SP2: {
      type: 'standard', id: 'SP2', label: 'Spread 2',
      pages: {
        left: {
          H: { bgColor: '#9eb7e0', svg: 'SP Spread 2/SP 02 H Left.svg',
            slots: [ { slot: 1, x: 95, y: 77, xBleed: 98, yBleed: 80, w: 150, h: 100, ratio: '3:2', caption: { allowed: false } } ] },
          V: { bgColor: '#9eb7e0', svg: 'SP Spread 2/SP 02 V Left.svg',
            slots: [ { slot: 1, x: 95, y: 81, xBleed: 98, yBleed: 84, w: 107, h: 135, ratio: '107:135', caption: { allowed: false } } ] },
        },
        right: {
          H: { bgColor: '#d94027', svg: 'SP Spread 2/SP 02 H Right.svg',
            slots: [ { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: false } } ] },
          V: { bgColor: '#d94027', svg: 'SP Spread 2/SP 02 V Right.svg',
            slots: [ { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 120, h: 160, ratio: '3:4', caption: { allowed: false } } ] },
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
            slots: [ { slot: 1, x: 60, y: 67, xBleed: 63, yBleed: 70, w: 80, h: 107, ratio: '80:107', orient: 'vertical', zIndex: 2, caption: { allowed: true, xMm: 46, yMm: 169, wMm: 53, hMm: 46, halign: 'left', valign: 'top', font: 'Mulish', sizePt: 22, style: 'light', letterSpacing: 0, lineSpacing: 1.28, color: '#ffffff' } },
                     { slot: 2, x: 136, y: 146, xBleed: 139, yBleed: 149, w: 107, h: 80, ratio: '4:3', orient: 'horizontal', caption: { allowed: false } } ] },
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
            slots: [ { slot: 1, x: 69, y: 62, xBleed: 72, yBleed: 65, w: 73, h: 98, ratio: '73:98', caption: { allowed: false } },
                     { slot: 2, x: 152, y: 138, xBleed: 155, yBleed: 141, w: 73, h: 98, ratio: '73:98', caption: { allowed: false } } ] },
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
                     { slot: 2, x: 136, y: 146, xBleed: 139, yBleed: 149, w: 107, h: 80, ratio: '4:3', orient: 'horizontal', caption: { allowed: false } } ] },
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
            slots: [ { slot: 1, x: 54, y: 62, xBleed: 57, yBleed: 65, w: 73, h: 98, ratio: '73:98', caption: { allowed: false } },
                     { slot: 2, x: 136, y: 138, xBleed: 139, yBleed: 141, w: 73, h: 98, ratio: '73:98', caption: { allowed: false } } ] },
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
          { key: 'place', label: 'Where was it',        placeholder: 'Milan' },
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

  }
};
