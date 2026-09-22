# Printsmarter — call outcome and API facts

_Session 155 (2026-08-06). Records the outcome of the 2026-08-05 call. Supersedes the API half of
[print-api-integration.md](print-api-integration.md) (which assumed HP Site Flow). The pre-call
question sheet is [printsmarter-call-onepager.md](printsmarter-call-onepager.md) — kept for the
questions it still leaves unanswered._

---

## 1. What the call settled

| Question | Answer |
|---|---|
| Who actually prints? | **Elanders facilities, same specifications.** Confirms the S152 desk research (§B of the one-pager). |
| Volume commitment? | **None.** Pay as you go. This was the position we went in to protect, and it held. |
| Cloud storage fees? | **None.** |
| Payment terms | **Post-payment, invoiced monthly.** No deposit or prepayment raised. |
| Same API as Elanders? | **No — Printsmarter has its own API**, which connects onward to Elanders' API. **We integrate only against Printsmarter.** Site Flow / HMAC is off the table (§3). |
| Contract | **Being drafted by Printsmarter.** Specs, delivery and the rest land there. |

**Two open questions this closes.** STATUS.md carried "Is Printsmarter the same production line and
API as Elanders?" — same line **yes**, same API **no**. The Journi-line quality signal survives.

---

## 2. Credentials

Issued to us on the call: an **Access-Token** and **Customer ID 3983**.

**The token is not in this file and must never be committed.** It belongs in `functions/.env`
alongside the Gmail and GCS credentials, which is already gitignored. See §6 for the rotation note.

---

## 3. The API — what it actually is

Documentation: <https://www.printsmarter.de/docs/api/> (public, no login).

It is a **small, plain webhook API on their OpenCart shop** — not the 289-endpoint Site Flow
machine the earlier brief prepared for. Four operations total.

**Base URL:** `https://www.printsmarter.de/index.php?route=api/custom_shop_webhook/`
**Auth:** a single static header, `Access-Token: <token>`. No HMAC, no signing, no timestamp.

| Operation | Purpose |
|---|---|
| `add_Order` | Submit an order (POST, JSON) |
| `get_order_status` | Poll status by `order_id_client` (ours) or `order_id_printsmarter` |
| `cancel_order` | Cancel, only before production starts |
| Shipping postback | **They call us** with tracking number + URL |

### Order payload — the book case

Their own example includes a hardcover book, which is close to what we need:

```json
{
  "customer_id": "3983",
  "order_id_client": "AEV-052",
  "shipping_code": "Standard",
  "shipping_price": 5.50,
  "currency": "EUR",
  "shipping_address": { "first_name": "…", "last_name": "…", "company": "",
    "address1": "…", "address2": "", "city": "…", "zip": "…",
    "country_code": "AT", "country": "Austria", "email": "…" },
  "return_address": { "…": "who does a failed delivery come back to — see §5" },
  "products": [{
    "project_name": "AEV-052",
    "quantity": 1,
    "product_id_client": "AEV-052-1",
    "product_id": "printsmartergmbh_hardcover",
    "price": "70.00",
    "pages": 40,
    "file_cover":   "https://…/print/cover.pdf",
    "file_content": "https://…/print/content.pdf"
  }]
}
```

Response: `{"success": {"status": true, "message": "Order created.", "order_id": 95583}}`.
Status replies are **German prose** (`"in Produktion"`), not enum codes.

Postback they send us:

```json
{ "shipment": { "order_id_client": "AEV-052",
                "tracking_number": "001111…",
                "tracking_url": "https://www.dhl.de/…" } }
```

### What carries over from the Site Flow brief

Three findings survive the switch and are worth not re-deriving:

1. **Two files, cover + content.** We already emit exactly these via `scripts/export-pdf.js`
   `--mode print`. They map 1:1 onto `file_cover` / `file_content`.
2. **Page count is per-order** (`pages`), so **one product code covers 40pp and 80pp** — and all
   five templates, which are physically identical books.
3. **They fetch the PDFs from us by URL**, so each order egresses two PDFs from GCS to the
   internet at ~€0.11/GB. Still needs measuring against a real print PDF, but it is cents.
   A retried fetch re-egresses. No new infrastructure, no region change.

### What is now dead

The HMAC-SHA256 signing helper, `x-oneflow-*` headers, `pro-api.oneflowcloud.com`, the
`destination`/`orderData`/`components` payload shape, `POST /order/validate`, and the
`/order/anonymise` GDPR endpoint. **None of it applies.** So does the **~€900 setup fee** —
Printsmarter charge nothing to onboard.

---

## 4. What this changes about the build

Smaller than planned. Static-token auth removes the signing helper; four endpoints remove the
discovery work. The remaining pieces are unchanged from the earlier estimate: a `submitPrintOrder`
Cloud Function, a postback receiver, order statuses past `paid`, and the **dispatch email**
(designed S105, never built — blocked on exactly this).

Two things the earlier brief assumed and this API does not give us:

- **No dry-run.** Site Flow had `POST /order/validate`. Printsmarter has no validate mode.
  ⚠ Updated S185: there is **no sandbox**, but our account is currently set so that submitted
  orders are **not forwarded to production**. That is an account setting they can flip, not a
  test mode — see §5.2.
