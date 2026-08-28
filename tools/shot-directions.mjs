import { launch, sleep } from './cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = 'C:/Users/prakash.c/cs-assessment/output/genovas-template.webflow.io/remix/shots';
mkdirSync(OUT, { recursive: true });
const SLUGS = ['house-calm', 'vitruvian', 'greenhouse'];

const b = await launch();
const report = [];

for (const slug of SLUGS) {
  const p = await b.newPage();
  await p.init();
  await p.setViewport(1440, 900, 1);
  await p.goto(`http://127.0.0.1:5178/?rx=${slug}`, { waitMs: 3500 });
  await p.scrollThrough(700, 200);
  await p.eval('window.__settleForQA && window.__settleForQA()');
  await p.eval('(async()=>{await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));})()');
  await sleep(1400);

  // prove the direction actually took, by reading resolved values off the page
  const applied = JSON.parse(await p.eval(`JSON.stringify((()=>{
    const cs = getComputedStyle(document.documentElement);
    const body = getComputedStyle(document.body);
    const h1 = document.querySelector('.hero_title');
    const card = document.querySelector('.expertise_card');
    const box = document.querySelector('.container-box');
    return {
      rx: document.documentElement.dataset.rx,
      ground: body.backgroundColor,
      accent: cs.getPropertyValue('--rx-accent').trim(),
      displayFont: h1 ? getComputedStyle(h1).fontFamily.split(',')[0] : null,
      heroSize: h1 ? getComputedStyle(h1).fontSize : null,
      cardBg: card ? getComputedStyle(card).backgroundColor : null,
      boxRadius: box ? getComputedStyle(box).borderTopLeftRadius : null,
      boxBorder: box ? getComputedStyle(box).borderTopWidth : null,
      revealDur: cs.getPropertyValue('--rx-reveal-dur').trim(),
      rootPx: cs.fontSize,
      scrollH: document.documentElement.scrollHeight
    };
  })())`));
  applied.slug = slug;
  applied.errors = p.pageErrors.length;
  report.push(applied);
  console.log(JSON.stringify(applied));

  const png = await p.screenshot({ fullPage: true });
  writeFileSync(`${OUT}/dir-${slug}.png`, png);
  await p.close();
}

writeFileSync(`${OUT}/../directions-applied.json`, JSON.stringify(report, null, 2));
await b.close();

// fail loudly if two directions resolved identically — that would mean a
// direction did not take, which a screenshot alone would not reveal
const key = (r) => [r.ground, r.accent, r.displayFont, r.cardBg, r.boxRadius].join('|');
const seen = new Map();
for (const r of report) {
  if (seen.has(key(r))) console.log(`\n!! ${r.slug} resolved identically to ${seen.get(key(r))}`);
  seen.set(key(r), r.slug);
}
console.log(`\ndistinct renders: ${seen.size}/${report.length}`);
