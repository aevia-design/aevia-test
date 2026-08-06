# Printsmarter — live call sheet

_S152. Replaces the unsent S148 clarifying email. Companions: [elanders-meeting-agenda.md](elanders-meeting-agenda.md) (full question set), [print-api-integration.md](print-api-integration.md) §1 spine bug, §4 API questions._

**Where we stand:** Printsmarter ≈ **€10.42/book at 40pp**, no volume commitment. Elanders ≈ **€18/book** at our volume, cheaper only above ~20 books/day. Printsmarter wins decisively for launch. **Desk research S152: PrintSmarter GmbH is a separate company at Elanders Donauwörth's own address, owns no presses, and outsources production to Elanders (§B).** Still unconfirmed: whether the low-volume route uses the same machines, who carries quality liability, and whether it's the same API.

**The position to hold all call:** we can accept a higher price at low volume; we cannot accept a volume commitment. A high unit price is survivable. A minimum is a fixed loss.

---

## Do not hang up without these four

1. **The cover template as a formula of page count** (§A — a parallel build is blocked on it)
2. **Confirmation of who actually prints our books** (§B — everything about quality rests on this)
3. **Whether it's the same SiteFlow API, and what setup costs** (§C)
4. **Samples in our hands, and a date** (§D)

Everything else can go by email afterwards.

---

## A. Geometry — the blocking one 🔴

Open with this. If they need to fetch someone from production, you want that happening while you talk about everything else.

> "The simplest version of what we need: **send us your cover template with the flat dimensions expressed as a formula of page count.** If you have that as a file, we're done in one minute. If not, I have four specific numbers."

**Fill these in live:**

| # | Ask | Answer |
|---|---|---|
| 1 | **Spine formula.** "You said 10mm at 40 pages and 14mm at 80. That fits spine = 6mm + 0.1mm × pages. Is that actually your formula, or were those two looked-up numbers?" | |
| 1b | **Pages or sheets?** "When you say 40 pages — is that 40 printed sides (20 leaves) or 40 sheets?" | |
| 1c | **What's the 6mm?** "Is the constant your boards plus endpapers? Does it change if we change cover stock?" | |
| 2 | **Board overhang** — top, bottom, fore-edge. "Our cover content is exactly 200mm tall, same as the page. Your boards must stand proud. By how much on each edge?" | |
| 3 | **Hinge/joint gap** either side of the spine, and **board thickness**. "We currently have back, spine and front butted together with no joint." | |
| 4 | **Turn-in.** "We use 18mm bleed all round on the cover. Is 18mm right for your casing-in?" | |

Also worth catching while you're there: is the same formula valid across the whole page-count range (26–80), or does it break at the ends?

_Context if they ask why it matters: our cover is one flat sheet, back | spine | front. A wrong spine width doesn't just make a bad spine — it pushes the front and back artwork out of position by half the error on each side. We currently have 9mm hardcoded, which if the formula holds is 1mm short at 40pp and 5mm short at 80pp._

---

## B. Who actually prints our books 🔴

**Desk research (S152) has largely answered this — go in to confirm, not to discover.** What we now know from public sources:

- **PrintSmarter GmbH is its own legal entity** — HRB 35644 Augsburg, VAT DE341057931, MD **Andreas Emmert** — registered at **Am Stillflecken 4, 86609 Donauwörth: the exact address of Elanders Donauwörth GmbH.**
- **PrintSmarter does not own presses.** Its own site: _"Für unsere Closed-Shop-Lösungen vertrauen wir auf Elanders Print & Packaging und auf unser internationales Produktionsnetzwerk."_ It is a **white-label webshop that outsources production to Elanders.**
- Its shop lists **Elanders Donauwörth GmbH as the manufacturer/brand** of the hardcover books it sells.
- **Personnel overlap:** Manuel Stefan was MD of PrintSmarter until Aug 2021 and is a MD of Elanders Donauwörth (2025).

**So the working answer: same building, same presses, separate invoice. Two to confirm live, the rest by email:**

1. **"Am I right that PrintSmarter is the webshop and Elanders Donauwörth does the actual printing — same presses, same operators?"** Then: "would our book come off the same process we saw on the Journi line, or does the low-volume route differ?"
2. **"If quality goes wrong, who fixes it and who pays — you or Elanders?"**

_By email: who we contract with, ownership structure, capacity share, and the graduation question — if we outgrow the low-volume band, does the product/API/template setup carry over to Elanders' pricing, or start over._

---

## C. API — three questions, the rest by email

