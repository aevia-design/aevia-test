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
- ADRs: `docs/decisions/`
- Unit tests: `tests/` (run with `npm test` from project root)
- QA browser scripts: `qa/` (Playwright via Node; see `qa/README.md` for the script index, reusable techniques + gotchas; run artefacts in `sessions/qa-runs/`, gitignored)

---

## Coding conventions
- Plain HTML/CSS/JS — no frameworks, no build tools
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
npx serve . -p 8080   # from project root
```
Pages: `http://localhost:8080/pages/home.html`  
Engine: `http://localhost:8080/pages/staff/template-engine.html`

---

## Secrets — never commit
`functions/.env` (Gmail credentials), `functions/serviceAccountKey.json` (GCS), `motif-engine/.env` (Replicate token)

---

## Visual changes
After any UI edit: start dev server, check desktop + mobile, verify against `context/design-principles.md`, check browser console. For full review: `/design-review`.
