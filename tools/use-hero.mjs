/* Install one of the generated hero candidates.  node tools/use-hero.mjs V5 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const NAME = process.argv[2];
const ROOT = path.resolve(import.meta.dirname, '..');
const SRC  = path.join(ROOT, 'hero-options/build', NAME || '');
const IMG  = path.join(ROOT, 'site/assets/img');

if (!NAME || !fs.existsSync(SRC)) {
  const have = fs.existsSync(path.join(ROOT, 'hero-options/build'))
    ? fs.readdirSync(path.join(ROOT, 'hero-options/build')).join(', ') : '(none built)';
  console.log(`usage: node tools/use-hero.mjs <name>\navailable: ${have}`);
  process.exit(1);
}
const md5 = (f) => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex').slice(0, 8);
for (const f of ['hero.jpg', 'hero-1200.jpg', 'hero-800.jpg']) {
  fs.copyFileSync(path.join(SRC, f), path.join(IMG, f));
  console.log(`  ${f}  ${md5(path.join(IMG, f))}`);
}
fs.writeFileSync(path.join(IMG, '.hero-source'), NAME + '\n');
console.log(`hero is now ${NAME}`);
