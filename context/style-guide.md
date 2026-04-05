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

```css
--serif: Georgia, 'Times New Roman', serif;
--sans:  -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
```

No external fonts are loaded — system fonts only. This keeps the site fast and consistent.

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
| `sprout.html` | Sprout | Kids product page |
| `wonder.html` | Wonder | Kids product page |

---

## Collections

| Collection | Anchor | Templates |
|------------|--------|-----------|
| Love | `#love` | Devotion, Vows, Radiance |
| Adventures | `#adventures` | Horizon, Wander, Terrain |
| Kids | `#kids` | Bloom, Sprout, Wonder |

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
