# Brief: Clean public URLs before launch (TO-DOS #82)

**Created:** 2026-09-24 (Session 192)
**Objective:** Every public page is reachable at a clean address (`aevia.at/`, `aevia.at/heirloom`,
`aevia.at/de/heirloom`), every link the site, the emails and the scripts produce points at that
address, and nothing that worked before breaks.
**Audience:** The implementer (Claude or a delegated agent); then Evgeny, who verifies on the rig.
**Applicable Standards:** `CLAUDE.md` (project + global), `AGENTS.md` invariants,
`rageatc-code-oss:verifying-work`, `context/design-principles.md` (no visual change expected).

## Why

Every address on the site carries a meaningless `/pages/` segment and the homepage is reached by a
301 hop from `aevia.at`. Google's URL guidance, NN/g and all three competitors checked
(Artifact Uprising, Mixbook, Saal Digital) use the bare domain and short flat slugs. The live site is
still `noindex` and no customer link has been shared, so this is the cheapest the change will ever be;
after launch every old address needs a redirect kept alive indefinitely.

## Decision (settled in S192, do not re-open)

- **Option C: rewrite, don't move.** Files stay in `pages/`. Cloudflare `_redirects` 200 rules serve
  the public pages at clean addresses. Moving files (option D) was rejected as the same visible result
  for far more breakage. If the Stage 1 spike fails, **stop and report** before considering D.
- **English at the root, German under `/de/`** (owner accepted, informed by Google's multilingual
  guidance): no `/en/` prefix, because it would turn `aevia.at/` back into a redirect.
- **Only PUBLIC pages move.** Transactional pages keep their `/pages/` address: `order`,
  `customer-preview`, `account`, `spread-preview`, `staff/**`. They are reached only by button or
  email link, never shared or searched. Stripe return URLs (`functions/index.js:925-927`, built on
  `/pages/customer-preview.html`), `accountUrl`, the staff-dashboard email link and `robots.txt`
  Disallow lines are therefore **unchanged**.

Public pages (34 HTML files under `pages/`, public subset): `home`, `collections`, `about`,
`our-artists`, `help`, `waitlist`, the eight product pages (`heirloom`, `joyride`, `laguna`,
`newborn`, `papercut`, `scribble`, `tender`, `wander`), and every `pages/de/*.html`.
`home` is served at `/` (and `/de/` for `de/home`), not `/home`. Confirm the exact list from disk.

## Requirements

**Stage 1 — spike (on the rig, before any bulk edit):**
- [ ] `_redirects` rules serve one EN product page, its DE twin and home at clean addresses;
      pushed and checked on `aevia-test.pages.dev` (rules are host-agnostic).
- [ ] On those pages: images, CSS, fonts, scripts load (relative `../assets/`, `../../assets/`);
      nav/footer links resolve; no console errors; mobile + desktop.
- [ ] Establish, by testing, whether the OLD `/pages/<public>` address can 301 to the clean one
      without looping against the 200 rewrite (Cloudflare docs, `sources/docs/src_005.md`, warn
      200-proxying risks duplicate content). If it loops, rely on canonical tags (below) and say so.
- [ ] Report the spike result to the owner before Stage 2.

**Stage 1 RESULT (S192, verified on the live rig with throwaway rules, then removed):**
- ✅ **Option C works, with the destination WITHOUT `.html`**: `/spike-b /pages/heirloom 200` →
  200, clean address kept in the bar, all assets load, no console errors.
- ❌ **Destination WITH `.html` bounces**: `/spike-a /pages/heirloom.html 200` → 308 to
  `/pages/heirloom` (Cloudflare's own clean-URL redirect fires on the resolved file).
- ⚠ **`wrangler pages dev` is NOT a faithful local test**: the extension-less rule hung there
  but works in production. Test rewrites on the rig, not with wrangler.
- ❌ **No 301 from old `/pages/<public>` to the clean address**: loops against the 200 rewrite
  (tested under wrangler; not re-tested live, do not try). Rely on canonical tags.
- As predicted, every relative link on a rewritten page 404s (`home.html`, `account.html`,
  `collections.html#love`, `de/heirloom.html`, …): **Stage 2 must make internal links root-absolute**
  (e.g. `/collections#love`, `/pages/account`), not relative.

**Stage 2 — make every producer emit the clean address:**
- [ ] `_redirects`: rules for every public page, EN + DE; existing `/ /pages/home.html 301` replaced.
      Mind precedence and the 100-dynamic-rule limit.
- [ ] **Public → transactional links resolve to `/pages/...`**. Today they are relative and will break
      when the page is served from root: `href="account.html"` (29×) and `href="../account.html"` (26×),
      and `assets/js/product.js:152` (`orderUrl` default `'order.html'`, DE pages set `'../order.html'`).
- [ ] **Transactional → public links point at the clean address**: `order.html`, `account.html`,
      `customer-preview.html` link `home.html` (6), `collections.html` (6), `help.html` (4),
      `about.html` (3), `our-artists.html` (1); the order form's `back` param (`cfg.back`, e.g.
      `'heirloom.html'` in each product page) that returns the customer to the product page.
