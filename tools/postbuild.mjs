/* Strip dev-only material from the production build.

   The direction runtime lives in public/, so Vite copies all of it verbatim —
   including the tweak panel, which is a development tool and must not ship.
   Two passes:
     1. delete the panel's own files;
     2. excise the panel-injection block from the shipped loader (both the
        standalone file and the copy inlined into index.html). That block is
        already inert in production — it is host-guarded and the module it
        imports is gone after pass 1 — but dead dev code should not ship.
   Then assert that nothing panel-shaped survives. */
import { rmSync, existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/* Resolved from this file, never hard-coded: the build runs on a Linux
   checkout at /opt/buildhome/repo as well as on a local Windows path.
   An absolute path here broke the deploy with ENOENT after vite had already
   written dist correctly. */
const D = path.resolve(import.meta.dirname, '..', 'site', 'dist').split(path.sep).join('/');
if (!existsSync(D)) {
  console.error('FAIL: no build output at ' + D + ' — did vite build run?');
  process.exit(1);
}
console.log('  postbuild target: ' + D);

// ---- 1. delete dev-only files ----------------------------------------
const DEV_ONLY = ['remix/tweak-panel.js', 'remix/panel.json', 'remix/dev-panel.js', 'remix/remix-loader.ts', 'directions.html', 'card-preview.html'];
let removed = 0;
for (const f of DEV_ONLY) {
  const p = D + '/' + f;
  if (existsSync(p)) { rmSync(p, { recursive: true, force: true }); console.log('  removed ' + f); removed++; }
}

// ---- 2. excise the injection block ------------------------------------
const RE = /\/\* rx:dev-panel:start \*\/[\s\S]*?\/\* rx:dev-panel:end \*\//g;
for (const f of ['index.html', 'remix/remix-loader.js']) {
  const p = D + '/' + f;
  if (!existsSync(p)) continue;
  const before = readFileSync(p, 'utf8');
  const after = before.replace(RE, '/* dev panel stripped at build */');
  if (after !== before) { writeFileSync(p, after); console.log('  excised panel block from ' + f); }
}

// ---- 3. assert ---------------------------------------------------------
// '--rx-panel' is a legitimate design token; match the panel itself, not any
// string that happens to contain "rx-panel".
const hits = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = dir + '/' + e.name;
    if (e.isDirectory()) walk(p);
    else if (/\.(html|js|css|json)$/.test(e.name)) {
      const s = readFileSync(p, 'utf8');
      if (/mountTweakPanel|["'#]rx-panel/.test(s)) hits.push(p.slice(D.length + 1));
    }
  }
})(D);

console.log(`stripped ${removed} dev-only path(s); panel references left in dist: ${hits.length}` +
  (hits.length ? ' -> ' + hits.join(', ') : ''));
if (hits.length) process.exit(1);

/* Guard: an invalid `content:` makes a ::before/::after never generate, which
   silently removes whole layers (this cost a scrim, and with it the hero's
   text contrast, twice). Cheap to assert, invisible when it happens. */
{
  const bad = [];
  (function walk(dir) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = dir + '/' + e.name;
      if (e.isDirectory()) walk(p);
      else if (/\.css$/.test(e.name) && /content:\s*;/.test(readFileSync(p, 'utf8'))) bad.push(p.slice(D.length + 1));
    }
  })(D);
  if (bad.length) { console.log('EMPTY content: declarations in ' + bad.join(', ')); process.exit(1); }
}
