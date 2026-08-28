/* Inlines public/remix/remix-loader.js into index.html between markers.

   Why inline: the loader must be a CLASSIC script that runs during head
   parsing — a module script is deferred and the page would paint in base
   colours before the direction applied. Vite refuses to bundle a classic
   <script src>, and putting the file in public/ does not exempt it. Inlining
   satisfies both and removes a blocking request from the critical path.

   Run after editing the loader (npm run sync-remix does it for you). */
import { readFileSync, writeFileSync } from 'node:fs';

const S = 'C:/Users/prakash.c/cs-assessment/output/genovas-template.webflow.io/site';
const A = '<!-- rx:loader -->';
const B = '<!-- /rx:loader -->';

const js = readFileSync(S + '/public/remix/remix-loader.js', 'utf8');
let h = readFileSync(S + '/index.html', 'utf8');
const before = h;

const block =
  '  ' + A + '\n' +
  '  <script>\n' +
  js.replace(/^/gm, '  ').trimEnd() + '\n' +
  '  </script>\n' +
  '  ' + B;

const i = h.indexOf(A);
if (i >= 0) {
  // slice between the markers — a regex here has to escape <!-- and --> and
  // silently matched nothing when it did not, which shipped a stale loader
  const j = h.indexOf(B, i);
  if (j < 0) throw new Error('opening rx:loader marker without a closing one');
  const lineStart = h.lastIndexOf('\n', i) + 1;
  h = h.slice(0, lineStart) + block + h.slice(j + B.length);
} else {
  const anchor = '  <script src="remix/remix-loader.js"></script>';
  if (!h.includes(anchor)) throw new Error('no rx:loader markers and no loader <script src> to replace');
  h = h.replace(anchor, block);
}

// h === before is the normal idempotent case: the inlined copy is already
// current. Not an error — this script runs on every `npm run directions`.
const changed = h !== before;
writeFileSync(S + '/index.html', h);

// assert the inlined copy is actually the current loader
const check = readFileSync(S + '/index.html', 'utf8');
const inlined = check.slice(check.indexOf(A) + A.length, check.indexOf(B));
for (const probe of ['var ACTIVE', 'dev-panel.js', 'rx.apply']) {
  if (!inlined.includes(probe)) throw new Error(`inlined loader is missing "${probe}" — stale copy?`);
}
console.log(`inlined remix-loader.js (${js.length} bytes)${changed ? '' : ', already current'}; verified`);
