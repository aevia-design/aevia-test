# Legal pages — update plan (parked 2026-09-12, S186)

**Status: PARKED by owner.** Not urgent; owner switched to cover SVGs / coordinates and print
tests. This file exists so the S186 context is not lost. **Entry point for resuming — read this
first, then `benchmark_v1.md`, then `decision-liability.md`.**

## Where things actually stand

Three English documents exist as **markdown drafts only** in `drafts_en_v1.md`: Impressum, Privacy
Policy, AGB (11 sections). **No HTML, not linked from any footer, nothing live, no German.**
Verified S186: there is no impressum/agb/datenschutz file in `pages/` and no footer reference
anywhere in the repo.

Tracked as TO-DOS **#25**. Cookie dependency cross-linked from **#9** and **#10**.

## Decisions already made — do NOT re-litigate

| Settled | Where |
|---|---|
| Liability: keep the order-value cap, do not exclude slight negligence | `decision-liability.md` |
| No cookie banner needed **today** (Firebase + Stripe are consent-exempt) | S183 research |
| No-returns for personalised books is sound (CRD 16(c), CJEU C-205/21) | S183 research |
| Payment — not approval — is the point of no return | S183, owner |
| OpenAI stays disclosed as a processor (GDPR Art. 13) | S186, owner |
| No ODR link — **because the platform shut down 20 July 2025**, not because of Austria-only | `benchmark_v1.md` Delta A |
| No accessibility statement — microenterprise exemption under the EAA | `benchmark_v1.md` §1 |
| Retention wording follows the cheap mechanism, not the reverse | S186, owner (Step 1) |
| No phone in the Impressum; Austrian law; Vienna courts; Austria-only delivery | S183, owner |

## Open — needs the owner, nobody else can decide these

1. **Marketing licence over customer books.** Our draft permits using customer photos *only* to
   design, produce, deliver and support the book. Journi takes a broad commercial licence.
   **As drafted we cannot show a real customer's book in marketing without asking them.** If
   Instagram is a core channel (TO-DOS #21), this needs an opt-in at order time or a clause.
   → `benchmark_v1.md` §6
2. **Photo retention: confirm 12 months.** Drives the GCS lifecycle rule in Step 1.
3. **Which analytics/ads tools, and when** (TO-DOS #9, #10). Gates the whole cookie section.
4. **`privacy@aevia.at`** — create the alias? Proposed S186 instead of filtering `support@` on a
   magic subject line, which fails because real requests never use one.
5. **Betriebshaftpflichtversicherung** — get a quote. The actual protection against personal
   liability; the clause is not.

## The work, in order

### Step 1 — Retention: make the promise true *(do FIRST — it gates publishing)*
The draft says photos are "deleted automatically". **Today nothing deletes anything** — no
lifecycle rule, no deletion job in `functions/`, storage grows forever at 1–4 GB per order.

Fix (owner agreed S186): **change the promise to match the cheap mechanism.** GCS Object Lifecycle
knows a file's *age*, not order status — so say "12 months after upload" and set a 365-day
lifecycle rule on the bucket. Zero code, zero cost, Google enforces it, nothing to monitor.
Rejected: a scheduled function reading each order's delivery date — real code, a cron job, fails
quietly. In practice delivery is weeks after upload, so the customer experience is identical.

⚠ **Publishing the privacy page before this rule exists means publishing a documented GDPR
commitment you are visibly breaching.** Rule ships with the page or before it.

7-year order/invoice records need no automation — small text, legally required to survive.

### Step 2 — Apply the corrections to `drafts_en_v1.md` → `drafts_en_v2.md`
1. **AGB §7 — add a non-defect list.** *Highest-value change found in the benchmark.* Enumerate
   what is NOT a defect, anchored to the approved preview: customer typing errors, wrong product
   selection, insufficient photo quality, anything approved in the preview. Our approval flow makes
   this clearer than Journi's, yet we never state it. This is the clause that prevents arguing
   about a free reprint.
2. **AGB §8 — liability**, per `decision-liability.md`: name the PHG; add third-party claims to the
   excluded heads; keep plain-language consequential loss; keep the unexcludable-liability
   statement.
3. **AGB §5 — fix the flow error.** "You can request changes" implies a customer-driven edit cycle
   that does not exist. Real flow: we design → we send a preview → customer requests changes or
   approves → they pay → it prints. ⚠ **Re-check §3, §6 and §7 against it** — all four depend on
   payment being the point of no return and break together if one drifts.
4. **AGB §2** — name the moment of contract conclusion precisely, as Journi does.
5. **Withdrawal** — cite **FAGG §11(2) Z3** by paragraph, not the directive in the abstract.
   (Journi's second ground, §18(1) express-demand, only worth adding if the checkout actually
   captures that declaration — pairs with the Widerrufs-Button work, not before.)
6. **Impressum** — add the DSA Art. 4 liability-for-content disclaimer (one sentence).
7. **Impressum** — record *why* the ODR link is absent, so nobody re-adds it after seeing it on a
   competitor's site.
8. **Privacy** — retention wording per Step 1; swap `support@` for `privacy@aevia.at` if the alias
   is created.

### Step 3 — Build the compliance-checklist skill *(deferred by owner until after the benchmark —
now unblocked)*
A project-specific skill encoding: Impressum mandatory fields (§5 ECG + §14 UGB), FAGG
pre-contractual duties, the Widerrufs-Button, GDPR Art. 13 elements, AGB clause validity under
§879 ABGB / KSchG. Turns "did we remember everything?" from judgement into a check. Build it
**after** Step 2 so it encodes what we learned rather than what was assumed.

### Step 4 — HTML pages + footer links
Three pages in `pages/`, copy the nav/footer pattern from an existing page, link from the global
footer. Customer-facing copy → **`/stop-slop` pass before it ships** (CLAUDE.md).

### Step 5 — German versions
⚠ Legal German is **not** a translation job — the Austrian terms of art (Gewährleistung,
Rücktrittsrecht, Haftung) are the operative words. Treat as authored, like the book copy.
Folds naturally into the outstanding **native-German read** of every surface (STATUS.md next-step
#2), which is still the single largest unverified surface in the project.

## Known gaps this plan does NOT close

- **The Widerrufs-Button (2026 FAGG)** is a checkout UI change, not page copy. Publishing these
  pages does not close that compliance gap. Tracked separately.
- **Firmenbuch registration.** Drafts deliberately say **"Evgenii Miasin e.U."**, not "Aevia e.U.",
  and claim **no Firmenbuch number**. When registration lands, the entity name and the number
  change together — on all three pages *and* `docs/business-legal-facts.md`, the same day.
- **Journi's privacy policy 404'd**, so retention, their processor list and AI disclosure were
  never benchmarked. Our numbers stay a reasoned proposal, not a peer-matched figure.
- **No lawyer review.** Owner's call. If money is ever spent here, spend it on the **AGB only** —
  Impressum and Datenschutz are mechanical; the AGB is where bad drafting costs money.
- **Template artwork licences expire 3 years after first publication** (Wander agreement). Selling
  past that means selling artwork Aevia is not licensed to use. Owner aware, no tracking note
  wanted.
