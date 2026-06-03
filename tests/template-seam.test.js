// Template seam verification — test that template selection works correctly.
// (Browser-side HTML template selection must be verified manually.)

// For the PDF export script, we can verify the data object structure
// and that both templates are properly loaded.

describe('Template data structure', () => {
  test('SCRIBBLE_DATA and WANDER_DATA can both be loaded', () => {
    // Set up global.window if needed
    if (!global.window) global.window = {};

    // Load both templates (Node requires are cached, so this is safe to call multiple times)
    require('../assets/Template_Scribble/scribble-data.js');
    require('../assets/Template_Wander/wander-data.js');

    expect(global.window.SCRIBBLE_DATA).toBeDefined();
    expect(global.window.WANDER_DATA).toBeDefined();
    expect(global.window.SCRIBBLE_DATA.template).toBe('scribble');
    expect(global.window.WANDER_DATA.template).toBe('wander');
  });

  test('Both templates have required top-level fields', () => {
    const requiredFields = ['template', 'pageSize', 'bleed', 'cover', 'spreads', 'scale', 'fonts', 'colors'];

    requiredFields.forEach(field => {
      expect(global.window.SCRIBBLE_DATA[field]).toBeDefined();
      expect(global.window.WANDER_DATA[field]).toBeDefined();
    });
  });

  test('Wander asset references do not use Spreads/ subfolder', () => {
    // Wander SVGs are directly in Template_Wander/, not in a subfolder
    // For example, Wander cover.svg should be 'Cover/Cover.svg', not 'Spreads/...'
    const coverSvg = global.window.WANDER_DATA.cover.svg;
    expect(coverSvg).toBeDefined();
    // Verify that it doesn't start with 'Spreads/'
    expect(coverSvg.startsWith('Spreads/')).toBe(false);
  });

  test('Scribble asset references use Spreads/ subfolder', () => {
    // Scribble SVGs are in Template_Scribble/Spreads/
    // All spread overlays should be in the Spreads/ folder
    const spreads = global.window.SCRIBBLE_DATA.spreads;
    Object.values(spreads).forEach(spread => {
      Object.values(spread.variants || []).forEach(variant => {
        if (variant.svg) {
          expect(variant.svg.startsWith('Spreads/')).toBe(true);
        }
      });
    });
  });
});
