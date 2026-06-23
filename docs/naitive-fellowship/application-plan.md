# nAItive Fellowship — Application Plan

_Working doc. Goal: be ready to submit "one concrete thing you have built" when Evgeny starts the application._
_Started S72 (2026-06-23)._

---

## The opportunity

[nAItive Institute](https://naitive.institute/) — a 6-month, fully-funded, **equity-free** fellowship for AI-native founders. 20-person cohort.

**Their thesis (matters for everything below):** execution is becoming abundant, so they select on **judgment**, not ideas or credentials. Their belief: "the founders who move first won't be the ones who hire fastest — they'll be the ones whose judgment is sharpest." They champion **orchestration over headcount** — building agent-based systems instead of growing a team.

**They select for one of three "Outstanding Personal Competitive Advantages" (OPCA):**
1. Deep domain expertise (specialist-level mastery)
2. Unusual skill combinations (two domains intersecting)
3. **Autonomous achievement** — "outsized results relative to age, context, and resources — before anyone gave permission"

The stages assess **how you reason and adapt when AI changes how a problem gets solved** — not the polish of the artifact alone.

---

## The decision: what "one concrete thing" we show

**A live, end-to-end automated photo-book production system — customer order to print-ready PDF — built and operated solo by a non-engineer (Evgeny) through AI-agent orchestration.**

NOT "Aevia the photo book brand." The **system** is the artifact; Aevia is the real, paying context proving it isn't a demo.

**Why this is the right choice for THIS audience:**
- Concrete and live — real orders (AEV-xxx), real Stripe payments, a real print pipeline. Meets their "validated product, not prototype" bar.
- Hits **two OPCAs at once**: *autonomous achievement* (non-engineer ships a production system solo, no eng team, no permission) + *unusual skill combination* (premium editorial/design taste × AI-orchestrated systems building).
- It literally **embodies their founding thesis** — "orchestration over headcount." One person doing the work of a designer + frontend + backend + print engineer.

**Chosen framing (confirmed by Evgeny):** lean into "non-coder who orchestrated a production system." Be honest about *how* it was built — that honesty is the whole point.

---

## Draft narrative (short version, ~150 words)

> I built a working photo-book production system that takes a customer from order to print-ready file with almost no manual labour: an order form collects photos and details; a browser-based template engine lays out the book across multiple design templates; the customer previews and approves the exact book in their browser; payment runs through Stripe; and a server-side renderer produces the print-ready PDF. It's live, takes real orders, and spans four distinct book templates.
>
> What makes it unusual is *how* it was built. I'm not an engineer. I built and operate the whole system — frontend, backend, a cloud render pipeline, cost architecture — by orchestrating AI agents while holding the judgment myself: what to build, what to cut, where the real problems were. When photo-delivery costs spiked, I diagnosed it as a data-egress problem and re-architected it down ~200×. The thing I actually built isn't the photo books — it's the orchestration that produces them.

_Tune length/emphasis once the application format is known._

---

## Evidence assets

### 1. Walkthrough video (PRIORITY — most convincing, format-agnostic)
60–90s screen recording of the real flow: order form → staff template engine → customer preview/approve → print-ready PDF. Works as a link, attachment, or live demo.
- **Status:** to script + record. Dashboard PDF-generation now works (tested preliminarily 2026-06-22), so a live demo won't hit a half-wired button.
- **Next:** write a shot-by-shot script so recording is a ~20-min job. (See "Next steps".)

### 2. Competitive validation (the Xenia survey) — STRONG
Small but real study, N≈20 of target audience, run on the first two physical book products. Two parts:

**Part A — concept evaluation** (art-intensive vs art-subtle templates):
- 53% liked both concepts; 35% liked art-intensive only; 12% art-subtle only.
- Purchase interest: **15/17 for art-intensive**, 11/17 for art-subtle.
- **50% of respondents left their email** (real demand signal).

**Part B — blind competitive test** (N=20): Aevia 'art-subtle' vs Journi, Fotobuch, CEWE. Same photos, same page count, all premium tier, **brands hidden**. Pricing deliberately excluded.
- **Best book overall: Aevia 50%** — CEWE 20%, Fotobuch 20%, Journi 10%, None 0%. (Aevia wins by 2.5×.)
- **Aevia led 4 of 6 attributes:** Cover 50%, Format/size 60%, Design & extras 50%, Page layout 60%.
- Weaker on: Page feel 20%, Photo look 30% (Fotobuch best on photo look at 40%). → honest "here's what I'm improving" line.

**Distilled claim (1 line):** _"In a blind test against CEWE, Journi and Fotobuch on identical photos, Aevia was chosen best book overall by 2.5× the nearest competitor and led 4 of 6 design attributes."_

### 3. Cost-architecture anecdote (best "judgment under AI" story)
The egress story shows reasoning about a real problem, not just prompting:
- A post-trial bill spiked; 99.7% was GCS **egress** (full-res originals re-downloaded on every view + every PDF run), not storage.
- Diagnosed the real cost driver, wrote an ADR, then re-architected: web-resolution previews for screens (~87× smaller) + in-region server-side PDF render. Net ~200× reduction on a large order.
- Demonstrates: framing the right problem, making a documented architectural decision, and executing it through AI — judgment, not autocomplete.

### 4. Engineering discipline as proof of orchestration (supporting)
The repo itself shows a non-engineer running a real engineering process: architecture docs, ADRs, session logs, 116 passing tests, multi-surface parity. Useful as backup evidence if they want depth.

---

## Open items / what we still need

- [ ] **Application format** — unknown until Evgeny starts the process (written? demo? link? video?). Prepare the artifact to flex across all.
- [ ] **Real order/revenue count** — quantify even roughly; strengthens "validated."
- [ ] **Start date / runway** — how much polishing time before submitting.
- [ ] Decide whether to mention the AI-orchestration *explicitly* in the narrative (current draft does — aligned with chosen framing).

## Next steps (this session / soon)

1. Write the **walkthrough video script** (shot-by-shot, ~20-min record).
2. Draft the **cost-architecture paragraph** as a standalone story.
3. Finalise the **one-line + short narrative** once format is known.
4. (Already done) Dashboard PDF generation working — keep it demo-ready.
