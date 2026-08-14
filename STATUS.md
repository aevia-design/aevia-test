# Session Status
_Last updated: 2026-08-14 (session 175)_
_Context at save: **everything is pushed.** `main` == `origin/main`, and the S174 backlog that
was being held for Xenia went out with it. The about page is live on `aevia.at` and the test
rig. `generateCaption` is deployed with compose mode. Still uncommitted and awaiting owner
decisions: `.claude/settings.local.json`, `assets/about us photos/` (the four originals),
`work/about-photos/`, `work/low-res-badge/`, and ~14 untracked `qa/` one-offs from S174._

## Status
**Session 175 (2026-08-14) — the caption AI now only fires where AI has a job, and it stopped
inventing facts about customers' weddings.**

### What S175 changed
1. **`collection` per template** (`ab1feac`). Was hardcoded `'kids'` at every call site, so
   wedding and travel books got kids tone-of-voice on standard spreads — in orders that already
   ship. Now from the registry: kids Scribble/Papercut/Newborn, travel Wander/Joyride/Laguna,
   love Tender/Heirloom ×4.
2. **The button removed from 19 functional page definitions** (28 instances). Slot captions gate
   on `spreadDef.type !== 'standard'`; the text-panel button was deleted outright. Standard
   spreads are untouched.
3. **Compose mode on Our story only** — Tender + Heirloom ×4, opted in via
   `textPanel.aiCompose`. Text-only, no image. Welds the couple's two order-form answers into
   one passage.
4. **Compose was inventing facts; fixed** (`c44d0f9`). See "Facts worth carrying" below.
5. **About page live** — the two S174 commits plus a new photo of Eugene, then `main` rebased
   and all six commits pushed.

### Facts worth carrying
1. **A word floor is an instruction to invent.** "45–65 words" on an editing task made the model
   fabricate ("under the stars" from a text with no stars). **Ceiling only. Never reintroduce a
   minimum or a target** — the brief says so explicitly and it is the change most likely to be
   "tidied" back in.
2. **Set `temperature` when the job is editing.** The API default is tuned for creative writing.
3. **A rule in the system prompt loses to the weight of the rest of it.** Repeat the critical
   one in the user message.
4. **Grep finds the line; the enclosing `if` is the point.** "Text panels clip silently" was
   wrong — that `overflow:hidden` is inside `if (isFunnyWords)`. Story panels overflow visibly.
5. **Behaviour testing cannot catch a wrong explanation.** The feature worked and was tested;
   the error was in prose about a case nobody hit.
6. **`aevia.at` and `aevia-test.pages.dev` are ONE Cloudflare Pages project.** There is no
   "dev only" push — anything on `main` appears on both.
7. **No standard spread in any template has a `textPanel`** — it is functional-page-only.
8. **Line numbers in briefs go stale within the hour.** Cite function names.

## Recent decisions
- **No AI on the travel-map itinerary (S175, owner).** It is a formatting job — split on the
  arrows. **Do not re-raise.**
- **Tender FPwords and Heirloom FPhim/FPher get no button (S175, owner).** Vows and
  why-you-love-your-spouse are the customer's own words.
- **`spread-preview.html` keeps `'kids'` (S175).** Unlinked prototype, Scribble-only, no template
  data at all. Deleting it is the real fix for drift risk — owner's call.
- **`customer-preview.html` does NOT get the `collection` field (S175).** It has no AI.
- **Golden set deferred (S175, owner)** → TO-DOS #112. Only test orders exist so far.
- **Push held for Xenia is OVER (S175)** — she approved the rolling row.
- **"Eugene" is the public spelling (S174, owner).**
- **The "do not modify the worker pool" constraint is LIFTED (S174).**
- **VAT is RESOLVED at 20% (S173, owner). Do not re-raise.**
- **#89 detection automated, recovery human (S173, owner).**
- **Laguna is BUILT (S172).**
- **RAW, TIFF and a 40 MB cap ALL DECLINED (S166, owner).** **Do not re-raise.**
- **WebP REFUSED (S164, owner).** **Do not re-raise.**
- **No backfill of existing `order-details.txt` (S165, owner).**
- **Business case untracked (S156, owner).**
- **Printsmarter token NOT rotated (S155, owner).** **Never put it in any summary or memory.**
- **#88 closed without root cause (S150, owner).** Read `docs/briefs/upload-failures.md` first.
- **No price rise at launch (S148, owner).**
- **The live site stays `noindex` until launch (S144)** — TO-DOS #81.

