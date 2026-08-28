import { launch, sleep } from './cdp.mjs';
import { writeFileSync } from 'node:fs';
const OUT='C:/Users/prakash.c/cs-assessment/output/genovas-template.webflow.io/remix/shots';
const SETS=[
 ['A-default', {}],
 ['B-editorial', {'--rx-font-display':'"Playfair Display", Georgia, serif','--rx-font-body':'"Work Sans", system-ui, sans-serif','--rx-font-brand':'"Playfair Display", Georgia, serif'}],
 ['C-technical', {'--rx-font-display':'"Space Grotesk", system-ui, sans-serif','--rx-font-body':'"IBM Plex Mono", ui-monospace, monospace','--rx-font-brand':'"Space Grotesk", system-ui, sans-serif'}],
];
const b=await launch();
for (const [name,vars] of SETS){
  const p=await b.newPage(); await p.init(); await p.setViewport(1440,900,1);
  await p.goto('http://127.0.0.1:5178/?rx=vitruvian',{waitMs:4500});
  await sleep(2000);
  if (Object.keys(vars).length){
    await p.eval(`(async()=>{
      const panel=document.getElementById('rx-panel');
      const sels=[...panel.querySelectorAll('select')];
      for (const [k,v] of Object.entries(${JSON.stringify(vars)})){
        const s=sels.find(s=>s.closest('label')&&s.closest('label').textContent.indexOf(k)>=0);
        if(!s) continue;
        const o=[...s.options].find(o=>o.value===v)||[...s.options].find(o=>o.value.indexOf(v.split(',')[0].replace(/"/g,''))>=0);
        if(!o) continue;
        s.value=o.value; s.dispatchEvent(new Event('change',{bubbles:true}));
      }
      await new Promise(r=>setTimeout(r,2500));
      try{ await document.fonts.ready; }catch(e){}
    })()`);
  }
  await sleep(1200);
  await p.eval(`document.getElementById('rx-panel').hidden = true`);
  await p.eval('window.scrollTo(0,0)'); await sleep(400);
  writeFileSync(`${OUT}/font-${name}.png`, await p.screenshot({fullPage:false}));
  console.log(name, 'captured');
  await p.close();
}
await b.close();
