# Session Status
_Last updated: 2026-08-14 (session 177)_
_Context at save: **everything is pushed.** `main` == `origin/main`, five S177 commits live on
`aevia.at` and the test rig. **One deploy outstanding: the Cloud Run `pdf-renderer`** — the owner
said he would run it himself; German PDFs need it. Still uncommitted and awaiting owner
decisions (carried since S174): `.claude/settings.local.json`, `assets/about us photos/`,
`work/about-photos/`, `work/low-res-badge/`, ~14 untracked `qa/` one-offs._

## Status
**Session 177 (2026-08-14) — Germanization: brief written, artwork validated, and the language
choice now travels from the product page to the printed page. Stages 0–3 of 6 done.**

The brief is `docs/briefs/germanization.md` — **read it before touching anything German.** It is
stage-gated at the owner's request so he can eyeball each piece before the next is built.

### Where germanization stands
| Stage | State |
|---|---|
| 0 · Validate the DE drop | ✅ done — `work/germanization/stage0-report.md` |
| 1 · Language product page → Firestore → staff badge | ✅ done, deployed |
| 2 · DE artwork in both engines | ✅ done, live |
| 3 · PDF parity | ✅ code pushed — **needs the Cloud Run redeploy** |
| 4 · German order form | ⬜ not started — the biggest piece; delegate |
| 5 · German AI captions | ⬜ not started — inline, touches S175 rules |
| 6 · DE mockups + gallery swap | ⬜ not started |

**Owner's gate test, once the renderer is deployed:** place a DE order → dashboard shows the
green DE tag → engine shows the DEUTSCH badge and German special pages → generate a PDF and
eyeball it. One order covers Stages 1–3.

### Facts worth carrying
1. **The language rides the Heirloom monogram mechanism** — the proven per-order variant
   pattern. `language: 'de'|'en'` on the order; `svgDe` beside `svg` in the data files; a shared
   `resolvePageSvg()` in both engines and the same expression in `export-pdf.js`.
2. **Absent `language` reads as `'en'`** everywhere, so every pre-S177 order is untouched.
3. **A page with no DE artwork falls back to English**, never blank.
4. **`getOrder` has a field whitelist** — a new Firestore field reaches the dashboard but is
   invisible to the engine until `functions/index.js` is edited too.
5. **37 `svgDe` overrides are wired; no template has an English page left in a German book.**
6. ⚠ **Re-run `work/germanization/make-papercut-v-de.mjs`** if Papercut's two Art DE files are
   ever re-exported — the portrait variants are generated in-repo from them.
7. **`design-review` still has no browser access** (2nd session) and reported a wrong contrast
   figure as fact. Recompute its numbers.

## Recent decisions
- **Germanization: one switch drives everything (S177, owner).** No mixed EN-form/DE-book.
- **The language is chosen on the PRODUCT PAGE regardless of site half (S177, owner)** —
  browsing `/de/` can still order the English book; `/de/` only sets the default.
- **Order form gets a string table, NOT a duplicated `de/order.html` (S177, owner)** — the form
  is 3,381 lines and changes often; a mirror would drift. Supersedes TO-DOS #101's framing.
- **German captions are written natively, not translated (S177, owner).**
- **Mockups re-shoot functional pages only (S177, owner)**, via a separate script.
- **Toys/Steps DE artwork serves both orientations (S177, validated)** — H and V paths are
  identical there. **Art pages genuinely differ (5mm heading shift); do not reuse H for V.**
- **No AI on the travel-map itinerary (S175, owner).** **Do not re-raise.**
- **Tender FPwords and Heirloom FPhim/FPher get no AI button (S175, owner).**
- **Golden set deferred (S175, owner)** → TO-DOS #112.
- **VAT is RESOLVED at 20% (S173, owner). Do not re-raise.**
- **#89 detection automated, recovery human (S173, owner).**
- **RAW, TIFF and a 40 MB cap ALL DECLINED (S166, owner).** **Do not re-raise.**
- **WebP REFUSED (S164, owner).** **Do not re-raise.**
- **Business case untracked (S156, owner).**
- **Printsmarter token NOT rotated (S155, owner).** **Never put it in any summary or memory.**
- **#88 closed without root cause (S150, owner).** Read `docs/briefs/upload-failures.md` first.
- **No price rise at launch (S148, owner).**
- **The live site stays `noindex` until launch (S144)** — TO-DOS #81.