**They've already offered this in writing: no setup fee, just a printsmarter.de account + email, and they'll send docs/token/customer ID.** That's their own webshop API, not necessarily Elanders' Site Flow — ask for the docs before the call so you're not reasoning blind.

1. **"When we submit an order through your API, does it flow automatically into Elanders' production, or does someone at your end re-key it?"** — the one that determines whether this scales past friends-and-family.
2. **"Is the API your own system, or a front end onto Elanders' Site Flow?"** — determines whether our earlier Site Flow prep (payload shape, auth) is usable at all, or we start fresh against their docs.
3. **"If a file fails preflight, who tells us — automatically, or a person — and how fast?"**

_Everything else — sandbox/test-order mechanics, product/SKU setup for one book across page counts, PDF size limits and delivery method, manual-vs-API for 2026 volume — goes in the same follow-up email as the geometry spec. Don't spend call time on it._

---

## D. Quality and materials

- **"Send us samples."** Books off your line, ideally one similar to ours. What's the date? _(We have CEWE and Periodica books to compare against.)_
- **"Rebecca" content paper** — "we couldn't find a public spec. What is it — weight, finish, shade, and is it uncoated offset? What's its caliper?" _(The caliper is also the cross-check on the spine formula.)_
- "What's the cover stock and lamination, and what alternatives do you run?"
- "Colour consistency — if a customer orders the same book twice six months apart, do they match? How do you handle skin tones?"
- "Is any of it FSC certified, and can we say so?"
- "Do you do foil, embossing, debossing, spot UV — and at what minimum quantity?" _(Ask even if we won't use it: each one changes the artwork file we have to produce, and it's cheaper to know before the templates are finalised.)_

---

## E. Commercial — protect the no-commitment position

- "Confirm there's **no minimum volume, no take-or-pay, no monthly fee**." _(Say plainly: we can pay more per book at low volume, we can't commit to a volume.)_
- "Your quote was priced at 1 book/day. **Is €10.42 a floor that gets better with volume, or a price that changes if we do more?** Give us the ladder if you have one."
- "**What's your capacity ceiling** — how many books a day can you take from us before it's a problem? And what happens in November–December?"
- "How much notice on a price change, and is pricing indexed to paper cost?" _(If indexed: which index, both directions, capped.)_
- "What do calibration samples cost — 10–30 books across five designs?"
- "Payment terms for a company with no trading history with you — deposit, prepayment?"
- "**Faulty book — who pays the reprint?** Wrong colours, bad bind, missing pages. We have to make it right for the customer regardless. How long do we have to report it, and is there a cap?"
- "We're Austrian, you're German — **reverse charge**, you invoice us net? Anything you need beyond our UID?"
- "Are we signing a framework agreement or working order-by-order off quotes? Does anything stop us using another printer? Notice period to exit? Can we take your terms away and read them?"

---

## F. Fulfilment — they ship to our customers

- "Carriers, prices and delivery times for **Austria**, by weight band." _(Our checkout delivery fee is still a placeholder.)_
- "**What does a packed 40pp and 80pp book weigh?**" _(We suspect 80pp crosses 0.5kg into a different bracket.)_
- "**Germany** — cost, and does adding a country change anything your side? Which countries can you ship to at all?"
- "Do we get **tracking back automatically** with the shipment, so we can email the customer a link?"
- "**Packaging** — what arrives at the door today? Can it carry Aevia branding, and at what minimum? Can you insert a card we supply? Does the label say Printsmarter or Aevia?"
- "**Turnaround** — file received to book leaving the building. And in peak season?"
- "**How late can we cancel** an order once it's with you?"
- "Failed delivery and returns — who handles it, who pays the reship, and where does a returned book go? _(Not to a flat in Vienna.)_"
- "**GDPR** — do you have a standard data processing agreement, and how does an erasure request work on your side?"

---

## G. Close

- "Who do we email about a **file problem or a stuck order** — a shared address, not one person? What response time is realistic on a live order?"
- "What do you need from us to start the **sample round**, and when could the first books be in our hands?"
- "Concrete next steps: **who sends what, by when.**"

**Same day: email them the agreed next steps in writing.** That's the record.

---

## Watch-outs during the call

- A vague "yes, same quality" to §B is not an answer. Push for the mechanism — same machines, same operators, or not.
- Don't let anyone assume **210×210**. Our format is **200×200**, settled with Elanders.
- Already settled, don't re-open: they take **RGB PDFs and convert to CMYK themselves**.
- If they offer a better price in exchange for any kind of commitment — **decline**, and say why. That's the whole reason we're talking to them and not Elanders.
