import { launch, sleep } from './cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT='C:/Users/prakash.c/cs-assessment/output/genovas-template.webflow.io/remix/ref';
mkdirSync(OUT,{recursive:true});
const b=await launch();
for (const v of ['home-1','home-2']) {
  const p=await b.newPage(); await p.init();
  await p.setViewport(1440,900,1);
  await p.goto('https://genovas-template.webflow.io/home/'+v,{waitMs:5000});
  await p.eval(`document.querySelectorAll('.new-base--t-temlis-component').forEach(e=>e.remove())`);
  await sleep(1200);
  // structure of the first two sections
  const s = await p.eval(`JSON.stringify([...document.querySelectorAll('section, footer')].slice(0,3).map(e=>{
    const r=e.getBoundingClientRect();
    return { cls:e.className, h:Math.round(r.height),
      imgs:[...e.querySelectorAll('img')].length,
      h1:(e.querySelector('h1')||{}).textContent||null,
      text:(e.textContent||'').replace(/\s+/g,' ').trim().slice(0,110) };
  }))`);
  console.log('\n=== '+v+' ==='); console.log(s);
  const png=await p.screenshot({fullPage:false});
  writeFileSync(OUT+'/'+v+'-hero.png',png);
  await p.close();
}
await b.close();
