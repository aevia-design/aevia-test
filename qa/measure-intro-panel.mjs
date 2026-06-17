import { chromium } from 'playwright';
const TOKEN='c30c8cf0-8e0d-4f14-85ab-d48201d3cac6';
const b=await chromium.launch();
const p=await b.newPage();
const errs=[];
p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
await p.goto(`http://localhost:8080/pages/customer-preview.html?token=${TOKEN}`,{waitUntil:'networkidle'});
await p.waitForTimeout(6000);
const data=await p.evaluate(()=>{
  const panel=document.querySelector('.fp-text-panel');
  if(!panel) return {error:'no panel found'};
  const cs=getComputedStyle(panel);
  const r=panel.getBoundingClientRect();
  // find the page-canvas ancestor to get its rendered scale
  const canvas=panel.closest('.page-canvas');
  const ccs=canvas?getComputedStyle(canvas):null;
  const cr=canvas?canvas.getBoundingClientRect():null;
  return {
    fontSize:cs.fontSize, fontStyle:cs.fontStyle, fontWeight:cs.fontWeight,
    fontFamily:cs.fontFamily, lineHeight:cs.lineHeight,
    panelWidthPx:r.width.toFixed(1), panelOffsetWidth:panel.offsetWidth,
    canvasOffsetWidth:canvas?.offsetWidth, canvasRenderedWidth:cr?cr.width.toFixed(1):null,
    canvasTransform:ccs?ccs.transform:null,
    SCALE:window.SCALE,
  };
});
console.log('errors:',errs.slice(0,5));
console.log(JSON.stringify(data,null,2));
await b.close();
