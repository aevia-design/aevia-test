// P2-11 — cross-browser customer flow (case-catalogue P2-11)
//
//   node qa/p2-crossbrowser.mjs [order]      default AEV-060
//
// WHY THIS EXISTS
// P2-11 asks for WebKit + Chromium × desktop + mobile widths on the customer flow.
// Every QA script before S149 ran headless Chromium at 1440×950 only, so Safari's
// engine and phone widths have barely been looked at on the customer preview.
//
// Mints nothing: reads the preview token from Firestore and loads an EXISTING
// order read-only in four configurations.
//
// EXPECTED, NOT A DEFECT: on a phone profile `customer-preview` shows the
// `.mobile-gate` overlay instead of the book — the engine is deliberately
// desktop-only. The mobile pass criterion is therefore "the gate renders, names
// the real order, and does not side-scroll", NOT "the book renders".
//
// Artefacts → sessions/qa-runs/<date>-p2-crossbrowser/

import { chromium, webkit, devices } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { orderState } from './firestore.mjs';

const ORDER = (process.argv[2] || 'AEV-060').toUpperCase();
const BASE = 'https://aevia-test.pages.dev/pages';
const RUN_DIR = path.resolve('sessions/qa-runs', `${new Date().toISOString().slice(0, 10)}-p2-crossbrowser`);
fs.mkdirSync(RUN_DIR, { recursive: true });

const log = [], findings = [];
const note = (m) => { const l = `[${new Date().toISOString().slice(11, 19)}] ${m}`; console.log(l); log.push(l); };
const finding = (sev, cfg, msg) => { findings.push({ sev, id: 'P2-11', cfg, msg }); note(`  ⚠️  ${sev} [${cfg}] ${msg}`); };
const pass = (cfg, msg) => note(`  ✓ [${cfg}] ${msg}`);

const st = await orderState(ORDER);
if (!st?.previewToken) { console.error(`${ORDER} has no previewToken`); process.exit(1); }
note(`═══ P2-11 cross-browser — ${ORDER} (${st.status}) ═══`);

const URL = `${BASE}/customer-preview.html?token=${st.previewToken}`;

const CONFIGS = [
  { name: 'chromium-desktop', engine: chromium, ctx: { viewport: { width: 1440, height: 950 } }, phone: false },
  { name: 'webkit-desktop',   engine: webkit,   ctx: { viewport: { width: 1440, height: 950 } }, phone: false },
  { name: 'chromium-pixel7',  engine: chromium, ctx: { ...devices['Pixel 7'] }, phone: true },
  { name: 'webkit-iphone13',  engine: webkit,   ctx: { ...devices['iPhone 13'] }, phone: true },
];

