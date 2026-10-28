// What ships for the gpt-6-luna migration (S199): today's prompts plus two additions,
// tested in rounds 4-5 (work/caption-model/). The fuller #140 rewrite is parked on the
// caption-140-voice branch.

const { buildCaptionUserText } = require('../functions/caption/prompts');

describe('gender rule', () => {
  test.each(['en', 'de'])('opens every caption request (%s)', (language) => {
    const t = buildCaptionUserText({ collection: 'kids', language });
    // First thing after the two header lines — at the end it was ignored 3 times in 9 (round 5).
    expect(t.split('\n')[2]).toMatch(/Don't guess anyone's gender/);
    expect(t).toMatch(/sein, ihr/);
  });
});

describe('order notes', () => {
  test('arrive as background the model is encouraged to use now and then', () => {
    const t = buildCaptionUserText({ collection: 'travel', note: 'We missed the ferry twice.' });
    expect(t).toContain('"We missed the ferry twice."');
    expect(t).toMatch(/about one caption in three/);
    expect(t).not.toMatch(/Customer note:/);
  });

  test('are capped', () => {
    expect(buildCaptionUserText({ note: 'x'.repeat(5000) }).length).toBeLessThan(3000);
  });

  test('absent notes add nothing', () => {
    expect(buildCaptionUserText({})).not.toMatch(/Background from/);
  });
});

describe('three drafts, the model picks (voice v3, S199 round 6)', () => {
  const { pickCaption } = require('../functions/caption/prompts');

  test.each(['en', 'de'])('the request asks for three candidates as JSON (%s)', (language) => {
    const t = buildCaptionUserText({ collection: 'kids', language });
    expect(t).toMatch(/THREE different captions/);
    expect(t).toMatch(/"candidates"/);
    expect(t).toMatch(language === 'de' ? /German/ : /English/);
  });

  test('pickCaption returns the chosen candidate', () => {
    expect(pickCaption('{"candidates":["One","Two","Three"],"best":1}')).toBe('Two');
  });

  test('pickCaption falls back to the first candidate on a bad index', () => {
    expect(pickCaption('{"candidates":["One","Two"],"best":7}')).toBe('One');
  });

  test('pickCaption falls back to the raw text when the reply is not JSON', () => {
    expect(pickCaption('  Just a line  ')).toBe('Just a line');
  });

  test('pickCaption drops a trailing full stop (house rule)', () => {
    expect(pickCaption('{"candidates":["Next wave can wait."],"best":0}')).toBe('Next wave can wait');
  });
});
