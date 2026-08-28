/* Visual QA: original vs clone, full-page, at 1440 / 768 / 390.
   Pixel diff is done in-page on a <canvas> (no pixelmatch dependency) —
   same algorithm: per-pixel YIQ delta with an anti-aliasing tolerance,
   plus rectangular masks for regions that cannot match by construction. */
import { launch, sleep } from './cdp.mjs';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'C:/Users/prakash.c/cs-assessment/output/genovas-template.webflow.io';
const ORIG = 'https://genovas-template.webflow.io/home/home-3';
const CLONE = 'http://127.0.0.1:5178/';
mkdirSync(join(OUT, 'qa'), { recursive: true });

const VIEWPORTS = [[1440, 900], [768, 1024], [390, 844]];

// Settle script for the ORIGINAL (Webflow runtime present).
const SETTLE_ORIG = `(async () => {
  document.querySelectorAll('img').forEach(i => {
    i.loading = 'eager';
    const s = i.getAttribute('srcset'); if (s) i.setAttribute('srcset', s);
    const c = i.getAttribute('src');    if (c) i.setAttribute('src', c);
  });
  // resolve every IX2 reveal to its end state
  document.querySelectorAll('[data-w-id]').forEach(el => {
    const cs = getComputedStyle(el);
    if (parseFloat(cs.opacity) < 0.999) el.style.setProperty('opacity','1','important');
    if (cs.filter && cs.filter !== 'none' && /blur\\((?!0px)/.test(cs.filter)) el.style.setProperty('filter','none','important');
  });
  document.querySelector('.hero_title-wrap')?.style.setProperty('transform','none','important');
  const ml = document.querySelector('.main_loop.is-specialties');
  if (ml) ml.style.setProperty('transform','translateX(0)','important');
  // remove the template vendor's promo widget
  document.querySelectorAll('.new-base--t-temlis-component').forEach(e => e.remove());
  const st = document.createElement('style');
  st.textContent = '*,*::before,*::after{transition:none !important;animation:none !important}';
  document.head.appendChild(st);
  await Promise.all([...document.images].map(i => i.decode().catch(()=>{})));
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  return document.documentElement.scrollHeight;
})()`;

// Settle script for the CLONE (uses the hook main.js exposes).
const SETTLE_CLONE = `(async () => {
  window.__settleForQA && window.__settleForQA();
  document.querySelectorAll('img').forEach(i => { i.loading = 'eager'; });
  await Promise.all([...document.images].map(i => i.decode().catch(()=>{})));
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  return document.documentElement.scrollHeight;
})()`;

async function capture(page, url, settle, w, h) {
  await page.setViewport(w, h, 1, w < 768);
  await page.goto(url, { waitMs: 3500 });
  await page.scrollThrough(Math.round(h * 0.8), 220);
  const sh = await page.eval(settle);
  await sleep(1400);
  const png = await page.screenshot({ fullPage: true });
  return { png, scrollHeight: sh };
}

// Masks: regions that cannot pixel-match by construction, as fractions of width
// and absolute y ranges resolved per-viewport at runtime by selector.
const MASK_SELECTORS = ['.section_specialties'];

const DIFF = (aB64, bB64, masks) => `(async () => {
  const load = (b64) => new Promise((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej;
    i.src = 'data:image/png;base64,' + b64;
  });
  const A = await load(${JSON.stringify(aB64)});
  const B = await load(${JSON.stringify(bB64)});
  const W = Math.min(A.width, B.width), H = Math.min(A.height, B.height);
  const mk = (img) => { const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0); return x.getImageData(0,0,W,H).data; };
  const a = mk(A), b = mk(B);
  const masks = ${JSON.stringify(masks)};
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const octx = out.getContext('2d'); const od = octx.createImageData(W, H);
  const THRESH = 0.12;           // ~ pixelmatch default threshold
  let diff = 0, counted = 0;
  const y2i = (x, y) => (y * W + x) * 4;
  const masked = (x, y) => masks.some(m => y >= m.y && y < m.y + m.h && x >= m.x && x < m.x + m.w);
  const yiq = (r,g,bl) => 0.29889531*r + 0.58662247*g + 0.11448223*bl;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y2i(x, y);
      const o = i;
      if (masked(x, y)) { od.data[o]=60; od.data[o+1]=60; od.data[o+2]=90; od.data[o+3]=255; continue; }
      counted++;
      const dy = Math.abs(yiq(a[i],a[i+1],a[i+2]) - yiq(b[i],b[i+1],b[i+2])) / 255;
      const da = Math.abs(a[i+3] - b[i+3]) / 255;
      const d = Math.max(dy, da);
      if (d > THRESH) { diff++; od.data[o]=255; od.data[o+1]=40; od.data[o+2]=40; od.data[o+3]=255; }
      else { const v = 255 - (255 - a[i]) * 0.12; od.data[o]=v; od.data[o+1]=v; od.data[o+2]=v; od.data[o+3]=255; }
    }
  }
  octx.putImageData(od, 0, 0);
  return JSON.stringify({ W, H, diff, counted, ratio: diff / counted,
    aH: A.height, bH: B.height, png: out.toDataURL('image/png').slice(22) });
})()`;

const b = await launch();
const results = [];

for (const [w, h] of VIEWPORTS) {
  console.log(`\n===== ${w}px =====`);
  const p1 = await b.newPage(); await p1.init();
  const o = await capture(p1, ORIG, SETTLE_ORIG, w, h);
  const masks = JSON.parse(await p1.eval(`JSON.stringify(${JSON.stringify(MASK_SELECTORS)}.flatMap(s => [...document.querySelectorAll(s)].map(e => { const r = e.getBoundingClientRect(); return { x: Math.max(0,Math.round(r.x)-4), y: Math.max(0,Math.round(r.y + scrollY)-4), w: Math.round(r.width)+8, h: Math.round(r.height)+8 }; })))`));
  await p1.close();

  const p2 = await b.newPage(); await p2.init();
  const c = await capture(p2, CLONE, SETTLE_CLONE, w, h);
  await p2.close();

  writeFileSync(join(OUT, 'qa', `orig-${w}.png`), o.png);
  writeFileSync(join(OUT, 'qa', `clone-${w}.png`), c.png);
  console.log(`orig height ${o.scrollHeight}  clone height ${c.scrollHeight}  delta ${c.scrollHeight - o.scrollHeight}`);

  const dp = await b.newPage(); await dp.init();
  await dp.setViewport(400, 400, 1);
  await dp.goto('about:blank', { waitMs: 200 });
  const raw = await dp.eval(DIFF(o.png.toString('base64'), c.png.toString('base64'), masks));
  const r = JSON.parse(raw);
  writeFileSync(join(OUT, 'qa', `diff-${w}.png`), Buffer.from(r.png, 'base64'));
  await dp.close();

  const rec = { viewport: w, origH: o.scrollHeight, cloneH: c.scrollHeight,
    heightDelta: c.scrollHeight - o.scrollHeight,
    comparedPx: r.counted, diffPx: r.diff, diffRatio: +(r.ratio * 100).toFixed(3),
    imgH: { orig: r.aH, clone: r.bH }, masks };
  results.push(rec);
  console.log(`diff ${r.diff}/${r.counted} = ${(r.ratio*100).toFixed(3)}%  (masked ${masks.length} region(s))`);
}

writeFileSync(join(OUT, 'qa', 'results.json'), JSON.stringify(results, null, 2));
await b.close();
console.log('\n' + JSON.stringify(results.map(r => ({ vp: r.viewport, pct: r.diffRatio, dH: r.heightDelta })), null, 1));
