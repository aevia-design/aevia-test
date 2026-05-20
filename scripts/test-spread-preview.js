const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch();

  // Test Desktop (1440px)
  console.log('\n========== STEP 1: CHECK CURRENT DOM STATE ==========');
  const pageDesktop = await browser.newPage();
  await pageDesktop.setViewportSize({ width: 1440, height: 900 });
  await pageDesktop.goto('http://localhost:8080/pages/spread-preview.html');

  // Check for old elements
  const hasReorderRow = await pageDesktop.evaluate(() => {
    return document.querySelector('.reorder-row') !== null;
  });
  console.log('✓ Has .reorder-row:', hasReorderRow, '(should be false)');

  const hasThumbItem = await pageDesktop.evaluate(() => {
    return document.querySelector('.thumb-item') !== null;
  });
  console.log('✓ Has .thumb-item:', hasThumbItem, '(should be false)');

  // Check for new elements
  const hasSpreadControls = await pageDesktop.evaluate(() => {
    return document.querySelector('.spread-controls') !== null;
  });
  console.log('✓ Has .spread-controls:', hasSpreadControls, '(should be true)');

  const spreadControlsText = await pageDesktop.evaluate(() => {
    const el = document.querySelector('.spread-controls');
    return el ? el.textContent.trim() : null;
  });
  console.log('✓ spread-controls content:', spreadControlsText);

  // Check for renderThumbs function
  const typeRenderThumbs = await pageDesktop.evaluate(() => {
    return typeof renderThumbs;
  });
  console.log('✓ typeof renderThumbs:', typeRenderThumbs, '(should be "undefined")');

  // Take screenshot of initial state
  await pageDesktop.screenshot({ path: 'screenshots/spread-desktop-1-initial.png', fullPage: true });
  console.log('\n✓ Screenshot: spread-desktop-1-initial.png');

  console.log('\n========== STEP 2: UPLOAD 3 TEST PHOTOS ==========');

  // Use setInputFiles to upload files
  const testPhotos = [
    'c:\\Users\\evgmy\\aevia-test\\assets\\test photos\\IMG_1958_horisontal.HEIC',
    'c:\\Users\\evgmy\\aevia-test\\assets\\test photos\\PJRH6658_horisontal.JPEG',
    'c:\\Users\\evgmy\\aevia-test\\assets\\test photos\\IMG_5391.HEIC'
  ];

  // Upload files via setInputFiles
  await pageDesktop.setInputFiles('#photo-input', testPhotos);
  console.log('✓ Files selected:', testPhotos.length);

  // Wait for processing - up to 30 seconds for HEIC conversion
  console.log('⏳ Waiting for HEIC conversion (up to 30 seconds)...');

  let retries = 0;
  let spreadsLoaded = false;

  while (retries < 60 && !spreadsLoaded) {
    await pageDesktop.waitForTimeout(500);
    spreadsLoaded = await pageDesktop.evaluate(() => {
      const photoSlots = document.querySelectorAll('.photo-slot.has-photo');
      return photoSlots.length === 3;
    });
    retries++;
  }

  if (spreadsLoaded) {
    console.log('✓ Spread rendered with 3 photos');
  } else {
    console.log('⚠ Timeout: spread may not have fully loaded');
  }

  console.log('\n========== STEP 3: CHECK RENDERED SPREAD ==========');

  // Get debug output if visible
  const debugPanel = await pageDesktop.evaluate(() => {
    const el = document.getElementById('debug-panel');
    return el ? el.textContent.substring(0, 500) : null;
  });
  if (debugPanel) {
    console.log('✓ Debug panel exists (first 500 chars):');
    console.log(debugPanel);
  }

  // Check photo orientations
  const orientations = await pageDesktop.evaluate(() => {
    return typeof photos !== 'undefined' ? photos.map(p => p.orientation) : null;
  });
  console.log('✓ Photo orientations:', orientations);

  // Check photo slots
  const photoSlotCount = await pageDesktop.evaluate(() => {
    return document.querySelectorAll('.photo-slot').length;
  });
  console.log('✓ Total .photo-slot elements:', photoSlotCount);

  const photoSlotWithPhotoCount = await pageDesktop.evaluate(() => {
    return document.querySelectorAll('.photo-slot.has-photo').length;
  });
  console.log('✓ .photo-slot.has-photo elements:', photoSlotWithPhotoCount);

  // Check if slots are draggable
  const areDraggable = await pageDesktop.evaluate(() => {
    const slot = document.querySelector('.photo-slot.has-photo');
    return slot ? slot.draggable : false;
  });
  console.log('✓ Photo slots are draggable:', areDraggable);

  // Take screenshot of rendered spread
  await pageDesktop.screenshot({ path: 'screenshots/spread-desktop-2-rendered.png', fullPage: true });
  console.log('\n✓ Screenshot: spread-desktop-2-rendered.png');

  console.log('\n========== STEP 4: TEST DRAG-DROP ==========');

  // Get the bounding boxes of the first two photo slots
  const slots = await pageDesktop.evaluate(() => {
    const slotEls = document.querySelectorAll('.photo-slot.has-photo');
    return Array.from(slotEls).slice(0, 2).map(el => {
      const rect = el.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        dataIndex: el.dataset.photoIndex
      };
    });
  });

  if (slots.length >= 2) {
    console.log('✓ Found 2 draggable slots');
    console.log('  Slot 0 index:', slots[0].dataIndex, 'at', slots[0].x, slots[0].y);
    console.log('  Slot 1 index:', slots[1].dataIndex, 'at', slots[1].x, slots[1].y);

    // Perform drag from slot 0 to slot 1
    console.log('⏳ Dragging photo from slot 0 to slot 1...');

    // Get initial order
    const initialOrder = await pageDesktop.evaluate(() => {
      return typeof photos !== 'undefined' ? photos.map((p, i) => i) : null;
    });
    console.log('  Initial order:', initialOrder);

    // Perform drag
    await pageDesktop.dragAndDrop(
      '.photo-slot.has-photo:nth-of-type(1)',
      '.photo-slot.has-photo:nth-of-type(2)'
    );

    // Wait a bit for re-render
    await pageDesktop.waitForTimeout(500);

    // Check if order changed
    const finalOrder = await pageDesktop.evaluate(() => {
      return typeof photos !== 'undefined' ? photos.map((p, i) => i) : null;
    });
    console.log('  Final order:', finalOrder);

    const orderChanged = JSON.stringify(initialOrder) !== JSON.stringify(finalOrder);
    console.log('✓ Order changed after drag:', orderChanged);
  } else {
    console.log('⚠ Could not find enough slots to test drag');
  }

  // Take screenshot after drag
  await pageDesktop.screenshot({ path: 'screenshots/spread-desktop-3-after-drag.png', fullPage: true });
  console.log('\n✓ Screenshot: spread-desktop-3-after-drag.png');

  console.log('\n========== STEP 5: CHECK VARIANT BADGE ==========');

  const variantBadgeText = await pageDesktop.evaluate(() => {
    const el = document.getElementById('variant-badge');
    return el && el.classList.contains('visible') ? el.textContent.trim() : null;
  });
  console.log('✓ Variant badge:', variantBadgeText);

  console.log('\n========== STEP 6: CHECK DEBUG PANEL ==========');

  // Check full debug log
  const fullDebugText = await pageDesktop.evaluate(() => {
    const el = document.getElementById('debug-panel');
    return el ? el.textContent : null;
  });

  if (fullDebugText) {
    console.log('✓ Debug panel output:');
    const lines = fullDebugText.split('\n').slice(-15); // last 15 lines
    lines.forEach(line => {
      if (line.trim()) console.log('  ' + line);
    });
  }

  console.log('\n========== STEP 7: CHECK FOR CONSOLE ERRORS ==========');

  const consoleLogs = [];
  const consoleErrors = [];
  const consoleWarnings = [];

  pageDesktop.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
    if (msg.type() === 'warning') consoleWarnings.push(msg.text());
    consoleLogs.push({type: msg.type(), text: msg.text()});
  });

  // Refresh page to capture any startup errors
  await pageDesktop.reload();
  await pageDesktop.waitForTimeout(3000);

  console.log('✓ Console errors:', consoleErrors.length === 0 ? 'None' : consoleErrors);
  console.log('✓ Console warnings:', consoleWarnings.length === 0 ? 'None' : consoleWarnings);

  console.log('\n========== STEP 8: TEST RESPONSIVE VIEWS ==========');

  // Test tablet (768px)
  console.log('\n--- TABLET (768px) ---');
  const pageTablet = await browser.newPage();
  await pageTablet.setViewportSize({ width: 768, height: 1024 });
  await pageTablet.goto('http://localhost:8080/pages/spread-preview.html');

  const tabletSpreadControls = await pageTablet.evaluate(() => {
    return document.querySelector('.spread-controls') !== null;
  });
  console.log('✓ Spread controls visible:', tabletSpreadControls);

  await pageTablet.screenshot({ path: 'screenshots/spread-tablet-initial.png', fullPage: true });
  console.log('✓ Screenshot: spread-tablet-initial.png');

  // Test mobile (375px)
  console.log('\n--- MOBILE (375px) ---');
  const pageMobile = await browser.newPage();
  await pageMobile.setViewportSize({ width: 375, height: 667 });
  await pageMobile.goto('http://localhost:8080/pages/spread-preview.html');

  const mobileSpreadControls = await pageMobile.evaluate(() => {
    return document.querySelector('.spread-controls') !== null;
  });
  console.log('✓ Spread controls visible:', mobileSpreadControls);

  // Check for horizontal scroll
  const mobileWidth = await pageMobile.evaluate(() => {
    return {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    };
  });
  console.log('✓ Scrollable:', mobileWidth.scrollWidth > mobileWidth.clientWidth);

  await pageMobile.screenshot({ path: 'screenshots/spread-mobile-initial.png', fullPage: true });
  console.log('✓ Screenshot: spread-mobile-initial.png');

  console.log('\n========== TEST COMPLETE ==========');
  console.log('\nScreenshots saved to: ./screenshots/');
  console.log('  - spread-desktop-1-initial.png');
  console.log('  - spread-desktop-2-rendered.png');
  console.log('  - spread-desktop-3-after-drag.png');
  console.log('  - spread-tablet-initial.png');
  console.log('  - spread-mobile-initial.png');

  await pageDesktop.close();
  await pageTablet.close();
  await pageMobile.close();
  await browser.close();
})().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
