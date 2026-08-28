/* Proof shots for the four new pieces. */
import { launch, sleep } from './cdp.mjs';
import fs from 'node:fs';

const OUT = 'C:/Users/prakash.c/cs-assessment/output/genovas-template.webflow.io/shots/';
const b = await launch();
const p = await b.newPage();
await p.init();
await p.setViewport(1440, 900, 1);
await p.goto('http://127.0.0.1:5178/?rx=vitruvian&panel=0', { waitMs: 4500 });
await sleep(2000);

// footer with the chips and the back-to-top visible
await p.eval(`document.querySelector('.section_footer').scrollIntoView({ block: 'end' })`);
await sleep(1400);
fs.writeFileSync(OUT + 'feat-footer.png', await p.screenshot({ fullPage: false }));
console.log('footer shot');

// modal, empty
await p.eval(`document.querySelector('[data-book]').click()`);
await sleep(700);
fs.writeFileSync(OUT + 'feat-modal.png', await p.screenshot({ fullPage: false }));
console.log('modal shot');

// modal, filled with a slot chosen
await p.eval(`(() => {
  const f = document.getElementById('rx-book-form');
  const set = (n, v) => { f.elements[n].value = v; f.elements[n].dispatchEvent(new Event('input', { bubbles: true })); };
  set('name', 'Tenzing Bhutia'); set('phone', '+91 97347 68459'); set('address', '5th Mile, Tadong, Gangtok');
  document.querySelectorAll('.slot')[1].click();
})()`);
await sleep(500);
fs.writeFileSync(OUT + 'feat-modal-filled.png', await p.screenshot({ fullPage: false }));
console.log('filled shot');

// confirmation
await p.eval(`document.getElementById('rx-book-form').requestSubmit()`);
await sleep(800);
fs.writeFileSync(OUT + 'feat-modal-done.png', await p.screenshot({ fullPage: false }));
console.log('confirmation shot');

// mobile modal
await p.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
await sleep(500);
await p.setViewport(390, 844, 1);
await p.goto('http://127.0.0.1:5178/?rx=vitruvian&panel=0', { waitMs: 4000 });
await sleep(1800);
await p.eval(`document.querySelector('[data-book]').click()`);
await sleep(700);
fs.writeFileSync(OUT + 'feat-modal-390.png', await p.screenshot({ fullPage: false }));
console.log('mobile modal shot');

console.log('console errors:', p.pageErrors.length);
await b.close();