- [ ] Public → public relative links (`scribble.html`, `home.html`) land on the clean address; links
      to home go to `/` (or `/de/`).
- [ ] `<link rel="canonical">` and all `hreflang` (`en`, `de`, `x-default`) on the 26 pages that carry
      them point at clean addresses; `x-default` = the EN root address.
- [ ] `assets/js/site-mode.js:34,45` (`/pages/waitlist`) and its route test (comment L31).
- [ ] `functions/index.js:2508` upload-failed reorder link (`/pages/<slug>`, `/pages/de/<slug>`) →
      clean; then `firebase deploy --only functions:detectStrandedUploads` (check for
      `Deploy complete!`, not the exit code). Grep every other email/function for public-page links.
- [ ] Scripts that open public pages still work: `scripts/check-slides.js`, `compare-all-slides.js`,
      `test-carousel.js`, `qa/prelaunch-banner.mjs`, `qa/smoke-laguna-product.mjs`, and the mockup
      capture scripts (`exp2-images.mjs`, `web-mockups.mjs`), which read the DEPLOYED rig.
- [ ] Docs: `LINKS.md`, `CLAUDE.md` (Live site line, local-dev note), `docs/briefs/domain-migration.md`;
      a new ADR superseding ADR-0009's homepage section, citing `work/url-structure/`.

**From verifying-work / CLAUDE.md:**
- [ ] `npm test` green and `npm run qa:order` green (pre-push hook).
- [ ] A link crawl of the deployed rig: every internal `href` on every public page, EN and DE, returns
      200 and lands on a clean address (a short Playwright script; record the output).
- [ ] One end-to-end click path on the rig: home → collections → product (DE and EN) → order form
      → back link returns to the clean product address.
- [ ] Local dev still works: `http-server` has no rewrites, so the `.html` form under `pages/` must
      still load locally; document the local vs deployed difference in one line.

## Constraints

- No file moves out of `pages/`; no new dependencies; no build step.
- Transactional URLs and Stripe/`accountUrl`/staff links do not change.
- Surgical edits: only links, canonical/hreflang, rules, the listed scripts and docs.
- Out of scope: sitemap.xml (none exists; separate ticket if wanted), SEO copy, removing the
  pre-launch `noindex` header (launch-day task).
- Owner-side (flag, don't do): update any address already printed or posted (Instagram bio,
  packaging, business cards) to the clean form.

## Success Criteria

1. The link crawl shows every public page, EN and DE, at its clean address with zero broken internal
   links, zero console errors.
2. A test order on the rig completes and the order form's back link, the upload-failed email link and
   the product-page "order" button all resolve correctly.
3. `grep` finds no public-page link still emitting `/pages/<public>` outside the documented exceptions.
4. All requirements above are met.

## References

- Research: `work/url-structure/source_index.md` (14 sources; Google URL structure src_001/002,
  Cloudflare redirects src_005, multilingual src_006/007, competitors src_012-014)
- ADR-0009 `docs/decisions/0009-migrate-to-aevia-at-and-gate-orders.md` (the section this supersedes)
- `docs/briefs/domain-migration.md`, `LINKS.md`

## Context

- `aevia.at` and `aevia-test.pages.dev` are ONE Cloudflare Pages project: a push goes to both.
  Test on the rig; the live domain is gated behind the waitlist until launch.
- Cloudflare already strips `.html` (clean URLs); expect `/x.html` → `/x` 308s to interact with the
  rewrite rules. Test it rather than assume.
- The earlier objection in the backlog ("a 200 rewrite breaks bare relative links") was about the
  homepage alone. Rewriting every public page may avoid it. That is exactly what Stage 1 must prove.
- ⚠ Journi's URLs (src_014) came from search snippets, not a live fetch; do not lean on them.
