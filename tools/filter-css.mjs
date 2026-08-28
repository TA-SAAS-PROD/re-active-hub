// Pull every rule from the original Webflow stylesheet whose selector references
// a class that actually appears in our rebuilt index.html — media queries included.
import { readFileSync, writeFileSync } from 'node:fs';
const OUT = 'C:/Users/prakash.c/cs-assessment/output/genovas-template.webflow.io';
const css = readFileSync(OUT + '/raw/webflow.css', 'utf8');
const html = readFileSync(OUT + '/site/index.html', 'utf8');

const used = new Set();
for (const m of html.matchAll(/class="([^"]+)"/g)) m[1].split(/\s+/).forEach((c) => c && used.add(c));
// data-attribute driven state classes we add at runtime
['is-open', 'is-in'].forEach((c) => used.add(c));

// crude but sufficient tokenizer: split top-level blocks, recurse into @media
function* rules(src) {
  let i = 0, depth = 0, start = 0, selStart = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '{') {
      if (depth === 0) { start = i; }
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        const sel = src.slice(selStart, start).trim();
        const body = src.slice(start + 1, i);
        yield { sel, body };
        selStart = i + 1;
      }
    }
    i++;
  }
}

const selMatches = (sel) => {
  if (/^@(font-face|import|charset)/.test(sel)) return false;
  return sel.split(',').some((s) => {
    s = s.trim();
    const classes = [...s.matchAll(/\.([A-Za-z0-9_\\-]+)/g)].map((m) => m[1].replace(/\\/g, ''));
    if (classes.length === 0) {
      // bare element / pseudo selectors: keep a small allowlist
      return /^(\*|html|body|:root|h1|h2|h3|h4|p|a|img|svg|ul|li|button|input|\*,)/.test(s);
    }
    return classes.every((c) => used.has(c));
  });
};

const out = [];
const dropped = new Set();
for (const r of rules(css)) {
  if (r.sel.startsWith('@media')) {
    const inner = [];
    for (const ir of rules(r.body)) {
      if (selMatches(ir.sel)) inner.push(`  ${ir.sel} {${ir.body.replace(/\n/g, '\n  ')}}`);
      else ir.sel.split(',').forEach((s) => dropped.add(s.trim()));
    }
    if (inner.length) out.push(`${r.sel} {\n${inner.join('\n')}\n}`);
  } else if (r.sel.startsWith('@')) {
    out.push(`${r.sel} {${r.body}}`);
  } else if (selMatches(r.sel)) {
    out.push(`${r.sel} {${r.body}}`);
  } else {
    r.sel.split(',').forEach((s) => dropped.add(s.trim()));
  }
}
writeFileSync(OUT + '/extract/filtered.css', out.join('\n'));
writeFileSync(OUT + '/extract/dropped-selectors.txt', [...dropped].sort().join('\n'));
console.log('kept', out.length, 'rule blocks;', readFileSync(OUT + '/extract/filtered.css', 'utf8').length, 'bytes');
console.log('dropped', dropped.size, 'selectors');
console.log('classes used in html:', used.size);
