// Voice + order context for AI captions (#140, S199).
// Round 1 lost 15–4 partly on "her"/"them": the reader IS the person in the photo.
// Aevia decides the voice per collection; the customer's own words are background.

const { buildCaptionUserText } = require('../functions/caption/prompts');

const text = (o) => buildCaptionUserText({ collection: 'kids', language: 'en', ...o });

describe('voice rules', () => {
  test.each(['en', 'de'])('every request forbids third-person pronouns and gender guesses (%s)', (language) => {
    for (const collection of ['kids', 'love', 'travel']) {
      const t = text({ collection, language });
      expect(t).toMatch(/guess anyone's gender/i);
      expect(t).toMatch(/\bher\b.*\bthem\b/);
    }
    expect(text({ language: 'de' })).toMatch(/sein.*ihr/);
  });

  test('kids: the parents\' view, sometimes the child\'s own "I"', () => {
    expect(text({ collection: 'kids' })).toMatch(/parents/);
    expect(text({ collection: 'kids' })).toMatch(/child's own voice \("I"\)/);
  });

  test('love and travel: "we", or no pronouns at all', () => {
    for (const collection of ['love', 'travel']) {
      const t = text({ collection });
      expect(t).toMatch(/"we"/i);
      expect(t).toMatch(/no pronouns/);
    }
  });
});

describe('order context', () => {
  test('is sent as background with a use-sparingly rule', () => {
    const t = text({ note: 'Ann, our little bear. Hates socks.' });
    expect(t).toContain('Ann, our little bear. Hates socks.');
    expect(t).toMatch(/background/i);
    expect(t).toMatch(/most captions use none/i);
  });

  test('absent context adds no background section', () => {
    expect(text({})).not.toMatch(/Background from the customer/);
  });

  test('is capped so a long special-page passage cannot flood the request', () => {
    const t = text({ note: 'x'.repeat(5000) });
    expect(t.length).toBeLessThan(3500);
  });
});

describe('repeatedPhrases — two-word repeats from the last few captions (S199)', () => {
  const { repeatedPhrases } = require('../functions/caption/prompts');

  test('finds a phrase the previous caption already used', () => {
    expect(repeatedPhrases('Wet hair drying on warm stone', ['Wet hair, salt water, nowhere in a hurry'])).toEqual(['wet hair']);
  });

  test('German too, ignoring case and punctuation', () => {
    expect(repeatedPhrases('Nasses Haar auf warmem Stein', ['Die Haare noch nass', 'nasses Haar, klares Wasser'])).toEqual(['nasses haar']);
  });

  test('only looks back three captions', () => {
    expect(repeatedPhrases('Wet hair again', ['Wet hair', 'b c', 'd e', 'f g'])).toEqual([]);
  });

  test('ignores pairs made only of small words', () => {
    expect(repeatedPhrases('in the sea', ['in the light'])).toEqual([]);
  });
});
