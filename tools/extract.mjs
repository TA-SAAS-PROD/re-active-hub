import { launch, sleep } from './cdp.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const URL = process.argv[2];
const OUT = process.argv[3];
mkdirSync(join(OUT, 'extract'), { recursive: true });
const w = (n, d) => writeFileSync(join(OUT, 'extract', n), typeof d === 'string' ? d : JSON.stringify(d, null, 2));

const b = await launch();
const page = await b.newPage();
await page.init();
await page.setViewport(1440, 900, 1);
await page.goto(URL, { waitMs: 5000 });
await page.scrollThrough(700, 250);
await sleep(1500);

// ---- 1. Webflow IX2 interaction data (the real animation params) ----
const ix = await page.eval(`(() => {
  try {
    const ix2 = window.Webflow && window.Webflow.require && window.Webflow.require('ix2');
    if (!ix2 || !ix2.store) return JSON.stringify({error:'no ix2 store'});
    const st = ix2.store.getState();
    return JSON.stringify({ ixData: st.ixData, sessionKeys: Object.keys(st) });
  } catch (e) { return JSON.stringify({ error: String(e) }); }
})()`);
w('ix2.json', ix);
console.log('ix2 bytes:', ix.length);

// ---- 2. Per-section structural + computed-style extraction ----
const EXTRACT = `(() => {
  const PROPS = ['display','position','top','right','bottom','left','zIndex','width','height','minHeight','maxWidth',
    'margin','padding','flexDirection','flexWrap','justifyContent','alignItems','gap','rowGap','columnGap',
    'gridTemplateColumns','gridTemplateRows','gridColumn','gridRow','gridAutoFlow',
    'fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','textTransform','textAlign','color','textDecorationLine',
    'backgroundColor','backgroundImage','backgroundSize','backgroundPosition','backgroundRepeat',
    'borderRadius','borderTopLeftRadius','borderWidth','borderStyle','borderColor',
    'boxShadow','opacity','transform','overflow','objectFit','aspectRatio','whiteSpace','mixBlendMode','filter','transition','animation'];
  const DEFAULTS = {display:'block',position:'static',top:'auto',right:'auto',bottom:'auto',left:'auto',zIndex:'auto',
    minHeight:'0px',maxWidth:'none',margin:'0px',padding:'0px',flexDirection:'row',flexWrap:'nowrap',
    justifyContent:'normal',alignItems:'normal',gap:'normal',rowGap:'normal',columnGap:'normal',
    gridTemplateColumns:'none',gridTemplateRows:'none',gridColumn:'auto',gridRow:'auto',gridAutoFlow:'row',
    textTransform:'none',textAlign:'start',textDecorationLine:'none',
    backgroundColor:'rgba(0, 0, 0, 0)',backgroundImage:'none',backgroundSize:'auto',backgroundPosition:'0% 0%',backgroundRepeat:'repeat',
    borderRadius:'0px',borderTopLeftRadius:'0px',borderWidth:'0px',borderStyle:'none',
    boxShadow:'none',opacity:'1',transform:'none',overflow:'visible',objectFit:'fill',aspectRatio:'auto',
    whiteSpace:'normal',mixBlendMode:'normal',filter:'none',transition:'all 0s ease 0s',animation:'none 0s ease 0s 1 normal none running'};

  function sig(el) {
    const cs = getComputedStyle(el);
    const o = {};
    for (const p of PROPS) {
      const v = cs[p];
      if (v == null || v === '') continue;
      if (DEFAULTS[p] !== undefined && v === DEFAULTS[p]) continue;
      o[p] = v;
    }
    return o;
  }
  function label(el) {
    const cls = (el.getAttribute('class')||'').trim().split(/\\s+/).filter(Boolean).filter(c=>!/^w-(mod|dyn)/.test(c));
    return el.tagName.toLowerCase() + (el.id?'#'+el.id:'') + (cls.length?'.'+cls.join('.'):'');
  }
  function walk(el, depth, maxDepth) {
    const r = el.getBoundingClientRect();
    const node = {
      tag: el.tagName.toLowerCase(),
      cls: el.getAttribute('class') || undefined,
      id: el.id || undefined,
      label: label(el),
      rect: { x: Math.round(r.x), y: Math.round(r.y + window.scrollY), w: Math.round(r.width), h: Math.round(r.height) },
      css: sig(el),
    };
    const wid = el.getAttribute('data-w-id'); if (wid) node.wId = wid;
    if (el.tagName === 'IMG') { node.src = el.currentSrc || el.src; node.srcset = el.getAttribute('srcset')||undefined; node.alt = el.alt; node.sizes = el.getAttribute('sizes')||undefined; node.natural = el.naturalWidth+'x'+el.naturalHeight; }
    if (el.tagName === 'A') { node.href = el.getAttribute('href'); }
    if (el.tagName === 'SVG' || el.tagName === 'svg') { node.svg = el.outerHTML.slice(0, 4000); return node; }
    const inline = el.getAttribute('style'); if (inline) node.inlineStyle = inline;
    const kids = [...el.children];
    const ownText = [...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).filter(Boolean).join(' ');
    if (ownText) node.text = ownText;
    if (depth < maxDepth && kids.length) node.children = kids.map(k => walk(k, depth+1, maxDepth));
    else if (kids.length) node.truncated = kids.length + ' children';
    return node;
  }
  const out = {};
  const roots = [...document.querySelectorAll('body > .page-wrapper > *, body > header, body > section, body > footer, body > div.navbar_component, body > div[class*=navbar]')];
  const secs = [...document.querySelectorAll('section, footer, [class*=navbar_component], nav')].filter(e => {
    const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0;
  });
  const seen = new Set();
  const list = [];
  for (const s of secs) { if ([...seen].some(p=>p.contains(s))) continue; seen.add(s); list.push(s); }
  list.forEach((s, i) => { out[String(i).padStart(2,'0') + '_' + label(s).replace(/[^\\w.-]/g,'_').slice(0,60)] = walk(s, 0, 7); });
  return JSON.stringify(out);
})()`;

