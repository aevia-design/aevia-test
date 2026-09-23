# Session Status
_Last updated: 2026-09-22 (session 190)_
_Context at save: **TO-DOS #89 pieces 1-7 are built, pushed and DEPLOYED** - a stranded upload
now detects itself. Printsmarter is unchanged and still blocked on their side. Two commits
(`86d8c7c`, `09caf1b`); the plugin/skill work lives outside the repo._

## Status
**Session 190 - stranded uploads now flip themselves; the print path is still waiting on them.**

Full detail: **`sessions/2026-09-22-s190.md`**.

## Do this first - pick one of two, they are independent

### A. Confirm the new job is not about to email a real customer
`detectStrandedUploads` is **live and firing hourly**. Nobody has checked what is currently
sitting at `uploading` - the Firestore read was **blocked by the sandbox classifier**.

Open the dashboard, click the **Uploading** filter, read the **Date** column:
- Anything dated **before 22 Sep** is protected by `STRANDED_CUTOFF` and will never be touched.
  The five known QA strandings (AEV-067/073/074/079/096) are all in this group.
- Anything dated **22 Sep or later** is in scope. If it has real photo failures and no later
  successful order from that address, **the job will email that customer** on the next run. That
  is the designed behaviour - it just should not be a surprise.

Then **prove the flip end to end**: create a fresh stranded order after the cutoff with an inbox
we own, and watch it become `upload_failed`. ⚠ **AEV-096 cannot serve this** - it is below the
cutoff by design, and S173's plan to both ignore pre-deploy orders and flip AEV-096 contradicted
itself. Watch it in Cloud Logging, filter `detectStrandedUploads`.

### B. Chase Printsmarter, then resubmit
**Unchanged since S189 - still waiting on their reply.** Owner asked them (2026-09-21) to confirm
`aevia_hardcover_matte` and `aevia_hardcover_offset` are set up and assigned to account 3983.

⚠ **Both ids were ISSUED BY THEM and `aevia_hardcover` is RETIRED.** Do **not** restore the old
id and do **not** edit `functions/.env` - it was verified S189 as holding the exact strings.

Resubmit **AEV-071** (40pp) and **AEV-100** (80pp) unchanged; both are still `paid` with no
`printsmarterOrderId`, so the once-only guard is intact. ⚠ **Their signed PDF URLs expire
28 Sep** - regenerate if the reply lands after that.

## What shipped in S190 - TO-DOS #89, pieces 1-7

A stranded order used to sit at `uploading` forever: invisible on the dashboard beside one running
right now, silent to the customer, with staff already emailed about a book that never arrived.

- **`detectStrandedUploads`** - hourly, `europe-west1`, flips `uploading` -> `upload_failed` past
  one hour with a disposition. The flip is a **conditional transaction** and the customer email
  **re-reads `uploadComplete` immediately before sending**, so a tab that retries on the boundary
  cannot also be told it failed.
- **`confirmUpload` claims the confirmation in a transaction.** Was a read-then-update, so a Retry
  racing a slow first call could have both sent mail. Both emails now run under `allSettled` with
  per-channel error fields. ⚠ **The guarantee is AT MOST ONCE, deliberately** - Firestore and SMTP
  cannot be made atomic; a lost email beats a duplicate.
- **Staff "New Order" email moved to `confirmUpload`.** `createUploadSession` now emails nobody,
  which also removed a live failure mode: an SMTP throw there used to strand a new order **before
  the browser received its signed URLs**.
- **`upload_failed` is a side-state, NOT in `STATUS_SEQUENCE`.** ⚠ The old guard skipped itself
  when `indexOf` returned `-1`, **silently permitting any jump**; unrecognised statuses now prompt.
- Decisions live in **`functions/upload-failure-utils.js`** - pure, and imported by both the job
  and its tests.

