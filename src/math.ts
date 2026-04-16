import { FIRST_NAMES, LAST_NAMES } from './lib/names';

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
// (Retained for any consumers; new viewer uses samplePeople below.)
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

/* ---------- Seeded RNG + named-people sampler ---------- */

// Small, fast 32-bit PRNG (mulberry32). Deterministic for a given seed.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Person {
  /** Stable within a sample: 0..n-1 */
  id: number;
  name: string;
  /** Day-of-year in [0, 364]; Jan 1 = 0. 365-day, no leap year. */
  day: number;
  /** 0 if the person has a unique birthday, otherwise 1-indexed collision group id. */
  groupId: number;
}

export interface NamedSample {
  seed: number;
  people: Person[];
  /** Number of distinct collision groups (each of size >= 2). */
  collisionGroupCount: number;
  /** Total people involved in any collision. */
  peopleInCollisions: number;
}

// Month/day labels for UI. 365-day year: March 1 = day 59 (non-leap).
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

export function dayToMonthDay(day: number): { month: number; dayOfMonth: number } {
  let d = day;
  for (let m = 0; m < 12; m++) {
    if (d < DAYS_IN_MONTH[m]) return { month: m, dayOfMonth: d + 1 };
    d -= DAYS_IN_MONTH[m];
  }
  // Should not happen for day in [0, 364]
  return { month: 11, dayOfMonth: 31 };
}

export function formatBirthday(day: number): string {
  const { month, dayOfMonth } = dayToMonthDay(day);
  return `${MONTH_NAMES[month]} ${dayOfMonth}`;
}

/**
 * Seeded named-people sampler. Returns `n` Persons with deterministic names +
 * birthdays for the seed, plus collision group metadata.
 * Group ids are assigned by first appearance of the collision day, so the
 * "earliest-mentioned" shared-birthday group is group 1, next is group 2, etc.
 */
export function samplePeople(n: number, seed: number): NamedSample {
  const rand = mulberry32(seed || 1);
  const people: Person[] = [];
  const dayCounts = new Uint16Array(365);

  for (let i = 0; i < n; i++) {
    const first = FIRST_NAMES[(rand() * FIRST_NAMES.length) | 0];
    const last = LAST_NAMES[(rand() * LAST_NAMES.length) | 0];
    const day = (rand() * 365) | 0;
    dayCounts[day]++;
    people.push({ id: i, name: `${first} ${last}`, day, groupId: 0 });
  }

  // Assign group ids: first collision-day encountered (in input order) -> group 1.
  const dayToGroup = new Map<number, number>();
  let nextGroup = 1;
  for (const p of people) {
    if (dayCounts[p.day] > 1) {
      let g = dayToGroup.get(p.day);
      if (g === undefined) {
        g = nextGroup++;
        dayToGroup.set(p.day, g);
      }
      p.groupId = g;
    }
  }

  const collisionGroupCount = dayToGroup.size;
  let peopleInCollisions = 0;
  for (const p of people) if (p.groupId > 0) peopleInCollisions++;

  return { seed, people, collisionGroupCount, peopleInCollisions };
}
