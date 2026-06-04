// book-completeness.js — single source of truth for "is this book ready to send / approve?"
//
// Shared by the staff engine (template-engine.html), the dashboard (dashboard.html),
// and the customer preview (customer-preview.html) so the rule can never drift between
// them. Saving an incomplete book is allowed; SENDING a preview link and APPROVING are
// the two actions this gates.
//
// A book is complete when:
//   1. no photo slot is empty       (no null/undefined entries in bookAssignments)
//   2. no pool photo is unplaced     (every non-duplicate pool photo sits in a slot)
//   3. every REQUIRED caption is filled (a special-page text box the layout actually
//      shows the user — requiredCaptions lists exactly those; captions the layout never
//      asks for are ignored)
//
// Special/artwork slots (FP pages) are intentionally null in bookAssignments — their
// photo comes from specialPhotos at order time, not the pool — so they must NOT count
// as empty. The render records their positions in specialSlots; we skip those here.
//
// Inputs (all optional; missing → treated as empty):
//   bookAssignments  { [spread]: { left:[idx|null...], right:[idx|null...] } }
//   photoPool        [ { name, duplicate? } ]   — indices match the slot values above
//   requiredCaptions [ { spread, side } ]       — where an editable caption box is shown
//   bookCaptions     { [spread]: { [side]: { textPanel: 'text' } } }
//   specialSlots     [ "spread:side:slotIdx" ]  — slots filled from specialPhotos, not the pool
//
// Returns { complete: boolean, reasons: string[] }.

function checkBookComplete({ bookAssignments = {}, photoPool = [], requiredCaptions = [], bookCaptions = {}, specialSlots = [] } = {}) {
  const reasons = [];
  const specialSet = new Set(specialSlots || []);

  // 1. Empty slots + collect which pool indices are placed (for the unplaced check).
  //    A null in a special/artwork slot is expected (photo comes from specialPhotos), so skip it.
  let emptySlots = 0;
  const placed = new Set();
  Object.entries(bookAssignments || {}).forEach(([spread, asgn]) => {
    ['left', 'right'].forEach(side => {
      ((asgn && asgn[side]) || []).forEach((idx, slotIdx) => {
        if (idx === null || idx === undefined) {
          if (!specialSet.has(`${spread}:${side}:${slotIdx}`)) emptySlots++;
        } else {
          placed.add(idx);
        }
      });
    });
  });

  // 2. Unplaced photos — non-duplicate pool photos that never landed in a slot.
  let unplaced = 0;
  (photoPool || []).forEach((photo, i) => {
    if (photo && photo.duplicate) return;
    if (!placed.has(i)) unplaced++;
  });

  // 3. Blank required captions.
  let blankCaptions = 0;
  (requiredCaptions || []).forEach(({ spread, side }) => {
    const text = bookCaptions && bookCaptions[spread] && bookCaptions[spread][side]
      ? bookCaptions[spread][side].textPanel
      : '';
    if (!String(text || '').trim()) blankCaptions++;
  });

  const plural = (n) => (n === 1 ? '' : 's');
  if (emptySlots > 0)    reasons.push(`${emptySlots} empty photo slot${plural(emptySlots)}`);
  if (unplaced > 0)      reasons.push(`${unplaced} unplaced photo${plural(unplaced)}`);
  if (blankCaptions > 0) reasons.push(`${blankCaptions} blank caption${plural(blankCaptions)} on special page${plural(blankCaptions)}`);

  return { complete: reasons.length === 0, reasons };
}

if (typeof module !== 'undefined') {
  module.exports = { checkBookComplete };
}
