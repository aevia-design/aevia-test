# Print API integration — HP Site Flow

_Internal brief. Session 123 (2026-07-13). Status: RESEARCH ONLY, nothing built._

Print hub runs **HP Site Flow**. Their API would let us drop a paid order straight into
their production queue instead of emailing PDFs around.

**Source of truth: the official OpenAPI spec** (`assets/SiteFlowOpenAPI.json`, Swagger 2.0,
289 endpoints). Where HP's prose docs or code samples disagree with it, the spec wins —
and it does disagree in places.

---

## 1. 🔴 The spine bug — read this first

**We sell 40-page (€70) and 80-page (€100) books. The spine is hardcoded to 9mm in all five
templates** (`spine: { wMm: 9 }` in every `*-data.js`).

An 80-page book has ~twice the paper of a 40-page one, so its spine cannot be the same width.
Today an 80-page order would print with a wrong spine — and because the cover is one flat
sheet (back | spine | front), a wrong spine width **also shifts the front and back artwork
out of position.**

We cannot fix this ourselves. The spine width depends on the **paper thickness (caliper)** and
the **binding method**, which only Elanders knows. **We need spine formula.**

> **This is the single most important thing to get from the meeting — and it matters whether
> or not we ever build the API.** Manual PDF handoff has exactly the same bug.

---

## 2. The key insight: the heavy spec lives on Elanders side

Site Flow has a `Product` object holding all the physical spec — binding, paper, dimensions,
page counts, imposition, preflight rules. A `SKU` is just a sellable code pointing at a Product.

**The print hub configures the Product + SKU for our book. We reference the SKU and hand over
two PDFs.** That's why our payload is thin, and why most open questions are theirs to answer,
not ours to engineer.

Of 289 endpoints, most are factory-floor machinery *Elanders* use (batches, presses, label
printers). **Aevia slice is ~6 endpoints.**

✅ **Confirmed: all five templates are physically identical** — `pageSize: 200` + `bleed: 3`
= 206×206mm in Scribble, Wander, Tender, Newborn and Papercut. They differ only in artwork.
So **one Product/SKU should cover all five.** (Owner confirms print hub is not charging
per-template.)

---

## 3. The real decision: manual now, or API now?


**"What if specifications change later?"** — the honest answer: **low risk.**

- Changes to **paper, binding, imposition, preflight** live in *their* Product config. They
  change it on their side; **our code doesn't move.** This is the reassuring part.
- Adding a **new template** costs nothing — same physical object (confirmed above).
- A **new page count** is already expressible per-order (`totalPages`/`pages` fields exist).
- The only expensive change is a **different physical book** (new trim size, new binding).
  That would force a new Product/SKU on their side — but it would *also* force us to redo
  cover geometry and artwork anyway. **We'd pay that cost in manual mode too.**

**Argument FOR integrating now:** F&F orders would exercise the real pipeline, so we'd find
integration bugs on friendly customers instead of paying ones.

**Argument FOR waiting:** we haven't visited the print house yet, the physical spec isn't
confirmed, and the spine bug means the cover geometry is *currently wrong*. Paying €900 to
automate a pipeline whose output is still incorrect is premature.

### 👉 Recommendation: manual for F&F, integrate before the ~100-order batch

1. **Now → F&F trial (Sept):** manual handoff. Low volume, and we *want* the friction — it
   teaches us what the integration actually needs to do.
2. **Fix the spine formula first** (Q3). Non-negotiable, API or not.
3. **Integrate before the ~100 test orders.** That's where manual handoff starts to hurt, and
   we still have forgiving volume to shake out bugs before marketing ramps.

Waiting costs us nothing but a bit of Xenia's time. Rushing costs €900 against a spec that
hasn't been confirmed in person yet.

---

## 4. Questions for the meeting

_Plain wording — askable out loud, understandable by both sides._

### 🔴 Must get

**Q1. How do we work out the spine width?**
"We print 40-page and 80-page books. The spine obviously needs to be wider on the thicker
one. What's the formula — what's your paper thickness, and how do we calculate spine width
from page count? We currently have it fixed at 9mm, which we now think is wrong."

**Q2. What exactly does the ~€900 cover, and is it one-off?**
"You quoted around €900 for API setup last year. How would set-up work? Can we do some sandbox testing (orders without printing)?

**Q3. Can you set up our book as a product in your system, and give us its code?**
"Our book is always 206×206mm, same paper and binding — only the artwork differs. Can that be
**one product** covering all our designs, with the page count (40 or 80) sent per order? What's
the product/SKU code we'd quote back to you?"

**Q4. Can you give us API access (a key), even before we commit?**
"If we have a key we can test against your system without printing anything — your API has a
'validate' mode that just checks our file is correct. That would let us answer a lot of the
smaller questions ourselves instead of taking up your time."

### 🟡 Should get

**Q5. Is our book two files — cover and inside pages? What do you call them?**
_(We already produce them separately, so this should be a yes.)_

**Q6. Should inside pages be single pages, or spreads? Do you handle the imposition?**

**Q7. How much bleed do you want, and do you want crop marks?**
_(We currently use 3mm.)_

**Q8. What are your file requirements, and what would get a file rejected?**
"And if a file fails your checks, how do we find out — automatically, or does someone email us?"

**Q9. Can your system automatically tell ours when a book is printed and when it ships,
including the tracking number?**
"We'd use that to email the customer their tracking link. If it's fiddly to set up, we can
also just check in with your system periodically — but automatic is better."

