/* Diagnose the font-role knobs end to end: does picking a family actually
   change the RENDERED face, or only the computed font-family string? */
import { launch, sleep } from './cdp.mjs';

const b = await launch();
const p = await b.newPage();
await p.init();
await p.setViewport(1440, 900, 1);
await p.goto('http://127.0.0.1:5178/?rx=vitruvian', { waitMs: 5000 });
await sleep(2500);

console.log('--- console from the page ---');
p.consoleLogs.slice(-12).forEach((l) => console.log(`  [${l.type}] ${l.text.slice(0, 160)}`));
if (p.pageErrors.length) {
  console.log('--- page errors ---');
  p.pageErrors.slice(0, 5).forEach((e) => console.log('  ' + e.slice(0, 200)));
}

const state = JSON.parse(await p.eval(`JSON.stringify((() => {
  const el = document.getElementById('rx-panel');
  if (!el) return { panel: false };
  const labels = [...el.querySelectorAll('label')];
  const fontLabel = labels.find((l) => l.textContent.indexOf('--rx-font-display') >= 0);
  const sel = fontLabel && fontLabel.querySelector('select');
  return {
    panel: true,
    fontRoles: labels.filter((l) => /--rx-font-/.test(l.textContent)).length,
    idExtracted: fontLabel ? (fontLabel.textContent.match(/--[\\w-]+/) || ['NONE'])[0] : 'NO-LABEL',
    options: sel ? sel.options.length : 0,
    optgroups: sel ? sel.querySelectorAll('optgroup').length : 0,
    currentValue: sel ? sel.value : null,
    sample: sel ? [...sel.options].slice(3, 6).map((o) => o.value) : [],
    fontLinks: [...document.querySelectorAll('link[data-rx-font]')].map((l) => l.dataset.rxFont),
  };
})())`));
console.log('\n--- panel state ---');
console.log(JSON.stringify(state, null, 1));

// Pick a very distinctive family and see whether it actually renders.
const TEST = '"Bungee", system-ui, sans-serif';
const result = JSON.parse(await p.eval(`(async () => {
  const el = document.getElementById('rx-panel');
  const labels = [...el.querySelectorAll('label')];
  const fontLabel = labels.find((l) => l.textContent.indexOf('--rx-font-display') >= 0);
  const sel = fontLabel.querySelector('select');
  const opt = [...sel.options].find((o) => o.value.indexOf('Bungee') >= 0);
  const before = {
    computed: getComputedStyle(document.querySelector('.heading-style-h1')).fontFamily,
    width: document.querySelector('.heading-style-h1').getBoundingClientRect().width,
  };
  if (!opt) return JSON.stringify({ error: 'Bungee not in options', before });
  sel.value = opt.value;
  sel.dispatchEvent(new Event('input', { bubbles: true }));
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 2500));
  try { await document.fonts.ready; } catch (e) {}
  const h = document.querySelector('.heading-style-h1');
  return JSON.stringify({
    picked: opt.value,
    before,
    after: { computed: getComputedStyle(h).fontFamily, width: h.getBoundingClientRect().width },
    varSet: getComputedStyle(document.documentElement).getPropertyValue('--rx-font-display').trim(),
    linkAdded: !!document.querySelector('link[data-rx-font="Bungee"]'),
    linkHref: (document.querySelector('link[data-rx-font="Bungee"]') || {}).href || null,
    fontLoaded: document.fonts.check('40px Bungee'),
    allLinks: [...document.querySelectorAll('link[data-rx-font]')].map((l) => l.dataset.rxFont),
  });
})()`));
console.log('\n--- after picking Bungee ---');
console.log(JSON.stringify(result, null, 1));
console.log('\nVERDICT: width change =', Math.abs(result.after.width - result.before.width).toFixed(1), 'px',
  '(0 means the face never actually loaded)');

await b.close();
