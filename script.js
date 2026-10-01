// Progressive enhancement only: the page is fully readable without this file.
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // Latest pointer position, shared by the cursor and the lighting.
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

  // ---- Jump to a project: the slideshow replaces this with its own version ----
  let projectNav = (i) => {
    const item = document.querySelectorAll('.projects > .project')[i];
    if (item) scrollToY(item.getBoundingClientRect().top + window.scrollY - 40);
  };
  const goToProject = (i) => projectNav(i);

  // ---- Hero terminal: replays its own content as a typing sequence, then stays live ----
  const term = document.querySelector('[data-term]');
  if (term) initTerminal(term);

  function initTerminal(root) {
    const body = root.querySelector('[data-term-body]');
    const form = root.querySelector('[data-term-form]');
    const input = form.querySelector('input');
    const promptSpans = [...form.children].filter((el) => el.tagName === 'SPAN');
    const projects = [...body.querySelectorAll('[data-project]')].map((a) => a.textContent.replace(/\/$/, ''));
    const email = document.querySelector('[data-copy]')?.dataset.copy || '';
    const github = 'https://github.com/varundevarajrvu';

    body.addEventListener('click', (e) => {
      const a = e.target.closest('[data-project]');
      if (!a) return;
      e.preventDefault();
      e.stopPropagation(); // keep Lenis' anchor handler from also jumping to #work
      goToProject(+a.dataset.project);
    });

    // ---------- intro: type the commands, reveal the output ----------
    let skipped = false;
    let done = false;
    const wait = (ms) => new Promise((r) => setTimeout(r, skipped ? 0 : ms));
    const steps = [...body.children].filter((el) => el !== form);

    const finish = () => {
      done = true;
      root.classList.remove('is-typing');
      root.classList.add('is-done');
      form.classList.remove('t-hidden');
    };

    async function play() {
      root.classList.add('is-typing');
      steps.forEach((el) => el.classList.add('t-hidden'));
      form.classList.add('t-hidden');
      await wait(450);
      for (const el of steps) {
        const cmd = el.classList.contains('term__line') && el.querySelector('.t-cmd');
        el.classList.remove('t-hidden');
        if (cmd) {
          const text = cmd.textContent;
          cmd.textContent = '';
          el.classList.add('is-active');
          await wait(320);
          for (const ch of text) {
            if (skipped) break;
            cmd.textContent += ch;
            await wait(40 + Math.random() * 60);
          }
          cmd.textContent = text;
          el.classList.remove('is-active');
          await wait(240);
        } else {
          await wait(el.classList.contains('term__banner') ? 520 : 80);
        }
      }
      finish();
    }

    if (reduceMotion) {
      finish();
    } else {
      const skip = () => { if (!done) skipped = true; };
      root.addEventListener('click', skip);
      window.addEventListener('keydown', skip);
      window.addEventListener('wheel', skip, { passive: true });
      window.addEventListener('touchmove', skip, { passive: true });
      play();
    }

    // after the intro, clicking empty terminal space focuses the prompt
    root.addEventListener('click', (e) => {
      if (done && !e.target.closest('a, button, input')) input.focus({ preventScroll: true });
    });

    // ---------- live prompt ----------
    const el = (tag, cls, text) => {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    };
    const print = (...parts) => {
      const p = el('p', 'term__out');
      p.append(...parts);
      body.insertBefore(p, form);
      return p;
    };
    const link = (text, href, onClick) => {
      const a = el('a', null, text);
      a.href = href;
      if (href.startsWith('http')) { a.target = '_blank'; a.rel = 'noopener'; }
      if (onClick) a.addEventListener('click', (e) => { e.stopPropagation(); onClick(e); });
      return a;
    };
    const dim = (t) => el('span', 't-dim', t);
    const echo = (cmd) => {
      const line = el('div', 'term__line');
      promptSpans.forEach((sp) => line.append(sp.cloneNode(true)));
      line.append(' ', el('span', 't-cmd', cmd));
      body.insertBefore(line, form);
    };

    const commands = {
      help() {
        [['whoami', 'who I am'], ['ls', 'list projects'], ['open <project>', 'jump to a project'],
          ['contact', 'how to reach me'], ['github', 'open my GitHub'], ['clear', 'clear the screen']]
          .forEach(([c, d]) => print(el('span', 't-user t-pad', c), dim(d)));
      },
      whoami() {
        print(el('strong', null, 'Varun Devaraj'), dim(' · '), 'AIML student @ RV University');
        print('I build AI that runs on your machine — voice, vision & language models. No cloud.').classList.add('t-soft');
      },
      ls() {
        const p = print();
        p.classList.add('term__ls');
        projects.forEach((name, i) => p.append(link(`${name}/`, '#work', (e) => { e.preventDefault(); goToProject(i); }), ' '));
      },
      open(arg) {
        const i = projects.indexOf((arg || '').replace(/\/$/, '').toLowerCase());
        if (i < 0) { print(dim(arg ? `open: no such project: ${arg} (try ls)` : 'usage: open <project>  (try ls)')); return; }
        print(dim(`opening ${projects[i]}…`));
        goToProject(i);
      },
      contact() {
        print(el('span', 't-user t-pad', 'email'), link(email, `mailto:${email}`));
        print(el('span', 't-user t-pad', 'github'), link('github.com/varundevarajrvu', github));
      },
      github() {
        print(dim('opening github.com/varundevarajrvu…'));
        window.open(github, '_blank', 'noopener');
      },
      clear() {
        [...body.children].forEach((n) => { if (n !== form) n.remove(); });
      },
      sudo() {
        print(dim('nice try. this machine only takes orders from varun.'));
      },
    };
    const aliases = { projects: 'ls', dir: 'ls', cd: 'open', email: 'contact', about: 'whoami', cls: 'clear' };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const raw = input.value.trim();
      input.value = '';
      echo(raw);
      if (raw) {
        const [name, ...rest] = raw.split(/\s+/);
        const key = name.toLowerCase();
        const fn = commands[aliases[key] || key];
        if (fn) fn(rest.join(' '));
        else print(dim(`command not found: ${name} — try 'help'`));
      }
      body.scrollTop = body.scrollHeight;
    });
  }

  // ---- Copy-to-clipboard buttons ----
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.textContent = 'Copied ✓';
      } catch {
        btn.textContent = 'Press Ctrl+C';
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(btn.previousElementSibling);
        sel.removeAllRanges();
        sel.addRange(range);
      }
      setTimeout(() => { btn.textContent = 'Copy'; }, 1800);
    });
  });

  requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('is-loaded')));

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

  // ---- Light pool that trails the pointer across the work stage ----
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

  // ---- Hero: the terminal recedes as you scroll away ----
  const hero = document.querySelector('.hero');
  if (hero && term && !reduceMotion) {
    let heroFrame = 0;
    const updateHero = () => {
      heroFrame = 0;
      const p = clamp(window.scrollY / (hero.offsetHeight * 0.9), 0, 1);
      if (p === 0) {
        // at the top, hand control back to the stylesheet (lets the entrance fade play)
        term.style.transform = '';
        term.style.opacity = '';
        return;
      }
      term.style.transform = `translate3d(0, ${(p * -50).toFixed(1)}px, 0) scale(${(1 - p * 0.08).toFixed(4)})`;
      term.style.opacity = `${(1 - p * 0.9).toFixed(3)}`;
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

    projectNav = (i) => {
      const top = root.getBoundingClientRect().top + window.scrollY;
      scrollToY(top + (clamp(i, 0, n - 1) + 0.5) * segment());
    };

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
