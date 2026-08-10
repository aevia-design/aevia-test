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

// Trim cover: back(200) + spine + front(200), 200mm tall. The spine is 9mm as authored
// for every template except Heirloom, which Xenia drew at 10mm (410mm) and declares
// `referenceSpineMm: 10` — so the expected ratio comes from the data file, not a constant.
const trimRatio = (spineMm = 9) => (200 + spineMm + 200) / 200;
const TRIM_RATIO = trimRatio();
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

/** Every data file under a Template_ dir. Heirloom keeps one per COLOURWAY in a
 *  subfolder (Beige/heirloom-data.js), so a single top-level scan misses it entirely —
 *  which is how all four Heirloom colourways went unguarded until S160. */
function dataFiles() {
  const out = [];
  for (const dir of fs.readdirSync(ASSETS).filter(d => d.startsWith('Template_'))) {
    const root = path.join(ASSETS, dir);
    const label = dir.replace('Template_', '');
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('-data.js')) {
        out.push({ template: label, root, src: path.join(root, entry.name) });
      } else if (entry.isDirectory()) {
        const nested = fs.readdirSync(path.join(root, entry.name)).find(f => f.endsWith('-data.js'));
        if (nested) {
          out.push({ template: `${label}/${entry.name}`, root, src: path.join(root, entry.name, nested) });
        }
      }
    }
  }
  return out;
}

/** Every cover SVG a template can render — the default plus, where a template selects
 *  artwork per monogram, each monogram's own cover. Heirloom has 3 per colourway. */
function coverSvgs() {
  const out = [];
  for (const { template, root, src: srcPath } of dataFiles()) {
    const src = fs.readFileSync(srcPath, 'utf8');
    const spineMm = Number((/referenceSpineMm:\s*([\d.]+)/.exec(src) || [])[1]) || 9;
    // cover: { svg: 'Cover/Artboard 1.svg', ... } — first `svg:` inside the cover block.
    const coverBlock = src.slice(src.indexOf('cover:'));
    const rels = new Set();
    const dflt = (/svg:\s*'([^']+)'/.exec(coverBlock) || [])[1];
    if (dflt) rels.add(dflt);
    for (const m of src.matchAll(/coverSvg:\s*'([^']+)'/g)) rels.add(m[1]);
    for (const rel of rels) {
      // Templates disagree on where the SVG folder sits: at the template root, under SVG/,
      // or under Spreads/. Search rather than enumerate, so a fourth convention still works.
      out.push({ template, rel, spineMm, file: findUnder(root, rel) });
    }
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

  test.each(svgs.filter(s => s.file).map(s => [`${s.template} ${s.rel}`, s.file, s.spineMm]))(
    '%s viewBox frames the trim, not 445:236',
    (template, file, spineMm) => {
      const expectedRatio = trimRatio(spineMm);
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
      const drift = Math.abs(ratio - expectedRatio) / expectedRatio;

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
        expected: Number(expectedRatio.toFixed(4)),
        note: drift <= TOLERANCE ? 'ok' : `off by ${(drift * 100).toFixed(1)}%${diagnosis}`,
      }).toMatchObject({ note: 'ok' });
    }
  );
});
