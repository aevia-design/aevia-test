/* Newborn — baby/first-months photobook template (Aevia "Kids" collection).
 * Parallel in shape to SCRIBBLE_DATA / WANDER_DATA; the engine/customer-preview/PDF
 * select between templates by the order's template name (registry key 'newborn').
 * SVG paths are relative to assets/Template_Newborn/.
 *
 * Built from Newborn_sizing_full.csv + Newborn_Template_Sizing_Cover.csv.
 * Square 200×200mm book, content bleed 3mm, cover wrap bleed 18mm.
 *
 * Fonts: Twinkle Star (cover name + spine, display) + Baskervville (cover subtitle,
 *   all spread + functional captions). Caption colour navy #262262 throughout.
 *
 * SP0–SP6 photo geometry is identical to Wander/Scribble; caption POSITIONS differ
 *   (taken from the Newborn CSV, not copied). Every page bg is white except the
 *   Labour-left page (#c0d5ee).
 *
 * NEW vs other templates:
 *   1. Cover has a CUSTOM non-rectangular photo opening (the scalloped "Image" frame).
 *      The clip silhouette lives in cover.clipShapes.coverFrame (path in cover-SVG
 *      space, 2.835 px/mm, trim origin). Render clips the cover photo to it — same
 *      idea as Scribble's heart, generalised (TO-DO #73).
 *   2. Two functional pages: FPintro (text-only, no photo) and FPlabour (a full
 *      spread: left photo+customer caption / right photo+AI caption + a zodiac
 *      constellation overlay chosen at order time).
 */
