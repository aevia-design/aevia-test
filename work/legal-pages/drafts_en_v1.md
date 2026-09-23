# Aevia Legal Pages — English drafts v1

**Created:** 2026-08-17 (S183)
**Status:** DRAFT for owner review. Not published. German versions come after the English is approved.
**Based on:** `work/legal-pages/brief.md`, `work/legal-pages/research_v1.md`, owner's inline decisions (S183)
**Facts source:** `docs/business-legal-facts.md`

## Decisions applied in these drafts

| Decision | Choice |
|---|---|
| Phone number in Impressum | Omitted (owner) |
| Dispute-resolution / EU ADR link | Omitted, Austria-only delivery (owner) |
| Entity name | "Evgenii Miasin e.U." until Firmenbuch confirms "Aevia e.U." |
| OpenAI as processor | Listed, captions are live (owner) |
| Photo retention | 12 months after delivery (proposed, easily changed) |
| Order/invoice record retention | 7 years, Austrian tax law |
| Cookie banner | Not needed now, wording anticipates future analytics |
| International transfers | Stripe, Google, OpenAI (US), covered by SCCs |
| Delivery | Austria only, 10 to 15 business days |
| Withdrawal right | Excluded for personalised books, defects and shipping damage refundable within 14 days |
| Cancellation cut-off | Payment, not preview approval (owner) |
| Delivery clock starts | On payment received (owner) |
| Template IP | Generic customer-facing clause, artist licence terms stay B2B |
| Governing law | Austrian law, Vienna courts. No EU ADR reference |

## Resolved in v1 (owner, S183)

- **Trade authority:** Magistrat der Stadt Wien, Magistratisches Bezirksamt für den 10. Bezirk
- **Chamber:** Wirtschaftskammer Wien, Fachgruppe Versand, Internet und allgemeiner Handel
- **Firmenbuch number:** none yet. The Impressum deliberately does not claim one. Add it when the registration lands, together with the entity-name change to "Aevia e.U."
- **Print partner:** Printsmarter (printsmarter.de), Germany. Named explicitly. Being in Germany it is an intra-EU transfer, so no Standard Contractual Clauses are needed for it.
- **Order sequence:** design, then preview, then approval, then payment, then print. Payment is the point of no return, not approval. All three documents follow this sequence.
- **Delivery clock:** starts when payment is received.

## Items still needing confirmation before publishing

1. **Photo retention window** — 12 months is a proposal, not a legal requirement. It needs a matching GCS lifecycle rule, otherwise the policy states something the system does not do.
2. **Withdrawal button** — a 2026 FAGG requirement, and a checkout UI change rather than page copy. Tracked separately, not solved by these drafts.
3. **Printsmarter's location** — confirm Germany from the contract or their Impressum. If any part of their operation sits outside the EU, the transfers section needs updating.

---

# 1. Impressum

## Impressum

Information required under §5 of the Austrian E-Commerce Act (ECG) and §14 of the Austrian Commercial Code (UGB).

**Company**
Evgenii Miasin e.U., trading as Aevia

**Business**
Design and sale of personalised photo books

**Address**
Bloch-Bauer-Promenade 20/18
1100 Vienna
Austria

**Contact**
support@aevia.at

**VAT identification number (UID)**
ATU83177107

**Trade register number (GISA)**
39598240

**Legal form**
Eingetragenes Einzelunternehmen (registered sole proprietorship) under Austrian law

**Owner**
Evgenii Miasin

**Trade authority**
Magistrat der Stadt Wien, Magistratisches Bezirksamt für den 10. Bezirk

**Chamber membership**
Wirtschaftskammer Wien, Fachgruppe Versand, Internet und allgemeiner Handel

**Applicable trade regulations**
Austrian Trade Act (Gewerbeordnung), available at ris.bka.gv.at

Aevia is a trademark of Evgenii Miasin e.U.

---

# 2. Privacy Policy (Datenschutzerklärung)

## Privacy Policy

Last updated: `[DATE ON PUBLISH]`

