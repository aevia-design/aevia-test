# Aevia — Project Guide for Claude Code

## What is Aevia
A premium photo book service based in Vienna. Customers order a personalised photobook, upload their photos, and Aevia's staff design the book and send a preview for approval before printing.

The model is moving from fully manual toward semi-automated: photos are sorted by EXIF date and pre-placed into an HTML template by a browser-based staff tool. Staff then review, adjust photo positions, write captions (AI-assisted), and export a PDF. Customer approves the preview, pays, and the book goes to print.

**Live website:** https://aevia-test.pages.dev/pages/home  
**Target domain:** https://aevia.at (paid, not yet pointed)  
**Brand:** Premium, editorial, art-forward. Serif typography, generous whitespace, off-white/near-black palette.

---

## Folder structure

```
aevia-test/
├── pages/                  — all HTML pages (website + internal tools)
├── assets/
│   ├── images/             — logos and UI images
│   ├── fonts/              — custom fonts used in templates
│   ├── Template_Scribble/  — Scribble template assets (SVGs, template-data.js)
│   └── templates.json      — template catalogue (name, slug, page counts, etc.)
├── context/                — design principles, style guide, customer journey
├── functions/              — Firebase Cloud Functions (backend, already deployed)
│   ├── index.js            — function entry points
│   ├── upload.js           — order creation, signed URLs, emails
│   ├── caption/            — AI caption generation (caption-voice.md, generateCaption)
│   ├── package.json
│   ├── .env                — secrets: Gmail credentials (NOT in git)
│   └── serviceAccountKey.json  — GCS credentials (NOT in git)
├── motif-engine/           — AI motif generation tool (Kevin Lucbert style, Replicate API)
├── scripts/                — one-off utility scripts
├── sessions/               — Claude session decision logs (YYYY-MM-DD.md)
├── csv-to-template.js      — regenerates template-data.js from CSV
├── firebase.json           — Firebase project config
├── .firebaserc             — Firebase project ID: aevia-uploads
└── cors.json               — GCS bucket CORS config
```

**Local dev server:** `npx serve . -p 8080` from project root  
Pages live at `http://localhost:8080/pages/home.html`  
Template engine (staff-only, not on Cloudflare): `http://localhost:8080/pages/template-engine.html`

---

## Firebase backend (already live — do not rebuild)

- **Project ID:** `aevia-uploads`
- **Region:** `europe-west1`
- **GCS bucket:** `aevia-uploads.firebasestorage.app`
- **Firestore:** stores orders; auto-increments order numbers as `AEV-001`, `AEV-002`, etc.
- **Cloud Function `createUploadSession`:**
  - Accepts: `customerName`, `email`, `templateName`, `pageCount`, `files[]`, optional `specialRequests`, `photoNotes`, `price`
  - Returns: `orderNumber`, `folderName`, `uploadUrls[]` (signed PUT URLs, valid 24h)
  - Sends two emails: customer confirmation + internal notification to `xenia@aevia.at`
- **Cloud Function `generateCaption`:**
  - Accepts: `imageDataUrl` (base64 JPEG, max 1200px), optional `previousCaptions[]`
  - Returns: `{ caption: 'suggested text' }`
  - Uses Claude API with voice rules from `functions/caption/caption-voice.md`
- **Live endpoint:** `https://europe-west1-aevia-uploads.cloudfunctions.net/`

**To deploy function changes:**
```bash
cd functions
npm run deploy
```

**CORS allowed origins:** `aevia.at`, `www.aevia.at`, `*.pages.dev`, `localhost:*`

---

## Template engine (staff tool)

`pages/template-engine.html` is the main staff tool for assembling and reviewing a photobook before PDF export. It is browser-based, runs entirely client-side, and is never deployed to the public website.

