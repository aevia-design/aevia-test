# Brief: Artist Collaborations — attribution label + Our Artists page

**Created:** 2026-06-23 (Session 76)
**Objective:** Make Aevia's artist collaborations visible and recruit new artists — surface a quiet "In collaboration with [artist]" credit on collaboration templates, give artists a real home page with the brand's values and bios, and open a working channel for new artists to reach us. The page is a growing roster of collaborators; Kevin Lucbert is the first entry, not the focus.
**Audience:** Aevia customers (provenance / trust signal) and prospective collaborating artists (recruiting). Built and maintained by Claude + Evgeny; form submissions land with Xenia.
**Applicable Standards:** `context/design-principles.md` (brand/UI), `context/style-guide.md` (canonical markup rules), existing `functions/index.js` nodemailer pattern (backend).

## Why

Aevia's whole premise is "a photo book that is a piece of art, not an assembled product," yet nothing on the site says a real artist shaped each template. Wander was co-created with illustrator Kevin Lucbert and that story is currently invisible — losing both a premium "human craft, not AI slop" trust signal and a channel to recruit more artists. This is a real, iterated-upon feature (not a demo prop): it establishes the pattern every future collaboration template will reuse, and the "In collaboration with [artist]" line is the same wording printed on the back of the book, so on-site and on-book credit must match exactly.

## Requirements Extracted from Standards

**From `context/design-principles.md` (and research):**
- [ ] Label is **understated and editorial**, not an e-commerce "collab badge" — a single quiet line near the product title, using the existing small-caps/wide-tracking label treatment; gold `--accent-dk` only if used sparingly.
- [ ] Label sits **near the product title / provenance area**, not buried in the description body.
- [ ] The artist **name** links to the artist's section on `our-artists.html` (on-site), as a subtle text link — NOT a button, NOT a direct outbound Instagram link. Instagram/portfolio lives in the bio.
- [ ] Page uses `--bg` background (never pure white), Georgia serif for headings/editorial moments, system sans 15px/1.6 body, 8px spacing scale, `1160px` inner max-width.
- [ ] Nav + footer copied verbatim from an existing page (consistency); page links the shared `assets/css/mobile.css` and reflows to a single column on mobile.
- [ ] Copy tone: warm, precise, European; short sentences; no exclamation marks; avoid "amazing/stunning" register.
- [ ] No console errors; no horizontal scroll at 375px; passes a `/design-review`.

**From backend pattern (`functions/index.js`):**
- [ ] New callable `submitArtistApplication` mirrors the existing nodemailer transport (Gmail `EMAIL_USER`/`EMAIL_PASS`) and sends to **xenia@aevia.at** (hardcoded recipient for now; documented as "fix later").
- [ ] Server-side validation: required name, valid email, at least one work link; reject empty/malformed with a clear error.
- [ ] Function returns a result the page can turn into an on-page success state; failure surfaces a retry message (no silent "lie" — follow the S40 order-flow honesty rule).
- [ ] No new infra cost: email-only, no file uploads, no new bucket/region. Portfolio is a **link**, not an upload.

## Constraints

- **Format:** new `pages/our-artists.html` (static, plain HTML/CSS/JS — no framework/build); edits to `pages/wander.html` + `pages/collections.html`; new `submitArtistApplication` in `functions/index.js`; new `docs/templates.md` roster.
- **Form fields (exactly):** Name · Email · "Where can we see your work?" (link) · "A few words about you" *(optional)*. No follower counts, no file upload, no extra fields.
- **Attribution scope:** Wander only for now; the markup pattern must be trivially reusable for the next collaboration template (one line per page). Record the artist↔template mapping in `docs/templates.md` as the human-readable source of truth.
- **Copy:** copy is drafted and stop-slop'd (manifesto, Kevin bio, form, success state) — see Context. Compensation line reads "compensated fairly" (NOT royalty-specific — royalty is one model among several). Kevin bio facts come from his site and are final.
- **Page framing:** Our Artists is a **roster that grows** — manifesto, then a list of artist profiles (Kevin first), then the collaborate form. Markup must make adding the next artist a copy-paste block, not a redesign. Do not centre the page on Kevin.
- **Kevin's portrait:** `assets/artists/kevin-lucbert/kevin-lucbert-portrait.jpg` (folder + filename normalised to hyphenated lowercase, S76). Bio links out to Instagram `https://www.instagram.com/kevinlucbert/?hl=en`.
- **Deploy ordering:** backend-first — the Cloud Function must be deployed (Evgeny runs `firebase deploy --only functions:submitArtistApplication`) before the page goes live, or the form errors. Page is customer-facing → reaches Cloudflare only when merged to `main`.
- **Footer link:** Our Artists gets a **permanent footer link** (under "Company") on every page, so it is discoverable site-wide, not only from the Wander credit.
- **Out of scope:** applicant auto-acknowledgement email (later add); additional artist profiles beyond Kevin (the roster structure must support them, but only Kevin is written now); Stripe/order changes; admin UI for applications (Firestore/email is enough for MVP).

