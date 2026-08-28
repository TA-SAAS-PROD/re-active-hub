import { launch, sleep } from './cdp.mjs';
const URL = 'https://genovas-template.webflow.io/home/home-3';
const b = await launch();
const p = await b.newPage();
await p.init();
await p.setViewport(1440, 900, 1);
await p.goto(URL, { waitMs: 4000 });

const read = () => p.eval(`(() => {
  const el = document.querySelector('.main_loop.is-specialties');
  return JSON.stringify({ scrollY: window.scrollY, style: el ? el.getAttribute('style') : null, m: el ? getComputedStyle(el).transform : null });
})()`);

console.log('--- time at fixed scroll (y=1000) ---');
await p.eval('window.scrollTo(0,1000)');
await sleep(800);
for (let i = 0; i < 5; i++) { console.log(await read()); await sleep(900); }

console.log('--- scroll sweep ---');
for (const y of [0, 400, 800, 1200, 1600, 2000, 2600]) {
  await p.eval(`window.scrollTo(0,${y})`);
  await sleep(900);
  console.log(await read());
}
// also check the hero floating pills + any other inline-animated elements
console.log('--- inline-styled animated elements ---');
console.log(await p.eval(`JSON.stringify([...document.querySelectorAll('[style*="translate3d"],[style*="will-change"]')].slice(0,20).map(e=>({c:e.className, s:e.getAttribute('style').slice(0,150)})),null,1)`));
await b.close();
