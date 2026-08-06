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

- **No dry-run.** Site Flow had `POST /order/validate`. Printsmarter has no validate mode
  documented, so the first real call is a real order. Ask them for a sandbox or a test product
  code before we point anything at production.
- **No documented GDPR erasure endpoint.** Under the Site Flow plan this was an API call. Here it
  is a contract/process question. Route it into the contract review.

---

## 5. Open questions

Ordered by what blocks work.

1. 🔴 **Our product code.** `printsmartergmbh_hardcover` is *their example*, a 126-page book of
   unknown trim. We need the `product_id` for **our** book — 200×200mm, Rebecca content paper,
   our cover stock. Nothing can be submitted without it.
2. 🔴 **Sandbox or test mode.** Is there any way to submit without printing? If not, our first
   test order is a book we pay for — which may be the sensible way to run the sample round anyway.
3. **`price` — retail or cost?** Carried over unanswered from the old brief (Q13). Does it appear
   on a delivery note the customer sees?
4. **`shipping_code` values** for Austria, and the price per weight band. Our checkout delivery fee
   is still a placeholder.
5. **`return_address`** — their example is an Elanders address. A failed delivery must not come to
   a flat in Vienna. Confirm what we may put there.
6. **Postback registration.** The docs describe the payload but not how we register our endpoint,
   or whether it is authenticated. If it is unauthenticated, anyone who learns the URL can forge a
   dispatch email to a customer. Treat as a security question, not a plumbing one.
7. **Preflight failures** — who tells us, how fast, and through which channel.
8. **File size limit and URL lifetime** for the fetched PDFs.
9. **Geometry.** The one-pager's §A questions (board overhang, hinge gap, turn-in, and whether
   `spine = 6 + 0.1 × pages` is a formula or two data points) are not recorded as answered.
   S152/S153 shipped against 10mm/14mm and the print came back correct, so this is confirmation,
   not discovery — but it should land in writing in the contract.

---

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
