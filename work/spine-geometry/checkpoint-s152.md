# Checkpoint — Session 152 (spine geometry)

> **Superseded by `sessions/2026-08-05-s152.md`** (the full session log, written at handover).
> This file is the mid-session snapshot taken *before* implementation began; it records the
> decisions and the critic review. Read the session log first.

_2026-08-05. Parallel research/strategy session. **No product code changed, nothing committed.**
Written here rather than to `STATUS.md` / `sessions/` because another session was actively
writing those files during this conversation (it produced `sessions/2026-08-04-s151.md`,
`STATUS.md`, `TO-DOS.md`, `LEARNINGS.md` mid-session). Merge into the session log later._

---

## What this session produced

- `work/spine-geometry/brief.md` — brief for making cover spine width a function of page count.
- This checkpoint.
- Owner edits to three cover CSVs (spine caption X normalised to 204.5).

**Nothing else.** No engine, PDF or order-path code was touched.

---

## The problem

Spine is hardcoded **9mm** in every template. Printsmarter specified **10mm at 40pp, 14mm at 80pp**.
Because the cover is one flat sheet (back | spine | front), a wrong spine width also **shifts the
front artwork out of position** by the same amount. It fails silently — renders plausibly on
screen, wrong only in the printed book.

**Scope is the cover only.** Inside pages are individual 200×200mm pages; the spine is not part
of their geometry. (Owner corrected an earlier overreach on this — see Corrections below.)

---

## Decisions taken

**1. Coordinates become panel-relative, not absolute.** Discovered that cover CSV X values are
*already* panel centres — Scribble's front photo at `x=309` is exactly the centre of the front
panel (209–409). And the `Type` column already declares the panel (`Front page` / `Spine`).
So this is arithmetic in the loader, not a bulk edit.

**2. Cover CSVs declare the spine width they were drawn at** (`9` today). Runtime shift for
front-panel items = `actualSpine − referenceSpine`. Chosen over duplicating CSVs per book size
(10 hand-synced files, no generator, no drift test) and over baking in a magic `9`.

**3. Spine caption X is KEPT, reinterpreted as an offset from spine centre (default 0).**
Owner pushed back on removing it: different fonts at different sizes need visual centring.
Correct call — and it strengthens the case, because under the absolute scheme any hand-tuned
value silently breaks when spine width changes, and would need re-tuning per size.

**4. Xenia re-authors nothing.** Decided against per-size SVGs: it would need 2 cover SVGs,
2 clip paths and 2 `pxPerMm` values per template — and would **still** require the coordinate
shift, because slots are data, not artwork. Two-way door: if the render approach looks wrong in
Phase 1, re-authoring remains available.

**5. Pilot = Scribble then Tender.** Scribble proves the arithmetic (simplest cover, no clip
shape). Tender proves *registration* — its elliptical `coverFrame` is where a millimetre of
artwork/slot drift becomes visible.

---

## Facts established (verified against files, not assumed)

- **All four surfaces already read `pageCount`** — staff engine (9 refs), customer-preview (4),
  `export-pdf.js` (3), `services/pdf-renderer/index.js` (6). No new data has to flow anywhere.
- **`ORDER.pages`** is `'40'`/`'80'`, persisted as `pageCount` at `order.html:2385`.
- **Cover SVGs are authored as named panel groups**: `<g data-name="Back">`, `"Spine"`, `"Front"`,
  plus a `"LOGO"` group. Verified in Newborn; same naming in Tender and Papercut.
- **Artwork does not cross the spine.** Newborn's `Back BG Color` rect ends at `566.929` user
  units = **exactly 200.0mm** (viewBox `0 0 1159.37 566.929` over 409mm → 2.8346 units/mm).
- **Photo slots are positioned independently of the SVG** — absolutely-positioned divs sized from
  mm (`template-engine.html:1845-1858`); the SVG is an overlay `<img>`. So stretching the SVG
  would move artwork *without* moving the photo beneath it (up to 5mm drift at 80pp).
- **`clipShapes.coverFrame` exists in Newborn, Papercut and Tender only** — NOT Scribble.
- **All six cover SVGs are local.** `svgBase` is a relative path, not a URL. Scribble's lives at
  `assets/Template_Scribble/Spreads/Cover/Artboard 1.svg`.
- **CSV→`data.js` sync is MANUAL** for every template except Joyride (`scripts/sync-joyride-csv.mjs`).
  Editing a CSV alone changes nothing at runtime.

---

## Critic review — outcome

Ran `/critic-agent` on the brief. Verdict **NO-GO as written**. Roughly half its findings held.

