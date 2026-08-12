/* Laguna — summer/seaside travel photobook template (Aevia "Adventures" collection),
 * in collaboration with Clémence Trossevin (gouache; see docs/templates.md).
 *
 * Parallel in shape to WANDER_DATA — the engine/customer-preview/PDF select between
 * templates by the order's template name (registry key 'laguna'). SVG paths are
 * relative to assets/Template_Laguna/SVG/ (note the `SVG/` level, like Joyride and
 * unlike Wander).
 *
 * Built from Laguna_sizing_full.csv + Laguna_Template_Sizing_Cover_40.csv, both
 * SEMICOLON-delimited. All coordinates are BOX-CENTRES; interior bleed 3mm, cover
 * wrap bleed 18mm. Square 200×200mm book.
 *
 * ── Geometry note ─────────────────────────────────────────────────────────────
 * SP0–SP6 photo geometry is IDENTICAL to Wander's, slot for slot. Only the palette,
 * the fonts and the caption positions differ. That is expected: both are square
 * 200mm travel books off the same underlying grid. Caption Y positions DO differ
 * (Laguna sets several captions further from the photo — "below 50mm" on SP0/SP3),
 * so caption coords are taken from Laguna's own CSV rather than inherited.
 *
 * ── Spine: 10mm, NOT 9mm ──────────────────────────────────────────────────────
 * The cover artboard is 410mm (= back 200 + spine 10 + front 200), and the SVG's
 * spine rect measures exactly 28.346 user units = 10.00mm. This is the print
 * house's current 40pp spec; the older templates were authored at 9mm/409mm before
 * that instruction arrived. `referenceSpineMm: 10` tells all three surfaces which
 * spine the COORDINATES below assume, so the 80pp case (14mm spine, 414mm cover)
 * falls out of the existing delta maths. Same as Heirloom. Do not "fix" to 9.
 *
 * ── Cover artwork ─────────────────────────────────────────────────────────────
 * The front panel is one full-bleed gouache painting by Clémence, embedded in the
 * cover SVG as a raster. It arrived as a 36MB RGBA PNG at 406 DPI, which exceeded
 * BOTH the 25 MiB Cloudflare deploy limit and the 8MB PDF-drop threshold (and was
 * large enough that librsvg could not parse the file at all). It is now a 300 DPI
 * JPEG via scripts/optimise-laguna-rasters.mjs — re-run that after any re-export.
 * The cover carries NO live <text>; Clémence's lettering is outlined. Verified S168.
 *
 * ── Fonts ─────────────────────────────────────────────────────────────────────
 * Interior: Mulish Regular 18pt (Mulish is already in the pipeline for Joyride, but
 *   only the Light cut — Regular and Medium are new static instances).
 * Cover: Fredoka (NEW family) for the title + spine, Mulish Medium for the sub-label.
 * Neither is a connected script, so LOW ligature risk — but both still get the
 * fontkit GSUB check on all three surfaces (see project_pdf_font_rules).
 *
 * The cover CSV first named the title font "Fredoka Light Bold", which is not a real
 *   Fredoka cut, so S168 read it as Light. The owner reissued the CSV as
 *   "Fredoka Bold" and confirmed it (S170) — the title and spine are BOLD.
 *   Fredoka-Bold.ttf is the static cut from the drop, no instancing needed.
 *
 * ── Blank pages ───────────────────────────────────────────────────────────────
 * Eight of the spread SVGs are intentionally empty (139-byte stubs): those pages
 * are photos on a flat background with no artwork. Confirmed by the owner S168.
 * They are still referenced below so the render path stays uniform.
 */
