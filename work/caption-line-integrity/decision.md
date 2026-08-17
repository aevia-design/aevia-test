# Decision: how to stop recorded caption lines diverging from saved caption text

**Date:** 2026-08-17 (S181)
**Status:** Committed

## Context

AEV-099 printed with letters moved across line breaks ("Anna & M / ichael", "…more t / han…").
Root cause: the engine saves two descriptions of each caption from two different sources of
truth — the **words**, normalised on the way out (`panelToPlain` strips `&nbsp;`), and the
**line breaks**, measured off the raw DOM (`captionVisualLines`). Nothing keeps them in step.
Since S159 the PDF draws the recorded breaks verbatim, so a DOM/text divergence prints.

Confirmed by execution, not inspection: the PDF's own wrapper produces the correct lines; the
broken lines are stored in Firestore; `linesMatchText` accepts them because it squashes all
whitespace and JS `\s` matches U+00A0. A scan of all 90 orders found 7 with recorded lines and
exactly 1 damaged (AEV-099, across two text panels, two slot captions and the cover) — the
mechanism is template-agnostic, the damage so far is not.

## Options Considered

1. **DOM matches text** — stop putting anything in the caption DOM that is not in the saved
   string: drop `applyTypographicRules()` from the render paths and normalise `&nbsp;` out
   before the lines are recorded.
2. **Text matches DOM** — save the typographic non-breaking spaces too, and teach the PDF to
   treat them as non-breaking when wrapping but draw them as ordinary spaces.
3. (Rejected without building) keep both and repair recorded lines after the fact — repairs the
   characters but not the break positions, so it does not fix the printed result.

## Decision

We chose **Option 1** because it is the smallest change that makes the divergence structurally
impossible, and because the feature it removes is a crude heuristic whose failure mode is a
wrongly printed book.

Key trade-offs:
- We gain: what is on screen is byte-for-byte what is saved, so recorded breaks can never
  describe a different string. Preview, customer preview and print agree by construction.
- We accept: the loss of automatic non-breaking spaces after ~20 short words and of widow
  prevention on the final word. This visibly changes where some captions break, on screen and
  (via the recorded lines) in print.
- We assume: that polish is worth less than a guaranteed-correct printed book. Reversible —
  the rules are one function and can return if the owner misses them.

Option 2 was rejected as more work for a worse shape: it writes non-breaking spaces into stored
customer text, creating two eras of caption data, and it keeps a feature whose value is
cosmetic. Option 1 is a two-way door; Option 2 is closer to one-way.

## Consequences

- `applyTypographicRules()` is removed from both engines (staff + customer preview) so the two
  surfaces stay parallel copies.
- The print-side check `linesMatchText()` is tightened from "same characters ignoring
  whitespace" to "the lines rejoin into exactly this text", which rejects any break that splits
  a word. Not the fix — the seatbelt. It repairs AEV-099 without a re-save and closes the class
  against any future recording bug.
- Line breaks recorded before this change stay in Firestore; the tightened check is what makes
  them harmless.
- Watch: a caption that legitimately breaks at a hyphen or dash is still accepted (joined with
  no space); anything else that cannot rejoin falls back to the PDF's own wrap.

## Next Steps

Implement, then re-run the all-orders scan as proof.
