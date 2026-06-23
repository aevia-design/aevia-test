# Aevia — Quick Links

Handy URLs for the website, both staff engines, the dashboard, and the customer preview — local and live. Replace `XXXX` with a real preview token.

> **Live = Cloudflare Pages** (`aevia-test.pages.dev`). It serves **clean URLs (no `.html`)** — the `.html` form redirects (308) and, for customer-preview, **drops the `?token=`**. So on live always use the clean form.
>
> **Live deploys from `main`** automatically on push.

---

## 🌐 Live (aevia-dev / Cloudflare Pages)

| Page | URL |
|------|-----|
| Home | https://aevia-test.pages.dev/pages/home |
| Collections | https://aevia-test.pages.dev/pages/collections |
| Staff — Dashboard | https://aevia-test.pages.dev/pages/staff/dashboard |
| Staff — Template engine | https://aevia-test.pages.dev/pages/staff/template-engine |
| Customer preview | https://aevia-test.pages.dev/pages/customer-preview?token=XXXX |

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
- **Target production domain:** https://aevia.at (not live yet)
