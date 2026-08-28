import { launch, sleep } from './cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT='C:/Users/prakash.c/cs-assessment/output/genovas-template.webflow.io/remix/shots';
mkdirSync(OUT,{recursive:true});
const slug=process.argv[2]||'vitruvian';
const b=await launch();
for (const [w,h] of [[1440,900],[390,844]]) {
  const p=await b.newPage(); await p.init();
  await p.setViewport(w,h,1,w<768);
  await p.goto(`http://127.0.0.1:5178/?rx=${slug}&panel=0`,{waitMs:3500});
  await p.eval('window.__settleForQA && window.__settleForQA()');
  await sleep(1000);
  const geo=JSON.parse(await p.eval(`JSON.stringify((()=>{
    const s=document.querySelector('.section_hero'), box=document.querySelector('.container-box.is-hero-visual');
    const c=document.querySelector('.hero_content'), t=document.querySelector('.hero_title.is-home-two');
    const cta=document.querySelector('.hero-cta');
    const r=e=>e?{w:Math.round(e.getBoundingClientRect().width),h:Math.round(e.getBoundingClientRect().height),y:Math.round(e.getBoundingClientRect().y)}:null;
    return {hero:r(s),box:r(box),content:r(c),title:r(t),cta:r(cta),
      titlePx:t?getComputedStyle(t).fontSize:null,
      contentFlow:c?getComputedStyle(c).flexFlow:null,
      contentPos:c?getComputedStyle(c).position:null,
      overflowX: document.documentElement.scrollWidth>document.documentElement.clientWidth};
  })())`));
  console.log(w+':', JSON.stringify(geo));
  writeFileSync(`${OUT}/hero-${slug}-${w}.png`, await p.screenshot({fullPage:false}));
  await p.close();
}
await b.close();
