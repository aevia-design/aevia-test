# Brief: German country names on the travel-map order form (TO-DOS #133)

**Created:** 2026-09-24 (Session 192)
**Objective:** A customer ordering a travel book (Joyride, Laguna, Wander) on the German order form
picks countries by their German names, sorted the German way, and every message that names a
country shows the German name, while everything stored, rendered and printed is unchanged.
**Audience:** Implementer (delegated developer agent); then Claude verifies; then Evgeny on the rig.
**Applicable Standards:** `CLAUDE.md` (project + global), `AGENTS.md`, `rageatc-code-oss:verifying-work`,
`docs/briefs/germanization.md` (the DE build rules), `/stop-slop` does NOT apply (names, not prose).

## Why

The German form is German everywhere except the travel map: the country picker, the chips of chosen
countries and the messages that name a country are still English ("Austria"). A German customer should
see "Österreich". Found S191 while germanizing the form's messages (`90007f4`).

## Settled decisions (owner, S191; do not re-open)

- **The CSV is canonical.** Add a German name per country to the CSV the list comes from, then sync
  it into the data files. Never hand-edit a value in a `*-data.js` that comes from a CSV.
- **The English name stays the key.** It is the key into `mapCoordinates` and what the engines,
  `customer-preview` and `scripts/export-pdf.js` read, and it is what gets stored on the order
  (`fpTexts.fp1.countries`). The German name is a **display label only**. Stored order data must be
  byte-identical whichever language the form is in.
- **No `de/order.html` fork**: the form already switches language through `assets/js/order-strings.js`
  / `t()`; follow that pattern.

## Where things live (verified S192)

- Three copies of `Map_Coordinates_upd.csv` (`;`-separated: `Country;Map;X/Y without bleed;X/Y with
  bleed`, 183 countries each), one per travel template:
  `assets/Template_Joyride/SVG/FP Spread 1 - Special Files/`,
  `assets/Template_Laguna/SVG/FP Travel Itinerary/`,
  `assets/Template_Wander/FP Spread 1 - Special Files/`.
- Synced into `mapCoordinates` in `joyride-data.js`, `laguna-data.js`, `wander-data.js` (find whether a
  sync script exists; Joyride is said to have one; if none, sync carefully and say how).
- Order form: `pages/order.html` `renderCountrySelect()` (~L1431; builds `<option value="${name}">${name}`
  grouped by region, sorted with `.sort()`), plus the other `mapCoordinates` readers ~L1483 and ~L1536,
  and every message/chip that prints a country name. Region labels already translate (`REGION_LABELS`).
- The book shows pins only, no country names (engines, customer-preview ~L2437-2461, export-pdf ~L594-640).
  Confirm that; if any customer-visible surface prints a name, report it rather than widening scope.

## Requirements

- [ ] A German-name column added to all three CSVs, identical German names across the three (they
      share the same country list; confirm they really are identical first and report any drift).
- [ ] German names are correct standard German exonyms (Österreich, Vereinigte Staaten, Elfenbeinküste,
      Tschechien, …). Use an authoritative list (e.g. the German Foreign Office / Auswärtiges Amt
      "Verzeichnis der Staatennamen", or ISO 3166 German names) and record which in the brief's folder.
- [ ] Data files carry the German label per country (e.g. `mapCoordinates[name].de`), synced from the
      CSV; X/Y values untouched (diff must show only the added label).
- [ ] German form: options show German names, sorted with German collation (`localeCompare(…, 'de')`,
      Ö with O), option **value** still the English key; chips and every message naming a country use
      the German label. English form unchanged.
- [ ] A country without a German label falls back to the English name, never blank.
- [ ] `tests/`: a test that every country in each data file has a non-empty `de` label and that the
      three templates agree; and that the stored value for a German selection is the English key.
- [ ] Glyphs: `node scripts/check-font-glyphs.mjs` still passes (the form's font must draw ä ö ü ß é …;
      note any non-German character a name introduces, e.g. accents in foreign names).

## Constraints

- Surgical: CSVs, the three data files, `pages/order.html` (and `order-strings.js` only if a new string
  is needed), a test. No engine, customer-preview or PDF change.
- No new dependencies. `npm run qa:order` must pass before push (the pre-push hook runs it).
- Out of scope: German names anywhere in the printed book, the staff dashboard, emails.

## Success Criteria

1. On the rig, a German Wander/Joyride/Laguna order form lists "Österreich" under Europe in German
   order, a chosen country's chip reads in German, and the saved order stores `"Austria"`.
2. The English form is unchanged (same list, same order, same stored values).
3. `npm test` and `npm run qa:order` green; the new test fails if a German label is removed.
4. All requirements above are met.

## References

- `docs/briefs/germanization.md` (Stage 4 string-table approach), `assets/js/order-strings.js`
- LEARNINGS / memory: "CSV is source of truth" (never edit CSV-derived values in data files directly)
- Trello #133

## Context

- In a worktree, bare `npm test` finds no tests (jest ignores `.claude/`) and PDF suites lack deps; run
  jest with `--testPathIgnorePatterns=NEVER` and NODE_PATH at the main checkout's node_modules, and
  report exactly which suites ran. Claude re-runs the full suite after merge.
- Excel may have saved the CSVs with a BOM or `;` separators and CRLF; preserve the file's existing
  encoding and line endings so Xenia's tooling still reads them.
