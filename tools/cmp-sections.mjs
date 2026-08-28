import { launch, sleep } from './cdp.mjs';
const ORIG = 'https://genovas-template.webflow.io/home/home-3';
const CLONE = 'http://127.0.0.1:5178/';

const PROBE = `JSON.stringify((() => {
  const sels = ['.navbar','.section_hero','.container-box.is-hero','.hero_visual','.section_specialties',
    '.section_stats','.content-wrap.is-stats','.stats_content','.section_expertise','.expertise_content',
    '.section_differentiators','.differentiators_content','.section_cases','.cases_content',
    '.section_cta','.section_testimonials','.grid-two','.section_footer','.footer_top','.text_footer'];
  return sels.map(s => {
    const e = document.querySelector(s);
    if (!e) return { s, missing: true };
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    return { s, y: Math.round(r.y + scrollY), h: Math.round(r.height), w: Math.round(r.width),
      d: cs.display, gtc: cs.gridTemplateColumns, ff: cs.flexFlow, pad: cs.padding, fs: cs.fontSize };
  });
})())`;

const b = await launch();
const width = Number(process.argv[2] || 768);
const height = width < 500 ? 844 : 1024;

async function grab(url, settle) {
  const p = await b.newPage(); await p.init();
  await p.setViewport(width, height, 1, width < 768);
  await p.goto(url, { waitMs: 3500 });
  await p.scrollThrough(600, 200);
  if (settle) await p.eval(settle);
  await sleep(800);
  const r = JSON.parse(await p.eval(PROBE));
  await p.close();
  return r;
}

const o = await grab(ORIG, `document.querySelectorAll('.new-base--t-temlis-component').forEach(e=>e.remove())`);
const c = await grab(CLONE, `window.__settleForQA && window.__settleForQA()`);
await b.close();

console.log(`\n@${width}px  ${'selector'.padEnd(30)} ${'orig y/h'.padEnd(16)} ${'clone y/h'.padEnd(16)}   dY    dH`);
console.log('-'.repeat(96));
for (let i = 0; i < o.length; i++) {
  const a = o[i], d = c[i];
  if (a.missing || d.missing) { console.log(`${a.s.padEnd(38)} ${a.missing ? 'MISSING in orig ' : ''}${d.missing ? 'MISSING in clone' : ''}`); continue; }
  const dY = d.y - a.y, dH = d.h - a.h;
  const flag = (Math.abs(dY) > 2 || Math.abs(dH) > 2) ? '  <<<' : '';
  console.log(`        ${a.s.padEnd(30)} ${(a.y + '/' + a.h).padEnd(16)} ${(d.y + '/' + d.h).padEnd(16)} ${String(dY).padStart(5)} ${String(dH).padStart(5)}${flag}`);
  if (flag) {
    if (a.gtc !== d.gtc) console.log(`           grid-cols  orig="${a.gtc}"  clone="${d.gtc}"`);
    if (a.ff !== d.ff)   console.log(`           flex-flow  orig="${a.ff}"  clone="${d.ff}"`);
    if (a.pad !== d.pad) console.log(`           padding    orig="${a.pad}"  clone="${d.pad}"`);
    if (a.fs !== d.fs)   console.log(`           font-size  orig="${a.fs}"  clone="${d.fs}"`);
  }
}