for (const cfg of CONFIGS) {
  const browser = await cfg.engine.launch({ headless: true });
  const ctx = await browser.newContext(cfg.ctx);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(`console: ${m.text()}`); });

  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

    if (cfg.phone) {
      // Desktop-only by design — assert the gate, not the book.
      const gated = await page.waitForFunction(
        () => { const g = document.getElementById('mobile-gate'); return g && getComputedStyle(g).display !== 'none' && g.classList.contains('visible'); },
        null, { timeout: 30000 }
      ).then(() => true).catch(() => false);
      if (gated) {
        // TO-DOS #72 was exactly this: the gate rendered a placeholder instead of
        // the real reference. The FIX made the reference load from the token
        // ASYNCHRONOUSLY, so it appears after the gate does — poll for it rather
        // than reading once, or this reports a regression that isn't there.
        const refShown = await page.waitForFunction(
          n => (document.getElementById('mobile-gate')?.innerText || '').includes(n),
          ORDER, { timeout: 30000 }
        ).then(() => true).catch(() => false);
        const gateText = (await page.textContent('#mobile-gate').catch(() => '') || '').replace(/\s+/g, ' ').trim();
        pass(cfg.name, `mobile gate shown: "${gateText.slice(0, 90)}"`);
        if (refShown) pass(cfg.name, `gate names the real order ${ORDER}`);
        else finding('S2', cfg.name, `gate never showed the real order reference within 30s (regression of TO-DOS #72) — text: "${gateText.slice(0, 120)}"`);
      } else {
        finding('S2', cfg.name, 'no mobile gate on a phone profile — the desktop-only engine is exposed at phone width');
      }
    } else {
      const loaded = await page.waitForFunction(
        n => window.orderData && window.orderData.orderNumber === n, ORDER, { timeout: 60000 }
      ).then(() => true).catch(() => false);
      if (!loaded) { finding('S1', cfg.name, `order ${ORDER} never loaded (window.orderData not populated in 60s)`); }
      else {
        await page.waitForTimeout(15000); // let photos actually paint
        const photos = await page.$$eval('img.slot-photo', els => els.filter(i => i.complete && i.naturalWidth > 0).length).catch(() => 0);
        if (photos > 0) pass(cfg.name, `book rendered with ${photos} photo(s) loaded`);
        else finding('S1', cfg.name, 'order loaded but ZERO photos painted');
      }
    }

    // Horizontal overflow — the classic "not built for this width" signal.
    // Name the widest offending element — an overflow finding without one is not
    // actionable, and an element with its OWN horizontal scroll is not a defect.
    const o = await page.evaluate(() => {
      const vw = window.innerWidth, docW = document.documentElement.scrollWidth;
      let worst = null;
      if (docW > vw + 2) {
        for (const el of document.querySelectorAll('body *')) {
          const r = el.getBoundingClientRect();
          if (r.right <= vw + 2 || r.width === 0) continue;
          const ov = getComputedStyle(el).overflowX;
          if (ov === 'auto' || ov === 'scroll') continue; // scrolls itself — fine
          if (!worst || r.right > worst.right) {
            worst = { right: Math.round(r.right), w: Math.round(r.width),
                      sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') };
          }
        }
      }
      return { vw, docW, worst };
    });
    if (o.docW - o.vw > 2) {
      finding('S2', cfg.name, `horizontal overflow: content ${o.docW}px in a ${o.vw}px viewport (${o.docW - o.vw}px of side-scroll)${o.worst ? ` — widest offender ${o.worst.sel} (${o.worst.w}px wide, right edge ${o.worst.right}px)` : ' — no single non-scrolling offender found; likely a container that scrolls itself'}`);
    }
    else pass(cfg.name, `no horizontal overflow at ${o.vw}px`);

    await page.screenshot({ path: path.join(RUN_DIR, `${cfg.name}.png`), fullPage: true });
    note(`📸 ${cfg.name}.png`);

  } catch (err) {
    finding('S1', cfg.name, `run failed: ${err.message.slice(0, 140)}`);
    await page.screenshot({ path: path.join(RUN_DIR, `ERROR-${cfg.name}.png`) }).catch(() => {});
  }

  // pageerrors are engine-specific by nature — this is the whole point of the case.
  if (errs.length) {
    const uniq = [...new Set(errs)].slice(0, 5);
    finding('S2', cfg.name, `${errs.length} page/console error(s): ${uniq.join(' | ').slice(0, 300)}`);
  }
  await browser.close();
}

note('');
note(`═══ RESULT: ${findings.length} finding(s) ═══`);
findings.forEach(f => note(`  ${f.sev} [${f.cfg}] ${f.msg}`));
fs.writeFileSync(path.join(RUN_DIR, 'findings.json'),
  JSON.stringify({ order: ORDER, ranAt: new Date().toISOString(), findings }, null, 2));
fs.writeFileSync(path.join(RUN_DIR, 'run.log'), log.join('\n'));
note(`Artefacts → ${RUN_DIR}`);
process.exit(findings.some(f => f.sev === 'S1') ? 1 : 0);
