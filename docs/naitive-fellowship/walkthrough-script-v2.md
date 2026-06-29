# Walkthrough Video — Script v2 (Evgeny's voice, longer cut)

_Companion to [application-plan.md](application-plan.md) and the original fast-cut [walkthrough-script.md](walkthrough-script.md)._
_This version keeps Evgeny's natural first-person flow, moves the "non-engineer orchestrating AI" frame to the front + close, and folds in the cost/egress judgment beat. Written to be **read aloud start-to-finish**, not as separated edit columns._

_Target: a complete **~2.5–3 min** cut. Record everything here; a tight 90s can be cut from it afterwards._

---

## Recording prep (unchanged from v1)

- Stage a real order in advance (pre-uploaded, sitting in the dashboard; customer-preview link open in a tab) so nothing is typed live and slow.
- Have the finished **PDF already generated once** so "Preview PDF" is live — but still click **Generate PDF** on camera to show the progress bar move.
- Clean desktop, no notifications/bookmarks bar. Record 1920×1080, cursor visible, slow smooth movements.
- Record VO separately for cleaner audio, or speak while clicking if comfortable. Calm pace = reads as confidence.

---

## The script

Timings are approximate (calm pace, ~150 wpm). Total ≈ **2:35–2:55**.

| # | ~Time | What's on screen | Voiceover (read aloud) |
|---|-------|------------------|------------------------|
| **0 — Frame** | 0:00–0:18 | Live site home page, slow scroll. | "This is Aevia — a premium photo-book service. What I actually want to show you isn't the books, though. It's that I built and run this whole thing — the website, the editor, the back end, the print pipeline — solo, and I'm not an engineer. I did it by orchestrating AI. Let me walk you through it." |
| **1 — Status** | 0:18–0:30 | Stay on home / a designs section. | "It's not live yet — I'm still testing print quality and developing more designs together with artists — but most of it works end to end, so let me show you the real flow." |
| **2 — Product → order** | 0:30–0:52 | Product page of the travel template → into the order form → scroll the stepped flow (details → itinerary → photos). | "Here's the product page for this travel template, made with an artist. From here the customer goes to the order form — they add their order, share a few details about the trip, and upload their photos. I've pre-uploaded one so we don't wait. The form is built for real-world mess — it accepts all the common formats and flags low-quality images before they ever reach me." |
| **3 — Order arrives** | 0:52–1:00 | Cut to inbox: the order-notification email. | "When they submit, I get an email — and the order lands in my dashboard." |
| **4 — Dashboard** | 1:00–1:08 | Staff dashboard, new order in the list → click "Open in engine". | "From the dashboard I can see the new order and open it straight into the staff engine to start editing." |
| **5a — Engine: automatic part** | 1:08–1:25 | Engine loads the assembled book; pages flip showing auto-layout. | "And here's the book — already assembled from what the customer sent. The photos are sequenced automatically from their metadata, and the captions and special pages are pre-set. The engine adapts to whatever they uploaded — it loads the right page layout depending on the photos themselves." |
| **5b — Engine: the part I do** | 1:25–1:42 | Drag-swap a photo, type a caption, change a font. | "My job is to check it's right, and refine — swap a photo, add a caption, either myself or with AI, adjust the type. A spartan toolkit, but enough to finish any book in minutes — work that used to need a designer per book." |
| **6 — Artist collaboration** | 1:42–2:02 | Hover/zoom the cover artwork, then the interior motifs. | "A word on this template — it's a collaboration with a well-known artist. He painted the cover and wrote a wish to the customer. The motifs inside aren't his hand directly — they're AI, trained on his work to mimic his style, made by me, with his blessing. That mix is the kind of thing the system lets me do." |
| **7 — Customer preview** | 2:02–2:15 | Switch to customer-preview link; flip through; swap a photo / edit a caption as the customer. | "When I'm done, the customer gets an email with a preview. They see the exact same book I do — it's already good, but they can swap a few photos or change captions themselves." |
| **8 — Approve & pay** | 2:15–2:23 | Customer approves → Stripe checkout flash. | "Once they're happy, they approve and pay — and the order's ready for print." |
| **9 — Print PDF + cost beat** | 2:23–2:48 | Back in dashboard → click **Generate PDF** → progress bar moves → **Preview PDF** opens the print file. | "Back in the dashboard, I generate the print-ready PDF — the real file that goes to the printer, at full photo quality. This step is also where I hit my hardest problem: early on, the cloud bill spiked, and almost all of it was data moving in and out of storage on every view and every render. I traced it, wrote the decision down, and re-architected it — about two-hundred times cheaper. No engineer told me to; I had to reason it out and execute it through AI." |
| **10 — Close** | 2:48–2:58 | Cut to repo / architecture docs / passing tests — or your face. | "So the thing I really built isn't the photo books. It's the system that produces them — and the judgment behind every call in it was mine." |

---

## Where the 90s cut comes from (if needed)

To get to a tight ~90s, drop in this order (each is self-contained):
1. **§1 Status** (–12s) — the "not live yet" caveat is honest but not load-bearing on camera.
2. **§6 Artist collaboration** (–20s) — strongest *unique* beat, but the most cuttable for time; keep it if the format allows length.
3. Trim **§5a/§5b** into one (–10s) — say "assembled automatically; I just refine it" and show, don't narrate each tool.
4. Compress **§9** to the diagnosis + result only (–8s): "the cloud bill spiked on data egress; I traced it and re-architected it ~200× cheaper."

Frame (§0) and Close (§10) are non-negotiable — they carry the whole "judgment, not headcount" point the fellowship selects on.

---

## Two wording decisions to lock before recording

- **§6:** "with his blessing" vs the plainer "discussed in advance, and he's fine with it." Pick the one that feels true to how it actually went.
- **§9 number:** "about two-hundred times cheaper" (concrete, from the ADR) vs "dramatically cheaper" (vague, unpinnable). Concrete is stronger if you're confident defending the figure.