## Next steps (priority order)
1. **Deploy the Cloud Run `pdf-renderer`** (owner doing this), then run the Stage 1–3 gate test.
2. **Germanization Stage 4 — the German order form.** `docs/briefs/germanization.md` has the
   approach; delegate it (high-volume, self-contained, ~hundreds of inline strings), then
   `/stop-slop` the German and review the string table. Closes TO-DOS #101 and #108.
3. **Stage 5 — German captions.** Inline: it touches the S175 no-invention rules (ceiling only,
   never a floor). See `docs/briefs/caption-ai-modes.md`.
4. **Stage 6 — DE mockups + product-page gallery swap.**
5. **Implement `docs/briefs/upload-failure-recovery.md`** — ready and unblocked since S174.
   Piece 0 (Retry) is independent of the scheduled job.
6. **Confirm the venue credit wording against the agreement** — live on aevia.at now as "Spaces
   Business Centre, Vienna"; the clause says "Regus/Spaces Business Centre Austria".
7. **Decide the ~14 untracked `qa/` one-offs.** Proposal made S175, not actioned.
8. **Decide whether to delete `pages/spread-preview.html`** — dead prototype carrying HEIC code.
9. **Write the pattern menu** (S174 idea) — motion/layout patterns the owner can point at.
10. **Owner review of the Laguna page copy** (EN + DE) — TO-DOS #110.
11. **Downscale Clémence's portrait** — 3.48 MB against 86 KB for Kevin's.
12. **Two Laguna artwork questions for Xenia/Clémence** (back-cover wording, Instagram handle).
13. **Send Xenia the cover-artwork brief** — no customer-fillable text outlined in, no live
    `<text>`, artboard = trim with correct bleed.
14. **Open `help.html` + `de/help.html` in a browser** — the S166 formats FAQ never rendered.
15. **Delete Joyride's dead placeholder plumbing** — check Laguna's `phBroken()` first.
16. **TO-DOS #109** — extend `cover-svg-viewbox.test.js` to assert bleed coverage.
17. **Server-side validation in `functions/upload.js`.**
18. **Customer-preview must record caption line breaks** (open since S159).

## Open questions
- **Is the language selector acceptable live before Stage 4?** It shows on both sites now; a DE
  pick gives German artwork but an English form/captions/mockups. Production is waitlist-gated,
  so no real order can complete. Offered to flag-hide it; owner did not ask.
- **German transactional emails** were scoped OUT of the brief and have no TO-DOS entry yet.
- **Does the venue credit wording satisfy the agreement?** It is live.
- **Does the PDF renderer spill over-long story-panel text the way the engine does?** Never
  rendered. Bounded — staff see the engine first.
- **Do the sticker laptop and yellow book belong on a premium page?** Two reviews disagreed.
- **Does the Laguna approve click work?** The E2E chain skipped it.
- **Does Clémence's portrait crop correctly?** Hers is portrait; Kevin's is landscape.
- **Does a repositioned full-bleed photo now print off-centre?** Never eyeballed.
- **Would a 60–100MP camera's max-quality JPEG exceed 40 MB?** TO-DOS #105.
- **Is Wander's trim 409mm or 408mm?** Xenia has not confirmed.
- **Does a Google Photos pick ever arrive with no extension AND no MIME type?** Needs a device.
- **Does `.rotate()` double-rotate HEIC?** Accepted on trust — untestable locally.
- **Should existing derivatives be regenerated?** Costs egress; default is to leave them.
- **`wander-data.js` placeholders still quote the artwork's old wording** ("Dolomites, 2026").
- **The DE copy has never been read by a native speaker** — now also true of German captions.
- **Intro letter colour assumed `#7c746e`** — resolved for Beige; confirm with Xenia.
- **The Printsmarter button is visible on the staff dashboard** but cannot fire.
- **Pre-13-July Papercut orders have `name`/`year` swapped in Firestore.**
- **Approval overwrites staff edits blindly.**
- **Prices live in THREE places** — Stripe, `assets/js/prices.js`, `PRICE_BY_PAGE_COUNT`.
- **Android is entirely untested on real hardware.**
- **Staff test password is weak** for an account that can read real customer orders.
