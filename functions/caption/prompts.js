'use strict';

/**
 * The USER half of the caption prompts (germanization Stage 5, S182).
 * ------------------------------------------------------------------
 * The system prompt is `caption-voice.md` — a long guide that is mostly an
 * ENGLISH creative-writing manual with a `# German books` section at the end.
 *
 * S175's lesson, learned the expensive way: a rule that lives only in that
 * system prompt loses to the weight of the rest of it. The compose prompt had
 * to restate the no-invention rule in the user message before the model stopped
 * inventing ("under the stars", about a couple who never mentioned stars). The
 * same reasoning applies to language: a German section buried at the end of an
 * English manual is not enough to stop the model writing English-shaped German.
 * So the rules that matter most get restated HERE, close to the request.
 *
 * Extracted into its own module purely so it can be tested. A prompt fails
 * silently — delete the German restatement and nothing throws, no test goes
 * red, and the failure surfaces as a printed German book that reads translated.
 * `tests/caption-prompts.test.js` pins it.
 *
 * ⚠ `language` is the book's language, and absent reads as English — the same
 * invariant as everywhere else in germanization (see docs/briefs/germanization.md).
 */

/** Normalise anything the caller passes into exactly 'de' or 'en'. */
function normaliseLanguage(language) {
  return language === 'de' ? 'de' : 'en';
}

// The German rules worth spending user-message tokens on. Not the whole guide —
// the ones a model writing German gets wrong by default, plus the two that
// actively CONTRADICT the English manual sitting above them in the system
// prompt (sentence-initial articles, and the no-final-full-stop carry-over).
// Sourced from work/german-caption-voice/research_v1.md — do not re-derive.
const GERMAN_CAPTION_RULES = [
  'Write the caption in GERMAN. Do not write English and translate it — a translated',
  'caption keeps English rhythm and word order even when the grammar is perfect.',
  '',
  'German rules, in order of importance:',
  '1. Add NOTHING the photograph does not show. No places, events, times of day, or',
  '   weather you cannot see. Do not interpret what someone is thinking, feeling, or',
  '   waiting for. This rule is not a language matter and does not relax.',
  '2. Anchor the caption in something actually in the photograph — the bare feet, the',
  '   low light, the empty plate — because a caption that would fit any photo in the book',
  '   says nothing. Then say something ABOUT that detail: a small observation, a turn, a',
  '   smile. One detail with a thought beats a list of what is in the picture',
  '   ("Nasses Haar, klares Wasser, roter Bikini" is an inventory, not a caption). (S199)',
  '3. FORBIDDEN WORDS. Do not use these, and do not reach for a synonym or a paraphrase',
  '   to get around them — the register is the problem, not the individual word:',
  '   Moment, Momente, Augenblick, Erinnerung(en), Abenteuer, Freude, Glück,',
  '   unvergesslich, einzigartig, magisch, wunderschön, "voller Liebe", einfangen.',
  '   If the phrase puts no picture in the reader\'s head, cut it.',
  '4. Informal address throughout — du, dir, dein, or ihr for a couple or family.',
  '   NEVER Sie. The order form is formal; the book is not.',
  '5. No Nominalstil. Do not turn verbs into nouns and prop them up with helper verbs',
  '   ("Die Durchführung der Reise erfolgte" → "Wir sind gereist"). Find the verb.',
  '   No trailing present participle either ("auf das Meer wartend") — it reads stiff.',
  '6. Never the structure "nicht nur…, sondern auch…".',
  '7. No exclamation mark. Do not end with a full stop.',
  '8. Starting with "Ein" or "Eine" is FINE. The English rule against opening with',
  '   "A"/"An" does NOT carry over to German — ignore it here. But cut an indefinite',
  '   article that earns nothing in front of an abstract noun ("eine Stille zwischen',
  '   ihnen" → "Stille zwischen ihnen").',
  '9. Write ß where German orthography requires it (groß, süß). Never substitute "ss".',
  '',
  'The example captions in the guide above show the REGISTER — plain, concrete, short,',
  'observational. Do not reuse their wording or their sentence shape; write a new',
  'caption for THIS photograph.',
  '',
  'Use only real, everyday German words. If you are unsure a compound exists',
  '(Spitzenschleier yes, Spitzenveilchen no), choose a simpler word you are sure of.',
];

