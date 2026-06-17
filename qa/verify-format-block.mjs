// Verifies the beforeinput guard blocks inline rich-text formatting (Ctrl+B/I) in
// caption editors on both surfaces. The guard is a document-level listener registered
// on page load, so we can test it against any contenteditable on the real page.
import { chromium } from 'playwright';

const PAGES = [
  'http://localhost:8123/pages/staff/template-engine.html',
  'http://localhost:8123/pages/customer-preview.html',
];

const browser = await chromium.launch();
let allOk = true;

for (const url of PAGES) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(300); // let top-level script register the listener

  await page.evaluate(() => {
    const div = document.createElement('div');
    div.id = '__fmt_test';
    div.setAttribute('contenteditable', 'true');
    div.textContent = 'hello world';
    document.body.appendChild(div);
    div.focus();
    const range = document.createRange();
    range.selectNodeContents(div);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  });
  // Real keystrokes — Ctrl+B / Ctrl+I fire native beforeinput(formatBold/formatItalic)
  await page.keyboard.press('Control+b');
  await page.keyboard.press('Control+i');
  const result = await page.evaluate(() => {
    const div = document.getElementById('__fmt_test');
    const html = div.innerHTML;
    div.remove();
    return html;
  });

  const hasMarkup = /<b>|<i>|<strong>|<em>|font-weight|font-style/i.test(result);
  console.log(`${url}\n  innerHTML after bold+italic: ${JSON.stringify(result)}\n  formatting present: ${hasMarkup ? 'YES ✗' : 'no ✓'}`);
  if (hasMarkup) allOk = false;
  await page.close();
}

await browser.close();
console.log(allOk ? '\nPASS — formatting blocked on both surfaces' : '\nFAIL — formatting leaked through');
process.exit(allOk ? 0 : 1);
