// Book prices — single source of truth for all product page displays.
// To change prices: edit p40/p80 here, then update the chip onclick values
// in each product page (search for "pick(this," or "pick('a',this,") and
// also update the Stripe SKU price in functions/.env (STRIPE_PRICE_ID).
const BOOK_PRICES = { p40: 70, p80: 100 };

(function () {
  // Update chip-price labels and the default large-number display from BOOK_PRICES.
  document.querySelectorAll('.chip').forEach(chip => {
    const label = chip.querySelector('.chip-label');
    if (!label) return;
    const price = label.textContent.trim().startsWith('40') ? BOOK_PRICES.p40 : BOOK_PRICES.p80;
    const priceEl = chip.querySelector('.chip-price');
    if (priceEl) priceEl.textContent = '€ ' + price;
  });
  const activeChip = document.querySelector('.chip.on');
  const priceEl    = document.getElementById('price') || document.getElementById('a-price');
  if (activeChip && priceEl) {
    const label = activeChip.querySelector('.chip-label');
    priceEl.textContent = (label?.textContent.trim().startsWith('40'))
      ? BOOK_PRICES.p40 : BOOK_PRICES.p80;
  }
})();