const tree = await page.eval(EXTRACT);
w('sections-1440.json', tree);
console.log('sections-1440 bytes:', tree.length);
const parsed = JSON.parse(tree);
console.log('SECTIONS:', Object.keys(parsed).join('\n  '));

// ---- 3. Asset inventory ----
const assets = await page.eval(`JSON.stringify((() => {
  const out = new Set();
  document.querySelectorAll('img').forEach(i => { if (i.currentSrc) out.add(i.currentSrc); if (i.src) out.add(i.src);
    (i.getAttribute('srcset')||'').split(',').forEach(s => { const u = s.trim().split(/\\s+/)[0]; if (u) out.add(new URL(u, location.href).href); }); });
  document.querySelectorAll('*').forEach(e => {
    const bi = getComputedStyle(e).backgroundImage;
    if (bi && bi !== 'none') [...bi.matchAll(/url\\((\\"|')?(.*?)\\1?\\)/g)].forEach(m => { try { out.add(new URL(m[2], location.href).href); } catch(_){} });
  });
  document.querySelectorAll('link[rel*=icon]').forEach(l => out.add(l.href));
  return [...out].filter(u => /^https?:/.test(u));
})())`);
w('assets.json', JSON.parse(assets));
console.log('assets:', JSON.parse(assets).length);

// ---- 4. Stylesheet inventory ----
const sheets = await page.eval(`JSON.stringify([...document.querySelectorAll('link[rel=stylesheet]')].map(l=>l.href))`);
w('stylesheets.json', JSON.parse(sheets));
console.log(sheets);

// ---- 5. Hover-state sweep on interactive elements ----
const hover = await page.eval(`JSON.stringify((() => {
  const sels = ['a.button','a.nav_links','a.expertise_card','a.new-base--t-button','.differentiators_card','.cases_card','.footer-link','.icon-box'];
  const out = [];
  for (const s of sels) {
    const el = document.querySelector(s); if (!el) continue;
    const cs = getComputedStyle(el);
    out.push({ sel: s, transition: cs.transition, base: { bg: cs.backgroundColor, color: cs.color, transform: cs.transform, opacity: cs.opacity, boxShadow: cs.boxShadow, borderColor: cs.borderColor } });
  }
  // pull :hover rules from CSSOM
  const rules = [];
  for (const sh of document.styleSheets) {
    let rs; try { rs = sh.cssRules; } catch(_) { continue; }
    for (const r of rs) {
      if (r.selectorText && /:hover|:focus|:active/.test(r.selectorText)) rules.push({ sel: r.selectorText, css: r.style.cssText });
    }
  }
  return { probes: out, hoverRules: rules };
})())`);
w('hover.json', JSON.parse(hover));
console.log('hover rules:', JSON.parse(hover).hoverRules.length);

await b.close();
console.log('EXTRACT DONE');
