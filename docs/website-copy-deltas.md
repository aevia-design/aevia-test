# Website copy overhaul — per-page deltas (EN)

_Generated S139 (2026-07-17) from a full audit of `docs/website-copy-EN.md` (the master deck)
against the live pages. **This file exists so no future session has to re-run that audit.**_

**How to use:** the deck is the source of truth for *what the copy says*; this file is the source of
truth for *what has to change where*. Line numbers are from the audit and are **approximate** —
they shift as you edit. Grep the quoted "current" string rather than trusting the number.

**Status:** ✅ `home.html` DONE (S139). Everything below is outstanding.

**Design authority:** `context/design-principles.md`, not the deck's italic layout notes — those are
advisory (owner ruling, S139). `/designing-interfaces` does NOT apply to these pages; it self-scopes
to apps/dashboards.

**Verify each page after editing:** `npx serve . -p 8080` then `node qa/copy-pass-check.mjs <page>`.

---

## 1. collections.html ✅ DONE (S140)

**Meta title** — `Our Collections — Aevia` ✅ already matches.

**Intro sub** (~L226) — em-dash → comma:
- current: `Every template is designed for its occasion — not adapted from a generic grid. Choose your moment, choose your size.`
- deck: `Every template is designed for its occasion, not adapted from a generic grid. Choose your moment, choose your size.`

**Cards to DELETE** (no books exist yet):
| Card | Lines (approx) | Section |
|---|---|---|
| Devotion | 257–273 | Love |
| Radiance | 275–291 | Love |
| Horizon | 343–359 | Adventures |

Sprout has no card here — nothing to remove.

**Section counts must follow the deletions:**
- Love (~L235): `3 templates` → `1 template`
- Adventures (~L300): `3 templates` → `2 templates`
- Kids: stays `3 templates`

**Card copy deltas** (the six that stay):
| Card | Current | Deck |
|---|---|---|
| Tender (~244) | unchanged ✅ | — |
| Wander (~310) | unchanged ✅ (collab line + desc both match) | — |
| Joyride (~331) | `Colourful, joyful, emotional. For summer getaways, city tours, and dolce moments.` | `Colourful and sun-soaked. For summer getaways, city tours, and the dolce vita days you'll want back.` |
| Newborn (~378) | `Gentle and considered. For the first days — the birth story, the early details, and everything tiny worth keeping.` | same but em-dash → colon: `…For the first days: the birth story…` |
| Scribble (~396) | `…and the chaos that you'll one day miss.` | drop "that": `…and the chaos you'll one day miss.` |
| Papercut (~414) | `Playful shapes, bold colours — a book that looks like childhood feels. Paper-cut forms layered over photos.` | `Bold shapes, bright colours: a book that looks the way childhood feels. Paper-cut forms layered over your photos.` |

**CTA label — all remaining cards** (~L253, 271, 289, 320, 339, 357, 387, 405, 423):
`Order this template` → `Start your book`

Prices: cards already render `€ 70` live from `BOOK_PRICES` — no change needed.

---

## 2. Product pages — SHARED (apply to all 6 inline; nothing is templated) ✅ DONE (S140)

Pages: `tender` `wander` `joyride` `newborn` `scribble` `papercut`.
Shared JS is only `prices.js` + `product.js` (price toggle, gallery, accordion) — none of the copy
below is templated, so **every edit is repeated 6×**.

### 2a. DROPPED — the mechanism strip (S140, owner)
The deck's mechanism strip (`Send your photos → preview in 48h → pay when you approve`) was
built as a sidebar strip above the CTA on 4 pages (tender/wander/joyride/newborn), then reverted
same-session. Owner: a slim sidebar line reads poorly; if it comes back it should be a **full-width
section below the CTA panel and above "About this template"**, reasoning being ad traffic lands
directly on the product page and needs to see the process before "About this template". Not
pursuing now — dropped for good unless owner revisits.

### 2b. Story-pages header — unify
- `Optional spreads — all free` → **`Story pages. All free.`** (tender ~51, wander ~50, joyride ~74, scribble ~53, papercut ~53)
- **newborn ~L50 is the outlier**: `Special spreads — all free` → same target.
- Intro note — deck prepends a sentence:
  - current: `Add any you'd like; tap an image to preview it above.`
  - **wander ~L51 differs**: `Add it if you'd like; tap the image to preview it above.`
  - deck: `Pages for what photos can't hold. Add any you'd like; tap an image to preview it.` (S140 follow-up: dropped "above" — not always accurate depending on layout)

### 2c. Print & production — remove "Produced in Vienna"
Current bodies all carry it, with the dispatch claim **5–7 business days** — which now contradicts
the 2-business-day dispatch promise. The deck's replacement removes the sentence entirely:
- tender ~79, wander ~68, joyride ~97, newborn ~73, scribble ~91, papercut ~91.
- deck target: `Printed on 170gsm FSC-certified matte art paper. Hardcover case-bound.`
  + `Designed in Vienna · Printed in the EU`
- The Format/Cover/Paper/Binding `<ul>` specs **stay**.

