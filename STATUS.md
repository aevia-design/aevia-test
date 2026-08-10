# Session Status
_Last updated: 2026-08-10 (session 162)_
_Context at save: **S162's five commits are pushed** (`4b410d8`, `7d2889f`, `017cf4d`,
`5df4849`, `c2dff62`). All 12 Heirloom mockup sets exist and the product page serves them
in EN and DE. 351 tests green, `qa:order` 12/12, `heirloom-order-mock` 15/15. The S156
business-case deletion and a `test photos/IMG_5249.HEIC` deletion are still deliberately
uncommitted._

## Status
**Session 162 (2026-08-10) — Heirloom's product page is live on real mockups in both
languages, and two bugs that would have reached print were found and fixed. The owner is
redeploying the Cloud Run PDF renderer.**

**Immediate next action: the owner's Cloud Run redeploy must land before any Heirloom order
is placed for print.** Until it does, `services/pdf-renderer/index.js` cannot see the
monogram and every Heirloom book renders the default **Roots** artwork whatever the customer
chose. Recipe in the `project_serverside_pdf` memory / `LEARNINGS.md`.

### What S162 changed
1. **Engine bug: the monogram picker wiped every caption.** `#monogram-select`'s change
   handler called `renderBook()` plainly, and renderBook resets `bookCaptions` on a full
   rebuild. **The S161 bug at a second call site** — the one every mockup capture drives.
   All 12 first-pass captures came out with blank covers and blank interiors.
   `qa/verify-order-text-seeding.mjs` now covers the picker path (10/10).
2. **Asset bug: Green/Roses cover hid the customer photo.** A stray filled rect painted
   after the photo window, `#dad0c5` on a green cover — Xenia's export, same class as S157.
   Patched to `fill="none"`. **Not mockup-only: the PDF draws this file too.**
3. **12 mockup sets captured and composed** (120 webp). Orders map **beige AEV-089, green
   AEV-090, blue AEV-091, brown AEV-092** — *not* the runbook's assumed order.
4. **Product page shipped on real images**, both selectors driving all ten thumbnails, plus
   the owner's fixes (smaller monogram cards, no sub-names, 13px description, no intro card,
   new tagline, aligned 268px selector stack).
5. **`pages/de/heirloom.html` built** and Heirloom cards added to both collections pages.
   Card images in both languages are now links.
6. **Copy:** "plus shipping" → "excl. shipping" / "zzgl." → "exkl." across 29 occurrences.
   Heirloom added to both copy files; the DE address rule written down for the first time.
7. **`qa/capture-one-spread.mjs`** — re-captures one spread across orders and monograms from
   4 order loads instead of 24.

### Heirloom facts (carried, still current)
1. **4 colourways × 3 monograms.** Colour is a registry key, never a runtime variant.
2. **Colours split by SURFACE.** Brown and Green flip the cover to light-on-dark while keeping
   Beige's inner pages; monogram letters follow their surface. Blue is the only one with a
   different page ground.
3. **Green and Blue name their intros `V1/V2/V3`** (V1=Roots, V2=Birds, V3=Roses).
4. **Monograms select ARTWORK, not just text** — read via `getActiveMonogramDef()`.
5. **The intro is MANDATORY** (always Spread 0). It has no product-page card (S162) and the
   order form shows it checked-and-locked.
6. **`referenceSpineMm: 10`** — Heirloom's covers are authored at a 10mm spine (410mm).
7. **All four colourways share identical letter geometry.** Only the cover slot centre differs.
8. **Capture cost is trivial: ~10 MB per order load, 31 MB for a 12-capture run** (S162,
   measured). An earlier "several GB" estimate was wrong by two orders of magnitude.

## Recent decisions
- **Selector stack aligned to one 268px module, NOT full width (S162, owner).** They measured
  224/182/268 against a 400px panel. Full-bleed would make swatches ~91px and monogram cards
  ~128px, competing with the book photo and undoing the shrink the owner asked for.
- **No intro card on the product page (S162, owner)** — it is mandatory, so listing it offered
  a choice that does not exist. It stays in the gallery thumbnails.
- **DE address rule (S162, owner):** `du` = the buyer and their actions; `euer/ihr` = the
  people inside the book when the subject is shared. **Tender stays `du`; do not re-raise** —
  Heirloom already fits the rule, taglines never appear side by side, and a full switch would
  touch 41 instances. Written into `website-copy-DE.md`.
