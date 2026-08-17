// Germanization Stage 4b — German strings inside the template data files.
//
// Stage 4a moved the form's own copy into one string table. The per-template
// copy (cover labels, placeholders, functional-page prompts, the Newborn
// zodiac verses) stays beside its artwork as `labelDe` / `placeholderDe` /
// `hintDe` / `copyDe`, mirroring `svgDe` from Stage 2.
//
// The dangerous state is a HALF-filled map: a German book that prints English
// verses for four star signs and German for nine. These tests do not demand
// that every template is translated yet — they demand that whatever German
// exists is complete for its group.

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function loadTemplate(relPath, globalName) {
  const src = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const sandbox = { window: {} };
  new Function('window', src).call(sandbox, sandbox.window);
  return sandbox.window[globalName];
}

const NEWBORN = loadTemplate('assets/Template_Newborn/newborn-data.js', 'NEWBORN_DATA');
const TENDER  = loadTemplate('assets/Template_Tender/tender-data.js', 'TENDER_DATA');

// Heirloom ships one data file per colourway, string-identical by design. The
// German must stay identical across all four too — a nudge applied to Beige only
// is the realistic way this breaks, and it would give a Blue customer an English
// form on a German book.
const HEIRLOOMS = {
  Beige: loadTemplate('assets/Template_Heirloom/Beige/heirloom-data.js',        'HEIRLOOM_DATA'),
  Brown: loadTemplate('assets/Template_Heirloom/Brown/heirloom-brown-data.js',  'HEIRLOOM_BROWN_DATA'),
  Green: loadTemplate('assets/Template_Heirloom/Green/heirloom-green-data.js',  'HEIRLOOM_GREEN_DATA'),
  Blue:  loadTemplate('assets/Template_Heirloom/Blue/heirloom-blue-data.js',    'HEIRLOOM_BLUE_DATA'),
};
const HEIRLOOM_NAMES = Object.keys(HEIRLOOMS);

// Every template the order form loads. Adding a template means adding it here —
// the sweep below then demands its German on the same terms as the other ten.
const ALL_TEMPLATES = {
  Newborn:        ['assets/Template_Newborn/newborn-data.js',              'NEWBORN_DATA'],
  Tender:         ['assets/Template_Tender/tender-data.js',                'TENDER_DATA'],
  Scribble:       ['assets/Template_Scribble/scribble-data.js',            'SCRIBBLE_DATA'],
  Papercut:       ['assets/Template_Papercut/papercut-data.js',            'PAPERCUT_DATA'],
  Wander:         ['assets/Template_Wander/wander-data.js',                'WANDER_DATA'],
  Joyride:        ['assets/Template_Joyride/joyride-data.js',              'JOYRIDE_DATA'],
  Laguna:         ['assets/Template_Laguna/laguna-data.js',                'LAGUNA_DATA'],
  HeirloomBeige:  ['assets/Template_Heirloom/Beige/heirloom-data.js',      'HEIRLOOM_DATA'],
  HeirloomBrown:  ['assets/Template_Heirloom/Brown/heirloom-brown-data.js','HEIRLOOM_BROWN_DATA'],
  HeirloomGreen:  ['assets/Template_Heirloom/Green/heirloom-green-data.js','HEIRLOOM_GREEN_DATA'],
  HeirloomBlue:   ['assets/Template_Heirloom/Blue/heirloom-blue-data.js',  'HEIRLOOM_BLUE_DATA'],
};