This policy explains what personal data Aevia collects, why we collect it, who we share it with, and what rights you have. We process personal data under the EU General Data Protection Regulation (GDPR) and the Austrian Data Protection Act.

### Who is responsible for your data

Evgenii Miasin e.U., trading as Aevia
Bloch-Bauer-Promenade 20/18, 1100 Vienna, Austria
support@aevia.at

Evgenii Miasin is the controller and the contact point for any privacy question. Write to support@aevia.at and your message will reach him.

### What we collect and why

**Order details.** Your name, email address, delivery address, and the contents of your order. We need these to make your book, deliver it, and contact you about it. Legal basis: performance of a contract (Art. 6(1)(b) GDPR).

**Your photos and the text you write.** The images you upload and the names, dates, captions, and stories you enter. These become your book. We use them for nothing else. Legal basis: performance of a contract (Art. 6(1)(b) GDPR).

**Account details.** If you create an account, your email address and an authentication record so you can sign back in and see your orders. Legal basis: performance of a contract (Art. 6(1)(b) GDPR).

**Payment details.** Your card details go directly to Stripe and never reach our systems. We receive only confirmation that payment succeeded and the amount. Legal basis: performance of a contract (Art. 6(1)(b) GDPR).

**Emails we send you.** Order confirmations, upload confirmations, preview links, and dispatch notices. Legal basis: performance of a contract (Art. 6(1)(b) GDPR).

**Support messages.** Anything you send us by email, kept so we can help you and refer back if you write again. Legal basis: legitimate interest in answering customers (Art. 6(1)(f) GDPR).

### Who we share it with

We use a small number of service providers to run Aevia. Each processes data on our instructions under a data processing agreement, and none of them may use your data for their own purposes.

| Provider | What they handle | Where |
|---|---|---|
| Stripe | Payment processing and card details | Ireland and United States |
| Google Cloud and Firebase | Order storage, sign-in, photo storage, book file generation | European Union, with United States support access |
| Brevo | Sending the emails about your order | European Union |
| OpenAI | Generating draft caption suggestions from the text you write, for our designers to edit | United States |
| Printsmarter | Printing and binding your book, and the delivery address needed to ship it | Germany |

We do not sell your data, and we do not share it for advertising.

### Transfers outside the EU

Stripe, Google, and OpenAI process some data in the United States. These transfers rely on the European Commission's Standard Contractual Clauses, and where applicable the EU-US Data Privacy Framework. You can ask us for details at support@aevia.at.

### How long we keep it

**Your photos and book content: 12 months after your book is delivered.** After that we delete them automatically. Ask us sooner and we will delete them sooner.

**Order and invoice records: 7 years.** Austrian tax law requires this, so these records stay even if you ask us to delete your data. We keep only what the law requires.

**Account details:** until you close your account.

**Support emails:** up to 3 years, then deleted.

### Cookies

Aevia uses only the cookies the site needs to work. They keep you signed in, hold your order together while you fill it in, complete your payment through Stripe, and protect the site against abuse. Because the site cannot function without them, they do not require your consent, but we list them here so you know they exist.

We do not currently use analytics, advertising, or tracking cookies, and nothing on this site follows you across other websites.

We do plan to add website analytics in future so we can see which pages people find useful. When we do, we will ask for your consent first and update this policy.

### Your rights

Under the GDPR you can:

- ask for a copy of the data we hold about you
- have inaccurate data corrected
- have your data deleted, except records we must keep for tax purposes
- ask us to restrict how we use your data
- receive your data in a portable format
- object to processing based on legitimate interest
- withdraw consent at any time, where we relied on consent

Write to support@aevia.at and we will respond within one month.

If you believe we have handled your data wrongly, you can complain to the Austrian Data Protection Authority (Datenschutzbehörde), Barichgasse 40-42, 1030 Vienna, dsb.gv.at.

### Changes to this policy

If we change how we handle your data, we will update this page and change the date at the top. Significant changes will be sent to you by email.

