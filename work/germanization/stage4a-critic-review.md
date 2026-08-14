# Review: Germanization Stage 4a (Order Form I18n)

**Reviewed:** 2026-08-14  
**Commit:** `5eec41b`  
**Artefact type:** Implementation (commit)  
**Applicable Standards:** CLAUDE.md (no build step, script-tag delivery), germanization.md (Stage 4 brief), LEARNINGS.md (testing S156)

---

## Verdict

**Accept.** The implementation correctly wires germanization through the order form's static and dynamic markup using a single source-of-truth string table. All 6 unit tests pass; all 19 integration QA checks pass; EN regression baseline holds. German copy is competent and consistent in register. Stage 4a successfully gates on visual confirmation — the owner can now place a German order from a DE product page and see German form copy throughout.

One low-priority cleanup: `ADDON_HINTS` object (line 566–568) is defined but never used; dead code after Stage 4a migration.

---

## What Meets Standards

1. **No-build-step constraint respected.** String table is plain JavaScript object in `<script>` tag (line 273), loaded before form logic references it. No transpilation, no bundler, no new dependencies. ✓

2. **EN path byte-identical in behaviour.** All 19 order-form QA tests green; missing German falls back to English via `t(key)` line 608 and `tdText(obj, field)` line 634. Pre-existing orders unaffected (absent `language` field reads as `'en'`). ✓

3. **String table as single source of truth.** Both languages on same line (130 key pairs); reviewable pair-by-pair for drift. Page reads its English from the table too, so the copy can never diverge the way separate `.html` forks would (brief constraint satisfied). ✓

4. **Staged implementation correctly split.** Stage 4a covers form's chrome only (`nav`, stepper labels, buttons, validation, success screen, photo hints). Per-template strings (`label`/`labelDe`, `hint`/`hintDe`, `placeholder`/`placeholderDe`) correctly deferred to Stage 4b — infrastructure in place via `tdText()` (line 632) but template data files don't carry the `*De` fields yet. ✓

5. **Fallback chain correctly implemented.** Missing key → warning + empty string (line 607); missing German → falls back to English (line 608); missing per-template German → falls back to English (line 634). No blanks, no undefined on screen. ✓

6. **Static markup wiring sound.** `applyStrings()` runs on DOMContentLoaded (line 752) before stepper paints, using `data-i18n` / `data-i18n-ph` / `data-i18n-html` attributes (lines 615–625). Dynamic markup built via `t()` calls in JS. HTML strings (`<strong>` tags in cover hints) correctly inserted via `innerHTML` in template literals, not `textContent`. ✓

7. **Gender-aware Newborn intro.** Regex `/^(girl|m[äa]dchen|tochter)/` (line 1124) correctly matches English and German girl indicators; German adjective endings `süßer Junge` vs `süßes Mädchen` preserved as complete phrases rather than template-built. Test confirms deliberate asymmetry (test file line 73). ✓

8. **Test suite appropriate for non-browser testing.** `npm test` checks static contract (keys exist, German populated, tokens match, table loads first) because order.html doesn't execute in Jest. Real-world bugs caught by `npm run qa:order` (19/19 green). Constraint documented (CLAUDE.md, S156). ✓

---

## Blocking Defects

None identified. The implementation is production-ready.

---

## Non-Blocking Issues

### 1. Dead code: `ADDON_HINTS` object (minor technical debt)

**Location:** `pages/order.html` line 566–568

**Observation:** Object defined but never referenced:
```javascript
const ADDON_HINTS = {
  'fp2': 'addon.funnyHint',
};
```

**Root cause:** Stage 4a refactored hint loading from direct strings to string-table keys. Old `ADDON_HINTS` object was left behind; the mapping now lives in `ADDON_NOTE_PLACEHOLDERS` (line 559) and order-strings.js.

**Impact:** Minimal — no functional defect, just dead code. Does not execute; does not affect output.

**Where to next:** On the next order-form maintenance pass, remove lines 566–568. Not blocking and can stay as-is indefinitely without harm.

---

## German Copy Review

The German is consistent in formal register (formal "Sie" throughout), idiomatic, and appropriate to a premium brand. The following table captures translation quality assessment:

