/* Wander — travel photobook template (Aevia "Travel" collection).
 * Parallel in shape to SCRIBBLE_DATA; the engine/customer-preview/PDF select
 * between templates by the order's template name. SVG paths are relative to
 * assets/Template_Wander/ (NOTE: no `Spreads/` subfolder — unlike Scribble).
 *
 * Fonts: Cormorant Garamond (Light/Regular/SemiBold/Bold) + NT Somic (SP0).
 * Geometry for SP0–SP6 is identical to Scribble; colours/fonts differ per the
 * Wander CSVs (Wander_sizing_full.csv, Wander_Template_Sizing_Cover.csv).
 */
window.WANDER_DATA = {
  template: 'wander',
  pageSize: 200,
  bleed: 3,
  canvasPx: 600,

  cover: {
    svg: 'Cover/Cover.svg',
    sections: {
      back:  { xMm: 0,   wMm: 200, bgColor: '#262262' },
      spine: { xMm: 200, wMm: 9,   bgColor: '#262262' },
      front: { xMm: 209, wMm: 200, bgColor: '#f2ede3' },
    },
    slots: [],
    // Coords are with-bleed (include 18mm cover bleed) and measured from the box CENTRE,
    // same convention as Scribble. `align` controls text inside the box; `hMm` is stored
    // but currently dormant for cover captions (vertical position is the yMm centre line).
    // Wander cover text is FREE TEXT (no fixed name/year fields like Scribble) — staff type
    // whatever suits the trip, e.g. "Dolomites, 2025". `placeholder` is just a suggestion.
    captions: [
      { key: 'front', xMm: 379, yMm: 200, wMm: 65, hMm: 5, font: 'Cormorant Garamond', sizePt: 18, align: 'right', color: '#3E2A55', label: 'Front — album name', placeholder: 'Dolomites, 2026', maxLength: 30 },
      { key: 'spine', xMm: 222, yMm: 158, wMm: 65, hMm: 5, font: 'Cormorant Garamond', sizePt: 16, align: 'left',  color: '#3E2A55', rotate: 270, label: 'Spine — album name', placeholder: 'Dolomites, 2026', maxLength: 30 },
    ]
  },

  scale: 3,
  fonts: { display: 'Cormorant Garamond', body: 'Cormorant Garamond' },
  colors: {
    navy:   '#262262',
    ink:    '#12264b',
    plum:   '#3E2A55',
    sand:   '#eee5d8',
    beige:  '#f8ead9',
    paper:  '#f4f7f6',
    sky:    '#d8eaf0',
    cream:  '#f2ede3',
  },

  spreads: {

    SP0: {
      type: 'standard', id: 'SP0', label: 'Spread 0', rightOnly: true,
      pages: {
        right: {
          H: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 0/SP 06 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 70, xBleed: 108, yBleed: 73, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 179.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'NT Somic', sizePt: 16, style: 'medium', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955' } }
            ]
          },
          V: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 0/SP 06 V Right.svg',
            slots: [
              { slot: 1, x: 85, y: 100, xBleed: 88, yBleed: 103, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 173, yMm: 43, wMm: 40, hMm: 40, halign: 'left', valign: 'top', font: 'NT Somic', sizePt: 16, style: 'medium', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955' } }
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
            bgColor: '#eee5d8',
            svg: 'SP Spread 1/SP 01 H Left.svg',
            slots: [
              { slot: 1, x: 95, y: 100, xBleed: 98, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 98, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Cormorant Garamond', sizePt: 16, style: 'bold', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } }
            ]
          },
          V: {
            bgColor: '#eee5d8',
            svg: 'SP Spread 1/SP 01 V Left.svg',
            slots: [
              { slot: 1, x: 95, y: 90, xBleed: 98, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 98, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Cormorant Garamond', sizePt: 16, style: 'bold', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f4f7f6',
            svg: 'SP Spread 1/SP 02 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 55, xBleed: 108, yBleed: 58, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
              { slot: 2, x: 105, y: 150, xBleed: 108, yBleed: 153, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#f4f7f6',
            svg: 'SP Spread 1/SP 02 V Right.svg',
            slots: [
              { slot: 1, x: 60, y: 100, xBleed: 63, yBleed: 103, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
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
            bgColor: '#f4f7f6',
            svg: 'SP Spread 2/SP 03 H Left.svg',
            slots: [
              { slot: 1, x: 95, y: 55, xBleed: 98, yBleed: 58, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
              { slot: 2, x: 95, y: 145, xBleed: 98, yBleed: 148, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#f4f7f6',
            svg: 'SP Spread 2/SP 03 V Left.svg',
            slots: [
              { slot: 1, x: 50, y: 130, xBleed: 53, yBleed: 133, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
              { slot: 2, x: 140, y: 70, xBleed: 143, yBleed: 73, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f4f7f6',
            svg: 'SP Spread 2/SP 04 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#f4f7f6',
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
            bgColor: '#f4f7f6',
            svg: 'SP Spread 3/SP 05 H Left.svg',
            slots: [
              { slot: 1, x: 95, y: 55, xBleed: 98, yBleed: 58, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
              { slot: 2, x: 95, y: 145, xBleed: 98, yBleed: 148, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#f4f7f6',
            svg: 'SP Spread 3/SP 05 V Left.svg',
            slots: [
              { slot: 1, x: 50, y: 70, xBleed: 53, yBleed: 73, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
              { slot: 2, x: 140, y: 130, xBleed: 143, yBleed: 133, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f4f7f6',
            svg: 'SP Spread 3/SP 06 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 70, xBleed: 108, yBleed: 73, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 179.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Cormorant Garamond', sizePt: 16, style: 'bold', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } }
            ]
          },
          V: {
            bgColor: '#f4f7f6',
            svg: 'SP Spread 3/SP 06 V Right.svg',
            slots: [
              { slot: 1, x: 85, y: 100, xBleed: 88, yBleed: 103, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 173, yMm: 43, wMm: 40, hMm: 40, halign: 'left', valign: 'top', font: 'Cormorant Garamond', sizePt: 16, style: 'bold', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } }
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
            bgColor: '#f4f7f6',
            svg: 'SP Spread 4/SP 07 H Left.svg',
            slots: [
              { slot: 1, x: 95, y: 55, xBleed: 98, yBleed: 58, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
              { slot: 2, x: 95, y: 145, xBleed: 98, yBleed: 148, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#f4f7f6',
            svg: 'SP Spread 4/SP 07 V Left.svg',
            slots: [
              { slot: 1, x: 50, y: 100, xBleed: 53, yBleed: 103, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
              { slot: 2, x: 140, y: 100, xBleed: 143, yBleed: 103, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#d8eaf0',
            svg: 'SP Spread 4/SP 08 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Cormorant Garamond', sizePt: 16, style: 'bold', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } }
            ]
          },
          V: {
            bgColor: '#d8eaf0',
            svg: 'SP Spread 4/SP 08 V Right.svg',
            slots: [
              { slot: 1, x: 105, y: 90, xBleed: 108, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 108, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Cormorant Garamond', sizePt: 16, style: 'bold', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } }
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
            bgColor: '#f4f7f6',
            svg: 'SP Spread 5/SP 09 H Left.svg',
            slots: [
              { slot: 1, x: 75, y: 55, xBleed: 78, yBleed: 58, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
              { slot: 2, x: 115, y: 145, xBleed: 118, yBleed: 148, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#f4f7f6',
            svg: 'SP Spread 5/SP 09 V Left.svg',
            slots: [
              { slot: 1, x: 50, y: 70, xBleed: 53, yBleed: 73, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
              { slot: 2, x: 140, y: 130, xBleed: 143, yBleed: 133, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f4f7f6',
            svg: 'SP Spread 5/SP 10 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 130, xBleed: 108, yBleed: 133, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 66.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Cormorant Garamond', sizePt: 16, style: 'bold', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } }
            ]
          },
          V: {
            bgColor: '#f4f7f6',
            svg: 'SP Spread 5/SP 10 V Right.svg',
            slots: [
              { slot: 1, x: 105, y: 110, xBleed: 108, yBleed: 113, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 108, yMm: 21.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Cormorant Garamond', sizePt: 16, style: 'bold', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } }
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
            bgColor: '#f4f7f6',
            svg: 'SP Spread 6/SP 11 H Left.svg',
            slots: [
              { slot: 1, x: 95, y: 100, xBleed: 98, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 98, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Cormorant Garamond', sizePt: 16, style: 'bold', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } }
            ]
          },
          V: {
            bgColor: '#f4f7f6',
            svg: 'SP Spread 6/SP 11 V Left.svg',
            slots: [
              { slot: 1, x: 95, y: 90, xBleed: 98, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 98, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Cormorant Garamond', sizePt: 16, style: 'bold', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f4f7f6',
            svg: 'SP Spread 6/SP 12 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Cormorant Garamond', sizePt: 16, style: 'bold', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } }
            ]
          },
          V: {
            bgColor: '#f4f7f6',
            svg: 'SP Spread 6/SP 12 V Right.svg',
            slots: [
              { slot: 1, x: 105, y: 90, xBleed: 108, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 108, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Cormorant Garamond', sizePt: 16, style: 'bold', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } }
            ]
          },
        },
      }
    },

    // ── FP1 — Travel map + itinerary ──────────────────────────────────────────
    // Left page: a regional map (one of 6 SVGs, chosen by region) with a pin
    //   dropped per selected country (coords from mapCoordinates, with-bleed mm,
    //   measured from pin CENTRE). Right page: a framed itinerary text panel that
    //   staff format from the customer's raw route. No photo upload on this page.
    // NOTE: engine/customer/PDF rendering for the map+pins is NOT yet implemented;
    //   this is the data contract for that work.
    FP1: {
      orderFormPhoto: null,
      orderFormMeta: { countrySelect: true, sameRegionOnly: true, textPrompt: 'Your route', hint: 'List the places on your trip, in order — staff will format the itinerary.', placeholder: 'e.g. Vienna → Hallstatt → Salzburg → Innsbruck' },
      type: 'functional', id: 'FP1', label: 'Travel map', mapPage: true,
      pin: { png: 'FP Spread 1 - Special Files/GEO PIN.png', wMm: 12, hMm: 23, anchor: 'center' },
      // region code (from mapCoordinates) → left-page map SVG
      maps: {
        'EU':         'FP Spread 1/FP 01 Map Left (EU).svg',
        'Asia':       'FP Spread 1/FP 01 Map Left (Asia).svg',
        'Africa':     'FP Spread 1/FP 01 Map Left (Africa).svg',
        'N.America':  'FP Spread 1/FP 01 Map Left (N.America).svg',
        'S.America':  'FP Spread 1/FP 01 Map Left (S.America).svg',
        'Oceania':    'FP Spread 1/FP 01 Map Left (Oceania).svg',
      },
      pages: {
        left: {
          // svg is set at render time from `maps[region]`; mapCanvas flags pin overlay.
          default: { bgColor: '#f2ede3', svg: null, mapCanvas: true, slots: [] },
        },
        right: {
          default: {
            bgColor: '#f2ede3',
            svg: 'FP Spread 1/FP 01 Map Right.svg',
            slots: [],
            textPanel: { caption: { allowed: true, xMm: 108, yMm: 103, wMm: 135, hMm: 100, halign: 'center', valign: 'center', font: 'Cormorant Garamond', sizePt: 18, style: 'light', letterSpacing: -0.02, lineSpacing: 1.28, color: '#12264b' }, itinerary: true }
          },
        },
      }
    },

  },

  // Country → { region, xMm, yMm } (with-bleed mm on the left map page; pin CENTRE).
  // Generated from FP Spread 1 - Special Files/Map_Coordinates_upd.csv — do not hand-edit.
  // Country → { region, xMm, yMm } (with-bleed mm on the left map page; pin CENTRE).
  // Generated from FP Spread 1 - Special Files/Map_Coordinates_upd.csv — do not hand-edit.
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
