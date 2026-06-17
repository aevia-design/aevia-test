// Mobile responsiveness audit (#47). Drives the LIVE customer flow at real phone
// viewports, screenshots each step, and flags horizontal overflow + oversized
// elements + tiny tap targets — the classic "not built for mobile" signals.
// Run: node qa/mobile-audit.mjs   → artefacts in sessions/qa-runs/mobile/
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'fs';

const LIVE = 'https://aevia-test.pages.dev/pages';
const OUT  = 'sessions/qa-runs/mobile';
mkdirSync(OUT, { recursive: true });

const profiles = [
  { name: 'iphone13', device: devices['iPhone 13'] },
  { name: 'pixel7',   device: devices['Pixel 7'] },
];

// each: [label, url, optional prep fn run after load]
const orderQuery = 'template=Scribble&category=kids&pages=40&price=70&back=scribble.html&addons=Birthday%20spread&addon_inputs=photo&addon_slugs=fp1';
const pages = [
  ['home',        `${LIVE}/home.html`],
  ['product',     `${LIVE}/scribble.html`],
  ['order-step1', `${LIVE}/order?${orderQuery}`],
  ['order-step2', `${LIVE}/order?${orderQuery}`, async (page) => {
      await page.fill('#inp-name', 'Mobile Test').catch(()=>{});
      await page.fill('#inp-email', 'mobile@test.com').catch(()=>{});
      await page.evaluate(() => { try { advance(); } catch(e){} });
      await page.waitForTimeout(600);
  }],
];

async function audit(page, label) {
  return await page.evaluate((label) => {
    const vw = window.innerWidth;
    const docW = document.documentElement.scrollWidth;
    const overflow = docW - vw;
    // find elements that stick out past the viewport (the cause of side-scroll)
    const offenders = [];
    document.querySelectorAll('*').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.right > vw + 2 || r.left < -2) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className && el.className.toString) ? el.className.toString().slice(0,40) : '',
          left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width),
        });
      }
    });
    // tiny tap targets (links/buttons under 40px in either dimension)
    const smallTaps = [];
    document.querySelectorAll('a,button,input,select,[onclick]').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.height < 36 || r.width < 36) {
        smallTaps.push({ tag: el.tagName.toLowerCase(),
          txt: (el.innerText||el.value||'').trim().slice(0,24),
          w: Math.round(r.width), h: Math.round(r.height) });
      }
    });
    // base font size of body
    const bodyFont = getComputedStyle(document.body).fontSize;
    return {
      vw, docW, overflow,
      offenders: offenders.slice(0, 12),
      offenderCount: offenders.length,
      smallTapCount: smallTaps.length,
      smallTaps: smallTaps.slice(0, 10),
      bodyFont,
      hasViewportMeta: !!document.querySelector('meta[name="viewport"]'),
      viewportMeta: document.querySelector('meta[name="viewport"]')?.content || null,
    };
  }, label);
}

const browser = await chromium.launch();
const report = {};

for (const { name, device } of profiles) {
  report[name] = {};
  const ctx = await browser.newContext({ ...device });
  for (const [label, url, prep] of pages) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1200);
      if (prep) await prep(page);
      await page.waitForTimeout(400);
      const data = await audit(page, label);
      data.jsErrors = errors.slice(0, 5);
      await page.screenshot({ path: `${OUT}/${name}-${label}.png`, fullPage: true });
      report[name][label] = data;
    } catch (e) {
      report[name][label] = { error: e.message, jsErrors: errors.slice(0,5) };
    }
    await page.close();
  }
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
