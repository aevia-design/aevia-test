# Session Status
_Last updated: 2026-07-16 (session 136)_
_Context at save: **The owner's manual E2E produced three reports; all three are fixed, tested (228/228) and pushed.** Working tree clean, Cloudflare live with the customer-preview fixes. **⚠ The renderer has NOT been redeployed — the owner runs that himself, and until he does, NOTHING from this session reaches a PDF** (the Dockerfile bakes in both `scripts/export-pdf.js` and `assets/`). One bug found this session was silently deleting text from print PDFs; another was spinning an infinite rAF loop on every customer's machine in preview. Stage 9 (automated E2E) still deliberately unrun. Mockups + Dorottya's real bio still deferred before Joyride "ships". Domain migration (S130 ADR-0009) still queued._

## Status
**Session 136 (2026-07-16) — triaged the owner's manual E2E: 3 reports → 3 fixes, 8 root causes.**
1. **Joyride caption sync** (`64f0b09`) — his CSV edit dropped every caption 22pt→20pt, but the sync script only ever pushed photo geometry, so the size never reached the data file. Script now syncs all 12 caption fields **and** the three functional text panels (possible because he made `Syb-type` unique: `Intro Text` / `Intro Title`). Fixed a **latent bug** in it: block offsets were computed once then the file rewritten in a loop — geometry edits shifted 1–2 chars and survived by luck; caption edits broke **37 of 38 rows**.
2. **customer-preview layout** (`8ef5a45`) — reported as 2 issues, was **4 bugs**. Root cause: `.page-body.preview-mode` is `display:flex` and inherited the default **row**, so the disclaimer laid out *beside* the book (squeezed to 156px → the clipped text; book 78px off-centre). **Not Safari-specific.** Beneath it: `fitBook` scaled by width only (spread a constant 600px tall → bottom under the action bar, the sliced caption), and it **early-returned on the hidden cover for ever** — spreads never re-fitted **and rAF looped at full tilt**. Verified on a real book (AEV-065), WebKit + Chromium, 3 viewports.
3. **PDF cover sub-labels silently missing** (`45b186a`, `/systematic-debugging`) — `drawCoverCaptions()` derived the cut from a **numeric weight only**, never reading `capDef.style`. Joyride declares `style:'light'` with no weight → asked for `Mulish_regular`. **Mulish is the only family with no `_regular` cut**, so `lookupFont`'s fallback resolved to the same missing key → `null` → `continue` + `console.warn`. **Text silently dropped from print.** TDD: red first, then fixed.

## Recent decisions
- **CSV `Aspect ratio` + `Orientation` kept but never synced (S136):** both are decorative — nothing reads them at runtime, so nothing kept them correct; `Aspect ratio` now contradicts its **own w/h on 23 of 38 slots**. The JS is the truth. Not even *reported* (23 warnings a run would train you to ignore the audit). **Not deleted** because `csv-to-template.js` (Scribble-only) reads `ratio === '33:35'` to set `heartClip`, which is live at runtime.
- **Disclaimer goes TOP, not bottom (S136):** owner first said bottom, but the bottom is physically occupied (flip pill at `bottom:88px` + fixed action bar, 17px apart). The free band is under the nav — exactly where `.edit-hint` sits in edit mode.
- **Papercut string-weight NOT bundled (S136):** `weight: 'bold'` is a string, `'bold' >= 700` is false → its cover year prints regular. Cosmetic (nothing vanishes) → logged as **TO-DOS #77**.
- **Process (owner pushback, fair):** the `flex-direction` change was made before the page was understood. Instrument first, then change.

## Next steps (priority order)
1. **Owner redeploys the renderer** (see watch-outs) — then re-runs his PDF to confirm the cover sub-labels print and the coordinates match the browser.
2. **Wait for the rest of his manual E2E findings** — triage + fix.
3. **Stage 9** — run `qa/staff-customer-chain.mjs` for Joyride once he's done (or if he asks).
4. **Finish Phase C / stage 10** — owner produces the exp2/joyride mockups; swap Dorottya's real bio + portrait into `our-artists.html`.

## Open questions
- Mockups: owner produces manually, or generate via the compositor? (deferred — "need a good order first")
- For Xenia (art, not code): restyle the FP1 map artwork to Joyride's palette (still Wander's cream/navy parchment), and **outline** the back-cover "Curated by @letdorabe" `<text>` (broken letter-spacing).

## Watch-outs for the next session
- **⚠ RENDERER IS STALE — nothing from S136 reaches a PDF until it's redeployed.** The Dockerfile copies **both** `scripts/export-pdf.js` AND `assets/`, so the cover-caption fix, the 20pt captions, the coords and the 6 SVGs are all invisible to the PDF. It fails **silently** (browser shows new, PDF renders old). Command given to the owner:
  `export CLOUDSDK_PYTHON=$(ls -d /usr/lib/google-cloud-sdk/platform/bundledpython*/bin/python3 | head -1)` then
  `gcloud run deploy aevia-pdf-renderer --source . --region europe-west1` — **no `--allow-unauthenticated`** (S133: the classifier blocks it as auth-weakening; omitting it preserves IAM). Deployed at `53a439c`; rule: if `git diff <deployed-commit>..HEAD -- assets/ scripts/export-pdf.js` is non-empty, redeploy before trusting a PDF.
- **⚠ If a photo w/h is ever nudged in the CSV, hand-update the JS `ratio`** — the sync script deliberately won't (the CSV's ratio column is rotted). See S136 log.
- **A missing font cut deletes text from a print PDF with no error** — `lookupFont` returns null, callers `continue` with a `console.warn`. Its `_regular` fallback only saves families that HAVE a regular cut; **Mulish doesn't**. `tests/cover-caption-fonts.test.js` guards this, but only checks a cut *resolves*, not that it's the *intended* one.
- **The PDF reads what "Save book state" writes** — *not* "Export book state (JSON)" (backup only). Tell the owner if his PDF looks empty/stale.
- `qa/order-map-preview.mjs` uses an **extensionless URL** that no longer resolves under the current `serve` — stale script.
- Reusable: `qa/p1-preview-token.mjs AEV-065` mints a live preview URL; swap the host to `localhost:8080` to drive a **real book** against local changes (how the S136 layout fixes were verified).

## Untracked / flagged (not this session)
- `assets/SiteFlowOpenAPI.json` — untracked 395 KB vendor spec, predates S134; deliberately left out of every commit.
- **No `sessions/2026-07-15-s134.md` exists** — S134's work is described in the S133→S135 briefs/STATUS but its own log was never written. Historical gap only.
