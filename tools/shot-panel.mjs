import { launch, sleep } from './cdp.mjs';
import { writeFileSync } from 'node:fs';
const OUT='C:/Users/prakash.c/cs-assessment/output/genovas-template.webflow.io/remix/shots';
const b=await launch(); const p=await b.newPage(); await p.init();
await p.setViewport(1600,1000,1);
await p.goto('http://127.0.0.1:5178/?rx=vitruvian',{waitMs:4000});
await p.scrollThrough(700,150);
await p.eval('window.__settleForQA && window.__settleForQA()');
await p.eval('window.scrollTo(0,0)');
// open every group so the whole knob set is visible
await p.eval(`document.querySelectorAll('#rx-panel details').forEach(d=>d.open=true)`);
await sleep(1200);
const png=await p.screenshot({fullPage:false});
writeFileSync(OUT+'/panel-open.png',png);
console.log('panel-open.png',png.length,'errors',p.pageErrors.length);
await b.close();
