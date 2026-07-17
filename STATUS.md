# Session Status
_Last updated: 2026-07-17 (session 140)_
_Context at save: **EN copy overhaul is DONE and PUSHED — all 11 marketing pages match the deck, QA-verified.** Next session starts the **German version**. `docs/website-copy-EN.md` is the master and is fully current (every S140 change is mirrored there, including the new "About this template" section) — the DE pass should work from it and NOT re-litigate English copy. `docs/website-copy-DE.md` is ~90% there but predates the owner's edits: it still carries the deleted "Who makes it" block and stale EU-delivery / €15 facts. 🔴 **Fix TO-DOS #79 (wrong book sizes on 3 pages) BEFORE translating** or the error ships in DE too._

## Status
**Session 140 (2026-07-17) — EN copy overhaul complete, committed and pushed.**
1. **All of `docs/website-copy-deltas.md` §1–7 is DONE** — collections.html (card removals, counts, CTAs), all 6 product pages, about.html, help.html (FAQ reordered + 3 factual fixes), our-artists.html (Dorottya's real bio — closes the Joyride bio gate), and the 16-page footer sweep. Verified with `node qa/copy-pass-check.mjs`: no console errors, no overflow, nav centred. Only 404s are known asset gaps (Joyride mockups, Dorottya's portrait) — both have graceful fallbacks.
2. **"About this template" rewritten for all 6** — mood + layout + story pages, boilerplate cut, artist credited **for the book** ("Made in collaboration with X"), not for a single spread. In the deck.
3. **🔴 Product-page spec sheets are NOT a source of truth** — a copy claim built on wander's `33 × 24 cm (landscape)` spec turned out false (owner: all books are 20 × 20). **wander fixed this session**; **newborn/scribble/papercut still say `21 × 21 cm`** → **TO-DOS #79 (High)**, owner only explicitly confirmed wander. Cover/Paper/Binding specs share that placeholder origin — unverified.
4. **Mechanism strip dropped (S140, owner call)** — built as a sidebar strip on 4 pages, reverted same-session. If revisited: full-width, below the CTA panel, above "About this template". See deltas §2a.
5. **Drive/Dropbox upload claim is aspirational** — copy left as-is per owner; logged **TO-DOS #78** with feasibility (both pickers reuse the existing upload pipeline; Dropbox easiest). Ship before real customers.

## Recent decisions
- **Design decisions are Claude's, within `context/design-principles.md` (S139, owner ruling):** the deck's layout instructions are advisory. Its "serif body for the early-access letter" was overruled (serif is headings-only) and deleted from the deck. **`/designing-interfaces` does NOT apply to marketing pages** — it self-scopes to apps/dashboards; `context/design-principles.md` is the yardstick for the website.
- **Mechanism strip dropped (S140):** built once as a sidebar strip above the CTA on 4 product pages, reverted same-session — owner didn't like it there. If revisited, owner wants it full-width, below the CTA panel, above "About this template" (ad-traffic landing directly on product pages is the reasoning).
- **EN wins every DE contradiction (S139):** Austria-only delivery (not EU), €10 Instagram discount (not €15), no "Who makes it" block. The DE file predates the owner's edits and is stale until step 4 harmonises it.
- **"Inside every Aevia book" is a pinned scroll tour (S139):** owner chose it over plain scrolling rows. Native scroll, never hijacked.
- **Imagery is placeholders throughout (S139):** hero occasion photos, the book-tour interiors, and the About studio series don't exist yet. Owner swaps them in later.
- **Photo shoots gate nothing** — build with the warm-grey placeholder SVGs (design principles §VII blesses this).

