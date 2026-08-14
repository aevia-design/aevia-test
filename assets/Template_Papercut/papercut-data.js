window.PAPERCUT_DATA = {
  template: 'papercut',
  pageSize: 200,
  bleed: 3,
  canvasPx: 600,

  cover: {
    svg: 'Cover/Artboard 1.svg',
    overlayAbovePhotos: false,
    referenceSpineMm: 9,  // spine width this cover was authored at
    sections: {
      back:  { xMm: 0,   wMm: 200, bgColor: '#8bb8d8' },
      // Spine is GREEN, not the cover blue. Corrected S154 from #8bb8d8 after reading the
      // SVG: the spine rect (x=566.929 w=25.512 → exactly 200–209mm) is fill="#79ba9b".
      // Since the panel split, this value is the ONLY source of the printed spine colour,
      // so the old blue would have printed a mismatched band. Same class of error as
      // Tender's (declared cream, artwork taupe).
      spine: { xMm: 200, wMm: 9,   bgColor: '#79ba9b' },
      front: { xMm: 209, wMm: 200, bgColor: '#8bb8d8' },
    },
    // Exposed board-edge colours for the offline mockup composites (compose-all.mjs).
    // Kept SEPARATE from sections[].bgColor (which drives the real cover render).
    // Spine corrected S154 to match the artwork (was #8bb8d8, the cover blue). Takes
    // effect only when the mockups are next re-composited — they are pre-baked images.
    mockupEdges: { front: '#8bb8d8', spine: '#79ba9b', back: '#8bb8d8' },
    // Cover coords are WITH-BLEED (18mm) and box-CENTRE; the render subtracts COVER_BLEED_MM.
    // Slot enlarged S154 to cover the clipShape silhouette. The CSV's 140×100 box at
    // 328/118 was SMALLER than the artwork's own photo opening (clipPath #ac): the
    // silhouette reached 2.97mm above and 1.39mm below it. The <g data-name="Image">
    // group in the SVG holds a violet #914c77 placeholder rect clipped to that same
    // silhouette, so those uncovered bands showed as a violet stripe along the top of
    // every Papercut cover photo. Box is now the silhouette's bbox, rounded outward.
    // Consequence: the photo box is no longer 7:5 (139.6×104.4), so the crop differs
    // slightly — the silhouette is the authority for what is actually visible.
    slots: [
      { xMm: 327.65, yMm: 117.21, wMm: 139.6, hMm: 104.4, pool: 'cover', orientation: 'landscape', clipShape: 'coverFrame' }
    ],
    // Custom photo silhouette — polygon from <clipPath id="ac"> in Cover/Artboard 1.svg.
    // ViewBox 1159.37×566.929 over 409mm trim cover → 2.835 px/mm, origin at trim top-left.
    clipShapes: {
      coverFrame: {
        pxPerMm: 2.835,
        bboxPx: { minX: 679.993, minY: 133.321, maxX: 1075.697, maxY: 429.184 },
        d: 'M679.993,152.586 L928.959,136.568 L890.239,135.772 L1048.378,133.321 L1075.3,176.408 L1075.697,415.982 L773.304,429.184 L706.838,423.024 L683.433,415.124 L684.257,309.395 Z'
      }
    },
    captions: [
      // Front captions corrected S154 against Xenia's artboard: the ALBUM NAME sits left
      // in the wide 120mm box in Source Sans Bold 26pt, and the YEAR sits right in the
      // narrow 60mm box in Regular 28pt. The CSV had the box geometry and fonts right but
      // attached the label/placeholder/maxlength to the wrong one, so the engine rendered
      // the year on the left and the name on the right. Swapped the GEOMETRY between the
      // two rows rather than the keys, so any caption text already saved against
      // 'name'/'year' stays with the right field.
      { key: 'name',      xMm: 301, yMm: 180, wMm: 120, font: 'Source Sans 3', sizePt: 26, weight: 700, align: 'center',  color: '#4a4b40', label: 'Front — album name', placeholder: 'Our sweet Ann', maxLength: 60 },
      { key: 'year',      xMm: 390, yMm: 180, wMm: 60,  font: 'Source Sans 3', sizePt: 28, weight: 400, align: 'center', color: '#4a4b40', label: 'Front — year',       placeholder: '2026',          maxLength: 10 },
      // Spine order corrected S154: the artboard puts the NAME at the top of the spine
      // and the YEAR below it; the y values were the wrong way round. Swapped yMm only.
      { key: 'spineName', xMm: 222.5, yMm: 78,  wMm: 98,  font: 'Source Sans 3', sizePt: 16, weight: 400, color: '#4a4b40', rotate: 270, label: 'Spine — name', placeholder: 'Ann',  maxLength: 20 },
      { key: 'spineYear', xMm: 222.5, yMm: 158, wMm: 38,  font: 'Source Sans 3', sizePt: 16, weight: 400, color: '#4a4b40', rotate: 270, label: 'Spine — year', placeholder: '2026', maxLength: 10 },
    ]
  },

  scale: 3,
  fontPicker: ['Source Sans 3'],

  // Papercut heart clip-path (FP1 right page). ViewBox 0 0 566.929 566.929.
  // Scaled from SVG viewBox (566.929) to 600px canvas: ×(600/566.929) so the clip
  // aligns with the heart outline in FP Birthday 02 Right.svg when rendered at 600px.
  heartClipPath: 'M298.27,569.28l118.17,-124.21,131.76,-250.25,-62.31,-109.30,-109.30,-19.41,-83.30,36.93,-100.55,-37.97,-103.35,29.96,-37.61,124.30,51.07,148.12,42.90,76.60,152.50,125.22Z',

  spreads: {

    SP0: {
      type: 'standard', id: 'SP0', label: 'Spread 0', rightOnly: true,
      overlayAbovePhotos: true,
      pages: {
        right: {
          H: {
            bgColor: '#f3e8dc',
            svg: 'SP Spread 0/SP 06 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 70, xBleed: 108, yBleed: 73, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 179.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Source Sans 3', sizePt: 16, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#4a4b40' } }
            ]
          },
          V: {
            bgColor: '#f3e8dc',
            svg: 'SP Spread 0/SP 06 V Right.svg',
            slots: [
              { slot: 1, x: 85, y: 100, xBleed: 88, yBleed: 103, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 173, yMm: 43, wMm: 40, hMm: 40, halign: 'left', valign: 'top', font: 'Source Sans 3', sizePt: 16, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#4a4b40' } }
            ]
          },
        },
      }
    },

    SP1: {
      type: 'standard', id: 'SP1', label: 'Spread 1',
      overlayAbovePhotos: true,
      pages: {
        left: {
          H: {
            bgColor: '#b5ceb5',
            svg: 'SP Spread 1/SP 01 H Left.svg',
            slots: [
              { slot: 1, x: 95, y: 100, xBleed: 98, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 98, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Source Sans 3', sizePt: 16, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#4a4b40' } }
            ]
          },
          V: {
            bgColor: '#b5ceb5',
            svg: 'SP Spread 1/SP 01 V Left.svg',
            slots: [
              { slot: 1, x: 95, y: 90, xBleed: 98, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 98, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Source Sans 3', sizePt: 16, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#4a4b40' } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f3e8dc',
            svg: 'SP Spread 1/SP 02 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 55,  xBleed: 108, yBleed: 58,  w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
              { slot: 2, x: 105, y: 150, xBleed: 108, yBleed: 153, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#f3e8dc',
            svg: 'SP Spread 1/SP 02 V Right.svg',
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
      overlayAbovePhotos: true,
      pages: {
        left: {
          H: {
            bgColor: '#ddecf0',
            svg: 'SP Spread 2/SP 03 H Left.svg',
            slots: [
              { slot: 1, x: 95, y: 55,  xBleed: 98, yBleed: 58,  w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
              { slot: 2, x: 95, y: 145, xBleed: 98, yBleed: 148, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#ddecf0',
            svg: 'SP Spread 2/SP 03 V Left.svg',
            slots: [
              { slot: 1, x: 50,  y: 130, xBleed: 53,  yBleed: 133, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
              { slot: 2, x: 140, y: 70,  xBleed: 143, yBleed: 73,  w: 80, h: 107, ratio: '80:107', caption: { allowed: false } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#ddecf0',
            svg: 'SP Spread 2/SP 04 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#ddecf0',
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
      overlayAbovePhotos: true,
      pages: {
        left: {
          H: {
            bgColor: '#f3e8dc',
            svg: 'SP Spread 3/SP 05 H Left.svg',
            slots: [
              { slot: 1, x: 95, y: 55,  xBleed: 98, yBleed: 58,  w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
              { slot: 2, x: 95, y: 145, xBleed: 98, yBleed: 148, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#f3e8dc',
            svg: 'SP Spread 3/SP 05 V Left.svg',
            slots: [
              { slot: 1, x: 50,  y: 70,  xBleed: 53,  yBleed: 73,  w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
              { slot: 2, x: 140, y: 130, xBleed: 143, yBleed: 133, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f3e8dc',
            svg: 'SP Spread 3/SP 06 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 70, xBleed: 108, yBleed: 73, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 179.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Source Sans 3', sizePt: 16, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#4a4b40' } }
            ]
          },
          V: {
            bgColor: '#f3e8dc',
            svg: 'SP Spread 3/SP 06 V Right.svg',
            slots: [
              { slot: 1, x: 85, y: 100, xBleed: 88, yBleed: 103, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 173, yMm: 43, wMm: 40, hMm: 40, halign: 'left', valign: 'top', font: 'Source Sans 3', sizePt: 16, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#4a4b40' } }
            ]
          },
        },
      }
    },

    SP4: {
      type: 'standard', id: 'SP4', label: 'Spread 4',
      overlayAbovePhotos: false,
      pages: {
        left: {
          H: {
            bgColor: '#8bb8d8',
            svg: 'SP Spread 4/SP 07 H Left.svg',
            slots: [
              { slot: 1, x: 95, y: 55,  xBleed: 98, yBleed: 58,  w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
              { slot: 2, x: 95, y: 145, xBleed: 98, yBleed: 148, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#8bb8d8',
            svg: 'SP Spread 4/SP 07 V Left.svg',
            slots: [
              { slot: 1, x: 50,  y: 100, xBleed: 53,  yBleed: 103, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
              { slot: 2, x: 140, y: 100, xBleed: 143, yBleed: 103, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#8bb8d8',
            svg: 'SP Spread 4/SP 08 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Source Sans 3', sizePt: 16, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#4a4b40' } }
            ]
          },
          V: {
            bgColor: '#8bb8d8',
            svg: 'SP Spread 4/SP 08 V Right.svg',
            slots: [
              { slot: 1, x: 105, y: 90, xBleed: 108, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 108, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Source Sans 3', sizePt: 16, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#4a4b40' } }
            ]
          },
        },
      }
    },

    SP5: {
      type: 'standard', id: 'SP5', label: 'Spread 5',
      overlayAbovePhotos: true,
      pages: {
        left: {
          H: {
            bgColor: '#f3e8dc',
            svg: 'SP Spread 5/SP 09 H Left.svg',
            slots: [
              { slot: 1, x: 75,  y: 55,  xBleed: 78,  yBleed: 58,  w: 120, h: 80, ratio: '3:2', caption: { allowed: false } },
              { slot: 2, x: 115, y: 145, xBleed: 118, yBleed: 148, w: 120, h: 80, ratio: '3:2', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#f3e8dc',
            svg: 'SP Spread 5/SP 09 V Left.svg',
            slots: [
              { slot: 1, x: 50,  y: 70,  xBleed: 53,  yBleed: 73,  w: 80, h: 107, ratio: '80:107', caption: { allowed: false } },
              { slot: 2, x: 140, y: 130, xBleed: 143, yBleed: 133, w: 80, h: 107, ratio: '80:107', caption: { allowed: false } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#bb85a7',
            svg: 'SP Spread 5/SP 10 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 130, xBleed: 108, yBleed: 133, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 66.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Source Sans 3', sizePt: 16, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#4a4b40' } }
            ]
          },
          V: {
            bgColor: '#bb85a7',
            svg: 'SP Spread 5/SP 10 V Right.svg',
            slots: [
              { slot: 1, x: 105, y: 110, xBleed: 108, yBleed: 113, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 108, yMm: 21.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Source Sans 3', sizePt: 16, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#4a4b40' } }
            ]
          },
        },
      }
    },

    SP6: {
      type: 'standard', id: 'SP6', label: 'Spread 6',
      overlayAbovePhotos: true,
      pages: {
        left: {
          H: {
            bgColor: '#ddecf0',
            svg: 'SP Spread 6/SP 11 H Left.svg',
            slots: [
              { slot: 1, x: 95, y: 100, xBleed: 98, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 98, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Source Sans 3', sizePt: 16, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#4a4b40' } }
            ]
          },
          V: {
            bgColor: '#ddecf0',
            svg: 'SP Spread 6/SP 11 V Left.svg',
            slots: [
              { slot: 1, x: 95, y: 90, xBleed: 98, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 98, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Source Sans 3', sizePt: 16, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#4a4b40' } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#ddecf0',
            svg: 'SP Spread 6/SP 12 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', caption: { allowed: true, xMm: 108, yMm: 169.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Source Sans 3', sizePt: 16, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#4a4b40' } }
            ]
          },
          V: {
            bgColor: '#ddecf0',
            svg: 'SP Spread 6/SP 12 V Right.svg',
            slots: [
              { slot: 1, x: 105, y: 90, xBleed: 108, yBleed: 93, w: 120, h: 160, ratio: '3:4', caption: { allowed: true, xMm: 108, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Source Sans 3', sizePt: 16, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#4a4b40' } }
            ]
          },
        },
      }
    },

    FP1: {
      orderFormPhoto: { count: 1, hint: 'A photo of the birthday child for the centrepiece of the birthday page.' },
      orderFormMeta: { textPrompt: 'Birthday wishes', hint: 'A short message or poem for the birthday page.', placeholder: 'e.g. Happy first birthday, Leo! We love you to the moon and back.' },
      type: 'functional', id: 'FP1', label: 'Birthday wishes', textLeft: true,
      overlayAbovePhotos: true,
      pages: {
        left: {
          default: {
            bgColor: '#b5ceb5',
            svg: 'FP Spread 1 Birthday/FP Birthday 01 Left.svg', svgDe: 'FP Spread 1 Birthday/FP Birthday 01 Left-DE.svg',
            slots: [],
            textPanel: { caption: { allowed: true, xMm: 98, yMm: 113, wMm: 86, hMm: 140, halign: 'center', valign: 'center', font: 'Source Sans 3', sizePt: 16, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#4a4b40' } }
          },
        },
        right: {
          V: {
            bgColor: '#b5ceb5',
            svg: 'FP Spread 1 Birthday/FP Birthday 02 Right.svg',
            slots: [
              { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 165, h: 175, ratio: '33:35', heartClip: true, pool: 'special', caption: { allowed: false } }
            ]
          },
        },
      }
    },

    FP2: {
      orderFormPhoto: null,
      orderFormMeta: { funnyWords: true, minWords: 3, maxWords: 5 },
      type: 'functional', id: 'FP2', label: 'Funny words', textLeft: true,
      overlayAbovePhotos: true,
      pages: {
        left: {
          default: {
            bgColor: '#f3e8dc',
            svg: 'FP Spread 2 Words/FP Words 03 Left.svg', svgDe: 'FP Spread 2 Words/FP Words 03 Left-DE.svg',
            slots: [],
            textPanel: { caption: { allowed: true, xMm: 98, yMm: 143, wMm: 90, hMm: 80, halign: 'center', valign: 'center', font: 'FirstTimeWriting', sizePt: 20, style: 'regular', letterSpacing: 0, lineSpacing: 1.2, color: '#4a4b40' }, funnyWords: true }
          },
        },
        right: {
          S: {
            svg: 'FP Spread 2 Words/FP Words 04 Right.svg',
            slots: [
              { slot: 1, x: 100, y: 100, xBleed: 103, yBleed: 103, w: 200, h: 200, ratio: '1:1', fullBleed: true, pool: 'regular', caption: { allowed: false } }
            ]
          },
        },
      }
    },

    FP3: {
      orderFormPhoto: { count: 1, hint: 'A photo of the favourite toy for the left page, with a caption.' },
      orderFormMeta: { textPrompt: 'Caption', hint: 'Name the toy and add a word or two about it.', placeholder: 'e.g. Bunny — Leo\'s constant companion since day one.' },
      type: 'functional', id: 'FP3', label: 'Favourite toy', specialLeft: true,
      overlayAbovePhotos: true,
      pages: {
        left: {
          H: {
            bgColor: '#e7c979',
            svg: 'FP Spread 3 Toys/FP Toy 05 H Left.svg', svgDe: 'FP Spread 3 Toys/FP Toy 05 Left-DE.svg',
            slots: [
              { slot: 1, x: 95, y: 130, xBleed: 98, yBleed: 133, w: 150, h: 100, ratio: '3:2', pool: 'special', caption: { allowed: true, xMm: 98, yMm: 63, wMm: 100, hMm: 20, halign: 'center', valign: 'top', font: 'Source Sans 3', sizePt: 16, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#4a4b40' } }
            ]
          },
          V: {
            bgColor: '#e7c979',
            svg: 'FP Spread 3 Toys/FP Toy 05 V Left.svg', svgDe: 'FP Spread 3 Toys/FP Toy 05 Left-DE.svg',
            slots: [
              { slot: 1, x: 76, y: 115, xBleed: 79, yBleed: 118, w: 87, h: 130, ratio: '87:130', pool: 'special', caption: { allowed: true, xMm: 157.5, yMm: 73, wMm: 50, hMm: 40, halign: 'left', valign: 'top', font: 'Source Sans 3', sizePt: 16, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#4a4b40' } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f3e8dc',
            svg: 'FP Spread 3 Toys/FP Toy 06 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', pool: 'regular', caption: { allowed: false } }
            ]
          },
          V: {
            bgColor: '#f3e8dc',
            svg: 'FP Spread 3 Toys/FP Toy 06 V Right.svg',
            slots: [
              { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 120, h: 160, ratio: '3:4', pool: 'regular', caption: { allowed: false } }
            ]
          },
        },
      }
    },

    FP4: {
      orderFormPhoto: { count: 1, hint: 'A photo of those first steps for the left page, with a caption.' },
      orderFormMeta: { textPrompt: 'Caption', hint: 'A short note about the moment.', placeholder: 'e.g. First wobbly steps — 14 March 2024, at home in the kitchen.' },
      type: 'functional', id: 'FP4', label: 'First steps', specialLeft: true,
      overlayAbovePhotos: false,
      pages: {
        left: {
          H: {
            bgColor: '#ddecf0',
            svg: 'FP Spread 4 Steps/FP Steps 07 H Left.svg', svgDe: 'FP Spread 4 Steps/FP Steps 07 Left-DE.svg',
            slots: [
              { slot: 1, x: 95, y: 130, xBleed: 98, yBleed: 133, w: 150, h: 100, ratio: '3:2', pool: 'special', caption: { allowed: true, xMm: 98, yMm: 53, wMm: 100, hMm: 20, halign: 'center', valign: 'top', font: 'Source Sans 3', sizePt: 16, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955' } }
            ]
          },
          V: {
            bgColor: '#ddecf0',
            svg: 'FP Spread 4 Steps/FP Steps 07 V Left.svg', svgDe: 'FP Spread 4 Steps/FP Steps 07 Left-DE.svg',
            slots: [
              { slot: 1, x: 76, y: 115, xBleed: 79, yBleed: 118, w: 87, h: 130, ratio: '93:139', pool: 'special', caption: { allowed: true, xMm: 157.5, yMm: 163, wMm: 50, hMm: 40, halign: 'left', valign: 'bottom', font: 'Source Sans 3', sizePt: 16, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955' } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#ddecf0',
            svg: 'FP Spread 4 Steps/FP Steps 08 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 70, xBleed: 108, yBleed: 73, w: 150, h: 100, ratio: '3:2', pool: 'regular', caption: { allowed: true, xMm: 108, yMm: 179.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Source Sans 3', sizePt: 16, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955' } }
            ]
          },
          V: {
            bgColor: '#ddecf0',
            svg: 'FP Spread 4 Steps/FP Steps 08 V Right.svg',
            slots: [
              { slot: 1, x: 105, y: 90, xBleed: 108, yBleed: 93, w: 120, h: 160, ratio: '3:4', pool: 'regular', caption: { allowed: true, xMm: 108, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Source Sans 3', sizePt: 16, style: 'regular', letterSpacing: -0.02, lineSpacing: 1.28, color: '#493955' } }
            ]
          },
        },
      }
    },

    FP5: {
      orderFormPhoto: { count: 2, hint: 'Two pieces of artwork, one per page. Scan or photograph them flat on a surface.' },
      orderFormMeta: { count: 2, labels: ['Left page caption', 'Right page caption'], placeholder: 'e.g. Autumn leaves, October 2024' },
      type: 'functional', id: 'FP5', label: 'Art-Gallery', allArtwork: true,
      overlayAbovePhotos: true,
      pages: {
        left: {
          H: {
            bgColor: '#f3e8dc',
            svg: 'FP Spread 5 Art/FP Art 09 H Left.svg',
            slots: [
              { slot: 1, x: 95, y: 100, xBleed: 98, yBleed: 103, w: 150, h: 100, ratio: '3:2', pool: 'artwork', caption: { allowed: true, xMm: 98, yMm: 179.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Source Sans 3', sizePt: 16, style: 'regular', letterSpacing: 0.03, lineSpacing: 1.35, color: '#493955' } }
            ]
          },
          V: {
            bgColor: '#f3e8dc',
            svg: 'FP Spread 5 Art/FP Art 09 V Left.svg',
            slots: [
              { slot: 1, x: 95, y: 100, xBleed: 98, yBleed: 103, w: 110, h: 140, ratio: '11:14', pool: 'artwork', caption: { allowed: true, xMm: 98, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Source Sans 3', sizePt: 16, style: 'regular', letterSpacing: 0.03, lineSpacing: 1.35, color: '#493955' } }
            ]
          },
        },
        right: {
          H: {
            bgColor: '#f3e8dc',
            svg: 'FP Spread 5 Art/FP Art 09 H Right.svg',
            slots: [
              { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 150, h: 100, ratio: '3:2', pool: 'artwork', caption: { allowed: true, xMm: 108, yMm: 179.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Source Sans 3', sizePt: 16, style: 'regular', letterSpacing: 0.03, lineSpacing: 1.35, color: '#493955' } }
            ]
          },
          V: {
            bgColor: '#f3e8dc',
            svg: 'FP Spread 5 Art/FP Art 09 V Right.svg',
            slots: [
              { slot: 1, x: 105, y: 100, xBleed: 108, yBleed: 103, w: 110, h: 140, ratio: '11:14', pool: 'artwork', caption: { allowed: true, xMm: 108, yMm: 184.5, wMm: 100, hMm: 13, halign: 'center', valign: 'top', font: 'Source Sans 3', sizePt: 16, style: 'regular', letterSpacing: 0.03, lineSpacing: 1.35, color: '#493955' } }
            ]
          },
        },
      }
    },

  }
};
