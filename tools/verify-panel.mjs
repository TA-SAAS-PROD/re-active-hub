/* Phase 3 verification.
   1. the panel mounts and renders a control per knob
   2. EVERY knob visibly changes the page (measured, not eyeballed)
   3. the #rx= permalink round-trips through a fresh page load
   4. reset returns to the direction's defaults
   5. no knob is a no-op left in panel.json by accident                     */
import { launch, sleep } from './cdp.mjs';
import { readFileSync } from 'node:fs';

const OUT = 'C:/Users/prakash.c/cs-assessment/output/genovas-template.webflow.io';
const panel = JSON.parse(readFileSync(OUT + '/remix/panel.json', 'utf8'));
const URL = 'http://127.0.0.1:5178/?rx=vitruvian';

// what to measure for each knob, and an extreme to push it to
const PROBE = {
  // sanguine is an ACCENT in vitruvian, not a fill: it marks the highlighted
  // card's edge and its chip, so that is where the knob shows
  '--rx-accent':           ['.expertise_card.is-yellow', 'borderTopColor', '#00ff88'],
  '--rx-ground':           ['body', 'backgroundColor', '#112233'],
  '--rx-panel':            ['.container-box.is-stats', 'backgroundColor', '#ff00ff'],
  '--rx-color-text':       ['.heading-style-h2', 'color', '#0000ff'],
  '--rx-slate':            ['.footer_content', 'backgroundColor', '#00ffff'],
  '--rx-display-scale':    ['.hero_title', 'fontSize', '0.5'],
  '--p-display-tracking':  ['.hero_title', 'letterSpacing', '0.02em'],
  '--rx-heading-weight':   ['.heading-style-h1', 'fontWeight', '500'],
  '--rx-root-scale':       ['html', 'fontSize', '0.85'],
  '--rx-radius-scale':     ['.container-box.is-stats', 'borderTopLeftRadius', '1.2'],
  '--p-rule-alpha':        ['.container-box.is-stats', 'borderTopColor', '80%'],
  '--p-rule-width':        ['.container-box.is-stats', 'borderTopWidth', '3px'],
  '--p-plate-tooth':       ['.hero_plate', 'opacity', '1', '::after'],
  '--p-plate-wash':        ['.hero_plate', 'backgroundImage', '100%'],
  '--rx-reveal-dur':       ['[data-reveal].is-in', 'transitionDuration', '300ms'],
  '--rx-letter-stagger':   ['.hero_title span:nth-child(3)', 'transitionDelay', '300ms'],
  '--rx-marquee-dur':      ['.main_loop.is-specialties', 'animationDuration', '9000ms'],
  '--rx-font-display':     ['.heading-style-h1', 'fontFamily', 'Archivo'],
  '--rx-font-body':        ['.text-base', 'fontFamily', 'Archivo'],
  '--rx-font-nav':         ['.nav_links', 'fontFamily', 'Archivo'],
  '--rx-font-button':      ['.button-text', 'fontFamily', 'Archivo'],
  '--rx-font-footer':      ['.footer-link', 'fontFamily', 'Archivo'],
  '--rx-font-footer-display': ['.text_footer', 'fontFamily', 'Archivo'],
  '--rx-font-stats':       ['.stats', 'fontFamily', 'Archivo'],
  '--rx-font-marquee':     ['.specialties_content', 'fontFamily', 'Archivo'],
  '--rx-font-brand':       ['.brand_word', 'fontFamily', 'Archivo'],
  '--rx-heading-tracking': ['.heading-style-h1', 'letterSpacing', '0.04em'],
  '--rx-size-body':        ['.text-base', 'fontSize', '1.4rem'],
  '--rx-size-nav':         ['.nav_links', 'fontSize', '1.3rem'],
  '--rx-size-stats':       ['.stats', 'fontSize', '6rem'],
  '--rx-size-marquee':     ['.specialties_content', 'fontSize', '3.5rem'],
  '--rx-size-footer-link': ['.footer-link', 'fontSize', '1.35rem'],
  '--rx-button-weight':    ['.button-text', 'fontWeight', '700'],
  '--rx-accent-2':         ['.expertise_card', 'backgroundColor', '#00ff88'],
  '--rx-solid':            ['.navbar .button', 'backgroundColor', '#00ff88'],
  '--p-scrim-top':         ['.container-box.is-hero-visual', 'backgroundImage', '0.9', '::after'],
  '--p-scrim-bottom':      ['.container-box.is-hero-visual', 'backgroundImage', '0.1', '::after'],
  '--g-tint-btn-hero':     ['.hero-cta .button', 'backgroundColor', '10%'],
  '--rx-totop-size':       ['.to-top', 'width', '4.5rem'],
  '--g-tint-modal':        ['.modal_dialog', 'backgroundColor', '10%'],
  '--g-tint-btn-modal':    ['.button.is-submit', 'backgroundColor', '10%'],
  '--g-tint-nav':          ['.nav_dropdown-content', 'backgroundColor', '10%'],
  '--nav-dd-dur':          ['.nav_link-dropdown', 'transition', '700ms'],
  '--nav-dd-rise':         ['.nav_link-dropdown', 'transform', '2rem'],
  '--nav-dd-offset':       ['.nav_link-dropdown', 'top', '2.5rem'],
  '--rx-footer-chips-lift':  ['.footer_contact-actions', 'bottom', '18rem'],
  '--rx-footer-chips-scale': ['.contact-chip', 'fontSize', '1.9'],
  '--rx-footer-chips-right': ['.footer_contact-actions', 'right', '14rem'],
  '--card-scrim-top':      ['.card_photo.is-back-neck', 'backgroundImage', '0.95', '::after'],
  '--card-scrim-mid':      ['.card_photo.is-back-neck', 'backgroundImage', '0.95', '::after'],
  '--card-scrim-bottom':   ['.card_photo.is-back-neck', 'backgroundImage', '0.05', '::after'],
  '--card-photo-y':        ['.card_photo.is-back-neck', 'backgroundPosition', '12%'],
  '--card-photo-sat':      ['.card_photo.is-back-neck', 'filter', '1.8'],
  '--card-photo-contrast': ['.card_photo.is-back-neck', 'filter', '1.6'],
  '--p-scrim-band':        ['.container-box.is-hero-visual', 'backgroundImage', '0.95', '::after'],
  '--p-scrim-mid':         ['.container-box.is-hero-visual', 'backgroundImage', '0.95', '::after'],
  '--p-scrim-band-start':  ['.container-box.is-hero-visual', 'backgroundImage', '12%',  '::after'],
  '--p-scrim-band-end':    ['.container-box.is-hero-visual', 'backgroundImage', '88%',  '::after'],
  '--p-photo-opacity':     ['.hero_plate', 'opacity', '0.3', '::before'],
  '--p-photo-blend':       ['.hero_plate', 'mixBlendMode', 'luminosity', '::before'],
  '--p-photo-gray':        ['.hero_plate', 'filter', '1', '::before'],
  '--p-photo-contrast':    ['.hero_plate', 'filter', '1.9', '::before'],
  '--p-photo-bright':      ['.hero_plate', 'filter', '1.5', '::before'],
  '--p-photo-y':           ['.hero_plate', 'backgroundPosition', '90%', '::before'],
  '--rx-hover-dur':        ['.button-text', 'transitionDuration', '600ms'],
  '--g-bend':              ['.container-box.is-stats', 'filter', 'url(#rx-bend-lg)', '::before'],
  '--g-tint-shell':        ['.container-box.is-stats', 'backgroundColor', '90%'],
  '--g-tint-hero':         ['.hero-cta.is-home-two', 'backgroundColor', '90%'],
  '--g-edge-size':         ['.container-box.is-stats', 'boxShadow', '6px', '::after'],
  '--g-glow-white':        ['.container-box.is-stats', 'boxShadow', '0.4'],
  '--g-glow-spread':       ['.container-box.is-stats', 'boxShadow', '70px'],
  '--g-glow-dark':         ['.container-box.is-stats', 'boxShadow', '0.45'],
  '--g-ambient-spread':    ['body', 'backgroundImage', '40%'],
  // the blur lives on the bend layer (::before), not the pane itself
  '--g-blur':              ['.container-box.is-stats', 'backdropFilter', '48px', '::before'],
  '--g-saturate':          ['.container-box.is-stats', 'backdropFilter', '2.6', '::before'],
  '--g-brightness':        ['.container-box.is-stats', 'backdropFilter', '1.3', '::before'],
  // .container-box now takes --g-tint-shell; --g-tint drives the cards
  '--g-tint':              ['.differentiators_card', 'backgroundColor', '30%'],
  '--g-tint-dark':         ['.footer_content', 'backgroundColor', '30%'],
  '--g-tint-btn':          ['.navbar .button', 'backgroundColor', '20%'],
  '--g-dark-ground':       ['.section_footer', 'backgroundColor', '10%'],
  '--g-edge-alpha':        ['.container-box.is-stats', 'boxShadow', '0.9', '::after'],
  '--g-shadow-alpha':      ['.container-box.is-stats', 'boxShadow', '0.5'],
  '--g-shadow-y':          ['.container-box.is-stats', 'boxShadow', '70px'],
  '--g-shadow-blur':       ['.container-box.is-stats', 'boxShadow', '130px'],
  '--g-ambient':           ['body', 'backgroundImage', '0.2'],
  '--g-noise':             ['body', 'opacity', '0.18', '::after'],

};