window.NEWBORN_DATA = {
  template: 'newborn',
  pageSize: 200,
  bleed: 3,
  canvasPx: 600,

  cover: {
    svg: 'Cover/Artboard 1.svg',
    referenceSpineMm: 9,  // spine width this cover was authored at
    sections: {
      back:  { xMm: 0,   wMm: 200, bgColor: '#142a4f' },
      spine: { xMm: 200, wMm: 9,   bgColor: '#c0d5ee' },  // audited S154 — matches the SVG spine rect exactly
      front: { xMm: 209, wMm: 200, bgColor: '#142a4f' },
    },
    // Visible per-surface cover colours used by the mockup composers (scripts/compose-*.mjs)
    // to tint EXPOSED board edges. Newborn is near-uniform navy; spine is the light blue.
    // Distinct from sections.bgColor (the render's background fill behind the cover SVG).
    mockupEdges: { front: '#12264b', spine: '#c0d5ee', back: '#12264b' },
    // Cover coords are WITH-BLEED (18mm) and box-CENTRE, same as Scribble/Wander; the
    // render subtracts COVER_BLEED_MM. The cover photo is clipped to clipShapes.coverFrame.
    slots: [
      { key: 'cover', xMm: 327, yMm: 103, wMm: 135, hMm: 115, pool: 'cover', orientation: 'landscape', clipShape: 'coverFrame' }
    ],
    // Custom photo silhouette (the scalloped front-cover opening). Path is in the cover
    // SVG's coordinate space: viewBox 1159.37×566.929 over a 409mm-wide trim cover =
    // 2.835 px/mm, origin at the trim top-left (NO bleed offset). Render must translate
    // it into the slot's local space and scale to canvas px (see Stage-3 render notes).
    clipShapes: {
      coverFrame: {
        pxPerMm: 2.835,          // 1159.37 / 409
        bboxPx: { minX: 684.3, minY: 80.5, maxX: 1065.7, maxY: 401.3 },
        d: 'M874.882,80.544s57.727,21.133,95.508,26.227c22.339,3.012,52.366,2.395,72.712,1.428,12.197-.58,22.639,9.062,22.639,21.273v222.908c0,12.211-10.442,21.852-22.639,21.273-20.346-.967-50.373-1.584-72.712,1.428-37.782,5.095-95.508,26.227-95.508,26.227-.091-.033-57.564-21.128-95.193-26.227-22.335-3.027-52.357-2.407-72.703-1.436-12.2.582-22.648-9.061-22.648-21.274v-222.889c0-12.214,10.448-21.857,22.648-21.274,20.346.971,50.368,1.591,72.703-1.436,37.63-5.099,95.102-26.194,95.193-26.227Z'
      }
    },
    // Front: big name (Twinkle Star) + italic subtitle (Baskervville). Spine: name/phrase
    // (Twinkle Star, rotated). `italic`/`weight` carry the CSV's intended default styling
    // (cover-caption render must honour these — Stage-3 fix).
    captions: [
      { key: 'name',     xMm: 327, yMm: 175, wMm: 115, hMm: 20, font: 'Twinkle Star', sizePt: 44, align: 'center', color: '#c0d5ee', label: 'Front — name', placeholder: 'Nico', maxLength: 24 },
      { key: 'subtitle', xMm: 327, yMm: 193, wMm: 100, hMm: 12, font: 'Baskervville', sizePt: 17, align: 'center', color: '#c0d5ee', italic: true, weight: 500, label: 'Front — subtitle / date', placeholder: 'Your First Months', maxLength: 40 },
      { key: 'spine',    xMm: 222.5, yMm: 118, wMm: 65,  hMm: 8,  font: 'Twinkle Star', sizePt: 20, align: 'center', color: '#21386e', rotate: 270, label: 'Spine — name / phrase', placeholder: 'Our Nico', maxLength: 24 },
    ]
  },

  scale: 3,
  fonts: { display: 'Twinkle Star', body: 'Baskervville' },
  // Fonts offered in the caption toolbar for this template (values match COVER_FONTS
  // in the engine). Keeps the picker scoped so staff can't apply another template's font.
  fontPicker: ['Twinkle Star', 'Baskervville'],
  colors: {
    navy:    '#262262',
    ink:     '#12264b',
    coverInk:'#21386e',
    sky:     '#c0d5ee',
    paper:   '#ffffff',
  },

  // Shared caption style for all spread + functional captions (Baskervville italic navy).
  // Repeated inline below for parity with the other data files' structure.

  spreads: {

    SP0: {
      type: 'standard', id: 'SP0', label: 'Spread 0', rightOnly: true,
      pages: {
        right: {
          H: { bgColor: '#ffffff', svg: 'SP Spread 0/SP 06 H Right.svg',
            slots: [ { slot: 1, x: 105, y: 70, xBleed: 108, yBleed: 73, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 179.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Baskervville', sizePt: 18, style: 'italic', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } } ] },
          V: { bgColor: '#ffffff', svg: 'SP Spread 0/SP 06 V Right.svg',
            slots: [ { slot: 1, x: 85, y: 100, xBleed: 88, yBleed: 103, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 173, yMm: 43, wMm: 40, hMm: 40, halign: 'left', valign: 'top', font: 'Baskervville', sizePt: 18, style: 'italic', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } } ] },
        },
      }
    },

    SP1: {
      type: 'standard', id: 'SP1', label: 'Spread 1',
      pages: {
        left: {
          H: { bgColor: '#ffffff', svg: 'SP Spread 1/SP 01 H Left.svg',
            slots: [ { slot: 1, x: 95, y: 100, xBleed: 98, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 98, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Baskervville', sizePt: 18, style: 'italic', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } } ] },
          V: { bgColor: '#ffffff', svg: 'SP Spread 1/SP 01 V Left.svg',
            slots: [ { slot: 1, x: 95, y: 90, xBleed: 98, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 98, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Baskervville', sizePt: 18, style: 'italic', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } } ] },
        },
        right: {
          H: { bgColor: '#ffffff', svg: 'SP Spread 1/SP 02 H Right.svg',
            slots: [ { slot: 1, x: 105, y: 55, xBleed: 108, yBleed: 58, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
                     { slot: 2, x: 105, y: 150, xBleed: 108, yBleed: 153, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } } ] },
          V: { bgColor: '#ffffff', svg: 'SP Spread 1/SP 02 V Right.svg',
            slots: [ { slot: 1, x: 60, y: 100, xBleed: 63, yBleed: 103, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
                     { slot: 2, x: 150, y: 100, xBleed: 153, yBleed: 103, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } } ] },
        },
      }
    },

    SP2: {
      type: 'standard', id: 'SP2', label: 'Spread 2',
      pages: {
        left: {
          H: { bgColor: '#ffffff', svg: 'SP Spread 2/SP 03 H Left.svg',
            slots: [ { slot: 1, x: 95, y: 55, xBleed: 98, yBleed: 58, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
                     { slot: 2, x: 95, y: 145, xBleed: 98, yBleed: 148, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } } ] },
          V: { bgColor: '#ffffff', svg: 'SP Spread 2/SP 03 V Left.svg',
            slots: [ { slot: 1, x: 50, y: 130, xBleed: 53, yBleed: 133, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
                     { slot: 2, x: 140, y: 70, xBleed: 143, yBleed: 73, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } } ] },
        },
        right: {
          H: { bgColor: '#ffffff', svg: 'SP Spread 2/SP 04 H Right.svg',
            slots: [ { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: false } } ] },
          V: { bgColor: '#ffffff', svg: 'SP Spread 2/SP 04 V Right.svg',
            slots: [ { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 120, h: 160, ratio: '3:4', caption: { allowed: false } } ] },
        },
      }
    },

    SP3: {
      type: 'standard', id: 'SP3', label: 'Spread 3',
      pages: {
        left: {
          H: { bgColor: '#ffffff', svg: 'SP Spread 3/SP 05 H Left.svg',
            slots: [ { slot: 1, x: 95, y: 55, xBleed: 98, yBleed: 58, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
                     { slot: 2, x: 95, y: 145, xBleed: 98, yBleed: 148, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } } ] },
          V: { bgColor: '#ffffff', svg: 'SP Spread 3/SP 05 V Left.svg',
            slots: [ { slot: 1, x: 50, y: 70, xBleed: 53, yBleed: 73, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
                     { slot: 2, x: 140, y: 130, xBleed: 143, yBleed: 133, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } } ] },
        },
        right: {
          H: { bgColor: '#ffffff', svg: 'SP Spread 3/SP 06 H Right.svg',
            slots: [ { slot: 1, x: 105, y: 70, xBleed: 108, yBleed: 73, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 141, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Baskervville', sizePt: 18, style: 'italic', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } } ] },
          V: { bgColor: '#ffffff', svg: 'SP Spread 3/SP 06 V Right.svg',
            slots: [ { slot: 1, x: 85, y: 100, xBleed: 88, yBleed: 103, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 173, yMm: 43, wMm: 40, hMm: 40, halign: 'left', valign: 'top', font: 'Baskervville', sizePt: 18, style: 'italic', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } } ] },
        },
      }
    },

    SP4: {
      type: 'standard', id: 'SP4', label: 'Spread 4',
      pages: {
        left: {
          H: { bgColor: '#ffffff', svg: 'SP Spread 4/SP 07 H Left.svg',
            slots: [ { slot: 1, x: 95, y: 55, xBleed: 98, yBleed: 58, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
                     { slot: 2, x: 95, y: 145, xBleed: 98, yBleed: 148, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } } ] },
          V: { bgColor: '#ffffff', svg: 'SP Spread 4/SP 07 V Left.svg',
            slots: [ { slot: 1, x: 50, y: 100, xBleed: 53, yBleed: 103, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
                     { slot: 2, x: 140, y: 100, xBleed: 143, yBleed: 103, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } } ] },
        },
        right: {
          H: { bgColor: '#ffffff', svg: 'SP Spread 4/SP 08 H Right.svg',
            slots: [ { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Baskervville', sizePt: 18, style: 'italic', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } } ] },
          V: { bgColor: '#ffffff', svg: 'SP Spread 4/SP 08 V Right.svg',
            slots: [ { slot: 1, x: 105, y: 90, xBleed: 108, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 108, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Baskervville', sizePt: 18, style: 'italic', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } } ] },
        },
      }
    },

    SP5: {
      type: 'standard', id: 'SP5', label: 'Spread 5',
      pages: {
        left: {
          H: { bgColor: '#ffffff', svg: 'SP Spread 5/SP 09 H Left.svg',
            slots: [ { slot: 1, x: 75, y: 55, xBleed: 78, yBleed: 58, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
                     { slot: 2, x: 115, y: 145, xBleed: 118, yBleed: 148, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } } ] },
          V: { bgColor: '#ffffff', svg: 'SP Spread 5/SP 09 V Left.svg',
            slots: [ { slot: 1, x: 50, y: 70, xBleed: 53, yBleed: 73, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
                     { slot: 2, x: 140, y: 130, xBleed: 143, yBleed: 133, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } } ] },
        },
        right: {
          H: { bgColor: '#ffffff', svg: 'SP Spread 5/SP 10 H Right.svg',
            slots: [ { slot: 1, x: 105, y: 130, xBleed: 108, yBleed: 133, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 66.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Baskervville', sizePt: 18, style: 'italic', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } } ] },
          V: { bgColor: '#ffffff', svg: 'SP Spread 5/SP 09 V Right.svg',
            slots: [ { slot: 1, x: 105, y: 110, xBleed: 108, yBleed: 113, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 108, yMm: 21.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Baskervville', sizePt: 18, style: 'italic', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } } ] },
        },
      }
    },

    SP6: {
      type: 'standard', id: 'SP6', label: 'Spread 6',
      pages: {
        left: {
          H: { bgColor: '#ffffff', svg: 'SP Spread 6/SP 11 H Left.svg',
            slots: [ { slot: 1, x: 95, y: 100, xBleed: 98, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 98, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Baskervville', sizePt: 18, style: 'italic', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } } ] },
          V: { bgColor: '#ffffff', svg: 'SP Spread 6/SP 11 V Left.svg',
            slots: [ { slot: 1, x: 95, y: 90, xBleed: 98, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 98, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Baskervville', sizePt: 18, style: 'italic', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } } ] },
        },
        right: {
          H: { bgColor: '#ffffff', svg: 'SP Spread 6/SP 12 H Right.svg',
            slots: [ { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Baskervville', sizePt: 18, style: 'italic', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } } ] },
          V: { bgColor: '#ffffff', svg: 'SP Spread 6/SP 12 V Right.svg',
            slots: [ { slot: 1, x: 105, y: 90, xBleed: 108, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 108, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Baskervville', sizePt: 18, style: 'italic', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } } ] },
        },
      }
    },

    // ── FPintro — Intro (text only, no photo) ─────────────────────────────────
    // A single page of composed text: the customer fills labelled fields
    // (name/DOB/time/weight/length); the engine composes them into the centred
    // text block. No photo upload, no orientation choice.
    FPintro: {
      type: 'functional', id: 'FPintro', label: 'Intro',
      // Intro is a single page that OPENS the book: when selected it takes the
      // first-spread slot in place of SP0 (buildBookSequence honours this flag).
      // rightOnly renders it like SP0 — blank inside-cover left, Intro on the right.
      replacesFirstSpread: true,
      rightOnly: true,
      orderFormPhoto: null,
      // The customer fills these 5 fields (all required); composeIntroBlock() in
      // order.html drops them into the fixed birth-story template. Staff can edit the
      // composed text further in the engine. Keys map into the template by name.
      orderFormMeta: {
        introFields: true,
        fields: [
          { key: 'date',   label: 'Date of birth', placeholder: '15 May, 2026' },
          { key: 'time',   label: 'Time of birth', placeholder: '6:09 a.m.' },
          { key: 'weight', label: 'Weight',        placeholder: '3.28 kg' },
          { key: 'length', label: 'Length',        placeholder: '53 cm' },
          { key: 'gender', label: 'Gender', placeholder: 'boy / girl' },
        ],
        hint: 'A few key details about your little one. We weave these into a short birth story on the intro page.'
      },
      pages: {
        // Single page (one side). svg is the fixed Intro artwork; no orientation variants.
        right: {
          default: {
            bgColor: '#ffffff',
            svg: 'FP Intro/FP 01 Intro.svg',
            slots: [],
            textPanel: { introFields: true, caption: { allowed: true, xMm: 108, yMm: 113, wMm: 93, hMm: 97, halign: 'center', valign: 'center', font: 'Baskervville', sizePt: 18, style: 'italic', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } }
          },
        },
      }
    },

    // ── FPlabour — Labour (full spread: photo + caption each side; right page also
    //    carries a zodiac constellation overlay) ─────────────────────────────────
    // Left page  : customer photo + CUSTOMER caption ("Welcome to this world, {name}!",
    //              built from the name field on the order form).
    // Right page : customer photo + a per-zodiac DEFAULT caption (zodiac.copy, pre-filled
    //              by the engine from the chosen sign; staff-editable) + the zodiac overlay.
    //              The slot keeps caption.aiGenerated:true purely as the "which side is the
    //              non-customer caption" marker the engine uses to target the fill.
    // Photos are dedicated Labour uploads (pool 'labour'), not from the main grid.
    FPlabour: {
      type: 'functional', id: 'FPlabour', label: 'Labour',
      orderFormPhoto: { pool: 'labour', count: 2, label: 'Labour photos', hint: 'Two photos from the day, one for each page of the labour spread.',
        slotHints: [
          'We recommend a photo of mum, or the whole family, with the baby around the birth.',
          'We recommend a portrait of the baby in the first hours or days.',
        ] },
      // Left page: collect just the baby's name; composeLabourLeft() in order.html
      // builds "Welcome to this world, {name}!". Right page: the chosen zodiac drives
      // both the constellation overlay AND a default caption (zodiac.copy below) that
      // the engine pre-fills; staff can edit it afterwards.
      orderFormMeta: {
        zodiacSelect: true,
        leftName: { label: "Baby's name", placeholder: 'Nico' },
      },
      // Zodiac overlay assets for the RIGHT page, keyed by orientation then sign.
      // Display name → file token (note "Sagittarius" → "Saggit"). 'None' = no overlay.
      zodiac: {
        signs: ['None','Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'],
        fileToken: { Sagittarius: 'Saggit' },   // all others = the display name verbatim
        path: function (orientation, sign) {
          if (!sign || sign === 'None') return 'FP Labour/FP 02 ' + orientation + ' Labour Right (None).svg';
          const tok = (this.fileToken[sign] || sign);
          return 'FP Labour/FP 02 ' + orientation + ' Labour Right (' + tok + ').svg';
        },
        // Default right-page caption per sign (staff-editable). The engine pre-fills the
        // AI-side caption with copy[chosenSign] on fresh order load. 'None' has its own copy.
        copy: {
          None:        'Grow bright and gentle.\nMay your heart be filled with wonder\nand love wherever life takes you.',
          Aries:       'Grow brave and bright.\nMay your fearless heart be guided\nby wonder, warmth, and love.',
          Taurus:      'Grow strong and steady.\nMay you carry quiet strength\nand a kind heart wherever life takes you.',
          Gemini:      'Grow curious and bright.\nMay your lively heart find joy\nin every story life brings.',
          Cancer:      'Grow gentle and loving.\nMay your heart feel safe\nand bring warmth wherever you go.',
          Leo:         'Grow proud and radiant.\nMay your brave heart shine with kindness wherever life takes you.',
          Virgo:       'Shine softly and wisely.\nMay your caring heart bring light\nto every small detail of life.',
          Libra:       'Shine gently and sweetly.\nMay your peaceful heart find balance\nin every beautiful moment.',
          Scorpio:     'Grow deep and brave.\nMay your passionate heart be guided\nby courage, love, and light.',
          Sagittarius: 'Shine brave and joyful.\nMay your curious spirit find light\nin every path you take.',
          Capricorn:   'Shine strong and steady.\nMay your gentle strength carry you\nthrough every step of life.',
          Aquarius:    'Grow bright and original.\nMay your open heart dream freely\nand bring light to the world.',
          Pisces:      'Grow gentle and dreamy.\nMay your tender heart carry wonder\nand kindness wherever you go.',
        }
      },
      pages: {
        left: {
          H: { bgColor: '#c0d5ee', svg: 'FP Labour/FP 02 H Labour Left.svg',
            slots: [ { slot: 1, x: 95, y: 95, xBleed: 98, yBleed: 98, w: 150, h: 100, ratio: '3:2', pool: 'labour', caption: { allowed: true, customerField: 'leftCaption', xMm: 98, yMm: 179.5, wMm: 100, hMm: 13, halign: 'center', valign: 'center', font: 'Baskervville', sizePt: 18, style: 'italic', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } } ] },
          V: { bgColor: '#c0d5ee', svg: 'FP Labour/FP 02 V Labour Left.svg',
            slots: [ { slot: 1, x: 95, y: 95, xBleed: 98, yBleed: 98, w: 100, h: 133, ratio: '3:4', pool: 'labour', caption: { allowed: true, customerField: 'leftCaption', xMm: 98, yMm: 183, wMm: 100, hMm: 13, halign: 'center', valign: 'center', font: 'Baskervville', sizePt: 18, style: 'italic', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } } ] },
        },
        right: {
          // svg is the zodiac overlay (set at render time from zodiac.path); None = empty.
          H: { bgColor: '#ffffff', svg: null, zodiacOverlay: true,
            slots: [ { slot: 1, x: 105, y: 95, xBleed: 108, yBleed: 98, w: 150, h: 100, ratio: '3:2', pool: 'labour', caption: { allowed: true, aiGenerated: true, xMm: 130.5, yMm: 173, wMm: 105, hMm: 30, halign: 'right', valign: 'top', font: 'Baskervville', sizePt: 18, style: 'italic', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } } ] },
          V: { bgColor: '#ffffff', svg: null, zodiacOverlay: true,
            slots: [ { slot: 1, x: 85, y: 100, xBleed: 88, yBleed: 103, w: 120, h: 160, ratio: '3:4', pool: 'labour', caption: { allowed: true, aiGenerated: true, xMm: 173, yMm: 63, wMm: 40, hMm: 80, halign: 'left', valign: 'top', font: 'Baskervville', sizePt: 18, style: 'italic', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } } ] },
        },
      }
    },

  }
};
