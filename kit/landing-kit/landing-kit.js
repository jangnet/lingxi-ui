// landing-kit.js — behaviour for landing-kit.css. Call initLandingKit() once after DOM ready.
import { mountLiquidRipple } from './liquid-ripple.js';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };

// Rotating keyword with [ ] frame: <span class="lk-rotator" data-words="网页|Logo|宣传片"><i></i><i></i><i></i><i></i><span class="lk-rotator-word">网页</span></span>
export function initRotator(el, interval = 2600) {
  const words = el.dataset.words.split('|'); let i = 0;
  const word = el.querySelector('.lk-rotator-word');
  el.setAttribute('aria-live', 'off'); // decorative cycling; the full list is in aria-label
  el.setAttribute('aria-label', words.join('、'));
  const fit = () => { el.style.width = ''; const w = word.getBoundingClientRect().width; el.style.width = `calc(${w}px + .28em)`; };
  fit(); addEventListener('resize', fit);
  if (reduced() || words.length < 2) return;
  let timer = setInterval(() => {
    if (document.hidden) return;
    word.classList.add('is-leaving');
    setTimeout(() => {
      i = (i + 1) % words.length; word.textContent = words[i];
      word.classList.remove('is-leaving'); word.classList.add('is-entering');
      fit(); requestAnimationFrame(() => requestAnimationFrame(() => word.classList.remove('is-entering')));
    }, 420);
  }, interval);
  return () => clearInterval(timer);
}

// Rotating badge text: <span class="lk-badge"><span class="lk-badge-rail"><span>一</span><span>二</span></span></span>
export function initBadge(el, interval = 3200) {
  const items = [...el.querySelectorAll('.lk-badge-rail > span')]; let i = 0;
  items.forEach((s, k) => s.dataset.state = k ? 'wait' : 'in');
  if (reduced() || items.length < 2) return;
  setInterval(() => {
    if (document.hidden) return;
    const cur = items[i]; i = (i + 1) % items.length; const next = items[i];
    cur.dataset.state = 'out'; next.dataset.state = 'in';
    setTimeout(() => { if (cur !== items[i]) cur.dataset.state = 'wait'; }, 520);
  }, interval);
}

// Mega menu: hover with grace period, click/Enter/Space toggles, Esc closes, arrows move inside.
export function initMegaMenus(root = document) {
  const items = [...root.querySelectorAll('.lk-nav-item')];
  let closeT = 0;
  const close = (item, focus) => { item.classList.remove('is-open'); item.querySelector('.lk-nav-trigger').setAttribute('aria-expanded', 'false'); if (focus) item.querySelector('.lk-nav-trigger').focus(); };
  const open = item => { items.forEach(o => o !== item && close(o)); item.classList.add('is-open'); item.querySelector('.lk-nav-trigger').setAttribute('aria-expanded', 'true'); };
  for (const item of items) {
    const trig = item.querySelector('.lk-nav-trigger'), panel = item.querySelector('.lk-mega');
    trig.setAttribute('aria-expanded', 'false'); trig.setAttribute('aria-controls', panel.id);
    item.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { clearTimeout(closeT); open(item); } });
    item.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') closeT = setTimeout(() => close(item), 150); });
    trig.addEventListener('click', () => item.classList.contains('is-open') ? close(item) : open(item));
    trig.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { e.preventDefault(); open(item); panel.querySelector('a')?.focus(); } });
    panel.addEventListener('keydown', e => {
      const links = [...panel.querySelectorAll('a')], k = links.indexOf(document.activeElement);
      if (e.key === 'Escape') close(item, true);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); links[(k + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length].focus(); }
    });
    item.addEventListener('focusout', e => { if (!item.contains(e.relatedTarget)) close(item); });
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') items.forEach(i => i.classList.contains('is-open') && close(i, true)); });
  document.addEventListener('pointerdown', e => items.forEach(i => !i.contains(e.target) && close(i)));
}

// Reveal on scroll ([data-reveal], stagger via style="--i:n") and line-art draw-on (.lk-step)
export function initReveal(root = document) {
  root.querySelectorAll('.lk-step svg [data-draw]').forEach(p => { try { p.style.setProperty('--len', Math.ceil(p.getTotalLength())); } catch {} });
  const targets = root.querySelectorAll('[data-reveal], .lk-step');
  if (reduced() || !('IntersectionObserver' in window)) { targets.forEach(t => t.classList.add('is-in')); return; }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
  targets.forEach(t => io.observe(t));
}

// Stacked code windows: <div class="lk-stack"> .lk-win × n </div> + <div class="lk-dots">
export function initStack(stack, dots, interval = 5000) {
  const wins = [...stack.querySelectorAll('.lk-win')]; let cur = 0;
  const dotBtns = wins.map((w, k) => { const b = document.createElement('button'); b.className = 'lk-dot'; b.type = 'button'; b.setAttribute('aria-label', `第 ${k + 1} 个示例`); b.onclick = () => { show(k); restart(); }; return b; });
  const prev = dots.querySelector('[data-prev]'), next = dots.querySelector('[data-next]');
  next.before(...dotBtns);
  const show = k => { cur = (k + wins.length) % wins.length; wins.forEach((w, j) => { const d = (j - cur + wins.length) % wins.length; w.dataset.depth = Math.min(d, 2); w.inert = d !== 0; w.setAttribute('aria-hidden', d !== 0); }); dotBtns.forEach((b, j) => b.setAttribute('aria-current', j === cur)); };
  prev.onclick = () => { show(cur - 1); restart(); }; next.onclick = () => { show(cur + 1); restart(); };
  let t; const restart = () => { clearInterval(t); if (!reduced()) t = setInterval(() => !document.hidden && show(cur + 1), interval); };
  stack.addEventListener('pointerenter', () => clearInterval(t)); stack.addEventListener('pointerleave', restart);
  show(0); restart();
}

export function initBackToTop(btn) {
  const on = () => btn.classList.toggle('is-shown', scrollY > innerHeight); addEventListener('scroll', on, { passive: true }); on();
  btn.addEventListener('click', () => scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' }));
}

// Theme: system → light → dark, persisted. Put the 1-line pre-paint script in <head> too.
export function initThemeToggle(btn) {
  const order = ['system', 'light', 'dark'];
  const apply = m => { if (m === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = m; btn.setAttribute('aria-label', `主题：${{ system: '跟随系统', light: '浅色', dark: '深色' }[m]}`); };
  let mode = store.get('lk.theme') || 'system'; apply(mode);
  btn.addEventListener('click', () => { mode = order[(order.indexOf(mode) + 1) % 3]; store.set('lk.theme', mode); apply(mode); });
}

export function initLandingKit() {
  document.querySelectorAll('.liquid-ripple').forEach(el => mountLiquidRipple(el, JSON.parse(el.dataset.options || '{}')));
  document.querySelectorAll('.lk-rotator').forEach(el => initRotator(el));
  document.querySelectorAll('.lk-badge').forEach(el => initBadge(el));
  initMegaMenus();
  initReveal();
  document.querySelectorAll('.lk-stack').forEach(s => initStack(s, s.nextElementSibling));
  const top = document.querySelector('.lk-top'); if (top) initBackToTop(top);
  const theme = document.querySelector('[data-theme-toggle]'); if (theme) initThemeToggle(theme);
}
