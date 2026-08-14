// ─────────────────────────────────────────────────────────────────
// Order-form string table — germanization Stage 4.
//
// ONE source of truth for every piece of customer-facing copy in
// `pages/order.html`. English and German sit side by side on the same line
// so a reviewer can scan the pair and catch drift — that pairing is the
// whole point of this file, so keep `en` and `de` adjacent when adding keys.
//
// The English `en` values must stay byte-identical to the proven English
// form. If you change English copy in order.html, change it HERE — the page
// reads its text from this table now, not from the markup.
//
// Per-template strings (cover captions, functional-page prompts) are NOT
// here: they live beside their artwork in the template data files as
// `labelDe` / `placeholderDe` / `hintDe`, mirroring the `svgDe` pattern from
// Stage 2. Same fallback rule everywhere: no German → English, never blank.
//
// Plain script, no build step (see CLAUDE.md). Loaded before order.html's
// own <script>, which reads window.ORDER_STRINGS.
//
// German register: formal "Sie" throughout — premium brand, Austrian market.
// ─────────────────────────────────────────────────────────────────
window.ORDER_STRINGS = {

  // ── Navigation + footer ──
  'nav.home':          { en: 'Home',                       de: 'Startseite' },
  'nav.about':         { en: 'About us',                   de: 'Über uns' },
  'nav.help':          { en: 'Help',                       de: 'Hilfe' },
  'nav.cta':           { en: 'Our Collections',            de: 'Unsere Kollektionen' },
  'footer.rights':     { en: '© 2026 Aevia. All rights reserved.', de: '© 2026 Aevia. Alle Rechte vorbehalten.' },
  'footer.help':       { en: 'Help & FAQ',                 de: 'Hilfe & FAQ' },

  // ── No-template fallback ──
  'noTemplate.title':  { en: 'Choose a template first',    de: 'Wählen Sie zuerst eine Vorlage' },
  'noTemplate.body':   { en: "You'll need to pick a template and page count before placing an order.",
                         de: 'Bevor Sie bestellen, wählen Sie bitte eine Vorlage und den Seitenumfang.' },
  'noTemplate.link':   { en: 'Browse collections',         de: 'Kollektionen ansehen' },

  // ── Stepper labels ──
  'step.details':      { en: 'Your details',               de: 'Ihre Angaben' },
  'step.cover':        { en: 'Your cover',                 de: 'Ihr Cover' },
  'step.special':      { en: 'Special pages',              de: 'Sonderseiten' },
  'step.photos':       { en: 'Your photos',                de: 'Ihre Fotos' },

  // ── Step 1 — details ──
  'details.heading':   { en: 'Your details',               de: 'Ihre Angaben' },
  'details.sub':       { en: 'We use these to send your confirmation and contact you when your preview is ready.',
                         de: 'Damit senden wir Ihnen die Bestätigung und melden uns, sobald Ihre Vorschau bereit ist.' },

  'signin.prompt':     { en: 'Have an Aevia account?',     de: 'Sie haben ein Aevia-Konto?' },
  'signin.open':       { en: 'Sign in to autofill',        de: 'Anmelden und automatisch ausfüllen' },
  'signin.or':         { en: '— or just continue below as a guest.',
                         de: '— oder fahren Sie einfach als Gast fort.' },
  'signin.signedAs':   { en: 'Signed in as',               de: 'Angemeldet als' },
  'signin.out':        { en: 'Not you? Sign out',          de: 'Nicht Sie? Abmelden' },

  'field.name.label':  { en: 'Full name',                  de: 'Vollständiger Name' },
  'field.name.ph':     { en: 'Anna Müller',                de: 'Anna Müller' },
  'field.email.label': { en: 'Email address',              de: 'E-Mail-Adresse' },
  'field.email.ph':    { en: 'anna@example.com',           de: 'anna@example.com' },
  'field.notes.label': { en: 'Tell us about this album',   de: 'Erzählen Sie uns von diesem Album' },
  'field.optional':    { en: 'optional',                   de: 'optional' },

  // ── Shared buttons ──
  'btn.continue':      { en: 'Continue',                   de: 'Weiter' },
  'btn.back':          { en: 'Back',                       de: 'Zurück' },

  // ── Summary card ──
  'summary.pages':     { en: 'Pages',                      de: 'Seiten' },
  'summary.addons':    { en: 'Add-ons',                    de: 'Zusatzseiten' },
  'summary.priceNote': { en: 'incl. VAT, excl. shipping',  de: 'inkl. MwSt., zzgl. Versand' },
  'summary.back':      { en: 'Change template',            de: 'Vorlage ändern' },

  // ── Cover step ──
  'cover.label':       { en: 'Cover text',                 de: 'Covertext' },
  'cover.required':    { en: 'Required',                   de: 'Erforderlich' },
  'cover.photoHeading': { en: 'Cover photo',               de: 'Coverfoto' },
  'cover.photosHeading': { en: 'Cover photos',             de: 'Coverfotos' },
  'cover.hintLandscape': { en: 'One photo for the cover. Choose a <strong>landscape (horizontal)</strong> photo so it fills the frame.',
                         de: 'Ein Foto für das Cover. Wählen Sie ein <strong>querformatiges</strong> Foto, damit es den Rahmen ausfüllt.' },
  'cover.hintPortrait': { en: 'One photo for the cover. Choose a <strong>portrait (vertical)</strong> photo so it fills the frame.',
                         de: 'Ein Foto für das Cover. Wählen Sie ein <strong>hochformatiges</strong> Foto, damit es den Rahmen ausfüllt.' },
  'cover.hintPlain':   { en: 'One photo for the cover.',   de: 'Ein Foto für das Cover.' },
  'summary.pagesValue': { en: '{n} pages',                 de: '{n} Seiten' },
  'cover.hint':        { en: 'Appears printed on your book cover and spine. You can change this later when you review your preview.',
                         de: 'Erscheint gedruckt auf Buchcover und Buchrücken. Sie können das später bei der Vorschau noch ändern.' },

  // ── Photos step ──
  'photos.label':      { en: 'Your photos',                de: 'Ihre Fotos' },
  'photos.heading':    { en: 'Upload your photos',         de: 'Laden Sie Ihre Fotos hoch' },
  // Split around the live count: "Upload <b>24</b> photos. One per slot in your book."
  'photos.countPre':   { en: 'Upload ',                    de: 'Laden Sie ' },
  'photos.countPost':  { en: ' photos. ',                  de: ' Fotos hoch. ' },
  'photos.countTail':  { en: 'One per slot in your book.', de: 'Eines pro Platz in Ihrem Buch.' },
  'photos.tip':        { en: 'Upload from your phone for best quality. Smartphone photos include date metadata we use to sort your book.',
                         de: 'Laden Sie vom Smartphone hoch, das ergibt die beste Qualität. Handyfotos enthalten Datumsangaben, nach denen wir Ihr Buch sortieren.' },
  'dz.choose':         { en: 'Choose photos',              de: 'Fotos auswählen' },
  'dz.orDrag':         { en: ' or drag here',              de: ' oder hierher ziehen' },
  'dz.formats':        { en: 'JPG · PNG · HEIC, up to 40 MB each. Add several at once.',
                         de: 'JPG · PNG · HEIC, jeweils bis 40 MB. Mehrere auf einmal möglich.' },
  'photos.addMore':    { en: 'Add more photos',            de: 'Weitere Fotos hinzufügen' },

  // ── Submit ──
  'submit.btn':        { en: 'Submit your order',          de: 'Bestellung abschicken' },
  'submit.note1':      { en: 'No payment until you approve the design.',
                         de: 'Keine Zahlung, bevor Sie die Gestaltung freigeben.' },
  'submit.note2':      { en: 'Preview within 48 hours.',   de: 'Vorschau innerhalb von 48 Stunden.' },

  // ── Success screen ──
  'success.heading':   { en: 'Your photos are in.',        de: 'Ihre Fotos sind angekommen.' },
  'success.sub':       { en: "We've sent a confirmation to your email address. Our team will start designing and send you a preview within 48 hours.",
                         de: 'Wir haben Ihnen eine Bestätigung per E-Mail geschickt. Unser Team beginnt mit der Gestaltung und sendet Ihnen innerhalb von 48 Stunden eine Vorschau.' },
  'success.s1.title':  { en: 'Design',                     de: 'Gestaltung' },
  // Split around the template name: "…into the <Scribble> layout."
  'success.s1.pre':    { en: 'We arrange your photos into the ', de: 'Wir arrangieren Ihre Fotos im Layout ' },
  'success.s1.post':   { en: " layout. You'll receive a preview link within 48 hours.",
                         de: '. Den Link zur Vorschau erhalten Sie innerhalb von 48 Stunden.' },
  'success.s2.title':  { en: 'Approval',                   de: 'Freigabe' },
  'success.s2.body':   { en: 'Fine-tune your book. Swap photos, adjust captions, and confirm everything looks right. Nothing is charged until you approve.',
                         de: 'Feinschliff für Ihr Buch: Fotos tauschen, Bildtexte anpassen und prüfen, ob alles stimmt. Erst nach Ihrer Freigabe wird abgerechnet.' },
  'success.s3.title':  { en: 'Print & dispatch',           de: 'Druck & Versand' },
  'success.s3.body':   { en: 'Once approved, we print and ship your book within 5–7 business days.',
                         de: 'Nach Ihrer Freigabe drucken und versenden wir Ihr Buch innerhalb von 5–7 Werktagen.' },
  'success.home':      { en: 'Return to Aevia',            de: 'Zurück zu Aevia' },

  // ── Validation + status messages ──
  'err.details':       { en: 'Please fill in your name and email before continuing.',
                         de: 'Bitte geben Sie Namen und E-Mail-Adresse ein, bevor Sie fortfahren.' },
  'err.coverPhoto':    { en: 'Please upload a cover photo before continuing.',
                         de: 'Bitte laden Sie ein Coverfoto hoch, bevor Sie fortfahren.' },
  'err.coverText':     { en: 'Please add your cover text before continuing.',
                         de: 'Bitte ergänzen Sie Ihren Covertext, bevor Sie fortfahren.' },
  'err.email':         { en: 'Please enter a valid email address so we can send your confirmation.',
                         de: 'Bitte geben Sie eine gültige E-Mail-Adresse ein, damit wir Ihnen die Bestätigung senden können.' },
  'err.generic':       { en: 'Something went wrong. Please try again or email us at support@aevia.at.',
                         de: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut oder schreiben Sie uns an support@aevia.at.' },
  'err.signin':        { en: 'Please enter your email and password.',
                         de: 'Bitte geben Sie E-Mail-Adresse und Passwort ein.' },
  'issue.coverCrop':   { en: 'Your cover photo is the wrong orientation for this template, so it will be cropped to fit.',
                         de: 'Ihr Coverfoto hat für diese Vorlage das falsche Format und wird passend zugeschnitten.' },

  'photo.noPreview':   { en: 'No preview',                 de: 'Keine Vorschau' },
  'photo.converting':  { en: 'Converting…',                de: 'Wird konvertiert …' },
  'overlay.almost':    { en: 'Almost there. Your photos are travelling to our Viennese studio.',
                         de: 'Fast geschafft. Ihre Fotos sind auf dem Weg in unser Wiener Atelier.' },
  'overlay.done':      { en: 'Done!',                      de: 'Fertig!' },

  // ── Special / add-on pages ──
  'addon.opening':     { en: 'Your opening page',          de: 'Ihre Eröffnungsseite' },
  'addon.special':     { en: 'Special page',               de: 'Sonderseite' },
  'addon.remove':      { en: 'Remove this page',           de: 'Diese Seite entfernen' },
  'addon.addWord':     { en: '+ Add another word',         de: '+ Weiteres Wort hinzufügen' },
  'addon.minMax':      { en: 'Minimum {min} words, maximum {max}.',
                         de: 'Mindestens {min} Wörter, höchstens {max}.' },
  'addon.defaultHint': { en: 'Notes for this special page — text, dates, names, anything relevant.',
                         de: 'Notizen für diese Sonderseite: Text, Daten, Namen, alles Relevante.' },
  'addon.defaultPh':   { en: "Add any notes you'd like us to include for this spread...",
                         de: 'Notieren Sie alles, was wir auf dieser Doppelseite berücksichtigen sollen …' },
  'addon.route':       { en: 'Your route',                 de: 'Ihre Route' },
  'addon.routeEmpty':  { en: 'Your route will appear here…', de: 'Ihre Route erscheint hier …' },
  'addon.included':    { en: 'Included in every book',     de: 'In jedem Buch enthalten' },
  'addon.photoLeft':   { en: 'Photo 1 — left page',        de: 'Foto 1 – linke Seite' },
  'addon.photoRight':  { en: 'Photo 2 — right page',       de: 'Foto 2 – rechte Seite' },
  'addon.notes':       { en: 'Notes',                      de: 'Notizen' },
  'addon.caption':     { en: 'Caption {n}',                de: 'Bildtext {n}' },
  'addon.minMaxShort': { en: 'Min {min}, max {max}.',      de: 'Min. {min}, max. {max}.' },
  'dz.choosePhoto':    { en: 'Choose photo',               de: 'Foto auswählen' },
  'addon.introDetails': { en: 'Intro details',             de: 'Ihre Eröffnungsseite' },

  // ── Travel map + itinerary (Wander / Joyride / Laguna) ──
  'itin.countries':    { en: 'Countries visited',          de: 'Besuchte Länder' },
  'itin.countriesHint': { en: 'Select every country on this trip. They must all be in the same region — the map covers one region at a time.',
                         de: 'Wählen Sie alle Länder dieser Reise. Sie müssen in derselben Region liegen, denn die Karte zeigt jeweils eine Region.' },
  'itin.hint':         { en: 'List your route one stop per line — staff will set the final styling.',
                         de: 'Notieren Sie Ihre Route, eine Station pro Zeile. Die endgültige Gestaltung übernehmen wir.' },
  'itin.addLine':      { en: '+ Add a line',               de: '+ Zeile hinzufügen' },
  'itin.maxLines':     { en: 'Up to 7 lines.',             de: 'Bis zu 7 Zeilen.' },
  'itin.ex1':          { en: 'Day 1: Arrival in Rome, rest', de: 'Tag 1: Ankunft in Rom, ausruhen' },
  'itin.ex2':          { en: 'Days 2–4: Hiking in the Dolomites', de: 'Tag 2–4: Wandern in den Dolomiten' },
  'itin.ex3':          { en: 'Days 5–6: Florence — art & food', de: 'Tag 5–6: Florenz, Kunst und Essen' },
  'err.fpText':        { en: 'Please fill in "{name}", or remove this page.',
                         de: 'Bitte füllen Sie „{name}“ aus oder entfernen Sie diese Seite.' },
  'err.fpCaption':     { en: 'Please fill in "{name}" for {page}, or remove this page.',
                         de: 'Bitte füllen Sie „{name}“ für {page} aus oder entfernen Sie diese Seite.' },
  'err.coverTextLabour': { en: "Please add your cover text — the labour page's welcome uses it.",
                         de: 'Bitte ergänzen Sie Ihren Covertext, die Begrüßung auf der Geburtsseite verwendet ihn.' },

  // ── Album-notes placeholders, per template category ──
  'notes.ph.default':  { en: "Your child's name, their personality, a favourite toy or game. Anything you'd love us to weave through the design.",
                         de: 'Der Name Ihres Kindes, sein Wesen, ein Lieblingsspielzeug oder -spiel. Alles, was wir gern in die Gestaltung einfließen lassen sollen.' },
  'notes.ph.kids':     { en: "e.g. Ann's first year — born 14 March 2023. We'd love to see the early mornings, first smiles, and bath time chaos.",
                         de: 'z. B. Anns erstes Jahr, geboren am 14. März 2023. Wir hätten gern die frühen Morgen, das erste Lächeln und das Chaos beim Baden.' },
  'notes.ph.love':     { en: 'e.g. Our wedding day — 14 June 2026, Vienna. The vows, the first dance, and everyone we love in one room.',
                         de: 'z. B. Unser Hochzeitstag, 14. Juni 2026, Wien. Das Eheversprechen, der erste Tanz und alle, die wir lieben, in einem Raum.' },
  'notes.ph.wedding':  { en: 'e.g. Our wedding day, 12 June 2025, Vienna. Ceremony at 4pm, dancing until 2am.',
                         de: 'z. B. Unser Hochzeitstag, 12. Juni 2025, Wien. Trauung um 16 Uhr, Tanz bis 2 Uhr früh.' },
  'notes.ph.travel':   { en: 'e.g. Six weeks in Patagonia, autumn 2023. Torres del Paine circuit, dawn to dusk.',
                         de: 'z. B. Sechs Wochen in Patagonien, Herbst 2023. Die Torres-del-Paine-Runde, von früh bis spät.' },
  'notes.ph.adventures': { en: 'e.g. Six weeks in Patagonia, autumn 2023. Torres del Paine circuit, dawn to dusk.',
                         de: 'z. B. Sechs Wochen in Patagonien, Herbst 2023. Die Torres-del-Paine-Runde, von früh bis spät.' },
  'notes.ph.milestone': { en: "e.g. Dad's 70th — four decades of adventures, from Vienna to New Zealand.",
                         de: 'z. B. Papas 70. Geburtstag: vier Jahrzehnte Abenteuer, von Wien bis Neuseeland.' },
  'notes.ph.fallback': { en: 'e.g. A summer in the south of France, August 2024. Three families, one house, too many rosés.',
                         de: 'z. B. Ein Sommer in Südfrankreich, August 2024. Drei Familien, ein Haus, zu viel Rosé.' },
  'notes.ph.joyride':  { en: 'e.g. Joyful summer in Italy, July 2026. Gelato in Rome, a week on the Amalfi coast, and long dinners outside.',
                         de: 'z. B. Ein fröhlicher Sommer in Italien, Juli 2026. Gelato in Rom, eine Woche an der Amalfiküste und lange Abendessen im Freien.' },
  'notes.ph.laguna':   { en: 'e.g. Two weeks in Greece, August 2026. Island ferries, long swims, and dinner after dark.',
                         de: 'z. B. Zwei Wochen in Griechenland, August 2026. Inselfähren, lange Schwimmrunden und Abendessen nach Sonnenuntergang.' },
  'notes.ph.heirloom': { en: 'e.g. Our wedding day — 14 June 2026, Vienna. The vows, the first dance, and everyone we love in one room.',
                         de: 'z. B. Unser Hochzeitstag, 14. Juni 2026, Wien. Das Eheversprechen, der erste Tanz und alle, die wir lieben, in einem Raum.' },

  // ── Add-on note placeholders ──
  'addon.ph.firstWords':   { en: 'e.g. Mama, Dada, water, dog — in the order they arrived',
                             de: 'z. B. Mama, Papa, Wasser, Hund – in der Reihenfolge, in der sie kamen' },
  'addon.ph.anniversary':  { en: 'e.g. First date: Rome, 2018 · Engaged: Lisbon, 2021 · Married: Vienna, 2023',
                             de: 'z. B. Erstes Date: Rom, 2018 · Verlobt: Lissabon, 2021 · Geheiratet: Wien, 2023' },
  'addon.ph.timeline':     { en: "e.g. Any key dates you'd like on the timeline — first crawl, first step, first tooth",
                             de: 'z. B. Wichtige Daten für den Zeitstrahl: erstes Krabbeln, erster Schritt, erster Zahn' },
  'addon.ph.funnyWords':   { en: 'e.g. Noooo, More!, Biiiig, Why?, Pease (please), Up-up',
                             de: 'z. B. Neiiin, Mehr!, Groooß, Warum?, Bitteee, Hoch-hoch' },
  // The three inline examples above the funny-words rows.
  'addon.eg':              { en: 'e.g. ',                  de: 'z. B. ' },
  'addon.word.ex1':        { en: 'Noooo',                  de: 'Neiiin' },
  'addon.word.ex2':        { en: 'More!',                  de: 'Mehr!' },
  'addon.word.ex3':        { en: 'Biiiig',                 de: 'Groooß' },

  // ── Newborn composed texts (starting point; staff can edit in the engine) ──
  // Grammar note: German adjective endings agree with the noun's gender, so the
  // closing line cannot be built by lowercasing the customer's word the way
  // English does. `compose.introBoy` / `compose.introGirl` carry the whole line.
  'compose.intro':     { en: 'On {date} at {time},\nyou came into the world.\n\nMommy and Daddy were waiting for you,\nand when we finally met you,\nwe both had tears of happiness.\n\nYou weighed {weight} and were {length} long.\n\n',
                         de: 'Am {date} um {time} Uhr\nkamst du auf die Welt.\n\nMama und Papa haben auf dich gewartet,\nund als wir dich endlich sahen,\nhatten wir beide Tränen des Glücks.\n\nDu wogst {weight} und warst {length} groß.\n\n' },
  'compose.introBoy':  { en: 'Our sweet little {gender}.', de: 'Unser süßer kleiner Junge.' },
  'compose.introGirl': { en: 'Our sweet little {gender}.', de: 'Unser süßes kleines Mädchen.' },
  'compose.labour':    { en: 'Welcome to this world, {name}!', de: 'Willkommen auf dieser Welt, {name}!' },
};
