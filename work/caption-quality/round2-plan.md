# #140 caption quality — Round 2 plan (S197, revised after critic + Codex review)

Status: PLAN ONLY. No test runs without the owner's explicit go-ahead.

## Round 1 result (60 photos, one caption each, old vs new, EN+DE)
Word limits held, 1 retry in 60. Zero humour; English as clichéd as before; German concrete before and after.
Raw: compare.html + key.json.

## Why it failed (verified in files)
1. caption-voice.md:25 "Write what the photo feels like. Not what is literally in it" pushes abstraction.
2. English user message carries only the A/An rule; German carries "NAME SOMETHING ACTUALLY IN THE
   PHOTOGRAPH" (prompts.js) — the rule that fixed German in S182.
3. Several voice-guide examples teach unsupported facts ("Two hours from anywhere", "Third gelato",
   "Six months old", "Nap declined").
4. The staff engine never sends a customer note (template-engine.html:3186), so humour has nothing to stand on.
5. One sample per photo at default temperature cannot separate a real change from luck.

## Changes, in order (each tested before the next)
A. Instructions (cost 0): rewrite line 25 toward concrete detail; replace unsupported examples with ones
   tied to something visible; add a short numbered block to the ENGLISH user message: 1 no invention,
   2 name something visible, 3 humour only when a visible detail or the note provides it, never forced.
   Set temperature explicitly (test 0.4 vs 0.7).
B. Candidates (+~€0.01/book): n=3 in the same vision call (image billed once); drop candidates that fail
   format/banned words/similarity in code; a cheap low-detail judge call picks one. Only if A wins.
C. Pin gpt-4o-mini-2024-07-18 (same model, no silent drift).
D. Separate decision: send the photo's note from the engine (needs a staff UI field or reuse of the
   order-form note — owner's call).

Dropped from the earlier plan: expanding the ban list (shifts to synonyms).
Keep: the existing word-overuse control + single retry (worst case 80pp ~€0.30 only if EVERY caption
retries; observed rate 1/60).

## Evaluation (≈ €0.19, ~15 min)
18 cases (12 EN, 6 DE regression), balanced across collections, half with realistic notes, mix of funny and
quiet photos. Old and new in the same run, 3 candidates each (36 vision calls + 18 low-detail judge calls).
Blind scoring per candidate: invented fact (pass/fail), usable without editing (primary), concrete detail,
cliché, humour fits / forced.
