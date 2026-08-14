# Session Status
_Last updated: 2026-08-14 (session 178)_
_Context at save: **everything is pushed.** `main` == `origin/main`, six S178 commits live on
`aevia.at` and the test rig. **One deploy still outstanding: the Cloud Run `pdf-renderer`** —
the owner said he would run it himself; German PDFs need it. Still uncommitted and awaiting
owner decisions (carried since S174): `.claude/settings.local.json`, `assets/about us photos/`,
`work/about-photos/`, `work/low-res-badge/`, ~14 untracked `qa/` one-offs._

## Status
**Session 178 (2026-08-14) — the order form speaks German. Stage 4a complete, 4b started with
Newborn. Stages 0-4a of 6 done.**

Brief: `docs/briefs/germanization.md` — **read it before touching anything German.** Its Stage 4
section was rewritten this session: the stage is **two layers**, and the brief originally
described only the first.

### Where germanization stands
| Stage | State |
|---|---|
| 0 · Validate the DE drop | ✅ done — `work/germanization/stage0-report.md` |
| 1 · Language product page → Firestore → staff badge | ✅ done, deployed |
| 2 · DE artwork in both engines | ✅ done, live |
| 3 · PDF parity | ✅ code pushed — **still needs the Cloud Run redeploy** |
| 4a · Order-form chrome | ✅ done S178, live — `assets/js/order-strings.js` |
| 4b · Per-template copy | 🟡 Newborn done; **ten templates left** |
| 5 · German AI captions | ⬜ not started — inline, touches S175 rules |
| 6 · DE mockups + gallery swap | ⬜ not started — **also owns the add-on names** |

### Facts worth carrying
1. **The string table is the translation record.** `assets/js/order-strings.js` holds every form
   string as `{ en, de }` on one line, and the page reads its **English** from it too — one
   source of truth, no drift. **Do not create a separate markdown translation file** (owner, S178).
2. **Per-template copy lives in the data files**, not the table: `labelDe` / `placeholderDe` /
   `hintDe` / `copyDe` beside the English, resolved by `tdText()`. Same fallback as `svgDe` —
   no German means English, never blank.
3. ⚠ **Look for a `*_DE.txt` beside the artwork before writing German for a template.** Four
   exist (Newborn ×2, Heirloom, Tender); they are **authored book text, not translations** and
   corrected invented German on five points for Newborn — including **"Bub"**, the Austrian word.
   The other templates have **no** source doc in either language, so the English data-file value
   is the source there.
4. **Nothing verifies the German is GOOD.** The tests confirm every string exists in both
   languages and that English is unchanged. **`npm run qa:order` is English-only.** A native
   proof-read is the only gate — an agent review claimed otherwise and was wrong.
5. **Absent `language` reads as `'en'`** everywhere, so every pre-S177 order is untouched.
6. **`getOrder` has a field whitelist** — a new Firestore field reaches the dashboard but is
   invisible to the engine until `functions/index.js` is edited too.
7. ⚠ **Re-run `work/germanization/make-papercut-v-de.mjs`** if Papercut's two Art DE files are
   ever re-exported — the portrait variants are generated in-repo from them.

## Recent decisions
- **No separate markdown translation file (S178, owner).** The string table's `{ en, de }` pairs
  are the review artefact; a second copy would drift.
- **Delegate only very straightforward tasks (S178, owner).** Brand-voice copy is not one.
- **Add-on names are fixed in Stage 6, not patched in the form (S178, owner).**
- **"Eröffnungsseite", not "Introseite" (S178, owner).** Intro reads as borrowed media vocabulary.
- **German transactional emails are their own session (S178, owner)** → TO-DOS #113. Open
  decision: bilingual-in-one-email vs German-only off the order's `language`.
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
1. **Germanization Stage 4b — the remaining ten templates.** Joyride 31 fields, Laguna 26,
   Papercut 35, Scribble 20, Tender 40, Wander 15, Heirloom 47 × 4 (identical copies — translate
   once, apply four times). Pattern is set by `assets/Template_Newborn/newborn-data.js`; the
   guard is `tests/de-template-strings.test.js`, which fails a half-filled map.
2. **Deploy the Cloud Run `pdf-renderer`** (owner doing this), then run the Stage 1–3 gate test.
3. **Stage 5 — German captions.** Inline: it touches the S175 no-invention rules (ceiling only,
   never a floor). See `docs/briefs/caption-ai-modes.md`.
4. **Stage 6 — DE mockups + product-page gallery swap + the add-on names.**
5. **Generate the EN/DE review document for a native proofreader** — offered S178, not taken up.
   Build it from the string table so it cannot drift. Best done **after** 4b, so they read the
   form, the `/de/` pages and the captions in one pass.
6. **Implement `docs/briefs/upload-failure-recovery.md`** — ready and unblocked since S174.
   Piece 0 (Retry) is independent of the scheduled job.
7. **Confirm the venue credit wording against the agreement** — live on aevia.at now as "Spaces
   Business Centre, Vienna"; the clause says "Regus/Spaces Business Centre Austria".
8. **Decide the ~14 untracked `qa/` one-offs.** Proposal made S175, not actioned.
9. **Decide whether to delete `pages/spread-preview.html`** — dead prototype carrying HEIC code.
10. **Write the pattern menu** (S174 idea) — motion/layout patterns the owner can point at.
11. **Owner review of the Laguna page copy** (EN + DE) — TO-DOS #110.
12. **Downscale Clémence's portrait** — 3.48 MB against 86 KB for Kevin's.
13. **Two Laguna artwork questions for Xenia/Clémence** (back-cover wording, Instagram handle).
14. **Send Xenia the cover-artwork brief** — no customer-fillable text outlined in, no live
    `<text>`, artboard = trim with correct bleed.
15. **Open `help.html` + `de/help.html` in a browser** — the S166 formats FAQ never rendered.
16. **Delete Joyride's dead placeholder plumbing** — check Laguna's `phBroken()` first.
17. **TO-DOS #109** — extend `cover-svg-viewbox.test.js` to assert bleed coverage.
18. **Server-side validation in `functions/upload.js`.**
19. **Customer-preview must record caption line breaks** (open since S159).

## Open questions
- **Has any native speaker read ANY of the German?** Not the `/de/` pages, not the order form,
  not the captions. This is now the single largest unverified surface.
- **Is the language selector acceptable live before Stage 4b?** It shows on both sites now; a DE
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
