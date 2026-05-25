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
      { xMm: 309, yMm: 100, wMm: 140, hMm: 100, pool: 'cover' }
    ],
    captions: [
      { key: 'year', xMm: 309, yMm: 25, wMm: 180, font: 'EB Garamond', sizePt: 33, align: 'center', label: 'Year' },
      { key: 'name', xMm: 309, yMm: 175, wMm: 180, font: 'NT Somic', sizePt: 28, align: 'center', label: 'Name' },
      { key: 'spineName', xMm: 204.5, yMm: 140, wMm: 130, font: 'EB Garamond', sizePt: 16, rotate: 270, label: 'Name (spine)' },
      { key: 'spineYear', xMm: 205, yMm: 60, wMm: 70, font: 'NT Somic', sizePt: 16, rotate: 270, label: 'Year (spine)' },
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
              { slot: 1, x: 105, y: 70, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, position: 'below', offset: 50, font: 'NT Somic', sizePt: 14, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955', align: 'center' } }
            ]
          },
          V: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 0/SP 06 V Right.svg',
            slots: [
              { slot: 1, x: 85, y: 100, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, position: 'upper-right', offset: 5, font: 'NT Somic', sizePt: 14, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955', align: 'left' } }
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
              { slot: 1, x: 95, y: 100, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, position: 'below', offset: 10, font: 'NT Somic', sizePt: 14, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955', align: 'center' } }
            ]
          },
          V: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 1/SP 01 V Left.svg',
            slots: [
              { slot: 1, x: 95, y: 90, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, position: 'below', offset: 6, font: 'NT Somic', sizePt: 14, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955', align: 'center' } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 1/SP 02 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 55, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
              { slot: 2, x: 105, y: 150, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 1/SP 02 V Right.svg',
            slots: [
              { slot: 1, x: 60, y: 100, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
              { slot: 2, x: 150, y: 100, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } }
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
              { slot: 1, x: 95, y: 55, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
              { slot: 2, x: 95, y: 145, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 2/SP 03 V Left.svg',
            slots: [
              { slot: 1, x: 50, y: 130, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
              { slot: 2, x: 140, y: 70, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 2/SP 04 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 100, w: 150, h: 100, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 2/SP 04 V Right.svg',
            slots: [
              { slot: 1, x: 105, y: 100, w: 120, h: 160, ratio: '3:4', caption: { allowed: false } }
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
              { slot: 1, x: 95, y: 55, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
              { slot: 2, x: 95, y: 145, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 3/SP 05 V Left.svg',
            slots: [
              { slot: 1, x: 50, y: 70, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
              { slot: 2, x: 140, y: 130, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 3/SP 06 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 70, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, position: 'below', offset: 50, font: 'NT Somic', sizePt: 14, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955', align: 'center' } }
            ]
          },
          V: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 3/SP 06 V Right.svg',
            slots: [
              { slot: 1, x: 85, y: 100, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, position: 'upper-right', offset: 5, font: 'NT Somic', sizePt: 14, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955', align: 'left' } }
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
              { slot: 1, x: 95, y: 55, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
              { slot: 2, x: 95, y: 145, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#fdd16f',
            svg: 'SP Spread 4/SP 07 V Left.svg',
            slots: [
              { slot: 1, x: 50, y: 100, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
              { slot: 2, x: 140, y: 100, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#fdd16f',
            svg: 'SP Spread 4/SP 08 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 100, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, position: 'below', offset: 10, font: 'NT Somic', sizePt: 14, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955', align: 'center' } }
            ]
          },
          V: {
            bgColor: '#fdd16f',
            svg: 'SP Spread 4/SP 08 V Right.svg',
            slots: [
              { slot: 1, x: 105, y: 90, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, position: 'below', offset: 6, font: 'NT Somic', sizePt: 14, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955', align: 'center' } }
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
              { slot: 1, x: 75, y: 55, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
              { slot: 2, x: 115, y: 145, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 5/SP 09 V Left.svg',
            slots: [
              { slot: 1, x: 50, y: 70, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
              { slot: 2, x: 140, y: 130, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 5/SP 10 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 130, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, position: 'above', offset: 7, font: 'NT Somic', sizePt: 14, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955', align: 'center' } }
            ]
          },
          V: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 5/SP 10 V Right.svg',
            slots: [
              { slot: 1, x: 105, y: 110, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, position: 'above', offset: 6, font: 'NT Somic', sizePt: 14, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955', align: 'center' } }
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
              { slot: 1, x: 95, y: 100, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, position: 'below', offset: 10, font: 'NT Somic', sizePt: 14, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955', align: 'center' } }
            ]
          },
          V: {
            bgColor: '#ff8773',
            svg: 'SP Spread 6/SP 11 V Left.svg',
            slots: [
              { slot: 1, x: 95, y: 90, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, position: 'below', offset: 10, font: 'NT Somic', sizePt: 14, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955', align: 'center' } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 6/SP 12 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 100, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, position: 'below', offset: 5, font: 'NT Somic', sizePt: 14, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955', align: 'center' } }
            ]
          },
          V: {
            bgColor: '#f8ead9',
            svg: 'SP Spread 6/SP 12 V Right.svg',
            slots: [
              { slot: 1, x: 105, y: 90, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, position: 'below', offset: 5, font: 'NT Somic', sizePt: 14, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955', align: 'center' } }
            ]
          },
        },
      }
    },

    FP1: {
      type: 'functional', id: 'FP1', label: 'Birthday wishes', textLeft: true,
      orderFormPhoto: { count: 1, hint: 'One photo for this spread. It goes in a heart-shaped frame.' },
      orderFormMeta: {
        textPrompt: 'Birthday wishes',
        hint: 'Short message, poem, or note for this spread.',
        placeholder: 'e.g. Happy first birthday, Leo!',
      },
      pages: {
        left: {
          default: {
            bgColor: '#fdd16f',
            svg: 'FP Spread 1/FP Birthday 01 L.svg',
            slots: [],
            textPanel: { caption: { allowed: true, position: 'center', font: 'NT Somic', sizePt: 16, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955', align: 'center' } }
          },
        },
        right: {
          V: {
            bgColor: '#fdd16f',
            svg: 'FP Spread 1/FP Birthday 02 R.svg',
            slots: [
              { slot: 1, x: 105, y: 100, w: 165, h: 175, ratio: '33:35', heartClip: true, pool: 'special', caption: { allowed: false } }
            ]
          },
        },
      }
    },

    FP2: {
      type: 'functional', id: 'FP2', label: 'Funny words', textLeft: true,
      orderFormPhoto: null,  // no photo needed from customer
      orderFormMeta: {
        textPrompt: 'Funny words',
        hint: "Enter 3 to 10 of your child's funniest words or phrases, one per line.",
        funnyWords: true,
        minWords: 3,
        maxWords: 10,
      },
      pages: {
        left: {
          default: {
            bgColor: '#f8ead9',
            svg: 'FP Spread 2/FP Words 03 L.svg',
            slots: [],
            textPanel: { caption: { allowed: true, position: 'center', font: 'FirstTimeWriting', sizePt: 20, style: 'regular', letterSpacing: 0, lineSpacing: 1.2, color: '#493955', align: 'center' }, funnyWords: true }
          },
        },
        right: {
          S: {
            svg: 'FP Spread 2/FP Words 04 R.svg',
            slots: [
              { slot: 1, x: 100, y: 100, w: 200, h: 200, ratio: '1:1', fullBleed: true, pool: 'regular', caption: { allowed: false } }
            ]
          },
        },
      }
    },

    FP3: {
      type: 'functional', id: 'FP3', label: 'Favourite toy', specialLeft: true,
      orderFormPhoto: { count: 1, hint: "One photo of your child's favourite toy." },
      orderFormMeta: {
        textPrompt: 'Favourite toy caption',
        hint: "Name, funny detail, or brief note about the toy.",
        placeholder: "e.g. Mr. Bear, Leo's companion since day one",
      },
      pages: {
        left: {
          H: {
            bgColor: '#c16ac1',
            svg: 'FP Spread 3/FP Toy 05 H L.svg',
            slots: [
              { slot: 1, x: 95, y: 130, w: 150, h: 100, ratio: '3:2', pool: 'special', caption: { allowed: true, position: 'above', offset: 10, font: 'NT Somic', sizePt: 16, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955', align: 'center' } }
            ]
          },
          V: {
            bgColor: '#c16ac1',
            svg: 'FP Spread 3/FP Toy 05 V L.svg',
            slots: [
              { slot: 1, x: 76, y: 115, w: 87, h: 130, ratio: '87:130', pool: 'special', caption: { allowed: true, position: 'upper-right', offset: 8, font: 'NT Somic', sizePt: 16, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955', align: 'left' } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f8ead9',
            svg: 'FP Spread 3/FP Toy 06 H R.svg',
            slots: [
              { slot: 1, x: 105, y: 100, w: 150, h: 100, ratio: '3:2', pool: 'regular', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#f8ead9',
            svg: 'FP Spread 3/FP Toy 06 V R.svg',
            slots: [
              { slot: 1, x: 105, y: 100, w: 120, h: 160, ratio: '3:4', pool: 'regular', caption: { allowed: false } }
            ]
          },
        },
      }
    },

    FP4: {
      type: 'functional', id: 'FP4', label: 'First steps', specialLeft: true,
      orderFormPhoto: { count: 1, hint: 'One photo of the first steps moment.' },
      orderFormMeta: {
        textPrompt: 'First steps caption',
        hint: 'Date, milestone, or brief note.',
        placeholder: 'e.g. First steps, 14 October 2024',
      },
      pages: {
        left: {
          H: {
            bgColor: '#f8ead9',
            svg: 'FP Spread 4/FP Steps 07 H L.svg',
            slots: [
              { slot: 1, x: 95, y: 130, w: 150, h: 100, ratio: '3:2', pool: 'special', caption: { allowed: true, position: 'above', offset: 25, font: 'NT Somic', sizePt: 16, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955', align: 'center' } }
            ]
          },
          V: {
            bgColor: '#f8ead9',
            svg: 'FP Spread 4/FP Steps 07 V L.svg',
            slots: [
              { slot: 1, x: 95, y: 118, w: 93, h: 139, ratio: '93:139', pool: 'special', caption: { allowed: true, position: 'lower-right', offset: 6, font: 'NT Somic', sizePt: 16, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955', align: 'left' } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f8ead9',
            svg: 'FP Spread 4/FP Steps 08 H R.svg',
            slots: [
              { slot: 1, x: 105, y: 70, w: 150, h: 100, ratio: '3:2', pool: 'regular', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#f8ead9',
            svg: 'FP Spread 4/FP Steps 08 V R.svg',
            slots: [
              { slot: 1, x: 105, y: 100, w: 120, h: 160, ratio: '3:4', pool: 'regular', caption: { allowed: false } }
            ]
          },
        },
      }
    },

    FP5: {
      type: 'functional', id: 'FP5', label: 'Art-Gallery', allArtwork: true,
      orderFormPhoto: { count: 2, hint: "Two photos of your child's artwork — one per page of the gallery spread." },
      orderFormMeta: {
        textPrompt: 'Art gallery captions',
        hint: 'A short caption for each artwork.',
        count: 2,
        labels: ['Caption — left page', 'Caption — right page'],
        placeholder: "e.g. Blue period, age 2",
      },
      pages: {
        left: {
          H: {
            bgColor: '#ff8773',
            svg: 'FP Spread 5/FP Art 09 H L.svg',
            slots: [
              { slot: 1, x: 95, y: 100, w: 150, h: 100, ratio: '3:2', pool: 'artwork', caption: { allowed: true, position: 'below', offset: 20, font: 'EB Garamond', sizePt: 13, style: 'regular', letterSpacing: 0.03, lineSpacing: 1.35, color: '#493955', align: 'center' } }
            ]
          },
          V: {
            bgColor: '#ff8773',
            svg: 'FP Spread 5/FP Art 09 V L.svg',
            slots: [
              { slot: 1, x: 95, y: 100, w: 110, h: 140, ratio: '11:14', pool: 'artwork', caption: { allowed: true, position: 'below', offset: 9, font: 'EB Garamond', sizePt: 13, style: 'regular', letterSpacing: 0.03, lineSpacing: 1.35, color: '#493955', align: 'center' } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f8ead9',
            svg: 'FP Spread 5/FP Art 10 H R.svg',
            slots: [
              { slot: 1, x: 105, y: 100, w: 150, h: 100, ratio: '3:2', pool: 'artwork', caption: { allowed: true, position: 'below', offset: 20, font: 'EB Garamond', sizePt: 13, style: 'regular', letterSpacing: 0.03, lineSpacing: 1.35, color: '#493955', align: 'center' } }
            ]
          },
          V: {
            bgColor: '#f8ead9',
            svg: 'FP Spread 5/FP Art 12 V R.svg',
            slots: [
              { slot: 1, x: 105, y: 100, w: 110, h: 140, ratio: '11:14', pool: 'artwork', caption: { allowed: true, position: 'below', offset: 9, font: 'EB Garamond', sizePt: 13, style: 'regular', letterSpacing: 0.03, lineSpacing: 1.35, color: '#493955', align: 'center' } }
            ]
          },
        },
      }
    },

  }
};
