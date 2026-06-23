# 0005 — 3D book renderer: Three.js, with an edit-flat / present-in-3D split

**Date:** 2026-06-17 (session 52)
**Status:** Committed (moderately irreversible — a core capability customer-preview will later build on)

## Context

Pre-launch, the website has no real product imagery (grey placeholder boxes; the
special-page add-on "preview" is a fake icon that opens nothing). We want premium
product imagery — cover front/back, inside spreads, special pages — generated from
our **own** engine renders, so the site looks like a real product before any books
are printed or photographed. Hard requirement (Evgeny): this is **not throwaway** —
the renderer must be reusable later **inside the live customer-preview**, upgrading
it from flat 2D to a real 3D book. The website images themselves are temporary
(replaced by real photos once books are printed); the *renderer* is the durable
deliverable. A feasibility spike (`prototypes/book-3d-spike.html`) already proved an
in-browser Three.js scene can texture a real Newborn cover render with lighting +
soft shadow, loaded from a plain CDN `<script>` (no build step).

## Options Considered

1. **Three.js in-browser 3D** — true 3D book object (textured box → cover/spine/
   pages), browser-native so customer-preview can reuse it.
2. **StPageFlip** (vanilla-JS page-flip library) — browser-native, drop-in,
   realistic page-turn, but front-on **2.5D** (no premium angled "book on a table").
3. **AI image-generation APIs** — make static images from prompts; not faithful to
   real customer layouts, can't run live per-customer. → not a renderer.
4. **Photoshop smart-object / mockup tools** — manual desktop, static output. → not
   a renderer (throwaway by definition).
5. **Blender pre-render** — best realism, but offline render, not browser. → can't
   power live customer-preview.

The hard "browser-native + reusable" filter eliminates 3–5 as the *renderer* (they
answer a different question — making images, not a reusable renderer). AI image-gen
is retained for a **separate later layer**: generating the sample photo *content*
that fills the books (the textures). The renderer decision is a two-horse race:
Three.js vs StPageFlip.

## Decision

Chose **Three.js**, used under an **edit-flat / present-in-3D split**.

The decisive concern was *cumulative* premium experience — quality **and** speed.
Live 3D in the editing loop would be slower than today's flat view and fight the
premium feel. Resolution is architectural, not a "lighter renderer": the editing
surface **stays flat and instant** (what we have now); 3D is a deliberate
"see your book" **presentation moment** (customer hits Preview → flat pages assemble
into a 3D book they can turn). The same renderer module serves both jobs — export
static website images (at build time, zero visitor runtime cost) **and** power the
preview moment.

StPageFlip was the simplicity baseline (less code, lighter runtime) but only wins if
front-on 2.5D is "good enough"; it cannot produce the premium angled object Evgeny
wants and intends to show customers.

Key trade-offs:
- We gain: premium true-3D object for website hero + reusable in customer-preview;
  one renderer for both; editing speed untouched (stays flat).
- We accept: more build + maintenance effort than a drop-in library; a heavier
  runtime in the preview moment (bounded — 3D is a moment, not the working surface);
  need a flat fallback if WebGL fails.
- We assume: editing stays flat (customers do **not** edit directly on the 3D book —
  that is the one path where 3D speed genuinely bites, and it is out of scope).

## Consequences

- Three.js becomes a project dependency (CDN `<script>`, no build step). This is a
  deliberate exception to CLAUDE.md's "no frameworks" default, justified by the job
  (Evgeny: CLAUDE.md is a default, not gospel).
- Website product imagery is **pre-rendered to static PNGs** — visitors never run
  WebGL for placeholders; only the customer-preview "see your book" moment runs it
  live.
- Enables a future customer-preview upgrade (flat 2D → 3D book). That integration is
  a later effort; this build delivers the renderer + the website imagery first.
- Sample photo *content* (AI-generated stopgap, later real photos) is a separate
  layer feeding textures — out of scope for the renderer build, decided when we can
  see the dressed site.
- Revisit if: WebGL performance proves unacceptable on target mobile devices, or if
  the front-on flipbook would have sufficed (we'd fall back to StPageFlip).

## Next Steps

Hand off to creating-briefs to formalise requirements for the Three.js renderer
(flat-edit / 3D-present split), built TDD on branch `mockup-3d-renderer`.
The spike (`prototypes/book-3d-spike.html`) is throwaway reference, not the build.
