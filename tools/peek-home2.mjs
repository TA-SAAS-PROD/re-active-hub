import { launch, sleep } from './cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT='C:/Users/prakash.c/cs-assessment/output/genovas-template.webflow.io/remix/ref';
mkdirSync(OUT,{recursive:true});
const PREP = `(async () => {
  document.querySelectorAll('.new-base--t-temlis-component').forEach(function(e){ e.remove(); });
  document.querySelectorAll('img').forEach(function(i){
    i.loading = 'eager';
    var s = i.getAttribute('srcset'); if (s) i.setAttribute('srcset', s);
    var c = i.getAttribute('src');    if (c) i.setAttribute('src', c);
  });
  document.querySelectorAll('[data-w-id]').forEach(function(el){
    var cs = getComputedStyle(el);
    if (parseFloat(cs.opacity) < 0.99) el.style.setProperty('opacity','1','important');
    if (cs.filter && cs.filter.indexOf('blur(0px)') === -1 && cs.filter.indexOf('blur') !== -1) el.style.setProperty('filter','none','important');
    if (cs.transform && cs.transform !== 'none') el.style.setProperty('transform','none','important');
  });
  var st = document.createElement('style');
  st.textContent = '*,*::before,*::after{transition:none !important;animation:none !important}';
  document.head.appendChild(st);
  await Promise.all([].slice.call(document.images).map(function(i){ return i.decode().catch(function(){}); }));
  return document.images.length;
})()`;
const b = await launch(); const p = await b.newPage(); await p.init();
await p.setViewport(1440, 900, 1);
await p.goto('https://genovas-template.webflow.io/home/home-2', { waitMs: 5000 });
await p.scrollThrough(700, 200);
console.log('images:', await p.eval(PREP));
await p.eval('window.scrollTo(0,0)');
await sleep(1600);
writeFileSync(OUT + '/home-2-hero.png', await p.screenshot({ fullPage: false }));
console.log(await p.eval(`JSON.stringify([].slice.call(document.querySelectorAll('section')).slice(0,3).map(function(e){return {cls:e.className,h:Math.round(e.getBoundingClientRect().height)};}))`));
await b.close();
