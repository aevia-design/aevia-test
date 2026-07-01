// exp2-images.mjs — EXPERIMENTAL web image set for the product-page redesign.
// Writes to assets/images/mockups/exp2/<template>/ (scratch; production untouched).
//
// The spread mockups are now baked on the warm grey backdrop at the compositor
// (compose-all with BG_R/G/B — matches front-new/back-new #E3DFDA). This script's
// only job is to CROP each image tight to the book (fixed per-type rects, so every
// spread is framed identically and the book fills the frame) and emit web webp.
//
// Usage (from scripts/):  node exp2-images.mjs scribble
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

// Fixed crop rects (book + margin), measured from the composites.
//   cover  source 3000x2000, book centred (936–2062 / 436–1562)
//   spread source 2800x1960, book at 350–2386 / 466–1512
// Even margins that keep the book large but preserve the natural shadow falloff
// (so it fades into the grey instead of being clipped at the frame edge).
const COVER_CROP  = { left: 617, top: 338, width: 1766, height: 1325 };  // 4:3, centred, book ~64%
const SPREAD_CROP = { left: 118, top: 106, width: 2500, height: 1854 };  // ~4:3, book CENTRED (equal margin above / below+shadow), full falloff to img bottom

const TEMPLATES = {
  scribble: {
    order: 'AEV-041',
    spreads: { 'sp1':'open-01-sp1', 'sp2':'open-02-sp2', 'sp3':'open-03-sp3', 'sp4':'open-05-sp4' },
    specials:{ 'fp1':'open-04-fp1', 'fp2':'open-07-fp2', 'fp3':'open-11-fp3', 'fp4':'open-14-fp4', 'fp5':'open-18-fp5' },
  },
  wander: {
    order: 'AEV-040',
    spreads: { 'sp1':'open-01-sp1', 'sp2':'open-02-sp2', 'sp3':'open-03-sp3', 'sp4':'open-04-sp4' },
    specials:{ 'fp1':'open-11-fp1' },
  },
  papercut: {
    order: 'AEV-043',
    spreads: { 'sp1':'open-01-sp1', 'sp2':'open-02-sp2', 'sp3':'open-03-sp3', 'sp4':'open-05-sp4' },
    specials:{ 'fp1':'open-04-fp1', 'fp2':'open-07-fp2', 'fp3':'open-11-fp3', 'fp4':'open-14-fp4', 'fp5':'open-18-fp5' },
  },
  tender: {
    order: 'AEV-044',
    spreads: { 'sp1':'open-01-sp1', 'sp2':'open-02-sp2', 'sp3':'open-03-sp3', 'sp4':'open-04-sp4' },
    specials:{ 'fpintro':'open-00-fpintro', 'fpstory':'open-07-fpstory', 'fpwords':'open-14-fpwords' },
  },
  newborn: {
    order: 'AEV-039',
    spreads: { 'sp1':'open-01-sp1', 'sp2':'open-02-sp2', 'sp3':'open-03-sp3', 'sp4':'open-04-sp4' },
    specials:{ 'fpintro':'open-00-fpintro', 'fplabour':'open-11-fplabour' },
  },
};

const template = process.argv[2];
const cfg = TEMPLATES[template];
if (!cfg) { console.error('Unknown template:', template); process.exit(1); }

const src = `../mockups/${cfg.order}/`;
const out = `../assets/images/mockups/exp2/${template}/`;
mkdirSync(out, { recursive: true });

async function crop(file, rect, width) {
  const meta = await sharp(src + file).metadata();
  const left = Math.max(0, rect.left), top = Math.max(0, rect.top);
  const w = Math.min(rect.width,  meta.width  - left);
  const h = Math.min(rect.height, meta.height - top);
  return sharp(src + file).extract({ left, top, width: w, height: h })
    .resize({ width }).webp({ quality: 84 });
}

(async () => {
  await (await crop('front-new.png', COVER_CROP, 1500)).toFile(out + 'front.webp'); console.log('wrote front.webp');
  await (await crop('back-new.png',  COVER_CROP, 1500)).toFile(out + 'back.webp');  console.log('wrote back.webp');
  for (const [slot, file] of Object.entries(cfg.spreads))  { await (await crop(file+'.png', SPREAD_CROP, 1600)).toFile(out + slot + '.webp'); console.log('wrote', slot+'.webp'); }
  for (const [slot, file] of Object.entries(cfg.specials)) { await (await crop(file+'.png', SPREAD_CROP, 1400)).toFile(out + slot + '.webp'); console.log('wrote', slot+'.webp'); }
  console.log('done', template, '->', out);
})();
