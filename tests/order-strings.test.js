// Germanization Stage 4 — the order form's string table.
//
// The failure that matters here is a customer meeting a blank label or an
// English sentence stranded in a German form. `npm test` does not execute
// order.html (see LEARNINGS S156), so these tests check the contract between
// the markup and the table statically: every key the page asks for exists,
// and every key that exists is complete.

const fs   = require('fs');
const path = require('path');

const ROOT      = path.join(__dirname, '..');
const ORDER_HTML = fs.readFileSync(path.join(ROOT, 'pages/order.html'), 'utf8');

function loadStrings() {
  const src = fs.readFileSync(path.join(ROOT, 'assets/js/order-strings.js'), 'utf8');
  const sandbox = { window: {} };
  new Function('window', src).call(sandbox, sandbox.window);
  return sandbox.window.ORDER_STRINGS;
}

const STRINGS = loadStrings();

// Keys reached by concatenation or a ternary, which the static scan below
// cannot see. Listed explicitly so a rename still fails loudly.
const DYNAMIC_KEYS = [
  'addon.word.ex1', 'addon.word.ex2', 'addon.word.ex3',
  'compose.introBoy', 'compose.introGirl',
];

function keysUsedInPage() {
  const used = new Set(DYNAMIC_KEYS);
  // `[,)]` excludes the concatenated form `t('addon.word.ex' + n)`, whose
  // real keys are listed in DYNAMIC_KEYS.
  for (const m of ORDER_HTML.matchAll(/\bt\(\s*'([a-zA-Z0-9._]+)'\s*[,)]/g)) used.add(m[1]);
  for (const m of ORDER_HTML.matchAll(/data-i18n(?:-ph)?="([a-zA-Z0-9._]+)"/g)) used.add(m[1]);
  // The note/hint maps hold keys rather than literals.
  for (const m of ORDER_HTML.matchAll(/'((?:notes|addon)\.(?:ph\.)?[a-zA-Z]+)'/g)) used.add(m[1]);
  return used;
}

describe('order form string table', () => {

  test('every entry has English — the fallback can never be blank', () => {
    const empty = Object.entries(STRINGS)
      .filter(([, v]) => typeof v.en !== 'string' || v.en === '')
      .map(([k]) => k);
    expect(empty).toEqual([]);
  });

  test('every entry has German — a DE order shows no English text', () => {
    const missing = Object.entries(STRINGS)
      .filter(([, v]) => typeof v.de !== 'string' || v.de === '')
      .map(([k]) => k);
    expect(missing).toEqual([]);
  });

  test('every key the page asks for exists in the table', () => {
    const unknown = [...keysUsedInPage()].filter(k => !STRINGS[k]);
    expect(unknown).toEqual([]);
  });

  test('placeholder tokens match between English and German', () => {
    // {name}, {min}, {date}… must survive translation or the substitution
    // silently leaves a literal brace on screen.
    const mismatched = [];
    for (const [key, v] of Object.entries(STRINGS)) {
      const toks = s => (s.match(/\{[a-z]+\}/g) || []).sort().join(',');
      if (toks(v.en) !== toks(v.de)) mismatched.push(key);
    }
    // The Newborn closing line is deliberately asymmetric: English substitutes
    // the customer's word, German carries the whole gendered noun phrase.
    expect(mismatched.sort()).toEqual(['compose.introBoy', 'compose.introGirl']);
  });

  test('the table is loaded before the form script that reads it', () => {
    const tableAt = ORDER_HTML.indexOf('order-strings.js');
    const usesAt  = ORDER_HTML.indexOf('window.ORDER_STRINGS');
    expect(tableAt).toBeGreaterThan(-1);
    expect(tableAt).toBeLessThan(usesAt);
  });

  // The first version of this test named five strings by hand and passed while
  // the upload overlay, both modals and the auth errors were still English
  // (found by the owner clicking, S178). It now sweeps instead of sampling:
  // any English-looking sentence in customer-facing markup must either carry a
  // `data-i18n` attribute or be built through `t()`.
  test('no untranslated English sentence is left in the markup', () => {
    const strays = [];
    // Element text: >Some English words< with no data-i18n on the tag and no
    // ${t(...)} interpolation inside.
    for (const m of ORDER_HTML.matchAll(/<([a-z0-9]+)([^>]*)>([A-Z][a-z][^<>{}$]{10,})</g)) {
      const [, tag, attrs, text] = m;
      if (tag === 'title' || tag === 'option') continue;
      if (/data-i18n/.test(attrs)) continue;
      if (!/[a-z] [a-z]/.test(text)) continue;      // needs ≥2 lowercase words
      strays.push(text.trim().slice(0, 60));
    }
    expect(strays).toEqual([]);
  });

  test('no untranslated English sentence is left in the script', () => {
    // Quoted string literals of sentence shape that are not a t() key and not
    // an internal identifier. Deliberately narrow: a capitalised first word,
    // at least three words, and a sentence-ending character.
    const script = ORDER_HTML.slice(ORDER_HTML.indexOf('<script>'));
    const strays = [];
    for (const m of script.matchAll(/(?<![\w.])'([A-Z][a-z]+(?: [A-Za-z',’—-]+){2,}[.!?…])'/g)) {
      strays.push(m[1].slice(0, 60));
    }
    expect(strays).toEqual([]);
  });
});
