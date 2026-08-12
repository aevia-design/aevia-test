# Aevia — Project Guide for Claude Code

## What is Aevia
Premium photo book service (Vienna). Customers order, upload photos; staff design and send a preview; customer approves and pays; book goes to print. Moving from fully manual toward semi-automated with a browser-based staff template engine.

**Live site:** https://aevia.at/pages/home (production, since S144)  
**Test rig:** https://aevia-test.pages.dev/pages/home — ordering works here; production is gated to a waitlist until launch (ADR-0009)  
**Brand:** Premium, editorial, art-forward. Serif typography, generous whitespace, off-white/near-black.

---

## Session start
Read these in order before doing anything:
1. `STATUS.md` — current build state and immediate next steps
2. `PRD.md` — product requirements (MoSCoW, acceptance criteria)
3. `ARCHITECTURE.md` — system design, codemap, invariants, data flow
4. `sessions/<latest>.md` — recent decisions and watch-outs
5. `docs/decisions/` — ADRs for key architectural choices

## Session end
Whenever you run **checkpoint** or **handover**, end your reply by telling the user
which session just completed, e.g. "✅ Session 27 logged — start the next with
'Session 28'." The session number comes from the latest `sessions/` log / STATUS.md.

---

## Key references
- Quick links (local + live URLs): `LINKS.md`
- Product requirements: `PRD.md`
- Architecture + codemap: `ARCHITECTURE.md`
- Implementation roadmap: `ROADMAP.md`
- Build status + next steps: `STATUS.md`
- Numbered backlog (referenced as "TO-DOS #NN" throughout): `TO-DOS.md`
- Codified insights from past sessions (read before repeating an old mistake): `LEARNINGS.md`
- Captured ideas / future directions: `ideas.md`
- Design principles: `context/design-principles.md` (website + staff engine)
- Customer engine design spec: `.interface-design/system.md`
- Style guide: `context/style-guide.md`
- Pricing (summary; `assets/js/prices.js` is canonical): `docs/pricing.md`
- Website copy (EN master / DE mirror): `docs/website-copy-EN.md`, `docs/website-copy-DE.md`
- Per-page copy deltas (what changes where; don't re-audit): `docs/website-copy-deltas.md`
- Customer journey: `context/customer-journey-v1.md`
- Session logs: `sessions/`
- Business-case financial model: `assets/Aevia - Business case v11.xlsx` (**use v11, v10 is corrupted**).
  Edit via openpyxl with Excel closed; no calc engine here so verify numbers by opening in Excel.
  Tabs: Business case - Quarterly view, Marketing (drives orders + spend), Assumptions, Tax & Founder income.
  Assumptions challenged + sourced in `docs/briefs/marketing-assumptions-research.md`.
- ADRs: `docs/decisions/`
- Guidance for **non-Claude agents** (Codex etc.): `AGENTS.md` — invariants, settled decisions
  that must not be re-raised, and a reviewer protocol. Keep it in step with this file.
- Investigation briefs: `docs/briefs/` — one per feature or problem, incl. deferred decisions
  (e.g. `ios-app.md`, `google-signin-ios.md`). **Check here before re-researching something.**
  - **`photo-formats.md` — the accepted-format policy (S164). Read before touching the upload
    path, `isImageFile`, or anything that decides what counts as a photo.** One list lives in
    `assets/js/photo-utils.js` (`PHOTO_FORMATS`: JPG/PNG/HEIC/HEIF, 40 MB) and every surface
    reads it — six places used to disagree. **Two invariants:** the client's HEIC brand list
    (`isHeicMagic`) must stay identical to the server's, which is **third-party code we do not
    own** — `functions/node_modules/heic-decode/lib.js` (a transitive dependency of
    `heic-convert`), six brands: `mif1, msf1, heic, heix, hevc, hevx`. Verified identical S166.
    **It can change on any dependency update, silently** — re-check it after bumping
    `heic-convert`. And any change
    to the accepted list must change `functions/derivative-utils.js` `isImageFile()` in the same
    commit or accepted photos get no web derivative. Competitor baseline in
    `photo-formats-competitor-baseline.md`; audit trail in `work/photo-formats/`.
    ⚠ **HEIC decode cannot be tested locally on Windows** — sharp here has no HEVC plugin, and
    `.metadata()` is a header read, not a decode.
  - `upload-failures.md` — **CLOSED S150** (owner's call; root cause never proven). Instrumentation
    is deployed and untriggered. Read it before touching the upload path or re-diagnosing a stall:
    it records what was ruled out, and the one variable never tested.
  - ⚠ **`print-api-integration.md` is obsolete** — it was written for Site Flow, which the
    2026-08-05 call ruled out. Its replacement is `printsmarter-api.md` (the print house's real
    API contract), with the integration brief in `work/print-api/brief.md`. **Merged to `main` in
    S156** along with `functions/printsmarter.js` and its tests — no branch or worktree needed.
    The integration is deployed nowhere and cannot fire: it needs `PRINTSMARTER_PRODUCT_ID` set,
    `PRINTSMARTER_LIVE=true`, functions deployed, and the postback URL sent to them.
- Cover geometry is page-count dependent: `work/spine-geometry/brief.md` is the authority for the
  numbers (40pp → 10mm spine, 80pp → 14mm). **A cover SVG's viewBox must frame the TRIM
  (409×200mm) with bleed outside it** — a full-bleed viewBox renders 8% small with a blank band
  down the cover edge. `tests/cover-svg-viewbox.test.js` enforces this; run `npm test` after any
  SVG re-export from Xenia, and do not trust `qa/verify-spine-s152.mjs` alone (it checks element
  positions, not whether the artwork landed). **The 409mm trim assumes a 9mm reference spine —
  Heirloom's covers are authored at 10mm (410mm) and declare `referenceSpineMm: 10`.**
  ⚠ **A Xenia drop is an input to VALIDATE, not a spec to implement** — filled photo windows,
  mixed bleed conventions and stray viewBoxes have each cost a session. See LEARNINGS (S157)
  for the pre-flight checks, and re-apply any in-repo SVG patch after a re-export.
  ⚠ **Artwork can carry text the code knows nothing about.** Wander's cover shipped with the
  album name outlined into it, under the customer's caption, and it would have printed (S165).
  **Outlined text is invisible to `grep` and to a DOM query** — the SVG loads as an `<img>`.
  Run `node qa/probe-cover-svg-text.mjs` (renders all ten cover SVGs standalone, ~20s) on any
  drop, and never copy a template's `placeholder` from wording baked into its artwork.
  The durable upstream fix for the viewBox: **Illustrator writes the artboard as the viewBox**,
  so the artboard must BE the trim (409×200mm) with 18mm bleed in Document Setup.
- **Heirloom letter geometry is machine-checked**: `node scripts/check-heirloom-letters.mjs`
  compares all 24 monogram-letter coordinates per colourway against the two sizing CSVs and
  enforces `with-bleed = without-bleed + 3` (interior) / `+ 18` (cover). Run it after ANY CSV
  change; `--write` syncs the data files (xMm/yMm only, ink colours untouched). Two separate
  nudges have already lost the bleed offset — see LEARNINGS (S161).
- **Mockup capture runbook for Heirloom's 12 image sets**: `docs/briefs/heirloom-build.md`,
  Stage 8. One order per colourway, three monograms each via `QA_MONOGRAM`. Product pages read
  `assets/images/mockups/exp2/<template>/` (from `exp2-images.mjs` + `compose-flat-mockup.mjs`)
  — **NOT** the older `mockups/<template>/` that `web-mockups.mjs` writes (the collections
  card is the exception: it reads `mockups/<template>/closed.webp`).
  **A new template needs an entry in BOTH `scripts/compose-all.mjs` and
  `scripts/exp2-images.mjs`** or the pipeline cannot run for it at all — see LEARNINGS (S167).
- In-build template: **Heirloom** (`docs/briefs/heirloom-build.md` is the build-state doc —
  read it before touching anything Heirloom). Four colourways (only Beige exists) as separate
  registry keys, three family monograms that select artwork per order.
- Unit tests: `tests/` (run with `npm test` from project root)
- **`npm test` does NOT execute `pages/order.html`** — those tests mirror its logic rather than
  running it, which is how a crash reached the live rig in S154 with 281 tests green. Before
  pushing any change to the order form run `npm run qa:order` (mocked, no cloud cost, ~1 min).
  A `.githooks/pre-push` hook does this automatically; it needs `git config core.hooksPath
  .githooks` once per clone. See LEARNINGS.md (S156).
- QA browser scripts: `qa/` (Playwright via Node; see `qa/README.md` for the script index, reusable techniques + gotchas; run artefacts in `sessions/qa-runs/`, gitignored).
  Pre-launch QA plan + findings: `work/pre-launch-qa/` (`case-catalogue_v1.md` is the sign-off
  gate; `findings_v1.md` P0, `findings-p1-*.md`, `findings-p2.md`). **P0/P1/P2 all run as of S150.**
  `qa/.env` and `qa/test-photos/` are gitignored and local-only — `test-photos` is currently
  MISSING, so prefer `assets/test photos/` as the P2 scripts do.

---

## Coding conventions
- Plain HTML/CSS/JS on the frontend — no frontend framework, no build step, no npm on the frontend
- Third-party libraries ARE allowed and already used (exifr, heic2any, Geoapify, Firebase SDK).
  The constraint is delivery, not dependency: a frontend library must work as a plain
  `<script>` tag. Backend and tooling (`functions/`, `scripts/`, `services/`, `qa/`) use npm
  normally. Ask before adding one either side.
- Inline styles acceptable for one-off layout tweaks
- Nav/footer: copy pattern from an existing page
- Asset paths from `pages/`: `../assets/images/filename`
- Page-to-page links within `pages/`: bare filename, no path prefix
- Owner is new to coding — explain non-obvious decisions briefly

---

## Customer-facing copy
Any new or edited **customer-facing** copy — anything a customer reads: product and
marketing pages, the order form, `customer-preview`, `help`/FAQ, and transactional
emails — gets a **`/stop-slop` pass before it ships** (cut filler, remove em dashes,
prefer active voice). Staff-only screens (`pages/staff/**`, the dashboard, the engine
UI) are exempt.

---

## Cost awareness (cloud spend)
The owner is non-technical and cannot easily predict cloud costs. Before anything
that touches Google Cloud / Firebase infra (a new service, region, bucket, function,
or a change to how data moves), **always reason about cost-efficiency first** — not
"cheapest", but the most cost-efficient solution for the need — and **flag expected
cost + the main cost driver in plain language before acting.** Watch especially for:
- **Egress** (data leaving GCS to the internet, or crossing regions) — the usual
  surprise. Co-locate compute and storage in the same region (see ADR-0005, ADR-0006).
- **Region mismatches** — keep storage, functions, and Cloud Run in the same region.
- **Idle billing** — e.g. Cloud Run `--no-cpu-throttling` / min-instances, always-on.
- Anything that scales per-photo or per-order on a large book (1–4 GB/order).

Goal: no surprise charges. If a cost can't be predicted, say so and suggest how to
bound or measure it before committing.

---

## Local dev
```bash
npx http-server . -p 8080 -c-1   # from project root
```
Use `http-server`, **not** `npx serve` — `serve` 404s and strips the `?token=` query locally.
Always use the `.html` form locally; clean URLs are a Cloudflare feature and 404 on both local servers.

Pages: `http://localhost:8080/pages/home.html`  
Engine: `http://localhost:8080/pages/staff/template-engine.html`

---

## Secrets — never commit
`functions/.env` (Gmail credentials), `functions/serviceAccountKey.json` (GCS), `motif-engine/.env` (Replicate token)

---

## Visual changes
After any UI edit: start dev server, check desktop + mobile, verify against `context/design-principles.md`, check browser console. For full review: `/design-review`.