---

# 3. Terms and Conditions (AGB)

## Terms and Conditions

Last updated: `[DATE ON PUBLISH]`

These terms govern every order placed with Aevia. Please read the section on withdrawal, because personalised books cannot be returned.

### 1. Who you are contracting with

Evgenii Miasin e.U., trading as Aevia
Bloch-Bauer-Promenade 20/18, 1100 Vienna, Austria
support@aevia.at
VAT: ATU83177107

### 2. How an order becomes a contract

Placing an order is an offer, not yet a contract. The contract begins when we send you an order confirmation by email. You accept these terms when you place your order.

We may decline an order, for example if we cannot make the book from the photos supplied. If we decline, you pay nothing, or we refund you in full.

### 3. Prices and payment

All prices include Austrian VAT at 20% and are shown in euros. Shipping costs, if any, appear before you pay.

You pay after you have seen and approved your preview, not when you first place your order. Payment is due in full at that point and is handled by Stripe. We accept the card types Stripe shows at checkout. We do not offer credit or instalments.

### 4. Your photos and your text

You keep all rights to the photos and text you upload. You give us permission to use them only to design, produce, and deliver your book, and to provide support afterwards.

You confirm that you have the right to use the photos you upload, and that they do not infringe anyone else's rights. You must not upload unlawful content.

### 5. Design and approval

We design your book and send you a preview. You can request changes, and nothing goes to print until you have approved the preview and paid. Your book is then printed exactly as approved, so please check the spelling of names, dates, and captions carefully before you approve.

### 6. Delivery

We currently deliver to addresses in Austria only.

Books are delivered within 10 to 15 business days after your payment is received. These are estimates, not guaranteed dates. If something delays your book, we will tell you.

Risk passes to you when the book is delivered to the address you gave us.

### 7. Withdrawal and returns

**Personalised books cannot be returned.** Your book is made to your specifications and personalised with your own photos and text, so it falls under the exception in Art. 16(c) of EU Directive 2011/83/EU and the Austrian Fernabsatz- und Auswärtsgeschäfte-Gesetz. The 14-day right of withdrawal does not apply, and this includes changing your mind.

You can cancel free of charge at any point before you pay. Once you have approved your preview and paid, your book goes into production and the order can no longer be cancelled.

**We will always put right our own mistakes.** If your book arrives with a manufacturing defect, damaged in transit, or not matching the preview you approved, we will replace it or refund you. Tell us within 14 days of delivery at support@aevia.at, with your order number and a photo of the problem. We will confirm within 5 business days, and approved refunds are paid within 14 days to the payment method you used.

Nothing in these terms limits your statutory rights as a consumer regarding faulty goods.

### 8. Our liability

If we cause you harm deliberately or through serious carelessness, or if anyone is injured, we are fully responsible and nothing here limits that.

If we cause you harm through an ordinary mistake, our responsibility is limited to the value of your order. In practice this means we remake your book or refund what you paid.

We are not responsible for knock-on losses beyond the order itself, such as lost income or a missed occasion. Please keep your own copies of your photos, because we cannot compensate you for photos you no longer have elsewhere.

We are not responsible for delays caused by events outside our control, such as strikes, extreme weather, or a supplier failure.

None of this affects the rights Austrian consumer law gives you, which always apply regardless of what these terms say.

### 9. Intellectual property

The Aevia name, website, software, and book templates belong to us or to the artists who created them. Template artwork and design elements are licensed to Aevia by third-party artists and remain their property.

When you buy a book you receive that book. You do not receive any right to reuse, copy, resell, or adapt the template artwork, the layouts, or any other Aevia design element outside your own book.

### 10. Changes to these terms

We may update these terms. The version you accepted when you ordered is the one that applies to your order.

### 11. Governing law

Austrian law applies. Where you are a consumer, this does not remove the protection of mandatory consumer law in your country of residence. The courts of Vienna have jurisdiction, subject to any consumer right to bring a claim where you live.

If any clause is invalid, the rest stays in force.
