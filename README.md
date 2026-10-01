# Portfolio — Varun Devaraj

A single-page portfolio. Plain HTML, CSS and a little JS: no framework, no build step, no dependencies.

```
index.html   content (all projects are written inline, so they render without JS)
styles.css   design tokens at the top, sections below, responsive rules at the end
script.js    progressive enhancement: avatar eye-tracking, scroll reveals
```

## Run locally

Open `index.html` directly, or serve the folder:

```bash
python -m http.server 8000
```

## Deploy (GitHub Pages)

Repo **Settings → Pages → Build and deployment → Deploy from a branch**, pick the branch and `/ (root)`.
The site is served at `https://varundevarajrvu.github.io/portfolio/`. `.nojekyll` is included so Pages serves the files as-is.

## Customise

- **Contact links** — the contact section ships with GitHub only. Uncomment and fill the Email / LinkedIn lines in `index.html` (search for `Add more links here`).
- **Hero orb** — a real-time WebGL glass sphere (`orb.js`, one fragment shader, no library) lit from the cursor. It pauses off-screen, renders a still frame under reduced motion, and falls back to a CSS orb without WebGL. To show your own 3D render instead, set `data-avatar-src="assets/avatar.png"` on the `.avatar` element (a transparent PNG/WebP around 1000×1000 works best).
- **Projects** — each project is one `<li class="project">` in the Work section. Copy one, edit it, and update the count in `Work<sup>09</sup>`.
  - With a screenshot: add `data-bg="assets/work/name.webp"` (1600px wide) plus a heavily blurred `assets/work/name-amb.webp` for the ambient background, e.g.
    `ffmpeg -i name.webp -vf "scale=480:-2,gblur=sigma=22,eq=saturation=1.35" name-amb.webp`.
  - Without one: add `data-art` and a `<p class="project__art" aria-hidden="true">…</p>` whose text becomes the ghosted background.
  - The Coder's Zone and tiny-gpt cards are reconstructions (no live deployment to capture): Coder's Zone uses the app's real design tokens and FizzBuzz problem data, tiny-gpt shows the sample output from its README. Swap in real screenshots any time.
- **Colours** — the gradient and palette live in the `:root` tokens at the top of `styles.css`.

## Motion

- **Work showcase** — the project list becomes a pinned, full-screen slideshow driven by scroll. Moving forward, the outgoing headline zooms through the camera while the next slide pulls into focus from a blur; scrolling back plays the reverse.
- **Intro** — headline letters rise in sequence, the orb swells into view, then the nav, tagline, CTA and meta row settle in.
- **Hero** — the headline zooms through and the orb recedes as you scroll away.
- **Reveals** — sections pull into focus as they enter the viewport.
- **Smooth scroll** — inertial scrolling via [Lenis](https://github.com/darkroomengineering/lenis) (MIT, vendored in `assets/vendor/`).
- **Cursor** — on mouse/trackpad devices a trailing dot replaces the pointer: it inverts what it passes over, opens into a ring over links and stretches into a scroll pill while the page moves.
- **Lighting** — the orb is lit from the pointer (key light, specular highlight and softbox reflection track it; it wobbles harder as you get close), and soft light pools follow the cursor through the hero and the work slides.

## Accessibility & motion

Content is readable with JS disabled, all motion respects `prefers-reduced-motion`, and every interactive element has a visible focus ring.
