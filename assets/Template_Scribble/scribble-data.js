window.SCRIBBLE_DATA = {
  template: 'scribble',
  pageSize: 200,
  bleed: 3,
  canvasPx: 600,

  cover: {
    svg: 'Cover/Artboard 1.svg',
    sections: {
      back:  { xMm: 0,   wMm: 200, bgColor: '#3d1f5c' },
      spine: { xMm: 200, wMm: 9,   bgColor: '#fdd16f' },
      front: { xMm: 209, wMm: 200, bgColor: '#f8ead9' },
    },
    slots: [
      { xMm: 327, yMm: 118, wMm: 140, hMm: 100, pool: 'cover' }
    ],
    captions: [
      { key: 'year', xMm: 327, yMm: 43, wMm: 180, font: 'EB Garamond', sizePt: 33, align: 'center', color: '#493955', label: 'Year' },
      { key: 'name', xMm: 327, yMm: 193, wMm: 180, font: 'NT Somic', sizePt: 28, align: 'center', color: '#493955', label: 'Name' },
      { key: 'spineName', xMm: 222, yMm: 158, wMm: 130, font: 'NT Somic', sizePt: 16, color: '#493955', rotate: 270, label: 'Name (spine)' },
      { key: 'spineYear', xMm: 222, yMm: 78, wMm: 70, font: 'EB Garamond', sizePt: 16, color: '#493955', rotate: 270, label: 'Year (spine)' },
    ]
  },

  scale: 3,
  fonts: { display: 'NT Comic', body: 'EB Garamond' },
  colors: {
    plum:     '#493955',
    beige:    '#FDF1E5',
    coral:    '#F47E67',
    lagoon:   '#3EA0CE',
    meadow:   '#2DA46E',
    mango:    '#F4CA6F',
    amethyst: '#B56BB3',
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
            bgColor: '#f8ead9',
            svg: 'SP Spread 1/SP 01 H Left.svg',
            slots: [
              { slot: 1, x: 95, y: 100, xBleed: 98, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 98, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'NT Somic', sizePt: 16, style: 'medium', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955' } }
            ]
          },
          V: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 1/SP 01 V Left.svg',
            slots: [
              { slot: 1, x: 95, y: 90, xBleed: 98, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 98, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'NT Somic', sizePt: 16, style: 'medium', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955' } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 1/SP 02 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 55, xBleed: 108, yBleed: 58, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
              { slot: 2, x: 105, y: 150, xBleed: 108, yBleed: 153, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#f8ead9',
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
            bgColor: '#f8ead9',
            svg: 'SP Spread 2/SP 03 H Left.svg',
            slots: [
              { slot: 1, x: 95, y: 55, xBleed: 98, yBleed: 58, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
              { slot: 2, x: 95, y: 145, xBleed: 98, yBleed: 148, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 2/SP 03 V Left.svg',
            slots: [
              { slot: 1, x: 50, y: 130, xBleed: 53, yBleed: 133, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
              { slot: 2, x: 140, y: 70, xBleed: 143, yBleed: 73, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 2/SP 04 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#f8ead9',
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
            bgColor: '#f8ead9',
            svg: 'SP Spread 3/SP 05 H Left.svg',
            slots: [
              { slot: 1, x: 95, y: 55, xBleed: 98, yBleed: 58, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
              { slot: 2, x: 95, y: 145, xBleed: 98, yBleed: 148, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 3/SP 05 V Left.svg',
            slots: [
              { slot: 1, x: 50, y: 70, xBleed: 53, yBleed: 73, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
              { slot: 2, x: 140, y: 130, xBleed: 143, yBleed: 133, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 3/SP 06 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 70, xBleed: 108, yBleed: 73, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 179.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'NT Somic', sizePt: 16, style: 'medium', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955' } }
            ]
          },
          V: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 3/SP 06 V Right.svg',
            slots: [
              { slot: 1, x: 85, y: 100, xBleed: 88, yBleed: 103, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 173, yMm: 43, wMm: 40, hMm: 40, halign: 'left', valign: 'top', font: 'NT Somic', sizePt: 16, style: 'medium', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955' } }
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
            bgColor: '#fdd16f',
            svg: 'SP Spread 4/SP 07 H Left.svg',
            slots: [
              { slot: 1, x: 95, y: 55, xBleed: 98, yBleed: 58, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
              { slot: 2, x: 95, y: 145, xBleed: 98, yBleed: 148, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#fdd16f',
            svg: 'SP Spread 4/SP 07 V Left.svg',
            slots: [
              { slot: 1, x: 50, y: 100, xBleed: 53, yBleed: 103, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
              { slot: 2, x: 140, y: 100, xBleed: 143, yBleed: 103, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#fdd16f',
            svg: 'SP Spread 4/SP 08 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'NT Somic', sizePt: 16, style: 'medium', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955' } }
            ]
          },
          V: {
            bgColor: '#fdd16f',
            svg: 'SP Spread 4/SP 08 V Right.svg',
            slots: [
              { slot: 1, x: 105, y: 90, xBleed: 108, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 108, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'NT Somic', sizePt: 16, style: 'medium', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955' } }
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
            bgColor: '#f8ead9',
            svg: 'SP Spread 5/SP 09 H Left.svg',
            slots: [
              { slot: 1, x: 75, y: 55, xBleed: 78, yBleed: 58, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
              { slot: 2, x: 115, y: 145, xBleed: 118, yBleed: 148, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 5/SP 09 V Left.svg',
            slots: [
              { slot: 1, x: 50, y: 70, xBleed: 53, yBleed: 73, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
              { slot: 2, x: 140, y: 130, xBleed: 143, yBleed: 133, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 5/SP 10 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 130, xBleed: 108, yBleed: 133, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 66.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'NT Somic', sizePt: 16, style: 'medium', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955' } }
            ]
          },
          V: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 5/SP 10 V Right.svg',
            slots: [
              { slot: 1, x: 105, y: 110, xBleed: 108, yBleed: 113, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 108, yMm: 21.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'NT Somic', sizePt: 16, style: 'medium', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955' } }
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
            bgColor: '#ff8773',
            svg: 'SP Spread 6/SP 11 H Left.svg',
            slots: [
              { slot: 1, x: 95, y: 100, xBleed: 98, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 98, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'NT Somic', sizePt: 16, style: 'medium', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955' } }
            ]
          },
          V: {
            bgColor: '#ff8773',
            svg: 'SP Spread 6/SP 11 V Left.svg',
            slots: [
              { slot: 1, x: 95, y: 90, xBleed: 98, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 98, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'NT Somic', sizePt: 16, style: 'medium', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955' } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 6/SP 12 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'NT Somic', sizePt: 16, style: 'medium', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955' } }
            ]
          },
          V: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 6/SP 12 V Right.svg',
            slots: [
              { slot: 1, x: 105, y: 90, xBleed: 108, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 108, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'NT Somic', sizePt: 16, style: 'medium', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955' } }
            ]
          },
        },
      }
    },

    FP1: {
      orderFormPhoto: {"count":1,"hint":"A photo of the birthday child — used as the centrepiece of the birthday page."},
      orderFormMeta: {"textPrompt":"Birthday wishes","hint":"A short message or poem for the birthday page.","placeholder":"e.g. Happy first birthday, Leo! We love you to the moon and back."},
      type: 'functional', id: 'FP1', label: 'Birthday wishes', textLeft: true,
      pages: {
        left: {
          default: {
            bgColor: '#fdd16f',
            svg: 'FP Spread 1/FP Birthday 01 L.svg',
            slots: [],
            textPanel: { caption: { allowed: true, xMm: 98, yMm: 113, wMm: 86, hMm: 140, halign: 'center', valign: 'center', font: 'NT Somic', sizePt: 16, style: 'medium', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955' } }
          },
        },
        right: {
          V: {
            bgColor: '#fdd16f',
            svg: 'FP Spread 1/FP Birthday 02 R.svg',
            slots: [
              { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 165, h: 175, ratio: '33:35', heartClip: true, pool: 'special', caption: { allowed: false } }
            ]
          },
        },
      }
    },

    FP2: {
      orderFormPhoto: null,
      orderFormMeta: {"funnyWords":true,"minWords":3,"maxWords":5},
      type: 'functional', id: 'FP2', label: 'Funny words', textLeft: true,
      pages: {
        left: {
          default: {
            bgColor: '#f8ead9',
            svg: 'FP Spread 2/FP Words 03 L.svg',
            slots: [],
            textPanel: { caption: { allowed: true, xMm: 98, yMm: 143, wMm: 90, hMm: 80, halign: 'center', valign: 'center', font: 'FirstTimeWriting', sizePt: 20, style: 'regular', letterSpacing: 0, lineSpacing: 1.2, color: '#493955' }, funnyWords: true }
          },
        },
        right: {
          S: {
            svg: 'FP Spread 2/FP Words 04 R.svg',
            slots: [
              { slot: 1, x: 100, y: 100, xBleed: 103, yBleed: 103, w: 200, h: 200, ratio: '1:1', fullBleed: true, pool: 'regular', caption: { allowed: false } }
            ]
          },
        },
      }
    },

    FP3: {
      orderFormPhoto: {"count":1,"hint":"A photo of the favourite toy — placed on the left page with a caption."},
      orderFormMeta: {"textPrompt":"Caption","hint":"Name the toy and add a word or two about it.","placeholder":"e.g. Bunny — Leo's constant companion since day one."},
      type: 'functional', id: 'FP3', label: 'Favourite toy', specialLeft: true,
      pages: {
        left: {
          H: {
            bgColor: '#c16ac1',
            svg: 'FP Spread 3/FP Toy 05 H L.svg',
            slots: [
              { slot: 1, x: 95, y: 130, xBleed: 98, yBleed: 133, w: 150, h: 100, ratio: '3:2', pool: 'special', caption: { allowed: true, xMm: 98, yMm: 63, wMm: 100, hMm: 20, halign: 'center', valign: 'top', font: 'NT Somic', sizePt: 16, style: 'medium', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955' } }
            ]
          },
          V: {
            bgColor: '#c16ac1',
            svg: 'FP Spread 3/FP Toy 05 V L.svg',
            slots: [
              { slot: 1, x: 76, y: 115, xBleed: 79, yBleed: 118, w: 87, h: 130, ratio: '87:130', pool: 'special', caption: { allowed: true, xMm: 157.5, yMm: 73, wMm: 50, hMm: 40, halign: 'left', valign: 'top', font: 'NT Somic', sizePt: 16, style: 'medium', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955' } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f8ead9',
            svg: 'FP Spread 3/FP Toy 06 H R.svg',
            slots: [
              { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', pool: 'regular', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#f8ead9',
            svg: 'FP Spread 3/FP Toy 06 V R.svg',
            slots: [
              { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 120, h: 160, ratio: '3:4', pool: 'regular', caption: { allowed: false } }
            ]
          },
        },
      }
    },

    FP4: {
      orderFormPhoto: {"count":1,"hint":"A photo capturing those first steps — placed on the left page with a caption."},
      orderFormMeta: {"textPrompt":"Caption","hint":"A short note about the moment.","placeholder":"e.g. First wobbly steps — 14 March 2024, at home in the kitchen."},
      type: 'functional', id: 'FP4', label: 'First steps', specialLeft: true,
      pages: {
        left: {
          H: {
            bgColor: '#f8ead9',
            svg: 'FP Spread 4/FP Steps 07 H L.svg',
            slots: [
              { slot: 1, x: 95, y: 130, xBleed: 98, yBleed: 133, w: 150, h: 100, ratio: '3:2', pool: 'special', caption: { allowed: true, xMm: 98, yMm: 53, wMm: 100, hMm: 20, halign: 'center', valign: 'top', font: 'NT Somic', sizePt: 16, style: 'medium', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955' } }
            ]
          },
          V: {
            bgColor: '#f8ead9',
            svg: 'FP Spread 4/FP Steps 07 V L.svg',
            slots: [
              { slot: 1, x: 76, y: 115, xBleed: 79, yBleed: 118, w: 87, h: 130, ratio: '93:139', pool: 'special', caption: { allowed: true, xMm: 157.5, yMm: 163, wMm: 50, hMm: 40, halign: 'left', valign: 'bottom', font: 'NT Somic', sizePt: 16, style: 'medium', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955' } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f8ead9',
            svg: 'FP Spread 4/FP Steps 08 H R.svg',
            slots: [
              { slot: 1, x: 105, y: 70, xBleed: 108, yBleed: 73, w: 150, h: 100, ratio: '3:2', pool: 'regular', caption: { allowed: true, xMm: 108, yMm: 179.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'NT Somic', sizePt: 16, style: 'medium', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955' } }
            ]
          },
          V: {
            bgColor: '#f8ead9',
            svg: 'FP Spread 4/FP Steps 08 V R.svg',
            slots: [
              { slot: 1, x: 105, y: 90, xBleed: 108, yBleed: 93, w: 120, h: 160, ratio: '3:4', pool: 'regular', caption: { allowed: true, xMm: 108, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'NT Somic', sizePt: 16, style: 'medium', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955' } }
            ]
          },
        },
      }
    },

    FP5: {
      orderFormPhoto: {"count":2,"hint":"Two pieces of artwork — one per page. Scan or photograph flat on a surface."},
      orderFormMeta: {"count":2,"labels":["Left page caption","Right page caption"],"placeholder":"e.g. Autumn leaves, October 2024"},
      type: 'functional', id: 'FP5', label: 'Art-Gallery', allArtwork: true,
      pages: {
        left: {
          H: {
            bgColor: '#ff8773',
            svg: 'FP Spread 5/FP Art 09 H L.svg',
            slots: [
              { slot: 1, x: 95, y: 100, xBleed: 98, yBleed: 103, w: 150, h: 100, ratio: '3:2', pool: 'artwork', caption: { allowed: true, xMm: 98, yMm: 179.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'EB Garamond', sizePt: 18, style: 'regular', letterSpacing: 0.03, lineSpacing: 1.35, color: '#493955' } }
            ]
          },
          V: {
            bgColor: '#ff8773',
            svg: 'FP Spread 5/FP Art 09 V L.svg',
            slots: [
              { slot: 1, x: 95, y: 100, xBleed: 98, yBleed: 103, w: 110, h: 140, ratio: '11:14', pool: 'artwork', caption: { allowed: true, xMm: 98, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'EB Garamond', sizePt: 18, style: 'regular', letterSpacing: 0.03, lineSpacing: 1.35, color: '#493955' } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f8ead9',
            svg: 'FP Spread 5/FP Art 10 H R.svg',
            slots: [
              { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', pool: 'artwork', caption: { allowed: true, xMm: 108, yMm: 179.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'EB Garamond', sizePt: 18, style: 'regular', letterSpacing: 0.03, lineSpacing: 1.35, color: '#493955' } }
            ]
          },
          V: {
            bgColor: '#f8ead9',
            svg: 'FP Spread 5/FP Art 12 V R.svg',
            slots: [
              { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 110, h: 140, ratio: '11:14', pool: 'artwork', caption: { allowed: true, xMm: 108, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'EB Garamond', sizePt: 18, style: 'regular', letterSpacing: 0.03, lineSpacing: 1.35, color: '#493955' } }
            ]
          },
        },
      }
    },

  }
};
