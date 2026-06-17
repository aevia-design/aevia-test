// Regression test for the order-form main-photo count guard (S46).
// Bug: the submit validation only blocked TOO FEW photos (`uploaded < required`),
// so a customer could submit MORE photos than the book has slots; the engine
// filled its exact slot count and the surplus showed up "unplaced" for staff.
// Fix: block when uploaded !== required (one photo per slot, both ends).
// House-style: mirrors the predicate from pages/order.html submitOrder() inline
// (it can't be imported from the HTML); keep this in sync if the message changes.

function photoCountError(uploaded, required) {
  if (required > 0 && uploaded !== required) {
    const diff = Math.abs(required - uploaded);
    const noun = `photo${diff === 1 ? '' : 's'}`;
    return uploaded < required
      ? `Please upload ${diff} more ${noun} (${uploaded} of ${required} added).`
      : `Please remove ${diff} ${noun} — your book has ${required} photo slots (${uploaded} of ${required} added).`;
  }
  return null;
}

describe('Order form — main-photo count guard', () => {
  test('exact count is allowed (no error)', () => {
    expect(photoCountError(51, 51)).toBeNull();
  });

  test('too few photos is blocked (lower bound, existing behaviour)', () => {
    expect(photoCountError(49, 51)).toBe('Please upload 2 more photos (49 of 51 added).');
  });

  test('too many photos is blocked (the regression — was silently accepted)', () => {
    expect(photoCountError(53, 51)).toBe('Please remove 2 photos — your book has 51 photo slots (53 of 51 added).');
  });

  test('singular wording when off by one', () => {
    expect(photoCountError(50, 51)).toBe('Please upload 1 more photo (50 of 51 added).');
    expect(photoCountError(52, 51)).toBe('Please remove 1 photo — your book has 51 photo slots (52 of 51 added).');
  });

  test('no target set (required 0) never blocks', () => {
    expect(photoCountError(0, 0)).toBeNull();
    expect(photoCountError(5, 0)).toBeNull();
  });
});
