/* Regenerate every direction in one pass, then sync into public/remix.

   apply-overrides.js accumulates its registry in <site>/src/remix, and
   sync-remix.mjs deletes that staging dir after copying. So running the two
   per-direction leaves a registry containing only the last one. Always
   regenerate the whole set together. */
import { execFileSync } from 'node:child_process';
import { cpSync, rmSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'C:/Users/prakash.c/cs-assessment/output/genovas-template.webflow.io';
const APPLY = 'C:/Users/prakash.c/.claude/skills/remix-site/scripts/apply-overrides.js';
const DIRS = ['house-calm', 'greenhouse', 'vitruvian']; // active last
const ACTIVE = 'vitruvian';

rmSync(ROOT + '/site/src', { recursive: true, force: true });
for (const d of DIRS) {
  const args = [APPLY, 'site', `remix/directions/${d}.json`];
  if (d === ACTIVE) args.push('--activate');
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  console.log('  built ' + d + (d === ACTIVE ? ' (active)' : ''));
}
cpSync(ROOT + '/site/src/remix', ROOT + '/site/public/remix', { recursive: true });
rmSync(ROOT + '/site/src', { recursive: true, force: true });
if (existsSync(ROOT + '/site/public/remix/remix-loader.ts')) rmSync(ROOT + '/site/public/remix/remix-loader.ts');

// gallery.js reads the registry from <site>/src/remix; stage just that one
// file for the call, then clear the staging dir again.
mkdirSync(ROOT + '/site/src/remix', { recursive: true });
cpSync(ROOT + '/site/public/remix/directions.json', ROOT + '/site/src/remix/directions.json');
execFileSync(process.execPath,
  ['C:/Users/prakash.c/.claude/skills/remix-site/scripts/gallery.js', 'site', '--title', 'Re-Active Hub — three directions'],
  { cwd: ROOT, stdio: 'pipe' });
rmSync(ROOT + '/site/src', { recursive: true, force: true });
console.log('  gallery -> site/directions.html');

const reg = JSON.parse(readFileSync(ROOT + '/site/public/remix/directions.json', 'utf8'));
console.log('registry: ' + Object.keys(reg.directions).join(', ') + ' | active: ' + reg.active);

/* ---- the patch must not shadow the direction's own tokens -----------
   Each <slug>.patch.css opens with a :root[data-rx=<slug>] block declaring
   defaults for its --p-* values. That file is appended AFTER tokens.<slug>.css,
   so any name declared in both wins from the patch — and the value authored
   in the direction JSON never reaches the page.

   This was silent: the tweak panel writes to documentElement.style, which
   beats every stylesheet, so a knob looked fine while its baked default was
   being overridden. Five tokens were affected.

   The direction JSON is the source of truth for anything it declares, so
   strip those lines from the emitted patch. Names the direction does NOT
   set keep their patch default. */
{
  for (const d of DIRS) {
    const file = ROOT + '/site/public/remix/patch.' + d + '.css';
    if (!existsSync(file)) continue;
    const own = new Set(Object.keys(JSON.parse(readFileSync(ROOT + '/remix/directions/' + d + '.json', 'utf8')).tokens || {}));
    const src = readFileSync(file, 'utf8');
    const stripped = [];
    const out = src.replace(/^([ \t]*)(--[\w-]+)(\s*:\s*)([^;]+);(.*)$/gm, (line, indent, name, sep, value, rest) => {
      if (!own.has(name)) return line;
      stripped.push(name);
      return indent + '/* ' + name + ': set by the direction */' + rest;
    });
    if (stripped.length) {
      writeFileSync(file, out);
      console.log('  patch.' + d + '.css: ' + stripped.length + ' shadowed tokens removed (' + stripped.join(', ') + ')');
    }
  }
}

/* ---- keep the served knob list identical to the authored one -------- */
{
  const from = ROOT + '/remix/panel.json';
  const to = ROOT + '/site/public/remix/panel.json';
  cpSync(from, to);
  const a = JSON.parse(readFileSync(from, 'utf8')).knobs.length;
  const b = JSON.parse(readFileSync(to, 'utf8')).knobs.length;
  if (a !== b) { console.error('FAIL: panel.json did not sync'); process.exit(1); }
  console.log('  panel.json synced -> ' + a + ' knobs served');
}