**What it does:**
- Staff uploads customer photos (JPEG, HEIC supported; HEIC converted via libheif WASM)
- Photos are sorted by EXIF date and auto-placed into spread slots
- Staff can drag photos between slots, reorder spreads, swap spread types
- Caption overlays are editable; AI caption button calls `generateCaption` endpoint
- Special functional pages (FP1–FP5) have dedicated upload zones and editable text panels
- Cover renderer shows front, spine, and back with correct background gradients

**Currently implemented for:** Scribble template (kids/toddler photobook)

**Template data:** `assets/Template_Scribble/template-data.js` — defines all spread types, slot coordinates, SVG overlays, background colors, caption positions, and special flags. Generated from `assets/Template_Scribble/Scribble_sizing_full.csv` via `node csv-to-template.js`.

**Architecture constants:**
- SCALE = 3 (px/mm): 200mm page = 600px canvas
- Bleed = 3mm per side (print size 206×206mm, content area 200×200mm)
- Book sizes: 40 pages (20 spreads) or 80 pages (40 spreads)

**Print quality note:** Preview renders at SCALE=3 (~12dpi equivalent) — fine for staff review. Puppeteer PDF (Phase 2) must use `deviceScaleFactor: 6+` and `@page` dimensions in mm. Do NOT use `window.print()` for final print output.

---

## Motif engine

`motif-engine/` is a Node.js tool for generating small decorative interior motifs using a custom AI model trained on Kevin Lucbert's illustration style (bold flat shapes, dense directional pen hatching, vibrant flat color).

**Context:** Kevin Lucbert has agreed to collaborate — he will create original commissioned artwork for the cover of a new outdoor/mountain template. Interior motifs are generated in a style inspired by his work.

**How it works:** `node generate.js --motif tent` calls the `aevia-kevinlucbert` LoRA on Replicate, generates 4 images, saves to `outputs/<motif>/<date>/`. Prompts live in `motif-engine/prompts/`.

**Requires:** `REPLICATE_API_TOKEN` in `motif-engine/.env` (never committed).

See `motif-engine/README.md` for full setup and usage.

---

## Product pipeline (current state)

```
Customer order → photos to GCS → staff opens template-engine.html →
EXIF sort + auto-place → staff review + drag-drop + captions (AI-assisted) →
[Puppeteer PDF — not yet built] → preview to customer → approval →
Stripe payment → print house → tracking → delivered
```

### Phase 1 — Order intake (done)
Order form (`pages/order.html`), Firebase function, GCS upload, Firestore, email confirmations, internal dashboard (`pages/dashboard.html`)

### Phase 2 — Template engine (in progress)
Browser-based staff tool built and working for Scribble template. Remaining: resolution warnings, RAW file blocking, AI caption wiring (Plan 09-01). Puppeteer PDF generation not yet started.

### Phase 3 — Payment + automation (not started)
Stripe Checkout Sessions + webhooks, Firebase Scheduled Functions for reminder emails, preview delivery via GCS signed URL

### Phase 4 — Print + delivery (not started)
Print house API integration (Prodigi or Gelato — TBD), tracking webhooks, customer notifications

---

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
- The owner is relatively new to coding — explain technical decisions briefly when making them

---

## Secrets (never commit)

| Secret | Location | Purpose |
|--------|----------|---------|
| `EMAIL_USER` | `functions/.env` | Gmail account for sending emails |
| `EMAIL_PASS` | `functions/.env` | Gmail app password |
| `EMAIL_NOTIFY` | `functions/.env` | Internal notification recipient (`xenia@aevia.at`) |
| `serviceAccountKey.json` | `functions/` | Google Cloud service account for GCS signed URLs |
| `REPLICATE_API_TOKEN` | `motif-engine/.env` | Replicate API for motif generation |

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

### For a full design review

Run `/design-review` to trigger the design review agent. It will open each modified page in a browser, test all three viewports, check links and interactions, and return a prioritised report.

Requires: local dev server running at `http://localhost:8080` and Playwright MCP configured.
