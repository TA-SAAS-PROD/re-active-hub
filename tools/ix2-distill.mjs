import { readFileSync, writeFileSync } from 'node:fs';
const OUT = 'C:/Users/prakash.c/cs-assessment/output/genovas-template.webflow.io';
const ix = JSON.parse(readFileSync(OUT + '/extract/ix2.json', 'utf8')).ixData;
const html = readFileSync(OUT + '/home3-raw.html', 'utf8');

// which data-w-id values actually exist on THIS page
const pageIds = new Set([...html.matchAll(/data-w-id="([^"]+)"/g)].map((m) => m[1]));
const sections = JSON.parse(readFileSync(OUT + '/extract/sections-1440.json', 'utf8'));
const labelById = {};
(function walk(n, sec) {
  if (!n || typeof n !== 'object') return;
  if (n.wId) labelById[n.wId] = { label: n.label, sec, rect: n.rect };
  (n.children || []).forEach((c) => walk(c, sec));
})({ children: Object.entries(sections).map(([k, v]) => ({ ...v, __sec: k })) }, null);
for (const [k, v] of Object.entries(sections)) (function walk(n) {
  if (!n || typeof n !== 'object') return;
  if (n.wId) labelById[n.wId] = { label: n.label, sec: k, rect: n.rect };
  (n.children || []).forEach(walk);
})(v);

const step = (s) => {
  const a = s.actionTypeId;
  const c = s.config || {};
  const bits = [];
  for (const k of ['value', 'xValue', 'yValue', 'zValue', 'widthValue', 'heightValue', 'rValue', 'gValue', 'bValue', 'aValue', 'globalSwatchId', 'filters', 'unit', 'xUnit', 'yUnit', 'zUnit'])
    if (c[k] !== undefined && c[k] !== null) bits.push(`${k}=${JSON.stringify(c[k])}`);
  return `${a}{${bits.join(', ')}} dur=${c.duration ?? 0}ms delay=${c.delay ?? 0}ms ease=${c.easing || 'ease'}${c.target?.selector ? ` sel=${c.target.selector}` : ''}${c.target?.selectorGuids?.length ? ' (scoped)' : ''}`;
};

const describeList = (id) => {
  const al = ix.actionLists[id];
  if (!al) return ['<missing ' + id + '>'];
  const items = al.actionItemGroups || al.continuousParameterGroups || [];
  const out = [];
  if (al.actionItemGroups) {
    al.actionItemGroups.forEach((g, gi) => {
      (g.actionItems || []).forEach((it) => out.push(`  [g${gi}] ${step(it)}`));
    });
  }
  if (al.continuousParameterGroups) {
    al.continuousParameterGroups.forEach((g) => {
      out.push(`  [continuous ${g.id}] ${g.selector || ''}`);
      (g.continuousActionGroups || []).forEach((cg) => {
        (cg.actionItems || []).forEach((it) => out.push(`    @${cg.keyframe}% ${step(it)}`));
      });
    });
  }
  return out;
};

const lines = [];
const used = new Set();
const bySec = {};
for (const ev of Object.values(ix.events)) {
  const tid = ev.target?.id || ev.config?.target?.id;
  const t = (ev.target && ev.target.id) || null;
  const hit = [t, ...(ev.targets || []).map((x) => x.id)].filter(Boolean).find((x) => pageIds.has(x));
  if (!hit) continue;
  used.add(ev.id);
  const meta = labelById[hit] || {};
  const sec = meta.sec || '(unmapped)';
  (bySec[sec] ||= []).push({ ev, hit, meta });
}

for (const sec of Object.keys(bySec).sort()) {
  lines.push(`\n## ${sec}`);
  for (const { ev, hit, meta } of bySec[sec]) {
    lines.push(`\n### ${ev.eventTypeId} on ${meta.label || hit}`);
    const cfg = ev.config || {};
    const bits = [];
    if (cfg.scrollOffsetValue !== undefined) bits.push(`scrollOffset=${cfg.scrollOffsetValue}${cfg.scrollOffsetUnit || ''}`);
    if (cfg.delay) bits.push(`delay=${cfg.delay}`);
    if (ev.mediaQueries) bits.push(`mq=[${ev.mediaQueries.join(',')}]`);
    if (bits.length) lines.push(`  ${bits.join(' ')}`);
    for (const key of ['actionListId']) {
      if (cfg[key]) { lines.push(` action ${cfg[key]}:`); lines.push(...describeList(cfg[key])); }
    }
    for (const grp of ['config']) {}
    if (ev.action?.config?.actionListId) { lines.push(` action ${ev.action.config.actionListId}:`); lines.push(...describeList(ev.action.config.actionListId)); }
  }
}
writeFileSync(OUT + '/extract/ix2-page.md', lines.join('\n'));
console.log('page data-w-ids:', pageIds.size, 'matched events:', used.size);
console.log('sections with IX:', Object.keys(bySec).join(', '));
console.log(lines.join('\n').slice(0, 6000));
