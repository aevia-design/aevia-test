# Brief: Caption model migration before GPT-4o-mini retires

**Created:** 2026-10-27 (Session 199) · **Card:** Trello #140 (extends `caption-quality.md`)
**Objective:** ✦ Generate and ✦ Compose run on a model that is not retiring, chosen by the owner
from a blind side-by-side comparison, within €0.30 per book, deployed and working in English and German.
**Audience:** the executor (Claude / developer-agent). Then the owner, who picks the model from the
comparison, and Xenia, who uses ✦ Generate every day in the staff engine.
**Applicable Standards:** `docs/briefs/caption-quality.md` (#140 requirements),
`docs/briefs/caption-ai-modes.md` (settled caption rules), CLAUDE.md (cost awareness, secrets,
deploy), `rageatc-code-oss:test-driven-development`

## Why

OpenAI retires GPT-4o, GPT-4o mini, GPT-4.1 and GPT-4.1 mini on **14 January 2027** (OpenAI deprecations page; the owner's email
from OpenAI). Every caption call uses `gpt-4o-mini`, so ✦ Generate stops working that day. #140's
round-2 evaluation was about to compare prompts on that same model, so we fold the model choice into
the evaluation and test everything once. Xenia's goal is unchanged: fewer re-generations,
less cliché, and light humour where the collection suits it.

## Requirements

**Phase (a): model selection (research only, no paid calls):**
- [ ] Prices taken from **official** OpenAI and Anthropic pricing pages, fetched this session, with the
      URL and the date. Prices quoted from memory don't count.
- [ ] Candidates: OpenAI and Anthropic models that accept images, are current (not deprecated, no
      announced retirement inside 12 months), and are in the cheap tier
- [ ] **Image input cost** worked out per model for our real photo size (the photos are most of the
      cost, roughly 30k tokens per image on gpt-4o-mini today), plus the text in and out
- [ ] Cost per book at ~100 calls, worst case including the one silent retry, in €. Anything over **€0.30
      is out**
- [ ] Rate limits on our account tier checked against how staff use it (bursts of ~6 calls/min have
      already hit limits on gpt-4o-mini)
- [ ] Shortlist of 2–3 models, at least one from each provider if any fits, written to
      `work/caption-model/selection_v1.md` with a recommendation. **The owner approves the shortlist
      before phase (c) spends anything.**

**Phase (b): setup:**
- [ ] The model name lives in ONE place (shared by `functions/index.js`, `functions/caption/generate.js`
      and the CLI `functions/caption/caption.js`). Today it appears in 4 places.
- [ ] Anthropic requires a provider switch behind one small function: the same prompt, image and
      reply-cleaning for both providers. No framework and no new SDK unless the owner approves it (`fetch`
      is enough). The key lives only in `functions/.env`.
- [ ] The existing word-overuse control, single retry, German ban list and `caption-ai-modes.md` rules
      behave identically on every provider. Tests come first and are pure.
- [ ] `npm test` is green

**From caption-quality.md (#140, still in force):**
- [ ] On the test set, no watched word (moment, memories, forever, cherish, journey, magic) appears
      more than twice per book
- [ ] There's humour only in Kids and Adventures and only when something in the photo or the note
      supports it. Love stays warm.
- [ ] No invented facts. Compose keeps its length ceiling and never gets a floor.
- [ ] English keeps its no-leading-"A"/"An" rule and its punctuation rules. **German's S182 rules and
      ban list are not loosened.**

**Phase (c): evaluation:**
- [ ] Extends `work/caption-quality/round2-plan.md`: 18 cases (12 EN, 6 DE), balanced across kids, travel
      and love, half with realistic notes
- [ ] Arms: **today's live setup (gpt-4o-mini, old prompts)** as the baseline, plus the new prompts on each
      shortlisted model. Same photos and same settings across all arms.
- [ ] Results are shown **blind** (labels hidden, order shuffled) in a page like `compare.html`, with the
      key kept separately
- [ ] Spend estimated and stated **before every paid run**, and each run gets the owner's explicit yes
      (memory rule)
- [ ] Scoring per caption: invented fact (pass/fail), usable without editing (main measure), concrete
      detail, cliché, humour fits / forced

## Constraints

- **No paid API call without the owner's explicit go-ahead for that run.** Each eval run stays under €2.
- No deploy until the owner has picked a model. Deploy only `generateCaption` (and its caller); the
  rest of `functions/` deploys as it is.
- The uncommitted #140 work in `functions/` is the starting point. Build on it, don't restart.
- Out of scope: decision D (sending the photo note from the engine) is the owner's call, logged separately;
  step B (3 drafts plus a judge) only if the eval shows the need; providers other than OpenAI and Anthropic.
- German captions are judged by the owner. There's no native speaker review yet (a known gap).

## Success criteria

1. The owner has approved a shortlist backed by official prices, with cost per book ≤ €0.30.
2. The owner has picked the winner from the blind comparison and records why in
   `work/caption-model/decision.md`.
3. The winner is deployed, and a real ✦ Generate and ✦ Compose work in the staff engine in EN and DE
   (checked live, not in tests).
4. All requirements above are met; `npm test` is green; no model name is left in more than one place.

## References

- `docs/briefs/caption-quality.md`, `docs/briefs/caption-ai-modes.md`
- `work/caption-quality/round2-plan.md`, `compare.html`, `compare.js`, `key.json`, `baseline/`
- Code: `functions/index.js` (~line 134), `functions/caption/generate.js`, `prompts.js`,
  `caption-voice.md`, `caption.js` (CLI, `--language de`)
- German style: `work/german-caption-voice/research_v1.md`

## Context

- **Owner decisions:** the cost limit is €0.30 per book; Anthropic models are candidates alongside
  OpenAI (S199); the German ban list is not loosened (S197); expanding the ban list was dropped (S197).
- **Round 1 (S197, €0.40):** word limits held (1 retry in 60), but there was zero humour and English
  was as clichéd as before. That led to step A, the prompt rewrite, which has never been tested.
- **Risk:** a second provider means a second processor on the privacy policy (legal pages are not
  published yet; add it to the draft) and a second billing account.
- **Risk:** different models read the same prompt differently, so a prompt tuned on one may need
  tuning on the winner. Re-check the German rules on the winner specifically.
- **Watch out for:** deploy needs `FUNCTIONS_DISCOVERY_TIMEOUT=120`, and "Deploy complete!" is the real
  success signal, not the exit code.
