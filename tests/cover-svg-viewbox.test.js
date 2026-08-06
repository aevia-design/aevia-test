// A cover SVG's viewBox must frame the TRIM area only — 409 × 200mm — with bleed
// artwork extending outside it. The engine sizes the cover SVG to exactly 409mm wide, so
// a viewBox that includes the 18mm bleed (445 × 236mm) squeezes 445mm of artwork into
// 409mm: everything renders ~8% small and the outer ~16mm of the front cover falls
// outside the artwork entirely, filling with the flat section bgColor. In print that is a
// blank band down the edge of the cover.
//
// This has now happened TWICE on the Wander cover (S154 and an earlier session), both
// times caught only by a human squinting at a render. The ratio is the tell: trim is
// 409:200 = 2.045, full-bleed is 445:236 = 1.886. They are not close, so one assertion
// separates them.
//
// The check is deliberately on the RATIO, not absolute units. Templates legitimately
// export at different scales (Papercut 2.835 px/mm, Wander 11.811 px/mm); what they may
// not do is frame a different REGION.

const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'assets');

// Trim cover: back(200) + spine(9, as authored) + front(200) = 409mm wide, 200mm tall.
const TRIM_RATIO = 409 / 200;
// Full-bleed would be 445/236 = 1.886 — far enough away that a loose tolerance is safe.
// 1% allows for rounding in Illustrator's export without admitting a bleed-framed box.
const TOLERANCE = 0.01;

/** Find `rel` (e.g. 'Cover/Artboard 1.svg') anywhere beneath `root`. */
function findUnder(root, rel) {
  const direct = path.join(root, rel);
  if (fs.existsSync(direct)) return direct;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const hit = findUnder(path.join(root, entry.name), rel);
    if (hit) return hit;
  }
  return null;
}

/** Every template's cover SVG, resolved from its data file's `cover.svg` path. */
function coverSvgs() {
  const out = [];
  for (const dir of fs.readdirSync(ASSETS).filter(d => d.startsWith('Template_'))) {
    const dataFile = fs.readdirSync(path.join(ASSETS, dir)).find(f => f.endsWith('-data.js'));
    if (!dataFile) continue;
    const src = fs.readFileSync(path.join(ASSETS, dir, dataFile), 'utf8');
    // cover: { svg: 'Cover/Artboard 1.svg', ... } — first `svg:` inside the cover block.
    const coverBlock = src.slice(src.indexOf('cover:'));
    const rel = (/svg:\s*'([^']+)'/.exec(coverBlock) || [])[1];
    if (!rel) continue;
    // Templates disagree on where the SVG folder sits: at the template root, under SVG/,
    // or under Spreads/. Search rather than enumerate, so a fourth convention still works.
    const file = findUnder(path.join(ASSETS, dir), rel);
    out.push({ template: dir.replace('Template_', ''), rel, file });
  }
  return out;
}

describe('cover SVG viewBox frames the trim, not the bleed', () => {
  const svgs = coverSvgs();

  test('every template resolves to a cover SVG on disk', () => {
    expect(svgs.length).toBeGreaterThan(0);
    const missing = svgs.filter(s => !s.file).map(s => `${s.template}: ${s.rel}`);
    expect(missing).toEqual([]);
  });

  test.each(svgs.filter(s => s.file).map(s => [s.template, s.file]))(
    '%s cover viewBox is 409:200, not 445:236',
    (template, file) => {
      // Read only the head — these files run to megabytes and the viewBox is near the top.
      const fd = fs.openSync(file, 'r');
      const buf = Buffer.alloc(4096);
      fs.readSync(fd, buf, 0, 4096, 0);
      fs.closeSync(fd);
      const head = buf.toString('utf8');

      const vb = /viewBox="\s*([-\d.]+)[\s,]+([-\d.]+)[\s,]+([-\d.]+)[\s,]+([-\d.]+)\s*"/.exec(head);
      expect(vb).not.toBeNull();

      const w = Number(vb[3]);
      const h = Number(vb[4]);
      const ratio = w / h;
      const drift = Math.abs(ratio - TRIM_RATIO) / TRIM_RATIO;

      // Name the likely cause in the failure message — the next person to hit this will
      // be looking at a render that "just looks a bit small", not at a ratio.
      const diagnosis = Math.abs(ratio - 445 / 236) / (445 / 236) < 0.02
        ? ' — this is the FULL-BLEED artboard (445x236mm). Re-export with the viewBox on ' +
          'the trim rectangle (409x200mm) and let the bleed fall outside it.'
        : '';

      expect({
        template,
        viewBox: `${w} x ${h}`,
        ratio: Number(ratio.toFixed(4)),
        expected: Number(TRIM_RATIO.toFixed(4)),
        note: drift <= TOLERANCE ? 'ok' : `off by ${(drift * 100).toFixed(1)}%${diagnosis}`,
      }).toMatchObject({ note: 'ok' });
    }
  );
});
