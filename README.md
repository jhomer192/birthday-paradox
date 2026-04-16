# Birthday Paradox Simulator

An interactive, portfolio-grade visualisation of the classic Birthday Paradox. It plots the theoretical probability curve alongside a **live Monte Carlo simulator** that you can run right in the browser — with up to 100,000 trials — and watch the empirical estimate converge on the maths.

**Live demo:** https://jhomer192.github.io/birthday-paradox/

## Features

- Theoretical P(N) curve for N = 1..100 with the famous 50% crossover at N = 23 annotated.
- Monte Carlo simulator with chunked `requestAnimationFrame` scheduling so the UI stays responsive even at 100k trials.
- Adjustable group size (1–100) and trial count (100 / 1k / 10k / 100k).
- Animated progress bar, live running estimate, and a difference metric against the theoretical value.
- Random-sample calendar view: all 365 days as cells, with collisions glowing red.
- Dark / light theme with auto-detect plus manual override.

## Stack

- Vite + React 18 + TypeScript (strict mode)
- Tailwind CSS
- Recharts

## Local development

```bash
npm install
npm run dev        # Vite dev server (http://localhost:5173/birthday-paradox/)
npm run build      # Typecheck + production build into dist/
npm run preview    # Serve the built bundle locally
```

## Deployment

The site is published to GitHub Pages from the `gh-pages` branch (Pages source: **Deploy from a branch**, branch `gh-pages`, folder `/`).

### One-command deploy

```bash
bash scripts/deploy.sh
```

This builds `dist/` and pushes it to the `gh-pages` branch via a temporary git worktree.

### GitHub Actions (optional)

An Actions workflow is provided at [`scripts/pages-workflow.yml`](scripts/pages-workflow.yml). To switch to Actions-based deploys, copy it to `.github/workflows/deploy.yml` and change the Pages source to **GitHub Actions** in repo settings. (It wasn't checked into `.github/workflows/` directly because the ambient `gh` token used to bootstrap the repo lacked the `workflow` OAuth scope.)

---

Built by [Jack Homer](https://github.com/jhomer192).