const GERMAN_COMPOSE_RULES = [
  'Write in GERMAN. The customer\'s text is German; keep it German, and do not',
  'translate it through English on the way.',
  'The couple\'s voice is first person plural — wir. Keep it there, never Sie.',
  'German runs longer than English for the same content, so the ceiling bites sooner.',
  'That is a reason to add nothing, never a reason to compress what they meant.',
  // S182, from real output: given the sentence above about length, the model
  // silently deleted "an einem Dienstag" from a proposal story. Losing the
  // customer's own specific is a different failure from inventing one, and the
  // add-nothing rules did not cover it.
  'KEEP EVERY DETAIL THEY GAVE. You are joining their sentences, not summarising',
  'them. Deleting one of their specifics — a day, a place, a name — is exactly as',
  'wrong as inventing one. If you must choose, keep their detail and drop your own',
  'connecting words.',
  'No Nominalstil, no "einfangen", no exclamation marks.',
  // The German section forbids a trailing full stop — for CAPTIONS. Compose mode
  // is prose and keeps its punctuation, but that exception lives in the system
  // prompt and lost to the nearer rule, so it is restated here (S182).
  'This is prose, not a caption: punctuate normally and END WITH A FULL STOP.',
];

// ── Word control (#140, S197) ─────────────────────────────────────────────────
// Asking the model not to repeat itself did not work ("moment" in every second or
// third caption), so the limit is enforced here: count watched words across ALL
// captions in the book, and ban any used twice. Each entry is label → pattern;
// the pattern covers the word's forms. \p{L} instead of \w so umlauts count as letters.
const OVERUSE_LIMIT = 2;
const WATCHED = {
  en: {
    moment:  'moments?',
    memory:  'memor(?:y|ies)',
    forever: 'forever',
    cherish: 'cherish\\p{L}*',
    journey: 'journeys?',
    magic:   'magic(?:al)?',
  },
  de: {
    'für immer': 'für immer',
    Zauber:      'zauber\\p{L}*',
  },
};
// German's S182 forbidden list (GERMAN_CAPTION_RULES rule 3), checked in code too:
// banned from the first caption, not after two uses.
const GERMAN_ALWAYS_BANNED = {
  Moment:        'moment(?:e|en|s)?',
  Augenblick:    'augenblick\\p{L}*',
  Erinnerung:    'erinnerung(?:en)?',
  Abenteuer:     'abenteuer\\p{L}*',
  Freude:        'freude\\p{L}*',
  Glück:         'glück\\p{L}*',
  unvergesslich: 'unvergesslich\\p{L}*',
  einzigartig:   'einzigartig\\p{L}*',
  magisch:       'magisch\\p{L}*',
  wunderschön:   'wunderschön\\p{L}*',
  'voller Liebe': 'voller liebe',
  einfangen:     'ein(?:ge)?fangen\\p{L}*',
};

function patternsFor(lang) {
  return lang === 'de' ? { ...GERMAN_ALWAYS_BANNED, ...WATCHED.de } : WATCHED.en;
}

function wordRegex(pattern) {
  return new RegExp(`(?<!\\p{L})${pattern}(?!\\p{L})`, 'giu');
}

/** Words the next caption must not use, given every caption already in the book. */
function bannedWords(captions, language) {
  const lang = normaliseLanguage(language);
  const text = Array.isArray(captions) ? captions.join('\n') : '';
  const overused = Object.entries(WATCHED[lang])
    .filter(([, p]) => (text.match(wordRegex(p)) || []).length >= OVERUSE_LIMIT)
    .map(([label]) => label);
  return lang === 'de' ? [...Object.keys(GERMAN_ALWAYS_BANNED), ...overused] : overused;
}

/** Which of `banned` a caption actually uses. */
function findBanned(caption, banned, language) {
  const patterns = patternsFor(normaliseLanguage(language));
  return banned.filter(label => patterns[label] && wordRegex(patterns[label]).test(caption || ''));
}