// Stage 4b's completeness gate, applied to every template at once.
//
// The form reads per-template copy through tdText(), which falls back to English
// when the German is missing. That fallback is deliberate — it means a new
// template is never blank — but it also means a MISSING translation is silent:
// the customer just sees an English label on a German form and we never hear
// about it. This sweep is what makes the silence audible.
//
// It checks the five fields tdText resolves (label, placeholder, hint, heading,
// textPrompt) plus the `labels` array, on every surface the customer reads:
// cover captions, functional-page prompts, and photo-upload prompts.
describe('Stage 4b — German is complete for every template', () => {

  // Fields that must be translated as a set. Translating a label but not its
  // placeholder, or a field list but not the heading above it, is the state that
  // reads worst: the customer sees German, trusts it, then hits English.
  function auditTemplate(d) {
    const gaps = [];
    const need = (obj, field, where) => {
      if (!obj || obj[field] === undefined || obj[field] === null) return;
      if (typeof obj[field] === 'string' && !obj[field].trim()) return;
      const de = obj[field + 'De'];
      if (!de || (typeof de === 'string' && !de.trim())) gaps.push(`${where}.${field}De`);
    };

    (d.cover?.captions || []).forEach(c => {
      need(c, 'label', `cover.${c.key}`);
      need(c, 'placeholder', `cover.${c.key}`);
    });

    Object.entries(d.spreads || {}).forEach(([id, sp]) => {
      const m = sp.orderFormMeta;
      if (m) {
        ['heading', 'textPrompt', 'hint', 'placeholder', 'labels'].forEach(f => need(m, f, `${id}.meta`));
        (m.fields || []).forEach(f => {
          need(f, 'label', `${id}.${f.key}`);
          need(f, 'placeholder', `${id}.${f.key}`);
        });
      }
      const p = sp.orderFormPhoto;
      if (p) {
        need(p, 'label', `${id}.photo`);
        need(p, 'hint', `${id}.photo`);
      }
    });
    return gaps;
  }

  test.each(Object.keys(ALL_TEMPLATES))('%s has no untranslated customer-facing string', (name) => {
    const [file, global] = ALL_TEMPLATES[name];
    expect(auditTemplate(loadTemplate(file, global))).toEqual([]);
  });

  // A composer with English words baked inside it cannot be reached by any *De
  // field — it is code, not data. Tender's and Heirloom's intros are the two
  // that had them, and both now carry a composeDe. Every other composer only
  // interleaves the customer's own words; if one grows English wording of its
  // own, this test is what should fail.
  test.each(Object.keys(ALL_TEMPLATES))('%s composers hold no untranslated English', (name) => {
    const [file, global] = ALL_TEMPLATES[name];
    const d = loadTemplate(file, global);
    const offenders = [];
    Object.entries(d.spreads || {}).forEach(([id, sp]) => {
      const m = sp.orderFormMeta;
      if (!m?.compose) return;
      // Strip the ${...} interpolations: what remains is the composer's own prose.
      const prose = String(m.compose).replace(/\$\{[^}]*\}/g, '').replace(/[^A-Za-z ]+/g, ' ');
      const hasEnglishWords = /\b(we|our|the|you|your|on|in|and|said|beginning|forever|promised)\b/i.test(prose);
      if (hasEnglishWords && !m.composeDe) offenders.push(`${id}.compose has prose but no composeDe`);
    });
    expect(offenders).toEqual([]);
  });
});

