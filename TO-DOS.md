# Aevia — Backlog

> **Scope:** Items NOT covered by ROADMAP.md. Sequenced product build lives in ROADMAP.md.  
> Last pruned: 2026-05-28 — removed done items and anything now in ROADMAP chunks.

---

## Bugs & small fixes

| # | Item | Priority | Notes |
|---|------|----------|-------|
| 7 | Fix hero slide 3 text alignment | Medium | Slide 3 has inline `style="text-align:center"` while slides 1 & 2 are left-aligned. Remove the inline style. `pages/home.html:331` |
| 43 | Template engine scroll performance | Medium | After alt-tab and return, interface stalls 10–15s before responding. Investigate virtual scroll or viewport-gated rendering. `pages/template-engine.html` |
| 44 | Prune dashboard status bar | High | Status bar logic needs review — unclear what it currently shows, may have stale or redundant states. `pages/dashboard.html` |
| 57 | Customer save can override good staff book | High | Load precedence is customer > staff > defaults (`customer-preview.html:916-923`). A customer (or an automated approve) that serialises an empty/partial book writes `customerBookAssignments`/`customerCaptions` that REPLACE the intact staff arrangement on next reload. Bricked AEV-023's customer view (empty, 51 unplaced). The S22 approve-gate mitigates (can't approve incomplete) but the precedence + a possible save-before-render race need a real fix. |
| 58 | Configurator photo-count promise mismatch | Medium | scribble.html configurator says "approximately 36–45 photos" but order.html requires exactly **51** (configurator uses rough `BASE_PHOTOS` range; order form uses `calcPhotoTarget()` counting real slots). Customer is told one number then blocked mid-upload. Drive the estimate from the real number. (QA run01 finding.) **S23 80-page data point:** configurator promised "75–91 photos", order form required **106** main — mismatch is worse at 80 pages. |
| ~~63~~ | ~~Art gallery (FP5) renders the same artwork on both pages~~ | DONE | S23: separate from #61 (upload). The browser render resolved the artwork photo by `slotIdx` (`spArr[slotIdx]`), but each FP5 page has a single slot (slotIdx 0) → both pages showed artwork[0]. Was masked while #61 made both files identical; visible once #61 stored two distinct files. Fixed in `template-engine.html` + `customer-preview.html` (mirror): artwork pool now indexes by side (left=0, right=1). PDF (`export-pdf.js`) was already correct (used `artIdx = side==='left'?0:1`). 2026-06-03. |
| 62 | 80-page upload is slow (~3+ min) | Low | S23: an 80-page order = 110 files (cover+FP1+2 art+106 main) took **190.6s** to upload to GCS (~1.7s/photo); a 5-min cap timed out once on a slower pass (left orphan AEV-025). Real customer-UX concern — consider upload progress feedback / reassurance for large books. AEV-025 is a partial/orphan order to delete (see #60). |
| 59 | Server-side hardening for incomplete-book approve | Low | The S22 approve-gate is client-side only (blocks button + warn toast). A customer hand-editing JS could force-approve an incomplete book (only hurts their own order). Optionally re-check completeness in the `approveOrder` Cloud Function for defence-in-depth. |
| 60 | Clean up QA test orders | Low | AEV-023 (corrupted customer-side) + any orders the chain script creates are real Firestore test orders. Delete once QA automation is stable. AEV-024 added (S23). |
| ~~61~~ | ~~Art gallery (FP5) loses one photo on upload~~ | DONE | S23: `functions/upload.js` now appends `slotIndex` → stores `fp5-0.jpg`/`fp5-1.jpg` (distinct). DEPLOYED (`createUploadSession`). Verified on AEV-026 (fp5-0 1024×1536, fp5-1 736×1104). |
| 64 | Staff Save vs Export are two separate clicks (PDF footgun) | Medium | Engine has two buttons: **Save book state** (→ Firestore `saveStaffState`, feeds customer view + completeness guard) and **Export book state (JSON)** (→ GCS `book-state.json`, the ONLY thing the PDF reads). Easy to do one and forget the other; you only find out when a PDF fails with "No such object: …/book-state.json" (hit on AEV-026, S24). Fix options: (a) have Save also write the GCS JSON; (b) make `export-pdf.js` read staff state from Firestore (single source of truth). `pages/staff/template-engine.html` saveStaffBookState/exportToGCS. |
| 65 | Preview PDF is very large (~383 MB) | Low | The 80-page AEV-026 preview is 383 MB (full-res originals, no downscale). Fine for staff inspection but unwieldy to share. Consider a downscaled preview variant (print mode stays full-res). `scripts/export-pdf.js`. |
| 66 | Customer book load slow for large books | Low | AEV-026 (110 photos) took ~95s to fetch+render on the customer preview (sequential `fetch()` in `loadPhotos`, `customer-preview.html`). Distinct from #62 (upload). Parallelise fetches / show better progress. Surfaced when the QA chain had to wait for full render before approve (S24). |
| 68 | Photo upload is fragile if the tab closes | High | **Root cause (S39 investigation):** `createUploadSession` creates the order + sends BOTH staff and customer emails BEFORE any photo uploads (`functions/upload.js:156,194,276`). Photos then PUT directly browser→GCS, 5 at a time (`order.html:1759`), and the **server never hears back** that uploads finished. Closing the tab mid-upload = a silently truncated order: emails already sent, staff see e.g. 30 of 106 photos with no signal it's partial. **Fixes, cheapest first:** (a) `beforeunload` warning while uploads in flight (~10 min); (b) the PUT doesn't check its response status — a non-2xx (expired URL/403/500) is silently counted as success → check `res.ok` + retry 2–3× (~30 min, also a standalone bug); (c) proper: client calls back when all photos land → order gets an `uploadComplete` flag so the dashboard shows "uploading…" vs "ready" (~1–2 hrs, new function). True background upload (close tab, keep going) needs Service Worker Background Sync — high effort, weak Safari support, NOT recommended now. Evgeny flagged S39. |
| ~~54~~ | ~~Birthday spread left-page font wrong in PDF~~ | DONE | Not a font bug — a **size** mismatch. Engine renders text panels in raw CSS pt @96dpi (~1.26× bigger than nominal on the 3px/mm canvas); PDF read sizePt as true 72dpi pt, so it printed ~1.26× smaller. Fixed by scaling the PDF text-panel size by `PANEL_PT_SCALE = (96/25.4)/3` in `export-pdf.js`. Engines untouched (the bigger look is wanted). 2026-06-01. |
| ~~55~~ | ~~Photo crop mechanism — heart page~~ | DONE | Staff can drag the heart photo to reposition it inside the heart mask (so it never crops a face). Stored as `heartCrop` = per-photo `object-position` % (default 50/50 = old centred behaviour), keyed by photo name. Staff drag in `template-engine.html`; read-only apply in `customer-preview.html`; PDF replicates via scale-to-cover + `extract()` in `export-pdf.js`. Persisted through local export, cloud save/load (`staffHeartCrop` in `functions/index.js`). Scope: heart slot only — other slots match photo orientation so centre-crop is fine. Verified: staff drag + PDF export (2026-06-01). **Caveat: not yet tested in customer-preview view** (read-only render mirrors staff so expected to match). EXIF-orientation mismatch between processed pool photos and GCS originals is a pre-existing whole-pipeline concern, not specific to this. |

---

## Pre-launch — product & copy

| # | Item | Priority | Notes |
|---|------|----------|-------|
| 14 | Replace all placeholder template copy | Medium | All product pages have placeholder text. Needs real copy once templates are confirmed. |
| 15 | Copy audit — run `/stop-slop` | Medium | Remove generic AI-sounding phrases across all page copy before launch. |
| 47 | Mobile responsiveness — homepage + order form | High | Neither `pages/home.html` nor `pages/order.html` is properly optimised for mobile. Confirmed broken 2026-05-26. Template engine is staff-only, skip. |
| 44 | Book language option (EN / DE) | Medium | Customers order the book in English or German (printed captions, FP text labels). Add language selector to scribble.html and pass to order. |
| 8  | German language version of website | Medium | Austrian market expects German. Decide: toggle on same page or separate `/de/` pages. |

---

## Pre-launch — legal & ops

| # | Item | Priority | Notes |
|---|------|----------|-------|
| 25 | Terms & Conditions page | Low | Minimum: refund/returns policy. "Approve before you pay" covers a lot but something must be written before taking payments. |
| 16 | VAT handling | Medium | Austrian VAT is 20%. Must be shown clearly at checkout. Decide: prices inc. or exc. VAT. Before Stripe integration. |
| 27 | Copyright lines review | Low | Footer copyrights are placeholder. Review once templates and artist credits confirmed. |

---

## Pre-launch — marketing & discoverability

| # | Item | Priority | Notes |
|---|------|----------|-------|
| 11 | OG image tags | Medium | Controls how pages look when shared on WhatsApp/Instagram/iMessage. Without them links look blank. |
| 12 | SEO optimisation | Medium | Page titles, meta descriptions, alt text, structured data. Aevia pages currently have minimal SEO. |
| 9  | Google Analytics | Medium | No tracking currently. Need to know who's visiting before running any ads. |
| 10 | Meta Pixel | Medium | Required for running paid ads on Instagram and measuring conversions. |
| 21 | Instagram page creation | Medium | Core channel per concept test. Must exist before any word-of-mouth kicks in. |

---

## Post-launch — staff tools & ops

| # | Item | Priority | Notes |
|---|------|----------|-------|
| 1  | Review order page link in confirmation email | High | Link is implemented but approach needs review — token generation timing and email structure may be suboptimal. `functions/upload.js:130–226` |
| 50 | Sent snapshot visual view (`?view=sent`) | Low | Customer preview page should accept `?view=sent` param and render the `sentSnapshot` Firestore field instead of live customer state. Gives staff a visual audit of exactly what was sent vs what was approved. |
| 51 | Customer preview load performance | Low | Photos are fetched as blobs then converted to object URLs. Switch to using signed URL directly as `img.src` (Option 4) to let browser stream images progressively. Saves ~150MB round-trip through JS memory. |
| 2  | Dashboard: add previewUrl input field | High | Staff need to paste the GCS signed URL for preview PDF into Firestore without going to Cloud Console. `pages/dashboard.html` |
| 13 | Dashboard: overdue order tracking | Medium | Highlight orders that haven't moved status in X days. Prevents orders falling through cracks. `pages/dashboard.html` |
| 30 | Dashboard: internal notes per order | Low | Free-text field on each order for staff notes (e.g. "customer requested warmer tones"). `pages/dashboard.html` |

---

## Post-launch — template assets (waiting on Kseniia)

| # | Item | Priority | Notes |
|---|------|----------|-------|
| 48 | Bleed SVGs: re-upload at 206×206mm + adjust CSV coords | High | Kseniia re-exports all spread SVGs with 3mm bleed. Steps: (1) replace files in `assets/Template_Scribble/Spreads/`; (2) update coords in `Scribble_sizing_full.csv` if positions changed; (3) run `node csv-to-template.js`; (4) SVG offset −9px in engine, SVG at origin in PDF. |
| 49 | Caption box coordinates in spreads CSV | High | Add explicit x/y/w/h columns to `Scribble_sizing_full.csv` for caption boxes, same pattern as cover CSV. Update `csv-to-template.js`, engine, and `export-pdf.js`. Needs Phase 14 plan before starting. |
| 42 | scribble.html: FP selector + photo count calculator | High | Add FP1–FP5 optional add-on cards with placeholder images + live photo count to product page. |

---

## Post-launch — customer experience

| # | Item | Priority | Notes |
|---|------|----------|-------|
| 17 | Customer delivery tracking | Medium | Send tracking number to customer when status → `in_delivery`. `my-order.html` should display it. |
| 18 | Post-delivery review collection | Medium | Automated email asking for review/testimonial after delivery. Warm leads from concept test are first targets. |
| 19 | Repeat-order prompt | Medium | Email or `my-order.html` CTA: "Make another book?" |

---

## Post-launch — growth & content

| # | Item | Priority | Notes |
|---|------|----------|-------|
| 20 | Artist profile pages | Medium | Dedicated page per artist — bio, style, which templates. Key differentiator. When 3+ templates are live. |
| 26 | Quality promise page | Low | Advertise paper quality, printing specs, finish options. Needs real photoshoot of printed books. |
| 28 | Press / "as seen in" section | Low | Placeholder space on homepage. Low effort once there's something to show. |
| 22 | Instagram content tooling | Low | Evaluate Later, Buffer, or Notion-based planning. |
| 23 | Newsletter setup | Low | Decide on email tool first (Mailchimp, Brevo, etc.). Footer subscribe form currently leads nowhere. |
| 24 | Footer subscribe form → real email tool | Low | Wire to chosen email tool. |
| 29 | Referral mechanic | Low | After first 20 orders. 50% of concept test participants signed up — warm audience. |

---

## Technical improvements

| # | Item | Priority | Notes |
|---|------|----------|-------|
| 53 | Improve photo upload speed on order form | Medium | 1.12 GB took 5+ min. Current approach: sequential fetch() calls to GCS signed URLs. Plan: (1) parallelise to 4–6 concurrent uploads; (2) consider client-side resize before upload; (3) per-file speed estimate in progress overlay. `pages/order.html` submitOrder(). |
| 56 | Post-payment confirmation email to customer | Medium | After successful payment (Stripe `checkout.session.completed`), send the customer an email confirming payment + next steps (production timeline, delivery). Currently only a staff notification is sent on payment. Add to `stripeWebhook` in `functions/index.js` (mirror the existing staff email + order-submission confirmation email pattern). |
| 67 | Rich-text caption editor — partial styling + robustness | Medium | The contenteditable caption editor can't style PART of a caption (e.g. bold "Day 1–3" while "Vienna" stays regular) — styling applies to the whole field. Worse, users will instinctively press **Ctrl+B** to bold a selection, and the editor behaves unpredictably (browser `execCommand` injects inconsistent markup; our save/load may strip or mangle it). FIX: (1) decide the supported model — inline spans for bold/italic on selected runs, vs. whole-field only; (2) intercept Ctrl+B / Ctrl+I and normalise to our own markup; (3) sanitise on paste + save so stored HTML is predictable; (4) ensure engine ↔ customer ↔ PDF all render the same inline styles (parity). MUST include a proper automated test exercising: select-and-bold a substring, Ctrl+B shortcut, paste mixed formatting, save→reload round-trip, PDF render of the styled caption. Editors: `pages/staff/template-engine.html` + `pages/customer-preview.html` (mirrored); PDF reader `scripts/export-pdf.js`. |

---

## Future / low priority

| # | Item | Priority | Notes |
|---|------|----------|-------|
| 31 | Turkish / Russian language version | Low | After German. Based on audience data or order patterns. |
| 32 | B2B order flow | Low | After B2C MVP validated. Photographers, HR managers, event agencies. |
| 40 | iOS + Android app via Capacitor | Low | After web version is stable end-to-end. Wrap existing HTML/CSS/JS in Capacitor — no rewrite needed. Mac available for iOS build. |
