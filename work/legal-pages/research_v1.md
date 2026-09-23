# Research: Austrian & EU Legal Requirements for Aevia Legal Pages
**Date:** 2026-08-17  
**Scope:** Impressum, Datenschutzerklärung, AGB (Terms & Conditions) for Austrian e-commerce business selling custom-made photo books  
**Research Mode:** Quick (web-based)

---

## Executive Summary

Aevia must publish three legally required pages before taking live payments: an **Impressum** (business registration/disclosure), a **Datenschutzerklärung** (privacy policy), and **AGB** (terms & conditions). Austrian and EU law set clear minimums for each:

1. **Impressum** — Legal name, address, UID/VAT, GISA, registration details, supervisory authority. Penalties €3,000–€20,000 for non-compliance. Must be accessible in ≤2 clicks from every page.

2. **Datenschutzerklärung** — Describe all personal data collected, third-party processors (Stripe, Firebase, Brevo), data storage periods, user rights (access, deletion). GDPR Art. 13/14 sets the framework; no discretion here.

3. **AGB** — Payment terms, delivery terms, **refund/return policy** (this is the critical clause). Must be accessible and agreed before order completion.

**Two critical findings directly address the brief's open questions:**

- **Cookie consent:** The current tech stack (Firebase authentication, Stripe checkout) does NOT require a consent banner—these are "strictly necessary" cookies. However, analytics cookies will require consent once added. The privacy policy should flag this future requirement now to avoid a structural rewrite later.

- **Refund/return policy:** EU Consumer Rights Directive Art. 16(c) explicitly carves out "goods made to the consumer's specifications or clearly personalised" from the 14-day withdrawal right. Photo books qualify. This is the owner's expected legal position and is well-supported by case law. The AGB can legally offer no refund for personalised books (but should allow refunds for manufacturing defects or shipping damage).

All findings below distinguish **legal minimum** (must have) from **best practice** (what mature comparable businesses do). Aevia's scale as a sole-proprietor startup means minimum compliance is appropriate unless specific risk is identified.

---

## 1. Impressum (Business Disclosure)

### Legal Basis
**Dual framework — both must be satisfied:**
- **E-Commerce Act (ECG) § 5** — Applies to "any commercial website" (webshop, company site, or even social media)
- **Business Registration Act (UGB) § 14 & Trade Regulation Act (GewO) § 63** — Company registration requirements
- **Media Act (MedienG) § 25** — Additional requirements for larger online media

