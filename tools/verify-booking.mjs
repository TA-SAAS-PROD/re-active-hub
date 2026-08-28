/* Behaviour checks for the four things just added: back-to-top, the footer
   contact chips, the booking modal and its slot pills. Drives the real DOM
   through real events — a modal that "opens" in code but is invisible, or a
   submit that silently does nothing, both pass a shallower check. */
import { launch, sleep } from './cdp.mjs';

const b = await launch();
const p = await b.newPage();
await p.init();
await p.setViewport(1440, 900, 1);
await p.goto('http://127.0.0.1:5178/?rx=vitruvian&panel=0', { waitMs: 4500 });
await sleep(2000);

const pass = [], fail = [];
const check = (name, ok, detail) => (ok ? pass : fail).push(`${name}${detail ? '   ' + detail : ''}`);

/* ---- 1. back to top ---- */
const t1 = JSON.parse(await p.eval(`JSON.stringify((() => {
  const b = document.getElementById('rx-to-top');
  return { exists: !!b, hiddenAtTop: b ? b.hidden : null };
})())`));
check('back-to-top hidden at page top', t1.exists && t1.hiddenAtTop === true, JSON.stringify(t1));

const t2 = JSON.parse(await p.eval(`(async () => {
  scrollTo(0, 2000);
  await new Promise((r) => setTimeout(r, 600));
  const b = document.getElementById('rx-to-top');
  const cs = getComputedStyle(b);
  return JSON.stringify({ hidden: b.hidden, opacity: cs.opacity, z: cs.zIndex, w: Math.round(b.getBoundingClientRect().width) });
})()`));
check('back-to-top appears after scroll', t2.hidden === false && +t2.opacity > 0.9, JSON.stringify(t2));

const t3 = JSON.parse(await p.eval(`(async () => {
  document.getElementById('rx-to-top').click();
  await new Promise((r) => setTimeout(r, 1400));
  return JSON.stringify({ y: Math.round(scrollY) });
})()`));
check('back-to-top returns to the top', t3.y < 20, JSON.stringify(t3));

/* ---- 2. footer contact chips ---- */
const t4 = JSON.parse(await p.eval(`JSON.stringify((() => {
  const wrap = document.querySelector('.footer_contact-actions');
  if (!wrap) return { missing: true };
  const chips = [...wrap.querySelectorAll('.contact-chip')].map((c) => ({ href: c.getAttribute('href'), text: c.textContent.trim() }));
  const w = wrap.getBoundingClientRect();
  const f = document.querySelector('.text-wrap.is-footer').getBoundingClientRect();
  const word = document.querySelector('.text_footer').getBoundingClientRect();
  const tt = document.getElementById('rx-to-top').getBoundingClientRect();
  const overlapsToTop = !(w.right < tt.left || w.left > tt.right || w.bottom < tt.top || w.top > tt.bottom);
  return {
    chips,
    rightAligned: (f.right - w.right) < 160,
    inWordmarkRow: w.bottom <= word.bottom + 4 && w.top >= word.top,
    overlapsToTop,
  };
})())`));
check('footer has call + WhatsApp chips',
  !t4.missing && t4.chips.length === 2 &&
  t4.chips[0].href === 'tel:+919734768459' &&
  t4.chips[1].href === 'https://wa.me/919734768459',
  JSON.stringify(t4.chips));
/* They were moved out of the row below the wordmark into the empty right
   half of the "Hub" line, and pulled clear of the fixed back-to-top button
   — the overlap was the actual complaint. Assert that, not the old spot. */
check('chips sit in the wordmark negative space, clear of back-to-top',
  t4.rightAligned && t4.inWordmarkRow && !t4.overlapsToTop,
  `rightAligned=${t4.rightAligned} inWordmarkRow=${t4.inWordmarkRow} overlapsToTop=${t4.overlapsToTop}`);

const t5 = JSON.parse(await p.eval(`JSON.stringify((() => {
  const links = [...document.querySelectorAll('.footer_column .footer-link')].map((a) => a.getAttribute('href'));
  return { tel: links.filter((h) => h && h.startsWith('tel:')), wa: links.filter((h) => h && h.includes('wa.me')),
           placeholderLeft: document.body.innerHTML.includes('+91 00000 00000') };
})())`));
check('footer detail uses the real number, no placeholder left',
  t5.tel[0] === 'tel:+919734768459' && t5.wa.length === 1 && !t5.placeholderLeft, JSON.stringify(t5));

/* ---- 3. modal opens from every Book a session control ---- */
const t6 = JSON.parse(await p.eval(`JSON.stringify((() => {
  const labelled = [...document.querySelectorAll('a, button')].filter((el) => {
    if (el.closest('#rx-book-modal')) return false;              // the modal's own controls
    return /book a session/i.test(el.textContent || '');
  });
  const unwired = labelled.filter((el) => !el.hasAttribute('data-book'))
    .map((el) => el.tagName + '[' + (el.getAttribute('href') || '') + ']');
  const placeholderTel = [...document.querySelectorAll('[href^="tel:"]')]
    .map((a) => a.getAttribute('href')).filter((h) => /0{6,}/.test(h));
  return { total: labelled.length, unwired, placeholderTel };
})())`));
check('every control labelled "Book a session" opens the modal',
  t6.total >= 5 && t6.unwired.length === 0,
  `${t6.total} labelled, unwired: ${JSON.stringify(t6.unwired)}`);
