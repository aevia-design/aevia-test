# Session Status
_Last updated: 2026-08-18 (session 182)_
_Context at save: S182's seven commits are on `main` and PUSHED (`fda9023`). 596 unit tests
green. **One deploy outstanding and it is REQUIRED, not optional — see "Do this first".**
Still uncommitted and awaiting owner decisions, carried since S174: `.claude/settings.local.json`,
`assets/about us photos/`, `work/about-photos/`, `work/low-res-badge/`, `assets/packaging/`,
`work/packaging/`, ~14 untracked `qa/` one-offs. **Separately, S183 (legal pages) ran in parallel
and ALL of its output is untracked** — `sessions/2026-08-18-s183.md`, `docs/business-legal-facts.md`,
`work/legal-pages/`. Those are S183's, not loose ends from S182._

## Status
**🇩🇪 Session 182 (2026-08-17/18) — germanization Stage 5 CLOSED (German AI captions live and
verified), Scribble's font replaced, and a print-content bug found and fixed in Tender.**

Full detail: **`sessions/2026-08-17-s182.md`**.

## ⚠ Do this first — the working tree and production disagree

**Redeploy the Cloud Run renderer.** Two of S182's changes reach the browser (Cloudflare
auto-deploys `main`) but **not** print, because `export-pdf.js` loads template data *and fonts
from a copy of the repo baked into the container*.

```powershell
gcloud run deploy aevia-pdf-renderer --source C:/Users/evgmy/aevia-test --region europe-west1 --memory 8Gi --cpu 4 --timeout 900 --allow-unauthenticated --project aevia-uploads --quiet
```

Until it runs, a new **Tender** order stores the full 8-line intro passage but the stale renderer
draws it into the OLD 100mm box, and **Scribble** PDFs look for `Onest-Regular.ttf` that container
does not have. ⚠ **The font miss is silent** — `embedAllFonts` only logs `Font file missing:` and
carries on, so Scribble captions would just lose their face. The 2026-08-17 morning redeploy
predates both changes. `--source` builds from the **working tree**, not GitHub.

**Then generate one Tender PDF and one Scribble PDF.** That single pass verifies all of S182:
the restored authored text, the new 132×140mm box, the Onest swap, and that ß now prints.

## Where germanization stands
| Stage | State |
|---|---|
| 0 · Validate the DE drop | ✅ done — `work/germanization/stage0-report.md` |
| 1 · Language → Firestore → staff badge | ✅ done, deployed |
| 2 · DE artwork in both engines | ✅ done, live |
| 3 · PDF parity | ✅ done, deployed |
| 4a · Order-form chrome | ✅ done S178 — `assets/js/order-strings.js` |
| 4b · Per-template copy | ✅ done S180, all eleven data files |
| 5 · German AI captions | ✅ **done S182 — deployed, verified on a Newborn order** |
| 6 · DE mockups + gallery swap + add-on names | ⬜ **the only unbuilt stage** |