describe('German strings in template data files', () => {

  test('Newborn zodiac German covers every sign the English covers', () => {
    const z = NEWBORN.spreads.FPlabour.zodiac;
    expect(Object.keys(z.copyDe).sort()).toEqual(Object.keys(z.copy).sort());
  });

  test('Newborn zodiac German is never blank', () => {
    const z = NEWBORN.spreads.FPlabour.zodiac;
    const blank = Object.entries(z.copyDe).filter(([, v]) => !v || !v.trim()).map(([k]) => k);
    expect(blank).toEqual([]);
  });

  test('every selectable sign except None has a German display name', () => {
    const z = NEWBORN.spreads.FPlabour.zodiac;
    const missing = z.signs.filter(s => s !== 'None' && !z.signLabelsDe[s]);
    expect(missing).toEqual([]);
  });

  test('German sign labels never change the stored value', () => {
    // The option value keys the artwork path and the saved order. Only the
    // label may differ, so the German map must not introduce unknown signs.
    const z = NEWBORN.spreads.FPlabour.zodiac;
    const unknown = Object.keys(z.signLabelsDe).filter(s => !z.signs.includes(s));
    expect(unknown).toEqual([]);
  });

  test('Newborn cover captions carry German label AND placeholder together', () => {
    // A German label beside an English placeholder is the half-translated
    // state that reads worst on screen.
    const half = NEWBORN.cover.captions
      .filter(c => Boolean(c.labelDe) !== Boolean(c.placeholderDe))
      .map(c => c.key);
    expect(half).toEqual([]);
  });

  test('Newborn intro fields carry German label AND placeholder together', () => {
    const fields = NEWBORN.spreads.FPintro.orderFormMeta.fields;
    const half = fields
      .filter(f => Boolean(f.labelDe) !== Boolean(f.placeholderDe))
      .map(f => f.key);
    expect(half).toEqual([]);
  });

  // ── Tender (S180) ──────────────────────────────────────────────────────────
  // Tender's functional pages are all `introFields` pages: labelled fields the
  // customer fills, composed into a text panel. Three things can half-fail — a
  // label without its placeholder, a page whose fields are German but whose hint
  // is not, and a composed block that stays English inside a German book.

  const tenderFPs = ['FPintro', 'FPstory', 'FPwords'];

  test('Tender cover captions carry German label AND placeholder together', () => {
    const half = TENDER.cover.captions
      .filter(c => Boolean(c.labelDe) !== Boolean(c.placeholderDe))
      .map(c => c.key);
    expect(half).toEqual([]);
  });

  test.each(tenderFPs)('Tender %s fields carry German label AND placeholder together', (id) => {
    const fields = TENDER.spreads[id].orderFormMeta.fields;
    const half = fields
      .filter(f => Boolean(f.labelDe) !== Boolean(f.placeholderDe))
      .map(f => f.key);
    expect(half).toEqual([]);
  });

  test.each(tenderFPs)('Tender %s translates its hint and heading with its fields', (id) => {
    // A German field list under an English section heading is the state that
    // reads worst: the customer sees the page is German, then hits an English
    // instruction.
    const meta = TENDER.spreads[id].orderFormMeta;
    const anyFieldDe = meta.fields.some(f => f.labelDe);
    if (!anyFieldDe) return;
    expect(meta.hintDe && meta.hintDe.trim()).toBeTruthy();
    expect(meta.headingDe && meta.headingDe.trim()).toBeTruthy();
  });

  test.each(['FPstory', 'FPwords'])('Tender %s photo prompt carries German label AND hint', (id) => {
    const photo = TENDER.spreads[id].orderFormPhoto;
    expect(Boolean(photo.labelDe)).toBe(Boolean(photo.hintDe));
  });

  test('Tender intro composes German book text, not English, for a German order', () => {
    // The one composer with English words of its own — the story and words
    // composers only pass the customer's text through, so they need no twin.
    const meta = TENDER.spreads.FPintro.orderFormMeta;
    expect(typeof meta.composeDe).toBe('function');
    const out = meta.composeDe({ date: '14. Juni 2026', place: 'Wien, Österreich', bride: 'Anna', groom: 'Michael' });
    expect(out).toContain('haben wir Ja zueinander gesagt');
    expect(out).not.toMatch(/I do|we said/i);
    expect(out).toContain('Anna & Michael');
  });

  test('Tender story and words composers pass customer text through unchanged', () => {
    // If either ever grows English wording of its own it needs a composeDe too,
    // and this test is what should fail.
    expect(TENDER.spreads.FPstory.orderFormMeta.compose({ meet: 'A', started: 'B' })).toBe('A\n\nB');
    expect(TENDER.spreads.FPwords.orderFormMeta.compose({ words: 'C' })).toBe('C');
  });

  // ── Heirloom, all four colourways (S180) ───────────────────────────────────

  const heirloomFPs = ['FPintro', 'FPstory', 'FPhim', 'FPher'];

  // Collects every German string in one colourway, in a stable order, so two
  // colourways can be compared as a whole rather than field by field.
  function germanFingerprint(d) {
    const out = [];
    d.cover.captions.forEach(c => out.push(`cover.${c.key}`, c.labelDe, c.placeholderDe));
    heirloomFPs.forEach(id => {
      const sp = d.spreads[id];
      const m = sp.orderFormMeta;
      out.push(`${id}.heading`, m.headingDe, `${id}.hint`, m.hintDe);
      (m.fields || []).forEach(f => out.push(`${id}.${f.key}`, f.labelDe, f.placeholderDe));
      if (sp.orderFormPhoto) out.push(`${id}.photo`, sp.orderFormPhoto.labelDe, sp.orderFormPhoto.hintDe);
      if (m.composeDe) out.push(`${id}.composeDe`, String(m.composeDe));
    });
    return out;
  }

  test.each(HEIRLOOM_NAMES)('Heirloom %s cover captions carry German label AND placeholder', (name) => {
    const half = HEIRLOOMS[name].cover.captions
      .filter(c => Boolean(c.labelDe) !== Boolean(c.placeholderDe))
      .map(c => c.key);
    expect(half).toEqual([]);
  });

  test.each(HEIRLOOM_NAMES)('Heirloom %s translates every functional page completely', (name) => {
    const d = HEIRLOOMS[name];
    const gaps = [];
    heirloomFPs.forEach(id => {
      const sp = d.spreads[id];
      const m = sp.orderFormMeta;
      if (!m.headingDe) gaps.push(`${id}.headingDe`);
      if (!m.hintDe) gaps.push(`${id}.hintDe`);
      (m.fields || []).forEach(f => {
        if (Boolean(f.labelDe) !== Boolean(f.placeholderDe)) gaps.push(`${id}.${f.key} half-translated`);
        if (!f.labelDe) gaps.push(`${id}.${f.key}.labelDe`);
      });
      if (sp.orderFormPhoto && Boolean(sp.orderFormPhoto.labelDe) !== Boolean(sp.orderFormPhoto.hintDe)) {
        gaps.push(`${id}.photo half-translated`);
      }
    });
    expect(gaps).toEqual([]);
  });

  test('Heirloom German is identical across all four colourways', () => {
    const beige = germanFingerprint(HEIRLOOMS.Beige);
    HEIRLOOM_NAMES.filter(n => n !== 'Beige').forEach(name => {
      expect(germanFingerprint(HEIRLOOMS[name])).toEqual(beige);
    });
  });

  test.each(HEIRLOOM_NAMES)('Heirloom %s intro composes German book text for a German order', (name) => {
    const m = HEIRLOOMS[name].spreads.FPintro.orderFormMeta;
    expect(typeof m.composeDe).toBe('function');
    const out = m.composeDe({ date: '14. Juni 2026', place: 'Wien, Österreich', bride: 'Anna', groom: 'Michael' });
    expect(out).toContain('haben wir Ja zueinander gesagt');
    expect(out).toContain('Der Anfang von für immer.');
    expect(out).not.toMatch(/I do|forever|we promised/i);
    expect(out).toContain('Anna & Michael');
  });

  test.each(HEIRLOOM_NAMES)('Heirloom %s story/him/her composers only pass customer text through', (name) => {
    // If any of these grows English wording of its own it needs a composeDe too,
    // and this is the test that should fail.
    const sp = HEIRLOOMS[name].spreads;
    expect(sp.FPstory.orderFormMeta.compose({ meet: 'A', started: 'B' })).toBe('A\n\nB');
    expect(sp.FPhim.orderFormMeta.compose({ whyhim: 'C' })).toBe('C');
    expect(sp.FPher.orderFormMeta.compose({ whyher: 'D' })).toBe('D');
  });

  test('Newborn labour slot hints are translated as a complete set', () => {
    const photo = NEWBORN.spreads.FPlabour.orderFormPhoto;
    expect(photo.slotHintsDe).toHaveLength(photo.slotHints.length);
    expect(photo.slotHintsDe.every(h => h && h.trim())).toBe(true);
  });
});
