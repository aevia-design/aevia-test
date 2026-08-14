# Session Status
_Last updated: 2026-08-14 (session 174)_
_Context at save: **S174's five commits are on `main` but NOT pushed** — the owner is holding
the push to show the about page to Xenia first. `origin/main` is four commits behind local.
Still uncommitted: `.claude/settings.local.json` (S170 deny rules), the owner's four originals
in `assets/about us photos/`, `work/about-photos/` (the layout preview rounds), the pre-existing
`work/low-res-badge/`, and ~14 untracked `qa/` one-offs pending a delete decision._

## Status
**Session 174 (2026-08-13/14) — backlog debt cleared, the upload brief unblocked, and the
about-page photos shipped.** Three separate threads, all closed or handed on cleanly.

### What S174 changed
1. **Housekeeping done** (`f977d76`). The six `Template_Wander` map PNGs, unexplained since
   S170, are committed: they are a **500→300dpi downscale holding 206.1mm**, not re-encodes.
   Business case v10 and a stray test HEIC deleted.
2. **Every Codex claim verified** against the code. Six true; **two of the brief's own
   assertions false** (both inherited unchecked from the critic review).
3. **A tripped breaker no longer hides untried photos** (`7864391`). `uploadFailures` now
   means exactly "not in GCS". `qa:order` 19/19 with a new case, confirmed red first.
4. **The stranded-upload brief is unblocked** (`c866987`) — do-not-implement lifted, the
   worker-pool constraint dropped, a disposition field added.
5. **The about page carries the four studio photos** (`17135f0`, `756d771`) as a rolling row,
   EN + DE, with a contrast fix on the contractually required venue credit.

### Facts worth carrying
1. **`uploadFailures` = "not in GCS".** Any Retry may trust it. **Do not "optimise" a retry to
   skip `neverAttempted` entries** — they are most of the missing photos after a breaker trip.
2. **`var(--muted)` fails AA on `--surface`** (3.94:1 at full opacity). `design-principles.md`
   only warns about `--bg`. Check muted text against the surface it sits on.
3. **`design-review` ran with NO browser access** and reported code analysis as a review.
   Confirm it can see before trusting it; treat its numbers as claims.
4. **An unrubriced reviewer beat the rubriced one on facts.** "No rubric" predicts the output's
   form, not its accuracy. Verify either way.
5. **Trim dead space freely, never cut a person.** The photo rule the owner set after an early
   crop cut his legs. It is not "no crops".
6. **`assets/test photos/` is gitignored** but held tracked files from before the ignore.
7. **No page on the site declares a favicon** — all 31. `/favicon.ico` 404s.

## Recent decisions
- **Push held until Xenia sees the about page (S174, owner).**
- **`MengTo/Skills` NOT installed (S174).** `marquee-loop/SKILL.md` is 22 lines with no code;
  the substance is a neuform.ai demo plus view-count marketing. The S120 trap — momentum, not
  merit. `vercel-labs/agent-skills` also rejected: it is a code auditor, not a design skill.
- **"Eugene" is the public spelling (S174, owner)** — for the Austrian audience, who misspell
  Evgenii. First time either founder is named on the site; it sets the convention.
- **Joyride Stages 9–10 need nothing (S174)** — all on `main`, no branch, nothing in TO-DOS.
  STATUS carried this wrongly for several sessions.
- **The "do not modify the worker pool" constraint is LIFTED (S174)** — it could not coexist
  with a correct Retry. Extraction is allowed; first-pass behaviour must not change.
- **VAT is RESOLVED at 20% (S173, owner). Do not re-raise.**
- **#89 detection automated, recovery human (S173, owner).** Self-service resume deferred.
- **Laguna is BUILT (S172).** Needs nothing before it can take an order.
- **RAW, TIFF and a 40 MB cap ALL DECLINED (S166, owner).** **Do not re-raise.**
- **WebP REFUSED (S164, owner).** **Do not re-raise.**
- **No backfill of existing `order-details.txt` (S165, owner).** Fix forward only.
- **Business case untracked (S156, owner).** **No longer backed up by git.**
- **Printsmarter token NOT rotated (S155, owner).** **Never put it in any summary or memory.**
- **#88 closed without root cause (S150, owner).** Read `docs/briefs/upload-failures.md` first.
- **No price rise at launch (S148, owner).**
- **The live site stays `noindex` until launch (S144)** — TO-DOS #81.

## Next steps (priority order)
1. **Push, once Xenia has seen the about page.** Four commits waiting.
2. **Xenia's verdict on the rolling row** — and two photo questions still open: the
   sticker laptop (`DIZENGOF99 BBDO` legible) and the yellow book. The design-review agent
   judged them fine as documentary colour; this session's assessment was the opposite. Owner
   to decide.
3. **Confirm the venue credit wording against the agreement.** Shipped as "Spaces Business
   Centre, Vienna"; the clause says "Regus/Spaces Business Centre Austria". "Regus" was
   dropped and Austria became Vienna, on editorial grounds. **Owner to check the clause.**
4. **Implement `docs/briefs/upload-failure-recovery.md`** — ready, verified, unblocked. Start
   with piece 0 (Retry) or pieces 1–7 (the scheduled job); piece 0 is independent.
5. **Decide the ~14 untracked `qa/` one-offs.** Proposal made, not actioned: keep
   `verify-spine-geometry`, `debug-letter-ink`, `test-upload-with-throttle`; delete the rest.
   **`quick-stall-test.mjs` and `verify-stall-detection.mjs` cannot run at all** — they drive
   `input[name="mainphoto"]`, which has zero occurrences in `order.html`.
6. **Write the pattern menu** (S174 idea) — a short `docs/` page naming the motion/layout
   patterns that suit Aevia, so the owner can point at one. His "one row, rolling a bit"
   unblocked six failed rounds; the bottleneck is vocabulary, not judgement.
7. **Owner review of the Laguna page copy** (EN + DE) — TO-DOS #110.
8. **Downscale Clémence's portrait** — 3.48 MB against 86 KB for Kevin's.
9. **Decide the two Laguna artwork questions for Xenia/Clémence** (back-cover wording, and the
   Instagram handle now that her page links to a portfolio). Both need a re-export.
10. **Send Xenia the cover-artwork brief** — no customer-fillable text outlined in; **no live
    `<text>` at all**; artboard = trim with correct bleed; artwork must reach the bleed rect.
11. **Eyeball the next Laguna proof** — spine-label centring, Fredoka Bold cover title, map pins.
12. **Open `help.html` + `de/help.html` in a browser** — the S166 formats FAQ has never been
    rendered. Carried since S166.
13. **Delete Joyride's dead placeholder plumbing** — ⚠ check Laguna does not depend on the same
    `phBroken()` fallback first.
14. **Extend `cover-svg-viewbox.test.js` to assert bleed coverage** — TO-DOS #109.
15. **TO-DOS #111** — slow photo decode silently guesses orientation.
16. **Server-side validation in `functions/upload.js`.**
17. **Customer-preview must record caption line breaks** (open since S159).
18. **German order flow — TO-DOS #101.**

## Open questions
- **Does Xenia like the rolling row?** The whole about-page section is provisional until she does.
- **Do the sticker laptop and yellow book belong on a premium page?** Two reviews disagreed.
- **Does the venue credit wording satisfy the agreement?**
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
