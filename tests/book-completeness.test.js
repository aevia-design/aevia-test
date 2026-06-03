const { checkBookComplete } = require('../assets/js/book-completeness');

// ── helpers ───────────────────────────────────────────────────────────────
// A pool of N normal photos (indices 0..N-1).
function pool(n, overrides = {}) {
  return Array.from({ length: n }, (_, i) => ({ name: `photo_${i}.jpg`, ...(overrides[i] || {}) }));
}

// A book where every slot is filled: two spreads, two photos each (indices 0..3).
function fullBook() {
  return {
    bookAssignments: {
      0: { left: [0], right: [1] },
      1: { left: [2], right: [3] },
    },
    photoPool: pool(4),
    requiredCaptions: [],
    bookCaptions: {},
  };
}

// ── complete book ───────────────────────────────────────────────────────────
describe('checkBookComplete — a fully filled book', () => {
  test('all slots filled, no unplaced, no required captions → complete', () => {
    const res = checkBookComplete(fullBook());
    expect(res.complete).toBe(true);
    expect(res.reasons).toEqual([]);
  });
});

// ── empty photo slots ─────────────────────────────────────────────────────────
describe('checkBookComplete — empty photo slots', () => {
  test('a null slot makes the book incomplete', () => {
    const b = fullBook();
    b.bookAssignments[1].right = [null];
    const res = checkBookComplete(b);
    expect(res.complete).toBe(false);
    expect(res.reasons.some(r => /empty photo slot/i.test(r))).toBe(true);
  });

  test('an undefined slot counts as empty', () => {
    const b = fullBook();
    b.bookAssignments[0].left = [undefined];
    const res = checkBookComplete(b);
    expect(res.complete).toBe(false);
    expect(res.reasons.some(r => /empty photo slot/i.test(r))).toBe(true);
  });
});

// ── unplaced photos ───────────────────────────────────────────────────────────
describe('checkBookComplete — unplaced photos', () => {
  test('a pool photo not assigned to any slot is unplaced → incomplete', () => {
    const b = fullBook();
    b.photoPool = pool(5); // index 4 is never placed
    const res = checkBookComplete(b);
    expect(res.complete).toBe(false);
    expect(res.reasons.some(r => /unplaced/i.test(r))).toBe(true);
  });

  test('a duplicate-flagged pool photo does NOT count as unplaced', () => {
    const b = fullBook();
    b.photoPool = pool(5, { 4: { duplicate: true } }); // index 4 unplaced but duplicate
    const res = checkBookComplete(b);
    expect(res.complete).toBe(true);
    expect(res.reasons).toEqual([]);
  });
});

// ── required special-page captions ─────────────────────────────────────────────
describe('checkBookComplete — required captions', () => {
  test('a required caption that is blank → incomplete', () => {
    const b = fullBook();
    b.requiredCaptions = [{ spread: 1, side: 'left' }];
    b.bookCaptions = { 1: { left: { textPanel: '   ' } } }; // whitespace = blank
    const res = checkBookComplete(b);
    expect(res.complete).toBe(false);
    expect(res.reasons.some(r => /caption/i.test(r))).toBe(true);
  });

  test('a required caption that is missing entirely → incomplete', () => {
    const b = fullBook();
    b.requiredCaptions = [{ spread: 1, side: 'left' }];
    b.bookCaptions = {};
    const res = checkBookComplete(b);
    expect(res.complete).toBe(false);
    expect(res.reasons.some(r => /caption/i.test(r))).toBe(true);
  });

  test('a required caption that is filled → complete', () => {
    const b = fullBook();
    b.requiredCaptions = [{ spread: 1, side: 'left' }];
    b.bookCaptions = { 1: { left: { textPanel: 'Happy Birthday!' } } };
    const res = checkBookComplete(b);
    expect(res.complete).toBe(true);
    expect(res.reasons).toEqual([]);
  });

  test('a blank caption that is NOT required is ignored → complete', () => {
    const b = fullBook();
    b.requiredCaptions = []; // this page does not ask for a caption
    b.bookCaptions = { 1: { left: { textPanel: '' } } };
    const res = checkBookComplete(b);
    expect(res.complete).toBe(true);
    expect(res.reasons).toEqual([]);
  });
});

// ── multiple problems ─────────────────────────────────────────────────────────
describe('checkBookComplete — multiple problems', () => {
  test('reports every category of problem at once', () => {
    const b = fullBook();
    b.photoPool = pool(5);            // index 4 unplaced
    b.bookAssignments[0].left = [null]; // an empty slot
    b.requiredCaptions = [{ spread: 0, side: 'right' }];
    b.bookCaptions = {};             // required caption blank
    const res = checkBookComplete(b);
    expect(res.complete).toBe(false);
    expect(res.reasons.some(r => /empty photo slot/i.test(r))).toBe(true);
    expect(res.reasons.some(r => /unplaced/i.test(r))).toBe(true);
    expect(res.reasons.some(r => /caption/i.test(r))).toBe(true);
  });
});

// ── defensive: empty / missing inputs ──────────────────────────────────────────
describe('checkBookComplete — defensive input handling', () => {
  test('empty book (no assignments, no pool) is trivially complete', () => {
    const res = checkBookComplete({ bookAssignments: {}, photoPool: [], requiredCaptions: [], bookCaptions: {} });
    expect(res.complete).toBe(true);
  });

  test('missing optional fields do not throw', () => {
    expect(() => checkBookComplete({ bookAssignments: {} })).not.toThrow();
  });
});
