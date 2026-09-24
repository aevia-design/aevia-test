// TO-DOS #129 — customer-preview must record its own caption line breaks so approval
// can promote them instead of dropping staffBookCaptionLines wholesale.
// See work/caption-line-integrity/decision.md and LEARNINGS.md S159/S181.
const { resolveApprovedCaptionLines } = require('../functions/caption-line-utils.js');

describe('resolveApprovedCaptionLines', () => {
  test('promotes the customer-recorded lines on approval', () => {
    const orderData = { customerCaptionLines: { cover: { name: ['ANNA &', 'MICHAEL'] } } };
    expect(resolveApprovedCaptionLines(orderData)).toEqual({ cover: { name: ['ANNA &', 'MICHAEL'] } });
  });

  test('an old order with no customerCaptionLines field falls back to null', () => {
    // Pre-#129 orders never sent this field — must not throw, must not fabricate lines.
    expect(resolveApprovedCaptionLines({})).toBeNull();
  });

  test('an explicit null is passed through, not treated as "field missing"', () => {
    expect(resolveApprovedCaptionLines({ customerCaptionLines: null })).toBeNull();
  });

  test('missing orderData does not throw', () => {
    expect(resolveApprovedCaptionLines(undefined)).toBeNull();
  });
});
