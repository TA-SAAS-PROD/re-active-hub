# Assets — Re-Active Hub re-skin

The clone downloaded 30 assets at REAL tier. In a remix that ladder inverts:
the original's real assets are the thing to *remove*. Status of all 30:

## Removed (22)

| Asset | Original role | Why removed |
|---|---|---|
| `hero.webp` + 5 `hero-p-*.webp` | photo of three people in scrubs | Photographs of people — reads as "our team". Cannot be reused. |
| `Frame-2147226751*.webp` (4) | researcher at a microscope | Same. |
| `Rectangle-1.webp`, `image-229.webp` | testimonial avatars | Photographs of people presented as named patients. |
| `Logo.svg`, `Logo-1-.svg` | the template's wordmark | Their brand mark. |
| `Frame-2147226875-1-.webp` | hero pill, label baked into pixels | Carried the words "Expert Guidance". |
| `Frame-2147226726.svg`, `Frame-21.svg` | floating pills, text baked in | Carried "Innovate biotech" / "Biotech Insights". |
| `Group-2940.png`, `Group-2942.png` | favicon / webclip | Their mark. |
| 8 × Temlis widget assets | template vendor's promo overlay | Never part of the design; excluded at clone time. |
| `webflow-icons` `@font-face` | Webflow's icon font, base64 in CSS | 2.5 KB of their asset; its only consumer (the dropdown caret) is now an inline SVG mask. |

## Kept (3) — generic geometry, no branding

| Asset | Why it survives |
|---|---|
| `Group-4.svg` | Abstract concentric arcs behind the stats block. 14 `<path>`, zero `<text>`. Pure geometry. |
| `Group-6.svg` | The large rotating arc set in the visit card and the booking CTA. 21 `<path>`, zero `<text>`. |
| `arrow-right.svg` | Generic UI chevron. One path. |

The reskin ladder keeps "icons (generic UI)" and "textures generated in code";
these are the geometric equivalent — they carry no identity.

## New (2)

| Asset | Tier | Note |
|---|---|---|
| `favicon.svg` | **PLACEHOLDER** | Hand-written SVG: the lockup glyph on an ink tile. Geometry only, no type, so it needs no webfont. |
| logo lockup | **PLACEHOLDER** | Not a file — inlined into the markup as an SVG glyph plus live text (`.brand_lockup`). An SVG loaded via `<img>` cannot use the page's webfont, so a wordmark shipped as a file would render in a fallback face. Inline keeps it in DM Sans and recolourable by token. **This is a stand-in, not commissioned identity work.** |

## Photography (Pexels, sourced via Composio)

Both slots now carry real photographs. They are **not painted flat**: each sits
on the direction's own coloured gradient with `mix-blend-mode: luminosity`, so
only the photo's luminance survives and the hue comes from whichever palette is
active. One photograph therefore serves all three directions, and a replacement
grades itself the same way with no edit.

| Slot | File | Source | Licence |
|---|---|---|---|
| Hero | `hero.jpg` 1920×1080 (+`hero-1200`, +`hero-800` mobile crop) | **Generated** — Higgsfield Soul 2.0, 16:9 2k, prompt in `hero-options/` | Synthetic image, no third-party licence. Not photographs of real people. |
| Visit | `clinic.jpg` 1400×1092 (+`clinic-700`) | [Interior design of a clinic](https://www.pexels.com/photo/interior-design-of-a-clinic-5619453/) by [Nico Becker](https://www.pexels.com/@nicobecker) | Pexels licence — as above |

**The hero is now a face-forward group portrait**, following the reference
image's composition: three practitioners centred, heads in the upper third,
a dark uniform chest band exactly where the wordmark lands. That band is not
decoration — an earlier face-forward attempt measured **1.10:1** because light
coats sat at type height. Three candidates were generated and all three
measured in place; `hero-options/build/<name>/` holds each, and

    node tools/use-hero.mjs V4     # or V1, V5

swaps between them (V5 is installed).

| Candidate | Look | Wordmark 1440 | 390 |
|---|---|---|---|
| **V5** *(installed)* | clinic treatment room, warm plaster, couch visible | 4.84:1 | 4.50:1 |
| V4 | studio seamless, terracotta scrubs — closest to `--rx-accent` | 4.84:1 | 4.43:1 |
| V1 | studio seamless, brown scrubs, widest empty backdrop | 5.01:1 | 4.36:1 |

The 390px figures are below 4.5 but the wordmark is large display type, whose
WCAG threshold is 3:1 — `check-contrast.mjs` scores it against that and it
passes with margin. The desktop figures clear 4.5 outright.

**Two things the new photo changed.** The scrim was tuned for a faceless torso
shot, so it darkened the whole upper frame — where the faces now are. The type
band is now narrowed onto the wordmark (`--p-scrim-band-start/-end`, 42%→64%)
and carries more of the load (.52) while the top and mid stops drop to .16/.26.
And the hero CTA — the one glass button with *dark* ink over a photograph —
fell to 3.97:1 at 390px once a lit window sat behind it. Darkening the scrim
cannot fix a dark-on-light chip, so it took its own tint, `--g-tint-btn-hero`
at 88%, leaving the site's other glass buttons on the shared value.

**Prompting note, for whoever regenerates these.** Negative prompts summoned
what they forbade: "no border, no frame" produced a paper border, "no badge,
no lanyard" produced badges and lanyards, and "no buttons, no user interface
elements" produced a pill button and a UI bar. Describe what should be there
instead and simply do not name the artifact.

The panel's **Photo** group exposes the grade: `Photo presence`, `Photo blend`
(set it to `normal` for a full-colour photograph — there is a `full colour photo`
preset), `Desaturate`, `Photo contrast`, `Photo brightness` and `Photo focus Y`,
plus `Scrim top` / `Scrim bottom` under **Surface**.

### Replacing them

Drop a file at the same path and size. The panel geometry, the scrim and the
duotone are all in CSS, so nothing else changes. The visit slot in particular
still wants a real photograph of the clinic at 5th Mile — it is wayfinding, and
a stock interior is a picture of somewhere that is not the building.

