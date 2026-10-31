# Brief: German twin of AEV-071 (Newborn) for the DE product-page gallery

**Created:** 2026-10-31
**Objective:** A German Newborn order exists, is designed to match AEV-071 page for page, and its captured images sit in `assets/images/mockups/exp2/newborn/de/` so that `pages/de/newborn.html` shows a German book instead of the English one.
**Audience:** Visitors on the German half of aevia.at who switch language on the Newborn product page.
**Applicable standards:** `docs/briefs/germanization.md` (Stage 6), `work/german-caption-voice/research_v1.md`, `docs/briefs/caption-ai-modes.md`, `CLAUDE.md` cost-awareness rules.

## Why

Germanization Stages 0–5 are built: the whole ordering and rendering path honours `language: 'de'`. Stage 6 — the DE mockup imagery — is the only unbuilt stage, tracked as **TO-DOS #124** (*In progress*). Three templates already have it: **Tender → AEV-100**, **Scribble → AEV-104**, **Papercut → AEV-105**, each with a `de/` image set and `deImages: true` on the product page, which makes `swapGalleryLang()` serve it. Newborn has neither, so a visitor who switches to German on `pages/de/newborn.html` still sees an English book — the language switch looks broken on exactly the page meant to demonstrate it.

## What "the same order in German" means here

**Newborn has no German artwork.** `assets/Template_Newborn/newborn-data.js` declares no `svgDe` and no `composeDe`; the only German assets are two authored text files. So the DE book is the EN book with German *text*. Everything visible that must change:

| Surface | English (AEV-071) | German | Source |
|---|---|---|---|
| Cover name | `Valentina` | `Valentina` (unchanged) | owner |
| Cover subtitle | `Your First Months` | `Deine ersten Monate` | translated |
| Spine | `Our Sweet Girl` | `Unser süßes Mädchen` | translated |
| Intro page | birth-story block | **authored, not translated** — `order-strings.js` `compose.intro` + `compose.introGirl` compose it from the same facts (4 Nov 2025, 6:09, 2,89 kg, 48 cm, girl) | Xenia, `FP Intro/Intro Page_Text-DE.txt` |
| Labour left | `Welcome to this world, Valentina!` | `Willkommen auf der Welt, Valentina!` | `compose.labour` |
| Labour right | Scorpio blessing | `Wachse tiefgründig und mutig. / Möge dein leidenschaftliches Herz / von Mut, Liebe und Licht geleitet sein.` | `newborn-data.js:324` |
| 11 spread captions | see below | translated by hand from the owner's own fine-tuned English | this brief |

**Spread captions — proposed German.** These are the owner's hand-finished English, translated rather than regenerated, so no OpenAI call is made and the voice cannot drift:

| # | English | German |
|---|---|---|
| 1L | First steps into a new world | Erste Schritte in eine neue Welt |
| 3R | Quiet moments of discovery | Stille Momente des Entdeckens |
| 4R | Gentle moments, wrapped in comfort | Zarte Momente, warm geborgen |
| 5R | Joyful and ready to explore | Voller Freude, bereit zu entdecken |
| 7L | Bath time with mommy! | Baden mit Mama! |
| 9R | Met my aunt and uncle | Tante und Onkel kennengelernt |
| 10R | My new furry friend! Meow | Mein neuer flauschiger Freund! Miau |
| 14L | Sweet moments with you | Süße Momente mit dir |
| 17R | Happy birthday, Valentina! | Alles Gute zum Geburtstag, Valentina! |
| 18R | With Grandma in the countryside | Mit Oma am Land |

Owner approves this table before anything is placed.

## Requirements

**From `germanization.md` (Stage 6):**
- [ ] The new order carries `language: 'de'`, set through the product-page selector → `lang=de` URL param, not by hand-editing Firestore.
- [ ] Intro, labour and zodiac text is the **authored** German from Xenia's `*_DE.txt` files, reproduced by the form's own `composeIntroBlock`/`composeLabourLeft`, never re-worded.
- [ ] The zodiac *value* stays the English key `Scorpio` (it keys the SVG path and `copyDe`).
- [ ] `assets/images/mockups/exp2/newborn/de/` is populated with the same crop set as the EN folder.
- [ ] `deImages: true` is set on both `pages/newborn.html` and `pages/de/newborn.html`, and `pages/de/newborn.html` stops hard-coding the EN image paths.
- [ ] A `newborn-de` entry is added to `scripts/exp2-images.mjs` with `out: 'newborn/de'`, mirroring the existing `tender-de` / `scribble-de` / `papercut-de` entries.

