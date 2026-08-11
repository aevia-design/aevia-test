// Read-only probe: why does the Wander cover render its album name twice?
//
// Loads a real order into the staff engine and dumps the cover DOM. Answers three
// questions the source alone could not settle:
//   1. How many cover ROWS exist? (rerenderCover replaces only the FIRST match)
//   2. How many .cover-caption nodes exist per key, and where do they sit?
//   3. What is actually in window.bookCaptions.cover — one value or a doubled one?
// It also dumps the "Customer's order data" panel rows, to confirm live that the
// hardcoded coverLabels whitelist drops Wander's front/spine keys.
//
// Nothing is saved, nothing is written to GCS. Cost: loading one order's photos.
//
// Run:  $env:STAFF_PW = Read-Host "Staff password"   (PowerShell)
//       $env:QA_ORDER = "AEV-094"                    (optional, defaults below)
//       node qa/probe-cover-captions.mjs
import { chromium } from '@playwright/test';

const ORDER = process.env.QA_ORDER || 'AEV-094';
const EMAIL = process.env.STAFF_EMAIL || 'evg.myasin@gmail.com';
const PW    = process.env.STAFF_PW;
const BASE  = 'https://aevia-test.pages.dev/pages';

if (!PW) { console.error('❌ STAFF_PW not set. In PowerShell:  $env:STAFF_PW = Read-Host "Staff password"'); process.exit(1); }

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));

try {
  await page.goto(`${BASE}/staff/template-engine`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#eng-email', { state: 'visible', timeout: 20000 });
  await page.fill('#eng-email', EMAIL);
  await page.fill('#eng-pwd', PW);
  await page.click('#eng-lock .eng-lock-btn');
  await page.waitForSelector('#eng-lock', { state: 'hidden', timeout: 20000 });
  console.log('login OK');

  await page.click('#mode-order-btn');
  await page.fill('#order-number-input', ORDER);
  await page.click('#order-load-btn');
  await page.waitForSelector('#order-info-panel', { state: 'visible', timeout: 60000 });
  await page.waitForTimeout(15000);   // let the book canvas finish painting
  console.log(`loaded ${ORDER}\n`);

  const dump = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.spread-row[data-spread-id="cover"]')];
    const caps = [...document.querySelectorAll('.cover-caption')].map(el => {
      const r = el.getBoundingClientRect();
      // Which cover row does this caption belong to? Index into the rows list.
      const owner = rows.findIndex(row => row.contains(el));
      return {
        key:   el.dataset.coverCaptionKey,
        label: el.dataset.label,
        html:  el.innerHTML,
        text:  el.textContent,
        ownerRow: owner,
        left:  Math.round(r.left), top: Math.round(r.top),
        w: Math.round(r.width), h: Math.round(r.height),
        cssLeft: el.style.left, cssTop: el.style.top,
        fontSize: el.style.fontSize,
      };
    });
    // Any OTHER text node sitting in the cover canvas (e.g. a stray SVG <text>)?
    const svgText = [...document.querySelectorAll('.cover-canvas svg text')]
      .map(t => t.textContent.trim()).filter(Boolean);

    return {
      template:   window._activeTemplateName || document.getElementById('template-select')?.value,
      pageCount:  document.getElementById('page-count-select')?.value,
      coverRows:  rows.length,
      coverCanvases: document.querySelectorAll('.cover-canvas').length,
      captions:   caps,
      bookCaptionsCover: window.bookCaptions?.cover || null,
      svgText,
      // The order-info panel, as staff see it.
      oipRows: [...document.querySelectorAll('#oip-rows .order-info-row')].map(r => ({
        label: r.querySelector('.order-info-label')?.textContent,
        value: (r.querySelector('.order-info-value')?.textContent || '').slice(0, 60),
      })),
    };
  });

  console.log('template      :', dump.template);
  console.log('page count    :', dump.pageCount);
  console.log('cover ROWS    :', dump.coverRows, '  (expect 1)');
  console.log('cover CANVASES:', dump.coverCanvases, '  (expect 1)');
  console.log('SVG <text>    :', JSON.stringify(dump.svgText));

  console.log(`\n.cover-caption nodes: ${dump.captions.length}`);
  for (const c of dump.captions) {
    console.log(`  key=${c.key}  row#${c.ownerRow}  left=${c.left} top=${c.top} ${c.w}x${c.h}  cssLeft=${c.cssLeft} size=${c.fontSize}`);
    console.log(`     html=${JSON.stringify(c.html)}`);
  }

  console.log('\nbookCaptions.cover:', JSON.stringify(dump.bookCaptionsCover, null, 2));

  console.log('\n"Customer\'s order data" panel rows:');
  if (!dump.oipRows.length) console.log('  (none)');
  for (const r of dump.oipRows) console.log(`  ${r.label}  →  ${r.value}`);

  // Duplicate detection, stated plainly.
  const byKey = {};
  for (const c of dump.captions) (byKey[c.key] = byKey[c.key] || []).push(c);
  console.log('\n— verdict —');
  console.log('rows:', dump.coverRows === 1 ? 'single cover row ✅' : `DUPLICATE cover rows (${dump.coverRows}) ❌`);
  for (const [k, list] of Object.entries(byKey)) {
    if (list.length > 1) console.log(`key "${k}": ${list.length} nodes ❌  lefts=${list.map(c => c.left).join(',')}`);
    else if (/(.+)\1/.test(list[0].text.trim())) console.log(`key "${k}": single node but DOUBLED content ❌  ${JSON.stringify(list[0].text)}`);
    else console.log(`key "${k}": single node, single content ✅`);
  }

  await page.screenshot({ path: 'sessions/qa-runs/probe-cover-captions.png', fullPage: false });
  console.log('\n📸 sessions/qa-runs/probe-cover-captions.png');
} catch (e) {
  console.error('❌', e.message);
} finally {
  if (errs.length) console.log('\npage errors:', errs.slice(0, 3));
  await browser.close();
}
