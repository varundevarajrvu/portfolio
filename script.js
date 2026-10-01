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

  // ---- Hero: headline zooms through and the avatar defocuses as you scroll away ----
  const hero = document.querySelector('.hero');
  if (hero && !reduceMotion) {
    let heroFrame = 0;
    const updateHero = () => {
      heroFrame = 0;
      const p = Math.min(1, Math.max(0, window.scrollY / (hero.offsetHeight * 0.9)));
      hero.style.setProperty('--hp', p.toFixed(3));
    };
    window.addEventListener('scroll', () => { if (!heroFrame) heroFrame = requestAnimationFrame(updateHero); }, { passive: true });
    updateHero();
  }

  // ---- Work: pinned full-screen slides, advanced by scroll ----
  const showcase = document.querySelector('[data-showcase]');
  if (showcase && !reduceMotion) initShowcase(showcase);

  function initShowcase(root) {
    const list = root.querySelector('.projects');
    const slides = [...list.children];
    const n = slides.length;
    const pad = (i) => String(i + 1).padStart(2, '0');

    const stage = document.createElement('div');
    stage.className = 'showcase__stage';
    root.insertBefore(stage, list);
    stage.appendChild(list);

    slides.forEach((slide) => {
      slide.removeAttribute('data-reveal');
      const bg = document.createElement('div');
      bg.className = 'project__bg';
      bg.setAttribute('aria-hidden', 'true');
      const lazyImg = (src) => {
        const img = new Image();
        img.src = src;
        img.alt = '';
        img.decoding = 'async';
        img.loading = 'lazy';
        return img;
      };
      if (slide.dataset.bg) {
        // ambient: a pre-blurred copy fills the screen; the sharp screenshot floats as a card
        bg.appendChild(lazyImg(slide.dataset.bg.replace(/\.webp$/, '-amb.webp')));
        const shot = document.createElement('figure');
        shot.className = 'project__shot';
        shot.setAttribute('aria-hidden', 'true');
        const frame = document.createElement('div');
        frame.className = 'project__frame';
        frame.appendChild(lazyImg(slide.dataset.bg));
        shot.appendChild(frame);
        slide.prepend(bg, shot);
      } else {
        bg.classList.add('project__bg--art');
        slide.prepend(bg);
      }
    });

    const progress = document.createElement('div');
    progress.className = 'showcase__progress';
    progress.setAttribute('aria-hidden', 'true');
    progress.innerHTML = '<span></span>'.repeat(n);
    const bars = [...progress.children];

    const hud = document.createElement('div');
    hud.className = 'showcase__hud';
    hud.innerHTML =
      `<span class="showcase__count" aria-live="polite"><b>01</b> / ${pad(n - 1)}</span>` +
      '<button class="showcase__next" type="button" aria-label="Next project">↓</button>';
    const countEl = hud.querySelector('b');
    const nextBtn = hud.querySelector('button');
    stage.append(progress, hud);

    root.style.setProperty('--n', n);
    root.classList.add('is-on');

    let current = -1;
    let cleanup = 0;

    const segment = () => (root.offsetHeight - window.innerHeight) / n;
    const indexFromScroll = () => {
      const scrolled = -root.getBoundingClientRect().top;
      return Math.min(n - 1, Math.max(0, Math.floor(scrolled / segment())));
    };

    function show(next, animate) {
      if (next === current) return;
      const dir = next > current ? 'fwd' : 'back';
      const prev = slides[current];
      clearTimeout(cleanup);

      slides.forEach((s) => s.classList.remove('is-active', 'is-leaving', 'is-animating', 'fwd', 'back'));
      if (prev && animate) prev.classList.add('is-leaving', dir);
      slides[next].classList.add('is-active', dir);
      if (animate) slides[next].classList.add('is-animating');

      slides.forEach((s, i) => s.setAttribute('aria-hidden', i === next ? 'false' : 'true'));
      bars.forEach((b, i) => b.classList.toggle('is-done', i <= next));
      countEl.textContent = pad(next);
      nextBtn.setAttribute('aria-label', next === n - 1 ? 'Continue to stack' : 'Next project');

      current = next;
      cleanup = setTimeout(() => {
        slides.forEach((s) => s.classList.remove('is-leaving', 'is-animating'));
      }, 2000);
    }

    nextBtn.addEventListener('click', () => {
      if (current >= n - 1) {
        document.getElementById('stack').scrollIntoView({ behavior: 'smooth' });
        return;
      }
      const top = root.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top + (current + 1) * segment() + 2, behavior: 'smooth' });
    });

    let frame = 0;
    window.addEventListener('scroll', () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        show(indexFromScroll(), true);
      });
    }, { passive: true });

    show(indexFromScroll(), false);
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
