# Customer Journey — Version 1
_Last updated: 2026-04-06_

This file tracks the full intended product flow. Update it as decisions are made and features are built.

---

## Full Flow

### 1. Customer opens website
**Status:** Built  
Pages: home, collections, product pages (9 templates)

---

### 2. Customer finds template, selects options
**Status:** Built (basic)  
Customer picks template + page count on product page.  
**Not yet built:** special/add-on pages (e.g. title spread, caption pages, extra prints)

---

### 3–5. Customer uploads photos + submits order → GCS
**Status:** Built  
- Order form at `pages/order.html`
- Firebase Cloud Function creates order number (AEV-XXX), uploads photos to GCS, saves order to Firestore, sends confirmation email to customer + internal notification to xenia@aevia.at

---

### 6. Template auto-population (THE CORE AUTOMATION PROBLEM)

**Goal:** Once photos are uploaded, a script reads their EXIF date metadata, sorts them chronologically, and pre-places them into the correct template — so the human reviewer only needs to make small adjustments rather than doing everything manually.

**Critical architecture decision: what format are templates in?**

Options evaluated:

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Adobe InDesign + IDML scripting | Industry standard, exact print control | InDesign Server ~$800/mo, complex | Too expensive for MVP |
| **HTML/CSS → PDF via Puppeteer** | Free, fully automatable, Claude can help build, PDF output accepted by print houses | Requires templates coded in HTML, not Adobe | **Recommended** |
| Affinity Publisher scripting | Cheap license | Very limited automation APIs | Not viable |
| Figma API | Easy to design in | Not built for print, poor PDF export | Not viable |

**Decision (pending confirmation):** Build templates in HTML/CSS. Generate print-ready PDF via Puppeteer (headless Chrome). This keeps everything in the existing Node.js stack and makes full automation possible.

**What "digitizing" templates means in this approach:**
- Each template (Bloom, Devotion, etc.) becomes an HTML layout file
- Photo slots are `<div>` or `<img>` placeholders with defined dimensions
- Caption slots are `<p>` placeholders
- A Node.js script reads the order from Firestore, fetches photos from GCS, sorts by EXIF date, fills in the slots, and renders to PDF

**EXIF sorting:** Use the `sharp` or `exiftool-vendored` Node.js library to read `DateTimeOriginal` from each photo.

**Status:** Not yet started. Needs template format decision confirmed.

---

### 7. Captions

Some template pages have caption placeholders. The flow:

1. After photos are pre-placed, the internal tool shows each photo with its caption slot
2. Aevia staff writes or edits captions — or AI suggests them
3. AI assistance: use Claude API (vision) to analyze each photo and suggest a caption in Aevia's brand tone
4. Staff approves/edits, captions are saved to Firestore against the order

**Why an internal tool beats copy-pasting into Claude.ai:**
- Photos stay in GCS — no manual download
- Captions are saved directly to the order record
- Can preview captions in the actual template layout before generating PDF
- Batch workflow — all photos for one order in one screen
- Brand tone can be enforced via system prompt (Claude API)

**Status:** Not yet started. Depends on template system (step 6).

---

### 8. PDF generation

Two PDFs per order:
- **Preview PDF** — low resolution, watermarked, for customer approval
- **Print PDF** — full resolution (300 DPI equivalent), no watermark, for print house

**Tool:** Puppeteer (Node.js) — renders the filled HTML template to PDF.

**Status:** Not yet started.

---

### 9. Sending preview to customer

Options:
- Email with PDF attachment (if file is small enough — preview PDFs for a 30-page book ~5–15MB)
- Email with a link to a hosted PDF on GCS (signed URL, expires after X days)
- Dedicated preview page on the site (nicer UX, but more work)

**Recommendation for MVP:** GCS signed URL in email. Keeps email lightweight and avoids attachment size limits.

**Status:** Not yet started.

---

### 10. Customer response

Three cases:

