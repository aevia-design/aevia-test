// Pre-defined book text must match the document it came from (S182).
//
// Some functional pages print AUTHORED book copy, not generated copy: Xenia wrote
// the passage, and the customer's answers only fill the bracketed slots. The whole
// passage must print. It is never abridged to fit a box (owner, S182).
//
// This exists because Tender's intro silently printed only the FIRST AND LAST
// stanza of a four-stanza passage, in BOTH languages, for as long as the template
// had existed. Nothing failed: `compose()` returned a perfectly valid string, the
// box it had to fit was simply too small, so the text had been trimmed to suit.
// The authored `*_DE.txt` / `*.txt` files are the source of truth, and until now
// nothing compared them against what the code actually emits.
//
// The test substitutes exactly the example values the document shows in brackets,
// so the composer's output should reproduce the document's own body text.

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function loadTemplate(relPath, globalName) {
  const src = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const sandbox = { window: {} };
  new Function('window', src).call(sandbox, sandbox.window);
  return sandbox.window[globalName];
}

/**
 * The authored body of one of Xenia's text documents: everything between the
 * "…Text:" header and the "____" field list, with the [brackets] stripped.
 * Blank lines are dropped — this test is about the WORDS being present and in
 * order, not about paragraph spacing (see the blank-line note at the bottom).
 */
function authoredLines(relPath) {
  const raw = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const body = raw.split(/_{5,}/)[0];                 // cut the "Required fields" tail
  return body
    .replace(/^[^\n]*Text:\s*/, '')                    // cut the header line
    .replace(/[\[\]]/g, '')                            // [14. Juni 2026] → 14. Juni 2026
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
}

const outputLines = (s) => s.split('\n').map(l => l.trim()).filter(Boolean);

// The values the documents themselves show in brackets, so substitution
// reproduces the document.
const EN_VALUES = { date: 'June 14th, 2026', place: 'Vienna, Austria', bride: 'Anna', groom: 'Michael' };
const DE_VALUES = { date: '14. Juni 2026',   place: 'Wien, Österreich', bride: 'Anna', groom: 'Michael' };

const WEDDING_INTRO = {
  Tender: {
    data: ['assets/Template_Tender/tender-data.js', 'TENDER_DATA'],
    spread: 'FPintro',
    en: 'assets/Template_Tender/FP Spread 0 Intro/Intro Page_Text.txt',
    de: 'assets/Template_Tender/FP Spread 0 Intro/Intro Page_Text_DE.txt',
  },
  // All four colourways carry their own copy of the composer, so all four can drift.
  HeirloomBeige: { data: ['assets/Template_Heirloom/Beige/heirloom-data.js',       'HEIRLOOM_DATA'],       spread: 'FPintro', en: 'assets/Template_Heirloom/Intro Page_Text.txt', de: 'assets/Template_Heirloom/Intro Page_Text_DE.txt' },
  HeirloomBrown: { data: ['assets/Template_Heirloom/Brown/heirloom-brown-data.js', 'HEIRLOOM_BROWN_DATA'], spread: 'FPintro', en: 'assets/Template_Heirloom/Intro Page_Text.txt', de: 'assets/Template_Heirloom/Intro Page_Text_DE.txt' },
  HeirloomGreen: { data: ['assets/Template_Heirloom/Green/heirloom-green-data.js', 'HEIRLOOM_GREEN_DATA'], spread: 'FPintro', en: 'assets/Template_Heirloom/Intro Page_Text.txt', de: 'assets/Template_Heirloom/Intro Page_Text_DE.txt' },
  HeirloomBlue:  { data: ['assets/Template_Heirloom/Blue/heirloom-blue-data.js',   'HEIRLOOM_BLUE_DATA'],  spread: 'FPintro', en: 'assets/Template_Heirloom/Intro Page_Text.txt', de: 'assets/Template_Heirloom/Intro Page_Text_DE.txt' },
};

describe('authored intro copy is printed in full, not abridged', () => {

  test.each(Object.keys(WEDDING_INTRO))('%s: compose() reproduces the English document', (name) => {
    const cfg = WEDDING_INTRO[name];
    const meta = loadTemplate(...cfg.data).spreads[cfg.spread].orderFormMeta;
    expect(outputLines(meta.compose(EN_VALUES))).toEqual(authoredLines(cfg.en));
  });

  test.each(Object.keys(WEDDING_INTRO))('%s: composeDe() reproduces the German document', (name) => {
    const cfg = WEDDING_INTRO[name];
    const meta = loadTemplate(...cfg.data).spreads[cfg.spread].orderFormMeta;
    expect(meta.composeDe).toBeDefined();
    expect(outputLines(meta.composeDe(DE_VALUES))).toEqual(authoredLines(cfg.de));
  });

  test('Tender and Heirloom share one authored passage, so their composers must agree', () => {
    // The two templates' source documents are byte-identical in both languages
    // (verified S182). If someone edits one composer, this catches the other
    // being left behind — which is exactly how Tender ended up abridged.
    const t = loadTemplate(...WEDDING_INTRO.Tender.data).spreads.FPintro.orderFormMeta;
    const h = loadTemplate(...WEDDING_INTRO.HeirloomBeige.data).spreads.FPintro.orderFormMeta;
    expect(outputLines(t.compose(EN_VALUES))).toEqual(outputLines(h.compose(EN_VALUES)));
    expect(outputLines(t.composeDe(DE_VALUES))).toEqual(outputLines(h.composeDe(DE_VALUES)));
  });

  test('every stanza of the German passage survives, not just the first and last', () => {
    // The specific S182 regression: the middle stanza and the closing line were
    // both missing. Name them, so a future "tidy-up" cannot quietly drop them.
    const t = loadTemplate(...WEDDING_INTRO.Tender.data).spreads.FPintro.orderFormMeta;
    const de = t.composeDe(DE_VALUES);
    expect(de).toContain('Umgeben von den Menschen, die wir lieben');
    expect(de).toContain('uns jeden Tag füreinander zu entscheiden');
    expect(de).toContain('Der Anfang von für immer');
  });
});

describe('the box can actually hold the authored passage', () => {
  // The passage was abridged because it did not fit. Pin the geometry that makes
  // it fit, so shrinking the box cannot silently re-crop the text. The real
  // measurement (PDF wrapText + Parisienne metrics) says the German needs
  // 119.2mm at 130mm wide; anything smaller crops it again.
  test('Tender intro panel is big enough for the German passage at its authored size', () => {
    const cap = loadTemplate(...WEDDING_INTRO.Tender.data)
      .spreads.FPintro.pages.right.default.textPanel.caption;
    expect(cap.sizePt).toBe(22);          // Xenia's authored size — do not shrink to fit
    expect(cap.wMm).toBeGreaterThanOrEqual(130);
    expect(cap.hMm).toBeGreaterThanOrEqual(120);
    // The floral frame's clear interior is 136.8mm wide (measured S182).
    expect(cap.wMm).toBeLessThanOrEqual(136);
  });
});
