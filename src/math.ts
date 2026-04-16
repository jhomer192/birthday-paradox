// Theoretical probability that at least two people in a group of size n share a birthday.
// Uses logs to avoid overflow for large n, but n <= 100 is fine either way.
export function theoreticalProbability(n: number): number {
  if (n <= 1) return 0;
  if (n > 365) return 1;
  let p = 1;
  for (let i = 0; i < n; i++) {
    p *= (365 - i) / 365;
  }
  return 1 - p;
}

// Full curve from 1..maxN inclusive
export function theoreticalCurve(maxN = 100): { n: number; p: number }[] {
  const out: { n: number; p: number }[] = [];
  for (let n = 1; n <= maxN; n++) out.push({ n, p: theoreticalProbability(n) });
  return out;
}

// Run `trials` groups of size n. Return count with a birthday collision.
// Uses a boolean bucket for O(n) per trial. Stops early on first duplicate within a trial.
export function simulateChunk(n: number, trials: number): number {
  let hits = 0;
  const seen = new Uint8Array(365);
  for (let t = 0; t < trials; t++) {
    seen.fill(0);
    let collision = false;
    for (let i = 0; i < n; i++) {
      const b = (Math.random() * 365) | 0;
      if (seen[b]) {
        collision = true;
        // Drain the remaining picks – not necessary, we can break.
        break;
      }
      seen[b] = 1;
    }
    if (collision) hits++;
  }
  return hits;
}

// Produce a single random sample of `n` birthdays (0..364), plus which indices collide.
export function sampleOneGroup(n: number): { birthdays: number[]; collisionDays: Set<number> } {
  const birthdays: number[] = [];
  const counts = new Uint16Array(365);
  for (let i = 0; i < n; i++) {
    const b = (Math.random() * 365) | 0;
    birthdays.push(b);
    counts[b]++;
  }
  const collisionDays = new Set<number>();
  for (let d = 0; d < 365; d++) if (counts[d] > 1) collisionDays.add(d);
  return { birthdays, collisionDays };
}
