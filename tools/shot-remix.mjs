import { launch, sleep } from './cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT='C:/Users/prakash.c/cs-assessment/output/genovas-template.webflow.io/remix/shots';
mkdirSync(OUT,{recursive:true});
const URL = process.argv[2] || 'http://127.0.0.1:5178/';
const b=await launch(); const p=await b.newPage(); await p.init();
for (const [w,h] of [[1440,900],[390,844]]) {
  await p.setViewport(w,h,1,w<768);
  await p.goto(URL,{waitMs:3500});
  await p.scrollThrough(Math.round(h*0.8),200);
  await p.eval(`window.__settleForQA && window.__settleForQA()`);
  await p.eval(`(async()=>{await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));})()`);
  await sleep(1200);
  const png=await p.screenshot({fullPage:true});
  writeFileSync(`${OUT}/remix-${w}.png`,png);
  console.log(`remix-${w}.png  ${png.length} bytes  scrollH=${await p.eval('document.documentElement.scrollHeight')}`);
}
console.log('console errors:', JSON.stringify(p.pageErrors));
console.log('failed requests:', JSON.stringify(p.requests.filter(r=>r.status>=400).map(r=>r.status+' '+r.url)));
await b.close();
