import { launch, sleep } from './cdp.mjs';
const b = await launch();
const P = `JSON.stringify((() => {
  const g = document.querySelector('.expertise_content');
  const cs = getComputedStyle(g);
  return {
    gridTemplateColumns: cs.gridTemplateColumns,
    gridTemplateRows: cs.gridTemplateRows,
    gap: cs.gap,
    children: [...g.children].map(e => {
      const r = e.getBoundingClientRect(); const c = getComputedStyle(e);
      return { cls: e.className, id: e.id || '', y: Math.round(r.y + scrollY), x: Math.round(r.x),
        w: Math.round(r.width), h: Math.round(r.height), display: c.display,
        gridColumn: c.gridColumn, gridRow: c.gridRow, gridArea: c.gridArea,
        text: (e.textContent||'').trim().slice(0, 40) };
    })
  };
})())`;

for (const w of [1440, 768, 390]) {
  for (const [name, url, settle] of [
    ['ORIG ', 'https://genovas-template.webflow.io/home/home-3', ''],
    ['CLONE', 'http://127.0.0.1:5178/', 'window.__settleForQA&&window.__settleForQA()'],
  ]) {
    const p = await b.newPage(); await p.init();
    await p.setViewport(w, w < 500 ? 844 : 1024, 1, w < 768);
    await p.goto(url, { waitMs: 3000 });
    await p.scrollThrough(700, 150);
    if (settle) await p.eval(settle);
    await sleep(500);
    const r = JSON.parse(await p.eval(P));
    console.log(`\n--- ${name} @${w}  cols=${r.gridTemplateColumns}  rows=${r.gridTemplateRows}  gap=${r.gap}`);
    r.children.forEach((c, i) =>
      console.log(`  ${i} ${String(c.y).padStart(5)},${String(c.x).padStart(4)} ${String(c.w).padStart(4)}x${String(c.h).padStart(4)} col=${c.gridColumn} row=${c.gridRow} d=${c.display} "${c.text}"`));
    await p.close();
  }
}
await b.close();
