# Caption model selection — v1 (S199, 2026-10-27)

Phase (a) of `docs/briefs/caption-model-migration.md`. Research only, no paid calls.

## Sources (fetched 2026-10-27)
- OpenAI pricing https://developers.openai.com/api/docs/pricing · deprecations …/docs/deprecations ·
  vision …/docs/guides/images-vision · gpt-6-luna …/docs/models/gpt-6-luna
- Anthropic pricing https://platform.claude.com/docs/en/about-claude/pricing · models …/models/overview ·
  deprecations …/model-deprecations · vision …/build-with-claude/vision

## Correction to the brief
**gpt-4o-mini shuts down 14 January 2027**, not 27 January (OpenAI deprecations page, notice of
14 Oct 2026; named replacement: `gpt-6-luna`). Working deadline: deployed by **early January**.

## What one ✦ Generate call contains (from the code)
- System prompt `caption-voice.md`: 16 KB ≈ 4,000 tokens; user text ≈ 500 → **~4,500 text tokens in**
  (≈5,900 on Claude: its tokenizer counts ~30% more for the same text).
- One photo, the 1600px web derivative (calc uses 1600×1067).
- Reply ≈ 30–60 tokens.
- Up to one silent retry (word control) → worst case = 2 calls.

## Candidates (cheap tier, take images, not retiring within ~12 months)

| Model | $/1M in / out | Image tokens (1600×1067) | Retires | Notes |
|---|---|---|---|---|
| **gpt-6-luna** (OpenAI) | 0.10 / 0.50 | ~2,040 ⚠ *estimate* — its formula is not published | none announced | Official replacement for 4o-mini. Reasoning model: default effort `medium` bills hidden thinking tokens → set `reasoning_effort: none`. Temperature support unconfirmed. |
| **claude-haiku-5-5** (Anthropic) | 0.10 / 0.50 (prompts ≤100k) | 2,262 (58×39, published formula) | not before 7 Oct 2027 | **`temperature` is removed** in the current API (400 error) — our compose call sets 0.2, must drop it on this path. No EU-only option on Anthropic's own API (default "global"); EU regions only via Google Vertex / Bedrock at +10%. |
| gpt-5.6-luna (OpenAI) | 0.20 / 1.20 | 2,040 (documented) | none announced | Fully documented fallback, twice the price. |

Rejected: gpt-5-mini / gpt-5-nano (retire 11 Dec 2026), gpt-5.4-nano (retires 1 Apr 2027),
gpt-4.1-* (retiring with 4o-mini), Haiku 4.5 ($1 in, and past its earliest retirement date),
anything Sonnet/terra tier and up (10–20× the price, not needed for a one-line caption).

## Cost per book (100 calls; worst case = every call retries)

| Model | per call | per book | worst case |
|---|---|---|---|
| gpt-4o-mini **(today)** | ~$0.0062 | **~$0.62** | ~$1.24 |
| gpt-6-luna | ~$0.0007 | **~$0.07** | ~$0.14 |
| claude-haiku-5-5 | ~$0.0008 | **~$0.08** | ~$0.17 |
| gpt-5.6-luna | ~$0.0014 | **~$0.14** | ~$0.27 |

All inside the €0.30 cap. Prompt caching (the 4k-token voice guide is the same on every call)
would cut input cost further on both providers — not counted here.

⚠ **Today's real cost is ~10× what the #140 brief assumed.** gpt-4o-mini bills a photo as ~36,800
tokens (a 33× image multiplier). Round 1 confirms it: 60 calls cost €0.40 ≈ €0.0067/call. Every
candidate is roughly **8–9× cheaper** than what runs now.

## Unconfirmed — settled by the first paid test call (cents)
1. gpt-6-luna's real image token count (read `usage` on one call).
2. Whether gpt-6-luna accepts `temperature` with effort `none`.
3. Haiku 5.5's real count (high-resolution tier assumed; the page does not name Haiku 5.5 in it).

## Recommendation
Shortlist **gpt-6-luna** and **claude-haiku-5-5** — same price, one per provider, both long-lived.
Optionally **gpt-5.6-luna** as a third arm (+~€0.10 to the eval).
Lean: **gpt-6-luna** if quality ties — same provider, same key, same processor already disclosed,
no new billing account. Haiku wins only if its captions are clearly better in the blind test.

Eval cost estimate (round-2 shape, 18 cases × 3 drafts, baseline + 2 arms): **≈ €0.50**, almost all of
it the gpt-4o-mini baseline arm. Requires the owner's yes before running, plus an Anthropic API key.
