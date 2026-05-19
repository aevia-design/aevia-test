# Aevia — Backlog

| # | Item | Priority | Trigger | Notes |
|---|------|----------|---------|-------|
| 1 | Review order page link in confirmation email | High | Now | Link is implemented but approach needs review — token generation timing and email structure may be suboptimal. `functions/upload.js:130-226` |
| 2 | Dashboard: add `previewUrl` input field | High | Before first PDF preview | Staff need to paste the GCS signed URL for the preview PDF into Firestore without going to console. `pages/dashboard.html` |
| 3 | Auto-email customer when status → `review_sent` | High | After PDF pipeline is working | Dashboard calls new Cloud Function `sendStatusEmail`; sends branded email with `my-order.html?token=` link. `pages/dashboard.html` + `functions/index.js` |
| 4 | Build Puppeteer PDF pipeline | High | After designer delivers template + spec sheet | Fetch photos from GCS → sort by EXIF → overlay onto template at spec coordinates → export PDF → save to GCS → store `previewUrl` on order doc. `functions/index.js` |
| 5 | Brief designer on photo slot spec sheet | High | Now (coordination) | Designer delivers: (a) PDF with placeholder rectangles, (b) spec table: Page, Slot, X, Y, Width, Height in mm. Confirm page size (A4 or square). |
| 6 | Stripe payment integration | High | After approval flow is working | Stripe Checkout Sessions. Show VAT (20%) clearly. Send receipt/invoice after payment (legally required in Austria). |
| 7 | Fix hero slide 3 text alignment | Medium | Next visual pass | Slide 3 has `style="text-align:center"` inline; slides 1 & 2 are left-aligned. Remove the inline style. `pages/home.html:331` |
| 8 | German language version of website | Medium | Before public launch | Austrian market expects German. Decide: toggle on same page or separate `/de/` pages. |
| 9 | Google Analytics setup | Medium | Before any marketing | No tracking currently. Need to know who's visiting before running any ads. |
| 10 | Meta Pixel setup | Medium | Before paid ads | Meta Pixel is a tracking snippet from Facebook/Instagram. Required for running paid ads on Instagram and measuring which ads convert to orders. |
| 11 | OG image tags | Medium | Before social sharing / launch | OG (Open Graph) tags control how pages look when shared on WhatsApp, Instagram, iMessage — title, description, preview image. Without them links look blank. |
| 12 | SEO optimisation | Medium | Before public launch | Page titles, meta descriptions, alt text on images, structured data. Aevia pages currently have minimal SEO. |
| 13 | Dashboard: overdue order tracking | Medium | After first real orders | Highlight orders that haven't moved status in X days. Prevents orders falling through the cracks. `pages/dashboard.html` |
| 14 | Replace all [placeholder] template copy | Medium | Before launch | All product pages have placeholder text. Needs real copy once templates are confirmed. |
| 15 | Copy audit with stop-slop | Medium | Before launch | Run `/stop-slop` across all page copy to remove generic AI-sounding phrases. |
| 16 | VAT handling | Medium | Before Stripe integration | Austrian VAT is 20%. Must be shown clearly at checkout. Decide: prices inc. or exc. VAT. |
| 17 | Customer delivery tracking | Medium | After first print run | Send tracking number to customer when status → `in_delivery`. `my-order.html` should display it. |
| 18 | Post-delivery review collection | Medium | After first deliveries | Automated email asking for review/testimonial. Warm leads from concept test are the first targets. |
| 19 | Repeat-order prompt | Medium | After first deliveries | Email or `my-order.html` prompt: "Make another book?" Simple CTA. |
| 20 | Artist profile pages | Medium | When 3+ templates are live | Dedicated page per artist — bio, style, which templates. Artists are a key differentiator and a reason to buy. |
| 21 | Instagram page creation | Medium | Before launch | Core channel per concept test. Must exist before any word-of-mouth kicks in. |
| 22 | Instagram content tooling | Low | Before first campaign | Xenia leads content but needs scheduling + planning tools. Evaluate: Later, Buffer, or Notion-based planning. |
| 23 | Newsletter setup | Low | After email tool chosen | Decide on email tool first (Mailchimp, Brevo, etc.). Footer subscribe form currently leads nowhere. |
| 24 | Footer subscribe form → real email tool | Low | When newsletter tool chosen | Currently dead. Wire to chosen email tool. |
| 25 | Terms & Conditions page | Low | Before taking payments | Minimum: refund/returns policy. "Approve before you pay" covers a lot but something must be written. |
| 26 | Quality promise page | Low | After first print specs confirmed | Advertise paper quality, printing specs, finish options properly. Needs real photoshoot of printed books. |
| 27 | Copyright lines review | Low | Before launch | Footer copyrights are placeholder. Review once templates and artist credits are confirmed. |
| 28 | Press / "as seen in" section | Low | If/when press coverage happens | Placeholder space on homepage or about page. Low effort to add once there's something to show. |
| 29 | Referral mechanic | Low | After first 20 orders | 50% of concept test participants signed up for pilot — warm audience. Simple referral prompt post-delivery. |
| 30 | Dashboard: internal notes per order | Low | After first real orders | Free-text field on each order for staff notes (e.g. "customer requested warmer tones"). `pages/dashboard.html` |
| 40 | iOS + Android app via Capacitor | Low | After web version is stable and working end-to-end | Wrap existing HTML/CSS/JS in Capacitor shell — no rewrite needed. Mac available for iOS build. Revisit once web is fully live and tested. |
| 31 | Turkish / Russian language version | Low | If demand shows | After German. Based on audience data or order patterns. |
| 32 | B2B order flow | Low | After B2C MVP validated | Photographers, HR managers, event agencies. Different pricing, bulk orders, possible white-label. |
| 38 | ~~Spread preview: caption spec in sizing table~~ | ~~High~~ | ~~Resolved~~ | Caption positions are in Toddler_sizing_full.xlsx and fully compiled into template engine plans. |
| 39 | ~~Spread preview: photo pool + orientation UX~~ | ~~High~~ | ~~Resolved~~ | Addressed in template engine design (07-01). spread-preview.html stays as-is. |
| 41 | Build Toddler template engine — Plans 06-01/02/03 complete. Remaining: 07-01/02/03, 08-01/02, 09-01. See `whats-next.md`. | High | In progress | `pages/template-engine.html` + `assets/Template_Toddler/template-data.js`. FP1 heart clip working. Orientation detection fixed. |
| 43 | Template engine scroll performance | Medium | Reported 2026-05-19 | After alt-tab and return, interface stalls 10-15s before responding to scroll. Investigate virtual scroll or viewport-gated rendering. |
| 42 | bloom.html: FP selector + photo count calculator | High | After template engine renders correctly | Plan: `.planning/phases/10-bloom-amendments/10-01-PLAN.md`. Add "Personalise your book" section with 5 FP options + live photo count. Use carousel photos as FP preview placeholders. |
