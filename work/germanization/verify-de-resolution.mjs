import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1500,height:950}, deviceScaleFactor:1.5 });
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://localhost:8080/pages/staff/template-engine.html');
await p.waitForTimeout(2500);
// Drive the engine locally: pick Scribble, force language, render FP spreads.
const shots = [];
for (const lang of ['en','de']) {
  const out = await p.evaluate((lang) => {
    setActiveTemplate('Scribble');
    setBookLanguage(lang);
    const d = getActiveTemplateData();
    const picked = {};
    for (const [id, sp] of Object.entries(d.spreads)) {
      if (!/^FP/.test(id)) continue;
      for (const side of ['left','right']) {
        const pg = (sp.pages||{})[side]; if (!pg) continue;
        for (const [vk, v] of Object.entries(pg)) {
          if (v && v.svg) picked[id+' '+side+' '+vk] = resolvePageSvg(v);
        }
      }
    }
    return picked;
  }, lang);
  shots.push([lang, out]);
}
const [[,en],[,de]] = shots;
let swapped=0, same=0;
for (const k of Object.keys(en)) {
  if (en[k] !== de[k]) { swapped++; console.log('SWAP  ' + k + '\n      EN: ' + en[k] + '\n      DE: ' + de[k]); }
  else same++;
}
console.log('\nswapped: ' + swapped + ', unchanged (no DE artwork): ' + same);
console.log('console errors:', errs.length ? errs : 'none');
await b.close();
