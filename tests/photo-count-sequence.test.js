// Regression test for the order form's photo-count sequence (S135 item 8).
//
// Bug: calcPhotoTarget() hardcoded the standard spreads to ['SP1'..'SP6'], so
// Joyride's SP7/SP8/SP9 never entered the sequence and the order form asked for
// 4 fewer photos than the book has slots (43 where the engine had 47). The staff
// engine and customer-preview had already been de-hardcoded at S129; the order
// form was the third surface and was missed.
//
// House-style: the sequence builder lives inline in pages/order.html and can't be
// imported, so the derivation is mirrored here (as photo-count-guard.test.js does)
// AND a tripwire asserts the real file still derives rather than hardcodes.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
global.window = {};
[
  'Scribble/scribble-data.js', 'Wander/wander-data.js', 'Newborn/newborn-data.js',
  'Papercut/papercut-data.js', 'Tender/tender-data.js', 'Joyride/joyride-data.js',
].forEach(f => require(path.join(ROOT, 'assets', `Template_${f}`)));

const DATAS = {
  scribble: window.SCRIBBLE_DATA, wander: window.WANDER_DATA, newborn: window.NEWBORN_DATA,
  papercut: window.PAPERCUT_DATA, tender: window.TENDER_DATA, joyride: window.JOYRIDE_DATA,
};

// Mirrors calcPhotoTarget() in pages/order.html (and buildBookSequence in both engines).
function standardIds(DATA) {
  return Object.keys(DATA?.spreads || {})
    .filter(id => /^SP[1-9]\d*$/.test(id))
    .sort((a, b) => parseInt(a.slice(2), 10) - parseInt(b.slice(2), 10));
}

function buildSequence(DATA, pageCount, selectedFPs) {
  const firstOverride = selectedFPs.find(id => DATA.spreads?.[id]?.replacesFirstSpread);
  const bodyFPs       = selectedFPs.filter(id => id !== firstOverride);
  const standardCount = (pageCount / 2 - 1) - bodyFPs.length;
  const stdIds        = standardIds(DATA);
  const standards     = [];
  for (let i = 0; i < standardCount; i++) standards.push(stdIds[i % stdIds.length]);
  const positions = bodyFPs.map((_, i) => Math.round((i + 1) * (standards.length + 1) / (bodyFPs.length + 1)));
  for (let i = bodyFPs.length - 1; i >= 0; i--) standards.splice(positions[i], 0, bodyFPs[i]);
  return [firstOverride || 'SP0', ...standards];
}

function countRegularSlots(DATA, sequence) {
  let n = 0;
  sequence.forEach(id => {
    const sp = DATA.spreads[id];
    if (!sp) return;
    (sp.rightOnly ? ['right'] : ['left', 'right']).forEach(side => {
      const pageDef = sp.pages?.[side];
      if (!pageDef) return;
      const v = pageDef['H'] || pageDef['V'] || pageDef['default'] || pageDef[Object.keys(pageDef)[0]];
      if (!v?.slots) return;
      n += v.slots.filter(s => !s.pool || s.pool === 'regular').length;
    });
  });
  return n;
}

const target = (key, pages, fps) => countRegularSlots(DATAS[key], buildSequence(DATAS[key], pages, fps));

describe('Order form — photo-count sequence', () => {
  // The engine's real slot count is the source of truth. These two numbers were
  // observed in the staff engine during the S134 owner test round.
  test('Joyride 40p matches the engine: 49 with no special pages', () => {
    expect(target('joyride', 40, [])).toBe(49);
  });

  test('Joyride 40p matches the engine: 46 with Intro + Map', () => {
    expect(target('joyride', 40, ['FPintro', 'FP1'])).toBe(46);
  });

  test('Joyride map-only is 47, not the old under-counted 43', () => {
    expect(target('joyride', 40, ['FP1'])).toBe(47);
  });

  // The invariant behind the bug: a template's standard spreads must all be
  // reachable. The old SP1-SP6 hardcode silently dropped Joyride's SP7-SP9.
  test.each(Object.keys(DATAS))('%s — every standard spread is reachable in the sequence', (key) => {
    const stdIds = standardIds(DATAS[key]);
    const seq = new Set(buildSequence(DATAS[key], 80, []));
    stdIds.forEach(id => expect(seq.has(id)).toBe(true));
  });

  // Templates with only SP1-SP6 were unaffected by the fix — pin them so the
  // change to calcPhotoTarget can't quietly move any other template's count.
  test.each([
    ['scribble', 55], ['wander', 55], ['newborn', 55], ['papercut', 55], ['tender', 55],
  ])('%s 40p is unchanged at %i photos', (key, expected) => {
    expect(target(key, 40, [])).toBe(expected);
  });

  // Tripwire: the real file must derive its standard spreads from the template
  // data. If someone reintroduces a hardcoded list, this fails.
  test('calcPhotoTarget derives standard spreads from the data, not a hardcoded list', () => {
    const src = fs.readFileSync(path.join(ROOT, 'pages', 'order.html'), 'utf8');
    const fn = src.slice(src.indexOf('function calcPhotoTarget'));
    const body = fn.slice(0, fn.indexOf('\n}'));
    expect(body).toMatch(/\/\^SP\[1-9\]/);
    expect(body).not.toMatch(/\['SP1'\s*,\s*'SP2'/);
  });
});
