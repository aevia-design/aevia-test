# Brief: Photo format handling

**Created:** 2026-08-11 (S164)
**Objective:** Make every uploaded photo that a competitor would accept survive intact from
the customer's phone to the printed book, and make our customer-facing copy describe what we
actually do.
**Audience:** The developer implementing this (a future session or another agent), and the
owner approving the copy changes.
**Applicable standards:** `CLAUDE.md` (simplicity, surgical edits, root cause, verification
before "done"), engine-parity rule, `/stop-slop` for customer-facing copy.
**Branch:** `s164/photo-formats` (worktree `C:/Users/evgmy/aevia-s164`), parallel to S163.

---

## Why

A customer ordering from an iPhone loses their HEIC photos. This is live on the production
rig and proven, not suspected: order **AEV-094** uploaded 52 photos (38 JPEG, 14 HEIC), all 52
reached GCS, and the staff engine displayed **38** with 14 empty slots. The engine is where
the book is laid out, so those empty slots would be saved into the book and carried to print.
iOS defaults to HEIC, so this affects most iPhone customers.

It went unnoticed because all previous testing was done from a Windows desktop, which sends
JPEG. The owner placing one order from an iPhone on 2026-08-11 was the first exercise of the
HEIC path end to end.

The underlying cause is broader than one bug. Six places in the codebase each decide
independently what counts as "a photo", and they disagree — which is also why WebP, AVIF and
BMP are accepted by drag-and-drop but cannot be processed downstream, and why the help text
promises RAW support that has never existed.

---

## Evidence base (all verified this session — do not re-derive)

| Claim | Status | How it was established |
|---|---|---|
| HEIC photos dropped between GCS and engine | **Confirmed, live** | AEV-094: 52 uploaded, 38 shown, 14 HEIC missing. Arithmetic exact. |
| Derivatives keep `.heic` name but hold JPEG bytes | **Confirmed** | `previews/photo_024.heic` has `Content-Type: image/jpeg`; original has `image/heic` |
| `heic-convert` rejects JPEG bytes | **Confirmed** | Executed: `input buffer is not a HEIC image` |
| Failure drops the photo with no staff-visible error | **Confirmed** | `template-engine.html:1502` returns `null` |
| `sharp` strips EXIF rotation without `.rotate()` | **Confirmed mechanism** | Executed: 800×400 + tag 6 → 800×400 tag stripped; with `.rotate()` → 400×800 |
| …but rotation is not currently biting | **Confirmed** | AEV-094: owner reports no photo loaded sideways |
| iCloud Shared Album photos are downscaled to 2048px long edge | **Confirmed** | [Apple Support 108916](https://support.apple.com/en-us/108916). Explains AEV-094's low-res flags |
| Industry standard is JPG + PNG + HEIC | **Confirmed** | `photo-formats-competitor-baseline.md` |
| No competitor accepts RAW | **Confirmed** | Same |
| Android-specific format claims | **Unverified** | No Android device available. Build defensively instead of guessing |

**Not a bug, ruled out:** AEV-094's missing `cover/` folder (Wander has no cover photo by
design) and missing `special_pages/` folder (the travel map is generated from itinerary text).
The "50 objects" the owner saw in the console was pagination — there are 52.

---

## Scope

### Tier 1 — Fix the live bug

- [ ] HEIC detection identifies files by **content, not filename**, in the **two** surfaces that
      convert HEIC: `pages/staff/template-engine.html` (`isHeicFile`, L1410–1420) and
      `pages/spread-preview.html` (L409)
- [ ] **`customer-preview.html` is NOT in scope and needs no change.** Verified S164: it
      contains no HEIC code at all — `fetchPhoto` (L1428–1443) only reads image dimensions and
      hands the URL to the browser, which decodes by content and renders a JPEG-named-`.heic`
      correctly. The engine-parity rule does not apply because there is no parallel code here.
      Do not "restore parity" by adding conversion to this file
- [ ] The fix is in the **read path** — how a fetched file is classified. **No derivative is
      regenerated, renamed or re-uploaded.** Existing orders including AEV-094 are repaired by
      the reading code alone. Do not attempt a bulk regeneration of derivatives in GCS: it is
      unnecessary and would cost real egress
- [ ] A regression test feeds JPEG bytes under a `.heic` filename through the detector — the
      exact case nobody wrote
- [ ] A conversion failure is **surfaced to staff**, not silently swallowed. Today a dropped
      photo is indistinguishable from one the customer never uploaded

**Approach note (constraint, not preference):** do **not** fix this by renaming derivatives to
`.jpg`. `deriveDerivativePath` is a pure function `getOrder` depends on, it has tests, and
legacy orders resolve through it. Renaming fixes only future orders and leaves every existing
one broken. Byte-sniffing fixes both and is smaller.

### Tier 2 — One format policy

- [ ] A single source of truth for accepted formats, consumed by the `accept` attribute, the
      drag-and-drop validator, and the derivative generator
- [ ] The six current definitions reconciled: `order.html:435` (accept attr), `order.html:2932`
      (`isImage`), `order.html:2936` (`isHeic`), `functions/upload.js` (none),
      `derivative-utils.js:50` (`isImageFile`), `photo-utils.js:5` (`isRaw`)
- [ ] `.heif` accepted wherever `.heic` is — the staff engine already lists it, the order form
      does not
- [ ] Formats we do not support are refused **at the door with a clear reason**, never accepted
      and then silently failed downstream
- [ ] The browser decode test at `order.html:2071` stays as the final arbiter — it is the only
      check that tests the file rather than its name
- [ ] RAW rejected with an actionable message ("export as JPEG first"), not "your file may be
      damaged"

### Tier 3 — Correctness and cost

