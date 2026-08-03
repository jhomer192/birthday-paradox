# Birthday Paradox Simulator

An interactive birthday paradox simulator. It draws the exact probability that two people in a group of N share a birthday, then runs up to 100,000 random groups in the browser so you can watch the measured rate settle onto that curve.

Live at **https://jackhomer.com/birthday-paradox/**

![The probability curve next to the Monte Carlo controls](https://jackhomer.com/screenshots/birthday-paradox.webp)

## What it does

The curve plots P(N) for N = 1 to 100, with the crossover at N = 23 marked where the probability first passes a coin flip, at 50.73%. Move the group-size slider and the theoretical value, the odds phrased as yes/no, and the gap against the simulation all update with it.

The Monte Carlo panel draws groups of random birthdays and counts how many contain a collision. Pick 100, 1,000, 10,000, or 100,000 trials. Work is split into chunks scheduled with `requestAnimationFrame`, roughly a sixtieth of the run at a time, so the page keeps drawing while 100,000 trials go through. The running estimate and its distance from theory update as it goes.

The sample viewer shows one group as named people with birthdays, colored by which of them collide. Samples are generated from a seeded PRNG, so the seed printed under the grid reproduces the same group. Sort by collision group, name, or date; filter to a single group; search for a person; or regenerate for a new draw.

Two notes under the charts explain why the answer is surprising: 23 people make C(23,2) = 253 pairs, and P(N) is one minus the probability that all N birthdays are distinct. Both the curve and the simulation assume 365 equally likely days, ignoring February 29 and seasonal birth clustering.

Four color themes ship with it, and the choice is stored in the browser.

## Running it locally

```sh
npm install
npm run dev
```

`npm run build` type-checks and bundles into `dist/`, `npm run preview` serves that build, and `npm run lint` type-checks without emitting. `bash scripts/deploy.sh` builds and pushes the output to the `gh-pages` branch through a temporary git worktree, which is what GitHub Pages serves.

## Stack

React 18 and TypeScript on Vite, with Tailwind CSS and Recharts. The probability math, the simulator, and the seeded sampler are in `src/math.ts`.

Write-up: https://jackhomer.com/projects/birthday-paradox/