### 2d. Preparing your photos — remove photo counts
- tender ~80 / joyride ~98: `A 40-page book uses 40–60 photos; 80 pages uses 80–110.`
- newborn ~74 / scribble ~92 / papercut ~92: `A 40-page book uses 35–50 photos; 80 pages uses 70–90.`
- wander ~69: no count sentence, already close.
- deck: `JPG, PNG and HEIC all work, up to 40 MB per photo. We'll tell you the ideal photo range when you order.`
- Keep the min-resolution / sRGB / upload-source `<ul>` items.

### 2e. Delivery — Austria only
Current lists several countries (e.g. tender ~81, joyride ~99, newborn ~75):
`Austria: 2–3 business days / Germany, Switzerland: 3–4 / Rest of EU: 5–7 / UK, USA: 7–10`
(+ "Express available at checkout" on tender/joyride/newborn; "Standard shipping included." on wander ~70, scribble ~93, papercut ~93).

Deck:
> `Preview in 48 hours → you approve → printed and dispatched in 2 business days → delivery: Austria 7 business days`
> `Shipping costs are shown at checkout before you pay.`

### 2f. Price line — ✅ no change
Chips already read `40 pages € 70` / `80 pages € 100`; `.price-row` already reads
`€ 70 incl. design & printing`.

---

## 3. Product pages — PER-PAGE taglines ✅ DONE (S140)

| Page | Current tagline | Deck |
|---|---|---|
| **tender** (~L43) | `Your wedding day, composed with the stillness it deserves.` | ✅ unchanged |
| **joyride** (~L65) | `For bright city escapes and the easy joy of a summer away.` | ✅ unchanged |
| **wander** (~L41) | `Built for travel — open landscapes and the feeling of going somewhere.` | `Open landscapes and the feeling of going somewhere.` (drop the prefix) |
| **newborn** (~L42) | `The first days — the birth story, the tiny details, and the little one at the centre of it all.` | `For the first days, with the little one at the centre of it all.` |
| **scribble** (~L45) | `For the scribbling, tumbling, discovering years — captured before they grow too fast.` | `For the scribbling, tumbling, discovering years. Captured before they grow too fast.` |
| **papercut** (~L45) | `Playful shapes, bold colours — a book that looks like childhood feels.` | `For the age when every day is an art project.` (**full replacement**) |

Notes: joyride has an extra `phBroken()` placeholder-fallback script + `.ph-fallback` CSS (~L10–32)
for its missing mockups — not a copy issue, leave it.

---

## 4. about.html ✅ DONE (S140)

**Meta title** `About Us — Aevia` ✅ matches.

| Where | Current | Deck |
|---|---|---|
| H1 (~L190) | `What Aevia<br>is about.` | **`The opposite of a blank screen.`** |
| Body (~L204) | `A small kitchen with a short menu, every dish perfected, beats a wall of options you have to second-guess.` | `Think of a small kitchen with a short menu, every dish perfected: it beats a wall of options you have to second-guess.` |
| Body (~L205) | `So we built the opposite of a blank screen. A few templates, each designed with artists…You see it finished before you pay anything.` | `So we built the opposite of a blank screen: a small studio in Vienna, a few templates, each designed with artists and illustrators we work with directly. You choose the one that fits your occasion, send your photos, and we compose the book by hand. You see the finished book, and pay only then.` |
| Early-access sub (~L244) | `Aevia is in early access. Each order gets our direct attention and care.` | `The first books are being made now, and each order gets our direct attention. We'd love your book to be one of the first.` |

Unchanged ✅: eyebrow `About us`, body L201/L202/L203/L206, closing `Fewer choices. A book worth keeping.`,
`We're just getting started.`, CTA label `Create your first book`, cta-note.

**Structural:** the `.img-break` block (~L212–237) has 3 placeholder SVGs and **no caption** — deck
wants the studio photo series (3–4 frames) with caption **`The studio, most days.`** Placeholders
stay until the owner shoots Set F.

**Check:** the early-access CTA (~L245) points at `home.html#collections` — kept deliberately in S139.

---

## 5. help.html — ⚠ contains a factually wrong claim, ships first ✅ DONE (S140)

**Meta title** `Help — Aevia` ✅ matches. Header/tag/sub ✅ unchanged.

