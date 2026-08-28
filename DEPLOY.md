# Deploying

The deploy must serve **`site/dist`**, never `site/`.

## Required settings

The build is declared in `wrangler.jsonc` (`build.command`, `build.cwd`) and
the assets directory in `assets.directory`. With that in place the dashboard
needs **no** build command — the deploy command `npx wrangler deploy` runs the
build itself, which is why the log shows `[custom build] Running: npm ci &&
npm run build`.

| Dashboard setting | Value |
|---|---|
| Build command | *(none — wrangler.jsonc owns it)* |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |

If the dashboard does define a build command, it wins over the config file.

## Two things that mislead you when a build fails

**A failed build does not take the site down.** Cloudflare only swaps the live
version when a build finishes cleanly; otherwise it keeps serving the last
successful deployment. A red "failed" badge means the new attempt did not
land, not that the site is broken. So "build failed but the site works" is
the expected behaviour, not a puzzle.

**"Retry deployment" replays the same commit.** It does not pick up newer
commits. A fix pushed after a failure will not be in a retry of that
failure — it needs a *new* deployment, either from the dashboard's create
/ deploy action or triggered by a fresh push. A build that fails with an
error you have already fixed is almost always a retry of the old commit;
check the commit SHA at the top of the deployment against `git log -1`
before re-diagnosing the error.

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

A quick manual check on any deployed URL. Check the **content**, not just the
status code — if a host is configured with an SPA fallback, a missing file
answers `200` with `index.html` and a status check tells you nothing:

```
curl -s https://<host>/remix/tokens.vitruvian.css | head -3
```

It must print CSS beginning `/* direction: vitruvian`. If it prints
`<!DOCTYPE html>`, the file is missing and you are seeing the fallback.
