import { chromium } from 'playwright';
const out = process.argv[2];
const b = await chromium.launch();
let fails = [];

for (const [lang, url] of [['EN','http://localhost:8080/pages/about.html'],['DE','http://localhost:8080/pages/de/about.html']]) {
  console.log(`\n════ ${lang} ════`);
  const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = [];
  p.on('pageerror', e => errs.push('JS: ' + e.message));
  p.on('console', m => { if (m.type()==='error') errs.push('console: '+m.text()); });
  await p.goto(url, { waitUntil: 'networkidle' });

  for (const w of [1440, 1280, 1024, 900, 768, 600, 390]) {
    await p.setViewportSize({ width: w, height: 900 });
    await p.waitForTimeout(220);
    const r = await p.evaluate(() => {
      const who = document.querySelector('.img-break-who');
      const ven = document.querySelector('.img-break-venue');
      const band = document.querySelector('.img-break');
      const imgs = [...document.querySelectorAll('.img-break-track img')];
      const a = who.getBoundingClientRect(), v = ven.getBoundingClientRect();
      const sameLine = Math.abs(a.top - v.top) < 4;
      return {
        collide: sameLine && (a.right > v.left - 8),
        sameLine,
        gap: Math.round(v.left - a.right),
        pageOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        bandH: Math.round(band.getBoundingClientRect().height),
        tallest: Math.round(Math.max(...imgs.map(i=>i.getBoundingClientRect().height))),
        venColor: getComputedStyle(ven).color,
        venOpacity: getComputedStyle(ven).opacity,
      };
    });
    const bad = r.collide || r.pageOverflow;
    if (bad) fails.push(`${lang} @${w}px: ${r.collide?'caption collision ':''}${r.pageOverflow?'page overflows ':''}`);
    console.log(` ${String(w).padStart(4)}px  caption:${r.sameLine?`one line, gap ${r.gap}px`:'stacked'}`.padEnd(42)
      + ` band ${r.bandH}px  tallest photo ${r.tallest}px  ${bad?'❌':'✅'}`
      + (r.pageOverflow?'  H-OVERFLOW':''));
  }

  // reduced motion
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.waitForTimeout(250);
  const rm = await p.evaluate(() => {
    const t = document.querySelector('.img-break-track');
    const band = document.querySelector('.img-break');
    return { anim: getComputedStyle(t).animationName, overflowX: getComputedStyle(band).overflowX };
  });
  const rmOk = rm.anim === 'none' && rm.overflowX === 'auto';
  if (!rmOk) fails.push(`${lang}: reduced-motion fallback wrong`);
  console.log(` reduced-motion: animation=${rm.anim}, overflow-x=${rm.overflowX} ${rmOk?'✅':'❌'}`);
  await p.emulateMedia({ reducedMotion: null });

  // hover pause
  await p.locator('.img-break').hover();
  await p.waitForTimeout(200);
  const paused = await p.evaluate(() => getComputedStyle(document.querySelector('.img-break-track')).animationPlayState);
  console.log(` hover pause: ${paused} ${paused==='paused'?'✅':'❌'}`);
  if (paused !== 'paused') fails.push(`${lang}: hover does not pause`);

  // contrast, measured from the live computed style
  const contrast = await p.evaluate(() => {
    const el = document.querySelector('.img-break-venue');
    const cs = getComputedStyle(el);
    const parse = s => s.match(/\d+(\.\d+)?/g).map(Number);
    const fg = parse(cs.color).slice(0,3), a = parseFloat(cs.opacity);
    const bg = parse(getComputedStyle(document.querySelector('.img-break-meta')).backgroundColor).slice(0,3);
    const eff = fg.map((c,i)=>a*c+(1-a)*bg[i]);
    const lin = c => { c/=255; return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4); };
    const L = ([r,g,bb]) => 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(bb);
    const l1=L(eff), l2=L(bg); const [hi,lo]=l1>l2?[l1,l2]:[l2,l1];
    return +((hi+0.05)/(lo+0.05)).toFixed(2);
  });
  console.log(` venue credit contrast: ${contrast}:1 ${contrast>=4.5?'✅ passes AA':'❌ FAILS AA'}`);
  if (contrast < 4.5) fails.push(`${lang}: venue contrast ${contrast}:1`);

  console.log(` console errors: ${errs.length ? errs : 'none'}`);
  if (errs.length) fails.push(`${lang}: console errors`);

  await p.setViewportSize({ width: 1024, height: 900 });
  await p.addStyleTag({ content: '.img-break-track{animation-play-state:paused !important; transform:translateX(-9%) !important;}' });
  await p.waitForTimeout(250);
  await p.locator('.img-break-meta').screenshot({ path: `${out}/rev-${lang}-caption-1024.png` });
  await p.close();
}
await b.close();
console.log(fails.length ? `\n❌ ${fails.length} issue(s):\n  ` + fails.join('\n  ') : '\n✅ all checks pass on both pages');