| Key | Current German | Assessment | Recommendation (if any) |
|-----|-----------------|-----------|------------------------|
| `nav.cta` | Unsere Kollektionen | Premium, correct. Familiar phrase. ✓ | No change. |
| `field.notes.label` | Erzählen Sie uns von diesem Album | Formal Sie, natural phrasing. ✓ | No change. |
| `cover.hintLandscape` | Wählen Sie ein <strong>querformatiges</strong> Foto, damit es den Rahmen ausfüllt. | Correct. "querformatiges" is the standard German term for landscape-oriented. ✓ | No change. |
| `cover.hint` | Erscheint gedruckt auf Buchcover und Buchrücken. Sie können das später bei der Vorschau noch ändern. | Correct, formal. Minor note: "bei der Vorschau" is idiomatic. ✓ | No change. |
| `photos.tip` | Laden Sie vom Smartphone hoch, das ergibt die beste Qualität. Handyfotos enthalten Datumsangaben, nach denen wir Ihr Buch sortieren. | Correct but casual: "Handyfotos" is colloquial. For premium brand context, consider "Fotos vom Smartphone" — more formal. However, "Handy" is standard in Austria/Germany colloquially. Acceptable. ~ | Optional: "Handyfotos" → "Fotos vom Smartphone" for elevated tone, but current phrasing is not wrong. |
| `success.s2.body` | Feinschliff für Ihr Buch: Fotos tauschen, Bildtexte anpassen und prüfen, ob alles stimmt. Erst nach Ihrer Freigabe wird abgerechnet. | Excellent. "Bildtexte" correctly translates "captions". "Feinschliff" (fine-tuning/polishing) is perfect German for the intended meaning. ✓ | No change. |
| `overlay.almost` | Fast geschafft. Ihre Fotos sind auf dem Weg in unser Wiener Atelier. | Excellent. "Wiener Atelier" correctly localises to Vienna (Austrian market context). ✓ | No change. |
| `addon.minMax` | Mindestens {min} Wörter, höchstens {max}. | Correct formal phrasing. ✓ | No change. |
| `compose.introBoy` | Unser süßer kleiner Junge. | Correct gender-specific ending (süßer, not süßes). Formal. ✓ | No change. |
| `compose.introGirl` | Unser süßes kleines Mädchen. | Correct gender-specific ending (süßes, not süßer). Formal. ✓ | No change. |
| `signin.out` | Nicht Sie? Abmelden | Formal "Sie" used, but phrasing is slightly terse. "Sind Sie nicht der richtige Benutzer?" would be more natural, but current phrasing is acceptable and shorter. ~ | Optional refinement for natural flow, but current is acceptable. |
| `field.email.label` | E-Mail-Adresse | Standard German. ✓ | No change. |
| `footer.rights` | © 2026 Aevia. Alle Rechte vorbehalten. | Standard German legal phrase. ✓ | No change. |

**Summary:** German copy is professional, consistent in formal register, and contextually appropriate for premium Austrian/German market. No translation errors; idiom is native-speaker competent. One optional refinement (Handy vs. Smartphone) but not required. No blocking concerns.

---

## Test Adequacy

### What the 6 tests catch:

1. **Completeness.** Every key in the table has both `en` and `de` fields (tests 1–2). Catches blanks, undefined, missing languages.

2. **Contract fidelity.** Every key used by the page exists in the table (test 3). Catches typos and forgotten keys.

3. **Template integrity.** Placeholder tokens like `{name}`, `{n}`, `{date}` match between English and German (test 4, with intentional exception for Newborn gender-specific lines). Catches silent substitution failures.

4. **Load order.** Table script runs before form logic reads it (test 5). Catches `window.ORDER_STRINGS is undefined` errors.

5. **Regression baseline.** No customer-facing English literal left behind in markup that should have been moved to the table (test 6). Catches incomplete Stage 4a migration.

### What the tests do NOT catch:

The 6 tests are static contract checks. They would **pass** but the feature would **break** in these scenarios:

- **Wrong German translation:** Swap `'nav.home'` to `{ en: 'Startseite', de: 'Home' }` (values reversed). Test 3 passes (key exists); test 4 passes (no tokens). But EN and DE orders would be swapped on screen. ✓ Real defect, test-resistant.

- **Dynamic key not in static scan:** Add a new template that generates a new string-table key via JavaScript (e.g., `t('addon.word.ex' + i)`) without adding it to `DYNAMIC_KEYS` list (line 26 of test file). If the key doesn't exist, test 3 would fail — but only if someone forgets to maintain the `DYNAMIC_KEYS` list. ✓ Mitigated by explicit list, but depends on manual maintenance.

- **Per-template German never wired.** If Stage 4b is skipped and template data files never gain `labelDe` / `hintDe` / `placeholderDe` fields, all 6 tests pass but German books show English per-template copy. ✓ Defect not caught by these tests, but explicitly scoped to Stage 4b in the brief.

- **Markup rendered after DOMContentLoaded carries `data-i18n`.** If dynamic form building adds a new element with `data-i18n` after page load, `applyStrings()` won't apply to it (runs once on load). Test 5 passes (table loads first) but the element stays untranlated. ✓ Real defect; test-resistant. Mitigated by code review practice: dynamic markup built via `t()` calls, not `data-i18n` attributes.

**Verdict:** Tests are fit-for-purpose as regression guards for static contract. Would not catch translation errors or dynamic wiring bugs, but those are caught by visual QA (`npm run qa:order`) and owner review (German spot-check). No test gaps for the scope of what these tests claim to check.

---

## Architecture & Design Decisions

### Well-chosen:

1. **Side-by-side EN/DE on one line** (e.g., `'nav.home': { en: 'Home', de: 'Startseite' }`). Allows reviewers to scan for translation drift without opening a second file. Deliberate and effective.

2. **Plain JavaScript object, no build step.** Matches CLAUDE.md constraint. No friction for owner to add/edit strings.

3. **`t()` and `tdText()` fallback to English instead of blank.** Customer never sees empty label or placeholder. Graceful degradation if German is missing.

4. **Separate compose functions for Newborn gender lines.** German adjective endings require full phrases, not template-built words. Correct architectural choice.

5. **String keys mirror the stage-2 pattern** (`label`/`labelDe`, `svg`/`svgDe`). Consistency across germanization layers aids discovery and maintenance.

---

## Summary

This is a well-executed Stage 4a. The string table is the foundation for German form copy; it's correctly wired, thoroughly tested, and ready for visual confirmation by the owner. Stage 4a's scope (form chrome only) is correctly isolated from Stage 4b (per-template strings), with `tdText()` already waiting for the template data to gain `*De` fields.

The one technical-debt item (`ADDON_HINTS`) is cosmetic and can be cleaned up at any time without affecting functionality.

**Ready to ship after owner visual sign-off.**