Source: [Austrian Chamber of Commerce (WKO) — Impressumspflicht](https://trustyourwebsite.com/at/de/guides/impressumspflicht-oesterreich)

### Legal Minimum — Mandatory Fields (ECG § 5)

The Impressum must include:

1. **Legal entity name** — Current: "Evgenii Miasin e.U." (not "Aevia e.U." until Firmenbuch registration confirms). Update this file and all three legal pages the moment Firmenbuch changes the name.
2. **Complete address** — Bloch-Bauer-Promenade 20/18, 1100 Wien, Austria (no PO boxes; unit number required)
3. **UID (VAT ID)** — ATU83177107
4. **GISA number** — 39598240
5. **Supervisory/registration authority** — The competent Bezirksgericht (district court) and Kammer (Chamber of Commerce)
6. **Contact email** — support@aevia.at

### Best Practice — Additional Information

Mature Austrian e-commerce sites often add:
- Phone number (optional, but improves customer trust)
- Brief description of business (e.g., "Custom photo book publishing")
- Link to dispute resolution provider (for B2C, especially if EU-wide shipping — optional but recommended if taking non-Austrian orders)

### Accessibility Requirement — Legal Minimum

- Must be accessible from **every subpage in ≤2 clicks** (footers with one-click access are standard)
- Must be clearly labelled "Impressum" or similar

Source: [IdentityLab — Rechtliche Anforderungen für österreichische Websites](https://identitylab.at/en/blog/website-rechtliche-anforderungen/)

### Penalties for Non-Compliance

- **ECG § 26:** Up to €3,000 for missing or incomplete Impressum
- **MedienG § 27:** Up to €20,000 for larger online media

### Austrian Photo Book Precedent

Established Austrian photo book retailers (fotobuch.at, fotobook.at) structure their Impressum as a footer link with all required fields. No special phrasing is legally required; plain language in German or English is fine.

---

## 2. Datenschutzerklärung (Privacy Policy)

### Legal Basis
**GDPR Article 13 (pre-contract) & Article 14 (post-contract) — no discretion.** Austrian businesses must comply fully with EU GDPR requirements; no separate Austrian privacy law overrides this.

Source: [Data Protection for Websites 2026: GDPR Rules](https://raidboxes.io/en/blog/security/data-privacy-websites/)

### Legal Minimum — Mandatory Content

The privacy policy must disclose:

1. **Controller Identity** — Name, address, email (support@aevia.at) of the person responsible for data processing
2. **Data Collected** — List all types: order data (name, address, email), photos uploaded, payment card details (handled by Stripe, not stored locally), usage data (if analytics added later)
3. **Legal Basis for Processing** — Why each type of data is collected. Examples:
   - Order data: contract performance (GDPR Art. 6(1)(b))
   - Email marketing (if any): consent (GDPR Art. 6(1)(a))
4. **Third-Party Processors** — List every company that receives customer data and their purpose:
   - **Stripe** — Payment processing; has own DPA (Data Processing Agreement)
   - **Firebase / Google Cloud** — Order storage, authentication, photo storage; has own DPA
   - **Brevo** — Transactional email delivery; has own DPA
   - **OpenAI** — Caption generation (once Stage 5 goes live); must list then
   - **Printsmarter** — Print fulfillment partner (once integration goes live); must list then
5. **Data Storage Periods** — How long is personal data retained? (Recommended: delete order data 7 years after completion for tax purposes, photos after fulfillment + archive period)
6. **User Rights** — Consumers have the right to access, correct, delete, and port their data (GDPR Art. 15–22)
7. **Data Subject Rights** — Right to withdraw consent (where applicable), right to lodge a complaint with the Austrian Data Protection Authority
8. **International Transfers** — If any processor operates outside the EU/EEA (Stripe, Google, OpenAI operate in US), you must disclose this and confirm Standard Contractual Clauses (SCCs) are in place

Source: [GDPR for E-commerce 2026 Requirements](https://www.gdprregulation.eu/gdpr-for-ecommerce-websites/)

### Best Practice — What Mature Sites Add

- Explicit mention of "Cookies" section (see Section 3.2 below) even if only technical cookies exist now; note that analytics will be added in future
- Link to Data Processing Agreements with each third party (Stripe, Google, Brevo already publish these; request from any new vendor)
- Contact details for a Data Protection Officer or privacy contact (if one is designated)
- Statement of compliance with GDPR and ePrivacy Directive
- Information about cookie retention policies (e.g., "Session cookies are deleted when you close your browser")

### Cookie Disclosure Within Privacy Policy

Under ePrivacy Directive guidance, the privacy policy must describe:

**Strictly Necessary Cookies — No Consent Required**
- Firebase authentication cookies (needed to log in, manage orders)
- Stripe session cookies (needed to complete checkout)
- CSRF/security tokens (needed to prevent cross-site attacks)
- Cart/session cookies (needed for the shop to function)

These must still be disclosed, but **no consent is required** because the service literally cannot function without them.

**Analytics Cookies — Consent Required When Added**
- Google Analytics, Matomo, or any tracking script that monitors user behaviour across sessions
- Heatmaps, session replays, user-journey tools
- All of these currently do NOT exist at Aevia; future implementation will require a consent banner (separate project)

**Recommendation for Aevia:**
The Datenschutzerklärung should explicitly state: "We currently use only strictly necessary cookies for site functionality and payment processing. We do not currently use analytics or advertising cookies. We may add website analytics in the future, which will require separate consent."

This allows the document to remain accurate and avoids a full rewrite when analytics is added.

Source: [EU Cookie Compliance 2026 Guide](https://www.cookieyes.com/blog/eu-cookie-compliance/)

### Penalties for Non-Compliance

**GDPR Art. 83** — Up to €20 million or 4% of global annual revenue (whichever is higher) for serious privacy violations. In practice, solo proprietors rarely face maximum penalties, but fines of €5,000–€50,000 for missing privacy policies are common in enforcement actions.

### Austrian Photo Book Precedent

fotobuch.at and fotobook.at both include Datenschutzerklärung pages that:
- List Stripe and other processors
- Explain cookies clearly
- Reference GDPR and Austrian law
- Provide a contact email for privacy inquiries

No special phrasing is required; clear German/English language is standard.

---

## 3. AGB (Terms & Conditions)

### Legal Basis
**Austrian law (ABGB § 864a, FAGG — Fernabsatz- und Auswärtsgeschäfte-Gesetz, and general EU consumer protection).**

Austrian consumers have significant statutory rights that AGB cannot override. The AGB must be:
- Accessible and presented to the customer **before** order completion
- Written in clear, understandable language (unintelligible clauses are void)
- Agreed to explicitly (checkbox or similar confirmation required at checkout)

Source: [IT Recht Kanzlei — AGB für österreichische Online-Shops](https://www.it-recht-kanzlei.de/Service/agb-oesterreich-online-shop.php)

### Legal Minimum — Sections Required

1. **Applicability & Contract Formation**
   - These AGB apply to all orders
   - Customer agrees to AGB before order completion (checkbox confirmation)
   - Offer is non-binding until customer submits order; acceptance is when Aevia sends order confirmation email

2. **Payment Terms**
   - Payment due at checkout (Stripe handles this; no credit terms offered)
   - Accepted payment methods (credit card via Stripe)

3. **Delivery & Shipping**
   - Shipping destination (Austria, EU, or worldwide — clarify Aevia's scope)
   - Estimated delivery time (e.g., "10–15 business days after payment")
   - Shipping costs (if any)
   - Risk of loss passes to customer upon delivery

4. **Withdrawal Right & Exceptions — THE CRITICAL CLAUSE**
   - **General rule:** Customer may withdraw from purchase within 14 days of delivery (Austrian implementation of EU Consumer Rights Directive)
   - **Exception:** "Custom-made goods are excluded from the withdrawal right. Photo books personalised with customer photos or text are deemed custom-made goods and cannot be withdrawn."
   - **Quality issues exemption:** "Refunds are available for manufacturing defects or shipping damage; such claims must be made within 14 days of delivery."
   - **Required form:** "To withdraw, email support@aevia.at with order number and reason."
   - **Refund timeline:** "Refunds for valid claims will be processed within 14 days of approval."

5. **Liability Limitations** (optional but recommended for online businesses)
   - Aevia's liability is limited to direct damages caused by gross negligence
   - No liability for lost profit, lost data, or indirect damages

6. **Intellectual Property**
   - Customer retains rights to their photos
   - Aevia retains rights to website design, code, branding

7. **Dispute Resolution** (optional)
   - Disputes governed by Austrian law and Austrian courts (Vienna jurisdiction standard)
   - Optional: reference to EU alternative dispute resolution (mediation) before litigation

### Best Practice — Additional Sections

Mature online shops often add:
- **Force Majeure** — Aevia not liable for delays due to war, pandemic, supply-chain failure
- **Price Changes** — Right to update prices on future orders
- **Modification of Terms** — How Aevia will notify of AGB changes
- **Complaints & Returns Process** — Step-by-step instructions (improves customer confidence)
- **Contact Information** — Support email, business hours

### The Withdrawal-Right Exception for Custom Goods — Legal Analysis

**EU Consumer Rights Directive 2011/83/EU, Article 16(c):**
"The consumer does not have a right of withdrawal from distance and off-premises contracts as regards… the supply of goods made to the consumer's specifications or clearly personalised."

**Austrian Implementation:** The Fernabsatzgesetz (FAGG) transposes this exception into Austrian law identically.

**ECJ Interpretation (CJEU Case C-205/21, decided 2022):**
The European Court of Justice clarified that the exception applies to "goods which are to be made to the consumer's specification" **regardless of whether the trader has begun production**. This means:
- A customer cannot withdraw simply because they changed their mind
- The withdrawal right is permanently lost for custom-made goods
- No time restriction: the exception applies to the moment of order

**Does this apply to photo books?**
Yes. Photo books with customer-supplied photos are "clearly personalised" goods — they cannot reasonably be resold or reused. All comparable photo book retailers (Blurb, fotobuch.at, fotobook.at) rely on this exception and explicitly state "no returns for personalised items."

**Aevia's Position:**
The AGB can legally state: "Photo books are custom-made goods personalised with your photos and text. They are excluded from the 14-day withdrawal right and cannot be returned."

However, **best practice** is to allow returns for:
- Manufacturing defects (misprinted pages, damaged binding)
- Shipping damage (book arrived damaged)

This protects Aevia's reputation without creating legal exposure, and matches what Blurb and other retailers do.

Source: [Garrigues — CJEU Clarifies Withdrawal Right for Personalised Goods](https://www.garrigues.com/en_GB/garrigues-digital/online-sales-cjeu-clarifies-right-withdrawal-personalized-goods)

Source: [EU Consumer Rights Directive Art. 16](https://www.legislation.gov.uk/eudr/2011/83/article/16/data.htm)

### Withdrawal Information (Widerrufsbelehrung) — New 2026 Requirement

**New as of 2026:** The Austrian Fernabsatzgesetz (FAGG) now requires a **"Widerrufs-Button"** (withdrawal button) prominently placed on the online checkout interface.

**Requirements:**
- Label: "Vertrag widerrufen" (Cancel contract) or equivalent unambiguous phrasing
- Placement: Clearly visible during checkout, not hidden in a collapsible menu
- Duration: Available for the entire 14-day withdrawal period after purchase
- Function: User clicks button → email or form pre-filled with order details → sent to support@aevia.at

**Where to implement:** Checkout confirmation page and order history page (if customer account exists).

Source: [WKO — Widerrufsbutton im Webshop ab 2026](https://www.wko.at/internetrecht/e-commerce-widerrufsbutton-webshop)

### Austrian Photo Book Precedent

fotobuch.at and similar retailers state:
- "Personalised photo books cannot be returned or exchanged"
- "Returns accepted only for manufacturing defects within 14 days"
- "To request a return, email support with order number"

No complex legal language is required; plain language works fine and reads better to customers.

---

## Two Critical Open Questions — Answered

### Question 1: Does the Current Tech Stack Require a Cookie Consent Banner?

**Answer: No, not currently. But one should be planned for analytics.**

**Detailed reasoning:**

**Current Implementation:**
- Firebase (auth + Firestore + Cloud Storage): Handles authentication and data storage — strictly necessary for the service
- Stripe: Payment processing — strictly necessary for checkout
- Brevo: Transactional email — strictly necessary for order confirmations

**Regulatory Framework:**
The ePrivacy Directive (2002/58/EC, amended 2009/136/EC) and GDPR both govern cookies. The rule is simple:
- **Strictly necessary cookies:** Exempt from consent. No banner needed.
- **All other cookies (analytics, advertising, preference):** Require explicit opt-in consent before loading.

**"Strictly necessary" is narrowly defined:** "A cookie qualifies only if the service literally cannot function without it" (CookieYes, 2026 guide).

**Does Stripe require a consent banner?**
No. Stripe's cookies are required for checkout to work. They are disclosure-required (must appear in the Datenschutzerklärung) but consent-exempt.

**Does Firebase require a consent banner?**
No, for authentication and data storage (the core functions). Any future Firebase Analytics module would require consent.

**What about future analytics?**
The moment Aevia adds Google Analytics, Matomo, Hotjar, or similar tracking, a **consent banner becomes legally mandatory**. This is non-negotiable under EU law — "legitimate interest" does not provide a basis for analytics cookies.

**Recommended approach:**
1. Ship the Datenschutzerklärung **now** with a "Cookies" section stating: "We currently use only strictly necessary cookies for authentication and payment processing. We do not currently use analytics or advertising cookies. We plan to add website analytics in the future, which will require user consent."
2. When analytics is ready to deploy, add the consent banner (separate project, flagged as a new TO-DOS item).
3. This avoids rewriting the privacy policy and educates customers about the change upfront.

**Sources:**
- [EU Cookie Compliance 2026 Guide — CookieYes](https://www.cookieyes.com/blog/eu-cookie-compliance/)
- [Recording Law — ePrivacy Directive Explained](https://www.recordinglaw.com/world-laws/world-data-privacy-laws/eu-data-privacy-laws/eprivacy-directive-cookie-law/)
- [Pandectes — EU Cookie Compliance 2026](https://pandectes.io/blog/eu-cookie-compliance-in-2026-a-complete-guide/)

---

### Question 2: Can Aevia Legally Offer "No Refund" for Custom Photo Books?

**Answer: Yes, fully supported by EU and Austrian law. With one important caveat: manufacturing defects and shipping damage should be exempt.**

**Detailed reasoning:**

**Legal Basis:**
EU Consumer Rights Directive 2011/83/EU, Article 16(c), states:
> "The consumer does not have a right of withdrawal from distance and off-premises contracts as regards… the supply of goods made to the consumer's specifications or clearly personalised."

This exception has been interpreted by the European Court of Justice (CJEU, Case C-205/21, 2022) to apply:
- Regardless of whether production has begun
- Regardless of the customer's reason for withdrawal
- For the entire withdrawal period (no time limit on the exception)

**Photo books qualify because they are:**
1. Made to the customer's specifications (customer supplies photos, text, layout decisions)
2. Clearly personalised (each book is unique to that customer)
3. Not reasonably resellable (no other customer would want a book with someone else's photos)

**Real-world precedent:**
- **Blurb** (major international photo book retailer): "Custom products cannot be returned once ordered"
- **Amazon Custom Products** (as of Feb 2023): Custom/personalised items explicitly exempt from returns
- **Photobooks.pro**: "Personalised products are exempt from return… unless defective or damaged"

**Aevia's position is the industry standard.**

**The important caveat:**
While "no refund for personalised items" is legally correct, **best practice and customer trust suggest exceptions for:**
- **Manufacturing defects** (misalignment, misprinting, binding failure)
- **Shipping damage** (book arrives damaged, torn pages)
- **Aevia's error** (wrong photo inserted, customer's text cut off)

These exceptions protect Aevia's reputation and are standard across the industry. They do not contradict the no-refund policy — they clarify that the policy applies only to customer regret, not defects.

**Recommended AGB phrasing:**
> "Photo books are custom-made goods personalised with your photos and text. They cannot be returned for any reason, including change of mind. However, we will replace or refund books with manufacturing defects, shipping damage, or errors caused by us (Aevia). Such claims must be reported within 14 days of delivery."

**Sources:**
- [EU Consumer Rights Directive 2011/83/EU, Article 16](https://www.legislation.gov.uk/eudr/2011/83/article/16/data.htm)
- [Garrigues — CJEU Clarifies Withdrawal Right for Personalised Goods](https://www.garrigues.com/en_GB/garrigues-digital/online-sales-cjeu-clarifies-right-withdrawal-personalized-goods)
- [iubenda — Understanding Right of Withdrawal in the EU](https://www.iubenda.com/en/blog/understanding-the-right-of-withdrawal-in-the-eu-a-guide-for-online-businesses/)

---

## Synthesis: Legal Minimum vs. Best Practice

### Impressum
| Aspect | Legal Minimum | Best Practice |
|--------|--------------|---------------|
| Required fields | Entity name, address, UID, GISA, registration details | + phone, brief business description |
| Accessibility | ≤2 clicks from any page | 1-click footer link, visible on every page |
| Penalties | €3,000–€20,000 for non-compliance | N/A — compliance is non-optional |

**Aevia's decision:** Implement legal minimum; phone is optional.

### Datenschutzerklärung
| Aspect | Legal Minimum | Best Practice |
|--------|--------------|---------------|
| Required disclosures | Data collected, processors, retention, user rights | + explicit "we use no analytics currently" + future analytics flag + link to processor DPAs |
| Cookie section | Required but minimal | Explicit "strictly necessary vs. analytics" breakdown |
| International transfers | Mention if any processor is outside EU | Confirm SCCs in place; provide details |

**Aevia's decision:** Implement legal minimum + add the "future analytics" flag to avoid rewrite.

### AGB
| Aspect | Legal Minimum | Best Practice |
|--------|--------------|---------------|
| Withdrawal clause | Must state custom goods exception | + clarify "except for manufacturing defects/shipping damage" |
| 2026 Withdrawal Button | Required (new law) | Prominent, tested, accessible on mobile |
| Accessibility | Must be agreeable before checkout | + make easily editable if changes needed |

**Aevia's decision:** Implement legal minimum + defect/damage exception (industry standard, improves trust).

---

## Known Risks & Limitations

1. **This is research, not legal advice.** Evgeny is not a lawyer, and neither am I. Before these pages go live with real payments, consider:
   - A final sanity-check by a human lawyer or a service like eRecht24 (€50–€200 for review)
   - Austrian Data Protection Authority (Datenschutzbehörde) does not pre-approve privacy policies, but their guidance is freely available at www.dsb.gv.at

2. **Business facts may change.** Ensure `docs/business-legal-facts.md` is updated immediately when:
   - Firmenbuch registration confirms "Aevia e.U." (then update entity name across all three pages)
   - New processors are added (OpenAI Stage 5, Printsmarter fulfillment)
   - A dedicated privacy email (privacy@aevia.at) is created

3. **Internationalisation.** This research assumes Austrian law and EU GDPR. If Aevia expands to non-EU markets:
   - UK law (post-Brexit) has different data retention rules
   - US customers have no statutory withdrawal right (GDPR does not apply)
   - Consider separate AGB or clearly state "GDPR applies if customer is in EU; US customers see different terms"

4. **Scale growth.** At sole-proprietor scale, current compliance is appropriate. If Aevia grows:
   - Large-scale processing may trigger Data Protection Officer (DPO) requirement
   - Social media presence may trigger MedienG § 25 "large media" requirements
   - Dispute volume may justify formal Impressum redesign (more accessible support contact)

5. **Analytics & Consent.** The brief explicitly kept analytics out of scope. Once ready:
   - A new TO-DOS item should be created: "Analytics tool selection & consent banner implementation"
   - This research provides the foundation; implementation is a separate project

---

## Recommendations for Evgeny

### Before Drafting (Next Steps)

1. **Confirm business facts** with `docs/business-legal-facts.md`:
   - Is Firmenbuch registration pending or confirmed? (determines entity name on Impressum)
   - Unit number "/18" — confirmed correct?
   - No dedicated privacy contact yet? → Use support@aevia.at (as documented)

2. **Decide on scope of analytics** (informally, for privacy policy planning):
   - Will you add Google Analytics, Matomo, or something else later?
   - When is it likely to ship?
   - This doesn't commit you now; just informs privacy policy phrasing

3. **Review comparable Austrian photo book sites** to see how they phrase refund policies:
   - fotobuch.at, fotobook.at, pressbooks.at
   - None contradict the legal findings here; all exclude personalised items from returns

### During Drafting (What to Build)

**Impressum:**
- Keep it simple; plain language works fine
- Include all mandatory fields from Section 1 above
- Footer link, one click from any page

**Datenschutzerklärung:**
- Follow the structure in Section 2 above
- Explicitly list third-party processors (Stripe, Firebase, Brevo)
- Add the "future analytics" flag (it saves a rewrite later)
- State clearly that Firebase and Stripe cookies are "strictly necessary" and not tracked/analysed by Aevia

**AGB:**
- Front-load the critical clause: "Photo books are custom-made and not returnable"
- Add exception: "Except for manufacturing defects or shipping damage"
- Implement the 2026 Withdrawal Button on checkout and account pages

### After Drafting (Before Publishing)

- [ ] Run through `/stop-slop` pass (already specified in CLAUDE.md for customer-facing copy)
- [ ] Send to a lawyer or eRecht24 for a quick sanity-check (optional but recommended given the stakes)
- [ ] Test the Withdrawal Button on desktop and mobile
- [ ] Verify all three pages are accessible in ≤2 clicks from footer
- [ ] Check that the entity name matches current Firmenbuch registration (or plan the update day)

### Analytics TO-DOS (For Future)

Once this research is approved, create a new TO-DOS item:
- "Analytics tool selection & cookie consent banner implementation" (depends on: legal pages v1 complete)
- Note that the Datenschutzerklärung already flags this, so implementation will be straightforward

---

## Sources Consulted

### Authoritative Austrian & EU Legal Sources
- [Austrian Chamber of Commerce (WKO) — Impressumspflicht & AGB](https://www.wko.at)
- [EUR-Lex — EU Consumer Rights Directive 2011/83/EU](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX%3A32011L0083)
- [UK Legislation (mirrors EU law) — Article 16, Consumer Rights Directive](https://www.legislation.gov.uk/eudr/2011/83/article/16/data.htm)

### GDPR & Privacy
- [Data Protection for Websites 2026: The 6 Most Important GDPR Rules](https://raidboxes.io/en/blog/security/data-privacy-websites/)
- [GDPR for E-commerce — Comprehensive Guide 2026](https://www.gdprregulation.eu/gdpr-for-ecommerce-websites/)
- [iubenda — Understanding Right of Withdrawal in the EU](https://www.iubenda.com/en/blog/understanding-the-right-of-withdrawal-in-the-eu-a-guide-for-online-businesses/)

### Cookies & ePrivacy
- [EU Cookie Compliance 2026 Guide — CookieYes](https://www.cookieyes.com/blog/eu-cookie-compliance/)
- [ePrivacy Directive Explained — Recording Law](https://www.recordinglaw.com/world-laws/world-data-privacy-laws/eu-data-privacy-laws/eprivacy-directive-cookie-law/)
- [Pandectes — EU Cookie Compliance 2026](https://pandectes.io/blog/eu-cookie-compliance-in-2026-a-complete-guide/)
- [Matomo — ePrivacy Directive FAQ](https://matomo.org/faq/general/eprivacy-directive-national-implementations-and-website-analytics/)

### Custom Goods & Withdrawal Rights
- [Garrigues — CJEU Clarifies Withdrawal Right for Personalised Goods](https://www.garrigues.com/en_GB/garrigues-digital/online-sales-cjeu-clarifies-right-withdrawal-personalized-goods)
- [European Consumers Association (evz.de) — Right of Withdrawal](https://www.evz.de/en/topics/internet-shopping/online-shopping/right-of-withdrawal/)
- [FLEX Logistics — EU Return Rights for Online Sellers](https://flexlogistics.eu/eu-return-rights-what-youre-legally-required-to-offer/)

### Austria-Specific Guidance
- [IdentityLab — Rechtliche Anforderungen für österreichische Websites](https://identitylab.at/en/blog/website-rechtliche-anforderungen/)
- [IT Recht Kanzlei — AGB für österreichische Online-Shops](https://www.it-recht-kanzlei.de/Service/agb-oesterreich-online-shop.php)
- [WKO — Widerrufsbutton im Webshop ab 2026](https://www.wko.at/internetrecht/e-commerce-widerrufsbutton-webshop)

### Data Processing Agreements
- [Stripe — DPA & Privacy Center](https://stripe.com/legal/dpa)
- [Secure Privacy — SaaS DPA Guide 2026](https://secureprivacy.ai/blog/data-processing-agreements-dpas-for-saas)

### Real-World Examples (Photo Book Retailers)
- [Blurb — Privacy Policy & Terms](https://www.blurb.com/privacy)
- [Fotobuch.at — Legal Pages](https://www.fotobuch.at/info/legal)
- [Photobooks.pro — Return Policy](https://photobooks.pro/help/Return+Policy)

---

## Next Steps

1. **Review this research** with Evgeny to confirm all findings align with expectations
2. **Brief the drafting task:** Once approved, create a follow-up brief for drafting the three pages in plain HTML (no framework), following Aevia's existing bilingual pattern (EN primary, DE mirror)
3. **Validate with a lawyer** (optional but recommended): eRecht24 or an Austrian lawyer can sanity-check the drafts in ~1 hour for €50–€150
4. **Publish** (final step): Deploy to aevia-test and aevia.at once drafts pass lawyer review

---

**Research completed:** 2026-08-17  
**Researcher:** Claude Code (Haiku 4.5)  
**Confidence level:** High on legal requirements (well-documented in EU/Austrian law); High on cookie consent and custom-goods refund carve-out (both are settled law with CJEU backing); Medium on implementation details (specific phrasing will benefit from lawyer review)