const b = await launch();
const p = await b.newPage();
await p.init();
await p.setViewport(1440, 900, 1);
await p.goto(URL, { waitMs: 4000 });

/* Two measurement regimes, and they are mutually exclusive:
     - Motion knobs need live transitions, so they must be read BEFORE
       __settleForQA(), which injects `animation:none !important` to freeze
       the page for screenshots. Reading them after gives a flat 0s.
     - Colour/surface knobs on the hero plate need [data-loaded] and .is-in,
       which only exist AFTER the load choreography and reveals have run.
   So: scroll to fire the reveals, probe motion live, then settle and probe
   the rest.                                                              */
const MOTION_KNOBS = new Set(['--rx-reveal-dur', '--rx-letter-stagger', '--rx-marquee-dur', '--rx-hover-dur',
  // read before the QA settle kills every transition
  '--nav-dd-dur']);

/* --rx-reveal-blur is a third case: it sets the reveal's FROM state, so it
   can only be read on an element that has not revealed yet. Once the page is
   scrolled every [data-reveal] carries .is-in and reads blur(0px). Probe it
   here, at the top of an untouched page, before anything fires. */
const preBlur = await (async () => {
  const sel = '[data-reveal]:not(.is-in)';
  const rd = `getComputedStyle(document.querySelector(${JSON.stringify(sel)})).filter`;
  const before = await p.eval(rd);
  await p.eval(`document.documentElement.style.setProperty('--rx-reveal-blur','40px')`);
  await sleep(120);
  const after = await p.eval(rd);
  await p.eval(`document.documentElement.style.removeProperty('--rx-reveal-blur')`);
  return { before, after, ok: before !== after };
})();
console.log(`  ${preBlur.ok ? 'ok ' : 'FAIL'} --rx-reveal-blur      filter: ${preBlur.before} -> ${preBlur.after}   (pre-scroll)`);

