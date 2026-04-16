import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { sampleOneGroup, simulateChunk, theoreticalCurve, theoreticalProbability } from './math';

const TRIAL_OPTIONS = [100, 1_000, 10_000, 100_000] as const;
type TrialCount = (typeof TRIAL_OPTIONS)[number];

type Theme = 'light' | 'dark';

function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    const saved = localStorage.getItem('bp-theme') as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('bp-theme', theme);
  }, [theme]);
  return [theme, setTheme];
}

function formatPct(p: number, digits = 2): string {
  return `${(p * 100).toFixed(digits)}%`;
}

export default function App() {
  const [theme, setTheme] = useTheme();
  const [groupSize, setGroupSize] = useState<number>(23);
  const [trialCount, setTrialCount] = useState<TrialCount>(10_000);

  const [running, setRunning] = useState(false);
  const [completedTrials, setCompletedTrials] = useState(0);
  const [hits, setHits] = useState(0);
  const [lastResult, setLastResult] = useState<{
    n: number;
    trials: number;
    empirical: number;
    theoretical: number;
  } | null>(null);

  const cancelRef = useRef(false);

  const curveData = useMemo(() => theoreticalCurve(100), []);
  const theoretical = useMemo(() => theoreticalProbability(groupSize), [groupSize]);

  const [sample, setSample] = useState(() => sampleOneGroup(23));
  useEffect(() => {
    setSample(sampleOneGroup(groupSize));
  }, [groupSize]);

  const runSimulation = useCallback(() => {
    if (running) return;
    cancelRef.current = false;
    setRunning(true);
    setCompletedTrials(0);
    setHits(0);

    const totalTrials = trialCount;
    const n = groupSize;
    // chunk size: aim for ~30ms of work per frame for very large trial counts.
    const chunkSize = Math.max(50, Math.min(5_000, Math.floor(totalTrials / 60)));

    let done = 0;
    let localHits = 0;

    const step = () => {
      if (cancelRef.current) {
        setRunning(false);
        return;
      }
      const start = performance.now();
      // Do work until ~16ms elapsed or all trials done.
      while (done < totalTrials && performance.now() - start < 16) {
        const batch = Math.min(chunkSize, totalTrials - done);
        localHits += simulateChunk(n, batch);
        done += batch;
      }
      setCompletedTrials(done);
      setHits(localHits);
      if (done < totalTrials) {
        requestAnimationFrame(step);
      } else {
        const empirical = localHits / totalTrials;
        setLastResult({
          n,
          trials: totalTrials,
          empirical,
          theoretical: theoreticalProbability(n),
        });
        setRunning(false);
      }
    };
    requestAnimationFrame(step);
  }, [groupSize, running, trialCount]);

  const cancel = useCallback(() => {
    cancelRef.current = true;
  }, []);

  const progress = running
    ? completedTrials / trialCount
    : lastResult
      ? 1
      : 0;
  const liveEmpirical = completedTrials > 0 ? hits / completedTrials : 0;
  const diff = lastResult ? lastResult.empirical - lastResult.theoretical : 0;

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-indigo-50 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 dark:text-slate-100 transition-colors">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <Header theme={theme} onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />

        <section className="mt-10 grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-3">
            <CardHeader
              title="Theoretical probability curve"
              subtitle="P(at least one shared birthday) for N = 1..100. The dashed line marks 50%; with just 23 people it's already a coin flip."
            />
            <div className="h-72 sm:h-80 -mx-2 text-slate-500 dark:text-slate-400">
              <ResponsiveContainer>
                <AreaChart data={curveData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                  <defs>
                    <linearGradient id="probFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="currentColor" strokeOpacity={0.15} vertical={false} />
                  <XAxis
                    dataKey="n"
                    tick={{ fontSize: 12, fill: 'currentColor' }}
                    axisLine={{ stroke: 'currentColor', strokeOpacity: 0.3 }}
                    tickLine={{ stroke: 'currentColor', strokeOpacity: 0.3 }}
                    label={{ value: 'Group size (N)', position: 'insideBottom', offset: -4, fontSize: 12, fill: 'currentColor' }}
                  />
                  <YAxis
                    tickFormatter={(v) => `${Math.round(v * 100)}%`}
                    domain={[0, 1]}
                    tick={{ fontSize: 12, fill: 'currentColor' }}
                    axisLine={{ stroke: 'currentColor', strokeOpacity: 0.3 }}
                    tickLine={{ stroke: 'currentColor', strokeOpacity: 0.3 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: theme === 'dark' ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)',
                      border: '1px solid rgba(148,163,184,0.35)',
                      borderRadius: 8,
                      fontSize: 12,
                      color: theme === 'dark' ? '#e2e8f0' : '#0f172a',
                    }}
                    labelFormatter={(l) => `N = ${l}`}
                    formatter={(v: number) => [formatPct(v, 2), 'P(match)']}
                  />
                  <Area
                    type="monotone"
                    dataKey="p"
                    stroke="#6366f1"
                    strokeWidth={2.25}
                    fill="url(#probFill)"
                    isAnimationActive={false}
                  />
                  <ReferenceLine y={0.5} stroke="#64748b" strokeDasharray="4 4" strokeOpacity={0.8} />
                  <ReferenceDot
                    x={23}
                    y={theoreticalProbability(23)}
                    r={5}
                    fill="#ec4899"
                    stroke="#fff"
                    strokeWidth={2}
                    label={{ value: 'N=23, 50.7%', position: 'top', fontSize: 11, fill: 'currentColor' }}
                  />
                  <ReferenceLine
                    x={groupSize}
                    stroke="#ec4899"
                    strokeOpacity={0.6}
                    strokeDasharray="2 3"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader
              title="At N = "
              subtitle="Move the slider below to see how the probability climbs."
              accent={groupSize.toString()}
            />
            <div className="grid grid-cols-2 gap-3 mt-2">
              <Stat label="Theoretical P" value={formatPct(theoretical)} tone="indigo" />
              <Stat
                label={lastResult ? 'Empirical P' : 'Run a simulation'}
                value={lastResult ? formatPct(lastResult.empirical) : '—'}
                tone="pink"
              />
              <Stat
                label="Odds"
                value={`${(theoretical * 100).toFixed(0)}% yes`}
                sub={`${((1 - theoretical) * 100).toFixed(0)}% no`}
                tone="slate"
              />
              <Stat
                label="|Empirical − Theoretical|"
                value={lastResult ? formatPct(Math.abs(diff), 3) : '—'}
                sub={lastResult ? `over ${lastResult.trials.toLocaleString()} trials` : undefined}
                tone="slate"
              />
            </div>
          </Card>
        </section>

        <section className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-3">
            <CardHeader
              title="Monte Carlo simulator"
              subtitle="Draw random birthdays and count how often a group collides. The empirical estimate should converge to the theoretical value."
            />
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-5">
              <ControlBlock label={`Group size  (N = ${groupSize})`}>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={groupSize}
                  onChange={(e) => setGroupSize(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                  disabled={running}
                />
                <div className="mt-1 flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
                  <span>1</span>
                  <span>23</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </ControlBlock>

              <ControlBlock label="Trials">
                <div className="flex gap-2">
                  {TRIAL_OPTIONS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTrialCount(t)}
                      disabled={running}
                      className={`flex-1 py-2 rounded-md text-xs font-semibold border transition-colors ${
                        trialCount === t
                          ? 'bg-indigo-500 text-white border-indigo-500 shadow shadow-indigo-500/20'
                          : 'bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 text-slate-600 dark:text-slate-300'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {t >= 1000 ? `${t / 1000}k` : t}
                    </button>
                  ))}
                </div>
              </ControlBlock>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={running ? cancel : runSimulation}
                className={`px-4 py-2 rounded-md font-semibold text-sm shadow transition-transform active:scale-[.98] ${
                  running
                    ? 'bg-rose-500 hover:bg-rose-600 text-white'
                    : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/30'
                }`}
              >
                {running ? 'Cancel' : 'Run simulation'}
              </button>
              <button
                onClick={() => setSample(sampleOneGroup(groupSize))}
                disabled={running}
                className="px-3 py-2 rounded-md text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 hover:border-indigo-400 dark:hover:border-indigo-500 text-slate-600 dark:text-slate-300 disabled:opacity-50"
              >
                New random sample
              </button>
              <div className="text-xs text-slate-500 dark:text-slate-400 ml-auto tabular-nums">
                {running
                  ? `${completedTrials.toLocaleString()} / ${trialCount.toLocaleString()} trials · empirical ${formatPct(liveEmpirical, 2)}`
                  : lastResult
                    ? `Last run: empirical ${formatPct(lastResult.empirical, 3)} vs theoretical ${formatPct(lastResult.theoretical, 3)}`
                    : 'Idle'}
              </div>
            </div>

            <div className="mt-4 h-2 w-full bg-slate-200/70 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-pink-500 transition-[width] duration-75 ease-linear"
                style={{ width: `${Math.min(100, progress * 100)}%` }}
              />
            </div>

            {lastResult && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                <MiniStat
                  label="Empirical P"
                  value={formatPct(lastResult.empirical, 3)}
                  color="text-pink-500"
                />
                <MiniStat
                  label="Theoretical P"
                  value={formatPct(lastResult.theoretical, 3)}
                  color="text-indigo-500"
                />
                <MiniStat
                  label="Difference"
                  value={`${diff >= 0 ? '+' : ''}${formatPct(diff, 3)}`}
                  color={Math.abs(diff) < 0.01 ? 'text-emerald-500' : 'text-amber-500'}
                />
              </div>
            )}
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader
              title="One random sample"
              subtitle={`${groupSize} birthdays placed on the calendar. Days with a collision glow red.`}
            />
            <CalendarGrid sample={sample} />
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                Collisions:{' '}
                <span className="font-semibold text-rose-500">
                  {sample.collisionDays.size > 0 ? `${sample.collisionDays.size} day(s)` : 'none'}
                </span>
              </span>
              <span>{sample.birthdays.length} draws</span>
            </div>
          </Card>
        </section>

        <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Explainer
            title="Why is it surprising?"
            body="Intuition says 23 people is far from 365 days, so collisions should be rare. But with 23 people there are C(23,2) = 253 pairs — each a chance at a match."
          />
          <Explainer
            title="The formula"
            body="P(N) = 1 − (365 · 364 · … · (365−N+1)) / 365^N. It's the probability that all N birthdays are distinct, subtracted from 1."
          />
          <Explainer
            title="About this app"
            body="Built with React, TypeScript, Tailwind and Recharts. Simulations run on the main thread in ~16 ms chunks so the UI stays buttery smooth."
          />
        </section>

        <footer className="mt-12 text-center text-xs text-slate-500 dark:text-slate-400">
          Built by{' '}
          <a
            href="https://github.com/jhomer192"
            className="font-semibold text-indigo-500 hover:text-indigo-400"
          >
            Jack Homer
          </a>{' '}
          · assumes 365 uniform days (ignores Feb 29 and seasonal birth clustering).
        </footer>
      </div>
    </div>
  );
}

/* ---------- small presentational helpers ---------- */

function Header({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 p-2 text-lg">
            {/* cake glyph */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8" />
              <path d="M4 16s1.5 2 4 2 4-2 4-2 1.5 2 4 2 4-2 4-2" />
              <path d="M2 21h20" />
              <path d="M7 8v3" />
              <path d="M12 8v3" />
              <path d="M17 8v3" />
              <path d="M7 4s-1 1 0 2 1-2 0-2z" />
              <path d="M12 3s-1 1 0 2 1-2 0-2z" />
              <path d="M17 4s-1 1 0 2 1-2 0-2z" />
            </svg>
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Birthday Paradox</h1>
          <span className="hidden sm:inline text-xs font-semibold uppercase tracking-widest text-indigo-500/80 bg-indigo-500/10 rounded-full px-2 py-0.5 ml-1">
            Simulator
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-xl">
          How many people do you need before two share a birthday? Far fewer than you'd think — and
          here's a live proof.
        </p>
      </div>
      <button
        aria-label="Toggle theme"
        onClick={onToggleTheme}
        className="shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 p-2 transition-colors"
      >
        {theme === 'dark' ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
      </button>
    </header>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm shadow-sm shadow-slate-900/5 p-5 sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

function CardHeader({
  title,
  subtitle,
  accent,
}: {
  title: string;
  subtitle?: string;
  accent?: string;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {title}
        {accent && (
          <span className="ml-1 text-2xl font-extrabold tracking-tight text-indigo-500 normal-case">
            {accent}
          </span>
        )}
      </h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: 'indigo' | 'pink' | 'slate';
}) {
  const valueColor =
    tone === 'indigo'
      ? 'text-indigo-500'
      : tone === 'pink'
        ? 'text-pink-500'
        : 'text-slate-700 dark:text-slate-200';
  return (
    <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${valueColor}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className={`text-lg font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function ControlBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

function Explainer({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 p-4">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{body}</p>
    </div>
  );
}

function CalendarGrid({
  sample,
}: {
  sample: { birthdays: number[]; collisionDays: Set<number> };
}) {
  // 365 cells in a compact grid; color = count at that day.
  const counts = useMemo(() => {
    const c = new Uint16Array(365);
    for (const b of sample.birthdays) c[b]++;
    return c;
  }, [sample]);

  return (
    <div
      className="mt-3 grid gap-[2px]"
      style={{ gridTemplateColumns: 'repeat(30, minmax(0, 1fr))' }}
    >
      {Array.from({ length: 365 }, (_, d) => {
        const n = counts[d];
        const collision = sample.collisionDays.has(d);
        let cls = 'bg-slate-200/70 dark:bg-slate-800/70';
        if (n === 1) cls = 'bg-indigo-400/70 dark:bg-indigo-500/70';
        if (collision) cls = 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.75)]';
        return (
          <div
            key={d}
            title={n > 0 ? `Day ${d + 1}: ${n} person${n > 1 ? 's' : ''}` : `Day ${d + 1}`}
            className={`aspect-square rounded-[2px] ${cls} transition-colors`}
          />
        );
      })}
    </div>
  );
}
