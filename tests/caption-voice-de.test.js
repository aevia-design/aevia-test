// caption-voice.md after voice v3 (S199). The S182 German caption section was replaced: the
// owner decided German follows the same voice as English. What must not regress is below.
const fs = require('fs');
const path = require('path');
const VOICE = fs.readFileSync(path.join(__dirname, '../functions/caption/caption-voice.md'), 'utf8');
const section = (name) => VOICE.split(/\n## /).find(s => s.startsWith(name)) || '';

test('the owner\'s own captions lead the guide, for all three collections', () => {
  for (const line of ["I'm flying!", 'One towel, no plans', 'You would never walk alone']) expect(VOICE).toContain(line);
});

test('the two firm limits are there: no invented facts, no guessed gender', () => {
  expect(section('Two firm limits')).toMatch(/Invent no facts/);
  expect(section('Two firm limits')).toMatch(/Don't guess gender/);
});

test('German: same voice, written natively, informal, ß, real words', () => {
  const de = section('German');
  expect(de).toMatch(/same voice/);
  expect(de).toMatch(/not translated/);
  expect(de).toMatch(/never Sie/);
  expect(de).toMatch(/ß/);
  expect(de).toMatch(/real, everyday words/);
});

test('Compose mode survived the rewrite, English and German', () => {
  expect(VOICE).toMatch(/^# Compose mode/m);
  expect(VOICE).toMatch(/^## The hard rule of compose mode/m);
  expect(VOICE).toMatch(/^## Compose mode in German/m);
});
