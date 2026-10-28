// Word control for AI captions (#140, S197).
//
// The model was TOLD not to repeat phrasing and repeated "moment" anyway, so the
// limit lives in code: count watched words across ALL captions already in the
// book, ban the ones used twice, and check the reply against that ban.

const {
  bannedWords,
  findBanned,
  buildCaptionUserText,
} = require('../functions/caption/prompts');

describe('bannedWords — English', () => {
  test('a watched word is banned once it has appeared twice in the book', () => {
    expect(bannedWords(['Just a moment', 'Another moment'], 'en')).toContain('moment');
  });

  test('once is allowed — the owner is fine with one or two per book', () => {
    expect(bannedWords(['Just a moment'], 'en')).not.toContain('moment');
  });

  test('plurals and forms count toward the same word', () => {
    expect(bannedWords(['Small moments', 'The moment'], 'en')).toContain('moment');
    expect(bannedWords(['Memories', 'One memory'], 'en')).toContain('memory');
    expect(bannedWords(['Magical light', 'Pure magic'], 'en')).toContain('magic');
  });

  test('counts every caption in the book, not only the last 8', () => {
    const book = ['moment one', ...Array(20).fill('Sand in the shoes'), 'moment two'];
    expect(bannedWords(book, 'en')).toContain('moment');
  });

  test('matches whole words only', () => {
    // "momentum" is not "moment"
    expect(bannedWords(['momentum', 'momentum'], 'en')).not.toContain('moment');
  });

  test('no captions, nothing banned', () => {
    expect(bannedWords(undefined, 'en')).toEqual([]);
    expect(bannedWords([], 'en')).toEqual([]);
  });
});

describe('bannedWords — German', () => {
  test('the S182 forbidden list is always banned, even in an empty book', () => {
    const banned = bannedWords([], 'de');
    ['Moment', 'Augenblick', 'Erinnerung', 'Abenteuer', 'Freude', 'unvergesslich', 'magisch', 'einfangen']
      .forEach(w => expect(banned).toContain(w));
  });

  test('an overused German word is added after two uses', () => {
    expect(bannedWords(['Für immer wir', 'Und für immer'], 'de')).toContain('für immer');
    expect(bannedWords(['Für immer wir'], 'de')).not.toContain('für immer');
  });
});

describe('findBanned', () => {
  test('finds a banned word in a reply, any case and form', () => {
    expect(findBanned('Small Moments together', ['moment'], 'en')).toEqual(['moment']);
    expect(findBanned('Die schönsten Momente', ['Moment'], 'de')).toEqual(['Moment']);
    expect(findBanned('Erinnerungen am Meer', ['Erinnerung'], 'de')).toEqual(['Erinnerung']);
  });

  test('a clean reply returns nothing', () => {
    expect(findBanned('Sand in both shoes', ['moment', 'memory'], 'en')).toEqual([]);
  });

  test('umlauts do not break word matching', () => {
    expect(findBanned('Glücklich im Gras', ['Glück'], 'de')).toEqual(['Glück']);
    expect(findBanned('Unglück', ['Glück'], 'de')).toEqual([]);
  });
});

describe('the request names the banned words', () => {
  test('English: overused words are listed as off-limits', () => {
    const out = buildCaptionUserText({ previousCaptions: ['a moment', 'the moment'] });
    expect(out).toMatch(/already used enough in this book[^\n]*moment/);
  });

  test('English: nothing is listed when nothing is overused', () => {
    const out = buildCaptionUserText({ previousCaptions: ['Sand in the shoes'] });
    expect(out).not.toMatch(/already used enough in this book/);
  });

  test('German: overused words are listed too', () => {
    const out = buildCaptionUserText({ language: 'de', previousCaptions: ['für immer', 'für immer'] });
    expect(out).toMatch(/already used enough in this book[^\n]*für immer/);
  });
});

