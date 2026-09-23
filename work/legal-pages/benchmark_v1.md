# Legal pages — competitor benchmark v1

_Session 186 (2026-09-12). Compares `drafts_en_v1.md` against what comparable businesses
actually publish. Primary benchmark: **Journi GmbH** (Vienna, photo-book app, same product,
same jurisdiction). Secondary: **myposter** (DE, photo products at scale)._

**Why Journi:** Austrian, Vienna-registered, sells personalised photo books to consumers, and is
large enough to have had its terms professionally drafted. Closest available like-for-like.

---

## Sources

- Journi Impressum — <https://www.journiapp.com/legal/>
- Journi Terms of Service — <https://www.journiapp.com/terms-of-service/>
- Journi privacy policy — **404 at the linked path**; not compared. See gap 9.
- myposter withdrawal policy — <https://www.myposter.de/hilfe/habe-ich-ein-widerrufsrecht>
- ODR platform closure — Regulation (EU) 2024/3228; <https://www.twobirds.com/en/insights/2025/global/the-end-of-the-european-online-dispute-resolution-platform>

---

## 1. Impressum — we match, with two deltas

Journi discloses: entity + legal form, address, phone, email, Firmenbuch number (FN 413393 g)
and court (HG Wien), UID (ATU68665857), managing director, trade authority (Magistratisches
Bezirksamt für den 14. Bezirk), WKO chamber + section, and the applicable trade laws
(GewO, GmbHG, UGB).

Our draft matches field-for-field with the differences a sole trader has: **no Firmenbuch number**
(registration in progress — deliberately not claimed), **no managing director** line, and GewO +
UGB rather than GmbHG. Phone is omitted by owner decision; Journi publishes one.

### Delta A — ODR link: our omission is CORRECT and Journi's page is stale

Journi links the EU ODR platform. **That platform was permanently shut down on 20 July 2025**
under Regulation (EU) 2024/3228 — no new complaints since 20 March 2025, all data deleted.
Linking it now points customers at a dead page and is itself a (minor) information defect.

S183 omitted it on the reasoning "Austria-only delivery". The omission is right; **the reason
recorded was wrong**. Correct reason: the platform no longer exists. Worth recording so a future
session does not "helpfully" add it back after seeing it on a competitor's site.

### Delta B — DSA liability-for-content disclaimer: we lack one

Journi: *"Liability for the contents of this website and, in particular, for the links set is only
applicable within the scope of Art 4 et seq DSA."* Standard boilerplate, one sentence, no downside.
**Recommend adding.**

### Non-gap — Accessibility Statement

Journi publishes one (European Accessibility Act, in force for e-commerce since 28 June 2025).
**Aevia is exempt**: the EAA carves out microenterprises providing services (<10 staff AND
<€2m turnover). Do not copy this. ⚠ The exemption is headcount-and-turnover based, so it is not
permanent — revisit if the business grows.

---

## 2. Withdrawal — Journi belts AND braces; we only belt

We cite the personalisation exemption (CRD Art. 16(c), FAGG generally). Sound, and confirmed by
CJEU C-205/21. myposter relies on the same ground for all photo products.

Journi stacks **two independent grounds**:
1. **FAGG §11(2)** — goods clearly tailored to personal needs (our ground), and
2. **FAGG §18(1)** — the customer *expressly demands* performance begin before the withdrawal
   period expires, and once performance completes the right is lost.

**Recommend:** cite **FAGG §11(2) Z3** explicitly by paragraph rather than the directive in the
abstract, and consider adding the §18(1) express-demand ground. The second is only worth taking if
the checkout actually captures that declaration — a clause claiming a declaration the UI never
collects is worse than not having it. Pairs naturally with the Widerrufs-Button work.

---

## 3. Liability — Journi is more aggressive than us; ours is more defensible

| | Journi | Our draft |
|---|---|---|
| Gross negligence / intent | liable (cannot be excluded) | liable, stated |
| Personal injury / PHG | unaffected, stated | stated |
| **Slight negligence** | **excluded entirely** | **capped at order value** |
| Consequential loss | excluded, itemised | excluded, general wording |
| Cap | material value of the print product | value of the order |

Two real findings.

