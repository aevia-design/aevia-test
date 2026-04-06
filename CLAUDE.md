# Aevia — Project Guide for Claude Code

## What is Aevia
A premium photo book service based in Vienna. The model is moving from fully manual (staff handle everything) toward semi-automated: customer uploads photos → system pre-places photos into template using EXIF date metadata → staff review and refine → customer approves preview PDF → pays → order sent to print house → delivered.

The goal is to automate the repetitive parts (photo sorting, template filling, PDF generation, emails, payment, print submission) while keeping human craft at the review and caption-writing stages.

**Live Webflow site (old, being replaced):** https://aevia-v1.webflow.io  
**Target domain:** https://aevia.at (paid, not yet pointed)  
**Brand:** Premium, editorial, art-forward. Serif typography, generous whitespace, off-white/near-black palette.

---

## Folder structure

```
aevia-test/
├── pages/          — all HTML pages (home, about, help, collections, product pages)
├── assets/
│   └── images/     — logos and images
├── functions/      — Firebase Cloud Functions (the backend, already deployed)
│   ├── index.js    — function entry point
│   ├── upload.js   — main logic: order numbers, signed URLs, emails
│   ├── package.json
│   ├── .env        — secrets: Gmail credentials (NOT in git)
│   └── serviceAccountKey.json  — GCS credentials (NOT in git)
├── firebase.json   — Firebase project config
├── .firebaserc     — Firebase project ID: aevia-uploads
├── cors.json       — GCS bucket CORS config
├── .gitignore
└── Brief.md        — original design brief
```

**Local dev server:** run from project root, pages live at `http://localhost:8080/pages/home.html`

---

## Firebase backend (already live — do not rebuild)

- **Project ID:** `aevia-uploads`
- **Region:** `europe-west1`
- **GCS bucket:** `aevia-uploads.firebasestorage.app`
- **Firestore:** stores orders; auto-increments order numbers as `AEV-001`, `AEV-002`, etc.
- **Cloud Function:** `createUploadSession` — single HTTPS endpoint
  - Accepts: `customerName`, `email`, `templateName`, `pageCount`, `files[]`, optional `specialRequests`, `photoNotes`, `price`
  - Returns: `orderNumber`, `folderName`, `uploadUrls[]` (signed PUT URLs, valid 24h)
  - Sends two emails: customer confirmation + internal notification to `xenia@aevia.at`
- **Live endpoint:** `https://europe-west1-aevia-uploads.cloudfunctions.net/createUploadSession`

**To deploy function changes:**
```bash
cd functions
npm run deploy
```

**CORS allowed origins:** `aevia.at`, `www.aevia.at`, `*.webflow.io`, `localhost:*`

---

## Pages built so far

| File | Description |
|------|-------------|
| `pages/home.html` | Homepage |
| `pages/about.html` | About us |
| `pages/help.html` | FAQ / Help |
| `pages/collections.html` | All templates grid |
| `pages/bloom.html` | Product page — Bloom template (kids) |
| `pages/devotion.html` | Product page — Devotion template |
| `pages/horizon.html` | Product page — Horizon template |

**Pages referenced but not yet built:** `vows.html`, `radiance.html`, `wander.html`, `terrain.html`, `sprout.html`, `wonder.html`

---

## Full product vision

See `context/customer-journey-v1.md` for the complete annotated flow with decisions, open questions, and tech stack requirements. Update that file as decisions are made.

**Short version of the pipeline:**
```
Customer order → photos to GCS → EXIF sort → auto-place in HTML template →
staff review + captions (AI-assisted) → Puppeteer PDF → preview email (GCS signed URL) →
customer approves → Stripe payment → webhook → send to print API → tracking → delivered
```

## MVP phases

### Phase 1 — Order intake (done)
- Order form, Firebase function, GCS upload, Firestore, email confirmations, internal dashboard

### Phase 2 — Template engine + PDF generation (next)
- HTML/CSS templates for each book design
- Node.js script: reads order from Firestore, fetches photos from GCS, sorts by EXIF date, fills template
- Puppeteer renders to PDF (preview = low-res watermarked; print = full-res)
- Internal caption tool with Claude API vision suggestions

### Phase 3 — Payment + automation
- Stripe Checkout Sessions + webhooks (auto-update order status on payment)
- Firebase Scheduled Functions for reminder emails
- Preview delivery via GCS signed URL in email

### Phase 4 — Print + delivery
- Print house API integration (Prodigi or Gelato — TBD)
- Tracking webhook → customer notification email
- Dashboard auto-updates delivery status

## Order status vocabulary

```
new → designing → needs_info → review_sent → approved → paid →
sent_to_print → printing → in_delivery → delivered
```
`needs_info` can be set at any stage (photos too low-res, count mismatch, etc.)

---

## Coding conventions

- Plain HTML/CSS/JS — no frameworks, no build tools
- Inline styles are acceptable for one-off layout tweaks
- All pages share the same nav and footer pattern — copy from an existing page
- Asset paths from `pages/` are `../assets/images/filename.png`
- Page-to-page links within `pages/` are just `pagename.html` (no path prefix)
- The owner is new to coding — explain technical decisions briefly when making them

---

## Secrets (never commit)

| Secret | Location | Purpose |
|--------|----------|---------|
| `EMAIL_USER` | `functions/.env` | Gmail account for sending emails |
| `EMAIL_PASS` | `functions/.env` | Gmail app password |
| `EMAIL_NOTIFY` | `functions/.env` | Internal notification recipient (`xenia@aevia.at`) |
| `serviceAccountKey.json` | `functions/` | Google Cloud service account for GCS signed URLs |

---

## Visual Development Guidelines

Design principles and brand rules are in:
- `context/design-principles.md` — spacing, colour, typography, what to flag
- `context/style-guide.md` — logo, nav/footer patterns, page inventory, backend info

### After making any visual change

1. Identify which pages were modified
2. Start local dev server (`npx serve . -p 8080` from project root)
3. Open changed pages in browser and check at desktop + mobile widths
4. Verify design matches `context/design-principles.md`
5. Check browser console for errors or 404s
6. Take a screenshot at 1440px desktop width to document the state

### For a full design review

Run `/design-review` to trigger the design review agent. It will open each modified page in a browser, test all three viewports, check links and interactions, and return a prioritised report.

Requires: local dev server running at `http://localhost:8080` and Playwright MCP configured.
