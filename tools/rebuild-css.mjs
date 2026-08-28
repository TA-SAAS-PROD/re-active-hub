/* Full CSS pipeline, in order. Run after changing index.html's class usage —
   filter-css.mjs derives the ruleset from whatever classes the markup actually
   uses, so new components only pick up their original styling after this. */
import { execFileSync } from 'node:child_process';
const ROOT = 'C:/Users/prakash.c/cs-assessment/output/genovas-template.webflow.io';
const SKILL = 'C:/Users/prakash.c/.claude/skills/remix-site/scripts';
const run = (script, args = [], cwd = ROOT) => {
  const out = execFileSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' });
  process.stdout.write(out.split('\n').filter(Boolean).map((l) => '  ' + l).join('\n') + '\n');
};
console.log('1/4 filter');   run(ROOT + '/tools/filter-css.mjs');
console.log('2/4 assemble'); run(ROOT + '/tools/build-css.mjs');
console.log('3/4 tokenize'); run(SKILL + '/tokenize-css.js', ['site/assets/styles/base.css', 'tokens-1440.json', 'site/assets/styles']);
import { copyFileSync, rmSync, existsSync } from 'node:fs';
copyFileSync(ROOT + '/site/assets/styles/base.tokenized.css', ROOT + '/site/assets/styles/base.css');
rmSync(ROOT + '/site/assets/styles/base.tokenized.css');
// tokenize-css.js also rewrites remix-tokens.css with its generated defaults;
// ours is hand-authored (it aliases the site's own vocabulary), so restore it.
if (existsSync(ROOT + '/tools/remix-tokens.css')) copyFileSync(ROOT + '/tools/remix-tokens.css', ROOT + '/site/assets/styles/remix-tokens.css');
rmSync(ROOT + '/site/assets/remix', { recursive: true, force: true });
console.log('4/5 hoist');    run(ROOT + '/tools/remix-hoist.mjs');
console.log('5/5 glass');    copyFileSync(ROOT + '/tools/glass.css', ROOT + '/site/assets/styles/glass.css');
