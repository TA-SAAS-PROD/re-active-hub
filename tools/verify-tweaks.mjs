/* Assert the exported tweak set is actually LIVE on the page.

   A permalink (#rx=...) lives in the URL only; a token baked into the
   direction ships with the build. This reads every key back off the
   rendered document root with no hash present, which is the only thing
   that proves the deployed site will carry them. */
import { launch, sleep } from './cdp.mjs';

const WANT = {
  "--rx-display-scale": "1.05", "--p-display-tracking": "0.005em", "--rx-heading-weight": "600",
  "--rx-size-body": "1.04rem", "--rx-size-stats": "4.05rem", "--rx-size-marquee": "1.5rem",
  "--rx-size-footer-link": "1.14rem", "--rx-button-weight": "500", "--rx-radius-scale": "0.82",
  "--rx-totop-size": "3.875rem", "--rx-footer-chips-lift": "6.5rem", "--rx-footer-chips-scale": "1.45",
  "--p-photo-blend": "normal", "--p-photo-bright": "1", "--p-photo-y": "54%",
  "--card-scrim-top": "0", "--card-scrim-bottom": "0.32", "--card-scrim-mid": "0.2",
  "--card-photo-y": "30%", "--rx-reveal-dur": "1000ms", "--rx-reveal-blur": "27px",
  "--rx-letter-stagger": "100ms", "--rx-marquee-dur": "32000ms", "--rx-hover-dur": "380ms",
  "--g-bend": "url(#rx-bend-sm)", "--g-blur": "7px", "--g-saturate": "1.55", "--g-brightness": "1.08",
  "--g-tint": "26%", "--g-tint-shell": "30%", "--g-tint-hero": "10%", "--g-tint-btn": "80%",
  "--g-tint-btn-hero": "50%", "--g-tint-btn-modal": "84%",
};

const b = await launch();
const p = await b.newPage();
await p.init();
await p.setViewport(1440, 900, 1);
// no hash, no query: exactly what a visitor gets
const URL = process.argv[2] || 'http://127.0.0.1:5178/';
await p.goto(URL, { waitMs: 4500 });
console.log('checking ' + URL);
await sleep(2000);

const got = JSON.parse(await p.eval(`JSON.stringify((() => {
  const cs = getComputedStyle(document.documentElement);
  const out = {};
  for (const k of ${JSON.stringify(Object.keys(WANT))}) out[k] = cs.getPropertyValue(k).trim();
  return out;
})())`));

let ok = 0;
const bad = [];
for (const [k, want] of Object.entries(WANT)) {
  const have = got[k];
  // url(...) may come back with quotes; numbers may gain/lose a trailing zero
  const norm = (v) => String(v).replace(/["']/g, '').replace(/\s+/g, '');
  if (norm(have) === norm(want)) ok++;
  else bad.push(`${k}: want ${want}, got ${have || '(empty)'}`);
}
console.log(`tweak tokens live on the plain URL: ${ok}/${Object.keys(WANT).length}`);
if (bad.length) { console.log('MISMATCHES:'); bad.forEach((x) => console.log('  ' + x)); }

// the nav subtree, on the same plain URL
const nav = JSON.parse(await p.eval(`(async () => {
  const dd = document.querySelector('[data-dropdown]');
  const list = dd.querySelector('.nav_link-dropdown');
  const nav = document.querySelector('.navbar_content');
  const h0 = Math.round(nav.getBoundingClientRect().height);
  const v0 = getComputedStyle(list).visibility;
  dd.dispatchEvent(new MouseEvent('mouseenter'));
  await new Promise((r) => setTimeout(r, 700));
  const v1 = getComputedStyle(list).visibility, o1 = getComputedStyle(list).opacity;
  const h1 = Math.round(nav.getBoundingClientRect().height);
  const r = list.getBoundingClientRect();
  const hit = document.elementFromPoint(r.left + r.width / 2, r.top + 40);
  const onTop = !!(hit && list.contains(hit));
  const fits = r.left >= 0 && r.right <= innerWidth;
  dd.dispatchEvent(new MouseEvent('mouseleave'));
  await new Promise((r) => setTimeout(r, 700));
  const v2 = getComputedStyle(list).visibility;
  return JSON.stringify({ v0, v1, o1, v2, navStable: h0 === h1, onTop, fits, headings: document.querySelectorAll('.nav_dropdown-heading').length });
})()`));

const navOk = nav.v0 === 'hidden' && nav.v1 === 'visible' && +nav.o1 > 0.9 &&
              nav.v2 === 'hidden' && nav.navStable && nav.onTop && nav.fits && nav.headings === 4;
console.log(`nav dropdown: ${navOk ? 'OK' : 'PROBLEM'}  ${JSON.stringify(nav)}`);
console.log('console errors:', p.pageErrors.length);
await b.close();
if (bad.length || !navOk || p.pageErrors.length) process.exit(1);