**(a) Journi excludes slight negligence outright.** We only cap it. Theirs is the more protective
position and is common practice in Austrian e-commerce — but a blanket exclusion against a
consumer is attackable under §879 ABGB / KSchG as grossly disadvantageous, and if struck the whole
clause can fall. Ours is the conservative version: certainly enforceable, slightly less protective.
**Owner decision, not a drafting one.** Given personal liability as an e.U., the honest framing is
that the gap between the two options is the difference between "we refund your €100 book" and
"we refund nothing" — small in absolute terms. Insurance moves the needle far more than this
clause does.

**(b) Journi itemises the excluded heads of damage** — "loss of profit, loss of interest, omitted
savings, other consequential damages and damages resulting from third party claims." Ours says
"knock-on losses beyond the order itself, such as lost income or a missed occasion." Ours is more
readable; theirs is harder to argue around. **Recommend keeping our plain-language version and
adding the third-party-claims head**, which we omit entirely and which is the one that could
actually bite (a customer sued over a photo they had no rights to).

**(c) Journi names the PHG** (Produkthaftungsgesetz) explicitly. We say "if anyone is injured".
Naming the statute costs nothing. Recommend.

---

## 4. Warranty — the biggest single improvement available to us

Journi **enumerates what is NOT a defect**: self-entered typing errors, wrong product selection,
design errors such as blank pages, and insufficient photo quality. They also require complaints
immediately, to a named address.

Our draft covers "we will put right our own mistakes" but **never lists the customer-caused
failures that are not our problem** — despite our approval flow making this far clearer than
Journi's. Every one of those categories maps onto something in the Aevia journey: a name misspelled
in the order form, a low-resolution photo the customer supplied, a spread approved with an error in
it.

**Recommend adding an explicit non-defect list to AGB §7**, anchored to the approved preview. This
is the clause that prevents arguing about a reprint. Highest-value change found in this benchmark.

---

## 5. Delivery — ours is better, keep it

Journi: *"Delivery dates indicated by Journi are considered binding."* That is a commitment we
should not copy — ours says 10–15 business days as **estimates, not guaranteed dates**, with force
majeure. Journi does carry a force-majeure extension; we have one too. **No change.**

---

## 6. IP / content licence — a deliberate difference worth confirming

Journi takes a *"worldwide, free, irrevocable and non-exclusive licence for commercial use"* of
publicly visible user content, **and** reserves the right to use public content for its own
commercial purposes beyond the contract.

Our draft grants us permission to use customer photos **only to design, produce, deliver and
support the book**. Narrower, and better aligned with a premium brand promise.

⚠ **But it means we cannot put a customer's book in marketing without asking.** If marketing
intends to show real customer books, that needs either a separate opt-in at order time or a clause
here. **Product decision for the owner** — flagged, not changed.

---

## 7. Contract conclusion — check ours against the real flow

Journi fixes the moment precisely (the named checkout button) and states payment is due
immediately. Ours describes design → preview → approve → pay → print. Since S183 established
**payment is the point of no return**, AGB §2 should name the moment as precisely as Journi does.
Folded into the §5 rewrite already agreed.

---

## 8. Things Journi has that we do not, and should not copy

- ODR link (dead platform — see Delta A)
- Accessibility statement (we are exempt as a microenterprise)
- US-specific terms ("AS IS", disclaimed warranties) — we deliver to Austria only
- A broad commercial licence over user content (§6)

---

## 9. Not benchmarked — open

**Journi's privacy policy 404s at the linked path**, so retention periods, the processor list and
AI disclosure were **not** compared. Our own retention numbers therefore remain un-benchmarked —
they stay a reasoned proposal (12 months photos / 7 years records), not a peer-matched figure.
Retry from their app or a different path if a second opinion on retention is wanted.

⚠ Also unverified: whether any Austrian photo-book competitor names an **AI provider** as a
processor. Our OpenAI disclosure stands on GDPR Art. 13 directly, not on peer practice.

---

## Recommended changes, ranked

1. **Add a non-defect list to AGB §7** (§4 above) — biggest protective gain, zero legal risk.
2. **Add the third-party-claims head and name the PHG** in the liability section (§3b, §3c).
3. **Add the DSA Art. 4 content disclaimer** to the Impressum (Delta B).
4. **Cite FAGG §11(2) Z3 by paragraph** in the withdrawal clause (§2).
5. **Record why the ODR link is absent** so nobody re-adds it (Delta A).
6. **Owner decision:** exclude slight negligence entirely, or keep the order-value cap? (§3a)
7. **Owner decision:** do we need a marketing licence over customer books? (§6)
