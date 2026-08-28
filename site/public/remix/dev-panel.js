/* Dev-only bootstrap for the tweak panel.

   Kept in its own module so remix-loader.js never names mountTweakPanel: the
   loader is inlined into index.html, and Vite strips comments from inline
   scripts, so marker-based excision at build time does not survive.
   postbuild.mjs deletes this file, which makes the loader's injected
   <script src> a dead URL in production.

   Beyond mounting, this file makes the font roles work:

     1. expands every knob marked `"font": true` into a select over the whole
        Google Fonts catalogue (remix/fonts.json — 1614 latin families from
        fonts.google.com/metadata/fonts), grouped by category;
     2. loads a family's face ON DEMAND when it is picked. Preloading 1614 is
        impossible. A font knob whose family is not loaded silently renders
        the fallback — every selection then looks identical, which is exactly
        the bug this file previously shipped;
     3. preloads whatever the direction starts on, so first paint is right.

   The font selects are identified BY THEIR OPTIONS, not by parsing the knob
   id out of the label. The panel renders the id immediately followed by the
   option text with no separator, so `label.textContent.match(/--[\w-]+/)`
   returned "--rx-font-displayCormorant" — never a real id, so the listener
   was never attached and no font ever loaded. Matching on options cannot
   break that way regardless of how the panel formats its labels.
*/
import { mountTweakPanel } from './tweak-panel.js';

const familyOf = (stack) =>
  String(stack).split(',')[0].trim().replace(/^["']|["']$/g, '');

/* Normalise so a quoted catalogue stack and an unquoted direction default
   compare equal — the two disagreed, so the current value never matched a
   catalogue row either. */
const keyOf = (stack) =>
  String(stack).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).join(', ').toLowerCase();

const loaded = new Set();
let CATALOGUE = [];
let BY_KEY = new Map();

function ensureFont(stack) {
  const fam = familyOf(stack);
  if (!fam || loaded.has(fam)) return false;
  const meta = BY_KEY.get(keyOf(stack));
  if (!meta) return false;                 // a system stack — nothing to fetch
  loaded.add(fam);
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.dataset.rxFont = fam;
  l.href =
    'https://fonts.googleapis.com/css2?family=' +
    fam.replace(/ /g, '+') + ':wght@' + meta.weights.join(';') + '&display=swap';
  document.head.appendChild(l);
  return true;
}

/* A select is a font select when most of its options are catalogue stacks. */
function isFontSelect(sel) {
  const opts = [...sel.options];
  if (opts.length < 20) return false;
  let hits = 0;
  for (let i = 0; i < Math.min(opts.length, 30); i++) if (BY_KEY.has(keyOf(opts[i].value))) hits++;
  return hits >= 15;
}

function upgradeFontSelects(root) {
  let upgraded = 0;
  for (const sel of root.querySelectorAll('select')) {
    if (!isFontSelect(sel)) continue;
    upgraded++;

    // regroup 1600+ flat options into <optgroup> by category
    const current = sel.value;
    const groups = new Map();
    for (const opt of [...sel.options]) {
      const meta = BY_KEY.get(keyOf(opt.value));
      const cat = meta ? meta.category : 'Current';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(opt);
    }
    if (groups.size > 1) {
      sel.textContent = '';
      for (const [cat, opts] of [...groups.entries()].sort()) {
        const g = document.createElement('optgroup');
        g.label = cat;
        opts.forEach((o) => g.appendChild(o));
        sel.appendChild(g);
      }
      sel.value = current;
    }

    const load = () => {
      if (ensureFont(sel.value)) {
        // the face arrives after the CSS var is already set; nudge a repaint
        // so the new family is applied the moment it is ready
        document.fonts.ready.then(() => document.documentElement.offsetHeight);
      }
    };
    sel.addEventListener('change', load);
    sel.addEventListener('input', load);
  }
  return upgraded;
}

Promise.all([
  fetch('./remix/panel.json').then((r) => r.json()),
  fetch('./remix/fonts.json').then((r) => r.json()).catch(() => ({ fonts: [] })),
])
  .then(([cfg, cat]) => {
    CATALOGUE = cat.fonts || [];
    BY_KEY = new Map(CATALOGUE.map((f) => [keyOf(f.stack), f]));

    const stacks = CATALOGUE.map((f) => f.stack);
    const labels = CATALOGUE.map((f) => f.family);

    let roles = 0;
    for (const k of cfg.knobs || []) {
      if (!k.font) continue;
      roles++;
      // keep the direction's current value selectable, and use the catalogue's
      // spelling of it when there is one so the two forms cannot diverge
      const match = BY_KEY.get(keyOf(k.default));
      if (match) k.default = match.stack;
      const extra = match ? [] : [k.default];
      k.options = extra.concat(stacks);
      k.labels = extra.map(familyOf).concat(labels);
    }

    // preload what the page starts on
    const cs = getComputedStyle(document.documentElement);
    for (const k of cfg.knobs || []) {
      if (k.font) ensureFont((cs.getPropertyValue(k.id) || '').trim() || k.default);
    }

    mountTweakPanel(cfg);

    const panel = document.getElementById('rx-panel');
    const upgraded = panel ? upgradeFontSelects(panel) : 0;
    console.info(
      `[rx] ${roles} font roles declared, ${upgraded} selects wired, ${CATALOGUE.length} families`
    );
    if (upgraded < roles) {
      console.warn(`[rx] only ${upgraded}/${roles} font selects were wired — picking a family will fall back`);
    }
  })
  .catch((e) => console.warn('tweak panel:', e));