- **No documented GDPR erasure endpoint.** Under the Site Flow plan this was an API call. Here it
  is a contract/process question. Route it into the contract review.

---

## 5. Open questions

_Updated S185 (2026-08-30). Four of the original nine are closed — the docs were re-read at
source and Printsmarter answered by email. **Do not re-ask the closed ones.**_

### Closed

1. ✅ **Two product codes, one per paper stock** — **both strings ISSUED BY PRINTSMARTER by
   email**, not chosen by us (confirmed S189). Heirloom prints on offset
   (`aevia_hardcover_offset`, `PRINTSMARTER_PRODUCT_ID_HEIRLOOM`), every other template on
   matte (`aevia_hardcover_matte`, `PRINTSMARTER_PRODUCT_ID`). Both in `functions/.env`; both
   required, so a half-set env refuses to build a client. `productIdFor()` picks between them
   off the order's `templateName`, matching all four Heirloom colourways on the prefix.
   ⚠ **`aevia_hardcover` (S185) is RETIRED — they removed it.** Do not "restore" it as a fix.
   ⚠ **Neither new id resolved on their side as of S189**: the first live `add_Order` returned
   `HTTP 400 "Product not found. aevia_hardcover_matte"`, with our env holding that exact string
   and no stray whitespace. **The ids are right and their product setup is incomplete** — owner
   emailed them 2026-09-21. Nothing to change in our code or config.
   ⚠ **No test can catch a wrong product id** — `tests/printsmarter.test.js` feeds a fixture
   string and asserts it arrives intact, so any value passes. Only a live call proves one.
   Their shop configurator defaults to 28 pages / quantity 10; the owner
   confirmed 40pp and quantity 1 are selectable, but **their written confirmation that the API
   accepts `pages: 40|80` at `quantity: 1` is still outstanding.**
2. ✅ **No sandbox** — but "your orders are not automatically forwarded to production by now, so
   you can submit as many orders as you like and they will not be produced" (email, S185).
   ⚠ **This is an account setting on their side, not a test mode.** When they enable forwarding,
   every submission becomes a real book with no change on our side. The owner asked for notice
   before that happens. `PRINTSMARTER_LIVE` guards our code paths only, not their switch.
3. ✅ **`price` is the actual sales price** — the docs say "it is absolutely necessary to transmit
   the actual sales price", for customs and proforma documents. Our `PRICE_BY_PAGE_COUNT`
   (€70 / €100 retail) is **correct as written**. Our *cost* (€8.47 at 40pp, €11.67 at 80pp,
   agreed on the call) must **never** go in this field.
4. ✅ **`shipping_code` accepts `"Standard"` or `"Express"`.** Only two values, documented.
   The Austrian shipping *price* per weight band is still unknown, but that is a **contract**
   question for the agreement they are drafting, not an API one.

### Still open

5. **`return_address`** — appears in their example but the docs never say whether it is required
   or what belongs in it. We send none. A failed delivery must not route to a private address in
   Vienna. Asked S185, unanswered.
6. **Postback registration.** The docs say the postback goes "to the URL provided by you" but
   document **no mechanism** for providing it. Our URL is deployed and verified (S185); it is
   registered by emailing it to them. ✅ *Security is no longer an open question* — the secret in
   the URL path authenticates their requests, so their dev team needs to build nothing. The S155
   question "can you add a token or signature?" (answered "I guess so, I'll check with our DEV
   team") is **withdrawn, not pending**.
7. **`order_id_client` idempotency.** Nothing in the docs. Until confirmed, assume a retry could
   print two books. Our own `printsmarterOrderId` once-only guard is the real protection.
8. **Preflight failures** — who tells us, how fast, through which channel.
9. **File size limit and URL lifetime** for the fetched PDFs. We sign for 7 days (v4 maximum).
   ⚠ Print PDFs are large — AEV-095's *preview* alone is 231 MB.
10. **Geometry.** The one-pager's §A questions (board overhang, hinge gap, turn-in, and whether
    `spine = 6 + 0.1 x pages` is a formula or two data points) are not recorded as answered.
    S152/S153 shipped against 10mm/14mm and the print came back correct, so this is confirmation,
    not discovery — but it should land in writing in the contract.

## 6. Watch-outs

- **Rotation was considered and declined (S155).** The token is a bearer credential with no signing
  and no documented expiry: whoever holds it can place and cancel orders on our account, and we are
  on **post-payment monthly invoicing**, so misuse becomes an invoice. But Printsmarter sent it by
  **email**, so it already sits in plaintext in two inboxes and two mail providers — reissuing over
  a local copy is theatre. The cheap moment to rotate, if ever, is **before go-live**, while
  nothing depends on it. No rotation mechanism is documented, so ask before assuming one exists.
- **The handling rule is what matters.** Server-side only — in a Cloud Function, read from
  `functions/.env`. Never in `assets/js/` or anything the browser loads. A frontend leak exposes it
  to every visitor and is a different order of problem from a local log file.
- **`order_id_client` is our idempotency key.** Nothing in the docs says a repeated
  `order_id_client` is rejected. Until we confirm it is, assume a retry could print two books.
- **Status is German free text**, so string-matching it is brittle. Collect the real values before
  mapping them onto our order statuses.
