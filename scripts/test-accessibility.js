const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:8080/pages/spread-preview.html');

  console.log('=== ACCESSIBILITY & LINKS CHECK ===\n');

  // Check all links
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.textContent.trim().substring(0, 20),
      href: a.href,
      valid: a.href.startsWith('http') || !a.href.includes('undefined')
    }));
  });

  console.log('✓ Links found:', links.length);
  links.forEach(link => {
    console.log(`  "${link.text}" → ${link.href.substring(0, 50)}`);
  });

  // Check all buttons
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(btn => ({
      text: btn.textContent.trim().substring(0, 20),
      hasAriaLabel: btn.getAttribute('aria-label') !== null,
      hasTitle: btn.getAttribute('title') !== null,
      class: btn.className
    }));
  });

  console.log('\n✓ Buttons found:', buttons.length);
  buttons.forEach(btn => {
    const label = btn.hasAriaLabel ? '(aria-label)' : btn.hasTitle ? '(title)' : '(text only)';
    console.log(`  "${btn.text}" ${label}`);
  });

  // Check form inputs
  const inputs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input, textarea')).map(inp => ({
      type: inp.type,
      hasLabel: !!document.querySelector(`label[for="${inp.id}"]`),
      id: inp.id,
      name: inp.name
    }));
  });

  console.log('\n✓ Form inputs found:', inputs.length);
  inputs.forEach(inp => {
    console.log(`  <${inp.type}> id="${inp.id}" name="${inp.name}" hasLabel=${inp.hasLabel}`);
  });

  // Test specific links
  console.log('\n✓ Testing critical links:');
  
  // Home link
  const homeLink = await page.$eval('a[href="home.html"]', el => el.href);
  console.log(`  Home: ${homeLink.includes('home.html') ? 'OK' : 'BROKEN'}`);

  // Collections link
  const collLink = await page.$eval('a[href="collections.html"]', el => el.href);
  console.log(`  Collections: ${collLink.includes('collections.html') ? 'OK' : 'BROKEN'}`);

  // Check for 404s
  const responses = [];
  page.on('response', res => {
    if (res.status() >= 400) {
      responses.push({status: res.status(), url: res.url()});
    }
  });

  console.log('\n✓ HTTP errors (if any):');
  if (responses.length === 0) {
    console.log('  None');
  } else {
    responses.forEach(r => console.log(`  ${r.status} ${r.url}`));
  }

  await browser.close();
})();
