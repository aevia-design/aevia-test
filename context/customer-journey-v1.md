# Customer Journey — Version 1
_Last updated: 2026-05-21_

This file tracks the full intended product flow. Update it as decisions are made and features are built.

---

## Full Flow

### 1. Customer opens website
**Status:** Built  
Pages: home, collections, product pages (multiple templates live)

---

### 2. Customer finds template, selects options
**Status:** Built (basic)  
Customer picks template + page count on product page.  
Optional functional pages (e.g. birthday wishes, funny words, art gallery) selectable — photo count updates live.  
**Not yet built:** FP selector + live photo count on bloom.html (Plan 10-01)

---

### 3–5. Customer uploads photos + submits order → GCS
**Status:** Built  
- Order form at `pages/order.html`
- Firebase Cloud Function `createUploadSession` creates order number (AEV-XXX), uploads photos to GCS, saves order to Firestore, sends confirmation email to customer + internal notification to xenia@aevia.at

---

### 6. Template auto-population

**Decision made:** Templates are built in HTML/CSS. Staff uses a browser-based tool (`pages/template-engine.html`) to assemble the book. A Node.js/Puppeteer script will later render the final PDF.

**How the staff tool works (built for Scribble template):**
- Staff opens `template-engine.html`, uploads the customer's photos
- Photos are sorted by EXIF date and auto-placed into spread slots
- Staff drags photos between slots, reorders spreads, swaps spread types
- Special functional pages (FP1–FP5) have dedicated upload zones
- Captions are edited inline; AI suggestion button available per slot

**Template data architecture:**
- Each template has a `template-data.js` defining spread types, slot coordinates, SVG overlays, background colors, caption positions, and special flags
- Source of truth is a CSV (`Scribble_sizing_full.csv`); regenerate with `node csv-to-template.js`
- Template engine reads generic flags from the data file — it is template-agnostic

**EXIF sorting:** Browser reads `DateTimeOriginal` from JPEG EXIF via a JS library. HEIC files are converted first via libheif WASM (sequentially — parallel conversion corrupts images due to shared WASM state).

**Status:** Built and working for Scribble template. Remaining work on the tool: resolution warnings, RAW file blocking (Plan 09-01). Other templates not yet digitised.

---

### 7. Captions

**Status:** Built (in template engine)

Flow:
1. Staff checks if customer left photo-specific comments in the order — if so, these seed the captions
2. For each captionable slot, staff can click an AI button to generate a caption suggestion
3. AI uses tone-of-voice rules from `functions/caption/caption-voice.md` and receives the last 8 captions as context to avoid repetition
4. Staff edits or regenerates; captions saved in `window.bookCaptions` in the browser session
5. Captions persist into the PDF when Puppeteer rendering is built (Phase 2)

**Caption voice rules (key):** No "A/An" opener, no trailing period, no trailing comma. Warm, personal, child-focused for Scribble template.

---

### 8. PDF generation
**Status:** Not yet started

Two PDFs per order:
- **Preview PDF** — lower resolution, watermarked, for customer approval
- **Print PDF** — full resolution (300 DPI equivalent), no watermark, for print house

**Tool:** Puppeteer (Node.js) — renders the filled HTML template to PDF.

**Critical:** Must use `deviceScaleFactor: 6+` and `@page` dimensions in mm (206mm × 206mm). Do NOT use `window.print()` — browser PDF renderer ignores deviceScaleFactor and produces too-low DPI output.

---

### 9. Sending preview to customer
**Status:** Not yet started

**Plan:** Customer gets a link to a hosted preview on a dedicated page on the Aevia site (preferred over email attachment). GCS signed URL delivers the PDF; page is branded and shows order details.

---

### 10. Customer response
**Status:** Not yet started

Three cases:

**a. Customer approves and pays**
- Stripe Checkout Session link in the preview email
- On payment: Stripe webhook → Cloud Function updates order status to `paid` → Aevia notified

**b. Customer requests changes (one revision)**
- Customer submits feedback via the preview page
- Staff adjusts in `template-engine.html` and re-exports

**c. No response**
- Firebase Scheduled Function sends reminder email after X days

---

### 11–12. Order sent to print house
**Status:** Not started. Needs print house decision.

If print house has API (Prodigi, Gelato, or local Vienna partner):
- On `paid` status: Cloud Function calls print API with order specs + print PDF URL
- Print house pulls the PDF, queues printing

---

### 13–16. Printing, shipping, tracking, delivery
**Status:** Not started

- Print house handles shipping, generates tracking numbers
- Webhook from print provider fires when shipped → Cloud Function → customer email with tracking link
- Aevia dashboard auto-updates to `in_delivery` → `delivered`

---

## Status vocabulary (dashboard)

```
new           → order submitted, photos uploaded
designing     → Aevia is working on the layout
needs_info    → problem with photos (low-res, wrong count, etc.) — can be set at any stage
review_sent   → preview sent to customer
approved      → customer approved the design
paid          → payment received
sent_to_print → order transmitted to print house
printing      → print house confirmed receipt / in production
in_delivery   → shipped, tracking number available
delivered     → confirmed delivered
```

---

## Tech stack

| Tool | Purpose | Status |
|------|---------|--------|
| Firebase Cloud Functions (Node.js) | Order creation, emails, caption AI | Live |
| Firestore | Order storage | Live |
| GCS | Photo storage, PDF delivery | Live |
| Claude API (vision) | Caption suggestions | Live (via generateCaption function) |
| `libheif` WASM | HEIC → JPEG conversion in browser | Live (in template engine) |
| Replicate API + Kevin Lucbert LoRA | Interior motif generation | Live (motif-engine/) |
| `puppeteer` | HTML → PDF generation | Not yet built |
| `stripe` | Payment processing | Not yet built |
| Firebase Scheduled Functions | Reminder emails | Not yet built |
| Print house API (TBD) | Send order to print | Not yet built |

---

## Open decisions

1. **Print house** — local Vienna partner vs. API-capable (Prodigi, Gelato)?
2. **Preview delivery** — dedicated preview page vs. GCS signed URL in email?
3. **Customer revision flow** — web form vs. email?
4. **Stripe** — Payment Links (manual) or Checkout Sessions (automated)?
