# Brief: Germanization of Templates (DE book language)

**Created:** 2026-08-14 (S177)
**Objective:** A customer picks DE or EN on the product page and everything downstream follows —
preview mockups, order form language, the special-page artwork printed in their book, and the
AI caption language — with staff always able to see which language an order is in.
**Audience:** Claude Code (implementer), Evgeny (visual tester at each gate), Xenia (artwork gaps).
**Applicable Standards:** project CLAUDE.md invariants, `docs/briefs/photo-formats.md` (upload
path untouched), `docs/briefs/caption-ai-modes.md` (caption invariants), LEARNINGS S157
(Xenia-drop pre-flight), `/stop-slop` for all customer-facing copy.

## Why

Aevia sells premium keepsakes in Vienna, but the books only exist in English: every special page
("Our story", "Why I love him", Birthday, Labour) carries English artwork and English predefined
text. An Austrian customer buying in German gets English chapter headings in a book meant to be
theirs. Xenia and Evgeny have already produced the DE artwork — 33 files with `-DE`/`_DE`
suffixes across all eight templates (SVGs for functional pages; TXT files for predefined intro/
labour text). This brief wires them through the whole chain: product page → order form →
Firestore → staff engine → customer preview → PDF → print.

## Decisions already made (owner, S177 — do not re-open)

1. **One switch.** The DE/EN choice on the product page drives everything: book artwork, order
   form language, AI caption language. No mixed combinations.
2. **The choice is made on the product page, independent of site half.** Someone browsing
   `pages/de/` can still order the English book. The `de/` page may *default* the selector to
   DE, but the selector decides.
3. **Mockups: re-shoot only the functional pages**, via a separate capture script — not the full
   12-image set per template.
4. **AI captions are written natively in German**, not translated from English output. Sound
   natural to a native speaker. (Owner's German is his third language — QC is harder, so keep
   the model on a short leash: same no-invention rules as compose, and flag DE caption samples
   for native review alongside the existing "DE copy never read by a native" open item.)
5. **Print parity is a hard requirement.** The PDF renderer must resolve the same DE SVGs the
   engine shows. A customer who approves a German preview must receive a German book.
6. **Order form: one `order.html` with a string table**, not a duplicated `de/order.html`.
   The form is 3,381 lines and changes often; a mirror copy would drift the way the page mirror
   already does (`docs/website-copy-deltas.md` exists because of it). German form copy drafted
   by Claude + `/stop-slop`; no external translator.

## Architecture (the chosen approach)

**The language rides the Heirloom monogram mechanism** — the proven per-order variant pattern:
order carries a choice, the template data file maps it to alternate SVG paths, both engines and
the PDF renderer resolve it. No new machinery.

- **`language: 'de' | 'en'`** stored on the order in Firestore (default `'en'`; absent field
  reads as `'en'` so every existing order is unaffected). Carried from the product page via the
  existing `goToOrder()` query-param handoff (`assets/js/product.js`).
- **Template data files** gain DE overrides only where a DE asset exists — e.g. a `de:` variant
  path beside the existing `svg:` field, or a per-template `languages` block; implementer picks
  the shape that stays closest to the monogram precedent. English remains the base; a missing
  DE override falls back to EN (never crashes).
- **Predefined text** (Tender/Newborn/Heirloom intro & labour `compose()` functions, inline in
  data files and `order.html`) gets DE variants sourced from the `*_DE.txt` files — these are
  exactly what Xenia wrote them for.
- **Engine parity invariant applies**: staff engine and `customer-preview.html` are parallel
  copies — every resolution change lands in both.
- **Caption AI**: `generateCaption` gains a `language` param; DE orders get a German-output
  instruction with the caption-ai-modes invariants intact (ceiling only, never a floor;
  `temperature` set; rules repeated in the user message). Compose mode (Our story) must also
  produce German for DE orders.

## Stages and visual gates

Each stage ends with something Evgeny can see and test before the next begins.

**Stage 0 — Validate the drop (no wiring).** Pre-flight all 33 DE files per LEARNINGS S157:
viewBox framing, filled photo windows, stray/outlined text (`qa/probe-cover-svg-text.mjs`
pattern), physical sizes. Produce a **coverage matrix**: every functional page with visible
English text × template → DE variant exists / missing. Two known oddities to resolve: Heirloom
*Beige* contains files named "…Brown-DE.svg" (mis-copied?), and per-template DE counts differ
(Scribble 6, Papercut 5, Tender 2 + txt…) — missing items become a list for Xenia, not blockers.
*Gate: the matrix + validation report; owner decides on gaps.*

