# Marketing Sparring Partner for Xenia

## What
A Claude Cowork setup (Desktop app, pointed at a dedicated local folder) where Xenia
develops and maintains Aevia's marketing strategy with Claude acting as **analyst,
critic, and advisory council — never the strategist**. Three layers: the community
marketing skill pack (methodology), a `product-marketing.md` context file **built by
Xenia herself through a structured interview** (grounding), and folder instructions
enforcing evidence discipline (spine).

## Why
Chat-window AI fails a domain expert for four reasons: ungrounded in her specific
business, capitulates under pushback, pattern-matches instead of citing benchmarks,
forgets everything between sessions. Xenia — experienced marketer, sceptical that AI
can do strategy — is *right* about that scepticism, so the setup concedes it: she
supplies taste, judgment, and every decision; the AI supplies research legwork,
scenario math, structured dissent, and perfect file-based memory. Aevia has zero
marketing data today, so the strategy's honest form is an assumption ledger plus a
sequence of cheap experiments with kill criteria — discipline an AI enforces well and
a busy two-person team drops.

## How
- **Surface: Claude Cowork (Desktop) + a local folder** (optionally inside a synced
  drive so Evgeny can read the same files). Verified live 2026-07-10: the
  `coreyhaines31/marketingskills` pack (~57 skills incl. `product-marketing`,
  `marketing-plan`, `marketing-council`, `customer-research`, `pricing`, `referrals`,
  `content-strategy`) installs one-click via Plugins → custom marketplace from GitHub;
  its skills fire inside Cowork; files written to the folder land on real disk and are
  readable by later sessions. **No terminal, no manual upload loop.** Plugins are
  per-account → repeat the one-click install on Xenia's account.
- **Grounding — built, not given:** session 1 is the `product-marketing` skill
  interviewing Xenia to produce `product-marketing.md`, which every other skill reads
  first. The S111 business-model brief (Evgeny + Claude, ~30 min) is deliberately NOT
  pre-loaded — Evgeny disagrees with parts of it and it must not harden into ground
  truth. It stays available as one challengeable input she can ask for later.
- **Discipline layer:** folder instructions (see `folder-instructions.md`) enforcing:
  analyst/critic stance, never strategy author; every spend/time recommendation carries
  checkable evidence + cost cap + kill criterion; explicit `assumptions.md` ledger
  (assumption, confidence, cost-if-wrong, cheapest test); hold positions under
  criticism unless given a real argument, and say what changed your mind; correct the
  pack's SaaS accent for a premium physical gift product in DACH.
- **Working mode:** strawman-react. `marketing-plan` drafts section by section; Xenia
  approves, adjusts, or demolishes; her verdicts are what's saved. Authorship stays
  hers by construction. State lives in real files; sessions resume natively.
- **First contact sequence:** (1) the interview — she teaches the AI her business;
  (2) `marketing-council` on one of her real pending decisions — 12 documented
  marketers with a mandatory dissenter, the "AI = shallow consensus machine" killer;
  (3) `marketing-plan` cycle in strawman-react mode.

## Boundaries
- The AI never makes strategy decisions; final calls are Xenia's.
- No marketing *execution* automation (posting, ads management) — thinking support only.
- No terminal for Xenia. Evgeny handles setup (both accounts).
- Build only the thin missing layer; where the Haines pack covers a job, adopt it.
- No rageatc plugin for her at start — redundant methodology + skill-trigger noise;
  revisit once she's fluent if she wants generic thinking tools.
- Aevia's own data stays out of scope until it exists — instrumentation is a plan
  workstream, not a prerequisite.

## Open Questions
- The pack's SaaS skew: how much correction the folder instructions need shows only in
  real use; revisit after the first full `marketing-plan` cycle.
- Cowork web/mobile is beta — desktop is the stable path; phone steering is a bonus to
  test, not promise.
- Whether/when to show Xenia the S111 brief — suggested: after her own intake exists,
  as a "here's what we thought, attack it" exercise, not before.
- Whether she later wants the generic thinking skills (shaping, ideating) added.
