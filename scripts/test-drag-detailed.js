const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('http://localhost:8080/pages/spread-preview.html');

  // Use forward slash paths that work in Node
  const testPhotos = [
    'C:/Users/evgmy/aevia-test/assets/test photos/IMG_1958_horisontal.HEIC',
    'C:/Users/evgmy/aevia-test/assets/test photos/PJRH6658_horisontal.JPEG',
    'C:/Users/evgmy/aevia-test/assets/test photos/IMG_5391.HEIC'
  ];

  await page.setInputFiles('#photo-input', testPhotos);
  
  // Wait for render
  let retries = 0;
  while (retries < 60) {
    await page.waitForTimeout(500);
    const spreadsLoaded = await page.evaluate(() => {
      const photoSlots = document.querySelectorAll('.photo-slot.has-photo');
      return photoSlots.length === 3;
    });
    if (spreadsLoaded) break;
    retries++;
  }

  console.log('=== DRAG TEST DETAILED ===\n');

  // Get initial state
  const initialPhotos = await page.evaluate(() => {
    const slots = document.querySelectorAll('.photo-slot.has-photo');
    return Array.from(slots).map((slot, idx) => {
      const img = slot.querySelector('img');
      return {
        index: idx,
        dataIndex: slot.dataset.photoIndex,
        altText: img ? img.alt : 'NO-ALT'
      };
    });
  });

  console.log('Before drag - slot assignments:');
  initialPhotos.forEach(p => {
    console.log(`  Slot ${p.index}: dataIndex=${p.dataIndex}, photo="${p.altText}"`);
  });

  const photosData = await page.evaluate(() => {
    return typeof photos !== 'undefined' ? 
      photos.map((p, i) => ({index: i, name: p.name})) : 
      null;
  });
  console.log('\nBefore drag - photo array:');
  if (photosData) photosData.forEach(p => console.log(`  [${p.index}]: ${p.name}`));

  console.log('\n--- Dragging slot 0 to slot 1 ---');

  const slots = await page.evaluate(() => {
    const slotEls = document.querySelectorAll('.photo-slot.has-photo');
    return Array.from(slotEls).slice(0, 2).map(el => {
      const rect = el.getBoundingClientRect();
      return {
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2)
      };
    });
  });

  await page.mouse.move(slots[0].x, slots[0].y);
  await page.mouse.down();
  await page.waitForTimeout(100);
  await page.mouse.move(slots[1].x, slots[1].y, { steps: 10 });
  await page.waitForTimeout(100);
  await page.mouse.up();
  await page.waitForTimeout(500);

  const finalPhotosData = await page.evaluate(() => {
    return typeof photos !== 'undefined' ? 
      photos.map((p, i) => ({index: i, name: p.name})) : 
      null;
  });

  const finalSlots = await page.evaluate(() => {
    const slots = document.querySelectorAll('.photo-slot.has-photo');
    return Array.from(slots).map((slot, idx) => {
      const img = slot.querySelector('img');
      return {
        index: idx,
        dataIndex: slot.dataset.photoIndex,
        altText: img ? img.alt : 'NO-ALT'
      };
    });
  });

  console.log('\nAfter drag - slot assignments:');
  finalSlots.forEach(p => {
    console.log(`  Slot ${p.index}: dataIndex=${p.dataIndex}, photo="${p.altText}"`);
  });

  console.log('\nAfter drag - photo array:');
  if (finalPhotosData) finalPhotosData.forEach(p => console.log(`  [${p.index}]: ${p.name}`));

  const orderChanged = JSON.stringify(photosData) !== JSON.stringify(finalPhotosData);
  console.log('\n✓ Array order changed:', orderChanged);

  const slotOrderChanged = JSON.stringify(initialPhotos) !== JSON.stringify(finalSlots);
  console.log('✓ Slot assignments changed:', slotOrderChanged);

  await browser.close();
})();
