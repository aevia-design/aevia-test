# Elanders on-site meeting — agenda & question set

_Prepared S146. Attendees: Evgeny, Xenia, Thomas Beyrle (Account Manager). On site, 2–3 hours._
_Companion doc: [print-api-integration.md](print-api-integration.md) — technical depth on the SiteFlow API._

---

## The three things you must not leave without

If time collapses, protect these. Everything else can be settled by email.

1. **The cover artwork specification for the cased hardcover** — board overhang, hinge/joint width, confirmation of our 18mm turn-in, and the paper caliper so we can compute spine width for 40 and 80 pages. Without this, every cover we produce is geometrically wrong. (§II, Q3)
2. **A unit price ladder by volume band, with no volume commitment.** Not one price. A ladder. (§I, Q1–Q2)
3. **Sandbox API credentials**, so we can test through autumn without paying the €850 now. Cheapest thing to ask for, and it de-risks the whole integration. (§II, Q2)

**The position to hold all meeting:** *we can accept a higher price at low volume; we cannot accept a volume commitment.* A high unit price is survivable — at €25/book we still keep roughly half the revenue. A minimum is a fixed loss with no way to cover it. Trade price for freedom, every time.

---

## Running order

Front-load the commercial ask so Thomas can check internally while you tour, then close it at the end.

| | Block | Min |
|---|---|---|
| 1 | Opening — reset the context, state the volume truth, hand over the commercial ask | 20 |
| 2 | **IV. Materials** + **V. Packaging** — hands-on, walking | 50 |
| 3 | **II. Ops A** (Aevia → Elanders) + **III. Ops B** (Elanders → customer) | 40 |
| 4 | **I. Commercial** — seated, full attention, close it | 25 |
| 5 | **VI. Communication & next steps** | 15 |

---

## Opening (20 min) — say this first

Reset the context honestly. It costs nothing and it buys you a real price instead of a hypothetical one.

> "Last year's samples were made when Aevia was still an idea. It's now a real product — the site is nearly finished, five book designs, launching in Austria. But our volumes for the next year are nothing like the 200/month your quote assumed. We're printing calibration samples in August, running maybe 50 friends-and-family orders September to November, and launching properly in December. We can't commit to any volume in 2026.
>
> What we need from today is a price ladder — what a book costs at 25 a month, at 100, at 200 — so we can plan honestly. We'd rather pay more at low volume than sign up to a minimum."

Then hand him §I Q1–Q2 so he can check while you walk.

---

## I. Commercial

**Desirable outcome:** A written price ladder by volume band, no minimum, a 2027 ceiling, and the €850 deferred.
**Fallback:** No ladder, but a firm current price with 90 days' notice on changes, and written confirmation of no minimum. Ladder to follow by email within two weeks.
**Walk-away signal:** Any minimum volume, take-or-pay, or monthly platform fee that survives negotiation.

**Q1. What does a book cost at our actual volume?**
"Your quote was built on 200 books a month. Can you give us the price at 0–25/month, 25–100, 100–200 and 200+? We'd rather see the whole ladder than one number, so we can plan without surprises."

**Q2. Is there any minimum volume, take-or-pay, or monthly fee?**
"We need to be direct: we can accept a higher price per book at low volume. We can't accept committing to a volume we might not reach."

**Q3. What does "review of order quantity after 6 months" actually mean in practice?**
"Your quote has that line. What happens at that review if we're at 20 books a month rather than 200 — does the price change, and by how much? Can we see that outcome now rather than discover it then?"

**Q4. Can you give us a price ceiling for 2027?**
"Something like: whatever happens with volume, the price won't exceed €X. That's the single thing that lets us set our retail price with confidence."

