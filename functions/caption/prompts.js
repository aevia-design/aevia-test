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
  '   weather you cannot see. This rule is not a language matter and does not relax.',
  '2. Informal address throughout — du, dir, dein, or ihr for a couple or family.',
  '   NEVER Sie. The order form is formal; the book is not.',
  '3. No Nominalstil. Do not turn verbs into nouns and prop them up with helper verbs',
  '   ("Die Durchführung der Reise erfolgte" → "Wir sind gereist"). Find the verb.',
  '4. No greeting-card vocabulary: unvergesslich, einzigartig, magisch, voller Liebe,',
  '   "Momente, die bleiben", "in diesem Moment". If the phrase puts no picture in the',
  '   reader\'s head, cut it.',
  '5. Never the word "einfangen". Never the structure "nicht nur…, sondern auch…".',
  '6. No exclamation mark. Do not end with a full stop.',
  '7. Starting with "Ein" or "Eine" is FINE. The English rule against opening with',
  '   "A"/"An" does NOT carry over to German — ignore it here. But cut an indefinite',
  '   article that earns nothing in front of an abstract noun ("eine Stille zwischen',
  '   ihnen" → "Stille zwischen ihnen").',
  '8. Write ß where German orthography requires it (groß, süß). Never substitute "ss".',
];

const GERMAN_COMPOSE_RULES = [
  'Write in GERMAN. The customer\'s text is German; keep it German, and do not',
  'translate it through English on the way.',
  'The couple\'s voice is first person plural — wir. Keep it there, never Sie.',
  'German runs longer than English for the same content, so the ceiling bites sooner.',
  'That is a reason to add nothing, never a reason to compress what they meant.',
  'No Nominalstil, no "einfangen", no exclamation marks.',
];

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

  if (note) lines.push(`Customer note: "${note}"`);

  if (Array.isArray(previousCaptions) && previousCaptions.length > 0) {
    lines.push('');
    lines.push('Captions already used elsewhere in this book — do not repeat similar phrasing, structure, opening words, or emotional register:');
    previousCaptions.slice(-8).forEach(c => lines.push(`- ${c}`));
  }

  lines.push('');
  if (lang === 'de') {
    lines.push(...GERMAN_CAPTION_RULES);
    lines.push('');
    lines.push('Generate one German caption for this photo. Return only the caption text, nothing else.');
  } else {
    // English-only. Deliberately NOT sent for German: the rule is an English one,
    // and research (work/german-caption-voice/research_v1.md) withdrew it for
    // German outright — sending it would push the model away from correct German.
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

module.exports = {
  normaliseLanguage,
  buildCaptionUserText,
  buildComposeUserText,
  GERMAN_CAPTION_RULES,
  GERMAN_COMPOSE_RULES,
};
