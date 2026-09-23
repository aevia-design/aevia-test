# Brief: Aevia Legal Pages — Impressum, Datenschutzerklärung, AGB

**Created:** 2026-08-17
**Objective:** Produce research-backed, launch-ready German-and-English content for three legal pages (Impressum, Datenschutzerklärung, AGB/Terms & Conditions) that meets Austrian and EU legal minimums for a company taking payment for physical goods online, so the site is no longer missing legally required disclosures before real orders go live.
**Audience:** Evgeny (non-lawyer site owner, will review and publish); site visitors/customers (will read the published pages); future Claude sessions maintaining these pages.
**Applicable Standards:** conducting-research (for the research phase); this project's `/stop-slop` customer-copy pass (these ARE customer-facing pages per CLAUDE.md, so slop-free plain language applies once drafted); Aevia's existing coding conventions (plain HTML, no framework, `de/` mirror pattern already used elsewhere on the site).

## Why

Aevia takes payment via Stripe on a live-adjacent test rig (production is waitlist-gated pre-launch, but the ordering flow works and will go live). TO-DOS #25 flags Terms & Conditions as a blocker: "something must exist before taking payments." Austrian law (UGB/ECG, GewO) separately requires an Impressum on any commercial website, and GDPR requires a Datenschutzerklärung describing what personal data is collected and why — both currently absent. This isn't a nice-to-have content task; it's a compliance gap with real (if likely small-scale, sole-proprietor) legal exposure, so it needs an actual research pass on what's legally required — not a template guessed from memory — before anything is drafted.

## What's already known (don't re-research)

