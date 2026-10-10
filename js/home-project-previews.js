const homePreview = document.querySelector('.home-project-video');
const homePreviewButton = document.querySelector('.home-preview-control');
const homeReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let homePreviewVisible = false;
let homePreviewChoice = null;

function loadHomePreview() {
  const source = homePreview.querySelector('source');
  if (source.dataset.src) {
    source.src = source.dataset.src;
    delete source.dataset.src;
    homePreview.load();
  }
}

function updateHomePreviewButton() {
  const playing = !homePreview.paused;
  homePreviewButton.textContent = playing ? 'Pause preview Ⅱ' : 'Play preview ▶';
  homePreviewButton.setAttribute('aria-label', playing ? 'Pause Equinox demo' : 'Play Equinox demo');
}

function syncHomePreview() {
  const rect = homePreview.getBoundingClientRect();
  const nearViewport = rect.bottom > -80 && rect.top < window.innerHeight + 80;
  const shouldPlay = homePreviewVisible && nearViewport && !document.hidden &&
    homePreviewChoice !== 'pause' && (!homeReducedMotion.matches || homePreviewChoice === 'play');
  if (shouldPlay) {
    loadHomePreview();
    homePreview.play().catch(() => {});
  } else {
    homePreview.pause();
  }
  updateHomePreviewButton();
}

homePreviewButton.addEventListener('click', () => {
  homePreviewChoice = homePreview.paused ? 'play' : 'pause';
  homePreviewVisible = true;
  syncHomePreview();
  requestAnimationFrame(syncHomePreview);
});
homePreview.addEventListener('play', updateHomePreviewButton);
homePreview.addEventListener('pause', updateHomePreviewButton);
document.addEventListener('visibilitychange', syncHomePreview);
homeReducedMotion.addEventListener('change', syncHomePreview);

if ('IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => {
    homePreviewVisible = entry.isIntersecting;
    syncHomePreview();
  }, {rootMargin: '80px 0px'}).observe(homePreview);
} else {
  homePreviewVisible = true;
  window.addEventListener('scroll', syncHomePreview, {passive: true});
  syncHomePreview();
}
