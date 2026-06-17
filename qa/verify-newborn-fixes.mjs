import { chromium } from 'playwright';
import { readdirSync } from 'fs'; import path from 'path';
const dir = path.resolve('sessions/qa-runs/wander-debug');
const files = readdirSync(dir).filter(f=>f.endsWith('.jpg')).map(f=>path.join(dir,f)).slice(0,4);
const b = await chromium.launch(); const p = await b.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8080/pages/staff/template-engine.html',{waitUntil:'load'});
await p.waitForTimeout(700);
// Newborn cover: caption color + draggable=false + font scoping
await p.selectOption('#template-select','Newborn'); await p.waitForTimeout(300);
await p.setInputFiles('#photo-file-input', files); await p.waitForTimeout(2500);
const nb = await p.evaluate(() => {
  window.specialPhotos.cover = window.photoPool[0] ? [window.photoPool[0]] : [];
  rerenderCover();
  const cap = document.querySelector('.cover-caption');
  const slotImg = document.querySelector('.spread-row:not([data-spread-id=cover]) .slot-photo');
  // open cover caption toolbar to read font options
  let coverFonts=[];
  if (cap) { cap.dispatchEvent(new Event('focus')); coverFonts = Array.from(document.getElementById('tb-font').options).map(o=>o.value); }
  return {
    coverCapColor: cap ? cap.style.color : null,
    slotImgDraggable: slotImg ? slotImg.draggable : 'no-slot-img',
    coverFonts,
  };
});
// Scribble font scoping
await p.selectOption('#template-select','Scribble'); await p.waitForTimeout(300);
await p.setInputFiles('#photo-file-input', files); await p.waitForTimeout(2500);
const sc = await p.evaluate(() => {
  const cap = document.querySelector('.cover-caption');
  let fonts=[]; if (cap){ cap.dispatchEvent(new Event('focus')); fonts=Array.from(document.getElementById('tb-font').options).map(o=>o.value); }
  return { coverCapColor: cap?cap.style.color:null, scribbleFonts: fonts };
});
console.log(JSON.stringify({ nb, sc, pageErrors: errs }, null, 2));
await b.close();
