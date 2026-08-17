// The German section of caption-voice.md is a PROMPT, not code — nothing about
// it fails loudly when it is edited or accidentally truncated. These tests pin
// the invariants that would otherwise regress silently and only show up as a
// printed German book that reads translated.
//
// They deliberately do not judge the German. Nothing automated can. They check
// that the decisions we made are still in the file.

const fs   = require('fs');
const path = require('path');

const VOICE = fs.readFileSync(
  path.join(__dirname, '..', 'functions', 'caption', 'caption-voice.md'), 'utf8');

// Everything from the "# German books" heading onward.
const GERMAN = VOICE.slice(VOICE.indexOf('# German books'));

describe('caption-voice.md — German section', () => {

  test('the German section exists and is loaded from the same file as the English', () => {
    // One file, one system prompt. A separate German file would mean the function
    // has to choose which to load, and the two would drift.
    expect(VOICE).toContain('# German books');
    expect(GERMAN.length).toBeGreaterThan(1000);
  });

  test('it tells the model to write German, not translate', () => {
    // Owner's decision (S177): German captions are written natively.
    expect(GERMAN).toMatch(/Write German\. Do not translate\./);
  });

  test('it pins the informal register and forbids Sie', () => {
    // The order form is formal Sie; the book is not. This is the single most
    // likely thing for a model to get wrong, because the surrounding product
    // copy is all Sie.
    expect(GERMAN).toMatch(/Never `Sie`/);
    expect(GERMAN).toMatch(/`du`/);
    expect(GERMAN).toMatch(/`wir`/);       // Our story is the couple's own voice
  });

  test('it bans the two German tells that matter most', () => {
    expect(GERMAN).toContain('Nominalstil');   // verbs turned into nouns
    expect(GERMAN).toContain('einfangen');     // the German reflex for "capture"
  });

  test('it carries the no-invention rule into German rather than assuming it', () => {
    // S175: the system prompt is mostly a creative-writing manual, and one
    // section arguing the opposite loses to the weight of the rest. The German
    // section must restate this, not inherit it silently.
    expect(GERMAN).toMatch(/no-invention rule/);
  });

  test('it records the ß printing constraint', () => {
    // NT Somic has no ß glyph (tests/de-font-glyphs.test.js), and it is
    // Scribble's default caption font.
    expect(GERMAN).toContain('ß');
    expect(GERMAN).toMatch(/never substitute "ss"/i);
  });

  test('it warns against imitating the authored book verses', () => {
    // The Newborn star-sign blessings and the wedding intro are a different
    // genre — elevated and deliberately sentimental. A caption in that voice is
    // greeting-card writing.
    expect(GERMAN).toMatch(/NOT a model for captions/);
  });

  test('it gives German examples for all three collections', () => {
    ['**Travel**', '**Kids**', '**Love**'].forEach(h => {
      expect(GERMAN).toContain(h);
    });
    // Examples are what actually set the register, so an empty list is a failure
    // even though the headings are present.
    const bullets = GERMAN.split('## German caption examples')[1].split('##')[0]
      .split('\n').filter(l => l.trim().startsWith('- "'));
    expect(bullets.length).toBeGreaterThanOrEqual(9);
  });

  test('the German examples obey the German hard rules', () => {
    const bullets = GERMAN.split('## German caption examples')[1].split('⚠')[0]
      .split('\n').filter(l => l.trim().startsWith('- "'))
      .map(l => l.trim().replace(/^- "/, '').replace(/"$/, ''));

    const offenders = [];
    bullets.forEach(b => {
      if (/^Ein(e)?\s/.test(b))  offenders.push(`starts with Ein/Eine: "${b}"`);
      if (/[.!]$/.test(b))       offenders.push(`ends with . or !: "${b}"`);
      // Formal address vs "she": at the START of a sentence, German capitalises
      // "sie" (she/they) anyway, so "Sie hat alles verschlafen" is "SHE slept
      // through it" and perfectly correct. Only a capitalised Sie/Ihnen/Ihre
      // MID-sentence is unambiguously the formal address we are banning.
      if (/\S\s+(Sie|Ihnen|Ihre[nmr]?)\b/.test(b)) offenders.push(`uses formal Sie: "${b}"`);
      if (/einfangen/.test(b))   offenders.push(`uses "einfangen": "${b}"`);
    });
    expect(offenders).toEqual([]);
  });
});
