# Deploying

The deploy must serve **`site/dist`**, never `site/`.

## Required settings

| Setting | Value |
|---|---|
| Build command | `cd site && npm ci && npm run build` |
| Build output directory | `site/dist` |
| Root directory | repository root |

`wrangler.jsonc` declares the same thing. If Cloudflare Workers Builds is
configured from the dashboard, the dashboard fields win — set them there too.

## Why it matters

Serving the source tree looks like it works. It does not, and it fails
quietly:

**The direction stylesheet 404s.** `index.html` inlines a loader that
appends `remix/tokens.<slug>.css` and `remix/patch.<slug>.css`. Vite copies
`site/public/*` to the dist root, so those paths resolve after a build. In
the raw tree the files sit at `site/public/remix/...`, the requests 404, and
no direction tokens ever apply. The page still renders — in the base
`:root` defaults — so every palette, glass, photo and type value reverts and
the site simply looks washed out. Nothing errors.

**The dev tweak panel ships.** `tools/postbuild.mjs` deletes `dev-panel.js`,
`tweak-panel.js` and `panel.json` from `dist` and asserts nothing
panel-shaped survives. Serving the source tree bypasses that check.

**Nothing is bundled or fingerprinted.** `dist` inlines the loader, bundles
the five stylesheets into one hashed file and content-hashes every image.
The raw tree serves them unbundled and uncacheable.

## Verifying a deploy

`tools/verify-tweaks.mjs` takes a URL. Point it at the built output, or at
the deployed site, and it reads every token back off the rendered document
root with no `#rx=` hash present:

```powershell
node tools/serve.mjs "<repo>/site/dist" 5179
node tools/verify-tweaks.mjs http://127.0.0.1:5179/
```

It should report `tweak tokens live on the plain URL: 34/34`. Against a
misconfigured deploy it reports the count that actually applied.

A quick manual check on any deployed URL — this must return **200**, not 404:

```
curl -s -o /dev/null -w "%{http_code}\n" https://<host>/remix/tokens.vitruvian.css
```
