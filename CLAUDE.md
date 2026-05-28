# Aevia — Project Guide for Claude Code

## What is Aevia
Premium photo book service (Vienna). Customers order, upload photos; staff design and send a preview; customer approves and pays; book goes to print. Moving from fully manual toward semi-automated with a browser-based staff template engine.

**Live site:** https://aevia-test.pages.dev/pages/home  
**Target domain:** https://aevia.at  
**Brand:** Premium, editorial, art-forward. Serif typography, generous whitespace, off-white/near-black.

---

## Session start
Read these in order before doing anything:
1. `STATUS.md` — current build state and immediate next steps
2. `PRD.md` — product requirements (MoSCoW, acceptance criteria)
3. `ARCHITECTURE.md` — system design, codemap, invariants, data flow
4. `sessions/<latest>.md` — recent decisions and watch-outs
5. `docs/decisions/` — ADRs for key architectural choices

---

## Key references
- Product requirements: `PRD.md`
- Architecture + codemap: `ARCHITECTURE.md`
- Implementation roadmap: `ROADMAP.md`
- Build status + next steps: `STATUS.md`
- Design principles: `context/design-principles.md` (website + staff engine)
- Customer engine design spec: `.interface-design/system.md`
- Style guide: `context/style-guide.md`
- Customer journey: `context/customer-journey-v1.md`
- Session logs: `sessions/`
- ADRs: `docs/decisions/`
- Unit tests: `tests/` (run with `npm test` from project root)

---

## Coding conventions
- Plain HTML/CSS/JS — no frameworks, no build tools
- Inline styles acceptable for one-off layout tweaks
- Nav/footer: copy pattern from an existing page
- Asset paths from `pages/`: `../assets/images/filename`
- Page-to-page links within `pages/`: bare filename, no path prefix
- Owner is new to coding — explain non-obvious decisions briefly

---

## Local dev
```bash
npx serve . -p 8080   # from project root
```
Pages: `http://localhost:8080/pages/home.html`  
Engine: `http://localhost:8080/pages/template-engine.html`

---

## Secrets — never commit
`functions/.env` (Gmail credentials), `functions/serviceAccountKey.json` (GCS), `motif-engine/.env` (Replicate token)

---

## Visual changes
After any UI edit: start dev server, check desktop + mobile, verify against `context/design-principles.md`, check browser console. For full review: `/design-review`.
