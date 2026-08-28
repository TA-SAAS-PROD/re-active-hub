/* Assemble site/assets/styles/base.css from the original stylesheet.

   Pipeline (tools/rebuild-css.mjs runs all of it in order):
     filter-css.mjs   original -> extract/filtered.css   (only selectors our markup matches)
     build-css.mjs    filtered + overrides -> base.css   (this file)
     tokenize-css.js  literals -> var(--rx-*, literal)
     remix-hoist.mjs  radius / root-scale / motion -> vars

   Steps 5 and 6 below were originally hand-edits to the built base.css. They
   are build steps now: re-running the filter regenerates from the original and
   would silently reinstate both, which is exactly the kind of bug that made the
   colour knobs inert the first time. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const OUT = 'C:/Users/prakash.c/cs-assessment/output/genovas-template.webflow.io';
mkdirSync(OUT + '/site/assets/styles', { recursive: true });

let css = readFileSync(OUT + '/extract/filtered.css', 'utf8');

// 1. Drop the template-vendor (Temlis promo widget) token block
css = css.replace(/^\s*--[\w-]*\\<deleted\\\|[^;]*;\s*$/gm, '');
css = css.replace(/^\s*--new-base[^;]*;\s*$/gm, '');

// 2. Webflow's font-stack fallback -> our loaded family
css = css.replace(/font-family:\s*Arial,\s*sans-serif/g, 'font-family: "DM Sans", system-ui, sans-serif');
css = css.replace(/DM Sans,\s*sans-serif/g, '"DM Sans", system-ui, sans-serif');

// 3. Webflow's icon font: a 2.5 KB base64 TTF whose only consumer was the
//    dropdown caret, which overrides.css now draws as an inline SVG mask.
const face = css.match(/@font-face\s*\{\s*font-family:\s*webflow-icons;[\s\S]*?\}\s*/);
if (face) css = css.replace(face[0], '');

// 4. The site's own custom-property vocabulary. remix-tokens.css owns it now
//    and points every name at an --rx-* role; leaving this block here means two
//    declarations of each name at equal specificity, and base.css wins on source
//    order, which makes every colour knob inert.
const rootStart = css.indexOf(':root {');
if (rootStart >= 0) {
  const rootEnd = css.indexOf('}', rootStart) + 1;
  const block = css.slice(rootStart, rootEnd);
  if (block.includes('--brand--')) {
    const n = (block.match(/--[\w-]+:/g) || []).length;
    css = css.slice(0, rootStart) +
      '/* The site\'s --brand--* / --text-color--* / --bg-color--* vocabulary was\n' +
      '   declared here in the original. remix-tokens.css owns it now and routes\n' +
      '   every name through an --rx-* role, so this block is dropped rather than\n' +
      '   duplicated — see tools/build-css.mjs step 4. */\n' +
      css.slice(rootEnd).replace(/^\s*\n/, '\n');
    console.log(`  dropped the duplicate :root vocabulary block (${n} declarations)`);
  }
}

// 5. Strip references to the original's hosted assets. The home-2 hero panel
//    carries `background-image: url(<their CDN>/hero.webp)` — their photograph,
//    and a cross-origin request. The .hero_plate stand-in covers the panel, so
//    dropping it changes nothing visually and removes both problems.
let stripped = 0;
css = css.replace(/background-image:\s*url\("https:\/\/cdn\.prod\.website-files\.com[^"]*"\)\s*;?/g, () => {
  stripped++;
  return '/* original hosted photograph removed — see remix/ASSETS.md */';
});
if (stripped) console.log(`  stripped ${stripped} reference(s) to the original's hosted assets`);

// 6. Collapse rule bodies the steps above emptied
css = css.replace(/[^{}]+\{\s*\}\n?/g, '');
css = css.replace(/\n{3,}/g, '\n\n');

const header = `/* ------------------------------------------------------------------
   Re-Active Hub — Gangtok. Remixed from a verified clone of
   genovas-template.webflow.io (home-3 body, home-2 hero).

   These rules are the original stylesheet filtered to the selectors this
   page's markup matches, then tokenized so every measured value reads an
   --rx-* knob with the original as its fallback. Colour, type and motion
   flow through remix-tokens.css; brand.css applies them.

   Generated — do not hand-edit. Run: node tools/rebuild-css.mjs
   ------------------------------------------------------------------ */
`;

const overrides = readFileSync(OUT + '/tools/overrides.css', 'utf8');
const out = header + css + '\n\n' + overrides;
writeFileSync(OUT + '/site/assets/styles/base.css', out);
console.log('base.css', out.length, 'bytes');
