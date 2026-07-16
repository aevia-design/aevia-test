# Session Status
_Last updated: 2026-07-16 (session 135)_
_Context at save: **JOYRIDE IS LIVE AND TESTABLE END-TO-END.** All 8 items of the S134 owner test round are closed (Passes A/B/C). Everything is committed AND pushed (working tree clean); Cloudflare is live and the Cloud Run renderer is redeployed with current coordinates (revision `00010-tj8`). The owner is running a **manual** E2E now (order → engine → Save → customer preview → dashboard PDF) and will report issues next session. Stage 9 (automated E2E) deliberately unrun at his request. Build state + all 8 test items tracked in `docs/briefs/joyride-build.md`. Mockups + Dorottya's real bio still deferred before Joyride "ships". Domain migration (S130 ADR-0009) still queued._

## Status
**Session 135 (2026-07-16) — Joyride test-round Passes B + C, then push + renderer redeploy.**
1. **Pass B** — order form: 4 cover dropzones → **one** field taking 4 photos into labelled slots (Top/Left/Right/Bottom, drop order); Joyride-only album-note example (`TEMPLATE_NOTE_PLACEHOLDERS`, checked before the shared category map). Single-cover templates byte-identical.
2. **Pass C** — two root causes, both **Wander-era hardcodes in `order.html`** (the third surface of the template seam): the map preview's `ASSET_BASE` was hardcoded to Wander → **every** Joyride map image 404'd (fixed via per-template `svgBase` in the registry, mirroring the other two surfaces; itinerary font also de-hardcoded + Mulish registered); `calcPhotoTarget` hardcoded `stdIds` to SP1–SP6 → Joyride's SP7–SP9 never entered the sequence, a **consistent 4-photo undercount**. Order form now returns the engine's exact numbers (49 / 46). New `tests/photo-count-sequence.test.js` (15 tests) guards the *invariant* — every template's standard spreads must be reachable. **`npm test` 217/217.**
3. **Plugin repaired** — `rageatc-code-oss` had a registry entry pointing at a **missing cache dir**; restored by copying from the (intact) marketplace clone. Its 19 skills incl. `systematic-debugging` load **from the next session start**.
4. **Shipped** — 4 commits pushed; Cloudflare live (`/pages/joyride` 200, `/pages/terrain` 404). **Renderer redeployed** (`00010-tj8`) — it had **stale Joyride coordinates** (data is baked into the image at deploy time), which would have shown the owner a ~0.3–0.7 mm PDF-vs-preview drift that was already fixed in code.

## Recent decisions
- **Stage 9 deferred (S135):** owner wants to run the E2E **manually** first and report issues; don't run `qa/staff-customer-chain.mjs` for Joyride until he asks.
- **Cover UX (S135):** ONE dropzone taking 4 photos, slots labelled, filled in drop order — reverses S133's 4-zone UI. Cut a drafted hint promising photo **reordering** at preview: reposition moves a photo *within* its frame, it can't swap frames.
- **Seam rule reinforced (S135):** template-shaped logic lives on **four** surfaces — staff engine, customer-preview, `order.html`, `export-pdf.js`. S129's de-hardcode sweep covered only the two engines, which is exactly why items 7 + 8 survived. Grep all four.
- **"43 vs 46" was a misreading (S135):** those were two different configs (43 = map only, 46 = Intro+Map). The real defect was a 4-photo undercount in *every* Joyride config.

## Next steps (priority order)
1. **Wait for the owner's manual E2E findings** — triage + fix whatever he reports.
2. **Stage 9** — run `qa/staff-customer-chain.mjs` for Joyride once he's done (or if he asks).
3. **Finish Phase C / stage 10** — owner produces the exp2/joyride mockups; swap Dorottya's real bio + portrait into `our-artists.html`. Work is already on `main`; redeploy the renderer again **only if `assets/` changes** (see below).

## Open questions
- Mockups: owner produces manually, or generate via the compositor? (deferred — "need a good order first")
- For Xenia (art, not code): restyle the FP1 map artwork to Joyride's palette (currently still Wander's cream/navy parchment; type + colour are already Joyride's), and **outline** the back-cover "Curated by @letdorabe" `<text>` (renders with broken letter-spacing).

## Watch-outs for the next session
- **⚠ The renderer bakes `assets/` into its image.** After ANY `*-data.js` / CSV coord change, `gcloud run deploy aevia-pdf-renderer --source .` or the PDF silently renders **stale** coordinates while the browser shows the new ones. Rule: if `git diff <deployed-commit>..HEAD -- assets/` is non-empty, redeploy before trusting a PDF comparison. Deployed at `53a439c`.
- **The PDF reads what "Save book state" writes** — *not* "Export book state (JSON)" (backup only). Tell the owner if his PDF looks empty/stale.
- `qa/order-map-preview.mjs` uses an **extensionless URL** that no longer resolves under the current `serve` — stale script, needs `/pages/order.html?…`. Same stale-selector class as the `debug-tender/wander-render.mjs` `.fp-toggle` issue noted at S129.
- `systematic-debugging` (and the rest of `rageatc-code-oss`) should be invocable from the next session start — the cache was repaired mid-S135, after skills had already loaded.

## Untracked / flagged (not this session)
- `assets/SiteFlowOpenAPI.json` — untracked 395 KB vendor spec, predates S134; deliberately left out of every commit.
- **No `sessions/2026-07-15-s134.md` exists** — S134's work is described in the S133→S135 briefs/STATUS but its own log was never written. Historical gap only; nothing lost.
