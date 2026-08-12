// Unknown-template guard (S171).
//
// Both engines carry their own inline `setActiveTemplate`. Both used to fall back to
// Scribble for ANY name they did not recognise — so a Laguna order opened against a
// build predating Laguna rendered as Scribble, silently, and was sent to a customer.
//
// The distinction that matters:
//   - templateName MISSING  → pre-seam order → Scribble is correct.
//   - templateName UNKNOWN  → this build does not carry it → must throw, never draw.
//
// This test extracts the real shipped function out of each HTML file and runs it, so
// it fails if either engine's fallback goes quiet again.

const fs = require('fs');
const path = require('path');

const ENGINES = {
  'staff engine':     path.join(__dirname, '..', 'pages', 'staff', 'template-engine.html'),
  'customer preview': path.join(__dirname, '..', 'pages', 'customer-preview.html'),
};

/** Pull `function setActiveTemplate(...) { ... }` out of a file by brace-matching. */
function extractSetActiveTemplate(file) {
  const src = fs.readFileSync(file, 'utf8');
  const start = src.indexOf('function setActiveTemplate(');
  if (start === -1) throw new Error(`setActiveTemplate not found in ${file}`);
  const open = src.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(start, i + 1);
  }
  throw new Error(`Unbalanced braces after setActiveTemplate in ${file}`);
}

/** Run the extracted function against a stub registry. Returns the resolved key. */
function makeResolver(file) {
  const body = extractSetActiveTemplate(file);
  const factory = new Function(`
    let _activeTemplateData = null, _activeTemplateKey = null, SVG_BASE = null;
    const TEMPLATES = {
      scribble: { data: () => ({ template: 'scribble' }), svgBase: 'scribble/' },
      laguna:   { data: () => ({ template: 'laguna'   }), svgBase: 'laguna/'   },
    };
    ${body}
    return (name) => { setActiveTemplate(name); return _activeTemplateData.template; };
  `);
  return factory();
}

describe.each(Object.entries(ENGINES))('%s — setActiveTemplate', (_label, file) => {
  const resolve = makeResolver(file);

  test('a known template resolves to itself', () => {
    expect(resolve('Laguna')).toBe('laguna');
  });

  test('a missing templateName still defaults to Scribble (pre-seam orders)', () => {
    expect(resolve(undefined)).toBe('scribble');
    expect(resolve('')).toBe('scribble');
    expect(resolve(null)).toBe('scribble');
  });

  test('an UNKNOWN template throws instead of silently rendering Scribble', () => {
    expect(() => resolve('Tender')).toThrow();
    expect(() => resolve('not-a-template')).toThrow();
  });
});
