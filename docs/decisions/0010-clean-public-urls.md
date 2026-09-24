# 0010 — Clean public URLs: rewrite `pages/` out of the address, don't move files

**Date:** 2026-09-24 (session 192)
**Status:** ✅ Implemented (Stage 1 spike verified live; Stage 2 bulk edit this commit)
**Supersedes:** ADR-0009's homepage section (`"Homepage moves to aevia.at/"`, and the canonical/
hreflang example in its Consequences) — those described `/pages/home` as the clean, canonical
address. This ADR goes one step further and removes `/pages/` from every public address.
**Relates to:** `docs/briefs/domain-migration.md`, `work/url-structure/brief.md` (full research +
the Stage 1 spike result this decision rests on)

## Context

Every address on the site carried a `/pages/` segment with no meaning to a customer
(`aevia.at/pages/heirloom`), and the homepage was `aevia.at/pages/home`. Google's own URL
guidance, NN/g, and all three competitors checked (Artifact Uprising, Mixbook, Saal Digital) use
the bare domain and short flat slugs for public pages. The site is still `noindex` and no customer
link has been shared yet, so this is the cheapest point at which to change it — after launch, every
old address needs a redirect kept alive indefinitely.

## Options Considered

- **Option C — rewrite, don't move.** Files stay under `pages/`; a Cloudflare `_redirects` 200 rule
  serves each public page at a clean address. No file moves, no build step.
- **Option D — move the files.** Physically relocate public `.html` files out of `pages/`. Rejected:
  same visible result as Option C for far more breakage (every reference to a public page's path
  across the codebase, not just its outward-facing link).

Decided (S192): try Option C first via a live spike; only fall back to D if the spike failed.

## Decision

**Option C, confirmed working by a live spike on `aevia-test.pages.dev` (S192):**

- `/heirloom /pages/heirloom 200` → 200, clean address kept in the address bar, assets and nav
  resolve, no console errors. The rewrite destination **must be extension-less** — a `.html`
  destination (`/pages/heirloom.html`) 308-bounces back to the extension-less form, because
  Cloudflare's own clean-URL redirect fires on the resolved file.
- **No 301 from the old `/pages/<public>` address to the clean one** — it loops against the 200
  rewrite. Old addresses are left to keep working as-is; `<link rel="canonical">` carries the SEO
  signal instead.
- Every internal link on a rewritten page must be **root-absolute** (`/collections`, not
  `collections.html`), because a relative link on a page served from a rewritten path resolves
  against that path, not against `pages/`.
- **English stays at the root; German sits under `/de/`** — no `/en/` prefix, which would turn
  `aevia.at/` back into a redirect (owner decision, informed by Google's multilingual guidance).
- **Only public pages move.** Transactional pages (`order`, `account`, `customer-preview`,
  `spread-preview`, `staff/**`) keep their `/pages/...` address unchanged — they are reached only by
  button or email link, never shared or searched, so Stripe return URLs, `accountUrl`, and the
  staff-dashboard email link are untouched.

This supersedes ADR-0009's "Homepage moves to `aevia.at/`" section, which changed the `/`
redirect from a 301 to a 200 rewrite but still pointed at `/pages/home` (and its canonical/hreflang
example, which used `.../pages/de/home`). The mechanism (a `_redirects` 200 rewrite) is the same;
this ADR extends it to every public page and removes `/pages/` from the address entirely.

## Consequences

- **We gain:** every public address is short and meaningful; the homepage is a true `/`, not a
  rewrite of `/pages/home`; German pages sit predictably under `/de/`; nothing moved on disk, so no
  file-path references elsewhere in the codebase (render pipeline, tests, scripts) needed to change.
- **We accept:** the old `/pages/<public>` addresses stay live and un-redirected indefinitely (a
  301 there loops), so two addresses now serve the same content — mitigated by self-referencing
  canonical tags on every public page.
- **We assume:** no customer-facing link to a public page has been shared outside the codebase yet
  (true — the site is `noindex` and pre-launch), so no external backlink or bookmark is broken by
  this change.

## Full implementation detail

See `work/url-structure/brief.md` for the complete requirement list (the `_redirects` rules, every
producer of a public-page link, canonical/hreflang updates, and the verification run).
