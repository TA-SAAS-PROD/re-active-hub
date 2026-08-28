# Genovas — Home V.3 (clone)

A rebuild of `https://genovas-template.webflow.io/home/home-3` as a clean static
site. No Webflow runtime, no jQuery, no framework.

Windows PowerShell 5.1 has no `&&` — chain with `;` or use separate lines:

```powershell
cd "C:\Users\prakash.c\cs-assessment\output\genovas-template.webflow.io\site"
npm install
npm run dev      # http://localhost:5178
npm run build    # -> dist/
```

`tools/qa.mjs` serves the site on the same port via `tools/serve.mjs`, so stop
one before starting the other or they will fight over 5178.

## Layout

```
index.html                  the whole page, one file, semantic markup
assets/styles/base.css      structure + design tokens
assets/styles/motion.css    all motion, annotated with its source IX2 action list
assets/js/main.js           ~95 lines: reveals, dropdown, mobile menu, QA hook
assets/img/                 22 real assets from origin
```

## Where the values come from

`base.css` is the original Webflow stylesheet **mechanically filtered** to the
selectors this page's markup actually matches — 159 KB / 1521 rules reduced to
41 KB, with 884 unrelated selectors dropped. Nothing was retyped or estimated,
so spacing, colour and type values are the site's own. The filter is
`../tools/filter-css.mjs`; re-run `../tools/build-css.mjs` after editing
`../tools/overrides.css` to regenerate.

`motion.css` is hand-written from the live IX2 interaction data
(`Webflow.require('ix2').store.getState().ixData`, saved at
`../extract/ix2.json`). Every duration, delay and easing is the measured value —
each block names its source action list (`a`, `a-4`, `a-26`, `a-45`, `a-66`, …).

## Two rules worth knowing before you edit

**1. `rem` is fluid.** The root font-size is a `vw`-based `calc()` from the
original's inline `global-styles` embed (top of `base.css`), resolving to
16.000px at 1440, 14.009px at 768, 15.255px at 390. Everything on the page is
sized in `rem`, so changing that one rule rescales the entire layout. Omitting
it costs ~700px of height drift at tablet.

**2. Fonts are the v1 static faces, not the variable axis.** `DM Sans
300,400,500,600,700` via the legacy Google Fonts API. Swapping to the `css2`
variable version changes text metrics enough to reflow the page.

## Deviations from the original, on purpose

- The template vendor's fixed promo widget (`.new-base--t-temlis-component`)
  and its token block are removed.
- Outbound `temlis.com` hrefs on the page's own CTAs point at the in-template
  `/contact/contact-1` instead.
- `prefers-reduced-motion` is honoured (the original does not); all motion
  resolves to its end state.
- The nav dropdown and mobile menu are real buttons with `aria-expanded` /
  `aria-controls`; the hero wordmark carries an `aria-label` since it is split
  into per-letter spans.

## Fidelity

Full-page pixel diff vs the live original, anti-aliasing threshold 0.12, the
marquee strip masked (it is time-driven and cannot phase-match):

| viewport | diff | page height (orig → clone) |
|---|---|---|
| 1440 | **0.061%** | 7780 → 7780 |
| 768 | **0.100%** | 5514 → 5514 |
| 390 | **0.078%** | 6124 → 6124 |

Re-run with `node ../tools/qa.mjs` (needs the dev server on :5178).
