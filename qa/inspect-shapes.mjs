import { chromium } from '@playwright/test';
const URL = 'http://localhost:8080/pages/customer-preview?token=56c8f808-950b-4dfb-ac36-18dd58a1150a';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => (window.photoPool || []).length >= 51, null, { timeout: 90000 }).catch(()=>{});
await page.waitForTimeout(8000);
const dump = await page.evaluate(() => {
  const od = window.orderData || {};
  const cba = od.customerBookAssignments || {};
  const cbaKeys = Object.keys(cba);
  // count non-null slot entries in customerBookAssignments
  let cbaPlaced = 0, cbaNull = 0;
  Object.values(cba).forEach(a => [...(a.left||[]),...(a.right||[])].forEach(v => (v==null?cbaNull++:cbaPlaced++)));
  // DOM: how many book slots actually contain a placed photo vs are empty?
  const canvas = document.getElementById('book-canvas');
  const slotImgs = canvas ? canvas.querySelectorAll('.photo-slot img, [class*="slot"] img').length : 'n/a';
  const sidebarUnplaced = document.getElementById('sidebar-unplaced-count')?.textContent;
  return {
    customerBookAssignments_keyCount: cbaKeys.length,
    customerBookAssignments_placed: cbaPlaced,
    customerBookAssignments_null: cbaNull,
    customerBookAssignments_sample: JSON.stringify(cba[cbaKeys[1]] || cba[cbaKeys[0]] || null).slice(0,200),
    DOM_book_slot_imgs: slotImgs,
    sidebar_unplaced_count: sidebarUnplaced,
  };
});
console.log(JSON.stringify(dump, null, 2));
await browser.close();
