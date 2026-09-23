# Packaging — envelope design studies (S179)

**State: PAUSED.** Five studies produced and shown to the owner; Xenia is thinking about them.
Nothing is decided, nothing is ordered, no artwork exists.

## What this is

Aevia ships books in a **string-and-washer document envelope**, roughly **220 × 220 mm** with a
~76 mm flap. The supplier is chosen and the format is settled: the stock comes **pre-coloured**
in a choice of colours, the logo can be **embossed/debossed**, and **printing is available in any
colour** on top. Neither owner nor Xenia is a designer and neither wants to hire one, so the open
question was never "who makes this" — it was **what goes on the envelope and where**.

References and the blank template the supplier supplied: `assets/packaging/`
(`reference 1–3.jpg`, `template.png`).

## The five studies

Published artifact (private to the owner's account; share from the page's own share menu):
<https://claude.ai/code/artifact/cbeddb52-a9b6-4d3b-83fc-5c12280663b6>

| | Study | Idea |
|---|---|---|
| A | Quiet Mark | One debossed lockup low on the face, one small printed line on the flap |
| B | Full Measure | Wordmark 180 mm wide across the bottom; printed tagline above |
| C | The Letter | A short **printed** paragraph on the flap, mark signing it below |
| D | The Mark | The book glyph alone at 44 mm; nothing else at all |
| E | Ledger | Wordmark + printed rule as a masthead, footlines in both bottom corners |

The variable across A–E is deliberately **how much the envelope says**, not five shuffles of the
same elements. Each study carries its element sizes in millimetres and a "where this breaks"
note naming its specific production risk.

## Rules the studies follow

1. **Deboss carries the large forms, print carries the small text.** A die pressed into coloured
   stock loses fine detail, so anything below roughly 12 pt is printed instead. This is what the
   three references actually do on close inspection — reference 1's paragraph is printed, not
   debossed.
2. **Everything is specified in absolute millimetres**, drawn at true scale (1 mm on screen =
   1 mm on the envelope), so a chosen study transcribes into Illustrator without re-guessing.
3. Brand foundation comes from `context/style-guide.md` and `assets/css/type.css` — palette,
   logo rule, and the real tagline ("Keep your memories beautifully"). Nothing was invented.

## ⚠ The blocker

**There is no vector Aevia logo in this repo.** The only logo is
`assets/images/aevia_logo_transparent.png` (409 × 101 px). **A deboss die is cut from vector
outlines**, so the supplier cannot use it. The studies render that PNG as a CSS mask — good
enough to judge a layout, unusable for production. Ask Xenia for the original AI/SVG before any
of this becomes artwork.

## Also unanswered

- **Supplier's deboss minimums** — smallest stroke, smallest type, **maximum die size**. Those
  three numbers decide between A, B and D on their own. Study B's 180 mm lockup may exceed the
  die.
- **Exact envelope size and flap depth** — 220 × 220 / 76 mm here, taken from the template's
  proportions, not confirmed. If it is 225 mm every coordinate shifts.
- **Which print colour** — shown in brand gold `#9C7B4E`; tone-on-tone or white would read very
  differently and should be seen on paper.
- **The tagline.** B and C use "Keep your memories beautifully" from the style guide, not the
  unsettled "a life in pages" idea. Whichever wins **needs a German version** — the books ship
  in both languages now.
- **Study C's paragraph is placeholder copy**, there to judge the shape of the text block. Real
  copy needs a `/stop-slop` pass and a German twin.

## Rebuilding the page

`envelope-studies.html` is generated — do not hand-edit it. Edit `envelope-studies.tpl.html`,
then `python build.py` from this directory, which inlines the two logo base64 files. Republish by
passing the artifact URL above so the link stays stable.
