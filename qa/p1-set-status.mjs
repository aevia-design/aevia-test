// Helper — read (and optionally set) an order's status from the staff dashboard.
// P1 preview cases need AEV-053 in `review_sent` (the editable customer state); a
// concurrent run left it `approved`, which makes the preview read-only.
//
// Read:  node qa/p1-set-status.mjs AEV-053
// Set:   node qa/p1-set-status.mjs AEV-053 review_sent

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const ORDER = (process.argv[2] || 'AEV-053').toUpperCase();
const NEW_STATUS = process.argv[3] || null;
const BASE = 'https://aevia-test.pages.dev/pages';

const env = Object.fromEntries(
  fs.readFileSync(path.resolve('qa/.env'), 'utf8')
    .split('\n').filter(l => l.trim() && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const dash = await ctx.newPage();
dash.on('dialog', d => { console.log(`  dialog: ${d.message().slice(0, 90)}`); d.accept().catch(() => {}); });

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

const read = () => dash.$$eval('#orders-body tr', (rows, n) => {
  const tr = rows.find(r => r.innerText.includes(n));
  if (!tr) return null;
  const sel = tr.querySelector('select.status-select');
  return { status: sel ? sel.value : '(none)', text: tr.innerText.replace(/\s+/g, ' ').slice(0, 160) };
}, ORDER);

console.log(`${ORDER} BEFORE: ${JSON.stringify(await read())}`);

if (NEW_STATUS) {
  await dash.evaluate(({ n, s }) => {
    const tr = [...document.querySelectorAll('#orders-body tr')].find(r => r.innerText.includes(n));
    const sel = tr.querySelector('select.status-select');
    sel.value = s;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }, { n: ORDER, s: NEW_STATUS });
  await dash.waitForTimeout(6000);
  await dash.reload({ waitUntil: 'domcontentloaded' });
  await dash.waitForFunction(
    (n) => (document.getElementById('orders-body')?.innerText || '').includes(n),
    ORDER, { timeout: 60000 }
  );
  console.log(`${ORDER} AFTER:  ${JSON.stringify(await read())}`);
}

await browser.close();
