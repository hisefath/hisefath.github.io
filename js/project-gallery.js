const cards = [...document.querySelectorAll('.gallery-card')];
const filters = [...document.querySelectorAll('.gallery-filter')];
const search = document.querySelector('#project-search');
const count = document.querySelector('#gallery-count');
const empty = document.querySelector('#gallery-empty');
const clear = document.querySelector('#clear-filters');
const video = document.querySelector('.project-video');
const previewControl = document.querySelector('.preview-control');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let activeFilter = 'all';
let videoInView = false;
let manualPlayback = null;

function showProjects() {
  const query = search.value.trim().toLocaleLowerCase();
  let visible = 0;
  cards.forEach(card => {
    const categories = card.dataset.categories.split(' ');
    const matchesFilter = activeFilter === 'all' || categories.includes(activeFilter);
    const matchesSearch = !query || `${card.dataset.search} ${card.innerText}`.toLocaleLowerCase().includes(query);
    card.hidden = !(matchesFilter && matchesSearch);
    if (!card.hidden) visible++;
  });
  count.textContent = `Showing ${visible} ${visible === 1 ? 'project' : 'projects'}`;
  empty.hidden = visible !== 0;
  syncVideo();
}

function setFilter(filter) {
  activeFilter = filter;
  filters.forEach(button => {
    const selected = button.dataset.filter === filter;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  showProjects();
}

filters.forEach(button => button.addEventListener('click', () => setFilter(button.dataset.filter)));
search.addEventListener('input', showProjects);
clear.addEventListener('click', () => {
  search.value = '';
  setFilter('all');
  search.focus();
});

function loadVideo() {
  const source = video.querySelector('source');
  if (source.dataset.src) {
    source.src = source.dataset.src;
    delete source.dataset.src;
    video.load();
  }
}

function syncVideo() {
  const rect = video.getBoundingClientRect();
  const inView = videoInView || (rect.bottom > -100 && rect.top < window.innerHeight + 100);
  const canPlay = inView && !video.closest('.gallery-card').hidden && !document.hidden && manualPlayback !== 'pause' && (!reducedMotion.matches || manualPlayback === 'play');
  if (canPlay) {
    loadVideo();
    video.play().catch(() => {});
  } else {
    video.pause();
  }
  updatePreviewControl();
}

previewControl.addEventListener('click', () => {
  if (video.paused) {
    manualPlayback = 'play';
    videoInView = true;
  } else {
    manualPlayback = 'pause';
  }
  syncVideo();
  if (manualPlayback === 'play') requestAnimationFrame(syncVideo);
});
function updatePreviewControl() {
  previewControl.textContent = video.paused ? 'Play preview ▶' : 'Pause preview Ⅱ';
  previewControl.setAttribute('aria-label', video.paused ? 'Play Equinox demo' : 'Pause Equinox demo');
}
video.addEventListener('play', updatePreviewControl);
video.addEventListener('pause', updatePreviewControl);
document.addEventListener('visibilitychange', syncVideo);
reducedMotion.addEventListener('change', syncVideo);

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(([entry]) => {
    videoInView = entry.isIntersecting;
    syncVideo();
  }, { rootMargin: '100px 0px' });
  observer.observe(video);
} else {
  videoInView = true;
  syncVideo();
}

showProjects();
