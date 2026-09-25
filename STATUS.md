# Session Status
_Last updated: 2026-09-25 (session 194)_
_Context at save: #99 review lock built, deployed and verified live by the owner. Printsmarter
send dialog now shows the resolved address. Next session: owner works on coordinates/SVGs for final mockups._

## Status
**Session 194.** Full detail: **`sessions/2026-09-25-s194.md`**.

## Do this first
**Read the board** (https://trello.com/b/HCrNJRN1/aevia): *In progress*, *Blocked*, top of
*Next up*. Rules are in CLAUDE.md "Backlog board". At handover, `node scripts/trello-snapshot.mjs`.

⚠ **Papercut cover captions changed (S194, `c70982f`)** - redeploy the PDF renderer before any Papercut PDF.

**Waiting on the owner:**
- **#140 AI captions** (Backlog, briefed: `docs/briefs/caption-quality.md`). Step 1 only unless he asks.
- **Printsmarter send dialog** (`5934963`) - owner to eyeball on a paid test order, then Cancel.
- **#99 feedback path** (step 10) not tested live; passed locally.
- **#67** bold-in-PDF still needs a Ctrl+B word → PDF check.
- **#124** DE mockups, **#139** cloud costs (needs the owner's Billing CSV first; no brief yet).

## What shipped in S194
- **#99 review lock and issue flow** (merge `74a971e`, Done, verified live steps 1-9). Brief
  `docs/briefs/review-lock.md`, decision `work/review-lock/decision.md`. One `bookRevision` counter;
  every book write is a Firestore transaction that 409s on a stale tab; lock = status; blocking report
  promotes the customer draft into `staffBook*`; `sentVersions/{n}` per send; dashboard "Unlock for fix";
  dropdown disabled in `review_sent`/`issue`; approve only from `review_sent`, carrying the displayed book.
  Tests: `tests/review-lock-scenarios.test.js` (real handlers over an in-memory Firestore fake,
  `tests/helpers/`), browser `npm run qa:review-lock` (needs http-server on 8080).
- Send-to-Printsmarter confirm uses the dry run (`5934963`). Issue banner under the nav (`b535c4f`).
- New cards: **#141** learn from customer edits (After launch), **#142** customer preview chrome in German.
- npm test **721**.

## What shipped in S193
- **#129** customer preview records caption line breaks; approval promotes them (`cdf0a7d`).
- **#102** closed: full-bleed reposition prints exactly (AEV-070).
- **#138** PDF generation: shared status in every tab, one render per order, confirm, cancel ×
  (`905dc22`, `45e1be4`). New function `cancelPdfRender`; renderer revision 00043.
- **#137** Dorottya's portrait (`1271645`). Heirloom monogram cards Bond/Harmony/Devotion, Beige
  crop fixed; collections count their own cards (`07c07e9`). Engine nav → Dashboard (`b093a4e`).
- npm test **686**, qa:order **36** (as of #129).

```powershell
npx firebase deploy --only functions      # from the PROJECT ROOT, not functions/
```
⚠ **`firebase deploy` can exit 0 with a function that FAILED.** S190's first run printed
`! failed to update ... getMyAddress` and still exited 0. **The real signal is the
`Deploy complete!` line** - check for it, not `$?`. See LEARNINGS.

```powershell
gcloud run deploy aevia-pdf-renderer --source C:/Users/evgmy/aevia-test --region europe-west1 --memory 8Gi --cpu 4 --timeout 900 --concurrency 1 --allow-unauthenticated --project aevia-uploads --quiet
```
(Redeploy the renderer BEFORE generating PDFs if template data or SVGs changed, or you bake
stale artwork.) **`--concurrency 1` is live since S193** (one render per instance).
⚠ The image builds from the **working folder, untracked files included**. "Container import
failed" = check `.dockerignore` first (LEARNINGS S193). From Git Bash, gcloud needs `cmd //c "gcloud ..."`.

## Still open on the print path
⚠ **`PRINTSMARTER_LIVE` is `true` and `submitPrintOrder` is deployed** - "Send to Printsmarter"
is armed beside "Preview submission". A misclick is a real book and a real invoice.
The send confirm dialog now shows the **resolved** address via `dryRun` (fixed S194, not yet eyeballed).
⚠ **Sending is once-only.** A problem found afterwards is a `cancel_order`, not a resend.
⚠ **Neither test order is Heirloom** - the two-product split and the offset stock are unexercised.
**Do NOT use Heirloom Blue (AEV-091)** - its coordinates are still the old off-centre ones.
⚠ **AEV-100's inside PDF is 403.91 MB** (AEV-071's is 176.03). First suspect if a submission
succeeds and nothing produces.

### What the first PDFs still have to prove (carried from S187, still unclosed)
1. **Heirloom Beige, Tender, Newborn** - cover photo visible, not a coloured shape.
2. **Tender's spine** - the only template whose sheet width changed.
3. **Scribble's captions** - the Onest swap has never been PDF'd. ⚠ The font miss is **silent**.
4. **Front-panel centring** - print is the only place to judge it.

⚠ **The +6mm nudge is NOT uniform in print.** At 40pp it is **+1mm for the six 9mm-authored
templates and 0 for Heirloom, Laguna and Tender.** Compare two templates from different families
before nudging again.

## ⚠ Carried into the next Heirloom drop
Owner will apply Beige's coordinates to **Blue, Brown and Green** next.
- Their windows are `fill="none"` today; **expect the re-export to re-fill them**.
  `tests/cover-photo-window.test.js` now catches that.
- **Heirloom's slot tracks the ARTWORK opening centre, not the CSV** (332.63 vs 333.00).
- ⚠ **Roses' new SVG has no photo opening at all** - it reuses Birds' value, unconfirmed.

## Where germanization stands
| Stage | State |
|---|---|
| 0 · Validate the DE drop | ✅ done — `work/germanization/stage0-report.md` |
| 1 · Language → Firestore → staff badge | ✅ done, deployed |
| 2 · DE artwork in both engines | ✅ done, live |
| 3 · PDF parity | ✅ done, deployed |
| 4a · Order-form chrome | ✅ done S178 — `assets/js/order-strings.js` |
| 4b · Per-template copy | ✅ done S180, all eleven data files |
| 5 · German AI captions | ✅ **done S182 — deployed, verified on a Newborn order** |
| 6 · DE mockups + gallery swap + add-on names | ⬜ **the only unbuilt stage** |

### What Stage 5 actually taught us (do not re-derive)
1. **A blocklist alone cannot produce good German.** The first real output paraphrased around
   every banned string ("So viel Freude in einem kleinen **Moment**" dodged the banned "in diesem
   Moment") and fell back on abstraction. What fixed it was a **positive rule ranked second, under
   no-invention: name something actually in the photograph.** Do not demote it.
2. **Compose can DELETE a customer's detail**, not only invent one — it dropped "an einem
   Dienstag" from a proposal story. Different failure from invention; the add-nothing rules did
   not cover it.
3. **Prompt building lives in `functions/caption/prompts.js`**, extracted so the German path is
   testable (`tests/caption-prompts.test.js`). A prompt regresses **silently**.
4. **The English "no A/An" rule is deliberately NOT sent for German** — research withdrew it, so
   sending it pushed the model wrong.
5. `functions/caption/caption.js --language de` reproduces engine output locally, no deploy
   needed. It reads `functions/.env` as a fallback — never copy the key to a second file.

## Where Printsmarter stands
| Piece | State |
|---|---|
| `product_id` × 2 — offset (Heirloom) / matte (rest) | ✅ S188, both in `functions/.env`, both required |
| Token / customer id 3983 / base URL | ✅ set since S155 |
| `printsmarterPostback` | ✅ **deployed + verified live** (S185), 5 cases green |
| `submitPrintOrder` | ✅ **deployed S188** |
| `PRINTSMARTER_LIVE` | ✅ **`true`** — the send button is armed |
| Address fallback + dry run | ✅ S188 |
| Postback URL registered with them | 🔴 **they lost it** — resend is on **#135**, Blocked on the contract + delivery provider |
| Their product setup | ✅ resolved on their side (S191) |
| First live orders | ✅ **AEV-071 = #150933, AEV-100 = #150932 — in production** (S191) |

**Deliberately absent from the payload, both still open in the brief:**
- **`shipping_price`** — we charge no shipping, and their docs describe `price` as feeding
  customs/proforma documents, so inventing a figure would misstate one.
- **`return_address`** — asked S185, unanswered. A failed delivery must not route to a private
  Vienna address, so we send none rather than guess.

**Ask them in the same email as Heirloom's paper spec:** produce these two orders; is
`return_address` required; are `product_id_client` / `project_name` free-form on our side; and
**can their fetcher handle a 190 MB PDF** (see below).

⚠ **190 MB is the first suspect if a submission succeeds and nothing produces.** AEV-098's
inside PDF is 190.65 MB, cover 9.68 MB. Both signed URLs were verified fetchable from outside
Google (`200 OK`, `application/pdf`, no auth) — so the **URLs are proven and the size is not.**
AEV-095's *preview* alone was 231 MB.

## Recent decisions
- **#99: the customer's saved draft is the only live copy after sending (S194, owner)** - staff fix
  ON TOP of it after a blocking report; no merging. Report form has two paths: blocking (locks approval,
  unlocks staff) vs feedback (does not block). The status IS the lock; don't add a separate flag.
- **Every book-state write carries `bookRevision` (S194)** - a plain email resend neither checks nor
  bumps it (bumping lost a customer's unsaved edits). Don't "simplify" approve back into save-then-approve:
  the two-request version could approve a book the tab never showed.
- **A fix needing a photo the customer never uploaded: handled by email for now (S194, owner)** - nobody
  can add a photo after ordering. Own card only if it recurs.
- **Clean public URLs via rewrite, not a move (S192, owner, ADR-0010)** — `_redirects` 200 rules
  whose destination has **no `.html`** (with `.html` Cloudflare 308-bounces back to `/pages/`).
  **No 301 from old `/pages/<public>` addresses** (loops); canonical tags carry SEO. EN at the
  root, no `/en/`. Internal links are root-absolute, so **local http-server cannot navigate
  between public pages** (open `/pages/x.html` directly). ⚠ **`wrangler pages dev` is not a
  faithful test of `_redirects`** — test rewrites on the rig.
- **Cloud photo sources: build nothing (S192, owner, #78)** — no mainstream competitor offers
  Drive/Dropbox on a web form; Google Photos is the only plausible one and Google restricted its
  API in March 2025. Revisit only with evidence of upload abandonment.
- **#99 direction (S192, owner; BUILT S194, see top)** — staff cannot edit once the preview link is sent;
  unlock only on a customer-reported issue. Open: what re-send does to the customer's draft.
  ⚠ `approveOrder` currently lets a customer approve while the order is in `issue`.
- **Trello is the canonical backlog (S191, owner)** — TO-DOS.md is a snapshot regenerated at
  handover. Owner owns priority (order of *Next up*, labels, *Dropped*); Claude owns status.
  No WIP limit. Credentials in repo-root `trello.env`, **never `functions/`**.
- **The Printsmarter status-push email waits for the contract (S191, owner)** — delivery
  postbacks depend on the carrier, not yet agreed. Draft on #135. What matters: every status
  pushed (delivered most), a timestamp per change, holds reported. Our order number is NOT
  needed — we store theirs.
- **On the German form only customer-written sentences reach the screen (S191)** — technical
  errors show `err.generic`. `customerError()` marks the ones allowed through.
- **German country names = a display label beside the English key (S191, owner spec, #133)** —
  the English name keys `mapCoordinates`; never rename it.
- **Detection is automated, recovery stays human (S190, implementing S173/S174)** — a person
  following up IS the product; Aevia is done-for-you, not a DIY project tool. No self-service
  resume was built, deliberately.
- **`upload_failed` is a side-state, not a step (S190)** — modelled on `issue`, kept OUT of
  `STATUS_SEQUENCE`. ⚠ The old guard let an unrecognised status skip itself entirely, silently
  permitting any jump; unknown statuses now prompt.
- **`confirmUpload` guarantees AT MOST ONCE, deliberately (S190)** — Firestore and SMTP cannot be
  made atomic. A lost email is preferred to a duplicate, and the same choice is made in the job.
- **The stranded-upload cutoff is a DATE, never an ID list (S190)** — a list is one forgotten
  entry away from emailing a test address.
- **`PRE_APPROVAL` and `PRE_APPROVAL_STATUSES` already exclude `upload_failed` correctly (S190)**
  — by omission. **Do not "fix" them.**
- **Keep the headless `delegating-to-codex`, do NOT install herdr (S190, owner)** — `codex exec`
  already streams its event log and `resume` steers between turns, so the "blackbox" objection did
  not survive checking. The npm `herdr` is a 0.0.0 placeholder and the plugin skill needs Claude
  Code running inside a herdr terminal session. Owner stays in the VS Code extension.
- **The six `*-agent` skills were the owner's own wrappers, not rageatc artefacts (S190)** —
  deleted. The agents ship inside the plugins and load from there; **nothing should be copied into
  `~/.claude/agents/`**, which would shadow them and re-diverge.
- **The product-id 400 is THEIR setup, not our config (S189)** — verified `functions/.env` holds
  the exact issued strings, no whitespace, and their error echoed ours back. **Do not restore
  `aevia_hardcover`** (retired) and **do not edit the env**. ⚠ **No test can catch a wrong
  product id** — `tests/printsmarter.test.js` feeds a fixture string and asserts it arrives
  intact, so any value passes. Only a live call proves one, exactly like S188's `"pages": "40"`.
- **"Mark approved for print" removed from the dashboard (S189)** — it made no API call, but
  flipping the status **hid the button that actually submits** and left the row reading "Sent to
  print" for an order never sent. A real submission shows **"Sent to print · PS #<id>"**; plain
  "Sent to print" means it never went. Recovery is to set the status back to `paid` — the
  once-only guard is on `printsmarterOrderId`, not on status. `markSentToPrint` survives as a
  console-only escape hatch.
- **The send confirm dialog misreports the address — FOUND, NOT FIXED (S189)** — it reads the
  locally loaded `order.shippingAddress` and shows "⚠ NO SHIPPING ADDRESS ON ORDER" precisely
  when S188's account fallback is doing its job. **Trust "Preview submission", not the dialog.**
  The fix is to have the confirm call `dryRun` and show the **resolved** address and its source.
- **An account rename does NOT touch existing orders (S189, by design)** — the print recipient is
  `order.customerName`, frozen at order time; `displayName` only ever prefilled it. A fallback may
  fill an absent field, never override a present one (the S188 rule). Correct a wrong name in
  `orders/{orderNumber}` — the doc id **is** the order number.
- **`buildOrderPayload` ignores `customers/{email}.shippingName` — FOUND, NOT FIXED (S189)** — so
  when the address fallback fires we ship to the **account's address** under the **order's name**.
  Two halves of one address from two sources. Nothing has gone out wrong yet.
- **The account name is editable, and deliberately separate from the shipping name (S189)** —
  `pages/account.html` writes Firebase Auth `displayName` only. A book can be addressed to
  someone other than the account holder, so renaming must never redirect a delivery.
- **Two Printsmarter products, one per paper stock (S188)** — Heirloom
  `aevia_hardcover_offset`, everything else `aevia_hardcover_matte`. **Both strings were ISSUED
  BY PRINTSMARTER by email** (confirmed S189 — S188 recorded them as an owner decision, which
  reads as if we invented them; we did not). **`aevia_hardcover` is RETIRED, they removed it —
  do not restore it.** Matching is on the lowercased `heirloom` **prefix**, so a fifth colourway
  needs no code change. A missing `templateName` **throws** rather than defaulting to matte.
- **The account address is the fallback, not a Firestore hand-edit (S188)** — owner and Xenia
  set an address once in `pages/account.html`; `submitPrintOrder` reads
  `customers/{email}.shippingAddress` only when the order has none. It can fill an absent field,
  never override one. ⚠ That form is gated on `email_verified`.
- **Dry run shares the real code path, never a parallel preview (S188)** — a preview that
  re-derives the payload can drift and show a book you are not ordering.
- **`pages` is sent as a NUMBER (S188)** — orders store `pageCount` as a string; their example
  distinguishes it from `price`, which IS a string. **Do not "simplify" the coercion away.**
- **`shipping_code: 'Standard'` is sent explicitly (S188)** — omitting it risks an Express
  default we would pay for, or rejection if required.
- **Multiple copies deferred to TO-DOS #117 (S188)** — copies are `quantity: 2` on ONE line
  item, not a second `-2` line item. Blocked on an owner pricing decision.
- **Cover coordinates land at trim X 315mm everywhere; Papercut at 314 is deliberate (S187,
  owner)** — to be judged in print, not on screen.
- **For a CLIPPED template the ARTWORK wins over the CSV (S187)** — Heirloom's slot is 332.63
  because that is the opening centre; the CSV says 333.00. A 0.37mm error shows background down
  one edge of an 80mm window.
- **Tender declares `referenceSpineMm: 10` (S187)** — its sheet was re-exported at 410mm. With
  `9` the engine squeezes a 410mm sheet into 409mm.
- **Joyride and Scribble stay at `referenceSpineMm: 9` (S187)** — their artwork now draws a 10mm
  spine band on a 409mm sheet, but **the engine never displays the SVG's spine band**; it paints
  its own. **Do not raise this as a print defect** — that is the S168 mistake (LEARNINGS 178).
- **Resumable uploads are NOT part of the upload-stall work (S187, owner)** — the signed URL is
  `action: 'write'`, a single-shot PUT, so retries restart at byte zero. Worth doing, own
  session, and it would not have fixed AEV-096.
- **Nothing to build for the upload stall yet (S187, owner)** — the root cause is still not
  established and the OneDrive premise did not survive checking. See "Open questions".
- **Heirloom's different paper = a SECOND `product_id`, requested by email (S186)** — their ids are
  issued by email, no catalogue and no self-service. Our side: `printsmarter.js:89` sends one
  hard-wired id for every order and becomes a per-template lookup keyed off the **registry key**,
  standard id as the default. ~10 lines. **Not built.** `pages`, `quantity` and retail `price`
  are unaffected.
- **Liability: keep the order-value cap, do NOT exclude slight negligence (S186)** —
  `work/legal-pages/decision-liability.md`. ⚠ Reversible **only until the first live order**
  (AGB §10 locks the live version into each order). **Insurance, not wording, is the real
  protection for a personally-liable e.U.** Do not re-raise Journi's blanket exclusion.
- **Our missing ODR link is CORRECT — the platform shut down 20 July 2025 (S186)**, Reg. (EU)
  2024/3228. S183 recorded the wrong reason. Journi still links it; theirs is stale. **Do not
  re-add it after seeing it on a competitor site.**
- **No accessibility statement — microenterprise exemption under the EAA (S186).** Not permanent;
  revisit if the business grows past 10 staff / €2m.
- **Photo retention follows the cheap mechanism (S186, owner)** — "12 months after **upload**" plus
  a 365-day GCS lifecycle rule, not a scheduled function reading delivery dates.
- **OpenAI stays disclosed as a processor (S186, owner)** — GDPR Art. 13 recipients.
- **Printsmarter `price` = retail, not cost (S185, their docs)** — our €70/€100 is correct.
  Cost is €8.47 (40pp) / €11.67 (80pp). **Never put cost in that field.**
- **Postback auth solved on our side (S185)** — secret in the URL path; their dev team builds
  nothing. The S155 "can you sign requests?" question is **withdrawn, not pending**.
- **Do not weaken `submitPrintOrder`'s guards for testing (S185)** — set the fields on the
  Firestore doc instead. A missing address returns 400 and bills nothing, so the dashboard
  button is safe to click.
- **Intro pages print pre-defined book copy and are NEVER abridged (S182, owner)** — if the text
  does not fit, **grow the box**, never shrink Xenia's type or trim her words.
- **Scribble's NT Somic replaced with Onest (S182)** — closes TO-DOS #115 outright; every font
  now passes `check-font-glyphs.mjs`, so `caption-voice.md`'s "avoid ß" rule was **inverted**.
- **Stage 6's add-on names deferred (S182, Pareto)** — 11 strings seen once, post-decision, never
  printed. Fold them into the native-proofread pass instead of building twice.
- **English caption/compose prompts left untouched (S182)** — they share the abstraction and
  deletion weaknesses, but EN is the germanization regression baseline. Open, deliberately.
- **Caption typographic polish removed from both engines (S181)** — see
  `work/caption-line-integrity/decision.md` before re-adding.
- **Caption length is NOT calibrated (S180, owner)** — staff trim or regenerate. Ceiling only.
- **Print samples go by email, not the API (S180)** — and the API round waits for `product_id`.
- **Journalism caption guidance must not govern Aevia's captions (S180, owner).**
- **The English "no A/An" caption rule does not carry over to German (S180, researched).**
- **Packaging: deboss the large forms, print the small text (S179, owner).**
- **No separate markdown translation file (S178, owner).**
- **Add-on names are fixed in Stage 6, not patched in the form (S178, owner).**
- **Germanization: one switch drives everything (S177, owner).**
- **German captions are written natively, not translated (S177, owner).**
- **No AI on the travel-map itinerary (S175, owner).** **Do not re-raise.**
- **VAT is RESOLVED at 20% (S173, owner). Do not re-raise.**
- **RAW, TIFF and a 40 MB cap ALL DECLINED (S166, owner).** **Do not re-raise.**
- **WebP REFUSED (S164, owner).** **Do not re-raise.**
- **Printsmarter token NOT rotated (S155, owner).** **Never put it in any summary or memory.**
- **No price rise at launch (S148, owner).**
- **The live site stays `noindex` until launch (S144)** — TO-DOS #81.

## Next steps
**The Trello board is the backlog now (S191)** — https://trello.com/b/HCrNJRN1/aevia.
Read *In progress*, *Blocked* and the top of *Next up*; the owner orders *Next up*.
The 23-item list that used to live here became cards #118–#132 or was already a ticket.

## Open questions
- **Does their fetcher accept a 403 MB PDF over a 7-day signed URL?** The URLs are proven
  (`200 OK` from outside Google, no auth); the size is not. AEV-100 is 403.91 MB, AEV-071
  176.03 MB. First suspect if a submission succeeds and nothing produces.
- **Should an order's recipient name follow `customers/{email}.shippingName` when the address
  fallback fires?** Today it does not, so a fallback ships to the account's address under the
  order's name. Nothing has gone out wrong yet.
- **Are `product_id_client` (`AEV-098-1`) and `project_name` free-form on our side?** Both are
  our invention from S155 and have never been sent to them for real.
- **Is copy two of the same book full price or discounted?** Blocks TO-DOS #117.
- **What actually causes the upload stall?** Still unknown after four sessions. S187 captured
  the first real failure and it **killed the duplicate-`File` hypothesis** (55 distinct
  originals, the failing file used once; Chrome/Windows, not Safari) without replacing it.
  ⚠ The "identical 371,712 bytes" is **not** proof the file was unreadable — `bytesTransferred`
  is only set inside the progress handler and **we never record how many events fired**, so one
  buffer flush then a wedged connection fits the same data. ⚠ The OneDrive placeholder theory
  weakened: "Free up space" is greyed out on those files, so they are not placeholders.
  A third candidate survives: OneDrive rewrites files during sync and Chrome's `File` is a
  snapshot tied to modification time. **Instrumentation shipped S192 (#116)** — the next real stall answers it; read
  `docs/briefs/upload-failures.md` S192 section. `work/upload-file-read/brief.md` stays PROVISIONAL.
- **Is the +6mm nudge right, given it prints as +1mm more on six templates?** Needs two
  templates from different spine families compared on paper.
- **Has any native speaker read ANY of the German?** Still no. **The single largest unverified
  surface in the project**, and it now includes the AI captions.
- **Does the German intro want the tighter spacing Xenia wrote?** Both German `.txt` files put
  "[Anna] & [Michael]" directly under the closing line; both English ones leave a blank line, and
  both `composeDe`s emit the blank line. Kept for consistency with English and shipped Heirloom.
  One-character fix in two files if she meant otherwise.
- **Should Tender's middle stanza ever have wrapped differently?** 132mm sets every authored line
  on one line at 22pt. The frame's clear interior is 136.8mm, so there is ~2.4mm each side and no
  room to grow further.
- **Are our caption rules too austere for a baby book?** Xenia's own German uses an exclamation
  mark both voice sections forbid. Surfaced S180, not decided.
- **Does the English caption prompt need the same concreteness fix as German?** Its control output
  was "Everything new in this quiet moment" — the same weakness. Left alone on purpose.
- **Is the language selector acceptable live before Stage 6?** A DE pick now gives German artwork,
  a German form and German captions, but English mockups. Production is waitlist-gated.
- **Which templates go to Printsmarter as samples?** Signed URLs are v4/7-day; whether their
  fetcher accepts them is **untested** — the first submission proves it.
- **Does a repositioned full-bleed photo now print off-centre?** Never eyeballed.
- **Does the PDF renderer spill over-long story-panel text the way the engine does?** Never
  rendered — and now more relevant, since Tender's intro box grew.
- **Do the sticker laptop and yellow book belong on a premium page?** Two reviews disagreed.
- **Does the Laguna approve click work?** The E2E chain skipped it.
- **Does Clémence's portrait crop correctly?** Hers is portrait; Kevin's is landscape.
- **Would a 60–100MP camera's max-quality JPEG exceed 40 MB?** TO-DOS #105.
- **Is Wander's trim 409mm or 408mm?** Xenia has not confirmed.
- **Does a Google Photos pick ever arrive with no extension AND no MIME type?** Needs a device.
- **Does `.rotate()` double-rotate HEIC?** Accepted on trust — untestable locally.
- **Should existing derivatives be regenerated?** Costs egress; default is to leave them.
- **`wander-data.js` placeholders still quote the artwork's old wording** ("Dolomites, 2026").
- **Intro letter colour assumed `#7c746e`** — resolved for Beige; confirm with Xenia.
- **`functions/index.js:1513` claims the dispatch email is "NOT yet wired". It IS wired** and
  emails the customer on any postback that reaches a real order. Stale comment, not fixed.
- **Prices live in THREE places** — Stripe, `assets/js/prices.js`, `PRICE_BY_PAGE_COUNT`.
- **Android is entirely untested on real hardware.**
- **Staff test password is weak** for an account that can read real customer orders.
