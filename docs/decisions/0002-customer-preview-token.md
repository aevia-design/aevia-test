# ADR-0002: Customer Preview Token Design

**Status:** Committed — 2026-05-28  
**Date:** 2026-05-28  
**Driver:** Customer preview interface needs per-order access control with no login required.

---

## Context

When a customer receives a preview link, they must be able to open `pages/customer-preview.html?token=XYZ` and load their order — without creating an account, without logging in, and without being able to see other customers' orders.

The token must be:
- Unguessable (a random attacker cannot enumerate it)
- Associated with exactly one order
- Long enough to be useful (days or weeks — customer may not open immediately)
- Validated server-side on every `getOrder` call

The `getOrder` Cloud Function currently authenticates staff via `X-Staff-Key`. It needs a second auth path for the customer token.

---

## Options

### Option A — Random UUID stored in Firestore (simplest)

On staff action "Send preview link", generate a `crypto.randomUUID()` (or equivalent 128-bit random string), store it in the Firestore order doc as `previewToken`, and include it in the link. `getOrder` accepts either `X-Staff-Key` or `?token=` — if token, looks up the Firestore doc where `previewToken == token`.

- **Pros:** Simple, no crypto overhead, Firestore lookup is fast, token can be invalidated (delete or replace the field)
- **Cons:** Firestore lookup required on every request (cheap but not free)
- **Expiry:** Optional — add a `previewTokenExpiry` timestamp field; `getOrder` rejects expired tokens

### Option B — HMAC-signed token (no Firestore lookup for validation)

Generate token as `HMAC-SHA256(orderNumber + expiry, SECRET_KEY)`, encode as base64url. `getOrder` validates the signature and expiry without a Firestore lookup; then fetches the order doc normally.

- **Pros:** Stateless validation — no extra Firestore read; harder to brute-force
- **Cons:** Token cannot be individually revoked without a blocklist; slightly more complex to implement; requires `HMAC_SECRET` in `functions/.env`
- **Expiry:** Built into the token payload — server checks timestamp

### Option C — Firebase Dynamic Link / short URL

Use Firebase Dynamic Links (or a third-party shortener) to generate a short branded URL (e.g. `aevia.at/preview/abc123`). Behind the scenes, resolves to Option A or B.

- **Pros:** Prettier URL for customer-facing links
- **Cons:** Firebase Dynamic Links are being deprecated (Jan 2026); third-party shortener is an extra dependency; adds complexity for no security benefit
- **Verdict:** Do not use. Presentational concern only — handle with a redirect if needed later.

---

## Recommendation

**Option A** for MVP. Firestore lookup cost is negligible at 20–30 orders. UUID is unguessable (2^122 space). Adding an expiry field is optional but recommended (e.g. 30-day TTL). Option B is worth revisiting if `getOrder` call volume increases significantly.

Implementation notes for Option A:
- Token generated in `dashboard.html` (client-side `crypto.randomUUID()`) on "Send preview link" action
- Written to Firestore via a new Cloud Function call or direct Firestore SDK write (staff is authenticated)
- `getOrder` Cloud Function: if `token` query param present, query Firestore for matching `previewToken`; return `403` if not found or expired; return `200` with limited payload (no staff-only fields)
- The token in the URL is the only credential — treat it like a password: HTTPS only, never log it

---

## Decision

**[x] Option A — UUID in Firestore**

Generate `crypto.randomUUID()` when staff triggers "Send preview link". Store as `previewToken` (and optional `previewTokenExpiry`) on the Firestore order doc. `getOrder` Cloud Function accepts either `X-Staff-Key` header (staff path) or `?token=` query param (customer path) — looks up the matching order doc for the latter.

We chose Option A over HMAC because: tokens can be individually revoked by clearing the Firestore field; per-order control is more useful than stateless validation at this scale; and a UUID is cryptographically unguessable (2^122 space) — more than sufficient security for the threat model.

**Implementation notes:**
- Token generated client-side in `dashboard.html` via `crypto.randomUUID()`
- Written to Firestore via new Cloud Function or direct SDK write (staff is authenticated)
- `getOrder` returns a limited payload on the customer token path (no staff-only fields)
- Token travels only over HTTPS; never logged server-side
- Recommended TTL: 30 days (`previewTokenExpiry` timestamp field)

**Next step:** implement `getOrder` customer token path + preview link generation in dashboard before building `customer-preview.html`.
