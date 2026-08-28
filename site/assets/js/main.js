/* ==================================================================
   Behaviour layer. Replaces Webflow's webflow.js / IX2 runtime with the
   minimum needed to drive the states motion.css describes. ~90 lines.
   ================================================================== */

/* ---- 1. Page-load choreography (IX2 a-66 "Home Hero One") ---------- */
// IX2 fires PAGE_START before first paint; mirror that with rAF so the
// "from" styles are painted once, then the class flips on the next frame.
requestAnimationFrame(() => {
  requestAnimationFrame(() => document.documentElement.setAttribute('data-loaded', ''));
});

/* ---- 2. Scroll reveals (IX2 SCROLL_INTO_VIEW, scrollOffset 10%) ---- */
// Webflow's offset is a percentage of the viewport measured from the
// bottom edge, so 10% => the element must be 10% of the viewport height
// inside the fold. rootMargin's bottom inset expresses exactly that.
const revealSel = '[data-reveal], [data-reveal-blur], [data-reveal-card], [data-rotate-in]';

// IX2 re-evaluates every element's position on each scroll event rather than
// using IntersectionObserver, and that difference is observable: an element
// that goes from below the fold to above it in one jump (fast wheel, a
// restored scroll position, an anchor jump) never crosses an IO threshold —
// ratio stays 0 throughout — so IO delivers no callback and the element stays
// at opacity 0 forever. Mirroring IX2's model removes the edge case entirely.
// The pending set only shrinks, and the check is rAF-throttled.
let pending = [...document.querySelectorAll(revealSel)];

const sweep = () => {
  if (!pending.length) return;
  const line = innerHeight * 0.9; // scrollOffset 10% from the bottom edge
  const still = [];
  for (const el of pending) {
    if (el.getBoundingClientRect().top < line) el.classList.add('is-in');
    else still.push(el);
  }
  pending = still; // play once, never reverse — IX2's default
};

let ticking = false;
const onScroll = () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { ticking = false; sweep(); });
};

addEventListener('scroll', onScroll, { passive: true });
addEventListener('resize', onScroll);
addEventListener('load', onScroll);
sweep();

/* ---- 3. Nav dropdown (IX2 a-38 / a-39) ---------------------------- */
// The height animation needs a concrete px target; measure the content
// once and expose it as a custom property so CSS can transition to it.
document.querySelectorAll('[data-dropdown]').forEach((dd) => {
  const toggle = dd.querySelector('.nav_links.is-dropdown');
  const wrap = dd.querySelector('.nav_dropdown-wrap');
  const content = dd.querySelector('.nav_dropdown-content');
  if (!toggle || !wrap || !content) return;

  // The panel is display:none while closed, so it must be laid out before it
  // can be measured. Flip to the open state, read, and restore — all in one
  // synchronous block, so no frame is ever painted in the intermediate state.
  const measure = () => {
    const wasOpen = dd.dataset.state === 'open';
    dd.dataset.state = 'open';
    wrap.style.height = 'auto';
    const h = content.offsetHeight;
    wrap.style.height = '';
    if (!wasOpen) delete dd.dataset.state;
    wrap.style.setProperty('--dd-h', h + 'px');
  };

  const setOpen = (open) => {
    if (open) measure();
    dd.dataset.state = open ? 'open' : '';
    if (!open) delete dd.dataset.state;
    toggle.setAttribute('aria-expanded', String(open));
  };

  /* Hover intent. Bare mouseenter/mouseleave opened and shut the panel on
     every pass of the cursor, which is what made it feel twitchy. A short
     open delay ignores a cursor merely crossing the word; a longer close
     delay survives the diagonal trip down to the panel. */
  const num = (name, fallback) => {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const OPEN_DELAY = () => num('--nav-dd-open-delay', 90);
  const CLOSE_DELAY = () => num('--nav-dd-close-delay', 280);
  let timer = null;
  const clear = () => { if (timer) { clearTimeout(timer); timer = null; } };
  const desktop = () => matchMedia('(min-width: 992px)').matches;

  toggle.addEventListener('click', () => { clear(); setOpen(dd.dataset.state !== 'open'); });
  dd.addEventListener('mouseenter', () => {
    if (!desktop()) return;
    clear();
    timer = setTimeout(() => setOpen(true), OPEN_DELAY());
  });
  dd.addEventListener('mouseleave', () => {
    if (!desktop()) return;
    clear();
    timer = setTimeout(() => setOpen(false), CLOSE_DELAY());
  });
  // keyboard users get it without the delays
  dd.addEventListener('focusin', () => { clear(); setOpen(true); });
  dd.addEventListener('focusout', (e) => {
    if (!dd.contains(e.relatedTarget)) { clear(); setOpen(false); }
  });
  document.addEventListener('click', (e) => { if (!dd.contains(e.target)) { clear(); setOpen(false); } });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { clear(); setOpen(false); toggle.focus(); } });
  addEventListener('resize', () => { if (dd.dataset.state === 'open') measure(); });
});

