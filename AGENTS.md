# AGENTS.md — Aevia

Guidance for AI agents working in this repo (Codex and similar). Claude Code reads
`CLAUDE.md`; this file is the equivalent for agents that do not.

## Context

Aevia is a premium photo-book service (Vienna). Customers order and upload photos; staff
design and send a preview; the customer approves and pays; the book goes to print.

**This is a live production system.** `aevia.at` is serving real customers, real orders
exist in Firestore, and photo data is real. It is not greenfield. Changes can lose a
paying customer's book.

Deeper context, read in this order when you need it:
`STATUS.md` (current state) → `ARCHITECTURE.md` (design, codemap, invariants) →
`PRD.md` (requirements) → `docs/briefs/` (one per feature or open problem) →
`LEARNINGS.md` (mistakes already made — read before repeating one).

## Hard constraints

`ARCHITECTURE.md` § Invariants is authoritative — read it before proposing structural
change. The ones most often violated by newcomers to this codebase:

1. **No frontend framework, no build step, no npm on the frontend.** Plain HTML/CSS/JS;
   libraries arrive as a plain `<script>` tag. A deliberate long-term decision, not debt.
2. **Template logic lives in `<name>-data.js`,** never in the engine, order form, or PDF
   script — those stay template-agnostic.
3. **`scribble-data.js` is generated from a CSV.** Do not hand-edit its values.
4. **HEIC conversion is always sequential.** Parallelising it corrupts images (shared
   libheif WASM state).
5. **PDF fonts must be static TTF/OTF.** No woff2, no variable fonts.
6. **Never hardcode a hostname** in customer-facing URLs. Use `siteOrigin(req)` /
   `accountUrl(req)`. Hardcoding sends test checkouts to production, or test URLs to real
   customers.
7. **Photo slot coordinates are centre-based**, and are with-bleed. This looks like an
   off-by-half bug and is not.
8. **Do not apply an EXIF orientation swap.** It was added, then removed. Do not re-add it.
9. **Screen surfaces load the ~1600px web derivative; only the PDF script loads
   full-res originals.** Breaking this reintroduces the dominant cost (GCS egress).

## Engineering principles

- **Simplest thing that fully meets the current requirement.** No speculative
  abstractions, configuration, or indirection. If a solution feels clever or
  "future-proof", it is probably wrong.
- **Grow in layers.** Start from the smallest version that works end to end and add
  capability on top of something already working. Never trade a working product for
  unfinished complexity.
- **Fix root causes.** Do not leave band-aids or stopgaps meant to be replaced later.
- **Surgical edits.** Change only what the task needs. Do not reformat or "improve"
  unrelated code or comments.
- **Study prior art** before inventing an approach. Adopt proven patterns.
- **Preserve backward compatibility with live data.** Orders already in Firestore were
  written under earlier schemas. Removing a read path, status value, or field because it
  looks obsolete can orphan a real customer's book. Migrations are opt-in and explicit,
  never a silent cleanup.
- **Dependencies are allowed; the delivery mechanism is constrained.** The frontend already
  uses exifr, heic2any, Geoapify and the Firebase SDK. A frontend library must work as a
  plain `<script>` tag — no bundler, no transpile. Backend and tooling use npm normally.
  Ask the owner before adding either. Do not read "no frameworks" as "write it yourself":
  hand-rolling something a mature library does well is also a defect here.

## Cost awareness

The owner is non-technical and cannot easily predict cloud spend. Before proposing
anything touching Google Cloud / Firebase infra, state the expected cost and the main cost
driver in plain language. Watch for: GCS **egress** (the usual surprise), **region
mismatches** (keep storage, functions, and Cloud Run co-located in `europe-west1`), idle
billing, and anything scaling per-photo on a 1–4 GB order.

## Settled decisions — do not re-raise

These were considered and deliberately closed. Re-proposing them wastes a review cycle.

- **`heartCrop` naming.** It is a general reposition offset for all slots, despite the
  name. A rename was declined twice (it would require a Firestore migration and two
  deploys). Do not suggest renaming it.
- **Lifting engine constants into a data file.** Considered and dropped as YAGNI. Do not
  re-raise until real geometry variation exists.
- **Duplication between the staff and customer template engines.** They are deliberate
  parallel copies. The rule is: change one, mirror the change in the other. Do not propose
  unifying them.
- **CDN in front of GCS, and an R2 migration.** Both parked — unnecessary once web-res
  derivatives land (ADR-0005).
- **Inline styles for one-off layout tweaks.** Accepted by convention, not a defect.

## If you are reviewing code

- Judge against `PRD.md` and `ARCHITECTURE.md`, not against generic best practice. This
  codebase makes unusual choices on purpose; most are documented above or in `LEARNINGS.md`.
- Distinguish **"this is a bug"** from **"I would have built it differently."** Only the
  first is worth reporting. Say which you mean.
- Prefer few high-confidence findings over an exhaustive list. State your confidence, and
  say plainly when you are unsure.
- Give a concrete failure scenario for each finding: the input or state that triggers it,
  and the resulting wrong behaviour. A finding without one is a style opinion.
- The owner is new to coding. Explain findings in plain language; skip the jargon.
