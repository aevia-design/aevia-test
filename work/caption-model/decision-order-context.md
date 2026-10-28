# Decision: How order context reaches the AI caption call

**Date:** 2026-10-27 (S199)
**Status:** Committed (owner agreed S199)

## Context

The AI never sees anything the customer wrote. The staff engine already loads the order's
album notes (`photoNotes`), cover texts (`coverCaptions`) and special-page answers (`fpTexts`) and
shows them in the order panel, but the ✦ Generate request sends only the photo. The server
already accepts a `note` field and the prompt already has "use the note, invent nothing" rules.
Without this context it fell back to generic third-person captions ("her", "them") that the owner
rejected. A two-way door: easy to change later.

## Options considered

1. **The engine sends the context it already holds**, as one short background block per call (baseline).
2. **The server looks up the order itself** from an order number. Rejected: `generateCaption` is a
   public endpoint, so anyone with an order number could pull customer text through it.
3. **One extra AI call per order to condense the context into facts.** Rejected: YAGNI.
   The text is short, and this adds a call, a cache and a failure mode.
4. **A staff-editable context box in the engine.** Rejected by the owner as too complex.

## Decision

We chose **option 1** because it reuses data the engine already has and a field the server already
accepts. It's a few lines in the engine and the prompt.

- **We gain:** captions can use nicknames, names and small facts, and the voice can be the parents' or
  the couple's.
- **We accept:** ~100–300 extra input tokens per call (~$0.00003). Customer text goes to OpenAI, which
  is already listed as a processor for photos and notes.
- **We assume:** the customer's notes are short. Long special-page passages get trimmed to a cap.

## Consequences

- The prompt must say the context is **background, not material for every caption**: use a detail at
  most once per book, most captions use none, never repeat names, and never quote the special-page
  text back.
- Empty context = today's behaviour (pronoun-free, photo-based). Captions must work with zero input.
- Watch for a nickname or fact appearing again and again across one book. If it does, add it to the
  word-overuse control.
