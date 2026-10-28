'use strict';

/**
 * The ONE place the caption model is named (S199). Every caller — the deployed
 * generateCaption (caption + compose), generate.js and the local CLI — builds its
 * request from modelParams(), so a model swap is a one-line change here.
 *
 * gpt-6-luna is OpenAI's named replacement for gpt-4o-mini (shut down 14 Jan 2027).
 * It is a reasoning model. Effort 'low' (owner, S199): a brief think before answering,
 * aimed at German invented compounds ("Spitzenstieier"). Thinking tokens are billed as
 * output and COUNT AGAINST max_completion_tokens, so the cap carries a thinking allowance
 * on top of the reply length — too small and the reply comes back empty.
 * Reasoning models take max_completion_tokens, not max_tokens.
 * See work/caption-model/selection_v1.md.
 */
const CAPTION_MODEL = 'gpt-6.1-terra';   // owner, S199: won round 6 14–10 over gpt-6-luna; ~$0.23/book with 3 drafts

const THINKING_ALLOWANCE = 2000;

function modelParams(replyTokens) {
  return { model: CAPTION_MODEL, max_completion_tokens: replyTokens + THINKING_ALLOWANCE, reasoning_effort: 'low' };
}

module.exports = { CAPTION_MODEL, modelParams };
