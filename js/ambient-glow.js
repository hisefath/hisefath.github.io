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
      const candidates = [...document.querySelectorAll('.hero-system, .decision-card, .ownership-grid article, .layer-list details[open], .ai-board, .projects .project-card, .gallery-card')]
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

/* One five-second highlight per viewport entry. Leaving the viewport rearms it. */
(() => {
  const targets = document.querySelectorAll('.viewport-glow-target');
  if (!targets.length || !('IntersectionObserver' in window)) return;

  const triggered = new WeakSet();
  const timers = new WeakMap();
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const element = entry.target;
      if (!entry.isIntersecting) {
        triggered.delete(element);
        window.clearTimeout(timers.get(element));
        element.classList.remove('is-viewport-glowing');
        continue;
      }
      if (entry.intersectionRatio < 0.2 || triggered.has(element) || document.hidden) continue;

      triggered.add(element);
      element.classList.add('is-viewport-glowing');
      timers.set(element, window.setTimeout(() => {
        element.classList.remove('is-viewport-glowing');
      }, 5000));
    }
  }, { threshold: [0, 0.2] });

  targets.forEach((element) => observer.observe(element));
})();