## Next steps (priority order)
1. **Confirm the venue credit wording against the agreement.** It is **live on aevia.at now**,
   shipped as "Spaces Business Centre, Vienna"; the clause says "Regus/Spaces Business Centre
   Austria". Owner to check the clause.
2. **Implement `docs/briefs/upload-failure-recovery.md`** — ready, verified, unblocked. Piece 0
   (Retry) is independent of pieces 1–7 (the scheduled job).
3. **Decide the ~14 untracked `qa/` one-offs.** Proposal made, not actioned: keep
   `verify-spine-geometry`, `debug-letter-ink`, `test-upload-with-throttle`; delete the rest.
   **`quick-stall-test.mjs` and `verify-stall-detection.mjs` cannot run at all** — they drive
   `input[name="mainphoto"]`, which has zero occurrences in `order.html`.
4. **Decide whether to delete `pages/spread-preview.html`** — dead prototype, but it carries
   HEIC conversion code that `photo-formats.md` warns must not drift from the engine.
5. **Write the pattern menu** (S174 idea) — a short `docs/` page naming the motion/layout
   patterns that suit Aevia, so the owner can point at one.
6. **Owner review of the Laguna page copy** (EN + DE) — TO-DOS #110.
7. **Downscale Clémence's portrait** — 3.48 MB against 86 KB for Kevin's.
8. **Decide the two Laguna artwork questions for Xenia/Clémence** (back-cover wording, and the
   Instagram handle now that her page links to a portfolio). Both need a re-export.
9. **Send Xenia the cover-artwork brief** — no customer-fillable text outlined in; **no live
   `<text>` at all**; artboard = trim with correct bleed; artwork must reach the bleed rect.
10. **Eyeball the next Laguna proof** — spine-label centring, Fredoka Bold cover title, map pins.
11. **Open `help.html` + `de/help.html` in a browser** — the S166 formats FAQ has never been
    rendered. Carried since S166.
12. **Delete Joyride's dead placeholder plumbing** — ⚠ check Laguna does not depend on the same
    `phBroken()` fallback first.
13. **Extend `cover-svg-viewbox.test.js` to assert bleed coverage** — TO-DOS #109.
14. **TO-DOS #111** — slow photo decode silently guesses orientation.
15. **Server-side validation in `functions/upload.js`.**
16. **Customer-preview must record caption line breaks** (open since S159).
17. **German order flow — TO-DOS #101.**

## Open questions
- **Does the venue credit wording satisfy the agreement?** It is live.
- **Does the PDF renderer spill over-long story-panel text the way the engine does?** A comment
  in `renderSpread` implies yes; never rendered. Bounded — staff see the engine first.
- **Do the sticker laptop and yellow book belong on a premium page?** Two reviews disagreed;
  now live either way.
- **Does the Laguna approve click work?** The E2E chain skipped it — AEV-095 was pre-approved.
- **Does Clémence's portrait crop correctly?** Hers is portrait; Kevin's is landscape.
- **Does a repositioned full-bleed photo now print off-centre?** Never eyeballed.
- **Would a 60–100MP camera's max-quality JPEG exceed 40 MB?** TO-DOS #105.
- **Is Wander's trim 409mm or 408mm?** Xenia has not confirmed.
- **Does a Google Photos pick ever arrive with no extension AND no MIME type?** Needs a device.
- **Does `.rotate()` double-rotate HEIC?** Accepted on trust — untestable locally.
- **Should existing derivatives be regenerated?** Costs egress; default is to leave them.
- **`wander-data.js` placeholders still quote the artwork's old wording** ("Dolomites, 2026").
- **The DE copy has never been read by a native speaker.**
- **Intro letter colour assumed `#7c746e`** — resolved for Beige; confirm with Xenia.
- **The Printsmarter button is visible on the staff dashboard** but cannot fire.
- **Pre-13-July Papercut orders have `name`/`year` swapped in Firestore.**
- **Approval overwrites staff edits blindly.**
- **Prices live in THREE places** — Stripe, `assets/js/prices.js`, `PRICE_BY_PAGE_COUNT`.
- **Android is entirely untested on real hardware.**
- **Staff test password is weak** for an account that can read real customer orders.