- [ ] `.rotate()` added to `generateDerivative` (`functions/index.js:1780`). One word. A no-op
      for files already correctly oriented, insurance for those that are not
- [ ] Every accepted format produces a derivative, or is not accepted. Today AVIF and BMP pass
      the door and then fall back to full-size originals, costing the egress the derivative
      system exists to prevent

### Tier 4 — Tell the customer the truth

- [ ] `JPEG or RAW both work` removed from all four locations: `pages/help.html:295`,
      `docs/website-copy-EN.md:232` and `:302`, `docs/website-copy-DE.md:222` and `:292`
- [ ] Format copy follows the pattern that reads best in the market (Papier's): **name the
      closed list, then say what to do about a file that is not on it**
- [ ] The four `dz-formats` labels in `order.html` (L438, L877, L897, L1186) match the policy
- [ ] **New:** warn customers that photos pulled from an iCloud Shared Album arrive at 2048px
      and are not print resolution. Nobody currently tells them, and a shared album is one of
      the most natural places for a couple to collect photos for a book
- [ ] EN copy passes `/stop-slop`; DE mirrors it and follows the S162 address rule
      (`du` = the buyer; `euer/ihr` = the people in the book)

---

## Decisions taken (owner, 2026-08-11 — settled, do not re-raise)

1. **WebP is REFUSED.** Only Artifact Uprising accepts it and the print industry broadly
   rejects WebP and AVIF as screen-delivery formats. The accepted list is the industry-standard
   three: **JPG/JPEG, PNG, HEIC/HEIF**. Rationale: every additional accepted format is another
   thing to test on every future template, for a format almost no customer will present.
   Consequence, and it is a **Tier 2 action not a footnote**: `isImageFile` in
   `derivative-utils.js:54` currently accepts six extensions (`jpg jpeg heic png webp gif`).
   Leaving it would be harmless at runtime once the door is closed, but it would leave the
   policy saying three and the code saying six — which is the exact disease Tier 2 exists to
   cure. **Reduce it to the accepted list and update `tests/derivative-paths.test.js`
   accordingly.**
2. **Per-file cap: 40 MB**, matching Artifact Uprising, the closest premium comparator. High
   enough that no phone photo approaches it, low enough to stop a 500 MB scan. Must be enforced
   (currently `functions/upload.js` validates nothing) **and** stated in the copy.

---

## Constraints

- **Do not touch Heirloom files.** S163 is finishing Heirloom in the main checkout in parallel.
  Expect a merge conversation over `pages/order.html` regardless.
- Frontend stays plain HTML/CSS/JS, no build step, no new frontend dependency.
- Engine parity is mandatory **where parallel code actually exists** — verify before mirroring
  rather than assuming all surfaces carry the same logic (see Known risks).
- `npm test` and `npm run qa:order` must both pass before pushing. `npm test` does **not**
  execute `order.html` — that is how a crash reached the live rig in S154 with 281 tests green.
- Do not run local PDF renders or bulk GCS downloads (egress on the owner's bill). GCS
  *listing* and metadata reads are free and were used throughout this investigation.
- **Out of scope:** supporting RAW (no competitor does; copy fix only), the Android specifics
  (unverified, no device — the byte-sniffing approach covers them without guessing),
  TO-DOS #102 (`[object Object]` in `order-details.txt`), and the upload-speed work in #53.

---

## Success criteria

Complete when:

1. An order placed from an iPhone with HEIC photos shows **every** photo in the staff engine.
   Verifiable immediately by reloading **AEV-094** — it must show 52, not 38, with no
   regeneration of stored files.
2. A file the system will not accept is refused at upload with a message naming the accepted
   formats and what to do instead — never accepted and silently dropped later.
3. Every format the order form accepts produces a web derivative.
4. `help.html` and both copy files describe exactly what the code does, in EN and DE.
5. `npm test` and `npm run qa:order` pass, including a new test for JPEG-bytes-named-`.heic`.

---

## References

**Research:** `docs/briefs/photo-formats-competitor-baseline.md` (S164) — competitor baseline,
including the caveat that competitor claims come from a search index, not pages opened
directly. Owner has since confirmed Papier and Artifact Uprising verbatim; **Journi documents
no formats at all**, so our copy only has to beat Papier's.

**Prior art:** `docs/briefs/upload-failures.md` — closed S150 without root cause. Read before
touching the upload path. `docs/briefs/web-res-previews.md` — chunk-023, the derivative
system's design intent (egress reduction ~€1.10 → ~€0.02 per order).

**Key code:** `pages/order.html` (2932, 2936, 2965, 2071, 435), `functions/index.js` (1780,
1750, 205), `functions/derivative-utils.js` (50), `functions/upload.js` (96), `assets/js/photo-utils.js` (5),
`pages/staff/template-engine.html` (1410, 1448, 4975).

---

## Known risks

- **`isHeicFile` is `async` and reads bytes** — the magic-byte branch already exists at
  `template-engine.html:1418`; reordering makes it run on every file rather than none. Check
  it does not slow a 100-photo order load. Reading the first 12 bytes of an already-downloaded
  blob should be free, but measure rather than assume.
- **Two surfaces drift.** Engine parity has already caused two production bugs (S159, S162).
  Changing `template-engine.html` and forgetting `spread-preview.html` is the most likely way
  this fix fails. Note the parity rule is narrower here than the habit suggests — an S164
  review caught this brief itself wrongly asserting a third surface (`customer-preview.html`)
  that has no HEIC code. **Check before mirroring.**
- **`order.html` is ~2500 lines with heavy inline JS** and is the file S163 may also touch.
- **AEV-094 is the regression fixture.** It is a real order in the live bucket with a known-bad
  shape (38 JPEG + 14 HEIC). Do not delete it.
