// Copy one order's BOOK LAYOUT onto another order, with translated captions.
//
// Used to build the German twin of an existing English order for the DE product-page
// mockups (germanization Stage 6). The layout — page sequence, which photo sits in
// which slot, and the reposition offsets — is the part that takes a human an hour and
// is identical between the two books; only the text differs.
//
// It writes through `saveStaffState`, NOT straight into Firestore, so the review lock
// and the bookRevision compare-and-bump both apply exactly as they do for a staff save
// from the engine (TO-DOS #99, docs/briefs/review-lock.md).
//
// Photo identity: it refuses to run unless the two orders' pool ORIGINAL filenames line
// up index for index AND the stored photo_NNN names match, because `bookAssignments`
// refers to photos by their photo_NNN name. A silent mismatch would put the right layout
// on the wrong pictures.
//
// Caption lines are deliberately NOT copied: German wraps differently from English, so
// the saved line breaks would be wrong. They are left null and the engine recomputes
// them the next time a human saves the book.
//
// Run:  node qa/mirror-book-state.mjs <sourceOrder> <targetOrder> <captions.json> [renames.json]
//
// `renames.json` is { "<source original filename>": "<target original filename>" }, for the
// case where the photo LIBRARY was re-exported or renamed between the two orders. Every
// mismatched index must be covered by it, so a genuine mix-up still stops the run.
// The captions file is { "<spreadIdx>": { left|right: { "0"|"textPanel"|... : "text" } },
// "cover": {...} } in the same shape as staffBookCaptions — it REPLACES the source's.

import fs from 'node:fs';
import path from 'node:path';
import { getOrder } from './firestore.mjs';

const [SRC, DST, CAPS_FILE, RENAMES_FILE] = process.argv.slice(2);
if (!SRC || !DST || !CAPS_FILE) {
  console.error('Usage: node qa/mirror-book-state.mjs <sourceOrder> <targetOrder> <captions.json> [renames.json]');
  process.exit(1);
}

const API_KEY = 'AIzaSyAki1W4N3xVvHSTZl77uTVukeiA3yqO1K4';   // public web config, same as the engine
const SAVE_URL = 'https://europe-west1-aevia-uploads.cloudfunctions.net/saveStaffState';

const env = Object.fromEntries(
  fs.readFileSync(path.resolve('qa/.env'), 'utf8')
    .split('\n').filter(l => l.trim() && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const src = await getOrder(SRC);
const dst = await getOrder(DST);
if (!src) { console.error(`${SRC} not found`); process.exit(1); }
if (!dst) { console.error(`${DST} not found`); process.exit(1); }

// ── Guard: the two books must refer to the same photos by the same names ──────
const a = src.photoManifest || {}, b = dst.photoManifest || {};
const names = (m) => (m.pool || []).map(p => p.split('/').pop());
const srcNames = names(a), dstNames = names(b);
const renames = RENAMES_FILE ? JSON.parse(fs.readFileSync(path.resolve(RENAMES_FILE), 'utf8')) : {};
const srcOrig = a.poolOriginalNames || [], dstOrig = b.poolOriginalNames || [];
const sameLength = srcOrig.length === dstOrig.length;
// A name may differ only where the rename map says so — anything else is a real mismatch.
const unexplained = sameLength
  ? srcOrig.map((n, i) => [i, n, dstOrig[i]]).filter(([, n, d]) => d !== n && renames[n] !== d)
  : [];
const storedMatch = srcNames.length === dstNames.length && srcNames.every((n, i) => dstNames[i] === n);
if (!sameLength || unexplained.length || !storedMatch) {
  console.error('❌ Photo sets do not line up — refusing to copy a layout onto different pictures.');
  console.error(`   same pool length: ${sameLength} | stored photo_NNN names match: ${storedMatch}`);
  for (const [i, n, d] of unexplained.slice(0, 10)) console.error(`   [${i}] ${n}  !=  ${d}`);
  if (unexplained.length) console.error(`   ${unexplained.length} unexplained difference(s) — add them to a renames.json if they are the same picture.`);
  process.exit(1);
}
const renamed = srcOrig.filter((n, i) => dstOrig[i] !== n).length;
console.log(`✓ ${srcNames.length} photos line up index for index, same stored names`
  + (renamed ? ` (${renamed} matched through the rename map)` : ''));

// Keys starting with `_` are notes in the file, not spreads. Without this they are
// treated as a spread index, their string is walked per character, and the note is
// saved into the book as a caption.
const captions = Object.fromEntries(
  Object.entries(JSON.parse(fs.readFileSync(path.resolve(CAPS_FILE), 'utf8')))
    .filter(([k]) => !k.startsWith('_')));

// Every caption slot the source fills must be filled in the translation, or the German
// book quietly loses a line the English one has.
const slots = (c) => {
  const out = [];
  for (const [idx, sides] of Object.entries(c || {})) {
    if (idx === 'cover') { for (const k of Object.keys(sides)) out.push(`cover.${k}`); continue; }
    for (const [side, keys] of Object.entries(sides)) for (const k of Object.keys(keys)) out.push(`${idx}.${side}.${k}`);
  }
  return out.sort();
};
const srcSlots = slots(src.staffBookCaptions), dstSlots = slots(captions);
const missing = srcSlots.filter(s => !dstSlots.includes(s));
const extra = dstSlots.filter(s => !srcSlots.includes(s));
if (missing.length) console.warn(`⚠️  translation is MISSING these source slots: ${missing.join(', ')}`);
if (extra.length) console.warn(`⚠️  translation adds slots the source lacks: ${extra.join(', ')}`);
console.log(`Captions: ${dstSlots.length} slots (source has ${srcSlots.length})`);

// ── Staff ID token ────────────────────────────────────────────────────────────
const signIn = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: env.STAFF_TEST_EMAIL, password: env.STAFF_TEST_PASSWORD, returnSecureToken: true }),
});
const auth = await signIn.json();
if (!auth.idToken) { console.error('❌ staff sign-in failed:', auth.error?.message || JSON.stringify(auth)); process.exit(1); }
console.log(`✓ signed in as ${env.STAFF_TEST_EMAIL}`);

// ── Save ──────────────────────────────────────────────────────────────────────
const body = {
  orderNumber: DST,
  bookSequence: src.staffBookSequence || null,
  bookAssignments: src.staffBookAssignments || null,
  heartCrop: src.staffHeartCrop || null,
  bookCaptions: captions,
  bookCaptionLines: null,          // German wraps differently — let the engine recompute
  coverCaptionStyles: src.staffCoverCaptionStyles || null,
  spreadCaptionStyles: src.staffSpreadCaptionStyles || null,
  bookComplete: false,             // a human confirms completeness by saving in the engine
  incompleteReasons: [],
  bookRevision: dst.bookRevision ?? null,
};

const res = await fetch(SAVE_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.idToken}` },
  body: JSON.stringify(body),
});
const out = await res.json().catch(() => ({}));
if (!res.ok) { console.error(`❌ saveStaffState ${res.status}:`, JSON.stringify(out)); process.exit(1); }
console.log(`✅ ${DST} saved — ${body.bookSequence.length} pages, bookRevision ${out.bookRevision}`);
process.exit(0);
