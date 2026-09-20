# Session Status
_Last updated: 2026-09-20 (session 187)_
_Context at save: **Xenia's third cover drop is validated, synced and PUSHED** — two commits,
`6604dd5` (coordinate sync) and `cf3d9b3` (photo-window fix). Owner has confirmed all three
broken covers render correctly in the engine and has **redeployed the Cloud Run renderer**.
`git status` otherwise unchanged from S186, plus one new untracked folder:
`work/upload-file-read/` (a PROVISIONAL brief — see below)._

## Status
**🖼 Session 187 — the cover drop landed, was validated, and broke the cover photo on three
templates until it was fixed.**

Full detail: **`sessions/2026-09-20-s187.md`**.

Front-panel content now sits at **trim X 315mm** on every template (Papercut at 314, owner's
deliberate choice). All four clipped templates had their clip shapes re-derived from the new
artwork. Tender was re-authored at 410mm and now declares `referenceSpineMm: 10`. Laguna's
cover came back at 36.5 MB and was re-optimised to 3.56 MB. `npm test` 614/614.

## ⚠ Do this first — generate the PDFs

The renderer is redeployed and the engine is verified. **Nothing has been printed yet.**
Generate PDFs from the dashboard and look at them:

1. **Heirloom Beige, Tender, Newborn** — the cover photo must be visible, not a coloured shape.
   ⚠ **The print path had the identical bug** (`export-pdf.js:1259`, `:1387`), so this is a real
   check, not a formality.
2. **Tender's spine** — the only template whose sheet width changed (409 → 410mm).
3. **Scribble's captions** — still the outstanding S182 item; the Onest swap has never been
   PDF'd. ⚠ **The font miss is silent**: `embedAllFonts` logs `Font file missing:` and carries
   on, so a clean log is not proof. Look at the captions.
4. **Is the front-panel content where the owner wants it?** Print is the only place to judge the
   centring the whole drop was correcting.

⚠ **The +6mm nudge is NOT uniform in print.** The engine shifts front-panel items by
`actualSpine − referenceSpineMm`, which at 40pp is **+1mm for the six 9mm-authored templates
and 0 for Heirloom, Laguna and Tender.** The same CSV number prints at 316 on
Joyride/Scribble/Newborn/Papercut/Wander and 315 on the other three. Compare two templates from
different families before nudging again.

```powershell
gcloud run deploy aevia-pdf-renderer --source C:/Users/evgmy/aevia-test --region europe-west1 --memory 8Gi --cpu 4 --timeout 900 --allow-unauthenticated --project aevia-uploads --quiet
```

## ⚠ Carried into the next Heirloom drop
Owner will apply Beige's coordinates to **Blue, Brown and Green** next.
- Their windows are `fill="none"` today; **expect the re-export to re-fill them** exactly as it
  did Beige's. `tests/cover-photo-window.test.js` now catches that before the engine does.
- **Heirloom's slot tracks the ARTWORK opening centre, not the CSV** (332.63 vs 333.00). Do not
  "fix" it to match the CSV — the file's own comment explains why.
- ⚠ **Roses' new SVG has no photo opening at all** — no `<defs>`, no clipPath. It reuses Birds'
  value, as before, but nothing in the artwork confirms it.

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

## Where Printsmarter stands
| Piece | State |
|---|---|
| `product_id` = `aevia_hardcover` | ✅ set in `functions/.env` (S185) |
| Token / customer id 3983 / base URL | ✅ set since S155 |
| `printsmarterPostback` | ✅ **deployed + verified live** (S185), 5 cases green |
| Postback URL registered with them | ⏳ emailed to them, awaiting confirmation |
| `submitPrintOrder` | ❌ **not deployed** |
| `PRINTSMARTER_LIVE` | ❌ `false` — deliberate kill-switch |
| A first live order | ❌ deferred by owner |

