// Helper — get (or generate) the customer-preview token URL for an order.
// Logs into the staff dashboard, reads the order's row, and prints the preview URL.
// Used by the P1 preview cases so they don't each re-drive the dashboard.
//
// Run: node qa/p1-preview-token.mjs AEV-053
// Prints the URL on the last line (and writes qa/.preview-url-<ORDER>.txt, gitignored-ish).

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const ORDER = (process.argv[2] || 'AEV-053').toUpperCase();
const BASE = 'https://aevia-test.pages.dev/pages';

const env = Object.fromEntries(
  fs.readFileSync(path.resolve('qa/.env'), 'utf8')
    .split('\n').filter(l => l.trim() && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const dash = await ctx.newPage();
dash.on('dialog', d => d.accept().catch(() => {}));

// The dashboard holds an open Firestore listener → networkidle never fires.
await dash.goto(`${BASE}/staff/dashboard.html`, { waitUntil: 'domcontentloaded' });
await dash.waitForSelector('#email-input', { state: 'visible', timeout: 30000 });
await dash.fill('#email-input', env.STAFF_TEST_EMAIL);
await dash.fill('#pwd-input', env.STAFF_TEST_PASSWORD);
await dash.click('.lock-btn');
await dash.waitForSelector('#app', { state: 'visible', timeout: 30000 });
await dash.waitForFunction(
  (n) => (document.getElementById('orders-body')?.innerText || '').includes(n),
  ORDER, { timeout: 60000 }
);

const genSel = `button[onclick="generatePreviewLink('${ORDER}')"]`;
if (await dash.$(genSel)) {
  await dash.click(genSel);
  await dash.waitForTimeout(4000);
}

// The row renders an <a> / input carrying the preview URL when a token exists.
const url = await dash.$$eval('#orders-body tr', (rows, n) => {
  const tr = rows.find(r => r.innerText.includes(n));
  if (!tr) return null;
  const html = tr.innerHTML;
  const m = html.match(/https:\/\/aevia-test\.pages\.dev\/pages\/customer-preview\.html\?token=[A-Za-z0-9_\-]+/);
  return m ? m[0] : null;
}, ORDER);

await browser.close();

if (!url) { console.error(`No preview URL found for ${ORDER}`); process.exit(1); }
fs.writeFileSync(path.resolve(`qa/.preview-url-${ORDER}.txt`), url);
console.log(url);