### What Stage 5 actually taught us (do not re-derive)
1. **A blocklist alone cannot produce good German.** The first real output paraphrased around
   every banned string ("So viel Freude in einem kleinen **Moment**" dodged the banned "in diesem
   Moment") and fell back on abstraction. What fixed it was a **positive rule ranked second, under
   no-invention: name something actually in the photograph.** Do not demote it.
2. **Compose can DELETE a customer's detail**, not only invent one — it dropped "an einem
   Dienstag" from a proposal story. Different failure from invention; the add-nothing rules did
   not cover it.
3. **Prompt building lives in `functions/caption/prompts.js`**, extracted so the German path is
   testable (`tests/caption-prompts.test.js`). A prompt regresses **silently**.
4. **The English "no A/An" rule is deliberately NOT sent for German** — research withdrew it, so
   sending it pushed the model wrong.
5. `functions/caption/caption.js --language de` reproduces engine output locally, no deploy
   needed. It reads `functions/.env` as a fallback — never copy the key to a second file.

## Recent decisions
- **Intro pages print pre-defined book copy and are NEVER abridged (S182, owner)** — if the text
  does not fit, **grow the box**, never shrink Xenia's type or trim her words.
- **Scribble's NT Somic replaced with Onest (S182)** — closes TO-DOS #115 outright; every font
  now passes `check-font-glyphs.mjs`, so `caption-voice.md`'s "avoid ß" rule was **inverted**.
- **Stage 6's add-on names deferred (S182, Pareto)** — 11 strings seen once, post-decision, never
  printed. Fold them into the native-proofread pass instead of building twice.
- **English caption/compose prompts left untouched (S182)** — they share the abstraction and
  deletion weaknesses, but EN is the germanization regression baseline. Open, deliberately.
- **Caption typographic polish removed from both engines (S181)** — see
  `work/caption-line-integrity/decision.md` before re-adding.
- **Caption length is NOT calibrated (S180, owner)** — staff trim or regenerate. Ceiling only.
- **Print samples go by email, not the API (S180)** — and the API round waits for `product_id`.
- **Journalism caption guidance must not govern Aevia's captions (S180, owner).**
- **The English "no A/An" caption rule does not carry over to German (S180, researched).**
- **Packaging: deboss the large forms, print the small text (S179, owner).**
- **No separate markdown translation file (S178, owner).**
- **Add-on names are fixed in Stage 6, not patched in the form (S178, owner).**
- **Germanization: one switch drives everything (S177, owner).**
- **German captions are written natively, not translated (S177, owner).**
- **No AI on the travel-map itinerary (S175, owner).** **Do not re-raise.**
- **VAT is RESOLVED at 20% (S173, owner). Do not re-raise.**
- **RAW, TIFF and a 40 MB cap ALL DECLINED (S166, owner).** **Do not re-raise.**
- **WebP REFUSED (S164, owner).** **Do not re-raise.**
- **Printsmarter token NOT rotated (S155, owner).** **Never put it in any summary or memory.**
- **No price rise at launch (S148, owner).**
- **The live site stays `noindex` until launch (S144)** — TO-DOS #81.

## Next steps (priority order)
1. **The Cloud Run redeploy + the two verification PDFs** — see "Do this first" above.
2. **Get ONE native German read of everything at once** — the `/de/` pages, the order form, the
   per-template copy, and now the captions. **Nothing German has ever been read by a native
   speaker.** Highest-leverage item left: one pass covers every surface, and doing it late means
   rework on stages already marked ✅. It also hands you Stage 6's 11 add-on names for free.
3. **Stage 6 — DE mockups + gallery swap** (treat as ONE job; each is useless without the other),
   then the add-on names. ⚠ Capture reads the **deployed** rig — push first (LEARNINGS S172).
   Owner is creating one German order per template for this. Functional pages only, so the orders
   need special pages filled but not full photo sets; Heirloom's four colourways are four orders.
   ⚠ When building the add-on names, key the map off the English **`name`**, NOT the `slug` —
   slugs are positional (`fp1` is "Travel map" on Joyride but "Birthday spread" on Papercut).
4. **Send the Printsmarter reply with sample PDFs.** Then the `v4` → `v2` signed-URL change at
   `functions/index.js:1495`. Still blocked on their `product_id`.
5. **TO-DOS #113 — German transactional emails.** Own session; bilingual-vs-German-only undecided.
6. **Implement `docs/briefs/upload-failure-recovery.md`** — ready and unblocked since S174.
   Piece 0 (Retry) is independent of the scheduled job.
7. **Packaging, when Xenia replies** — entry point `work/packaging/README.md`.
8. **Decide the ~14 untracked `qa/` one-offs.** Proposal made S175, not actioned.
9. **Confirm the venue credit wording against the agreement.**
10. **Decide whether to delete `pages/spread-preview.html`** — dead prototype carrying HEIC code
    and the last `NT Somic` reference in the repo.
11. **Owner review of the Laguna page copy** (EN + DE) — TO-DOS #110.
12. **Downscale Clémence's portrait** — 3.48 MB against 86 KB for Kevin's.
13. **Send Xenia the cover-artwork brief** — no customer-fillable text outlined in, no live
    `<text>`, artboard = trim with correct bleed.
14. **Open `help.html` + `de/help.html` in a browser** — the S166 formats FAQ never rendered.
15. **TO-DOS #109** — extend `cover-svg-viewbox.test.js` to assert bleed coverage.
16. **Server-side validation in `functions/upload.js`.**
17. **Customer-preview must record caption line breaks** (open since S159).

## Open questions
- **Has any native speaker read ANY of the German?** Still no. **The single largest unverified
  surface in the project**, and it now includes the AI captions.
- **Does the German intro want the tighter spacing Xenia wrote?** Both German `.txt` files put
  "[Anna] & [Michael]" directly under the closing line; both English ones leave a blank line, and
  both `composeDe`s emit the blank line. Kept for consistency with English and shipped Heirloom.
  One-character fix in two files if she meant otherwise.
- **Should Tender's middle stanza ever have wrapped differently?** 132mm sets every authored line
  on one line at 22pt. The frame's clear interior is 136.8mm, so there is ~2.4mm each side and no
  room to grow further.
- **Are our caption rules too austere for a baby book?** Xenia's own German uses an exclamation
  mark both voice sections forbid. Surfaced S180, not decided.
- **Does the English caption prompt need the same concreteness fix as German?** Its control output
  was "Everything new in this quiet moment" — the same weakness. Left alone on purpose.
- **Is the language selector acceptable live before Stage 6?** A DE pick now gives German artwork,
  a German form and German captions, but English mockups. Production is waitlist-gated.
- **Which templates go to Printsmarter as samples**, and does the `v2` signed URL actually work?
- **Does a repositioned full-bleed photo now print off-centre?** Never eyeballed.
- **Does the PDF renderer spill over-long story-panel text the way the engine does?** Never
  rendered — and now more relevant, since Tender's intro box grew.
- **Do the sticker laptop and yellow book belong on a premium page?** Two reviews disagreed.
- **Does the Laguna approve click work?** The E2E chain skipped it.
- **Does Clémence's portrait crop correctly?** Hers is portrait; Kevin's is landscape.
- **Would a 60–100MP camera's max-quality JPEG exceed 40 MB?** TO-DOS #105.
- **Is Wander's trim 409mm or 408mm?** Xenia has not confirmed.
- **Does a Google Photos pick ever arrive with no extension AND no MIME type?** Needs a device.
- **Does `.rotate()` double-rotate HEIC?** Accepted on trust — untestable locally.
- **Should existing derivatives be regenerated?** Costs egress; default is to leave them.
- **`wander-data.js` placeholders still quote the artwork's old wording** ("Dolomites, 2026").
- **Intro letter colour assumed `#7c746e`** — resolved for Beige; confirm with Xenia.
- **The Printsmarter button is visible on the staff dashboard** but cannot fire (no `product_id`).
- **Pre-13-July Papercut orders have `name`/`year` swapped in Firestore.**
- **Approval overwrites staff edits blindly.**
- **Prices live in THREE places** — Stripe, `assets/js/prices.js`, `PRICE_BY_PAGE_COUNT`.
- **Android is entirely untested on real hardware.**
- **Staff test password is weak** for an account that can read real customer orders.
