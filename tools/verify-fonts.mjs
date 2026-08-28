/* Font-role verification.

   verify-panel.mjs asserts that a knob changes a COMPUTED VALUE. Every font
   role passed that check while rendering the same fallback face, because
   setting font-family to a family the page never loaded still changes the
   computed string. The declaration moved; the pixels did not.

   So this checks the thing that actually matters: pick a distinctive family
   for each role and require BOTH
     - a stylesheet link for that family to appear, and
     - the rendered width of the target text to move materially.
   A fallback swap shifts width a little; a real face swap shifts it a lot,
   and the two are easy to tell apart with a wide display face. */
import { launch, sleep } from './cdp.mjs';

/* [knob, selector whose width to measure, family to test with] — each test
   family is a wide display or mono face, so a real load is unmistakable. */
const ROLES = [
  ['--rx-font-display',        '.heading-style-h1',      'Bungee'],
  ['--rx-font-body',           '.section_stats .text-2xl', 'Bungee'],
  ['--rx-font-nav',            '.nav_links',             'Bungee'],
  ['--rx-font-button',         '.button-text.is-firts',   'Bungee'],
  ['--rx-font-footer',         '.footer-link',           'Bungee'],
  ['--rx-font-footer-display', '.text_footer',           'Bungee'],
  ['--rx-font-stats',          '.stats',                 'Bungee'],
  ['--rx-font-marquee',        '.main_loop-specialties > div', 'Bungee'],
  ['--rx-font-brand',          '.brand_word',            'Bungee'],
];

const MIN_SHIFT = 4; // px — below this the face almost certainly did not load

const b = await launch();
const p = await b.newPage();
await p.init();
await p.setViewport(1440, 900, 1);
await p.goto('http://127.0.0.1:5178/?rx=vitruvian', { waitMs: 5000 });
await sleep(2500);

const mounted = await p.eval(`!!document.getElementById('rx-panel')`);
if (!mounted) { console.log('FAIL: panel did not mount'); await b.close(); process.exit(1); }

let pass = 0;
const fail = [];

for (const [knob, sel, family] of ROLES) {
  const r = JSON.parse(await p.eval(`(async () => {
    const el = document.querySelector(${JSON.stringify(sel)});
    if (!el) return JSON.stringify({ missing: true });
    // Measure the TEXT's own extent, not the element box. Block elements are
    // sized by their container, so their width cannot move no matter which
    // face renders — three roles reported exactly 0.0px for that reason.
    const extent = (node) => {
      const r = document.createRange();
      r.selectNodeContents(node);
      const b = r.getBoundingClientRect();
      return b.width + b.height;   // catches both wider glyphs and re-wrapping
    };
    const w0 = extent(el);

    // drive it the way the panel does: find the select holding this knob's
    // value and change it, so the panel's own listener is what fires
    const panel = document.getElementById('rx-panel');
    const want = [...panel.querySelectorAll('select')].find((s) =>
      [...s.options].some((o) => o.value.indexOf(${JSON.stringify(family)}) >= 0) &&
      s.closest('label') && s.closest('label').textContent.indexOf(${JSON.stringify(knob)}) >= 0);
    if (!want) return JSON.stringify({ noSelect: true });

    const opt = [...want.options].find((o) => o.value.indexOf(${JSON.stringify(family)}) >= 0);
    want.value = opt.value;
    want.dispatchEvent(new Event('input', { bubbles: true }));
    want.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 2200));
    try { await document.fonts.ready; } catch (e) {}

    const w1 = extent(el);
    return JSON.stringify({
      shift: Math.abs(w1 - w0),
      link: !!document.querySelector('link[data-rx-font=' + JSON.stringify(${JSON.stringify(family)}) + ']'),
      computed: getComputedStyle(el).fontFamily.split(',')[0],
    });
  })()`));

  if (r.missing)  { fail.push(`${knob}: target ${sel} not found`); continue; }
  if (r.noSelect) { fail.push(`${knob}: no select carries this knob`); continue; }
  const ok = r.link && r.shift >= MIN_SHIFT;
  if (ok) { pass++; console.log(`  ok   ${knob.padEnd(26)} ${r.shift.toFixed(1)}px shift, face loaded`); }
  else fail.push(`${knob}: shift ${r.shift.toFixed(1)}px, link=${r.link} — face did not render`);

  // reset for the next role
  await p.eval(`document.documentElement.style.removeProperty(${JSON.stringify(knob)})`);
  await sleep(200);
}

console.log(`\nfont roles rendering a real face: ${pass}/${ROLES.length}`);
if (fail.length) { console.log('FAILURES:'); fail.forEach((f) => console.log('  ' + f)); }
console.log('console errors:', p.pageErrors.length);
await b.close();
if (fail.length) process.exit(1);
