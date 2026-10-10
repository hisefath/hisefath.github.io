(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let timer;
  let active;

  function clearGlow() {
    active?.classList.remove('is-glowing');
    active = undefined;
  }

  function pulse() {
    clearGlow();
    if (!document.hidden && !reducedMotion.matches) {
      const candidates = [...document.querySelectorAll('.hero-system, .decision-card, .ownership-grid article, .layer-list details[open]')]
        .filter((element) => {
          const box = element.getBoundingClientRect();
          return box.bottom > 80 && box.top < window.innerHeight - 80;
        });
      if (candidates.length) {
        active = candidates[Math.floor(Math.random() * candidates.length)];
        active.classList.add('is-glowing');
        window.setTimeout(clearGlow, 2300);
      }
    }
    timer = window.setTimeout(pulse, 5300 + Math.random() * 5400);
  }

  document.addEventListener('visibilitychange', () => {
    clearGlow();
    window.clearTimeout(timer);
    if (!document.hidden) pulse();
  });
  reducedMotion.addEventListener('change', () => {
    clearGlow();
    window.clearTimeout(timer);
    if (!reducedMotion.matches) pulse();
  });
  if (!reducedMotion.matches) timer = window.setTimeout(pulse, 4100);
})();
