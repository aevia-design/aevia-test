# Brief: AI captions that vary and, where it fits, make you smile

**Created:** 2026-09-24 (Session 193) · **Card:** Trello #140
**Objective:** English ✦ Generate captions stop leaning on the same few words, and Kids and
Adventures captions can be playful. Xenia accepts a caption on the first or second try more often,
at a cost that stays near today's (cents per book).
**Audience:** developer-agent (implements), then Xenia (daily user, via the staff engine) and the owner (judges quality).
**Applicable Standards:** `docs/briefs/caption-ai-modes.md` (settled caption rules, S175),
`functions/caption/caption-voice.md` (the voice guide the model reads), `CLAUDE.md` (cost awareness,
engine parity), `rageatc-code-oss:test-driven-development`

## Why

Xenia uses ✦ Generate as a design helper. Today (GPT-4o-mini, voice guide as of S182) the English
captions are samey and flat. The owner sees "moment" in every second or third caption, and nothing is
ever playful. Each dull caption means another re-generate. The owner wants fewer re-generations,
light humour where the collection suits it, and no meaningful cost increase.

## Requirements Extracted from Standards

**From caption-ai-modes.md (settled, S175; do not re-open):**
- [ ] The ✦ button stays on standard spreads only; functional-page text is untouched
- [ ] No invented detail: humour must come from what is visible in the photo or the note, never made-up facts
- [ ] Compose keeps a length ceiling and never gains a floor
- [ ] Collection routing still works for every template (kids / travel / love); an unknown collection still falls back as today

**From caption-voice.md (the guide itself; edit it in place):**
- [ ] Kids and Adventures (`travel`) sections gain explicit permission for light, specific humour, with
      3–5 new examples in the register the owner approved, e.g. "Negotiations over broccoli have stalled"
- [ ] Love (Heirloom, Tender and other love templates) stays warm, with humour rare and gentle at most
- [ ] Existing hard rules survive: no leading "A"/"An" in English, no trailing full stop or comma
- [ ] The German section is not changed (German is out of scope, see Constraints)

**From CLAUDE.md:**
- [ ] Word control is enforced in CODE, not only by asking the model: before the request, count
      overused words (at least: moment, memories, forever, cherish, journey, magic) across the
      book's existing captions. Once a word has appeared twice, the request names it as banned.
- [ ] If the reply still contains a banned word, re-ask once, silently. At most one retry, so the cost is bounded.
- [ ] Engine parity: every surface that calls `generateCaption` behaves the same (staff engine and
      customer preview, if both send `previousCaptions`); check both
- [ ] Cost stated in the report: extra calls per book in the worst case, in €

**From test-driven-development:**
- [ ] The overuse counter and the banned-word check are pure functions with tests written first (`tests/`)

## Constraints

- **Step 1 only by default:** prompt changes and word control on the **current model** (`gpt-4o-mini`).
  Step 2 (model trial) runs only if the owner asks after judging Step 1.
- **Step 2, if run:** cheap-tier models only; check current official prices, don't quote from memory.
  Pass/fail cap is **≤ €0.30 per book** at ~100 calls/book. Compare side by side on the same photos.
- English only. German is judged later by the owner.
- Do not deploy or push. The owner deploys `generateCaption` (Cloud Function) after review.
- API calls for evaluation cost real money (small). Cap any test run at ~60 calls and state the spend.

## Success Criteria

The work is complete when:
1. On a fixed test set of 30 photos (10 Kids, 10 Adventures, 10 Love from `assets/test photos/`),
   generated in book order, "moment" appears **at most twice** and no watched word more than twice.
2. The owner, reading old-vs-new captions for the same photos side by side (unlabelled), prefers the new set.
   At least some Kids/Adventures captions are genuinely playful; Love reads as warm, not jokey.
3. Worst-case cost per book is reported and remains within cents.
4. All requirements from standards are met.

## References

**Code:** `functions/index.js` `generateCaption` (~line 150, `max_tokens: 100`, no temperature set);
`functions/caption/prompts.js` `buildCaptionUserText` (~line 97, already sends the last 8 captions with
a "do not repeat" instruction that the model often ignores); `functions/caption/caption-voice.md`;
`functions/caption/caption.js` (local CLI for trying prompts on image files);
`pages/staff/template-engine.html` ~line 3177 (`collectExistingCaptions()`).
**Previous work:** `docs/briefs/caption-ai-modes.md`; `work/german-caption-voice/research_v1.md` (German only, for awareness).

## Context

**Background decisions (owner, S193):**
- Humour fits Kids and Adventures; wedding/love albums get much less.
- One or two "moment"s per album is fine; the problem is frequency.
- About €0.50 per book is too much for this feature, so a model change is Step 2 and cheap-tier only.

**Known risks:**
- Humour can tip into sarcasm or into mocking the child; keep it affectionate.
- A banned-word list can push the model to near-synonyms ("instant", "memory"). Watch the test output for substitutes.
- The current 8-caption window means early captions drop out of view. Counting should use ALL existing captions in the book, not only the last 8.
