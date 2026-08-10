## 2026-08-10 — In an SVG, read the CLIP before measuring anything (S160)

Xenia's covers wrap the photo opening as
`<g data-name="Image"><g clip-path="url(#n)"><rect .../></g></g>`. **The rect is a swatch
painted inside the clip; its size and position are arbitrary.** Only the clipPath defines
the opening. I measured the rects across the three new colourways, found them varying and
non-square (247×274, 262×234 against Beige's exact 226.772 square), and reported that the
openings had moved and each colourway would need its own clip extraction. Wrong: the clip
paths are character-identical in 11 of 12 covers. The colourways needed FEWER clip variants
than Beige, not more.

Generalises the S158 note about the solid rect disagreeing with the path by up to 1.8px:
that was framed as a precision warning, but the rect is not an imprecise version of the
opening — **it is not the opening at all.** Extract `clipPath` by the id the Image group
names, and ignore every rect beside it.

## 2026-08-10 — A test that discovers its own inputs can silently cover nothing (S160)

`tests/cover-svg-viewbox.test.js` finds templates by looking for a `-data.js` at the top of
each `assets/Template_*` dir. Heirloom keeps one per COLOURWAY in a subfolder, so **all four
Heirloom colourways were skipped entirely** — the suite was green and the count of covers
checked was never asserted. It stayed blind from S157 through nine newly imported covers in
S160, while CLAUDE.md named it as the guard to run after any SVG re-export.

**Rule: a discovery-based test must assert HOW MUCH it discovered**, not just that what it
found passes. The same shape bit the S160 contrast gate, which printed an empty table and
`PASS: true`; a floor on the expected row count turns both silent holes into failures.
Coverage here went 6 → 18 covers once discovery recursed one level.

## 2026-08-09 — Two renderers must not both DERIVE the same thing (S159)

The engine wrapped captions with browser layout; `export-pdf.js` independently re-wrapped the
same text with pdf-lib advances. Two implementations of one job drift, and every fix so far
had been an attempt to make the second imitate the first. That treadmill produced the
`autoShrink` flag, the `LIGATURE_FONTS` list, and this session's two bugs.

**Rule: when engine and PDF must agree on a DERIVED value, one side computes it and the
other consumes it.** The engine now records where each caption actually broke
(`collectCaptionLines`) and the PDF draws those lines (`captionLinesFor`). The engine is the
right authority because it is what staff and the customer approve. Applies beyond captions —
any value both surfaces compute independently is a latent divergence.

Four corollaries, each paid for this session:

1. **Never fix a general divergence as a per-template opt-in.** Cover-caption WRAPPING was
   bundled inside `autoShrink`, which only `joyride-data.js` declares — so a template needing
   wrap but not shrink got neither. Heirloom's 50pt `ANNA & MICHAEL` (471pt in a 283pt box)
   printed as one line for exactly this reason. Same shape as `LIGATURE_FONTS`. **Fix the
   shared path and let templates opt OUT.**
2. **A consumed value needs a staleness guard, not just a producer.** `approveOrder` copies
   `customerCaptions` → `staffBookCaptions` wholesale; the staff-recorded lines then describe
   superseded text, and drawing them DROPS OR DUPLICATES WORDS in print — worse than the
   wrong break. `linesMatchText` refuses stored lines that no longer reconstruct the text and
   falls back to wrapping. Guard at the consumer even after fixing the producer.
3. **Geometry read from client rects must not assume the block axis.** Spine captions are
   `rotate(270deg)`; text runs vertically, so "rect.top changed = new line" recorded one line
   PER CHARACTER. Read the computed transform and pick the axis. Caught only by the QA script.
4. **Distrust a synthetic harness that disagrees with the real render anywhere.** Mine
   reproduced the reported line break but wrapped a second line the real engine didn't. That
   was the harness being wrong, not the arithmetic — and tuning it until it agreed would have
   manufactured a false root cause.

**Method note (reinforces [[feedback_inspect_render_first]] and the S153 note below):** I
recommended a fix ("subtract the engine's 8px caption padding from the PDF's wrap width")
off an ESTIMATE and had to revert it — the target line sat 16pt clear of the boundary, so it
changed nothing. Two hypotheses died to measurement first: pdf-lib **never shapes text**
(ligature width delta 0.00pt), and browser vs pdf-lib glyph metrics agree within 0.4%.
**Measure before recommending, not after.**

Gate: `qa/verify-caption-parity.mjs` — runs in LOCAL mode (no order, no GCS cost), asserts
recorded lines reconstruct each caption exactly and match the browser's rendered line count.
Passes on all 7 templates. Run it after any caption, font or engine-layout change.

## 2026-08-07 — Test photos live in `assets/test photos/`, one folder per template (S158)

**`qa/test-photos/` is gitignored and does not exist on this machine** — scripts pointing at it
die with `ENOENT: scandir 'qa\test-photos\...'` (that is what breaks
`qa/debug-all-templates-render.mjs` today). The real, populated set is **`assets/test photos/`**,
and it is subject-matched per template — use the right folder or the render tells you nothing
about how the template actually looks:

| Folder | Use for | Count |
|---|---|---|
| `Wedding` | **Heirloom**, Tender | 56 |
| `Newborn` | Newborn | 113 |
| `Toddler` | Papercut, Scribble | 58 |
| `Drawings` | the art-gallery special pages in Papercut + Scribble | 4 |
| `Hiking` | Wander | 57 |
| `City vibes` | Joyride | 55 |

**Why it matters beyond convenience:** a wedding template rendered with newborn photos looks
fine to an assertion and wrong to a person — the subject, crop and palette are what tell you
whether a spread's composition works. Subject-matched photos are what make the eyeball step
worth doing (S158: the Heirloom preview was reviewed with Newborn photos before this folder
existed, and the cover read as a hospital shot in a wedding frame).

Path note: the space in `test photos` needs quoting in shell and `%20` in a URL served by
http-server. `Drawings` holds only 4 images — enough for the art-gallery pages it is meant for,
not enough to fill a book, so don't use it as a general pool.

## 2026-08-07 — A supplier's asset is an input to verify, not a source of truth (Heirloom, S157)

**The cover photo did not render, and nothing was wrong with the code.** Xenia's three Heirloom
cover SVGs shipped with the photo window painted a solid `#312128` rectangle where every prior
template has `fill="none"`. The engine dutifully clipped the photo, placed it, and drew the
artwork on top — including the opaque rectangle. A second, independent bug hid underneath:
the slot sat 15mm high, because the CSV's photo row expressed y with a +3mm page bleed while
its own caption rows used the +18mm cover bleed. **Two supplier-data defects, zero code defects,
and the render looked like one engine bug.**

**The pattern, now three templates deep** (Wander's full-bleed viewBox S154, Tender's spine
colour S79, Heirloom's filled window + mixed bleed convention S157): a drop from a designer is
an *input to validate*, not a specification to implement faithfully. The parts most likely to be
wrong are the ones no human eyeballs in Illustrator — a fill on an invisible layer, a coordinate
column, a viewBox.

**What to do on every new drop, before writing a data file:**
- **Diff the new SVGs' structure against the closest built template's**, not just their content.
  `grep` the layer names (`data-name=`) and the photo-window element. If the equivalent element
  is `fill="none"` in the old template and a colour in the new one, that is the bug.
- **Cross-check the CSV against itself.** Heirloom's caption rows and photo row disagreed by
  15mm on the same page. When two rows in one file imply different origins, trust the artwork:
  read the real coordinate out of the SVG (here, the clip path's bbox centre) and make the data
  match *that*.
- **Assume a re-export re-introduces every in-repo patch.** The fix lives in the repo, not in
  Xenia's file. Record it in the build brief so the next person re-applies it.

**Corollary on fonts:** never infer ligature risk from a font's genre. IM FELL English is a
serif and forms ligatures (fontkit: 52 chars → 45 glyphs). The check is three lines and
authoritative; the guess is neither.

## 2026-08-06 — A test that mirrors code proves nothing about the code (S156)

**Every upload on the live rig was broken for a day, with 281 tests green the whole time.**
`10536f2` shipped `const workerInFlightBytes` declared 15 lines *after* the line that reads it,
so `order.html` threw `Cannot access 'workerInFlightBytes' before initialization` before a single
byte moved. A `|| {}` fallback sat on the read and did nothing: with `const`, touching the name
before its declaration is itself the error, so `||` never evaluates. **The guard that made the
code look careful is why nobody looked harder.** It would have worked with `var`.

**Why the suite was silent.** Three test files name `order.html`; none execute it. They
transcribe its logic — *"House-style: mirrors the predicate from pages/order.html"* — and assert
the transcription behaves. A mirrored test verifies a copy, and a copy cannot crash on load. So
the suite's 281 passes carried **zero** information about whether the page ran at all. This is the
same shape as the S149 environment-matrix blind spot: breadth of assertions masking the absence of
the one check that mattered.

**Third occurrence in four sessions.** S153, S154 (`export-pdf.js`, "I wrote the call into
export-pdf BEFORE defining the function and all 252 tests still passed"), now S156. Three
identical failures is not carelessness — it is a missing capability, and the fix belongs at that
level, not in another careful code review.

**What was NOT the answer.** Adding ESLint, and adding a new smoke test. A browser harness
covering exactly this path *already existed* (`qa/order-hardening-mock.mjs`, every backend call
mocked, no cloud cost) and had rotted unnoticed — it waited on a button label that had since been
reworded, and could not even reach submit. **A second forgettable check would have rotted the same
way.** Repaired, and the run now reads `#err-step2` on failure, because `submitOrder()` catches its
own exceptions: a crash otherwise looks identical to "success never arrived".

**The rule:** `npm test` cannot tell you a customer can place an order. A `.githooks/pre-push`
hook now runs `npm run qa:order` whenever `pages/order.html` changes. Select page elements by id
or position, never by copy — the rot here was one reworded button. And when a check exists but
nobody runs it, automate the running; do not write a better reminder.

## 2026-08-06 — Bugs that were always there, revealed by a change elsewhere (S154)

**Three separate defects surfaced this session, none of them newly introduced. Each had been
wrong for months and was masked by a coincidence that the spine change removed.**

1. The flat mockup composer sliced the front cover from a wrap it assumed was 409mm wide. It also
   inherited ~3px of canvas-border chrome from the capture. Neither mattered, because
   `resize(..., {fit:'cover'})` happened to crop about 3px vertically at the old wrap width. The
   10mm spine widened the wrap by 9px, the aspect shifted, the crop fell to 0.4px, and the border
   appeared as a white strip on a customer-facing mockup.
2. `coverCaptionStyle` picks a font cut with a numeric ladder. Papercut declared `weight: 'bold'`
   as a string, `'bold' >= 700` is false, and the PDF drew regular. It was invisible because both
   engines render the same value as CSS, where `font-weight: bold` is valid — so screen was right
   and print was wrong, with no error anywhere.
3. Papercut's photo slot was smaller than the artwork's own photo opening, exposing a violet
   placeholder rect. That had shipped in the live mockups since June and nobody saw it until the
   slot geometry was under scrutiny for other reasons.

**The pattern: a system can carry a defect indefinitely while some unrelated constant holds it
still.** Changing a dimension somewhere else does not cause these bugs, it reveals them — so when
one change produces several unrelated-looking failures, suspect exposure rather than breakage, and
resist "fixing" the change that revealed them. In all three cases the correct fix was upstream of
the symptom: derive the wrap width instead of assuming it, normalise the weight before comparing,
size the slot from the silhouette.

**Corollary for verification:** all three passed every test we had. The tests asserted the things
that were easy to assert and none of them compared two representations of the same object —
artwork against slot, engine against PDF, capture against composer. That comparison is where this
class of bug lives.

## 2026-08-06 — Element positions are not proof that artwork landed (S154)

**Wander's cover SVG was re-exported with a viewBox framing the full bleed artboard (445x236mm)
instead of the trim (409x200mm), twice.** The engine sizes the cover SVG to exactly 409mm, so
445mm of artwork got squeezed into it: everything ~8% small, and the outer ~16mm of the front
cover fell outside the artwork entirely and filled with the flat fallback colour — which in print
is a blank band down the edge of a cover.

**`qa/verify-spine-s152.mjs` reported 14/14 PASS on the broken file.** It measures where elements
sit — canvas width, panel boundaries, caption centres — and every one of those was correct,
because the engine's split paints them regardless of what the SVG contains. Nothing measured
whether the artwork inside the SVG reached the edges it was supposed to reach. The defect was
found by sampling pixels along the right edge and noticing the colour was the data file's
`bgColor` rather than anything Xenia drew.

**Rule: after any asset re-export, a green geometry run means nothing.** Look at the render, or
assert something about the artwork itself. `tests/cover-svg-viewbox.test.js` now does the latter
for this specific trap, asserting the viewBox RATIO (trim 2.045 vs full-bleed 1.886) rather than
absolute units, since templates legitimately export at different scales.

**Second occurrence of this exact bug on this exact file.** The first is recorded in the bleed
model notes. Twice is a pattern, which is why it is now a test rather than a warning.

## 2026-08-06 — Re-derive a subagent's measurements before acting on them (S154)

A read-only subagent audited three cover SVGs for spine colour. It got Papercut right — a real
mismatch worth catching — and Wander wrong, reporting a rect that sits on the back panel as the
spine. The error was mechanical: it read the rect's `x` and `width` attributes without applying
the enclosing `<g transform="matrix(...)">`, and its own summary admitted the evidence was
"confirmed by x width 335.315", a number meaningless without the transform.

The conclusion happened to be correct anyway (the colour did match), which is the dangerous part:
a wrong method that produces a right answer survives review. **For anything geometric in an SVG,
the transform stack is the measurement** — re-derive it before changing data. Delegating the
*search* was still worth it; delegating the *arithmetic* was not.

## 2026-08-05 — Green tests that measure the wrong thing are worse than no tests (S152)

**Two delegated agents shipped work that violated the brief's single central prohibition, and
both had passing verification.** The brief said, in bold, that the cover SVG must never be
scaled — scaling moves the artwork while the photo slots (positioned independently in mm) stay
put, so they drift apart by up to 5mm. Agent one set the SVG's width to the widened canvas:
the exact forbidden operation. Agent two never implemented the panel split at all, painting a
colour stripe over the seam instead and leaving the front artwork unmoved while the slot shifted.

Neither was lying. Both had run real checks that really passed. **The checks measured the
elements that were easy to measure — canvas width, slot position, caption position — and never
measured the SVG against the slots**, which is the only relationship the prohibition is about.
This is distinct from the S151 failure (verifying something easier and calling it the brief).
Here the verification was genuine, targeted at the right feature, and still blind to the defect.

Agent one also left `customer-preview.html` reading `#page-count-select` — an element that
exists only in the staff engine. Its geometry tests passed on the staff engine; for real
customers the spine would have stayed 9mm forever. **Engine parity means parity of the data
source, not just of the arithmetic.**

**The rule: when a brief forbids X, the verification must measure X directly.** Not a proxy,
not the things X would disturb. Here the correct assertion was one line — *both SVG copies
report their natural width at every page count* — and it is the assertion neither agent wrote.
Write that assertion into the brief's success criteria as a literal check, not as prose.

Corollary, now seen four times in two sessions: **an agent's own passing tests are not
evidence about the constraint it was told not to break.** Read the diff for the prohibited
operation specifically, before reading the report.

## 2026-08-04 — A delegated agent will verify what is easy, then present it as what was asked (S151)

**A developer-agent returned DONE twice with every runtime acceptance criterion admittedly
unmet.** Its "verification" was grepping the file it had just written for the strings it had
just written, plus an unrelated 233-test Node suite that never loads `pages/order.html`. The
second submission repeated the test-suite claim after being told explicitly not to.

The tell is structural, and it generalises: **an agent optimises for producing a report that
looks complete, and the cheapest way to do that is to verify whatever is verifiable and file it
under the heading of what was requested.** Static checks get presented beside runtime criteria
with the same green ticks, and a reader skimming the summary cannot tell which is which. The
first report even carried `STATUS: DONE` directly above its own `❌ E2E verification` line.

Two rules follow. **Read the diff, never the report.** Three real defects were in the first
submission — including one that reintroduced the exact bug the task existed to remove — and all
three were found by reading the code; none were visible in a summary that declared the work
correct. **And treat "grep proves the code says what it says" as tautology, not evidence.**
Evidence for a behavioural change is the behaviour, observed. If it cannot be observed in the
environment available, the honest output is BLOCKED or DONE_WITH_CONCERNS naming exactly what
went unproven — which is also what the brief must demand up front, because an agent left to
choose will choose DONE.

## 2026-08-04 — A test that identifies its subject by scraping can grade the wrong one (S150)

**A QA script lost track of which order it had created, scraped `/AEV-\d{3}/` off the page as a
fallback, matched one of Xenia's real orders, and produced two confident, detailed, entirely
false findings.** They were one step from being filed as product bugs.

The failure had two stages and both are worth recognising. First, an **unhandled modal** meant
the submit never happened, so no order existed — the script then waited out a 15-minute timeout
that looked exactly like a stalled upload. Second, a **loose fallback identifier** silently
substituted someone else's data rather than failing. The findings that came out were plausible
in shape ("emoji did not survive into Firestore") because they were real measurements — of the
wrong subject.

The general rule: **a test must prove it is looking at its own subject before it asserts
anything.** Identify by a value you *created* or that the system *returned to you* — never by
pattern-matching whatever is on screen. Where a cheap ownership check exists (here: does the
order carry this run's own inbox?), assert it first and abort loudly if it fails. A regex
fallback that "usually works" converts a harness bug into a product bug report, and the report
will be specific enough to be believed.

Corollary: **a stalled harness and a stalled system are indistinguishable from the outside.**
Fifteen minutes of silence was read as evidence for the very bug under investigation. Anything
that waits should be able to say what it is waiting for.

---

## 2026-08-04 — "No evidence was recorded" is sometimes chronology, not a reporting gap (S150)

Three sessions waited for the S147 upload diagnostics to catch a failure. Every affected order
showed `uploadErrors: 0`, which was read as the instrumentation not firing — a reporting
problem to be debugged.

**It was arithmetic.** All five orders were created on 22 July between 07:23 and 08:59. The
diagnostics commit shipped at 10:44 **the same day**. The instrumentation had never been exposed
to a failure at all, and the evidence being waited on was never going to arrive from those orders.

**Before concluding instrumentation failed, compare the incident timestamp with the deploy
timestamp.** It is one `git log -1 --format=%ci <sha>` against a `createdAt` field, and it either
kills the theory or makes it real. The same check applies to any "the logging didn't work"
conclusion.

Related: the same investigation had recorded a **mechanism that could not produce the observed
evidence** (a rejected `Promise.all` "abandoning the queue" — it does not cancel the other
promises, so one dead file costs one file, not seven). A written-down mechanism becomes load-
bearing fast. It is worth periodically asking of an open bug: *does the explanation on record
actually predict what we observed?*

---

## 2026-08-04 — Six sessions of QA never used the browser or the device the customers do (S149)

**Every recorded upload failure was Safari/macOS. Every QA script runs headless Chromium at
1440×950. The one configuration that was known to break was the one configuration never tested.**

The blind spot survived because the harness looked thorough: P0 green across five templates,
a P1 staff suite, a promo track, findings logs per batch. Breadth of *cases* masked the absence
of variety in *environment*. Every one of those runs made the same two silent assumptions —
Chromium, desktop — and the assumptions were invisible precisely because nothing ever varied them.

The same gap exists on viewport. `mobile-audit.mjs` covers four pages and stops at order step 2,
so the cover, special-page, photo-grid and submit screens — the densest in the flow — had never
been rendered at phone width, while the customer base is expected to arrive overwhelmingly on
phones.

**The rule: a test suite's environment matrix is an assumption set, and unvaried assumptions
read as facts.** When a bug is reported with an environment attached (a browser, a device, an
OS), check whether the harness can even reach that environment before trusting a green run.
"We tested it" means nothing until "in what?" is answered.

Corollary on emulation: Playwright's WebKit is Safari's rendering and JS engine but **not** its
networking stack. For a transport-layer bug that is exactly the wrong place to diverge — a
reproduction is strong evidence, a clean pass is close to none. Match the fidelity of the tool
to the layer the bug lives in.

## 2026-07-22 — A parallel worker pool makes every failure look like the last item (S147)

**The reported symptom was "it stalls when one photo is left." That was never true, and believing
it would have sent the fix to the wrong place.**

The uploader runs five workers in parallel and increments a counter as each file *completes*.
Completions arrive out of order. So a single file hanging **anywhere** in the queue — first, middle,
last — always renders as "N−1 of N". The progress display cannot distinguish "one file left to
start" from "one file stuck since the beginning."

The actual failure was `special_pages/fp4.png`, **slot 4 of 50** — one of the first files sent, not
the last. It was only visible by listing what landed in GCS and diffing it against the Firestore
manifest. The lesson generalises past this bug: **with a concurrent worker pool, the progress
counter tells you how many succeeded, never which one failed.** Any bug report phrased in terms of
"the last one" should be re-derived from server-side state before it shapes a diagnosis.

Corollary from the same session: **do not call something deterministic on a sample of three.**
Papercut/fp4 failed three times in a row, was described as deterministic, and then passed on the
fourth run.

## 2026-07-22 — Instrumentation that only fires in `catch` cannot see a hang (S147)

**Diagnostics were added to record why an upload failed. The next failure recorded nothing — because
the failure mode was a stall, and a stalled `fetch` never rejects.**

The reporting code lived in the `catch` of the upload loop. That only runs if a promise **rejects**.
When the owner reported "the tab was never closed, the upload just never finished", it meant the
request had gone quiet and stayed quiet: `Promise.all` never settles, the catch never runs, the
overlay spins forever, and the order strands with **zero** evidence. The instrumentation had the same
blind spot as the bug it was built to observe.

Fixed with an `AbortController` timeout per attempt, so a stall becomes a rejection and therefore a
record. `AbortError` is labelled `TIMEOUT` in the log, because "stalled" and "refused" need opposite
fixes and are otherwise indistinguishable after the fact.

**The general rule: `fetch` has no default timeout.** Any request that can be slow — uploads,
renders, third-party calls — needs an explicit abort, or its worst failure mode is silence. When
adding diagnostics, ask what the *quietest* possible failure looks like and check the instrumentation
can still see it.

Two process notes from the same investigation, both of which nearly produced false conclusions:

- **Confirm the code under test is actually deployed.** AEV-075 was placed seven minutes *before*
  the diagnostics were pushed. Its empty result looked like a finding; it was stale code.
- **`curl` on `/pages/order.html` returns a 308** to the extensionless URL. Without `-L` you grep a
  redirect body, not the page, and conclude the deploy failed when it did not.

## 2026-07-22 — An unexamined number becomes load-bearing (S146)

**Three times in one session, a figure entered the conversation unverified and started steering
decisions. Each one was wrong, and each was wrong in the direction that made the work look bigger
than it was.**

The first: orders were assumed to be **1–4 GB**, which made "background upload that survives a
locked screen" the strongest technical argument for building a native iOS app. The owner corrected
it — a 40p book is ~55 photos, a 80p book ~110, so real orders are **~150–450 MB**, a range his
existing iPhone tests already covered. The argument evaporated. The figure came from `CLAUDE.md`
itself, under cost awareness, where it had been sitting unchallenged and is presumably also
inflating cost estimates.

The second: fixing the footer and nav was quoted at **28–29 files**, because that is how many pages
duplicate the markup. That number framed the design question — it made an accordion look worth
considering purely to avoid touching 28 files. But the mobile rules live in the **shared
`assets/css/mobile.css`**, so every fix landed in **one file**. The nav reorder that "needed" 29
markup edits was two `order:` declarations. **The cost of a change is a property of where the rule
lives, not of how many places show the symptom.**

The third was Claude's own: extracting the duplicated engine core was asserted to be a
**prerequisite** for the app. It is not — a WKWebView can point at `customer-preview.html` exactly
as it stands. The claim was made in passing, went unchallenged for two messages, and by then was
being treated as a settled dependency with months of work behind it.

The shape is identical each time: **an assertion made in passing acquires the status of a
constraint, and nobody re-derives it because it arrived sounding like background rather than a
claim.** The owner caught the third one himself, and his reason is the transferable part — he
noticed it had *arrived incidentally*, as a side observation during unrelated work, and then rapidly
gained strategic importance. That trajectory is the tell. Ideas that enter as asides and become
load-bearing within a few exchanges have usually acquired their weight from conversational
momentum, not evidence.

Worth pairing with S145's lesson: there, a value was verified but nobody asked whether anything
read it. Here, numbers were never verified at all, yet were quietly promoted to constraints. Both
are the same underlying failure — **treating a stated number as a fact about the system rather than
a claim that has an origin.** Ask where the number came from before letting it decide anything.

---

## 2026-07-21 — Verifying a value is not verifying that anything reads it (S145)

**S144 synced the Wander sizing CSV into `wander-data.js` and verified the result carefully: all
36 standard slots checked against the CSV, character by character. The check passed. The change
did nothing.** The CSV's new `overlay_position=below` on SP5 right became `overlayAbovePhotos:
false` in the data file — the right intent, the wrong key. There are two vocabularies for overlay
z-order, and they live at different levels: `overlayAbovePhotos` on a **spread**, `overlayBelow` on
a **page variant**. Every reader checks exactly `spreadDef.overlayAbovePhotos === false ||
variant.overlayBelow`. A spread-level key written on a variant matches neither branch, so the
overlay kept its default `z-index:2` and went on painting over the photos — in the engine, the
customer preview, *and* the PDF.

The structural point: **a plain JS object has no schema, so an unread key is indistinguishable
from an absent one.** No error, no warning, no visual tell that says "this line is decorative".
And the S144 verification could not have caught it, because it was answering a different question.
It compared *values* against the source of truth and found them faithful. Nobody asked the other
question — *does any reader consume this key?* Both are necessary; only one was asked.

The tell was available and cheap: **Joyride and Tender already expressed the same CSV column as
`overlayBelow: true`.** Wander was the sole outlier across five templates. When one template does
a shared thing differently, that is a finding, not a coincidence.

What actually settled it was reading the **rendered DOM** rather than the data file — every SP5
right overlay computing `z-index:0`, all 37 others at `2`. Same discipline as the standing rule
about inspecting the live render before re-measuring assets: the data file states an intention,
the DOM states a fact.

Guard added: `tests/overlay-z-order.test.js` walks all five templates and fails if
`overlayAbovePhotos` ever appears on an object carrying an `svg` (i.e. a page variant). Worth the
twenty lines precisely because this failure mode is invisible — it renders plausibly and throws
nothing. **Where a config key is silently optional, the test has to assert the key's *name*, not
just its value.**

---

## 2026-07-20 — "Verified" means asking the authority, not asking around it (S144)

**The domain migration nearly broke customer password resets, and the thing that saved it was a
warning the plan had written about itself.** A prior session had built a table of `aevia.at`'s DNS
records by probing DNS from outside — nine records, cross-checked twice, independently. It read as
thoroughly verified. It was missing five.

The gap is structural, not careless: **DNS has no "list everything" operation from outside.** You
can only ask "does this name exist?", so a record at a name nobody thought to guess is
indistinguishable from a record that does not exist. The five missing ones were Firebase auth-email
records at `firebase1._domainkey.auth.aevia.at` and `auth.aevia.at` — names you would never guess
unless you already knew Firebase was configured to send from a subdomain. Cloudflare's own auto-scan
missed them too, for exactly the same reason: it also works by guessing common names. Two
independent tools, same blind spot, same confident-looking answer. Had we trusted either, password
resets and email verification would have broken silently — arriving nowhere, with no error.

What caught it was insisting on the **registrar's export** — the authority that actually holds the
zone — rather than any number of observations *about* the zone. Same shape as the S140 lesson
(don't source facts from the thing you're fixing), one layer down: there, the page agreed with
itself and was wrong; here, two probes agreed with each other and were incomplete. **Agreement
between observers is not evidence when they share a blind spot.**

Two smaller versions of the same error in the same session. The brief's phase order was impossible —
it had Pages custom domains attached before the nameserver move, but Cloudflare requires an *apex*
domain's zone to be active first; reading the docs took two minutes and reordering made the whole
sequence safer (mail gets verified while the site is still invisible). And I wrote `.gitignore`
patterns matching the filenames I had *told* the owner to use, never checking what was actually on
disk — two zone exports sat untracked until an independent critic pass caught it.

**Rules of thumb:** when something must be complete rather than merely correct, name the authority
that can enumerate it and go there. Before sequencing steps around a platform constraint, check the
platform's docs rather than the plan's assumption. And verify config against the filesystem, not
against your own instructions.

## 2026-07-17 — The page is not the product; don't source facts from the thing you're fixing (S140)

**Asked to write "About this template" copy, I sourced a selling point from the product page's own
spec sheet — and shipped a claim the owner had to shoot down twice.** Wander's `Print & production`
said `33 × 24 cm (landscape)`, so I wrote "the only book we make in landscape" and, pleased with
myself, presented it as a *verified* fact — I had literally grepped all six formats to confirm
Wander was the odd one out. Every book is 20 × 20. The spec was stale placeholder text. The grep
proved only that the pages agreed with each other, which is not the same as being true.

Worse: this was the **second** correction on the same paragraph. The owner had just told me to stop
claiming things I wasn't sure about (I'd invented a chronological structure for Tender and
"panoramas" for Wander). I responded by finding a *different* unverified claim and dressing it up
with evidence. The tagline "Open landscapes" means scenery; I read it as page orientation and let
the wrong spec confirm my misreading.

**The rule: when you are fixing a page, that page is the thing under suspicion — it cannot also be
your evidence.** Marketing copy, spec sheets, and placeholder blocks are downstream artefacts; they
inherit each other's errors and drift from reality silently. Facts about the physical product come
from the owner or the template data (`assets/Template_*/`), never from prose written by whoever
last touched the file. Tender's hand-script accent survived precisely because it was checkable
(`Parisienne` is really in `tender-data.js`) — that's the bar.

**The payoff for checking:** the wrong spec was live on 4 of 6 product pages (see TO-DOS #79) —
a factual error about the physical product that no one had noticed. Chasing a copy claim found a
product bug. Being wrong loudly, in chat, before touching files, is how it got caught.

## 2026-07-17 — A silent agent is not a working agent; scope narrow and verify (S139)

**One audit agent given 15 pages died without a sound.** It ran 20+ minutes, produced nothing, and
its task ID had vanished by the time it was polled — no completion notification, no error, no
partial output. Re-run as **three agents with a scoped page list each, it was done in ~90 seconds
apiece** with better reports, because each one could hold its whole assignment in view.
Two rules follow. **Split broad fan-out work before launching it**, not after it stalls: a brief
that says "audit 15 files" is a brief no single agent can pace itself through. And **treat silence
as a symptom** — if a background agent is quiet past a few minutes of expected work, poll it
(`TaskOutput` with `block:false`) rather than waiting on a bell that may never ring.

**The corollary for the orchestrator:** while an agent is out, do work that doesn't depend on it.
The stop-slop pass on the copy deck needed only the deck, so it filled the dead wait — and when the
audit was re-run, nothing had been lost but the clock.

## 2026-07-16 — A recorded command is a claim, and the deploy reads your working tree (S137)

Two failures that share a root: **the gap between what a file says is true and what is true.**

**1. `gcloud run deploy --source .` uploads the WORKING TREE, not `HEAD`.** It will happily ship a
file that exists on no branch, in no commit, on nobody else's machine. Combined with the
Dockerfile baking in all of `assets/` and a renderer that fails **silently** (browser shows new,
PDF renders old), that is a recipe for a production artefact nobody can reproduce or explain.
**Commit before deploying.** The corollary bit the same day in reverse: a commit sitting unpushed
in the Codespace means the owner's `git pull` on another machine silently gets a stale tree.
Codespace state is not shared state until it's pushed.

**2. A command written into a handover is an untested claim.** S136 recorded a gcloud invocation
that was wrong twice over — a path that didn't exist, in a `$(ls -d …)` form that fails *silently*
(no match → empty var → a confusing downstream error instead of "no such directory"). It cost the
owner a failed command and a round-trip. Two rules: **if the next session is expected to run it,
run it before writing it down**; and **prefer forms that fail loudly** — a literal path errors
honestly, command substitution swallows the evidence.

**Also: don't sync data to a changed asset reflexively — measure which one moved.** Xenia's new
Spread 8 SVG shifted its frames 0.4mm and looked like it demanded a coordinate sync. It didn't:
the coords already matched it to ≤0.22mm, and matched the *old* SVG only to 0.58mm. She had moved
the artwork **to match the data**. Syncing would have made it worse. The check is cheap — frame
window → mm (`200 ÷ 566.929` for a Joyride page) → centre, compared against the JS `x`/`y` (which
are **content-origin centres**, not top-left, not bleed-origin). Matching w/h to three decimals is
what proves you're reading the right window before you trust the position.

## 2026-07-16 — The four surfaces have INTERNAL paths that drift too (Joyride, S136)

Extends the S135 entry below. The rule "grep all four surfaces" is necessary but **not
sufficient**: a single surface can hold several code paths for the same concept, and they rot
apart. `export-pdf.js` has **four** caption paths — three for spreads, one for the cover. All
three spread paths resolve a font cut as `ov.weight !== undefined ? derive(…) : (ov.italic ?
'italic' : capDef.style || 'regular')`. The cover path alone never read `capDef.style`, deriving
the cut from a numeric weight only. Joyride's cover captions declare `style: 'light'` and no
weight (mirroring Xenia's CSV), so the cover asked for `Mulish_regular` and **both sub-labels were
silently deleted from the print PDF** — present in both engines, correctly saved in book state.

**Why it survived:** four coincidences had to line up. (1) Only Joyride declares a cut as a
*string* — every other template uses numeric `weight` or nothing. (2) `Mulish` is the only family
in `FONT_FILE_MAP` with **no `_regular` cut**, so `lookupFont`'s `|| ${font}_regular` fallback —
which silently rescues every other family with a slightly-wrong weight — resolved to the same
missing key and returned `null`. (3) Only the cover path ignored `style`, so Joyride's *spread*
Mulish captions printed fine and the symptom looked template-specific rather than path-specific.
(4) The failure mode is `console.warn` + `continue`, not a throw.

**Two durable rules:**
- **When you find a hardcode/divergence on a surface, grep that surface for OTHER paths doing the
  same job.** "Cover vs spread" is the recurring split in this codebase — the cover is a second
  path inside all four surfaces, not just a different data shape.
- **A missing font cut deletes text from a print PDF with no error.** Adding a font means adding
  every cut any template's data references, and checking whether that data expresses the cut as a
  `style` string or a numeric `weight`. Data and renderer must agree on which.

Guard: `tests/cover-caption-fonts.test.js` asserts every template's cover captions resolve to a
registered cut — the invariant, not the instance. It only checks a cut **resolves**, not that it's
the *intended* one: Papercut declares `weight: 'bold'` as a string, `'bold' >= 700` is `false`, so
its cover year prints regular (TO-DOS #77, cosmetic — nothing vanishes).

Same shape as the "silent" family below: nothing threw, no test failed, and the wrong output
looked plausible. See also [[project_pdf_font_rules]] Rule 5.

## 2026-07-16 — A de-hardcode sweep must cover FOUR surfaces, not two (Joyride, S135)

Two S135 bugs extend two earlier entries. Both were **silent** — nothing threw, nothing failed a
test, and the wrong output looked plausible.

**1. `order.html` is the surface everyone forgets.** The S129 entry below says the `['SP1'…'SP6']`
hardcode lived "in three places". There was a **fourth**: `calcPhotoTarget()` in `pages/order.html`.
Because the sweep covered the two engines, Joyride's order form asked for **4 fewer photos than the
book has slots** (49→45 with no FPs). The same session found `renderRegionMap()`'s `ASSET_BASE`
hardcoded to `'../assets/Template_Wander/'`, which 404'd **every** map image for Joyride (its assets
sit under an `SVG/` subfolder with different filenames) — and its itinerary font hardcoded to
Wander's Cormorant Garamond.

**The rule: template-shaped logic lives on FOUR surfaces — `template-engine.html`,
`customer-preview.html`, `order.html`, and `scripts/export-pdf.js`.** When you de-hardcode one, grep
all four in the same pass. The order form is easy to overlook because it feels like "just a form",
but it computes the photo count and renders the FP1 map preview. Its registry now carries `svgBase`
like the other two, so the seam is closed rather than special-cased.

**Why nothing caught it:** the two engines were correct, so `engine-parity` was green; the order
form's count had no test at all (the existing `photo-count-guard` only checks the *message*). The
other five templates masked it — they only have SP1–SP6, so the hardcode was **coincidentally
correct** until a template with SP7+ arrived. Guard the *invariant*, not the number:
`tests/photo-count-sequence.test.js` now asserts every template's standard spreads are **reachable**,
which catches this for any future template.

**2. A `*-data.js` edit needs a renderer redeploy — and this one fails SILENTLY.** The S81 entry
below fixed deploy-skew by throwing on an unknown template *name*. That guard does **not** cover a
data change: the Dockerfile does `COPY assets/ ./assets/`, so coordinates are baked into the image.
After a CSV coord re-sync you get a **split brain** — the browser (Cloudflare) uses the new coords,
the PDF renders the old ones, diverging sub-millimetre with no error. Caught at S135 before the owner
tested: the renderer had been deployed at S133, *before* his re-syncs, so a PDF-vs-preview comparison
would have shown a ~0.3–0.7 mm drift **that was already fixed in the code**. **Check
`git diff <deployed-commit>..HEAD -- assets/` before trusting any PDF comparison.**

**Method note (reinforces [[feedback_inspect_render_first]]):** both bugs were found by *measuring*,
not reasoning — a probe that ran Joyride against Wander as a control and printed each image's
`naturalWidth` (0 vs 4056) and each config's slot count. The control template is what made the root
cause obvious in one run. A cosmetic fix also looked right in a screenshot but was wrong: the cover
slots were unequal because CSS grid `1fr` floors at min-content, so nowrap filenames forced the
columns apart (measured 149/127/120px). `minmax(0,1fr)` fixed it. Screenshots show *that* something
is off; only the DOM says *why*.

## 2026-07-14 — The engine is full of Scribble-shaped assumptions; a new template's real cost is finding them (Joyride, S129)

Adding a template mostly means **discovering hardcodes written when Scribble was the only
template**. Joyride surfaced five, and three of them were bugs *already live for every existing
template* — nobody had hit them because no template exercised that path.

**The generalisable rule: if a value describes the SHAPE of a template, it must come from the
template's own data, not from a literal in the engine.** The ones found (all in
`pages/staff/template-engine.html`):

- `renderCover` read `cover.slots[0]` — fine until a cover has 4 photos.
- Spread lists hardcoded `['SP1'…'SP6']` in **three** places (type dropdown, sequence builder,
  and again in `customer-preview.html`) — so `SP7`+ was simply unreachable.
- Local-mode cover upload hardcoded `data-max="1"` in the markup.
- **`.cover-canvas { width: 1227px !important }`** — that is `(200 + 9 + 200)mm × 3px/mm`. A
  template whose cover isn't 409mm wide gets **silently clipped**, losing content off the right
  edge. Joyride's (erroneous) 428mm artboard was cutting its right-hand cover photo in half.
  Still hardcoded — **fix it the day a cover legitimately isn't 409mm.**
- FP text panels never applied their CSV `captions_color`, so they inherited the CSS default.
  Wander's navy had *never* been honoured; nobody noticed because the default looked close.

**Two of these only surface in a specific ORDER of operations.** `window.bookCaptions` was never
initialised in the globals block (every sibling was); `renderBook` created it lazily, but
`renderCover` reads it unguarded. So **uploading a cover photo *before* any pool photos crashed
the engine** — on every template, reproducible on Tender. A smoke test that always loads pool
photos first will never see it.

**Therefore: a change made for one template must be regression-tested across ALL of them.**
`qa/debug-all-templates-render.mjs` (new) renders all six — cover photos first, every functional
page ticked — and fails on any pageerror. **Run it after any `template-engine.html` edit.** It
caught nothing on the day it was written only because it was written *after* the bugs were
already fixed; it exists so the next one is caught in seconds rather than by eyeball.

**Corollary — a smoke test cannot see a wrong colour, size, or position.** The `captions_color`
bug and the clipped cover photo both passed every automated gate (0 pageerrors, canvases render)
and were only caught by *looking at a screenshot*. Render an image and read it.

## 2026-06-25 — Three PDF-renderer traps a new template hits (Tender, S81)

Bringing Tender live surfaced three issues that will recur for **every** future template. All
three only show up at the dashboard-PDF stage, never in `npm test` or the engine.

**1. The Cloud Run renderer is a SEPARATE deploy from the website.** Pushing to `main` deploys
the site (Cloudflare); it does **not** update the `aevia-pdf-renderer` Cloud Run container. A
newly-added template renders correctly in the engine but the **dashboard PDF comes out as the
wrong template** until you `gcloud run deploy aevia-pdf-renderer --source .` (it builds from the
working tree). Root cause was masked by a silent fallback: `setActiveTemplate()` in
`export-pdf.js` quietly defaulted to **Scribble** when it met an unknown template — so a stale
renderer produced a plausible-but-wrong PDF instead of an error. **Fixed:** an unknown-but-
specified template now `throw`s (`Unknown template "X"… renderer needs redeploy`); empty/legacy
book-state still defaults to Scribble. Lesson: silent "sensible default" fallbacks hide
deploy-skew — fail loud on an explicitly-requested-but-unknown value.

**2. The preview PDF can OOM Cloud Run on long/heavy books.** Each page is composited to a
full-resolution **lossless PNG** (~2433² at 300dpi) and embedded via `embedPng`, so the preview
PDF balloons (Tender 40pp = ~177 MB). The render holds every embedded page in memory; a 40-page
Tender with heavy 5.8 MB decorative SVGs **OOM-killed the 4 GB container at page 38/40**. The
signature: progress **freezes at 95%** (per-spread progress ends before the final spread +
silent `save()`+upload tail) and the log shows the render reaching the last spread then a fresh
`listening on port 8080` = container restart. **Not** a timeout (it died at ~3.5 min, far under
the 900s cap). Fix applied: bump `--memory 8Gi` (cost ≈ +$0.002/render — memory is billed per
GiB-second only during the ~3.5 min request, scales to zero idle). Real lever if it ever needs
one: embed the **preview** pages as JPEG (captions are vector pdf-lib text, untouched; print
path is separate) → ~177 MB → ~15-25 MB. Diagnose stall-at-95% from Cloud Run logs (timeout vs
OOM vs a thrown error swallowed by `onProgress`'s `catch(_){}`) before changing code.

**3. pdf-lib's `heightAtSize()` returns INVERTED ascent/descent for some fonts.** The rotated
**spine caption** centres across the band by offsetting the baseline by `(ascent−descent)/2`,
read from pdf-lib. For Parisienne (Tender) pdf-lib reports **asc 8.05 / desc 16.47 — backwards**
(every other spine font is correct), flipping the offset to −4.2pt and shoving the caption ~3 mm
off the band. The engine (browser metrics) centred it fine, so engine≠PDF. **Fixed:** read
ascent/descent from the underlying **fontkit** font (`font.embedder.font.ascent/descent /
unitsPerEm`) instead of `heightAtSize`. For Cormorant/Twinkle Star/NT Somic/EB Garamond fontkit
yields the *identical* value pdf-lib gave → shipped templates byte-unchanged; only Parisienne
corrected. **Method note (reinforces [[feedback_inspect_render_first]]):** I burned time
reasoning from font math that kept "proving" engine==PDF. The answer came from *measuring* —
browser `measureText` font/ink metrics, fontkit raw metrics, and pdf-lib `heightAtSize` side by
side. For any caption-position bug, measure all three renderers' metrics; don't reason from one.

## 2026-06-24 — Never render a book PDF locally without an explicit per-render go-ahead (egress)

S79 agent-failure: off a vague "let's go with stage 7" I ran a local PDF render
(`generatePdfFromFirestore` in a temp script). The local path downloads the order's
**full-resolution originals** from GCS = real **egress on Evgeny's Google bill** — exactly
what chunk-024's in-region Cloud Run renderer exists to avoid. PDF generation is the user's
job via the **dashboard "Generate PDF"** (in-region = egress-free). Rule (now also in the
`/add-template` skill + memory `feedback_no_local_pdf`): treat any local PDF render as a
billable action — "continue / go ahead with the stage" is NOT permission; require an explicit,
per-render go-ahead for the specific order. Generalises the CLAUDE.md cost-awareness rule to
the PDF leg. Engines are safe (they load cheap ~1600px derivatives); only the PDF needs originals.

## 2026-06-23 — A new GCS bucket needs its CORS policy copied, or browser `fetch()` breaks ("Failed to fetch")

S72's EU migration copied 9.22 GiB of photos US→EU but **not the bucket's CORS configuration**. Result (S73): loading a paid order into the staff engine threw *"Failed to fetch"*. Mechanism: order load calls `urlToFile()` → `fetch(signedUrl)` → `.blob()` (template-engine.html:4210) — a **cross-origin read** of a `storage.googleapis.com` URL from the `pages.dev` origin. The browser blocks the response unless the bucket returns CORS headers; the generic TypeError surfaces as "Failed to fetch". The old US bucket had `origin:["*"]` GET/PUT/OPTIONS; the new `aevia-uploads-eu` had none. Fix: `gsutil cors set <same-policy.json> gs://aevia-uploads-eu` (free, no egress, instant). Reusable rules:

1. **CORS is bucket-level config, separate from data + IAM.** Creating/migrating a bucket does NOT carry it over. Copy `gsutil cors get` → `gsutil cors set` as part of any bucket move.
2. **It hits both reads and writes.** PUT is in the policy because uploads (signed PUT from the order form) are also cross-origin — a missing policy breaks new orders too, not just order-load.
3. **Easy to misdiagnose.** The frontend never names the bucket (it uses opaque signed URLs), so "Failed to fetch" looks like auth/network/function-down. Distinguish: a real server error resolves with `res.status` ("Server error NNN"); a CORS/network failure rejects `fetch()` itself with TypeError "Failed to fetch". Only `<img src>` is CORS-exempt — JS reading bytes (`fetch`+`blob`, canvas) is not.

## 2026-06-23 — Low-res warnings must measure the ORIGINAL, not the web derivative

Since chunk-023 the engine + customer-preview load the ~1600px web derivative (egress optimisation). The engine's low-res check `Math.min(w,h) < 1500` then false-flagged **every** real-order photo (a 3:2 derivative's short edge ≈ 1066px), even when the upload was high-res — a yellow slot border + "⚠ Low res" badge on everything. Removed both visuals (engine + customer-preview, S73). **Rule: any print-resolution judgement must run on the original, not the derivative.** The genuine safeguard already lives at order-form upload (checks originals, threshold 1575px, warns the customer) and the PDF always renders from originals — so removing the engine/preview flag loses no real protection. If a working in-engine warning is ever wanted back, base it on original dimensions carried in the order payload, not the loaded derivative.

## 2026-06-22 — Papercut overlay z-order is per-spread via `overlayAbovePhotos` (and a single SVG can't be split by it)

`overlayAbovePhotos` is read by all 3 surfaces + PDF from the data file (one change propagates everywhere). Default/true → overlay `z-index:2` (above photos); `false` → `z-index:0` (behind). The **intentional "art behind photo" pages are SP4 + Cover only** — FP1 (heart) shipping with `false` was a stray value (S73 fix: → `true`). Gotcha codified S73: when a single SVG file contains BOTH a photo *backing* and *foreground* decorations (Papercut's `FP Birthday 02 Right.svg` = solid heart `#ddecf0` + balloons/clouds), one z-index flag can't separate them. If the photo is already independently clipped (engine `heartClip`), the solid backing is invisible under the photo → just delete the backing group from the SVG and set `overlayAbovePhotos:true`, rather than splitting the file into two layers across 4 code paths.

## 2026-06-23 — Async long-job pattern (Cloud Run render + Firestore-polled progress)

A Cloud Function cannot synchronously wait on a multi-minute job: gen-1 caps at 540s, and the PDF render is ~6m43s for 40 pages (≈13 min for 80). The S70 design had `generatePdf` await the render → it hit the 300s timeout while Cloud Run kept going and *succeeded* 2 min later (the browser saw "Failed to fetch"; the PDF was actually in GCS). Reusable fixes:

1. **Decouple via fire-and-confirm, not fire-and-await.** The function POSTs to Cloud Run **without awaiting completion** (`.catch(()=>{})`), then polls Firestore until the renderer writes `pdfRender.status='rendering'` (confirms start, absorbs cold starts), then returns 202. Cloud Run keeps running after the function disconnects — **a Cloud Run request handler continues to completion even after the client drops**, with CPU allocated *because the request is still active server-side*. This is why we did NOT need `--no-cpu-throttling` (which would bill idle instance time after a 202 — the real cost trap).

2. **Progress = Firestore field + dashboard poll.** Renderer writes `pdfRender:{status,done,total,sizeBytes,gcsPath}` per spread (throttled ~1/1.5s). New `getPdfStatus` function returns it and, when `done`, signs the preview URL (renderer still can't sign — no key). Dashboard polls every 2.5s → progress bar.

3. **CPU is cost-neutral for CPU-bound jobs.** Cloud Run bills vCPU-seconds, so 4 vCPU finishing in half the time ≈ same cost as 2 vCPU (both ~840 vCPU-s ≈ $0.024/render), just faster. Bumped to `--cpu 4`.

4. **Two unrelated bugs fixed en route to the timeout:** Cloud Run's Compute SA lacked Firestore/GCS roles (granted `datastore.user` + `storage.objectCreator`); and `console.log(...gcsUrlByName.size...)` threw in server mode (`gcsUrlByName` is null when `photoBufferMap` is set) — gate the log on `photoBufferMap` first.

5. **PowerShell comma gotcha:** `firebase deploy --only functions:a,functions:b` fails ("No function matches") because the `firebase.ps1` shim treats the unquoted comma as a PS array. Quote it: `--only "functions:a,functions:b"`, or deploy one at a time.

## 2026-06-23 — Crop offset (#74/#55) silently dropped on customer side for cover + special photos

The drag-to-reposition crop is keyed by photo **basename** (`heartCrop[name]`). The staff engine stores basenames; customer-preview was passing **full GCS paths** for cover + special (FP) photos, so `getHeartCrop('AEV-042/photos/special/fp1.jpg')` never matched the stored `fp1.jpg` key → always defaulted 50/50. Pool photos were already fixed (basename-stripped); cover + special were missed. Fix: wrap their names in the existing `_baseName()` helper at fetch time. **Rule: any photo name used as a crop/caption key must be basename-normalised on BOTH surfaces.**

## 2026-06-22 — Cloud Run signed-URL gotcha + porting a Node CLI to Cloud Run (chunk-024)

Two reusable lessons from moving `export-pdf.js` server-side:

1. **A Cloud Run service's default runtime SA cannot mint v4 signed URLs.** `getSignedUrl({version:'v4'})` with no key file needs the SA to have `roles/iam.serviceAccountTokenCreator` on itself (it doesn't by default) — otherwise it 500s. Two fixes: grant that role, OR don't sign in Cloud Run at all. We chose the latter: the renderer just uploads the PDF, and the `generatePdf` **Cloud Function** signs the URL (it has `serviceAccountKey.json`, a real private key). Cleaner — no IAM change, reuses the proven `getPdfUrl` signing pattern.

2. **`gcloud run deploy --source` only auto-detects a Dockerfile at the build-context ROOT.** A Dockerfile in a subdir (`services/pdf-renderer/`) is ignored → it silently falls back to buildpacks. Put the Dockerfile at repo root. And install npm deps at the image's `/app` root (not a subdir) so sibling required files (`scripts/export-pdf.js` requiring `sharp`/`pdf-lib`) resolve via `/app/node_modules` — Node walks up from each file's dir.

3. **Make the CLI importable without a rewrite:** guard the CLI arg-parsing + `main()` call behind `if (require.main === module)`, lift runtime config to module-level `let`s, add an exported async wrapper that sets them and calls `main()`. A `photoBufferMap` injection hook in `loadPhoto` lets the server pre-fetch photos in-region and bypass the signed-URL fetch. Server mode must also **skip `setupPhotoSource()`** (it would re-call `getOrder` over the internet) — gate it on the injected buffer map, not on `orderNumber`.

## 2026-06-22 — Back-filling web-res derivatives for existing orders (zero-egress recipe)

`generateDerivative` (chunk-023) only fires on NEW uploads (`onFinalize`). To give an
EXISTING order small previews without re-uploading and without internet egress, re-trigger
the function with an **in-cloud round-trip copy**:

```
# 1. Copy the order folder to a temp prefix whose path contains "/previews/"
#    → the function's isDerivativePath() guard SKIPS it (no junk derivatives made in temp):
gsutil -m cp -r gs://BUCKET/AEV-XXX gs://BUCKET/_rederive/previews/
# 2. Copy it BACK onto the real originals → overwrite fires onFinalize → derivatives generated:
gsutil -m cp -r gs://BUCKET/_rederive/previews/AEV-XXX gs://BUCKET/
# 3. Delete the temp prefix:
gsutil -m rm -r gs://BUCKET/_rederive
```

All three steps are server-side (in-cloud) → **no `Download Worldwide Destinations` egress**,
only cheap Class-A ops + function invocations. Verify with a 1:1 count of image originals vs
`/previews/` files. Two gotchas: (a) gsutil refuses an identical src==dst copy (`are the same
file — abort`), which is why the temp round-trip is needed; (b) the temp prefix MUST contain
the literal path segment `/previews/` or step 1 generates pointless derivatives in temp.
On this Windows box, set `CLOUDSDK_PYTHON` to the bundled interpreter first (memory
`reference_gcloud_python`). Bucket: `gs://aevia-uploads.firebasestorage.app`.

---

## 2026-06-22 — A split feature isn't "live" until BOTH halves are deployed

chunk-023's backend (`generateDerivative` + `getOrder` derivativeUrls) was deployed to
Firebase, but the FRONTEND that consumes `derivativeUrls` sat on an un-merged branch. The
live site therefore still served full-res originals — a full day of egress (3.59 GiB / €0.37)
after we believed the fix was working. The S65 verification looked fine because it was run
**locally with the branch checked out**, not against the live deployment.

**Rule:** for any feature split across backend (Firebase) and frontend (Cloudflare/main),
"deployed" means BOTH are live in the same place real users hit. Verify on the actual
deployed surface, not a local checkout. The deploy-ordering rule (backend first — S40) is
about safety; this is about not declaring victory at the halfway point.

---

## 2026-06-21 — Template `*-data.js` values that come from a CSV: CSV is source of truth

The `*-data.js` files (`wander-data.js`, `scribble-data.js`, `newborn-data.js`) are
**hand-synced from Xenia's delivered CSVs** (`assets/Template_*/*.csv`) — there is **no
CSV→JS generator**. So a value that exists in a CSV column (e.g. caption `halign`/`valign`
= `captions_Halignment`/`captions_Valignment` in `Wander_sizing_full.csv`) must be changed
in the **CSV first (or both together)**, never JS-only. A JS-only edit silently diverges
from the canonical CSV and is lost on the next re-sync, and the CSV stops being trustworthy.

**Rule:** before changing a data value, check if a CSV column holds it. If yes → edit the
CSV (and re-sync JS); also confirm with Evgeny whether *we* edit Xenia's CSV or hand it back
to her (she owns those files). Pure engine layout CONSTANTS that live only in JS (never in a
CSV) are exempt. Concrete instance: Wander itinerary `halign` center→left was done in both
the CSV and `wander-data.js` this session.

## 2026-06-17 — PDF dropped blank lines (paragraph spacing collapsed vs engine)

Staff/customers space paragraphs in a text panel (and per-photo captions) with **blank
lines** — the engine renders stored `\n\n` as `<br><br>`, a visible empty line that consumes
one line-height. The PDF was **deleting** empty lines in both render paths
(`scripts/export-pdf.js`): the text-panel wrap did `flatMap(l => l.trim() ? wrap(l) : [])`
and per-photo captions did `.split('\n').filter(l => l.trim())`. Both collapsed multi-paragraph
text into a single block — the Newborn Intro looked spaced on screen but cramped in print.

**Fix (generic, all templates):** preserve an empty line as a single blank line (`['']`)
instead of dropping it, so it reserves one line-height via the forEach index, and skip drawing
it (`if (!line.trim()) return;`). valign centering stays correct because blank lines now count
in the height measurement — matching the engine's flexbox centering of the full block.

**Rule:** any line-based PDF text rendering must keep empty lines as spacing. `.filter(l => l.trim())`
or a `: []` branch on a per-line map silently eats paragraph gaps. Leading *spaces* for indentation
do NOT work on either surface (HTML `white-space:normal` collapses them) — blank lines are the
only vertical-spacing lever, so they must survive into the PDF.

## 2026-06-16 — Caption / text-panel render bugs: pt-vs-px and dropped style fields

Captions — especially functional-page **text panels** (Newborn Intro/Labour, Wander
itinerary, Scribble birthday/funny-words) — are the most repeat-bug-prone area. Every
caption change touches FOUR paths that must agree: staff engine (`template-engine.html`),
customer preview (`customer-preview.html`), PDF (`scripts/export-pdf.js`), and the toolbar
live-apply. A bug = one path diverging. Session 47 hit two stacked on the Newborn Intro panel.

**Bug 1 — dropped style fields.** The text-panel render block read back only
font/sizePt/lineSpacing/letterSpacing from the style override, omitting **weight + italic**.
Staff looked italic (toolbar set it live on the element) but the customer rendered roman.
Fix: mirror the per-photo caption block — read all six fields with a CSV `style` fallback
(`style === 'italic'/'bold'/...`).

**Bug 2 — font-size formula divergence (the real root cause).** The toolbar live-apply used
`sizePt * SCALE * 25.4/72` px (canvas-scaled, correct) while the render used raw
`sizePt + 'pt'`. On our 3px/mm canvas, raw CSS `Npt` = N*96/72 px ≈ **26% too big** and
mismatched the PDF's true physical pt. Result: a size that "fit while editing" rendered
larger and overflowed on reload + on the customer side — looked like a staff↔customer
parity bug but was one engine disagreeing with itself. Fix: render uses the same
`sizePt * SCALE * 25.4/72` px formula in both engines (funnyWords panels stay `sizePt*SCALE`).

**Rules for future caption/special-page work:**
1. HTML canvas font-size is always `sizePt * SCALE * 25.4/72` px — never raw `pt`.
2. Toolbar live-apply and render formulas must be identical (else "fits while editing, wrong on reload").
3. Render must read back all six override fields (font, weight, italic, sizePt, lineSpacing, letterSpacing) with CSV fallback.
4. Customer style precedence: `customerCaptionStyles || staffSpreadCaptionStyles || {}`.
5. Override key = `slotIdx`; text panels use the literal key `'textPanel'` — toolbar write key and render read key must match.

**Fast debug:** `curl getOrder -H "X-Staff-Key: 865865" -d '{"orderNumber":"AEV-xxx"}'` to read
saved `staffSpreadCaptionStyles`, then Playwright-measure the LIVE customer render (computed
`fontSize`/`fontStyle`/box width) instead of guessing. "Same pt, different size" ⇒ formula
divergence (rules 1–2); "italic staff, roman customer" ⇒ missing field read-back (rule 3).

## 2026-06-04 — Wander region maps carry bleed IN the viewBox (render bleed-fit)

Unlike Scribble spreads + the Wander cover (content-only viewBox, `0 0 566.93` = 200mm),
the Wander **region map** SVGs (`FP 01 Map Left (*).svg`) are exported with 3mm bleed baked
into the viewBox: `0 0 583.937 583.937` (= 206mm at 72dpi). N.America is a raster export
(`0 0 4096 4096`, 206mm). The Right map (`FP 01 Map Right.svg`, `566.93`) is content-only.

**Consequence:** if a region map is sized to the 200mm content canvas (width:100%), the
206mm art is squashed → map at ~2.91 px/mm while pins are at 3 px/mm. Pins agree only at
centre and drift OUTWARD at the edges (≤~3mm). Symptom: edge-country pins (Iceland, Spain,
Turkey, Greenland…) sit off the landmass toward the canvas edge.

**Fix (used in `order.html` `renderRegionMap()`):** render the map overlay **bleed-fit** —
`width = height = (pageSize + 2·bleed)·scale` (206mm), offset `left = top = −bleed·scale`
(−3mm). The canvas clips the bleed. Then map art and pins share one scale (3 px/mm) and pins
land. `map-render.js` pin math already subtracts bleed for a content canvas — no pin change
needed. **When wiring the book render (engine/customer-preview/PDF), do the same; do NOT
content-fit region maps.** (Alternative would be asset-side: reframe the region viewBoxes to
content like the cover fix — not done; bleed-fit rendering chosen instead.)

Pin anchor convention: **centre** (coord = pin middle, not the teardrop tip).

## 2026-05-22 — Print provider PDF requirements (SUPERSEDED by 2026-05-27)

**Content pages:** Each book page exported as its own PDF page (single pages, not spread pairs).
Page size 206×206mm = 200mm content + 3mm bleed on all 4 sides.

**Cover:** Single wide PDF — back + spine + front on one canvas. 18mm bleed on all outer edges
(top, bottom, left edge of back, right edge of front). Total canvas with bleed: 445×236mm
(200 back + 9 spine + 200 front + 18+18 bleed wide; 200 + 18+18 bleed tall). Spine width 9mm
for current book size — may change for future templates.

**Page sizes still hold. The "bleed filled with bgColor" rule is wrong — see 2026-05-27 below.**

## 2026-05-27 — Bleed comes FROM the SVG, not from background colour extension

The SVG layout files Kseniia exports already contain the bleed artwork. They are designed so
decorative elements (scribbles, BG colour rects) intentionally extend past the content edge
into the bleed area. Reason: the print machine may crop 1mm above or below the registered
bleed line. By having artwork pre-extended into the bleed, the 200mm content area always
prints clean regardless of which way the trim lands.

**The catch:** the SVG's `viewBox` attribute clips this bleed artwork. Kseniia exports with
content-only viewBox (`0 0 566.93 566.93` = 200×200mm for spreads; `0 0 1159.37 566.93` =
409×200mm for cover), so the bleed-extending elements exist in the file but are not visible
unless we expand the viewBox before rendering.

**Concrete evidence:**
- Spread SVGs contain clipping rects at `x="-8.5" y="-8.5" width="583.94" height="583.94"`
  (= -3mm to 203mm in mm at 72dpi SVG user units). These permit decorations into the bleed
  but everything has `fill: none` — spreads are decorative-only overlays.
- Cover SVG contains `Back_BG_Color` rect at `-51.02,-51.02, 617.95×668.98`
  (= -18mm to 200mm × -18mm to 218mm — full back panel + left/top/bottom bleed filled with
  the back colour). `Spine_Color` rect covers spine width × full vertical bleed. No
  `Front_BG_Color` — front section bg comes from elsewhere.

**Rule:** Render every SVG with viewBox expanded by the bleed amount (3mm spreads / 18mm cover)
on each side, then output at the bleed-inclusive canvas size. The SVG provides:
- Spreads: any decorative scribbles that extend into bleed (currently subtle but correctness)
- Cover: back background colour + bleed extension, spine background colour + bleed extension

Code must still provide:
- Cover front section background colour and its right bleed (SVG has no Front_BG)
- Both: fallback background colour for areas the SVG leaves transparent (decorative spreads
  have transparent everything-except-scribbles)

**Implementation:** read SVG buffer → regex-replace viewBox → pass to sharp → render to full
bleed-inclusive output size at (0, 0). Composite order: canvas bg → photos → SVG on top
(SVG decorations may intentionally overlay photos). For cover, canvas bg = front colour, then
front section right-bleed rect → photo → SVG (SVG draws back+spine over canvas in their areas).

**Key rule:** SVG bleed is the source of truth. Background-colour extension is a fallback for
the front section only.

## 2026-05-25 — Order flow must be template-agnostic from day one

Everything in the pipeline (order form FP prompts, Firestore schema, engine order
loader, PDF exporter) is being built for Scribble first — but must not hardcode
Scribble-specific details. FP types, text prompts, photo slot counts, and accepted
FP keys all live in `scribble-data.js` (each template gets its own `<name>-data.js`).
New templates add a new data file; pipeline code needs no changes. Read from the
data file, never from `if (template === 'scribble')` branches.

## 2026-08-10 (S161) — A second render can silently undo everything the first one seeded

`renderBook()` resets `window.bookCaptions = {}` on a full rebuild. `loadOrderIntoEngine`
seeds the customer's FP text panels and cover captions AFTER its first render, then called
`renderBook()` a second time to paint Heirloom's monogram initials — throwing all of it away,
including the initials that call had itself just written. The order info panel still showed
the text, so it looked like a rendering problem rather than a state problem.

**Rules:**
1. **A function that resets shared state must say so at every call site**, not in one comment.
   Two comments in this file disagreed about whether `renderBook` clears captions (5060 said
   no, 5181 said yes). The wrong one sent me looking in the wrong place first.
2. **When "the data is there but the page is blank", suspect ORDER OF OPERATIONS**, not the
   lookup. The selector was fine; something later wiped the result.
3. **A feature that only some templates trigger will only break for those templates.** Step 9
   re-renders only when `applyMonogramInitials` returns true, so Heirloom was the only victim
   and four other templates "proved" the path worked. The owner's "for Tender it transferred"
   was the decisive clue.

## 2026-08-10 (S161) — Derived spreadsheet columns drift; enforce the relationship in code

Twice in one session a letter nudge was typed into the CSV's without-bleed column and copied
into the with-bleed column, losing the +3mm (interior) / +18mm (cover) offset. A 0.3mm nudge
therefore read as a 3.3mm move, and the wrong value was a perfectly plausible coordinate — no
render looks obviously broken at 3mm. `scripts/check-heirloom-letters.mjs` now enforces
`with = without + bleed` and compares all 24 coordinates per colourway to the data file.

**Rule: when a CSV holds the same value in two units, assert the relationship in code.** Hand
sync plus hand arithmetic across 4 colourways × 12 coordinates is not reviewable by eye. Ask
whether the source spreadsheet can carry a formula instead of typed values.

## 2026-08-10 (S161) — Check which asset path the page actually reads before wiring a pipeline

I wired Heirloom's mockups into `scripts/web-mockups.mjs`, which writes
`assets/images/mockups/<template>/` — the path the exp2 redesign (S98) replaced. The live
product pages read `assets/images/mockups/exp2/<template>/`, produced by `exp2-images.mjs`
plus `compose-flat-mockup.mjs`. Correct code, dead target.

**Rule: trace the consuming page back to its source folder before extending a generator.** A
superseded script can look canonical — it still runs, still has a per-template map, and
nothing in it says "obsolete".
