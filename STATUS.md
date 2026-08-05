# Session Status
_Last updated: 2026-08-05 (session 153)_
_Context at save: **The spine work is verified in real PDFs and committed** (`f181a5c`) — the owner rendered Tender covers at 40pp and 80pp from the dashboard and both were correct, with no colour seam. **Committed but NOT pushed.** `pages/order.html` (S151 stall detection, still unverified) was deliberately left out of that commit and remains uncommitted in the tree._

## Status
**Session 153 (2026-08-05) — spine geometry proven in print and committed. Caption boxes now live in the cover CSVs.**

1. **The 9mm hardcoded spine is gone.** Printsmarter specified **10mm at 40pp, 14mm at 80pp**.
   Because the cover is one flat sheet (back | spine | front), the old fixed value did not just
   make the spine wrong — it **shifted the front artwork out of position by the same amount**, on
   every book. Fails silently: no error, plausible on screen, wrong only in the printed object.
   **Cover only** — inside pages are individual 200×200mm pages and the spine is not in their geometry.
2. **Coordinates became panel-relative.** The enabling discovery: cover CSV X values are *already*
   panel centres (Scribble's front slot `xMm: 327` = `18+200+9+100` exactly), and the `Type` column
   already names the panel. So this was arithmetic in the loader, not a bulk data edit.
   Authority for the numbers: `work/spine-geometry/brief.md` → Geometry.
3. **The cover SVG is split by panel, never stretched.** Photo slots are positioned independently
   of the SVG, so stretching it moves artwork *without* moving the photo beneath — 5mm of drift at
   80pp, visible as a crescent on shaped openings. Instead the SVG renders twice at natural width:
   back clipped `0→200mm` anchored left, front clipped from `209mm` shifted right by delta, flat
   colour band between. **Xenia re-authors nothing.**
4. **Done in both engines and the PDF path.** `template-engine.html`, `customer-preview.html`,
   `scripts/export-pdf.js` (module constants made per-render; same split via sharp
   `extract`+`composite`). `services/pdf-renderer/index.js` needed **no change** — it only imports
   `generatePdfFromFirestore`.
5. **Verified — 34/34 live-DOM checks** (`qa/verify-spine-s152.mjs`, Scribble + Tender, both page
   counts) and **252 tests pass** incl. 19 new in `tests/spine-geometry.test.js`. Owner confirmed
   Tender's oval clip registers visually. (Superseded by §6: the PDF compositing has now run.)
6. **Verified in print (S153).** Tender rendered at both page counts from the dashboard: spine
   correct, **no colour seam where the spine meets the front cover** — the highest-risk item. This
   was the **first real execution of the PDF cover compositing**. Scribble has still not been
   rendered through the PDF path (it is the only template with two spine captions).
7. **A crash blocked every template's PDF (S153).** `initPrintConstants()` still assigned
   `COVER_FULL_W_PX` from `COVER_FULL_W_MM`, which S152 had removed — `ReferenceError` before any
   drawing. All three globals were already dead, so they were deleted. **252 tests never caught it**:
   they call `computeCoverDimensions()` directly and never run the init path.
8. **Caption box sizes now live in the cover CSVs (S153)** — all six templates. Only one value
   changed on sync: Tender's spine `wMm` 45 → 120.
9. **Both delegated agents returned DONE with the brief's central constraint violated** — the
   engine agent stretched the SVG *and* left customer-preview reading a control that only exists in
   the staff engine; the PDF agent never implemented the split at all. Caught by reading the diff.
   Third and fourth occurrence in two sessions.

## Recent decisions
- **Caption boxes read from the cover CSVs, artboard frame (S153).** Rotated spine rows declare
  `width` = across the spine, `height` = along it; the sync swaps them for the engine, keyed off
  `Captions_1_direction`. Newborn and Joyride already used this frame, Wander used the opposite —
  no precedent existed, so artboard won 2-to-1 as the frame Xenia measures in.
- **Spine reference declared, not hardcoded (S152).** Cover CSVs carry `referenceSpineMm: 9`; the
  engine derives the shift. Chosen over per-size CSVs (10 hand-synced files, no generator).
- **Spine caption X kept as an offset, not removed (S152, owner).** Optical centring differs by
  font and size. Under the old absolute scheme any hand-tuned value silently broke when the spine
  changed — as an offset it is tuned once and holds for every size.
- **Re-authoring SVGs per size rejected (S152).** Would need 2 SVGs, 2 clip paths and 2 `pxPerMm`
  per template, and would *still* require the coordinate shift. Two-way door if print looks wrong.
- **Overhang, hinge gap and turn-in are NOT open questions (S152, owner).** Samples were already
  printed with Elanders on exactly this geometry, from Illustrator, before any engine existed.
  Claude had escalated them to blocking risks — "not written down" was misread as "unknown".
  **The spine is the only cover dimension that varies with page count.**
- **Cloud import dropped (S151).** Phone pickers already reach iCloud/Google Photos natively.
- **Stall detection chosen over raising the timeout (S151).** `STALL_TIMEOUT_MS = 30000` and the
  2s/5s backoff are judgement calls, not measurements.
- **#88 closed without root cause (S150, owner).** Read `docs/briefs/upload-failures.md` header
  before reopening. Leading untested hypothesis: the FP4 source was an **iCloud placeholder**.
- **Resume-on-failure: recommendation made, NOT decided (S150).**
- **Codex is for second opinions, not routine work (S150).**
- **Business case parked (S148/S149); CAC modelling deprioritised (S149).**
- **No price rise at launch (S148, owner).** Price is an OUTPUT of the business case (S148).
- **Working assumption: 20% VAT on photo books (S145, owner).** Steuerberater to confirm.
- **The live site stays `noindex` until launch (S144)** — TO-DOS #81.

## Next steps (priority order)
1. **Decide autoShrink for Tender's spine, then redeploy Cloud Run once.** The owner wants long
   titles to shrink rather than wrap onto the cover — that is the `autoShrink` flag, and no CSV
   column was added for it. Either set it in `tender-data.js` or add `captions1_autoshrink`.
   Turning it on makes `hMm` live (Tender's spine `8` is correct). **A second redeploy is needed
   regardless**: the deploy carrying the crash fix went out *before* the 120mm box landed.
2. **Render Scribble through the PDF path.** Same code as Tender, but it is the only template with
   two spine captions — the fiddliest case for the panel-relative arithmetic.
3. **Phase 2 — propagate to Papercut, Newborn, Wander**, including the **spine-colour audit**:
   since the split, `sections.spine.bgColor` is the *only* source of the spine colour, and Tender's
   was wrong (declared cream, artwork taupe). Those three are unaudited.
4. **Verify the stall-detection change (#94).** Four tests. Blocker is authorisation, not effort —
   the live rig runs deployed code. Test (a), a throttled upload exceeding 60s that **succeeds**,
   is the one that proves it, because it fails on `main` today.
5. **Review the untracked QA scripts** before trusting or committing any. At least one is known
   broken (`qa/quick-stall-test.mjs`). `qa/verify-spine-geometry.mjs` is **superseded** by
   `qa/verify-spine-s152.mjs` (now committed) and should be deleted.
6. **Decide the resume question (#90).** `/solutioning` recommendation in
   `sessions/2026-08-04-s150.md` §6. **Owner's call.** S151 argument that shifts it: a resume
   attempt is *itself* the diagnostic never captured.
7. **Finish P2-12.** Confirmation and payment emails verified; preview-ready and dispatch are not.
8. **Triage F-P2-03** (preview side-scrolls 64px at 1440, both engines, cosmetic).
9. **TO-DOS #91** — pin and vendor the four CDN libraries before launch. No build step needed.
10. **Cleanup (#60)** — AEV-078 (hostile text, **never use as a demo book**), AEV-079, AEV-080.

## Open questions
- 🔴 **Committed (`f181a5c`) but NOT pushed — and `order.html` is still loose.** The spine work
  is in a commit; S151's unverified stall detection was deliberately left out and is still modified
  in the working tree. A `git push` ships only what is committed, but `git commit -a` or a careless
  `git add .` would sweep `order.html` in. #94 needs a push to be testable at all — make that a
  **conscious** decision, not a side effect.
- **Only a printed book settles the cover geometry.** The PDF is the last checkable proxy.
- **Is 10/14mm a formula or two data points?** `spine = 6 + 0.1 × pages` fits exactly (≈0.2mm per
  leaf on 160gsm). Low risk either way — only two constants move. Worth one sentence to Printsmarter.
- **Is Printsmarter the same production line and API as Elanders?** Assumed since S148, never
  confirmed. The quality signal (Journi books seen on the Elanders floor) rests entirely on it.
- **Can a customer resume a failed upload?** (#90) — recommendation made, not decided.
- **Android is entirely untested on real hardware.** Emulation-only; emulated Chrome uses the
  desktop file dialog, so the thing that matters cannot be tested that way. Owner's plan: cover it
  in the F&F pilot. Specific check: file inputs use extension-based `accept` (`.jpg,.jpeg,.png,.heic`)
  rather than `image/*`, and Android's picker thinks in MIME types. Unverified suspicion.
- **Staff test password is `Claude-test`** — weak for an account that can read real customer orders.
- **`qa/test-photos/` is still missing.** Prefer `assets/test photos/DTS_PARENTHOOD`.
- **`ARCHITECTURE.md` has two invariants numbered 6** (hostname rule, centre-based coordinates), so
  everything after is off by one. `AGENTS.md` renumbers 1–9; the two disagree.