// Voice per collection (owner, S199). The reader IS the person in the photo, so a
// stranger's "her"/"them" reads wrong, and it guesses gender (#140 round 1 lost on it).
// Written as guidance with reasons, not capital-letter rules: the owner found the
// NEVER/ALWAYS register made captions mechanical (S199). Two firm limits stay firm:
// no invented facts (rule 1) and no guessed gender.
const VOICE_BY_COLLECTION = {
  kids:   `Voice: the parents are telling their child's story, so write about the child the way they would. Now and then, when the child is clearly doing something, the child's own voice ("I") can be fun.`,
  love:   `Voice: this is the couple's own book. Write as them ("we", "our") when the photo shows them together, or as a short comment on the photo with no pronouns at all. A name from the background can appear once in a while; repeating it sounds like a speech.`,
  travel: `Voice: the travellers are looking back at their own trip. "We" / "our" fits when the photo shows more than one of them or the background describes a shared trip; for one person alone, a short comment with no pronouns at all reads better than a "we" that isn't in the picture.`,
};
const NO_THIRD_PERSON =
  `The people in the photo are the readers of this book, so avoid describing them from outside as he, she, him, her, his, they or them ` +
  `(in German: er, sie, sein, and ihr/ihre meaning "her" or "their"; du, dein and ihr meaning "you" are fine), or as "two people", "a couple", "a boy", "a girl". ` +
  `Don't guess anyone's gender from the photo — it is often wrong and it shows.`;

// Customer text from the order (album notes, cover texts, special-page answers), assembled
// by the engine. Capped: special-page passages can run long. See
// work/caption-model/decision-order-context.md.
const CONTEXT_CAP = 1200;
function backgroundLines(note) {
  const t = typeof note === 'string' ? note.trim().slice(0, CONTEXT_CAP) : '';
  if (!t) return [];
  return [
    '',
    `Background from the customer's order (their own words):`,
    `"${t}"`,
    'This is background, not material for every caption. A detail from it is a nice touch when it fits THIS photo; ' +
    `most captions use none, and a detail already used in this book should not come back. Don't quote it or add to it.`,
  ];
}

/**
 * Caption mode: one caption for one photograph.
 * Returns the plain-text user message that accompanies the image.
 */
function buildCaptionUserText({ collection = 'kids', note, previousCaptions, language } = {}) {
  const lang = normaliseLanguage(language);
  const lines = [`Collection: ${collection}`];

  // The German section of caption-voice.md opens with "This section applies only
  // when the request says the book's language is German" — so the request has to
  // actually say it. Without this line that whole section is inert.
  lines.push(`Book language: ${lang === 'de' ? 'German (de)' : 'English (en)'}`);

  lines.push(...backgroundLines(note));

  if (Array.isArray(previousCaptions) && previousCaptions.length > 0) {
    lines.push('');
    lines.push('Captions already used elsewhere in this book — do not repeat similar phrasing, structure, opening words, or emotional register:');
    previousCaptions.slice(-8).forEach(c => lines.push(`- ${c}`));
  }

  // German's always-banned words are already in GERMAN_CAPTION_RULES; only the
  // book-specific overuse needs saying here.
  const overused = bannedWords(previousCaptions, lang).filter(w => !(w in GERMAN_ALWAYS_BANNED));
  if (overused.length) {
    lines.push('');
    lines.push(`Words already used enough in this book — do not use them, or a close synonym: ${overused.join(', ')}`);
  }

  // Humour rides in the request for the same reason as the rules above it: in the
  // system prompt alone it had no visible effect (#140 round 1, S197). It must stand
  // on a named visible detail or the note, or it becomes invention.
  const humour = (collection === 'kids' || collection === 'travel')
    ? 'Humour is welcome only when a visible detail or the customer note gives you the joke — name that detail. Dry and affectionate, never at the child\'s expense. Never force it: a quiet photo gets a quiet line.'
    : 'Keep it warm, not jokey.';

  const voice = [VOICE_BY_COLLECTION[collection] || VOICE_BY_COLLECTION.kids, NO_THIRD_PERSON];

  lines.push('');
  if (lang === 'de') {
    lines.push(...GERMAN_CAPTION_RULES);
    lines.push('');
    lines.push(...voice);
    lines.push('');
    lines.push(humour);
    lines.push('');
    lines.push('Generate one German caption for this photo. Return only the caption text, nothing else.');
  } else {
    // English-only. Deliberately NOT sent for German: the rule is an English one,
    // and research (work/german-caption-voice/research_v1.md) withdrew it for
    // German outright — sending it would push the model away from correct German.
    // The numbered rules mirror the German ones that fixed abstraction in S182 (#140).
    lines.push('Guidance, most important first:');
    lines.push('1. Add nothing the photograph does not show or the background does not say: no ages,');
    lines.push('   places, times, counts or events you cannot see. This one is firm.');
    lines.push('2. Anchor the caption in something actually in the photograph, because a caption that');
    lines.push('   would fit any photo in the book says nothing. Then say something about that detail:');
    lines.push('   a small observation, a turn, a smile. One detail with a thought beats a list of what');
    lines.push('   is in the picture.');
    lines.push(`3. ${voice[0]}`);
    lines.push(`4. ${voice[1]}`);
    lines.push(`5. ${humour}`);
    lines.push('');
    lines.push('IMPORTANT: Do not start the caption with the word "A" or "An".');
    lines.push('Generate one caption for this photo. Return only the caption text, nothing else.');
  }

  return lines.join('\n');
}

