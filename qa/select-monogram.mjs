// selectMonogram — drive the staff engine's Heirloom monogram picker after an order loads.
//
// Why this exists: the monogram (roots/birds/roses) selects ARTWORK — the cover SVG, the
// intro SVG, the clip variant and the four letter positions. Switching it does NOT touch
// specialPhotos or bookCaptions (template-engine.html:4413), so ONE order yields all three
// monogram mockups. Switching the TEMPLATE does reset photos, which is why each colourway
// still needs its own order.
//
// Fails LOUDLY and never falls back. Silently capturing the order's default monogram while
// the filename claims another would poison a whole mockup set, and the error would only
// surface as "the thumbnails all look the same" weeks later on the product page.
//
// Used by qa/capture-cover-wrap.mjs and qa/capture-spread.mjs via QA_MONOGRAM.
export async function selectMonogram(page, mono, note = console.log) {
  const key = String(mono).trim().toLowerCase();

  const result = await page.evaluate((m) => {
    const sel  = document.getElementById('monogram-select');
    const zone = document.getElementById('special-zone-monogram');
    if (!sel)  return { ok: false, why: 'no #monogram-select in the DOM' };
    // populateMonogramSelect hides the zone for templates with no `monograms` block.
    if (zone && getComputedStyle(zone).display === 'none') {
      return { ok: false, why: 'the picker is hidden — this order is not a monogram template' };
    }
    const opts = [...sel.options].map(o => o.value);
    if (!opts.includes(m)) return { ok: false, why: `no option "${m}" (have: ${opts.join(', ')})` };
    // Read the previous value BEFORE dispatching — the change handler runs synchronously
    // and overwrites _activeMonogram, so reading after would just echo the new value back.
    const from = window._activeMonogram;
    sel.value = m;
    sel.dispatchEvent(new Event('change'));      // handler sets _activeMonogram + re-renders
    return { ok: true, from, options: opts };
  }, key);

  if (!result.ok) throw new Error(`monogram "${key}" could not be selected: ${result.why}`);

  // Confirm the engine actually took it, rather than trusting the dispatch.
  await page.waitForFunction((m) => window._activeMonogram === m, key, { timeout: 30000 });

  // rerenderCover() + renderBook() swap <img> sources; wait for every one to repaint or the
  // screenshot catches the PREVIOUS monogram's artwork mid-swap.
  await page.waitForFunction(() => {
    const imgs = [...document.querySelectorAll('.cover-canvas img, .spread-pages img')];
    return imgs.length > 0 && imgs.every(i => i.complete && i.naturalWidth > 0);
  }, null, { timeout: 120000 }).catch(() => note('⚠ post-monogram image wait timed out — capturing anyway'));
  await page.waitForTimeout(1200); // settle clip-path + fonts

  note(`Monogram set to "${key}" (was ${result.from || 'the order default'})`);
}
