# Brief: Fix Google sign-in on iOS Safari

**Created:** 2026-07-22 (Session 146)
**Status:** Open — deferred to after the owner's trip
**Objective:** Make Google sign-in either work reliably on iPhone or be absent from it, so no mobile customer reaches a dead end while signing in.
**Audience:** Whoever picks this up next (Claude session or the owner). Assumes no memory of S146.
**Applicable standards:** `rageatc-code-oss:systematic-debugging`, `rageatc-code-oss:verifying-work`, project `CLAUDE.md` (simplicity, no new frameworks, cost-flagging before infra changes)

## Why

The owner reproduced this on his own iPhone several times: tapping **Continue with Google** closes the tab and dumps him on an unrelated Safari tab. Sign-in never completes.

It matters more than a cosmetic bug for two reasons. First, the same broken call exists in **`order.html`**, which is inside the purchase path — not just on the account page where it was noticed. Second, the friends-and-family trial is scheduled for September and most customers will arrive on a phone. A sign-in button that strands people is worse than no button.

## What is known (verified in S146)

**Root cause — the call itself:**
- `pages/account.html:406` — `await signInWithPopup(auth, new GoogleAuthProvider())`
- `pages/order.html:2817` — same call, in the sign-in modal of the order flow

iOS Safari opens popups as new *tabs* and restricts popups not tied to a synchronous user gesture. When the flow ends, Safari returns focus to the previously active tab — which explains the "sent me to an unrelated tab" symptom.

**`signInWithPopup` is not obviously the wrong choice.** It is Firebase's documented **Option 2** and is explicitly recommended for apps not hosted on Firebase Hosting, because it avoids the third-party-cookie problem. Firebase also states its weakness plainly: *"popups are occasionally blocked by the device or platform, and the flow is less smooth for mobile users."*

**The naive fix does not work.** Swapping to `signInWithRedirect` alone would break on Safari 16.1+ and Chrome 115+, because:
- `authDomain` is `aevia-uploads.firebaseapp.com` (`pages/account.html:264`) — a different domain from `aevia-test.pages.dev` and `aevia.at`
- The redirect flow uses a cross-origin iframe to that domain, which browsers now block as third-party storage

**A structural complication for the proper fix.** Firebase's Option 3 (reverse-proxy `/__/auth/` to `firebaseapp.com`) needs a Cloudflare Pages Function. But Cloudflare Pages auto-detects a root `functions/` directory as Pages Functions, and **this repo's root `functions/` is Firebase Cloud Functions** (`firebase-functions` in `functions/index.js`). Those collide. Solvable — Cloudflare allows configuring the Pages Functions directory, or a standalone Worker can be used — but it means touching deploy configuration on a live site.

Note also that `_redirects` cannot do this: Firebase requires *transparent proxying*, explicitly not 302 redirects.

## Open question to resolve first

**What exactly fails on the device?** This was inferred, not observed — no reproduction was achieved locally (desktop WebKit on Windows does not faithfully reproduce iOS popup restrictions, so it was deliberately not attempted).

On an iPhone, tapping the Google button:
1. Does a new tab open **at all**?
2. Does any error text appear on the Aevia page afterwards?

"Never opens" and "opens then strands you" point to different fixes. Answer this before building anything.

## Options

| | Approach | Effort | Cost |
|---|---|---|---|
| **A** | Harden the popup (better errors, fallback messaging) | Small | €0 |
| **B** | Reverse-proxy `/__/auth/` + redirect sign-in (Firebase Option 3) | ~half a day; touches deploy config | €0 |
| **C** | Google Identity Services SDK + `signInWithCredential` (Firebase Option 5) | Medium; more auth code to own | €0 |
| **D** | Hide the Google button on mobile until fixed | Tiny; reversible | €0 |

All options are free. No GCP change; Cloudflare Pages Functions sit well inside the free tier at Aevia's volume. **Flag this explicitly to the owner anyway before touching infra** — that is a standing project rule.

## Recommendation from S146

**D immediately, B properly afterwards.**

Email/password sign-in already works on mobile, so hiding the Google option there costs little and removes the failure — including from `order.html`. It is a few lines in shared CSS and reverts the moment B lands. Then do B deliberately, with the Pages Functions collision resolved rather than worked around.

Rejected: **A** dresses up a broken flow. **C** unless B proves blocked, since it means owning more auth code for no gain.

The owner has not yet chosen. This recommendation is input, not a decision.

## Requirements

**From `systematic-debugging`:**
- [ ] The device-level failure mode is observed and recorded before any fix is written
- [ ] The fix addresses the root cause, not the symptom
- [ ] Both call sites are addressed — `account.html` and `order.html`

**From `verifying-work`:**
- [ ] Verified on a real iPhone, not an emulator — this bug is device-specific and desktop WebKit does not reproduce it
- [ ] Email/password sign-in confirmed still working after the change
- [ ] Existing signed-in sessions confirmed unaffected (`browserLocalPersistence` is set at `account.html:283`)

**From project `CLAUDE.md`:**
- [ ] No new frameworks, dependencies, or build steps without asking first
- [ ] Cost and its main driver flagged in plain language before any infra change
- [ ] Desktop sign-in behaviour unchanged (currently works)

## Constraints

- **Scope:** Google sign-in only. Email/password and the per-order token flow are working and out of scope.
- **Both files:** `pages/account.html` and `pages/order.html`. Check whether DE mirrors of either exist before assuming two files.
- **Live site:** the owner verifies on the deployed Cloudflare site, not localhost. Push before asking him to test.
- **Out of scope:** the desktop preview gate, and anything from `docs/briefs/ios-app.md`.

## Success criteria

1. On a real iPhone, tapping **Continue with Google** either completes sign-in and returns the user to the Aevia page signed in, or the button is not present.
2. No customer can reach a state where sign-in appears to start and then strands them.
3. Desktop sign-in and email/password sign-in are unchanged.
4. All requirements above are met.

## References

- Firebase — [Best practices for `signInWithRedirect` on browsers that block third-party storage](https://firebase.google.com/docs/auth/web/redirect-best-practices) — the five options; Options 2–5 apply to non-Firebase hosting
- firebase-js-sdk — [Issue #8329: `signInWithRedirect` doesn't work on Chrome 115+, Safari 16.1+, Firefox 109+](https://github.com/firebase/firebase-js-sdk/issues/8329)
- Session log: `sessions/2026-07-22-s146.md`
- Related but separate: `docs/briefs/ios-app.md`

## Also found in S146, not part of this brief

`pages/waitlist.html` has a footer but does **not** link `assets/css/mobile.css`, so it may have no mobile styling at all. It is the gate page on production (ADR-0009), meaning it could be the first thing every real visitor to aevia.at sees. Unverified — worth checking independently of this work.
