# Session Status
_Last updated: 2026-08-04 (session 150)_
_Context at save: **The pre-launch QA gate is essentially cleared.** P0 and P1 were already green; P2 ran end to end this session — 12 cases, 4 findings, 2 product fixes shipped and verified on the live rig. TO-DOS #88, the upload failure that dominated three sessions, is **closed on the owner's call without a proven root cause**. Working tree clean and pushed. One decision waits on the owner: whether a customer can resume a failed upload (#90)._

## Status
**Session 150 (2026-08-04) — P2 QA complete, two product fixes live, #88 closed.**

1. **P2 QA batch: 12 of 12 cases run.** Findings in `work/pre-launch-qa/findings-p2.md`.
   Cost only **two new orders** — ten cases either never reach the backend or reuse existing
   ones, honouring the S126 "reuse, don't mint" directive. Five new scripts (`qa/p2-*.mjs`),
   none of which need the still-absent `qa/test-photos/`.
2. **Two product fixes shipped and verified live.**
   - **#92** — `confirmUpload` treated HTTP errors as success (`fetch` only rejects on network
     failure), so a 500 showed the customer a success screen while the order stranded at
     `uploading` with every photo already in GCS. Now checks `res.ok` and retries 3× (the
     handler is idempotent), reporting to staff on final failure. Verified: AEV-078 came out
     `status: new`, `uploadComplete: true`.
   - **#93 / F-P2-01/02** — `.txt` and `.pdf` were accepted into the photo grid and **counted
     toward the required photo total**; a text file renamed `.jpg` got in too. Now rejected on
     both axes (not an image / will not decode), each with a message to the customer.
3. **#88 CLOSED — owner's call, root cause never proven.** Xenia had left the upload tab open
   a long time; a fresh order completed normally. **Read `docs/briefs/upload-failures.md`
   before reopening.** It was **100% deterministic** (four Papercut orders, each missing
   exactly `special_pages/fp4.png`), the template is ruled out, the file genuinely was sent,
   the S147 diagnostics **never fired** (shipped two hours after the last failure), and it does
   not reproduce in Chromium.
4. **Codex wired in as an independent reviewer.** `AGENTS.md` at the repo root gives it the
   invariants and a settled-decisions list. Use the personal `delegating-to-codex` skill, not
   the plugin's herdr-based one. Strong at demolishing a *stated* mechanism, unreliable at
   proposing root causes — **verify every claim before relaying it**.
5. **The dependency rule was recorded wrong.** There was never a "no new dependencies" rule —
   the frontend already loads exifr, heic2any, Geoapify and Firebase. The real constraint is
   **delivery**: no build step, no npm on the frontend. Reworded in `CLAUDE.md` and `AGENTS.md`.

## Recent decisions
- **#88 closed without root cause (S150, owner).** Xenia's account: tab left open a long time,
  fresh order fine. Evidence and the unexplained asymmetry are recorded in the brief.
- **Resume-on-failure: recommendation made, NOT decided (S150).** See next steps.
- **Codex is for second opinions, not routine work (S150).** Not for running tests, not on a
  schedule. One review of #88 earned its keep by killing a wrong mechanism.
- **AEV-042 consumed deliberately (S150, owner).** Used for P2-6/P2-7; now `paid`.
- **QA scripts must verify order ownership before asserting (S150).** A loose `/AEV-\d{3}/`
  scrape graded one of Xenia's real orders and produced two confident, false findings.
- **Business case parked (S148/S149, owner).** Personal/aevia boundary needs agreeing with Xenia.
- **CAC modelling deprioritised (S149, owner).** Needs a real pilot budget first.
- **TO-DOS #86 downgraded, not closed (S149, owner).** Re-verify on a clean iPhone before F&F.
- **Price is an OUTPUT of the business case, not an input (S148).**
- **No price rise at launch (S148, owner).**
- **Working assumption: 20% VAT on photo books (S145, owner).** Steuerberater to confirm.
- **The live site stays `noindex` until launch (S144)** — TO-DOS #81.

## Next steps (priority order)
1. **Decide the resume question (#90).** `/solutioning` recommendation in
   `sessions/2026-08-04-s150.md` §6: ship #89's staff-side visibility **plus** a client-side
   "your upload was interrupted" recovery (today a refresh shows "Choose a template first"),
   and **defer** a real resume link until a root cause is known. **Owner's call.**
2. **Finish P2-12.** Confirmation and payment emails verified; **preview-ready and dispatch are
   not**. Needs a lifecycle run (`p0-2`, `p0-3`) on an existing order. The real-client
   render/spam check is the owner's and cannot be scripted.
3. **Triage the two open findings.** F-P2-03 (preview side-scrolls 64px at 1440, both engines,
   `div.spread-pages`, cosmetic) and F-P2-04 (= #89/#90).
4. **TO-DOS #91** — pin and vendor the four CDN libraries before launch. No build step needed.
5. **Cleanup (#60)** — AEV-078 (hostile text, **never use as a demo book**), AEV-079 (ghost),
   AEV-080, plus the older stranded orders in #90.

## Open questions
- **Can a customer resume a failed upload?** (#90) — recommendation made, not decided.
- **Staff test password is now `Claude-test`** — set via the Admin SDK (Firebase stores only a
  hash, so it cannot be looked up). Weak for an account that can read real customer orders;
  change before launch.
- **`qa/.env` was recreated this session** after the machine migration lost it. Gitignored and
  local-only — it will not survive another migration either.
- **`qa/test-photos/` is still missing.** `p0-1-template.mjs` and `p2-upload-probe.mjs` cannot
  run until it is restored, or until they point at `assets/test photos/` as the P2 scripts do.
- **`ARCHITECTURE.md` has two invariants numbered 6** (hostname rule, centre-based
  coordinates), so everything after is off by one. `AGENTS.md` renumbers 1–9; the two disagree.