**Q5. How much notice do we get on a price change, and is pricing indexed to paper cost?**
_(Paper-price pass-through clauses are common in print contracts. If they index, ask which index, and ask for it to work in both directions and be capped — e.g. ±10% a year. Push for 90 days' notice.)_

**Q6. The €850 API setup — can it wait, or be credited?**
"We'd likely stay manual through the friends-and-family phase. Can the fee be deferred until we go live, credited against our first orders, or waived at a volume threshold? And is it genuinely one-off, or does it renew?"

**Q7. What do the calibration samples in August cost us?**
"We'll print maybe 10–30 books across five designs to calibrate. Are those charged at one-off rates, or can they come as part of onboarding?"

**Q8. Payment terms and credit.**
"Your quote says 14 days. For a company with no trading history with you — do you need a deposit or prepayment to start, and what does it take to get to normal terms?"

**Q9. If a book arrives faulty, who pays for the reprint?**
"Wrong colours, a bad bind, missing pages — we have to make it right for the customer regardless. Do you reprint at your cost, how long do we have to report it, and is there a cap on what you'll cover?"

**Q10. What are we actually signing, and how do we get out of it?**
"Is this a framework agreement that locks prices and terms for a period, or do we work order-by-order off quotes you can revise? Does anything in it stop us using another printer? What's the notice period to end it? And can we take your standard terms away and read them before we sign — we'd rather understand the liability and defect clauses properly than nod at them here."

**Q11. Invoicing across the border.**
"You're a German company, we're Austrian. We assume reverse charge — you invoice us net, we account for the VAT in Austria. Can you confirm that's how you'll bill us, and is there anything you need from us beyond our UID?"

---

## II. Operations A — Aevia → Elanders

**Desirable outcome:** The cover template file in hand (or promised within a week), and sandbox API access without paying the €850.
**Fallback:** A production contact's direct email and a written spec by end of next week. Manual PDF hand-off confirmed as workable through December.
**Blocker to name early:** Thomas may not be able to answer Q3 himself. Ask at the start of this block whether someone from production can join for 15 minutes.
_(Format is settled — 200×200, agreed with them after the 210×210 quote. No need to re-open it, just don't let anyone assume 210.)_

**Q1. What's the best way to work with you in 2026 at our volume — manual or API?**
"For samples plus maybe 50 orders, is the API worth it, or would you rather we send files manually until December? What does manual actually look like on your side?"

**Q2. Can we get sandbox API access before committing to the €850?**
"We'd like a test credential that doesn't print or invoice anything. Specifically: access to your validate endpoint so we can check a full order payload without submitting it; the SKU and product code for our book so we're testing against the real setup; preflight feedback on a real cover and inside-pages PDF; and a couple of test orders that reach your queue and then get cancelled, so we see the whole round trip.
If we have that through autumn, we arrive in December with a tested integration and pay the setup fee once, at go-live — instead of paying now and debugging on a live system with real customers waiting."

**Q3. 🔴 We need your cover artwork specification.**
"This is the most important thing we need today, and it matters whether or not we ever use the API — manual hand-off has the same problem.
Here's where we are. Our book is 200×200mm. We draw the cover as one flat sheet — back 200mm, spine 9mm, front 200mm, so 409×200mm of content — with 18mm of bleed all round, giving a 445×236mm sheet.
Three things we think are missing, and we need your numbers:
1. **Board overhang** — our cover content is exactly 200mm tall, the same as the page. Your boards must be bigger than the block. How much do they stand proud on the top, bottom and fore-edge?
2. **Hinge gap** — we have back, spine and front directly next to each other with no joint. How wide is the groove either side of the spine for your 2.5mm board?
3. **Spine width** — we have it fixed at 9mm. That might be about right for 40 pages, but an 80-page book has twice the paper. What's the caliper of your 160gsm content stock, and what's the formula?
Simplest answer: send us your cover template with the flat dimensions as a formula of page count, and we'll build to it. Is 18mm the right turn-in?"

**Q4. What exactly do you want in the two PDF files?**
"We produce a cover file and an inside-pages file. For the inside pages — single pages or spreads, and do you handle the imposition? How much bleed, and do you want crop marks? What resolution and colour profile? We send RGB and you convert — still true?"

**Q5. What gets a file rejected, and how do we find out?**
"If our file fails your checks, does the system tell us automatically, or does someone email us — and how quickly?"

**Q6. File size — your cloud pricing charges by PDF size.**
"Your quote is free up to 30 MB, then charges upward. Our print PDFs may be large. What's your maximum, and is it worth us compressing to stay under 30 MB?"

**Q7. What page counts can you do?**
"We sell 40 and 80 pages. Your quote says minimum 26. Is there a maximum, does it have to be a multiple of anything, and does the same product cover both counts?"

**Q8. Turnaround.**
"From receiving our file to the book leaving your building — how long, normally? And what happens in November–December when everyone wants books?"

**Q9. How late can we cancel an order?**
"If a customer cancels after we've sent you the job — what's the last moment we can stop it, and after that is it a write-off?"

**Q10. GDPR.**
"You'll be receiving our customers' names and addresses. We'll need a data processing agreement — do you have a standard one? And if a customer asks us to delete their data, how does that work on your side?"

---

## III. Operations B — Elanders → customer

**Desirable outcome:** A shipping price list for Austria by weight band, a Germany price list, tracking confirmed, and clarity on what the customer sees.
**Fallback:** Austria pricing firm; Germany indicative and confirmed by email before we open the DE site.

**Q1. What are the real shipping options and prices for Austria?**
"Your quote shows untracked up to 0.5 kg and tracked up to 3 kg. Which carriers, what does each cost, and what's the delivery time? We need this to set our checkout — our delivery fee is a placeholder right now."

**Q2. What does a book actually weigh?**
"We need this because your pricing is by weight band. What does a 40-page and an 80-page book weigh, packed? We suspect the 80-page one is over 0.5 kg and lands in a different bracket."

**Q3. Germany, and beyond.**
"We're starting Austria-only, but we'll likely add Germany and possibly other EU countries in 2027 — maybe earlier if it's simple. What does shipping to Germany cost, and does adding a country change anything on your side, or is it just a different rate? Which countries can you ship to at all?"

**Q4. Do we get tracking back automatically?**
"We want to email the customer a tracking link. Can your system tell ours when a book ships, with the tracking number? If that's fiddly, we can check your system periodically instead."

**Q5. What does the customer see on the parcel and paperwork?**
"Is there a delivery note in the box, and what's on it? Your system makes us send an order value — should that be what our customer paid us, or what we pay you, and does that number ever appear on anything the customer sees?"

**Q6. What happens when delivery fails?**
"Wrong address, nobody home, parcel lost. Who handles it, who pays for the reship, and how do we find out it happened?"

**Q7. Returns.**
"If a customer returns a book — where does it go? We'd rather it didn't come to a flat in Vienna."

---

## IV. Materials

_This is why you're on site. Bring the CEWE and Periodica samples. Put them on the table next to an Elanders sample and ask them to explain the difference — that gets you a far better conversation than any question about gsm._

**Desirable outcome:** A chosen paper for cover and content that beats the competitor samples in feel, plus costed options for linen and any upgrade worth paying for.
**Fallback:** Confirm the quoted stock as the baseline and take samples home to decide, with a written price delta for each alternative.

**Q1. Show us what these are, and what you'd do differently.**
_(Hand over the CEWE and Periodica books.)_ "We prefer the feel of these to what we've had so far. Can you tell us what they're using, and what you'd suggest to match or beat it?"

**Q2. What are the alternatives to the quoted content paper?**
"Your quote is 160gsm offset. What else can you run — heavier, uncoated, a warmer white, matt vs silk? What does each do to the price and to the book's thickness?"

**Q3. And the cover stock?**
"150gsm matt coated plus lamination is quoted. What are our options — matt, gloss, soft-touch, anything with texture? What does each cost, and how does each wear over years? These are books people keep."

**Q4. Linen — is it available yet?**
"You mentioned last year that linen covers might come this year. Where is that? What colours, what's the price difference, and how does printing work on it — can we print on linen, or does it need a foil or a printed inlay?"

**Q5. Endsheets.**
"Yours are unprinted 190gsm. What does it cost to print them, and what colours can we get plain? This is a place our designs could use well."

**Q6. What cover finishes can you do beyond plain printing?**
"We're thinking about the title on the front and our name on the spine. Which of these can you do, what does each cost at our volume, is there a minimum quantity, and is there a one-off charge for making the die?

- **Foil stamping** (_Folienprägung_) — metallic or coloured foil pressed on with a heated die. Gold, silver, copper, or matt colours.
- **Embossing** (_Prägung_) — the design pressed **outward** so it stands proud of the surface. Works well on linen or uncoated stock with no ink at all.
- **Debossing** (_Blindprägung_) — the same but pressed **inward**. Very restrained; often what premium brands choose.
- **Spot UV** (_partieller UV-Lack_) — gloss varnish on selected areas only, so the design catches the light against a matt cover.

And what would you need from us in the artwork file — a separate layer for the die?"
_(Ask even if we don't use it now: each of these changes the file format we'd have to produce, and it's cheaper to know before the templates are finalised than after.)_

**Q7. How consistent is colour, book to book?**
"If a customer orders the same book twice, six months apart, will they match? How do you handle skin tones — that's what our customers notice most."

**Q8. Is any of this FSC certified?**
_(Their quote footnote says only clearly marked products are FSC.)_ "Can we say our books are FSC certified, and does it cost more?"

**Q9. Which of these decisions are reversible?**
"If we start on the quoted paper and want to change in six months, is that a simple switch, or does it mean re-doing the product setup and re-calibrating our files?"

---

## V. Packaging

_Never discussed with them. Treat as open ground — the box is the customer's first physical contact with Aevia, and right now it would say Elanders._

**Desirable outcome:** A branded or brandable outer, with the cost per unit and the minimum order for any printed material.
**Fallback:** Plain unbranded outer plus a slot for our own insert card, with a plan to brand it before the December launch.

**Q1. What does the packaging look like today, by default?**
"Show us. What would arrive at a customer's door if we sent an order tomorrow?"

**Q2. Can it carry our branding?**
"Our logo on the box, our name on the label — the customer should feel they're opening something from Aevia, not from a print factory. What's possible, what does it cost, and what's the minimum quantity for printed boxes?"

**Q3. Can you insert something we supply?**
"A printed card, a thank-you note, a care instruction. Could we send you a batch and have you drop one in each parcel? What does that cost per order, and would you store them?"

**Q4. What protection options are there?**
"Shrink wrap, a paper band, a slipcase, a rigid mailer. What do you offer, and what's the price? A damaged corner ruins a €100 gift."

**Q5. Can the return address and sender be ours?**
"Does the label say Elanders or Aevia, and can we change that?"

**Q6. What's the damage rate in transit, and who covers it?**

**Q7. Sustainability.**
"Plastic-free, recyclable, FSC board — what are the options, and what do they cost? Our customers care and we'd like to say something true about it."

---

## VI. Communication & next steps

**Desirable outcome:** A named technical contact besides Thomas, an agreed response time, and dates for the sample round.
**Fallback:** Thomas's mobile and a clear escalation path.

**Q1. Who do we contact for what?**
"Thomas for commercial — but who do we email about a file problem or a stuck order, and is there a shared address rather than one person? Honestly, email turnaround has sometimes been a few days, and once we're live with real customers waiting we'll need faster."

**Q2. What response time can we expect, and can it go in the agreement?**
"For a production issue on a live order — what's realistic? Same day, next day?"

**Q3. What happens when something goes wrong out of hours or in December?**

**Q4. How do we start the sample round?**
"We want to be printing calibration samples in August. What do you need from us, and when could the first ones be in our hands?"

**Q5. What are the concrete next steps and dates?**
_(Leave with: who sends what, by when. Write it down in the room and email it back to Thomas the same day — that's your record, and it works around slow email.)_

---

## Before you go — a small checklist

- [ ] Bring the CEWE and Periodica samples
- [ ] Bring a printed copy of the July 2025 quote (A71023) — it expired 14.08.2025, which is your clean reason to reopen every number
- [ ] Bring a laptop or printout of one full cover artwork, so the geometry conversation can happen against something real
- [ ] Ask at the start whether someone from production can join for §II
- [ ] Xenia takes notes against this document; Evgeny talks
- [ ] Same day: email Thomas the agreed next steps in writing

---

## Not a question for Thomas — but check it this month

**Austrian VAT on photo books.** Personalised photo books appear to be **standard-rated (20% in Austria), not the 10% reduced book rate** — they're classified as printed pictures under CN 4911 rather than as books, on the basis that they aren't intended for reading. If your €70 and €100 prices were set assuming 10%, that's about €5 a book of margin you don't have. The site currently shows no VAT statement at all, and Austrian consumer law requires B2C prices to be displayed inclusive of VAT — so that needs fixing regardless.

There's also a question of whether Aevia is below the Austrian small-business threshold (Kleinunternehmerregelung), because if so you charge no VAT but also can't recover the reverse-charge VAT on Elanders' invoices, which makes their books genuinely more expensive to you.

**Both are for your Steuerberater, not for me and not for Thomas.** Flagging because it affects pricing and it's cheap to check now.
