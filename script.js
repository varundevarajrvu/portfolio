// Progressive enhancement only: the page is fully readable without this file.
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // Latest pointer position, shared by the cursor, the lighting and the avatar.
  const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 3, seen: false };
  window.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.seen = true;
  }, { passive: true });

  // ---- Smooth, inertial scrolling (Lenis) ----
  let lenis = null;
  if (window.Lenis && !reduceMotion) {
    lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.9, anchors: true, autoRaf: true });
  }
  const scrollToY = (y) => (lenis ? lenis.scrollTo(y, { duration: 1.4 }) : window.scrollTo({ top: y, behavior: 'smooth' }));

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

  // ---- Avatar: eyes follow the pointer, head tilts, and it is lit from the pointer ----
  const svg = avatar && avatar.querySelector('.avatar__svg');
  if (svg) {
    const pupils = [...svg.querySelectorAll('[data-pupil]')];
    const bodyLight = svg.querySelector('#av-body');
    const rimLight = svg.querySelector('#av-rim');
    const gloss = [...svg.querySelectorAll('[data-gloss]')];
    const MAX_PUPIL = 14; // SVG units
    const MAX_TILT = 10; // degrees
    let lx = -0.55;
    let ly = -0.75;
    let lastX = NaN;
    let lastY = NaN;

    const look = (x, y) => {
      const rect = svg.getBoundingClientRect();
      if (!rect.width || rect.bottom < 0) return;
      const scale = 400 / rect.width;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      pupils.forEach((pupil) => {
        const eye = pupil.closest('[data-eye]').querySelector('circle');
        const dx = x - (rect.left + eye.cx.baseVal.value / scale);
        const dy = y - (rect.top + eye.cy.baseVal.value / scale);
        const dist = Math.hypot(dx, dy) || 1;
        const reach = Math.min(MAX_PUPIL, (dist * scale) / 12);
        pupil.style.transform = `translate(${(dx / dist) * reach}px, ${(dy / dist) * reach}px)`;
      });

      // direction from the head to the pointer, -1..1
      const nx = clamp((x - cx) / (window.innerWidth / 2), -1, 1);
      const ny = clamp((y - cy) / (window.innerHeight / 2), -1, 1);
      if (!reduceMotion) {
        svg.style.setProperty('--tilt-y', `${nx * MAX_TILT}deg`);
        svg.style.setProperty('--tilt-x', `${-ny * MAX_TILT}deg`);
      }

      // the light source sits where the pointer is: move the key light and the
      // specular highlight toward it, and push the warm rim light to the far side
      lx = lerp(lx, nx, 0.12);
      ly = lerp(ly, ny, 0.12);
      bodyLight.setAttribute('cx', `${(50 + lx * 26).toFixed(2)}%`);
      bodyLight.setAttribute('cy', `${(48 + ly * 26).toFixed(2)}%`);
      rimLight.setAttribute('cx', `${(50 - lx * 34).toFixed(2)}%`);
      rimLight.setAttribute('cy', `${(56 - ly * 34).toFixed(2)}%`);
      gloss.forEach((g) => g.setAttribute('transform', `translate(${(62 + lx * 95).toFixed(1)} ${(92 + ly * 95).toFixed(1)})`));
      return Math.abs(nx - lx) + Math.abs(ny - ly) > 0.004;
    };

    let wander = 0;
    let easing = false;
    const tick = () => {
      if (pointer.seen) {
        // only repaint the avatar while the pointer moves or the light is still easing
        if (easing || pointer.x !== lastX || pointer.y !== lastY) {
          lastX = pointer.x;
          lastY = pointer.y;
          easing = look(pointer.x, pointer.y);
        }
      } else if (!finePointer && !reduceMotion) {
        // touch devices have no hover: let the eyes and the light drift on their own
        wander += 0.006;
        const r = svg.getBoundingClientRect();
        look(r.left + r.width / 2 + Math.cos(wander * 3) * r.width, r.top + r.height / 2 + Math.sin(wander * 2) * r.height * 0.7);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ---- Custom cursor: a trailing dot that inverts what it passes over ----
  if (finePointer && !reduceMotion) {
    const cursor = document.createElement('div');
    cursor.className = 'cursor';
    cursor.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cursor);
    document.documentElement.classList.add('has-cursor');

    let cx = pointer.x;
    let cy = pointer.y;
    let scrollTimer = 0;

    document.addEventListener('pointerover', (e) => {
      cursor.classList.toggle('is-hover', !!e.target.closest('a, button, [data-cursor]'));
    });
    document.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));
    document.addEventListener('pointerenter', () => cursor.classList.remove('is-hidden'));
    window.addEventListener('pointerdown', () => cursor.classList.add('is-down'));
    window.addEventListener('pointerup', () => cursor.classList.remove('is-down'));
    window.addEventListener('scroll', () => {
      cursor.classList.add('is-scrolling');
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => cursor.classList.remove('is-scrolling'), 380);
    }, { passive: true });

    const follow = () => {
      // idle once the dot has caught up with the pointer
      if (Math.abs(pointer.x - cx) + Math.abs(pointer.y - cy) > 0.1) {
        cx = lerp(cx, pointer.x, 0.2);
        cy = lerp(cy, pointer.y, 0.2);
        cursor.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
        if (pointer.seen && !cursor.classList.contains('is-ready')) cursor.classList.add('is-ready');
      }
      requestAnimationFrame(follow);
    };
    requestAnimationFrame(follow);
  }

  // ---- Light pools that trail the pointer (hero + work stage) ----
  const lights = [];
  const addLight = (host) => {
    const el = document.createElement('div');
    el.className = 'light';
    el.setAttribute('aria-hidden', 'true');
    host.appendChild(el);
    lights.push({ host, el, x: 0, y: 0 });
  };
  if (finePointer && !reduceMotion) {
    // only measure while something moved: the pointer, the page, or a light still easing
    let dirty = true;
    const wake = () => { dirty = true; };
    window.addEventListener('pointermove', wake, { passive: true });
    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('resize', wake);
    const runLights = () => {
      if (!dirty) { requestAnimationFrame(runLights); return; }
      dirty = false;
      const rects = lights.map((l) => l.host.getBoundingClientRect()); // read first, then write
      lights.forEach((l, i) => {
        const r = rects[i];
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        const tx = pointer.x - r.left;
        const ty = pointer.y - r.top;
        if (Math.abs(tx - l.x) + Math.abs(ty - l.y) < 0.5) return;
        dirty = true; // still easing toward the pointer
        l.x = lerp(l.x, tx, 0.08);
        l.y = lerp(l.y, ty, 0.08);
        l.el.style.transform = `translate3d(${l.x.toFixed(1)}px, ${l.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      });
      requestAnimationFrame(runLights);
    };
    requestAnimationFrame(runLights);
  }

  // ---- Hero: headline zooms through and the avatar recedes as you scroll away ----
  const hero = document.querySelector('.hero');
  if (hero && !reduceMotion) {
    if (finePointer) addLight(hero);
    const title = hero.querySelector('.hero__title');
    let heroFrame = 0;
    const updateHero = () => {
      heroFrame = 0;
      const p = clamp(window.scrollY / (hero.offsetHeight * 0.9), 0, 1);
      if (title) {
        title.style.transform = `scale(${1 + p * p * 3.5})`;
        title.style.opacity = `${1 - p * 1.25}`;
      }
      if (avatar) {
        avatar.style.transform = `translate3d(0, ${p * -60}px, 0) scale(${1 - p * 0.25})`;
        avatar.style.opacity = `${1 - p * 1.1}`;
      }
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

    const lazyImg = (src) => {
      const img = new Image();
      img.src = src;
      img.alt = '';
      img.decoding = 'async';
      img.loading = 'lazy';
      return img;
    };

    slides.forEach((slide) => {
      slide.removeAttribute('data-reveal');
      const bg = document.createElement('div');
      bg.className = 'project__bg';
      bg.setAttribute('aria-hidden', 'true');
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
    if (finePointer) addLight(stage);

    root.style.setProperty('--n', n);
    root.classList.add('is-on');

    let current = -1;
    let cleanup = 0;

    const segment = () => (root.offsetHeight - window.innerHeight) / n;
    const indexFromScroll = () => {
      const scrolled = -root.getBoundingClientRect().top;
      return clamp(Math.floor(scrolled / segment()), 0, n - 1);
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
        const stack = document.getElementById('stack');
        scrollToY(stack.getBoundingClientRect().top + window.scrollY);
        return;
      }
      const top = root.getBoundingClientRect().top + window.scrollY;
      // land in the middle of the next segment so a small overshoot can't skip it
      scrollToY(top + (current + 1.5) * segment());
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
