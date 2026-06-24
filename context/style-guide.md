# Aevia — Style Guide

## Brand

**Name:** Aevia  
**Tagline:** Keep your memories beautifully.  
**Location:** Vienna, Austria  
**Model:** Concierge photo book studio — customers upload photos, Aevia staff design, customer approves, then pays.

---

## Logo

- File: `assets/images/aevia_logo_transparent.png`
- Always use the transparent version
- Display height: `28px` in nav, `auto` width
- Fallback text if image fails: `aevia` in Georgia serif, 18–20px
- Never distort, recolour, or add effects to the logo

---

## Colours (CSS custom properties)

```css
--bg:        #fafaf8;   /* page background */
--surface:   #f3efe9;   /* cards, alt sections */
--border:    #e4dfd8;   /* dividers, borders */
--text:      #1a1a1a;   /* primary text */
--muted:     #7d7570;   /* secondary/label text */
--accent-dk: #a8895f;   /* warm gold accent */
--white:     #ffffff;   /* CTAs, overlays */
```

---

## Fonts

**`assets/css/type.css` is the single source of truth for site fonts + base body size.**
Change the typeface or base size there and every customer page follows — do **not**
re-declare `--serif`/`--sans` or `body` font-size per page.

```css
--serif: 'Lora', Georgia, 'Times New Roman', serif;          /* editorial headings */
--sans:  'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;  /* body & UI */
body { font-size: 17px; }
```

Lora + Inter load from Google Fonts (`@import` in `type.css`). Georgia/system fonts
remain as fallbacks.

**Load order rule:** `type.css` MUST be linked **after** each page's inline `<style>`
(and before `mobile.css`) so it wins the cascade over the legacy Georgia/15px baseline:

```html
  </style>
  <link rel="stylesheet" href="../assets/css/type.css">
  <link rel="stylesheet" href="../assets/css/mobile.css">
```

A new customer page that omits this link falls back to Georgia/system-sans at 15px.

> The expressive **in-book** fonts (Caveat, Twinkle Star, Baskervville, Source Sans 3,
> Cormorant Garamond) are **not** part of this — they live in the template engine / PDF,
> not the site chrome, and are loaded separately per template.

**Form fields** (`.field` in order.html, `.form-field` in our-artists.html) share one look:
`1px solid var(--border)`, `border-radius: 3px`, `padding: 12px 14px`, `font-size: 15px`,
focus → `border-color: var(--text)`. Match this for any new form.

---

## Pages

| File | Title | Purpose |
|------|-------|---------|
| `home.html` | Home | Hero, collections overview, how it works, testimonials |
| `about.html` | About Us | Brand story |
| `help.html` | Help | FAQ + contact |
| `collections.html` | Collections | All templates grouped by Love / Adventures / Kids |
| `bloom.html` | Bloom | Kids product page |
| `devotion.html` | Devotion | Love product page |
| `horizon.html` | Horizon | Adventures product page |
| `order.html` | Order | Upload form — calls Firebase function |
| `vows.html` | Vows | Love product page |
| `radiance.html` | Radiance | Love product page |
| `wander.html` | Wander | Adventures product page |
| `terrain.html` | Terrain | Adventures product page |
| `scribble.html` | Scribble | Kids product page |
| `papercut.html` | Papercut | Kids product page |

---

## Collections

| Collection | Anchor | Templates |
|------------|--------|-----------|
| Love | `#love` | Devotion, Vows, Radiance |
| Adventures | `#adventures` | Horizon, Wander, Terrain |
| Kids | `#kids` | Bloom, Scribble, Papercut |

---

## Navigation (all pages)

```html
<nav class="nav">
  <a href="home.html" class="nav-logo">
    <img src="../assets/images/aevia_logo_transparent.png" alt="Aevia" style="height:28px;width:auto;" ... />
  </a>
  <div class="nav-links">
    <a href="home.html">Home</a>
    <a href="about.html">About us</a>
    <a href="help.html">Help</a>
  </div>
  <a href="collections.html" class="nav-cta">Our Collections</a>
  <button class="nav-burger" ...><span></span><span></span><span></span></button>
</nav>
```

---

## Footer (all pages)

Four columns: Brand | Products | Company | Support

**Products column:**
- All templates → `collections.html`
- Love → `collections.html#love`
- Kids → `collections.html#kids`
- Adventures → `collections.html#adventures`

**Company column:**
- Our story → `about.html`
- How it works → `home.html#how`
- Quality promise → `#`

**Support column:**
- FAQ → `help.html`
- Instagram → `#`
- Contact → `help.html#contact`

No "Shipping" link in the footer.

---

## Local dev

Pages served at: `http://localhost:8080/pages/<pagename>.html`  
Run from project root. No build step required.

---

## Backend

Firebase Cloud Function endpoint:  
`https://europe-west1-aevia-uploads.cloudfunctions.net/createUploadSession`

Handles: order number generation, signed upload URLs, confirmation emails.  
Do not modify without testing end-to-end.

---

## Optional-spread / add-on cards (product pages)

All product pages style the "Optional spreads" / "Optional add-ons" selector from
one shared stylesheet: **`assets/css/addons.css`**. Link it in `<head>`:

```html
<link rel="stylesheet" href="../assets/css/addons.css" />
```

**Rule: do not redefine `.addon*` styles inline per page.** If a card needs a new
look, change `addons.css` so every page moves together. This is the guardrail
against the drift we cleaned up — before this, each page carried its own copy of
the rules and they diverged.

Two variants share the same JS hooks (`.addon.on` toggle, `data-fp`, `data-photos`):

**1. Photo-card grid** — free functional-page spreads with a preview image
(Scribble, Papercut, Wander, Newborn). Vertical card: photo on top, name, a
**one-line** description, and an `.addon-add` pill that flips `Add` → `Added ✓`.
No per-card "Free" badge — the section header ("Optional spreads — all free")
already says it. Wrap the cards in `.addons-grid`; add `.cols-1` for a single
spread (e.g. Wander) so it fills full width.

```html
<div class="addons">
  <div class="section-label">Optional spreads — all free</div>
  <div class="addons-grid">            <!-- add cols-1 if only one card -->
    <div class="addon" onclick="xtra(this)" data-fp="FP1" data-photos="1">
      <div class="addon-preview" onclick="event.stopPropagation();openLightbox('…/fp1.webp')">
        <img src="…/fp1.webp" alt="… preview"/><span class="zoom-hint">Enlarge</span>
      </div>
      <div class="addon-body">
        <div class="addon-name">Birthday spread</div>
        <div class="addon-desc">Birthday wishes and one photo from the celebration.</div>
      </div>
      <div class="addon-foot"><span class="addon-add">Add</span></div>
    </div>
    …
  </div>
</div>
```

`xtra()` must flip the pill text:
```js
card.querySelector('.addon-add').textContent = card.classList.contains('on') ? 'Added ✓' : 'Add';
```

**Description copy:** keep it to roughly one line. Long descriptions break the
uniform card height and read badly on mobile.

**2. Checkbox list** — generic add-ons with no preview image (placeholder product
pages: Sprout, Vows, Devotion, Terrain, Horizon, Radiance). Add `addons-list` to
the `.addons` container; each `.addon` keeps its `.chk` checkbox, `.addon-body`,
and `.addon-cost` badge (e.g. "Included"). Use this when a product has priced or
non-spread extras rather than free photo spreads.
