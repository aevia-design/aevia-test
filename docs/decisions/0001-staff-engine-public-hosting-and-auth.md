# ADR-0001: Staff Engine Public Hosting and Authentication

> **⚠️ SUPERSEDED 2026-06-02 (session 20).** Option A (Cloudflare Access) was attempted and abandoned: path-scoped Access can't enforce on a single `*.pages.dev` project, and page-gating wouldn't close the real hole (open `firestore.rules` + scrapeable client-side secrets). **New decision: staff auth via Firebase Authentication** — see ROADMAP chunk-018 and the ROADMAP Decisions Log (2026-06-02). The "Decision" section below is retained for history but no longer reflects the current plan.

**Status:** Superseded by chunk-018 (Firebase Auth) — see banner above. (Originally: Committed — 2026-05-28)  
**Date:** 2026-05-28  
**Driver:** Staff template engine currently runs local only. Both founders need remote access.

---

## Context

`pages/template-engine.html` and `pages/dashboard.html` are staff-only tools. Today they run locally (`npx serve . -p 8080`). Xenia and Evgenii both need access remotely, which means they need to be hosted publicly — but they must not be accessible to customers or the public.

The current protection on backend calls is a hardcoded `X-Staff-Key: 865865` header. The pages themselves have no access control.

---

## Options

### Option A — Password-protected Cloudflare Pages deployment (simplest)

Deploy to a separate Cloudflare Pages project or branch (e.g. `staff.aevia-test.pages.dev`). Enable Cloudflare Access (free tier) to gate the subdomain behind a one-time-password sent to allowed email addresses. No code changes required.

- **Pros:** Zero code, zero maintenance, works on any browser, Cloudflare handles it
- **Cons:** Requires a Cloudflare Zero Trust account setup (free but needs configuration)
- **Auth model:** Cloudflare Access OTP to `evg.myasin@gmail.com` and `xenia@aevia.at`

### Option B — Simple HTTP basic auth via Cloudflare Pages function

Add a `_middleware.js` Cloudflare Pages function that checks for a hardcoded `Authorization: Basic` header. Browser prompts for username/password on first access.

- **Pros:** Simple, no external service
- **Cons:** Credentials travel in every request header; slightly clunky UX (browser native prompt)
- **Auth model:** Single shared username/password

### Option C — Keep staff pages local; publish only when needed

Staff pages remain local. When Xenia needs remote access, Evgenii uses `ngrok` or Cloudflare Tunnel to expose the local server temporarily.

- **Pros:** No hosting changes; maximum simplicity; no credentials to manage
- **Cons:** Requires Evgenii's machine to be on when Xenia needs access; not reliable for production use

---

## Recommendation

**Option A** for production use. Cloudflare Access is free, takes ~30 minutes to configure, and gives a proper identity-gated access model without any code changes. Option C is acceptable as a stopgap while Option A is being set up.

---

## Decision

**[x] Option A — Cloudflare Access**

Protect the staff subdomain via Cloudflare Zero Trust (free tier). Allowed emails: `evg.myasin@gmail.com` and `xenia@aevia.at`. OTP sent to email on each new session.

We chose Option A over Basic Auth because: customer photos and order data are personal and sensitive; Cloudflare Access ties access to specific email addresses rather than a shared password, so a leaked credential alone is not sufficient to gain entry; access can be revoked per-person instantly; and setup requires no code changes.

**Next step:** Evgenii sets up Cloudflare Zero Trust on the Aevia Cloudflare account, creates an Access Application pointing at the staff pages subdomain, and adds both email addresses as allowed users. Estimated: ~20 minutes.
