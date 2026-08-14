# Brief: Caption AI — where the button belongs and what it does

**Created:** 2026-08-14 (S175)
**Objective:** Make the staff engine's ✦ Generate button appear only where AI has a job to do,
and give it a second job — composing the Our-story panel from the customer's own answers —
without ever rewriting words the customer wrote to be kept.
**Audience:** The developer implementing this (a future session or another agent), and the
owner approving the voice rules.
**Applicable standards:** `CLAUDE.md` (simplicity, surgical edits, verify before "done"),
the engine-parity rule, `/stop-slop` (already encoded in `caption-voice.md`).
**Status:** **IMPLEMENTED S175** — all three steps shipped and verified; `generateCaption`
redeployed with compose mode. Owner settled the scope and tested the engine himself. One open
question (the travel-map itinerary) remains and does **not** block anything.

---

## Why

The button is attached unconditionally. `template-engine.html` adds ✦ Generate to *every*
caption-allowed slot and *every* text panel, both inside `renderSpread`. No data flag gated it.

That is fine for a standard spread, where the caption is genuinely AI's job and the current
behaviour works well. It is wrong on a special page, where the text on screen is something the
customer wrote and expects to see in their book. Today, clicking Generate on Heirloom's "Why I
love him" panel discards their words and substitutes a caption invented from a photograph. The
customer's text is never sent to the API — the request body is `{ image, collection,
previousCaptions }` — so there is no sense in which it is being "improved".

Two further defects surfaced while scoping this:

**`collection` is hardcoded `'kids'`** at all three call sites
(both `fetch` calls to `generateCaption` in `renderSpread`, plus one in
`pages/spread-preview.html`).
Wedding and travel books are getting captions written under kids tone-of-voice rules, on
standard spreads, right now. This affects orders that already ship and is the highest-value
item in the brief.

**Text panels do not shrink to fit.** The `autoShrink` path in `renderSpread` is gated on
`capDef.autoShrink`, which neither story panel declares. Text that overruns the panel keeps its
size and **overflows the box**, running over the surrounding artwork.

⚠ **An earlier draft of this brief said the text was silently CLIPPED. That was wrong** — the
`overflow: hidden` it cited is set only inside the `if (isFunnyWords)` branch (Scribble's
3–5-word page), and neither `.slot-caption` nor `.fp-text-panel` sets `overflow` in CSS. Story
panels take the `else` branch: fixed height, flex-centred, no overflow rule. So the failure is
**visible on screen**, not invisible — staff see it before approving. The word ceiling is still
a print-safety rule (spilling over artwork would print), but the failure is loud, not silent.
Corrected S175 after a review caught it; do not reintroduce the clipping claim.

**Unverified:** whether the PDF renderer spills the same way. A comment in `renderSpread` says
the PDF centres text identically, which implies it does, but nobody has rendered an over-long
story panel to PDF. Bounded risk — staff see the overflow in the engine first.

---

## Decisions (owner, S175)

### 1. Standard spreads: unchanged

Every `caption.allowed` slot on an SP page keeps its button and its current behaviour, on every
template. It works. Do not touch it. (The `collection` fix below does change what these calls
send — that is the point.)

### 2. Remove the button entirely — 19 page definitions

(19 definitions across the data files; 28 instances once Heirloom's three are counted per
colourway.)

The customer supplies the text. There is nothing to generate and nothing to enhance.

| Template | Pages |
|---|---|
| Scribble | FP1 Birthday wishes, FP2 Funny words, FP3 Favourite toy, FP4 First steps, FP5 Art-Gallery |
| Papercut | FP1–FP5 (same set) |
| Tender | FPintro, **FPwords** |
| Heirloom (×4 colourways) | FPintro, **FPhim**, **FPher** |
| Joyride / Laguna | FPintro |
| Newborn | FPintro, FPlabour |

Reasoning per group:

- **Scribble / Papercut FP1–FP5** — every one of these collects its text on the order form.
  FP1 takes a birthday message, FP2 takes 3–5 of the child's actual words (verbatim by design —
  AI would destroy the point of it), FP3/FP4 take a caption each, FP5 takes two captions via
  `orderFormMeta.labels`.
- **All FPintro pages** — composed from labelled fields by `composeIntroBlock()` in
  `order.html` (Newborn's birth story) or by the template's own `compose()`. The customer's
  facts, in a fixed frame. Keep as entered.
- **Newborn FPlabour** — left page is built as `Welcome to this world, {name}!`; right page is
  pre-filled from `zodiac.copy` for the chosen sign. Both are deterministic and staff-editable.
- **Tender FPwords, Heirloom FPhim / FPher** *(owner's call)* — vows, toasts, wishes, and why
  you love your spouse. The customer has probably already used AI on these before pasting them.
  These are the words they chose. We do not rewrite them.

**Removing the button does not remove staff editing.** The panels and captions stay
`contenteditable`; staff can still fix a typo or reflow a line by hand.

### 3. Compose — Our story only

The one page type where AI keeps a job beyond standard spreads: **Tender FPstory** and
**Heirloom FPstory** (all four colourways).

The customer answers two separate questions — *How you met* and *How your relationship
started* — and `compose: (v) => meet + '\n\n' + started` drops them into the panel as two
stranded paragraphs. Welding those into one readable passage is a real editorial task, and it
is what the order form already promises: *"We shape it into the Our-story page and polish the
wording."*

This is the **only** mode. An earlier draft of this brief proposed three (generate / compose /
polish); removing the button from Words and Why-I-love collapsed "polish" out of existence.
One mode is the right answer — do not reintroduce the others.

### 4. Contract

Compose is **text-only — no image.** The photo on an Our-story spread is not what the passage
is about, and sending it invites the model to describe it.

The panel already holds the customer's composed text, so nothing new needs plumbing from the
order form. The button sends what is in the panel.

Add a `text` parameter to `generateCaption` (or a sibling function — implementer's call, but
prefer extending the existing one; it already loads the voice file). When `text` is present and
`image` is absent, run compose mode. Keep the existing image path untouched.

**Cost:** negligible, and *lower* than a caption call — `gpt-4o-mini` with no vision payload.
Not a factor in any decision here.

### 5. `collection` per template

Stop hardcoding `'kids'`. The voice file already defines three collections — **Travel**, **Kids**,
**Love** — with distinct registers and worked examples for each.

| Collection | Templates |
|---|---|
| Kids | Scribble, Papercut, Newborn |
| Travel | Wander, Joyride, Laguna |
| Love | Tender, Heirloom (all four colourways) |

Source it from the template registry, one field per template, read at the call site. Every
compose call is `love`, since both remaining templates are weddings.

**`spread-preview.html`: checked, left alone (S175 decision — do not re-raise.)** It is the
third call site and it keeps `collection: 'kids'`, which is correct there. Evidence: it is not
linked from any page (only four old `scripts/test-*.js` navigate to it by URL), it is absent
from `LINKS.md` and `ARCHITECTURE.md`, it has **zero** references to any template data
(`SCRIBBLE_DATA`, `templateName`), and it takes local file uploads rather than loading an
order. It is a standalone prototype that can only render Scribble — a kids template — so there
is no template to source a collection from. A review flagged this as a blocking defect on the
strength of `photo-formats.md` naming it as a HEIC surface; that brief's drift warning is fair,
but the right fix for a dead prototype is deletion, not a registry it has no use for. **Owner's
call whether to delete it.**

**`customer-preview.html`: deliberately NOT given the `collection` field (S175 decision).** The
same review asked for it under the engine-parity rule. Customer-preview has no AI at all — zero
`generateCaption` calls — so the field would be data nothing reads. Parity exists to stop
shared *render functions* drifting, which `tests/engine-parity.test.js` still enforces and
which still passes. Adding unused fields to satisfy a rule mechanically is what CLAUDE.md
rule 0 warns against.

---

## Voice rules for compose mode

`functions/caption/caption-voice.md` is loaded as the system prompt and already carries the
stop-slop rules — the "AI writing patterns to eliminate" section is exactly that list. **Do not
rewrite the voice file.** Add a section to it.

The addition is necessary because the existing rule **"One sentence. Sometimes just a few
words. Never more than two sentences."** is tuned for photo captions and directly contradicts a
60-word panel. Left unqualified, the model receives contradictory instructions.

### Length: hard ceiling, not a target

Aim **45–65 words.** Instruct as a maximum, not a goal — the panel does not shrink to fit, so
anything longer runs over the artwork.

Capacity, estimated from the panel geometry:

| Template | Panel | Font | Rough capacity |
|---|---|---|---|
| Heirloom FPstory | 110 × 110 mm | IM FELL English 16pt | ~120 words |
| Tender FPstory | 120 × 140 mm | **Parisienne 22pt** | ~85 words |

Tender is the binding constraint and the estimate is softest there — Parisienne is a script
face, so character-per-line arithmetic is unreliable for it. **Verify by rendering a
65-word sample in both templates before shipping.** Do not trust the table.

### Fabrication: a harder rule than captions have

The existing rule ("no names, locations, dates unless explicitly provided") is calibrated for a
caption, where inventing a mood is harmless. On a story page, inventing an event is a disaster
the customer reads in print and cannot return.

New hard rule for compose mode:

> Use only the facts the customer has given. Add no events, places, dates, people, or feelings
> that are not in their text. You may add connective phrasing, fix grammar, and order the
> material. You may not narrate a relationship.

### Register

Collection `love`, per the existing voice file. Prose, not aphorism — the caption examples in
the voice file are deliberately fragmentary and must not be the model for a passage. No
exclamation marks, no rhetorical questions, per the existing rules.

---

## Golden set

Voice regressions are invisible: change one prompt line for the story page and standard-spread
captions get quietly worse three weeks later, with nothing failing. This is the only cheap
defence.

Check into the repo **ten sample inputs with the output the owner would accept** — a handful of
compose pairs (`meet` + `started`) and a handful of standard-spread photo captions per
collection. Re-run after any prompt change and read the diff. This does not need to be an
automated assertion; a script that prints old vs new side by side is enough.

---

## Implementation order

1. **`collection` from the registry** — smallest change, affects captions that already ship.
   Independent of everything else; can go first and alone.
2. **Gate the button in the data files** — add a flag (e.g. `aiButton: false`, or the inverse)
   to the 19 pages above, and read it at both call sites in the engine. ⚠ Do not disturb the
   existing `caption.aiGenerated` marker on Newborn's Labour right page — it is used at
   two places (search `caption.aiGenerated`) to identify *which side* is the
   non-customer caption, and is not a button flag.
3. **Compose mode** — `text` param on the function, voice-file section, wire the two FPstory
   panels.
4. **Golden set** — after the prompt is stable.
5. **Verify** — render a 65-word story panel in Tender and Heirloom and confirm it sits inside
   the box. **Owner declined this as a rare-case test (S175)** — accepted risk: the overflow is
   visible in the engine, so staff catch it before approval.

Steps 1 and 2 are worth doing even if compose is deferred.

---

## Settled: the travel-map itinerary gets NO AI

**Decided S175 (owner): no enhancement on Wander / Joyride / Laguna FP1. Do not re-raise.**

The customer types a route — `Vienna → Hallstatt → Salzburg → Innsbruck`. An earlier reading
was that this needed "enhancement"; it does not. Place names are facts, and the data file frames
the job as layout, not language (`hint: "we'll lay out the itinerary for you"`). Turning the raw
arrow-separated string into a set itinerary is a **formatting** job — split on the arrows, one
place per line — with no model involved.

The evidence that closed it: a live compose smoke test on the Our-story page turned *"we talked
all night and missed the last train home, so we walked"* into *"...enjoying each other's company
under the stars, laying the foundation for a relationship that would soon blossom."* Stars,
invented. A model that embellishes a sentence will embellish a list of towns, into a printed
book that cannot be returned.

⚠ That same test is an **open defect on compose itself** — see below.

---

## Open: compose invents facts

The hard rule in `caption-voice.md` ("add no events, places, dates, people, or feelings that are
not in their text") is **not holding**. Two live examples, both post-deploy:

- `"coffee"` → `"coffee dates"` (mild)
- the wedding example above — invented stars, an invented feeling, and greeting-card phrasing
  (`"blossom"`) that the voice file's stop-slop section separately bans

Length held both times (22 and 53 words), so the ceiling is fine. Fabrication is not.

**Probable cause, untested:** `generateCaption` never sets `temperature`, so compose runs at the
API default — maximum creativity for what is an editing task. Two candidate fixes, cheap:

1. Set a low `temperature` on the compose call.
2. Move the hard rule from the system prompt into the user message — models weight the most
   recent instruction more heavily.

Not attempted yet. **Nobody should compose a real customer order until this is fixed** — the
Our-story page is the couple's own account of how they met.

---

## Related

- `functions/caption/caption-voice.md` — the voice, already stop-slopped
- `functions/index.js` — `exports.generateCaption`
- `pages/staff/template-engine.html` — `renderSpread` holds both button call sites
- The per-page field inventory that produced this brief was derived from the `orderFormMeta`
  blocks in each `*-data.js`; those files remain the source of truth.
