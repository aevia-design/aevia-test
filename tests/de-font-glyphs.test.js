// Can the font a string is printed in actually render that string? (S180)
//
// NT Somic — Scribble's default caption font — carries ä ö ü and é but NOT ß.
// A missing glyph does not throw: the renderer substitutes another face or draws
// nothing, so the failure surfaces as a printed book that looks subtly wrong.
//
// `node scripts/check-font-glyphs.mjs` audits the font FILES. This test guards
// the other half: that no German string we ship is set in a font that cannot
// render it. It only covers strings whose font we know from the data file —
// cover captions declare their own `font`. Customer-typed text and AI captions
// cannot be checked here; they are a runtime concern (see the brief).

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function loadTemplate(relPath, globalName) {
  const src = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const sandbox = { window: {} };
  new Function('window', src).call(sandbox, sandbox.window);
  return sandbox.window[globalName];
}

// Characters a font is known to lack, by family name as the data files spell it.
// Extend this when check-font-glyphs.mjs reports a new gap.
const MISSING_BY_FONT = {
  'NT Somic': ['ß'],
};

const TEMPLATES = {
  Newborn:        ['assets/Template_Newborn/newborn-data.js',               'NEWBORN_DATA'],
  Tender:         ['assets/Template_Tender/tender-data.js',                 'TENDER_DATA'],
  Scribble:       ['assets/Template_Scribble/scribble-data.js',             'SCRIBBLE_DATA'],
  Papercut:       ['assets/Template_Papercut/papercut-data.js',             'PAPERCUT_DATA'],
  Wander:         ['assets/Template_Wander/wander-data.js',                 'WANDER_DATA'],
  Joyride:        ['assets/Template_Joyride/joyride-data.js',               'JOYRIDE_DATA'],
  Laguna:         ['assets/Template_Laguna/laguna-data.js',                 'LAGUNA_DATA'],
  HeirloomBeige:  ['assets/Template_Heirloom/Beige/heirloom-data.js',       'HEIRLOOM_DATA'],
  HeirloomBrown:  ['assets/Template_Heirloom/Brown/heirloom-brown-data.js', 'HEIRLOOM_BROWN_DATA'],
  HeirloomGreen:  ['assets/Template_Heirloom/Green/heirloom-green-data.js', 'HEIRLOOM_GREEN_DATA'],
  HeirloomBlue:   ['assets/Template_Heirloom/Blue/heirloom-blue-data.js',   'HEIRLOOM_BLUE_DATA'],
};

describe('German text is only set in fonts that can render it', () => {

  test.each(Object.keys(TEMPLATES))('%s cover placeholders use no character their font lacks', (name) => {
    const [file, global] = TEMPLATES[name];
    const d = loadTemplate(file, global);
    const problems = [];
    (d.cover?.captions || []).forEach(c => {
      const bad = MISSING_BY_FONT[c.font];
      if (!bad) return;
      ['placeholderDe', 'labelDe'].forEach(field => {
        const val = c[field];
        if (typeof val !== 'string') return;
        bad.forEach(ch => {
          // labelDe is screen-only, but a label that cannot be printed is still a
          // sign the wording was chosen without the font in mind.
          if (val.includes(ch)) problems.push(`cover.${c.key}.${field} contains "${ch}" but ${c.font} has no such glyph`);
        });
      });
    });
    expect(problems).toEqual([]);
  });

  test('the known-gap table matches what the font files actually say', () => {
    // Guards against the table drifting from reality after a font re-drop: if
    // NT Somic ever gains ß, this fails and the table should lose the entry.
    const file = path.join(ROOT, 'assets/fonts/NTSomic-Regular.ttf');
    const buf = fs.readFileSync(file);
    const numTables = buf.readUInt16BE(4);
    let cmapOff = null;
    for (let i = 0; i < numTables; i++) {
      const rec = 12 + i * 16;
      if (buf.slice(rec, rec + 4).toString('latin1') === 'cmap') cmapOff = buf.readUInt32BE(rec + 8);
    }
    expect(cmapOff).not.toBeNull();

    const has = (cp) => {
      const nSub = buf.readUInt16BE(cmapOff + 2);
      for (let i = 0; i < nSub; i++) {
        const off = cmapOff + buf.readUInt32BE(cmapOff + 4 + i * 8 + 4);
        if (buf.readUInt16BE(off) !== 4) continue;
        const segX2 = buf.readUInt16BE(off + 6);
        const endO = off + 14, startO = endO + segX2 + 2, deltaO = startO + segX2, rangeO = deltaO + segX2;
        for (let s = 0; s < segX2 / 2; s++) {
          const end = buf.readUInt16BE(endO + s * 2);
          const start = buf.readUInt16BE(startO + s * 2);
          if (cp < start || cp > end || start === 0xFFFF) continue;
          const delta = buf.readUInt16BE(deltaO + s * 2);
          const rangeOff = buf.readUInt16BE(rangeO + s * 2);
          if (rangeOff === 0) return ((cp + delta) & 0xFFFF) !== 0;
          let g = buf.readUInt16BE(rangeO + s * 2 + rangeOff + (cp - start) * 2);
          return g !== 0;
        }
      }
      return false;
    };

    expect(has(0x00E4)).toBe(true);   // ä — present
    expect(has(0x00FC)).toBe(true);   // ü — present
    expect(has(0x00DF)).toBe(false);  // ß — the gap this table records
  });
});
