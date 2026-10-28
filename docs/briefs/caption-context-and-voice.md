# Brief: Captions that speak in the right voice and know the family

**Created:** 2026-10-27 (Session 199) · **Card:** Trello #140
**Objective:** ✦ Generate captions run on `gpt-6-luna`, never guess gender, speak in a voice Aevia
decides per collection, and use the customer's optional notes and special-page answers as
background. The owner prefers them to today's captions on a small blind test.
**Audience:** the executor (Claude / developer-agent). Then the owner, who judges the test, and Xenia,
who uses ✦ Generate daily. The order-form copy is read by customers.
**Applicable Standards:** `docs/briefs/caption-model-migration.md` (model switch, still in force),
`docs/briefs/caption-ai-modes.md` (settled caption rules), CLAUDE.md (customer copy → `/stop-slop`,
`npm run qa:order` before pushing order.html, engine parity, cost awareness),
`rageatc-code-oss:test-driven-development`

## Why

The first gpt-6-luna test (S199, `work/caption-model/votes-luna-r1.json`) lost to today's captions
15–4. Its new "describe what you see" prompt produced captions like "His hand at her waist, her eyes on
his face". A customer reading their own book is "her" or "them" to a stranger. That's wrong and it
guesses gender. The fix is in the input, not in more prompt tuning. Aevia decides the voice, and the
customer's own words (which staff already have) give the model something human to work with. The
human touch is the product: details are optional, and captions must still work with none.

## Requirements

**Voice (owner, S199), in the prompt per collection:**
- [ ] **Kids:** about the child, on the parents' behalf. Sometimes in the child's own voice ("I"), when the
      child is doing something in the photo.
- [ ] **Love:** in the couple's voice ("we"; names rarely, never repeated) **or** a comment on the
      photo with no pronouns.
- [ ] **Travel:** same rule: the travellers' voice ("we") or no pronouns.
- [ ] **Never** a third-person pronoun for the people in the book (her/him/them, sein/ihr for them),
      **never** a guessed gender, and no "two people" or "a couple" stand-ins. Applies to EN and DE.
- [ ] With no context at all: a caption based on the photo, with no pronouns.

**Order context (decision: `work/caption-model/decision-order-context.md`):**
- [ ] The staff engine sends one background block with every ✦ Generate: `photoNotes`, cover texts
      (`coverCaptions`) and special-page answers (`fpTexts`). It's assembled in the engine from
      data it already loads. The server still looks nothing up itself (the endpoint is public).
- [ ] A length cap on the block (special-page passages can be long). Empty block = no change in
      behaviour.
- [ ] The prompt treats it as **background**: use any one detail at most once per book, most
      captions use none, never quote the special-page text back, and invent nothing beyond it.
- [ ] Parity: `pages/spread-preview.html` also calls `generateCaption`. Check what it is and keep it
      consistent.
- [ ] The prompt builder is pure and tested first (`tests/caption-prompts.test.js` style).

**Order form (customer-facing):**
- [ ] The "Tell us about this album" box moves to **after the special pages** (it's currently first).
- [ ] New per-collection examples that lead with personal detail (nicknames, habits, small funny
      facts). The owner approved these in English (S199):
      kids "e.g. Ann, our 'little bear'. Hates socks, loves our dog Bruno, says 'nana' for banana." ·
      love/wedding/heirloom "e.g. He proposed on a Vienna tram. She calls him Mischa. We still can't agree
      on a film." · travel/adventures/joyride/laguna "e.g. Greece, August 2026. Leo counted every cat;
      we missed the ferry twice." **No milestone example** (that collection doesn't exist).
- [ ] German versions written natively (not translated), in `assets/js/order-strings.js`. The field
      stays optional.
- [ ] `/stop-slop` pass on the new copy, and `npm run qa:order` green before pushing.

**Model (from caption-model-migration.md):** `gpt-6-luna` via `functions/caption/model.js` (built
S199, uncommitted). Word control and the German S182 rules are unchanged.

## Evaluation (owner's limit: 3 photos per group per language)

- [ ] 18 rows: kids, travel and love × EN/DE × 3 photos, from the round-1 photo set.
- [ ] Three blind columns per row, shuffled: **today** (round-1 gpt-4o-mini captions, reused at no
      cost) · **new, no notes** · **new, with a realistic note** (one note per book, written to fit
      those photos, plus a short special-page sample for love).
- [ ] The vote page (`work/caption-model/page.js`) is extended to three columns: pick the best, "several
      good", or "none". The key is kept separately.
- [ ] Cost estimated and stated before running (expected ≈ $0.02), with the owner's explicit yes.

## Constraints

- No deploy and no order.html push until the owner has voted and agrees. Then deploy only
  `generateCaption`; push the engine and order form together.
- The uncommitted #140 work is the base; don't restart it.
- Out of scope: Anthropic (no credits), new order fields (gender or name inputs), a separate
  context box for staff.
- Compose (Our-story panel) is unchanged except for the model.

## Success criteria

1. In the 18-row blind vote, the owner picks a new column more often than today's, in both
   languages.
2. Not one caption in the test uses a third-person pronoun for the book's people or a gendered
   guess. Checked by reading all of them, and stated in the report.
3. The order form shows the new box after the special pages in EN and DE, and `qa:order` is green.
4. All requirements are met; `npm test` is green.

## Context

- Round 1 votes (S199): today 15 · luna and new prompts 4 · both 6 · neither 9 (34 of 60 rows).
  Neither side is great, so "beat today" is the floor, not the goal.
- The owner rejected: asking customers about voice, a cast-of-characters form, playful fill-in prompts,
  and staff-written context.
- German wrong words ("Spitzenveilchen", "Reisblüten") were seen in round 1. Some margin is accepted
  because staff review every caption.
- Risk: given a nickname, the model will overuse it. Watch the with-notes column for that.
