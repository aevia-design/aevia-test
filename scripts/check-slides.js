const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:8080/pages/home.html');
  
  // Check all three slides
  const slideInfo = await page.evaluate(() => {
    const headlines = document.querySelectorAll('.hero-headline');
    const results = [];
    
    for (let i = 0; i < headlines.length; i++) {
      const h = headlines[i];
      const computed = window.getComputedStyle(h);
      const inline = h.getAttribute('style');
      results.push({
        slide: i + 1,
        text: h.innerText.trim(),
        inlineStyle: inline,
        computedTextAlign: computed.textAlign
      });
    }
    return results;
  });
  
  console.log('\n=== All Slides ===');
  slideInfo.forEach(s => {
    console.log(`\nSlide ${s.slide}:`);
    console.log(`  Text: "${s.text}"`);
    console.log(`  Inline style: ${s.inlineStyle || 'none'}`);
    console.log(`  Computed text-align: ${s.computedTextAlign}`);
  });
  
  await browser.close();
})();