await p.scrollThrough(700, 150);
await sleep(900);

// ---- 1. panel mounted -------------------------------------------------
const mounted = JSON.parse(await p.eval(`JSON.stringify((()=>{
  const el = document.getElementById('rx-panel');
  if (!el) return { ok:false };
  return { ok:true,
    controls: el.querySelectorAll('input,select').length,
    groups: [...el.querySelectorAll('details summary')].map(s=>s.textContent.trim().split(/\\s+/)[0]) };
})())`));
console.log('panel mounted:', JSON.stringify(mounted));

// ---- 2. every knob moves something ------------------------------------
/* The pseudo-element is passed explicitly rather than inferred. An earlier
   version guessed "if selector is .hero_plate and prop is opacity, read
   ::after", which silently read the wrong layer once the photo arrived on
   ::before — the probe would have reported a working knob as a no-op. */
const read = (sel, prop, pseudo) => `(() => {
  const el = document.querySelector(${JSON.stringify(sel)});
  if (!el) return 'NO-ELEMENT';
  return getComputedStyle(el, ${JSON.stringify(pseudo || null)})[${JSON.stringify(prop)}];
})()`;

let pass = preBlur.ok ? 1 : 0;
const fail = preBlur.ok ? [] : ['--rx-reveal-blur: NO-OP'];

// motion first, while transitions are still live
// both are probed separately below/above: one needs the pre-scroll state,
// the other only exists in a :hover rule
const ordered = panel.knobs.filter(k=>!['--rx-reveal-blur','--g-hover-scale'].includes(k.id)).slice().sort((a, b) =>
  (MOTION_KNOBS.has(b.id) ? 1 : 0) - (MOTION_KNOBS.has(a.id) ? 1 : 0));
let settled = false;

