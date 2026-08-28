import { launch, sleep } from './cdp.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const URL = process.argv[2];
const OUT = process.argv[3];
const BUNDLE = readFileSync('C:/Users/prakash.c/.claude/skills/clone-site/scripts/probes.bundle.js', 'utf8');

mkdirSync(OUT, { recursive: true });
mkdirSync(join(OUT, 'shots'), { recursive: true });

const w = (name, data) =>
  writeFileSync(join(OUT, name), typeof data === 'string' ? data : JSON.stringify(data, null, 2));

const b = await launch();
const page = await b.newPage();
await page.init();

// Preload: instrument BEFORE any page script runs.
await page.addInitScript(BUNDLE + '\ntry{instrumentGetContext();}catch(e){}\ntry{instrumentMotion();}catch(e){}');

await page.setViewport(1440, 900, 1);
await page.goto(URL, { waitMs: 5000 });

// Settle: scroll top -> bottom so lazy canvases / IO-driven sections initialize.
await page.scrollThrough(700, 300);
await sleep(1500);

console.log('--- probing 1440 ---');
const surfaces = await page.eval('JSON.stringify(surfaceMap())');
w('surface-map.json', JSON.parse(surfaces));

const motion = await page.eval('JSON.stringify(motionProbe())');
w('motion.json', JSON.parse(motion));

const msum = await page.eval('JSON.stringify(motionSummary())');
w('motion-summary.json', JSON.parse(msum));
console.log(msum.slice(0, 3000));

const t1440 = await page.eval('JSON.stringify(tokensProbe())');
w('tokens-1440.json', JSON.parse(t1440));

// Network / asset inventory
w('network.json', page.requests);
w('console.json', { logs: page.consoleLogs.slice(-200), errors: page.pageErrors });

// Full-page screenshots at each breakpoint (per skill memory: un-defer lazy imgs, kill transitions)
const PREP = `(async () => {
  document.querySelectorAll('img').forEach(img => {
    img.loading = 'eager';
    if (img.dataset.src) img.src = img.dataset.src;
    if (img.dataset.srcset) img.srcset = img.dataset.srcset;
    const s = img.getAttribute('srcset'); if (s) img.setAttribute('srcset', s);
    const c = img.getAttribute('src'); if (c) img.setAttribute('src', c);
  });
  const st = document.createElement('style');
  st.id='__qa_freeze__';
  st.textContent = '*,*::before,*::after{transition:none !important;animation-play-state:paused !important;}';
  document.head.appendChild(st);
  // force Webflow IX2 reveal state
  document.querySelectorAll('[data-w-id],[data-reveal],.w-condition-invisible').forEach(el => {
    const cs = getComputedStyle(el);
    if (parseFloat(cs.opacity) < 0.98) el.style.setProperty('opacity','1','important');
    if (cs.transform && cs.transform !== 'none') el.style.setProperty('transform','none','important');
  });
  await Promise.all([...document.images].map(i => i.decode().catch(()=>{})));
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  return document.images.length;
})()`;

for (const [wid, hei] of [[1440, 900], [768, 1024], [390, 844]]) {
  await page.setViewport(wid, hei, 1, wid < 768);
  await sleep(900);
  await page.scrollThrough(Math.round(hei * 0.8), 200);
  const tk = await page.eval('JSON.stringify(tokensProbe())');
  w(`tokens-${wid}.json`, JSON.parse(tk));
  const n = await page.eval(PREP);
  await sleep(1200);
  const png = await page.screenshot({ fullPage: true });
  writeFileSync(join(OUT, 'shots', `orig-${wid}.png`), png);
  console.log(`shot ${wid}: ${png.length} bytes, ${n} images`);
}

// Post-hydration DOM (the fidelity fast path needs this)
await page.setViewport(1440, 900, 1);
await page.goto(URL, { waitMs: 6000 });
await page.scrollThrough(700, 250);
await sleep(1200);
const html = await page.eval('document.documentElement.outerHTML');
w('rendered-1440.html', '<!DOCTYPE html>\n' + html);

await b.close();
console.log('DONE');
