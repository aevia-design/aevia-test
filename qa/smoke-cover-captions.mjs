// Verify cover caption labels/placeholders/maxlength render from data for both templates.
import { chromium } from 'playwright';
const BASE = 'http://localhost:8080/pages';
const browser = await chromium.launch();
const out = [];

async function check(label, query) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(`${BASE}/order?${query}`, { waitUntil: 'networkidle' });
  await page.fill('#inp-name', 'T');
  await page.fill('#inp-email', 't@e.com');
  await page.evaluate(() => advance());
  await page.waitForTimeout(300);
  const fields = await page.evaluate(() =>
    [...document.querySelectorAll('[id^="cover-cap-"]')].map(i => ({
      key: i.id.replace('cover-cap-', ''),
      label: i.closest('.field')?.querySelector('label')?.textContent,
      placeholder: i.placeholder,
      maxlength: i.getAttribute('maxlength'),
    }))
  );
  out.push([label, { fields, jsErrors: errs }]);
  await page.close();
}

await check('SCRIBBLE', 'template=Scribble&category=kids&pages=40&price=70&back=scribble.html');
await check('WANDER', 'template=Wander&category=adventures&pages=40&price=60&back=wander.html');
console.log(JSON.stringify(out, null, 2));
await browser.close();
