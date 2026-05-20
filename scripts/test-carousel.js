const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  
  // Test Desktop (1440px)
  console.log('\n=== DESKTOP TEST (1440px) ===');
  const pageDesktop = await browser.newPage();
  await pageDesktop.setViewportSize({ width: 1440, height: 900 });
  await pageDesktop.goto('http://localhost:8080/pages/home.html');
  
  // Navigate to slide 3 (index 2) by clicking the third dot
  await pageDesktop.click('.hero-dot:nth-child(3)');
  await pageDesktop.waitForTimeout(1300); // wait for transition
  
  // Check if the third headline is active
  const headline3Active = await pageDesktop.evaluate(() => {
    const headlines = document.querySelectorAll('.hero-headline');
    return headlines[2].classList.contains('active');
  });
  console.log('Slide 3 active:', headline3Active);
  
  // Take screenshot
  await pageDesktop.screenshot({ path: 'carousel-desktop-slide3.png', fullPage: false });
  console.log('Desktop screenshot saved: carousel-desktop-slide3.png');
  
  // Get text alignment
  const textAlignDesktop = await pageDesktop.evaluate(() => {
    const headline = document.querySelectorAll('.hero-headline')[2];
    return window.getComputedStyle(headline).textAlign;
  });
  console.log('Text alignment (desktop):', textAlignDesktop);
  
  await pageDesktop.close();
  
  // Test Mobile (390px)
  console.log('\n=== MOBILE TEST (390px) ===');
  const pageMobile = await browser.newPage();
  await pageMobile.setViewportSize({ width: 390, height: 844 });
  await pageMobile.goto('http://localhost:8080/pages/home.html');
  
  // Navigate to slide 3
  await pageMobile.click('.hero-dot:nth-child(3)');
  await pageMobile.waitForTimeout(1300);
  
  // Check if third headline is active
  const headline3MobileActive = await pageMobile.evaluate(() => {
    const headlines = document.querySelectorAll('.hero-headline');
    return headlines[2].classList.contains('active');
  });
  console.log('Slide 3 active:', headline3MobileActive);
  
  // Take screenshot
  await pageMobile.screenshot({ path: 'carousel-mobile-slide3.png', fullPage: false });
  console.log('Mobile screenshot saved: carousel-mobile-slide3.png');
  
  // Get text alignment
  const textAlignMobile = await pageMobile.evaluate(() => {
    const headline = document.querySelectorAll('.hero-headline')[2];
    return window.getComputedStyle(headline).textAlign;
  });
  console.log('Text alignment (mobile):', textAlignMobile);
  
  // Check console for errors
  const logs = [];
  pageMobile.on('console', msg => logs.push(msg.text()));
  console.log('\nBrowser console:', logs.length === 0 ? 'No errors' : logs);
  
  await pageMobile.close();
  await browser.close();
  
  console.log('\nTest complete.');
})();