### 🔴 Wrong facts (not just off-deck)
| Q | Current | Deck |
|---|---|---|
| `Do you deliver outside Austria?` (~L323) | **`Yes — we currently deliver across the EU`** | **`No, currently we deliver only in Austria.`** + `More countries coming soon. After you approve your preview, your book is printed and dispatched in 2 business days. Delivery takes 7 business days in Austria. Shipping costs are shown at checkout before you pay.` |
| `How many photos do I need?` (~L287) | `between 50 and 80 photos` | `It depends on the template and page count. We'll tell you the ideal range when you order.` |
| `What photo formats can you accept?` (new, S166) | absent | closed list + 40 MB cap + RAW instruction + the iCloud Shared Album 2048px warning. Full text in `website-copy-EN.md`. |
| `How does ordering work?` (~L299) | mentions **"two layout options"** (doesn't exist) | deck body, ending `You pay only then, and your book goes to print.` |

### Structure
- **DELETE** `How much does delivery cost?` (~L335) — placeholder ("Delivery pricing coming soon"); the deck folds shipping cost into the delivery answer.
- **ADD** `What if I don't like my preview?` — deck's Q2, currently missing entirely.
- **REORDER** to deck sequence: ordering → don't-like-preview → pay → how-many-photos → printed-look → softer-preview → quality → delivery. (Current order is scrambled: printed-look, softer, quality, how-many, ordering, pay, deliver-outside, cost.) Deck has **8** questions.

### Minor
- `How do I pay?` (~L311): `after you approve your book layout` → `after you approve your book`; deck also cut "a secure, industry-standard payment processor" → `We accept all major credit and debit cards via Stripe. You're only charged after you approve your book, never upfront.`
- `What quality should my photos be?` (~L273): US `color` → `colour`; `sRGB color profile` → `the sRGB colour profile`.
- Printed-look answer: minor em-dash/wording diffs vs deck.

### Contact section
| Where | Current | Deck |
|---|---|---|
| label tag (~L354) | `Get in touch` | `Contact` |
| sub (~L356) | `We're here to help. Reach out anytime.` | **delete** (owner-approved stop-slop cut) |
| Instagram note (~L382) | `DM us — we're active and responsive.` | `DM us, we read everything.` |
Unchanged ✅: `Still have questions?`, `hello@aevia.at`, `We typically reply within one business day.`

---

## 6. our-artists.html ✅ DONE (S140)

**Meta title** ✅ matches. Correctly absent from top nav ✅ (deck: keep it out).

### 🔴 Dorottya Juhász — placeholder content (also gates the Joyride merge)
- meta (~L120) reads **`Bio coming soon`** → should be `Vienna` (+ `In collaboration on Joyride`)
- bio (~L123–124) is **lorem ipsum** → replace with the deck's real two paragraphs
  (`Dorottya Juhász was born and raised in Hungary…FranzJohann.` / `Her illustration style is
  unmistakably her own…Twentysix restaurant in Budapest.`)
- ⚠ deck flags: **verify the spelling "Twentysix"** (Budapest restaurant) before shipping.
- `See Dorottya's work →` link exists ✅ → `https://www.instagram.com/letdorabe/`

### Kevin Lucbert ✅
Bio matches the deck; `See Kevin's work →` → `https://www.instagram.com/kevinlucbert/?hl=en`.
Meta shows location; "In collaboration on Wander" sits separately (~L105) — fine.

### Copy deltas
| Where | Current | Deck |
|---|---|---|
| intro (~L89) | `…So we work with artists. An illustrator or designer shapes each template, and you feel their hand on every page that holds your photographs. Every collaboration is its own…` | `…So we work with artists. Every template is shaped by an illustrator or designer. On some, their work lives on the cover; on others, it runs through every spread. Every collaboration is its own…` |
| form intro (~L137) | `…Tell us a little about your work — we read every message.` | `…Tell us a little about your work. We read every message.` |
| confirmation (~L161) | `Thank you. We have your work and will be in touch. Every message reaches a real person.` | `Thank you. Your message is with us, and we'll be in touch. Every message reaches a real person.` |

Unchanged ✅: hero eyebrow + H1 `The art in your hands`, second intro para, `Work with us` H2, all form
field labels (`Name` / `Email` / `Where can we see your work?` / `A few words about you (optional)` / `Send`).

**Do not touch the form wiring** — it already posts to `partners@aevia.at` (`functions/email.js:36`).

---

## 7. Footer sweep — 16 pages ✅ DONE (S140)

Footer markup is **inline-duplicated on every page**, not a shared include.

**Pages:** about, account, collections, help, home ✅(done), our-artists, tender, wander, joyride,
newborn, scribble, papercut, sprout, devotion, horizon, radiance.
(order.html and customer-preview.html have no marketing footer; spread-preview.html has a different one.)

**1. Tagline — two wrong variants, neither matches the deck:**
- on **about.html** only (home.html already fixed):
  `A premium photo book studio in Vienna. We design and make your book; it's yours to keep.`
- on the other 14:
  `A premium photo book studio in Vienna. We design and print; you keep forever.`
- **→ deck:** `Photo book studio in Vienna. We design and make your book. Yours to keep.`

**2. Company column** — relabel the existing link (it already points to the right page):
`Our artists` → **`For artists`** (→ `our-artists.html`)

Use **home.html as the reference implementation** — it already has both changes applied.

---

## Cross-cutting notes

- **Orphan pages** — `sprout.html`, `devotion.html`, `radiance.html`, `horizon.html` stay on disk,
  unlinked once collections drops their cards. Owner's call (S139): the books may exist one day.
  They still get the footer sweep so nothing on disk carries stale copy.
- **Dispatch timing conflict** — the old "5–7 business days" in Print & production contradicts the
  new 2-business-day dispatch. The deck's replacement text removes the sentence, resolving it.
- **`text-wrap: balance`** on new card/block headings — kills orphan words (owner asked, S139).
- **Nav centring** is fixed globally in `assets/css/mobile.css` (S139) — don't "fix" it per page.