- **Business facts** are collected in `docs/business-legal-facts.md` — entity name (currently "Evgenii Miasin e.U.", NOT "Aevia e.U." until Firmenbuch registration lands), address, UID/VAT (ATU83177107), GISA (39598240), privacy contact (support@aevia.at), and the processor list (Stripe, Firebase/GCP, Brevo, OpenAI — not yet live, Printsmarter — not yet live).
- **No cookie consent banner or tracking is implemented today.** A scan of `pages/home.html` and `pages/order.html` found no analytics, ad-tracking, or non-essential cookie-setting scripts — only Firebase (auth/storage, strictly necessary) and Stripe (strictly necessary for checkout).
- **Owner intends to add website analytics/tracking cookies later** (S183, owner) — "as any other business does to track activity." **That implementation is explicitly OUT OF SCOPE for this brief** — no analytics tool is being chosen or wired up now. What research must still cover: whether the Datenschutz page should be written to already anticipate a future analytics section (so it doesn't need a structural rewrite later), and what a consent-banner mechanism would need to look like when that day comes. Log the analytics/tracking decision as a new TO-DOS item once research clarifies the requirement, rather than building it here.
- **Owner's working assumption on refunds (S183, to be confirmed by research, not overridden by it without discussion): personalised/custom-made goods are not returnable**, consistent with how comparable businesses handle this. Research should confirm the legal basis (the EU withdrawal-right carve-out for custom-made goods) and surface it clearly, but the owner's stance is the expected answer, not an open question.
- **Owner's scale expectation: minimum required compliance, not enterprise-grade.** Aevia is a brand-new sole-proprietor business — the deliverable should distinguish "must have to not be in breach" from "what a mature company does," and default to the former unless the gap creates real risk.
- **Both English and German are required at launch**, not EN-only with DE deferred (S183, owner — overrides the earlier "confirm with germanization brief" framing). Owner will read the English draft to review and approve content; German is a required deliverable alongside it, following whatever page-structure pattern the germanization brief already established for bilingual content.
- **Refunds/returns context**: Aevia sells personalised/custom-made physical goods (photo books). EU consumer law (Fernabsatzrecht / Verbraucherrechte-RL) has a specific carve-out for the 14-day withdrawal right on custom-made goods — this is likely the single most important AGB clause to get right, since it directly affects whether a customer can demand a refund after a book is printed.
- **Owner would prefer a legal-review skill/subagent over hiring a lawyer, if one exists and is credible** (S183) — worth a quick check (global Claude skill search, or a marketplace like skills.sh) before defaulting to "get a human lawyer." If nothing suitable turns up, hiring a lawyer for a final sanity-check remains the fallback, not a requirement to force through some other way.

## Research Requirements (Phase 1 — before any drafting)

**From conducting-research:**
- [ ] Research question stated clearly per page (Impressum / Datenschutz / AGB each have distinct legal bases — treat as three sub-questions, not one blob)
- [ ] Sources are authoritative for Austrian/EU law specifically (WKO, RIS/legal text, EU consumer law guidance, or specialist legal-content providers like Trusted Shops/eRecht24/IT-Recht Kanzlei) — not generic US-centric "privacy policy generator" content
- [ ] At least 2-3 competitor examples reviewed (premium/custom photo book sellers, ideally EU-based e.g. a German or Austrian competitor) to see how a comparable business phrases the custom-goods withdrawal clause and the data-processing description
- [ ] Findings distinguish **legal minimum** (must-have to not be in breach) from **best practice** (what a well-run comparable site does beyond the minimum) — the deliverable should clearly flag which is which so Evgeny can decide how far to go
- [ ] Cookie/tracking question explicitly answered: does the current tech stack (Firebase, Stripe, no analytics) require a consent banner under EU ePrivacy guidance, or does "strictly necessary" cover it — cite the reasoning, not just a conclusion
- [ ] Withdrawal-right carve-out for custom-made goods (§18 Fernabsatzgesetz / EU equivalent) researched specifically — this determines what the AGB can legally promise about refunds/cancellation

## Constraints

- **Scope:** Three pages — Impressum, Datenschutzerklärung, AGB (Terms & Conditions with the refund/returns minimum TO-DOS #25 asks for). Emailer legal footer (already live, GISA-compliant) is NOT in scope — don't re-touch it unless research finds it's wrong.
- **Language:** Both English and German ship together (owner decision, S183) — check the germanization brief only for HOW to structure bilingual pages (e.g. `pages/de/` mirror vs. a toggle), not WHETHER to do German at all.
- **No legal advice claimed:** Evgeny is not a lawyer and neither is this research — the output is a well-sourced draft for him to review (and, ideally, have a real lawyer or a service like eRecht24 sanity-check before this handles real payments at scale). State this limitation plainly in the final deliverable.
- **Format:** Research output as a versioned file under `work/legal-pages/` (e.g. `research_v1.md`), separate from the eventual page drafts.
- **Out of scope for this brief:** Actual HTML page implementation — that's a follow-up brief/task once research is reviewed and approved by Evgeny.

## Success Criteria

The research phase is complete when:
1. Evgeny can read the research and understand, for each of the three pages, what's legally required vs. optional, with sources cited
2. The cookie-consent question has a clear, sourced yes/no answer for the current tech stack
3. The custom-goods withdrawal-right question has a clear, sourced answer that will directly shape the AGB's refund clause
4. All conducting-research requirements above are met

## References

**Business facts:** `docs/business-legal-facts.md`
**Related brief:** `docs/briefs/germanization.md` (for EN/DE page structure decision)
**Backlog item:** `TO-DOS.md` #25 ("Terms & Conditions page — minimum: refund/returns")
**Skill:** conducting-research (via `rageatc-core-oss:conducting-research`)

## Context

**Known risk:** Legal content is the one category where a wrong guess is costly — this is explicitly why the brief requires sourced research rather than drafting from training-data memory of "what privacy policies usually say."
**Known risk:** "Aevia e.U." is not yet the registered legal name — whatever page copy comes out of this must use "Evgenii Miasin e.U." until Firmenbuch registration confirms, per `docs/business-legal-facts.md`.
**Decision needed after research:** whether a credible legal-review skill/agent exists to sanity-check the drafts; if not, Evgeny should decide whether a real lawyer/eRecht24-type paid review is worth it before these pages go live with real payments, given the stakes are higher than typical site copy.