**To send a first order:** the order needs `status: 'paid'` (dashboard dropdown), **print-mode**
PDFs in GCS, and a `shippingAddress` (no dashboard control — needs a hand-edit). AEV-095 (Laguna)
and AEV-091 (Heirloom Blue) are prepared except for the PDFs. Then set `PRINTSMARTER_LIVE=true`
and deploy `submitPrintOrder`.
⚠ **Their "orders are not forwarded to production" is an account setting, not a test mode** — when
they flip it, submissions become real books with no change on our side.

## Recent decisions
- **Cover coordinates land at trim X 315mm everywhere; Papercut at 314 is deliberate (S187,
  owner)** — to be judged in print, not on screen.
- **For a CLIPPED template the ARTWORK wins over the CSV (S187)** — Heirloom's slot is 332.63
  because that is the opening centre; the CSV says 333.00. A 0.37mm error shows background down
  one edge of an 80mm window.
- **Tender declares `referenceSpineMm: 10` (S187)** — its sheet was re-exported at 410mm. With
  `9` the engine squeezes a 410mm sheet into 409mm.
- **Joyride and Scribble stay at `referenceSpineMm: 9` (S187)** — their artwork now draws a 10mm
  spine band on a 409mm sheet, but **the engine never displays the SVG's spine band**; it paints
  its own. **Do not raise this as a print defect** — that is the S168 mistake (LEARNINGS 178).
- **Resumable uploads are NOT part of the upload-stall work (S187, owner)** — the signed URL is
  `action: 'write'`, a single-shot PUT, so retries restart at byte zero. Worth doing, own
  session, and it would not have fixed AEV-096.
- **Nothing to build for the upload stall yet (S187, owner)** — the root cause is still not
  established and the OneDrive premise did not survive checking. See "Open questions".
- **Heirloom's different paper = a SECOND `product_id`, requested by email (S186)** — their ids are
  issued by email, no catalogue and no self-service. Our side: `printsmarter.js:89` sends one
  hard-wired id for every order and becomes a per-template lookup keyed off the **registry key**,
  standard id as the default. ~10 lines. **Not built.** `pages`, `quantity` and retail `price`
  are unaffected.
- **Liability: keep the order-value cap, do NOT exclude slight negligence (S186)** —
  `work/legal-pages/decision-liability.md`. ⚠ Reversible **only until the first live order**
  (AGB §10 locks the live version into each order). **Insurance, not wording, is the real
  protection for a personally-liable e.U.** Do not re-raise Journi's blanket exclusion.
- **Our missing ODR link is CORRECT — the platform shut down 20 July 2025 (S186)**, Reg. (EU)
  2024/3228. S183 recorded the wrong reason. Journi still links it; theirs is stale. **Do not
  re-add it after seeing it on a competitor site.**
- **No accessibility statement — microenterprise exemption under the EAA (S186).** Not permanent;
  revisit if the business grows past 10 staff / €2m.
- **Photo retention follows the cheap mechanism (S186, owner)** — "12 months after **upload**" plus
  a 365-day GCS lifecycle rule, not a scheduled function reading delivery dates.
- **OpenAI stays disclosed as a processor (S186, owner)** — GDPR Art. 13 recipients.
- **Printsmarter `price` = retail, not cost (S185, their docs)** — our €70/€100 is correct.
  Cost is €8.47 (40pp) / €11.67 (80pp). **Never put cost in that field.**
- **Postback auth solved on our side (S185)** — secret in the URL path; their dev team builds
  nothing. The S155 "can you sign requests?" question is **withdrawn, not pending**.
- **Do not weaken `submitPrintOrder`'s guards for testing (S185)** — set the fields on the
  Firestore doc instead. A missing address returns 400 and bills nothing, so the dashboard
  button is safe to click.
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
1. **Generate the PDFs** — see "Do this first". The renderer is redeployed; nothing is printed.
   This closes both the cover drop AND the two S182 verification PDFs (Tender + Scribble) in one
   pass, since Tender now also carries the 410mm spine change.
