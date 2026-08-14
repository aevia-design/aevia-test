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
  for (const m of ORDER_HTML.matchAll(/data-i18n(?:-ph|-html)?="([a-zA-Z0-9._]+)"/g)) used.add(m[1]);
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

  test('no customer-facing literal was left behind in the markup', () => {
    // A regression guard for the sentences Stage 4 moved into the table.
    const strays = [
      'Submit your order', 'Your photos are in.', 'Upload your photos',
      'Change template', 'incl. VAT, excl. shipping',
    ].filter(s => {
      // Allowed only inside a data-i18n element's fallback text.
      const re = new RegExp(`data-i18n[^>]*>${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
      return ORDER_HTML.includes(s) && !re.test(ORDER_HTML);
    });
    expect(strays).toEqual([]);
  });
});
