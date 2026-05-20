const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:8080/pages/spread-preview.html');

  const testPhotos = [
    'C:/Users/evgmy/aevia-test/assets/test photos/IMG_1958_horisontal.HEIC',
    'C:/Users/evgmy/aevia-test/assets/test photos/PJRH6658_horisontal.JPEG',
    'C:/Users/evgmy/aevia-test/assets/test photos/IMG_5391.HEIC'
  ];

  await page.setInputFiles('#photo-input', testPhotos);
  
  let retries = 0;
  while (retries < 60) {
    await page.waitForTimeout(500);
    const spreadsLoaded = await page.evaluate(() => {
      return document.querySelectorAll('.photo-slot.has-photo').length === 3;
    });
    if (spreadsLoaded) break;
    retries++;
  }

  console.log('=== DESIGN COMPLIANCE CHECK ===\n');

  // Check typography
  const h1Style = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const style = window.getComputedStyle(h1);
    return {
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      margin: style.margin
    };
  });

  console.log('✓ H1 Typography:');
  console.log(`  Font: ${h1Style.fontFamily}`);
  console.log(`  Size: ${h1Style.fontSize}`);
  console.log(`  Weight: ${h1Style.fontWeight}`);

  // Check colour palette
  const colours = await page.evaluate(() => {
    const root = document.documentElement;
    const styles = window.getComputedStyle(root);
    return {
      bg: styles.getPropertyValue('--bg').trim(),
      text: styles.getPropertyValue('--text').trim(),
      border: styles.getPropertyValue('--border').trim(),
      muted: styles.getPropertyValue('--muted').trim(),
      accentDk: styles.getPropertyValue('--accent-dk').trim()
    };
  });

  console.log('\n✓ CSS Colour Variables:');
  Object.entries(colours).forEach(([key, val]) => {
    console.log(`  --${key}: ${val || 'NOT SET'}`);
  });

  // Check contrast
  const navLinks = await page.evaluate(() => {
    const links = document.querySelectorAll('.nav-links a');
    const first = links[0];
    const style = window.getComputedStyle(first);
    return {
      color: style.color,
      computedColor: style.color
    };
  });

  console.log('\n✓ Nav links colour:', navLinks.color);

  // Check spacing
  const mainPadding = await page.evaluate(() => {
    const main = document.querySelector('main');
    const style = window.getComputedStyle(main);
    return style.padding;
  });

  console.log('\n✓ Main padding:', mainPadding);

  // Check buttons
  const buttons = await page.evaluate(() => {
    const cta = document.querySelector('.nav-cta');
    const reseq = document.querySelector('.resequence-btn');
    if (!reseq) return { nav: null, reseq: null };
    
    const ctaStyle = window.getComputedStyle(cta);
    const reseqStyle = window.getComputedStyle(reseq);
    
    return {
      nav: {
        borderRadius: ctaStyle.borderRadius,
        border: ctaStyle.border,
        padding: ctaStyle.padding
      },
      reseq: {
        borderRadius: reseqStyle.borderRadius,
        border: reseqStyle.border,
        padding: reseqStyle.padding
      }
    };
  });

  console.log('\n✓ Button Styles:');
  console.log('  Nav CTA:', buttons.nav);
  console.log('  Resequence:', buttons.reseq);

  // Check for broken images
  const images = await page.evaluate(() => {
    const imgs = document.querySelectorAll('img');
    return Array.from(imgs).map(img => ({
      src: img.src.substring(0, 50),
      alt: img.alt,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight
    }));
  });

  console.log('\n✓ Images on page:', images.length);
  images.slice(0, 3).forEach(img => {
    console.log(`  alt="${img.alt}" size=${img.naturalWidth}x${img.naturalHeight}`);
  });

  // Check footer
  const footer = await page.evaluate(() => {
    const footerEl = document.querySelector('.footer');
    const style = window.getComputedStyle(footerEl);
    return {
      hasFooter: !!footerEl,
      background: style.backgroundColor,
      border: style.borderTop
    };
  });

  console.log('\n✓ Footer:');
  console.log(`  Present: ${footer.hasFooter}`);
  console.log(`  Background: ${footer.background}`);

  console.log('\n=== CHECK COMPLETE ===');

  await browser.close();
})();
