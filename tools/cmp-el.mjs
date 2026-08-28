import { launch, sleep } from './cdp.mjs';
const b = await launch();
const width = Number(process.argv[2] || 768);

const SELS = [
  '.cta_img', '.cta_img-wrap', '.cases_img',
  '.footer_content', '.footer_top', '.footer_logo-wrap', '.footer_logo-wrap > div', '.footer_logo-wrap > a', '.footer_img',
  '.footer_group', '.footer_column', '.footer-link', '.text_footer', '.text-wrap.is-footer',
  '.author_content', '.author_img', '.author_name', '.author_name > *',
  '.testimonials_card', '.testimonials_content',
];

const P = `JSON.stringify(${JSON.stringify(SELS)}.map(s => {
  const e = document.querySelector(s);
  if (!e) return { s, missing: true };
  const r = e.getBoundingClientRect(); const c = getComputedStyle(e);
  return { s, y: Math.round(r.y + scrollY), x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height),
    fs: c.fontSize, lh: c.lineHeight, fw: c.fontWeight, transform: c.transform, pad: c.padding,
    gap: c.gap, d: c.display, ff: c.flexFlow, gtc: c.gridTemplateColumns, ls: c.letterSpacing,
    txt: (e.textContent||'').trim().slice(0,30) };
}))`;

async function grab(url, settle) {
  const p = await b.newPage(); await p.init();
  await p.setViewport(width, width < 500 ? 844 : 1024, 1, width < 768);
  await p.goto(url, { waitMs: 3200 });
  await p.scrollThrough(600, 180);
  if (settle) await p.eval(settle);
  await sleep(700);
  const r = JSON.parse(await p.eval(P)); await p.close(); return r;
}

const o = await grab('https://genovas-template.webflow.io/home/home-3',
  `document.querySelectorAll('.new-base--t-temlis-component').forEach(e=>e.remove())`);
const c = await grab('http://127.0.0.1:5178/', `window.__settleForQA&&window.__settleForQA()`);
await b.close();

for (let i = 0; i < o.length; i++) {
  const a = o[i], d = c[i];
  if (a.missing || d.missing) { console.log(`${a.s}  ${a.missing?'MISSING orig ':''}${d.missing?'MISSING clone':''}`); continue; }
  const diffs = [];
  for (const k of ['y','x','w','h']) if (Math.abs(a[k]-d[k]) > 1) diffs.push(`${k}: ${a[k]} -> ${d[k]}`);
  for (const k of ['fs','lh','fw','transform','pad','gap','d','ff','gtc','ls']) if (a[k] !== d[k]) diffs.push(`${k}: "${a[k]}" -> "${d[k]}"`);
  if (diffs.length) console.log(`\n${a.s}  "${a.txt}"\n   ` + diffs.join('\n   '));
}
console.log('\n(no output above a selector = pixel match)');
