// The cover photo window in the ARTWORK must be empty — no opaque rect, no placeholder
// raster. The engine clips the customer's photo to the window and then draws the cover
// SVG on top of it (`.svg-overlay` z-index 2 vs the photo slot's 1), so anything opaque
// sitting inside that window hides the photo completely.
//
// The symptom is not "no photo". It is a flat coloured shape exactly where the photo
// should be, which reads as a rendering bug in the engine rather than a defect in the
// supplied asset:
//   S157  Heirloom  three covers shipped with the window painted #312128  -> dark box
//   S187  Tender    the window came back painted #c1d5ef                  -> blue oval
//         Newborn   the window came back holding a placeholder <image>    -> stock photo
//         Heirloom  Roots and Birds re-filled with #312128 again          -> dark box
//
// S187 is the second time Heirloom's window has been filled by a re-export, because the
// fix is an in-repo edit to a file Illustrator overwrites wholesale. That is precisely
// the kind of patch that gets silently lost, so it needs a test rather than a comment.
//
// Templates that set `overlayAbovePhotos: false` (Papercut, Laguna) draw the artwork
// BELOW the photo, so a filled window there is harmless and is not asserted on.

const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'assets');

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

/** Every data file under a Template_ dir, including Heirloom's per-colourway nesting. */
function dataFiles() {
  const out = [];
  for (const dir of fs.readdirSync(ASSETS).filter(d => d.startsWith('Template_'))) {
    const root = path.join(ASSETS, dir);
    const label = dir.replace('Template_', '');
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('-data.js')) {
        out.push({ template: label, root, src: path.join(root, entry.name) });
      } else if (entry.isDirectory()) {
        const sub = path.join(root, entry.name);
        const nested = fs.readdirSync(sub).find(f => f.endsWith('-data.js'));
        // Search from the COLOURWAY dir, not the template root. Searching from the root
        // resolves Blue/Brown/Green's 'Cover/Cover_40_Roots.svg' to Beige's copy — the
        // first match in readdir order — so all four colourways silently check one file.
        if (nested) out.push({ template: `${label}/${entry.name}`, root: sub, src: path.join(sub, nested) });
      }
    }
  }
  return out;
}

/** Cover SVGs for templates that draw their artwork ABOVE the photo. */
function overlaidCoverSvgs() {
  const out = [];
  for (const { template, root, src: srcPath } of dataFiles()) {
    const src = fs.readFileSync(srcPath, 'utf8');
    // Only these are at risk: where the SVG sits under the photo, a filled window is fine.
    if (/overlayAbovePhotos:\s*false/.test(src)) continue;
    const coverBlock = src.slice(src.indexOf('cover:'));
    const rels = new Set();
    const dflt = (/svg:\s*'([^']+)'/.exec(coverBlock) || [])[1];
    if (dflt) rels.add(dflt);
    for (const m of src.matchAll(/coverSvg:\s*'([^']+)'/g)) rels.add(m[1]);
    for (const rel of rels) out.push({ template, rel, file: findUnder(root, rel) });
  }
  return out;
}

/** Slice out the photo-window group, balancing <g>/</g> so we stop at its real end. */
function photoWindowGroup(svg) {
  const open = /<g\b[^>]*data-name="(Photo|Image)"[^>]*>/.exec(svg);
  if (!open) return null;
  let i = open.index + open[0].length;
  let depth = 1;
  const tag = /<\/?g\b[^>]*>/g;
  tag.lastIndex = i;
  let m;
  while ((m = tag.exec(svg)) !== null) {
    depth += m[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return { name: open[1], body: svg.slice(i, m.index) };
  }
  return { name: open[1], body: svg.slice(i) };
}

/** Opaque paint inside the window: a filled shape, or an embedded placeholder raster. */
function opaquePaint(body) {
  const found = [];
  for (const m of body.matchAll(/<(rect|path|ellipse|circle|polygon)\b[^>]*>/g)) {
    const fill = (/fill="([^"]+)"/.exec(m[0]) || [])[1];
    if (fill && fill !== 'none' && fill !== 'transparent') found.push(`${m[1]} fill="${fill}"`);
  }
  for (const m of body.matchAll(/<image\b[^>]*>/g)) {
    found.push('embedded <image> placeholder');
  }
  return found;
}

describe('cover photo window is empty in the artwork', () => {
  const svgs = overlaidCoverSvgs();

  test('there are overlaid cover SVGs to check', () => {
    expect(svgs.length).toBeGreaterThan(0);
    expect(svgs.filter(s => !s.file).map(s => `${s.template}: ${s.rel}`)).toEqual([]);
  });

  test.each(svgs.filter(s => s.file).map(s => [`${s.template} ${s.rel}`, s.file]))(
    '%s draws nothing opaque inside its photo window',
    (template, file) => {
      const group = photoWindowGroup(fs.readFileSync(file, 'utf8'));
      // No window group at all is fine — several templates place the photo against bare
      // artwork with no placeholder shape (Scribble, Joyride, Heirloom Roses).
      const paint = group ? opaquePaint(group.body) : [];

      expect({
        template,
        window: group ? `<g data-name="${group.name}">` : '(no photo-window group)',
        note: paint.length === 0 ? 'ok'
          : `hides the customer photo: ${paint.join(', ')} — the artwork renders ABOVE the ` +
            'photo, so this paints over it. Set the placeholder fill to "none" (or delete ' +
            'the placeholder <image>) in the SVG, and re-apply after every re-export.',
      }).toMatchObject({ note: 'ok' });
    }
  );
});