2. **Apply Beige's coordinates to Heirloom Blue, Brown and Green** — see "Carried into the next
   Heirloom drop". Their front-panel coordinates are still the old, off-centre ones.
3. **Ask Printsmarter for Heirloom's second `product_id`** — and in the same email: exact paper
   spec per product, written confirmation that `pages: 40|80` at `quantity: 1` is accepted, whether
   the cover board differs, the cost impact, and the **geometry in writing** now that they have
   printed samples (§5 item 10). Then build the per-template lookup.
4. **Get ONE native German read of everything at once** — the `/de/` pages, the order form, the
   per-template copy, and now the captions. **Nothing German has ever been read by a native
   speaker.** Highest-leverage item left: one pass covers every surface, and doing it late means
   rework on stages already marked ✅. It also hands you Stage 6's 11 add-on names for free.
5. **Stage 6 — DE mockups + gallery swap** (treat as ONE job; each is useless without the other),
   then the add-on names. ⚠ Capture reads the **deployed** rig — push first (LEARNINGS S172).
   Owner is creating one German order per template for this. Functional pages only, so the orders
   need special pages filled but not full photo sets; Heirloom's four colourways are four orders.
   ⚠ When building the add-on names, key the map off the English **`name`**, NOT the `slug` —
   slugs are positional (`fp1` is "Travel map" on Joyride but "Birthday spread" on Papercut).
6. **Print the first Printsmarter order when ready** — no longer blocked. Generate print-mode
   PDFs, then `PRINTSMARTER_LIVE=true` + deploy `submitPrintOrder`. Owner deferred this S185.
7. **TO-DOS #113 — German transactional emails.** Own session; bilingual-vs-German-only undecided.
8. **Implement `docs/briefs/upload-failure-recovery.md`** — ready and unblocked since S174.
   Piece 0 (Retry) is independent of the scheduled job.
9. **Packaging, when Xenia replies** — entry point `work/packaging/README.md`.
10. **Decide the ~14 untracked `qa/` one-offs.** Proposal made S175, not actioned.
11. **Confirm the venue credit wording against the agreement.**
12. **Decide whether to delete `pages/spread-preview.html`** — dead prototype carrying HEIC code
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
- **What actually causes the upload stall?** Still unknown after four sessions. S187 captured
  the first real failure and it **killed the duplicate-`File` hypothesis** (55 distinct
  originals, the failing file used once; Chrome/Windows, not Safari) without replacing it.
  ⚠ The "identical 371,712 bytes" is **not** proof the file was unreadable — `bytesTransferred`
  is only set inside the progress handler and **we never record how many events fired**, so one
  buffer flush then a wedged connection fits the same data. ⚠ The OneDrive placeholder theory
  weakened: "Free up space" is greyed out on those files, so they are not placeholders.
  A third candidate survives: OneDrive rewrites files during sync and Chrome's `File` is a
  snapshot tied to modification time. **Next move is instrumentation, not a fix** —
  `work/upload-file-read/brief.md` is PROVISIONAL and its prevention scope is unjustified.
- **Is the +6mm nudge right, given it prints as +1mm more on six templates?** Needs two
  templates from different spine families compared on paper.
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
- **Which templates go to Printsmarter as samples?** Signed URLs are v4/7-day; whether their
  fetcher accepts them is **untested** — the first submission proves it.
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
- **`functions/index.js:1513` claims the dispatch email is "NOT yet wired". It IS wired** and
  emails the customer on any postback that reaches a real order. Stale comment, not fixed.
- **Pre-13-July Papercut orders have `name`/`year` swapped in Firestore.**
- **Approval overwrites staff edits blindly.**
- **Prices live in THREE places** — Stripe, `assets/js/prices.js`, `PRICE_BY_PAGE_COUNT`.
- **Android is entirely untested on real hardware.**
- **Staff test password is weak** for an account that can read real customer orders.