- **Owner approves wording, not punctuation (S162).** The approved DE tagline's em dash became
  a colon under `/stop-slop`.
- **ONE order per colourway, three monograms from each (S161).**
- **Staff do NOT need to change the monogram in the engine (S161, owner).**
- **Xenia is NOT asked to re-export the new covers (S160, owner).** Re-apply patches on any
  re-export — there are now TWO in-repo SVG patches (S157 ×3 covers, S162 Green/Roses).
- **The ENGINE is the source of truth for caption line breaks (S159, owner).**
- **Business case untracked (S156, owner).** **No longer backed up by git**; last tracked `0edb8ee`.
- **Printsmarter token NOT rotated (S155, owner).** **Never put it in any summary, log or memory.**
- **#88 closed without root cause (S150, owner).** Read `docs/briefs/upload-failures.md` first.
- **No price rise at launch (S148, owner).** Price is an OUTPUT of the business case.
- **Working assumption: 20% VAT on photo books (S145, owner).** Steuerberater to confirm.
- **The live site stays `noindex` until launch (S144)** — TO-DOS #81.

## Next steps (priority order)
1. **Owner: redeploy Cloud Run** (in progress at save). Then generate one Heirloom PDF per
   colourway — no Brown, Green or Blue book has ever been rendered — and check the monogram
   letters land in the artwork's pockets. This is Stage 7 of `heirloom-build.md`, still `[~]`.
2. **Heirloom E2E + merge** — Stages 9 and 10 of `heirloom-build.md` are the last unticked
   items. `qa/staff-customer-chain.mjs`.
3. **Customer-preview must record caption line breaks** (engine-parity rule, open since S159).
   Mirror `captionVisualLines`/`collectCaptionLines` into `pages/customer-preview.html`.
4. **Nav wraps to two rows at ~900px** and buries 17px of the breadcrumb. Affects every page;
   needs a nav decision, not a crumb tweak. Found S162.
5. **German order flow — TO-DOS #101.** Every DE product page hands off to the English order
   form. Decide: mirror `order.html` as DE, or make one file bilingual off `?lang=de`.
6. **Heirloom letter pockets — Xenia is looking into it.** Owner: not critical.
7. **Re-verify the other four templates' covers at 80pp** (carried from S156).
8. **Verify the stall detection (#94) properly** (carried from S156). `qa/quick-stall-test.mjs`
   is broken.
9. **Chase Printsmarter on the five open questions (S155).**
10. **Clean up the QA scripts (#60/#95)** — 13 untracked one-offs remain in `qa/`.

## Open questions
- **Does the breadcrumb need the last 1.7px?** All-caps text has no descenders, so a
  geometrically centred line box still reads slightly high. Was 8.6px, now 1.7px. Owner's call.
- **Is `qa/capture-one-spread.mjs` worth keeping?** Written as a one-off; it is the cheapest
  way to re-capture a single spread and reports MB transferred. Committed, undocumented in
  `qa/README.md` beyond its own docstring.
- **Will the monogram cards still want a mockup crop now the 12 sets exist?** The SVG crop is
  sharper and always correct; a mockup would add the book's physicality.
- **The DE copy has never been read by a native speaker.** Everything new carries ⚠ in
  `website-copy-DE.md`; the Heirloom tagline is the line customers read first.
- **Intro letter colour assumed `#7c746e`** — resolved for Beige (`#312128`); confirm with Xenia.
- **`assets/Aevia - Business case v10.xlsx` is tracked but missing from disk** (deletion left
  uncommitted deliberately). Stale Excel lock file in `assets/`.
- **The Printsmarter button is visible on the staff dashboard** but cannot fire.
- **Pre-13-July Papercut orders have `name`/`year` swapped in Firestore.**
- **Approval overwrites staff edits blindly.**
- **Newborn's cover slot is 0.11mm short** on its left edge. Deliberately not fixed.
- **Is Printsmarter idempotent on `order_id_client`?** Unconfirmed.
- **Prices live in THREE places** — Stripe, `assets/js/prices.js`, `PRICE_BY_PAGE_COUNT`.
- **Android is entirely untested on real hardware.**
- **Staff test password is weak** for an account that can read real customer orders.
