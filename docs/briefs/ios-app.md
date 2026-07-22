# Native mobile app (iOS first) — deferred, not rejected

**Status:** Deferred · Session 146, 2026-07-21
**Supersedes:** the framing in TO-DOS #40 (Capacitor wrap)
**Related:** PRD "Won't Have — native mobile app"; S41 decision (2026-06-15); `docs/briefs/mobile-responsiveness.md`

## What

A native iOS app (Android later) covering four customer jobs: place an order, upload photos, make light edits to the preview, approve and pay, and track order status. Explored in depth in S146 and **deliberately deferred** until after the friends-and-family trial and the first real orders.

This document records why, what would revive it, and what was learned — so the decision can be resumed rather than re-argued.

## Why it came up

The customer journey has a real inconsistency: **we ask customers to upload from their phone** (to preserve EXIF dates, which drive automatic chronological sorting) **but only allow preview editing on a laptop** (`customer-preview.html` gates below 900px viewport width). Customers are pushed to one device, then pushed to another.

Secondary motive: **loyalty and recurrence.** The intended roadmap — yearbooks, calendars, Mother's/Father's Day, occasion templates — is a repeat-purchase business, and DACH has strong print affinity. An app is a plausible retention surface.

Named honestly by the owner: there is also a **"pet idea" element** — an app sounds appealing independent of evidence. Recorded so future-us weighs it correctly rather than rediscovering it.

## Why deferred

**1. Owner time is the binding constraint.** Direct cash cost is near zero (~$99/yr Apple developer fee, ~$30/mo MacInCloud when building). Irrelevant. The real price is 2–3 months of part-time attention, and there is no second developer.

**2. It collides with launch.** Print house August, F&F trial September, test orders, marketing year-end. A 2–3 month build doesn't fit between those — it replaces them.

**3. It optimises the wrong end of the funnel.** An app is a retention tool. There are currently zero customers to retain. Acquisition and a working first-order experience come first.

**4. The recurrence case rests on unbuilt products.** Calendars and occasion templates are currently intentions, not templates. The app was being justified by a product line that doesn't exist yet.

**5. The strongest technical argument did not survive scrutiny.** See "Upload reliability" below — realistic order sizes are far smaller than assumed, and the owner's existing mobile tests already cover most of the range.

**6. Key evidence is missing.** After the first real orders we'd know how many customers stall at the desktop gate and whether anyone reorders. Those answers determine not just *whether* to build but *what to build*.

## Upload reliability — the argument that collapsed

Background upload that survives a locked screen is the one capability the web genuinely lacks and only a native app provides. It was built up during S146 as the app's strongest justification. It does not hold at Aevia's actual scale.

Realistic order sizes, corrected by the owner:

| Book | Photos | Typical size (iPhone HEIC) |
|---|---|---|
| 40p | ~55 | ~150–200 MB |
| 80p | ~110 | ~300–450 MB |

The owner has already run real iPhone Safari orders in the "few hundred MB" range successfully (see also S41, which confirmed EXIF survives and auto-sort works). **That already covers the 40p case and approaches the 80p case.** The remaining untested scenario is an 80p book over cellular with the screen locked — a modest gap, not a 10x one.

⚠ **Correction needed elsewhere:** `CLAUDE.md` states orders are "1–4 GB/order" under cost awareness. That figure appears to be wrong — it likely reflects professional-shoot sizes, not normal iPhone photos. It was the source of the inflated assumption in this session, and if it is wrong it is also **inflating the cloud cost model**. Worth correcting.

## What would revive it

Any of these is a genuine trigger:

- **Measurable drop-off at the desktop preview gate** once there are real orders to measure.
- **Evidence of real repeat purchasing** once a second product type exists.
- **Upload failures at 80p sizes** over cellular, if they materialise in practice. Note: even then, the fix may not be an app — chunked/resumable web upload is cheaper and should be evaluated first.
- Sustained order volume where per-order friction compounds.

## If it is built: architecture direction

Not a Capacitor wrap of the whole site, and not a full native rebuild.

**Native shell — order, upload, payment, status — with the editing engine loaded in a WKWebView.**

Rationale:

- The engine (`customer-preview.html`, ~3,400 lines) is **print-critical geometry**: bleed handling, SVG viewBox framing, coordinate conventions. A second native implementation would mean two versions that must agree exactly, and divergence surfaces as a customer approving a preview that doesn't match what prints — discovered only after physical printing.
- **JS logic ports to React Native/Flutter; DOM and SVG rendering does not.** "We already have it in JS" transfers far less than it appears — the engine is built directly on browser layout and SVG.
- Native still earns its keep on `PHPickerViewController`, push notifications, and Apple Pay, even with the upload argument weakened.
- A pure webview wrapper risks rejection under **App Store guideline 4.2 (Minimum Functionality)**. Native photo handling and notifications clear that comfortably.

**Rough effort:** 2–3 months part-time for iOS; +4–6 weeks for Android reusing the same engine. Least predictable component is the toolchain (Swift, Xcode, certificates, provisioning, TestFlight), worsened by working through a rented Mac, which is slow for tight debug loops.

**Useful finding:** Apple's 30% commission does **not** apply — physical goods shipped to the customer are excluded from In-App Purchase rules, so Stripe stays. Re-verify before it becomes load-bearing.

## Boundaries

- **Not a rejection.** The product logic is sound; the timing isn't.
- **Not a full native rebuild** of the rendering engine, at any stage.
- **Not a Capacitor wrap** of the existing site, as framed in the original TO-DOS #40.
- **Not a photo-organisation product** (option F in S146) — that space is owned by Google and Apple Photos.
- **The two engines stay functionally separate.** Customer keeps its limited toolset; staff keeps reorder and export. Any future consolidation shares the *rendering core* only, never the UI surface.
- **Engine extraction is parked.** Consolidating the duplicated core (29 of 52 customer-engine functions share names with the staff engine, including the entire render path: `renderBook`, `renderCover`, `renderSpread`, `resolveVariant`, `buildBookSequence`, `assignPhotosToSpreads`, `getHeartCrop`/`setHeartCrop`, `attachCropDrag`) was raised as a prerequisite for the app. **It is not one** — a webview can point at `customer-preview.html` as-is. Revisit only when the app is real, or when template-adding friction justifies it independently.

## Open questions

- What share of customers hit the desktop preview gate, and do they return? *(Needs real orders.)*
- Does anyone buy a second book? *(Needs a second product type; not testable on first orders.)*
- Do 80p uploads survive a locked screen on cellular? *(Modest gap; low priority.)*
- Would a **PWA** deliver the loyalty goals — home screen presence, push notifications, occasion reminders — at a fraction of the cost? Rejected on preference in S146, never on merit. Cheapest untested path to the stated goal.
- Consequence to own: deferring means the **desktop preview gate stays in place through the F&F trial.** Accepted knowingly, or patched before then?