check('no placeholder tel: link anywhere', t6.placeholderTel.length === 0, JSON.stringify(t6.placeholderTel));

const t7 = JSON.parse(await p.eval(`(async () => {
  document.querySelector('[data-book]').click();
  await new Promise((r) => setTimeout(r, 500));
  const m = document.getElementById('rx-book-modal');
  const d = m.querySelector('.modal_dialog');
  const r = d.getBoundingClientRect();
  return JSON.stringify({
    hidden: m.hidden, opacity: getComputedStyle(m).opacity,
    onScreen: r.width > 100 && r.height > 100 && r.top < innerHeight && r.bottom > 0,
    scrollLocked: getComputedStyle(document.documentElement).overflow === 'hidden',
    focusInside: d.contains(document.activeElement),
    fields: [...d.querySelectorAll('.field_input')].map((i) => i.name),
    slots: [...d.querySelectorAll('.slot')].map((s) => s.dataset.slot),
  });
})()`));
check('modal opens and is actually visible', t7.hidden === false && +t7.opacity > 0.9 && t7.onScreen,
  `opacity=${t7.opacity} onScreen=${t7.onScreen}`);
check('background scroll is locked', t7.scrollLocked === true, `overflow=${t7.scrollLocked}`);
check('focus moves into the dialog', t7.focusInside === true);
check('fields are Name / Phone / Address', JSON.stringify(t7.fields) === JSON.stringify(['name', 'phone', 'address']), JSON.stringify(t7.fields));
check('three slot pills, correct times',
  t7.slots.length === 3 && t7.slots[0].startsWith('08:00 AM') && t7.slots[1].startsWith('11:00 AM') && t7.slots[2].startsWith('04:00 PM'),
  JSON.stringify(t7.slots));

/* ---- 4. validation refuses an empty submit ---- */
const t8 = JSON.parse(await p.eval(`(async () => {
  document.getElementById('rx-book-form').requestSubmit();
  await new Promise((r) => setTimeout(r, 300));
  const m = document.getElementById('rx-book-modal');
  return JSON.stringify({
    stillOnForm: !m.querySelector('[data-book-step="form"]').hidden,
    errors: [...m.querySelectorAll('.field_error')].map((e) => e.textContent).filter(Boolean).length,
  });
})()`));
check('empty submit is refused with errors', t8.stillOnForm && t8.errors === 4, JSON.stringify(t8));

/* ---- 5. a filled form reaches the confirmation ---- */
const t9 = JSON.parse(await p.eval(`(async () => {
  const m = document.getElementById('rx-book-modal');
  const f = document.getElementById('rx-book-form');
  const set = (n, v) => { const el = f.elements[n]; el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
  set('name', 'Test Patient'); set('phone', '9734768459'); set('address', '5th Mile, Tadong');
  m.querySelectorAll('.slot')[1].click();
  await new Promise((r) => setTimeout(r, 200));
  const chosen = document.getElementById('rx-slot').value;
  const aria = [...m.querySelectorAll('.slot')].map((s) => s.getAttribute('aria-checked'));
  f.requestSubmit();
  await new Promise((r) => setTimeout(r, 600));
  const done = m.querySelector('[data-book-step="done"]');
  return JSON.stringify({
    chosen, aria,
    doneShown: !done.hidden,
    formHidden: m.querySelector('[data-book-step="form"]').hidden,
    message: done.querySelector('.modal_title').textContent.trim().slice(0, 60),
    lede: done.querySelector('.modal_lede').textContent.trim().slice(0, 60),
  });
})()`));
check('slot pill selects exclusively', t9.chosen.startsWith('11:00 AM') && JSON.stringify(t9.aria) === JSON.stringify(['false', 'true', 'false']), JSON.stringify(t9.aria));
check('valid submit reaches confirmation', t9.doneShown && t9.formHidden, `done=${t9.doneShown}`);
check('confirmation carries the right message', /Thank you for booking an appointment/.test(t9.message), t9.message);

/* ---- 6. escape closes and resets ---- */
const t10 = JSON.parse(await p.eval(`(async () => {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await new Promise((r) => setTimeout(r, 500));
  const m = document.getElementById('rx-book-modal');
  return JSON.stringify({
    hidden: m.hidden,
    scrollFree: getComputedStyle(document.documentElement).overflow !== 'hidden',
    resetToForm: !m.querySelector('[data-book-step="form"]').hidden,
    nameCleared: !document.getElementById('rx-book-form').elements.name.value,
  });
})()`));
check('escape closes, unlocks scroll and resets',
  t10.hidden && t10.scrollFree && t10.resetToForm && t10.nameCleared, JSON.stringify(t10));

console.log('\n' + pass.map((s) => '  PASS  ' + s).join('\n'));
if (fail.length) console.log('\n' + fail.map((s) => '  FAIL  ' + s).join('\n'));
console.log(`\n${pass.length}/${pass.length + fail.length} checks pass`);
console.log('console errors:', p.pageErrors.length, p.pageErrors.slice(0, 3));
await b.close();
if (fail.length) process.exit(1);
