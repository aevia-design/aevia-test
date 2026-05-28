# Aevia — Backlog

> **Scope:** Items NOT covered by ROADMAP.md. Sequenced product build lives in ROADMAP.md.  
> Last pruned: 2026-05-28 — removed done items and anything now in ROADMAP chunks.

---

## Bugs & small fixes

| # | Item | Priority | Notes |
|---|------|----------|-------|
| 7 | Fix hero slide 3 text alignment | Medium | Slide 3 has inline `style="text-align:center"` while slides 1 & 2 are left-aligned. Remove the inline style. `pages/home.html:331` |
| 43 | Template engine scroll performance | Medium | After alt-tab and return, interface stalls 10–15s before responding. Investigate virtual scroll or viewport-gated rendering. `pages/template-engine.html` |

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

---

## Future / low priority

| # | Item | Priority | Notes |
|---|------|----------|-------|
| 31 | Turkish / Russian language version | Low | After German. Based on audience data or order patterns. |
| 32 | B2B order flow | Low | After B2C MVP validated. Photographers, HR managers, event agencies. |
| 40 | iOS + Android app via Capacitor | Low | After web version is stable end-to-end. Wrap existing HTML/CSS/JS in Capacitor — no rewrite needed. Mac available for iOS build. |
