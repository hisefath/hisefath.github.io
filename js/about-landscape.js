const aboutSection = document.querySelector('.about');

if (aboutSection) {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      aboutSection.classList.toggle('is-visible', entry.isIntersecting);
    }, { threshold: 0.08 });
    observer.observe(aboutSection);
  } else {
    aboutSection.classList.add('is-visible');
  }
}
