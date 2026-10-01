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
- **Avatar** — the hero uses a hand-built SVG character whose eyes follow the cursor. To use your own 3D render instead, set `data-avatar-src="assets/avatar.png"` on the `.avatar` element (a transparent PNG/WebP around 1000×1000 works best).
- **Projects** — each project is one `<li class="project">` in the Work section. Copy one, edit it, and update the count in `Work<sup>09</sup>`.
- **Colours** — the gradient and palette live in the `:root` tokens at the top of `styles.css`.

## Accessibility & motion

Content is readable with JS disabled, all motion respects `prefers-reduced-motion`, and every interactive element has a visible focus ring.
