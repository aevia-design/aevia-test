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

  console.log('=== DRAG EVENT INSPECTION ===\n');

  // Inject drag event logging
  await page.evaluate(() => {
    let dragEvents = [];
    window.dragEvents = dragEvents;

    // Hook into the existing drag handlers
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (['dragstart', 'dragover', 'drop', 'dragenter', 'dragleave'].includes(type)) {
        const wrappedListener = function(e) {
          dragEvents.push({
            type: type,
            target: e.target.className || e.target.tagName,
            timestamp: Date.now()
          });
          return listener.call(this, e);
        };
        return originalAddEventListener.call(this, type, wrappedListener, options);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });

  // Perform drag
  const slots = await page.evaluate(() => {
    const slotEls = document.querySelectorAll('.photo-slot.has-photo');
    return Array.from(slotEls).slice(0, 2).map(el => {
      const rect = el.getBoundingClientRect();
      return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) };
    });
  });

  console.log('Starting drag...');
  await page.mouse.move(slots[0].x, slots[0].y);
  await page.mouse.down();
  await page.waitForTimeout(150);
  await page.mouse.move(slots[1].x, slots[1].y, { steps: 10 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await page.waitForTimeout(300);

  const events = await page.evaluate(() => {
    return window.dragEvents || [];
  });

  console.log('Drag events captured:', events.length);
  events.forEach((e, i) => {
    console.log(`  ${i}: ${e.type} on ${e.target}`);
  });

  if (events.length === 0) {
    console.log('\n⚠ No drag events captured! This suggests mouse drag might not trigger native drag events.');
    console.log('Testing with draggable HTML5 API...');

    // Try using Playwright's dragAndDrop
    await page.evaluate(() => {
      const slots = document.querySelectorAll('.photo-slot.has-photo');
      console.log('Slot 0 draggable:', slots[0].draggable);
      console.log('Slot 0 drag listeners:', 'checking...');
    });
  }

  await browser.close();
})();