**Valid, and must be fixed before implementation:**

1. 🔴 **Bleed is under-specified — the most important finding.** `scripts/export-pdf.js:1070`
   expands the cover SVG viewBox by 18mm *because Xenia drew the back and spine background
   colours out into the bleed area*. Confirmed: Newborn's `Back BG Color` rect starts at
   `x = -51.024` units = exactly −18mm. So the viewBox frames **content only** and artwork lives
   outside it on all four sides. Any panel split must carry 18mm of bleed on the OUTER edges
   while cutting cleanly at the spine boundary. This is the class of bug that broke Wander's
   cover before.
2. 🔴 **`clipShape` coordinate remapping is unaddressed.** Translating the front panel without
   remapping `coverFrame`'s path origin misregisters Tender's ellipse. The brief names the risk
   but does not do the maths.
3. 🟠 **Hardcoded `409`** at `scripts/export-pdf.js:978` (`COVER_CONTENT_W = 200 + 9 + 200`).
   There will be more — needs a sweep.
4. 🟠 **Browser/PDF divergence.** If the engines split panels and the PDF renderer does not,
   screen and print disagree silently. Worst failure mode for this product.

**Rejected (verified false):**

- "Cover SVGs aren't stored locally, could not inspect." — False; all six are local. This was the
  basis of several of its "unverified" caveats.
- Spine caption offset is "−18mm not 0" — misread the columns; `204.5` is already the
  without-bleed value (`222.5` is with-bleed). Offset is 0. *(Its underlying point stands: the
  brief should state which coordinate space offsets are in.)*
- "`clip-path` doesn't work reliably on `<img>`" — it does.
- "The engines aren't in the surfaces table" — they are.

**Lesson repeated:** an independent reviewer is strong at attacking a *stated* mechanism and
unreliable on facts it did not check. Same shape as the S150 Codex run. Verify every claim.

---

## Corrections made during the session

- Claimed Scribble's heart clip was the hardest cover case. Wrong twice: `clipShapes` is
  cover-only and Scribble has none. Owner caught it.
- Initially implied inside pages might be affected. They are not.
- Recommended removing spine caption X entirely. Owner overruled; he was right.

---

## Next steps

1. **Revise the brief** for the four valid critic findings — bleed handling, `coverFrame`
   remapping maths, positioning the named `Back`/`Spine`/`Front` groups instead of geometric
   clipping, and a hardcoded-constant sweep.
2. ~~Locate the `LOGO` group.~~ **CLOSED.** The spine carries nothing but CSV captions — owner:
   "we don't place our logo on the spine, never." Files agree: the `LOGO` path sits at
   x ≈ 108.8 user units ≈ 38mm, on the back panel.
3. **Papercut's `caption1` is still `204`** — the last one not normalised to 204.5.
4. **Then implement Phase 1** (Scribble → Tender), owner tests on the live rig.

---

## Open — needs Printsmarter

**Only one item is a real dependency**, and it is not blocking:

1. **Spine formula**, not two data points. 10mm/14mm fits `spine = 6 + 0.1 × pages` (≈0.2mm per
   leaf on 160gsm, 6mm boards + endpapers). Worth confirming; if wrong, only two constants move.

**Closed by the owner (S152) — do not reopen:** board overhang, hinge/joint gap and turn-in.
Samples were already printed with Elanders on exactly this geometry (200mm cover height, 18mm
bleed all round, panels butted), produced in Illustrator before the engine or PDF generator
existed, and came out correct. A cased hardcover cannot exist without a hinge and a kant, so the
printer's template already absorbs them — that is what the 18mm is for. **Spine is the only cover
dimension that varies with page count.**

_Claude had escalated these to blocking risks; that was an overcomplication. "Not written down in
the repo" was misread as "unknown". A printed sample is stronger evidence than a document._

Plus the assumption everything else rests on: **is Printsmarter the same production line, same
equipment and same API as Elanders**, or its own production? Recorded as unconfirmed since S148.

---

## Watch-outs

- 🔴 **A parallel session owns the working tree** — `pages/order.html` (stall detection),
  `STATUS.md`, `TO-DOS.md`, `LEARNINGS.md`, `sessions/2026-08-04-s151.md` and five untracked
  `qa/*.mjs` scripts. Do not commit from this thread without checking with the owner.
- 🔴 **Verification must end at a printed sample.** A wrong spine throws no error and looks fine
  on screen.
- ⚠ **Do not run a local PDF render** — bills GCS egress to the owner.
- ⚠ **Joyride's cover CSV is comma-delimited with a title row**, unlike the other four
  (semicolon + header row). Phase 2 problem.
