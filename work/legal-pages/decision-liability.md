# Decision: Liability clause — keep the order-value cap, do not exclude slight negligence

**Date:** 2026-09-12 (S186)
**Status:** Committed
**Applies to:** AGB §8 in `drafts_en_v1.md`

## Context

The benchmark (`benchmark_v1.md` §3) found Journi GmbH excludes liability for slight negligence
**entirely**, where our draft merely **caps** it at the value of the order. Owner is an
**Einzelunternehmer and therefore personally liable with private assets**, so the question was
whether to adopt the more protective competitor position.

## Decision type: REVERSIBLE — and this is the key fact

It is text on an unpublished page. No customer has accepted any version. Changing it is an edit
and a redeploy.

⚠ **The one-way door is the FIRST LIVE ORDER, not today.** AGB §10 states the version accepted at
order time governs that order, so every order permanently locks in whichever wording was live when
it was placed. Decide before launch; after launch, changes only bind future orders.

Because it is reversible, this was decided at ~70% confidence rather than exhaustively. Do not
reopen it as though it were an architecture choice.

## Options Considered

1. **A — Keep the cap (baseline)** — slight negligence capped at the order's value; consequential
   loss excluded. What the draft already says. Zero work.
2. **B — Journi's position** — exclude liability for slight negligence entirely.
3. **C — Cap plus benchmark additions** — A, but naming the PHG (Produkthaftungsgesetz) explicitly
   and adding third-party claims to the excluded heads of damage.
4. **D — Say nothing, rely on statute** — dismissed. Silence is strictly worse than A: the default
   rules apply with no consequential-loss exclusion at all.

## Decision

**We chose C** — keep the order-value cap, add the two benchmark items.

The argument that settled it: on a €70–100 product, the entire difference between B and A is
**refunding the book versus refunding nothing.** That is the whole upside of B, and it is bought
by trading certain enforceability for a clause that is attackable under §879 ABGB / KSchG as
grossly disadvantageous to a consumer — on the section where a severability failure is most
expensive, because a struck clause can drag neighbouring ones down with it.

Meanwhile the exposure that could actually hurt a personally-liable sole trader — **personal
injury, gross negligence, intent, product liability** — is **unexcludable under Austrian law by
either option.** Neither A nor B moves it by a cent. Choosing B optimises the part that barely
matters while the part that does is untouched.

Key trade-offs:
- **We gain:** certain enforceability; a clause that reads like a premium brand rather than a shop
  hedging against its own customers; closure of the one genuine hole (third-party claims).
- **We accept:** on an ordinary mistake we may refund up to the order value where Journi would
  refund nothing. Absolute exposure per incident: €70–100.
- **We assume:** the product stays €70–100, Austria-only, sold to consumers.

## Consequences

- **The real protection against personal liability is INSURANCE, not this clause.** A
  *Betriebshaftpflichtversicherung* for a one-person e-commerce business is typically a couple of
  hundred euros a year. Owner is considering it (S186). **Do not let a wording debate substitute
  for that decision.**
- ⚠ **Revisit if the assumption breaks:** a bulk or corporate order, delivery outside Austria, or a
  materially higher-value product. The cap scales with order value, which is the desired behaviour,
  but the reasoning that rejected B assumes a small absolute figure.
- Rules out adopting Journi's wording later without re-opening this record.
- **Do not re-raise B on the grounds that "a competitor does it".** That is precisely the argument
  considered and rejected here.

## Concrete edits this authorises (AGB §8)

1. Name the **PHG (Produkthaftungsgesetz)** explicitly rather than the phrase "if anyone is
   injured". Costs nothing, standard Austrian practice.
2. Add **third-party claims** to the excluded heads of damage. We omit it entirely today, and it is
   the head most likely to bite in practice — a customer sued over a photo they had no rights to
   upload.
3. Keep the plain-language consequential-loss wording. Journi's itemised list is harder to argue
   around; ours is readable, and readability is the brand position. **No change.**
4. Keep the existing statement that intent, gross negligence and personal injury are unlimited.
   It is not a concession — such liability is unexcludable, and a clause pretending otherwise is
   void and endangers the rest of the section.

## Next Steps

Folded into the S186 legal-pages update plan (`plan_v1.md`, Step 2).
