/* Build a dev-only preview of the "What we treat" card candidates.

   Not wired into the page — the brief was to look first. This renders the
   REAL .expertise_card markup against the REAL stylesheets so the judgement
   is about the actual card at its actual aspect ratio (436x408) with its
   actual copy over the photo, not about bare squares.

   Deleted at build time (postbuild.mjs). */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = 'C:/Users/prakash.c/cs-assessment/output/genovas-template.webflow.io';
const SRC = path.join(ROOT, 'card-options');
const DST = path.join(ROOT, 'site/assets/img/card-options');
fs.mkdirSync(DST, { recursive: true });

const CARDS = [
  { slug: 'back-neck', title: 'Back &amp; Neck Pain',      body: 'Slipped disc, sciatica and long-standing spine pain, assessed properly.', cls: '' },
  { slug: 'sports',    title: 'Sports Injury',             body: 'Get back to the game without carrying the injury with you.',              cls: ' is-yellow' },
  { slug: 'postsurg',  title: 'Post-Surgical Rehab',       body: 'Structured recovery after surgery, paced to what your body can take.',    cls: ' is-neutral-light' },
  { slug: 'posture',   title: 'Posture &amp; Desk Strain', body: 'For the pain that builds slowly over years at a desk or a wheel.',        cls: ' is-grey-light' },
  { slug: 'home',      title: 'Home Physiotherapy',        body: 'When getting to the clinic is the hard part, we come to you.',            cls: ' is-grey-lighter' },
];
const TAKES = [
  { k: 'A', label: 'A — hands-on detail' },
  { k: 'B', label: 'B — therapist & patient' },
  { k: 'C', label: 'C — environmental' },
];

/* resize each candidate to the card's real box, cover-cropped */
const fit = path.join(ROOT, 'tools/fit-image.ps1');
let made = 0;
for (const c of CARDS) {
  for (const t of TAKES) {
    const from = path.join(SRC, `${c.slug}-${t.k}.png`);
    if (!fs.existsSync(from)) { console.log(`  missing ${c.slug}-${t.k}.png`); continue; }
    const to = path.join(DST, `${c.slug}-${t.k}.jpg`);
    execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', fit,
      '-In', from, '-Out', to, '-W', '872', '-H', '816', '-Quality', '84', '-FocusY', '0.5'],
      { stdio: 'pipe' });
    made++;
  }
}
console.log(`${made} card images cut to 872x816 (2x the 436x408 card box)`);

const rows = CARDS.map((c) => `
  <section class="row">
    <h3 class="row_title">${c.title.replace('&amp;', '&')}</h3>
    <div class="row_cards">
      ${TAKES.map((t) => `
      <figure class="opt">
        <figcaption class="opt_cap">${t.label}</figcaption>
        <div class="expertise_card${c.cls} has-photo" style="--card-img:url('assets/img/card-options/${c.slug}-${t.k}.jpg')">
          <div class="text-2xl">${c.title}</div>
          <div class="expertise_wrap">
            <div class="text-base">${c.body}</div>
            <div class="icon-box"><div class="icon_wrap">
              <svg class="icon-1x1-medium is-firts" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M8.95893 22.871L20.5083 11.3216L10.6088 11.3216L10.524 9.99227L22.7805 9.99227L22.7805 22.2488L21.4512 22.1639L21.4512 12.2644L9.90174 23.8138L8.95893 22.871Z" fill="currentColor"/></svg>
            </div></div>
          </div>
        </div>
      </figure>`).join('')}
    </div>
  </section>`).join('');

const html = `<!DOCTYPE html>
<html lang="en" data-rx="vitruvian" data-loaded>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Card candidates — What we treat</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Share+Tech:wght@400&family=Raleway:wght@300;400;500;600;700&display=swap">
<link rel="stylesheet" href="assets/styles/remix-tokens.css">
<link rel="stylesheet" href="assets/styles/base.css">
<link rel="stylesheet" href="assets/styles/brand.css">
<link rel="stylesheet" href="assets/styles/glass.css">
<link rel="stylesheet" href="remix/tokens.vitruvian.css">
<link rel="stylesheet" href="remix/patch.vitruvian.css">
<style>
  body { background: var(--rx-ground); padding: 2.5rem clamp(1rem, 4vw, 3rem) 4rem; }
  .sheet_head { margin: 0 0 2rem; font-family: var(--rx-font-display); color: var(--rx-ink); }
  .sheet_head h1 { font-size: 2rem; margin: 0 0 .25rem; font-weight: 600; }
  .sheet_head p { font-family: var(--rx-font-body); color: var(--rx-ink-2); margin: 0; font-size: .95rem; }
  .row { margin-bottom: 2.5rem; }
  .row_title { font-family: var(--rx-font-body); font-size: .8rem; letter-spacing: .12em; text-transform: uppercase;
               color: var(--rx-ink-2); margin: 0 0 .75rem; }
  .row_cards { display: grid; grid-template-columns: repeat(3, 436px); gap: 1.25rem; }
  .opt { margin: 0; }
  .opt_cap { font-family: var(--rx-font-body); font-size: .78rem; color: var(--rx-ink-2); margin-bottom: .4rem; }
  /* the card box, exactly as it measures on the page */
  .row_cards .expertise_card { width: 436px; height: 408px; }

  /* THE PROPOSAL: photo behind, scrim only where the type sits, so the
     copy keeps its contrast and the picture still reads. Same principle
     as the hero — the image is not decoration behind text, the dark is
     placed deliberately under the words. */
  .expertise_card.has-photo { position: relative; isolation: isolate; overflow: hidden; }
  .expertise_card.has-photo::after {
    content: "";
    position: absolute; inset: 0; z-index: -1;
    background-image: var(--card-img);
    background-size: cover; background-position: center;
  }
  .expertise_card.has-photo::before {
    content: "";
    position: absolute; inset: 0; z-index: -1;
    background:
      linear-gradient(180deg, rgba(0,0,0,.58) 0%, rgba(0,0,0,.18) 38%, rgba(0,0,0,.10) 55%, rgba(0,0,0,.72) 100%);
  }
  .expertise_card.has-photo,
  .expertise_card.has-photo .text-2xl,
  .expertise_card.has-photo .text-base { color: var(--rx-panel); }
  .expertise_card.has-photo .icon-box { color: var(--rx-panel); }
</style>
</head>
<body>
<div class="sheet_head">
  <h1>&ldquo;What we treat&rdquo; &mdash; card candidates</h1>
  <p>Real card markup, real stylesheets, real 436&times;408 box. Three takes per card. Nothing here is wired into the page.</p>
</div>
${rows}
</body>
</html>`;

fs.writeFileSync(path.join(ROOT, 'site/card-preview.html'), html);
console.log('site/card-preview.html written  ->  http://localhost:5178/card-preview.html');
