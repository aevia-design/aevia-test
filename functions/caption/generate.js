'use strict';

/**
 * One caption for one photo, with the word-control retry (#140, S197).
 * Shared by the deployed generateCaption function and the local comparison
 * script, so what is tested is what ships.
 *
 * If the reply uses a banned word, ask ONCE more. At most two calls per caption,
 * so the worst case is double today's cost; the second answer is kept either way.
 */
const { buildCaptionUserText, bannedWords, findBanned, repeatedPhrases } = require('./prompts');
const { modelParams } = require('./model');

// `temperature` absent = the API default (what shipped before #140).
async function generateCaption(client, voice, { image, collection, note, previousCaptions, language, temperature }) {
  const userText = buildCaptionUserText({ collection, note, previousCaptions, language });
  const banned = bannedWords(previousCaptions, language);

  const ask = async (extra) => {
    const response = await client.chat.completions.create({
      ...modelParams(100),
      ...(temperature === undefined ? {} : { temperature }),
      messages: [
        { role: 'system', content: voice },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } },
            { type: 'text', text: extra ? `${userText}\n\n${extra}` : userText },
          ],
        },
      ],
    });
    return response.choices[0].message.content.trim();
  };

  const first = await ask();
  const hits = findBanned(first, banned, language);
  // Same one retry for a phrase lifted from the last few captions ("wet hair", S199).
  const repeats = repeatedPhrases(first, previousCaptions);
  if (!hits.length && !repeats.length) return { caption: first, retried: false };

  const second = await ask(hits.length
    ? `A previous attempt was "${first}". It used ${hits.join(', ')}, which is not allowed. ` +
      'Write a different caption without those words or a synonym for them.'
    : `A previous attempt was "${first}". "${repeats.join('", "')}" already appears in a caption just before ` +
      'this one in the book. Write a different caption that does not repeat it.'
  );
  return { caption: second, retried: true };
}

module.exports = { generateCaption };