for (const k of ordered) {
  if (!MOTION_KNOBS.has(k.id) && !settled) {
    await p.eval('window.__settleForQA && window.__settleForQA()');
    await sleep(1000);
    settled = true;
    console.log('  -- settled (load choreography + reveals resolved) --');
  }
  const probe = PROBE[k.id];
  if (!probe) { fail.push(`${k.id}: NO PROBE DEFINED`); continue; }
  const [sel, prop, extreme, pseudo] = probe;
  const before = await p.eval(read(sel, prop, pseudo));
  const val = k.unit && !String(extreme).endsWith(k.unit) ? extreme : extreme;
  await p.eval(`document.documentElement.style.setProperty(${JSON.stringify(k.id)}, ${JSON.stringify(val)})`);
  await sleep(140);
  const after = await p.eval(read(sel, prop, pseudo));
  await p.eval(`document.documentElement.style.removeProperty(${JSON.stringify(k.id)})`);
  if (before === 'NO-ELEMENT') { fail.push(`${k.id}: selector ${sel} not found`); continue; }
  if (String(before) === String(after)) fail.push(`${k.id}: NO-OP (${prop} stayed ${before})`);
  else { pass++; console.log(`  ok  ${k.id.padEnd(22)} ${prop}: ${String(before).slice(0,34)} -> ${String(after).slice(0,34)}`); }
}

// ---- 3. permalink round-trip ------------------------------------------
await p.eval(`(()=>{
  const el=document.getElementById('rx-panel');
  const inp=[...el.querySelectorAll('input[type=color]')][0];
  inp.value='#00ff88'; inp.dispatchEvent(new Event('input',{bubbles:true}));
})()`);
await sleep(400);
const hash = await p.eval('location.hash');
const p2 = await b.newPage(); await p2.init();
await p2.setViewport(1440, 900, 1);
await p2.goto(URL + hash, { waitMs: 3500 });
await sleep(1200);
const rt = await p2.eval(`getComputedStyle(document.documentElement).getPropertyValue('--rx-accent').trim()`);
console.log(`\npermalink: hash=${hash.slice(0, 46)}...  reopened --rx-accent=${rt}`);
await p2.close();

// ---- 4. reset ----------------------------------------------------------
await p.eval(`(()=>{const b=[...document.querySelectorAll('#rx-panel footer button')].find(x=>/reset/i.test(x.textContent)); if(b) b.click();})()`);
await sleep(500);
const afterReset = JSON.parse(await p.eval(`JSON.stringify({
  accent: getComputedStyle(document.documentElement).getPropertyValue('--rx-accent').trim(),
  hash: location.hash })`));
console.log('after reset:', JSON.stringify(afterReset));

/* --g-hover-scale only appears inside a :hover rule, which getComputedStyle
   cannot observe without a real pointer. Assert the rule exists and reads the
   variable — the same approach the button text-swap check uses. */
{
  const hoverOk = await p.eval(`(() => {
    for (const sh of document.styleSheets) {
      let rs; try { rs = sh.cssRules; } catch (e) { continue; }
      for (const r of rs) {
        if (r.selectorText && /:hover/.test(r.selectorText) &&
            /--g-hover-scale/.test(r.style.cssText)) return true;
      }
    }
    return false;
  })()`);
  if (hoverOk) { pass++; console.log('  ok  --g-hover-scale       :hover rule references the var'); }
  else fail.push('--g-hover-scale: no :hover rule references it');
}

/* ---- 5. mobile-only knobs ---------------------------------------------
   These three are declared inside @media (max-width: 767px); at 1440 the
   rule does not apply, so they can only be probed at a mobile viewport. */