**Stage 1 — Language plumbing end-to-end.** Selector on product pages (EN + DE pages; DE pages
default to DE), `language` through `goToOrder()` → `order.html` → `functions/upload.js` →
Firestore; language badge in the staff engine's order panel and on the dashboard order row.
*Gate: place a test order with DE selected; see "DE" in the dashboard and engine.*

**Stage 2 — DE artwork in both engines.** Data-file overrides + resolution in staff engine and
customer-preview (parity). EN orders pixel-identical to today.
*Gate: open a DE test order in the engine; special pages render German. Flip an EN order; nothing changed.*

**Stage 3 — PDF parity.** Same resolution in the renderer; predefined DE text included.
*Gate: owner generates a PDF from the dashboard (in-region, free) and eyeballs the special pages.*

**Stage 4 — German order form.** String table for visible UI copy in `order.html`, driven by the
incoming `language` param; DE `compose()` predefined texts; `/stop-slop` pass on all DE strings.
*Gate: click "Buch erstellen" from a DE product page; complete the form in German; place a test order.*

**Stage 5 — German captions.** `language` param on `generateCaption`; German generation on
standard spreads and German compose on Our story; verified against the S175 failing inputs
translated to the DE context (no invention, ceiling only).
*Gate: generate captions on the DE test order in the engine.*

**Stage 6 — DE mockups + product-page swap.** New capture script shooting **functional pages
only** from a deployed DE test order (push first — capture reads the deployed rig); output to a
`de/` variant folder under `assets/images/mockups/exp2/<template>/`; product-page gallery swaps
those images when the selector is on DE.
*Gate: toggle the selector on a live product page and watch the gallery swap.*

## Constraints

- **Upload path untouched** (`photo-formats.md` invariants; `isImageFile`, HEIC list).
- **No new cloud infrastructure.** One Firestore field and one function param; expected cost ≈ €0.
  No new buckets, regions, or services.
- **EN behaviour is the regression baseline**: absent/`'en'` language must leave every existing
  order, render, and PDF byte-identical in behaviour.
- **No frontend framework/build step** — the string table is a plain JS object in a `<script>`.
- Out of scope: translating `caption-voice.md` wholesale; German transactional emails (separate
  item — note it in TO-DOS); native-speaker review (tracked, not blocking build).

## Success Criteria

1. A DE order placed from a product page renders German special pages in engine, preview, and
   PDF, with German form experience and German AI captions — verified on one E2E test order.
2. An EN order (and every pre-existing order) behaves exactly as today — `npm run qa:order`
   19/19 and existing tests green at every stage.
3. Every stage gate was visually confirmed by the owner before the next stage started.
4. The Stage 0 coverage matrix exists and every gap is either filled by Xenia or explicitly
   accepted.

## References

- Survey findings (S177, in-session): `assets/js/product.js` `goToOrder()`; order schema in
  `functions/upload.js`; monogram precedent in `assets/Template_Heirloom/Beige/heirloom-data.js`;
  caption function `functions/caption/caption.js` + `functions/index.js` `generateCaption`;
  mockup pipeline `scripts/exp2-images.mjs` / `compose-all.mjs`.
- DE artifacts: 33 files, `find assets -iname "*-DE.*" -o -iname "*_DE.*"`.
- Invariant briefs: `caption-ai-modes.md`, `photo-formats.md`; LEARNINGS S157 (drop validation),
  S161, S166.

## Open questions

- ~~Heirloom Beige's "Brown-DE" filenames~~ — **resolved (owner, S177): Brown and Beige share
  the same inner-page colour, so the file is correct; the name is just a labelling inaccuracy.**
- Does every template's every English-text functional page have a DE variant? (Stage 0 matrix.)
- Where exactly the selector sits on the product page (design call at Stage 1 — small, but it's
  customer-facing UI on a premium page).
- German AI caption quality needs a native ear eventually — same bucket as the untested DE site
  copy.
- Should the cover (title/spine) ever differ by language? Assumed **no** — covers carry the
  customer's own words already. Confirm.