## Next steps (priority order)
**Next session = the German version (owner's plan).**
0. **First, fix TO-DOS #79** — confirm newborn/scribble/papercut are 20 × 20 and correct their `Format:` spec. Do this **before** translating, or the wrong size gets carried into DE.
1. **DE harmonise** — `docs/website-copy-DE.md` is ~90% done but **stale**: it predates the owner's edits and still has the deleted "Who makes it" block, EU-wide delivery (now Austria-only), and €15 (now €10) Instagram discount. **EN wins every contradiction.** Bring DE in line with the current `docs/website-copy-EN.md`, which includes all S140 work (About-this-template section, story-pages wording, FAQ rewrite, footer tagline).
2. **DE build** — apply the harmonised DE copy to pages. Nothing is templated: every shared string is N inline copies (16 for footers, 6 for product pages). `docs/website-copy-deltas.md` documents where each string lives.
3. **EN/DE switcher in the header** — owner's step 3. Decide toggle-on-same-page vs `/de/` pages (TO-DOS #8 has this open).
4. **48h preview-promise sweep** — owner's step 2, still outstanding: order flow, emails, account still say 24h in places. Marketing pages are already 48h.
5. **The owner tests on the live Cloudflare site, not localhost** — push before asking him to check.

## Open questions
- **Joyride mockups** (owner, on his Windows box) and **Dorottya's portrait photo** still gate the Joyride merge. Her bio is now real (shipped S140).
- **"Twentysix"** (the Budapest restaurant in Dorottya's bio) — spelling unverified; the deck flags it, now live on our-artists.html.
- Xenia, art not code: restyle the FP1 map artwork to Joyride's palette; **outline** the back-cover "Curated by @letdorabe" text.

## Watch-outs for the next session
- **🔴 Don't source facts from the pages you're editing** (S140, the session's main lesson). The product-page spec sheets were wrong (wander claimed landscape 33 × 24; all books are 20 × 20) and marketing prose inherits its own errors. Facts about the product come from the **owner** or **template data** (`assets/Template_*/`) — never from prose written by whoever last touched the file. Grepping all 6 pages and finding they agree proves only that they agree.
- **Copy proposals go in chat for approval BEFORE editing files** (owner directive, S140).
- **Keep `docs/website-copy-EN.md` current as you go** — it's the source for the DE build; the point is to not re-litigate English copy during the German pass.
- **Verify with `node qa/copy-pass-check.mjs <page…>`** (needs `npx serve . -p 8080`). **Args are bare page names, no `.html`** (`… collections about help`) — passing `collections.html` 404s every page. No args = all 11 marketing pages. Checks console errors, horizontal overflow, nav centring; shoots desktop + mobile into `sessions/qa-runs/`.
- **Known QA 404s that are NOT regressions** — Joyride's mockups (`mockups/exp2/joyride/*`, owner is producing them on Windows) and Dorottya's portrait (`assets/artists/dorottya-juhasz/*`). Both degrade gracefully (`phBroken()` / `onerror`). Don't chase them.
- **Background agents can die silently** — a 15-page audit agent vanished after 20+ min with no notification and no task ID. Three scoped agents did the same work in ~90s each. Split broad work; poll with `TaskOutput(block:false)` if an agent is quiet >10 min.
- **`text-wrap: balance`** is on card/block headings to kill orphan words — keep it on new headings.
- **Nav fix is desktop-scoped on purpose** (`min-width: 769px` in mobile.css) — below 768px the nav wraps into the burger and relies on flex `order`, which `flex: 1 1 0` would break.
- **The pinned tour must not hijack scroll** — it only pins and crossfades; wheel/keyboard stay native. Its JS is gated behind `matchMedia('(min-width: 769px)')`.
- **Artist form already posts to `partners@aevia.at`** (`functions/email.js:36`) — copy-only changes there, don't touch the wiring.
- **Any new customer-facing copy needs a `/stop-slop` pass** (per CLAUDE.md) — but the owner wants it **flag-only with suggestions for approval**, never silent rewrites of good sentences.
- **Joyride/PDF watch-outs are unchanged from S137** and still live: `gcloud` is installed but off PATH (`export CLOUDSDK_PYTHON=/home/codespace/google-cloud-sdk/platform/bundledpythonunix/bin/python3; export PATH=$PATH:/home/codespace/google-cloud-sdk/bin`); `gcloud run deploy --source .` ships the **working tree, not HEAD**; the renderer currently carries `1fb5986` — redeploy if `git diff 1fb5986..HEAD -- assets/ scripts/export-pdf.js` is non-empty, since it fails **silently**; never `--allow-unauthenticated`; always `europe-west1`.

## Untracked / flagged (not this session)
- `assets/SiteFlowOpenAPI.json` — untracked 395 KB vendor spec, predates S134; deliberately left out of every commit (S140 too).
- `qa/_tmp-measure-edit.mjs` — S136 throwaway, still unadopted and still uncommitted. Delete or adopt.
- `assets/Template_Joyride/*` (`Joyride_sizing_full.csv`, `joyride-data.js`) — modified working-tree files from the Joyride sessions, still uncommitted; deliberately left out of the S140 commit as unrelated to the copy work.
- **No `sessions/2026-07-15-s134.md` exists** and there is no S138 log — historical gaps only.