**a. Customer approves and pays**
- Stripe Payment Link in the email (currently: manual, generated per order)
- On payment: Stripe webhook fires → Cloud Function updates order status to `paid` in Firestore → Aevia notified

**b. Customer requests a change (one revision)**
- Customer replies to email with feedback
- Aevia adjusts, regenerates PDF, resends
- Maximum one revision iteration before payment (policy decision)
- Could build a lightweight revision request form later (avoids email threading)

**c. Customer doesn't respond**
- Automated reminder email after X days (e.g. 3 days, then 7 days)
- Firebase Scheduled Functions can handle this — check Firestore for orders in `review_sent` status older than threshold

**Status:** Stripe Payment Link = manual for now. Webhooks and reminders = not yet started.

---

### 11–12. Order sent to print house

**If print house has API (e.g. Prodigi, Gelato):**
- On `paid` status: Cloud Function calls print API with order specs + print PDF URL
- Print house pulls the PDF, queues printing
- Prodigi and Gelato both operate in Europe and accept photo book specs

**If no API (local print house):**
- Semi-automated: Cloud Function emails print-ready PDF + order spec sheet to the print house
- Manual confirmation step for Aevia

**Open question:** Which print house will Aevia use? This determines feasibility of API integration.

**Status:** Not started. Needs print house decision.

---

### 13–14. Printing + shipping

If using Prodigi/Gelato:
- They handle shipping, generate tracking numbers
- Customer address passed in the API call from step 11

If using local print house:
- Aevia provides customer shipping address
- Print house ships directly or sends to Aevia for QC first (TBD)

---

### 15. Tracking + customer notification

**If print API:**
- Webhook from print provider fires when order ships → Cloud Function captures tracking number → Aevia dashboard updated → Customer email sent with tracking link (from aevia@aevia.at or xenia@aevia.at)

**If no API:**
- Print house emails tracking number to Aevia → manual entry in dashboard → email sent to customer

**Automated customer email** (e.g. "Your Aevia book is on its way!") with DHL/GLS tracking link — should come from Aevia, not the print house, to maintain brand experience.

---

### 16. Delivery confirmation

- Delivery provider (DHL etc.) sends delivery confirmation to customer automatically
- Aevia dashboard: staff manually marks `delivered`, or a webhook from Prodigi/Gelato auto-updates
- Orders older than X days in `in_delivery` status could be auto-flagged for follow-up

---

## Status vocabulary (dashboard)

```
new           → order submitted, photos uploaded
designing     → Aevia is working on the layout
needs_info    → problem with photos (low-res, wrong count, etc.) — can be set at any stage
review_sent   → preview PDF sent to customer
approved      → customer approved the design
paid          → payment received
sent_to_print → order transmitted to print house
printing      → print house confirmed receipt / in production
in_delivery   → shipped, tracking number available
delivered     → confirmed delivered
```

---

## Tech stack additions needed (beyond what's built)

| Tool | Purpose | When needed |
|------|---------|-------------|
| `sharp` (Node.js) | Read EXIF metadata, resize images | Step 6 |
| `puppeteer` (Node.js) | HTML → PDF generation | Step 8 |
| `stripe` (Node.js + webhooks) | Payment processing | Step 10 |
| Claude API (vision) | Caption suggestions | Step 7 |
| Firebase Scheduled Functions | Reminder emails | Step 10c |
| Print house API (Prodigi/Gelato TBD) | Send order to print | Step 11 |
| Shipping carrier API or print API webhooks | Tracking numbers | Step 15 |

---

## Open decisions

1. **Template format** — HTML/CSS (recommended) vs Adobe?
2. **Print house** — local (Vienna) vs API-capable (Prodigi, Gelato)?
3. **Customer revision flow** — email-based vs web form?
4. **Preview delivery** — PDF attachment vs GCS signed URL vs preview page?
5. **Stripe** — Payment Links (manual) or Checkout Sessions (automated)?