const MOBILE_ONLY = {
  '--card-scrim-top-sm':    ['.card_photo.is-back-neck', 'background', '0.95', '::after'],
  '--card-scrim-mid-sm':    ['.card_photo.is-back-neck', 'background', '0.95', '::after'],
  '--card-scrim-bottom-sm': ['.card_photo.is-back-neck', 'background', '0.05', '::after'],
};
{
  for (const id of Object.keys(MOBILE_ONLY)) {
    const i = fail.indexOf(id + ': NO PROBE DEFINED');
    if (i >= 0) fail.splice(i, 1);
  }
  const pm = await b.newPage(); await pm.init();
  await pm.setViewport(390, 844, 1);
  await pm.goto(URL, { waitMs: 4000 });
  await sleep(1800);
  for (const [id, [sel, prop, val, pseudo]] of Object.entries(MOBILE_ONLY)) {
    const r = JSON.parse(await pm.eval(`(async () => {
      const el = document.querySelector(${JSON.stringify(sel)});
      if (!el) return JSON.stringify({ missing: true });
      const read = () => getComputedStyle(el, ${JSON.stringify(pseudo || null)})[${JSON.stringify(prop)}];
      const before = read();
      document.documentElement.style.setProperty(${JSON.stringify(id)}, ${JSON.stringify(val)});
      await new Promise((r) => setTimeout(r, 220));
      const after = read();
      document.documentElement.style.removeProperty(${JSON.stringify(id)});
      return JSON.stringify({ before: String(before).slice(0, 60), after: String(after).slice(0, 60), moved: before !== after });
    })()`));
    if (r.missing) fail.push(`${id}: target ${sel} not found at 390`);
    else if (r.moved) { pass++; console.log(`  ok  ${id.padEnd(22)} @390 ${r.before.slice(0, 26)} -> ${r.after.slice(0, 26)}`); }
    else fail.push(`${id}: NO-OP at 390 (${r.before})`);
  }
  await pm.close();
}

/* ---- JS-consumed knobs ------------------------------------------------
   --nav-dd-open-delay and --nav-dd-close-delay are read by main.js, never
   by CSS, so a computed-style probe is structurally blind to them. Time the
   real hover instead: with a long delay the panel must NOT be open early
   and MUST be open later. */
const JS_TIMED = ['--nav-dd-open-delay', '--nav-dd-close-delay'];
{
  for (const id of JS_TIMED) {
    const i = fail.indexOf(id + ': NO PROBE DEFINED');
    if (i >= 0) fail.splice(i, 1);
  }
  const pj = await b.newPage(); await pj.init();
  await pj.setViewport(1440, 900, 1);
  await pj.goto(URL, { waitMs: 4000 });
  await sleep(1800);

  const openRes = JSON.parse(await pj.eval(`(async () => {
    const dd = document.querySelector('[data-dropdown]');
    document.documentElement.style.setProperty('--nav-dd-open-delay', '700');
    dd.dispatchEvent(new MouseEvent('mouseenter'));
    await new Promise((r) => setTimeout(r, 250));
    const early = dd.dataset.state === 'open';
    await new Promise((r) => setTimeout(r, 700));
    const late = dd.dataset.state === 'open';
    dd.dispatchEvent(new MouseEvent('mouseleave'));
    document.documentElement.style.removeProperty('--nav-dd-open-delay');
    return JSON.stringify({ early, late });
  })()`));
  if (!openRes.early && openRes.late) { pass++; console.log('  ok  --nav-dd-open-delay   700ms honoured: shut at 250ms, open at 950ms'); }
  else fail.push(`--nav-dd-open-delay: not honoured (${JSON.stringify(openRes)})`);

  await sleep(600);
  const closeRes = JSON.parse(await pj.eval(`(async () => {
    const dd = document.querySelector('[data-dropdown]');
    document.documentElement.style.setProperty('--nav-dd-close-delay', '900');
    document.documentElement.style.setProperty('--nav-dd-open-delay', '0');
    dd.dispatchEvent(new MouseEvent('mouseenter'));
    await new Promise((r) => setTimeout(r, 200));
    const opened = dd.dataset.state === 'open';
    dd.dispatchEvent(new MouseEvent('mouseleave'));
    await new Promise((r) => setTimeout(r, 300));
    const stillOpen = dd.dataset.state === 'open';
    await new Promise((r) => setTimeout(r, 900));
    const shut = dd.dataset.state !== 'open';
    document.documentElement.style.removeProperty('--nav-dd-close-delay');
    document.documentElement.style.removeProperty('--nav-dd-open-delay');
    return JSON.stringify({ opened, stillOpen, shut });
  })()`));
  if (closeRes.opened && closeRes.stillOpen && closeRes.shut) { pass++; console.log('  ok  --nav-dd-close-delay  900ms honoured: still open at 300ms, shut by 1200ms'); }
  else fail.push(`--nav-dd-close-delay: not honoured (${JSON.stringify(closeRes)})`);

  await pj.close();
}

console.log(`\nknobs moving the page: ${pass}/${panel.knobs.length}`);
if (fail.length) { console.log('FAILURES:'); fail.forEach(f => console.log('  ' + f)); }
console.log('console errors:', p.pageErrors.length, JSON.stringify(p.pageErrors.slice(0, 3)));
await b.close();
