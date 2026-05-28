# Customer Journey — Version 1
_Last updated: 2026-05-28_

This file tracks the full intended product flow. Update it as decisions are made and features are built.

---

## Full Flow

### 1. Customer opens website
**Status:** Built  
Pages: home, collections, product pages (Scribble template live at `pages/scribble.html`).

---

### 2. Customer selects template, addons, page count
**Status:** Built for Scribble  
Customer picks template on the product page, selects functional page addons (birthday wishes, funny words, art gallery, etc.), selects 40 or 80 pages. Photo count updates live based on selections.

**Not yet built:** Same flow for any second template (Scribble is the only digitised one).

---

### 3. Customer fills order form + uploads content
**Status:** Built  
- Order form at `pages/order.html`
- Step 1: contact details (name, email, album notes — child name, personality, etc.)
- Step 2: per-FP upload zones and text fields (birthday wishes, funny words, etc.) + main photo pool upload
- Quality badge shown per photo (OK / LOW RES); HEIC auto-converted to JPEG in browser
- Full-screen frosted-glass upload overlay with progress bar + humour lines while uploading

---

### 4. Order created → GCS + Firestore + emails
**Status:** Built  
Firebase Cloud Function `createUploadSession`:
- Creates order number (AEV-XXX)
- Uploads photos to GCS; writes `order-details.txt` (human-readable summary) and `photoManifest` to GCS/Firestore
- Saves order to Firestore (customer name, email, template, page count, FP selections, FP texts, album notes)
- Sends confirmation email to customer + internal notification to xenia@aevia.at
- Order appears in Aevia staff dashboard (`pages/dashboard.html`)

---

### 5. Staff opens template engine, loads order
**Status:** Built  
Staff opens `pages/template-engine.html` (local only — not on Cloudflare), enters order number, clicks Load.

- `getOrder` Cloud Function fetches Firestore doc + generates 1h signed GCS read URLs
- Photos download automatically (pool + cover + FP specials), sorted by EXIF date
- FP checkboxes pre-ticked, page count set, FP text panels pre-filled (birthday wishes, funny words, etc.)
- Order info panel shows customer name + album notes + FP texts above the spread view

**HEIC:** Converted in browser (sequential — parallel corrupts shared WASM state). Covers both uploaded HEIC and any new local files added by staff.

---

### 6. Staff reviews layout, adjusts, adds captions
**Status:** Built  
- Photos auto-placed into spread slots (EXIF date order)
- Staff drags photos between slots, reorders spreads, swaps spread types
- Caption overlays editable inline; AI caption button generates suggestion per slot
  - AI uses tone-of-voice rules from `functions/caption/caption-voice.md`
  - Receives last 8 captions as context to avoid repetition
  - Customer's FP texts (birthday wishes, funny words) are already pre-filled — staff does not re-enter
- Resolution warnings: not yet built (Plan 09-01)

---

### 7. PDF generation
**Status:** Built  
`scripts/export-pdf.js` (Node.js, run locally by staff):
- Two modes: `--mode preview` (lower resolution) and `--mode print` (full resolution, ~18 DPI equivalent at 6× scale)
- Exports cover PDF (445×236mm with 18mm bleed) + per-page PDFs
- SVG artwork rendered with bleed-expanded viewBox so decorative elements reach the bleed edge
- EB Garamond captions with per-character rendering (ligature workaround for pdf-lib)
- Blank QR page appended (required by print house)
- Staff exports `book-state.json` from engine, passes it to the script

**Not yet built:** Auto-save PDF to GCS; download link returned to staff.

---

### 8. Staff sends preview to customer
**Status:** Not yet built  
**Plan:** Staff uploads preview PDF to GCS, generates a signed URL, sends it to customer via a branded preview page on the Aevia site (preferred over raw PDF link in email).

---

### 9. Customer reviews the book
**Status:** Not yet built  
Two planned options (both on the roadmap, neither started):

**9a. Page-flip viewer (TO-DO #51)**  
StPageFlip JS library, individual page PNGs exported from the script, embedded in a branded preview page. Customer gets a realistic book-flipping experience. Estimated ~2 days work, high visual impact.

**9b. Limited customer engine (TO-DO #52 — decision deferred)**  
Same codebase as staff engine, accessed via `?mode=customer&token=ORDER_TOKEN`. Features disabled: spread reorder/swap, AI caption button, export. Features kept: thumbnail drag-and-drop, manual caption edit, FP text panel. "Submit changes" saves updated captions + assignments + FP texts to Firestore. Eliminates email back-and-forth for minor adjustments. Decision deferred — assess after 9a is shipped.

---

### 10. Customer approves + payment
**Status:** Not yet built  
**Current plan (MVP):** Post-payment approval — customer approves the design first, staff then requests payment manually (Stripe Payment Link). Later: move to pre-payment Checkout Session.

Three cases:

**a. Customer approves**  
Staff marks order `approved` in dashboard. Payment link sent manually (Stripe) or triggered automatically.

**b. Customer requests changes (one revision)**  
Customer submits feedback via preview page → staff adjusts in template engine and re-exports.

**c. No response**  
Firebase Scheduled Function sends reminder email after X days. Not yet built.

On payment received: Stripe webhook → Cloud Function updates order status to `paid` → Aevia notified.

---

### 11. PDF exported, saved to GCS, staff QA
**Status:** Not yet built  
After payment, staff runs `export-pdf.js --mode print`, PDF saved to GCS. GCS signed URL returned to staff for final QA check. Staff reviews PDF, clicks "Approved for print" in dashboard (or equivalent).

---

### 12. Order sent to print house
**Status:** Not started. Needs print house decision.  
On staff approval: Cloud Function calls print house API with order specs + print PDF GCS URL. Print house pulls the PDF, queues printing.

**Open decision:** Local Vienna partner vs. API-capable (Prodigi, Gelato)?

---

### 13–15. Printing, shipping, tracking, delivery
**Status:** Not started  
- Print house handles shipping, generates tracking number
- Webhook fires when shipped → Cloud Function → customer email with tracking link
- Dashboard auto-updates: `sent_to_print` → `printing` → `in_delivery` → `delivered`

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
| Firebase Cloud Functions (Node.js) | Order creation, emails, caption AI, getOrder | Live |
| Firestore | Order storage + photoManifest | Live |
| GCS | Photo storage, order-details.txt, PDF delivery | Live |
| Claude API (vision) | Caption suggestions | Live (via generateCaption function) |
| `libheif` WASM | HEIC → JPEG conversion in browser | Live (template engine + order form) |
| Replicate API + Kevin Lucbert LoRA | Interior motif generation | Live (motif-engine/) |
| `pdf-lib` + `sharp` | PDF generation (export-pdf.js) | Built, runs locally |
| StPageFlip | Page-flip preview viewer | Planned (TO-DO #51) |
| `stripe` | Payment processing | Not yet built |
| Firebase Scheduled Functions | Reminder emails | Not yet built |
| Print house API (TBD) | Send order to print | Not yet built |

---

## Open decisions

1. **Print house** — local Vienna partner vs. API-capable (Prodigi, Gelato)?
2. **Preview delivery** — branded preview page with StPageFlip (TO-DO #51) vs. also adding limited customer engine (TO-DO #52, deferred)?
3. **Payment timing** — post-approval manual link now; pre-payment Checkout Session later?
4. **PDF-to-GCS** — auto-save on export or manual staff upload?
