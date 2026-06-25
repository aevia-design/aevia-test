# Pricing

**Canonical source of truth is code, not this doc:** book prices live in
[`assets/js/prices.js`](../assets/js/prices.js) (`BOOK_PRICES = { p40, p80 }`), which every
product page includes to render its price chips. The Stripe SKU prices are set in
`functions/.env` (`STRIPE_PRICE_ID_40` / `STRIPE_PRICE_ID_80`). This file is a human-readable
summary only — if a number here disagrees with `prices.js`, `prices.js` wins.

## Standard book prices (all templates)

| Size      | Price |
|-----------|-------|
| 40 pages  | €70   |
| 80 pages  | €100  |

Every built template — Scribble, Papercut, Newborn, Wander, **Tender** — uses these same
standard prices. There is no per-template pricing; a product page sets its price purely by
which page-count chip is selected. To change prices, edit `prices.js` (and the matching chip
`onclick` values per the note in that file) plus the Stripe price IDs in `functions/.env`.

## Notes

- The `price` URL param on `order.html` is just echoed onto the order for display; the
  authoritative charge is the Stripe price ID chosen at checkout by page count.
- When adding a new template, link `prices.js` on its product page (see the add-template
  skill, Phase C / product-page stage) so it inherits the standard prices automatically.
</content>