window.LAGUNA_DATA = {
  template: 'laguna',
  pageSize: 200,
  bleed: 3,
  canvasPx: 600,

  cover: {
    svg: 'Cover/Artboard 1.svg',
    referenceSpineMm: 10,  // spine width this cover's COORDINATES were authored at
    // The artwork paints UNDER the cover photo. Clémence's SVG draws an opaque white
    // "Frame" rect at the photo position — it is the white margin around the photo, not
    // a window — so with the artwork on top the photo is completely hidden behind a
    // white square. Looks exactly like "the cover photo isn't loading"; it is loading,
    // it is just underneath. Same relationship as every interior page here.
    overlayAbovePhotos: false,
    sections: {
      back:  { xMm: 0,   wMm: 200, bgColor: '#1a344d' },  // SVG "Back BG Color" rect
      spine: { xMm: 200, wMm: 10,  bgColor: '#1f547b' },  // SVG "Spine Color" rect, 28.346u = 10.00mm
      front: { xMm: 210, wMm: 200, bgColor: '#fbf8f6' },  // sits behind Clémence's painting
    },
    // Exposed board-edge colours for the mockup composers (scripts/compose-*.mjs).
    // Back and spine are the flat SVG rects; front is sampled from the painting's
    // edge rather than its average, because the edge is what wraps the board.
    mockupEdges: { front: '#e8d9c0', spine: '#1f547b', back: '#1a344d' },
    // ONE square cover photo, in a white frame drawn by the artwork. The frame is
    // 108.5mm and the photo 100mm, so the artwork leaves a ~4.25mm white margin —
    // verified against the SVG's "Frame" rect, which centres on 310/93mm without
    // bleed, exactly where the CSV puts the photo.
    slots: [
      { key: 'cover', xMm: 328, yMm: 111, wMm: 100, hMm: 100, pool: 'cover', ratio: '1:1' },
    ],
    // With-bleed box centres. Cover text is FREE TEXT (staff type what suits the
    // trip); `placeholder` is only a suggestion. Per-caption font/size/colour are
    // read from each caption's OWN CSV columns — they are not uniform.
    //
    // Box dims come from the cover CSV's captions1_width/height + captions2_width/height
    // columns (added by the owner S168). Both front captions declare width 100 and leave
    // height blank, so hMm is set just above the type size to bound the box without
    // clipping. The SPINE row is the mirror image — width blank, height 100 — because
    // Xenia measures the rotated box in PAGE space, where its long axis runs vertically.
    // This file's convention is pre-rotation (w = length ALONG the spine, same as Tender
    // and Joyride), so her 100 becomes wMm, and hMm stays under the 10mm spine band.
    // Getting that backwards would put a 100mm-wide box across a 10mm spine.
    captions: [
      { key: 'front',    xMm: 328,   yMm: 180, wMm: 100, hMm: 12, font: 'Fredoka', sizePt: 30, style: 'bold',   align: 'center', color: '#ffffff', label: 'Front — album name', placeholder: 'Greece, 2026',                 maxLength: 60 },
      { key: 'frontSub', xMm: 328,   yMm: 198, wMm: 100, hMm: 8,  font: 'Mulish',  sizePt: 18, style: 'medium', align: 'center', color: '#ffffff', label: 'Front — subtitle',   placeholder: 'Where everything slowed down', maxLength: 100 },
      { key: 'spine',    xMm: 223,   yMm: 118, wMm: 100, hMm: 8,  font: 'Fredoka', sizePt: 16, style: 'bold',   align: 'center', color: '#ffffff', rotate: 270, label: 'Spine — album name', placeholder: 'Greece, 2026',    maxLength: 60 },
    ]
  },

  scale: 3,
  fonts: { display: 'Fredoka', body: 'Mulish' },
  // Fonts offered in the caption toolbar for this template (values match COVER_FONTS).
  fontPicker: ['Mulish', 'Fredoka'],
  colors: {
    ink:    '#1a344d',  // every interior caption
    navy:   '#1a344d',
    spine:  '#1f547b',
    sage:   '#c6ceba',
    cream:  '#f6efe1',
    sand:   '#f2e1cd',
    sky:    '#dae4e6',
    paper:  '#fbf8f6',
  },

  spreads: {

    // SP0 — the opening right-hand page when the customer does NOT buy the Intro
    // add-on (the left page is technical). Geometry and palette are identical to
    // SP3's right page, and it reuses SP3's artwork — the same arrangement Wander
    // uses, which is why there is no "SP Spread 0" folder in the drop.
    SP0: {
      type: 'standard', id: 'SP0', label: 'Spread 0', rightOnly: true,
      pages: {
        right: {
          H: {
            bgColor: '#c6ceba',
            overlayBelow: true,
            svg: 'SP Spread 3/SP 06 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 70, xBleed: 108, yBleed: 73, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 179.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Mulish', sizePt: 18, style: 'regular', letterSpacing: 0.10, lineSpacing: 1.28, color: '#1a344d' } }
            ]
          },
          V: {
            bgColor: '#c6ceba',
            overlayBelow: true,
            svg: 'SP Spread 3/SP 06 V Right.svg',
            slots: [
              { slot: 1, x: 85, y: 100, xBleed: 88, yBleed: 103, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 173, yMm: 43, wMm: 40, hMm: 40, halign: 'left', valign: 'top', font: 'Mulish', sizePt: 18, style: 'regular', letterSpacing: 0.10, lineSpacing: 1.28, color: '#1a344d' } }
            ]
          },
        },
      }
    },

    SP1: {
      type: 'standard', id: 'SP1', label: 'Spread 1',
      pages: {
        left: {
          H: {
            bgColor: '#f6efe1',
            overlayBelow: true,
            svg: 'SP Spread 1/SP 01 H Left.svg',
            slots: [
              { slot: 1, x: 95, y: 100, xBleed: 98, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 98, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Mulish', sizePt: 18, style: 'regular', letterSpacing: 0.10, lineSpacing: 1.28, color: '#1a344d' } }
            ]
          },
          V: {
            bgColor: '#f6efe1',
            overlayBelow: true,
            svg: 'SP Spread 1/SP 01 V Left.svg',
            slots: [
              { slot: 1, x: 95, y: 90, xBleed: 98, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 98, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Mulish', sizePt: 18, style: 'regular', letterSpacing: 0.10, lineSpacing: 1.28, color: '#1a344d' } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f2e1cd',
            overlayBelow: true,
            svg: 'SP Spread 1/SP 02 H Right.svg',   // intentionally blank artwork
            slots: [
              { slot: 1, x: 105, y: 55,  xBleed: 108, yBleed: 58,  w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
              { slot: 2, x: 105, y: 150, xBleed: 108, yBleed: 153, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#f2e1cd',
            overlayBelow: true,
            svg: 'SP Spread 1/SP 02 V Right.svg',   // intentionally blank artwork
            slots: [
              { slot: 1, x: 60,  y: 100, xBleed: 63,  yBleed: 103, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
              { slot: 2, x: 150, y: 100, xBleed: 153, yBleed: 103, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } }
            ]
          },
        },
      }
    },

    SP2: {
      type: 'standard', id: 'SP2', label: 'Spread 2',
      pages: {
        left: {
          H: {
            bgColor: '#dae4e6',
            overlayBelow: true,
            svg: 'SP Spread 2/SP 03 H Left.svg',
            slots: [
              { slot: 1, x: 95, y: 55,  xBleed: 98, yBleed: 58,  w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
              { slot: 2, x: 95, y: 145, xBleed: 98, yBleed: 148, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#dae4e6',
            overlayBelow: true,
            svg: 'SP Spread 2/SP 03 V Left.svg',   // intentionally blank artwork
            slots: [
              { slot: 1, x: 50,  y: 130, xBleed: 53,  yBleed: 133, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
              { slot: 2, x: 140, y: 70,  xBleed: 143, yBleed: 73,  w: 80, h: 107, ratio: '80:107', caption: { allowed: false } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f6efe1',
            overlayBelow: true,
            svg: 'SP Spread 2/SP 04 H Right.svg',   // intentionally blank artwork
            slots: [
              { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#f6efe1',
            overlayBelow: true,
            svg: 'SP Spread 2/SP 04 V Right.svg',
            slots: [
              { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 120, h: 160, ratio: '3:4', caption: { allowed: false } }
            ]
          },
        },
      }
    },

    SP3: {
      type: 'standard', id: 'SP3', label: 'Spread 3',
      pages: {
        left: {
          H: {
            bgColor: '#c6ceba',
            overlayBelow: true,
            svg: 'SP Spread 3/SP 05 H Left.svg',   // intentionally blank artwork
            slots: [
              { slot: 1, x: 95, y: 55,  xBleed: 98, yBleed: 58,  w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
              { slot: 2, x: 95, y: 145, xBleed: 98, yBleed: 148, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#c6ceba',
            overlayBelow: true,
            svg: 'SP Spread 3/SP 05 V Left.svg',
            slots: [
              { slot: 1, x: 50,  y: 70,  xBleed: 53,  yBleed: 73,  w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
              { slot: 2, x: 140, y: 130, xBleed: 143, yBleed: 133, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#c6ceba',
            overlayBelow: true,
            svg: 'SP Spread 3/SP 06 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 70, xBleed: 108, yBleed: 73, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 179.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Mulish', sizePt: 18, style: 'regular', letterSpacing: 0.10, lineSpacing: 1.28, color: '#1a344d' } }
            ]
          },
          V: {
            bgColor: '#c6ceba',
            overlayBelow: true,
            svg: 'SP Spread 3/SP 06 V Right.svg',   // intentionally blank artwork
            slots: [
              { slot: 1, x: 85, y: 100, xBleed: 88, yBleed: 103, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 173, yMm: 43, wMm: 40, hMm: 40, halign: 'left', valign: 'top', font: 'Mulish', sizePt: 18, style: 'regular', letterSpacing: 0.10, lineSpacing: 1.28, color: '#1a344d' } }
            ]
          },
        },
      }
    },

    SP4: {
      type: 'standard', id: 'SP4', label: 'Spread 4',
      pages: {
        left: {
          H: {
            bgColor: '#f2e1cd',
            overlayBelow: true,
            svg: 'SP Spread 4/SP 07 H Left.svg',
            slots: [
              { slot: 1, x: 95, y: 55,  xBleed: 98, yBleed: 58,  w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
              { slot: 2, x: 95, y: 145, xBleed: 98, yBleed: 148, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#f2e1cd',
            overlayBelow: true,
            svg: 'SP Spread 4/SP 07 V Left.svg',   // intentionally blank artwork
            slots: [
              { slot: 1, x: 50,  y: 100, xBleed: 53,  yBleed: 103, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
              { slot: 2, x: 140, y: 100, xBleed: 143, yBleed: 103, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f2e1cd',
            overlayBelow: true,
            svg: 'SP Spread 4/SP 08 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Mulish', sizePt: 18, style: 'regular', letterSpacing: 0.10, lineSpacing: 1.28, color: '#1a344d' } }
            ]
          },
          V: {
            bgColor: '#f2e1cd',
            overlayBelow: true,
            svg: 'SP Spread 4/SP 08 V Right.svg',
            slots: [
              { slot: 1, x: 105, y: 90, xBleed: 108, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 108, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Mulish', sizePt: 18, style: 'regular', letterSpacing: 0.10, lineSpacing: 1.28, color: '#1a344d' } }
            ]
          },
        },
      }
    },

    SP5: {
      type: 'standard', id: 'SP5', label: 'Spread 5',
      pages: {
        left: {
          H: {
            bgColor: '#dae4e6',
            overlayBelow: true,
            svg: 'SP Spread 5/SP 09 H Left.svg',
            slots: [
              { slot: 1, x: 75,  y: 55,  xBleed: 78,  yBleed: 58,  w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
              { slot: 2, x: 115, y: 145, xBleed: 118, yBleed: 148, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#dae4e6',
            overlayBelow: true,
            svg: 'SP Spread 5/SP 09 V Left.svg',
            slots: [
              { slot: 1, x: 50,  y: 70,  xBleed: 53,  yBleed: 73,  w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
              { slot: 2, x: 140, y: 130, xBleed: 143, yBleed: 133, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } }
            ]
          },
        },
        right: {
          // The only pages where the CAPTION sits above the photo (CSV: "above").
          H: {
            bgColor: '#dae4e6',
            overlayBelow: true,
            svg: 'SP Spread 5/SP 10 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 130, xBleed: 108, yBleed: 133, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 66.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Mulish', sizePt: 18, style: 'regular', letterSpacing: 0.10, lineSpacing: 1.28, color: '#1a344d' } }
            ]
          },
          V: {
            bgColor: '#dae4e6',
            overlayBelow: true,
            svg: 'SP Spread 5/SP 10 V Right.svg',
            slots: [
              { slot: 1, x: 105, y: 110, xBleed: 108, yBleed: 113, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 108, yMm: 21.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Mulish', sizePt: 18, style: 'regular', letterSpacing: 0.10, lineSpacing: 1.28, color: '#1a344d' } }
            ]
          },
        },
      }
    },

    SP6: {
      type: 'standard', id: 'SP6', label: 'Spread 6',
      pages: {
        left: {
          H: {
            bgColor: '#f6efe1',
            overlayBelow: true,
            svg: 'SP Spread 6/SP 11 H Left.svg',
            slots: [
              { slot: 1, x: 95, y: 100, xBleed: 98, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 98, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Mulish', sizePt: 18, style: 'regular', letterSpacing: 0.10, lineSpacing: 1.28, color: '#1a344d' } }
            ]
          },
          V: {
            bgColor: '#f6efe1',
            overlayBelow: true,
            svg: 'SP Spread 6/SP 11 V Left.svg',
            slots: [
              { slot: 1, x: 95, y: 90, xBleed: 98, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 98, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Mulish', sizePt: 18, style: 'regular', letterSpacing: 0.10, lineSpacing: 1.28, color: '#1a344d' } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f6efe1',
            overlayBelow: true,
            svg: 'SP Spread 6/SP 12 H Right.svg',   // intentionally blank artwork
            slots: [
              { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Mulish', sizePt: 18, style: 'regular', letterSpacing: 0.10, lineSpacing: 1.28, color: '#1a344d' } }
            ]
          },
          V: {
            bgColor: '#f6efe1',
            overlayBelow: true,
            svg: 'SP Spread 6/SP 12 V Right.svg',
            slots: [
              { slot: 1, x: 105, y: 90, xBleed: 108, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 108, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Mulish', sizePt: 18, style: 'regular', letterSpacing: 0.10, lineSpacing: 1.28, color: '#1a344d' } }
            ]
          },
        },
      }
    },

    // ── FPintro — Intro (text only). OPENS the book, replacing SP0 when the
    //    customer buys the Intro add-on. Same mechanic as Joyride/Tender/Newborn,
    //    but ONE text box rather than Joyride's title + body pair.
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
          { key: 'place', label: 'Where you went',            placeholder: 'Greece' },
          { key: 'when',  label: 'When',                      placeholder: 'August, 2026' },
          { key: 'line',  label: 'A line to remember it by',  placeholder: 'Where everything slowed down.' },
        ],
        hint: 'A few details about the trip. We set them on the opening page.',
        compose: (v) => `${v.line}\n\n${v.place}, ${v.when}`
      },
      pages: {
        right: {
          default: {
            bgColor: '#dae4e6',
            svg: 'FP Intro/FP 01 Intro.svg',
            slots: [],
            textPanel: { introFields: true, caption: { allowed: true, xMm: 108, yMm: 90, wMm: 110, hMm: 75, halign: 'center', valign: 'center', font: 'Mulish', sizePt: 22, style: 'regular', letterSpacing: 0.10, lineSpacing: 1.28, color: '#1a344d' } }
          },
        },
      }
    },

    // ── FP1 — Travel map + itinerary ──────────────────────────────────────────
    // Left page: a regional map (one of 6) with a pin dropped per selected country
    //   (coords from mapCoordinates, with-bleed mm, measured from pin CENTRE).
    //   Right page: a framed itinerary text panel staff format from the customer's
    //   raw route. No photo upload on this page.
    // The map artwork is Clémence's, but the COORDINATE TABLE is byte-identical to
    //   Wander's Map_Coordinates_upd.csv (verified S168) — the maps are drawn on
    //   the same projection, so the pin table is shared rather than duplicated.
    FP1: {
      orderFormPhoto: null,
      orderFormMeta: { countrySelect: true, sameRegionOnly: true, textPrompt: 'Your route', hint: 'List the places on your trip, in order, and we\'ll lay out the itinerary for you.', placeholder: 'e.g. Athens → Naxos → Paros → Milos' },
      type: 'functional', id: 'FP1', label: 'Travel map', mapPage: true,
      pin: { png: 'FP Travel Itinerary/Location pin/Asset 501.png', wMm: 12, hMm: 22.3, anchor: 'center' },
      // region code (from mapCoordinates) → left-page map SVG
      maps: {
        'EU':         'FP Travel Itinerary/EU Map.svg',
        'Asia':       'FP Travel Itinerary/Asia Map.svg',
        'Africa':     'FP Travel Itinerary/Africa Map.svg',
        'N.America':  'FP Travel Itinerary/N.America Map.svg',
        'S.America':  'FP Travel Itinerary/S.America.svg',
        'Oceania':    'FP Travel Itinerary/Oceania.svg',
      },
      pages: {
        left: {
          // svg is set at render time from `maps[region]`; mapCanvas flags pin overlay.
          default: { bgColor: '#c6ceba', svg: null, mapCanvas: true, slots: [] },
        },
        right: {
          default: {
            bgColor: '#c6ceba',
            svg: 'FP Travel Itinerary/Travel Itinerary.svg',
            slots: [],
            textPanel: { caption: { allowed: true, xMm: 108, yMm: 116, wMm: 137, hMm: 120, halign: 'left', valign: 'center', font: 'Mulish', sizePt: 22, style: 'regular', letterSpacing: 0.10, lineSpacing: 1.28, color: '#1a344d' }, itinerary: true }
          },
        },
      }
    },

  },

  // Country → { region, xMm, yMm } (with-bleed mm on the left map page; pin CENTRE).
  // Generated from FP Travel Itinerary/Map_Coordinates_upd.csv — do not hand-edit.
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
