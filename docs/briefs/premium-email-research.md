# Research: Premium email design — best practices + tooling

**Date:** 2026-07-03 (session 104)
**For:** deciding how to build Aevia's transactional/account emails (order confirmation, payment received, post-payment, Firebase signup verification) so they feel premium/editorial, not generic.

## Topic 1 — What makes a transactional email feel premium

**The Papier/Artifact Uprising standard isn't more decoration — it's restraint + craft.** Artifact Uprising's post-purchase email reads as "a warm handshake": muted palette, generous white space, a genuine thank-you tone, and content that goes beyond the transaction (photography tips, community) rather than a bare receipt [Emma — Anatomy of an Email: Artifact Uprising](https://myemma.com/blog/anatomy-of-an-email-artifact-uprising/). That maps directly onto Aevia's existing brand language (serif type, off-white/near-black, "fewer choices, done well").

**Practical checklist, ranked by impact:**

1. **One clear job per email.** Transactional emails are a "micro-task" pattern customers should recognize instantly — order number, status, one CTA. Don't decorate past that job [Brevo — Transactional Email Design](https://www.brevo.com/blog/transactional-email-design-examples/).
2. **Calm, direct copy.** No cleverness in subject lines or body copy — people are skimming to confirm what happened [Moosend — Transactional Email Best Practices](https://moosend.com/blog/transactional-email-best-practices/). This aligns with the project's existing stop-slop rule.
3. **Mobile-first, single column.** 65–70% of opens are mobile; body text ≥16px, tap targets ≥44×44px [Omnisend — Email Design Best Practices](https://www.omnisend.com/blog/email-design-best-practices/).
4. **Keep total HTML under ~102KB.** Gmail clips anything larger, hiding whatever's below the clip point [MoEngage — HTML Guidelines](https://www.moengage.com/docs/user-guide/campaigns-and-channels/email/deliverability/best-practices/best-practices-to-be-followed-within-an-email-body-html-guidelines). Aevia's current templates (logo + one summary box) are well under this; watch this budget if imagery is added later (e.g. a book-cover photo in the confirmation email).
5. **Text-to-image ratio ~60:40, favouring text.** Image-heavy emails read as more "spammy" to modern filters, and accessibility (alt text, contrast) is now itself a deliverability signal at Gmail/Yahoo/Apple [Litmus — Email Accessibility Guide](https://www.litmus.com/blog/ultimate-guide-accessible-emails); [Enchant Agency — Dark Mode 2026](https://www.enchantagency.com/blog/dark-mode-email-design-best-practices-css-guide-2026).
6. **Design for dark mode explicitly.** Apple Mail inverts aggressively, Gmail partially, Outlook barely at all — so logos/icons need to stay legible either as SVG-safe assets or with an explicit light background lock, not assumed white-on-white [Enchant Agency, same source].
7. **Verification/signup emails should be the shortest of all** — 3-4 lines, one big button, sent from a distinct transactional address (not a marketing one) [Designmodo — Verification Emails](https://designmodo.com/verification-emails/); [Stripo — Verification Email Guide](https://stripo.email/blog/the-complete-guide-to-writing-effective-verification-emails/).
8. **4.5:1 text contrast minimum** for body copy, 3:1 for large text — worth checking Aevia's `#999`-on-white footer text against this bar.

**Bottom line:** Aevia's *existing* order-confirmation email (logo header, off-white box, serif body, single CTA-less summary, calm copy) already follows almost all of these principles structurally. The gap to "premium" isn't architecture — it's polish: better spacing rhythm, a touch of imagery (e.g. a small cover-photo thumbnail once an order has one), and consistent application across all three templates + the new Firebase email, not a redesign from zero.

## Topic 2 — Tooling: is MJML still right?

Four categories of tool exist: **code frameworks** (MJML, Maizzle, React Email) for developers, **drag-and-drop visual builders** (Stripo, BEE, Unlayer) for non-technical users, **testing platforms** (Litmus), and **embeddable editors** (Unlayer, Chamaileon) for SaaS products [Sequenzy — Best HTML Email Builders 2026](https://www.sequenzy.com/blog/best-html-email-builders).

Evaluated against Aevia's actual constraints:

| Constraint | MJML | React Email | Maizzle | Stripo/BEE/Unlayer |
|---|---|---|---|---|
| No build pipeline in the stack | ✅ compile-once via free web playground, paste static HTML | ❌ needs Node/React tooling to render | ❌ needs a build step (Tailwind + build system) | ✅ pure drag-and-drop, exports HTML |
| Non-technical owner can tweak later | ⚠️ needs someone who can edit MJML tags | ❌ needs a developer | ❌ needs a developer | ✅ visual editor, no code |
| Near-zero budget | ✅ free (playground/CLI) | ✅ free (open source) | ✅ free (open source) | ⚠️ free tiers exist but cap features/branding (BEE, Unlayer) or watermark (Stripo free tier has limits) |
| Output = static HTML string for nodemailer | ✅ direct fit | ⚠️ possible but adds a render step to the toolchain | ✅ direct fit | ✅ direct fit |
| Outlook/legacy client compatibility | ✅ mature MSO handling | ⚠️ weaker on legacy Outlook | ✅ mature MSO handling | ✅ (varies by tool, generally solid) |

Sources: [BuildPilot — React Email vs MJML vs Maizzle 2026](https://trybuildpilot.com/688-react-email-vs-mjml-vs-maizzle-2026); [Websyro — Email Development 2026](https://www.websyro.com/blogs/email-development-frameworks-mjml-maizzle-react-email-resend); [Designmodo — MJML Alternative](https://designmodo.com/postcards/mjml/).

**Recommendation: keep MJML, but change how it's used.**

- MJML remains the best technical fit — it's the only option that's simultaneously free, requires zero new runtime dependency, and compiles straight to the static HTML string `functions/email.js` already expects. This doesn't change just because the design bar moved from "deliverable" to "premium" — MJML's ceiling is high enough (it's what many premium DTC brands' agencies use under the hood) that the *tool* was never the limiting factor.
- The real gap the research surfaces: **MJML alone doesn't give Evgeny (non-technical) a way to preview/tweak layout without editing tags.** One practical fix: keep authoring in MJML for the actual send-path HTML (correctness, Outlook-safety, no new dependency), but *design/preview* visually first in a free tool like **BEE Free** or **Stripo's free tier** (drag-and-drop, no login-locked paywall for basic use) to nail the *look* collaboratively with Evgeny/Kseniia, then hand-translate the agreed layout into MJML for the actual production template. This avoids adding BEE/Stripo as a production dependency while still letting a non-developer participate in design decisions.
- Don't switch to React Email — it would add a build/render step to a Functions codebase that deliberately has none (violates the project's "no build tools" rule), for a benefit (nicer developer ergonomics) Aevia doesn't need since there's no dev team maintaining this daily.

## Checklist to apply when building/rebuilding the 4 templates

1. Keep single-column, mobile-first, ≥16px body text, one CTA where relevant (verification link, none needed for pure receipts).
2. Add one small, tasteful image only where it earns its place — e.g. a thumbnail of the customer's own book cover in payment-received/post-payment emails (personal, not stock/decorative) — keep total HTML well under 102KB.
3. Lock light-mode-safe colors on the logo/header block (explicit background color, not "assume white") so dark-mode inversion doesn't break legibility.
4. Verification email: 3-4 lines max, one big button, sent from `noreply@aevia.at` or similar (a distinct transactional identity, not `orders@`).
5. Check footer/fine-print grey text meets 4.5:1 contrast.
6. Author in MJML → compile → paste static HTML into `functions/email.js`, consistent with the existing `FROM` identity pattern. Use a free visual tool (BEE/Stripo) only as a design-preview aid, not production infrastructure.

## Sources

- [Brevo — Transactional Email Design: Examples, Best Practices & Tips](https://www.brevo.com/blog/transactional-email-design-examples/)
- [Moosend — Transactional Email Best Practices](https://moosend.com/blog/transactional-email-best-practices/)
- [Omnisend — 17 Email Design Best Practices for Ecommerce](https://www.omnisend.com/blog/email-design-best-practices/)
- [Emma — Anatomy of an Email: Artifact Uprising](https://myemma.com/blog/anatomy-of-an-email-artifact-uprising/)
- [Designmodo — Guide to Verification Emails](https://designmodo.com/verification-emails/)
- [Stripo — The complete guide to writing effective verification emails](https://stripo.email/blog/the-complete-guide-to-writing-effective-verification-emails/)
- [Litmus — The Ultimate Guide to Email Accessibility in 2026](https://www.litmus.com/blog/ultimate-guide-accessible-emails)
- [Enchant Agency — Dark Mode Email Design Best Practices 2026](https://www.enchantagency.com/blog/dark-mode-email-design-best-practices-css-guide-2026)
- [MoEngage — HTML Email Body Best Practices](https://www.moengage.com/docs/user-guide/campaigns-and-channels/email/deliverability/best-practices/best-practices-to-be-followed-within-an-email-body-html-guidelines)
- [Sequenzy — 21 Best HTML Email Builders in 2026](https://www.sequenzy.com/blog/best-html-email-builders)
- [BuildPilot — React Email vs MJML vs Maizzle (2026)](https://trybuildpilot.com/688-react-email-vs-mjml-vs-maizzle-2026)
- [Websyro — Email Development in 2026: MJML vs Maizzle vs React Email](https://www.websyro.com/blogs/email-development-frameworks-mjml-maizzle-react-email-resend)
- [Designmodo — MJML Alternative: Best No-Code Email Builder](https://designmodo.com/postcards/mjml/)
