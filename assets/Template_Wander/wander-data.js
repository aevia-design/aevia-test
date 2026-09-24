/* Wander — travel photobook template (Aevia "Travel" collection).
 * Parallel in shape to SCRIBBLE_DATA; the engine/customer-preview/PDF select
 * between templates by the order's template name. SVG paths are relative to
 * assets/Template_Wander/ (NOTE: no `Spreads/` subfolder — unlike Scribble).
 *
 * Fonts: Cormorant Garamond (Light/Regular/SemiBold/Bold) throughout.
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
    referenceSpineMm: 9,  // spine width this cover's COORDINATES were authored at
    // Audited S154: the SVG's spine band was 7.07mm and sat 1.14mm right of the 200/209
    // model every other template follows. Xenia re-exported the cover the same day and it
    // now measures 199.95 → 208.95mm — 9.00mm, matching the coordinate scheme the captions
    // already used (222.5 = spine centre). Resolved; no discrepancy remains.
    //
    // Her export framed the viewBox on the full artboard INCLUDING bleed, which the engine
    // cannot use — see the commit that landed it. The viewBox is set to her own `#cover`
    // trim rect. If this file is ever re-exported, check the viewBox frames 409×200mm
    // (11.811 px/mm on both axes) before trusting the render.
    sections: {
      back:  { xMm: 0,   wMm: 200, bgColor: '#6F454C' },
      spine: { xMm: 200, wMm: 9,   bgColor: '#86A37B' },  // audited S154 — matches the SVG spine rect (rgb(134,163,123))
      front: { xMm: 209, wMm: 200, bgColor: '#f2ede3' },
    },
    // Visible per-surface cover colours (sampled from the real cover) used by the mockup
    // composers (scripts/compose-*.mjs) to tint EXPOSED board edges: closed front-face edges
    // + open-book left page → front; open right page → back; spine fold → spine. Distinct from
    // sections.bgColor, which is the render's background fill behind the cover SVG.
    mockupEdges: { front: '#E7DED3', spine: '#86A37B', back: '#6F454C' },
    slots: [],
    // Coords are with-bleed (include 18mm cover bleed) and measured from the box CENTRE,
    // same convention as Scribble. `align` controls text inside the box; `hMm` is stored
    // but currently dormant for cover captions (vertical position is the yMm centre line).
    // Wander cover text is FREE TEXT (no fixed name/year fields like Scribble) — staff type
    // whatever suits the trip, e.g. "Dolomites, 2025". `placeholder` is just a suggestion.
    captions: [
      { key: 'front', xMm: 379, yMm: 200, wMm: 65, hMm: 5, font: 'Cormorant Garamond', sizePt: 18, align: 'right', color: '#3E2A55', label: 'Front — album name', labelDe: 'Vorderseite — Albumname', placeholder: 'Dolomites, 2026', placeholderDe: 'Dolomiten, 2026', maxLength: 30 },
      { key: 'spine', xMm: 222.5, yMm: 158, wMm: 65, hMm: 5, font: 'Cormorant Garamond', sizePt: 18, align: 'left',  color: '#3E2A55', rotate: 270, label: 'Spine — album name', labelDe: 'Buchrücken — Albumname', placeholder: 'Dolomites, 2026', placeholderDe: 'Dolomiten, 2026', maxLength: 30 },
    ]
  },

  scale: 3,
  fonts: { display: 'Cormorant Garamond', body: 'Cormorant Garamond' },
  // Fonts offered in the caption toolbar for this template (values match COVER_FONTS).
  fontPicker: ['Cormorant Garamond'],
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
            bgColor: '#f4f7f6',
            svg: 'SP Spread 0/SP 06 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 70, xBleed: 108, yBleed: 73, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 153, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Cormorant Garamond', sizePt: 18, style: 'bold', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955' } }
            ]
          },
          V: {
            bgColor: '#f4f7f6',
            svg: 'SP Spread 0/SP 06 V Right.svg',
            slots: [
              { slot: 1, x: 85, y: 100, xBleed: 88, yBleed: 103, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 173, yMm: 43, wMm: 40, hMm: 40, halign: 'left', valign: 'top', font: 'Cormorant Garamond', sizePt: 18, style: 'bold', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955' } }
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
              { slot: 1, x: 95, y: 100, xBleed: 98, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 98, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Cormorant Garamond', sizePt: 18, style: 'bold', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } }
            ]
          },
          V: {
            bgColor: '#eee5d8',
            svg: 'SP Spread 1/SP 01 V Left.svg',
            slots: [
              { slot: 1, x: 95, y: 90, xBleed: 98, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 98, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Cormorant Garamond', sizePt: 18, style: 'bold', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } }
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
              { slot: 1, x: 105, y: 70, xBleed: 108, yBleed: 73, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 153, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Cormorant Garamond', sizePt: 18, style: 'bold', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } }
            ]
          },
          V: {
            bgColor: '#f4f7f6',
            svg: 'SP Spread 3/SP 06 V Right.svg',
            slots: [
              { slot: 1, x: 85, y: 100, xBleed: 88, yBleed: 103, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 173, yMm: 43, wMm: 40, hMm: 40, halign: 'left', valign: 'top', font: 'Cormorant Garamond', sizePt: 18, style: 'bold', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } }
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
              { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Cormorant Garamond', sizePt: 18, style: 'bold', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } }
            ]
          },
          V: {
            bgColor: '#d8eaf0',
            svg: 'SP Spread 4/SP 08 V Right.svg',
            slots: [
              { slot: 1, x: 105, y: 90, xBleed: 108, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 108, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Cormorant Garamond', sizePt: 18, style: 'bold', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } }
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
            // CSV overlay_position=below: SVG renders BEHIND the photos here.
            overlayBelow: true,
            svg: 'SP Spread 5/SP 10 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 130, xBleed: 108, yBleed: 133, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 66.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Cormorant Garamond', sizePt: 18, style: 'bold', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } }
            ]
          },
          V: {
            bgColor: '#f4f7f6',
            // CSV overlay_position=below: SVG renders BEHIND the photos here.
            overlayBelow: true,
            svg: 'SP Spread 5/SP 10 V Right.svg',
            slots: [
              { slot: 1, x: 105, y: 110, xBleed: 108, yBleed: 113, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 108, yMm: 21.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Cormorant Garamond', sizePt: 18, style: 'bold', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } }
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
              { slot: 1, x: 95, y: 100, xBleed: 98, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 98, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Cormorant Garamond', sizePt: 18, style: 'bold', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } }
            ]
          },
          V: {
            bgColor: '#f4f7f6',
            svg: 'SP Spread 6/SP 11 V Left.svg',
            slots: [
              { slot: 1, x: 95, y: 90, xBleed: 98, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 98, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Cormorant Garamond', sizePt: 18, style: 'bold', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f4f7f6',
            svg: 'SP Spread 6/SP 12 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Cormorant Garamond', sizePt: 18, style: 'bold', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } }
            ]
          },
          V: {
            bgColor: '#f4f7f6',
            svg: 'SP Spread 6/SP 12 V Right.svg',
            slots: [
              { slot: 1, x: 105, y: 90, xBleed: 108, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 108, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Cormorant Garamond', sizePt: 18, style: 'bold', letterSpacing: -0.02, lineSpacing: 1.28, color: '#262262' } }
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
      orderFormMeta: { countrySelect: true, sameRegionOnly: true, textPrompt: 'Your route', textPromptDe: 'Ihre Route', hint: 'List the places on your trip, in order, and we\'ll lay out the itinerary for you.', hintDe: 'Listen Sie die Orte Ihrer Reise der Reihe nach auf, wir setzen daraus die Reiseroute.', placeholder: 'e.g. Vienna → Hallstatt → Salzburg → Innsbruck', placeholderDe: 'z. B. Wien → Hallstatt → Salzburg → Innsbruck' },
      type: 'functional', id: 'FP1', label: 'Travel map', mapPage: true,
      pin: { png: 'FP Spread 1 - Special Files/GEO PIN.png', wMm: 12, hMm: 23, anchor: 'center' },
      // region code (from mapCoordinates) → left-page map SVG
      maps: {
        'EU':         'FP Spread 1/FP 01 Map Left (EU).png',
        'Asia':       'FP Spread 1/FP 01 Map Left (Asia).png',
        'Africa':     'FP Spread 1/FP 01 Map Left (Africa).png',
        'N.America':  'FP Spread 1/FP 01 Map Left (N.America).png',
        'S.America':  'FP Spread 1/FP 01 Map Left (S.America).png',
        'Oceania':    'FP Spread 1/FP 01 Map Left (Oceania).png',
      },
      pages: {
        left: {
          // svg is set at render time from `maps[region]`; mapCanvas flags pin overlay.
          default: { bgColor: '#f2ede3', svg: null, mapCanvas: true, slots: [] },
        },
        right: {
          default: {
            bgColor: '#f2ede3',
            svg: 'FP Spread 1/FP 01 Map Right.svg', svgDe: 'FP Spread 1/FP 01 Map Right-DE.svg',
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
    "Iceland": { region: "EU", xMm: 35, yMm: 20, de: "Island" },
    "Norway": { region: "EU", xMm: 88, yMm: 50, de: "Norwegen" },
    "Sweden": { region: "EU", xMm: 107, yMm: 42, de: "Schweden" },
    "Finland": { region: "EU", xMm: 132, yMm: 38, de: "Finnland" },
    "Denmark": { region: "EU", xMm: 89, yMm: 80, de: "Dänemark" },
    "United Kingdom": { region: "EU", xMm: 53, yMm: 79, de: "Vereinigtes Königreich" },
    "Ireland": { region: "EU", xMm: 36, yMm: 84, de: "Irland" },
    "Netherlands": { region: "EU", xMm: 78, yMm: 96, de: "Niederlande" },
    "Belgium": { region: "EU", xMm: 71, yMm: 104, de: "Belgien" },
    "Luxembourg": { region: "EU", xMm: 77, yMm: 112, de: "Luxemburg" },
    "Germany": { region: "EU", xMm: 99, yMm: 102, de: "Deutschland" },
    "France": { region: "EU", xMm: 60, yMm: 118, de: "Frankreich" },
    "Switzerland": { region: "EU", xMm: 82, yMm: 126, de: "Schweiz" },
    "Austria": { region: "EU", xMm: 103, yMm: 123, de: "Österreich" },
    "Czechia": { region: "EU", xMm: 103, yMm: 112, de: "Tschechien" },
    "Slovakia": { region: "EU", xMm: 128, yMm: 117, de: "Slowakei" },
    "Poland": { region: "EU", xMm: 117, yMm: 96, de: "Polen" },
    "Hungary": { region: "EU", xMm: 130, yMm: 123, de: "Ungarn" },
    "Slovenia": { region: "EU", xMm: 111, yMm: 131, de: "Slowenien" },
    "Croatia": { region: "EU", xMm: 113, yMm: 137, de: "Kroatien" },
    "Bosnia and Herzegovina": { region: "EU", xMm: 119, yMm: 140, de: "Bosnien und Herzegowina" },
    "Serbia": { region: "EU", xMm: 125, yMm: 139, de: "Serbien" },
    "Montenegro": { region: "EU", xMm: 125, yMm: 153, de: "Montenegro" },
    "Kosovo": { region: "EU", xMm: 129, yMm: 150, de: "Kosovo" },
    "North Macedonia": { region: "EU", xMm: 134, yMm: 155, de: "Nordmazedonien" },
    "Albania": { region: "EU", xMm: 127, yMm: 158, de: "Albanien" },
    "Romania": { region: "EU", xMm: 141, yMm: 128, de: "Rumänien" },
    "Moldova": { region: "EU", xMm: 148, yMm: 120, de: "Republik Moldau" },
    "Bulgaria": { region: "EU", xMm: 155, yMm: 146, de: "Bulgarien" },
    "Ukraine": { region: "EU", xMm: 167, yMm: 104, de: "Ukraine" },
    "Belarus": { region: "EU", xMm: 143, yMm: 88, de: "Belarus" },
    "Estonia": { region: "EU", xMm: 137, yMm: 62, de: "Estland" },
    "Latvia": { region: "EU", xMm: 139, yMm: 72, de: "Lettland" },
    "Lithuania": { region: "EU", xMm: 125, yMm: 82, de: "Litauen" },
    "Portugal": { region: "EU", xMm: 17, yMm: 156, de: "Portugal" },
    "Spain": { region: "EU", xMm: 30, yMm: 156, de: "Spanien" },
    "Italy": { region: "EU", xMm: 92, yMm: 139, de: "Italien" },
    "Greece": { region: "EU", xMm: 136, yMm: 163, de: "Griechenland" },
    "Turkey": { region: "EU", xMm: 169, yMm: 159, de: "Türkei" },
    "Cyprus": { region: "EU", xMm: 187, yMm: 180, de: "Zypern" },
    // ── Asia ──
    "Russia": { region: "Asia", xMm: 106, yMm: 35, de: "Russland" },
    "Kazakhstan": { region: "Asia", xMm: 76, yMm: 58, de: "Kasachstan" },
    "Mongolia": { region: "Asia", xMm: 124, yMm: 64, de: "Mongolei" },
    "Georgia": { region: "Asia", xMm: 36, yMm: 54, de: "Georgien" },
    "Armenia": { region: "Asia", xMm: 35, yMm: 57, de: "Armenien" },
    "Azerbaijan": { region: "Asia", xMm: 39, yMm: 57, de: "Aserbaidschan" },
    "Syria": { region: "Asia", xMm: 21, yMm: 68, de: "Syrien" },
    "Lebanon": { region: "Asia", xMm: 17, yMm: 70, de: "Libanon" },
    "Israel": { region: "Asia", xMm: 17, yMm: 77, de: "Israel" },
    "Jordan": { region: "Asia", xMm: 20, yMm: 78, de: "Jordanien" },
    "Iraq": { region: "Asia", xMm: 30, yMm: 73, de: "Irak" },
    "Saudi Arabia": { region: "Asia", xMm: 25, yMm: 98, de: "Saudi-Arabien" },
    "Yemen": { region: "Asia", xMm: 36, yMm: 123, de: "Jemen" },
    "Oman": { region: "Asia", xMm: 56, yMm: 112, de: "Oman" },
    "UAE": { region: "Asia", xMm: 54, yMm: 107, de: "Vereinigte Arabische Emirate" },
    "Kuwait": { region: "Asia", xMm: 37, yMm: 92, de: "Kuwait" },
    "Qatar": { region: "Asia", xMm: 44, yMm: 103, de: "Katar" },
    "Bahrain": { region: "Asia", xMm: 42, yMm: 101, de: "Bahrain" },
    "Iran": { region: "Asia", xMm: 49, yMm: 79, de: "Iran" },
    "Uzbekistan": { region: "Asia", xMm: 61, yMm: 67, de: "Usbekistan" },
    "Turkmenistan": { region: "Asia", xMm: 56, yMm: 74, de: "Turkmenistan" },
    "Kyrgyzstan": { region: "Asia", xMm: 83, yMm: 71, de: "Kirgisistan" },
    "Tajikistan": { region: "Asia", xMm: 75, yMm: 76, de: "Tadschikistan" },
    "Afganistan": { region: "Asia", xMm: 70, yMm: 83, de: "Afghanistan" },
    "Pakistan": { region: "Asia", xMm: 82, yMm: 94, de: "Pakistan" },
    "India": { region: "Asia", xMm: 89, yMm: 105, de: "Indien" },
    "Sri Lanka": { region: "Asia", xMm: 90, yMm: 141, de: "Sri Lanka" },
    "China": { region: "Asia", xMm: 129, yMm: 83, de: "China" },
    "Nepal": { region: "Asia", xMm: 97, yMm: 98, de: "Nepal" },
    "Bhutan": { region: "Asia", xMm: 103, yMm: 101, de: "Bhutan" },
    "Bangladesh": { region: "Asia", xMm: 104, yMm: 105, de: "Bangladesch" },
    "Myanmar": { region: "Asia", xMm: 118, yMm: 113, de: "Myanmar" },
    "Laos": { region: "Asia", xMm: 129, yMm: 113, de: "Laos" },
    "Thailand": { region: "Asia", xMm: 121, yMm: 120, de: "Thailand" },
    "Cambodia": { region: "Asia", xMm: 129, yMm: 128, de: "Kambodscha" },
    "Vietnam": { region: "Asia", xMm: 134, yMm: 128, de: "Vietnam" },
    "Malaysia": { region: "Asia", xMm: 145, yMm: 146, de: "Malaysia" },
    "Singapore": { region: "Asia", xMm: 125, yMm: 152, de: "Singapur" },
    "Indonesia": { region: "Asia", xMm: 140, yMm: 156, de: "Indonesien" },
    "Philippines": { region: "Asia", xMm: 157, yMm: 127, de: "Philippinen" },
    "Taiwan": { region: "Asia", xMm: 149, yMm: 106, de: "Taiwan" },
    "North Korea": { region: "Asia", xMm: 155, yMm: 66, de: "Nordkorea" },
    "South Korea": { region: "Asia", xMm: 153, yMm: 77, de: "Südkorea" },
    "Japan": { region: "Asia", xMm: 172, yMm: 80, de: "Japan" },
    "Brunei": { region: "Asia", xMm: 140, yMm: 141, de: "Brunei" },
    "Timor-Leste": { region: "Asia", xMm: 164, yMm: 177, de: "Timor-Leste" },
    "Maldives": { region: "Asia", xMm: 73, yMm: 150, de: "Malediven" },
    // ── Africa ──
    "Egypt": { region: "Africa", xMm: 135, yMm: 34, de: "Ägypten" },
    "Morocco": { region: "Africa", xMm: 46, yMm: 21, de: "Marokko" },
    "Algeria": { region: "Africa", xMm: 66, yMm: 30, de: "Algerien" },
    "Tunisia": { region: "Africa", xMm: 79, yMm: 15, de: "Tunesien" },
    "Libya": { region: "Africa", xMm: 113, yMm: 37, de: "Libyen" },
    "Western Sahara": { region: "Africa", xMm: 30, yMm: 38, de: "Westsahara" },
    "Mauritania": { region: "Africa", xMm: 38, yMm: 51, de: "Mauretanien" },
    "Mali": { region: "Africa", xMm: 54, yMm: 59, de: "Mali" },
    "Niger": { region: "Africa", xMm: 89, yMm: 57, de: "Niger" },
    "Chad": { region: "Africa", xMm: 114, yMm: 63, de: "Tschad" },
    "Sudan": { region: "Africa", xMm: 149, yMm: 63, de: "Sudan" },
    "Eritrea": { region: "Africa", xMm: 158, yMm: 64, de: "Eritrea" },
    "Djibouti": { region: "Africa", xMm: 167, yMm: 75, de: "Dschibuti" },
    "Ethiopia": { region: "Africa", xMm: 151, yMm: 86, de: "Äthiopien" },
    "Somalia": { region: "Africa", xMm: 183, yMm: 82, de: "Somalia" },
    "Senegal": { region: "Africa", xMm: 21, yMm: 66, de: "Senegal" },
    "The Gambia": { region: "Africa", xMm: 19, yMm: 74, de: "Gambia" },
    "Guinea-Bissau": { region: "Africa", xMm: 21, yMm: 78, de: "Guinea-Bissau" },
    "Guinea": { region: "Africa", xMm: 36, yMm: 81, de: "Guinea" },
    "Sierra Leone": { region: "Africa", xMm: 29, yMm: 88, de: "Sierra Leone" },
    "Liberia": { region: "Africa", xMm: 33, yMm: 89, de: "Liberia" },
    "Cote d'Ivoire": { region: "Africa", xMm: 44, yMm: 83, de: "Elfenbeinküste" },
    "Ghana": { region: "Africa", xMm: 56, yMm: 83, de: "Ghana" },
    "Togo": { region: "Africa", xMm: 61, yMm: 83, de: "Togo" },
    "Benin": { region: "Africa", xMm: 67, yMm: 79, de: "Benin" },
    "Burkina Faso": { region: "Africa", xMm: 57, yMm: 72, de: "Burkina Faso" },
    "Nigeria": { region: "Africa", xMm: 73, yMm: 79, de: "Nigeria" },
    "Cameroon": { region: "Africa", xMm: 94, yMm: 88, de: "Kamerun" },
    "Equatorial Guinea": { region: "Africa", xMm: 84, yMm: 103, de: "Äquatorialguinea" },
    "Sao Tome and Principe": { region: "Africa", xMm: 75, yMm: 107, de: "São Tomé und Príncipe" },
    "Gabon": { region: "Africa", xMm: 89, yMm: 106, de: "Gabun" },
    "Congo": { region: "Africa", xMm: 103, yMm: 105, de: "Kongo" },
    "Democratic Republic of the Congo": { region: "Africa", xMm: 126, yMm: 108, de: "Demokratische Republik Kongo" },
    "Central African Republic": { region: "Africa", xMm: 117, yMm: 84, de: "Zentralafrikanische Republik" },
    "South Sudan": { region: "Africa", xMm: 127, yMm: 88, de: "Südsudan" },
    "Uganda": { region: "Africa", xMm: 146, yMm: 99, de: "Uganda" },
    "Rwanda": { region: "Africa", xMm: 138, yMm: 108, de: "Ruanda" },
    "Burundi": { region: "Africa", xMm: 136, yMm: 113, de: "Burundi" },
    "Kenya": { region: "Africa", xMm: 152, yMm: 103, de: "Kenia" },
    "Tanzania": { region: "Africa", xMm: 145, yMm: 118, de: "Tansania" },
    "Angola": { region: "Africa", xMm: 96, yMm: 130, de: "Angola" },
    "Zambia": { region: "Africa", xMm: 124, yMm: 137, de: "Sambia" },
    "Malawi": { region: "Africa", xMm: 142, yMm: 135, de: "Malawi" },
    "Mozambique": { region: "Africa", xMm: 150, yMm: 143, de: "Mosambik" },
    "Zimbabwe": { region: "Africa", xMm: 132, yMm: 146, de: "Simbabwe" },
    "Namibia": { region: "Africa", xMm: 93, yMm: 149, de: "Namibia" },
    "Botswana": { region: "Africa", xMm: 112, yMm: 153, de: "Botsuana" },
    "South Africa": { region: "Africa", xMm: 106, yMm: 176, de: "Südafrika" },
    "Lesotho": { region: "Africa", xMm: 128, yMm: 171, de: "Lesotho" },
    "Eswatini": { region: "Africa", xMm: 134, yMm: 164, de: "Eswatini" },
    "Madagascar": { region: "Africa", xMm: 177, yMm: 143, de: "Madagaskar" },
    "Comoros": { region: "Africa", xMm: 170, yMm: 125, de: "Komoren" },
    "Seychelles": { region: "Africa", xMm: 189, yMm: 116, de: "Seychellen" },
    "Mauritius": { region: "Africa", xMm: 194, yMm: 149, de: "Mauritius" },
    "Reunion": { region: "Africa", xMm: 186, yMm: 151, de: "Réunion" },
    // ── N.America ──
    "Canada": { region: "N.America", xMm: 79, yMm: 53, de: "Kanada" },
    "United States": { region: "N.America", xMm: 111, yMm: 100, de: "Vereinigte Staaten" },
    "Alaska (USA)": { region: "N.America", xMm: 45, yMm: 22, de: "Alaska (USA)" },
    "Hawaii (USA)": { region: "N.America", xMm: 33, yMm: 151, de: "Hawaii (USA)" },
    "Mexico": { region: "N.America", xMm: 87, yMm: 140, de: "Mexiko" },
    "Greenland (Denmark)": { region: "N.America", xMm: 177, yMm: 15, de: "Grönland (Dänemark)" },
    "The Bahamas": { region: "N.America", xMm: 138, yMm: 141, de: "Bahamas" },
    "Cuba": { region: "N.America", xMm: 129, yMm: 149, de: "Kuba" },
    "Jamaica": { region: "N.America", xMm: 138, yMm: 161, de: "Jamaika" },
    "Haiti": { region: "N.America", xMm: 162, yMm: 160, de: "Haiti" },
    "Dominican Republic": { region: "N.America", xMm: 166, yMm: 161, de: "Dominikanische Republik" },
    "Puerto Rico (USA)": { region: "N.America", xMm: 175, yMm: 164, de: "Puerto Rico (USA)" },
    "Belize": { region: "N.America", xMm: 111, yMm: 161, de: "Belize" },
    "Guatemala": { region: "N.America", xMm: 108, yMm: 166, de: "Guatemala" },
    "El Salvador": { region: "N.America", xMm: 111, yMm: 170, de: "El Salvador" },
    "Honduras": { region: "N.America", xMm: 117, yMm: 166, de: "Honduras" },
    "Nicaragua": { region: "N.America", xMm: 119, yMm: 173, de: "Nicaragua" },
    "Costa Rica": { region: "N.America", xMm: 119, yMm: 179, de: "Costa Rica" },
    "Panama": { region: "N.America", xMm: 125, yMm: 183, de: "Panama" },
    // ── S.America ──
    "Peru": { region: "S.America", xMm: 58, yMm: 61, de: "Peru" },
    "Colombia": { region: "S.America", xMm: 59, yMm: 18, de: "Kolumbien" },
    "Venezuela": { region: "S.America", xMm: 94, yMm: 15, de: "Venezuela" },
    "Ecuador": { region: "S.America", xMm: 46, yMm: 36, de: "Ecuador" },
    "Guyana": { region: "S.America", xMm: 103, yMm: 16, de: "Guyana" },
    "Suriname": { region: "S.America", xMm: 117, yMm: 20, de: "Suriname" },
    "French Guiana (France)": { region: "S.America", xMm: 126, yMm: 26, de: "Französisch-Guayana (Frankreich)" },
    "Trinidad & Tobago": { region: "S.America", xMm: 96, yMm: 9, de: "Trinidad und Tobago" },
    "Brazil": { region: "S.America", xMm: 127, yMm: 63, de: "Brasilien" },
    "Bolivia": { region: "S.America", xMm: 87, yMm: 80, de: "Bolivien" },
    "Paraguay": { region: "S.America", xMm: 101, yMm: 97, de: "Paraguay" },
    "Chile": { region: "S.America", xMm: 69, yMm: 137, de: "Chile" },
    "Argentina": { region: "S.America", xMm: 89, yMm: 140, de: "Argentinien" },
    "Uruguay": { region: "S.America", xMm: 112, yMm: 128, de: "Uruguay" },
    // ── Oceania ──
    "Australia": { region: "Oceania", xMm: 51, yMm: 94, de: "Australien" },
    "Papua New Guinea": { region: "Oceania", xMm: 68, yMm: 44, de: "Papua-Neuguinea" },
    "Solomon Islands": { region: "Oceania", xMm: 107, yMm: 44, de: "Salomonen" },
    "New Caledonia (France)": { region: "Oceania", xMm: 121, yMm: 108, de: "Neukaledonien (Frankreich)" },
    "Fiji": { region: "Oceania", xMm: 139, yMm: 88, de: "Fidschi" },
    "New Zealand": { region: "Oceania", xMm: 153, yMm: 144, de: "Neuseeland" },
    "Samoa": { region: "Oceania", xMm: 176, yMm: 72, de: "Samoa" },
    "Tonga": { region: "Oceania", xMm: 180, yMm: 113, de: "Tonga" }
  }
};
