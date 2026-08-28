import { launch, sleep } from './cdp.mjs';
const b = await launch();
const p = await b.newPage(); await p.init();
await p.setViewport(1440, 900, 1);
await p.goto('http://127.0.0.1:5178/', { waitMs: 2500 });

const ok = (label, cond, detail = '') => console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? '   ' + detail : ''}`);

// --- console health
console.log('console errors:', p.pageErrors.length, JSON.stringify(p.pageErrors.slice(0, 5)));
console.log('failed requests:', JSON.stringify(p.requests.filter(r => r.status >= 400).map(r => r.status + ' ' + r.url)));

// --- 1. load choreography actually ran
const loaded = await p.eval(`document.documentElement.hasAttribute('data-loaded')`);
ok('page-load choreography fired', loaded);
await sleep(2600);
const heroSettled = await p.eval(`JSON.stringify((()=>{const s=document.querySelector(".hero_title .one");const c=getComputedStyle(s);const row=document.querySelector(".hero_content");const second=document.querySelector(".hero_title.is-home-two.is-second");const box=document.querySelector(".container-box.is-hero-visual");return {op:c.opacity,fil:c.filter,tr:c.transform,row:row?getComputedStyle(row).opacity:null,second:second?getComputedStyle(second).opacity:null,box:box?getComputedStyle(box).opacity:null};})())`);
const hs = JSON.parse(heroSettled);
ok('hero letters resolved', hs.op === '1' && (hs.fil === 'none' || hs.fil === 'blur(0px)') && hs.row === '1' && hs.second === '1' && hs.box === '1', JSON.stringify(hs));

// --- 2. marquee is animating (time-driven)
const m1 = await p.eval(`getComputedStyle(document.querySelector('.main_loop.is-specialties')).transform`);
await sleep(2000);
const m2 = await p.eval(`getComputedStyle(document.querySelector('.main_loop.is-specialties')).transform`);
ok('marquee animates on its own', m1 !== m2, `${m1} -> ${m2}`);

// --- 3. scroll reveals fire
await p.eval(`window.scrollTo(0, 2000)`); await sleep(1800);
const rev = await p.eval(`JSON.stringify((()=>{const els=[...document.querySelectorAll('.section_stats [data-reveal]')];return {total:els.length,in:els.filter(e=>e.classList.contains('is-in')).length,op:getComputedStyle(els[0]).opacity};})())`);
const rv = JSON.parse(rev);
ok('scroll reveals fire', rv.in === rv.total && rv.op === '1', rev);

// --- 4. nav dropdown opens
await p.eval(`window.scrollTo(0,0)`); await sleep(600);
const ddBefore = await p.eval(`getComputedStyle(document.querySelector('.nav_link-dropdown')).display`);
await p.eval(`document.querySelector('.nav_links.is-dropdown').click()`);
await sleep(800);
const ddAfter = await p.eval(`JSON.stringify({display:getComputedStyle(document.querySelector('.nav_link-dropdown')).display,h:document.querySelector('.nav_dropdown-wrap').getBoundingClientRect().height,aria:document.querySelector('.nav_links.is-dropdown').getAttribute('aria-expanded'),caret:getComputedStyle(document.querySelector('.nav_link-icon')).transform})`);
const dd = JSON.parse(ddAfter);
ok('nav dropdown opens', ddBefore === 'none' && dd.display !== 'none' && dd.h > 50, ddAfter);

// --- 5. button hover swap
const bh = await p.eval(`JSON.stringify((()=>{const btn=document.querySelector('.hero-cta .button');const t1=btn.querySelector('.button-text.is-firts');const before=getComputedStyle(t1).transform;return {before};})())`);
await p.eval(`(()=>{const btn=document.querySelector('.hero-cta .button');btn.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));const s=document.createElement('style');s.id='hv';s.textContent='.hero-cta .button .button-text.is-firts{transform:translateY(-150%)}';document.head.appendChild(s);})()`);
await sleep(500);
const after = await p.eval(`getComputedStyle(document.querySelector('.hero-cta .button .button-text.is-firts')).transform`);
ok('button text-swap wired (CSS :hover rule present)',
  await p.eval(`[...document.styleSheets].some(sh=>{try{return [...sh.cssRules].some(r=>r.selectorText&&r.selectorText.includes('.button:hover .button-text.is-firts'))}catch(e){return false}})`));

// --- 6. mobile menu
await p.setViewport(390, 844, 1, true);
await p.goto('http://127.0.0.1:5178/', { waitMs: 2000 });
const mBefore = await p.eval(`getComputedStyle(document.querySelector('.nav_mobile')).display`);
await p.eval(`document.querySelector('.menu-button').click()`); await sleep(700);
const mAfter = await p.eval(`JSON.stringify({d:getComputedStyle(document.querySelector('.nav_mobile')).display,bar1:getComputedStyle(document.querySelector('.nav-button_line.is-first')).transform,aria:document.querySelector('.menu-button').getAttribute('aria-expanded')})`);
const mm = JSON.parse(mAfter);
ok('mobile menu opens + hamburger morphs', mBefore === 'none' && mm.d !== 'none' && mm.aria === 'true', mAfter);

// --- 7. reduced motion degrades to end state
const p2 = await b.newPage(); await p2.init();
await p2.cmd('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await p2.setViewport(1440, 900, 1);
await p2.goto('http://127.0.0.1:5178/', { waitMs: 2000 });
const rm = await p2.eval(`JSON.stringify((()=>{const s=document.querySelector('.hero_title .seven');const c=getComputedStyle(s);return {op:c.opacity,tr:c.transform,fil:c.filter,marquee:getComputedStyle(document.querySelector('.main_loop.is-specialties')).animationName};})())`);
const r = JSON.parse(rm);
ok('reduced-motion lands at end state', r.op === '1' && r.tr === 'none' && r.marquee === 'none', rm);

await b.close();
