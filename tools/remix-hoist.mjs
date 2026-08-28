/* ------------------------------------------------------------------
   Phase 0 (continued) — hoist the levers tokenize-css.js could not reach.

   tokenize-css.js works on literal px values. This clone is rem-based and
   routes ~all colour through the site's own "--brand--" vocabulary, so its
   generic "--rx-size-N" and "--rx-space-N" knobs matched nothing. The three
   levers that actually move this design are:

     1. border-radius        13x 1.5rem, 11x 1rem, 6x 2.5rem ...  -> scale var
     2. the fluid root scale  every rem in the page derives from it -> density
     3. motion durations/easings in motion.css                     -> personality

   All three are rewritten to read a var with the original as fallback, so
   removing remix-tokens.css leaves the clone byte-identical in behaviour.
   ------------------------------------------------------------------ */
import { readFileSync, writeFileSync } from 'node:fs';

const OUT = 'C:/Users/prakash.c/cs-assessment/output/genovas-template.webflow.io';
const BASE = OUT + '/site/assets/styles/base.css';
const MOTION = OUT + '/site/assets/styles/motion.css';

let css = readFileSync(BASE, 'utf8');
let n = { radius: 0, root: 0 };

// ---- 1. radius -> calc(scale * original) -------------------------------
// Skip `inherit`, and skip the sub-4px values (hairlines/dots) where a
// multiplier reads as a bug rather than a design change.
css = css.replace(/border-radius:\s*([\d.]+)rem(?![\w-])/g, (m, v) => {
  if (parseFloat(v) < 0.4) return m;
  n.radius++;
  return `border-radius: calc(var(--rx-radius-scale, 1) * ${v}rem)`;
});

// ---- 2. fluid root scale -> multiplied ---------------------------------
// html { font-size: calc(A rem + B vw) }  ->  calc((A rem + B vw) * scale)
css = css.replace(
  /html\s*\{\s*font-size:\s*calc\(([^)]+)\)\s*;\s*\}/g,
  (m, expr) => { n.root++; return `html { font-size: calc((${expr.trim()}) * var(--rx-root-scale, 1)); }`; }
);

writeFileSync(BASE, css);

// ---- 3. motion -> vars -------------------------------------------------
let mo = readFileSync(MOTION, 'utf8');
const M = [
  // [literal, var name, fallback]  — the reveal is the site's signature move
  [/filter:\s*blur\(30px\)/g, 'blur(30px)', '--rx-reveal-blur', '30px', 'filter: blur(var(--rx-reveal-blur, 30px))'],
];
// reveal timing
mo = mo.replace(/opacity 1000ms var\(--ease-out-expo\) 100ms,\s*\n(\s*)filter\s+1000ms var\(--ease-out-expo\) 100ms;/g,
  (m, ind) =>
    `opacity var(--rx-reveal-dur, 1000ms) var(--rx-reveal-ease, var(--ease-out-expo)) var(--rx-reveal-delay, 100ms),\n${ind}filter  var(--rx-reveal-dur, 1000ms) var(--rx-reveal-ease, var(--ease-out-expo)) var(--rx-reveal-delay, 100ms);`);
mo = mo.replace(/filter:\s*blur\(30px\)/g, 'filter: blur(var(--rx-reveal-blur, 30px))');
mo = mo.replace(/opacity 700ms var\(--ease-out-quart\) 100ms/g,
  'opacity var(--rx-card-dur, 700ms) var(--rx-card-ease, var(--ease-out-quart)) var(--rx-reveal-delay, 100ms)');
// hero letter stagger
mo = mo.replace(/calc\(var\(--i\) \* 100ms\)/g, 'calc(var(--i) * var(--rx-letter-stagger, 100ms))');
mo = mo.replace(/transform:\s*translateX\(150%\)/g, 'transform: translateX(var(--rx-letter-travel, 150%))');
mo = mo.replace(/filter:\s*blur\(40px\)/g, 'filter: blur(var(--rx-letter-blur, 40px))');
// marquee speed
mo = mo.replace(/animation:\s*loop-specialties 40000ms linear infinite/g,
  'animation: loop-specialties var(--rx-marquee-dur, 40000ms) linear infinite');
// button/card hover speed
mo = mo.replace(/transition:\s*transform 250ms var\(--ease-out-quad\)/g,
  'transition: transform var(--rx-hover-dur, 250ms) var(--ease-out-quad)');

writeFileSync(MOTION, mo);

console.log(`radius: ${n.radius} rewritten · root-scale: ${n.root} · motion vars hoisted`);
console.log('vars introduced: --rx-radius-scale --rx-root-scale --rx-reveal-{dur,ease,delay,blur}');
console.log('                 --rx-card-{dur,ease} --rx-letter-{stagger,travel,blur} --rx-marquee-dur --rx-hover-dur');