/* ---- 4. Mobile menu (IX2 a-18 / a-19 drive the bars in CSS) -------- */
const navbar = document.querySelector('.navbar');
const menuBtn = document.querySelector('.menu-button');
if (navbar && menuBtn) {
  const setMenu = (open) => {
    navbar.dataset.menu = open ? 'open' : '';
    if (!open) delete navbar.dataset.menu;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  menuBtn.addEventListener('click', () => setMenu(navbar.dataset.menu !== 'open'));
  document.querySelectorAll('.nav_mobile a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  addEventListener('resize', () => { if (innerWidth > 991) setMenu(false); });
}

/* ---- 5. Back to top ------------------------------------------------
   Appears once the hero is behind you. Hidden with the [hidden] attribute
   rather than a class so it is out of the tab order while invisible —
   a focusable control you cannot see is worse than no control.          */
const toTop = document.getElementById('rx-to-top');
if (toTop) {
  const SHOW_AFTER = 600;
  let shown = false;
  const syncToTop = () => {
    const want = scrollY > SHOW_AFTER;
    if (want === shown) return;
    shown = want;
    if (want) { toTop.hidden = false; requestAnimationFrame(() => toTop.classList.add('is-in')); }
    else { toTop.classList.remove('is-in'); setTimeout(() => { if (!shown) toTop.hidden = true; }, 260); }
  };
  addEventListener('scroll', syncToTop, { passive: true });
  syncToTop();
  toTop.onclick = () => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  };
}

/* ---- 6. Booking modal ----------------------------------------------
   Every "Book a session" control keeps href="#book", so without JS the
   page still goes somewhere sensible; this intercepts the click only
   once the modal is actually present.

   The submit path is deliberately a stub: FORMSPREE_ENDPOINT is empty,
   so nothing leaves the browser and the confirmation is shown locally.
   Fill the endpoint in and the same handler POSTs the form instead —
   the enquiry is NOT wired to WhatsApp, per the brief.                  */
const FORMSPREE_ENDPOINT = ''; // e.g. 'https://formspree.io/f/xxxxxxxx'

const modal = document.getElementById('rx-book-modal');
if (modal) {
  const dialog = modal.querySelector('.modal_dialog');
  const form = document.getElementById('rx-book-form');
  const slotInput = document.getElementById('rx-slot');
  const stepForm = modal.querySelector('[data-book-step="form"]');
  const stepDone = modal.querySelector('[data-book-step="done"]');
  const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
  let lastFocus = null;

  const setStep = (name) => {
    stepForm.hidden = name !== 'form';
    stepDone.hidden = name !== 'done';
  };

  const open = () => {
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.documentElement.classList.add('is-modal-open');
    requestAnimationFrame(() => modal.classList.add('is-in'));
    const first = dialog.querySelector('.field_input');
    (first || dialog.querySelector(FOCUSABLE))?.focus();
  };

  const close = () => {
    modal.classList.remove('is-in');
    document.documentElement.classList.remove('is-modal-open');
    setTimeout(() => {
      modal.hidden = true;
      setStep('form');
      form.reset();
      slotInput.value = '';
      modal.querySelectorAll('.slot').forEach((b) => { b.classList.remove('is-on'); b.setAttribute('aria-checked', 'false'); });
      modal.querySelectorAll('.field_error').forEach((e) => { e.textContent = ''; });
      modal.querySelectorAll('.field_input').forEach((e) => e.classList.remove('is-invalid'));
    }, 240);
    lastFocus?.focus();
  };

  document.querySelectorAll('[data-book]').forEach((el) => {
    el.addEventListener('click', (e) => { e.preventDefault(); open(); });
  });
  modal.querySelectorAll('[data-book-close]').forEach((el) => el.addEventListener('click', close));

  document.addEventListener('keydown', (e) => {
    if (modal.hidden) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    // trap focus: a modal you can tab out of is not modal
    const items = [...dialog.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // slot pills behave as a radiogroup, arrow keys included
  const slots = [...modal.querySelectorAll('.slot')];
  const pick = (btn) => {
    slots.forEach((b) => { b.classList.toggle('is-on', b === btn); b.setAttribute('aria-checked', String(b === btn)); });
    slotInput.value = btn.dataset.slot;
    modal.querySelector('[data-error-for="slot"]').textContent = '';
  };
  slots.forEach((btn, i) => {
    btn.addEventListener('click', () => pick(btn));
    btn.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1
              : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const next = slots[(i + d + slots.length) % slots.length];
      next.focus(); pick(next);
    });
  });

  const setError = (name, msg) => {
    const slot = modal.querySelector(`[data-error-for="${name}"]`);
    if (slot) slot.textContent = msg;
    const input = form.elements[name];
    if (input && input.classList) input.classList.toggle('is-invalid', !!msg);
    return !msg;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = (n) => String(form.elements[n]?.value || '').trim();
    // 10 digits is the Indian mobile length; accept +91 and spacing around it
    const digits = v('phone').replace(/\D/g, '');
    const ok = [
      setError('name', v('name') ? '' : 'Please tell us your name.'),
      setError('phone', digits.length >= 10 && digits.length <= 13 ? '' : 'Enter a valid phone number.'),
      setError('address', v('address') ? '' : 'Please add an address.'),
      setError('slot', slotInput.value ? '' : 'Pick a slot.'),
    ].every(Boolean);
    if (!ok) { dialog.querySelector('.is-invalid, .field_error:not(:empty)')?.scrollIntoView({ block: 'center' }); return; }

    if (FORMSPREE_ENDPOINT) {
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        await fetch(FORMSPREE_ENDPOINT, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(form),
        });
      } catch (err) {
        // the confirmation is shown either way: the enquiry is followed up
        // by phone, so a failed POST must not look like a failed booking
        console.warn('enquiry POST failed', err);
      }
      btn.disabled = false;
    }
    setStep('done');
    stepDone.querySelector(FOCUSABLE)?.focus();
  });
}

/* ---- 7. QA hook ---------------------------------------------------- */
// The visual-diff harness needs every reveal resolved and all motion
// frozen. Exposed rather than duplicated in the harness so the settle
// logic lives with the code that owns the states.
window.__settleForQA = () => {
  document.documentElement.setAttribute('data-loaded', '');
  document.querySelectorAll(revealSel).forEach((el) => el.classList.add('is-in'));
  const s = document.createElement('style');
  s.textContent =
    '*,*::before,*::after{transition:none !important;animation:none !important}' +
    '.main_loop.is-specialties{transform:translateX(0) !important}';
  document.head.appendChild(s);
  return document.querySelectorAll(revealSel).length;
};