/**
 * Compose mode: weld the customer's OWN words into one passage. No image.
 * The no-invention rule is restated here rather than left to the system prompt.
 */
function buildComposeUserText({ collection = 'kids', composeText = '', language } = {}) {
  const lang = normaliseLanguage(language);
  const lines = [
    `Compose mode. Collection: ${collection}`,
    `Book language: ${lang === 'de' ? 'German (de)' : 'English (en)'}`,
    '',
    "Below is the customer's own text, from two questions they answered separately.",
    'Join it into one passage that reads as continuous prose.',
    '',
    'Rules, in order of importance:',
    '1. Add NOTHING they did not write. No places, events, times of day, weather,',
    '   feelings, or figures of speech. If it is not in their text, it does not exist.',
    '2. Do not make a vague phrase specific.',
    '3. There is no target length and no minimum. Never exceed 65 words. If their',
    '   text is short, your answer is short — that is correct, not lazy.',
    '4. Returning their words nearly unchanged is a good outcome.',
  ];

  if (lang === 'de') {
    lines.push('');
    lines.push(...GERMAN_COMPOSE_RULES);
  }

  lines.push('');
  lines.push('You are editing. Return only the passage.');
  lines.push('');
  lines.push(composeText);

  return lines.join('\n');
}

// Two-word phrases a caption shares with the last few captions ("wet hair" three photos in
// a row, S199). The word list above only watches six clichés; this catches the rest. Used
// by generate.js for its one silent retry. Pairs made only of small words don't count.
const SMALL_WORDS = new Set(('a an the and or but of in on at to by for with from into our we us my ' +
  'is are was it its this that as so all no not still just ' +
  'der die das den dem des ein eine einen einem einer und oder aber von im in am an auf zu mit aus ' +
  'ist sind war es noch nur schon wir uns unser unsere').split(' '));
function repeatedPhrases(caption, previousCaptions, lookBack = 3) {
  const words = t => (String(t || '').toLowerCase().match(/[\p{L}]+/gu) || []);
  const pairs = t => { const w = words(t); const out = [];
    for (let i = 0; i < w.length - 1; i++) {
      if (!(SMALL_WORDS.has(w[i]) && SMALL_WORDS.has(w[i + 1]))) out.push(`${w[i]} ${w[i + 1]}`);
    }
    return out; };
  const recent = new Set((previousCaptions || []).slice(-lookBack).flatMap(pairs));
  return [...new Set(pairs(caption).filter(p => recent.has(p)))];
}

module.exports = {
  repeatedPhrases,
  normaliseLanguage,
  buildCaptionUserText,
  buildComposeUserText,
  bannedWords,
  findBanned,
  GERMAN_CAPTION_RULES,
  GERMAN_COMPOSE_RULES,
};