**Remaining: piece 0, the Retry button.** The cheapest defence (files still in browser memory,
typically ONE photo after #112) and the only piece touching `pages/order.html`, so
**`npm run qa:order` is mandatory**. ⚠ **It must NOT skip `neverAttempted` entries** or it will
confirm a book with photos missing - that is the bug that blocked the brief until S174.

⚠ **`STRANDED_CUTOFF` is `2026-09-22T00:00:00Z`** (`functions/index.js`). A date, not an ID list,
because a list is one forgotten entry away from emailing a test address.

⚠ **Two corrections to the brief, found in the code:** its dashboard line numbers are stale;
`statusLabel` returns `labels[s] || s` so an unmapped status shows the **raw string** - the
"falls back to Uploading" behaviour is in the **dropdown**, a different bug in a different place.
And `PRE_APPROVAL` / `PRE_APPROVAL_STATUSES` **already exclude `upload_failed` correctly** - do
not "fix" them.

```powershell
npx firebase deploy --only functions      # from the PROJECT ROOT, not functions/
```
⚠ **`firebase deploy` can exit 0 with a function that FAILED.** S190's first run printed
`! failed to update ... getMyAddress` and still exited 0. **The real signal is the
`Deploy complete!` line** - check for it, not `$?`. See LEARNINGS.

```powershell
gcloud run deploy aevia-pdf-renderer --source C:/Users/evgmy/aevia-test --region europe-west1 --memory 8Gi --cpu 4 --timeout 900 --allow-unauthenticated --project aevia-uploads --quiet
```
(Redeploy the renderer BEFORE generating PDFs if template data or SVGs changed, or you bake
stale artwork.)

## Still open on the print path (unchanged from S189)
⚠ **`PRINTSMARTER_LIVE` is `true` and `submitPrintOrder` is deployed** - "Send to Printsmarter"
is armed beside "Preview submission". A misclick is a real book and a real invoice.
⚠ **The send confirm dialog misreports the address** - it reads the locally loaded
`order.shippingAddress` and shows "⚠ NO SHIPPING ADDRESS ON ORDER" exactly when S188's account
fallback is working. **Trust "Preview submission", not the dialog.** Fix is ~10 lines: have the
confirm call `dryRun` and show the resolved address. **Do it before the next send.**
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

## Where TO-DOS #89 stands
| Piece | State |
|---|---|
| 0 · Retry button on the order form | 🔴 **NOT BUILT** — touches `order.html`, needs `qa:order` |
| 1 · `upload_failed` + scheduled job | ✅ S190, deployed |
| 2 · Staff email moved to `confirmUpload` + transaction | ✅ S190, deployed |
| 3 · Customer email, suppressed on a later success | ✅ S190, deployed |
| 4 · Failure classification (4 dispositions) | ✅ S190, deployed |
| 5 · Transition IS the guard, no sent-flag | ✅ S190, deployed |
| 6 · Side-state, not in `STATUS_SEQUENCE` | ✅ S190, deployed |
| 7 · `uploadFailureDisposition` on the dashboard | ✅ S190, deployed |
| **Proven against a real stranded order** | 🔴 **NEVER RUN on real data** — see "Do this first" |

## Where Printsmarter stands
| Piece | State |
|---|---|
| `product_id` × 2 — offset (Heirloom) / matte (rest) | ✅ S188, both in `functions/.env`, both required |
| Token / customer id 3983 / base URL | ✅ set since S155 |
| `printsmarterPostback` | ✅ **deployed + verified live** (S185), 5 cases green |
| `submitPrintOrder` | ✅ **deployed S188** |
| `PRINTSMARTER_LIVE` | ✅ **`true`** — the send button is armed |
| Address fallback + dry run | ✅ S188 |
| Postback URL registered with them | ⏳ emailed, awaiting confirmation |
| **Their product setup** | 🔴 **BLOCKER — neither id resolves on their side (S189)** |
| A first live order | 🔴 **attempted S189, rejected `400 Product not found`** |

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
- **Why can't Printsmarter resolve their own product ids?** Asked 2026-09-21. Everything on our
  side is proven; this is the only blocker to a first book.
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
  snapshot tied to modification time. **Next move is instrumentation, not a fix** —
  `work/upload-file-read/brief.md` is PROVISIONAL and its prevention scope is unjustified.
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
- **Pre-13-July Papercut orders have `name`/`year` swapped in Firestore.**
- **Approval overwrites staff edits blindly.**
- **Prices live in THREE places** — Stripe, `assets/js/prices.js`, `PRICE_BY_PAGE_COUNT`.
- **Android is entirely untested on real hardware.**
- **Staff test password is weak** for an account that can read real customer orders.
