# Aevia — Quick Links

Handy URLs for the website, both staff engines, the dashboard, and the customer preview — local and live. Replace `XXXX` with a real preview token.

> **Two hosts since S144** (see ADR-0009). `aevia.at` is **production**; `aevia-test.pages.dev` is the **test rig** and stays that way — QA scripts deliberately point at it.
>
> Both serve **clean URLs (no `.html`)** — the `.html` form 308-redirects to the clean form. The redirect **does preserve the query string** (verified S130 and again S144: `?token=…&payment=success` survives), so emailed preview links work either way. Prefer the clean form to save a hop.
>
> **Both deploy from `main`** automatically on push — same build, two hostnames.

---

## 🌐 Production — aevia.at

| Page | URL |
|------|-----|
| Home | https://aevia.at/pages/home |
| Collections | https://aevia.at/pages/collections |
| German home | https://aevia.at/pages/de/home |
| Waitlist | https://aevia.at/pages/waitlist |
| Customer preview | https://aevia.at/pages/customer-preview?token=XXXX |

**Pre-launch state (until ~Sep 2026):**
- **Ordering is gated.** `/pages/order*` 302s to the waitlist via a Cloudflare Redirect Rule. Server-side, works with JS off.
- **The whole site is `noindex`** via a Cloudflare `X-Robots-Tag` response-header rule. Google crawls but lists nothing. **Delete that rule at launch or the site launches invisible.**
- `www.aevia.at` 301s to the apex.

## 🧪 Test rig — aevia-test.pages.dev

| Page | URL |
|------|-----|
| Home | https://aevia-test.pages.dev/pages/home |
| Order form (works here) | https://aevia-test.pages.dev/pages/order |
| Staff — Dashboard | https://aevia-test.pages.dev/pages/staff/dashboard |
| Staff — Template engine | https://aevia-test.pages.dev/pages/staff/template-engine |
| Customer preview | https://aevia-test.pages.dev/pages/customer-preview?token=XXXX |

**Ordering works normally here** — this is where test orders are placed. `site-mode.js` adds `noindex` so it never competes with production in search.

Customer-facing links (preview links, Stripe redirects, account links) are built from the **origin of the request**, so a test order started here round-trips entirely here. See `siteOrigin()` in `functions/index.js`.

Staff pages require Firebase email/password login (allowlisted email).

---

## 💻 Local (dev server)

Start the server from the project root:

```bash
npx http-server . -p 8080 -c-1
```

> Use `http-server`, **not** `npx serve` — `serve` 404s clean URLs and strips the `?token=` query locally. With `http-server` the `.html` form works and keeps the token.

| Page | URL |
|------|-----|
| Home | http://localhost:8080/pages/home.html |
| Collections | http://localhost:8080/pages/collections.html |
| Staff — Dashboard | http://localhost:8080/pages/staff/dashboard.html |
| Staff — Template engine | http://localhost:8080/pages/staff/template-engine.html |
| Customer preview | http://localhost:8080/pages/customer-preview.html?token=XXXX |

---

## 🔧 Other

- **GitHub repo:** https://github.com/aevia-design/aevia-test
- **Product pages (10):** `…/pages/<template>` where `<template>` = scribble, papercut, sprout, bloom, wander, horizon, terrain, radiance, devotion, vows
- **PDF export (local CLI):** `cd scripts && npm run pdf -- AEV-XXX`
- **Production domain:** https://aevia.at — **live since S144** (2026-07-20). DNS on Cloudflare; M365 mail unaffected (ADR-0009).
