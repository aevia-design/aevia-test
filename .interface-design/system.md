# Aevia — Interface Design System

## Scope

This file covers the **customer preview engine** (`customer-preview.html`).
Marketing pages, order form, and staff engine → see `context/design-principles.md`.

---

## Tokens

Inherited from `design-principles.md`. No new colors needed.

```css
--bg:        #fafaf8;   /* page background */
--surface:   #f3efe9;   /* thumbnail sidebar, panels */
--border:    #e4dfd8;   /* all borders and dividers */
--text:      #1a1a1a;   /* primary text */
--muted:     #7d7570;   /* labels, secondary text */
--accent-dk: #a8895f;   /* gold — used sparingly */
--white:     #ffffff;   /* overlays, approve button */
--serif:     Georgia, 'Times New Roman', serif;
--sans:      system-ui, -apple-system, sans-serif;
```

Depth strategy: **borders only**. No drop shadows except the lightest ambient on floating overlays (`box-shadow: 0 4px 16px rgba(0,0,0,0.06)`). Matches the staff engine and marketing pages.

---

## Mental Model

The customer is **reviewing a proof, not using a tool.**

They received a link. Staff already designed the book. The customer's job is to confirm it looks right — and occasionally swap a photo or fix a caption. The interface should feel like opening a beautiful mockup, not launching software.

This shapes every decision below.

---

## Layout

Two distinct modes, switchable via a toggle in the top bar:

### Edit mode (default)

Close to the staff engine — familiar mechanic, but stripped of all staff controls.

```
┌─────────────────────────────────────────────────┐
│  NAV: Logo · [Edit ● | Preview ○] toggle · Approve button  │
├────────────┬────────────────────────────────────┤
│            │                                    │
│  Photo     │   Spread canvas                    │
│  sidebar   │   (scrollable list of spreads)     │
│  240px     │   Same as staff engine             │
│            │   Photo slots + caption fields     │
│            │                                    │
└────────────┴────────────────────────────────────┘
```

**What's present:**
- Thumbnail sidebar (same as staff engine) — unplaced section + per-spread sections
- Drag-drop photo-to-slot
- Direct swap between slots on the same spread
- Inline caption editing (click to edit)
- FP text panel editing (if spread has FP)

**What's removed vs staff engine:**
- Template/size selectors
- Mode toggle (Local / GCS)
- Order load panel
- Export PDF button
- AI caption button
- Spread type/reorder controls
- Special photo panel (cover/spine slots — staff manages these)

### Preview mode

A clean, spread-by-spread view. One spread fills the center. No editing controls visible.

```
┌─────────────────────────────────────────────────┐
│  NAV: Logo · [Edit ○ | Preview ●] toggle · Approve button  │
├─────────────────────────────────────────────────┤
│                                                 │
│              ← [  SPREAD  ] →                   │
│                                                 │
│                  • • • • •   (page dots)        │
└─────────────────────────────────────────────────┘
```

- Spreads centered, max ~1000px wide, with generous padding
- Left/right arrow keys + on-screen arrows to navigate
- Dot indicators below showing position
- No editing in this mode — read only
- Approve button always visible in nav

This mode is the "atelier proof" feeling. The edit mode is the working interface.

---

## Nav bar

Same visual pattern as staff engine, but different content:

```
Logo (left) · Edit/Preview toggle (center) · Approve button (right)
```

- **Edit/Preview toggle** — pill-shaped segmented control, same style as staff engine's mode-toggle-btn
- **Approve button** — primary CTA: dark fill (`--text` bg, white text), `border-radius: 3px`, all-caps 11px. Always visible — approving is the primary goal.
- No hamburger on mobile — the whole interface shows a friendly gate on narrow viewports

---

## Photo swap interaction

When a customer drags or clicks a photo slot to swap:

1. The photo is moved to the **Unplaced** section of the thumbnail sidebar (same mechanic as staff engine)
2. They drag a replacement from the sidebar into the empty slot
3. Or: drag one slot directly onto another to swap (layout may reflow if orientations differ — this is expected and correct)

No new interaction pattern needed. The staff engine mechanic is clear enough for customers, and familiar to anyone who has used photos in a presentation tool.

If the customer uploads a new photo (Could Have feature), an "Upload photo" button appears at the bottom of the sidebar — adds the new photo to Unplaced, from which they drag it into a slot.

---

## Caption editing

Click any caption to edit inline. Same as staff engine. No change needed.

For FP text panels: same collapsible panel as staff engine, minus AI button.

---

## Approve flow

The Approve button (always in nav) opens a confirmation state:

```
"Once approved, your book goes to print and you'll be directed to payment.
You won't be able to make further edits after this point."

[Cancel]  [Yes, approve my book]
```

- Inline below the nav, or a centered modal — either works
- After confirmation: calls `approveOrder`, shows payment link
- Copy tone: calm, precise — no "Amazing!" or exclamation marks

---

## Mobile gate

On viewports < 900px: hide the engine entirely, show a centered message:

```
[Aevia logo]

"Your book preview is ready."

"For the best experience reviewing and approving your book,
please open this link on a laptop or desktop."

[Your order reference: XXXX]
```

- Centered, generous padding, serif heading, body text in sans
- No partial UI — nothing broken, nothing interactive

---

## States to design

Every interactive element needs all states built:

| Element | States needed |
|---|---|
| Photo slot | empty, filled, drag-over, hover (shows swap affordance) |
| Thumbnail | default, placed (dimmed), drag-active |
| Caption field | read, focus/editing, empty (placeholder) |
| Approve button | default, hover, loading (after click), success |
| Preview navigation arrows | default, hover, disabled (at first/last spread) |

---

## What this is not

- Not a full photo editor — no crop, rotate, filter
- Not a redesign tool — no spread reordering, no template changes
- Not a mobile experience — desktop only, mobile gets the gate
- Not a replacement for the staff engine — staff still does all design work
