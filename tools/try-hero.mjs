/* Preview a candidate hero photograph in place and measure what matters:
   the wordmark sits ON this image, so the only question that decides it is
   whether the type still reads. Measures against RENDERED PIXELS — the
   brightest pixel under the type — not against declared colours. */
import { launch, sleep } from './cdp.mjs';
import fs from 'node:fs';
import path from 'node:path';

const NAME = process.argv[2];
const ROOT = path.resolve(import.meta.dirname, '..');
const IMG  = path.join(ROOT, 'site/assets/img');
const SRC  = path.join(ROOT, 'hero-options/build', NAME);

import crypto from 'node:crypto';
const md5 = (f) => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex').slice(0, 8);
for (const f of ['hero.jpg', 'hero-1200.jpg', 'hero-800.jpg']) {
  const from = path.join(SRC, f), to = path.join(IMG, f);
  fs.copyFileSync(from, to);
  if (md5(from) !== md5(to)) { console.log(`FAIL: ${f} did not install`); process.exit(1); }
}
console.log(`${NAME}: installed ${['hero.jpg','hero-800.jpg'].map((f) => f + ' ' + md5(path.join(IMG, f))).join(', ')}`);

const lum = (r, g, b) => {
  const s = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
};
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const b = await launch();
const p = await b.newPage();
await p.init();

for (const [w, h, tag] of [[1440, 900, 'desktop'], [390, 844, 'mobile']]) {
  await p.setViewport(w, h, 1);
  await p.goto('http://127.0.0.1:5178/?rx=vitruvian&panel=0', { waitMs: 4000 });
  await sleep(2200);

  // box of the wordmark, and the ink colour it is painted in
  const meta = JSON.parse(await p.eval(`JSON.stringify((() => {
    const el = document.querySelector('.hero_title.is-home-two');
    if (!el) return { missing: true };
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, color: getComputedStyle(el).color };
  })())`));
  if (meta.missing) { console.log(`${NAME} ${tag}: wordmark not found`); continue; }

  // hide the type, capture, and read the brightest pixel it would sit on
  await p.eval(`(() => {
    const el = document.querySelector('.hero_title.is-home-two');
    el.dataset.rxHidden = '1'; el.style.visibility = 'hidden';
  })()`);
  await sleep(300);
  const shot = await p.screenshot({ fullPage: false });
  fs.writeFileSync(path.join(ROOT, `hero-options/probe-${NAME}-${tag}.png`), shot);

  const worst = JSON.parse(await p.eval(`(async () => {
    const img = new Image();
    img.src = ${JSON.stringify('data:image/png;base64,' + shot.toString('base64'))};
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    const sx = ${meta.x}, sy = ${meta.y}, sw = ${meta.w}, sh = ${meta.h};
    const d = c.getContext('2d').getImageData(
      Math.max(0, Math.round(sx)), Math.max(0, Math.round(sy)),
      Math.max(1, Math.round(sw)), Math.max(1, Math.round(sh))).data;
    let best = null, bestL = -1;
    for (let i = 0; i < d.length; i += 4) {
      const L = 0.2126 * d[i] + 0.7152 * d[i+1] + 0.0722 * d[i+2];
      if (L > bestL) { bestL = L; best = [d[i], d[i+1], d[i+2]]; }
    }
    return JSON.stringify({ px: best });
  })()`));

  await p.eval(`(() => { const el = document.querySelector('[data-rx-hidden]'); if (el) el.style.visibility = ''; })()`);

  const m = meta.color.match(/[\d.]+/g).map(Number);
  const r = ratio(lum(...worst.px), lum(m[0], m[1], m[2]));
  const verdict = r >= 4.5 ? 'PASS' : r >= 3 ? 'large-text only' : 'FAIL';
  console.log(`${NAME} ${tag.padEnd(8)} wordmark ${meta.color} on brightest rgb(${worst.px.join(',')})  =  ${r.toFixed(2)}:1  ${verdict}`);
}

// full-page hero shot for looking at
await p.setViewport(1440, 900, 1);
await p.goto('http://127.0.0.1:5178/?rx=vitruvian&panel=0', { waitMs: 4000 });
await sleep(2200);
fs.writeFileSync(path.join(ROOT, `hero-options/hero-${NAME}.png`), await p.screenshot({ fullPage: false }));
console.log(`  console errors: ${p.pageErrors.length}`);
await b.close();
