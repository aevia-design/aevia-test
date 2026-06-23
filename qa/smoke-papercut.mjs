// Smoke test for the Papercut template in the STAFF engine (local mode).
// Loads the engine, selects Papercut, injects a synthetic photo pool + special
// photos, checks all functional pages, renders the book, and verifies:
//   - zero JS errors / failed SVG overlay loads
//   - overlay z-order: ABOVE photos on SP0–SP3/SP5/SP6 + FP1/FP2/FP3/FP5,
//     BEHIND photos on SP4 (and the cover, checked separately)
//   - FP1 right slot carries a heart clip-path
//   - FP2 right is a full-bleed photo slot
// Run: node qa/smoke-papercut.mjs   (needs `npx serve . -p 8080` running)
import { chromium } from 'playwright';

const LOCAL = 'http://localhost:8080/pages/staff/template-engine.html';
const browser = await chromium.launch();
const page = await browser.newPage();

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

await page.goto(LOCAL, { waitUntil: 'networkidle' });

// Select Papercut + inject a synthetic book, then render.
const result = await page.evaluate(() => {
  const sel = document.getElementById('template-select');
  sel.value = 'Papercut';
  sel.dispatchEvent(new Event('change'));

  // 30 regular photos (alternating orientation), data URLs so nothing 404s.
  const px = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
  window.photoPool = Array.from({ length: 30 }, (_, i) => ({
    url: px, name: 'p' + i, orientation: i % 2 ? 'vertical' : 'horizontal',
  }));
  // Special / artwork buckets used by FP1/FP3/FP4/FP5.
  window.specialPhotos = window.freshSpecialPhotos
    ? window.freshSpecialPhotos()
    : { cover: [], FP1: [], FP3: [], FP4: [], FP5: [] };
  ['FP1', 'FP3', 'FP4', 'FP5'].forEach(k => {
    window.specialPhotos[k] = [
      { url: px, name: k + '-a', orientation: 'horizontal' },
      { url: px, name: k + '-b', orientation: 'vertical' },
    ];
  });

  window._sidebarThumbs = []; // upload path normally builds these; stub for headless render

  // Check every functional-page checkbox.
  document.querySelectorAll('input[name="fp"]').forEach(cb => { cb.checked = true; });

  window.renderBook();

  // Walk each rendered spread; report overlay position per page-canvas.
  const out = [];
  document.querySelectorAll('.spread-row').forEach(row => {
    const spreadId = row.dataset.spreadId;
    row.querySelectorAll('.page-canvas').forEach(canvas => {
      const overlay = canvas.querySelector(':scope > .svg-overlay');
      const slots = canvas.querySelectorAll(':scope > .photo-slot');
      let overlayAbove = null;
      if (overlay && slots.length) {
        // Actual paint order = compare computed z-index (CSS), tie-break by DOM order.
        const oz = parseInt(getComputedStyle(overlay).zIndex) || 0;
        const sz = Math.max(...Array.from(slots).map(s => parseInt(getComputedStyle(s).zIndex) || 0));
        if (oz !== sz) {
          overlayAbove = oz > sz;
        } else {
          const kids = Array.from(canvas.children);
          const lastSlotIdx = Math.max(...Array.from(slots).map(s => kids.indexOf(s)));
          overlayAbove = kids.indexOf(overlay) > lastSlotIdx;
        }
      }
      out.push({
        spreadId,
        side: canvas.dataset.side,
        hasOverlay: !!overlay,
        slotCount: slots.length,
        overlayAbove,
        heartClip: !!(overlay || slots.length) && Array.from(slots).some(s => s.style.clipPath && s.style.clipPath.includes('path')),
        fullBleedSlot: Array.from(slots).some(s => s.style.width && parseFloat(s.style.width) >= 600),
      });
    });
  });
  return { sequence: window._bookSequence, pages: out };
});

await browser.close();

// Expected overlay z-order per spread.
const expectAbove = { SP0: true, SP1: true, SP2: true, SP3: true, SP4: false, SP5: true, SP6: true, FP1: true, FP2: true, FP3: true, FP5: true };

console.log('Book sequence:', result.sequence.join(' → '));
console.log('\nPer-page render:');
let fail = 0;
for (const p of result.pages) {
  const exp = expectAbove[p.spreadId];
  let verdict = '';
  if (p.hasOverlay && exp !== undefined && p.overlayAbove !== null) {
    const ok = p.overlayAbove === exp;
    if (!ok) fail++;
    verdict = ok ? '  ✓ z-order' : `  ✗ z-order (got above=${p.overlayAbove}, want ${exp})`;
  }
  console.log(`  ${p.spreadId}/${p.side}  overlay=${p.hasOverlay} above=${p.overlayAbove} slots=${p.slotCount} heart=${p.heartClip} fullBleed=${p.fullBleedSlot}${verdict}`);
}

console.log('\nJS / load errors:', errors.length);
errors.forEach(e => console.log('  ✗ ' + e));

const fp1Heart = result.pages.some(p => p.spreadId === 'FP1' && p.heartClip);
const fp2Full = result.pages.some(p => p.spreadId === 'FP2' && p.fullBleedSlot);
console.log('\nFP1 heart clip present:', fp1Heart ? '✓' : '✗');
console.log('FP2 full-bleed slot present:', fp2Full ? '✓' : '✗');

const pass = fail === 0 && errors.length === 0 && fp1Heart && fp2Full;
console.log('\n' + (pass ? '✅ SMOKE PASS' : '❌ SMOKE FAIL'));
process.exit(pass ? 0 : 1);
