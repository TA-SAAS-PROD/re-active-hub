import { readFileSync } from 'node:fs';
const OUT = 'C:/Users/prakash.c/cs-assessment/output/genovas-template.webflow.io';
const secs = JSON.parse(readFileSync(OUT + '/extract/sections-1440.json', 'utf8'));
const key = process.argv[2];
const maxDepth = Number(process.argv[3] || 6);
const showCss = process.argv[4] !== 'nocss';
const match = Object.keys(secs).find((k) => k.includes(key));
if (!match) { console.log('keys:', Object.keys(secs).join('\n')); process.exit(0); }
const IMPORTANT = ['display','position','top','right','bottom','left','zIndex','width','height','minHeight','maxWidth','margin','padding','flexDirection','justifyContent','alignItems','gap','gridTemplateColumns','gridTemplateRows','gridColumn','gridRow','fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','textTransform','textAlign','color','backgroundColor','backgroundImage','borderRadius','borderWidth','borderColor','boxShadow','opacity','transform','overflow','objectFit','aspectRatio','whiteSpace','filter','animation','mixBlendMode'];
function p(n, d) {
  if (d > maxDepth) return;
  const pad = '  '.repeat(d);
  const r = n.rect;
  console.log(`${pad}${n.label}  [${r.w}x${r.h} @${r.x},${r.y}]`);
  if (n.text) console.log(`${pad}  TEXT: "${n.text.slice(0, 160)}"`);
  if (n.src) console.log(`${pad}  IMG: ${n.src.split('/').pop().slice(0,80)} nat=${n.natural} alt="${n.alt||''}"`);
  if (n.href) console.log(`${pad}  HREF: ${n.href}`);
  if (n.wId) console.log(`${pad}  wId: ${n.wId}`);
  if (n.inlineStyle) console.log(`${pad}  INLINE: ${n.inlineStyle.slice(0,200)}`);
  if (n.svg) console.log(`${pad}  SVG: ${n.svg.replace(/\s+/g,' ').slice(0,300)}`);
  if (showCss && n.css) {
    const e = Object.entries(n.css).filter(([k]) => IMPORTANT.includes(k));
    if (e.length) console.log(`${pad}  { ${e.map(([k, v]) => k + ':' + v).join('; ')} }`);
  }
  if (n.truncated) console.log(`${pad}  ...${n.truncated}`);
  (n.children || []).forEach((c) => p(c, d + 1));
}
console.log('==== ' + match + ' ====');
p(secs[match], 0);