describe('generateCaption retry — at most one extra call', () => {
  const { generateCaption } = require('../functions/caption/generate');
  const fakeClient = (replies) => {
    const calls = [];
    return {
      calls,
      chat: { completions: { create: async (req) => {
        calls.push(req);
        return { choices: [{ message: { content: replies[calls.length - 1] } }] };
      } } },
    };
  };
  const book = ['One moment', 'Another moment'];

  test('a clean first reply costs one call', async () => {
    const c = fakeClient(['Sand in both shoes']);
    const out = await generateCaption(c, 'voice', { image: 'x', previousCaptions: book });
    expect(out).toEqual({ caption: 'Sand in both shoes', retried: false });
    expect(c.calls).toHaveLength(1);
  });

  test('a banned word triggers exactly one retry, and the retry says why', async () => {
    const c = fakeClient(['Just a moment', 'Sand in both shoes']);
    const out = await generateCaption(c, 'voice', { image: 'x', previousCaptions: book });
    expect(out).toEqual({ caption: 'Sand in both shoes', retried: true });
    expect(c.calls).toHaveLength(2);
    expect(c.calls[1].messages[1].content[1].text).toMatch(/It used moment/);
  });

  test('never a third call, even if the retry also fails', async () => {
    const c = fakeClient(['Just a moment', 'Still a moment', 'unused']);
    const out = await generateCaption(c, 'voice', { image: 'x', previousCaptions: book });
    expect(out.caption).toBe('Still a moment');
    expect(c.calls).toHaveLength(2);
  });
});

describe('round 2 step A — English rules live in the request, not only the guide', () => {
  // S182 fixed German by restating the key rules next to the photo; English never got that.
  const en = (collection) => buildCaptionUserText({ collection });

  test('no-invention comes first, then "name something visible"', () => {
    const out = en('kids');
    // Wording softened to guidance-with-reasons in S199 (owner); the order is what matters.
    expect(out).toMatch(/1\. Add nothing the photograph does not show/i);
    expect(out).toMatch(/2\. Anchor the caption in something actually in the photograph/);
    expect(out.indexOf('1. Add nothing')).toBeLessThan(out.indexOf('2. Anchor'));
  });

  test('kids and travel may be funny only when a visible detail or the note provides it', () => {
    ['kids', 'travel'].forEach(c => {
      expect(en(c)).toMatch(/Humour is welcome only when/);
      expect(en(c)).toMatch(/Never force it/);
    });
  });

  test('love gets no humour invitation', () => {
    expect(en('love')).not.toMatch(/Humour is welcome/);
    expect(en('love')).toMatch(/warm, not jokey/);
  });

  test('German kids/travel get the same grounded-humour rule', () => {
    const de = buildCaptionUserText({ collection: 'kids', language: 'de' });
    expect(de).toMatch(/Humour is welcome only when/);
    expect(buildCaptionUserText({ collection: 'love', language: 'de' })).not.toMatch(/Humour is welcome/);
  });
});

describe('the voice guide no longer argues against concreteness', () => {
  const VOICE = require('fs').readFileSync(require('path').join(__dirname, '../functions/caption/caption-voice.md'), 'utf8');
  test('the "feels like, not what is literally in it" line is gone', () => {
    expect(VOICE).not.toMatch(/Not what is literally in it/);
  });
});

describe('temperature is passed through to the API', () => {
  const { generateCaption } = require('../functions/caption/generate');
  test('explicit temperature reaches the request; absent leaves the API default', async () => {
    const calls = [];
    const client = { chat: { completions: { create: async (r) => { calls.push(r); return { choices: [{ message: { content: 'ok' } }] }; } } } };
    await generateCaption(client, 'v', { image: 'x', temperature: 0.4 });
    await generateCaption(client, 'v', { image: 'x' });
    expect(calls[0].temperature).toBe(0.4);
    expect('temperature' in calls[1]).toBe(false);
  });
});
