// Progressive enhancement only: the page is fully readable without this file.
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Avatar: optional image swap ----
  const avatar = document.querySelector('[data-avatar]');
  const customSrc = avatar && avatar.dataset.avatarSrc;
  if (customSrc) {
    const img = new Image();
    img.className = 'avatar__img';
    img.alt = 'Portrait of Varun';
    img.src = customSrc;
    img.onload = () => avatar.replaceChildren(img);
  }

  // ---- Avatar: eyes follow the pointer, head tilts toward it ----
  const svg = avatar && avatar.querySelector('.avatar__svg');
  const pupils = svg ? [...svg.querySelectorAll('[data-pupil]')] : [];
  const MAX_PUPIL = 14; // in SVG units
  const MAX_TILT = 10; // degrees

  let target = null;
  let frame = 0;

  function look() {
    frame = 0;
    if (!svg || !target) return;
    const rect = svg.getBoundingClientRect();
    if (!rect.width) return;
    const scale = 400 / rect.width;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    pupils.forEach((pupil) => {
      const eye = pupil.closest('[data-eye]').querySelector('circle');
      const ex = rect.left + eye.cx.baseVal.value / scale;
      const ey = rect.top + eye.cy.baseVal.value / scale;
      const dx = target.x - ex;
      const dy = target.y - ey;
      const dist = Math.hypot(dx, dy) || 1;
      const reach = Math.min(MAX_PUPIL, (dist * scale) / 12);
      pupil.style.transform = `translate(${(dx / dist) * reach}px, ${(dy / dist) * reach}px)`;
    });

    if (!reduceMotion) {
      const nx = Math.max(-1, Math.min(1, (target.x - cx) / (window.innerWidth / 2)));
      const ny = Math.max(-1, Math.min(1, (target.y - cy) / (window.innerHeight / 2)));
      svg.style.setProperty('--tilt-y', `${nx * MAX_TILT}deg`);
      svg.style.setProperty('--tilt-x', `${-ny * MAX_TILT}deg`);
    }
  }

  function aim(x, y) {
    target = { x, y };
    if (!frame) frame = requestAnimationFrame(look);
  }

  if (svg) {
    window.addEventListener('pointermove', (e) => aim(e.clientX, e.clientY), { passive: true });

    // Touch devices have no hover: let the eyes wander on their own.
    if (!window.matchMedia('(hover: hover)').matches && !reduceMotion) {
      let t = 0;
      setInterval(() => {
        t += 1;
        const rect = svg.getBoundingClientRect();
        const angle = t * 1.7;
        aim(
          rect.left + rect.width / 2 + Math.cos(angle) * rect.width,
          rect.top + rect.height / 2 + Math.sin(angle) * rect.height * 0.6
        );
      }, 1800);
    }
  }

  // ---- Reveal on scroll ----
  const revealables = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window) || reduceMotion) {
    revealables.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.08 }
  );
  revealables.forEach((el) => io.observe(el));
})();
