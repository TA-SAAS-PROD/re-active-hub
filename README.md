# Re-Active Hub

Website for **Re-Active Hub**, a physiotherapy clinic at 5th Mile, Tadong, Gangtok, Sikkim.

Static site, no framework. Vite is used only to bundle and to strip the dev-only
tooling at build time.

## Run it

Windows PowerShell 5.1 has no `&&` — chain with `;` or use separate lines.

```powershell
cd site
npm install
npm run dev          # http://localhost:5178
```

| URL | What |
|---|---|
| `/` | the site, in the active direction (`vitruvian`) |
| `/?rx=house-calm` `/?rx=greenhouse` `/?rx=base` | the other directions |
| `/?panel=0` | suppress the tweak panel |
| `/directions.html` | all three directions side by side |
| `/card-preview.html` | "What we treat" card photo candidates |

Backtick toggles the tweak panel; `/` focuses its filter. It is dev-only —
`npm run build` deletes its files and asserts nothing panel-shaped survives.

## Commands

```powershell
npm run dev          # dev server
npm run directions   # rebuild all 3 directions, sync panel.json, re-inline the loader
npm run build        # production build, then strip dev-only files
```

Run `npm run directions` after editing anything in `remix/` — it also syncs
`remix/panel.json` into `site/public/remix/`, which the browser fetches.

## Layout

```
site/                  the website
  index.html           markup + the inlined direction loader
  assets/styles/       remix-tokens · base · brand · motion · glass
  assets/js/main.js    reveals, dropdown, menu, back-to-top, booking modal
  public/remix/        direction runtime (tokens, patches, tweak panel)
remix/
  directions/          the three authored directions
  panel.json           the tweak-panel knobs
  README.md            how the remix layer works
  ASSETS.md            every image, where it came from, and why
  DIRECTIONS.md        what was decided and why
tools/                 CDP driver, build steps, verifiers
```

## Verification

Everything here drives a real headless Chrome over CDP and measures rendered
pixels rather than declared values.

```powershell
node tools/verify-panel.mjs      # every knob changes the page
node tools/verify-fonts.mjs      # every font role renders a real face
node tools/check-contrast.mjs    # text contrast vs rendered pixels
node tools/verify-behavior.mjs   # reveals, marquee, menu, reduced-motion
node tools/verify-booking.mjs    # back-to-top, contact chips, booking modal
```

## Still to fill in

- opening hours and a contact email (phone is live: +91 97347 68459)
- the four figures in the stats band are illustrative
- the two testimonials are illustrative — first name and condition only
- the logo lockup is a **placeholder mark**, not commissioned identity work
- `FORMSPREE_ENDPOINT` in `site/assets/js/main.js` is empty, so the booking
  form shows its confirmation locally and posts nowhere. Fill it in to send.

## Provenance

The layout derives from a commercial Webflow template, rebuilt and re-skinned.
The template vendor's own source files are **not** in this repository — see
`.gitignore`. Photography is AI-generated (Higgsfield Soul 2.0); it is not
photographs of real people or of the actual clinic. See `remix/ASSETS.md`.
