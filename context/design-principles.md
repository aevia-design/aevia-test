# Aevia — Design Principles

## Brand in one sentence
Premium, editorial, art-forward. A photo book studio that feels like a small Viennese atelier, not a consumer print shop.

---

## I. Core Philosophy

- **Premium over convenient** — Every detail should feel considered. Generous whitespace, restrained colour, precise type.
- **Editorial, not e-commerce** — Pages should feel closer to a magazine or gallery than a product catalogue.
- **Warmth within restraint** — The tone is personal and human, but the design is quiet and disciplined.
- **Less is more** — If something can be removed without losing meaning, remove it.
- **Consistency** — Nav, footer, spacing, and type should be identical across all pages. Users should never feel disoriented.

---

## II. Colour

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#fafaf8` | Page background — warm off-white |
| `--surface` | `#f3efe9` | Cards, section backgrounds |
| `--border` | `#e4dfd8` | Lines, dividers, input borders |
| `--text` | `#1a1a1a` | Primary text, headings |
| `--muted` | `#7d7570` | Secondary text, labels, nav links |
| `--accent-dk` | `#a8895f` | Warm gold — used sparingly for tags, accents |
| `--white` | `#ffffff` | CTA backgrounds, overlays |

**Rules:**
- Background is always `--bg`, never pure white
- No bright colours — no blues, no greens, no reds in the UI
- Gold accent (`--accent-dk`) should appear rarely — tags, small labels only
- Dark mode is not required yet

**Contrast check (WCAG AA):**
- `--text` on `--bg`: passes easily
- `--muted` on `--bg`: check — borderline, only use for secondary/supporting text not critical content

---

## III. Typography

| Role | Font | Size | Weight |
|------|------|------|--------|
| Display / Hero | Georgia (serif) | 48–72px | Normal |
| Section titles | Georgia (serif) | 32–44px | Normal |
| Product titles | Georgia (serif) | 48–56px | Normal |
| Body text | System sans-serif | 15px | Normal |
| Labels / tags | System sans-serif | 10–11px | Normal, all-caps, wide tracking |
| Nav links | System sans-serif | 11px | Normal, all-caps, tracking 0.1em |
| Footer | System sans-serif | 13px | Normal |

**Rules:**
- Serif (Georgia) is for headings and editorial moments only — never body text
- Body text is always system sans at 15px / 1.6 line-height
- Tags and labels are always small-caps with generous letter-spacing
- Never use bold in headings — the serif weight carries hierarchy on its own
- Line length for body text: max ~65–70 characters

---

## IV. Spacing

Base unit: `8px`. All spacing should be a multiple of 8.

| Context | Value |
|---------|-------|
| Section padding (desktop) | `120px` vertical |
| Section padding (mobile) | `60px` vertical |
| Section inner max-width | `1160px` |
| Nav padding | `22px 56px` |
| Card gaps | `32–40px` |
| Inline gaps (small) | `8–16px` |

**Rules:**
- Whitespace is not wasted space — it communicates premium quality
- Never compress sections to fit more content; edit the content instead

---

## V. Layout

- **Desktop:** Wide, centred layouts with a `max-width: 1160px` inner container
- **Tablet (≤768px):** Grids collapse, padding reduces, nav becomes hamburger
- **Mobile (≤375px):** Single column, everything stacks, type scales down

Grid patterns:
- Collections: 3-col → 1-col on mobile
- How it works steps: 4-col → 2-col → 1-col
- Product page: sticky 2-col split (gallery + panel) → stacked on mobile
- Story section (About): 2-col → 1-col on mobile

---

## VI. Components

### Navigation
- Fixed, full-width, backdrop blur
- Logo left, links centre, CTA pill right
- Links: small-caps, muted colour, no underline, hover darkens
- CTA: outlined pill button — "Our Collections"
- Mobile: hamburger replaces links + CTA; animates to × when open

### Buttons
- Primary CTA: dark background (`--text`), white text, `border-radius: 3px`, all-caps small text
- Outlined CTA: border `1px solid var(--text)`, transparent background, pill shape (`border-radius: 100px`)
- No rounded-corner "bubbly" buttons — keep geometry precise

### Cards (collection cards)
- Light surface background
- No drop shadows on idle state — borders only
- Hover: subtle lift (`translateY(-2px)`)

### Footer
- 4-column layout: brand + newsletter | Products | Company | Support
- Logo top-left, tagline, email subscribe
- Links: small, muted, no decoration
- Bottom bar: copyright left, Terms right

### Accordion
- Clean, border-separated
- Plus/minus icon right-aligned
- No animation needed beyond show/hide

---

## VII. Imagery (when photos are added)

- Photography should be warm, editorial, human — lifestyle and detail shots
- No stock photo aesthetic — real textures, real moments
- Images should always have `alt` text describing the content
- Placeholder SVGs are acceptable during development — use the existing warm-grey icon style

---

## VIII. Copy Tone

- Warm, precise, European — not American marketing-speak
- Short sentences. No exclamation marks.
- "You approve before we print. No charge until you're happy." — this is the tone
- Avoid: "Amazing", "Stunning", "World-class", "Game-changing"
- Prefer: "considered", "precise", "quietly", "built to last"

---

## IX. What to Flag in a Review

🔴 **Blockers:**
- Wrong logo (must be `aevia_logo_transparent.png`)
- Broken links (404)
- JavaScript errors in console
- Horizontal scroll on mobile
- Text unreadable (contrast fail)
- Layout completely broken at any viewport

🟠 **High:**
- Inconsistent footer across pages
- Type size or font wrong (body text in Georgia, headings in sans-serif)
- Padding/spacing not following the scale
- Buttons with wrong border-radius or colour

🟡 **Medium:**
- Missing hover states
- Copy tone doesn't match brand voice
- Placeholder images not clearly labelled

🟢 **Low/Polish:**
- Micro-spacing inconsistencies
- Letter-spacing slightly off
- Transition durations inconsistent
