/* Tender — couples / wedding photobook template (Aevia "Love" collection).
 * Parallel in shape to NEWBORN_DATA; the engine/customer-preview/PDF select between
 * templates by the order's template name (registry key 'tender').
 * SVG paths are relative to assets/Template_Tender/.
 *
 * Built from Tender_sizing_full.csv + Tender_Template_Sizing_Cover.csv (semicolon-
 * delimited Excel export). Square 200×200mm book, content bleed 3mm, cover wrap bleed 18mm.
 *
 * Font: Parisienne (single Regular weight) everywhere — cover, spine, all captions and
 *   functional text. Caption colour #7c746e (warm taupe). Parisienne is a connected
 *   cursive script (HIGH ligature risk → fontkit GSUB check before PDF).
 *
 * Standard-spread photo geometry matches the Newborn CSV family (same SP 0x SVG naming,
 *   same coordinates). What differs from Newborn: page bgColors (cream #fbf8f6 / greige
 *   #ddd3ce, not white), caption font/colour, and some pages render their decorative art
 *   UNDER the photos (overlay_position=below in the CSV → overlayBelow:true here): Spread 0
 *   right pages, and all of Spread 3 (both left and right pages).
 *
 * Caption letterSpacing: the CSV column reads "10" = InDesign tracking (1/1000 em). The
 *   engine applies letterSpacing as em, so that is 0.01 here (wider tracking suits the
 *   cursive). Do NOT write 10 — that would be 10em.
 *
 * NEW vs other templates:
 *   1. Cover has a CUSTOM elliptical photo opening. The SVG clip is an <ellipse>
 *      (cx 875.906 cy 240.053 rx 211.963 ry 139.155 in the cover viewBox); converted to
 *      an equivalent two-arc path in cover.clipShapes.coverFrame so it reuses the generic
 *      cover-clip render (same 2.835 px/mm as Newborn — identical 409mm cover width).
 *   2. THREE text functional spreads, all optional except Intro's placement:
 *      - FPintro  : text-only single page; OPENS the book, replacing standard spread 0
 *                   when selected (same as Newborn Intro). Customer fills Date / Place /
 *                   Bride / Groom; composed into the "we said I do" block (staff-editable).
 *      - FPstory  : optional full spread — left page square photo, right page an editable
 *                   "Our story" text panel (customer provides how-they-met text at order;
 *                   staff polish wording in the engine).
 *      - FPwords  : optional full spread — left page FULL-BLEED photo (206×206, no bg),
 *                   right page an editable "Words / vows / toasts" text panel.
 *   3. overlay_position (CSV) → overlayBelow on a page: art objects render under photos.
 */
