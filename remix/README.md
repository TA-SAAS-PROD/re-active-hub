# Re-Active Hub — remix

A physiotherapy clinic in Gangtok, Sikkim, built on a verified clone of
`genovas-template.webflow.io/home/home-3`. Direction: **vitruvian**.

## Run it

Windows PowerShell 5.1 has no `&&` — chain with `;` or use separate lines.

```powershell
cd "C:\Users\prakash.c\cs-assessment\output\genovas-template.webflow.io\site"
npm run dev          # http://localhost:5178
```

| URL | What |
|---|---|
| `/` | the picked direction (vitruvian), tweak panel on localhost |
| `/?rx=house-calm` `/?rx=greenhouse` `/?rx=base` | the other directions; `base` is the un-directed re-skin |
| `/?panel=0` | suppress the tweak panel |
| `/directions.html` | all three live side by side, synced scroll, pick button |

Backtick toggles the panel, `/` focuses its filter. It is dev-only: it mounts
on localhost only, never inside the gallery iframes, and `npm run build`
deletes its files and asserts nothing panel-shaped survives.

## Commands

```powershell
npm run dev          # dev server
npm run directions   # regenerate all 3 directions + gallery + re-inline the loader
npm run build        # production build, then strip dev-only files (asserts clean)
```

Note `npm run directions` also **syncs `remix/panel.json` into `site/public/remix/`**. Nothing did that before, so knobs added after the initial hand-copy existed in the file `verify-panel.mjs` reads and NOT in the panel the browser fetches — 14 of them had drifted before this was noticed. The step asserts both counts match. panel.json is synced on every directions build.

Always use `npm run directions` rather than calling `apply-overrides.js`
per-direction: it accumulates its registry in a staging dir that gets cleared
after each sync, so running it one direction at a time leaves a registry
containing only the last.

## Layout

```
site/
  index.html                    markup + the inlined direction loader
  assets/styles/
    remix-tokens.css            the knob surface (:root only) — loads FIRST
    base.css                    filtered + tokenized original stylesheet
    brand.css                   applies tokens into base selectors, new components
    motion.css                  IX2 params, hoisted to --rx-* vars
  assets/js/main.js             behaviour (reveals, dropdown, menu, QA hook)
  public/remix/                 direction runtime, copied verbatim by Vite
    remix-loader.js             source of the loader inlined into index.html
    tokens.<slug>.css           per-direction token overrides
    patch.<slug>.css            per-direction scoped CSS patch (medium amplitude)
    tweak-panel.js  panel.json  dev-only, stripped at build
remix/
  directions/<slug>.json        the authored direction files
  panel.json                    the 84 knobs
  DIRECTIONS.md ASSETS.md       what was decided and why
tools/                          CDP driver, QA harness, verifiers, build steps
```

`remix-loader.js` is **inlined** into `index.html`, not linked. It has to be a
classic script that runs during head parsing — a module script is deferred and
the page would paint in base colours before the direction applied. Vite refuses
to bundle a classic `<script src>`, and `public/` does not exempt it. Edit
`public/remix/remix-loader.js`, then `npm run directions` re-inlines it.

## Glass

The panes are translucent over an ambient colour field built from the active
direction's own palette, so the glass recolours with the direction. The edge is
an inset box-shadow rather than a `border`, because the direction patches
already own `border` on panels.

Everything is a `--g-*` knob (23 of them, **Glass** group), defined in
`tools/glass.css`. Two presets bracket the range: **solid (glass off)** returns
the page to flat opaque surfaces, and **heavy frost** pushes it the other way.

Three of those values are contrast floors rather than taste, each one found by
measurement, not by eye:

| Knob | Why it sits there |
|---|---|
| `--g-tint` 34% | Light panes measure **10.33:1 even fully clear**, because what is behind them is light too — they were never the constraint. An earlier pass raised these to 82% chasing failures that came from elsewhere. |
| `--g-tint-dark` 44% | Dark panes over a *light* ground need ~90%. Over their own dark section ground they pass at 20%. The fix was the ground, not the opacity. |
| `--g-tint-shell` 10% | The outer section panels CONTAIN the cards; at equal tint the two stack and each card blurs an already-blurred layer, muting the effect. |

The hero panel is excluded throughout (`:not(.is-hero-visual)`) — it carries the
photograph, and frosting it would blur the image against nothing.

Without `backdrop-filter` support the panes go fully opaque, rather than
shipping washed-out translucency with nothing behind it to refract.

Glass also surfaced a defect that predated it: vitruvian remaps `--rx-accent` to
a dark red chalk, and the highlighted service card was *filled* with it. Dark
ink on that fill measured 2.4:1 and cream 3.8:1 — a mid tone fails both ways.
The card now takes a pale parchment fill with sanguine on its edge and chip,
which is what the direction's own brief describes.

## Verified

| Check | Result |
|---|---|
| Panel mounts, 8 groups | Color · Type · Type size · Space · Surface · Photo · Motion · Glass |
| Every knob moves the page | **84/84**, measured on resolved styles, pseudo-elements included |
| Text contrast | **13 surfaces × 3 directions × 2 breakpoints**, all pass, measured against rendered pixels |
| Font roles render a real face | **9/9**, link added AND text extent shifts |
| Permalink round-trips | `#rx=…` reopens in a fresh tab with the same state |
| Reset returns to direction defaults | accent back to `#a63c22`, hash cleared |
| Copy JSON → `apply-overrides.js` | accepted as a new direction |
| Production build has no panel | 0 references, build exits 0 |
| Directions render distinctly | 3/3, asserted on resolved values not screenshots |
| Behaviour | 8/8 pass, 0 console errors, 0 failed requests |

`tools/verify-panel.mjs`, `tools/verify-fonts.mjs`, `tools/check-contrast.mjs`,
`tools/verify-behavior.mjs`, `tools/shot-directions.mjs`.

**Why there are two font checks.** `verify-panel.mjs` asserts a knob changes a
computed value. All nine font roles passed that while rendering the same
fallback face, because setting `font-family` to a family the page never loaded
still changes the computed string — the declaration moved, the pixels did not.
`verify-fonts.mjs` closes that gap: it drives each role through the panel's own
select and requires both a stylesheet link for the family AND a material shift
in the rendered text extent.

The build also asserts no CSS file contains an empty `content:` declaration. An
invalid `content` makes a `::before`/`::after` never generate, which silently
deletes a whole layer — it cost the hero scrim twice before the guard existed,
and caught the glass sheen a third time before it shipped.

## Still to fill in

Everything marked `PLACEHOLDER` in `index.html`:

- phone number (rendered as `+91 00000 00000`, not an invented plausible number)
- opening hours
- the four figures in the stats band (`1:1`, `48hr`, `60min`, `5th Mile`)
- the two testimonials — illustrative, first-name + condition only, no invented
  full identities or photographs
- the logo lockup is a **placeholder mark**: the wordmark set in the site's
  display face plus a geometric glyph, not commissioned identity work

And the two photographic slots, both flat CSS stand-ins in the exact frames the
originals occupied — see `ASSETS.md` for the briefs and drop-in instructions.
