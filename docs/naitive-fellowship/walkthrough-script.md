# Walkthrough Video — Script & Shot List

_Companion to [application-plan.md](application-plan.md). The "one concrete thing" demo for nAItive._
_Target: one tight 75–90s cut. Optional 2-min extended cut noted at the end._

---

## What this video has to do

Not "tour of a photo-book site." It has to land one idea: **a non-engineer built and operates a real, live production system by orchestrating AI — and the judgment was his.** Show the working machine; let the voiceover carry the "how."

Rule of thumb: **screen does the proving, voice does the framing.** Don't narrate what's obviously on screen — narrate what *isn't* (that there's no team, no eng hire, that you made the calls).

---

## Before you record (prep)

- **Stage a real order in advance** so nothing is typed live and slow. Have one order already uploaded and sitting in the staff dashboard, and the customer-preview link open in a tab.
- Pick the **most visually striking template** for the hero shots (art-intensive — it's also the higher-purchase-intent concept).
- Have the **finished PDF already generated once** (so the "Preview PDF" link is live), but also be ready to click **Generate PDF** to show the progress bar moving — that live moment is worth it.
- Close noisy browser chrome, bookmarks bar, notifications. Clean desktop.
- Record at **1920×1080**, cursor visible, smooth slow movements. Tools: Loom, ScreenStudio, or OBS.
- Record VO separately (cleaner) or speak while clicking if you're comfortable. Keep pace calm — this reads as confidence.

---

## The tight cut (75–90s)

Format below: **[ON SCREEN]** = what we see / do · **VO** = what you say.

### 0:00–0:10 — Hook
**[ON SCREEN]** Live site home page (aevia-test.pages.dev), then quick cut to the staff dashboard showing real orders in a list (AEV-xxx references visible).
**VO:** "This is Aevia — a premium photo-book service that's live and taking real orders. But the orders aren't the thing I want to show you. This is."

### 0:10–0:25 — The customer order flow (fast)
**[ON SCREEN]** Order form: scroll through the stepped flow — details → cover → photos. Don't fill it live; show it pre-filled or scrub quickly.
**VO:** "A customer places an order and uploads their photos through a guided flow — built to survive real-world mess: phone uploads, retries, HEIC files, hundreds of photos."

### 0:25–0:50 — The template engine (THE HERO — give it the most time)
**[ON SCREEN]** Open the staff template engine on that order. Show the book laid out automatically. Drag a photo to reposition, switch a caption, flip a page or two. Let the design quality breathe.
**VO:** "This is the engine. It lays the book out automatically across multiple templates, then I refine it in the browser — repositioning, captions, layout. What used to need a designer per book now takes minutes. Four distinct book designs run through the same system."

### 0:50–1:05 — Customer preview, approve, pay
**[ON SCREEN]** Switch to the customer-preview link: the customer sees the exact book, flips through, hits approve. Flash the Stripe checkout.
**VO:** "The customer previews the exact book in their browser, approves it, and pays — all in one flow. No back-and-forth, no email proofs."

### 1:05–1:20 — Print-ready output (the payoff)
**[ON SCREEN]** Back in the dashboard: click **Generate PDF**, show the progress bar moving, then the **Preview PDF** link → open the print-ready PDF.
**VO:** "And a server-side renderer turns the approved book into a print-ready file — the actual thing that goes to the printer. Order to print, almost no manual labour."

### 1:20–1:30 — The real point (close on this)
**[ON SCREEN]** Optional: a glance at the repo / architecture docs / passing tests, or just your face / a plain title card.
**VO:** "Here's the part that matters: I'm not an engineer. I built and operate this whole system — front end, back end, the cloud render pipeline, the cost architecture — by orchestrating AI agents, while holding the judgment myself. When delivery costs spiked, I traced it to a data-egress problem and re-architected it down about two-hundred-fold. The thing I actually built isn't the photo books. It's the orchestration that makes them."

---

## Extended cut (only if they allow ~2 min)

Insert between **1:05** and **1:20**, before the close:

- **The egress story, shown not told (~20s):** flash the billing spike, then the ADR / decision doc, then the result. "I diagnosed it, wrote the decision down, and executed it through AI." This is your strongest 'judgment under AI' beat — worth the extra time if you have it.
- **The validation (~10s):** a clean card with the blind-test result — "Chosen best book overall by 2.5× against CEWE, Journi and Fotobuch, brands hidden, identical photos." Proves it's wanted, not just built.

---

## Voiceover, clean copy (for a separate audio take)

> This is Aevia — a premium photo-book service that's live and taking real orders. But the orders aren't the thing I want to show you. This is.
> A customer uploads their photos through a guided flow, built to survive real-world mess. Then this engine lays the book out automatically across multiple templates, and I refine it in the browser — what used to need a designer per book now takes minutes.
> The customer previews the exact book, approves it, and pays in one flow. A server-side renderer turns it into a print-ready file — order to print, almost no manual labour.
> Here's the part that matters: I'm not an engineer. I built and operate this whole system by orchestrating AI agents, while holding the judgment myself. When delivery costs spiked, I traced it to a data-egress problem and re-architected it down about two-hundred-fold. The thing I actually built isn't the photo books. It's the orchestration that makes them.

_~150 words ≈ 80–90s at a calm pace._

---

## Notes / decisions to confirm

- **Show your face at the close or not?** A 5-second talking-head close ("I'm Evgeny, I built this") adds authorship and warmth. Optional.
- **Name the AI tool (Claude Code) explicitly?** Recommend keeping it generic ("AI agents") in the video unless they ask — keeps focus on judgment, not tooling.
- **Don't oversell the survey in the tight cut** — N≈20. The 2.5× blind-test line is strong and honest; leave it at that.
