// Stage 4 — drives the Newborn order form: confirms cover captions, Intro fields,
// Labour caption + 2 photo zones + zodiac select render, and that the submit
// payload (intercepted) carries the right fpSelections/fpTexts/coverCaptions.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import path from 'path';

const OUT = path.resolve('sessions/qa-runs/newborn-orderform');
mkdirSync(OUT, { recursive: true });

const q = new URLSearchParams({
  template: 'Newborn', category: 'kids', pages: '40', price: '70',
  back: 'newborn.html',
  addons: 'Intro,Labour', addon_inputs: 'intro,labour', addon_slugs: 'fpintro,fplabour',
});
const url = `http://localhost:8080/pages/order?${q.toString()}`;

const b = await chromium.launch();
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));

await p.goto(url, { waitUntil: 'load' });
await p.waitForTimeout(500);

// Cover captions present (name/subtitle/spine)
const coverCaps = await p.$$eval('[id^="cover-cap-"]', els => els.map(e => e.id));
console.log('cover caption fields:', coverCaps);

// Step 1 → 2
await p.fill('#inp-name', 'Test Parent');
await p.fill('#inp-email', 'test@example.com');
await p.click('text=Continue', { timeout: 3000 }).catch(() => {});
await p.waitForTimeout(500);

// Intro fields
const introFields = await p.$$eval('[id^="intro-fpintro-"]', els => els.map(e => e.id));
console.log('intro fields:', introFields);
// Labour: caption + zodiac + 2 photo zones
const labourCap = await p.$('#labour-cap-fplabour') ? 'yes' : 'NO';
const zodiac    = await p.$('#zodiac-fplabour') ? 'yes' : 'NO';
const zodiacOpts = await p.$$eval('#zodiac-fplabour option', os => os.length).catch(() => 0);
const labourZones = await p.$$eval('[id^="dz-special-fplabour"]', els => els.length);
console.log('labour caption:', labourCap, '| zodiac select:', zodiac, '| zodiac options:', zodiacOpts, '| labour photo zones:', labourZones);

// Fill intro + labour to exercise composeIntroBlock + payload
await p.fill('#intro-fpintro-name', 'Nico');
await p.fill('#intro-fpintro-dob', '14 March 2026');
await p.fill('#intro-fpintro-time', '08:42');
await p.fill('#intro-fpintro-weight', '3.4 kg');
await p.fill('#intro-fpintro-length', '51 cm');
await p.fill('#labour-cap-fplabour', 'Welcome to the world, Nico');
await p.selectOption('#zodiac-fplabour', 'Pisces');

// Intercept the payload by stubbing fetch before submit, then read what would be sent.
const payload = await p.evaluate(() => {
  return new Promise(resolve => {
    const origFetch = window.fetch;
    window.fetch = (u, opts) => {
      if (opts && opts.method === 'POST' && opts.body) {
        try { resolve(JSON.parse(opts.body)); } catch { resolve(null); }
        // return a never-resolving promise so the real upload doesn't run
        return new Promise(() => {});
      }
      return origFetch(u, opts);
    };
    // Trigger submit (skip pre-submit modal by stubbing if present)
    window.preSubmitConfirm = async () => true;
    // cover + main photos are required; stub the validators' state minimally:
    // upload a fake cover + enough main files is hard headlessly, so we call the
    // collection path directly is not exposed. Instead, just click submit and
    // accept that it may stop at photo validation — we only need the payload if
    // it reaches fetch. Fallback: resolve(null) after timeout.
    document.getElementById('submit-btn')?.click();
    setTimeout(() => resolve('VALIDATION_BLOCKED'), 1500);
  });
});
console.log('payload/submit result:', JSON.stringify(payload, null, 2));

await p.screenshot({ path: path.join(OUT, 'step2.png'), fullPage: true });
console.log('page errors:', errs);
await b.close();
