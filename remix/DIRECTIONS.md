# Three directions — Re-Active Hub

Amplitude: **medium** (tokens + a scoped `patch.css`). Anchors set by the user:
one from the cloned site, one Vitruvian, one from the design library.

Live, side by side: **`/directions.html`** on the dev server. Real motion, synced
scroll, click a name for fullscreen, `pick` records the choice.
Individually: `/?rx=house-calm`, `/?rx=vitruvian`, `/?rx=greenhouse`, `/?rx=base`.

| | house-calm | vitruvian | greenhouse |
|---|---|---|---|
| **Palette** | cool tinted-neutral, pale citrine | warm aged parchment, red-chalk sanguine | green tinted-neutral, forest ink |
| **Ground** | `#f1f1f1` | `#ddd0b4` | `#e1f4df` |
| **Accent** | `#f3ec9e` | `#a63c22` | `#b1dbb8` |
| **Display face** | DM Sans | Cormorant Garamond | Playfair Display |
| **Surface** | flat, 24px | ruled hairline, ~3px | flat + shadowless, 13px |
| **Density (root)** | 16.00px | 16.32px | 15.36px |
| **Reveal** | 1000ms, blur 30 | 1400ms, blur 8 | 760ms, blur 10 |
| **Page height** | 7748 | 7865 | 7454 |
| **Forks differing from house-calm** | — | 5 | 5 |

Each direction differs from the others on at least three forks, which is the
bar in `references/directions.md`. Verified by resolving the applied values off
the live page rather than by eye — `remix/directions-applied.json`, 3/3 distinct.

---

## house-calm

> The cloned site's own restraint, kept: cool slate and pale citrine on soft
> grey, white panels floating with a generous 24px corner.

**Anchor:** the source design, unchanged. This is the "keep what we cloned"
option — the palette, type, surface and motion are the measured originals to
the value. Tokens only, no patch layer, because nothing needs overriding.

Reads as competent and neutral. The pale citrine is the one thing that came
from a biotech consultancy rather than a clinic, and it is the first thing to
question if this one wins.

## vitruvian

> The body as a drawing. Aged parchment, red-chalk sanguine and sepia ink,
> squared-off plates with ruled edges — a Renaissance anatomical study rather
> than a clinic brochure.

**Anchor:** Leonardo's Vitruvian Man — red chalk and iron-gall ink on aged rag.

The patch layer carries what tokens cannot: every panel gains a hairline border
because a study is drawn *on* something, the icon chips become drawn outlines
rather than filled squares, and the marquee drops its coloured band to become a
ruled italic caption so the parchment runs unbroken through it. Reveal blur
falls from 30px to 8px — ink is drawn, not focus-pulled.

The strongest thesis of the three for a physiotherapy practice: anatomy,
proportion and the human body are literally the subject matter. The risk is
that it reads as a museum rather than a clinic.

## greenhouse

> Clinical-botanical: a warm cream canvas layered with sage and keylime panels,
> one deep forest ink carrying every heading and every action. Shadowless —
> depth comes from tinted layers, not elevation.

**Anchor:** design library entry `ease-health` (Editorial Warm), "Botanical
greenhouse on cream paper". Palette pinned hex-for-hex from its nine-swatch
strip; Playfair Display is one of the two substitutes the entry itself lists
for its Faire Octave display face.

Two of the entry's rules are not expressible as tokens and are the reason it
looks the way it does, so they live in the patch: shadows are removed globally
(`box-shadow: none` on everything — the entry's stated depth model is layered
tint, never elevation), and the radius splits, cards at ~13px while tags and
buttons stay fully pill, which one radius knob cannot produce.

The safest of the three for a healthcare buyer, and the one that most looks
like it was designed for this category rather than adapted to it.

---

## Notes

- Both serif directions load their display face via `@import` inside the patch,
  so a face is only fetched when its direction is active. A shipped build
  should inline the picked one as a `<link>` and drop the others.
- `?rx=base` renders the Phase 1 re-skin with no direction applied, and was
  re-verified after the cascade fix below: ground `#f1f1f1`, card `#c6cbde`,
  accent `#f3ec9e`, panels `#656776`, button `#2b2c2e`, height 7748 — the
  measured originals, unchanged.
- **Cascade bug found and fixed while rendering these.** `base.css` still
  carried the original Webflow `:root` block declaring `--brand--*` as
  literals. It loads after `remix-tokens.css`, so at equal specificity it won
  on source order and most colour knobs were inert — `vitruvian` was rendering
  its service cards in the source design's periwinkle. The duplicate block is
  deleted; `remix-tokens.css` is now the single source for that vocabulary.
  A screenshot would not have caught this, which is why the direction renderer
  asserts on resolved values.
