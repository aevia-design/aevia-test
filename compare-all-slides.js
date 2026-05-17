const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Desktop
  console.log('\n=== DESKTOP - ALL SLIDES ===');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:8080/pages/home.html');
  
  for (let i = 0; i < 3; i++) {
    await page.click(`.hero-dot:nth-child(${i + 1})`);
    await page.waitForTimeout(1300);
    const isActive = await page.evaluate((idx) => {
      return document.querySelectorAll('.hero-headline')[idx].classList.contains('active');
    }, i);
    console.log(`Slide ${i + 1}: active=${isActive}`);
    await page.screenshot({ path: `carousel-desktop-slide${i + 1}.png` });
  }
  
  // Mobile
  console.log('\n=== MOBILE (390px) - ALL SLIDES ===');
  await page.setViewportSize({ width: 390, height: 844 });
  
  for (let i = 0; i < 3; i++) {
    await page.click(`.hero-dot:nth-child(${i + 1})`);
    await page.waitForTimeout(1300);
    const isActive = await page.evaluate((idx) => {
      return document.querySelectorAll('.hero-headline')[idx].classList.contains('active');
    }, i);
    console.log(`Slide ${i + 1}: active=${isActive}`);
    await page.screenshot({ path: `carousel-mobile-slide${i + 1}.png` });
  }
  
  await browser.close();
  console.log('\nAll screenshots captured.');
})();
