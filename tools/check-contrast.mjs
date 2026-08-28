/* Hero contrast, measured against RENDERED PIXELS rather than declared colours.

   The hero type sits over an image panel plus a scrim, so its effective
   background is whatever those two composite to — not any single CSS value.
   Method: hide the text, screenshot the panel, then for each text block read
   the WORST-CASE (brightest, since the type is light) pixel inside its box and
   compute the WCAG ratio against the text's own computed colour. */
import { launch, sleep } from './cdp.mjs';

/* [selector, label] — every text surface whose backdrop is not a flat colour.
   The glass layer makes panels translucent, which lowers the contrast of
   ALL panel text at once, so each surface type gets measured, not just the
   hero. Labels in LARGE (below) are held to 3:1, the rest to 4.5:1. */
const TARGETS = [
  ['.hero_title.is-home-two', 'wordmark'],
  ['.hero-cta .text-base', 'sub-copy'],
  ['.hero-cta .button-text.is-firts', 'CTA label'],
  ['.section_stats .text-2xl', 'panel body'],
  ['.section_stats .stats', 'stat number'],
  ['.expertise_card .text-2xl', 'card title'],
  ['.expertise_card.is-yellow .text-base', 'card body accent'],
  ['.differentiators_card .text-base', 'card body ground'],
  ['.testimonials_card .text-2xl', 'quote'],
  ['.cases_card .cases-text', 'results card'],
  // sample the PANE, not a label box: the marquee loop is ~2600px wide inside
  // a 1400px clip, so a label's rect runs past the pane edge and the sampler
  // reads the light page ground beyond it. The pane inherits the label colour.
  ['.specialties_content', 'marquee'],
  ['.footer-link', 'footer link'],
  ['.nav_links', 'nav link'],
];

/* Hidden before the backdrop is sampled — text only, never its container:
   a pane paints its own translucent surface, and hiding the pane would
   sample whatever is behind it instead of what the text actually sits on. */
const HIDE = [
  '.hero_title.is-home-two', '.hero-cta .text-base', '.hero-cta .button-text',
  '.section_stats .text-2xl', '.section_stats .stats',
  '.expertise_card .text-2xl', '.expertise_card .text-base',
  '.differentiators_card .text-base', '.testimonials_card .text-2xl',
  '.cases_card .cases-text', '.main_loop-specialties > div', '.footer-link', '.nav_links',
  // the marquee's separator dots are fill:currentColor, i.e. the same white as
  // the label. Left visible they become the 'brightest pixel' in the sampled
  // box and every marquee reads a nonsense 1.00:1.
  '.specialties_content .ellipse',
];

const lum = (r, g, b) => {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => { const [hi, lo] = a > b ? [a, b] : [b, a]; return (hi + 0.05) / (lo + 0.05); };

const b = await launch();
const SLUGS = (process.argv[2] || 'vitruvian').split(',');
for (const slug of SLUGS)
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const p = await b.newPage();
  await p.init();
  await p.setViewport(w, h, 1, w < 768);
  await p.goto(`http://127.0.0.1:5178/?rx=${slug}&panel=0`, { waitMs: 3500 });
  await p.eval('window.__settleForQA && window.__settleForQA()');
  await sleep(900);

  // boxes + text colours, then hide the type so we can read what is behind it
  const meta = JSON.parse(await p.eval(`JSON.stringify(${JSON.stringify(TARGETS)}.map(function(t){
    var el = document.querySelector(t[0]);
    if (!el) return { sel: t[0], label: t[1], missing: true };
    var r = el.getBoundingClientRect();
    return { sel: t[0], label: t[1],
      box: { x: Math.round(r.x + scrollX), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) },
      color: getComputedStyle(el).color };
  }))`));

  /* Hide the TEXT only, never its container. The pill paints its own opaque
     surface, so hiding the whole pill samples the plate behind it and reports
     a failure that does not exist — the ink sits on the pill, not the plate.
     Hide the label and the pill's own background is what gets measured. */
  await p.eval(`(function(){
    ${JSON.stringify(HIDE)}.forEach(function(s){
        document.querySelectorAll(s).forEach(function(e){ e.style.visibility = 'hidden'; });
      });
  })()`);
  await sleep(250);
  // full page: most glass panels sit below the fold, and a viewport-only
  // capture reports them all as offscreen
  const shot = (await p.screenshot({ fullPage: true })).toString('base64');

  const results = JSON.parse(await p.eval(`(async () => {
    const img = await new Promise(function(res, rej){ var i = new Image(); i.onload = function(){res(i);}; i.onerror = rej; i.src = 'data:image/png;base64,' + ${JSON.stringify(shot)}; });
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
    return JSON.stringify(${JSON.stringify(meta)}.map(function(m){
      if (m.missing) return m;
      // Sample the INTERIOR, not the exact bounds. A pane's own rounded
      // corners, its 1px light edge and any neighbouring surface all sit on
      // the boundary, and 'brightest pixel' happily picks one of those over
      // the actual backdrop — which reported a correctly-rendered marquee as
      // 2.07:1. Inset 12% a side; the text never reaches there.
      var ix = Math.round(m.box.w * 0.12), iy = Math.round(m.box.h * 0.12);
      var bx = Math.max(0, m.box.x + ix), by = Math.max(0, m.box.y + iy);
      var bw = Math.min(m.box.w - ix * 2, c.width - bx), bh = Math.min(m.box.h - iy * 2, c.height - by);
      // a zero box means the element is display:none at this breakpoint
      // (the desktop nav behind the hamburger), not a contrast problem
      if (bw <= 0 || bh <= 0) return Object.assign({}, m, { hidden: true });
      var d = x.getImageData(bx, by, bw, bh).data;
      var best = null, bl = -1;
      for (var i = 0; i < d.length; i += 4) {
        var L = 0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2];
        if (L > bl) { bl = L; best = [d[i], d[i+1], d[i+2]]; }
      }
      return Object.assign({}, m, { brightest: best });
    }));
  })()`));

  console.log(`\n--- ${w}px ---`);
  for (const r of results) {
    if (r.missing) { console.log(`  ${r.label}: MISSING`); continue; }
    if (r.hidden) { console.log(`  ${r.label.padEnd(10)} n/a — not rendered at this breakpoint`); continue; }
    const m = r.color.match(/[\d.]+/g).map(Number);
    const cr = ratio(lum(m[0], m[1], m[2]), lum(...r.brightest));
    const LARGE = new Set(['wordmark','stat number','card title','quote','marquee']);
    const need = LARGE.has(r.label) ? 3 : 4.5;  // WCAG large vs body text
    console.log(`  ${r.label.padEnd(10)} ${cr.toFixed(2)}:1  (needs ${need}) ${cr >= need ? 'PASS' : 'FAIL'}   text ${r.color} vs worst-case bg rgb(${r.brightest.join(', ')})`);
  }
  await p.close();
}
await b.close();
