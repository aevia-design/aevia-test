// Germanization Stage 4b — German strings inside the template data files.
//
// Stage 4a moved the form's own copy into one string table. The per-template
// copy (cover labels, placeholders, functional-page prompts, the Newborn
// zodiac verses) stays beside its artwork as `labelDe` / `placeholderDe` /
// `hintDe` / `copyDe`, mirroring `svgDe` from Stage 2.
//
// The dangerous state is a HALF-filled map: a German book that prints English
// verses for four star signs and German for nine. These tests do not demand
// that every template is translated yet — they demand that whatever German
// exists is complete for its group.

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function loadTemplate(relPath, globalName) {
  const src = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const sandbox = { window: {} };
  new Function('window', src).call(sandbox, sandbox.window);
  return sandbox.window[globalName];
}

const NEWBORN = loadTemplate('assets/Template_Newborn/newborn-data.js', 'NEWBORN_DATA');

describe('German strings in template data files', () => {

  test('Newborn zodiac German covers every sign the English covers', () => {
    const z = NEWBORN.spreads.FPlabour.zodiac;
    expect(Object.keys(z.copyDe).sort()).toEqual(Object.keys(z.copy).sort());
  });

  test('Newborn zodiac German is never blank', () => {
    const z = NEWBORN.spreads.FPlabour.zodiac;
    const blank = Object.entries(z.copyDe).filter(([, v]) => !v || !v.trim()).map(([k]) => k);
    expect(blank).toEqual([]);
  });

  test('every selectable sign except None has a German display name', () => {
    const z = NEWBORN.spreads.FPlabour.zodiac;
    const missing = z.signs.filter(s => s !== 'None' && !z.signLabelsDe[s]);
    expect(missing).toEqual([]);
  });

  test('German sign labels never change the stored value', () => {
    // The option value keys the artwork path and the saved order. Only the
    // label may differ, so the German map must not introduce unknown signs.
    const z = NEWBORN.spreads.FPlabour.zodiac;
    const unknown = Object.keys(z.signLabelsDe).filter(s => !z.signs.includes(s));
    expect(unknown).toEqual([]);
  });

  test('Newborn cover captions carry German label AND placeholder together', () => {
    // A German label beside an English placeholder is the half-translated
    // state that reads worst on screen.
    const half = NEWBORN.cover.captions
      .filter(c => Boolean(c.labelDe) !== Boolean(c.placeholderDe))
      .map(c => c.key);
    expect(half).toEqual([]);
  });

  test('Newborn intro fields carry German label AND placeholder together', () => {
    const fields = NEWBORN.spreads.FPintro.orderFormMeta.fields;
    const half = fields
      .filter(f => Boolean(f.labelDe) !== Boolean(f.placeholderDe))
      .map(f => f.key);
    expect(half).toEqual([]);
  });

  test('Newborn labour slot hints are translated as a complete set', () => {
    const photo = NEWBORN.spreads.FPlabour.orderFormPhoto;
    expect(photo.slotHintsDe).toHaveLength(photo.slotHints.length);
    expect(photo.slotHintsDe.every(h => h && h.trim())).toBe(true);
  });
});