**Q10. How do you want to receive the PDFs?**
"We'd give you a secure download link for each file, valid for a limited time — your system
pulls it. Does that work, and how long should the link stay live? Any maximum file size?"

### 🟢 Before go-live

**Q11. Shipping — carriers and cost.**
✅ _Confirmed: they ship direct to our customers._ Still to discuss: which carriers/services
for Austria and Germany, who pays, and delivery cost (this also unblocks our checkout, where
the delivery fee is still a placeholder).

**Q12. Can the parcel carry Aevia branding — a packing slip, our name on the label?**
"The customer should feel they're opening something from Aevia, not from a print factory."

**Q13. What order value should we send you, and does it show up in the box?**
"Your system requires us to send a price with each order. Should that be **what our customer
paid us** (e.g. €70), or **what we pay you**? And does that number appear on any paperwork
the customer sees — a delivery note or customs label?"
_(Why it matters: if we send our retail price it may print on a delivery note; if we send your
cost, the customer could see what we pay you. Neither is necessarily wrong, we just need to know.)_

**Q14. If a customer cancels, how late can we stop the order?**
"Once we've sent a book to you, what's the last moment we can pull it — before it's printed?
Before it ships? After that, is it just a write-off?"

**Q15. Can we do a test print before go-live?**
"One real book, printed from a real order, so we can check the quality, the colours and the
spine before any customer gets one."

**Q16. GDPR — if a customer asks us to delete their data, how do we delete it on your side?**
"Under EU law we have to be able to erase a customer's personal details on request. Your system
has a function for this — can you confirm it's the right one and tell us what it does and
doesn't remove?"

**Already settled — don't re-ask:** they take **RGB PDFs and convert to CMYK themselves**
(confirmed S119).

---

## 5. Technical appendix (for us, not the meeting)

### Our ~6 endpoints
| Endpoint | Why |
|---|---|
| `POST /order/validate` | Free dry-run — validate JSON without printing |
| `POST /order` | Submit the real order |
| `GET /order/bysourceid/{sourceOrderId}` | Status by **our** order number (`AEV-052`) |
| `PUT /order/{source}/{sourceOrderId}/cancel` | Cancel by our order number |
| `POST /order/anonymise/bySource/{...}` | GDPR erasure |
| `GET /sku`, `GET /product` | Self-discover their codes once we have a key |

### Order payload (corrected against the spec)
```json
{
  "destination": { "name": "<facility>" },
  "orderData": {
    "sourceOrderId": "AEV-052",     // required
    "amount": 90.00,                 // required (!) — see Q13
    "currency": "EUR",
    "items": [{
      "sourceItemId": "AEV-052-1",  // required
      "sku": "<their SKU>",         // required
      "quantity": 1,                 // required
      "totalPages": 40,
      "components": [
        { "code": "cover", "type": "press", "path": "https://…/cover.pdf", "fetch": true },
        { "code": "inner", "type": "press", "path": "https://…/content.pdf", "fetch": true }
      ]
    }],
    "shipments": [{
      "shipTo": { "name": "…", "address1": "…", "town": "…", "postcode": "…",
                  "isoCountry": "AT", "email": "…", "phone": "…" },
      "carrier": { "code": "…", "service": "…" }
    }]
  }
}
```

### Corrections the spec forced
1. **`orderData.amount` is REQUIRED** (+`currency`). Not in HP's sample. → Q13.
2. **`component.type` is REQUIRED** (`press`|`stock`|`3d`) — **HP's own sample omits it.**
   Copying their sample verbatim would fail validation. Ours is `press`.
3. **Page count is per-order** (`Item.totalPages`, `Component.pages`) → one SKU likely covers
   40pp *and* 80pp. → Q3.
4. **Tracking is first-class** (`Shipment.trackingNumber`/`trackingUrl`), plus `pspBranding`
   and `returnAddress` → Q12.
5. **Postbacks aren't blocking** — `GET /order/bysourceid/{...}` lets us poll as a fallback.
6. `component.preflight`/`proof` flags exist; `PUT /file/{fileId}/refetch` confirms fetch-retry.

### Auth
HMAC-SHA256, ~8 lines. Spec has **no** `securityDefinitions` (documented out-of-band):
```python
string_to_sign = method + ' ' + path + ' ' + timestamp
signature = hmac.new(secret, string_to_sign, hashlib.sha256).hexdigest()
headers = { 'x-oneflow-authorization': token + ':' + signature,
            'x-oneflow-date': timestamp, 'x-oneflow-algorithm': 'SHA256' }
```
Two base URLs in play: `pro-api.oneflowcloud.com` (spec host) vs `orders.oneflow.io`
(submission, per HP's docs). Confirm which is ours.

### Build effort (once answers exist)
HMAC helper (~30 lines) · `submitPrintOrder` Cloud Fn · postback receiver Cloud Fn ·
order statuses past `paid` (`in_production` → `shipped`) · **dispatch email** (designed S105,
never built — blocked on exactly this). **One or two focused sessions.**

We already emit separate `print/cover.pdf` + content PDF via `--mode print`
([export-pdf.js:1255](../../scripts/export-pdf.js#L1255)) → maps 1:1 onto `cover` + `inner`.

### Cost
They **fetch from us** → each order egresses one print PDF from GCS to the internet.
~€0.11/GB, so a 0.5 GB PDF ≈ **6 cents/order**; a retried fetch re-egresses. Negligible, but
**measure our real print-PDF size** before calling it free. No new infra, no region change.
