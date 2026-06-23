// web-mockups.mjs — derive web-ready product images from the print-fidelity
// mockup composites. Source PNGs live in mockups/<ORDER>/ (gitignored, 2800x1960,
// 2-5 MB each); this writes 1600px WebP (~50 KB) into assets/images/mockups/<template>/.
//
// Usage:  node web-mockups.mjs <template>
//   e.g.  node web-mockups.mjs scribble
//
// The map per template is the single source of truth for "which mockup file backs
// which web slot". Hero/closed/spreads are common; the fp* slots differ per template
// because each template's special-page spreads sit at different positions.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const COMMON = {
  'back.png':        'hero.webp',
  'closed.png':      'closed.webp',
  'open-01-sp1.png': 'spread-1.webp',
  'open-02-sp2.png': 'spread-2.webp',
};

const TEMPLATES = {
  scribble: { order: 'AEV-041', map: { ...COMMON,
    'open-04-fp1.png': 'fp1.webp',
    'open-07-fp2.png': 'fp2.webp',
    'open-11-fp3.png': 'fp3.webp',
    'open-14-fp4.png': 'fp4.webp',
    'open-18-fp5.png': 'fp5.webp',
  } },
  wander: { order: 'AEV-040', map: { ...COMMON,
    'open-11-fp1.png': 'fp1.webp',
  } },
  newborn: { order: 'AEV-039', map: { ...COMMON,
    'open-00-fpintro.png':  'fpintro.webp',
    'open-11-fplabour.png': 'fplabour.webp',
  } },
  papercut: { order: 'AEV-043', map: { ...COMMON,
    'open-04-fp1.png': 'fp1.webp',
    'open-07-fp2.png': 'fp2.webp',
    'open-11-fp3.png': 'fp3.webp',
    'open-14-fp4.png': 'fp4.webp',
    'open-18-fp5.png': 'fp5.webp',
  } },
};

const template = process.argv[2];
const cfg = TEMPLATES[template];
if (!cfg) { console.error('Unknown template. Use one of:', Object.keys(TEMPLATES).join(', ')); process.exit(1); }

const src = `../mockups/${cfg.order}/`;
const out = `../assets/images/mockups/${template}/`;
mkdirSync(out, { recursive: true });

for (const [from, to] of Object.entries(cfg.map)) {
  await sharp(src + from).resize({ width: 1600 }).webp({ quality: 82 }).toFile(out + to);
  console.log('wrote', template + '/' + to);
}
console.log('done', template);
