(() => {
  'use strict';
  const bar = document.getElementById('reader-bar');
  const jump = document.getElementById('slide-jump');
  const status = document.getElementById('reader-status');
  const slides = [...document.querySelectorAll('.slide')];
  const modeButtons = [...document.querySelectorAll('[data-set-mode]')];
  const smaller = document.getElementById('font-smaller');
  const larger = document.getElementById('font-larger');
  const sizes = [18, 20, 21, 23, 25, 27];
  const storage = {
    get(key) { try { return localStorage.getItem('harness2-reader-' + key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem('harness2-reader-' + key, String(value)); } catch {} }
  };
  const url = new URL(location.href);
  const wantedMode = url.searchParams.get('mode') || storage.get('mode');
  let mode = wantedMode === 'short' ? 'short' : 'full';
  let fontIndex = sizes.indexOf(Number(storage.get('font')));
  if (fontIndex < 0) fontIndex = 2;
  let current = 1;
  let scheduled = false;
  const threshold = () => bar.getBoundingClientRect().height + 30;
  const activeSlide = () => {
    let n = 1;
    for (const slide of slides) {
      if (slide.getBoundingClientRect().top <= threshold()) n = Number(slide.dataset.slide);
      else break;
    }
    return n;
  };
  function updateURL(n) {
    const next = new URL(location.href);
    next.searchParams.set('mode', mode);
    next.hash = 'slide-' + n;
    history.replaceState(null, '', next);
  }
  function updateCurrent() {
    current = activeSlide();
    jump.value = String(current);
    updateURL(current);
    scheduled = false;
  }
  function goToSlide(n) {
    const slide = slides[n - 1];
    if (!slide) return;
    const top = scrollY + slide.getBoundingClientRect().top - bar.getBoundingClientRect().height - 18;
    window.scrollTo({ top: Math.max(0, top), behavior: 'instant' });
    current = n;
    jump.value = String(n);
    updateURL(n);
  }
  function applyMode(next, reposition) {
    const n = reposition ? activeSlide() : current;
    mode = next;
    document.querySelectorAll('.script').forEach(el => { el.hidden = el.dataset.mode !== mode; });
    modeButtons.forEach(el => el.setAttribute('aria-pressed', String(el.dataset.setMode === mode)));
    document.querySelectorAll('.mode-label').forEach(el => { el.textContent = mode === 'full' ? '完整版' : '加快版'; });
    storage.set('mode', mode);
    if (reposition) {
      goToSlide(n);
      status.textContent = '已切換至' + (mode === 'full' ? '完整版' : '加快版') + '，第 ' + n + ' 張開頭。';
    }
  }
  function applyFont(reposition) {
    const n = activeSlide();
    const visible = slides[n - 1].querySelector('.script:not([hidden])');
    const beats = [...visible.querySelectorAll('.script-beat')];
    const anchor = beats.find(el => el.getBoundingClientRect().bottom > threshold());
    const oldTop = anchor?.getBoundingClientRect().top;
    document.documentElement.style.setProperty('--read-size', sizes[fontIndex] + 'px');
    smaller.disabled = fontIndex === 0;
    larger.disabled = fontIndex === sizes.length - 1;
    storage.set('font', sizes[fontIndex]);
    if (reposition && anchor) window.scrollBy({top:anchor.getBoundingClientRect().top - oldTop,behavior:'instant'});
    status.textContent = '講稿字級 ' + sizes[fontIndex];
  }
  modeButtons.forEach(button => button.addEventListener('click', () => {
    if (button.dataset.setMode !== mode) applyMode(button.dataset.setMode, true);
  }));
  jump.addEventListener('change', () => goToSlide(Number(jump.value)));
  smaller.addEventListener('click', () => { if (fontIndex > 0) { fontIndex--; applyFont(true); } });
  larger.addEventListener('click', () => { if (fontIndex < sizes.length - 1) { fontIndex++; applyFont(true); } });
  document.querySelectorAll('a[href^="#slide-"]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    goToSlide(Number(link.getAttribute('href').slice(7)));
  }));
  document.querySelectorAll('.close-support').forEach(button => button.addEventListener('click', () => {
    const details = button.closest('details');
    details.open = false;
    const top = scrollY + details.getBoundingClientRect().top - bar.getBoundingClientRect().height - 18;
    window.scrollTo({top:Math.max(0,top),behavior:'instant'});
    details.querySelector('summary').focus({preventScroll:true});
  }));
  window.addEventListener('scroll', () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateCurrent); }
  }, {passive:true});
  window.addEventListener('resize', () => requestAnimationFrame(updateCurrent));
  const measureBar = () => document.documentElement.style.setProperty('--bar-height',bar.getBoundingClientRect().height+'px');
  new ResizeObserver(measureBar).observe(bar);
  window.addEventListener('hashchange', () => {
    const n = Number(location.hash.replace('#slide-',''));
    if (n >= 1 && n <= 12) goToSlide(n);
  });
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const initial = Number(url.hash.replace('#slide-',''));
  current = initial >= 1 && initial <= 12 ? initial : 1;
  applyMode(mode, false);
  applyFont(false);
  measureBar();
  requestAnimationFrame(() => goToSlide(current));
})();
