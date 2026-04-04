# Aevia — Project Guide for Claude Code

## What is Aevia
A premium photo book service based in Vienna. Concierge model: customer uploads photos → Aevia staff design the book → customer approves → then pays. Not automated — staff handle design manually. The tech moves orders from customer to Aevia reliably.

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

## MVP v1 build order

1. **Order form page** (`pages/order.html`) — customer picks template + page count, uploads photos. Calls the live Firebase function above.
2. **Hosting** — deploy static site to Cloudflare Pages (free tier, connects to GitHub, deploys on push). Point `aevia.at` DNS to Cloudflare.
3. **Internal order dashboard** (`pages/dashboard.html`) — password-protected, shows submitted orders from Firestore, links to GCS folders. Plain HTML + Firebase SDK, no framework.
4. **PDF delivery + payment** — after design is done, email customer a watermarked PDF preview + Stripe Payment Link. Manual trigger for now.

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
