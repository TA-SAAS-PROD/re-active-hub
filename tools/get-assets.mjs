import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const OUT = 'C:/Users/prakash.c/cs-assessment/output/genovas-template.webflow.io';
const DIR = join(OUT, 'site', 'assets', 'img');
mkdirSync(DIR, { recursive: true });
const assets = JSON.parse(readFileSync(OUT + '/extract/assets.json', 'utf8'));
const map = {};
const fails = [];
for (const url of assets) {
  if (!/website-files|webflow/.test(url)) { continue; }
  const base = decodeURIComponent(url.split('/').pop().split('?')[0]);
  // Webflow prefixes a 24-char hex id; strip it for a readable name
  const name = base.replace(/^[0-9a-f]{24}_/, '').replace(/[^\w.\-]/g, '-').replace(/-+/g, '-');
  const dest = join(DIR, name);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    writeFileSync(dest, buf);
    map[url] = { local: 'assets/img/' + name, bytes: buf.length, tier: 'REAL' };
    console.log('REAL  ' + name + '  ' + buf.length);
  } catch (e) {
    fails.push({ url, err: String(e) });
    console.log('FAIL  ' + url + '  ' + e);
  }
}
writeFileSync(OUT + '/extract/asset-map.json', JSON.stringify({ map, fails }, null, 2));
console.log('\ndownloaded', Object.keys(map).length, 'failed', fails.length);
