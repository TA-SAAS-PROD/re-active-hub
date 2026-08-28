/**
 * remix-loader — picks the active direction and applies it before first paint.
 *
 * Replaces the skill's remix-loader.ts, which is written for a Vite `src/`
 * project: it relies on `import.meta.glob` and a JSON import, neither of which
 * survives being served as a plain module by a static file server. This site
 * is flat static HTML, and the gallery loads each direction in an iframe from
 * whichever server is running, so the loader has to work with no build step.
 *
 * Order: ?rx=<slug> -> localStorage.rx -> directions.json `active` -> 'base'.
 *
 * Runs as a classic (non-module, non-deferred) script in <head>, so the
 * stylesheet <link>s it appends are still render-blocking and the page never
 * paints in base colours before flipping. An async fetch of directions.json
 * would flash.
 *
 * Exposes window.__remix = { slug, motion, apply(patch) } for the tweak panel.
 */
(function () {
  // slug -> does it ship a medium patch layer?
  // house-calm is the source design unchanged, so tokens alone express it.
  var KNOWN = { 'house-calm': false, 'vitruvian': true, 'greenhouse': true };
  var BASE = 'remix/';

  // the picked direction (registry `active` in src/remix/directions.json).
  // Kept as a literal rather than fetched, because fetching it would mean the
  // page paints in base colours first.
  var ACTIVE = 'vitruvian';

  var slug;
  try {
    slug = new URLSearchParams(location.search).get('rx') ||
           localStorage.getItem('rx') || ACTIVE;
  } catch (e) { slug = ACTIVE; }

  if (!Object.prototype.hasOwnProperty.call(KNOWN, slug)) slug = 'base';

  var rx = { slug: slug, motion: {}, patches: [] };
  window.__remix = rx;
  document.documentElement.dataset.rx = slug;

  if (slug !== 'base') {
    var files = ['tokens.' + slug + '.css'];
    // tokens first, then the medium patch — the patch must win on source order
    if (KNOWN[slug]) files.push('patch.' + slug + '.css');
    files.forEach(function (f) {
      var l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = BASE + f;
      document.head.appendChild(l);
    });
  }

  /* ---- tweak panel: dev-only ------------------------------------------
     Injected by URL, never imported, so a production build has no static
     reference to follow. postbuild.mjs deletes remix/dev-panel.js, leaving
     this a dead src that no-ops. Suppress with ?panel=0.
     -------------------------------------------------------------------- */
  var isLocal = /^(localhost|127.0.0.1|[::1])$/.test(location.hostname);
  var wantPanel = new URLSearchParams(location.search).get('panel') !== '0';
  if (isLocal && wantPanel && slug !== 'base' && window.top === window.self) {
    window.addEventListener('DOMContentLoaded', function () {
      var s = document.createElement('script');
      s.type = 'module';
      s.src = BASE + 'dev-panel.js';
      document.body.appendChild(s);
    });
  }

  // live patch API for the tweak panel
  rx.apply = function (patch) {
    var t = (patch && patch.tokens) || {};
    for (var k in t) if (Object.prototype.hasOwnProperty.call(t, k)) {
      document.documentElement.style.setProperty(k, t[k]);
    }
    if (patch && patch.motion) {
      for (var m in patch.motion) if (Object.prototype.hasOwnProperty.call(patch.motion, m)) {
        rx.motion[m] = patch.motion[m];
      }
    }
    rx.patches.push(patch);
    window.dispatchEvent(new CustomEvent('rx:change', { detail: patch }));
  };
})();