**From the caption standards:**
- [ ] No `generateCaption` / OpenAI call is made — all German is translated or authored.
- [ ] German uses correct ß and umlauts; `node scripts/check-font-glyphs.mjs` passes for every face Newborn names.

**From the cost rules:**
- [ ] The photo set uploaded is `assets/test photos/Newborn` (the same images as AEV-071, renamed in S156 — the mapping is `_original-names.txt`), so the book is visually identical to the EN one.
- [ ] Expected spend is stated to the owner before placing the order, and the PDF render is **not** run.

## Plan

1. **Add DE support to `qa/p0-1-template.mjs`** — a `--lang=de` flag that navigates `pages/de/<template>.html` (or appends `lang=de`) and selects German form copy. Currently it hard-codes `${BASE}/${TEMPLATE}.html`.
2. **Place the order** against the deployed rig with the Newborn photo set, German intro/labour answers and the cover captions above. Credentials are in `qa/.env`.
3. **Design the book to match AEV-071 exactly** — AEV-071's `staffBookSequence`, `staffBookAssignments` and `staffHeartCrop` are readable; photo identity maps through `photoManifest.pool[i] ↔ poolOriginalNames[i]`, so the same photo lands on the same page even though upload numbering differs. Captions are the German table above.
4. **Capture** — `qa/capture-cover-wrap.mjs` + `qa/capture-spread.mjs` with `QA_ORDER=<new id>`.
5. **Compose and crop** — `node compose-all.mjs <new id> newborn` from `scripts/`, then the new `newborn-de` entry through `scripts/exp2-images.mjs`.
6. **Wire the gallery** — `deImages: true` on both pages; verify the switch on the deployed rig.

## Constraints

- **Out of scope:** PDF generation, print submission, any Heirloom/monogram work, German artwork (`svgDe`) for Newborn, and the remaining templates' DE sets.
- **Dependencies:** the rig must be deployed and current before capture — the capture scripts read the deployed site, not this machine.
- **No Firestore hand-edits** to create the order; staff-side book state may be set the way the engine sets it.
- Windows file locks make `compose-all.mjs` look like it crashed; loop until exit 0.

## Cost

Placing a real order spends, in rough order of size: **GCS storage + class-A writes** for the Newborn photo set (~170 MB on disk), **two full egress passes** when the capture scripts download the originals, and a handful of Cloud Function invocations. **Real staff and customer emails will fire** from `confirmUpload` — the order will appear on the dashboard as a genuine order and needs marking as a test. No OpenAI spend. No PDF render, which is the expensive one (AEV-071's inside PDF is 176 MB).

## Success criteria

1. Switching to German on the Newborn product page shows a book whose intro page, labour page, cover and every spread caption are in German.
2. The German book is page-for-page the same photos as the English one — a visitor sees the same book, not a different order.
3. `assets/images/mockups/exp2/newborn/de/` matches the EN folder file-for-file, and the switch works on the deployed rig.
4. All requirements above are met.

## References

- `docs/briefs/germanization.md` — Stage 6 definition
- `scripts/exp2-images.mjs:45-83` — the three DE precedents and the EN `newborn` entry
- `assets/js/product.js:76-126` — language selector and `swapGalleryLang()`
- `assets/js/order-strings.js:348-352` — authored German compose strings
- `assets/Template_Newborn/newborn-data.js:315-335` — `copyDe`, `signLabelsDe`
- `assets/test photos/Newborn/_original-names.txt` — photo identity mapping
- `sessions/2026-09-25-s195.md`, `sessions/2026-09-27-s197.md` — the two worked DE-twin precedents

## Context

- **Already decided (owner, this session):** place a real order rather than clone AEV-071 in Firestore; translate the owner's existing captions rather than regenerate them; keep the same baby name and the same content.
- **Known risk:** upload numbering (`photo_NNN`) will differ from AEV-071's, so assignments must be mapped through original filenames, not copied verbatim by name.
- **Known risk:** the new order lands in the live `orders` collection and triggers real email — it must be labelled a test, as AEV-071 itself was (`photoNotes: "TEST FOR THOMAS"`).