window.TENDER_DATA = {
  template: 'tender',
  pageSize: 200,
  bleed: 3,
  canvasPx: 600,

  cover: {
    svg: 'Cover/Artboard 1.svg',
    sections: {
      back:  { xMm: 0,   wMm: 200, bgColor: '#fbf8f6' },
      spine: { xMm: 200, wMm: 9,   bgColor: '#fbf8f6' },
      front: { xMm: 209, wMm: 200, bgColor: '#fbf8f6' },
    },
    mockupEdges: { front: '#fbf8f6', spine: '#fbf8f6', back: '#fbf8f6' },
    // Cover coords are WITH-BLEED (18mm) and box-CENTRE; the render subtracts COVER_BLEED_MM.
    // The cover photo is clipped to clipShapes.coverFrame (the elliptical opening).
    slots: [
      { key: 'cover', xMm: 327, yMm: 103, wMm: 150, hMm: 100, pool: 'cover', orientation: 'landscape', clipShape: 'coverFrame' }
    ],
    // Elliptical front-cover opening, expressed as a path in the cover SVG's space.
    // viewBox 1159.37×566.929 over a 409mm-wide trim cover ⇒ 2.835 px/mm, origin at the
    // trim top-left (NO bleed offset). Ellipse cx875.906 cy240.053 rx211.963 ry139.155.
    clipShapes: {
      coverFrame: {
        pxPerMm: 2.835,          // 1159.37 / 409
        bboxPx: { minX: 663.943, minY: 100.898, maxX: 1087.869, maxY: 379.208 },
        d: 'M663.943,240.053 a211.963,139.155 0 1,0 423.926,0 a211.963,139.155 0 1,0 -423.926,0 Z'
      }
    },
    // Front: couple's names (Parisienne 48pt) + subtitle (Parisienne 18pt). Spine: label
    // (Parisienne, rotated 270). Front captions = taupe #7c746e; the spine label is
    // cream #fbf8f6 per the cover CSV (it sits on the dark #8a817a spine band).
    captions: [
      { key: 'name',     xMm: 328, yMm: 175, wMm: 150, hMm: 20, font: 'Parisienne', sizePt: 48, align: 'center', color: '#7c746e', letterSpacing: 0.01, label: 'Front — title',    placeholder: 'Our wedding',   maxLength: 60 },
      { key: 'subtitle', xMm: 328, yMm: 195, wMm: 150, hMm: 12, font: 'Parisienne', sizePt: 18, align: 'center', color: '#7c746e', letterSpacing: 0.01, label: 'Front — subtitle',  placeholder: 'We found love', maxLength: 60 },
      { key: 'spine',    xMm: 222, yMm: 118, wMm: 45,  hMm: 8,  font: 'Parisienne', sizePt: 18, align: 'center', color: '#fbf8f6', letterSpacing: 0.01, rotate: 270, label: 'Spine — label', placeholder: 'Our wedding', maxLength: 60 },
    ]
  },

  scale: 3,
  fonts: { display: 'Parisienne', body: 'Parisienne' },
  fontPicker: ['Parisienne'],
  colors: {
    taupe:  '#7c746e',
    cream:  '#fbf8f6',
    greige: '#ddd3ce',
    paper:  '#fbf8f6',
  },

  spreads: {

    SP0: {
      type: 'standard', id: 'SP0', label: 'Spread 0', rightOnly: true,
      pages: {
        right: {
          H: { bgColor: '#fbf8f6', svg: 'SP Spread 0/SP 06 H Right.svg', overlayBelow: true,
            slots: [ { slot: 1, x: 105, y: 70, xBleed: 108, yBleed: 73, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 179.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Parisienne', sizePt: 18, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#7c746e' } } ] },
          V: { bgColor: '#fbf8f6', svg: 'SP Spread 0/SP 06 V Right.svg', overlayBelow: true,
            slots: [ { slot: 1, x: 85, y: 100, xBleed: 88, yBleed: 103, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 173, yMm: 43, wMm: 40, hMm: 40, halign: 'left', valign: 'top', font: 'Parisienne', sizePt: 18, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#7c746e' } } ] },
        },
      }
    },

    SP1: {
      type: 'standard', id: 'SP1', label: 'Spread 1',
      pages: {
        left: {
          H: { bgColor: '#fbf8f6', svg: 'SP Spread 1/SP 01 H Left.svg',
            slots: [ { slot: 1, x: 95, y: 100, xBleed: 98, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 98, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Parisienne', sizePt: 18, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#7c746e' } } ] },
          V: { bgColor: '#fbf8f6', svg: 'SP Spread 1/SP 01 V Left.svg',
            slots: [ { slot: 1, x: 95, y: 90, xBleed: 98, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 98, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Parisienne', sizePt: 18, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#7c746e' } } ] },
        },
        right: {
          H: { bgColor: '#fbf8f6', svg: 'SP Spread 1/SP 02 H Right.svg',
            slots: [ { slot: 1, x: 105, y: 55, xBleed: 108, yBleed: 58, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
                     { slot: 2, x: 105, y: 150, xBleed: 108, yBleed: 153, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } } ] },
          V: { bgColor: '#fbf8f6', svg: 'SP Spread 1/SP 02 V Right.svg',
            slots: [ { slot: 1, x: 60, y: 100, xBleed: 63, yBleed: 103, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
                     { slot: 2, x: 150, y: 100, xBleed: 153, yBleed: 103, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } } ] },
        },
      }
    },

    SP2: {
      type: 'standard', id: 'SP2', label: 'Spread 2',
      pages: {
        left: {
          H: { bgColor: '#ddd3ce', svg: 'SP Spread 2/SP 03 H Left.svg',
            slots: [ { slot: 1, x: 95, y: 55, xBleed: 98, yBleed: 58, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
                     { slot: 2, x: 95, y: 145, xBleed: 98, yBleed: 148, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } } ] },
          V: { bgColor: '#ddd3ce', svg: 'SP Spread 2/SP 03 V Left.svg',
            slots: [ { slot: 1, x: 50, y: 130, xBleed: 53, yBleed: 133, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
                     { slot: 2, x: 140, y: 70, xBleed: 143, yBleed: 73, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } } ] },
        },
        right: {
          H: { bgColor: '#fbf8f6', svg: 'SP Spread 2/SP 04 H Right.svg',
            slots: [ { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: false } } ] },
          V: { bgColor: '#fbf8f6', svg: 'SP Spread 2/SP 04 V Right.svg',
            slots: [ { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 120, h: 160, ratio: '3:4', caption: { allowed: false } } ] },
        },
      }
    },

    SP3: {
      type: 'standard', id: 'SP3', label: 'Spread 3',
      pages: {
        left: {
          H: { bgColor: '#fbf8f6', svg: 'SP Spread 3/SP 05 H Left.svg', overlayBelow: true,
            slots: [ { slot: 1, x: 95, y: 55, xBleed: 98, yBleed: 58, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
                     { slot: 2, x: 95, y: 145, xBleed: 98, yBleed: 148, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } } ] },
          V: { bgColor: '#fbf8f6', svg: 'SP Spread 3/SP 05 V Left.svg', overlayBelow: true,
            slots: [ { slot: 1, x: 50, y: 70, xBleed: 53, yBleed: 73, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
                     { slot: 2, x: 140, y: 130, xBleed: 143, yBleed: 133, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } } ] },
        },
        right: {
          H: { bgColor: '#fbf8f6', svg: 'SP Spread 3/SP 06 H Right.svg', overlayBelow: true,
            slots: [ { slot: 1, x: 105, y: 70, xBleed: 108, yBleed: 73, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 179.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Parisienne', sizePt: 18, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#7c746e' } } ] },
          V: { bgColor: '#fbf8f6', svg: 'SP Spread 3/SP 06 V Right.svg', overlayBelow: true,
            slots: [ { slot: 1, x: 85, y: 100, xBleed: 88, yBleed: 103, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 173, yMm: 43, wMm: 40, hMm: 40, halign: 'left', valign: 'top', font: 'Parisienne', sizePt: 18, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#7c746e' } } ] },
        },
      }
    },

    SP4: {
      type: 'standard', id: 'SP4', label: 'Spread 4',
      pages: {
        left: {
          H: { bgColor: '#fbf8f6', svg: 'SP Spread 4/SP 07 H Left.svg',
            slots: [ { slot: 1, x: 95, y: 55, xBleed: 98, yBleed: 58, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
                     { slot: 2, x: 95, y: 145, xBleed: 98, yBleed: 148, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } } ] },
          V: { bgColor: '#fbf8f6', svg: 'SP Spread 4/SP 07 V Left.svg',
            slots: [ { slot: 1, x: 50, y: 100, xBleed: 53, yBleed: 103, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
                     { slot: 2, x: 140, y: 100, xBleed: 143, yBleed: 103, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } } ] },
        },
        right: {
          H: { bgColor: '#fbf8f6', svg: 'SP Spread 4/SP 08 H Right.svg',
            slots: [ { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Parisienne', sizePt: 18, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#7c746e' } } ] },
          V: { bgColor: '#fbf8f6', svg: 'SP Spread 4/SP 08 V Right.svg',
            slots: [ { slot: 1, x: 105, y: 90, xBleed: 108, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 108, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Parisienne', sizePt: 18, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#7c746e' } } ] },
        },
      }
    },

    SP5: {
      type: 'standard', id: 'SP5', label: 'Spread 5',
      pages: {
        left: {
          H: { bgColor: '#fbf8f6', svg: 'SP Spread 5/SP 09 H Left.svg',
            slots: [ { slot: 1, x: 75, y: 55, xBleed: 78, yBleed: 58, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
                     { slot: 2, x: 115, y: 145, xBleed: 118, yBleed: 148, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } } ] },
          V: { bgColor: '#fbf8f6', svg: 'SP Spread 5/SP 09 V Left.svg',
            slots: [ { slot: 1, x: 50, y: 70, xBleed: 53, yBleed: 73, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
                     { slot: 2, x: 140, y: 130, xBleed: 143, yBleed: 133, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } } ] },
        },
        right: {
          H: { bgColor: '#fbf8f6', svg: 'SP Spread 5/SP 10 H Right.svg',
            slots: [ { slot: 1, x: 105, y: 130, xBleed: 108, yBleed: 133, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 66.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Parisienne', sizePt: 18, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#7c746e' } } ] },
          V: { bgColor: '#fbf8f6', svg: 'SP Spread 5/SP 10 V Right.svg',
            slots: [ { slot: 1, x: 105, y: 110, xBleed: 108, yBleed: 113, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 108, yMm: 21.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Parisienne', sizePt: 18, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#7c746e' } } ] },
        },
      }
    },

    SP6: {
      type: 'standard', id: 'SP6', label: 'Spread 6',
      pages: {
        left: {
          H: { bgColor: '#fbf8f6', svg: 'SP Spread 6/SP 11 H Left.svg',
            slots: [ { slot: 1, x: 95, y: 100, xBleed: 98, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 98, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Parisienne', sizePt: 18, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#7c746e' } } ] },
          V: { bgColor: '#fbf8f6', svg: 'SP Spread 6/SP 11 V Left.svg',
            slots: [ { slot: 1, x: 95, y: 90, xBleed: 98, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 98, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Parisienne', sizePt: 18, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#7c746e' } } ] },
        },
        right: {
          H: { bgColor: '#ddd3ce', svg: 'SP Spread 6/SP 12 H Right.svg',
            slots: [ { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Parisienne', sizePt: 18, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#7c746e' } } ] },
          V: { bgColor: '#ddd3ce', svg: 'SP Spread 6/SP 12 V Right.svg',
            slots: [ { slot: 1, x: 105, y: 90, xBleed: 108, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 108, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Parisienne', sizePt: 18, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#7c746e' } } ] },
        },
      }
    },

    // ── FPintro — Intro (text only, no photo). OPENS the book, replacing standard SP0
    //    when selected (same mechanic as Newborn Intro). ──────────────────────────────
    FPintro: {
      type: 'functional', id: 'FPintro', label: 'Intro',
      replacesFirstSpread: true,
      rightOnly: true,
      orderFormPhoto: null,
      // Customer fills these; composeIntroBlock() (order.html, Phase B) drops them into the
      // fixed wedding-intro template. Staff can edit the composed text further in the engine.
      orderFormMeta: {
        introFields: true,
        heading: 'Your day',
        fields: [
          { key: 'date',  label: 'Wedding date',  placeholder: 'June 14th, 2026' },
          { key: 'place', label: 'Place',         placeholder: 'Vienna, Austria' },
          { key: 'bride', label: "One name",      placeholder: 'Anna' },
          { key: 'groom', label: 'Partner name',  placeholder: 'Michael' },
        ],
        hint: 'A few details about your day. We weave these into a short opening on the intro page.',
        // Composes the customer's fields into the opening block. Staff can refine the
        // wording in the engine afterwards (like the Newborn intro / Wander itinerary).
        compose: (v) => `We said "I do"\non ${v.date},\nin ${v.place}.\n\n${v.bride} & ${v.groom}`
      },
      pages: {
        right: {
          default: {
            bgColor: '#fbf8f6',
            svg: 'FP Spread 0 Intro/FP 01 Intro.svg',
            slots: [],
            textPanel: { introFields: true, caption: { allowed: true, xMm: 108, yMm: 103, wMm: 110, hMm: 100, halign: 'center', valign: 'center', font: 'Parisienne', sizePt: 22, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#7c746e' } }
          },
        },
      }
    },

    // ── FPstory — Our story (optional full spread: left square photo / right text panel) ──
    FPstory: {
      type: 'functional', id: 'FPstory', label: 'Our story',
      orderFormPhoto: { pool: 'story', count: 1, label: 'Our story photo', hint: 'One photo for the Our-story spread.' },
      orderFormMeta: {
        introFields: true,            // same mechanic as the intro: labelled fields → composed block
        heading: 'Our story',
        fields: [
          { key: 'meet',    label: 'How you met',             placeholder: 'Through work and mutual friends…' },
          { key: 'started', label: 'How your relationship started', placeholder: 'A simple hello that became coffee, long walks…' },
        ],
        hint: 'Tell us how you met. We shape it into the Our-story page and polish the wording.',
        compose: (v) => `${v.meet}\n\n${v.started}`
      },
      pages: {
        left: {
          default: { bgColor: '#ddd3ce', svg: 'FP Spread 1 Our story/FP 02 Our story Left.svg',
            slots: [ { slot: 1, x: 95, y: 100, xBleed: 98, yBleed: 103, w: 100, h: 100, ratio: '1:1', pool: 'story', caption: { allowed: false } } ] },
        },
        right: {
          default: { bgColor: '#fbf8f6', svg: 'FP Spread 1 Our story/FP 02 Our story Right.svg', slots: [],
            textPanel: { introFields: true, caption: { allowed: true, xMm: 108, yMm: 113, wMm: 120, hMm: 140, halign: 'left', valign: 'center', font: 'Parisienne', sizePt: 22, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#7c746e' } } },
        },
      }
    },

    // ── FPwords — Words (optional full spread: left FULL-BLEED photo / right text panel) ──
    FPwords: {
      type: 'functional', id: 'FPwords', label: 'Words',
      orderFormPhoto: { pool: 'words', count: 1, label: 'Words photo', hint: 'One full-bleed photo for the Words spread.' },
      orderFormMeta: {
        introFields: true,            // same mechanic as the intro: labelled fields → composed block
        heading: 'Words',
        fields: [
          { key: 'words', label: 'Vows, toasts or wishes', placeholder: 'A line or two you want to keep.' },
        ],
        hint: 'A few words: vows, a toast, a wish. We set them on the Words page.',
        compose: (v) => v.words
      },
      pages: {
        // Left page = editable text panel; right page = full-bleed photo (matches the
        // SVG names + Xenia's example. CSV labels the photo "Left H" — treat as right.)
        left: {
          default: { bgColor: '#fbf8f6', svg: 'FP Spread 2 Words/FP 03 Words Left.svg', slots: [],
            textPanel: { introFields: true, caption: { allowed: true, xMm: 98, yMm: 113, wMm: 120, hMm: 140, halign: 'left', valign: 'center', font: 'Parisienne', sizePt: 22, style: 'regular', letterSpacing: 0.01, lineSpacing: 1.28, color: '#7c746e' } } },
        },
        right: {
          default: { bgColor: '#fbf8f6', svg: 'FP Spread 2 Words/FP 03 Words Right.svg',
            slots: [ { slot: 1, x: 100, y: 100, xBleed: 103, yBleed: 103, w: 206, h: 206, ratio: '1:1', fullBleed: true, pool: 'words', caption: { allowed: false } } ] },
        },
      }
    },

  }
};