## Success Criteria

The deliverable is complete when:
1. Wander product page and its collections card show the "In collaboration with Kevin Lucbert" credit, linking to Kevin's section on `our-artists.html`, in the brand's understated label style.
2. `our-artists.html` renders the manifesto intro, Kevin's bio (with one outbound link), and a working form; submitting it delivers an email to xenia@aevia.at and shows an on-page success state; an invalid submission is rejected with a clear message.
3. `docs/templates.md` lists all current templates and marks Wander as the first artist collaboration (artist + relationship wording).
4. Page passes `/design-review` (desktop + mobile, console clean); all requirements above met.

## References

**Standards:** `context/design-principles.md`, `context/style-guide.md`
**Backend pattern:** `functions/index.js` (nodemailer transport ~line 765; `STAFF_EMAILS` incl. xenia ~line 12; an existing callable like `createUploadSession`/`confirmUpload` for the onCall shape).
**Page patterns:** `pages/wander.html` (label placement near title), `pages/collections.html` (~line 302 Wander card), any product page for nav/footer copy.
**Copy (final, stop-slop'd):** Session 76 conversation — manifesto intro, Kevin bio, form intro, success state. Reproduced below.
**Artist source:** https://kevinlucbert.com/contact-bio (bio), Instagram https://www.instagram.com/kevinlucbert/?hl=en, portrait in `assets/artists/Kevin Lucbert/`.

### Final copy

**Manifesto intro ("The art in your hands"):** Aevia began with one conviction: a photo book can be a piece of art, not a container for pictures. Something made, not assembled. So we work with artists. An illustrator or designer shapes each template, and you feel their hand on every page that holds your photographs. Every collaboration is its own; every book is unique. We believe the work should be paid for. Our artists are compensated fairly for what they make, for as long as their work lives on in the books people order. Whether you are just beginning or long established, we would like to see what you make.

**Kevin Lucbert bio (Berlin & Paris):** Kevin Lucbert was born in Paris in 1985 and works between Berlin and Paris. He graduated from the École Nationale Supérieure des Arts Décoratifs (ENSAD) in 2008. He co-founded the artists' collective The Ensaders with Yann Bagot and Nathanaël Mikles, and he takes part in performances and exhibitions and leads drawing workshops. His clients include The New York Times, The New Yorker, Télérama, Les Échos, the Mondadori Group, Foscarini, Starbucks, Hermès, Hennessy, and BIC. BIC acquired several of his works for its contemporary art collection, shown at the Centquatre in Paris in 2018. He draws inspiration from M. C. Escher, Alfred Kubin, Philippe Mohlitz, and Schuiten and Peeters' *Les Cités obscures*. In his *Blue Lines* series, drawn in blue BIC ballpoint pen, he builds surreal landscapes and frontal, imaginary compositions: a parallel world that is entirely his own. Link: "See Kevin's work →" → Instagram.

**Form intro ("Work with us"):** Whether you are just beginning or long established, we would like to see what you make. Tell us a little about your work — we read every message. *(Fields: Name · Email · Where can we see your work? (link) · A few words about you (optional).)*

**Form success state:** Thank you. We have your work and will be in touch. Every message reaches a real person.

## Context

**Research findings (Session 76):** Credit must be visible at every touchpoint and identically worded (on-book = on-site); understated single-line credit reads premium, loud badge reads cheap; place credit at the provenance/title area; an *opinionated* manifesto is a feature not a risk; publicly stating fair pay/royalty is a genuine differentiator and recruiting signal; minimise form fields and use a portfolio **link** not an upload; show an immediate confirmation state.

**Background decisions already made:**
- Label wording = "In collaboration with" (chosen over "curated by" — it's the back-of-book copy; "co-created" is the relationship but the printed line reads "In collaboration with").
- Badge links to the on-site bio, not Instagram (keeps the discovery loop on-site).
- Form backend is a real Cloud Function (no `mailto:` placeholder).

**Known risks / watch-outs:**
- **Backend-first deploy** is mandatory or the live form errors (carried discipline from S40/S64).
- **Footer is duplicated per page** — adding the "Our Artists" link means editing the footer block on every page that carries it (same pattern as nav). Confirm the link lands on all pages, not just the new one.
- `.claude/settings.local.json` stays out of commits as usual; the stray `sessions/2026-06-23-s71.md` is left alone.

## Resolved decisions (Evgeny, S76)
- Page is a growing roster, not Kevin-centric.
- Bio taken verbatim (facts) from kevinlucbert.com, stop-slop'd for tone.
- Compensation line = "compensated fairly" (not royalty-specific).
- Our Artists gets a permanent footer link.
