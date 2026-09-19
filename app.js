(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const money = n => '$' + n.toFixed(2);

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };

  /* ---------- Toast ---------- */
  const toastEl = $('#toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  /* ---------- Cart ---------- */
  let cart = [];
  try { cart = JSON.parse(store.get('ss-cart') || '[]'); } catch (e) { cart = []; }
  if (!Array.isArray(cart)) cart = [];
  const countEl = $('#cart-count');
  const itemsEl = $('#cart-items');
  const totalEl = $('#cart-total');

  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function renderCart(bump) {
    const count = cart.reduce((a, i) => a + i.qty, 0);
    countEl.textContent = count;
    countEl.classList.toggle('show', count > 0);
    if (bump) { countEl.classList.remove('bump'); void countEl.offsetWidth; countEl.classList.add('bump'); }
    totalEl.textContent = money(cart.reduce((a, i) => a + i.qty * i.price, 0));
    itemsEl.innerHTML = cart.length ? cart.map(i => `
      <div class="cart-item" data-id="${esc(i.id)}">
        <img src="${esc(i.img)}" alt="" width="72" height="72">
        <div>
          <h5>${esc(i.name)}</h5>
          <div class="qty"><button type="button" data-act="dec" aria-label="Decrease quantity">−</button><span aria-live="polite">${i.qty}</span><button type="button" data-act="inc" aria-label="Increase quantity">+</button></div>
        </div>
        <div class="text-end"><strong>${money(i.price * i.qty)}</strong><br><button class="remove" type="button" data-act="rm">Remove</button></div>
      </div>`).join('') : '<div class="cart-empty">Your cart is empty.<br>Find your next pair ↓</div>';
    store.set('ss-cart', JSON.stringify(cart));
  }

  $$('.add').forEach(btn => btn.addEventListener('click', () => {
    const { id, name, price, img } = btn.dataset;
    const found = cart.find(i => i.id === id);
    if (found) found.qty++; else cart.push({ id, name, price: parseFloat(price), img, qty: 1 });
    renderCart(true);
    toast(`${name} added to cart`);
  }));

  itemsEl.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const id = b.closest('.cart-item').dataset.id;
    const item = cart.find(i => i.id === id);
    if (!item) return;
    if (b.dataset.act === 'inc') item.qty++;
    if (b.dataset.act === 'dec') item.qty--;
    if (b.dataset.act === 'rm' || item.qty <= 0) cart = cart.filter(i => i.id !== id);
    renderCart();
  });

  $('#checkout').addEventListener('click', () => toast(cart.length ? 'Demo template — checkout is not included' : 'Add a pair first!'));
  renderCart();

  /* ---------- Nav: glass on scroll, scroll progress, active link ---------- */
  const nav = $('#nav');
  const progress = $('#progress');
  let ticking = false;
  function onScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 24);
    const h = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${h > 0 ? Math.min(scrollY / h, 1) : 0})`;
    ticking = false;
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  const links = $$('.nav-link');
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('header[id], section[id]').forEach(s => spy.observe(s));
  $$('.navbar-nav a').forEach(a => a.addEventListener('click', () => {
    const c = $('#navbarNav');
    if (c.classList.contains('show')) bootstrap.Collapse.getOrCreateInstance(c).hide();
  }));

  /* ---------- Reveal on scroll ---------- */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries, o) => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); o.unobserve(e.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(el => io.observe(el));
  } else reveals.forEach(el => el.classList.add('in'));

  /* ---------- Count-up stats ---------- */
  const counters = $$('[data-count]');
  function runCount(el) {
    const target = +el.dataset.count;
    if (reduce) { el.textContent = target; return; }
    const t0 = performance.now(), dur = 1400;
    (function step(t) {
      const p = Math.min((t - t0) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  const co = new IntersectionObserver((entries, o) => entries.forEach(e => {
    if (e.isIntersecting) { runCount(e.target); o.unobserve(e.target); }
  }), { threshold: 0.6 });
  counters.forEach(c => co.observe(c));

  /* ---------- Desktop-only FX: 3D tilt + spotlight, magnetic buttons, cursor glow ---------- */
  if (fine && !reduce) {
    $$('[data-tilt]').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.classList.add('tilting');
        card.style.setProperty('--rx', ((0.5 - y) * 9).toFixed(2) + 'deg');
        card.style.setProperty('--ry', ((x - 0.5) * 11).toFixed(2) + 'deg');
        card.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', () => {
        card.classList.remove('tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });

    $$('[data-magnetic]').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.translate = `${((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1)}px`;
      });
      b.addEventListener('pointerleave', () => { b.style.translate = ''; });
    });

    const glow = $('#glow');
    let gx = 0, gy = 0, raf = 0;
    addEventListener('pointermove', e => {
      gx = e.clientX; gy = e.clientY;
      glow.classList.add('on');
      if (!raf) raf = requestAnimationFrame(() => { glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`; raf = 0; });
    }, { passive: true });
    document.addEventListener('pointerleave', () => glow.classList.remove('on'));
  }

  $('#year').textContent = new Date().getFullYear();
})();
